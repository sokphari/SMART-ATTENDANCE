import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Smart Attendance",
    template: "%s · Smart Attendance",
  },
  description:
    "Modern attendance platform with QR check-in, GPS verification, and live reports.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-canvas text-ink font-sans">{children}</body>
    </html>
  );
}
