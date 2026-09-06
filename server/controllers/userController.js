import userModel from "../models/userModel.js";
import bcrypt from "bcrypt"
import jwt from "jsonwebtoken"
import razorpay from "razorpay"
import transactionModel from "../models/transactionModel.js";
import { verifyRazorpaySignature } from "../utils/paymentSignature.js";
import { sendError } from "../utils/apiError.js";

const registerUser = async (req, res, next) => {
  try {
    const {name , email , password}=req.body;
    if(!name || !email || !password){
      return sendError(res, 400, 'Missing Details', 'MISSING_DETAILS');
    }

    const salt = await bcrypt.genSalt(10)
    const hashedPassword = await bcrypt.hash(password,salt)
    const userData = {
      name , email ,
      password:hashedPassword
    }
    const newUser = new userModel(userData)
    const user = await newUser.save();
    const token = jwt.sign({id:user._id},process.env.JWT_SECRET)
    res.json({success:true,token,user:{name:user.name}})
  } catch (error) {
    return next(error);
  }

}


const loginUser = async (req, res, next) => {
  try {
    const {email,password}=req.body;
    const user = await userModel.findOne({email})

    if(!user)
    {
      return sendError(res, 401, 'User does not exist', 'INVALID_CREDENTIALS');
    }

    const isMatch = await bcrypt.compare(password,user.password)
    if(isMatch){
const token = jwt.sign({id:user._id},process.env.JWT_SECRET)
res.json({success:true,token,user:{name:user.name}})

    }
    else{
      return sendError(res, 401, 'Invalid Credentials', 'INVALID_CREDENTIALS');
    }

  } catch (error) {
    return next(error);
  }

}

const userCredits = async (req, res, next) => {
  try {
    //const {userId} = req.body
    const user = await userModel.findById(req.userId)
    if (!user) {
      return sendError(res, 404, 'User not found', 'USER_NOT_FOUND');
    }
    res.json({success:true , credits:user.creditBalance , user:{name:user.name}})
  } catch (error) {
    return next(error);
  }
}

const razorpayInstance = new razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret :process.env.RAZORPAY_KEY_SECRET,
})

const paymentRazorpay = async (req, res, next) => {
  try {
    
    const { planId } = req.body;
    const userId = req.userId; // get from middleware
    const userData = await userModel.findById(userId);
    if (!userId || !planId) {
      return sendError(res, 400, 'Missing Details', 'MISSING_DETAILS');
    }
    if (!userData) {
      return sendError(res, 404, 'User not found', 'USER_NOT_FOUND');
    }

    //store credit , pla, amout,date
    let credits , plan , amount , date
    switch(planId){
      case "Basic" :
         plan = "Basic"
         credits = 100
         amount = 10
         break;
      case "Advanced" :
         plan = "Advanced"
         credits = 500
         amount = 50
         break;
      case "Business" :
         plan = "Business"
         credits = 500
         amount = 250
         break;
      default:
        return sendError(res, 400, 'Plan not found', 'INVALID_PLAN');
    }
    date = Date.now();

    const transactionData = {
      userId , plan , amount , credits , date
    }
    const newTransaction = await transactionModel.create(transactionData)
    const options = {
      amount : amount*100,
      currency : process.env.CURRENCY,
      receipt: newTransaction._id,
    }

    await razorpayInstance.orders.create(options,(error , order)=>{
   if(error)
   {
    console.log(error);
    return sendError(res, 502, 'Unable to create payment order', 'PAYMENT_PROVIDER_UNAVAILABLE');
   }
   res.json({success:true , order})
    })

  } catch (error) {
    return next(error);
  }
}

const verifyRazorpay = async (req, res, next) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    console.log("verifyRazorpay req.body:", req.body);

    // 1. Verify signature
    if (!verifyRazorpaySignature(
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      process.env.RAZORPAY_KEY_SECRET
    )) {
      return sendError(res, 400, 'Invalid payment signature', 'INVALID_PAYMENT_SIGNATURE');
    }

    let orderInfo;
    try {
      orderInfo = await razorpayInstance.orders.fetch(razorpay_order_id);
      console.log("Fetched orderInfo:", orderInfo);
    } catch (err) {
      console.log("Error fetching orderInfo:", err);
      return sendError(res, 502, 'Could not fetch order information', 'PAYMENT_PROVIDER_UNAVAILABLE');
    }

    if (!orderInfo) {
      return sendError(res, 502, 'Could not fetch order information', 'PAYMENT_PROVIDER_UNAVAILABLE');
    }

    // 3. Find the transaction using the receipt (which is transaction _id)
    const transactionData = await transactionModel.findById(orderInfo.receipt);
    if (!transactionData) {
      return sendError(res, 404, 'Transaction not found', 'TRANSACTION_NOT_FOUND');
    }
    if (transactionData.payment) {
      return sendError(res, 409, 'Payment already processed', 'PAYMENT_ALREADY_PROCESSED');
    }

    // 4. Update user's credits
    const userData = await userModel.findById(transactionData.userId);
    if (!userData) {
      return sendError(res, 404, 'User not found', 'USER_NOT_FOUND');
    }
    const creditBalance = userData.creditBalance + transactionData.credits;
    await userModel.findByIdAndUpdate(userData._id, { creditBalance });

    // 5. Mark transaction as paid
    const updatedTransaction = await transactionModel.findByIdAndUpdate(
      transactionData._id,
      { payment: true },
      { new: true }
    );
    console.log("Updated transaction:", updatedTransaction);
    res.json({ success: true, message: "Credits Added" });
  } catch (error) {
    return next(error);
  }
};

export {registerUser , loginUser , userCredits , paymentRazorpay , verifyRazorpay}
