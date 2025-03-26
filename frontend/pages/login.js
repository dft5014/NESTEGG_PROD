// pages/login.js
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { API_BASE_URL } from '@/utils/api';
import { 
  PiggyBank, 
  LogIn,
  AlertCircle,
  CheckCircle,
  Clock,
  ExternalLink
} from 'lucide-react';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
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
                router.replace('/portfolio');  // Redirect to portfolio
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
                                <h2 className="text-xl font-bold text-blue-800 mb-3">Track Your Investments</h2>
                                <p className="text-gray-700 mb-4">
                                    NestEgg helps you monitor all your retirement accounts in one place,
                                    giving you clarity on your financial journey.
                                </p>
                                <ul className="space-y-2">
                                    <li className="flex items-start">
                                        <CheckCircle className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                                        <span>Monitor all your accounts in one dashboard</span>
                                    </li>
                                    <li className="flex items-start">
                                        <CheckCircle className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                                        <span>Track individual positions and performance</span>
                                    </li>
                                    <li className="flex items-start">
                                        <CheckCircle className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                                        <span>Visualize your retirement progress</span>
                                    </li>
                                </ul>
                            </div>
                            
                            {/* System Status */}
                            <div className="border border-gray-200 rounded-lg p-4">
                                <h3 className="font-medium text-gray-700 mb-2">System Status</h3>
                                {renderStatusIndicator()}
                                <p className="mt-2 text-xs text-gray-500">
                                    NestEgg runs on free-tier cloud services which may occasionally require reactivation.
                                </p>
                            </div>
                        </div>

                        <div className="mt-6 text-center">
                            <p className="text-sm text-gray-500">
                                New to NestEgg? <Link href="/signup" className="text-blue-600 font-medium hover:underline">Create an account</Link>
                            </p>
                        </div>
                    </div>

                    {/* Right Column - Login Form */}
                    <div className="bg-white p-8 rounded-xl shadow-md flex flex-col">
                        <div className="text-center mb-6">
                            <h2 className="text-2xl font-bold text-gray-900">Welcome Back</h2>
                            <p className="text-gray-600">Sign in to access your portfolio</p>
                        </div>

                        {error && (
                            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 flex items-center">
                                <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0" />
                                <p>{error}</p>
                            </div>
                        )}

                        <form onSubmit={handleLogin} className="space-y-6 flex-1">
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
                                <div className="flex items-center justify-between mb-1">
                                    <label className="block text-sm font-medium text-gray-700" htmlFor="password">
                                        Password
                                    </label>
                                    <a href="#" className="text-sm text-blue-600 hover:underline">
                                        Forgot password?
                                    </a>
                                </div>
                                <input
                                    id="password"
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="••••••••"
                                />
                            </div>

                            <div className="flex items-center">
                                <input
                                    id="remember-me"
                                    name="remember-me"
                                    type="checkbox"
                                    className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                                />
                                <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700">
                                    Remember me
                                </label>
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
                                        Signing in...
                                    </>
                                ) : (
                                    <>
                                        <LogIn className="w-5 h-5 mr-2" />
                                        Sign in
                                    </>
                                )}
                            </button>
                        </form>

                        <div className="mt-8">
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
                            <p className="text-xs text-gray-500">
                                By signing in, you agree to our 
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

export default Login;