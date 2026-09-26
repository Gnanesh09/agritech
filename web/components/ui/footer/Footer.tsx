"use client";

import Link from "next/link";
import { Leaf } from "lucide-react";

const productLinks = [
  {
    name: "Features",
    href: "#features",
  },
  {
    name: "Dashboard",
    href: "#dashboard",
  },
  {
    name: "Mobile App",
    href: "#mobile-app",
  },
  {
    name: "Platform",
    href: "#platform",
  },
];

export default function Footer() {
  return (
    <footer className="relative overflow-hidden border-t border-white/10 bg-[#102d21] text-green-50">

      {/* Background Glow */}

      <div className="absolute left-1/2 top-0 h-80 w-80 -translate-x-1/2 rounded-full bg-[#5d8e3e]/20 blur-3xl" />

      <div className="relative mx-auto max-w-7xl px-6 py-14 sm:py-20">

        <div className="grid gap-16 lg:grid-cols-3">

          {/* Brand */}

          <div>

            <div className="flex items-center gap-3">

              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-green-600 text-white shadow-lg">
                <Leaf className="h-6 w-6" />
              </div>

              <div>

                <h2 className="text-2xl font-semibold text-white">
                  Smart Agri
                </h2>

                <p className="text-sm font-medium text-[#b9d48d]">
                  Grow Smarter. Farm Better.
                </p>

              </div>

            </div>

            <p className="mt-6 max-w-md leading-7 text-green-50/70">
              An AI-powered smart agriculture platform combining
              IoT, automation, and intelligent insights to help
              growers monitor crops, automate decisions, and
              maximize productivity from anywhere.
            </p>

          </div>

          {/* Product */}

          <div>

            <h3 className="mb-6 text-lg font-semibold text-white">
              Product
            </h3>

            <ul className="space-y-4">

              {productLinks.map((item) => (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    className="text-green-50/70 transition duration-300 hover:text-[#b9d48d]"
                  >
                    {item.name}
                  </Link>
                </li>
              ))}

            </ul>

          </div>

          {/* Status */}

          <div>

            <h3 className="mb-6 text-lg font-semibold text-white">
              Current Status
            </h3>

            <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-6 backdrop-blur-sm">

              <div className="flex items-center gap-3">

                <div className="h-3 w-3 rounded-full bg-green-500 animate-pulse" />

                <span className="font-semibold text-[#b9d48d]">
                  MVP Under Development
                </span>

              </div>

              <p className="mt-4 leading-7 text-green-50/70">
                We&apos;re actively building Smart Agri.
                More features, documentation, and community
                resources will be available soon.
              </p>

            </div>

          </div>

        </div>

        {/* Bottom */}

        <div className="mt-14 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-8 text-sm text-green-50/50 md:flex-row">

          <p>
            © {new Date().getFullYear()} Smart Agri. All rights reserved.
          </p>

          <p>
            Built with Next.js • Tailwind CSS • Framer Motion
          </p>

        </div>

      </div>

    </footer>
  );
}
