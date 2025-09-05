// pages/test-clerk-signup.js
import { ClerkProvider, SignUp } from "@clerk/nextjs";
import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Sparkles, Shield, Check } from 'lucide-react';

export default function TestClerkSignup() {
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
        {/* Header with clear test indication */}
        <div className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border-b border-yellow-500/20">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Sparkles className="h-6 w-6 text-yellow-500" />
                <div>
                  <h1 className="text-lg font-semibold text-white">Clerk Testing Mode</h1>
                  <p className="text-sm text-gray-400">This is a test page - your existing auth is unchanged</p>
                </div>
              </div>
              <Link href="/signup" className="flex items-center text-blue-400 hover:text-blue-300">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to regular signup
              </Link>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex min-h-[calc(100vh-80px)]">
          {/* Left side - Info Panel */}
          <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-gray-900 to-gray-950 p-12 flex-col justify-center">
            <div className="max-w-md">
              <h2 className="text-3xl font-bold text-white mb-6">
                Testing Clerk Authentication
              </h2>
              
              <div className="space-y-4 mb-8">
                <div className="flex items-start space-x-3">
                  <Check className="h-5 w-5 text-green-500 mt-0.5" />
                  <div>
                    <p className="text-white font-medium">Safe Testing Environment</p>
                    <p className="text-gray-400 text-sm">Your production auth remains completely unchanged</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <Check className="h-5 w-5 text-green-500 mt-0.5" />
                  <div>
                    <p className="text-white font-medium">Social Login Support</p>
                    <p className="text-gray-400 text-sm">Test Google, GitHub, and other OAuth providers</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <Check className="h-5 w-5 text-green-500 mt-0.5" />
                  <div>
                    <p className="text-white font-medium">Enhanced Security</p>
                    <p className="text-gray-400 text-sm">Built-in MFA, session management, and more</p>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <p className="text-sm text-blue-400">
                  <strong>Note:</strong> Accounts created here are for Clerk testing only. 
                  Use the regular signup for actual app access.
                </p>
              </div>
            </div>
          </div>

          {/* Right side - Clerk SignUp */}
          <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
            <div className="w-full max-w-md">
              <SignUp 
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
                    footerActionLink: 'text-blue-400 hover:text-blue-300',
                    identityPreviewText: 'text-gray-400',
                    identityPreviewEditButton: 'text-blue-400 hover:text-blue-300'
                  }
                }}
                routing="path"
                path="/test-clerk-signup"
                signInUrl="/test-clerk-login"
                fallbackRedirectUrl="/test-clerk-dashboard"
              />
            </div>
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