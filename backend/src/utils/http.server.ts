import type { Server } from "node:http";
import type {AddressInfo} from "node:net";

type ServerErrorHandler = (err : Error) => void

export const listenServer = (httpServer : Server , port : number, onRunTimeError? : ServerErrorHandler): Promise <AddressInfo> =>
    new Promise <void> ((resolve, reject)=>{
        const onError = (err: Error) : void =>{
            httpServer.removeListener('listening',onListening)
            reject(err)
        }
        const onListening = (err : Error) : void =>{
            httpServer.removeListener('error', onError)
            resolve()
        }
        httpServer.once('listening', onListening)
        httpServer.once('error', onError)
        httpServer.listen(port)
    })
