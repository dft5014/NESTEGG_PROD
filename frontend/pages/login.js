// pages/login.js
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Shield, TrendingUp, BarChart3, Bell, Lock, Globe,
  ChevronRight, Check, Star, Zap, Eye, EyeOff,
  Smartphone, CreditCard, PieChart, LineChart,
  ArrowRight, Users, Award, DollarSign, Chrome,
  Mail, Building, ShieldCheck, RefreshCw, TrendingDown,
  Clock, Target, Activity, Fingerprint
} from 'lucide-react';

// Clerk components
import { useAuth, useUser, SignIn } from "@clerk/nextjs";

const API_BASE = process.env.NEXT_PUBLIC_API_URL;

async function exchangeToken(getToken) {
  const cJwt = await getToken?.();
  console.groupCollapsed("[Login/Clerk] Exchange");
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
  console.log("[Login/Clerk] Exchange OK, user_id:", data.user_id);
  console.groupEnd();
  return data;
}

function LoginContent() {
    const [systemStatus, setSystemStatus] = useState({
        status: 'checking',
        message: 'Checking system status...'
    });
    
    // Animated stats
    const [stats, setStats] = useState({
        portfolioValue: 0,
        users: 0,
        assets: 0,
        timeToUpdate: 0
    });
    
    const [activeTestimonial, setActiveTestimonial] = useState(0);

    useEffect(() => {
        // Animate stats on mount
        const timer = setTimeout(() => {
            setStats({
                portfolioValue: 2.8,
                users: 10000,
                assets: 250000,
                timeToUpdate: 20
            });
        }, 500);

        // Rotate testimonials
        const testimonialInterval = setInterval(() => {
            setActiveTestimonial((prev) => (prev + 1) % testimonials.length);
        }, 5000);

        return () => {
            clearTimeout(timer);
            clearInterval(testimonialInterval);
        };
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

    const testimonials = [
        {
            name: "Sarah Johnson",
            role: "Individual Investor",
            content: "NestEgg transformed how I track my investments. The unified dashboard is a game-changer.",
            rating: 5
        },
        {
            name: "Michael Chen",
            role: "Retirement Planner",
            content: "Finally, a tool that shows me everything in one place. Worth every penny.",
            rating: 5
        },
        {
            name: "Emma Williams",
            role: "Small Business Owner",
            content: "The manual entry system means I never worry about sharing my bank credentials. Brilliant!",
            rating: 5
        }
    ];

    const whyNestEggReasons = [
        {
            icon: <Fingerprint className="h-8 w-8" />,
            title: "Your Security, Your Control",
            subtitle: "No bank logins required",
            description: "Unlike other apps that demand your banking credentials, NestEgg works with manual entry. Your sensitive login information stays with you—where it belongs.",
            highlight: "Zero credential sharing"
        },
        {
            icon: <Clock className="h-8 w-8" />,
            title: "Just 20 Minutes Monthly",
            subtitle: "Effortless reconciliation",
            description: "Our streamlined reconciliation process takes just 20 minutes per month. Update your positions, verify your balances, and you're done—no constant syncing or connection issues.",
            highlight: "5x faster than traditional apps"
        },
        {
            icon: <Target className="h-8 w-8" />,
            title: "See Your Complete Picture",
            subtitle: "Intuitive unified dashboards",
            description: "Finally understand your true financial health with dashboards that bring together all your assets—from stocks to real estate—in one beautiful, actionable view.",
            highlight: "100% portfolio visibility"
        },
        {
            icon: <Activity className="h-8 w-8" />,
            title: "Track Your Journey Daily",
            subtitle: "Historical position tracking",
            description: "Watch your net worth evolve with daily snapshots. Understand your portfolio's volatility and ensure you're on track for retirement with confidence.",
            highlight: "365 days of insights"
        }
    ];

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
            {/* Main Content - Scrollable */}
            <div className="flex flex-col lg:flex-row min-h-screen">
                {/* Left Side - Features & Branding */}
                <div className="lg:w-1/2 xl:w-3/5 relative overflow-hidden">
                    {/* Background Pattern */}
                    <div className="absolute inset-0 opacity-10">
                        <div className="absolute top-0 left-0 w-96 h-96 bg-blue-500 rounded-full filter blur-3xl"></div>
                        <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-500 rounded-full filter blur-3xl"></div>
                    </div>

                    <div className="relative z-10 p-8 lg:p-12 xl:p-16">
                        {/* Logo and Tagline */}
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
                        
                        <motion.h2 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.2 }}
                            className="text-3xl lg:text-4xl xl:text-5xl font-bold text-white mb-4"
                        >
                            Invest Smarter.<br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
                                Sleep Better.
                            </span>
                        </motion.h2>
                        
                        <motion.p 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.3 }}
                            className="text-lg lg:text-xl text-gray-300 mb-12"
                        >
                            The only investment tracker that respects your privacy while giving you complete control over your financial future.
                        </motion.p>

                        {/* Live Stats */}
                        <motion.div 
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.4 }}
                            className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-12"
                        >
                            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                                <p className="text-gray-400 text-sm mb-1">Total Tracked</p>
                                <p className="text-xl lg:text-2xl font-bold text-white">
                                    ${stats.portfolioValue.toFixed(1)}B
                                </p>
                            </div>
                            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                                <p className="text-gray-400 text-sm mb-1">Active Users</p>
                                <p className="text-xl lg:text-2xl font-bold text-white">
                                    {stats.users.toLocaleString()}+
                                </p>
                            </div>
                            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                                <p className="text-gray-400 text-sm mb-1">Update Time</p>
                                <p className="text-xl lg:text-2xl font-bold text-white">
                                    {stats.timeToUpdate} min
                                </p>
                            </div>
                            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                                <p className="text-gray-400 text-sm mb-1">Privacy Score</p>
                                <p className="text-xl lg:text-2xl font-bold text-white">
                                    100%
                                </p>
                            </div>
                        </motion.div>

                        {/* Why NestEgg Section - New */}
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.5 }}
                            className="mb-12"
                        >
                            <h3 className="text-2xl font-bold text-white mb-8 flex items-center">
                                <ShieldCheck className="h-6 w-6 mr-2 text-green-400" />
                                Why Smart Investors Choose NestEgg
                            </h3>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {whyNestEggReasons.map((reason, index) => (
                                    <motion.div
                                        key={index}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: 0.6 + (index * 0.1) }}
                                        className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10 hover:bg-white/10 transition-all hover:scale-[1.02]"
                                    >
                                        <div className="flex items-start space-x-4">
                                            <div className={`
                                                p-3 rounded-lg bg-gradient-to-br 
                                                ${index === 0 ? 'from-purple-500/20 to-pink-500/20 text-purple-400' : 
                                                  index === 1 ? 'from-blue-500/20 to-cyan-500/20 text-blue-400' :
                                                  index === 2 ? 'from-emerald-500/20 to-green-500/20 text-emerald-400' :
                                                  'from-amber-500/20 to-orange-500/20 text-amber-400'}
                                            `}>
                                                {reason.icon}
                                            </div>
                                            <div className="flex-1">
                                                <h4 className="text-lg font-semibold text-white mb-1">
                                                    {reason.title}
                                                </h4>
                                                <p className="text-sm text-gray-400 mb-2">
                                                    {reason.subtitle}
                                                </p>
                                                <p className="text-sm text-gray-300 mb-3">
                                                    {reason.description}
                                                </p>
                                                <div className="inline-flex items-center px-3 py-1 bg-white/10 rounded-full">
                                                    <Zap className="h-3 w-3 mr-1 text-yellow-400" />
                                                    <span className="text-xs font-medium text-white">
                                                        {reason.highlight}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </motion.div>

                        {/* Testimonial Carousel */}
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.8 }}
                            className="bg-white/5 backdrop-blur-sm rounded-lg p-6 border border-white/10"
                        >
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={activeTestimonial}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    transition={{ duration: 0.3 }}
                                >
                                    <div className="flex mb-2">
                                        {[...Array(5)].map((_, i) => (
                                            <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                                        ))}
                                    </div>
                                    <p className="text-gray-300 mb-3 italic">
                                        "{testimonials[activeTestimonial].content}"
                                    </p>
                                    <div className="flex items-center">
                                        <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-purple-400 rounded-full mr-3"></div>
                                        <div>
                                            <p className="text-white font-semibold text-sm">{testimonials[activeTestimonial].name}</p>
                                            <p className="text-gray-400 text-xs">{testimonials[activeTestimonial].role}</p>
                                        </div>
                                    </div>
                                </motion.div>
                            </AnimatePresence>
                            
                            {/* Testimonial indicators */}
                            <div className="flex space-x-2 mt-4">
                                {testimonials.map((_, index) => (
                                    <button
                                        key={index}
                                        onClick={() => setActiveTestimonial(index)}
                                        className={`h-1.5 rounded-full transition-all ${
                                            index === activeTestimonial 
                                                ? 'w-8 bg-blue-400' 
                                                : 'w-1.5 bg-gray-600 hover:bg-gray-500'
                                        }`}
                                    />
                                ))}
                            </div>
                        </motion.div>

                        {/* Bottom CTA for desktop */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 1 }}
                            className="hidden lg:block mt-12"
                        >
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
                            <p className="text-gray-400">Your Complete Investment Tracker</p>
                        </div>

                        {/* Clerk Login Form */}
                        <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-8 shadow-2xl border border-gray-700">
                            <h2 className="text-2xl font-bold text-white mb-2">
                                Welcome back
                            </h2>
                            <p className="text-gray-400 mb-6">
                                Sign in to access your portfolio
                            </p>

                            {/* Clerk SignIn Component */}
                            <SignIn
                                appearance={{ baseTheme: "dark" }}
                                signUpUrl="/signup"
                                afterSignInUrl="/login?clerkSignedIn=1"
                            />

                            <p className="mt-6 text-center text-sm text-gray-400">
                                Don't have an account?{' '}
                                <Link href="/signup" className="text-blue-400 hover:text-blue-300 font-medium transition-colors">
                                    Sign up for free
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
                                <Shield className="h-4 w-4" />
                                <span className="text-xs">Bank-level security</span>
                            </div>
                            <div className="flex items-center space-x-2">
                                <Lock className="h-4 w-4" />
                                <span className="text-xs">SSL encrypted</span>
                            </div>
                        </div>

                        {/* Footer */}
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

function PageShell() {
    const router = useRouter();
    const clerkSignedIn = router.query.clerkSignedIn === "1";
    const { isSignedIn, getToken } = useAuth();
    const { user } = useUser();

    // After Clerk sign-in, immediately exchange token for NestEgg JWT
    useEffect(() => {
        (async () => {
            if (!clerkSignedIn || !isSignedIn || !getToken) return;
            console.groupCollapsed("[Login/Clerk] post-signin");
            console.log("isSignedIn:", isSignedIn, "user.id:", user?.id, "clerkSignedIn:", clerkSignedIn);
            try {
                const data = await exchangeToken(getToken);
                console.log("[Login/Clerk] JWT stored; redirect -> /portfolio");
                // optional: decide target based on plan/features etc.
                window.location.replace("/portfolio");
            } catch (e) {
                console.warn("[Login/Clerk] exchange failed", e);
            }
            console.groupEnd();
        })();
    }, [clerkSignedIn, isSignedIn, getToken, user?.id]);

    return <LoginContent />;
}

export default function LoginPage() {
    return <PageShell />;
}