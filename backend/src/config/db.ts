import mongoose, { type ConnectOptions } from "mongoose";
import { env } from "./env.js";
import { service_name } from "@shared/identity.js";
import { logger } from "@utils/logger.js";

let closingPromise: Promise<void> | null = null;
let connectionPromise: Promise<void> | null = null;
let hasEstablishedClient = false;

const pool_checkOut_timeout = 2_000;
const server_selection_timeout = env.isProduction ? 15_000 : 5_000;
const query_timeout = 5_000;

const isDbConnected = (): boolean =>
  mongoose.connection.readyState === mongoose.ConnectionStates.connected;

const connection_options: ConnectOptions = {
  appName: service_name,
  maxPoolSize: env.isProduction ? 100 : 10,
  minPoolSize: env.isProduction ? 5 : 0,
  maxIdleTimeMS: 60_000,
  waitQueueTimeoutMS: pool_checkOut_timeout,
  serverSelectionTimeoutMS: server_selection_timeout,
  connectTimeoutMS: 10_000,
  socketTimeoutMS: 45_000,
  retryWrites: true,
  retryReads: true,
  compressors: ["zlib"],
  zlibCompressionLevel: 6,
  autoIndex: !env.isProduction,
  autoCreate: !env.isProduction,
  bufferCommands: false,
  ...(env.isProduction && {
    writeConcern: {
      w: "majority" as const,
      wtimeoutMS: query_timeout,
    },
  }),
};

const discardClient = async (): Promise<void> => {
  try {
    await mongoose.connection.close();
  } catch (err) {
    logger.error({ err }, " mongodb failed connect cleanup error");
  }
};

const assertTransactionTopology = async (): Promise<void> => {
  let hello: Record<string, unknown> | undefined;
  try {
    hello = await mongoose.connection.db?.admin()
      .command({ hello: 1 }, { timeoutMS: server_selection_timeout });
  } catch {
    throw new Error("failed to verify mongodb deployment topology");
  }
  if (hello?.setName || hello?.msg === "isdbgrid") return;
  throw new Error(
    "Production MongoDB must be a replica set or a sharded cluster — a standalone server cannot run the transactions this service depends on",
  );
};

const openConnection = async (): Promise<void> => {
  try {
    await mongoose.connect(env.MONGODB_URI, connection_options);
  } catch {
    await discardClient();
    throw new Error("failed to established mongodb connections");
  }
  if (env.isProduction) {
    try {
      await assertTransactionTopology();
    } catch (err) {
      discardClient();
      throw err;
    }
  }
  hasEstablishedClient = true;
  const { host, name } = mongoose.connection;
  logger.info(
    {
      host,
      database: name,
      poolSize: connection_options.maxPoolSize,
      pooCheckOutTimeout: pool_checkOut_timeout,
      serverSelectionTimeout: server_selection_timeout,
      queryTimeout: query_timeout,
      autoIndex: connection_options.autoIndex,
    },
    "mongodb connected",
  );
};

export const connectDb = async (): Promise<void> => {
  if (closingPromise) {
    throw new Error("Mongodb connection is closing");
  }
  if (connectionPromise) return connectionPromise;
  if (isDbConnected()) return;
  if (hasEstablishedClient) {
    throw new Error("mongodb client is temporarily unavailable");
  }
  const attempt = (connectionPromise = openConnection());
  const clearThisAttempt = (): void => {
    if (connectionPromise === attempt) connectionPromise = null;
  };
  void attempt.then(clearThisAttempt, clearThisAttempt);
  return attempt;
};

const closeConnection = async (): Promise<void> => {
  const pending = connectionPromise
  connectionPromise = null
  if (pending) await pending.catch(() => undefined)
  await mongoose.connection.close()
  logger.info('mongodb cleanup completed')
}

export const disconnectDb = async () => {
 if (closingPromise) return closingPromise
  const closeAttempt = (closingPromise = Promise.resolve().then(closeConnection))
  try {
    await closeAttempt
  } finally {
    if (closingPromise === closeAttempt) {
      closingPromise = null
    }
  }
}
