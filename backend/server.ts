import { createServer } from "node:http";
import { logger } from "./src/utils/logger.ts";
import { env } from "./src/config/env.ts";
import { setTimeout as delay } from "node:timers/promises";
import { connectDb } from "./src/config/db.ts";
import { app } from "./src/app.ts";


const listen_errors: Readonly<Record<string, string>> = {
  EADDRINUSE: "is already in use",
  EACCES: "required elevated priviledge",
};

let isShuttingDown = false;

const shutDownTimeOut = 15000;
const keepaliveTimeOut = 65000;
const requestTimeout = 30000;
const headersTimeout = keepaliveTimeOut + 5000;
const drainDelay = env.isProduction ? 5000 : 0

let server: ReturnType<typeof createServer> | null = null;

const shutDown =async (reason:string, exitCode = 0): Promise <void> =>{
  if (isShuttingDown) return
  isShuttingDown = true
  logger.info({reason, exitCode}, 'shutting down')
  const forceTimer = setTimeout(()=>{
    logger.error({timeOut: shutDownTimeOut}, 'graceful shutDown timeout, force shutDown')
    server?.closeAllConnections()
  },shutDownTimeOut)
  forceTimer.unref()
  if(exitCode === 0 && drainDelay>0){
    logger.info({drainDElay : drainDelay},'drainng before closing listener')
    await delay(drainDelay)
  }

}

const attachProcessHandlers = (): void => {
  const onFatal =
    (reason: string, level: "fatal" | "error") =>
    (err: unknown): void => {
      logger[level]({ err }, `${reason}-initiating shut down`);
    };
    process.on('uncaughtException', onFatal('uncaughtException','fatal'))
    process.on('unhandledRejection',onFatal('unhandledRejection','error'))

    const signals : NodeJS.Signals[] = ['SIGTERM', 'SIGINT', 'SIGQUIT']
    for ( const signal of signals) {
      process.on(signal, ()=>{
        logger.info({signal}, 'received termination signal')
      })
    }
};

const startServer = async (): Promise<void> => {
  await connectDb();
  const httpServer = createServer(app);
  server = httpServer

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
