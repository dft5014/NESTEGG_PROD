// pages/signup.js
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Shield, TrendingUp, BarChart3, Bell, Lock, Globe,
  ChevronRight, Check, Star, Zap, Eye, EyeOff,
  ArrowRight, Users, Award, DollarSign, Chrome,
  Building, ShieldCheck, RefreshCw, TrendingDown,
  Clock, Target, Activity, Fingerprint, Sparkles,
  Gift, Rocket, CreditCard, PieChart, UserPlus,
  AlertCircle, CheckCircle, Timer, Trophy
} from 'lucide-react';

// Clerk
import {
  useAuth,
  useUser,
  SignUp
} from "@clerk/nextjs";
import {
  SubscriptionDetailsButton,
  useSubscription
} from "@clerk/nextjs/experimental";

const API_BASE = process.env.NEXT_PUBLIC_API_URL;

// Helper: Exchange Clerk token -> NestEgg JWT
async function exchangeToken(getToken) {
  const cJwt = await getToken?.();
  console.groupCollapsed("[Signup/Clerk] Exchange");
  console.log("hasClerkToken:", !!cJwt, "len:", cJwt?.length);
  if (!cJwt) throw new Error("No Clerk token");
  const res = await fetch(`${API_BASE}/auth/exchange`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ clerk_jwt: cJwt }),
  });
  console.log("exchange.status:", res.status);
  const txt = await res.text();
  console.log("exchange.body:", txt);
  if (!res.ok) throw new Error(`[Exchange] ${res.status} ${txt}`);
  const data = JSON.parse(txt);
  localStorage.setItem("token", data.access_token);
  console.log("[Signup/Clerk] Exchange OK, user_id:", data.user_id);
  console.groupEnd();
  return data;
}

// Post-signup: prompt for plan via Clerk's Subscription drawer
function ClerkPostSignupPlanPicker() {
  const { getToken } = useAuth();
  const { user } = useUser();
  const { data: subscription, isLoaded } = useSubscription();

  useEffect(() => {
    console.groupCollapsed("[Signup/Clerk] PlanPicker boot");
    console.log("user.id:", user?.id, "isLoaded(subscription):", isLoaded, "sub:", subscription);
    console.groupEnd();
  }, [user?.id, isLoaded, subscription]);

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700 mt-6">
      <h3 className="text-lg font-semibold text-white mb-2">Choose your plan</h3>
      <p className="text-sm text-gray-400 mb-4">
        You can upgrade or manage billing at any time. Picking a plan here immediately syncs to your NestEgg account.
      </p>
      <div className="flex gap-3">
        <SubscriptionDetailsButton
          onClick={async () => {
            console.log("[Signup/Clerk] SubscriptionDetailsButton clicked");
          }}
          onReady={() => console.log("[Signup/Clerk] SubscriptionDetailsButton ready")}
          onClose={async () => {
            // After drawer closes, re-exchange token to grab the (possibly) new plan via webhook sync.
            try {
              console.log("[Signup/Clerk] Subscription drawer closed – re-exchange token to refresh local JWT");
              await exchangeToken(getToken);
            } catch (e) {
              console.warn("[Signup/Clerk] re-exchange failed", e);
            }
          }}
        >
          <button className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white">
            Open Subscription Details
          </button>
        </SubscriptionDetailsButton>
      </div>
      <div className="text-xs text-gray-500 mt-3">
        Changes are handled by Clerk Billing and synced to Supabase via our webhook.
      </div>
    </div>
  );
}

