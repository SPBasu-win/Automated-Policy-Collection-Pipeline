"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Scale, Home, MessageSquare, LogOut, FileText } from "lucide-react";

export default function Sidebar() {
  const pathname = usePathname();

  const navItems = [
    { name: "Notification Center", href: "/", icon: Home },
    { name: "Agent Chat", href: "/chat", icon: MessageSquare },
  ];

  return (
    <aside className="fixed top-0 left-0 h-screen w-64 bg-zinc-950 border-r border-zinc-800 flex flex-col z-50">
      
      <div className="h-16 flex items-center gap-3 px-5 border-b border-zinc-800">
        <div className="p-1.5 bg-zinc-100 rounded-md">
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
                    ? "bg-zinc-800 text-white font-medium"
                    : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
                }`}
              >
                <item.icon className={`w-4 h-4 ${isActive ? "text-white" : "text-zinc-500 group-hover:text-zinc-300"}`} />
                {item.name}
              </div>
            </Link>
          );
        })}
      </nav>

      
      <div className="p-4 border-t border-zinc-800">
        <div className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-zinc-900 transition-colors cursor-pointer">
          <div className="w-8 h-8 rounded bg-zinc-800 flex items-center justify-center text-xs font-bold text-zinc-400 border border-zinc-700">
            JD
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="text-xs font-medium text-white truncate">John Doe</p>
            <p className="text-[10px] text-zinc-500 truncate">Citizen Access Lvl 1</p>
          </div>
          <LogOut className="w-3 h-3 text-zinc-600" />
        </div>
      </div>
    </aside>
  );
}