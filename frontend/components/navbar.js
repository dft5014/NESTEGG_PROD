import { useState, useContext, useEffect, useCallback, memo, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { motion, AnimatePresence, useMotionValue, useTransform, useSpring } from 'framer-motion';
import { AuthContext } from '@/context/AuthContext';
import {
    User, Settings, LogOut, HelpCircle, Bell, ChartLine,
    PlusCircle, Shield, Clock, Menu, X, LineChart, BarChart4,
    Upload, Loader2, AlertCircle, Wallet, TrendingUp, Activity, 
    Zap, Star, Moon, Sun, Command, Search, DollarSign, Globe,
    ArrowUpRight, ArrowDownRight, Sparkles, Cpu, Lock,
    CheckCircle, Info, ChevronDown, Layers, RefreshCw, Eye, 
    EyeOff, Award, Target, Flame, CreditCard, FileText,
    GitBranch, BarChart3, PieChart, Briefcase, ArrowRightLeft
} from 'lucide-react';
import UpdateStatusIndicator from '@/components/UpdateStatusIndicator';
import AddPositionButton from '@/components/AddPositionButton';
import AddAccountButton from '@/components/AddAccountButton';
import BulkPositionButton from '@/components/BulkPositionButton';
import { fetchAccounts } from '@/utils/apimethods/accountMethods';
import { fetchWithAuth } from '@/utils/api';

// Enhanced 3D Egg Logo with animation
const EggLogo = memo(() => {
    const [isHovered, setIsHovered] = useState(false);
    
    return (
        <motion.div 
            className="relative"
            onHoverStart={() => setIsHovered(true)}
            onHoverEnd={() => setIsHovered(false)}
            whileHover={{ scale: 1.1, rotate: [0, -5, 5, 0] }}
            transition={{ type: "spring", stiffness: 300 }}
        >
            <svg
                width="42"
                height="42"
                viewBox="0 0 42 42"
                xmlns="http://www.w3.org/2000/svg"
                className="text-blue-400"
            >
                <defs>
                    <linearGradient id="eggGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#60A5FA">
                            <animate attributeName="stop-color" values="#60A5FA;#A78BFA;#60A5FA" dur="3s" repeatCount="indefinite" />
                        </stop>
                        <stop offset="100%" stopColor="#93C5FD">
                            <animate attributeName="stop-color" values="#93C5FD;#C7D2FE;#93C5FD" dur="3s" repeatCount="indefinite" />
                        </stop>
                    </linearGradient>
                    <filter id="glow">
                        <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                        <feMerge>
                            <feMergeNode in="coloredBlur"/>
                            <feMergeNode in="SourceGraphic"/>
                        </feMerge>
                    </filter>
                </defs>
                <motion.path
                    d="M21 4C15 4 9 14 9 24C9 32 14 36 21 36C28 36 33 32 33 24C33 14 27 4 21 4Z"
                    fill="url(#eggGradient)"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    filter={isHovered ? "url(#glow)" : ""}
                    animate={isHovered ? { strokeWidth: 2 } : { strokeWidth: 1.5 }}
                />
                <motion.circle 
                    cx="17" 
                    cy="19" 
                    r="2" 
                    fill="#1E3A8A"
                    animate={isHovered ? { scale: [1, 1.2, 1] } : {}}
                    transition={{ duration: 0.3 }}
                />
                <motion.circle 
                    cx="25" 
                    cy="19" 
                    r="2" 
                    fill="#1E3A8A"
                    animate={isHovered ? { scale: [1, 1.2, 1] } : {}}
                    transition={{ duration: 0.3, delay: 0.1 }}
                />
                <motion.path 
                    d="M17 27C18.5 28.5 23.5 28.5 25 27" 
                    stroke="#1E3A8A" 
                    strokeWidth="2" 
                    strokeLinecap="round"
                    animate={isHovered ? { d: "M17 27C18.5 29.5 23.5 29.5 25 27" } : {}}
                />
            </svg>
            {isHovered && (
                <motion.div
                    className="absolute inset-0 -z-10"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1.5 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                >
                    <div className="w-full h-full bg-blue-400/20 rounded-full blur-xl" />
                </motion.div>
            )}
        </motion.div>
    );
});
EggLogo.displayName = 'EggLogo';

// Action Button Component
const ActionButton = memo(({ icon, label, onClick, gradient, disabled, loading, className = "" }) => {
    return (
        <motion.button
            whileHover={{ scale: disabled ? 1 : 1.05, y: disabled ? 0 : -2 }}
            whileTap={{ scale: disabled ? 1 : 0.95 }}
            onClick={onClick}
            disabled={disabled || loading}
            className={`
                relative px-4 py-2.5 rounded-xl font-medium transition-all
                flex items-center space-x-2 group overflow-hidden
                ${disabled 
                    ? 'bg-gray-800/50 text-gray-500 cursor-not-allowed' 
                    : `bg-gradient-to-r ${gradient} text-white shadow-lg hover:shadow-xl`
                }
                ${className}
            `}
        >
            {/* Animated background */}
            {!disabled && (
                <motion.div
                    className="absolute inset-0 bg-white/20"
                    initial={{ x: '-100%' }}
                    whileHover={{ x: '100%' }}
                    transition={{ duration: 0.5 }}
                />
            )}
            
            <div className="relative flex items-center space-x-2">
                {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                    <motion.div
                        whileHover={{ rotate: disabled ? 0 : 360 }}
                        transition={{ duration: 0.5 }}
                    >
                        {icon}
                    </motion.div>
                )}
                <span className="text-sm font-medium">{label}</span>
            </div>
        </motion.button>
    );
});
ActionButton.displayName = 'ActionButton';

