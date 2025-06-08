import { useState, useContext, useEffect, useCallback, memo, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { motion, AnimatePresence, useMotionValue, useTransform, useSpring } from 'framer-motion';
import { AuthContext } from '@/context/AuthContext';
import {
    User, Settings, LogOut, HelpCircle, Bell, ChartLine,
    PlusCircle, Shield, Clock, Menu, X, LineChart, BarChart4,
    ChevronLeft, ChevronRight, Upload, Loader2, AlertCircle,
    Wallet, TrendingUp, Activity, Zap, Star, Moon, Sun,
    Command, Search, Home, PieChart, DollarSign, Globe,
    ArrowUpRight, ArrowDownRight, Sparkles, Cpu, Lock,
    CheckCircle, XCircle, Info, ChevronDown, Layers,
    Database, RefreshCw, Eye, EyeOff, Bitcoin, Gem
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
                width="40"
                height="40"
                viewBox="0 0 40 40"
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
                    d="M20 4C14 4 8 14 8 24C8 32 13 36 20 36C27 36 32 32 32 24C32 14 26 4 20 4Z"
                    fill="url(#eggGradient)"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    filter={isHovered ? "url(#glow)" : ""}
                    animate={isHovered ? { strokeWidth: 2 } : { strokeWidth: 1.5 }}
                />
                <motion.circle 
                    cx="16" 
                    cy="18" 
                    r="2" 
                    fill="#1E3A8A"
                    animate={isHovered ? { scale: [1, 1.2, 1] } : {}}
                    transition={{ duration: 0.3 }}
                />
                <motion.circle 
                    cx="24" 
                    cy="18" 
                    r="2" 
                    fill="#1E3A8A"
                    animate={isHovered ? { scale: [1, 1.2, 1] } : {}}
                    transition={{ duration: 0.3, delay: 0.1 }}
                />
                <motion.path 
                    d="M16 26C17.5 27.5 22.5 27.5 24 26" 
                    stroke="#1E3A8A" 
                    strokeWidth="2" 
                    strokeLinecap="round"
                    animate={isHovered ? { d: "M16 26C17.5 28.5 22.5 28.5 24 26" } : {}}
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

// Market ticker component
const MarketTicker = memo(() => {
    const [marketData, setMarketData] = useState([
        { symbol: 'SPY', price: 456.32, change: 1.24, isUp: true },
        { symbol: 'QQQ', price: 384.56, change: -0.45, isUp: false },
        { symbol: 'BTC', price: 68420, change: 3.45, isUp: true },
        { symbol: 'ETH', price: 3842, change: 2.13, isUp: true }
    ]);

    return (
        <div className="hidden lg:flex items-center space-x-6 text-sm">
            {marketData.map((item, index) => (
                <motion.div
                    key={item.symbol}
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-center space-x-2"
                >
                    <span className="text-gray-400">{item.symbol}</span>
                    <span className="text-white font-medium">${item.price.toLocaleString()}</span>
                    <div className={`flex items-center ${item.isUp ? 'text-green-400' : 'text-red-400'}`}>
                        {item.isUp ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                        <span>{Math.abs(item.change)}%</span>
                    </div>
                </motion.div>
            ))}
        </div>
    );
});
MarketTicker.displayName = 'MarketTicker';

// Enhanced Search Bar
const SearchBar = memo(() => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const searchRef = useRef(null);

    // Mock search results
    const mockResults = [
        { type: 'position', icon: <LineChart className="w-4 h-4" />, title: 'AAPL', subtitle: 'Apple Inc.' },
        { type: 'account', icon: <Wallet className="w-4 h-4" />, title: 'Retirement Account', subtitle: 'Vanguard' },
        { type: 'action', icon: <PlusCircle className="w-4 h-4" />, title: 'Add New Position', subtitle: 'Quick action' }
    ];

    useEffect(() => {
        if (searchQuery) {
            setSearchResults(mockResults.filter(item => 
                item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                item.subtitle.toLowerCase().includes(searchQuery.toLowerCase())
            ));
        } else {
            setSearchResults([]);
        }
    }, [searchQuery]);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                setIsOpen(true);
                searchRef.current?.focus();
            }
            if (e.key === 'Escape') {
                setIsOpen(false);
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, []);

    return (
        <>
            <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsOpen(true)}
                className="hidden md:flex items-center space-x-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl backdrop-blur-sm transition-all group"
            >
                <Search className="w-4 h-4 text-gray-300 group-hover:text-white" />
                <span className="text-gray-300 group-hover:text-white text-sm">Search...</span>
                <div className="flex items-center space-x-1 ml-8">
                    <kbd className="px-2 py-1 bg-white/10 rounded text-xs text-gray-400">⌘</kbd>
                    <kbd className="px-2 py-1 bg-white/10 rounded text-xs text-gray-400">K</kbd>
                </div>
            </motion.button>

            <AnimatePresence>
                {isOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
                            onClick={() => setIsOpen(false)}
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
                                        ref={searchRef}
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder="Search positions, accounts, or actions..."
                                        className="flex-1 bg-transparent outline-none text-white placeholder-gray-400"
                                        autoFocus
                                    />
                                    <button
                                        onClick={() => setIsOpen(false)}
                                        className="text-gray-400 hover:text-white"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                            
                            {searchResults.length > 0 && (
                                <div className="p-2 max-h-96 overflow-y-auto">
                                    {searchResults.map((result, index) => (
                                        <motion.div
                                            key={index}
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: index * 0.05 }}
                                            className="flex items-center space-x-3 p-3 hover:bg-white/10 rounded-lg cursor-pointer group"
                                        >
                                            <div className="p-2 bg-white/10 rounded-lg group-hover:bg-white/20">
                                                {result.icon}
                                            </div>
                                            <div className="flex-1">
                                                <p className="text-white font-medium">{result.title}</p>
                                                <p className="text-gray-400 text-sm">{result.subtitle}</p>
                                            </div>
                                            <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-white" />
                                        </motion.div>
                                    ))}
                                </div>
                            )}
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </>
    );
});
SearchBar.displayName = 'SearchBar';

