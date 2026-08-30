import mongoose, { type ConnectOptions } from "mongoose"
import { env } from "./env.js"
import { service_name } from "@shared/identity.js"

let closingPromise : Promise <void> | null = null
let connectionPromise : Promise <void> | null  = null
let hasEstablishedClient = false

const pool_checkOut_timeout = 2_000
const server_selection_timeout = env.isProduction ? 15_000 : 5_000

const isDbConnected = () : boolean => 
    mongoose.connection.readyState === mongoose.ConnectionStates.connected

const connection_options : ConnectOptions = {
    appName : service_name,
    maxPoolSize : env.isProduction ? 100 : 10,
    minPoolSize : env.isProduction ? 5 :0,
    maxIdleTimeMS : 60_000,
    waitQueueTimeoutMS : pool_checkOut_timeout,
    serverSelectionTimeoutMS : server_selection_timeout,
    connectTimeoutMS : 10_000,
    socketTimeoutMS : 45_000,
    retryWrites : true,
    retryReads : true,
    compressors : ["zlib"],
    zlibCompressionLevel : 6,
    autoIndex : ! env.isProduction,
    autoCreate : !env.isProduction,
    bufferCommands : false
}

const openConnection = async () : Promise <void> {
    try{
    mongoose.connect(env.MONGODB_URI)
}catch{
    throw new Error('failed to established mongodb connections')
}
}

export const connectDb = async () : Promise <void> =>{
    if (closingPromise){throw new Error('Mongodb connection is closing')}
    if (connectionPromise) return connectionPromise
    if(isDbConnected()) return
    if(hasEstablishedClient){throw new Error('mongodb client is temporarily unavailable')}

}