// pages/test-clerk-verify.js
import { SignIn } from "@clerk/nextjs";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Mail, ArrowLeft } from "lucide-react";

export default function TestClerkVerify() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  return (

      <div className="min-h-screen bg-gray-950">
        <Header />
        <div className="flex items-center justify-center min-h-[calc(100vh-80px)] p-8">
          <div className="w-full max-w-md">
            {/* SignIn here completes email code verification */}
            <SignIn
              appearance={{ baseTheme: "dark", elements: { card: "bg-gray-900 border border-gray-800" } }}
              routing="path"
              path="/test-clerk-verify"
              signUpUrl="/test-clerk-signup"
              fallbackRedirectUrl="/test-clerk-onboarding"
            />
          </div>
        </div>
      </div>
   
  );
}

function Header() {
  return (
    <div className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border-b border-yellow-500/20">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Mail className="h-6 w-6 text-yellow-500" />
            <div>
              <h1 className="text-lg font-semibold text-white">Email Verification</h1>
              <p className="text-sm text-gray-400">Clerk Test Environment</p>
            </div>
          </div>
          <Link href="/test-clerk-signup" className="flex items-center text-blue-400 hover:text-blue-300">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to signup
          </Link>
        </div>
      </div>
    </div>
  );
}
