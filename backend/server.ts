import { Server } from "node:http";
import { logger } from "./src/utils/logger.ts";
import { connectDb, disconnectDb } from "./src/config/db.ts";

let isShuttingDown = false;

const shutDownTimeOut = 10000

let server : Server | null =null

const shutDown = async (signal : string) : Promise<void>{
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
    }