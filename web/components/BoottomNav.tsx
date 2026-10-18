
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { Home, User, Radar, Plus, Leaf } from "lucide-react";

const tabs = [
  { name: "Home", href: "/home", icon: Home },
  { name: "Add", href: "/home/add", icon: Plus },
  { name: "Monitor", href: "/home/monitor", icon: Radar },
  { name: "Profile", href: "/home/profile", icon: User },
];

export default function BottomNav() {
  const pathname = usePathname();
  const [expanded, setExpanded] = useState(false);

  const activeTab = tabs.findIndex((tab) =>
    tab.href === "/home"
      ? pathname === "/home"
      : pathname.startsWith(tab.href)
  );

  return (
    <>
      {/* Mobile bottom navigation — unchanged */}
      <nav
        aria-label="Mobile navigation"
        className="fixed bottom-3 left-1/2 z-50 w-[calc(100%-24px)] max-w-[560px] -translate-x-1/2 sm:bottom-5 sm:w-[calc(100%-40px)] lg:hidden"
      >
        <div className="flex h-[66px] items-center justify-around rounded-full border border-gray-200/80 bg-white/90 p-1.5 shadow-[0_8px_35px_rgba(0,0,0,0.12)] backdrop-blur-2xl dark:border-gray-700 dark:bg-gray-800">
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
                    layoutId="smartagri-mobile-active-tab"
                    className="absolute inset-0 rounded-full bg-lime-200 dark:bg-green-700"
                    transition={{
                      type: "spring",
                      stiffness: 380,
                      damping: 32,
                    }}
                  />
                )}

                <motion.div
                  className={`relative z-10 flex flex-col items-center justify-center gap-1 ${isActive
                      ? "text-gray-950 dark:text-white"
                      : "text-gray-400"
                    }`}
                  animate={{
                    scale: isActive ? 1.04 : 1,
                    y: isActive ? -1 : 0,
                  }}
                >
                  <Icon size={21} strokeWidth={isActive ? 2.6 : 1.9} />
                  <span className="text-[11px] font-semibold">{name}</span>
                </motion.div>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Desktop hover sidebar */}
      <motion.aside
        initial={false}
        animate={{ width: expanded ? 256 : 76 }}
        transition={{ duration: 0.28, ease: "easeInOut" }}
        onMouseEnter={() => setExpanded(true)}
        onMouseLeave={() => setExpanded(false)}
        onFocusCapture={() => setExpanded(true)}
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
            setExpanded(false);
          }
        }}
        className="fixed inset-y-0 left-0 z-50 hidden flex-col overflow-hidden border-r border-[#e5eadf] bg-white/95 px-3 py-7 shadow-lg backdrop-blur-xl dark:border-gray-800 dark:bg-gray-900 lg:flex"
      >
        {/* Logo */}
        <Link
          href="/home"
          aria-label="SmartAgri home"
          className={`mb-10 flex min-h-11 shrink-0 items-center ${expanded ? "gap-3 px-2" : "justify-center"
            }`}
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#287a38] text-white">
            <Leaf size={23} />
          </span>

          <AnimatePresence initial={false}>
            {expanded && (
              <motion.span
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: "auto" }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden whitespace-nowrap"
              >
                <span className="block text-lg font-bold tracking-tight text-[#15221a] dark:text-white">
                  SmartAgri
                </span>
                <span className="block text-[10px] font-medium tracking-[0.12em] text-[#71906a]">
                  GROW WITH CONFIDENCE
                </span>
              </motion.span>
            )}
          </AnimatePresence>
        </Link>

        {/* Workspace label */}
        <AnimatePresence initial={false}>
          {expanded && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="mb-3 shrink-0 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-gray-400"
            >
              Workspace
            </motion.p>
          )}
        </AnimatePresence>

        {/* Navigation links */}
        <nav aria-label="Primary navigation" className="space-y-1.5">
          {tabs.map(({ name, href, icon: Icon }, index) => {
            const isActive = activeTab === index;

            return (
              <Link
                key={href}
                href={href}
                aria-current={isActive ? "page" : undefined}
                aria-label={!expanded ? name : undefined}
                title={!expanded ? name : undefined}
                className={`flex min-h-12 items-center rounded-xl text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 ${expanded ? "gap-3 px-3" : "justify-center px-0"
                  } ${isActive
                    ? "bg-[#e8f5d7] text-[#245d2b] dark:bg-green-900/50 dark:text-green-200"
                    : "text-gray-500 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
                  }`}
              >
                <Icon
                  size={19}
                  className="shrink-0"
                  strokeWidth={isActive ? 2.4 : 1.9}
                />

                <AnimatePresence initial={false}>
                  {expanded && (
                    <motion.span
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: "auto" }}
                      exit={{ opacity: 0, width: 0 }}
                      transition={{ duration: 0.18 }}
                      className="overflow-hidden whitespace-nowrap"
                    >
                      {name}
                    </motion.span>
                  )}
                </AnimatePresence>
              </Link>
            );
          })}
        </nav>

        {/* Footer card */}
        <div className="mt-auto shrink-0">
          <AnimatePresence initial={false}>
            {expanded && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="rounded-2xl bg-[#f4f7ed] p-4 dark:bg-gray-800">
                  <p className="text-sm font-semibold text-[#274b2d] dark:text-green-200">
                    Growing better, together
                  </p>
                  <p className="mt-1 text-xs leading-5 text-gray-500 dark:text-gray-400">
                    Monitor your crops and growing environment from one place.
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.aside>
    </>
  );
}
