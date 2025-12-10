"use client";
import { useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useRouter, usePathname } from "next/navigation";
import Sidebar from "./Sidebar";

export default function ProtectedWrapper({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  
  // Define which paths don't require authentication
  const publicPaths = ["/auth"];
  const isPublicPath = publicPaths.includes(pathname);

  useEffect(() => {
    if (!loading) {
      // Redirect to login if not authenticated and trying to access protected route
      if (!user && !isPublicPath) {
        router.push("/auth");
      } 
      // Redirect to home if authenticated user tries to access auth page
      else if (user && isPublicPath) {
        router.push("/");
      }
    }
  }, [user, loading, router, pathname, isPublicPath]);

  // Show loading screen while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-zinc-700 border-t-white rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-zinc-400 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  // For public paths (like /auth), show without sidebar
  if (isPublicPath) {
    return <>{children}</>;
  }

  // For protected routes, show nothing if not authenticated (redirect is happening)
  if (!user) {
    return null;
  }

  // For authenticated users on protected routes, show with sidebar
  return (
    <div className="flex h-screen w-full bg-zinc-950 overflow-hidden">
      <div className="w-64 flex-shrink-0 border-r border-zinc-800 bg-zinc-950">
        <Sidebar />
      </div>
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}