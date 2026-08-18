"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, User, Radar, Plus } from "lucide-react";

export default function BottomNav() {
  const pathname = usePathname();

  const isHome = pathname === "/home";
  const isProfile = pathname.startsWith("/home/profile");
  const isMonitor = pathname.startsWith("/home/monitor");
  const isAdd = pathname.startsWith("/home/add");

  return (
    <nav className="fixed bottom-8 left-1/2 z-50 -translate-x-1/2">
      <div
        className="
                    flex
                    items-center
                    gap-full
                    rounded-full
                    border
                    border-gray-300/80
                    bg-white/95
                    p-1
                    shadow-[0_8px_30px_rgba(0,0,0,0.12)]
                    backdrop-blur-xl
                    h-16
                "
      >
        {/* HOME */}

        <Link
          href="/home"
          className={`
                        flex
                        
                        h-full
                        min-w-[92px]
                        flex-col
                        items-center
                        justify-center
                        rounded-full
                        transition-all
                        duration-200
                        ${
                          isHome
                            ? "bg-brand/30 text-black shadow-sm"
                            : "text-gray-400 hover:bg-gray-50 hover:text-gray-600"
                        }
                    `}
        >
          <Home size={18} strokeWidth={isHome ? 2.5 : 2} />

          <span className="mt-1 text-[11px] font-medium">Home</span>
        </Link>
        <Link
          href="/home/add"
          className={`
                        flex
                        
                        h-full
                        min-w-[92px]
                        flex-col
                        items-center
                        justify-center
                        rounded-full
                        transition-all
                        duration-200
                        ${
                          isAdd
                            ? "bg-brand/30 text-black shadow-sm"
                            : "text-gray-400 hover:bg-gray-50 hover:text-gray-600"
                        }
                    `}
        >
          <Plus size={18} strokeWidth={isAdd ? 2.5 : 2} />

          <span className="mt-1 text-[11px] font-medium">Add</span>
        </Link>

        {/* PROFILE */}

        <Link
          href="/home/monitor"
          className={`
                        flex
                        h-full
                        min-w-[82px]
                        flex-col
                        items-center
                        justify-center
                        rounded-full
                        transition-all
                        duration-200
                        ${
                          isMonitor
                            ? "bg-brand/30 text-black shadow-sm"
                            : "text-gray-400 hover:bg-gray-50 hover:text-gray-600"
                        }
                    `}
        >
          <Radar size={18} strokeWidth={isMonitor ? 2.5 : 2} />

          <span className="mt-1 text-[11px] font-medium">Monitor</span>
        </Link>
        <Link
          href="/home/profile"
          className={`
                        flex
                        h-full
                        min-w-[82px]
                        flex-col
                        items-center
                        justify-center
                        rounded-full
                        transition-all
                        duration-200
                        ${
                          isProfile
                            ? "bg-brand/30 text-black shadow-sm"
                            : "text-gray-400 hover:bg-gray-50 hover:text-gray-600"
                        }
                    `}
        >
          <User size={18} strokeWidth={isProfile ? 2.5 : 2} />

          <span className="mt-1 text-[11px] font-medium">Profile</span>
        </Link>
      </div>
    </nav>
  );
}
