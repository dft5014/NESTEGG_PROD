// components/Navbar.js
import { useState, useContext, useEffect, useCallback, memo, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { AuthContext } from '@/context/AuthContext';
import {
    User, Settings, LogOut, HelpCircle, Bell, ChartLine,
    PlusCircle, Shield, Clock, Menu, X, LineChart, BarChart4,
    ChevronLeft, ChevronRight, Upload, Loader2, AlertCircle,
    TrendingUp, TrendingDown, Eye, EyeOff, Activity, RefreshCw,
    DollarSign, Sparkles, ArrowUp, ArrowDown, Zap, Database,
    Moon, Sun, Monitor, Smartphone, Briefcase, Calculator,
    Wallet, PiggyBank, CreditCard, Info, ExternalLink
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import UpdateStatusIndicator from '@/components/UpdateStatusIndicator';
import AddPositionButton from '@/components/AddPositionButton';
import AddAccountButton from '@/components/AddAccountButton';
import BulkPositionButton from '@/components/BulkPositionButton';
import { fetchAccounts } from '@/utils/apimethods/accountMethods';
import { fetchWithAuth } from '@/utils/api';

// Memoized EggLogo component with enhanced animation
const EggLogo = memo(() => (
    <motion.div 
        className="relative"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
    >
        <svg
            width="36"
            height="36"
            viewBox="0 0 36 36"
            xmlns="http://www.w3.org/2000/svg"
            className="text-blue-400"
        >
            <defs>
                <linearGradient id="eggGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#60A5FA" />
                    <stop offset="50%" stopColor="#93C5FD" />
                    <stop offset="100%" stopColor="#3730A3" />
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
                d="M18 2C12 2 6 12 6 22C6 30 11 34 18 34C25 34 30 30 30 22C30 12 24 2 18 2Z"
                fill="url(#eggGradient)"
                stroke="currentColor"
                strokeWidth="1.5"
                filter="url(#glow)"
                animate={{
                    strokeWidth: [1.5, 2, 1.5],
                }}
                transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut"
                }}
            />
            <circle cx="14" cy="16" r="1.5" fill="#1E3A8A" />
            <circle cx="22" cy="16" r="1.5" fill="#1E3A8A" />
            <path d="M15 24C16.5 25.5 19.5 25.5 21 24" stroke="#1E3A8A" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        <motion.div
            className="absolute -bottom-1 -right-1 w-2 h-2 bg-green-400 rounded-full"
            animate={{
                scale: [1, 1.3, 1],
                opacity: [1, 0.7, 1]
            }}
            transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
            }}
        />
    </motion.div>
));
EggLogo.displayName = 'EggLogo';

