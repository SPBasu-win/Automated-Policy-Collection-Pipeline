"use client";
import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useRouter } from "next/navigation";

export default function Auth() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  
  const { login, signup } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (isSignUp) {
        if (!username.trim()) {
          setError("Username is required");
          setLoading(false);
          return;
        }
        await signup(email, username, password);
      } else {
        await login(email, password);
      }
      // Redirect happens in AuthContext after successful login/signup
    } catch (err: any) {
      setError(err.message || "Authentication failed");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-950 px-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-white">
            {isSignUp ? "Create Account" : "Welcome Back"}
          </h1>
          <p className="mt-2 text-sm text-zinc-400">
            {isSignUp 
              ? "Sign up to access the policy verification system" 
              : "Enter your credentials to access the system"}
          </p>
        </div>

        {/* Tab Toggle */}
        <div className="flex rounded-lg bg-zinc-900 p-1 border border-zinc-800">
          <button
            onClick={() => {
              setIsSignUp(false);
              setError("");
            }}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
              !isSignUp
                ? "bg-zinc-800 text-white shadow-lg"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            Sign In
          </button>
          <button
            onClick={() => {
              setIsSignUp(true);
              setError("");
            }}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
              isSignUp
                ? "bg-zinc-800 text-white shadow-lg"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            Sign Up
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <div>
            <label htmlFor="email" className="block text-xs font-medium text-zinc-300 uppercase mb-1">
              Email Address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="block w-full px-3 py-2.5 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-zinc-600 focus:ring-2 focus:ring-zinc-600/50 transition-all"
              placeholder="name@example.com"
            />
          </div>

          {isSignUp && (
            <div>
              <label htmlFor="username" className="block text-xs font-medium text-zinc-300 uppercase mb-1">
                Username
              </label>
              <input
                id="username"
                name="username"
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="block w-full px-3 py-2.5 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-zinc-600 focus:ring-2 focus:ring-zinc-600/50 transition-all"
                placeholder="johndoe"
              />
            </div>
          )}

          <div>
            <label htmlFor="password" className="block text-xs font-medium text-zinc-300 uppercase mb-1">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="block w-full px-3 py-2.5 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-zinc-600 focus:ring-2 focus:ring-zinc-600/50 transition-all"
              placeholder="••••••••"
            />
            {isSignUp && (
              <p className="mt-1 text-xs text-zinc-500">
                Must be 8+ characters with uppercase, lowercase, and number
              </p>
            )}
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-lg text-sm font-medium text-black bg-white hover:bg-zinc-100 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-white/50 transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Processing...
              </span>
            ) : (
              isSignUp ? "Create Account" : "Sign In"
            )}
          </button>
        </form>

        <p className="text-center text-xs text-zinc-500 mt-6">
          {isSignUp ? "Already have an account? " : "Don't have an account? "}
          <button
            onClick={() => {
              setIsSignUp(!isSignUp);
              setError("");
            }}
            className="text-white hover:underline font-medium"
          >
            {isSignUp ? "Sign in" : "Sign up"}
          </button>
        </p>
      </div>
    </div>
  );
}