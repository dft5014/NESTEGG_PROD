// pages/test-clerk-login.js
import { ClerkProvider, SignIn, SignedIn, SignedOut, SignOutButton, useUser } from "@clerk/nextjs";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, LogIn, Shield, Zap, LogOut, AlertCircle } from "lucide-react";

export default function TestClerkLogin() {
  return (
    <ClerkProvider
      publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}
      appearance={{ baseTheme: "dark" }} // Clerk prebuilt theme
    >
      <LoginContent />
    </ClerkProvider>
  );
}

function LoginContent() {
  const { user } = useUser();
  const [error, setError] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("error")) setError(params.get("error"));
  }, []);

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Header */}
      <div className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border-b border-yellow-500/20">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <LogIn className="h-6 w-6 text-yellow-500" />
              <div>
                <h1 className="text-lg font-semibold text-gray-100">NestEgg - Clerk Test Login</h1>
                <p className="text-sm text-gray-400">Testing environment - Production unaffected</p>
              </div>
            </div>
            <Link href="/login" className="flex items-center text-blue-400 hover:text-blue-300">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to regular login
            </Link>
          </div>
        </div>
      </div>

      <div className="flex min-h-[calc(100vh-80px)]">
        {/* Left Info */}
        <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-gray-900 to-gray-950 p-12 flex-col justify-center">
          <div className="max-w-md">
            <h2 className="text-3xl font-bold text-gray-100 mb-6">Welcome Back to NestEgg</h2>
            <div className="space-y-4 mb-8">
              <Info icon={<Shield className="h-5 w-5 text-green-500" />} title="Secure Access" text="Your financial data is encrypted and protected" />
              <Info icon={<Zap className="h-5 w-5 text-blue-500" />} title="Quick Login" text="Use email, social login, or passkeys" />
            </div>
            <div className="p-4 bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-lg">
              <p className="text-sm text-gray-400">
                Don&apos;t have an account?{" "}
                <Link href="/test-clerk-signup" className="text-blue-400 hover:text-blue-300 ml-1">
                  Sign up here
                </Link>
              </p>
            </div>
          </div>
        </div>

        {/* Right Auth Panel */}
        <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
          <div className="w-full max-w-md">
            <SignedOut>
              {error && (
                <div className="mb-4 p-3 rounded border border-red-500/30 bg-red-500/10 text-red-300 text-sm flex items-center">
                  <AlertCircle className="h-4 w-4 mr-2" /> {error}
                </div>
              )}
              <SignIn
                appearance={{
                  baseTheme: "dark",
                  elements: {
                    card: "bg-gray-900 border border-gray-800 shadow-2xl",
                    formButtonPrimary:
                      "bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600",
                  },
                }}
                path="/test-clerk-login"
                signUpUrl="/test-clerk-signup"
                afterSignInUrl="/test-clerk-dashboard"
                routing="path"
              />
            </SignedOut>

            <SignedIn>
              <div className="p-6 rounded-xl border border-gray-800 bg-gray-900">
                <p className="text-gray-100 mb-3">You&apos;re already signed in as <b>{user?.primaryEmailAddress?.emailAddress}</b>.</p>
                <div className="flex items-center gap-3">
                  <Link href="/test-clerk-dashboard" className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700">
                    Go to dashboard
                  </Link>
                  <SignOutButton>
                    <button className="px-4 py-2 rounded bg-gray-700 text-gray-100 hover:bg-gray-600 flex items-center gap-2">
                      <LogOut className="h-4 w-4" /> Sign out
                    </button>
                  </SignOutButton>
                </div>
              </div>
            </SignedIn>
          </div>
        </div>
      </div>
    </div>
  );
}

function Info({ icon, title, text }) {
  return (
    <div className="flex items-start space-x-3">
      {icon}
      <div>
        <p className="text-gray-100 font-medium">{title}</p>
        <p className="text-gray-400 text-sm">{text}</p>
      </div>
    </div>
  );
}
