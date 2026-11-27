"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "./auth-context";
import { useI18n } from "@/components/locale-provider";
import { LogoTraceLoader } from "@/components/LogoTraceLoader";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const { localize } = useI18n();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push(localize("/auth/login"));
    }
  }, [isAuthenticated, isLoading, localize, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LogoTraceLoader loading size={56} strokeWidth={40} ariaLabel="Loading account" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}
