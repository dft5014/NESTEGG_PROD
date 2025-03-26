// pages/signup.js
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { API_BASE_URL } from '@/utils/api';
import { 
  PiggyBank, 
  UserPlus,
  AlertCircle,
  CheckCircle,
  Clock,
  Briefcase,
  ChartLine,
  Shield,
  Eye,
  EyeOff
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
    const [systemStatus, setSystemStatus] = useState({
        status: 'checking',
        message: 'Checking system status...'
    });
    const router = useRouter();

    // Check system status on load
    useEffect(() => {
        const checkStatus = async () => {
            try {
                const response = await fetch(`${API_BASE_URL}/`);
                
                if (response.ok) {
                    setSystemStatus({
                        status: 'online',
                        message: 'System is online and ready'
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
                // Properly handle error object
                let errorMessage;
                if (typeof data.detail === 'object') {
                    errorMessage = JSON.stringify(data.detail);
                } else {
                    errorMessage = data.detail || "Sign-up failed";
                }
                throw new Error(errorMessage);
            }
      
            alert("Sign-up successful! Please log in.");
            router.push("/login");
        } catch (error) {
            console.error("Sign-up error:", error);
            setError(error.message || "Sign-up failed");
        } finally {
            setLoading(false);
        }
    };

    // Render different status indicators based on system status
    const renderStatusIndicator = () => {
        switch (systemStatus.status) {
            case 'online':
                return (
                    <div className="flex items-center text-green-500 text-sm">
                        <CheckCircle className="w-4 h-4 mr-2" />
                        {systemStatus.message}
                    </div>
                );
            case 'degraded':
                return (
                    <div className="flex items-center text-yellow-500 text-sm">
                        <AlertCircle className="w-4 h-4 mr-2" />
                        {systemStatus.message}
                    </div>
                );
            case 'offline':
                return (
                    <div className="flex items-center text-orange-500 text-sm">
                        <Clock className="w-4 h-4 mr-2" />
                        {systemStatus.message}
                    </div>
                );
            default:
                return (
                    <div className="flex items-center text-blue-500 text-sm">
                        <Clock className="w-4 h-4 mr-2" />
                        {systemStatus.message}
                    </div>
                );
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 py-8 px-4">
            <div className="max-w-6xl mx-auto">
                <div className="grid md:grid-cols-2 gap-8">
                    {/* Left Column - App Information */}
                    <div className="bg-white p-8 rounded-xl shadow-md flex flex-col">
                        <div className="text-center mb-8">
                            <h1 className="text-4xl font-extrabold text-gray-900 mb-4 flex items-center justify-center gap-4">
                                <PiggyBank className="w-12 h-12 text-blue-600" />
                                NestEgg
                            </h1>
                            <p className="text-xl text-gray-600">
                                Your comprehensive retirement tracking solution
                            </p>
                        </div>

                        <div className="flex-grow">
                            <div className="bg-blue-50 p-6 rounded-xl mb-6">
                                <h2 className="text-xl font-bold text-blue-800 mb-3">Why Create a NestEgg Account?</h2>
                                <p className="text-gray-700 mb-4">
                                    NestEgg helps you take control of your financial future by providing powerful tools to track, 
                                    analyze, and optimize your retirement investments in one secure platform.
                                </p>
                                <ul className="space-y-3">
                                    <li className="flex items-start">
                                        <Briefcase className="w-5 h-5 text-blue-600 mr-2 flex-shrink-0 mt-0.5" />
                                        <span className="text-gray-700"><strong className="text-blue-600">Track multiple accounts</strong> from different institutions in one dashboard</span>
                                    </li>
                                    <li className="flex items-start">
                                        <ChartLine className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                                        <span className="text-gray-700"><strong className="text-green-500">Visualize performance</strong> with interactive charts and analytics</span>
                                    </li>
                                    <li className="flex items-start">
                                        <Shield className="w-5 h-5 text-purple-500 mr-2 flex-shrink-0 mt-0.5" />
                                        <span className="text-gray-700"><strong className="text-purple-500">Secure and private</strong> - we never connect directly to your financial accounts</span>
                                    </li>
                                </ul>
                            </div>
                            
                            {/* Testimonials */}
                            <div className="border border-gray-200 p-6 rounded-xl">
                                <h3 className="text-lg font-semibold mb-4">What Our Users Say</h3>
                                <div className="space-y-4">
                                    <div className="bg-gray-50 p-4 rounded-lg">
                                        <p className="italic text-gray-600">"NestEgg has completely changed how I track my retirement accounts. Now I can see everything in one place!"</p>
                                        <p className="text-sm text-gray-500 mt-2">- Sarah M., Financial Analyst</p>
                                    </div>
                                    <div className="bg-gray-50 p-4 rounded-lg">
                                        <p className="italic text-gray-600">"I've tried several portfolio trackers, but NestEgg is by far the most intuitive for retirement planning."</p>
                                        <p className="text-sm text-gray-500 mt-2">- James T., Software Engineer</p>
                                    </div>
                                </div>
                            </div>
                            
                            {/* System Status */}
                            <div className="border border-gray-200 rounded-lg p-4 mt-6">
                                <h3 className="font-medium text-gray-700 mb-2">System Status</h3>
                                {renderStatusIndicator()}
                                <p className="mt-2 text-xs text-gray-500">
                                    NestEgg runs on free-tier cloud services which may occasionally require reactivation.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Right Column - Sign Up Form */}
                    <div className="bg-white p-8 rounded-xl shadow-md flex flex-col">
                        <div className="text-center mb-6">
                            <h2 className="text-2xl font-bold text-gray-900">Create Your Account</h2>
                            <p className="text-gray-600">Start tracking your retirement journey today</p>
                        </div>

                        {error && (
                            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 flex items-center">
                                <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0" />
                                <p>{error}</p>
                            </div>
                        )}

                        <form onSubmit={handleSignup} className="space-y-5 flex-1">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="firstName">
                                        First Name
                                    </label>
                                    <input
                                        id="firstName"
                                        type="text"
                                        value={firstName}
                                        onChange={(e) => setFirstName(e.target.value)}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        placeholder="John"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="lastName">
                                        Last Name
                                    </label>
                                    <input
                                        id="lastName"
                                        type="text"
                                        value={lastName}
                                        onChange={(e) => setLastName(e.target.value)}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        placeholder="Smith"
                                    />
                                </div>
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="email">
                                    Email Address
                                </label>
                                <input
                                    id="email"
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="your.email@example.com"
                                />
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="password">
                                    Password
                                </label>
                                <div className="relative">
                                    <input
                                        id="password"
                                        type={showPassword ? "text" : "password"}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pr-10"
                                        placeholder="••••••••"
                                    />
                                    <button 
                                        type="button" 
                                        className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 hover:text-gray-700"
                                        onClick={() => setShowPassword(!showPassword)}
                                    >
                                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                    </button>
                                </div>
                                <p className="text-xs text-gray-500 mt-1">
                                    Must be at least 6 characters long
                                </p>
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="confirmPassword">
                                    Confirm Password
                                </label>
                                <div className="relative">
                                    <input
                                        id="confirmPassword"
                                        type={showPassword ? "text" : "password"}
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        required
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pr-10"
                                        placeholder="••••••••"
                                    />
                                </div>
                            </div>

                            <div className="bg-blue-50 p-4 rounded-lg my-2">
                                <h4 className="font-medium text-blue-800 text-sm mb-2">With a NestEgg account, you can:</h4>
                                <ul className="space-y-1 text-sm text-gray-700">
                                    <li className="flex items-center">
                                        <CheckCircle className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                                        Track all your retirement accounts in one place
                                    </li>
                                    <li className="flex items-center">
                                        <CheckCircle className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                                        Monitor real-time market data for your investments
                                    </li>
                                    <li className="flex items-center">
                                        <CheckCircle className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                                        Access detailed analytics and performance metrics
                                    </li>
                                </ul>
                            </div>

                            <button
                                type="submit" 
                                disabled={loading}
                                className={`w-full flex items-center justify-center px-4 py-3 border border-transparent rounded-lg text-white font-medium 
                                ${loading ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-700'} 
                                transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}
                            >
                                {loading ? (
                                    <>
                                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Creating Account...
                                    </>
                                ) : (
                                    <>
                                        <UserPlus className="w-5 h-5 mr-2" />
                                        Create Account
                                    </>
                                )}
                            </button>
                        </form>

                        <div className="mt-8 text-center">
                            <p className="text-center text-sm text-gray-500 mb-4">Or continue with</p>
                            <div className="grid grid-cols-3 gap-4">
                                <button className="flex items-center justify-center py-2 px-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                                    <img src="/google-icon.svg" alt="Google" className="w-5 h-5" />
                                </button>
                                <button className="flex items-center justify-center py-2 px-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                                    <img src="/apple-icon.svg" alt="Apple" className="w-5 h-5" />
                                </button>
                                <button className="flex items-center justify-center py-2 px-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                                    <img src="/microsoft-icon.svg" alt="Microsoft" className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        <div className="mt-6 text-center">
                            <p className="text-sm text-gray-500">
                                Already have an account?{' '}
                                <Link href="/login" className="text-blue-600 font-medium hover:underline">
                                    Sign in
                                </Link>
                            </p>
                        </div>

                        <div className="mt-6 text-center">
                            <p className="text-xs text-gray-500">
                                By creating an account, you agree to our 
                                <a href="#" className="text-blue-600 hover:underline mx-1">Terms of Service</a> 
                                and 
                                <a href="#" className="text-blue-600 hover:underline mx-1">Privacy Policy</a>
                            </p>
                        </div>
                    </div>
                </div>

                <div className="mt-8 text-center">
                    <p className="text-gray-500 text-sm">
                        © 2025 NestEgg Inc. All rights reserved.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Signup;