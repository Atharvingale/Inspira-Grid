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
        <div className="h-screen bg-gradient-to-br from-dark-darker via-dark to-dark-surface flex flex-col">
          <Navbar />
          <main className="flex-1 overflow-y-auto">
            {children}
          </main>
        </div>
      </ProtectedRoute>
    </SocketProvider>
  );
}
