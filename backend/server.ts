let isShuttingDown = false;

const shutDown = async (signal : string) : Promise<void>{
    if (isShuttingDown) return
    isShuttingDown = true
    console.log('shutting Down gracefully...')
}