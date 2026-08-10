import mongoose, { ConnectOptions } from 'mongoose';
import { logger } from '../utils/logger.ts';
import { env } from './env.ts';


mongoose.connection.on('error', err=>{
    logger.error({err}, 'mongodb connection error')
})

mongoose.connection.on('warn',()=>{
    logger.warn('mongodb disconnected')
})
mongoose.connection.on('reconnect',()=>{
    logger.info('mongodb reconnected')
})

const isProduction = env.NODE_ENV === 'production'

const connection_options : ConnectOptions = {
    maxPoolSize : isProduction ? 100 : 10,
    minPoolSize : isProduction ? 10 : 2,
    serverSelectionTimeoutMS : 5000,
    socketTimeoutMS: 45000,
    heartbeatFrequencyMS: 10000,
    retryWrites: true,
    compressors : ['snappy', 'zstd'],
    ...(isProduction && {
        w:'majority',
        readPreference : 'secondaryPreferred' as const
    })
}

export const connectDb =  async () : Promise <void>=>{
    if(mongoose.connection.readyState === 1) return

    const mongodbConnection = await mongoose.connect(env.MONGODB_URI, connection_options)
    logger.info({
        host: mongoose.connection.host,
        name:mongoose.connection.name
    },'mongodb connected')
}

export const disconnectDb = async():Promise<void>=>{
 if(mongoose.connection.readyState===0) return
 await mongoose.connection.close()
 logger.info('mongodb connection closed')
}