// Portfolio Balance Display Component
const PortfolioBalance = memo(({ 
    balance, 
    dailyChange, 
    weeklyChange, 
    isVisible, 
    onToggleVisibility,
    isLoading,
    error 
}) => {
    const formatCurrency = (value) => {
        if (value === null || value === undefined) return '-';
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(value);
    };

    const formatPercentage = (value) => {
        if (value === null || value === undefined) return '-';
        return `${value > 0 ? '+' : ''}${value.toFixed(2)}%`;
    };

    if (isLoading) {
        return (
            <div className="flex items-center space-x-4 px-4 py-2 bg-gray-800/50 rounded-lg backdrop-blur-sm">
                <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
                <span className="text-sm text-gray-400">Loading portfolio...</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center space-x-2 px-4 py-2 bg-red-900/20 rounded-lg">
                <AlertCircle className="w-4 h-4 text-red-400" />
                <span className="text-sm text-red-400">Unable to load portfolio</span>
            </div>
        );
    }

    return (
        <motion.div 
            className="flex items-center space-x-4 px-4 py-2 bg-gradient-to-r from-gray-800/50 to-blue-900/30 rounded-lg backdrop-blur-sm border border-gray-700/50 relative overflow-hidden"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
        >
            {/* Animated background gradient */}
            <motion.div
                className="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-purple-600/10"
                animate={{
                    x: ['-100%', '100%'],
                }}
                transition={{
                    duration: 10,
                    repeat: Infinity,
                    ease: "linear"
                }}
            />
            
            {/* Balance Display */}
            <div className="flex items-center space-x-3 relative z-10">
                <motion.button
                    onClick={onToggleVisibility}
                    className="p-1.5 hover:bg-gray-700/50 rounded-md transition-colors group"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    aria-label={isVisible ? "Hide balance" : "Show balance"}
                >
                    {isVisible ? (
                        <EyeOff className="w-4 h-4 text-gray-400 group-hover:text-white" />
                    ) : (
                        <Eye className="w-4 h-4 text-gray-400 group-hover:text-white" />
                    )}
                </motion.button>
                
                <div>
                    <div className="flex items-center space-x-2">
                        <div className="flex items-center">
                            <Wallet className="w-4 h-4 text-blue-400 mr-2" />
                            <span className="text-xs text-gray-400 mr-2">Portfolio Value</span>
                        </div>
                        <motion.span 
                            className="text-lg font-semibold text-white"
                            key={balance}
                            initial={{ opacity: 0, y: -5 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3 }}
                        >
                            {isVisible ? formatCurrency(balance) : '••••••'}
                        </motion.span>
                    </div>
                    {isVisible && (
                        <motion.div 
                            className="flex items-center space-x-3 text-xs mt-0.5"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.1 }}
                        >
                            {/* Daily Change */}
                            <motion.div 
                                className={`flex items-center space-x-1 ${dailyChange?.percent_change > 0 ? 'text-green-400' : dailyChange?.percent_change < 0 ? 'text-red-400' : 'text-gray-400'}`}
                                whileHover={{ scale: 1.05 }}
                            >
                                {dailyChange?.percent_change > 0 ? (
                                    <ArrowUp className="w-3 h-3" />
                                ) : dailyChange?.percent_change < 0 ? (
                                    <ArrowDown className="w-3 h-3" />
                                ) : null}
                                <span className="font-medium">{formatPercentage(dailyChange?.percent_change || 0)}</span>
                                <span className="text-gray-500">Today</span>
                            </motion.div>
                            
                            <span className="text-gray-600">|</span>
                            
                            {/* Weekly Change */}
                            <motion.div 
                                className={`flex items-center space-x-1 ${weeklyChange?.percent_change > 0 ? 'text-green-400' : weeklyChange?.percent_change < 0 ? 'text-red-400' : 'text-gray-400'}`}
                                whileHover={{ scale: 1.05 }}
                            >
                                {weeklyChange?.percent_change > 0 ? (
                                    <ArrowUp className="w-3 h-3" />
                                ) : weeklyChange?.percent_change < 0 ? (
                                    <ArrowDown className="w-3 h-3" />
                                ) : null}
                                <span className="font-medium">{formatPercentage(weeklyChange?.percent_change || 0)}</span>
                                <span className="text-gray-500">Week</span>
                            </motion.div>
                        </motion.div>
                    )}
                </div>
            </div>

            {/* Sparkline visualization */}
            {isVisible && (
                <motion.div 
                    className="hidden lg:flex items-center h-8 w-16 relative"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.2 }}
                >
                    <svg className="w-full h-full" viewBox="0 0 64 32">
                        <motion.path
                            d="M 0,20 Q 16,10 32,15 T 64,5"
                            fill="none"
                            stroke="url(#sparkline-gradient)"
                            strokeWidth="2"
                            initial={{ pathLength: 0 }}
                            animate={{ pathLength: 1 }}
                            transition={{ duration: 1, delay: 0.3 }}
                        />
                        <defs>
                            <linearGradient id="sparkline-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                <stop offset="0%" stopColor="#60A5FA" />
                                <stop offset="100%" stopColor="#C084FC" />
                            </linearGradient>
                        </defs>
                    </svg>
                </motion.div>
            )}
        </motion.div>
    );
});
PortfolioBalance.displayName = 'PortfolioBalance';

