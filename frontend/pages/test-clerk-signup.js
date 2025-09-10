// pages/test-clerk-signup.js
import { ClerkProvider, SignUp, SignedIn, SignedOut, useUser } from "@clerk/nextjs";
import Link from "next/link";
import { ArrowLeft, Check, Crown, Zap, Star, ChevronRight } from "lucide-react";
import { useState } from "react";

const plans = [
  { id: "free", name: "Free", price: "$0", period: "forever", icon: <Star className="h-6 w-6" />, color: "gray" },
  { id: "pro", name: "Pro", price: "$9", period: "/month", icon: <Zap className="h-6 w-6" />, color: "blue", popular: true },
  { id: "premium", name: "Premium", price: "$29", period: "/month", icon: <Crown className="h-6 w-6" />, color: "purple" },
];

export default function TestClerkSignup() {
  return (
    <ClerkProvider publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY} appearance={{ baseTheme: "dark" }}>
      <SignupContent />
    </ClerkProvider>
  );
}

function SignupContent() {
  const { user } = useUser();
  const [selectedPlan, setSelectedPlan] = useState("free");

  return (
    <div className="min-h-screen bg-gray-950">
      <Header />
      <div className="grid md:grid-cols-2 min-h-[calc(100vh-80px)]">
        {/* Left: Plan picker */}
        <div className="hidden md:block p-8 border-r border-gray-800">
          <div className="max-w-lg mx-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-100">Choose your plan</h3>
              <button onClick={() => setSelectedPlan("free")} className="text-gray-400 hover:text-gray-100 text-sm flex items-center">
                Skip for now <ChevronRight className="h-4 w-4 ml-1" />
              </button>
            </div>
            <div className="grid gap-4">
              {plans.map((p) => (
                <div
                  key={p.id}
                  onClick={() => setSelectedPlan(p.id)}
                  className={`relative rounded-xl border-2 p-6 cursor-pointer transition-transform hover:scale-[1.01] ${
                    selectedPlan === p.id
                      ? p.color === "blue"
                        ? "border-blue-500 bg-blue-500/10"
                        : p.color === "purple"
                        ? "border-purple-500 bg-purple-500/10"
                        : "border-gray-500 bg-gray-500/10"
                      : "border-gray-700 bg-gray-900 hover:border-gray-600"
                  }`}
                >
                  {p.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="bg-gradient-to-r from-blue-500 to-purple-500 text-gray-100 text-xs font-semibold px-3 py-1 rounded-full">
                        MOST POPULAR
                      </span>
                    </div>
                  )}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={p.color === "blue" ? "text-blue-500" : p.color === "purple" ? "text-purple-500" : "text-gray-400"}>{p.icon}</div>
                      <div>
                        <h4 className="text-gray-100 font-semibold">{p.name}</h4>
                        <div className="flex items-baseline">
                          <span className="text-2xl font-bold text-gray-100">{p.price}</span>
                          <span className="text-gray-400 ml-1">{p.period}</span>
                        </div>
                      </div>
                    </div>
                    {selectedPlan === p.id && (
                      <div className="bg-green-500 rounded-full p-1">
                        <Check className="h-4 w-4 text-gray-100" />
                      </div>
                    )}
                  </div>
                  <ul className="text-sm text-gray-300 space-y-2">
                    <li>Beautiful UI</li>
                    <li>Secure auth</li>
                    <li>Feature-gated areas</li>
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Clerk SignUp */}
        <div className="flex items-center justify-center p-8">
          <div className="w-full max-w-md">
            <SignedOut>
              <SignUp
                appearance={{ baseTheme: "dark" }}
                path="/test-clerk-signup"
                signInUrl="/test-clerk-login"
                afterSignUpUrl={`/test-clerk-verify?plan=${selectedPlan}`}
                routing="path"
                // Use layout to add policy links if you want them visible
                // layout={{ privacyUrl: "/privacy", termsUrl: "/terms" }}
              />
              <p className="mt-4 text-center text-sm text-gray-400">
                Already have an account?{" "}
                <Link href="/test-clerk-login" className="text-blue-400 hover:text-blue-300">
                  Log in
                </Link>
              </p>
            </SignedOut>

            <SignedIn>
              <div className="p-6 rounded-xl border border-gray-800 bg-gray-900 text-gray-100">
                You are already signed in as <b>{user?.primaryEmailAddress?.emailAddress}</b>.{" "}
                <Link href="/test-clerk-dashboard" className="text-blue-400 hover:text-blue-300">
                  Continue to dashboard
                </Link>
              </div>
            </SignedIn>
          </div>
        </div>
      </div>
    </div>
  );
}

function Header() {
  return (
    <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border-b border-blue-500/20">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold text-gray-100">Create your NestEgg</h1>
        </div>
        <Link href="/login" className="flex items-center text-blue-400 hover:text-blue-300">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to regular login
        </Link>
      </div>
    </div>
  );
}
