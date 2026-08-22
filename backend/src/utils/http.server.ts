import type { Server } from "node:http";

export const listenServer = (httpServer : Server , port : number): Promise <void>{
    new Promise <void> ((resolve, reject)=>{
        const onError = (err: Error) : void =>{
            httpServer.removeListener('listening',onListening)
            reject(err)
        }
        const onListening = (err : Error) : void =>{
            httpServer.removeListener('error', onError)
            resolve()
        }
        httpServer.once('listening', onError)
        httpServer.once('error', onListening)
        httpServer.listen(port)
    })
}