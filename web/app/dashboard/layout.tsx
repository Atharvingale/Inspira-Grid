"use client";

import { ReactNode } from "react";
import { SocketProvider } from "@/lib/SocketContext";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import Navbar from "@/components/layout/Navbar";

interface DashboardLayoutProps {
  children: ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <SocketProvider>
      <ProtectedRoute>
        <div className="min-h-screen bg-gradient-to-br from-dark-darker via-dark to-dark-surface">
          <Navbar />
          <main className="pb-8">
            {children}
          </main>
        </div>
      </ProtectedRoute>
    </SocketProvider>
  );
}
