"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  User,
  Radar,
  Plus,
} from "lucide-react";

export default function BottomNav() {
  const pathname = usePathname();

  const isHome = pathname === "/home";
  const isProfile = pathname.startsWith("/home/profile");
  const isMonitor = pathname.startsWith("/home/monitor");
  const isAdd = pathname.startsWith("/home/add");

  return (
    <nav className="fixed bottom-5 left-1/2 z-50 w-[calc(100%-24px)] max-w-[390px] -translate-x-1/2">
      <div
        className="
          relative
          flex
          h-[68px]
          items-center
          justify-between
          rounded-[24px]
          border
          border-[#28513B]
          bg-[#0B2119]/95
          px-2
          shadow-[0_18px_45px_rgba(0,0,0,0.38)]
          backdrop-blur-xl
        "
      >
        {/* Top green glow */}
        <div
          className="
            pointer-events-none
            absolute
            left-10
            right-10
            top-0
            h-px
            bg-[#7CFF6B]/25
            blur-[1px]
          "
        />

        {/* HOME */}
        <NavItem
          href="/home"
          active={isHome}
          icon={Home}
          label="Home"
        />

        {/* ADD */}
        <NavItem
          href="/home/add"
          active={isAdd}
          icon={Plus}
          label="Add"
          special
        />

        {/* MONITOR */}
        <NavItem
          href="/home/monitor"
          active={isMonitor}
          icon={Radar}
          label="Monitor"
        />

        {/* PROFILE */}
        <NavItem
          href="/home/profile"
          active={isProfile}
          icon={User}
          label="Profile"
        />
      </div>
    </nav>
  );
}

function NavItem({
  href,
  active,
  icon: Icon,
  label,
  special = false,
}: {
  href: string;
  active: boolean;
  icon: React.ElementType;
  label: string;
  special?: boolean;
}) {
  return (
    <Link
      href={href}
      className="
        group
        relative
        flex
        h-[58px]
        flex-1
        items-center
        justify-center
        rounded-[18px]
        transition-all
        duration-300
      "
    >
      {/* Normal active background */}
      {active && !special && (
        <div
          className="
            absolute
            inset-x-2
            inset-y-1
            rounded-[18px]
            bg-[#163526]
            shadow-[inset_0_0_0_1px_rgba(124,255,107,0.08)]
          "
        />
      )}

      <div className="relative flex flex-col items-center justify-center">

        {/* ADD BUTTON */}
        {special ? (
          <div
            className={`
              flex
              h-10
              w-10
              items-center
              justify-center
              rounded-[14px]
              border
              transition-all
              duration-300
              ${
                active
                  ? `
                    border-[#7CFF6B]/50
                    bg-[#7CFF6B]
                    text-[#071A13]
                    shadow-[0_0_20px_rgba(124,255,107,0.28)]
                  `
                  : `
                    border-[#28513B]
                    bg-[#102D22]
                    text-[#7CFF6B]
                    group-hover:border-[#7CFF6B]/40
                    group-hover:bg-[#153526]
                  `
              }
            `}
          >
            <Icon
              size={20}
              strokeWidth={active ? 2.5 : 2}
            />
          </div>
        ) : (
          /* NORMAL ICON */
          <div
            className={`
              flex
              h-8
              w-8
              items-center
              justify-center
              rounded-xl
              transition-all
              duration-300
              ${
                active
                  ? "bg-[#163526]"
                  : "bg-transparent group-hover:bg-[#102D22]"
              }
            `}
          >
            <Icon
              size={19}
              strokeWidth={active ? 2.4 : 1.8}
              className={`
                transition-all
                duration-300
                ${
                  active
                    ? "text-[#7CFF6B]"
                    : "text-[#718C7D] group-hover:text-[#A6BCAF]"
                }
              `}
            />
          </div>
        )}

        {/* LABEL */}
        <span
          className={`
            mt-0.5
            text-[9px]
            font-medium
            transition-all
            duration-300
            ${
              active
                ? "text-[#7CFF6B]"
                : "text-[#718C7D] group-hover:text-[#A6BCAF]"
            }
          `}
        >
          {label}
        </span>

        {/* ACTIVE DOT */}
        {active && (
          <span
            className="
              absolute
              -bottom-1
              h-1
              w-1
              rounded-full
              bg-[#7CFF6B]
              shadow-[0_0_8px_#7CFF6B]
            "
          />
        )}
      </div>
    </Link>
  );
}