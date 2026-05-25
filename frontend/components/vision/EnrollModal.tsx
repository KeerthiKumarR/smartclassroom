"use client";

import { useState, useRef } from "react";
import { API_URL } from "@/lib/api";
import { X, Upload, Camera, ShieldCheck, FileImage } from "lucide-react";

interface EnrollModalProps {
  isOpen: boolean;
  onClose: () => void;
  captureFrame: () => string | null;
}

export default function EnrollModal({ isOpen, onClose, captureFrame }: EnrollModalProps) {
  const [studentName, setStudentName] = useState("");
  const [rollNumber, setRollNumber] = useState("");
  const [enrollMode, setEnrollMode] = useState<"camera" | "upload">("camera");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [base64FileContent, setBase64FileContent] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));

    const reader = new FileReader();
    reader.onloadend = () => {
      setBase64FileContent(reader.result as string);
    };
    reader.readAsDataURL(file);
  }

  async function handleEnroll(e: React.FormEvent) {
    e.preventDefault();
    if (!studentName || !rollNumber) {
      setMessage("Please enter name and roll number");
      return;
    }

    setLoading(true);
    setMessage("");

    let frame: string | null = null;
    if (enrollMode === "camera") {
      frame = captureFrame();
      if (!frame) {
        // Try getting it from potential page context
        setMessage("Could not capture frame. Verify camera is active.");
        setLoading(false);
        return;
      }
    } else {
      frame = base64FileContent;
      if (!frame) {
        setMessage("Please select an image file to upload");
        setLoading(false);
        return;
      }
    }

    try {
      const response = await fetch(`${API_URL}/enroll-face`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          studentName,
          rollNumber,
          frame,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setMessage(`Success: ${data.message}`);
        setTimeout(() => {
          onClose();
          setStudentName("");
          setRollNumber("");
          setMessage("");
          setSelectedFile(null);
          setPreviewUrl(null);
          setBase64FileContent(null);
        }, 1500);
      } else {
        setMessage(`Error: ${data.message || "Failed to enroll"}`);
      }
    } catch (err) {
      setMessage("Network connection error to backend");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="glass-panel-heavy p-8 rounded-2xl w-full max-w-md relative overflow-hidden border border-slate-800">
        {/* Top Header */}
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-black text-slate-100 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-indigo-400" />
            Face Biometrics Enrollment
          </h3>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-200 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex gap-2 bg-slate-950/60 p-1 rounded-xl border border-slate-900 mb-6">
          <button
            type="button"
            onClick={() => {
              setEnrollMode("camera");
              setMessage("");
            }}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition-all duration-300 ${
              enrollMode === "camera"
                ? "bg-indigo-600/15 text-indigo-400 border border-indigo-500/20"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Camera className="w-4 h-4" /> Live Camera
          </button>
          <button
            type="button"
            onClick={() => {
              setEnrollMode("upload");
              setMessage("");
            }}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition-all duration-300 ${
              enrollMode === "upload"
                ? "bg-indigo-600/15 text-indigo-400 border border-indigo-500/20"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Upload className="w-4 h-4" /> Photo Upload
          </button>
        </div>

        {/* Enrollment Form */}
        <form onSubmit={handleEnroll} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wide">
              Student Name
            </label>
            <input
              type="text"
              required
              value={studentName}
              onChange={(e) => setStudentName(e.target.value)}
              placeholder="e.g. Aarav Sharma"
              className="w-full bg-slate-900/60 border border-slate-800 focus:border-indigo-500/80 rounded-xl px-4 py-3 text-sm text-slate-200 placeholder-slate-600 outline-none transition-all duration-300"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wide">
              Roll Number
            </label>
            <input
              type="text"
              required
              value={rollNumber}
              onChange={(e) => setRollNumber(e.target.value)}
              placeholder="e.g. CSE22A001"
              className="w-full bg-slate-900/60 border border-slate-800 focus:border-indigo-500/80 rounded-xl px-4 py-3 text-sm text-slate-200 placeholder-slate-600 outline-none transition-all duration-300"
            />
          </div>

          {/* Upload input handler */}
          {enrollMode === "upload" && (
            <div className="space-y-3">
              <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wide">
                Face Image File
              </label>

              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-800 hover:border-indigo-500/30 rounded-2xl p-6 text-center cursor-pointer bg-slate-900/20 hover:bg-slate-900/40 transition-all duration-300 flex flex-col items-center justify-center gap-2"
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/*"
                  className="hidden"
                />

                {previewUrl ? (
                  <div className="relative w-24 h-24 rounded-xl overflow-hidden border border-slate-700 mx-auto">
                    <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <>
                    <FileImage className="w-8 h-8 text-slate-600" />
                    <span className="text-xs text-slate-400">Click to select photo</span>
                    <span className="text-[10px] text-slate-600 font-mono">PNG, JPG up to 5MB</span>
                  </>
                )}
              </div>
            </div>
          )}

          {message && (
            <div
              className={`p-3 rounded-xl text-xs font-semibold border ${
                message.startsWith("Success")
                  ? "bg-emerald-500/5 border-emerald-500/25 text-emerald-400"
                  : "bg-rose-500/5 border-rose-500/25 text-rose-400"
              }`}
            >
              {message}
            </div>
          )}

          {/* Submit Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-900">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 bg-slate-900 border border-slate-800 hover:border-slate-700/60 text-slate-300 font-semibold text-xs rounded-xl transition-all duration-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-slate-100 font-bold text-xs rounded-xl shadow-glow transition-all duration-300 disabled:opacity-50"
            >
              {loading ? "Registering..." : enrollMode === "camera" ? "Capture & Enroll" : "Upload & Enroll"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
