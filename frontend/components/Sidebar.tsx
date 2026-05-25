"use client";

import { LayoutDashboard, Users, BarChart3, ClipboardCheck, GraduationCap } from "lucide-react";

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export default function Sidebar({ activeTab, setActiveTab }: SidebarProps) {
  const menuItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "attendance", label: "Attendance", icon: ClipboardCheck },
    { id: "analytics", label: "Analytics", icon: BarChart3 },
    { id: "students", label: "Students", icon: Users },
  ];

  return (
    <aside className="w-64 glass-panel border-r border-slate-800 h-screen fixed top-0 left-0 flex flex-col z-30">
      {/* Brand Header */}
      <div className="p-6 border-b border-slate-800/80 flex items-center gap-3">
        <div className="bg-indigo-600/20 text-indigo-400 p-2.5 rounded-xl border border-indigo-500/30 shadow-glow">
          <GraduationCap className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-lg font-bold bg-gradient-to-r from-slate-100 to-slate-300 bg-clip-text text-transparent">
            Aegis Classroom
          </h1>
          <span className="text-[10px] text-slate-500 font-semibold tracking-wider uppercase">
            AI Monitor v2.5
          </span>
        </div>
      </div>

      {/* Nav List */}
      <nav className="flex-1 px-4 py-6 space-y-2">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3.5 px-4 py-3.5 rounded-xl text-sm font-semibold transition-all duration-300 ${
                isActive
                  ? "bg-indigo-600/15 text-indigo-400 border border-indigo-500/25 shadow-[inset_0_0_12px_rgba(99,102,241,0.08)]"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 border border-transparent"
              }`}
            >
              <Icon className={`w-5 h-5 transition-transform duration-300 ${isActive ? "scale-110" : "group-hover:scale-110"}`} />
              {item.label}
            </button>
          );
        })}
      </nav>

      {/* Footer Details */}
      <div className="p-6 border-t border-slate-800/80 text-xs text-slate-500 flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse border border-emerald-400/20" />
          <span className="font-semibold text-slate-400">Class Session Active</span>
        </div>
        <span className="mt-1 text-[10px]">Processing webcam at 800ms</span>
      </div>
    </aside>
  );
}
