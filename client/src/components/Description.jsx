import React from 'react';
import { assets } from '../assets/assets';
import {motion} from "motion/react"
const Description = () => {
  return (
    <motion.div
     initial={{opacity:0.2, y:100}}
    transition={{duration:1}}
    whileInView={{opacity:1 , y:0}}
    viewport={{once:true}}
    className='w-full my-24 px-6 md:px-16'>
      <h1 className='text-3xl sm:text-4xl font-semibold mb-2 text-center'>Create AI Images</h1>
      <p className='text-gray-500 mb-12 text-center'>Turn your imagination into visuals</p>

      {/* Side-by-side layout */}
      <div className='flex flex-col md:flex-row gap-10 items-start max-w-[1200px] mx-auto'>
        {/* Image */}
        <img
          src={assets.sample_img_1}
          alt="Sample"
          className='w-full md:w-1/2 xl:w-[500px] rounded-lg object-cover'
        />

        {/* Text */}
        <div className='flex-1 max-w-xl text-base leading-relaxed'>
          <h2 className='text-xl font-semibold mb-3'>Introducing the AI-Powered Text to Image Generator</h2>
          <p className='text-gray-600 mb-4'>
            Easily bring your ideas to life with our free AI image generator. Whether you need stunning visuals or unique imagery, our tool transforms your text into eye-catching images with just a few clicks. Imagine it, describe it, and watch it come to life instantly.
          </p>
          <p className='text-gray-600'>
            Simply type in a text prompt, and our cutting-edge AI will generate high-quality images in seconds. From product visuals to character designs and portraits—even concepts that don't yet exist—can be visualized effortlessly. Powered by advanced AI technology, the creative possibilities are limitless!
          </p>
        </div>
      </div>
    </motion.div>
  );
};

export default Description;
