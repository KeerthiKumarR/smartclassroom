"use client";

import { useEffect, useState } from "react";
import { API_URL } from "@/lib/api";
import { Search, UserPlus, Trash2, ShieldAlert, Award, FileSpreadsheet, GraduationCap } from "lucide-react";
import EnrollModal from "./EnrollModal";

interface Student {
  name: string;
  roll: string;
  label: string;
}

export default function StudentsView() {
  const [students, setStudents] = useState<Student[]>([]);
  const [search, setSearch] = useState("");
  const [isEnrollOpen, setIsEnrollOpen] = useState(false);
  const [deletingLabel, setDeletingLabel] = useState<string | null>(null);

  useEffect(() => {
    fetchStudents();
  }, []);

  async function fetchStudents() {
    try {
      const response = await fetch(`${API_URL}/students`);
      if (response.ok) {
        const data = await response.json();
        setStudents(data);
      }
    } catch (e) {
      console.error("Failed to load students", e);
    }
  }

  async function handleDelete(label: string) {
    if (!confirm(`Are you sure you want to remove ${label}?`)) return;
    setDeletingLabel(label);
    try {
      const response = await fetch(`${API_URL}/students/${encodeURIComponent(label)}`, {
        method: "DELETE",
      });
      if (response.ok) {
        fetchStudents();
      } else {
        alert("Could not remove student");
      }
    } catch (e) {
      alert("Error contacting backend");
    } finally {
      setDeletingLabel(null);
    }
  }

  const filtered = students.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.roll.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-100 flex items-center gap-2.5">
            <GraduationCap className="w-6 h-6 text-indigo-400" />
            Registered Profiles
          </h2>
          <p className="text-xs text-slate-400">Manage enrolled facial biometrics and student details</p>
        </div>

        <div className="flex items-center gap-3.5">
          <div className="relative">
            <Search className="w-4.5 h-4.5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Search students..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-slate-900/50 border border-slate-800 text-slate-200 pl-10 pr-4 py-2 rounded-xl text-sm focus:outline-none focus:border-indigo-500/80 transition-all duration-300 w-64 backdrop-blur-md"
            />
          </div>

          <button
            onClick={() => setIsEnrollOpen(true)}
            className="flex items-center gap-2 bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-slate-100 px-4.5 py-2.5 rounded-xl font-semibold text-sm transition-all duration-300 shadow-[0_4px_16px_rgba(99,102,241,0.3)] hover:-translate-y-0.5"
          >
            <UserPlus className="w-4.5 h-4.5" />
            Enroll Student
          </button>
        </div>
      </div>

      {/* Grid of registered cards or empty state */}
      {filtered.length === 0 ? (
        <div className="glass-panel p-12 rounded-2xl flex flex-col items-center justify-center text-center space-y-4">
          <div className="bg-slate-900/50 p-4.5 rounded-full border border-slate-800">
            <ShieldAlert className="w-8 h-8 text-slate-600" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-300">No Profiles Registered</h3>
            <p className="text-xs text-slate-500 max-w-xs mt-1">
              Add student profiles by clicking the Enroll button. This trains the AI to recognize them during live analysis.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((student) => (
            <div
              key={student.label}
              className="glass-panel p-5 rounded-2xl flex flex-col justify-between hover:border-slate-700/60 transition-all duration-300 group hover:-translate-y-0.5"
            >
              <div className="flex items-start gap-4">
                {/* Facial Icon Avatar */}
                <div className="bg-indigo-600/10 text-indigo-400 w-12 h-12 rounded-xl flex items-center justify-center border border-indigo-500/20 font-extrabold text-lg uppercase shadow-glow">
                  {student.name.charAt(0)}
                </div>

                <div className="flex-1 space-y-1">
                  <h3 className="font-bold text-slate-200 group-hover:text-indigo-400 transition-colors duration-300">
                    {student.name}
                  </h3>
                  <p className="text-xs text-slate-400 flex items-center gap-1.5">
                    <FileSpreadsheet className="w-3.5 h-3.5 text-slate-500" />
                    Roll: <span className="font-mono text-slate-300">{student.roll}</span>
                  </p>
                </div>
              </div>

              <div className="border-t border-slate-800/80 mt-5 pt-4 flex items-center justify-between">
                <div className="flex items-center gap-1 text-[10px] text-indigo-400 font-semibold bg-indigo-500/10 px-2 py-0.5 rounded-md border border-indigo-500/15">
                  <Award className="w-3.5 h-3.5" /> Embedded face OK
                </div>

                <button
                  onClick={() => handleDelete(student.label)}
                  disabled={deletingLabel === student.label}
                  className="p-2 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-rose-500/10 transition-all duration-300 disabled:opacity-50"
                  title="Remove Profile"
                >
                  <Trash2 className="w-4.5 h-4.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      <EnrollModal
        isOpen={isEnrollOpen}
        onClose={() => {
          setIsEnrollOpen(false);
          fetchStudents();
        }}
        captureFrame={() => null} // Inside EnrollModal we will manage live captures directly
      />
    </div>
  );
}