const Navbar = () => {
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isQuickActionsOpen, setIsQuickActionsOpen] = useState(true);
    const [scrolledDown, setScrolledDown] = useState(false);
    const [showNotifications, setShowNotifications] = useState(false);
    const [unreadNotifications, setUnreadNotifications] = useState(3);
    const [isDarkMode, setIsDarkMode] = useState(true);
    const [portfolioValue, setPortfolioValue] = useState(null);
    const [dayChange, setDayChange] = useState(null);

    const { user, logout } = useContext(AuthContext);
    const router = useRouter();

    // Mouse parallax effect
    const mouseX = useMotionValue(0);
    const mouseY = useMotionValue(0);
    const navbarRef = useRef(null);

    const parallaxX = useTransform(mouseX, [0, 1], [-10, 10]);
    const parallaxY = useTransform(mouseY, [0, 1], [-5, 5]);

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

    // Load portfolio value
    const loadPortfolioValue = useCallback(async () => {
        if (!user) return;
        try {
            const response = await fetchWithAuth('/portfolio/snapshots?timeframe=1d');
            const data = await response.json();
            setPortfolioValue(data.current_value);
            setDayChange(data.period_changes?.['1d']);
        } catch (error) {
            console.error("Error loading portfolio value:", error);
        }
    }, [user]);

    useEffect(() => {
        loadAccounts();
        loadPortfolioValue();
    }, [loadAccounts, loadPortfolioValue]);

    // Handle mouse move for parallax
    useEffect(() => {
        const handleMouseMove = (e) => {
            if (navbarRef.current) {
                const rect = navbarRef.current.getBoundingClientRect();
                const x = (e.clientX - rect.left) / rect.width;
                const y = (e.clientY - rect.top) / rect.height;
                mouseX.set(x);
                mouseY.set(y);
            }
        };

        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, [mouseX, mouseY]);

    // Handle scroll
    useEffect(() => {
        const handleScroll = () => {
            setScrolledDown(window.scrollY > 10);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Navigation items with enhanced styling
    const navItems = [
        { href: '/', label: 'Dashboard', icon: <Home className="w-4 h-4" /> },
        { href: '/portfolio', label: 'Portfolio', icon: <PieChart className="w-4 h-4" /> },
        { href: '/positions', label: 'Positions', icon: <LineChart className="w-4 h-4" /> },
        { href: '/accounts', label: 'Accounts', icon: <Wallet className="w-4 h-4" /> },
        { href: '/transactions', label: 'Transactions', icon: <DollarSign className="w-4 h-4" /> }
    ];

    const dropdownItems = [
        { icon: <User className="w-5 h-5" />, label: "Profile", href: "/profile" },
        { icon: <Shield className="w-5 h-5" />, label: "Admin", href: "/admin" },
        { icon: <Settings className="w-5 h-5" />, label: "Settings", href: "/settings" },
        { icon: <Clock className="w-5 h-5" />, label: "Activity", href: "/activity" },
        { icon: <HelpCircle className="w-5 h-5" />, label: "Help & Support", href: "/help" },
        { divider: true },
        {
            icon: <LogOut className="w-5 h-5 text-red-500" />,
            label: "Logout",
            action: logout,
            className: "text-red-500 hover:bg-red-50"
        }
    ];

    // Enhanced notifications with categories
    const notifications = [
        { 
            id: 1, 
            category: 'market',
            title: "Market Alert", 
            message: "AAPL reached your price target of $180", 
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
            category: 'portfolio',
            title: "Portfolio Milestone", 
            message: "Your portfolio crossed $100,000!", 
            time: "3 hours ago", 
            isNew: true,
            icon: <Star className="w-4 h-4 text-yellow-400" />
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

    const formatCurrency = (value) => {
        if (!value) return '$0.00';
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(value);
    };

    const formatPercentage = (value) => {
        if (!value) return '0.00%';
        return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
    };

    return (
        <motion.div 
            ref={navbarRef}
            className="sticky top-0 z-50"
            initial={{ y: -100 }}
            animate={{ y: 0 }}
            transition={{ type: "spring", stiffness: 100 }}
        >
            {/* Premium glass navbar */}
            <nav className={`
                ${scrolledDown 
                    ? 'bg-gray-900/95 backdrop-blur-xl shadow-2xl' 
                    : 'bg-gradient-to-r from-gray-900/90 via-blue-900/90 to-purple-900/90 backdrop-blur-md'
                } 
                transition-all duration-500 border-b border-white/10
            `}>
                {/* Market ticker bar */}
                {user && (
                    <div className="border-b border-white/10 bg-black/20">
                        <div className="container mx-auto px-4 py-2">
                            <MarketTicker />
                        </div>
                    </div>
                )}

                <div className="container mx-auto px-4">
                    <div className="h-20 flex justify-between items-center">
                        {/* Logo and Navigation */}
                        <div className="flex items-center space-x-8">
                            <Link href="/" className="flex items-center group">
                                <motion.div 
                                    className="mr-3"
                                    style={{ x: parallaxX, y: parallaxY }}
                                >
                                    <EggLogo />
                                </motion.div>
                                <div className="flex flex-col">
                                    <motion.span 
                                        className="text-2xl font-bold text-white"
                                        whileHover={{ scale: 1.05 }}
                                    >
                                        NestEgg
                                    </motion.span>
                                    <span className="text-xs text-blue-300">Grow Your Wealth</span>
                                </div>
                            </Link>

                            {/* Main Navigation */}
                            {user && (
                                <nav className="hidden lg:flex items-center space-x-1">
                                    {navItems.map((item, index) => {
                                        const isActive = router.pathname === item.href;
                                        return (
                                            <motion.div
                                                key={item.href}
                                                initial={{ opacity: 0, y: -20 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: index * 0.1 }}
                                            >
                                                <Link
                                                    href={item.href}
                                                    className={`
                                                        flex items-center space-x-2 px-4 py-2 rounded-xl
                                                        transition-all duration-300 relative group
                                                        ${isActive 
                                                            ? 'text-white bg-white/20' 
                                                            : 'text-gray-300 hover:text-white hover:bg-white/10'
                                                        }
                                                    `}
                                                >
                                                    <motion.div
                                                        whileHover={{ scale: 1.2, rotate: 360 }}
                                                        transition={{ duration: 0.3 }}
                                                    >
                                                        {item.icon}
                                                    </motion.div>
                                                    <span className="font-medium">{item.label}</span>
                                                    
                                                    {isActive && (
                                                        <motion.div
                                                            layoutId="activeTab"
                                                            className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-xl -z-10"
                                                            initial={false}
                                                            transition={{ type: "spring", stiffness: 300 }}
                                                        />
                                                    )}
                                                </Link>
                                            </motion.div>
                                        );
                                    })}
                                </nav>
                            )}
                        </div>

                        {/* Center Section */}
                        {user && (
                            <div className="hidden md:flex items-center space-x-4">
                                <SearchBar />
                                
                                {/* Portfolio Value Display */}
                                {portfolioValue && (
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        className="hidden xl:flex items-center space-x-4 px-4 py-2 bg-white/10 rounded-xl backdrop-blur-sm"
                                    >
                                        <div>
                                            <p className="text-xs text-gray-400">Portfolio Value</p>
                                            <p className="text-lg font-bold text-white">{formatCurrency(portfolioValue)}</p>
                                        </div>
                                        {dayChange && (
                                            <div className={`flex items-center ${dayChange.percent_change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                                {dayChange.percent_change >= 0 ? <ArrowUpRight /> : <ArrowDownRight />}
                                                <span className="font-medium">{formatPercentage(dayChange.percent_change)}</span>
                                            </div>
                                        )}
                                    </motion.div>
                                )}
                            </div>
                        )}

                        {/* Right Section */}
                        {user ? (
                            <div className="flex items-center space-x-4">
                                {/* Quick Actions */}
                                <AnimatePresence>
                                    {isQuickActionsOpen && (
                                        <motion.div
                                            initial={{ opacity: 0, width: 0 }}
                                            animate={{ opacity: 1, width: "auto" }}
                                            exit={{ opacity: 0, width: 0 }}
                                            className="hidden lg:flex items-center space-x-2"
                                        >
                                            <AddAccountButton
                                                onAccountAdded={loadAccounts}
                                                className="flex items-center px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:from-green-700 hover:to-emerald-700 transition-all shadow-lg hover:shadow-green-500/25 group"
                                            />
                                            <AddPositionButton
                                                onPositionAdded={() => {}}
                                                className="flex items-center px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg hover:shadow-blue-500/25 group"
                                            />
                                            <BulkPositionButton
                                                accounts={accounts}
                                                fetchAccounts={loadAccounts}
                                                fetchPositions={() => {}}
                                                fetchPortfolioSummary={() => {}}
                                                className="flex items-center px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:from-purple-700 hover:to-pink-700 transition-all shadow-lg hover:shadow-purple-500/25 group"
                                                disabled={isLoadingAccounts || accountError || !accounts || accounts.length === 0}
                                            />
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                <motion.button
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.9 }}
                                    onClick={() => setIsQuickActionsOpen(!isQuickActionsOpen)}
                                    className="hidden lg:block p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-all"
                                >
                                    {isQuickActionsOpen ? <ChevronLeft className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                                </motion.button>

                                {/* Theme Toggle */}
                                <motion.button
                                    whileHover={{ scale: 1.1, rotate: 180 }}
                                    whileTap={{ scale: 0.9 }}
                                    onClick={() => setIsDarkMode(!isDarkMode)}
                                    className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-all"
                                >
                                    {isDarkMode ? <Sun className="w-5 h-5 text-yellow-400" /> : <Moon className="w-5 h-5 text-blue-400" />}
                                </motion.button>

                                {/* Enhanced Notifications */}
                                <div className="relative">
                                    <motion.button
                                        whileHover={{ scale: 1.1 }}
                                        whileTap={{ scale: 0.9 }}
                                        className="relative p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-all"
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

                                {/* Enhanced User Menu */}
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
                                                                <Star className="w-4 h-4 text-yellow-400 mr-1" />
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
                        <div className="container mx-auto px-4 py-4">
                            {/* Mobile Navigation */}
                            <nav className="space-y-2 mb-4">
                                {navItems.map((item) => {
                                    const isActive = router.pathname === item.href;
                                    return (
                                        <Link
                                            key={item.href}
                                            href={item.href}
                                            onClick={() => setIsMobileMenuOpen(false)}
                                            className={`
                                                flex items-center space-x-3 px-4 py-3 rounded-xl
                                                ${isActive 
                                                    ? 'bg-white/20 text-white' 
                                                    : 'text-gray-300 hover:bg-white/10 hover:text-white'
                                                }
                                            `}
                                        >
                                            {item.icon}
                                            <span className="font-medium">{item.label}</span>
                                        </Link>
                                    );
                                })}
                            </nav>

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

            {/* Mobile Bottom Bar */}
            {user && (
                <motion.div
                    initial={{ y: 100 }}
                    animate={{ y: 0 }}
                    className="lg:hidden fixed bottom-0 left-0 right-0 bg-gray-900/95 backdrop-blur-xl border-t border-white/10 z-50"
                >
                    <div className="grid grid-cols-3 items-center">
                        <AddAccountButton
                            onAccountAdded={loadAccounts}
                            className="flex flex-col items-center justify-center py-4 text-white hover:bg-white/10 transition-all"
                        />
                        <AddPositionButton
                            onPositionAdded={() => {}}
                            className="flex flex-col items-center justify-center py-4 text-white hover:bg-white/10 transition-all border-x border-white/10"
                        />
                        <BulkPositionButton
                            accounts={accounts}
                            fetchAccounts={loadAccounts}
                            fetchPositions={() => {}}
                            fetchPortfolioSummary={() => {}}
                            className="flex flex-col items-center justify-center py-4 text-white hover:bg-white/10 transition-all"
                            disabled={isLoadingAccounts || accountError || !accounts || accounts.length === 0}
                        />
                    </div>
                </motion.div>
            )}
        </motion.div>
    );
};

export default Navbar;