import type {Server} from "node:http";
import type {AddressInfo} from "node:net";


const idle_sweep_interval = 100
type ServerErrorHandler = (err: Error) => void
export const listenServer = (httpServer: Server, port: number, onRunTimeError?: ServerErrorHandler): Promise<AddressInfo> =>
    new Promise<AddressInfo>((resolve, reject) => {
        const detachStartupListeners = (): void => {
            httpServer.off('error', onBindError)
            httpServer.off('listening', onListening)
        }

        const onBindError = (err: Error): void => {
            detachStartupListeners()
            reject(err)
        }

        const onListening = (): void => {
            const address = httpServer.address()
            if (address === null || typeof address === 'string') {
                const error = new Error(`expected a tcp address after binding port ${port}`)
                detachStartupListeners()
                if (!httpServer.listening) {
                    reject(error)
                    return
                }
                try {
                    httpServer.close(() => reject(error))
                } catch {
                    reject(error)
                }
                return
            }
            if (onRunTimeError) httpServer.on('error', onRunTimeError)
            detachStartupListeners()
            resolve(address)
        }
        httpServer.on('error', onBindError)
        httpServer.on('listening', onListening)
        try {
            httpServer.listen(port)
        } catch (err) {
            detachStartupListeners()
            reject(err)
        }
    })

export const closeServer = async (httpServer : Server) : Promise<boolean> =>{
    if(!httpServer.listening) return false
     const idleSweeper = setInterval(()=>{
     httpServer.closeIdleConnections()

     }, idle_sweep_interval)
    try {
        await new Promise<void>((resolve, reject) => {
            httpServer.close((err) => (err ? reject(err) : resolve()));
            httpServer.closeIdleConnections();
        });
    } finally {
        clearInterval(idleSweeper);
    }
    return true;

}

