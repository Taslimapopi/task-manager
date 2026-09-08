import type {Server} from "node:http";
import type {AddressInfo} from "node:net";

type ServerErrorHandler = (err : Error) => void

const listenServer = (httpServer : Server, port : number, onRunTimeError? : ServerErrorHandler) : Promise<AddressInfo> =>{
    new Promise <AddressInfo>((resolve, reject)=>{
        const detachStartupListener = () : void =>{
            httpServer.off('error', onBindError)

        }

        const onBindError = (err:Error): void =>{
            detachStartupListener()
            reject(err)
        }

        const onListening = () : void =>{
            const address = httpServer.address()
            if(address === null || typeof address === "string") {
                const error = new Error(` expect a tcp address after binding port ${port}`)
                detachStartupListener()

                if(!httpServer.listening){
                    reject(error)
                    return
                }
                try{

                }catch{
                    
                }
            }
        }
    })

}