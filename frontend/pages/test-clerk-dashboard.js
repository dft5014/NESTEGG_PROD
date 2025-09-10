// pages/test-clerk-dashboard.js
import { ClerkProvider, useAuth, useUser, UserProfile, SignedIn, SignedOut } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader, Copy, Star, Zap, Crown } from "lucide-react";

const planDetails = {
  free: { name: "Free", icon: <Star className="h-5 w-5" />, color: "text-gray-400", bgColor: "bg-gray-500/10" },
  pro: { name: "Pro", icon: <Zap className="h-5 w-5" />, color: "text-blue-400", bgColor: "bg-blue-500/10" },
  premium: { name: "Premium", icon: <Crown className="h-5 w-5" />, color: "text-purple-400", bgColor: "bg-purple-500/10" },
};

export default function TestClerkDashboard() {
  return (
    <ClerkProvider publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY} appearance={{ baseTheme: "dark" }}>
      <DashboardContent />
    </ClerkProvider>
  );
}

function DashboardContent() {
  const { isLoaded, isSignedIn, user } = useUser();
  const { getToken } = useAuth();

  const [clerkToken, setClerkToken] = useState(null);
  const [appToken, setAppToken] = useState(null);
  const [userPing, setUserPing] = useState({ ok: null, msg: "" });
  const [copied, setCopied] = useState({ clerk: false, app: false });

  const userPlan = user?.unsafeMetadata?.plan || user?.publicMetadata?.plan || "free";
  const plan = planDetails[userPlan] || planDetails.free;

  useEffect(() => {
    const run = async () => {
      if (!isSignedIn || !getToken) return;
      try {
        const cJwt = await getToken();
        setClerkToken(cJwt);

        const base = process.env.NEXT_PUBLIC_API_URL;
        if (!base) throw new Error("NEXT_PUBLIC_API_URL is not set");

        // Exchange token (and ensure Supabase user row)
        const res = await fetch(`${base}/auth/exchange`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ clerk_jwt: cJwt }),
        });
        if (!res.ok) throw new Error(`Exchange failed (${res.status}): ${await res.text()}`);
        const data = await res.json();
        setAppToken(data.access_token);
        localStorage.setItem("token", data.access_token);

        // Ping /user
        const ures = await fetch(`${base}/user`, { headers: { Authorization: `Bearer ${data.access_token}` } });
        setUserPing(ures.ok ? { ok: true, msg: "✓ /user returned 200" } : { ok: false, msg: `✗ /user ${ures.status}` });
      } catch (e) {
        setUserPing({ ok: false, msg: e.message });
      }
    };
    run();
  }, [isSignedIn, getToken]);

  const copy = (what) => {
    const val = what === "clerk" ? clerkToken : appToken;
    if (!val) return;
    navigator.clipboard.writeText(val);
    setCopied((s) => ({ ...s, [what]: true }));
    setTimeout(() => setCopied((s) => ({ ...s, [what]: false })), 1500);
  };

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <Loader className="h-8 w-8 text-blue-500 animate-spin mx-auto mb-4" />
          <div className="text-gray-100">Loading Clerk...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <div className="max-w-6xl mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <Link href="/test-clerk-login" className="text-blue-400 hover:text-blue-300">Switch account</Link>
        </div>

        <SignedOut>
          <div className="p-6 border border-gray-800 rounded-xl bg-gray-900">Please sign in first.</div>
        </SignedOut>

        <SignedIn>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="border border-gray-800 rounded-xl bg-gray-900 p-6">
              <h2 className="text-lg font-semibold mb-4">Tokens</h2>
              <div className="space-y-2">
                <Token label="Clerk Session Token" token={clerkToken} copied={copied.clerk} onCopy={() => copy("clerk")} />
                <Token label="NestEgg App Token" token={appToken} copied={copied.app} onCopy={() => copy("app")} />
              </div>
              <p className={`mt-3 text-sm ${userPing.ok ? "text-green-400" : "text-red-400"}`}>{userPing.msg || " "}</p>
            </div>

            <div className="border border-gray-800 rounded-xl bg-gray-900 p-6">
              <h2 className="text-lg font-semibold mb-4">Account</h2>
              <div className={`inline-flex items-center gap-2 px-3 py-1 rounded ${plan.bgColor} ${plan.color}`}>
                {plan.icon} <span className="font-medium">{plan.name}</span>
              </div>
              <div className="mt-6">
                <UserProfile
                  appearance={{ baseTheme: "dark" }}
                  // Example: add custom pages per Clerk docs if desired
                  // https://clerk.com/docs/components/user/user-profile
                />
              </div>
            </div>
          </div>
        </SignedIn>
      </div>
    </div>
  );
}

function Token({ label, token, copied, onCopy }) {
  return (
    <div className="text-sm">
      <div className="flex items-center justify-between">
        <span className="text-gray-300">{label}</span>
        <button
          className="text-xs px-2 py-1 rounded bg-gray-800 hover:bg-gray-700"
          onClick={onCopy}
          disabled={!token}
        >
          <Copy className="h-3 w-3 inline mr-1" />
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="mt-1 p-2 rounded bg-black/40 text-gray-400 overflow-x-auto">{token ? token.slice(0, 80) + "…" : "—"}</pre>
    </div>
  );
}
