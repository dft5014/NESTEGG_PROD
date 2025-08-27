// pages/kindelogin.js
import Head from "next/head";
import { useEffect } from "react";
import { LoginLink, RegisterLink, LogoutLink } from "@kinde-oss/kinde-auth-nextjs";

export default function KindeLoginDebug() {
  useEffect(() => {
    console.group("KindeLogin Debug Init (Client)");
    console.log("✅ KindeLogin page mounted");

    // Client-visible values (NEXT_PUBLIC_*)
    console.log("NEXT_PUBLIC_KINDE_DOMAIN:", process.env.NEXT_PUBLIC_KINDE_DOMAIN);
    console.log("NEXT_PUBLIC_KINDE_CLIENT_ID:", process.env.NEXT_PUBLIC_KINDE_CLIENT_ID ? "[set]" : "[missing]");
    console.log("NEXT_PUBLIC_KINDE_REDIRECT_URI:", process.env.NEXT_PUBLIC_KINDE_REDIRECT_URI);
    console.log("NEXT_PUBLIC_KINDE_LOGOUT_URI:", process.env.NEXT_PUBLIC_KINDE_LOGOUT_URI);

    // Ask the server if server-only KINDE_* are set (no secrets returned)
    fetch("/api/kinde-check")
      .then((r) => r.json())
      .then((data) => {
        console.group("Kinde Server Env Check");
        console.log("KINDE_ISSUER_URL set:", data.issuerUrlSet ? "✅" : "❌");
        console.log("KINDE_CLIENT_ID set:", data.clientIdSet ? "✅" : "❌");
        console.log("KINDE_CLIENT_SECRET set:", data.clientSecretSet ? "✅" : "❌ (may be optional)");
        console.log("KINDE_POST_LOGIN_REDIRECT_URL:", data.postLogin || "[missing]");
        console.log("KINDE_POST_LOGOUT_REDIRECT_URL:", data.postLogout || "[missing]");
        console.groupEnd();
      })
      .catch((e) => {
        console.error("Failed to call /api/kinde-check", e);
      });

    console.groupEnd();
  }, []);

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
          <p className="text-gray-400 text-sm">Open DevTools → Console to see logs.</p>

          <div className="space-y-3">
            <LoginLink postLoginRedirectURL="/kinde-debug">
              <button type="button" onClick={() => logAction("Login")}
                      className="w-full rounded-lg bg-blue-600 px-4 py-3 hover:bg-blue-700">
                Log In with Kinde
              </button>
            </LoginLink>

            <RegisterLink postLoginRedirectURL="/kinde-debug">
              <button type="button" onClick={() => logAction("Register")}
                      className="w-full rounded-lg bg-green-600 px-4 py-3 hover:bg-green-700">
                Register with Kinde
              </button>
            </RegisterLink>

            <LogoutLink postLogoutRedirectURL="/kindelogin">
              <button type="button" onClick={() => logAction("Logout")}
                      className="w-full rounded-lg bg-gray-700 px-4 py-3 hover:bg-gray-800">
                Log Out
              </button>
            </LogoutLink>
          </div>
        </div>
      </div>
    </>
  );
}
