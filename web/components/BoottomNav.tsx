"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, User, Radar } from "lucide-react";

export default function BottomNav() {
  const pathname = usePathname();

  const isHome = pathname === "/home";
  const isProfile = pathname.startsWith("/home/profile");
  const isMonitor = pathname.startsWith("/home/monitor");

  return (
    <nav className="fixed bottom-10 left-1/2 z-50 -translate-x-1/2">
      <div
        className="
                    flex
                    items-center
                    gap-1
                    rounded-[22px]
                    border
                    border-gray-200/80
                    bg-white/95
                    p-3
                    shadow-[0_8px_30px_rgba(0,0,0,0.12)]
                    backdrop-blur-xl
                "
      >
        {/* HOME */}

        <Link
          href="/home"
          className={`
                        flex
                        h-18
                        min-w-[82px]
                        flex-col
                        items-center
                        justify-center
                        rounded-[17px]
                        transition-all
                        duration-200
                        ${
                          isHome
                            ? "bg-gray-100 text-blue-600 shadow-sm"
                            : "text-gray-400 hover:bg-gray-50 hover:text-gray-600"
                        }
                    `}
        >
          <Home size={21} strokeWidth={isHome ? 2.5 : 2} />

          <span className="mt-1 text-[11px] font-medium">Home</span>
        </Link>

        {/* PROFILE */}

        <Link
          href="/home/monitor"
          className={`
                        flex
                        h-18
                        min-w-[82px]
                        flex-col
                        items-center
                        justify-center
                        rounded-[17px]
                        transition-all
                        duration-200
                        ${
                          isMonitor
                            ? "bg-gray-100 text-blue-600 shadow-sm"
                            : "text-gray-400 hover:bg-gray-50 hover:text-gray-600"
                        }
                    `}
        >
          <Radar size={21} strokeWidth={isMonitor ? 2.5 : 2} />

          <span className="mt-1 text-[11px] font-medium">Monitor</span>
        </Link>
        <Link
          href="/home/profile"
          className={`
                        flex
                        h-18
                        min-w-[82px]
                        flex-col
                        items-center
                        justify-center
                        rounded-[17px]
                        transition-all
                        duration-200
                        ${
                          isProfile
                            ? "bg-gray-100 text-blue-600 shadow-sm"
                            : "text-gray-400 hover:bg-gray-50 hover:text-gray-600"
                        }
                    `}
        >
          <User size={21} strokeWidth={isProfile ? 2.5 : 2} />

          <span className="mt-1 text-[11px] font-medium">Profile</span>
        </Link>
      </div>
    </nav>
  );
}
