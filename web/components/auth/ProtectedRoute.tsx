"use client";

import { useEffect, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "@/lib/firebase";
import Loading from "@/components/common/Loading";

interface ProtectedRouteProps {
  children: ReactNode;
  fallback?: string;
}

export default function ProtectedRoute({ children, fallback = "/auth/login" }: ProtectedRouteProps) {
  const [user, loading, error] = useAuthState(auth);
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      // Redirect to login page
      router.push(fallback);
    }
  }, [user, loading, router, fallback]);

  if (loading) {
    return <Loading message="Verifying authentication..." />;
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-400 text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-white mb-4">Authentication Error</h2>
          <p className="text-text-tertiary mb-6">
            There was a problem verifying your authentication. Please try logging in again.
          </p>
          <button
            onClick={() => router.push(fallback)}
            className="px-6 py-3 bg-brand text-text-primary rounded-md hover:bg-brand-dark hover:text-white transition-colors"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  if (!user) {
    // This will show briefly before redirect
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-text-tertiary text-6xl mb-4">🔐</div>
          <h2 className="text-2xl font-bold text-white mb-4">Access Restricted</h2>
          <p className="text-text-tertiary">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}