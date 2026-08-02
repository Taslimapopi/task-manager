import { Server } from "node:http";
import { logger } from "./src/utils/logger";

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

    }catch(){

    }
}