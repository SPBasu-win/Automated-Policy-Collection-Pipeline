"use client";
import { useAuth } from "./contexts/AuthContext";
import { User, Mail, Calendar, Shield, LogOut, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [clearing, setClearing] = useState(false);

  if (!user) {
    router.push("/auth");
    return null;
  }

  const handleClearHistory = async () => {
    if (!confirm("Are you sure you want to clear all chat history? This cannot be undone.")) {
      return;
    }

    setClearing(true);
    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch("http://127.0.0.1:8000/chat/history", {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${token}`,
        },
      });

      if (res.ok) {
        alert("Chat history cleared successfully");
      }
    } catch (error) {
      alert("Failed to clear chat history");
    } finally {
      setClearing(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Never";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="min-h-screen bg-zinc-950 p-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-8 animate-fadeIn">
          <h1 className="text-3xl font-semibold text-white mb-2">Profile</h1>
          <p className="text-zinc-400">Manage your account information and settings</p>
        </div>

        {/* Profile Card */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 mb-6 shadow-xl hover:shadow-2xl transition-all animate-fadeIn" style={{ animationDelay: "100ms" }}>
          <div className="flex items-start gap-6">
            {/* Avatar */}
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0 shadow-lg hover:scale-105 transition-transform">
              <span className="text-3xl font-bold text-white">
                {user.username.charAt(0).toUpperCase()}
              </span>
            </div>

            {/* User Info */}
            <div className="flex-1">
              <h2 className="text-2xl font-semibold text-white mb-1">{user.username}</h2>
              <p className="text-zinc-400 mb-6">{user.email}</p>

              <div className="space-y-4">
                {/* Email */}
                <div className="flex items-center gap-3 text-sm">
                  <Mail className="w-4 h-4 text-zinc-500" />
                  <span className="text-zinc-400">Email:</span>
                  <span className="text-white">{user.email}</span>
                </div>

                {/* User ID */}
                <div className="flex items-center gap-3 text-sm">
                  <User className="w-4 h-4 text-zinc-500" />
                  <span className="text-zinc-400">User ID:</span>
                  <span className="text-white font-mono">#{user.id}</span>
                </div>

                {/* Account Created */}
                <div className="flex items-center gap-3 text-sm">
                  <Calendar className="w-4 h-4 text-zinc-500" />
                  <span className="text-zinc-400">Member Since:</span>
                  <span className="text-white">{formatDate(user.created_at)}</span>
                </div>

                {/* Last Login */}
                <div className="flex items-center gap-3 text-sm">
                  <Shield className="w-4 h-4 text-zinc-500" />
                  <span className="text-zinc-400">Last Login:</span>
                  <span className="text-white">{formatDate(user.last_login)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Security Section */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 mb-6 shadow-xl hover:shadow-2xl transition-all animate-fadeIn" style={{ animationDelay: "200ms" }}>
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Security & Privacy
          </h3>
          <div className="space-y-4">
            <div className="flex items-start gap-2 text-sm text-zinc-400">
              <div className="w-2 h-2 rounded-full bg-green-500 mt-1.5 shadow-lg shadow-green-500/50"></div>
              <div>
                <p className="text-white mb-1">Password Encryption</p>
                <p>Your password is secured with bcrypt hashing</p>
              </div>
            </div>
            <div className="flex items-start gap-2 text-sm text-zinc-400">
              <div className="w-2 h-2 rounded-full bg-green-500 mt-1.5 shadow-lg shadow-green-500/50"></div>
              <div>
                <p className="text-white mb-1">JWT Authentication</p>
                <p>Secure token-based authentication for all requests</p>
              </div>
            </div>
            <div className="flex items-start gap-2 text-sm text-zinc-400">
              <div className="w-2 h-2 rounded-full bg-green-500 mt-1.5 shadow-lg shadow-green-500/50"></div>
              <div>
                <p className="text-white mb-1">SQL Injection Protection</p>
                <p>Advanced input validation prevents malicious queries</p>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-3 animate-fadeIn" style={{ animationDelay: "300ms" }}>
          <button
            onClick={handleClearHistory}
            disabled={clearing}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-300 hover:bg-zinc-700 transition-all hover:shadow-lg transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
          >
            <Trash2 className="w-4 h-4" />
            {clearing ? "Clearing..." : "Clear Chat History"}
          </button>

          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 hover:bg-red-500/20 hover:border-red-500/30 transition-all hover:shadow-lg hover:shadow-red-500/20 transform hover:scale-[1.02] active:scale-[0.98]"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}