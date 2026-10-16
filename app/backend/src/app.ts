import { router } from '@routes/index.js'
import express from 'express'

export const app = express()

app.use(express.json())
app.use('/api/v1', router)