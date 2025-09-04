// pages/test-clerk-login.js
import { ClerkProvider, SignIn } from "@clerk/nextjs";
import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Sparkles, TestTube } from 'lucide-react';

export default function TestClerkLogin() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null; // Prevent hydration mismatch
  }

  return (
    <ClerkProvider publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}>
      <div className="min-h-screen bg-gray-950">
        {/* Test Mode Banner */}
        <div className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border-b border-yellow-500/20">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <TestTube className="h-6 w-6 text-yellow-500" />
                <div>
                  <h1 className="text-lg font-semibold text-white">Clerk Test Login</h1>
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

        <div className="flex items-center justify-center min-h-[calc(100vh-80px)] p-8">
          <div className="w-full max-w-md">
            <SignIn 
              appearance={{
                baseTheme: "dark",
                elements: {
                  formButtonPrimary: 
                    'bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600',
                  card: 'bg-gray-900 border border-gray-800 shadow-2xl',
                  headerTitle: 'text-white',
                  headerSubtitle: 'text-gray-400',
                  socialButtonsBlockButton: 
                    'bg-gray-800 border-gray-700 text-white hover:bg-gray-700',
                  formFieldLabel: 'text-gray-300',
                  formFieldInput: 'bg-gray-800 border-gray-700 text-white',
                  footerActionLink: 'text-blue-400 hover:text-blue-300'
                }
              }}
              routing="path"
              path="/test-clerk-login"
              signUpUrl="/test-clerk-signup"
              afterSignInUrl="/test-clerk-dashboard"
            />
          </div>
        </div>
      </div>
    </ClerkProvider>
  );
}

// Skip static generation for this page
export async function getServerSideProps() {
  return {
    props: {},
  };
}