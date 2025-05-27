// pages/signup.js
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { API_BASE_URL } from '@/utils/api';
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

const Signup = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [passwordStrength, setPasswordStrength] = useState(0);
    const [agreedToTerms, setAgreedToTerms] = useState(false);
    const [systemStatus, setSystemStatus] = useState({
        status: 'checking',
        message: 'Checking system status...'
    });
    const router = useRouter();

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

    // Password strength checker
    useEffect(() => {
        if (!password) {
            setPasswordStrength(0);
            return;
        }
        
        let strength = 0;
        if (password.length >= 6) strength++;
        if (password.length >= 8) strength++;
        if (/[A-Z]/.test(password)) strength++;
        if (/[0-9]/.test(password)) strength++;
        if (/[^A-Za-z0-9]/.test(password)) strength++;
        
        setPasswordStrength(strength);
    }, [password]);

    const handleSignup = async (event) => {
        event.preventDefault();
        setError('');
        setLoading(true);
        
        // Validate inputs
        if (!email || !password) {
            setError("Email and password are required");
            setLoading(false);
            return;
        }
        
        if (password !== confirmPassword) {
            setError("Passwords do not match");
            setLoading(false);
            return;
        }
        
        if (password.length < 6) {
            setError("Password must be at least 6 characters");
            setLoading(false);
            return;
        }

        if (!agreedToTerms) {
            setError("Please agree to the Terms of Service and Privacy Policy");
            setLoading(false);
            return;
        }
      
        try {
            const response = await fetch(`${API_BASE_URL}/signup`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ 
                  email, 
                  password,
                  first_name: firstName,
                  last_name: lastName
                }),
            });
      
            const data = await response.json();
      
            if (!response.ok) {
                let errorMessage;
                if (typeof data.detail === 'object') {
                    errorMessage = JSON.stringify(data.detail);
                } else {
                    errorMessage = data.detail || "Sign-up failed";
                }
                throw new Error(errorMessage);
            }
      
            // Success - redirect to login with success message
            router.push("/login?signup=success");
        } catch (error) {
            console.error("Sign-up error:", error);
            setError(error.message || "Sign-up failed");
        } finally {
            setLoading(false);
        }
    };

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

    const getPasswordStrengthColor = () => {
        if (passwordStrength <= 1) return 'bg-red-500';
        if (passwordStrength <= 3) return 'bg-yellow-500';
        return 'bg-green-500';
    };

    const getPasswordStrengthText = () => {
        if (passwordStrength === 0) return '';
        if (passwordStrength <= 1) return 'Weak';
        if (passwordStrength <= 3) return 'Medium';
        return 'Strong';
    };

    // Placeholder for social signup
    const handleSocialSignup = (provider) => {
        console.log(`Social signup with ${provider} - Not implemented yet`);
    };

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

                            {error && (
                                <motion.div 
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg mb-4 flex items-center"
                                >
                                    <AlertCircle className="w-5 h-5 mr-2" />
                                    {error}
                                </motion.div>
                            )}

                            <form onSubmit={handleSignup} className="space-y-4">
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-300 mb-1">
                                            First Name
                                        </label>
                                        <input
                                            type="text"
                                            value={firstName}
                                            onChange={(e) => setFirstName(e.target.value)}
                                            className="w-full px-3 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-colors"
                                            placeholder="John"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-300 mb-1">
                                            Last Name
                                        </label>
                                        <input
                                            type="text"
                                            value={lastName}
                                            onChange={(e) => setLastName(e.target.value)}
                                            className="w-full px-3 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-colors"
                                            placeholder="Smith"
                                        />
                                    </div>
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1">
                                        Email Address
                                    </label>
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                        className="w-full px-4 py-2.5 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-colors"
                                        placeholder="you@example.com"
                                    />
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1">
                                        Password
                                    </label>
                                    <div className="relative">
                                        <input
                                            type={showPassword ? "text" : "password"}
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            required
                                            className="w-full px-4 py-2.5 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-colors pr-12"
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
                                    {password && (
                                        <div className="mt-2">
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="text-xs text-gray-400">Password strength</span>
                                                <span className={`text-xs font-medium ${
                                                    passwordStrength <= 1 ? 'text-red-400' :
                                                    passwordStrength <= 3 ? 'text-yellow-400' :
                                                    'text-green-400'
                                                }`}>
                                                    {getPasswordStrengthText()}
                                                </span>
                                            </div>
                                            <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
                                                <div 
                                                    className={`h-full transition-all ${getPasswordStrengthColor()}`}
                                                    style={{ width: `${(passwordStrength / 5) * 100}%` }}
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1">
                                        Confirm Password
                                    </label>
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        required
                                        className="w-full px-4 py-2.5 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-colors"
                                        placeholder="••••••••"
                                    />
                                </div>

                                <div className="flex items-start">
                                    <input
                                        type="checkbox"
                                        checked={agreedToTerms}
                                        onChange={(e) => setAgreedToTerms(e.target.checked)}
                                        className="w-4 h-4 bg-gray-700 border-gray-600 rounded text-blue-500 focus:ring-blue-500/20 mt-0.5"
                                    />
                                    <label className="ml-2 text-sm text-gray-300">
                                        I agree to the{' '}
                                        <a href="#" className="text-blue-400 hover:underline">Terms of Service</a>
                                        {' '}and{' '}
                                        <a href="#" className="text-blue-400 hover:underline">Privacy Policy</a>
                                    </label>
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading || !agreedToTerms}
                                    className="w-full py-3 px-4 bg-gradient-to-r from-blue-500 to-purple-500 text-white font-semibold rounded-lg hover:from-blue-600 hover:to-purple-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-[1.02]"
                                >
                                    {loading ? (
                                        <span className="flex items-center justify-center">
                                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            Creating your account...
                                        </span>
                                    ) : (
                                        <span className="flex items-center justify-center">
                                            Start tracking for free
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
                                        <span className="px-2 bg-gray-800/50 text-gray-400">Or sign up with</span>
                                    </div>
                                </div>

                                <div className="mt-6 grid grid-cols-3 gap-3">
                                    <button 
                                        onClick={() => handleSocialSignup('google')}
                                        className="flex items-center justify-center py-2.5 px-4 bg-gray-700/50 border border-gray-600 rounded-lg hover:bg-gray-700 transition-colors group"
                                    >
                                        <Chrome className="h-5 w-5 text-gray-400 group-hover:text-white transition-colors" />
                                    </button>
                                    <button 
                                        onClick={() => handleSocialSignup('apple')}
                                        className="flex items-center justify-center py-2.5 px-4 bg-gray-700/50 border border-gray-600 rounded-lg hover:bg-gray-700 transition-colors group"
                                    >
                                        <svg className="h-5 w-5 text-gray-400 group-hover:text-white transition-colors" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                                        </svg>
                                    </button>
                                    <button 
                                        onClick={() => handleSocialSignup('microsoft')}
                                        className="flex items-center justify-center py-2.5 px-4 bg-gray-700/50 border border-gray-600 rounded-lg hover:bg-gray-700 transition-colors group"
                                    >
                                        <Building className="h-5 w-5 text-gray-400 group-hover:text-white transition-colors" />
                                    </button>
                                </div>
                            </div>

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

export default Signup;