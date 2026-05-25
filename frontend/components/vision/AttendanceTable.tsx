"use client";

import { useEffect, useState } from "react";
import { API_URL } from "@/lib/api";
import { Search, RotateCcw, Download, CheckCircle, XCircle, Clock, RefreshCw } from "lucide-react";

interface AttendanceRecord {
  student: string;
  status: string;
}

interface StudentMaster {
  name: string;
  roll: string;
  label: string;
}

export default function AttendanceTable() {
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [students, setStudents] = useState<StudentMaster[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "present" | "absent">("all");
  const [resetting, setResetting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 2000);
    return () => clearInterval(interval);
  }, []);

  async function fetchData() {
    try {
      const attRes = await fetch(`${API_URL}/attendance`);
      const attData = await attRes.json();
      setAttendance(Array.isArray(attData) ? attData : []);

      const stdRes = await fetch(`${API_URL}/students`);
      const stdData = await stdRes.json();
      setStudents(Array.isArray(stdData) ? stdData : []);
    } catch (e) {
      // silently retry
    }
  }

  const handleManualRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setTimeout(() => setRefreshing(false), 500);
  };

  async function handleReset() {
    if (!confirm("Reset today's attendance session? This clears marked records.")) return;
    setResetting(true);
    try {
      const response = await fetch(`${API_URL}/attendance/reset`, { method: "POST" });
      if (response.ok) {
        setAttendance([]);
      }
    } catch (err) {
      alert("Failed to reset attendance register.");
    } finally {
      setResetting(false);
    }
  }

  // Cross-reference attendance records against the enrolled master list
  const fullRoster = students.map((std) => {
    const isPresent = attendance.some(
      (att) => att.student.toLowerCase() === std.label.toLowerCase() ||
               att.student.toLowerCase() === std.name.toLowerCase()
    );
    return {
      name: std.name,
      roll: std.roll,
      label: std.label,
      status: isPresent ? "Present" : "Absent",
    };
  });

  // Filter roster by search query and selected filter pill
  const filtered = fullRoster.filter((record) => {
    const matchesSearch =
      record.name.toLowerCase().includes(search.toLowerCase()) ||
      record.roll.toLowerCase().includes(search.toLowerCase());

    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "present" && record.status === "Present") ||
      (statusFilter === "absent" && record.status === "Absent");

    return matchesSearch && matchesStatus;
  });

  // Calculate attendance percentages
  const totalEnrolled = students.length;
  const presentCount = fullRoster.filter((r) => r.status === "Present").length;
  const attendanceRate = totalEnrolled > 0 ? Math.round((presentCount / totalEnrolled) * 100) : 0;

  // Export to CSV helper
  function exportCSV() {
    if (fullRoster.length === 0) return;
    const headers = "Student Name,Roll Number,Status,Timestamp\n";
    const rows = fullRoster
      .map((r) => `"${r.name}","${r.roll}","${r.status}","${new Date().toLocaleDateString()}"`)
      .join("\n");

    const blob = new Blob([headers + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Attendance_Report_${new Date().toISOString().split("T")[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return (
    <div className="glass-panel p-6 rounded-2xl border border-slate-800/80 space-y-6">
      {/* Top Header stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-b border-slate-900 pb-6">
        <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-900">
          <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Total Enrolled</span>
          <h3 className="text-2xl font-black text-slate-200 mt-1">{totalEnrolled} Students</h3>
        </div>
        <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-900">
          <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Present Today</span>
          <h3 className="text-2xl font-black text-emerald-400 mt-1">{presentCount} Active</h3>
        </div>
        <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-900">
          <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Attendance Rate</span>
          <h3 className="text-2xl font-black text-indigo-400 mt-1">{attendanceRate}%</h3>
        </div>
      </div>

      {/* Roster actions */}
      <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
        {/* Status Filters */}
        <div className="flex gap-2">
          <button
            onClick={() => setStatusFilter("all")}
            className={`px-4 py-2 rounded-xl text-xs font-semibold border transition-all duration-300 ${
              statusFilter === "all"
                ? "bg-slate-100 text-slate-950 border-slate-100"
                : "text-slate-400 hover:text-slate-200 bg-slate-950/40 border-slate-900"
            }`}
          >
            All Students ({fullRoster.length})
          </button>
          <button
            onClick={() => setStatusFilter("present")}
            className={`px-4 py-2 rounded-xl text-xs font-semibold border transition-all duration-300 ${
              statusFilter === "present"
                ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/20"
                : "text-slate-400 hover:text-slate-200 bg-slate-950/40 border-slate-900"
            }`}
          >
            Present ({presentCount})
          </button>
          <button
            onClick={() => setStatusFilter("absent")}
            className={`px-4 py-2 rounded-xl text-xs font-semibold border transition-all duration-300 ${
              statusFilter === "absent"
                ? "bg-rose-500/15 text-rose-400 border-rose-500/20"
                : "text-slate-400 hover:text-slate-200 bg-slate-950/40 border-slate-900"
            }`}
          >
            Absent ({totalEnrolled - presentCount})
          </button>
        </div>

        {/* Inputs */}
        <div className="w-full lg:w-auto flex flex-wrap items-center gap-3">
          <div className="relative flex-1 sm:flex-initial">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Search by name or roll..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-slate-900/50 border border-slate-800 text-slate-200 pl-9 pr-4 py-2 rounded-xl text-xs outline-none focus:border-indigo-500/80 transition-all duration-300 w-56"
            />
          </div>

          <button
            onClick={handleManualRefresh}
            className="p-2 text-slate-400 hover:text-slate-200 border border-slate-900 bg-slate-950/40 rounded-xl transition-all duration-300"
            title="Refresh list"
          >
            <RefreshCw className={`w-4.5 h-4.5 ${refreshing ? "animate-spin" : ""}`} />
          </button>

          <button
            onClick={exportCSV}
            disabled={fullRoster.length === 0}
            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 text-indigo-400 font-semibold text-xs rounded-xl transition-all duration-300 disabled:opacity-50"
          >
            <Download className="w-4 h-4" /> Export CSV
          </button>

          <button
            onClick={handleReset}
            disabled={resetting}
            className="flex items-center gap-1.5 px-4 py-2 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-400 font-semibold text-xs rounded-xl transition-all duration-300 disabled:opacity-50"
          >
            <RotateCcw className="w-4 h-4" /> Reset session
          </button>
        </div>
      </div>

      {/* Main Roster Table */}
      {filtered.length === 0 ? (
        <div className="text-center py-10 text-slate-500 text-xs italic">
          No records match your criteria. Ensure student face master lists are created.
        </div>
      ) : (
        <div className="overflow-x-auto border border-slate-900/60 rounded-xl bg-slate-950/20">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-900 text-slate-500 font-bold uppercase tracking-wider bg-slate-950/30">
                <th className="p-4">#</th>
                <th className="p-4">Student</th>
                <th className="p-4 font-mono">Roll Number</th>
                <th className="p-4">Status</th>
                <th className="p-4">Track Time</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((record, index) => (
                <tr
                  key={record.label}
                  className="border-b border-slate-900/60 hover:bg-slate-900/20 transition-all duration-200"
                >
                  <td className="p-4 text-slate-600 font-semibold">{index + 1}</td>
                  <td className="p-4 font-bold text-slate-200">{record.name}</td>
                  <td className="p-4 font-mono text-slate-400">{record.roll}</td>
                  <td className="p-4">
                    <span
                      className={`inline-flex items-center gap-1 px-3 py-1 rounded-full font-bold text-[10px] border ${
                        record.status === "Present"
                          ? "bg-emerald-500/5 border-emerald-500/20 text-emerald-400"
                          : "bg-rose-500/5 border-rose-500/20 text-rose-400"
                      }`}
                    >
                      {record.status === "Present" ? (
                        <CheckCircle className="w-3.5 h-3.5" />
                      ) : (
                        <XCircle className="w-3.5 h-3.5" />
                      )}
                      {record.status}
                    </span>
                  </td>
                  <td className="p-4 text-slate-500 font-mono">
                    {record.status === "Present" ? (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-indigo-500" /> Live active
                      </span>
                    ) : (
                      "N/A"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
