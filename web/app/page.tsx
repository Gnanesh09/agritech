"use client";

import React, { useState, useEffect } from "react";
import { Menu, X, LogIn } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

const ANIMATED_WORDS = [
  "Cultivating...",
  "Farming...",
  "Seeding...",
  "Watering...",
  "Testing...",
];

export default function LandingPage() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [wordIndex, setWordIndex] = useState(0);

  // Handle scroll to reveal navigation elements
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
      if (window.scrollY > 50) setIsMenuOpen(false); // Auto-close menu on scroll
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Handle auto-playing word animation
  useEffect(() => {
    const interval = setInterval(() => {
      setWordIndex((prevIndex) => (prevIndex + 1) % ANIMATED_WORDS.length);
    }, 2500); // Changes word every 2.5 seconds

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans w-full selection:bg-gray-200">
      <div className="w-full relative pb-40">
        {/* Floating Top Menu Button & Dropdown */}
        <div
          className={`fixed top-4 right-4 md:top-8 md:right-8 z-50 transition-all duration-300 transform ${
            isScrolled
              ? "opacity-100 translate-y-0"
              : "opacity-0 -translate-y-4 pointer-events-none"
          }`}
        >
          <div className="relative">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="bg-white border border-gray-200 text-gray-800 p-3.5 md:p-4 rounded-full shadow-sm hover:bg-gray-50 transition-all duration-300 active:scale-95"
              aria-label="Menu"
            >
              {isMenuOpen ? (
                <X size={24} strokeWidth={2} />
              ) : (
                <Menu size={24} strokeWidth={2} />
              )}
            </button>

            {/* Dropdown Menu */}
            {isMenuOpen && (
              <div className="absolute top-full right-0 mt-3 w-48 bg-white border border-gray-100 rounded-2xl shadow-lg py-2 flex flex-col overflow-hidden animate-in fade-in slide-in-from-top-2">
                <Link
                  href="/login"
                  className="flex items-center gap-3 px-5 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-colors"
                >
                  <LogIn size={18} />
                  Sign In
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Hero Section: Full viewport height */}
        <div className="h-[100dvh] w-full p-3 md:p-6 lg:p-8">
          {/* Image Container */}
          <div className="relative w-full h-full rounded-[2rem] md:rounded-[3rem] border border-gray-200 bg-gray-900 overflow-hidden shadow-sm">
            {/* 1. Mobile Image Wrapper */}
            <div className="block md:hidden absolute inset-0 w-full h-full">
              <Image
                src="/afds1.png"
                alt="Mobile Campaign"
                fill
                className="object-cover"
                priority
                quality={90}
                sizes="100vw"
              />
            </div>

            {/* 2. Desktop Image Wrapper */}
            <div className="hidden md:block absolute inset-0 w-full h-full">
              <Image
                src="/ads1w.png"
                alt="Desktop Campaign"
                fill
                className="object-cover"
                priority
                quality={90}
                sizes="100vw"
              />
            </div>

            {/* Overlay Gradient for Text Readability */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent pointer-events-none" />

            {/* Responsive Typography overlay */}
            <div className="absolute inset-0 p-8 md:p-12 lg:p-16 flex flex-col justify-end pointer-events-none z-10">
              <h1 className="text-5xl sm:text-6xl md:text-8xl lg:text-9xl font-bold text-white tracking-tight leading-none drop-shadow-lg">
                Growing
                <br />
                Joy
              </h1>
            </div>
          </div>
        </div>

        {/* Single "Coming Soon" Animated Section */}
        <div className="px-6 md:px-12 lg:px-24 py-16 md:py-24 w-full mx-auto">
          <div className="w-full flex flex-col items-center justify-center text-center min-h-[40vh] md:min-h-[50vh] p-8 md:p-16 rounded-[2rem] md:rounded-[3.5rem] bg-gray-50 border border-gray-100 shadow-sm">
            <h2 className="text-5xl md:text-7xl lg:text-[200px] font-medium text-gray-900 tracking-tight mb-4 md:mb-6">
              Coming Soon
            </h2>

            {/* Fixed height container so the layout doesn't jump when words change */}
            <div className="my-8 h-12 md:h-16 flex items-center justify-center overflow-hidden">
              <span
                key={wordIndex} // Using key forces React to re-mount the element, triggering the animation
                className="text-2xl md:text-4xl text-gray-400 font-medium tracking-wide animate-in fade-in slide-in-from-bottom-4 duration-700"
              >
                {ANIMATED_WORDS[wordIndex]}
              </span>
            </div>
          </div>
        </div>

        {/* Fixed Bottom Action Bar */}
        <div
          className={`fixed bottom-6 left-0 w-full flex justify-center px-4 z-40 transition-all duration-500 transform ${
            isScrolled
              ? "opacity-100 translate-y-0"
              : "opacity-0 translate-y-12 pointer-events-none"
          }`}
        >
          <div className="w-full max-w-md md:max-w-lg pointer-events-auto">
            <Link href="/login" className="block w-full">
              <button className="w-full bg-gray-900 text-white font-medium text-lg py-4 px-8 rounded-full shadow-lg hover:bg-black hover:shadow-xl active:scale-[0.98] transition-all">
                Get started
              </button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
