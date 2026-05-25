"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import EnrollModal from "./EnrollModal";
import { Camera, AlertCircle, Sparkles, TrendingUp, Users, Brain, ShieldAlert, Award } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer } from "recharts";

interface AlertItem {
  id: string;
  name: string;
  message: string;
  time: string;
  type: "warning" | "danger" | "success";
}

export default function WebcamPanel() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isProcessingRef = useRef(false);

  const [faces, setFaces] = useState<any[]>([]);
  const [isEnrollOpen, setIsEnrollOpen] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(true);
  const [timeline, setTimeline] = useState<any[]>([
    { time: "0s", focus: 80 },
    { time: "5s", focus: 82 },
    { time: "10s", focus: 79 },
    { time: "15s", focus: 83 },
    { time: "20s", focus: 85 },
  ]);

  const [alerts, setAlerts] = useState<AlertItem[]>([
    { id: "1", name: "Rahul", message: "Flagged: Slightly distracted", time: "Just now", type: "warning" },
  ]);

  const [stats, setStats] = useState({
    facesDetected: 0,
    focusedCount: 0,
    distractedCount: 0,
    attendanceCount: 0,
    averageEngagement: 80,
  });

  // ─────────────────────────────────────────
  // SYNC CANVAS SIZE WITH VIDEO CONTAINER
  // ─────────────────────────────────────────
  const syncCanvasSize = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const rect = video.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;
  }, []);

  useEffect(() => {
    if (isCameraActive) {
      startCamera();
    } else {
      stopCamera();
    }
  }, [isCameraActive]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const ro = new ResizeObserver(() => {
      syncCanvasSize();
    });
    ro.observe(video);

    return () => {
      ro.disconnect();
    };
  }, [syncCanvasSize]);

  // ─────────────────────────────────────────
  // CAMERA CONTROL
  // ─────────────────────────────────────────
  async function startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: 1280,
          height: 720,
        },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (e) {
      console.error("Camera access failed", e);
    }
  }

  function stopCamera() {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    // Clear canvas when camera is stopped
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }

  // ─────────────────────────────────────────
  // CAPTURE FRAME FOR ENROLLMENT
  // ─────────────────────────────────────────
  const captureFrame = useCallback(() => {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0) return null;

    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = video.videoWidth;
    tempCanvas.height = video.videoHeight;

    const ctx = tempCanvas.getContext("2d");
    if (!ctx) return null;

    ctx.drawImage(video, 0, 0);

    return tempCanvas.toDataURL("image/jpeg", 0.95);
  }, []);

  // ─────────────────────────────────────────
  // DRAW FUTURISTIC GLOWING OVERLAYS ON CANVAS
  // ─────────────────────────────────────────
  const drawOverlay = useCallback((detectedFaces: any[]) => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video || video.videoWidth === 0) return;

    syncCanvasSize();

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const displayWidth = canvas.width;
    const displayHeight = canvas.height;

    // The backend receives 640x360 resized frames and returns coordinates in that system!
    const originalWidth = 640;
    const originalHeight = 360;

    const scaleX = displayWidth / originalWidth;
    const scaleY = displayHeight / originalHeight;

    detectedFaces.forEach((face: any) => {
      if (!face || !face.bbox || face.bbox.length < 4) return;

      const bbox = face.bbox;
      const [rawX, rawY, rawW, rawH] = bbox;

      // Scale all coordinates consistently to display canvas dimensions
      const scaledX = rawX * scaleX;
      const scaledY = rawY * scaleY;
      const scaledW = rawW * scaleX;
      const scaledH = rawH * scaleY;

      const name = face.name || "Student";
      const status = face.status || "Focused";

      let color = "#00ff88"; // green for Focused
      if (status === "Distracted") {
        color = "#ffcc00"; // yellow for Distracted
      }

      // Draw high-tech bounding box (semi-transparent border, sharp corners)
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.lineJoin = "round";

      // Semi-transparent box background fill
      ctx.fillStyle = "rgba(15, 23, 42, 0.12)";
      ctx.fillRect(scaledX, scaledY, scaledW, scaledH);

      // Main box outline
      ctx.strokeRect(scaledX, scaledY, scaledW, scaledH);

      // Accent Corner Brackets for a futuristic look
      const bracketLength = Math.min(15, scaledW * 0.25);
      ctx.strokeStyle = color;
      ctx.lineWidth = 4;

      // Top-Left Corner
      ctx.beginPath();
      ctx.moveTo(scaledX + bracketLength, scaledY);
      ctx.lineTo(scaledX, scaledY);
      ctx.lineTo(scaledX, scaledY + bracketLength);
      ctx.stroke();

      // Top-Right Corner
      ctx.beginPath();
      ctx.moveTo(scaledX + scaledW - bracketLength, scaledY);
      ctx.lineTo(scaledX + scaledW, scaledY);
      ctx.lineTo(scaledX + scaledW, scaledY + bracketLength);
      ctx.stroke();

      // Bottom-Left Corner
      ctx.beginPath();
      ctx.moveTo(scaledX, scaledY + scaledH - bracketLength);
      ctx.lineTo(scaledX, scaledY + scaledH);
      ctx.lineTo(scaledX + bracketLength, scaledY + scaledH);
      ctx.stroke();

      // Bottom-Right Corner
      ctx.beginPath();
      ctx.moveTo(scaledX + scaledW - bracketLength, scaledY + scaledH);
      ctx.lineTo(scaledX + scaledW, scaledY + scaledH);
      ctx.lineTo(scaledX + scaledW, scaledY + scaledH - bracketLength);
      ctx.stroke();

      // Modern Tag Label (floating slightly above target box)
      const labelText = `${name} (${status})`;
      ctx.font = "bold 11px Inter, sans-serif";
      const textWidth = ctx.measureText(labelText).width;

      // Border and Background of tag
      ctx.fillStyle = "rgba(15, 23, 42, 0.85)";
      ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
      ctx.lineWidth = 1;
      
      const tagH = 22;
      const tagW = textWidth + 24;
      const tagX = scaledX + (scaledW - tagW) / 2; // Center-aligned label
      const tagY = scaledY - tagH - 8;

      ctx.beginPath();
      ctx.roundRect(tagX, tagY, tagW, tagH, 6);
      ctx.fill();
      ctx.stroke();

      // Small status dot on label
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(tagX + 10, tagY + tagH / 2, 3.5, 0, 2 * Math.PI);
      ctx.fill();

      // Text drawing
      ctx.fillStyle = "#f8fafc";
      ctx.fillText(labelText, tagX + 18, tagY + 15);
    });
  }, [syncCanvasSize]);

  // ─────────────────────────────────────────
  // ANALYZE FRAME
  // ─────────────────────────────────────────
  async function analyzeFrame() {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0 || !isCameraActive) return;

    // Check and acquire processing lock to prevent overlapping request queues
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;

    try {
      // 1. Downscale the captured canvas frame to 640x360 for balanced speed/accuracy
      const tempCanvas = document.createElement("canvas");
      tempCanvas.width = 640;
      tempCanvas.height = 360;

      const ctx = tempCanvas.getContext("2d");
      if (!ctx) return;

      // Draw the video BGR frame scaled to 640x360
      ctx.drawImage(video, 0, 0, 640, 360);

      // 2. Compress JPEG to 0.65 for balanced transmission payload size
      const frame = tempCanvas.toDataURL("image/jpeg", 0.65);

      const response = await fetch("http://127.0.0.1:8000/analyze-frame", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ frame }),
      });

      if (!response.ok) return;
      const data = await response.json();

      const activeFaces = data.faces || [];
      setFaces(activeFaces);

      if (data.stats) {
        const averageEngagement = data.stats.averageEngagement || 0;
        setStats({
          facesDetected: data.stats.facesDetected || 0,
          focusedCount: data.stats.focusedCount || 0,
          distractedCount: data.stats.distractedCount || 0,
          attendanceCount: data.stats.attendanceCount || 0,
          averageEngagement: averageEngagement,
        });

        // Update live scrolling graph
        setTimeline((prev) => {
          const next = [...prev.slice(1), { time: `${new Date().getSeconds()}s`, focus: averageEngagement }];
          return next;
        });

        // Trigger smart alert warnings for newly detected distracted students
        activeFaces.forEach((f: any) => {
          if (f.engagement?.state === "Distracted") {
            const studentName = f.name || "Unknown";
            setAlerts((prev) => {
              // Deduplicate alerts for same student inside last few elements
              if (prev.some((a) => a.name === studentName && a.type === "danger")) {
                return prev;
              }
              const newAlert: AlertItem = {
                id: String(Date.now() + Math.random()),
                name: studentName,
                message: `Alert: Student ${studentName} is sleeping or looking away.`,
                time: "Just now",
                type: "danger",
              };
              return [newAlert, ...prev.slice(0, 4)];
            });
          }
        });
      }

      // Render futuristic glowing overlays directly onto the canvas overlay
      drawOverlay(activeFaces);

    } catch (e) {
      console.error("Analyze frame failed", e);
    } finally {
      // Release request lock
      isProcessingRef.current = false;
    }
  }

  // ─────────────────────────────────────────
  // AUTO FRAME-CAPTURE LOOP
  // ─────────────────────────────────────────
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        await analyzeFrame();
      } catch (err) {
        console.error("Analysis loop crash:", err);
      }
    }, 700); // exactly every 700ms to improve face reacquisition speed
    return () => clearInterval(interval);
  }, [isCameraActive, faces, drawOverlay]);

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
      {/* LEFT: Live camera workspace (Webcam and live charts) */}
      <div className="xl:col-span-2 space-y-6">
        <div className="glass-panel p-5 rounded-2xl relative overflow-hidden group">
          <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
            <span className="flex h-2 w-2 relative">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isCameraActive ? "bg-indigo-400" : "bg-slate-500"}`} />
              <span className={`relative inline-flex rounded-full h-2 w-2 ${isCameraActive ? "bg-indigo-500" : "bg-slate-500"}`} />
            </span>
            <span className="text-[10px] uppercase font-bold tracking-widest text-slate-300 bg-slate-950/80 px-2.5 py-1 rounded-md border border-slate-800">
              {isCameraActive ? "Live Classroom Feed" : "Camera Suspended"}
            </span>
          </div>

          <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
            <button
              onClick={() => setIsCameraActive(!isCameraActive)}
              className="bg-indigo-500 hover:bg-indigo-600 text-slate-100 p-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all duration-300 shadow-glow"
            >
              <Camera className="w-4 h-4" />
              {isCameraActive ? "Pause Stream" : "Resume Stream"}
            </button>
          </div>

          {/* STREAM DISPLAY CONTAINER */}
          <div className="relative aspect-video rounded-xl bg-slate-950 overflow-hidden border border-slate-900 mt-4 flex items-center justify-center">
            {isCameraActive ? (
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  muted
                  playsInline
                  className="w-full h-full object-cover"
                  style={{ transform: "scaleX(-1)" }}
                />
                <canvas
                  ref={canvasRef}
                  className="absolute top-0 left-0 w-full h-full pointer-events-none"
                  style={{ transform: "scaleX(-1)" }} // Keep the overlays mirrored visually with the video!
                />
                {/* Visual overlay scanner bar */}
                <div className="scanner-line" />
              </>
            ) : (
              <div className="text-slate-500 text-center space-y-2">
                <Brain className="w-12 h-12 stroke-[1.2] mx-auto text-slate-600 animate-pulse" />
                <p className="text-sm font-semibold">Webcam paused. Click Resume Stream to monitor.</p>
              </div>
            )}
          </div>
        </div>

        {/* Live focus activity Recharts flow */}
        <div className="glass-panel p-5 rounded-2xl">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                <TrendingUp className="w-4.5 h-4.5 text-indigo-400" />
                Live Focus Tracking
              </h3>
              <p className="text-[11px] text-slate-400">Class engagement timeline scrolling in real-time</p>
            </div>
            <span className="text-xs text-indigo-400 font-bold bg-indigo-500/10 px-2.5 py-1 rounded-lg border border-indigo-500/15 shadow-glow">
              {stats.averageEngagement}% avg
            </span>
          </div>
          <div className="h-28">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timeline}>
                <defs>
                  <linearGradient id="liveGlow" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="time" hide />
                <YAxis hide domain={[30, 100]} />
                <Area type="monotone" dataKey="focus" stroke="#6366f1" strokeWidth={2.5} fillOpacity={1} fill="url(#liveGlow)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* RIGHT: System Stats cards & Real-time Alerts */}
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <StatMiniCard title="Active Faces" value={stats.facesDetected} color="text-sky-400" glow="glass-card-glow-blue" icon={Users} />
          <StatMiniCard title="Focused" value={stats.focusedCount} color="text-emerald-400" glow="glass-card-glow-green" icon={Brain} />
          <StatMiniCard title="Distracted" value={stats.distractedCount} color="text-rose-400" glow="glass-card-glow-red" icon={ShieldAlert} />
          <StatMiniCard title="Present Total" value={stats.attendanceCount} color="text-amber-400" glow="glass-card-glow-orange" icon={Award} />
        </div>

        {/* Global Average Engagement big card */}
        <div className="glass-panel p-5 rounded-2xl relative overflow-hidden text-center glass-card-glow-indigo">
          <span className="text-[10px] text-slate-500 uppercase font-extrabold tracking-wider">Engagement Metric</span>
          <h2 className="text-5xl font-black text-indigo-400 mt-2 text-glow">{stats.averageEngagement}%</h2>
          <div className="w-full bg-slate-950/60 rounded-full h-2 border border-slate-900/60 mt-4 overflow-hidden">
            <div className="bg-gradient-to-r from-indigo-500 to-indigo-400 h-full transition-all duration-500 shadow-glow" style={{ width: `${stats.averageEngagement}%` }} />
          </div>
          <button
            onClick={() => setIsEnrollOpen(true)}
            className="w-full mt-5 bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-slate-100 py-3 rounded-xl font-bold text-xs transition-all duration-300 shadow-[0_4px_16px_rgba(99,102,241,0.25)]"
          >
            Enroll Face Profile
          </button>
        </div>

        {/* Dynamic Alerts logs */}
        <div className="glass-panel p-5 rounded-2xl flex flex-col justify-between min-h-[220px]">
          <div>
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <AlertCircle className="w-4.5 h-4.5 text-rose-400" />
              Real-time Alarms
            </h3>
            <p className="text-[11px] text-slate-400">Class anomalies and focus alerts</p>
          </div>

          <div className="space-y-2.5 mt-4 max-h-[240px] overflow-y-auto pr-1">
            {alerts.length === 0 ? (
              <p className="text-xs text-slate-500 italic text-center py-6">All systems nominal. No alerts raised.</p>
            ) : (
              alerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`p-3 rounded-xl border flex gap-3 text-xs transition-all duration-300 ${
                    alert.type === "danger"
                      ? "bg-rose-500/5 border-rose-500/20 text-rose-300"
                      : "bg-amber-500/5 border-amber-500/20 text-amber-300"
                  }`}
                >
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">{alert.name}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">{alert.message}</p>
                  </div>
                  <span className="text-[10px] text-slate-500 shrink-0 font-semibold">{alert.time}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <EnrollModal isOpen={isEnrollOpen} onClose={() => setIsEnrollOpen(false)} captureFrame={captureFrame} />
    </div>
  );
}

// ─────────────────────────────────────────
// STAT MINI CARD UTILITY
// ─────────────────────────────────────────
function StatMiniCard({ title, value, color, glow, icon: Icon }: any) {
  return (
    <div className={`glass-panel p-4.5 rounded-xl border border-slate-800/80 transition-all duration-300 ${glow}`}>
      <div className="flex justify-between items-center">
        <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider truncate">{title}</span>
        <Icon className={`w-4 h-4 ${color}`} />
      </div>
      <h3 className={`text-2xl font-black mt-2 ${color}`}>{value}</h3>
    </div>
  );
}