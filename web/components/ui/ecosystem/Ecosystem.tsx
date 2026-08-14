"use client";

import { motion } from "framer-motion";
import {
  CloudRain,
  Smartphone,
  BrainCircuit,
  Droplets,
  Wheat,
} from "lucide-react";

import BackgroundGlow from "./BackgroundGlow";
import EcosystemCenter from "./EcosystemCenter";
import EcosystemNode from "./EcosystemNode";
import AnimatedConnections from "./AnimatedConnections";

export default function Ecosystem() {
  return (
    <section
      id="ecosystem"
      className="relative overflow-hidden bg-gradient-to-b from-white via-green-50 to-white py-32"
    >
      <BackgroundGlow />

      <div className="relative mx-auto max-w-7xl px-6">

        {/* Heading */}

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: .7 }}
          className="mb-24 text-center"
        >
          <span className="font-semibold uppercase tracking-[4px] text-green-700">
            Smart Ecosystem
          </span>

          <h2 className="mt-4 text-5xl font-extrabold text-slate-900">
            Everything Works Together
          </h2>

          <p className="mx-auto mt-6 max-w-3xl text-lg leading-8 text-slate-600">
            Smart Agri continuously monitors your farm, understands plant
            conditions using AI, automates irrigation, and keeps you connected
            from anywhere.
          </p>
        </motion.div>

        {/* Ecosystem */}

        <div className="relative mx-auto h-[850px] max-w-6xl">

          <AnimatedConnections />

          {/* Top */}

          <div className="absolute left-1/2 top-0 -translate-x-1/2">
            <EcosystemNode
              icon={<CloudRain size={30} />}
              title="Weather"
              description="Tracks weather conditions in real time."
              color="bg-blue-500"
            />
          </div>

          {/* Left */}

          <div className="absolute left-0 top-60">
            <EcosystemNode
              icon={<Droplets size={30} />}
              title="Smart Irrigation"
              description="Waters crops only when required."
              color="bg-cyan-500"
            />
          </div>

          {/* Right */}

          <div className="absolute right-0 top-60">
            <EcosystemNode
              icon={<Smartphone size={30} />}
              title="Mobile App"
              description="Monitor and control your farm remotely."
              color="bg-green-600"
            />
          </div>

          {/* Center */}

          <div className="absolute left-1/2 top-[310px] -translate-x-1/2">
            <EcosystemCenter />
          </div>

          {/* Bottom Left */}

          <div className="absolute left-24 bottom-0">
            <EcosystemNode
              icon={<BrainCircuit size={30} />}
              title="AI Intelligence"
              description="Analyzes your farm and makes smart decisions."
              color="bg-violet-500"
            />
          </div>

          {/* Bottom Right */}

          <div className="absolute right-24 bottom-0">
            <EcosystemNode
              icon={<Wheat size={30} />}
              title="Healthy Crops"
              description="Higher yield with less effort and water."
              color="bg-amber-500"
            />
          </div>

        </div>

      </div>
    </section>
  );
}