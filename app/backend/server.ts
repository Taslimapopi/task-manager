import { app } from "@app"
import { connectDB } from "@config/db.js"
import { env } from "@config/env.js"


const start = async (): Promise<void> => {
    await connectDB()
    app.listen(env.PORT, () => {
        console.log(`Server running on http://localhost:${env.PORT}`)
    })
}

start().catch((err) => {
    console.error('Failed to start server:', err)
    process.exit(1)
})