// Portfolio Metrics Component
const PortfolioMetrics = memo(({ showValues }) => {
    const [metrics, setMetrics] = useState({
        totalValue: 0,
        dayChange: { value: 0, percent: 0 },
        totalGainLoss: { value: 0, percent: 0 },
        positions: 0,
        accounts: 0,
        lastUpdate: new Date()
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadMetrics = async () => {
            try {
                const response = await fetchWithAuth('/portfolio/snapshots?timeframe=1d&include_cost_basis=true');
                const data = await response.json();
                
                setMetrics({
                    totalValue: data.current_value || 0,
                    dayChange: {
                        value: data.period_changes?.['1d']?.value_change || 0,
                        percent: data.period_changes?.['1d']?.percent_change || 0
                    },
                    totalGainLoss: {
                        value: data.unrealized_gain || 0,
                        percent: data.unrealized_gain_percent || 0
                    },
                    positions: data.top_positions?.length || 0,
                    accounts: data.account_allocation?.length || 0,
                    lastUpdate: new Date(data.last_updated || new Date())
                });
            } catch (error) {
                console.error("Error loading portfolio metrics:", error);
            } finally {
                setLoading(false);
            }
        };

        loadMetrics();
        const interval = setInterval(loadMetrics, 60000); // Refresh every minute
        return () => clearInterval(interval);
    }, []);

    const formatCurrency = (value) => {
        if (!showValues) return '••••••';
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(value);
    };

    const formatPercentage = (value) => {
        return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
    };

    const formatCompactNumber = (num) => {
        if (!showValues) return '••';
        if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
        if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
        return num.toString();
    };

    return (
        <div className="flex items-center space-x-8">
            {/* Total Portfolio Value */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative"
            >
                <div className="flex items-center space-x-4">
                    <div className="relative">
                        <motion.div
                            className="absolute inset-0 bg-blue-500/20 rounded-full blur-xl"
                            animate={{ scale: [1, 1.2, 1] }}
                            transition={{ duration: 3, repeat: Infinity }}
                        />
                        <div className="relative bg-gradient-to-br from-blue-500/20 to-purple-500/20 p-3 rounded-xl backdrop-blur-sm">
                            <Wallet className="w-6 h-6 text-blue-400" />
                        </div>
                    </div>
                    <div>
                        <p className="text-xs text-gray-400 font-medium">Total Portfolio</p>
                        <div className="flex items-baseline space-x-2">
                            <motion.h2 
                                className="text-2xl font-bold text-white"
                                initial={{ scale: 0.5 }}
                                animate={{ scale: 1 }}
                                transition={{ type: "spring", stiffness: 200 }}
                            >
                                {loading ? (
                                    <div className="h-8 w-32 bg-white/10 rounded animate-pulse" />
                                ) : (
                                    formatCurrency(metrics.totalValue)
                                )}
                            </motion.h2>
                            <div className={`flex items-center text-sm font-medium ${metrics.dayChange.percent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                {metrics.dayChange.percent >= 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                                <span>{formatPercentage(metrics.dayChange.percent)}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* Divider */}
            <div className="h-12 w-px bg-white/10" />

            {/* Day Change */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="hidden lg:block"
            >
                <p className="text-xs text-gray-400 font-medium">Day Change</p>
                <div className={`flex items-center space-x-2 ${metrics.dayChange.value >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    <motion.div
                        animate={{ y: [0, -2, 0] }}
                        transition={{ duration: 2, repeat: Infinity }}
                    >
                        {metrics.dayChange.value >= 0 ? <TrendingUp className="w-5 h-5" /> : <TrendingUp className="w-5 h-5 rotate-180" />}
                    </motion.div>
                    <span className="text-lg font-semibold">
                        {formatCurrency(Math.abs(metrics.dayChange.value))}
                    </span>
                </div>
            </motion.div>

            {/* Total Gain/Loss */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="hidden xl:block"
            >
                <p className="text-xs text-gray-400 font-medium">Total Return</p>
                <div className={`flex items-center space-x-2 ${metrics.totalGainLoss.value >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    <Target className="w-5 h-5" />
                    <span className="text-lg font-semibold">
                        {formatCurrency(Math.abs(metrics.totalGainLoss.value))}
                    </span>
                    <span className="text-sm">
                        ({formatPercentage(metrics.totalGainLoss.percent)})
                    </span>
                </div>
            </motion.div>

            {/* Quick Stats */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="hidden 2xl:flex items-center space-x-6"
            >
                <div className="flex items-center space-x-2">
                    <Layers className="w-4 h-4 text-purple-400" />
                    <div>
                        <p className="text-xs text-gray-400">Positions</p>
                        <p className="text-sm font-semibold text-white">{metrics.positions}</p>
                    </div>
                </div>
                <div className="flex items-center space-x-2">
                    <Briefcase className="w-4 h-4 text-blue-400" />
                    <div>
                        <p className="text-xs text-gray-400">Accounts</p>
                        <p className="text-sm font-semibold text-white">{metrics.accounts}</p>
                    </div>
                </div>
            </motion.div>

            {/* Live Indicator */}
            <motion.div
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="hidden lg:flex items-center space-x-2 text-xs"
            >
                <div className="w-2 h-2 bg-green-400 rounded-full" />
                <span className="text-gray-400">Live</span>
            </motion.div>
        </div>
    );
});
PortfolioMetrics.displayName = 'PortfolioMetrics';

const Navbar = () => {
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [scrolledDown, setScrolledDown] = useState(false);
    const [showNotifications, setShowNotifications] = useState(false);
    const [unreadNotifications, setUnreadNotifications] = useState(3);
    const [isDarkMode, setIsDarkMode] = useState(true);
    const [showValues, setShowValues] = useState(true);
    const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

    // Modal states for quick actions
    const [showAddAccount, setShowAddAccount] = useState(false);
    const [showAddPosition, setShowAddPosition] = useState(false);
    const [showBulkUpload, setShowBulkUpload] = useState(false);

    const { user, logout } = useContext(AuthContext);
    const router = useRouter();
    const navbarRef = useRef(null);

    // Account fetching state
    const [accounts, setAccounts] = useState([]);
    const [isLoadingAccounts, setIsLoadingAccounts] = useState(false);
    const [accountError, setAccountError] = useState(null);

    const loadAccounts = useCallback(async () => {
        if (!user) {
            setAccounts([]);
            setIsLoadingAccounts(false);
            setAccountError(null);
            return;
        }
        setIsLoadingAccounts(true);
        setAccountError(null);
        try {
            const accountsData = await fetchAccounts();
            setAccounts(accountsData || []);
        } catch (error) {
            console.error("Navbar: Error fetching accounts:", error);
            setAccountError("Failed to load accounts.");
            setAccounts([]);
        } finally {
            setIsLoadingAccounts(false);
        }
    }, [user]);

    useEffect(() => {
        loadAccounts();
    }, [loadAccounts]);

    // Handle scroll
    useEffect(() => {
        const handleScroll = () => {
            setScrolledDown(window.scrollY > 10);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Command palette shortcut
    useEffect(() => {
        const handleKeyDown = (e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                setIsCommandPaletteOpen(true);
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, []);

    // Action items configuration - now with modal triggers
    const actionItems = [
        {
            icon: <Wallet className="w-4 h-4" />,
            label: "Add Account",
            gradient: "from-emerald-600 to-green-600",
            onClick: () => setShowAddAccount(true)
        },
        {
            icon: <PlusCircle className="w-4 h-4" />,
            label: "Add Position",
            gradient: "from-blue-600 to-indigo-600",
            onClick: () => setShowAddPosition(true)
        },
        {
            icon: <Upload className="w-4 h-4" />,
            label: "Bulk Add",
            gradient: "from-purple-600 to-pink-600",
            onClick: () => setShowBulkUpload(true),
            disabled: isLoadingAccounts || accountError || !accounts || accounts.length === 0
        },
        {
            icon: <GitBranch className="w-4 h-4" />,
            label: "Reconcile",
            gradient: "from-orange-600 to-amber-600",
            onClick: () => router.push('/reconcile')
        },
        {
            icon: <ArrowRightLeft className="w-4 h-4" />,
            label: "Add Transaction",
            gradient: "from-cyan-600 to-blue-600",
            onClick: () => router.push('/transactions/add')
        }
    ];

    // Enhanced notifications
    const notifications = [
        { 
            id: 1, 
            category: 'portfolio',
            title: "Portfolio Milestone", 
            message: "Your portfolio value increased by 5% this month", 
            time: "2 min ago", 
            isNew: true,
            icon: <TrendingUp className="w-4 h-4 text-green-400" />
        },
        { 
            id: 2, 
            category: 'account',
            title: "Account Synced", 
            message: "Your Vanguard account has been updated", 
            time: "1 hour ago", 
            isNew: true,
            icon: <CheckCircle className="w-4 h-4 text-blue-400" />
        },
        { 
            id: 3, 
            category: 'alert',
            title: "Price Alert", 
            message: "AAPL reached your target price of $180", 
            time: "3 hours ago", 
            isNew: true,
            icon: <Bell className="w-4 h-4 text-yellow-400" />
        }
    ];

    const dropdownItems = [
        { icon: <User className="w-5 h-5" />, label: "Profile", href: "/profile" },
        { icon: <Activity className="w-5 h-5" />, label: "Activity", href: "/activity" },
        { icon: <BarChart3 className="w-5 h-5" />, label: "Analytics", href: "/analytics" },
        { icon: <Settings className="w-5 h-5" />, label: "Settings", href: "/settings" },
        { icon: <Shield className="w-5 h-5" />, label: "Security", href: "/security" },
        { icon: <HelpCircle className="w-5 h-5" />, label: "Help & Support", href: "/help" },
        { divider: true },
        {
            icon: <LogOut className="w-5 h-5 text-red-500" />,
            label: "Logout",
            action: logout,
            className: "text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
        }
    ];

    const displayName = user ?
        (user.first_name && user.last_name ? `${user.first_name} ${user.last_name}` : user.email) :
        '';

    const getInitials = useCallback(() => {
        if (user) {
            if (user.first_name && user.last_name) {
                return `${user.first_name[0]}${user.last_name[0]}`.toUpperCase();
            } else if (user.email) {
                return user.email[0].toUpperCase();
            }
        }
        return 'U';
    }, [user]);

    return (
        <motion.div 
            ref={navbarRef}
            className="sticky top-0 z-50"
            initial={{ y: -100 }}
            animate={{ y: 0 }}
            transition={{ type: "spring", stiffness: 100 }}
        >
            {/* Main Navbar */}
            <nav className={`
                ${scrolledDown 
                    ? 'bg-gray-900/95 backdrop-blur-xl shadow-2xl' 
                    : 'bg-gradient-to-r from-gray-900/90 via-blue-900/90 to-purple-900/90 backdrop-blur-md'
                } 
                transition-all duration-500 border-b border-white/10
            `}>
                <div className="container mx-auto px-4">
                    <div className="h-20 flex items-center justify-between">
                        {/* Left Section: Logo & Actions */}
                        <div className="flex items-center space-x-6">
                            {/* Logo */}
                            <Link href="/" className="flex items-center group">
                                <motion.div className="mr-3">
                                    <EggLogo />
                                </motion.div>
                                <div className="flex flex-col">
                                    <motion.span 
                                        className="text-2xl font-bold text-white"
                                        whileHover={{ scale: 1.05 }}
                                    >
                                        NestEgg
                                    </motion.span>
                                    <span className="text-xs text-blue-300">Financial Command Center</span>
                                </div>
                            </Link>

                            {/* Action Buttons */}
                            {user && (
                                <>
                                    <div className="h-12 w-px bg-white/10 hidden lg:block" />
                                    
                                    <div className="hidden lg:flex items-center space-x-3">
                                        {actionItems.map((item, index) => (
                                            <motion.div
                                                key={index}
                                                initial={{ opacity: 0, y: -20 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: index * 0.1 }}
                                            >
                                                <ActionButton
                                                    icon={item.icon}
                                                    label={item.label}
                                                    onClick={item.onClick}
                                                    gradient={item.gradient}
                                                    disabled={item.disabled}
                                                />
                                            </motion.div>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Center Section: Portfolio Metrics */}
                        {user && (
                            <div className="hidden lg:block flex-1 mx-8">
                                <PortfolioMetrics showValues={showValues} />
                            </div>
                        )}

                        {/* Right Section: User Menu */}
                        {user ? (
                            <div className="flex items-center space-x-3">
                                {/* Command Palette Button */}
                                <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => setIsCommandPaletteOpen(true)}
                                    className="hidden md:flex items-center space-x-2 px-3 py-2 bg-white/10 hover:bg-white/20 rounded-xl transition-all"
                                >
                                    <Command className="w-4 h-4" />
                                    <span className="text-sm text-gray-300">Cmd+K</span>
                                </motion.button>

                                {/* Value Toggle */}
                                <motion.button
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.9 }}
                                    onClick={() => setShowValues(!showValues)}
                                    className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 transition-all"
                                >
                                    {showValues ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
                                </motion.button>

                                {/* Theme Toggle */}
                                <motion.button
                                    whileHover={{ scale: 1.1, rotate: 180 }}
                                    whileTap={{ scale: 0.9 }}
                                    onClick={() => setIsDarkMode(!isDarkMode)}
                                    className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 transition-all"
                                >
                                    {isDarkMode ? <Sun className="w-5 h-5 text-yellow-400" /> : <Moon className="w-5 h-5 text-blue-400" />}
                                </motion.button>

                                {/* Notifications */}
                                <div className="relative">
                                    <motion.button
                                        whileHover={{ scale: 1.1 }}
                                        whileTap={{ scale: 0.9 }}
                                        className="relative p-2.5 rounded-xl bg-white/10 hover:bg-white/20 transition-all"
                                        onClick={() => setShowNotifications(!showNotifications)}
                                    >
                                        <Bell className="w-5 h-5" />
                                        {unreadNotifications > 0 && (
                                            <motion.span
                                                initial={{ scale: 0 }}
                                                animate={{ scale: 1 }}
                                                className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center font-bold"
                                            >
                                                {unreadNotifications}
                                            </motion.span>
                                        )}
                                    </motion.button>

                                    <AnimatePresence>
                                        {showNotifications && (
                                            <motion.div
                                                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                                className="absolute right-0 mt-2 w-96 bg-gray-900 rounded-2xl shadow-2xl overflow-hidden border border-white/10 backdrop-blur-xl"
                                            >
                                                <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-4 text-white">
                                                    <div className="flex justify-between items-center">
                                                        <h3 className="text-lg font-bold">Notifications</h3>
                                                        <button className="text-white/80 hover:text-white text-sm">
                                                            Mark all as read
                                                        </button>
                                                    </div>
                                                </div>
                                                
                                                <div className="max-h-96 overflow-y-auto">
                                                    {notifications.map((notification, index) => (
                                                        <motion.div
                                                            key={notification.id}
                                                            initial={{ opacity: 0, x: -20 }}
                                                            animate={{ opacity: 1, x: 0 }}
                                                            transition={{ delay: index * 0.1 }}
                                                            className={`
                                                                p-4 border-b border-white/10 hover:bg-white/5 cursor-pointer
                                                                ${notification.isNew ? 'bg-blue-500/10' : ''}
                                                            `}
                                                        >
                                                            <div className="flex items-start space-x-3">
                                                                <div className="p-2 bg-white/10 rounded-lg">
                                                                    {notification.icon}
                                                                </div>
                                                                <div className="flex-1">
                                                                    <h4 className="font-medium text-white">{notification.title}</h4>
                                                                    <p className="text-sm text-gray-400 mt-1">{notification.message}</p>
                                                                    <p className="text-xs text-gray-500 mt-2">{notification.time}</p>
                                                                </div>
                                                                {notification.isNew && (
                                                                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
                                                                )}
                                                            </div>
                                                        </motion.div>
                                                    ))}
                                                </div>
                                                
                                                <Link
                                                    href="/notifications"
                                                    className="block p-3 text-center text-blue-400 hover:text-blue-300 bg-white/5 font-medium"
                                                    onClick={() => setShowNotifications(false)}
                                                >
                                                    View all notifications
                                                </Link>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>

                                {/* User Menu */}
                                <div className="relative">
                                    <motion.button
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                        className="flex items-center space-x-3 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 transition-all"
                                    >
                                        <motion.div 
                                            className="w-10 h-10 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold shadow-lg"
                                            whileHover={{ rotate: [0, -5, 5, 0] }}
                                        >
                                            {getInitials()}
                                        </motion.div>
                                        <div className="hidden md:block text-left">
                                            <p className="text-sm font-medium text-white">{displayName}</p>
                                            <p className="text-xs text-gray-400">Premium Account</p>
                                        </div>
                                        <ChevronDown className={`w-4 h-4 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                                    </motion.button>

                                    <AnimatePresence>
                                        {isDropdownOpen && (
                                            <motion.div
                                                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                                className="absolute right-0 mt-2 w-72 bg-gray-900 rounded-2xl shadow-2xl overflow-hidden border border-white/10 backdrop-blur-xl"
                                            >
                                                <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-4">
                                                    <div className="flex items-center space-x-3">
                                                        <div className="w-16 h-16 rounded-xl bg-white/20 flex items-center justify-center text-white text-2xl font-bold">
                                                            {getInitials()}
                                                        </div>
                                                        <div>
                                                            <p className="font-bold text-lg text-white">{displayName}</p>
                                                            <p className="text-sm text-white/80">{user?.email}</p>
                                                            <div className="flex items-center mt-1">
                                                                <Award className="w-4 h-4 text-yellow-400 mr-1" />
                                                                <span className="text-xs text-yellow-400">Premium Member</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="p-2">
                                                    {dropdownItems.map((item, index) => (
                                                        item.divider ? (
                                                            <div key={index} className="h-px bg-white/10 my-2" />
                                                        ) : (
                                                            <motion.div
                                                                key={index}
                                                                whileHover={{ x: 5 }}
                                                                whileTap={{ scale: 0.95 }}
                                                            >
                                                                {item.action ? (
                                                                    <button
                                                                        onClick={() => {
                                                                            item.action();
                                                                            setIsDropdownOpen(false);
                                                                        }}
                                                                        className={`
                                                                            flex items-center w-full px-4 py-3 rounded-xl
                                                                            hover:bg-white/10 transition-all text-left
                                                                            ${item.className || 'text-gray-300 hover:text-white'}
                                                                        `}
                                                                    >
                                                                        {item.icon}
                                                                        <span className="ml-3">{item.label}</span>
                                                                    </button>
                                                                ) : (
                                                                    <Link
                                                                        href={item.href}
                                                                        onClick={() => setIsDropdownOpen(false)}
                                                                        className={`
                                                                            flex items-center px-4 py-3 rounded-xl
                                                                            hover:bg-white/10 transition-all
                                                                            ${item.className || 'text-gray-300 hover:text-white'}
                                                                        `}
                                                                    >
                                                                        {item.icon}
                                                                        <span className="ml-3">{item.label}</span>
                                                                    </Link>
                                                                )}
                                                            </motion.div>
                                                        )
                                                    ))}
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>

                                {/* Mobile menu button */}
                                <motion.button
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.9 }}
                                    className="lg:hidden text-white p-2 rounded-xl bg-white/10 hover:bg-white/20"
                                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                                >
                                    {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                                </motion.button>
                            </div>
                        ) : (
                            // Non-authenticated state
                            <div className="flex items-center space-x-4">
                                <Link
                                    href="/login"
                                    className="px-6 py-2 text-white hover:text-blue-300 transition-colors font-medium"
                                >
                                    Login
                                </Link>
                                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                                    <Link
                                        href="/signup"
                                        className="px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-medium shadow-lg hover:shadow-blue-500/25 transition-all"
                                    >
                                        Get Started
                                    </Link>
                                </motion.div>
                            </div>
                        )}
                    </div>
                </div>
            </nav>

            {/* Mobile Menu */}
            <AnimatePresence>
                {isMobileMenuOpen && user && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="lg:hidden bg-gray-900/95 backdrop-blur-xl border-b border-white/10"
                    >
                        <div className="container mx-auto px-4 py-6">
                            {/* Mobile Portfolio Metrics */}
                            <div className="mb-6 p-4 bg-white/5 rounded-xl">
                                <PortfolioMetrics showValues={showValues} />
                            </div>

                            {/* Mobile Actions */}
                            <div className="space-y-3 mb-6">
                                {actionItems.map((item, index) => (
                                    <motion.div
                                        key={index}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: index * 0.1 }}
                                    >
                                        <ActionButton
                                            icon={item.icon}
                                            label={item.label}
                                            onClick={item.onClick}
                                            gradient={item.gradient}
                                            disabled={item.disabled}
                                            className="w-full justify-center"
                                        />
                                    </motion.div>
                                ))}
                            </div>

                            {/* Mobile User Info */}
                            <div className="border-t border-white/10 pt-4">
                                <div className="flex items-center space-x-3 mb-4">
                                    <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold">
                                        {getInitials()}
                                    </div>
                                    <div>
                                        <p className="font-medium text-white">{displayName}</p>
                                        <p className="text-sm text-gray-400">{user?.email}</p>
                                    </div>
                                </div>

                                {/* Mobile Menu Items */}
                                {dropdownItems.filter(item => !item.divider).map((item, index) => (
                                    <motion.div
                                        key={index}
                                        whileTap={{ scale: 0.95 }}
                                    >
                                        {item.action ? (
                                            <button
                                                onClick={() => {
                                                    item.action();
                                                    setIsMobileMenuOpen(false);
                                                }}
                                                className={`
                                                    flex items-center w-full px-4 py-3 rounded-xl
                                                    ${item.className || 'text-gray-300 hover:bg-white/10 hover:text-white'}
                                                `}
                                            >
                                                {item.icon}
                                                <span className="ml-3">{item.label}</span>
                                            </button>
                                        ) : (
                                            <Link
                                                href={item.href}
                                                onClick={() => setIsMobileMenuOpen(false)}
                                                className={`
                                                    flex items-center px-4 py-3 rounded-xl
                                                    ${item.className || 'text-gray-300 hover:bg-white/10 hover:text-white'}
                                                `}
                                            >
                                                {item.icon}
                                                <span className="ml-3">{item.label}</span>
                                            </Link>
                                        )}
                                    </motion.div>
                                ))}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Command Palette */}
            <AnimatePresence>
                {isCommandPaletteOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
                            onClick={() => setIsCommandPaletteOpen(false)}
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="fixed top-20 left-1/2 transform -translate-x-1/2 w-full max-w-2xl bg-gray-900 rounded-2xl shadow-2xl border border-white/10 z-50 overflow-hidden"
                        >
                            <div className="p-4 border-b border-white/10">
                                <div className="flex items-center space-x-3">
                                    <Search className="w-5 h-5 text-gray-400" />
                                    <input
                                        type="text"
                                        placeholder="Search actions, accounts, or positions..."
                                        className="flex-1 bg-transparent outline-none text-white placeholder-gray-400"
                                        autoFocus
                                    />
                                </div>
                            </div>
                            
                            <div className="p-4">
                                <p className="text-sm text-gray-400 mb-3">Quick Actions</p>
                                <div className="space-y-2">
                                    {actionItems.map((item, index) => (
                                        <motion.button
                                            key={index}
                                            whileHover={{ x: 5 }}
                                            className="w-full flex items-center space-x-3 p-3 hover:bg-white/10 rounded-lg text-left"
                                            onClick={() => {
                                                setIsCommandPaletteOpen(false);
                                                item.onClick();
                                            }}
                                            disabled={item.disabled}
                                        >
                                            <div className={`p-2 rounded-lg bg-gradient-to-r ${item.gradient} ${item.disabled ? 'opacity-50' : ''}`}>
                                                {item.icon}
                                            </div>
                                            <span className={`text-white ${item.disabled ? 'opacity-50' : ''}`}>{item.label}</span>
                                        </motion.button>
                                    ))}
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* Modals for Quick Actions */}
            {showAddAccount && (
                <div className="fixed inset-0 z-50">
                    <AddAccountButton
                        onAccountAdded={loadAccounts}
                        isModalOpen={true}
                        onClose={() => setShowAddAccount(false)}
                    />
                </div>
            )}

            {showAddPosition && (
                <div className="fixed inset-0 z-50">
                    <AddPositionButton
                        onPositionAdded={() => {}}
                        isModalOpen={true}
                        onClose={() => setShowAddPosition(false)}
                    />
                </div>
            )}

            {showBulkUpload && (
                <div className="fixed inset-0 z-50">
                    <BulkPositionButton
                        accounts={accounts}
                        fetchAccounts={loadAccounts}
                        fetchPositions={() => {}}
                        fetchPortfolioSummary={() => {}}
                        isModalOpen={true}
                        onClose={() => setShowBulkUpload(false)}
                    />
                </div>
            )}
        </motion.div>
    );
};

export default Navbar;