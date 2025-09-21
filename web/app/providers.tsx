"use client";

import { ReactNode } from "react";
import { AuthProvider } from "@/lib/AuthContext";
import { MessagingProvider } from "@/lib/contexts/MessagingContext";

interface ClientProvidersProps {
  children: ReactNode;
}

export function ClientProviders({ children }: ClientProvidersProps) {
  return (
    <AuthProvider>
      <MessagingProvider>
        {children}
      </MessagingProvider>
    </AuthProvider>
  );
}
