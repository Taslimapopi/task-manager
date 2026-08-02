import { Server } from "node:http";
import { logger } from "./src/utils/logger.ts";
import { connectDb, disconnectDb } from "./src/config/db.ts";
import { app } from "./src/app.ts";
import { env } from "./src/config/env.ts";

let isShuttingDown = false;

const shutDownTimeOut = 10000
const keepaliveTimeOut = 65000

let server : Server | null =null

const shutDown = async (signal : string) : Promise<void>=>{
    if (isShuttingDown) return
    isShuttingDown = true
    logger.info({signal},'shutting Down gracefully...')
    const forceTimer = setTimeout(()=>{
        logger.error({timeOut : shutDownTimeOut},'graceful shutdown timeout')
        process.exit(1)
    },shutDownTimeOut)
    forceTimer.unref()
    try{

        if(server){
            server.closeIdleConnections()
            await new Promise<void>((resolve, reject)=>{
                server!.close(err=>(err?reject(err):resolve()))

            })

            logger.info('http server closed')
        }
    await disconnectDb()
        process.exit(0)

    }catch(err){
        logger.error({err}, 'error during shutdown cleanup')
        process.exit(1)

    }

}


    process.on('SIGTERM',()=>shutDown('SIGTERM'))
    process.on('SIGINT',()=>shutDown('SIGINT'))
    process.once('unhandledRejection',(reason : unknown)=>{
        logger.error({err:reason}, 'unhandled rejection shut down')
        shutDown('unhandledRejection')
    })

    process.once('uncaughtException', (err: Error)=>{
        logger.fatal({err},'uncaughtException shutdown')
        shutDown('uncaughtException')
    })

    const startServer = async () : Promise <void> =>{
        await connectDb()
        server = app.listen(env.PORT, ()=>{
            logger.info({
                port : env.PORT,
                env : env.NODE_ENV,
                pid : process.pid,
                version : process.version
            },'server started')
            logger.info({url: `http://localhost:${env.PORT}/api/v1`})
        })

        server.keepAliveTimeout = keepaliveTimeOut
        server.headersTimeout = keepaliveTimeOut + 5000
        server.on('error',(err:NodeJS.ErrnoException)=>{
            if(err.code === 'EADDRINUSE'){
                logger.fatal({port: env.PORT},`port ${env.PORT} already in use`)
            }
            else if(err.code === 'EACCES'){
                logger.fatal({port: env.PORT},`port ${env.PORT} required elevated priviledges`)
            }else{
                logger.fatal({err},'server encountered fatal error')
            }

            process.exit(1)
        })
    }

    try{
       await startServer()
    }catch(err){
        logger.fatal({err},'server start fail')
    }