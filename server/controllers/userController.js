import userModel from "../models/userModel.js";
import bcrypt from "bcrypt"
import jwt from "jsonwebtoken"
import razorpay from "razorpay"
import transactionModel from "../models/transactionModel.js";
import { verifyRazorpaySignature } from "../utils/paymentSignature.js";

const registerUser = async (req,res)=>{
  try {
    const {name , email , password}=req.body;
    if(!name || !email || !password){
      return res.json({success:false , message:"Missing Details"})
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
    console.log(error)
    res.json({success:false , message:error.message})
  }

}


const loginUser = async (req,res)=>{
  try {
    const {email,password}=req.body;
    const user = await userModel.findOne({email})

    if(!user)
    {
      return res.json({success:false , message:"User does not exist"})
    }

    const isMatch = await bcrypt.compare(password,user.password)
    if(isMatch){
const token = jwt.sign({id:user._id},process.env.JWT_SECRET)
res.json({success:true,token,user:{name:user.name}})

    }
    else{
      return res.json({success:false , message:"Invalid Credentials"})
    }

  } catch (error) {
    console.log(error)
    res.json({success:false , message:error.message})
  }

}

const userCredits = async(req,res)=>{
  try {
    //const {userId} = req.body
    const user = await userModel.findById(req.userId)
    res.json({success:true , credits:user.creditBalance , user:{name:user.name}})
  } catch (error) {
    console.log(error.message)
    res.json({success:false , message:error.message})
  }
}

const razorpayInstance = new razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret :process.env.RAZORPAY_KEY_SECRET,
})

const paymentRazorpay = async(req,res) => {
  try {
    
    const { planId } = req.body;
    const userId = req.userId; // get from middleware
    const userData = await userModel.findById(userId);
    if (!userId || !planId) {
      return res.json({ success: false, message: "Missing Details" });
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
        return res.json({success:false , message :"plan not found"});
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
    return res.json({success:false , message:error})
   }
   res.json({success:true , order})
    })

  } catch (error) {
    console.log(error)
    res.json({success : false , message:error.message})
  }
}

const verifyRazorpay = async (req, res) => {
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
      return res.json({ success: false, message: "Invalid payment signature" });
    }

    let orderInfo;
    try {
      orderInfo = await razorpayInstance.orders.fetch(razorpay_order_id);
      console.log("Fetched orderInfo:", orderInfo);
    } catch (err) {
      console.log("Error fetching orderInfo:", err);
      return res.json({ success: false, message: "Could not fetch orderInfo" });
    }

    if (!orderInfo) {
      return res.json({ success: false, message: "orderInfo is not defined" });
    }

    // 3. Find the transaction using the receipt (which is transaction _id)
    const transactionData = await transactionModel.findById(orderInfo.receipt);
    if (!transactionData) {
      return res.json({ success: false, message: "Transaction not found" });
    }
    if (transactionData.payment) {
      return res.json({ success: false, message: "Payment already processed" });
    }

    // 4. Update user's credits
    const userData = await userModel.findById(transactionData.userId);
    if (!userData) {
      return res.json({ success: false, message: "User not found" });
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
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

export {registerUser , loginUser , userCredits , paymentRazorpay , verifyRazorpay}
