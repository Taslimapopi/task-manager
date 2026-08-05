import { createServer } from "node:http";
import { logger } from "./src/utils/logger.ts";
import { connectDb, disconnectDb } from "./src/config/db.ts";
import { app } from "./src/app.ts";
import { env } from "./src/config/env.ts";

const listen_errors : Readonly<Record<string, string>> = {
    EADDRINUSE : 'is already in use',
    EACCES : 'required elevated priviledge'

}

let isShuttingDown = false;

const shutDownTimeOut = 10000;
const keepaliveTimeOut = 65000;
const requestTimeout = 30000
const headersTimeout = keepaliveTimeOut + 5000

let server: ReturnType<typeof createServer> | null = null;

const shutDown = async (signal: string): Promise<void> => {
  if (isShuttingDown) return;
  isShuttingDown = true;
  logger.info({ signal }, "shutting Down gracefully...");
  const forceTimer = setTimeout(() => {
    logger.error({ timeOut: shutDownTimeOut }, "graceful shutdown timeout");
    process.exit(1);
  }, shutDownTimeOut);
  forceTimer.unref();
  try {
    if (server) {
      server.closeIdleConnections();
      await new Promise<void>((resolve, reject) => {
        server!.close((err) => (err ? reject(err) : resolve()));
      });

      logger.info("http server closed");
    }
    await disconnectDb();
    process.exit(0);
  } catch (err) {
    logger.error({ err }, "error during shutdown cleanup");
    process.exit(1);
  }
};

process.on("SIGTERM", () => shutDown("SIGTERM"));
process.on("SIGINT", () => shutDown("SIGINT"));
process.once("unhandledRejection", (reason: unknown) => {
  logger.error({ err: reason }, "unhandled rejection shut down");
  shutDown("unhandledRejection");
});

process.once("uncaughtException", (err: Error) => {
  logger.fatal({ err }, "uncaughtException shutdown");
  shutDown("uncaughtException");
});

const startServer = async (): Promise<void> => {
  await connectDb();
  const httpServer = createServer(app);

  httpServer.keepAliveTimeout = keepaliveTimeOut;
  httpServer.headersTimeout = headersTimeout;
  httpServer.requestTimeout = requestTimeout

  httpServer.on("error", (err: NodeJS.ErrnoException) => {
    const listenError = listen_errors["err.code ??"]
    logger.fatal({err, ...(listenError &&{port: env.PORT})}, listenError? `port ${env.PORT} ${listenError}`:'server encounter in a fatal error')

    
  });
};

try {
  await startServer();
} catch (err) {
  logger.fatal({ err }, "server start fail");
}
