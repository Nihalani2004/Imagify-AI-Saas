import userModel from "../models/userModel.js";
import FormData from "form-data";
import axios from "axios";
import crypto from "crypto";
import { redisClient, ensureRedisConnection, scanRedisKeys } from "../config/redis.js";
import { historyManager } from "../utils/historyManager.js";
import { releaseRateLimitReservation } from "../middlewares/rateLimiter.js";
import { sendError } from "../utils/apiError.js";

const IMAGE_CACHE_NAMESPACE = 'clipdrop-text-to-image-v1';
const IMAGE_CACHE_TTL_SECONDS = Number(process.env.IMAGE_CACHE_TTL_SECONDS || 86400);

export const createImageCacheKey = (prompt) => {
  const normalizedPrompt = prompt.toLowerCase().trim();
  const promptHash = crypto
    .createHash('sha256')
    .update(`${IMAGE_CACHE_NAMESPACE}:${normalizedPrompt}`)
    .digest('hex');
  return `image:${IMAGE_CACHE_NAMESPACE}:${promptHash}`;
};


export const generateImage = async (req, res, next) => {
 const startTime = Date.now(); // 📊 Start performance timer
 try {
  console.log('🎯 GENERATE IMAGE REQUEST RECEIVED');
  const { prompt } = req.body;        // Get prompt from body
  const userId = req.userId;          // Get userId from middleware
  
  console.log('📝 Prompt received:', prompt);
  console.log('👤 User ID:', userId);
  
  const user = await userModel.findById(userId)
  if(!user || !prompt) {
    console.log('❌ Missing user or prompt');
    await releaseRateLimitReservation(req);
    return sendError(res, 400, 'Missing Details', 'MISSING_DETAILS');
  }

  console.log('💳 User credit balance:', user.creditBalance);

  // 🚀 REDIS CACHING: versioned SHA-256 key prevents collisions across models.
  const cacheKey = createImageCacheKey(prompt);
  
  console.log('🔑 Cache key generated:', cacheKey);
  console.log('🔍 Checking Redis cache...');

  try {
    // 🔍 Ensure Redis is connected and check cache
    await ensureRedisConnection();
    const cachedImage = await redisClient.get(cacheKey);
    
    if (cachedImage) {
      console.log('✅ Cache HIT - Returning cached image for prompt:', prompt);
      console.log('📏 Cached image size:', cachedImage.length, 'characters');
      
      
      await historyManager.addToHistory(userId, prompt, cachedImage, true);

      const rateLimit = req.rateLimitInfo || null;
      
      const responseTime = Date.now() - startTime;
      console.log('⚡ CACHE HIT - Response time:', responseTime, 'ms');
      
      return res.json({
        success: true,
        message: "Image Retrieved from Cache",
        creditBalance: user.creditBalance, // No credit deduction for cached images
        resultImage: cachedImage,
        fromCache: true,
        rateLimit: rateLimit,
        responseTime: responseTime
      });
    }
    
    console.log('❌ Cache MISS - Generating new image for prompt:', prompt);
  } catch (cacheError) {
    console.log('🚨 Redis cache check failed:', cacheError.message);
    // Continue with API call if cache fails
  }

  // Cached images do not consume credits, so only reject users after a cache
  // miss has been confirmed.
  if (user.creditBalance <= 0) {
    console.log('❌ Insufficient credits');
    await releaseRateLimitReservation(req);
    return sendError(res, 402, 'No credit Balance', 'INSUFFICIENT_CREDITS', {
      creditBalance: user.creditBalance,
    });
  }

  // 🎨 Generate new image via API
  const formData = new FormData()
  formData.append('prompt',prompt)

  const {data} = await axios.post('https://clipdrop-api.co/text-to-image/v1',formData,{
    headers: {
      'x-api-key': process.env.CLIPDROP_API,
    },
    responseType:"arraybuffer"
  })
  
  const base64Image = Buffer.from(data , 'binary').toString('base64')
  const resultImage = `data:image/png;base64,${base64Image}`
  
  // 💾 Store in Redis cache (expires in 24 hours)
  try {
    await ensureRedisConnection();
    await redisClient.setEx(cacheKey, IMAGE_CACHE_TTL_SECONDS, resultImage);
    console.log('✅ Image cached successfully for prompt:', prompt);
    console.log('📏 Cached image size:', resultImage.length, 'characters');
    console.log('⏰ Cache expires in 24 hours');
  } catch (cacheError) {
    console.log('🚨 Failed to cache image:', cacheError.message);
    // Continue even if caching fails
  }
  
  // 💳 Deduct credit only for new generations
  await userModel.findByIdAndUpdate(user._id , {creditBalance:user.creditBalance-1})
  
  // 📚 Add to user history
  await historyManager.addToHistory(userId, prompt, resultImage, false);

  const rateLimit = req.rateLimitInfo || null;
  
  const responseTime = Date.now() - startTime;
  console.log('🐌 NEW GENERATION - Response time:', responseTime, 'ms');
  
  return res.json({
    success:true,
    message:"Image Generated",
    creditBalance:user.creditBalance-1,
    resultImage,
    fromCache: false,
    rateLimit: rateLimit,
    responseTime: responseTime
  })

 } catch (error) {
  await releaseRateLimitReservation(req);
  return next(error);
 }
}




