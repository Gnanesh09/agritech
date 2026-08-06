"use client";

import React, { useState, useEffect } from "react";
import { Menu } from "lucide-react";
import Image from "next/image";
export default function LandingPage() {
  const [isScrolled, setIsScrolled] = useState(false);

  // Handle scroll to reveal navigation elements
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans w-full">
      <div className="w-full relative pb-32">
        {/* Floating Top Menu Button */}
        <button
          className={`fixed top-4 right-4 md:top-8 md:right-8 z-50 bg-white border border-gray-200 text-gray-800 p-3.5 md:p-4 rounded-full shadow-sm hover:bg-gray-50 transition-all duration-300 transform 
            ${
              isScrolled
                ? "opacity-100 translate-y-0"
                : "opacity-0 -translate-y-4 pointer-events-none"
            }`}
          aria-label="Menu"
        >
          <Menu size={24} strokeWidth={2} />
        </button>

        {/* Hero Section: Full viewport height */}
        <div className="h-[100dvh] w-full p-4 md:p-8">
          {/* Image Container */}
          <div className="relative w-full h-full rounded-[2.5rem] md:rounded-[3.5rem] border border-gray-200 bg-gray-50 overflow-hidden shadow-sm">
            {/* 1. Mobile Image (Visible by default, hidden on md screens and up) */}
            <Image
              src="/afds1.png"
              alt="Mobile Campaign"
              className="block md:hidden w-full h-full object-cover"
              fill
              priority
              quality={100}
              sizes="100vw"
            />
            <div className="absolute inset-0 p-8 md:p-12 flex flex-col justify-end pointer-events-none">
              <h1 className="text-8xl md:text-9xl font-bold text-white tracking-tight leading-none drop-shadow-md">
                Growing
                <br />
                Joy
              </h1>
            </div>
            {/* 2. Desktop Image (Hidden by default, visible on md screens and up) */}
            <Image
              src="/ads1w.png"
              alt="Desktop Campaign"
              className="w-full h-full object-cover"
              width={2816}
              height={1536}
              priority
              quality={85}
              sizes="100vw"
              // style={{ width: "100%", height: "auto" }}
            />

            {/* Optional Overlay Content (Remove if you just want the pure image) */}
          </div>
        </div>

        {/* Content below the fold */}
        <div className="px-6 md:px-12 lg:px-24 py-12 space-y-6 max-w-screen-2xl mx-auto">
          <h2 className="text-xl md:text-2xl font-semibold text-gray-900 tracking-tight">
            Scroll to reveal UI
          </h2>
          <p className="text-gray-600 leading-relaxed text-sm md:text-base max-w-3xl">
            The layout elegantly swaps the background asset using CSS
            breakpoints, ensuring optimal aspect ratios across devices without
            sacrificing the clean UI aesthetic.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-6">
            <div className="h-40 rounded-[2rem] bg-gray-50 border border-gray-100" />
            <div className="h-40 rounded-[2rem] bg-gray-50 border border-gray-100" />
            <div className="h-40 rounded-[2rem] bg-gray-50 border border-gray-100" />
          </div>
        </div>

        {/* Fixed Bottom Action Bar */}
        <div
          className={`fixed bottom-6 left-0 w-full flex justify-center px-4 z-50 transition-all duration-300 transform 
            ${
              isScrolled
                ? "opacity-100 translate-y-0"
                : "opacity-0 translate-y-8 pointer-events-none"
            }`}
        >
          <div className="w-full max-w-md md:max-w-lg pointer-events-auto">
            <button className="w-full bg-gray-900 text-white font-medium text-lg py-4 px-8 rounded-full shadow-sm hover:bg-black active:scale-[0.98] transition-all">
              Get started
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
