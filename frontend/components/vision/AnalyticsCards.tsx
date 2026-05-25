"use client";

import { useEffect, useState } from "react";
import { API_URL } from "@/lib/api";

interface AnalyticsData {
  classEngagement: number;
  studentsPresent: number;
  distractedStudents: number;
}

export default function AnalyticsCards() {
  const [data, setData] = useState<AnalyticsData>({
    classEngagement: 0,
    studentsPresent: 0,
    distractedStudents: 0,
  });

  useEffect(() => {
    fetchAnalytics();
    const interval = setInterval(fetchAnalytics, 1500); // refresh periodically
    return () => clearInterval(interval);
  }, []);

  async function fetchAnalytics() {
    try {
      const response = await fetch(`${API_URL}/analytics`);
      const resData = await response.json();
      setData(resData);
    } catch (err) {
      console.error("Failed to load analytics", err);
    }
  }

  const cards = [
    {
      title: "Class Engagement",
      value: `${data.classEngagement}%`,
      color: "#38bdf8",
      glowColor: "rgba(56, 189, 248, 0.15)",
    },
    {
      title: "Students Present",
      value: data.studentsPresent,
      color: "#22c55e",
      glowColor: "rgba(34, 197, 94, 0.15)",
    },
    {
      title: "Distracted Students",
      value: data.distractedStudents,
      color: "#ef4444",
      glowColor: "rgba(239, 68, 68, 0.15)",
    },
  ];

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
        gap: "20px",
        marginBottom: "24px",
      }}
    >
      {cards.map((card, index) => (
        <div
          key={index}
          style={{
            background: "rgba(15, 23, 42, 0.65)",
            backdropFilter: "blur(12px)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: "20px",
            padding: "24px",
            position: "relative",
            overflow: "hidden",
            boxShadow: `0 8px 32px rgba(0, 0, 0, 0.25), inset 0 0 12px ${card.glowColor}`,
            transition: "transform 0.2s ease, box-shadow 0.2s ease",
            cursor: "default",
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.transform = "translateY(-4px)";
            e.currentTarget.style.boxShadow = `0 12px 40px rgba(0, 0, 0, 0.4), inset 0 0 16px ${card.glowColor}`;
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = `0 8px 32px rgba(0, 0, 0, 0.25), inset 0 0 12px ${card.glowColor}`;
          }}
        >
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ color: "#94a3b8", fontSize: "14px", fontWeight: 500, letterSpacing: "0.5px" }}>
              {card.title}
            </span>
            <span style={{ color: card.color, fontSize: "36px", fontWeight: 800, marginTop: "8px" }}>
              {card.value}
            </span>
          </div>
          <div
            style={{
              position: "absolute",
              top: "24px",
              right: "24px",
              width: "36px",
              height: "36px",
              borderRadius: "50%",
              backgroundColor: card.glowColor,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div
              style={{
                width: "10px",
                height: "10px",
                borderRadius: "50%",
                backgroundColor: card.color,
                boxShadow: `0 0 8px ${card.color}`,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

