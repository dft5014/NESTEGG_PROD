// pages/signup/[[...index]].js
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Shield, Sparkles, Timer, UserPlus, CreditCard, PieChart, Rocket
} from 'lucide-react';

// Clerk
import {
  useAuth,
  useUser,
  SignUp
} from "@clerk/nextjs";

const API_BASE = process.env.NEXT_PUBLIC_API_URL;

// Helper: Exchange Clerk token -> NestEgg JWT
async function exchangeToken(getToken) {
  const cJwt = await getToken?.();
  console.groupCollapsed("[Signup/Clerk] Exchange");
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
  console.log("[Signup/Clerk] Exchange OK, user_id:", data.user_id);
  console.groupEnd();
  return data;
}

const SignupContent = () => {
  const [systemStatus, setSystemStatus] = useState({
    status: 'checking',
    message: 'Checking system status...'
  });

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const response = await fetch(`${API_BASE}/`);
        if (response.ok) {
          setSystemStatus({ status: 'online', message: 'All systems operational' });
        } else {
          setSystemStatus({ status: 'degraded', message: 'System is operating with limited functionality' });
        }
      } catch {
        setSystemStatus({ status: 'offline', message: 'Free tier may be inactive. System will be available shortly.' });
      }
    };
    checkStatus();
  }, []);

  const benefits = [
    { icon: <Rocket className="h-6 w-6" />, title: "Get Started in Minutes", description: "No bank connections needed—just add your positions" },
    { icon: <Shield className="h-6 w-6" />, title: "Complete Privacy Protection", description: "Understand investment performance across all brokerage accounts without ever sharing a passcode or credential" },
    { icon: <Sparkles className="h-6 w-6" />, title: "Free Forever Core Features", description: "Track unlimited accounts and positions at no cost" }
  ];

  const setupSteps = [
    { number: "1", title: "Create Your Account", description: "Sign up in under 60 seconds", icon: <UserPlus className="h-5 w-5" /> },
    { number: "2", title: "Add Your Accounts", description: "Input your investment accounts manually", icon: <CreditCard className="h-5 w-5" /> },
    { number: "3", title: "Track Everything", description: "See your complete financial picture", icon: <PieChart className="h-5 w-5" /> }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <div className="flex flex-col lg:flex-row min-h-screen">
        {/* Left Side - Value Proposition */}
        <div className="lg:w-1/2 xl:w-3/5 relative overflow-hidden">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-20 left-20 w-96 h-96 bg-purple-500 rounded-full filter blur-3xl"></div>
            <div className="absolute bottom-20 right-20 w-96 h-96 bg-blue-500 rounded-full filter blur-3xl"></div>
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

            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="mb-12">
              <h2 className="text-3xl lg:text-4xl xl:text-5xl font-bold text-white mb-4">
                Start Building Your
                <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
                  Financial Freedom
                </span>
              </h2>
              <p className="text-lg lg:text-xl text-gray-300">
                Join thousands who've taken control of their investments without sharing a single bank password.
              </p>
            </motion.div>

            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="mb-12">
              <h3 className="text-xl font-semibold text-white mb-6">Your journey to financial clarity in 3 simple steps</h3>
              <div className="space-y-4">
                {setupSteps.map((step, index) => (
                  <motion.div key={index} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 + (index * 0.1) }} className="flex items-start space-x-4">
                    <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold">
                      {step.number}
                    </div>
                    <div className="flex-1">
                      <h4 className="text-white font-semibold mb-1">{step.title}</h4>
                      <p className="text-gray-400 text-sm">{step.description}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }} className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
              {benefits.map((benefit, index) => (
                <div key={index} className="bg-white/5 backdrop-blur-sm rounded-lg p-4 border border-white/10">
                  <div className="text-blue-400 mb-2">{benefit.icon}</div>
                  <h3 className="text-white font-semibold text-sm mb-1">{benefit.title}</h3>
                  <p className="text-gray-400 text-xs">{benefit.description}</p>
                </div>
              ))}
            </motion.div>
          </div>
        </div>

        {/* Right Side - Signup Form */}
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
              <p className="text-gray-400">Start your journey to financial freedom</p>
            </div>

            <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-8 shadow-2xl border border-gray-700">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-white mb-2">Create your free account</h2>
                <p className="text-gray-400">Setup in 60 seconds</p>
              </div>

              <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-500/50 rounded-lg p-3 mb-6">
                <div className="flex items-center">
                  <Sparkles className="h-5 w-5 text-yellow-400 mr-2" />
                  <span className="text-white text-sm font-medium">
                    Limited Time: Get premium features free during free trial!
                  </span>
                </div>
              </motion.div>

              {/* Clerk SignUp Component - catch-all route handles multi-step flows */}
              <SignUp
                appearance={{ baseTheme: "dark" }}
                routing="path"
                path="/signup"
                signInUrl="/login"
                forceRedirectUrl="/portfolio?new=1"
              />

              <p className="mt-6 text-center text-sm text-gray-400">
                Already have an account?{' '}
                <Link href="/login" className="text-blue-400 hover:text-blue-300 font-medium transition-colors">
                  Sign in
                </Link>
              </p>

              {/* System Status */}
              <SystemStatusBadge status={systemStatus} />
            </div>

            <div className="mt-8 flex items-center justify-center space-x-6 text-gray-500">
              <div className="flex items-center space-x-2">
                <Timer className="h-4 w-4" />
                <span className="text-xs">60-second setup</span>
              </div>
              <div className="flex items-center space-x-2">
                <Shield className="h-4 w-4" />
                <span className="text-xs">No Credential Sharing Required</span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

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

export default function SignupPage() {
  const router = useRouter();
  const { isSignedIn, getToken } = useAuth();
  const { isLoaded } = useUser();
  const exchangingRef = useRef(false);

  // If already signed in and you hit /signup, exchange JWT then go to /portfolio
  useEffect(() => {
    const run = async () => {
      if (!isLoaded || !isSignedIn || exchangingRef.current) return;
      exchangingRef.current = true;
      console.groupCollapsed("[Signup] Post-signup flow");
      try {
        await exchangeToken(getToken);
      } catch (e) {
        console.warn("[Signup] exchange failed; proceeding to portfolio anyway", e);
      } finally {
        try { localStorage.setItem('justSignedUp', '1'); } catch {}
        console.log("[Signup] redirect -> /portfolio?new=1");
        console.groupEnd();
        router.replace('/portfolio?new=1');
      }
    };
    run();
  }, [isLoaded, isSignedIn, getToken, router]);

  return <SignupContent />;
}
