import jwt from "jsonwebtoken"
import { sendError } from "../utils/apiError.js";

const userAuth = async (req,res,next)=>{
  const {token} = req.headers;
  if(!token)
  {
    return sendError(res, 401, "Not Authorized . Login Again", 'AUTHENTICATION_REQUIRED');
  }
    try {
      const tokenDecode = jwt.verify(token , process.env.JWT_SECRET);
      if(tokenDecode.id)
      {
        //req.body.userId = tokenDecode.id;
req.userId = tokenDecode.id; // ✅ works for all request types (GET or POST)
      }
      else{
        return sendError(res, 401, "Not Authorized . Login Again", 'AUTHENTICATION_REQUIRED');
      }
      next()
    } catch (error) {
      return sendError(res, 401, "Not Authorized . Login Again", 'INVALID_TOKEN');
    }
  
}

export default userAuth;
