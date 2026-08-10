"use client";

import Link from "next/link";
import { motion } from "framer-motion";

const navItems = [
  { name: "Home", href: "#" },
  { name: "Features", href: "#features" },
  { name: "Platform", href: "#platform" },
  { name: "Dashboard", href: "#dashboard" },
  { name: "Contact", href: "#contact" },
];

export default function Navbar() {
  return (
    <motion.header
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="sticky top-0 z-50 border-b border-gray-200/60 bg-white/80 backdrop-blur-xl"
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

        {/* Navigation */}
        <nav className="hidden items-center gap-10 md:flex">

          {navItems.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className="relative text-sm font-medium text-gray-700 transition-colors duration-300 hover:text-green-700 after:absolute after:-bottom-1 after:left-0 after:h-[2px] after:w-0 after:bg-green-600 after:transition-all after:duration-300 hover:after:w-full"
            >
              {item.name}
            </Link>
          ))}

        </nav>

        {/* CTA Button */}
        <motion.button
          whileHover={{
            scale: 1.05,
          }}
          whileTap={{
            scale: 0.95,
          }}
          className="rounded-full bg-green-700 px-6 py-3 text-white shadow-lg transition hover:bg-green-800"
        >
          Get Started
        </motion.button>

      </div>
    </motion.header>
  );
}