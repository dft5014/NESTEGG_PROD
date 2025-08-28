import Head from "next/head";
import { useEffect, useState } from "react";
import { LoginLink, RegisterLink, LogoutLink } from "@kinde-oss/kinde-auth-nextjs/components";

export default function KindeLoginDebug() {
  const [debugInfo, setDebugInfo] = useState({});
  
  useEffect(() => {
    console.group("KindeLogin Debug Init (Client)");
    console.log("✅ KindeLogin page mounted");

    // Collect all debug info
    const info = {
      domain: process.env.NEXT_PUBLIC_KINDE_DOMAIN,
      clientId: process.env.NEXT_PUBLIC_KINDE_CLIENT_ID ? "[set]" : "[missing]",
      redirectUri: process.env.NEXT_PUBLIC_KINDE_REDIRECT_URI,
      logoutUri: process.env.NEXT_PUBLIC_KINDE_LOGOUT_URI,
    };

    console.log("Environment Variables:", info);
    setDebugInfo(info);

    // Check server env
    fetch("/api/kinde-check")
      .then((r) => r.json())
      .then((data) => {
        console.group("Kinde Server Env Check");
        console.log("Server config:", data);
        console.groupEnd();
        
        setDebugInfo(prev => ({ ...prev, serverConfig: data }));
      })
      .catch((e) => {
        console.error("Failed to call /api/kinde-check", e);
      });

    console.groupEnd();
  }, []);

  const logAction = (action, url) => {
    console.group(`Kinde Action: ${action}`);
    console.log(`👉 ${action} clicked at`, new Date().toISOString());
    console.log(`Expected redirect to:`, url || "Kinde domain");
    console.groupEnd();
  };

  return (
    <>
      <Head><title>Kinde Login Debug</title></Head>
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center p-6">
        <div className="w-full max-w-2xl bg-gray-900/70 border border-gray-800 rounded-2xl shadow-xl p-8">
          <h1 className="text-3xl font-bold mb-6 text-center">🔍 Kinde Login Debug</h1>
          
          {/* Debug Info Display */}
          <div className="mb-8 p-4 bg-gray-800/50 rounded-lg">
            <h3 className="text-lg font-semibold mb-3">📊 Current Configuration</h3>
            <div className="text-sm space-y-2">
              <div>
                <span className="text-gray-400">Domain:</span> 
                <span className="ml-2 text-green-400">{debugInfo.domain}</span>
              </div>
              <div>
                <span className="text-gray-400">Client ID:</span> 
                <span className="ml-2 text-green-400">{debugInfo.clientId}</span>
              </div>
              <div>
                <span className="text-gray-400">Redirect URI:</span> 
                <span className="ml-2 text-blue-400">{debugInfo.redirectUri}</span>
              </div>
              
              {debugInfo.serverConfig && (
                <div className="mt-3 pt-3 border-t border-gray-700">
                  <div className="text-gray-400">Server Config:</div>
                  <div className="ml-2 space-y-1">
                    <div>Issuer URL: {debugInfo.serverConfig.issuerUrlSet ? '✅' : '❌'}</div>
                    <div>Client ID: {debugInfo.serverConfig.clientIdSet ? '✅' : '❌'}</div>
                    <div>Post Login: <span className="text-xs">{debugInfo.serverConfig.postLogin}</span></div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-4">
            <div className="text-center mb-4">
              <p className="text-gray-400 text-sm">Click a button and watch the console + URL bar</p>
            </div>

            <LoginLink postLoginRedirectURL="/kinde-debug">
              <button 
                type="button" 
                onClick={() => logAction("Login", `${debugInfo.domain}/oauth/login`)}
                className="w-full rounded-lg bg-blue-600 px-6 py-4 hover:bg-blue-700 transition-colors text-lg font-semibold"
              >
                🚀 Log In with Kinde
              </button>
            </LoginLink>

            <RegisterLink postLoginRedirectURL="/kinde-debug">
              <button 
                type="button" 
                onClick={() => logAction("Register", `${debugInfo.domain}/oauth/register`)}
                className="w-full rounded-lg bg-green-600 px-6 py-4 hover:bg-green-700 transition-colors text-lg font-semibold"
              >
                📝 Register with Kinde
              </button>
            </RegisterLink>

            <LogoutLink postLogoutRedirectURL="/kindelogin">
              <button 
                type="button" 
                onClick={() => logAction("Logout", `${debugInfo.domain}/logout`)}
                className="w-full rounded-lg bg-gray-600 px-6 py-4 hover:bg-gray-700 transition-colors text-lg font-semibold"
              >
                🚪 Log Out
              </button>
            </LogoutLink>
          </div>

          {/* Expected Flow */}
          <div className="mt-8 p-4 bg-blue-900/20 border border-blue-600/30 rounded-lg">
            <h4 className="font-semibold text-blue-400 mb-2">🎯 Expected Flow:</h4>
            <ol className="text-sm space-y-1 text-blue-200">
              <li>1. Click Register → Should go to <code>nestegg.kinde.com</code></li>
              <li>2. Create account on Kinde's page</li>
              <li>3. Get redirected back to <code>/kinde-debug</code></li>
              <li>4. See user info displayed</li>
            </ol>
          </div>

          {/* Current Issue */}
          <div className="mt-4 p-4 bg-red-900/20 border border-red-600/30 rounded-lg">
            <h4 className="font-semibold text-red-400 mb-2">❌ Current Issue:</h4>
            <p className="text-sm text-red-200">
              Going to <code>/api/auth/register</code> instead of Kinde's domain. 
              This means the API route isn't properly redirecting to Kinde.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}