// 🗑️ Clear image cache (for admin/debugging)
export const clearImageCache = async (req, res, next) => {
  try {
    const { prompt } = req.body;
    
    if (prompt) {
      // Clear specific prompt cache
      const cacheKey = createImageCacheKey(prompt);
      await ensureRedisConnection();
      await redisClient.del(cacheKey);
      res.json({ success: true, message: `Cache cleared for prompt: ${prompt}` });
    } else {
      // Clear all image caches
      const keys = await scanRedisKeys('image:*');
      if (keys.length > 0) {
        await redisClient.del(keys);
        res.json({ success: true, message: `Cleared ${keys.length} cached images` });
      } else {
        res.json({ success: true, message: 'No cached images found' });
      }
    }
  } catch (error) {
    return next(error);
  }
};

// 📊 Get cache statistics
export const getCacheStats = async (req, res, next) => {
  try {
    const stats = {
      totalCachedImages: (await scanRedisKeys('image:*')).length
    };
    res.json({ success: true, stats });
  } catch (error) {
    return next(error);
  }
};


// 🚦 Get user's current rate limit status
export const getRateLimitStatus = async (req, res, next) => {
  try {
    const userId = req.userId;
    await ensureRedisConnection();
    
    const currentHour = Math.floor(Date.now() / (1000 * 60 * 60));
    const hourlyKey = `rate_limit:${userId}:${currentHour}`;
    
    const currentCount = await redisClient.get(hourlyKey);
    const count = currentCount ? parseInt(currentCount) : 0;
    const RATE_LIMIT = 10;
    
    res.json({
      success: true,
      rateLimit: {
        currentCount: count,
        maxLimit: RATE_LIMIT,
        remaining: RATE_LIMIT - count,
        resetTime: (currentHour + 1) * 60 * 60 * 1000,
        isLimited: count >= RATE_LIMIT
      }
    });
  } catch (error) {
    return next(error);
  }
};




// 📚 Get user's generation history
export const getGenerationHistory = async (req, res, next) => {
  try {
    const userId = req.userId;
    const { limit } = req.query; // Optional limit parameter
    
    const history = await historyManager.getHistory(userId, limit ? parseInt(limit) : 10);
    const stats = await historyManager.getHistoryStats(userId);
    
    res.json({
      success: true,
      history: history,
      stats: stats,
      message: `Retrieved ${history.length} history entries`
    });
  } catch (error) {
    return next(error);
  }
};

// 🗑️ Clear user's generation history
export const clearGenerationHistory = async (req, res, next) => {
  try {
    const userId = req.userId;
    const success = await historyManager.clearHistory(userId);
    
    if (success) {
      res.json({ success: true, message: "Generation history cleared successfully" });
    } else {
      return sendError(res, 500, 'Failed to clear history', 'HISTORY_CLEAR_FAILED');
    }
  } catch (error) {
    return next(error);
  }
};
