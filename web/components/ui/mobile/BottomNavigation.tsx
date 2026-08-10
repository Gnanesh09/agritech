"use client";

import {
  House,
  BarChart3,
  Bell,
  Settings,
} from "lucide-react";

export default function BottomNavigation() {
  return (
    <div className="absolute bottom-0 left-0 right-0 border-t border-slate-200 bg-white/90 backdrop-blur-xl">

      <div className="flex justify-around py-4">

        <NavItem active icon={<House size={20} />} label="Home" />

        <NavItem icon={<BarChart3 size={20} />} label="Analytics" />

        <NavItem icon={<Bell size={20} />} label="Alerts" />

        <NavItem icon={<Settings size={20} />} label="Settings" />

      </div>

    </div>
  );
}

function NavItem({
  icon,
  label,
  active = false,
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
}) {
  return (
    <div
      className={`flex flex-col items-center gap-1 ${
        active ? "text-green-600" : "text-slate-400"
      }`}
    >
      {icon}

      <span className="text-[11px] font-medium">
        {label}
      </span>
    </div>
  );
}