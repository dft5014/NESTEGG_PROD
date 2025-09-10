// pages/login.js
import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Link from "next/link";

// ---- Legacy API base (keep your util if you have one) ----
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

// ---- Clerk (parallel path) ----
import { ClerkProvider, SignIn, useAuth, useUser } from "@clerk/nextjs";

const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

export default function LoginPage() {
  return (
    <ClerkProvider publishableKey={PUBLISHABLE_KEY} appearance={{ baseTheme: "dark" }}>
      <LoginContent />
    </ClerkProvider>
  );
}

function LoginContent() {
  const router = useRouter();
  const { isSignedIn, getToken } = useAuth();
  const { user } = useUser();

  // ========= Legacy state (kept) =========
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Preserve your “remember me”
  useEffect(() => {
    const savedEmail = localStorage.getItem("rememberedEmail");
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
    }
  }, []);

  // After Clerk sign-in, immediately exchange token → app token and go to app
  useEffect(() => {
    (async () => {
      if (!isSignedIn || !getToken) return;
      console.groupCollapsed("[Login] Clerk post-signin");
      try {
        const clerkJwt = await getToken();
        console.log("[Login] clerk token len:", clerkJwt?.length);
        const res = await fetch(`${API_BASE_URL}/auth/exchange`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ clerk_jwt: clerkJwt }),
        });
        const txt = await res.text();
        console.log("[Login] exchange status:", res.status, "body:", txt);
        if (!res.ok) throw new Error(`[Exchange] ${res.status} ${txt}`);
        const data = JSON.parse(txt);
        localStorage.setItem("token", data.access_token);
        console.log("[Login] app token stored; redirecting to /portfolio");
        router.replace("/portfolio");
      } catch (e) {
        console.warn("[Login] Clerk exchange failed:", e);
      } finally {
        console.groupEnd();
      }
    })();
  }, [isSignedIn, getToken, router]);

  // ========= Legacy submit (kept) =========
  const onSubmitLegacy = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE_URL}/token`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ username: email, password }),
      });
      if (!res.ok) {
        setError("Invalid credentials. Please try again.");
        return;
      }
      const data = await res.json();
      localStorage.setItem("token", data.access_token);
      if (rememberMe) localStorage.setItem("rememberedEmail", email);
      else localStorage.removeItem("rememberedEmail");
      router.replace("/portfolio");
    } catch (err) {
      setError("Login failed. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex items-center justify-center p-6">
      <div className="w-full max-w-3xl grid md:grid-cols-2 gap-6">
        {/* ===== Left: Legacy email/password (UNCHANGED flow) ===== */}
        <div className="border border-gray-800 rounded-2xl bg-gray-900 p-6">
          <h1 className="text-2xl font-semibold mb-2">Sign in</h1>
          <p className="text-sm text-gray-400 mb-6">Use your email and password.</p>

          {error && (
            <div className="mb-4 bg-red-500/10 border border-red-500/30 text-red-300 text-sm px-3 py-2 rounded">
              {error}
            </div>
          )}

          <form onSubmit={onSubmitLegacy} className="space-y-4">
            <div>
              <label className="block text-sm text-gray-300 mb-1">Email</label>
              <input
                className="w-full rounded bg-gray-950 border border-gray-700 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-300 mb-1">Password</label>
              <input
                className="w-full rounded bg-gray-950 border border-gray-700 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>

            <div className="flex items-center justify-between text-sm">
              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                Remember me
              </label>
              <Link href="/forgot" className="text-blue-400 hover:text-blue-300">
                Forgot password?
              </Link>
            </div>

            <button
              disabled={loading}
              className="w-full mt-2 px-4 py-2 rounded bg-blue-600 hover:bg-blue-700 disabled:opacity-60"
            >
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>

          <p className="mt-6 text-sm text-gray-400">
            Don’t have an account?{" "}
            <Link href="/signup" className="text-blue-400 hover:text-blue-300">
              Sign up
            </Link>
          </p>
        </div>

        {/* ===== Right: Clerk (PARALLEL) ===== */}
        <div className="border border-gray-800 rounded-2xl bg-gray-900 p-6">
          <h2 className="text-lg font-semibold mb-2">Or continue with Clerk</h2>
          <p className="text-sm text-gray-400 mb-4">
            Use SSO providers or your Clerk credentials.
          </p>

          <div className="max-w-sm">
            <SignIn
              appearance={{ baseTheme: "dark" }}
              signUpUrl="/signup"
              // keep the widget scoped, don’t allow it to full-screen redirect away from the page layout
              // Clerk will still redirect internally when the user completes sign-in
            />
          </div>
        </div>
      </div>
    </div>
  );
}
