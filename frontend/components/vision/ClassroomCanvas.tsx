"use client";

import { useEffect, useRef } from "react";
import { FaceResult } from "@/lib/types";

interface ClassroomCanvasProps {
  faces: FaceResult[];
  videoWidth: number;
  videoHeight: number;
}

export default function ClassroomCanvas({ faces, videoWidth, videoHeight }: ClassroomCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    faces.forEach((face) => {
      const [x, y, w, h] = face.bbox;

      // Draw bounding box
      const status = (face as { status?: string }).status || "Focused";
      ctx.strokeStyle =
        status === "Focused"
          ? "#10B981"
          : status === "Neutral"
          ? "#F59E0B"
          : "#EF4444";
      ctx.lineWidth = 3;
      ctx.strokeRect(x, y, w, h);

      // Draw label background
      ctx.fillStyle = "rgba(0, 0, 0, 0.75)";
      ctx.fillRect(x, y - 25, 120, 20);

      // Draw text info
      ctx.fillStyle = "#FFFFFF";
      ctx.font = "12px sans-serif";
      ctx.fillText(`${face.name} (${face.engagement.score}%)`, x + 5, y - 10);
    });
  }, [faces, videoWidth, videoHeight]);

  return (
    <canvas
      ref={canvasRef}
      width={videoWidth}
      height={videoHeight}
      className="absolute top-0 left-0 w-full h-full pointer-events-none"
    />
  );
}
