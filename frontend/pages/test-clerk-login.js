// pages/test-clerk-login.js
import { ClerkProvider, SignIn } from "@clerk/nextjs";
import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Sparkles, LogIn, Shield, Zap } from 'lucide-react';

export default function TestClerkLogin() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <ClerkProvider publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}>
      <div className="min-h-screen bg-gray-950">
        {/* Header */}
        <div className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border-b border-yellow-500/20">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <LogIn className="h-6 w-6 text-yellow-500" />
                <div>
                  <h1 className="text-lg font-semibold text-white">NestEgg - Clerk Test Login</h1>
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
          {/* Left side - Info */}
          <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-gray-900 to-gray-950 p-12 flex-col justify-center">
            <div className="max-w-md">
              <h2 className="text-3xl font-bold text-white mb-6">
                Welcome Back to NestEgg
              </h2>
              
              <div className="space-y-4 mb-8">
                <div className="flex items-start space-x-3">
                  <Shield className="h-5 w-5 text-green-500 mt-0.5" />
                  <div>
                    <p className="text-white font-medium">Secure Access</p>
                    <p className="text-gray-400 text-sm">Your financial data is encrypted and protected</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <Zap className="h-5 w-5 text-blue-500 mt-0.5" />
                  <div>
                    <p className="text-white font-medium">Quick Login</p>
                    <p className="text-gray-400 text-sm">Use email, social login, or passkeys</p>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-lg">
                <p className="text-sm text-gray-400">
                  Don't have an account? 
                  <Link href="/test-clerk-signup" className="text-blue-400 hover:text-blue-300 ml-1">
                    Sign up here
                  </Link>
                </p>
              </div>
            </div>
          </div>

          {/* Right side - Sign In */}
          <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
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
                afterSignUpUrl="/test-clerk-onboarding"
                fallbackRedirectUrl="/test-clerk-dashboard"
              />
            </div>
          </div>
        </div>
      </div>
    </ClerkProvider>
  );
}

// Skip static generation
export async function getServerSideProps() {
  return {
    props: {},
  };
}