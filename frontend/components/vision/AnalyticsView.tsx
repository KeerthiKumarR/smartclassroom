"use client";

import { useState, useEffect } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, Legend } from "recharts";
import { API_URL } from "@/lib/api";
import { TrendingUp, Award, Clock, Users, ArrowUpRight, Zap } from "lucide-react";

// Mock historic trend data
const weeklyTrend = [
  { day: "Mon", attendance: 92, engagement: 84 },
  { day: "Tue", attendance: 95, engagement: 88 },
  { day: "Wed", attendance: 88, engagement: 81 },
  { day: "Thu", attendance: 94, engagement: 85 },
  { day: "Fri", attendance: 91, engagement: 89 },
];

const hourlyFocus = [
  { hour: "09:00 AM", focus: 85, distraction: 15 },
  { hour: "10:00 AM", focus: 88, distraction: 12 },
  { hour: "11:00 AM", focus: 79, distraction: 21 },
  { hour: "12:00 PM", focus: 72, distraction: 28 },
  { hour: "01:00 PM", focus: 82, distraction: 18 },
  { hour: "02:00 PM", focus: 86, distraction: 14 },
];

export default function AnalyticsView() {
  const [liveStats, setLiveStats] = useState({
    classEngagement: 82,
    studentsPresent: 18,
    distractedStudents: 2,
    facesDetected: 20,
    focusedCount: 18,
  });

  useEffect(() => {
    async function fetchStats() {
      try {
        const response = await fetch(`${API_URL}/analytics`);
        if (response.ok) {
          const data = await response.ok ? await response.json() : null;
          if (data) {
            setLiveStats(data);
          }
        }
      } catch (e) {
        // silent fallback to default
      }
    }
    fetchStats();
    const interval = setInterval(fetchStats, 3000);
    return () => clearInterval(interval);
  }, []);

  const totalFaces = liveStats.facesDetected || 1;
  const focusedPercent = Math.round((liveStats.focusedCount / totalFaces) * 100);
  const distractedPercent = Math.round((liveStats.distractedStudents / totalFaces) * 100);
  const neutralPercent = 100 - focusedPercent - distractedPercent;

  const focusDistribution = [
    { name: "Focused", value: focusedPercent || 80, color: "#22c55e" },
    { name: "Neutral", value: Math.max(0, neutralPercent) || 15, color: "#f59e0b" },
    { name: "Distracted", value: distractedPercent || 5, color: "#ef4444" },
  ];

  return (
    <div className="space-y-6">
      {/* Upper cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        <div className="glass-panel p-5 rounded-2xl relative overflow-hidden group hover:border-slate-700/60 transition-all duration-300">
          <div className="flex justify-between items-start">
            <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Average Focus</span>
            <div className="bg-indigo-500/10 p-2 rounded-xl text-indigo-400">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <h2 className="text-3xl font-extrabold mt-3 text-slate-100">{liveStats.classEngagement}%</h2>
          <p className="text-[11px] text-emerald-400 flex items-center gap-1 mt-2">
            <ArrowUpRight className="w-3.5 h-3.5" /> +4.2% from last week
          </p>
        </div>

        <div className="glass-panel p-5 rounded-2xl relative overflow-hidden group hover:border-slate-700/60 transition-all duration-300">
          <div className="flex justify-between items-start">
            <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Attendance Rate</span>
            <div className="bg-emerald-500/10 p-2 rounded-xl text-emerald-400">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <h2 className="text-3xl font-extrabold mt-3 text-slate-100">
            {liveStats.studentsPresent > 0 ? "94.6%" : "N/A"}
          </h2>
          <p className="text-[11px] text-emerald-400 flex items-center gap-1 mt-2">
            <ArrowUpRight className="w-3.5 h-3.5" /> Stable performance
          </p>
        </div>

        <div className="glass-panel p-5 rounded-2xl relative overflow-hidden group hover:border-slate-700/60 transition-all duration-300">
          <div className="flex justify-between items-start">
            <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Sustained Attention</span>
            <div className="bg-amber-500/10 p-2 rounded-xl text-amber-400">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <h2 className="text-3xl font-extrabold mt-3 text-slate-100">42 min</h2>
          <p className="text-[11px] text-slate-400 mt-2">Average focused duration</p>
        </div>

        <div className="glass-panel p-5 rounded-2xl relative overflow-hidden group hover:border-slate-700/60 transition-all duration-300">
          <div className="flex justify-between items-start">
            <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Engagement Level</span>
            <div className="bg-cyan-500/10 p-2 rounded-xl text-cyan-400">
              <Award className="w-5 h-5" />
            </div>
          </div>
          <h2 className="text-3xl font-extrabold mt-3 text-slate-100">Excellent</h2>
          <p className="text-[11px] text-cyan-400 mt-2 flex items-center gap-1">
            <Zap className="w-3.5 h-3.5" /> Top 10% this semester
          </p>
        </div>
      </div>

      {/* Main Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Weekly Trend */}
        <div className="glass-panel p-6 rounded-2xl lg:col-span-2">
          <div className="mb-4">
            <h3 className="text-base font-bold text-slate-200">Weekly Performance Trend</h3>
            <p className="text-xs text-slate-400">Historic comparison of attendance & student focus rates</p>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={weeklyTrend}>
                <defs>
                  <linearGradient id="colorEngagement" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorAttendance" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="day" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} domain={[60, 100]} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#0f172a",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "12px",
                  }}
                  labelStyle={{ color: "#94a3b8", fontWeight: "bold" }}
                />
                <Area type="monotone" dataKey="engagement" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorEngagement)" name="Focus Level (%)" />
                <Area type="monotone" dataKey="attendance" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorAttendance)" name="Attendance (%)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Focus breakdown */}
        <div className="glass-panel p-6 rounded-2xl flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-200">Focus State Distribution</h3>
            <p className="text-xs text-slate-400">Class composition in real-time</p>
          </div>
          <div className="h-52 flex justify-center items-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={focusDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {focusDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#0f172a",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "12px",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-2 mt-4">
            {focusDistribution.map((entry, index) => (
              <div key={index} className="flex justify-between items-center text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
                  <span className="text-slate-300 font-semibold">{entry.name}</span>
                </div>
                <span className="text-slate-400">{entry.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Hourly activity bar */}
      <div className="glass-panel p-6 rounded-2xl">
        <div className="mb-4">
          <h3 className="text-base font-bold text-slate-200">Hourly Attention Breakdown</h3>
          <p className="text-xs text-slate-400">Average focused versus distracted ratios through today's periods</p>
        </div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={hourlyFocus} stackOffset="expand">
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="hour" stroke="#94a3b8" fontSize={11} tickLine={false} />
              <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} tickFormatter={(v) => `${Math.round(v * 100)}%`} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#0f172a",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "12px",
                }}
              />
              <Legend verticalAlign="top" height={36} />
              <Bar dataKey="focus" stackId="a" fill="#6366f1" name="Focused Score" radius={[0, 0, 0, 0]} />
              <Bar dataKey="distraction" stackId="a" fill="#ef4444" name="Distracted Score" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
