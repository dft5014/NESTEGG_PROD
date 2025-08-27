// pages/kindelogin.js
import Head from "next/head";
import { useEffect } from "react";
import { LoginLink, RegisterLink, LogoutLink } from "@kinde-oss/kinde-auth-nextjs";

export default function KindeLoginDebug() {
  // Log envs at mount (non-secret ones)
  useEffect(() => {
    console.group("KindeLogin Debug Init");
    console.log("✅ KindeLogin page mounted");
    console.log("KINDE_ISSUER_URL:", process.env.KINDE_ISSUER_URL);
    console.log("KINDE_CLIENT_ID:", process.env.KINDE_CLIENT_ID ? "[set]" : "[missing]");
    console.log("KINDE_POST_LOGIN_REDIRECT_URL:", process.env.KINDE_POST_LOGIN_REDIRECT_URL);
    console.log("KINDE_POST_LOGOUT_REDIRECT_URL:", process.env.KINDE_POST_LOGOUT_REDIRECT_URL);
    console.groupEnd();
  }, []);

  // Helper for button clicks
  const logAction = (action) => {
    console.group(`Kinde Action: ${action}`);
    console.log(`👉 ${action} clicked at`, new Date().toISOString());
    console.groupEnd();
  };

  return (
    <>
      <Head><title>Kinde Login Debug</title></Head>
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-gray-900/70 border border-gray-800 rounded-2xl shadow-xl p-6 space-y-4">
          <h1 className="text-2xl font-bold">Kinde Login Debug</h1>
          <p className="text-gray-400 text-sm">
            Use this page to test Kinde auth flow. Watch your browser console for logs.
          </p>

          <div className="space-y-3">
            <LoginLink postLoginRedirectURL="/kinde-debug">
              <button
                type="button"
                onClick={() => logAction("Login")}
                className="w-full rounded-lg bg-blue-600 px-4 py-3 hover:bg-blue-700"
              >
                Log In with Kinde
              </button>
            </LoginLink>

            <RegisterLink postLoginRedirectURL="/kinde-debug">
              <button
                type="button"
                onClick={() => logAction("Register")}
                className="w-full rounded-lg bg-green-600 px-4 py-3 hover:bg-green-700"
              >
                Register with Kinde
              </button>
            </RegisterLink>

            <LogoutLink postLogoutRedirectURL="/kindelogin">
              <button
                type="button"
                onClick={() => logAction("Logout")}
                className="w-full rounded-lg bg-gray-700 px-4 py-3 hover:bg-gray-800"
              >
                Log Out
              </button>
            </LogoutLink>
          </div>

          <div className="mt-4 text-xs text-gray-500">
            <p>ℹ️ After login/register you should land at <code>/kinde-debug</code></p>
            <p>ℹ️ After logout you should return to <code>/kindelogin</code></p>
          </div>
        </div>
      </div>
    </>
  );
}
