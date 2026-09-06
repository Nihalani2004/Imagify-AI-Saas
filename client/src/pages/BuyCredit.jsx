import React, { useContext } from 'react'
import { plans } from '../assets/assets'
import { assets } from '../assets/assets'
import { AppContext } from '../context/AppContext'
import { motion } from "motion/react"
import {useNavigate} from "react-router-dom"
import {toast} from "react-toastify"
import axios from "axios"
import { getApiErrorMessage } from '../utils/apiError'

const BuyCredit = () => {

  const {user , backendUrl , loadCreditsData , token , setShowLogin}= useContext(AppContext)


const navigate = useNavigate()

const initPay = async(order)=>{
    console.log("initPay called with order:", order);
    const options = {
      key: import.meta.env.VITE_RAZORPAY_KEY_ID,
      amount : order.amount,
      currency:order.currency,
      name : "Credit Payment",
      description : "Credits Payment",
      order_id: order.id,
      receipt : order.receipt,
      handler: async(response)=>{
        console.log("Razorpay handler response:", response);
        try {
          const verifyPayload = {
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature
          };
          const {data} = await axios.post(backendUrl + '/api/user/verify-razor', verifyPayload, {headers:{token}});
          console.log("Backend verify-razor response:", data);
          if(data.success) {
            loadCreditsData();
            navigate('/');
            toast.success("Credit Added");
          } else {
            toast.error(data.message || "Verification failed");
          }
        } catch (error) {
          toast.error(getApiErrorMessage(error));
        }
      }
    }
    try {
      const rzp = new window.Razorpay(options)
      console.log("Opening Razorpay checkout...");
      rzp.open()
    } catch (e) {
      console.error("Error opening Razorpay:", e);
    }
}
const paymentRazorpay = async(planId)=> {
  try {
    console.log("paymentRazorpay called with planId:", planId);
    if(!user)
    {
      console.log("User not logged in, showing login modal.");
      setShowLogin(true)
      return; // Prevent further execution if not logged in
    }

    console.log("Sending payment request to backend:", backendUrl + '/api/user/pay-razor');
    const response = await axios.post(backendUrl + '/api/user/pay-razor' , {planId},{headers : {token}})
    console.log("Received response from backend:", response);
    const data = response.data;
    console.log("Parsed response data:", data);

    if(data.success){
      console.log("Payment order created successfully, calling initPay...");
      initPay(data.order)
    } else {
      console.error("Payment initiation failed:", data.message);
      toast.error(data.message || "Payment initiation failed");
    }

  } catch (error) {
    console.error("Error in paymentRazorpay:", error);
    toast.error(getApiErrorMessage(error))
  }
}

  return (
    <motion.div
     initial={{opacity:0.2, y:100}}
    transition={{duration:1}}
    whileInView={{opacity:1 , y:0}}
    viewport={{once:true}}
    className='min-h-[80vh] text-center pt-14 mb-10'>
      <button className='border border-gray-400 px-10 py-2 rounded-full mb-6'>
        Our Plans
      </button>
      <h1 className='text-center text-3xl font-medium mb-6 sm:mb-10'>Choose the plan</h1>
      <div className='flex flex-wrap justify-center gap-6 text-left'>
        {plans.map((item,index)=>(
          <div key={index} className='bg-white drop-shadow-sm border rounded-lg py-12 px-8 text-gray-600 hover:scale-105 transition-all duration-500'>
            <img width={40} src={assets.logo_icon} alt="" />
            <p className='mt-3 mb-1 font-semibold'>{item.id}</p>
            <p className='text-sm'>{item.desc}</p>
            <p className='mt-6'><span className='text-3xl font-medium'>${item.price}</span> / {item.credits} credits</p>
            <button onClick={()=>paymentRazorpay(item.id)} className='cursor-pointer w-full bg-gray-800 text-white mt-8 text-sm rounded-md py-2.5 min-w-52'>{user ? 'Purchase' : 'Get Started'}</button>
            </div>
        ))}
      </div>
    </motion.div>
  )
}

export default BuyCredit
