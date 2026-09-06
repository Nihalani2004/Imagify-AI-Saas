import express from "express"
import cors from "cors"
import "dotenv/config"
import connectDB from "./config/mongodb.js"
import { connectRedis } from "./config/redis.js"
import userRouter from "./routes/userRoute.js"
import imageRouter from "./routes/imageRoutes.js"
import { healthCheck, readinessCheck } from "./controllers/healthController.js"
import { errorHandler, notFoundHandler } from "./middlewares/errorHandler.js"
const PORT = process.env.PORT || 4000

const app = express();
app.use(express.json())
app.use(cors())
await connectDB()
await connectRedis()

app.get('/health', healthCheck)
app.get('/ready', readinessCheck)

app.use('/api/user',userRouter)
app.use('/api/image',imageRouter)
app.get('/',(req,res)=> res.send("API Working"))
app.use(notFoundHandler)
app.use(errorHandler)

app.listen(PORT , ()=> console.log("server running on port" + PORT))
