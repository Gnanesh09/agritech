"use client";

import { motion } from "framer-motion";
import { BrainCircuit, CloudRain, Droplets, Smartphone, Wheat } from "lucide-react";
import BackgroundGlow from "./BackgroundGlow";
import EcosystemCenter from "./EcosystemCenter";
import EcosystemNode from "./EcosystemNode";
import AnimatedConnections from "./AnimatedConnections";

const nodes = [
  { icon: <CloudRain size={30} />, title: "Weather", description: "Tracks weather conditions in real time.", color: "bg-sky-500" },
  { icon: <Droplets size={30} />, title: "Smart Irrigation", description: "Waters crops only when required.", color: "bg-cyan-500" },
  { icon: <Smartphone size={30} />, title: "Mobile App", description: "Monitor and control your farm remotely.", color: "bg-[#5d8e3e]" },
  { icon: <BrainCircuit size={30} />, title: "AI Intelligence", description: "Analyzes your farm and makes smart decisions.", color: "bg-violet-500" },
  { icon: <Wheat size={30} />, title: "Healthy Crops", description: "Higher yield with less effort and water.", color: "bg-amber-500" },
];

export default function Ecosystem() {
  return (
    <section id="ecosystem" className="relative overflow-hidden bg-[#f7f8f2] py-20 sm:py-28">
      <BackgroundGlow />
      <div className="relative mx-auto max-w-7xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.55 }}
          className="mx-auto mb-12 max-w-3xl text-center sm:mb-16"
        >
          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[#5d8e3e]">Smart Ecosystem</span>
          <h2 className="mt-4 text-4xl font-semibold tracking-[-0.045em] text-[#12382a] sm:text-5xl">Everything works together.</h2>
          <p className="mx-auto mt-5 max-w-3xl text-base leading-7 text-[#617369] sm:text-lg sm:leading-8">
            Smart Agri continuously monitors your farm, understands plant conditions using AI, automates irrigation, and keeps you connected from anywhere.
          </p>
        </motion.div>

        <div className="grid gap-4 sm:grid-cols-2 lg:hidden">
          {nodes.map((node, index) => <EcosystemNode {...node} delay={index * 0.06} key={node.title} />)}
        </div>

        <div className="relative mx-auto hidden h-[720px] max-w-6xl lg:block">
          <AnimatedConnections />
          <div className="absolute left-1/2 top-0 -translate-x-1/2"><EcosystemNode {...nodes[0]} /></div>
          <div className="absolute left-0 top-52"><EcosystemNode {...nodes[1]} /></div>
          <div className="absolute right-0 top-52"><EcosystemNode {...nodes[2]} /></div>
          <div className="absolute left-1/2 top-[270px] -translate-x-1/2"><EcosystemCenter /></div>
          <div className="absolute bottom-0 left-20"><EcosystemNode {...nodes[3]} /></div>
          <div className="absolute bottom-0 right-20"><EcosystemNode {...nodes[4]} /></div>
        </div>
      </div>
    </section>
  );
}
