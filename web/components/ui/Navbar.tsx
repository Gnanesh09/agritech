"use client";

import Link from "next/link";
import { motion } from "framer-motion";

export default function Navbar() {
  return (
    <motion.header
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.8 }}
      className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100"
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">

        {/* Logo */}

        <Link href="/" className="flex items-center gap-3">

          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-600 text-2xl text-white shadow-lg">
            🌱
          </div>

          <div>
            <h1 className="text-xl font-bold text-gray-900">
              Smart Agri
            </h1>

            <p className="text-xs text-gray-500">
              Autonomous Farming
            </p>
          </div>

        </Link>

        {/* Desktop Menu */}

        <nav className="hidden gap-10 text-sm font-medium md:flex">

          <a href="#" className="transition hover:text-green-700">
            Home
          </a>

          <a href="#features" className="transition hover:text-green-700">
            Features
          </a>

          <a href="#platform" className="transition hover:text-green-700">
            Platform
          </a>

          <a href="#dashboard" className="transition hover:text-green-700">
            Dashboard
          </a>

          <a href="#contact" className="transition hover:text-green-700">
            Contact
          </a>

        </nav>

        {/* Button */}

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: .95 }}
          className="rounded-full bg-green-700 px-6 py-3 text-white shadow-lg"
        >
          Get Started
        </motion.button>

      </div>
    </motion.header>
  );
}