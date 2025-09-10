// pages/signup.js
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

// ---- Clerk (parallel path) ----
import { ClerkProvider, SignUp, useAuth, useUser } from "@clerk/nextjs";
import { SubscriptionDetailsButton } from "@clerk/nextjs/experimental";

const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

export default function SignupPage() {
  return (
    <ClerkProvider publishableKey={PUBLISHABLE_KEY} appearance={{ baseTheme: "dark" }}>
      <SignupContent />
    </ClerkProvider>
  );
}

function SignupContent() {
  const router = useRouter();
  const { isSignedIn, getToken } = useAuth();
  const { user } = useUser();

  // ========= Legacy state (kept) =========
  const [first, setFirst] = useState("");
  const [last, setLast] = useState("");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [agree, setAgree] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  // After Clerk sign-up completes, we’ll be signed in → exchange token → optionally open plan chooser
  useEffect(() => {
    (async () => {
      if (!isSignedIn || !getToken) return;
      console.groupCollapsed("[Signup] Clerk post-signup");
      try {
        const cJwt = await getToken();
        console.log("[Signup] clerk token len:", cJwt?.length);
        const res = await fetch(`${API_BASE_URL}/auth/exchange`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ clerk_jwt: cJwt }),
        });
        const txt = await res.text();
        console.log("[Signup] exchange status:", res.status, "body:", txt);
        if (!res.ok) throw new Error(`[Exchange] ${res.status} ${txt}`);
        const data = JSON.parse(txt);
        localStorage.setItem("token", data.access_token);
        console.log("[Signup] app token stored");
      } catch (e) {
        console.warn("[Signup] Clerk exchange failed:", e);
      } finally {
        console.groupEnd();
      }
    })();
  }, [isSignedIn, getToken]);

  // ========= Legacy submit (kept) =========
  const onSubmitLegacy = async (e) => {
    e.preventDefault();
    setErr("");
    if (!first || !last || !email || !pw) {
      setErr("All fields are required.");
      return;
    }
    if (pw !== pw2) {
      setErr("Passwords do not match.");
      return;
    }
    if (!agree) {
      setErr("Please agree to the Terms of Service and Privacy Policy.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password: pw, first_name: first, last_name: last }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErr(typeof data.detail === "string" ? data.detail : "Sign up failed.");
        return;
      }
      router.push("/login?signup=success");
    } catch {
      setErr("Could not sign up. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex items-center justify-center p-6">
      <div className="w-full max-w-4xl grid md:grid-cols-2 gap-6">
        {/* ===== Left: Legacy email/password sign-up (UNCHANGED flow) ===== */}
        <div className="border border-gray-800 rounded-2xl bg-gray-900 p-6">
          <h1 className="text-2xl font-semibold mb-2">Create your account</h1>
          <p className="text-sm text-gray-400 mb-6">Get started with email and password.</p>

          {err && (
            <div className="mb-4 bg-red-500/10 border border-red-500/30 text-red-300 text-sm px-3 py-2 rounded">
              {err}
            </div>
          )}

          <form onSubmit={onSubmitLegacy} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-gray-300 mb-1">First name</label>
                <input
                  className="w-full rounded bg-gray-950 border border-gray-700 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                  value={first}
                  onChange={(e) => setFirst(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-1">Last name</label>
                <input
                  className="w-full rounded bg-gray-950 border border-gray-700 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                  value={last}
                  onChange={(e) => setLast(e.target.value)}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm text-gray-300 mb-1">Email</label>
              <input
                type="email"
                className="w-full rounded bg-gray-950 border border-gray-700 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-gray-300 mb-1">Password</label>
                <input
                  type="password"
                  className="w-full rounded bg-gray-950 border border-gray-700 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                  value={pw}
                  onChange={(e) => setPw(e.target.value)}
                  autoComplete="new-password"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-1">Confirm password</label>
                <input
                  type="password"
                  className="w-full rounded bg-gray-950 border border-gray-700 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                  value={pw2}
                  onChange={(e) => setPw2(e.target.value)}
                />
              </div>
            </div>

            <label className="inline-flex items-center gap-2 text-sm">
              <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
              I agree to the{" "}
              <a className="text-blue-400 hover:text-blue-300" href="/terms" target="_blank" rel="noreferrer">
                Terms of Service
              </a>{" "}
              and{" "}
              <a className="text-blue-400 hover:text-blue-300" href="/privacy" target="_blank" rel="noreferrer">
                Privacy Policy
              </a>.
            </label>

            <button disabled={loading} className="w-full mt-2 px-4 py-2 rounded bg-blue-600 hover:bg-blue-700 disabled:opacity-60">
              {loading ? "Creating…" : "Create account"}
            </button>
          </form>

          <p className="mt-6 text-sm text-gray-400">
            Already have an account?{" "}
            <Link href="/login" className="text-blue-400 hover:text-blue-300">
              Sign in
            </Link>
          </p>
        </div>

        {/* ===== Right: Clerk (PARALLEL) + Plan picker hook ===== */}
        <div className="border border-gray-800 rounded-2xl bg-gray-900 p-6">
          <h2 className="text-lg font-semibold mb-2">Or sign up with Clerk</h2>
          <p className="text-sm text-gray-400 mb-4">Use SSO providers or your Clerk credentials.</p>

          <div className="max-w-sm mb-6">
            <SignUp
              appearance={{ baseTheme: "dark" }}
              signInUrl="/login"
              // after sign-up Clerk will sign the user in; our effect above exchanges token
            />
          </div>

          {/* Prompt to choose plan right away (optional; you can also keep this on /billing) */}
          {isSignedIn && (
            <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
              <h3 className="font-medium mb-2">Choose your plan</h3>
              <p className="text-sm text-gray-400 mb-3">
                Open subscription details to pick a plan. We’ll sync to Supabase automatically.
              </p>
              <SubscriptionDetailsButton
                onClose={async () => {
                  try {
                    const cJwt = await getToken();
                    console.log("[Signup] re-exchange after plan close");
                    await fetch(`${API_BASE_URL}/auth/exchange`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ clerk_jwt: cJwt }),
                    });
                  } catch (e) {
                    console.warn("[Signup] re-exchange failed", e);
                  }
                }}
              >
                <button className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-700">
                  Open Subscription Details
                </button>
              </SubscriptionDetailsButton>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
