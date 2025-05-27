// pages/login.js
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { API_BASE_URL } from '@/utils/api';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Shield, TrendingUp, BarChart3, Bell, Lock, Globe,
  ChevronRight, Check, Star, Zap, Eye, EyeOff,
  Smartphone, CreditCard, PieChart, LineChart,
  ArrowRight, Users, Award, DollarSign, Chrome,
  Mail, Building
} from 'lucide-react';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);
    const [systemStatus, setSystemStatus] = useState({
        status: 'checking',
        message: 'Checking system status...'
    });
    const router = useRouter();

    // Animated stats
    const [stats, setStats] = useState({
        portfolioValue: 0,
        users: 0,
        assets: 0
    });

    useEffect(() => {
        // Animate stats on mount
        const timer = setTimeout(() => {
            setStats({
                portfolioValue: 2.8,
                users: 10000,
                assets: 250000
            });
        }, 500);

        // Check if user has saved credentials
        const savedEmail = localStorage.getItem('rememberedEmail');
        if (savedEmail) {
            setEmail(savedEmail);
            setRememberMe(true);
        }

        return () => clearTimeout(timer);
    }, []);

    // Check system status on load
    useEffect(() => {
        const checkStatus = async () => {
            try {
                const response = await fetch(`${API_BASE_URL}/`);
                
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

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        
        // Clear old token before logging in
        localStorage.removeItem('token');
        
        try {
            const response = await fetch(`${API_BASE_URL}/token`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({ username: email, password }),
            });

            if (response.ok) {
                const data = await response.json();
                
                // Store the new token
                localStorage.setItem('token', data.access_token);
                
                // Handle remember me
                if (rememberMe) {
                    localStorage.setItem('rememberedEmail', email);
                } else {
                    localStorage.removeItem('rememberedEmail');
                }
                
                router.replace('/portfolio');
            } else {
                const errorMsg = await response.text();
                setError('Invalid credentials. Please try again.');
            }
        } catch (error) {
            setError('Login failed. Please check your connection.');
        } finally {
            setLoading(false);
        }
    };

    const features = [
        {
            icon: <BarChart3 className="h-6 w-6" />,
            title: "Portfolio Analytics",
            description: "Real-time insights into your investment performance with advanced charting"
        },
        {
            icon: <Shield className="h-6 w-6" />,
            title: "Bank-Level Security",
            description: "Your data is encrypted and secured with industry-leading protection"
        },
        {
            icon: <Globe className="h-6 w-6" />,
            title: "Multi-Asset Support",
            description: "Track stocks, crypto, real estate, metals, and cash in one place"
        },
        {
            icon: <TrendingUp className="h-6 w-6" />,
            title: "Performance Tracking",
            description: "Monitor gains, losses, and portfolio growth over time"
        },
        {
            icon: <Bell className="h-6 w-6" />,
            title: "Smart Alerts",
            description: "Get notified about important portfolio changes and milestones"
        },
        {
            icon: <Users className="h-6 w-6" />,
            title: "Family Sharing",
            description: "Collaborate on financial goals with trusted family members"
        }
    ];

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
            content: "The multi-asset tracking feature helps me manage both personal and business investments.",
            rating: 5
        }
    ];

    // Placeholder for social login (non-functional for now)
    const handleSocialLogin = (provider) => {
        // Placeholder - would implement OAuth flow
        console.log(`Social login with ${provider} - Not implemented yet`);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex">
            {/* Left Side - Features & Branding */}
            <div className="hidden lg:flex lg:w-1/2 xl:w-3/5 relative overflow-hidden">
                {/* Background Pattern */}
                <div className="absolute inset-0 opacity-10">
                    <div className="absolute top-0 left-0 w-96 h-96 bg-blue-500 rounded-full filter blur-3xl"></div>
                    <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-500 rounded-full filter blur-3xl"></div>
                </div>

                <div className="relative z-10 flex flex-col justify-between p-12 xl:p-16">
                    {/* Logo and Tagline */}
                    <div>
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
                            className="text-4xl xl:text-5xl font-bold text-white mb-4"
                        >
                            Your Complete<br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
                                Investment Tracker
                            </span>
                        </motion.h2>
                        
                        <motion.p 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.3 }}
                            className="text-xl text-gray-300 mb-12"
                        >
                            Manage all your investments in one secure place. Track performance, 
                            analyze trends, and grow your wealth with confidence.
                        </motion.p>

                        {/* Live Stats */}
                        <motion.div 
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.4 }}
                            className="grid grid-cols-3 gap-6 mb-12"
                        >
                            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                                <p className="text-gray-400 text-sm mb-1">Total Tracked</p>
                                <p className="text-2xl font-bold text-white">
                                    ${stats.portfolioValue.toFixed(1)}B
                                </p>
                            </div>
                            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                                <p className="text-gray-400 text-sm mb-1">Active Users</p>
                                <p className="text-2xl font-bold text-white">
                                    {stats.users.toLocaleString()}+
                                </p>
                            </div>
                            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                                <p className="text-gray-400 text-sm mb-1">Assets Tracked</p>
                                <p className="text-2xl font-bold text-white">
                                    {stats.assets.toLocaleString()}+
                                </p>
                            </div>
                        </motion.div>
                    </div>

                    {/* Features Grid */}
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.5 }}
                        className="grid grid-cols-2 gap-4 mb-12"
                    >
                        {features.slice(0, 4).map((feature, index) => (
                            <div 
                                key={index}
                                className="bg-white/5 backdrop-blur-sm rounded-lg p-4 border border-white/10 hover:bg-white/10 transition-colors"
                            >
                                <div className="text-blue-400 mb-2">{feature.icon}</div>
                                <h3 className="text-white font-semibold mb-1">{feature.title}</h3>
                                <p className="text-gray-400 text-sm">{feature.description}</p>
                            </div>
                        ))}
                    </motion.div>

                    {/* Testimonial */}
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.6 }}
                        className="bg-white/5 backdrop-blur-sm rounded-lg p-6 border border-white/10"
                    >
                        <div className="flex mb-2">
                            {[...Array(5)].map((_, i) => (
                                <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                            ))}
                        </div>
                        <p className="text-gray-300 mb-3 italic">
                            "{testimonials[0].content}"
                        </p>
                        <div className="flex items-center">
                            <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-purple-400 rounded-full mr-3"></div>
                            <div>
                                <p className="text-white font-semibold text-sm">{testimonials[0].name}</p>
                                <p className="text-gray-400 text-xs">{testimonials[0].role}</p>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </div>

            {/* Right Side - Login Form */}
            <div className="w-full lg:w-1/2 xl:w-2/5 flex items-center justify-center p-8">
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

                    {/* Login Form */}
                    <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-8 shadow-2xl border border-gray-700">
                        <h2 className="text-2xl font-bold text-white mb-2">
                            Welcome back
                        </h2>
                        <p className="text-gray-400 mb-6">
                            Sign in to access your portfolio
                        </p>

                        {error && (
                            <motion.div 
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg mb-4 flex items-center"
                            >
                                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                {error}
                            </motion.div>
                        )}

                        <form onSubmit={handleLogin} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    Email Address
                                </label>
                                <div className="relative">
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                        className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-colors"
                                        placeholder="you@example.com"
                                    />
                                </div>
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    Password
                                </label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                        className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-colors pr-12"
                                        placeholder="••••••••"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                                    >
                                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                    </button>
                                </div>
                            </div>

                            <div className="flex items-center justify-between">
                                <label className="flex items-center">
                                    <input
                                        type="checkbox"
                                        checked={rememberMe}
                                        onChange={(e) => setRememberMe(e.target.checked)}
                                        className="w-4 h-4 bg-gray-700 border-gray-600 rounded text-blue-500 focus:ring-blue-500/20"
                                    />
                                    <span className="ml-2 text-sm text-gray-300">Remember me</span>
                                </label>
                                
                                {/* Removed forgot password link - add back when page exists */}
                                {/* <Link href="/forgot-password" className="text-sm text-blue-400 hover:text-blue-300 transition-colors">
                                    Forgot password?
                                </Link> */}
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-3 px-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold rounded-lg hover:from-blue-600 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-[1.02]"
                            >
                                {loading ? (
                                    <span className="flex items-center justify-center">
                                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Signing in...
                                    </span>
                                ) : (
                                    <span className="flex items-center justify-center">
                                        Sign in
                                        <ArrowRight className="ml-2 h-5 w-5" />
                                    </span>
                                )}
                            </button>
                        </form>

                        <div className="mt-6">
                            <div className="relative">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t border-gray-600"></div>
                                </div>
                                <div className="relative flex justify-center text-sm">
                                    <span className="px-2 bg-gray-800/50 text-gray-400">Or continue with</span>
                                </div>
                            </div>

                            <div className="mt-6 grid grid-cols-3 gap-3">
                                <button 
                                    onClick={() => handleSocialLogin('google')}
                                    className="flex items-center justify-center py-2.5 px-4 bg-gray-700/50 border border-gray-600 rounded-lg hover:bg-gray-700 transition-colors group"
                                >
                                    <Chrome className="h-5 w-5 text-gray-400 group-hover:text-white transition-colors" />
                                </button>
                                <button 
                                    onClick={() => handleSocialLogin('apple')}
                                    className="flex items-center justify-center py-2.5 px-4 bg-gray-700/50 border border-gray-600 rounded-lg hover:bg-gray-700 transition-colors group"
                                >
                                    <svg className="h-5 w-5 text-gray-400 group-hover:text-white transition-colors" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                                    </svg>
                                </button>
                                <button 
                                    onClick={() => handleSocialLogin('microsoft')}
                                    className="flex items-center justify-center py-2.5 px-4 bg-gray-700/50 border border-gray-600 rounded-lg hover:bg-gray-700 transition-colors group"
                                >
                                    <Building className="h-5 w-5 text-gray-400 group-hover:text-white transition-colors" />
                                </button>
                            </div>
                        </div>

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
    );
};

export default Login;