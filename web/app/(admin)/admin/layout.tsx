"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Home,
  Activity,
  PieChart,
  Settings,
  LogOut,
  Search,
  Bell,
  Menu,
  Command,
  User,
} from "lucide-react";
import api from "../../lib/axios";
import { toast } from "../../../components/ui/toast";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuGroup,
} from "../../../components/ui/dropdown-menu";
import { logoutServerAction } from "../../actions/auth";

export default function HomeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const handleLogout = async () => {
    try {
      // 1. Call the Server Action
      const result = await logoutServerAction();

      // 2. Show Success
      toast.add({
        title: "Logged out successfully",
        description: "See you next time!",
        type: "success",
      });

      // 3. Clear any frontend state (if you have Context/Zustand)
      // setAccessToken(null);

      // 4. Safely Redirect
      router.refresh(); // Forces Next.js to realize the cookie is gone
      router.push("/login");
    } catch (error) {
      console.error("Logout Error Details:", error);
      toast.add({
        title: "Logout failed",
        description: "Please try again.",
        type: "error",
      });
    }
  };

  const navItems = [
    { name: "Overview", href: "/home/dash", icon: Home },
    { name: "Analytics", href: "/home/analytics", icon: Activity },
    { name: "Reports", href: "/home/reports", icon: PieChart },
    { name: "Settings", href: "/home/settings", icon: Settings },
    { name: "Settings", href: "/home/settings", icon: Settings },
    { name: "Settings", href: "/home/settings", icon: Settings },
    { name: "Settings", href: "/home/settings", icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-brand-light flex font-sans">
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-brand-dark/20 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <aside
        className={`
        fixed lg:static inset-y-0 left-0 z-50
        w-64 bg-surface  flex flex-col transition-transform duration-300 ease-in-out
        ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }
      `}
      >
        <div className="h-20 flex items-center px-6 border-b border-brand-border">
          <div className="flex items-center gap-3 text-brand-dark font-black tracking-tight text-4xl">
            <span className="bg-gradient-to-r from-black via-[#208c73] to-[#00ffc3] bg-clip-text text-transparent font-bold">
              admin
            </span>
          </div>
        </div>

        <nav className="flex-1 px-4 py-6  space-y-2 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`
                  flex items-center gap-3 px-4 py-3 rounded-es-2xl text-sm font-semibold transition-all
                  ${
                    isActive
                      ? "bg-brand text-brand-dark shadow-sm"
                      : "text-brand-muted hover:text-brand-dark hover:bg-brand-light"
                  }
                `}
              >
                <Icon
                  className={`h-5 w-5 ${
                    isActive ? "text-brand-dark" : "text-brand-muted"
                  }`}
                />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-brand-border">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 w-full rounded-full text-sm font-bold text-brand-muted hover:text-accent-error hover:bg-accent-error/10 transition-all"
          >
            <LogOut className="h-5 w-5" />
            Sign out
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <header className="h-20 bg-surface/90 backdrop-blur-md border-b border-brand-border flex items-center justify-between px-4 lg:px-8 z-30 sticky top-0">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden p-2 -ml-2 text-brand-muted hover:text-brand-dark rounded-full hover:bg-brand-light"
            >
              <Menu className="h-6 w-6" />
            </button>

            <div className="hidden md:flex relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-brand-muted group-focus-within:text-brand-dark transition-colors" />
              <input
                type="text"
                placeholder="Search anything..."
                className="pl-11 pr-4 py-2.5 bg-brand-light border border-transparent rounded-full text-sm font-medium text-brand-dark placeholder:text-brand-muted focus:bg-surface focus:border-brand-dark focus:ring-4 focus:ring-brand/20 outline-none transition-all w-72"
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button className="p-2.5 text-brand-muted hover:text-brand-dark bg-brand-light hover:bg-brand rounded-full transition-colors relative">
              <Bell className="h-5 w-5" />
              <span className="absolute top-2 right-2 h-2.5 w-2.5 bg-accent-error rounded-full border-2 border-surface"></span>
            </button>

            <DropdownMenu>
              <DropdownMenuTrigger className="h-10 w-10 rounded-full bg-brand text-brand-dark flex items-center justify-center text-sm font-black shadow-sm cursor-pointer hover:ring-4 hover:ring-brand/30 transition-all outline-none focus:outline-none">
                G
              </DropdownMenuTrigger>

              <DropdownMenuContent
                align="end"
                className="w-56 mt-2 border-brand-border shadow-card bg-surface rounded-2xl"
              >
                <DropdownMenuGroup>
                  <DropdownMenuLabel className="font-normal p-3">
                    <div className="flex flex-col space-y-1">
                      <p className="text-base font-bold leading-none text-brand-dark">
                        Gaurav
                      </p>
                      <p className="text-xs font-medium leading-none text-brand-muted mt-1">
                        Admin
                      </p>
                    </div>
                  </DropdownMenuLabel>
                </DropdownMenuGroup>

                <DropdownMenuSeparator className="bg-brand-border" />

                <DropdownMenuItem
                  onClick={() => router.push("/home/settings")}
                  className="cursor-pointer focus:bg-brand-light rounded-xl m-1 p-3 font-semibold text-brand-dark"
                >
                  <User className="mr-3 h-4 w-4 text-brand-muted" />
                  <span>Profile</span>
                </DropdownMenuItem>

                <DropdownMenuSeparator className="bg-brand-border" />

                <DropdownMenuItem
                  onClick={handleLogout}
                  className="cursor-pointer text-accent-error focus:bg-accent-error/10 focus:text-accent-error rounded-xl m-1 p-3 font-semibold"
                >
                  <LogOut className="mr-3 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-2 lg:p-2 bg-purple-300 m-1 rounded-3xl scrollbar-none">
          {children}
        </div>
      </main>
    </div>
  );
}
