import { createServer, Server } from "node:http";

import { setTimeout as delay } from "node:timers/promises";

import { logger } from "@utils/logger.js";
import { env } from "@config/env.js";
import { connectDb, disconnectDb } from "@config/db.js";
import { app } from "@app";
import { rejects } from "node:assert";

const listen_errors: Readonly<Record<string, string>> = {
  EADDRINUSE: "is already in use",
  EACCES: "required elevated priviledge",
};

let isShuttingDown = false;

const shutDownTimeOut = 15000;
const keepaliveTimeOut = 65000;
const requestTimeout = 30000;
const headersTimeout = 30000;
const drainDelay = env.isProduction ? 5000 : 0;
const logFlushTimeOut = 500;
const connectionCheckingInterval = 5000;
let pendingExitCode = 0;

let server: Server | null = null;

const exitAfterFlush = async (code: number): Promise<never> => {
  await Promise.race([
    new Promise<void>((resolve) => {
      logger.flush(() => resolve());
    }),
    delay(logFlushTimeOut),
  ]).catch(() => undefined);

  process.exit(code);
};

const closeHttpServer = async (): Promise<void> => {
  const activeServer = server;
  if (!activeServer?.listening) return;
  activeServer.closeIdleConnections();
  await new Promise<void>((resolve, reject) => {
    activeServer.close((err) => (err ? reject(err) : resolve()));
  });
  logger.info("http server closed");
};

const shutDown = async (reason: string, exitCode = 0): Promise<void> => {
  if (exitCode !== 0 && pendingExitCode === 0) pendingExitCode = exitCode;
  if (isShuttingDown) {
    if (exitCode !== 0) {
      logger.error({ reason, exitCode }, "fatal error during shutting down");
    }
  }
  isShuttingDown = true;
  logger.info({ reason, exitCode }, "shutting down");
  const forceTimer = setTimeout(() => {
    logger.error(
      { timeOut: shutDownTimeOut },
      "graceful shutDown timeout, force shutDown",
    );
    server?.closeAllConnections();
  }, shutDownTimeOut);
  forceTimer.unref();
  if (exitCode === 0 && drainDelay > 0) {
    logger.info({ drainDElay: drainDelay }, "drainng before closing listener");
    await delay(drainDelay);
  }

  const steps: ReadonlyArray<
    readonly [label: string, close: () => Promise<void>]
  > = [
    ["http server", closeHttpServer],
    ["database connection", disconnectDb],
  ];
  let cleanUpFailed = false;
  for (const [label, close] of steps) {
    try {
      await close();
    } catch (err) {
      cleanUpFailed = true;
      logger.error({ err }, ` failed to close ${label}`);
    }
  }
  clearTimeout(forceTimer);
  await exitAfterFlush(cleanUpFailed ? 1 : pendingExitCode);
};

const attachProcessHandlers = (): void => {
  const onFatal =
    (reason: string, level: "fatal" | "error") =>
    (err: unknown): void => {
      try{
        logger[level]({ err }, `${reason}-initiating shut down`)
      }catch{
        try{
          logger[level](`${reason}-initiating shut down`)
        }catch{}
      }
    };
  process.on("uncaughtException", onFatal("uncaughtException", "fatal"));
  process.on("unhandledRejection", onFatal("unhandledRejection", "error"));

  const signals: NodeJS.Signals[] = ["SIGTERM", "SIGINT", "SIGQUIT"];
  for (const signal of signals) {
    process.on(signal, () => {
      logger.info({ signal }, "received termination signal");
    });
  }
};

const listen  = (httpServer : Server, port : number) : Promise<void>{
  new Promise <void> ((resolve, reject)=>{
    httpServer.once('error',reject)
    httpServer.listen(port,()=>{
      httpServer.removeListener('error',reject)
      resolve()
    })
  })
}

const startServer = async (): Promise<void> => {
  await connectDb();
  const httpServer = createServer(app);
  server = httpServer;
  httpServer.keepAliveTimeout = keepaliveTimeOut;
  httpServer.headersTimeout = headersTimeout;
  httpServer.requestTimeout = requestTimeout;
  httpServer.on("error", (err: NodeJS.ErrnoException) => {
    const listenError = listen_errors["err.code ??"];
    logger.fatal(
      { err, ...(listenError && { port: env.PORT }) },
      listenError
        ? `port ${env.PORT} ${listenError}`
        : "server encounter in a fatal error",
    );
  });
  await new Promise<void>((resolve) => {
    httpServer.listen(env.PORT, resolve);
  });
};

try {
  await startServer();
} catch (err) {
  logger.fatal({ err }, "server start fail");
}
