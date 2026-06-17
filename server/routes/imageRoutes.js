import express from "express"
import { generateImage, clearImageCache, getCacheStats, getRateLimitStatus, getGenerationHistory, clearGenerationHistory } from "../controllers/imageController.js"
import userAuth from "../middlewares/auth.js";
import { imageRateLimit } from "../middlewares/rateLimiter.js";

const imageRouter = express.Router();

imageRouter.post('/generate-image', userAuth, imageRateLimit, generateImage)


imageRouter.post('/clear-cache',userAuth,clearImageCache)  // Admin endpoint


imageRouter.get('/cache-stats',userAuth,getCacheStats)    // Stats endpoint

imageRouter.get('/rate-limit-status',userAuth,getRateLimitStatus) // Rate limit status

imageRouter.get('/history',userAuth,getGenerationHistory) // Get user history

imageRouter.delete('/history',userAuth,clearGenerationHistory) // Clear user history

export default imageRouter