const SignupContent = () => {
    const [systemStatus, setSystemStatus] = useState({
        status: 'checking',
        message: 'Checking system status...'
    });
    
    // Animated stats
    const [stats, setStats] = useState({
        avgSavings: 0,
        timeToSetup: 0,
        userSatisfaction: 0
    });

    useEffect(() => {
        // Animate stats on mount
        const timer = setTimeout(() => {
            setStats({
                avgSavings: 47,
                timeToSetup: 5,
                userSatisfaction: 98
            });
        }, 500);

        return () => clearTimeout(timer);
    }, []);

    // Check system status on load
    useEffect(() => {
        const checkStatus = async () => {
            try {
                const response = await fetch(`${API_BASE}/`);
                
                if (response.ok) {
                    setSystemStatus({
                        status: 'online',
                        message: 'All systems operational'
                    });
                } else {
                    setSystemStatus({
                        status: 'degraded',
                        message: 'System is operating with limited functionality'
                    });
                }
            } catch (error) {
                setSystemStatus({
                    status: 'offline',
                    message: 'Free tier may be inactive. System will be available shortly.'
                });
            }
        };
        
        checkStatus();
    }, []);

    const benefits = [
        {
            icon: <Rocket className="h-6 w-6" />,
            title: "Get Started in Minutes",
            description: "No bank connections needed—just add your positions"
        },
        {
            icon: <Trophy className="h-6 w-6" />,
            title: "Join 10,000+ Investors",
            description: "Trusted by thousands to track over $2.8B in assets"
        },
        {
            icon: <Gift className="h-6 w-6" />,
            title: "Free Forever Core Features",
            description: "Track unlimited accounts and positions at no cost"
        }
    ];

    const setupSteps = [
        {
            number: "1",
            title: "Create Your Account",
            description: "Sign up in under 60 seconds",
            icon: <UserPlus className="h-5 w-5" />
        },
        {
            number: "2",
            title: "Add Your Accounts",
            description: "Input your investment accounts manually",
            icon: <CreditCard className="h-5 w-5" />
        },
        {
            number: "3",
            title: "Track Everything",
            description: "See your complete financial picture",
            icon: <PieChart className="h-5 w-5" />
        }
    ];

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
            <div className="flex flex-col lg:flex-row min-h-screen">
                {/* Left Side - Value Proposition */}
                <div className="lg:w-1/2 xl:w-3/5 relative overflow-hidden">
                    {/* Background Pattern */}
                    <div className="absolute inset-0 opacity-10">
                        <div className="absolute top-20 left-20 w-96 h-96 bg-purple-500 rounded-full filter blur-3xl"></div>
                        <div className="absolute bottom-20 right-20 w-96 h-96 bg-blue-500 rounded-full filter blur-3xl"></div>
                    </div>

                    <div className="relative z-10 p-8 lg:p-12 xl:p-16">
                        {/* Logo */}
                        <motion.div 
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex items-center space-x-3 mb-8"
                        >
                            <div className="relative">
                                <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center shadow-lg">
                                    <div className="w-8 h-8 bg-white rounded-full"></div>
                                </div>
                                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-400 rounded-full animate-pulse"></div>
                            </div>
                            <h1 className="text-3xl font-bold text-white">NestEgg</h1>
                        </motion.div>

                        {/* Main Headline */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.2 }}
                            className="mb-12"
                        >
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

                        {/* Key Stats */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                            className="grid grid-cols-3 gap-6 mb-12"
                        >
                            <div className="text-center">
                                <div className="text-3xl lg:text-4xl font-bold text-white mb-1">
                                    {stats.avgSavings}%
                                </div>
                                <p className="text-sm text-gray-400">Avg. portfolio growth</p>
                                <p className="text-xs text-gray-500">vs. untracked</p>
                            </div>
                            <div className="text-center">
                                <div className="text-3xl lg:text-4xl font-bold text-white mb-1">
                                    {stats.timeToSetup}
                                </div>
                                <p className="text-sm text-gray-400">Minutes to setup</p>
                                <p className="text-xs text-gray-500">on average</p>
                            </div>
                            <div className="text-center">
                                <div className="text-3xl lg:text-4xl font-bold text-white mb-1">
                                    {stats.userSatisfaction}%
                                </div>
                                <p className="text-sm text-gray-400">User satisfaction</p>
                                <p className="text-xs text-gray-500">5-star reviews</p>
                            </div>
                        </motion.div>

                        {/* Setup Steps */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.4 }}
                            className="mb-12"
                        >
                            <h3 className="text-xl font-semibold text-white mb-6">
                                Your journey to financial clarity in 3 simple steps
                            </h3>
                            <div className="space-y-4">
                                {setupSteps.map((step, index) => (
                                    <motion.div
                                        key={index}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: 0.5 + (index * 0.1) }}
                                        className="flex items-start space-x-4"
                                    >
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

                        {/* Benefits */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.6 }}
                            className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12"
                        >
                            {benefits.map((benefit, index) => (
                                <div
                                    key={index}
                                    className="bg-white/5 backdrop-blur-sm rounded-lg p-4 border border-white/10"
                                >
                                    <div className="text-blue-400 mb-2">{benefit.icon}</div>
                                    <h3 className="text-white font-semibold text-sm mb-1">{benefit.title}</h3>
                                    <p className="text-gray-400 text-xs">{benefit.description}</p>
                                </div>
                            ))}
                        </motion.div>

                        {/* Social Proof */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.7 }}
                            className="bg-white/5 backdrop-blur-sm rounded-lg p-6 border border-white/10"
                        >
                            <div className="flex items-center space-x-4 mb-4">
                                <div className="flex -space-x-2">
                                    {[...Array(4)].map((_, i) => (
                                        <div
                                            key={i}
                                            className="w-10 h-10 bg-gradient-to-br from-blue-400 to-purple-400 rounded-full border-2 border-gray-800"
                                        />
                                    ))}
                                </div>
                                <div>
                                    <p className="text-white font-semibold">Join 10,000+ investors</p>
                                    <p className="text-gray-400 text-sm">who trust NestEgg daily</p>
                                </div>
                            </div>
                            <div className="flex items-center space-x-1 mb-2">
                                {[...Array(5)].map((_, i) => (
                                    <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                                ))}
                                <span className="text-white font-semibold ml-2">4.9</span>
                                <span className="text-gray-400 text-sm">(2,847 reviews)</span>
                            </div>
                            <p className="text-gray-300 text-sm italic">
                                "The privacy-first approach sold me instantly. Finally, a tracker that doesn't need my bank passwords!"
                            </p>
                            <p className="text-gray-400 text-xs mt-2">- Alex K., verified user</p>
                        </motion.div>
                    </div>
                </div>

                {/* Right Side - Signup Form */}
                <div className="lg:w-1/2 xl:w-2/5 flex items-center justify-center p-8 lg:sticky lg:top-0 lg:h-screen">
                    <motion.div 
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="w-full max-w-md"
                    >
                        {/* Mobile Logo */}
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

                        {/* Signup Form */}
                        <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-8 shadow-2xl border border-gray-700">
                            <div className="text-center mb-6">
                                <h2 className="text-2xl font-bold text-white mb-2">
                                    Create your free account
                                </h2>
                                <p className="text-gray-400">
                                    No credit card required • Setup in 60 seconds
                                </p>
                            </div>

                            {/* Special Offer Banner */}
                            <motion.div
                                initial={{ scale: 0.95 }}
                                animate={{ scale: 1 }}
                                className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-500/50 rounded-lg p-3 mb-6"
                            >
                                <div className="flex items-center">
                                    <Sparkles className="h-5 w-5 text-yellow-400 mr-2" />
                                    <span className="text-white text-sm font-medium">
                                        Limited Time: Get premium features free for 3 months!
                                    </span>
                                </div>
                            </motion.div>

                            {/* Clerk SignUp Component */}
                            <SignUp
                                appearance={{ baseTheme: "dark" }}
                                signInUrl="/login"
                                afterSignUpUrl="/signup?clerkComplete=1"
                            />

                            <p className="mt-6 text-center text-sm text-gray-400">
                                Already have an account?{' '}
                                <Link href="/login" className="text-blue-400 hover:text-blue-300 font-medium transition-colors">
                                    Sign in
                                </Link>
                            </p>

                            {/* System Status */}
                            <div className="mt-6 flex items-center justify-center">
                                <div className={`flex items-center text-xs ${
                                    systemStatus.status === 'online' ? 'text-green-400' : 
                                    systemStatus.status === 'degraded' ? 'text-yellow-400' : 'text-gray-400'
                                }`}>
                                    <div className={`w-2 h-2 rounded-full mr-2 ${
                                        systemStatus.status === 'online' ? 'bg-green-400' : 
                                        systemStatus.status === 'degraded' ? 'bg-yellow-400' : 'bg-gray-400'
                                    }`}></div>
                                    {systemStatus.message}
                                </div>
                            </div>
                        </div>

                        {/* Trust Badges */}
                        <div className="mt-8 flex items-center justify-center space-x-6 text-gray-500">
                            <div className="flex items-center space-x-2">
                                <Timer className="h-4 w-4" />
                                <span className="text-xs">60-second setup</span>
                            </div>
                            <div className="flex items-center space-x-2">
                                <Shield className="h-4 w-4" />
                                <span className="text-xs">Bank-level security</span>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </div>
        </div>
    );
};

