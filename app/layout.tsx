import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Vinod-AI",
  description: "Een vlucht door het digitale datacenter van Vinod-AI.",
};
export const viewport: Viewport = { themeColor: "#04070d", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nl">
      <body>{children}</body>
    </html>
  );
}
