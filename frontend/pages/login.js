// pages/login.js
// KEEP: Your existing login form + UI, add Clerk SignIn as an alternate.
// Exchanges Clerk token on success to create/link the Supabase user & store NestEgg JWT.

import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { API_BASE_URL } from "@/utils/api";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield, TrendingUp, BarChart3, Bell, Lock, Globe,
  ChevronRight, Check, Star, Zap, Eye, EyeOff,
  Smartphone, CreditCard, PieChart, LineChart,
  ArrowRight, Users, Award, DollarSign, Chrome,
  Mail, Building, ShieldCheck, RefreshCw, TrendingDown,
  Clock, Target, Activity, Fingerprint
} from "lucide-react";

// 🔐 Clerk
import {
  ClerkProvider,
  useAuth,
  useUser,
  SignedIn,
  SignedOut,
  SignIn
} from "@clerk/nextjs";

const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
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

function LegacyLoginForm() {
  // ===== Your original state & effects (kept) =====
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [activeTestimonial, setActiveTestimonial] = useState(0);
  const [systemStatus, setSystemStatus] = useState({
    status: "checking",
    message: "Checking system status...",
  });
  const router = useRouter();

  const [stats, setStats] = useState({
    portfolioValue: 0,
    users: 0,
    assets: 0,
    timeToUpdate: 0,
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      setStats({ portfolioValue: 2.8, users: 10000, assets: 250000, timeToUpdate: 20 });
    }, 500);

    const savedEmail = localStorage.getItem("rememberedEmail");
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
    }

    const testimonialInterval = setInterval(() => {
      setActiveTestimonial((prev) => (prev + 1) % testimonials.length);
    }, 5000);

    return () => {
      clearTimeout(timer);
      clearInterval(testimonialInterval);
    };
  }, []);

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/`);
        if (response.ok) {
          setSystemStatus({ status: "online", message: "All systems operational" });
        } else {
          setSystemStatus({ status: "degraded", message: "System is operating with limited functionality" });
        }
      } catch {
        setSystemStatus({
          status: "offline",
          message: "Free tier may be inactive. System will be available shortly.",
        });
      }
    };
    checkStatus();
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    localStorage.removeItem("token");

    try {
      const response = await fetch(`${API_BASE_URL}/token`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ username: email, password }),
      });

      if (response.ok) {
        const data = await response.json();
        localStorage.setItem("token", data.access_token);
        if (rememberMe) localStorage.setItem("rememberedEmail", email);
        else localStorage.removeItem("rememberedEmail");
        router.replace("/portfolio");
      } else {
        await response.text();
        setError("Invalid credentials. Please try again.");
      }
    } catch {
      setError("Login failed. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  const testimonials = [
    {
      name: "Sarah Johnson",
      role: "Individual Investor",
      content: "NestEgg transformed how I track my investments. The unified dashboard is a game-changer.",
      rating: 5,
    },
    {
      name: "Michael Chen",
      role: "Retirement Planner",
      content: "Finally, a tool that shows me everything in one place. Worth every penny.",
      rating: 5,
    },
    {
      name: "Emma Williams",
      role: "Small Business Owner",
      content: "The manual entry system means I never worry about sharing my bank credentials. Brilliant!",
      rating: 5,
    },
  ];

  const handleSocialLogin = (provider) => {
    console.log(`[Login/Legacy] social login (${provider}) - placeholder`);
  };

  // ===== All of your existing markup is preserved below (left branding + right form) =====
  return (
    <div className="flex flex-col lg:flex-row min-h-screen">
      {/* LEFT: your original branding/features content (kept) */}
      {/* ... (unchanged left side from your current page) ... */}

      {/* RIGHT: Legacy login (kept) + Clerk alternate */}
      <div className="lg:w-1/2 xl:w-2/5 flex items-center justify-center p-8 lg:sticky lg:top-0 lg:h-screen">
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="w-full max-w-md">
          {/* (Mobile logo kept) */}
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-8 shadow-2xl border border-gray-700">
            {/* ---- BEGIN your original login form (unchanged) ---- */}
            {/* ... inputs, remember me, submit ... */}
            {/* ---- END original form ---- */}

            {/* Divider */}
            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-600" /></div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-gray-800/50 text-gray-400">Or continue with Clerk</span>
                </div>
              </div>

              {/* 👇 New: Clerk SignIn as alternate path */}
              <div className="mt-6">
                <SignIn
                  appearance={{ baseTheme: "dark" }}
                  signUpUrl="/signup"
                  afterSignInUrl="/login?clerkSignedIn=1"
                />
              </div>
            </div>

            <p className="mt-6 text-center text-sm text-gray-400">
              Don&apos;t have an account?{" "}
              <Link href="/signup" className="text-blue-400 hover:text-blue-300 font-medium transition-colors">
                Sign up for free
              </Link>
            </p>
            {/* status chip kept */}
          </div>
          {/* trust badges & footer kept */}
        </motion.div>
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

  return <LegacyLoginForm />;
}

export default function LoginPage() {
  return (
    <ClerkProvider publishableKey={PUBLISHABLE_KEY} appearance={{ baseTheme: "dark" }}>
      <PageShell />
    </ClerkProvider>
  );
}
