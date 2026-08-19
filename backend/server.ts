import { app } from "@app";
import { connectDb } from "@config/db.js";
import { resolve } from "node:dns";
import { createServer, type Server } from "node:http";

const connection_checking_interval = 5000;
const keep_alive_timeout = 65000;
const headers_timeout = 30000;
const req_timeout = 30000;

let shuttingDown = false;
let server: Server | null = null;

const listen = (httpServer : Server, port : number)=>{
  return new Promise <void> ((resolve, reject)=>{
    httpServer.once('error',reject)
    httpServer.listen(port,()=>{
      httpServer.removeListener('error',reject)
      resolve()
    })
    
  })
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
  if(shuttingDown) return
};
