import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "WHISTLE | Anonymous Complaint System",
  description: "Speak freely. Stay anonymous. Be heard.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
