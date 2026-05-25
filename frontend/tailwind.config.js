/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#020617",
        foreground: "#f8fafc",
        card: {
          DEFAULT: "rgba(15, 23, 42, 0.65)",
          hover: "rgba(30, 41, 59, 0.8)",
        },
        primary: {
          DEFAULT: "#6366f1",
          hover: "#4f46e5",
          glow: "rgba(99, 102, 241, 0.15)",
        },
        success: {
          DEFAULT: "#22c55e",
          glow: "rgba(34, 197, 94, 0.15)",
        },
        warning: {
          DEFAULT: "#f59e0b",
          glow: "rgba(245, 158, 11, 0.15)",
        },
        danger: {
          DEFAULT: "#ef4444",
          glow: "rgba(239, 68, 68, 0.15)",
        },
        info: {
          DEFAULT: "#38bdf8",
          glow: "rgba(56, 189, 248, 0.15)",
        },
      },
      boxShadow: {
        glass: "0 8px 32px 0 rgba(0, 0, 0, 0.37)",
        glow: "0 0 20px 0 rgba(99, 102, 241, 0.2)",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
}
