"use client";

import Image from "next/image";
import { motion } from "framer-motion";

export default function Hero() {
  return (
    <section className="relative overflow-hidden">

      {/* Background */}

      <div className="absolute left-10 top-10 h-72 w-72 rounded-full bg-green-200 blur-3xl opacity-30" />

      <div className="absolute right-10 bottom-10 h-96 w-96 rounded-full bg-lime-200 blur-3xl opacity-30" />

      <div className="mx-auto flex max-w-7xl flex-col-reverse items-center gap-20 px-6 py-24 lg:flex-row">

        {/* Left */}

        <motion.div
          initial={{ opacity:0,x:-60 }}
          animate={{ opacity:1,x:0 }}
          transition={{ duration:.8 }}
          className="flex-1"
        >

          <span className="rounded-full bg-green-100 px-5 py-2 text-sm font-medium text-green-700">
            🌱 AI Powered Smart Agriculture
          </span>

          <h1 className="mt-8 text-5xl font-extrabold leading-tight text-gray-900 lg:text-7xl">

            Autonomous

            <br />

            Intelligence

            <br />

            for Agriculture

          </h1>

          <p className="mt-8 max-w-xl text-lg leading-8 text-gray-600">

            Monitor crops, automate irrigation,
            analyze environmental conditions and
            receive AI recommendations from one
            intelligent cloud platform.

          </p>

          <div className="mt-10 flex gap-5">

            <motion.button
              whileHover={{ scale:1.05 }}
              whileTap={{ scale:.95 }}
              className="rounded-full bg-green-700 px-8 py-4 text-white shadow-lg"
            >
              Get Started
            </motion.button>

            <motion.button
              whileHover={{ scale:1.05 }}
              whileTap={{ scale:.95 }}
              className="rounded-full border px-8 py-4"
            >
              Learn More
            </motion.button>

          </div>

          <div className="mt-12 flex gap-10">

            <div>
              <h2 className="text-3xl font-bold">24/7</h2>
              <p className="text-gray-500">Monitoring</p>
            </div>

            <div>
              <h2 className="text-3xl font-bold">AI</h2>
              <p className="text-gray-500">Recommendations</p>
            </div>

            <div>
              <h2 className="text-3xl font-bold">Cloud</h2>
              <p className="text-gray-500">Dashboard</p>
            </div>

          </div>

        </motion.div>

        {/* Right */}

        <motion.div
          initial={{ opacity:0,x:60 }}
          animate={{ opacity:1,x:0 }}
          transition={{ duration:1 }}
          className="flex-1"
        >

          <motion.div
            animate={{ y:[0,-12,0] }}
            transition={{
              duration:4,
              repeat:Infinity,
              ease:"easeInOut"
            }}
            className="relative overflow-hidden rounded-[32px] border bg-white shadow-2xl"
          >

            <Image
              src="/hero.png"
              alt="Smart Agriculture"
              width={900}
              height={700}
              priority
              className="w-full"
            />

            <div className="absolute left-6 top-6 rounded-xl bg-white/90 px-4 py-2 shadow-lg backdrop-blur">

              🌡 24°C

            </div>

            <div className="absolute bottom-6 right-6 rounded-xl bg-white/90 px-4 py-2 shadow-lg backdrop-blur">

              💧 Humidity 63%

            </div>

          </motion.div>

        </motion.div>

      </div>

    </section>
  );
}