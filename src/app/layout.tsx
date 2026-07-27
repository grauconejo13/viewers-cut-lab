import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Viewers Cut",
  description: "Audience choices become creator-approved movie stories.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
