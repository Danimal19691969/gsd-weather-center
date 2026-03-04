import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GSD Weather Center",
  description: "Real-time weather intelligence dashboard",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-gray-950 text-gray-100 antialiased">
        {children}
      </body>
    </html>
  );
}
