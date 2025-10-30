// pages/login.js
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Shield, ShieldCheck, Zap, Clock, Target, Activity, ArrowRight
} from 'lucide-react';

// Clerk components
import { useAuth, useUser, SignIn } from "@clerk/nextjs";

const API_BASE = process.env.NEXT_PUBLIC_API_URL;

// Duplicate local helper for simplicity; you can move this to a shared util.
async function exchangeToken(getToken) {
  const cJwt = await getToken?.();
  console.groupCollapsed("[Login/Clerk] Exchange");
  console.log("hasClerkToken:", !!cJwt, "len:", cJwt?.length);
  if (!cJwt) {
    console.groupEnd();
    throw new Error("No Clerk token");
  }
  const res = await fetch(`${API_BASE}/auth/exchange`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ clerk_jwt: cJwt }),
  });
  console.log("exchange.status:", res.status);
  const txt = await res.text();
  console.log("exchange.body:", txt);
  if (!res.ok) {
    console.groupEnd();
    throw new Error(`[Exchange] ${res.status} ${txt}`);
  }
  const data = JSON.parse(txt);
  localStorage.setItem("token", data.access_token);
  console.log("[Login/Clerk] Exchange OK, user_id:", data.user_id);
  console.groupEnd();
  return data;
}

function LoginContent() {
  const [systemStatus, setSystemStatus] = useState({
    status: 'checking',
    message: 'Checking system status...'
  });

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const response = await fetch(`${API_BASE}/`);
        if (response.ok) setSystemStatus({ status: 'online', message: 'All systems operational' });
        else setSystemStatus({ status: 'degraded', message: 'System is operating with limited functionality' });
      } catch {
        setSystemStatus({ status: 'offline', message: 'Free tier may be inactive. System will be available shortly.' });
      }
    };
    checkStatus();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <div className="flex flex-col lg:flex-row min-h-screen">
        {/* Left Side - Features & Branding */}
        <div className="lg:w-1/2 xl:w-3/5 relative overflow-hidden">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 left-0 w-96 h-96 bg-blue-500 rounded-full filter blur-3xl"></div>
            <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-500 rounded-full filter blur-3xl"></div>
          </div>

          <div className="relative z-10 p-8 lg:p-12 xl:p-16">
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center space-x-3 mb-8">
              <div className="relative">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center shadow-lg">
                  <div className="w-8 h-8 bg-white rounded-full"></div>
                </div>
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-400 rounded-full animate-pulse"></div>
              </div>
              <h1 className="text-3xl font-bold text-white">NestEgg</h1>
            </motion.div>

            <motion.h2 initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="text-3xl lg:text-4xl xl:text-5xl font-bold text-white mb-4">
              Invest Smarter.<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">Sleep Better.</span>
            </motion.h2>

            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="text-lg lg:text-xl text-gray-300 mb-12">
              The only investment tracker that respects your privacy while giving you complete control over your financial future.
            </motion.p>

            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="mb-12">
              <h3 className="text-2xl font-bold text-white mb-8 flex items-center">
                <ShieldCheck className="h-6 w-6 mr-2 text-green-400" />
                Why Smart Investors Choose NestEgg
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[
                  {
                    icon: <Activity className="h-8 w-8" />,
                    title: "Your Security, Your Control",
                    subtitle: "No bank logins required",
                    description: "Manual entry keeps your credentials private while still giving you rich analytics.",
                    highlight: "Zero credential sharing"
                  },
                  {
                    icon: <Clock className="h-8 w-8" />,
                    title: "Just 20 Minutes Monthly",
                    subtitle: "Effortless reconciliation",
                    description: "Update positions monthly. No flaky connections, no stress.",
                    highlight: "5x faster workflows"
                  },
                  {
                    icon: <Target className="h-8 w-8" />,
                    title: "See Your Complete Picture",
                    subtitle: "Unified dashboards",
                    description: "All assets in one place—from stocks to real estate.",
                    highlight: "100% visibility"
                  },
                  {
                    icon: <Shield className="h-8 w-8" />,
                    title: "Own Your Data",
                    subtitle: "Privacy-first design",
                    description: "Security and control are at the core of NestEgg.",
                    highlight: "Bank-level security"
                  }
                ].map((reason, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.6 + (index * 0.1) }}
                    className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10 hover:bg-white/10 transition-all hover:scale-[1.02]"
                  >
                    <div className="flex items-start space-x-4">
                      <div className="p-3 rounded-lg bg-gradient-to-br from-blue-500/20 to-purple-500/20 text-blue-300">
                        {reason.icon}
                      </div>
                      <div className="flex-1">
                        <h4 className="text-lg font-semibold text-white mb-1">{reason.title}</h4>
                        <p className="text-sm text-gray-400 mb-2">{reason.subtitle}</p>
                        <p className="text-sm text-gray-300 mb-3">{reason.description}</p>
                        <div className="inline-flex items-center px-3 py-1 bg-white/10 rounded-full">
                          <Zap className="h-3 w-3 mr-1 text-yellow-400" />
                          <span className="text-xs font-medium text-white">{reason.highlight}</span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }} className="hidden lg:block mt-12">
              <p className="text-gray-400 mb-4">Ready to take control of your financial future?</p>
              <button
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white font-semibold rounded-lg hover:from-blue-600 hover:to-purple-600 transition-all transform hover:scale-[1.02]"
              >
                Get Started Now
                <ArrowRight className="ml-2 h-5 w-5" />
              </button>
            </motion.div>
          </div>
        </div>

        {/* Right Side - Clerk Login Form */}
        <div className="lg:w-1/2 xl:w-2/5 flex items-center justify-center p-8 lg:sticky lg:top-0 lg:h-screen">
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="w-full max-w-md">
            <div className="lg:hidden mb-8 text-center">
              <div className="flex items-center justify-center space-x-3 mb-4">
                <div className="relative">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center shadow-lg">
                    <div className="w-8 h-8 bg-white rounded-full"></div>
                  </div>
                </div>
                <h1 className="text-3xl font-bold text-white">NestEgg</h1>
              </div>
              <p className="text-gray-400">Your Complete Investment Tracker</p>
            </div>

            <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-8 shadow-2xl border border-gray-700">
              <h2 className="text-2xl font-bold text-white mb-2">Welcome back</h2>
              <p className="text-gray-400 mb-6">Sign in to access your portfolio</p>

              {/* Clerk SignIn Component */}
              <SignIn
                appearance={{ baseTheme: "dark" }}
                routing="path"
                path="/login"
                signUpUrl="/signup"
                afterSignInUrl="/portfolio"
                fallbackRedirectUrl="/portfolio"
              />

              <p className="mt-6 text-center text-sm text-gray-400">
                Don't have an account?{' '}
                <Link href="/signup" className="text-blue-400 hover:text-blue-300 font-medium transition-colors">
                  Sign up for free
                </Link>
              </p>

              <SystemStatusBadge status={systemStatus} />
            </div>

            <div className="mt-8 flex items-center justify-center space-x-6 text-gray-500">
              <div className="flex items-center space-x-2">
                <Shield className="h-4 w-4" />
                <span className="text-xs">Bank-level security</span>
              </div>
              <div className="flex items-center space-x-2">
                <ShieldCheck className="h-4 w-4" />
                <span className="text-xs">SSL encrypted</span>
              </div>
            </div>

            <p className="mt-6 text-center text-xs text-gray-500">
              By signing in, you agree to our{' '}
              <a href="#" className="text-blue-400 hover:underline">Terms of Service</a>{' '}
              and{' '}
              <a href="#" className="text-blue-400 hover:underline">Privacy Policy</a>
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