function PageShell({ clerkComplete }) {
    const { isSignedIn, getToken } = useAuth();
    const { user, isLoaded } = useUser();

    // If redirected after Clerk sign-up, do an immediate token exchange, then offer plan picker
    useEffect(() => {
        (async () => {
            if (!clerkComplete || !isSignedIn || !getToken) return;
            console.groupCollapsed("[Signup/Clerk] post-signup");
            console.log("isSignedIn:", isSignedIn, "user.id:", user?.id, "clerkComplete:", clerkComplete);
            try {
                await exchangeToken(getToken);
            } catch (e) {
                console.warn("[Signup/Clerk] initial exchange failed", e);
            }
            console.groupEnd();
        })();
    }, [clerkComplete, isSignedIn, getToken, user?.id]);

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
            {/* Clerk content */}
            <SignupContent />

            {/* When we come back from Clerk sign-up, show plan chooser */}
            {clerkComplete && isSignedIn && isLoaded && (
                <div className="max-w-2xl mx-auto px-6 pb-12">
                    <ClerkPostSignupPlanPicker />
                </div>
            )}
        </div>
    );
}

export default function SignupPage() {
    const router = useRouter();
    const clerkComplete = router.query.clerkComplete === "1";

    return <PageShell clerkComplete={clerkComplete} />;
}