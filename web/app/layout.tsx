import type { Metadata } from "next";
import "./globals.css";
import { ClientProviders } from "./providers";

export const metadata: Metadata = {
  title: "Inspira-Grid - Collaborative Platform",
  description: "Connect, collaborate, and create amazing projects with talented teams",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" data-scroll-behavior="smooth">
      <body className="font-sans antialiased bg-dark text-white">
        <ClientProviders>{children}</ClientProviders>
      </body>
    </html>
  );
}
