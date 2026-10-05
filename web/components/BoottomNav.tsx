"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Home, User, Radar, Plus } from "lucide-react";

const tabs = [
  { name: "Home", href: "/home", icon: Home },
  { name: "Add", href: "/home/add", icon: Plus },
  { name: "Monitor", href: "/home/monitor", icon: Radar },
  { name: "Profile", href: "/home/profile", icon: User },
];

export default function BottomNav() {
  const pathname = usePathname();

  const activeTab = tabs.findIndex((tab) =>
    tab.href === "/home"
      ? pathname === "/home"
      : pathname.startsWith(tab.href)
  );

  return (
    <nav className="fixed bottom-5 left-1/2 z-50 w-[calc(100%-32px)] max-w-[430px] -translate-x-1/2">
      <div className="flex h-[66px] items-center justify-around rounded-full border border-gray-200/80 bg-white/90 p-1.5 shadow-[0_8px_35px_rgba(0,0,0,0.12)] backdrop-blur-2xl transition-colors duration-300 dark:border-gray-700 dark:bg-gray-800">
        {tabs.map(({ name, href, icon: Icon }, index) => {
          const isActive = activeTab === index;

          return (
            <Link
              key={href}
              href={href}
              aria-current={isActive ? "page" : undefined}
              className="relative flex h-full min-w-0 flex-1 items-center justify-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-green-500"
            >
              {isActive && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute inset-0 rounded-full bg-lime-200 dark:bg-green-700"
                  transition={{
                    type: "spring",
                    stiffness: 380,
                    damping: 32,
                  }}
                />
              )}

              <motion.div
                className={`relative z-10 flex flex-col items-center justify-center gap-1 ${
                  isActive
                    ? "text-gray-950 dark:text-white"
                    : "text-gray-400 dark:text-gray-400"
                }`}
                animate={{
                  scale: isActive ? 1.04 : 1,
                  y: isActive ? -1 : 0,
                }}
                transition={{
                  type: "spring",
                  stiffness: 350,
                  damping: 22,
                }}
              >
                <motion.div
                  animate={{
                    rotate: isActive && name === "Add" ? 90 : 0,
                  }}
                  transition={{ duration: 0.25 }}
                >
                  <Icon
                    size={21}
                    strokeWidth={isActive ? 2.6 : 1.9}
                  />
                </motion.div>

                <motion.span
                  className="text-[11px] font-semibold"
                  animate={{
                    opacity: isActive ? 1 : 0.8,
                  }}
                >
                  {name}
                </motion.span>
              </motion.div>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}