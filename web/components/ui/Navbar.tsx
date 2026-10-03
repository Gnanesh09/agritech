"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import Image from "next/image";

const navItems = [
  { name: "Home", href: "#home" },
  { name: "Features", href: "#features" },
  { name: "How It Works", href: "#how-it-works" },
  { name: "Dashboard", href: "#dashboard" },
  { name: "Use Cases", href: "#use-cases" },
  { name: "FAQ", href: "#faq" },
  { name: "Contact", href: "#contact" },
];

export default function Navbar() {
  const [activeSection, setActiveSection] = useState("home");

  useEffect(() => {
    const sections = navItems.map((item) =>
      document.querySelector(item.href)
    );

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },
      {
        threshold: 0.4,
      }
    );

    sections.forEach((section) => {
      if (section) observer.observe(section);
    });

    return () => {
      sections.forEach((section) => {
        if (section) observer.unobserve(section);
      });
    };
  }, []);

  return (
    <motion.header
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6 }}
      className="fixed top-0 left-0 right-0 z-50 border-b border-gray-200/60 bg-white/80 backdrop-blur-xl"
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
        {/* Logo */}
        <Link href="#home" className="flex items-center gap-3">

<Image
  src="/logo.png"
  alt="Smart Agri Logo"
  width={52}
  height={52}
/>

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
          {navItems.map((item) => {
            const isActive = activeSection === item.href.substring(1);

            return (
              <Link
                key={item.name}
                href={item.href}
                className={`relative text-sm font-medium transition-all duration-300 ${
                  isActive
                    ? "text-green-700"
                    : "text-gray-700 hover:text-green-700"
                }`}
              >
                {item.name}

                <span
                  className={`absolute -bottom-1 left-0 h-[2px] bg-green-600 transition-all duration-300 ${
                    isActive ? "w-full" : "w-0"
                  }`}
                />
              </Link>
            );
          })}
        </nav>

        {/* CTA */}
        <motion.a
          href="#contact"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="rounded-full bg-green-700 px-6 py-3 text-white shadow-lg transition hover:bg-green-800"
        >
          Get Started
        </motion.a>
      </div>
    </motion.header>
  );
}