const Navbar = () => {
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isQuickActionsOpen, setIsQuickActionsOpen] = useState(true);
    const [scrolledDown, setScrolledDown] = useState(false);
    const [showNotifications, setShowNotifications] = useState(false);
    const [unreadNotifications, setUnreadNotifications] = useState(3);
    const [balanceVisible, setBalanceVisible] = useState(false);
    const [marketDataStatus, setMarketDataStatus] = useState({ status: 'loading', lastUpdate: null });
    const [showMarketDataModal, setShowMarketDataModal] = useState(false);

    // Get auth context - properly destructure loading state
    const { user, logout, loading: authLoading } = useContext(AuthContext);
    const router = useRouter();

    // Portfolio data state
    const [portfolioData, setPortfolioData] = useState(null);
    const [isLoadingPortfolio, setIsLoadingPortfolio] = useState(false);
    const [portfolioError, setPortfolioError] = useState(null);

    // Account fetching state
    const [accounts, setAccounts] = useState([]);
    const [isLoadingAccounts, setIsLoadingAccounts] = useState(false);
    const [accountError, setAccountError] = useState(null);

    // Debug logging
    useEffect(() => {
        console.log('[Navbar] Auth state:', { user, authLoading });
    }, [user, authLoading]);

    // Fetch portfolio data
    const loadPortfolioData = useCallback(async () => {
        if (!user || authLoading) {
            setPortfolioData(null);
            return;
        }

        setIsLoadingPortfolio(true);
        setPortfolioError(null);

        try {
            const response = await fetchWithAuth('/portfolio/snapshots?timeframe=1w&include_cost_basis=true');
            if (!response.ok) throw new Error('Failed to fetch portfolio data');
            
            const data = await response.json();
            setPortfolioData(data);
            
            // Update market data status
            setMarketDataStatus({
                status: 'connected',
                lastUpdate: data.last_updated || new Date().toISOString()
            });
        } catch (error) {
            console.error('Error fetching portfolio:', error);
            setPortfolioError(error.message);
            setMarketDataStatus({ status: 'error', lastUpdate: null });
        } finally {
            setIsLoadingPortfolio(false);
        }
    }, [user, authLoading]);

    // Load portfolio data when user changes
    useEffect(() => {
        if (user && !authLoading) {
            loadPortfolioData();
        }
    }, [user, authLoading, loadPortfolioData]);

    // Load accounts
    const loadAccounts = useCallback(async () => {
        if (!user || authLoading) {
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
    }, [user, authLoading]);

    useEffect(() => {
        if (!authLoading) {
            loadAccounts();
        }
    }, [loadAccounts, authLoading]);

    // Handle scroll events
    useEffect(() => {
        const handleScroll = () => {
            setScrolledDown(window.scrollY > 10);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Close dropdowns when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            const userDropdown = event.target.closest('.user-dropdown');
            if (isDropdownOpen && !userDropdown) {
                const userDropdownButton = event.target.closest('.user-dropdown-button');
                if (!userDropdownButton) {
                    setIsDropdownOpen(false);
                }
            }
            
            const notificationDropdown = event.target.closest('.notification-dropdown');
            if (showNotifications && !notificationDropdown) {
                const notificationButton = event.target.closest('.notification-button');
                if (!notificationButton) {
                    setShowNotifications(false);
                }
            }

            const marketDataModal = event.target.closest('.market-data-modal');
            if (showMarketDataModal && !marketDataModal) {
                const marketDataButton = event.target.closest('.market-data-button');
                if (!marketDataButton) {
                    setShowMarketDataModal(false);
                }
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isDropdownOpen, showNotifications, showMarketDataModal]);

    // Format market data status
    const getMarketStatusDisplay = () => {
        if (marketDataStatus.status === 'loading') {
            return { icon: <Loader2 className="w-4 h-4 animate-spin" />, text: 'Checking...', color: 'text-gray-400' };
        } else if (marketDataStatus.status === 'connected') {
            const lastUpdate = marketDataStatus.lastUpdate ? new Date(marketDataStatus.lastUpdate) : new Date();
            const minutesAgo = Math.floor((new Date() - lastUpdate) / 60000);
            return {
                icon: <Activity className="w-4 h-4" />,
                text: minutesAgo < 1 ? 'Live' : `${minutesAgo}m ago`,
                color: 'text-green-400'
            };
        } else {
            return { icon: <AlertCircle className="w-4 h-4" />, text: 'Offline', color: 'text-red-400' };
        }
    };

    const marketStatus = getMarketStatusDisplay();

    const dropdownItems = [
        { icon: <User className="w-5 h-5 mr-2" />, label: "Profile", href: "/profile" },
        { icon: <Shield className="w-5 h-5 mr-2" />, label: "Admin", href: "/admin" },
        { icon: <Settings className="w-5 h-5 mr-2" />, label: "Settings", href: "/settings" },
        { icon: <Clock className="w-5 h-5 mr-2" />, label: "Scheduler", href: "/scheduler" },
        { icon: <HelpCircle className="w-5 h-5 mr-2" />, label: "Help", href: "/help" },
        {
            icon: <LogOut className="w-5 h-5 mr-2 text-red-500" />,
            label: "Logout",
            action: logout,
            className: "text-red-500 border-t border-gray-200 mt-2 pt-2"
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

    // Mock notifications
    const notifications = [
        { id: 1, title: "Portfolio Update", message: "Your portfolio increased by 2.3% today", time: "5 minutes ago", isNew: true, type: 'success' },
        { id: 2, title: "Market Alert", message: "AAPL reached your price target", time: "1 hour ago", isNew: true, type: 'alert' },
        { id: 3, title: "Account Sync", message: "Vanguard account synced successfully", time: "3 hours ago", isNew: true, type: 'info' },
        { id: 4, title: "Weekly Report", message: "Your weekly performance report is ready", time: "Yesterday", isNew: false, type: 'info' },
    ];

    const placeholderFetchPositions = () => {
        console.warn('Navbar: fetchPositions function is not implemented');
    };
    const placeholderFetchPortfolioSummary = () => {
        console.warn('Navbar: fetchPortfolioSummary function is not implemented');
    };

    // Determine if bulk actions should be disabled
    const bulkDisabled = isLoadingAccounts || accountError || !accounts || accounts.length === 0;
    const bulkTitle = isLoadingAccounts ? "Loading accounts..."
                    : accountError ? accountError
                    : (!accounts || accounts.length === 0) ? "Add an account first"
                    : "Bulk upload positions";

    // Always render the navbar structure, but conditionally show content based on auth state
    return (
        <div className="sticky top-0 z-40">
            {/* Main Navbar */}
            <nav className={`${scrolledDown ? 'bg-gray-900/95 shadow-lg backdrop-blur-md' : 'bg-gradient-to-r from-gray-900 to-blue-900'} transition-all duration-300`}>
                <div className="container mx-auto px-4">
                    <div className="h-16 flex justify-between items-center">
                        {/* Logo and App Name - Always visible */}
                        <div className="flex items-center">
                            <Link href="/" className="flex items-center group">
                                <div className={`mr-3 ${scrolledDown ? '' : 'animate-pulse'} group-hover:scale-105 transition-transform`}>
                                    <EggLogo />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-xl font-bold text-white group-hover:text-blue-300 transition-colors">NestEgg</span>
                                    <span className="text-xs text-blue-300">Plan Your Future</span>
                                </div>
                            </Link>
                        </div>

                        {/* Show loading state while auth is being checked */}
                        {authLoading ? (
                            <div className="flex items-center space-x-2">
                                <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
                                <span className="text-sm text-gray-300">Loading...</span>
                            </div>
                        ) : user ? (
                            <>
                                {/* Center: Quick Actions */}
                                <div className="hidden md:flex items-center space-x-4">
                                    <div className="flex items-center">
                                        <AnimatePresence mode="wait">
                                            {isQuickActionsOpen && (
                                                <motion.div 
                                                    className="flex space-x-4 items-center"
                                                    initial={{ opacity: 0, width: 0 }}
                                                    animate={{ opacity: 1, width: 'auto' }}
                                                    exit={{ opacity: 0, width: 0 }}
                                                    transition={{ duration: 0.3 }}
                                                >
                                                    <AddAccountButton
                                                        onAccountAdded={loadAccounts}
                                                        className="flex items-center text-white py-1 px-4 transition-all group hover:bg-blue-800/30 rounded-lg"
                                                    />
                                                    <AddPositionButton
                                                        onPositionAdded={placeholderFetchPositions}
                                                        className="flex items-center text-white py-1 px-4 transition-all group hover:bg-blue-800/30 rounded-lg"
                                                    />
                                                    <BulkPositionButton
                                                        accounts={accounts}
                                                        fetchAccounts={loadAccounts}
                                                        fetchPositions={placeholderFetchPositions}
                                                        fetchPortfolioSummary={placeholderFetchPortfolioSummary}
                                                        className="flex items-center text-white py-1 px-4 transition-all group hover:bg-blue-800/30 rounded-lg"
                                                        buttonIcon={
                                                            isLoadingAccounts ? <Loader2 className="w-6 h-6 mr-2 text-white animate-spin" />
                                                            : accountError ? <AlertCircle className="w-6 h-6 mr-2 text-red-400" />
                                                            : <Upload className="w-6 h-6 mr-2 text-white group-hover:text-blue-300" />
                                                        }
                                                        buttonText={
                                                           <span className={`text-sm ${accountError ? 'text-red-300' : 'text-gray-200 group-hover:text-white'}`}>Bulk Upload</span>
                                                        }
                                                        disabled={bulkDisabled}
                                                        title={bulkTitle}
                                                    />
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                        <motion.button
                                            onClick={() => setIsQuickActionsOpen(!isQuickActionsOpen)}
                                            className="text-white p-2 hover:bg-blue-800/30 rounded-lg transition-all ml-2"
                                            whileHover={{ scale: 1.05 }}
                                            whileTap={{ scale: 0.95 }}
                                        >
                                            <motion.div
                                                animate={{ rotate: isQuickActionsOpen ? 0 : 180 }}
                                                transition={{ duration: 0.3 }}
                                            >
                                                {isQuickActionsOpen ? <ChevronLeft className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                                            </motion.div>
                                        </motion.button>
                                    </div>

                                    {/* Portfolio Balance - Right of Actions */}
                                    <div className="ml-6">
                                        <PortfolioBalance
                                            balance={portfolioData?.current_value || 0}
                                            dailyChange={portfolioData?.period_changes?.['1d']}
                                            weeklyChange={portfolioData?.period_changes?.['1w']}
                                            isVisible={balanceVisible}
                                            onToggleVisibility={() => setBalanceVisible(!balanceVisible)}
                                            isLoading={isLoadingPortfolio}
                                            error={portfolioError}
                                        />
                                    </div>
                                </div>

                                {/* Right: Notifications and Profile */}
                                <div className="hidden md:flex items-center space-x-4">
                                    {/* Notifications */}
                                    <div className="relative notification-dropdown">
                                        <motion.button
                                            className="text-gray-300 hover:text-white relative p-2 rounded-full hover:bg-gray-800/50 transition-all notification-button"
                                            onClick={() => setShowNotifications(!showNotifications)}
                                            whileHover={{ scale: 1.05 }}
                                            whileTap={{ scale: 0.95 }}
                                            aria-haspopup="true"
                                            aria-expanded={showNotifications}
                                        >
                                            <Bell className="w-6 h-6" />
                                            {unreadNotifications > 0 && (
                                                <motion.span 
                                                    className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center"
                                                    initial={{ scale: 0 }}
                                                    animate={{ scale: 1 }}
                                                    transition={{ type: "spring", stiffness: 500, damping: 15 }}
                                                >
                                                    {unreadNotifications}
                                                </motion.span>
                                            )}
                                        </motion.button>
                                        
                                        <AnimatePresence>
                                            {showNotifications && (
                                                <motion.div 
                                                    className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl overflow-hidden z-20"
                                                    initial={{ opacity: 0, y: -20, scale: 0.95 }}
                                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                                    exit={{ opacity: 0, y: -20, scale: 0.95 }}
                                                    transition={{ duration: 0.2 }}
                                                >
                                                    <div className="bg-gradient-to-r from-blue-700 to-blue-600 p-3 text-white border-b border-blue-500">
                                                        <div className="flex justify-between items-center">
                                                            <h3 className="font-medium flex items-center">
                                                                <Bell className="w-4 h-4 mr-2" />
                                                                Notifications
                                                            </h3>
                                                            <button className="text-blue-200 hover:text-white text-xs">Mark all as read</button>
                                                        </div>
                                                    </div>
                                                    <div className="max-h-96 overflow-y-auto">
                                                        {notifications.map((notification, index) => (
                                                            <motion.div
                                                                key={notification.id}
                                                                initial={{ opacity: 0, x: -20 }}
                                                                animate={{ opacity: 1, x: 0 }}
                                                                transition={{ delay: index * 0.05 }}
                                                                className={`p-3 border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer ${notification.isNew ? 'bg-blue-50' : ''}`}
                                                            >
                                                                <div className="flex items-start space-x-3">
                                                                    <div className={`w-2 h-2 rounded-full mt-1.5 ${
                                                                        notification.type === 'success' ? 'bg-green-500' :
                                                                        notification.type === 'alert' ? 'bg-amber-500' :
                                                                        'bg-blue-500'
                                                                    }`} />
                                                                    <div className="flex-1">
                                                                        <div className="flex justify-between">
                                                                            <h4 className="font-medium text-gray-900">{notification.title}</h4>
                                                                            <span className="text-xs text-gray-500">{notification.time}</span>
                                                                        </div>
                                                                        <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
                                                                    </div>
                                                                </div>
                                                            </motion.div>
                                                        ))}
                                                    </div>
                                                    <div className="p-2 text-center bg-gray-50 border-t border-gray-100">
                                                        <Link
                                                            href="/notifications"
                                                            onClick={() => setShowNotifications(false)}
                                                            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                                                        >
                                                            View all notifications
                                                        </Link>
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>

                                    {/* User Dropdown */}
                                    <div className="relative user-dropdown">
                                        <motion.button
                                            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                            className="flex items-center space-x-2 hover:bg-blue-800/30 p-2 rounded-lg transition-all text-white user-dropdown-button"
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                            aria-expanded={isDropdownOpen}
                                            aria-haspopup="true"
                                        >
                                            <motion.div 
                                                className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white shadow-lg"
                                                whileHover={{ rotate: [0, -5, 5, 0] }}
                                                transition={{ duration: 0.5 }}
                                            >
                                                {getInitials()}
                                            </motion.div>
                                            <span className="text-sm font-medium">{displayName}</span>
                                            <ChevronRight className={`w-4 h-4 transition-transform ${isDropdownOpen ? 'rotate-90' : ''}`} />
                                        </motion.button>
                                        
                                        <AnimatePresence>
                                            {isDropdownOpen && (
                                                <motion.div 
                                                    className="absolute right-0 mt-2 w-72 bg-white rounded-lg shadow-xl z-20 overflow-hidden"
                                                    initial={{ opacity: 0, y: -20, scale: 0.95 }}
                                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                                    exit={{ opacity: 0, y: -20, scale: 0.95 }}
                                                    transition={{ duration: 0.2 }}
                                                >
                                                    <div className="bg-gradient-to-br from-blue-600 to-purple-700 p-4">
                                                        <div className="flex items-center space-x-3">
                                                            <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white text-xl font-bold">
                                                                {getInitials()}
                                                            </div>
                                                            <div>
                                                                <p className="font-medium text-lg text-white">{displayName}</p>
                                                                <p className="text-sm text-blue-100 truncate">{user.email}</p>
                                                            </div>
                                                        </div>
                                                        
                                                        {/* Market Data Status in Dropdown */}
                                                        <motion.button
                                                            onClick={() => setShowMarketDataModal(true)}
                                                            className="mt-3 w-full flex items-center justify-between bg-white/10 backdrop-blur-sm rounded-lg px-3 py-2 hover:bg-white/20 transition-colors market-data-button"
                                                            whileHover={{ scale: 1.02 }}
                                                            whileTap={{ scale: 0.98 }}
                                                        >
                                                            <div className="flex items-center space-x-2">
                                                                <Database className="w-4 h-4 text-white/70" />
                                                                <span className="text-sm text-white/90">Market Data</span>
                                                            </div>
                                                            <div className="flex items-center space-x-2">
                                                                <div className={`flex items-center space-x-1 ${marketStatus.color}`}>
                                                                    {marketStatus.icon}
                                                                    <span className="text-xs font-medium">{marketStatus.text}</span>
                                                                </div>
                                                                <ExternalLink className="w-3 h-3 text-white/50" />
                                                            </div>
                                                        </motion.button>
                                                    </div>
                                                    
                                                    <div className="py-1">
                                                        {dropdownItems.map((item, index) => (
                                                            <motion.div
                                                                key={index}
                                                                initial={{ opacity: 0, x: -20 }}
                                                                animate={{ opacity: 1, x: 0 }}
                                                                transition={{ delay: index * 0.05 }}
                                                            >
                                                                {item.action ? (
                                                                    <button
                                                                        onClick={() => { 
                                                                            item.action(); 
                                                                            setIsDropdownOpen(false); 
                                                                        }}
                                                                        className={`flex w-full items-center px-4 py-3 hover:bg-gray-100 transition-colors text-left text-gray-800 ${item.className || ''}`}
                                                                    >
                                                                        {item.icon}
                                                                        {item.label}
                                                                    </button>
                                                                ) : (
                                                                    <Link
                                                                        href={item.href}
                                                                        onClick={() => setIsDropdownOpen(false)}
                                                                        className={`flex items-center px-4 py-3 hover:bg-gray-100 transition-colors text-gray-800 ${item.className || ''}`}
                                                                    >
                                                                        {item.icon}
                                                                        {item.label}
                                                                    </Link>
                                                                )}
                                                            </motion.div>
                                                        ))}
                                                    </div>
                                                    
                                                    {/* Quick Stats in Dropdown */}
                                                    <div className="p-3 bg-gray-50 border-t border-gray-200">
                                                        <div className="grid grid-cols-2 gap-3 text-xs">
                                                            <motion.div 
                                                                className="bg-white rounded-lg p-2 text-center cursor-pointer hover:shadow-md transition-shadow"
                                                                whileHover={{ scale: 1.05 }}
                                                                onClick={() => { router.push('/accounts'); setIsDropdownOpen(false); }}
                                                            >
                                                                <Briefcase className="w-4 h-4 mx-auto text-blue-500 mb-1" />
                                                                <p className="text-gray-500">Accounts</p>
                                                                <p className="font-semibold text-gray-900">{accounts.length || 0}</p>
                                                            </motion.div>
                                                            <motion.div 
                                                                className="bg-white rounded-lg p-2 text-center cursor-pointer hover:shadow-md transition-shadow"
                                                                whileHover={{ scale: 1.05 }}
                                                                onClick={() => { router.push('/positions'); setIsDropdownOpen(false); }}
                                                            >
                                                                <Calculator className="w-4 h-4 mx-auto text-green-500 mb-1" />
                                                                <p className="text-gray-500">Positions</p>
                                                                <p className="font-semibold text-gray-900">{portfolioData?.position_count || 0}</p>
                                                            </motion.div>
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                </div>

                                {/* Mobile Menu Button */}
                                <button
                                    className="md:hidden text-white focus:outline-none"
                                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                                    aria-label="Toggle menu"
                                >
                                    <motion.div
                                        animate={isMobileMenuOpen ? "open" : "closed"}
                                        variants={{
                                            open: { rotate: 180 },
                                            closed: { rotate: 0 }
                                        }}
                                        transition={{ duration: 0.3 }}
                                    >
                                        {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                                    </motion.div>
                                </button>
                            </>
                        ) : (
                            /* Non-Authenticated Links */
                            <div className="flex items-center space-x-4">
                                <Link 
                                    href="/login" 
                                    className="text-gray-300 hover:text-white transition-colors font-medium"
                                >
                                    Login
                                </Link>
                                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                                    <Link
                                        href="/signup"
                                        className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-4 py-2 rounded-lg transition-all shadow-md hover:shadow-lg font-medium"
                                    >
                                        Sign up
                                    </Link>
                                </motion.div>
                            </div>
                        )}
                    </div>
                </div>
            </nav>

            {/* Market Data Modal/Popout */}
            <AnimatePresence>
                {showMarketDataModal && (
                    <>
                        <motion.div
                            className="fixed inset-0 bg-black/50 z-40"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowMarketDataModal(false)}
                        />
                        <motion.div
                            className="fixed inset-x-4 top-20 md:inset-x-auto md:right-8 md:left-auto md:w-96 bg-white rounded-lg shadow-2xl z-50 market-data-modal"
                            initial={{ opacity: 0, scale: 0.9, y: -20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: -20 }}
                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        >
                            <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-4 rounded-t-lg">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-lg font-semibold text-white flex items-center">
                                        <Database className="w-5 h-5 mr-2" />
                                        Market Data Status
                                    </h3>
                                    <button
                                        onClick={() => setShowMarketDataModal(false)}
                                        className="text-white/80 hover:text-white transition-colors"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                            
                            <div className="p-6">
                                {/* Connection Status */}
                                <div className="flex items-center justify-between mb-6">
                                    <span className="text-gray-700 font-medium">Connection Status</span>
                                    <div className={`flex items-center space-x-2 ${marketStatus.color}`}>
                                        {marketStatus.icon}
                                        <span className="font-medium">{marketStatus.text}</span>
                                    </div>
                                </div>
                                
                                {/* Data Sources */}
                                <div className="space-y-4">
                                    <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Data Sources</h4>
                                    
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                            <div className="flex items-center space-x-3">
                                                <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                                                    <Activity className="w-4 h-4 text-purple-600" />
                                                </div>
                                                <div>
                                                    <p className="font-medium text-gray-900">Yahoo Finance</p>
                                                    <p className="text-xs text-gray-500">Primary Source</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center space-x-1 text-green-500">
                                                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                                                <span className="text-xs font-medium">Active</span>
                                            </div>
                                        </div>
                                        
                                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                            <div className="flex items-center space-x-3">
                                                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                                    <BarChart4 className="w-4 h-4 text-blue-600" />
                                                </div>
                                                <div>
                                                    <p className="font-medium text-gray-900">Alpha Vantage</p>
                                                    <p className="text-xs text-gray-500">Backup Source</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center space-x-1 text-gray-400">
                                                <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                                                <span className="text-xs font-medium">Standby</span>
                                            </div>
                                        </div>
                                        
                                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                            <div className="flex items-center space-x-3">
                                                <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center">
                                                    <LineChart className="w-4 h-4 text-amber-600" />
                                                </div>
                                                <div>
                                                    <p className="font-medium text-gray-900">Polygon.io</p>
                                                    <p className="text-xs text-gray-500">Real-time Data</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center space-x-1 text-amber-500">
                                                <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
                                                <span className="text-xs font-medium">Limited</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                
                                {/* Last Update Info */}
                                <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                                    <div className="flex items-start space-x-3">
                                        <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                                        <div className="text-sm text-blue-900">
                                            <p className="font-medium mb-1">Update Information</p>
                                            <p className="text-blue-700">
                                                {marketDataStatus.lastUpdate 
                                                    ? `Last successful update: ${new Date(marketDataStatus.lastUpdate).toLocaleString()}`
                                                    : 'No recent updates available'
                                                }
                                            </p>
                                        </div>
                                    </div>
                                </div>
                                
                                {/* Actions */}
                                <div className="mt-6 flex space-x-3">
                                    <motion.button
                                        className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={() => {
                                            loadPortfolioData();
                                            setShowMarketDataModal(false);
                                        }}
                                    >
                                        <RefreshCw className="w-4 h-4" />
                                        <span>Refresh Data</span>
                                    </motion.button>
                                    <motion.button
                                        className="flex-1 bg-gray-200 text-gray-700 py-2 px-4 rounded-lg font-medium hover:bg-gray-300 transition-colors"
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={() => setShowMarketDataModal(false)}
                                    >
                                        Close
                                    </motion.button>
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* Mobile Menu */}
            <AnimatePresence>
                {isMobileMenuOpen && user && (
                    <motion.div 
                        className="md:hidden bg-gray-900 text-white border-t border-gray-800"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                    >
                        <div className="p-4 space-y-3">
                            {/* Mobile User Info */}
                            <div className="flex items-center justify-between border-b border-gray-800 pb-3">
                                <div className="flex items-center">
                                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white mr-3">
                                        {getInitials()}
                                    </div>
                                    <div>
                                        <div className="font-medium">{displayName}</div>
                                        <div className="text-xs text-gray-400">{user.email}</div>
                                    </div>
                                </div>
                            </div>
                            
                            {/* Mobile Portfolio Balance */}
                            {portfolioData && (
                                <div className="py-3 border-b border-gray-800">
                                    <PortfolioBalance
                                        balance={portfolioData.current_value || 0}
                                        dailyChange={portfolioData.period_changes?.['1d']}
                                        weeklyChange={portfolioData.period_changes?.['1w']}
                                        isVisible={balanceVisible}
                                        onToggleVisibility={() => setBalanceVisible(!balanceVisible)}
                                        isLoading={isLoadingPortfolio}
                                        error={portfolioError}
                                    />
                                </div>
                            )}
                            
                            {/* Mobile Menu Items */}
                            <div className="space-y-2 py-2">
                                {dropdownItems.map((item, index) => (
                                    <motion.div
                                        key={index}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: index * 0.05 }}
                                    >
                                        {item.action ? (
                                            <button
                                                onClick={() => {
                                                    setIsMobileMenuOpen(false);
                                                    item.action();
                                                }}
                                                className={`flex w-full items-center p-3 hover:bg-gray-800 rounded-lg transition-colors ${item.className || ''}`}
                                            >
                                                {item.icon}
                                                {item.label}
                                            </button>
                                        ) : (
                                            <Link
                                                href={item.href}
                                                className={`flex items-center p-3 hover:bg-gray-800 rounded-lg transition-colors ${item.className || ''}`}
                                                onClick={() => setIsMobileMenuOpen(false)}
                                            >
                                                {item.icon}
                                                {item.label}
                                            </Link>
                                        )}
                                    </motion.div>
                                ))}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Mobile Quick Actions Bar (Fixed) */}
            {user && !authLoading && (
                <motion.div 
                    className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-blue-900 border-t border-blue-800 shadow-lg"
                    initial={{ y: 100 }}
                    animate={{ y: 0 }}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                >
                    <div className="grid grid-cols-3 text-center">
                        <AddAccountButton
                            className="flex flex-col items-center justify-center py-3 text-white group w-full hover:bg-blue-800 transition-colors"
                            onAccountAdded={loadAccounts}
                        />
                        <AddPositionButton
                            className="flex flex-col items-center justify-center py-3 text-white group w-full hover:bg-blue-800 transition-colors"
                            onPositionAdded={placeholderFetchPositions}
                        />
                        <BulkPositionButton
                            accounts={accounts}
                            fetchAccounts={loadAccounts}
                            fetchPositions={placeholderFetchPositions}
                            fetchPortfolioSummary={placeholderFetchPortfolioSummary}
                            className="flex flex-col items-center justify-center py-3 text-white group w-full hover:bg-blue-800 transition-colors"
                            buttonIcon={
                                isLoadingAccounts ? <Loader2 className="h-6 w-6 mb-1 text-white animate-spin" />
                                : accountError ? <AlertCircle className="h-6 w-6 mb-1 text-red-400" />
                                : <Upload className="h-6 w-6 mb-1 text-white group-hover:text-blue-300" />
                            }
                            buttonText={
                                <span className={`text-xs ${accountError ? 'text-red-300' : 'text-gray-200 group-hover:text-white'}`}>Bulk Upload</span>
                            }
                            disabled={bulkDisabled}
                            title={bulkTitle}
                        />
                    </div>
                </motion.div>
            )}
        </div>
    );
};

export default Navbar;