"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Scale, Home, MessageSquare, LogOut, User as UserIcon } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

export default function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const navItems = [
    { name: "Notification Center", href: "/", icon: Home },
    { name: "Agent Chat", href: "/chat", icon: MessageSquare },
  ];

  return (
    <aside className="fixed top-0 left-0 h-screen w-64 bg-zinc-950 border-r border-zinc-800 flex flex-col z-50">
      
      <div className="h-16 flex items-center gap-3 px-5 border-b border-zinc-800">
        <div className="p-1.5 bg-zinc-100 rounded-md shadow-lg">
          <Scale className="w-4 h-4 text-zinc-900" />
        </div>
        <span className="font-semibold text-zinc-100 tracking-tight text-sm">
          The People's Agent
        </span>
      </div>

     
      <nav className="flex-1 px-3 py-6 space-y-1">
        <div className="px-3 pb-2 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
          Platform
        </div>
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link key={item.href} href={item.href}>
              <div
                className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-all duration-200 group ${
                  isActive
                    ? "bg-zinc-800 text-white font-medium shadow-lg"
                    : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200 hover:shadow-md transform hover:scale-[1.02]"
                }`}
              >
                <item.icon className={`w-4 h-4 transition-transform group-hover:scale-110 ${isActive ? "text-white" : "text-zinc-500 group-hover:text-zinc-300"}`} />
                {item.name}
              </div>
            </Link>
          );
        })}
      </nav>

      
      <div className="p-4 border-t border-zinc-800">
        {user ? (
          <div className="space-y-2">
            <Link href="/profile">
              <div className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-zinc-900 transition-all cursor-pointer hover:shadow-lg transform hover:scale-[1.02]">
                <div className="w-8 h-8 rounded bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-xs font-bold text-white border border-zinc-700 shadow-md">
                  {user.username.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 overflow-hidden">
                  <p className="text-xs font-medium text-white truncate">{user.username}</p>
                  <p className="text-[10px] text-zinc-500 truncate">Citizen Access Lvl 1</p>
                </div>
                <UserIcon className="w-3 h-3 text-zinc-600" />
              </div>
            </Link>
            <button
              onClick={logout}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-zinc-900 hover:bg-red-500/10 text-zinc-400 hover:text-red-400 border border-zinc-800 hover:border-red-500/20 transition-all hover:shadow-lg transform hover:scale-[1.02]"
            >
              <LogOut className="w-3 h-3" />
              <span className="text-xs font-medium">Sign Out</span>
            </button>
          </div>
        ) : (
          <Link href="/auth">
            <button className="w-full px-3 py-2 rounded-lg bg-white text-black text-sm font-medium hover:bg-zinc-100 transition-all hover:shadow-lg transform hover:scale-[1.02]">
              Sign In
            </button>
          </Link>
        )}
      </div>
    </aside>
  );
}