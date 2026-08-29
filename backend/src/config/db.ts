let closingPromise : Promise <void> | null = null

const connectDb = async () : Promise <void> =>{
    if (closingPromise){throw new Error('Mongodb connection is closing')}

}