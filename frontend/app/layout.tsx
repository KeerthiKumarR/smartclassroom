import "./globals.css";

export const metadata = {
  title: "Smart Classroom AI — Real-time Monitoring & Attendance",
  description: "Next-generation AI classroom monitoring, attention tracking, and automatic attendance register.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased selection:bg-indigo-500/30">{children}</body>
    </html>
  );
}

