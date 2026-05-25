"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Sidebar from "@/components/Sidebar";
import WebcamPanel from "@/components/vision/WebcamPanel";
import AnalyticsView from "@/components/vision/AnalyticsView";
import StudentsView from "@/components/vision/StudentsView";
import AttendanceTable from "@/components/vision/AttendanceTable";
import { GraduationCap } from "lucide-react";

export default function Page() {
  const [activeTab, setActiveTab] = useState("dashboard");

  const renderContent = () => {
    switch (activeTab) {
      case "dashboard":
        return (
          <motion.div
            key="dashboard"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="space-y-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-black text-slate-100 bg-gradient-to-r from-slate-100 to-slate-300 bg-clip-text text-transparent flex items-center gap-3">
                  Classroom Live Feed
                </h1>
                <p className="text-xs text-slate-400 mt-1">Real-time attendance detection, posture & focus score monitoring</p>
              </div>
            </div>
            
            {/* Webcam Panel & Local stats */}
            <WebcamPanel />
          </motion.div>
        );
      case "attendance":
        return (
          <motion.div
            key="attendance"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
          >
            <AttendanceTable />
          </motion.div>
        );
      case "analytics":
        return (
          <motion.div
            key="analytics"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
          >
            <AnalyticsView />
          </motion.div>
        );
      case "students":
        return (
          <motion.div
            key="students"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
          >
            <StudentsView />
          </motion.div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100 flex font-sans selection:bg-indigo-500/20 antialiased overflow-hidden">
      {/* Sidebar Navigation */}
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Main Content Area */}
      <main className="flex-1 ml-64 p-8 min-h-screen overflow-y-auto">
        <header className="flex justify-between items-center pb-6 mb-8 border-b border-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-500/10 text-indigo-400 p-2.5 rounded-xl border border-indigo-500/15">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest">Global Dashboard</span>
              <h2 className="text-base font-extrabold text-slate-200">Room 304A • Computer Science</h2>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-2 text-slate-400 bg-slate-900/50 border border-slate-800/80 px-4 py-2 rounded-xl backdrop-blur-md">
              <span className="w-2 h-2 rounded-full bg-indigo-500 shadow-glow" />
              <span>Session: <span className="font-semibold text-slate-200">Theory of Automata</span></span>
            </div>
            <div className="text-slate-500 font-medium">May 26, 2026</div>
          </div>
        </header>

        {/* Dynamic page transition container */}
        <div className="pb-12">
          <AnimatePresence mode="wait">{renderContent()}</AnimatePresence>
        </div>
      </main>
    </div>
  );
}