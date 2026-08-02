import mongoose from 'mongoose';
import { logger } from '../utils/logger';
import { env } from './env';

export const connectDb =  async () : Promise <void>=>{
    if(mongoose.connection.readyState === 1) return

    const mongodbConnection = await mongoose.connect(env.MONGODB_URI)
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