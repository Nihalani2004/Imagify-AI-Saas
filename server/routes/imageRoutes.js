import express from "express"
import { generateImage, clearImageCache, getCacheStats, getRateLimitStatus, getGenerationHistory, clearGenerationHistory } from "../controllers/imageController.js"
import userAuth from "../middlewares/auth.js";
import requireAdmin from "../middlewares/requireAdmin.js";
import { imageRateLimit } from "../middlewares/rateLimiter.js";

const imageRouter = express.Router();

imageRouter.post('/generate-image', userAuth, imageRateLimit, generateImage)


imageRouter.post('/clear-cache',userAuth,requireAdmin,clearImageCache)


imageRouter.get('/cache-stats',userAuth,requireAdmin,getCacheStats)

imageRouter.get('/rate-limit-status',userAuth,getRateLimitStatus) // Rate limit status

imageRouter.get('/history',userAuth,getGenerationHistory) // Get user history

imageRouter.delete('/history',userAuth,clearGenerationHistory) // Clear user history

export default imageRouter
