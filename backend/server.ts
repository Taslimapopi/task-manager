import { app } from "@app";
import { connectDb, disconnectDb } from "@config/db.js";
import { env } from "@config/env.js";
import { listenServer } from "@utils/http.server.js";
import { logger } from "@utils/logger.js";
import { createServer, type Server } from "node:http";
import {setTimeout as delay} from 'node:timers/promises'

const connection_checking_interval = 5000;
const keep_alive_timeout = 65000;
const headers_timeout = 30000;
const req_timeout = 30000;
const idle_sweep_interval = 1000
const drainDelay = env.isProduction ? 5000 : 0
const shutdownTimeOut = 35000


let shuttingDown = false;
let server: Server | null = null;
let httpClosePromise: Promise<void> | null = null;
let listenPromise : Promise <void> | null = null;
let exitPromise : Promise <never> | null = null;
let pendingExitCode = 0
let drainController : AbortController | null = null


const logCrashSafely = (
  level : 'fatal' | 'error',
  binding : Record<string, unknown>,
  message : string
) : void =>{
  try{
    logger[level](binding, message)
  }catch{
    try{
      logger[level](`${message} error details unserializable`)
    }catch{}
  }
}

const closeHttpServer = async (): Promise<void> => {
  if (httpClosePromise) return httpClosePromise;

  const activeServer = server;
  if (!activeServer) return;
  httpClosePromise = (async():Promise <void>=>{
    if (listenPromise) await listenPromise
    if(activeServer?.listening) return
    const idleSweeper = setInterval(()=>{
      activeServer?.closeIdleConnections
    },idle_sweep_interval)
    try{
      await new Promise <void>((resolve, reject)=>{
        activeServer?.close(err=>(err? reject(err) : resolve()))
      })
    }finally{
      clearInterval(idleSweeper)
    }
    logger.info('http server closed')

  })()
  return httpClosePromise
};
const listen = (httpServer: Server, port: number) => {
  return new Promise<void>((resolve, reject) => {
    httpServer.once("error", reject);
    httpServer.listen(port, () => {
      httpServer.removeListener("error", reject);
      resolve();
    });
  });
};

const initiateShutdown = (reason: string, exitCode : number): void =>{

}

const shutdown =async (reason :string, exitCode : number) :Promise <void> =>{
  if (exitCode !== 0 && pendingExitCode === 0) pendingExitCode = exitCode
  if (shuttingDown){
    if (exitCode!==0){
      drainController?.abort()
      server?.closeAllConnections()
      logger.error({reason, exitCode},'fatal error during shutdown')
    }
    return
  }
  shuttingDown = true
  logger.info({reason, exitCode}, 'shutting down')
  if(pendingExitCode === 0 && drainDelay > 0){
    logger.info({drainDelay : drainDelay}, 'draining before shutting down')
    drainController = new AbortController()
    try{
      await delay(drainDelay,undefined,{signal : drainController.signal})
    }catch(err){
      if(!drainController.signal.aborted) throw err
    }finally{
      drainController = null
    }
  }
  if(pendingExitCode !== 0) server?.closeAllConnections()
    const steps: ReadonlyArray<readonly [label: string, close: () => Promise<void>]> = [
    ['HTTP server', closeHttpServer],
    ['database connection', disconnectDb]
    ]

    const forceTimer = setTimeout(()=>{
      server?.closeAllConnections()
      try{
        logger.error({timeoutMs : shutdownTimeOut }, 'gracefully shutdown time out, forcing exit')
      }catch{}
    },shutdownTimeOut)
    for (const [label, close] of steps) {
    try {
      await close()
    } catch (err) {
      pendingExitCode = 1
      logger.error({ err }, `Failed to close ${label}`);
    }
  }
  clearTimeout(forceTimer)
}

const exitAfterFlash = (code : number) : Promise <void>=>{
  if(code!==0) pendingExitCode = code
  
}

const startServer = async (): Promise<void> => {
  await connectDb();
  if (shuttingDown) return;

  const httpServer = createServer(
    {
      connectionsCheckingInterval: connection_checking_interval,
    },
    app,
  );

  server = httpServer;
  httpServer.keepAliveTimeout = keep_alive_timeout;
  httpServer.headersTimeout = headers_timeout;
  httpServer.requestTimeout = req_timeout;
  if (shuttingDown) return;
  const pendingListen = (listenPromise = listenServer(httpServer, env.PORT))
  try{
    await pendingListen
  }finally{
    if(listenPromise === pendingListen) listenPromise = null
  }
  if(shuttingDown){
    await closeHttpServer()
    return
  }
  httpServer.on('error', (err : NodeJS.ErrnoException)=>{
    logCrashSafely('fatal', {err}, 'server encountered a fatal error')
  })
};