function SystemStatusBadge({ status }) {
  return (
    <div className="mt-6 flex items-center justify-center">
      <div
        className={`flex items-center text-xs ${
          status.status === 'online'
            ? 'text-green-400'
            : status.status === 'degraded'
            ? 'text-yellow-400'
            : 'text-gray-400'
        }`}
      >
        <div
          className={`w-2 h-2 rounded-full mr-2 ${
            status.status === 'online'
              ? 'bg-green-400'
              : status.status === 'degraded'
              ? 'bg-yellow-400'
              : 'bg-gray-400'
          }`}
        />
        {status.message}
      </div>
    </div>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const { isSignedIn, getToken } = useAuth();
  const { isLoaded } = useUser();
  const exchangingRef = useRef(false);

  // If already signed in and you hit /login, exchange JWT then go to /portfolio
  useEffect(() => {
    const run = async () => {
      if (!isLoaded || !isSignedIn || exchangingRef.current) return;
      exchangingRef.current = true;
      try {
        await exchangeToken(getToken);
      } catch (e) {
        console.warn("[Login] exchange failed; redirecting anyway", e);
      } finally {
        router.replace('/portfolio');
      }
    };
    run();
  }, [isLoaded, isSignedIn, getToken, router]);

  return <LoginContent />;
}
