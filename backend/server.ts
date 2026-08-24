import { app } from "@app";
import { connectDb } from "@config/db.js";
import { env } from "@config/env.js";
import { listenServer } from "@utils/http.server.js";
import { logger } from "@utils/logger.js";
import { resolve } from "node:dns";
import { createServer, type Server } from "node:http";

const connection_checking_interval = 5000;
const keep_alive_timeout = 65000;
const headers_timeout = 30000;
const req_timeout = 30000;
const idle_sweep_interval = 1000


let shuttingDown = false;
let server: Server | null = null;
let httpClosePromise: Promise<void> | null = null;
let listenPromise : Promise <void> | null = null

const closeHttpServer = async (): Promise<void> => {
  if (httpClosePromise) return httpClosePromise;

  const activeServer = server;
  if (activeServer?.listening) return;
  httpClosePromise = (async():Promise <void>=>{
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
};
