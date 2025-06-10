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
    Wallet, PiggyBank, CreditCard, Info, ExternalLink,
    Layers, ChevronsLeft, ChevronsRight, ChevronDown,
    Home, FileText, Target, Award, Star, GitBranch,
    BarChart3, PieChart, TrendingUpIcon, Gem, Crown,
    Rocket, Flame, Brain, Lightbulb, Grid, Lock
} from 'lucide-react';
import { motion, AnimatePresence, useAnimation, useMotionValue, useTransform, useSpring } from 'framer-motion';
import UpdateStatusIndicator from '@/components/UpdateStatusIndicator';
import AddPositionButton from '@/components/AddPositionButton';
import AddAccountButton from '@/components/AddAccountButton';
import BulkPositionButton from '@/components/BulkPositionButton';
import { fetchAccounts } from '@/utils/apimethods/accountMethods';
import { fetchWithAuth } from '@/utils/api';

// Custom hook for magnetic effect
const useMagneticEffect = () => {
    const ref = useRef(null);
    const x = useMotionValue(0);
    const y = useMotionValue(0);

    useEffect(() => {
        const element = ref.current;
        if (!element) return;

        const handleMouseMove = (e) => {
            const rect = element.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;
            
            const distanceX = e.clientX - centerX;
            const distanceY = e.clientY - centerY;
            
            const maxDistance = 50;
            const distance = Math.sqrt(distanceX * distanceX + distanceY * distanceY);
            
            if (distance < maxDistance) {
                const force = (maxDistance - distance) / maxDistance;
                x.set(distanceX * force * 0.3);
                y.set(distanceY * force * 0.3);
            } else {
                x.set(0);
                y.set(0);
            }
        };

        const handleMouseLeave = () => {
            x.set(0);
            y.set(0);
        };

        window.addEventListener('mousemove', handleMouseMove);
        element.addEventListener('mouseleave', handleMouseLeave);

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            element.removeEventListener('mouseleave', handleMouseLeave);
        };
    }, [x, y]);

    return { ref, x, y };
};

// Enhanced Animated Egg Logo Component
const EggLogo = memo(() => {
    const { ref, x, y } = useMagneticEffect();
    const [isHovered, setIsHovered] = useState(false);
    const [clickCount, setClickCount] = useState(0);

    // Spring animation for smooth movements
    const springX = useSpring(x, { stiffness: 300, damping: 30 });
    const springY = useSpring(y, { stiffness: 300, damping: 30 });

    const handleClick = () => {
        setClickCount(prev => prev + 1);
        // Easter egg: After 5 clicks, trigger a special animation
        if (clickCount === 4) {
            setClickCount(0);
            // Trigger confetti or special effect
        }
    };

    return (
        <motion.div 
            ref={ref}
            className="relative cursor-pointer"
            style={{ x: springX, y: springY }}
            onHoverStart={() => setIsHovered(true)}
            onHoverEnd={() => setIsHovered(false)}
            onClick={handleClick}
            whileTap={{ scale: 0.9 }}
        >
            <svg
                width="44"
                height="44"
                viewBox="0 0 44 44"
                xmlns="http://www.w3.org/2000/svg"
                className="relative z-10"
            >
                <defs>
                    <linearGradient id="eggGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#60A5FA">
                            <animate attributeName="stop-color" 
                                values="#60A5FA;#A78BFA;#F472B6;#60A5FA" 
                                dur="6s" 
                                repeatCount="indefinite" />
                        </stop>
                        <stop offset="100%" stopColor="#3730A3">
                            <animate attributeName="stop-color" 
                                values="#3730A3;#7C3AED;#DB2777;#3730A3" 
                                dur="6s" 
                                repeatCount="indefinite" />
                        </stop>
                    </linearGradient>
                    <filter id="glow">
                        <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                        <feMerge>
                            <feMergeNode in="coloredBlur"/>
                            <feMergeNode in="SourceGraphic"/>
                        </feMerge>
                    </filter>
                    <filter id="innerShadow">
                        <feFlood floodOpacity="0.5" floodColor="#000"/>
                        <feComposite in2="SourceAlpha" operator="out"/>
                        <feGaussianBlur stdDeviation="2"/>
                        <feComposite operator="atop" in2="SourceGraphic"/>
                    </filter>
                </defs>
                <motion.path
                    d="M22 5C16 5 10 15 10 25C10 33 15 37 22 37C29 37 34 33 34 25C34 15 28 5 22 5Z"
                    fill="url(#eggGradient)"
                    stroke="rgba(255,255,255,0.4)"
                    strokeWidth="1"
                    filter="url(#glow)"
                    animate={{
                        scale: isHovered ? 1.05 : 1,
                        rotate: isHovered ? [0, -5, 5, 0] : 0,
                    }}
                    transition={{ duration: 0.3 }}
                />
                {/* Animated eyes */}
                <motion.circle 
                    cx={18} 
                    cy={20} 
                    r={2} 
                    fill="#1e293b"
                    animate={{
                        scale: isHovered ? [1, 1.3, 1] : 1,
                        x: isHovered ? [-1, 1, -1] : 0,
                    }}
                    transition={{ duration: 0.5 }}
                />
                <motion.circle 
                    cx={26} 
                    cy={20} 
                    r={2} 
                    fill="#1e293b"
                    animate={{
                        scale: isHovered ? [1, 1.3, 1] : 1,
                        x: isHovered ? [1, -1, 1] : 0,
                    }}
                    transition={{ duration: 0.5, delay: 0.1 }}
                />
                {/* Animated smile */}
                <motion.path 
                    d="M19 28C20.5 29.5 23.5 29.5 25 28" 
                    stroke="#1e293b" 
                    strokeWidth="2" 
                    strokeLinecap="round"
                    fill="none"
                    animate={{
                        d: isHovered 
                            ? "M19 27C20.5 30 23.5 30 25 27" 
                            : "M19 28C20.5 29.5 23.5 29.5 25 28",
                    }}
                    transition={{ duration: 0.3 }}
                />
                {/* Sparkle when clicked */}
                {clickCount > 0 && (
                    <motion.circle
                        cx={30}
                        cy={14}
                        r={3}
                        fill="#FFD700"
                        initial={{ scale: 0, opacity: 1 }}
                        animate={{ scale: [0, 1.5, 0], opacity: [1, 1, 0] }}
                        transition={{ duration: 0.5 }}
                    />
                )}
            </svg>
            
            {/* Multiple animated rings */}
            {[...Array(3)].map((_, i) => (
                <motion.div
                    key={i}
                    className="absolute inset-0 rounded-full"
                    animate={{
                        scale: [1, 1.4 + i * 0.2, 1.4 + i * 0.2],
                        opacity: [0.3 - i * 0.1, 0, 0],
                    }}
                    transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeOut",
                        delay: i * 0.3,
                    }}
                    style={{
                        border: `2px solid ${i === 0 ? '#3b82f6' : i === 1 ? '#8b5cf6' : '#ec4899'}`,
                    }}
                />
            ))}
            
            {/* Floating particles with physics */}
            {isHovered && (
                <>
                    {[...Array(8)].map((_, i) => (
                        <motion.div
                            key={i}
                            className="absolute w-1.5 h-1.5 rounded-full"
                            style={{
                                background: `hsl(${i * 45}, 70%, 60%)`,
                                boxShadow: `0 0 6px hsl(${i * 45}, 70%, 60%)`,
                            }}
                            initial={{
                                x: 22,
                                y: 22,
                                opacity: 0,
                            }}
                            animate={{
                                x: 22 + Math.cos(i * 45 * Math.PI / 180) * 35,
                                y: 22 + Math.sin(i * 45 * Math.PI / 180) * 35,
                                opacity: [0, 1, 0],
                            }}
                            transition={{
                                duration: 1.5,
                                repeat: Infinity,
                                delay: i * 0.1,
                                ease: "easeOut",
                            }}
                        />
                    ))}
                </>
            )}

            {/* Success pulse on click */}
            <AnimatePresence>
                {clickCount > 0 && (
                    <motion.div
                        className="absolute inset-0 bg-green-400 rounded-full"
                        initial={{ scale: 0.8, opacity: 0.5 }}
                        animate={{ scale: 2, opacity: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.6 }}
                    />
                )}
            </AnimatePresence>
        </motion.div>
    );
});
EggLogo.displayName = 'EggLogo';

// Premium Portfolio Balance Display Component
const PortfolioBalance = memo(({ 
    balance, 
    dailyChange, 
    weeklyChange, 
    isVisible, 
    onToggleVisibility,
    isLoading,
    error,
    onRefresh 
}) => {
    const [displayMode, setDisplayMode] = useState('value');
    const [showChart, setShowChart] = useState(true);
    const controls = useAnimation();

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
        const numValue = parseFloat(value);
        if (isNaN(numValue)) return '-';
        return `${numValue > 0 ? '+' : ''}${numValue.toFixed(2)}%`;
    };

    const formatChange = (changeData) => {
        if (!changeData) return { amount: '-', percent: '-', color: 'text-gray-400' };
        const amount = changeData.dollar_change || 0;
        const percent = changeData.percent_change || 0;
        const color = percent > 0 ? 'text-green-400' : percent < 0 ? 'text-red-400' : 'text-gray-400';
        return { amount, percent, color };
    };

    const daily = formatChange(dailyChange);
    const weekly = formatChange(weeklyChange);

    useEffect(() => {
        controls.start({
            opacity: [0, 1],
            y: [20, 0],
        });
    }, [balance, controls]);

    if (isLoading) {
        return (
            <motion.div 
                className="flex items-center space-x-4 px-6 py-4 bg-gray-800/40 backdrop-blur-xl rounded-2xl border border-gray-700/50 shadow-xl"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
            >
                <div className="flex items-center space-x-3">
                    <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    >
                        <Loader2 className="w-5 h-5 text-blue-400" />
                    </motion.div>
                    <span className="text-sm text-gray-400">Loading portfolio...</span>
                </div>
            </motion.div>
        );
    }

    if (error) {
        return (
            <motion.div 
                className="flex items-center space-x-3 px-6 py-4 bg-red-900/20 backdrop-blur-xl rounded-2xl border border-red-800/50"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
            >
                <AlertCircle className="w-5 h-5 text-red-400" />
                <span className="text-sm text-red-400">Unable to load portfolio</span>
                <motion.button
                    onClick={onRefresh}
                    className="ml-auto p-1.5 hover:bg-red-800/30 rounded-lg transition-colors"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                >
                    <RefreshCw className="w-4 h-4 text-red-400" />
                </motion.button>
            </motion.div>
        );
    }

    return (
        <motion.div 
            className="relative group"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, type: "spring" }}
        >
            {/* Main container with premium glass effect */}
            <div className="relative bg-gradient-to-br from-gray-800/60 via-gray-800/40 to-blue-900/30 backdrop-blur-xl rounded-2xl p-6 border border-gray-700/50 shadow-2xl overflow-hidden">
                {/* Animated gradient background */}
                <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-blue-600/10 via-purple-600/10 to-pink-600/10"
                    animate={{
                        x: ['-100%', '100%'],
                    }}
                    transition={{
                        duration: 15,
                        repeat: Infinity,
                        ease: "linear"
                    }}
                />

                {/* Noise texture overlay */}
                <div className="absolute inset-0 opacity-[0.015] mix-blend-overlay">
                    <svg width="100%" height="100%">
                        <filter id="noiseFilter">
                            <feTurbulence type="turbulence" baseFrequency="0.9" numOctaves="4" />
                        </filter>
                        <rect width="100%" height="100%" filter="url(#noiseFilter)" />
                    </svg>
                </div>
                
                <div className="relative z-10">
                    {/* Header section */}
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-3">
                            <motion.div
                                className="p-2 bg-blue-500/20 rounded-lg"
                                whileHover={{ scale: 1.05, backgroundColor: 'rgba(59, 130, 246, 0.3)' }}
                            >
                                <Wallet className="w-5 h-5 text-blue-400" />
                            </motion.div>
                            <div>
                                <h3 className="text-xs text-gray-400 font-medium uppercase tracking-wider">Portfolio Value</h3>
                                <motion.div 
                                    className="text-3xl font-bold text-white mt-0.5"
                                    animate={controls}
                                >
                                    {isVisible ? formatCurrency(balance) : '••••••••'}
                                </motion.div>
                            </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center space-x-2">
                            <motion.button
                                onClick={() => setShowChart(!showChart)}
                                className="p-2 hover:bg-white/10 rounded-lg transition-all group/btn"
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                            >
                                <LineChart className={`w-4 h-4 transition-colors ${showChart ? 'text-blue-400' : 'text-gray-500'}`} />
                            </motion.button>
                            <motion.button
                                onClick={onToggleVisibility}
                                className="p-2 hover:bg-white/10 rounded-lg transition-all group/btn"
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                            >
                                {isVisible ? (
                                    <Eye className="w-4 h-4 text-gray-400 group-hover/btn:text-white" />
                                ) : (
                                    <EyeOff className="w-4 h-4 text-gray-400 group-hover/btn:text-white" />
                                )}
                            </motion.button>
                            <motion.button
                                onClick={onRefresh}
                                className="p-2 hover:bg-white/10 rounded-lg transition-all group/btn"
                                whileHover={{ scale: 1.05, rotate: 180 }}
                                whileTap={{ scale: 0.95 }}
                            >
                                <RefreshCw className="w-4 h-4 text-gray-400 group-hover/btn:text-white" />
                            </motion.button>
                        </div>
                    </div>

                    {/* Changes grid */}
                    {isVisible && (
                        <motion.div 
                            className="grid grid-cols-2 gap-3"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.1 }}
                        >
                            {/* Daily Change */}
                            <motion.div 
                                className={`bg-gray-900/40 rounded-xl p-3 border ${daily.color === 'text-green-400' ? 'border-green-900/50' : daily.color === 'text-red-400' ? 'border-red-900/50' : 'border-gray-800/50'}`}
                                whileHover={{ scale: 1.02, y: -2 }}
                                transition={{ type: "spring", stiffness: 300 }}
                            >
                                <div className="flex items-center justify-between">
                                    <span className="text-xs text-gray-500">Today</span>
                                    {daily.percent !== '-' && (
                                        <motion.div
                                            initial={{ scale: 0 }}
                                            animate={{ scale: 1 }}
                                            transition={{ type: "spring", delay: 0.2 }}
                                        >
                                            {daily.color === 'text-green-400' ? (
                                                <TrendingUp className="w-4 h-4 text-green-400" />
                                            ) : daily.color === 'text-red-400' ? (
                                                <TrendingDown className="w-4 h-4 text-red-400" />
                                            ) : null}
                                        </motion.div>
                                    )}
                                </div>
                                <div className={`text-lg font-bold ${daily.color} mt-1`}>
                                    {formatPercentage(daily.percent)}
                                </div>
                                <div className={`text-xs ${daily.color} opacity-80`}>
                                    {formatCurrency(daily.amount)}
                                </div>
                            </motion.div>

                            {/* Weekly Change */}
                            <motion.div 
                                className={`bg-gray-900/40 rounded-xl p-3 border ${weekly.color === 'text-green-400' ? 'border-green-900/50' : weekly.color === 'text-red-400' ? 'border-red-900/50' : 'border-gray-800/50'}`}
                                whileHover={{ scale: 1.02, y: -2 }}
                                transition={{ type: "spring", stiffness: 300 }}
                            >
                                <div className="flex items-center justify-between">
                                    <span className="text-xs text-gray-500">This Week</span>
                                    {weekly.percent !== '-' && (
                                        <motion.div
                                            initial={{ scale: 0 }}
                                            animate={{ scale: 1 }}
                                            transition={{ type: "spring", delay: 0.3 }}
                                        >
                                            {weekly.color === 'text-green-400' ? (
                                                <TrendingUp className="w-4 h-4 text-green-400" />
                                            ) : weekly.color === 'text-red-400' ? (
                                                <TrendingDown className="w-4 h-4 text-red-400" />
                                            ) : null}
                                        </motion.div>
                                    )}
                                </div>
                                <div className={`text-lg font-bold ${weekly.color} mt-1`}>
                                    {formatPercentage(weekly.percent)}
                                </div>
                                <div className={`text-xs ${weekly.color} opacity-80`}>
                                    {formatCurrency(weekly.amount)}
                                </div>
                            </motion.div>
                        </motion.div>
                    )}

                    {/* Interactive mini chart */}
                    <AnimatePresence>
                        {isVisible && showChart && (
                            <motion.div 
                                className="mt-4 h-16 relative"
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 64 }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.3 }}
                            >
                                <svg className="w-full h-full" viewBox="0 0 300 64">
                                    <defs>
                                        <linearGradient id="portfolioGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                                            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.4" />
                                            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                                        </linearGradient>
                                        <filter id="glow">
                                            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                                            <feMerge>
                                                <feMergeNode in="coloredBlur"/>
                                                <feMergeNode in="SourceGraphic"/>
                                            </feMerge>
                                        </filter>
                                    </defs>
                                    
                                    {/* Animated chart line */}
                                    <motion.path
                                        d="M 0,50 Q 75,30 150,35 T 300,20"
                                        fill="none"
                                        stroke="#3b82f6"
                                        strokeWidth="3"
                                        filter="url(#glow)"
                                        initial={{ pathLength: 0 }}
                                        animate={{ pathLength: 1 }}
                                        transition={{ duration: 2, ease: "easeOut" }}
                                    />
                                    
                                    {/* Fill area */}
                                    <motion.path
                                        d="M 0,50 Q 75,30 150,35 T 300,20 L 300,64 L 0,64 Z"
                                        fill="url(#portfolioGradient)"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ duration: 1, delay: 1 }}
                                    />
                                    
                                    {/* Animated dots */}
                                    {[0, 75, 150, 225, 300].map((x, i) => (
                                        <motion.circle
                                            key={i}
                                            cx={x}
                                            cy={50 - (Math.sin(i) * 15)}
                                            r="4"
                                            fill="#3b82f6"
                                            initial={{ scale: 0 }}
                                            animate={{ scale: 1 }}
                                            transition={{ delay: 0.5 + i * 0.1, type: "spring" }}
                                        />
                                    ))}
                                </svg>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Live status indicator */}
                <div className="absolute top-4 right-4 flex items-center space-x-2">
                    <motion.div
                        className="flex items-center space-x-1.5 px-2.5 py-1 bg-green-500/20 rounded-full"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", delay: 0.3 }}
                    >
                        <div className="relative">
                            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                            <div className="absolute inset-0 w-2 h-2 bg-green-400 rounded-full animate-ping"></div>
                        </div>
                        <span className="text-xs text-green-400 font-medium">Live</span>
                    </motion.div>
                </div>
            </div>

            {/* Hover glow effect */}
            <div className="absolute -inset-[1px] bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 rounded-2xl opacity-0 group-hover:opacity-20 blur-sm transition-opacity duration-500 -z-10"></div>
        </motion.div>
    );
});
PortfolioBalance.displayName = 'PortfolioBalance';

// Premium Market Status Widget
const MarketStatus = memo(() => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [selectedMarket, setSelectedMarket] = useState(null);

    const markets = [
        { name: 'NYSE', status: 'open', change: '+0.23%', volume: '12.3B', icon: '🇺🇸' },
        { name: 'NASDAQ', status: 'open', change: '+0.45%', volume: '8.7B', icon: '📊' },
        { name: 'LSE', status: 'closed', change: '-0.12%', volume: '5.2B', icon: '🇬🇧' },
        { name: 'NIKKEI', status: 'closed', change: '+1.24%', volume: '3.8B', icon: '🇯🇵' },
    ];

    return (
        <div className="relative">
            <motion.button
                onClick={() => setIsExpanded(!isExpanded)}
                className="flex items-center space-x-2 bg-gray-800/50 backdrop-blur-md px-4 py-2.5 rounded-xl hover:bg-gray-700/50 transition-all border border-gray-700/50 group"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
            >
                <div className="relative">
                    <motion.div
                        className="w-2 h-2 bg-green-400 rounded-full"
                        animate={{
                            scale: [1, 1.2, 1],
                            opacity: [1, 0.7, 1]
                        }}
                        transition={{
                            duration: 2,
                            repeat: Infinity,
                            ease: "easeInOut"
                        }}
                    />
                    <div className="absolute inset-0 w-2 h-2 bg-green-400 rounded-full animate-ping"></div>
                </div>
                <span className="text-sm font-medium text-gray-300 group-hover:text-white transition-colors">Markets</span>
                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
            </motion.button>

            <AnimatePresence>
                {isExpanded && (
                    <>
                        {/* Backdrop */}
                        <motion.div
                            className="fixed inset-0 z-40"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsExpanded(false)}
                        />

                        {/* Dropdown */}
                        <motion.div
                            className="absolute top-full mt-2 right-0 w-80 bg-gray-900/95 backdrop-blur-xl rounded-2xl shadow-2xl overflow-hidden z-50 border border-gray-700/50"
                            initial={{ opacity: 0, y: -10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -10, scale: 0.95 }}
                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        >
                            <div className="p-5">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-sm font-semibold text-white">Global Markets</h3>
                                    <span className="text-xs text-gray-500">
                                        {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                                
                                <div className="space-y-2">
                                    {markets.map((market, index) => (
                                        <motion.div
                                            key={market.name}
                                            className="relative group"
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: index * 0.05 }}
                                            onHoverStart={() => setSelectedMarket(market.name)}
                                            onHoverEnd={() => setSelectedMarket(null)}
                                        >
                                            <motion.div
                                                className="flex items-center justify-between p-3 bg-gray-800/50 rounded-xl hover:bg-gray-700/50 transition-all cursor-pointer"
                                                whileHover={{ x: 4 }}
                                            >
                                                <div className="flex items-center space-x-3">
                                                    <span className="text-lg">{market.icon}</span>
                                                    <div>
                                                        <div className="flex items-center space-x-2">
                                                            <span className="text-sm font-medium text-white">{market.name}</span>
                                                            <div className={`w-1.5 h-1.5 rounded-full ${
                                                                market.status === 'open' ? 'bg-green-400' : 'bg-gray-500'
                                                            }`} />
                                                        </div>
                                                        <div className="flex items-center space-x-2 text-xs text-gray-500">
                                                            <span>Vol: {market.volume}</span>
                                                            <span>•</span>
                                                            <span className="capitalize">{market.status}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <motion.span 
                                                        className={`text-sm font-medium ${
                                                            market.change.startsWith('+') ? 'text-green-400' : 'text-red-400'
                                                        }`}
                                                        animate={{
                                                            scale: selectedMarket === market.name ? 1.1 : 1
                                                        }}
                                                    >
                                                        {market.change}
                                                    </motion.span>
                                                </div>
                                            </motion.div>
                                            
                                            {/* Hover effect line */}
                                            <motion.div
                                                className="absolute bottom-0 left-0 h-0.5 bg-gradient-to-r from-blue-500 to-purple-500"
                                                initial={{ width: 0 }}
                                                animate={{ width: selectedMarket === market.name ? '100%' : 0 }}
                                                transition={{ duration: 0.3 }}
                                            />
                                        </motion.div>
                                    ))}
                                </div>

                                {/* Market summary */}
                                <motion.div
                                    className="mt-4 p-3 bg-blue-600/10 rounded-xl border border-blue-600/20"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.2 }}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center space-x-2">
                                            <Activity className="w-4 h-4 text-blue-400" />
                                            <span className="text-xs text-blue-300">Market Sentiment</span>
                                        </div>
                                        <span className="text-xs font-medium text-green-400">Bullish</span>
                                    </div>
                                    <div className="mt-2 h-1 bg-gray-700 rounded-full overflow-hidden">
                                        <motion.div
                                            className="h-full bg-gradient-to-r from-green-500 to-blue-500"
                                            initial={{ width: 0 }}
                                            animate={{ width: '72%' }}
                                            transition={{ duration: 1, delay: 0.3 }}
                                        />
                                    </div>
                                </motion.div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
});
MarketStatus.displayName = 'MarketStatus';

// Premium Notifications Component
const NotificationsDropdown = memo(() => {
    const [showNotifications, setShowNotifications] = useState(false);
    const [unreadCount, setUnreadCount] = useState(3);

    const notifications = [
        { 
            id: 1, 
            type: 'success',
            icon: TrendingUp,
            title: "Portfolio Update", 
            message: "Your portfolio increased by 2.3% today", 
            time: "5 minutes ago", 
            isNew: true,
            action: { label: 'View Details', href: '/portfolio' }
        },
        { 
            id: 2, 
            type: 'alert',
            icon: Target,
            title: "Price Alert", 
            message: "AAPL reached your price target of $180", 
            time: "1 hour ago", 
            isNew: true,
            action: { label: 'View Position', href: '/positions' }
        },
        { 
            id: 3, 
            type: 'info',
            icon: RefreshCw,
            title: "Account Sync", 
            message: "Vanguard account synced successfully", 
            time: "3 hours ago", 
            isNew: true 
        },
        { 
            id: 4, 
            type: 'info',
            icon: FileText,
            title: "Weekly Report", 
            message: "Your weekly performance report is ready", 
            time: "Yesterday", 
            isNew: false,
            action: { label: 'Download', href: '#' }
        },
    ];

    const typeColors = {
        success: 'bg-green-500',
        alert: 'bg-amber-500',
        info: 'bg-blue-500',
        error: 'bg-red-500',
    };

    const handleMarkAllRead = () => {
        setUnreadCount(0);
        // Add logic to mark all as read
    };

    return (
        <div className="relative">
            <motion.button
                className="relative p-2.5 text-gray-400 hover:text-white rounded-xl hover:bg-gray-800/50 transition-all"
                onClick={() => setShowNotifications(!showNotifications)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
            >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                    <motion.span 
                        className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", stiffness: 500, damping: 15 }}
                    >
                        {unreadCount}
                    </motion.span>
                )}
            </motion.button>
            
            <AnimatePresence>
                {showNotifications && (
                    <>
                        {/* Backdrop */}
                        <motion.div
                            className="fixed inset-0 z-40"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowNotifications(false)}
                        />

                        {/* Dropdown */}
                        <motion.div 
                            className="absolute right-0 mt-2 w-96 bg-gray-900/95 backdrop-blur-xl rounded-2xl shadow-2xl overflow-hidden z-50 border border-gray-700/50"
                            initial={{ opacity: 0, y: -20, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -20, scale: 0.95 }}
                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        >
                            {/* Header */}
                            <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 p-4 border-b border-gray-700/50">
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center space-x-2">
                                        <Bell className="w-5 h-5 text-blue-400" />
                                        <h3 className="font-semibold text-white">Notifications</h3>
                                        {unreadCount > 0 && (
                                            <span className="px-2 py-0.5 bg-blue-600/30 text-blue-300 text-xs rounded-full">
                                                {unreadCount} new
                                            </span>
                                        )}
                                    </div>
                                    <motion.button 
                                        onClick={handleMarkAllRead}
                                        className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                    >
                                        Mark all as read
                                    </motion.button>
                                </div>
                            </div>
                            
                            {/* Notifications list */}
                            <div className="max-h-96 overflow-y-auto custom-scrollbar">
                                {notifications.map((notification, index) => {
                                    const Icon = notification.icon;
                                    return (
                                        <motion.div
                                            key={notification.id}
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: index * 0.05 }}
                                            className={`p-4 border-b border-gray-800/50 hover:bg-gray-800/30 transition-all cursor-pointer ${
                                                notification.isNew ? 'bg-blue-900/10' : ''
                                            }`}
                                        >
                                            <div className="flex space-x-3">
                                                <motion.div 
                                                    className={`w-10 h-10 rounded-xl ${typeColors[notification.type]}/20 flex items-center justify-center flex-shrink-0`}
                                                    whileHover={{ scale: 1.1, rotate: 5 }}
                                                >
                                                    <Icon className={`w-5 h-5 ${typeColors[notification.type].replace('bg-', 'text-')}`} />
                                                </motion.div>
                                                <div className="flex-1">
                                                    <div className="flex justify-between items-start">
                                                        <div>
                                                            <h4 className="font-medium text-white text-sm">{notification.title}</h4>
                                                            <p className="text-sm text-gray-400 mt-0.5">{notification.message}</p>
                                                            {notification.action && (
                                                                <motion.a
                                                                    href={notification.action.href}
                                                                    className="inline-flex items-center space-x-1 text-xs text-blue-400 hover:text-blue-300 mt-2"
                                                                    whileHover={{ x: 2 }}
                                                                >
                                                                    <span>{notification.action.label}</span>
                                                                    <ChevronRight className="w-3 h-3" />
                                                                </motion.a>
                                                            )}
                                                        </div>
                                                        <span className="text-xs text-gray-500">{notification.time}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </motion.div>
                                    );
                                })}
                            </div>
                            
                            {/* Footer */}
                            <motion.div 
                                className="p-3 bg-gray-800/30 border-t border-gray-700/50"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.3 }}
                            >
                                <Link
                                    href="/notifications"
                                    onClick={() => setShowNotifications(false)}
                                    className="text-sm text-blue-400 hover:text-blue-300 font-medium flex items-center justify-center space-x-1 py-1"
                                >
                                    <span>View all notifications</span>
                                    <ExternalLink className="w-3 h-3" />
                                </Link>
                            </motion.div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
});
NotificationsDropdown.displayName = 'NotificationsDropdown';

// Main Premium Navbar Component
const Navbar = () => {
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isQuickActionsOpen, setIsQuickActionsOpen] = useState(true);
    const [scrolledDown, setScrolledDown] = useState(false);
    const [balanceVisible, setBalanceVisible] = useState(true);
    const [marketDataStatus, setMarketDataStatus] = useState({ status: 'loading', lastUpdate: null });

    // Get auth context
    const { user, logout, loading: authLoading } = useContext(AuthContext);
    const router = useRouter();
    const mountedRef = useRef(false);

    // Portfolio data state
    const [portfolioData, setPortfolioData] = useState(null);
    const [isLoadingPortfolio, setIsLoadingPortfolio] = useState(false);
    const [portfolioError, setPortfolioError] = useState(null);

    // Account fetching state
    const [accounts, setAccounts] = useState([]);
    const [isLoadingAccounts, setIsLoadingAccounts] = useState(false);
    const [accountError, setAccountError] = useState(null);

    // Track component mount state
    useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
        };
    }, []);

    // Handle scroll events with throttling
    useEffect(() => {
        let ticking = false;
        const handleScroll = () => {
            if (!ticking) {
                window.requestAnimationFrame(() => {
                    setScrolledDown(window.scrollY > 10);
                    ticking = false;
                });
                ticking = true;
            }
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Fetch portfolio data
    const loadPortfolioData = useCallback(async () => {
        if (!user || authLoading || !mountedRef.current) {
            setPortfolioData(null);
            return;
        }

        setIsLoadingPortfolio(true);
        setPortfolioError(null);

        try {
            const response = await fetchWithAuth('/portfolio/snapshots?timeframe=1w&include_cost_basis=true');
            if (!response.ok) throw new Error('Failed to fetch portfolio data');
            
            const data = await response.json();
            
            if (mountedRef.current) {
                setPortfolioData(data);
                setMarketDataStatus({
                    status: 'connected',
                    lastUpdate: data.last_updated || new Date().toISOString()
                });
            }
        } catch (error) {
            console.error('Error fetching portfolio:', error);
            if (mountedRef.current) {
                setPortfolioError(error.message);
                setMarketDataStatus({ status: 'error', lastUpdate: null });
            }
        } finally {
            if (mountedRef.current) {
                setIsLoadingPortfolio(false);
            }
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
        if (!user || authLoading || !mountedRef.current) {
            setAccounts([]);
            return;
        }
        
        setIsLoadingAccounts(true);
        setAccountError(null);
        
        try {
            const accountsData = await fetchAccounts();
            if (mountedRef.current) {
                setAccounts(accountsData || []);
            }
        } catch (error) {
            console.error("Navbar: Error fetching accounts:", error);
            if (mountedRef.current) {
                setAccountError("Failed to load accounts.");
                setAccounts([]);
            }
        } finally {
            if (mountedRef.current) {
                setIsLoadingAccounts(false);
            }
        }
    }, [user, authLoading]);

    useEffect(() => {
        if (!authLoading) {
            loadAccounts();
        }
    }, [loadAccounts, authLoading]);

    // Close dropdowns when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            const dropdown = event.target.closest('.dropdown-container');
            if (!dropdown) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

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

    const dropdownItems = [
        { icon: User, label: "Profile", href: "/profile", description: "Manage your profile" },
        { icon: Shield, label: "Admin", href: "/admin", description: "Admin settings", adminOnly: true },
        { icon: Settings, label: "Settings", href: "/settings", description: "App preferences" },
        { icon: Clock, label: "Scheduler", href: "/scheduler", description: "Task scheduler" },
        { icon: HelpCircle, label: "Help", href: "/help", description: "Get support" },
        {
            icon: LogOut,
            label: "Logout",
            action: logout,
            className: "text-red-400 hover:text-red-300",
            description: "Sign out"
        }
    ];

    // Placeholder functions for buttons
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

    if (!user && !authLoading) return null;

    return (
        <motion.nav 
            className={`
                fixed top-0 left-0 right-0 z-50 
                ${scrolledDown 
                    ? 'bg-gray-900/95 backdrop-blur-xl shadow-2xl' 
                    : 'bg-gradient-to-r from-gray-900 via-gray-900/95 to-blue-900/80'
                }
                transition-all duration-500 border-b border-gray-800/50
            `}
            initial={{ y: -100 }}
            animate={{ y: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
        >
            {/* Top accent line */}
            <motion.div
                className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 1, delay: 0.2 }}
            />

            <div className="container mx-auto px-4">
                <div className="h-20 flex justify-between items-center">
                    {/* Logo and App Name */}
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.5 }}
                    >
                        <Link href="/" className="flex items-center space-x-3 group">
                            <motion.div 
                                className="relative"
                                whileHover={{ scale: 1.05 }}
                                transition={{ type: "spring", stiffness: 400 }}
                            >
                                <EggLogo />
                            </motion.div>
                            <div className="relative">
                                <motion.h1 
                                    className="text-2xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent"
                                    animate={{
                                        backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
                                    }}
                                    transition={{
                                        duration: 5,
                                        repeat: Infinity,
                                        ease: "linear"
                                    }}
                                    style={{
                                        backgroundSize: '200% 100%',
                                    }}
                                >
                                    NestEgg
                                </motion.h1>
                                <motion.p 
                                    className="text-xs text-gray-400 group-hover:text-gray-300 transition-colors"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: 0.3 }}
                                >
                                    Plan Your Future
                                </motion.p>
                            </div>
                        </Link>
                    </motion.div>

                    {/* Center Section */}
                    <div className="hidden lg:flex items-center space-x-4">
                        {/* Quick Actions */}
                        <AnimatePresence mode="wait">
                            {isQuickActionsOpen && (
                                <motion.div 
                                    className="flex items-center space-x-3"
                                    initial={{ opacity: 0, width: 0 }}
                                    animate={{ opacity: 1, width: 'auto' }}
                                    exit={{ opacity: 0, width: 0 }}
                                    transition={{ duration: 0.3 }}
                                >
                                    <AddAccountButton
                                        onAccountAdded={loadAccounts}
                                        className="flex items-center space-x-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium text-sm transition-all group hover:shadow-lg hover:shadow-blue-600/25"
                                    />
                                    <AddPositionButton
                                        onPositionAdded={placeholderFetchPositions}
                                        className="flex items-center space-x-2 px-4 py-2.5 bg-gray-800/60 hover:bg-gray-700/60 text-white rounded-xl font-medium text-sm transition-all group backdrop-blur-sm border border-gray-700/50"
                                    />
                                    <BulkPositionButton
                                        accounts={accounts}
                                        fetchAccounts={loadAccounts}
                                        fetchPositions={placeholderFetchPositions}
                                        fetchPortfolioSummary={placeholderFetchPortfolioSummary}
                                        className="flex items-center space-x-2 px-4 py-2.5 bg-gray-800/60 hover:bg-gray-700/60 text-white rounded-xl font-medium text-sm transition-all group backdrop-blur-sm border border-gray-700/50"
                                        buttonIcon={
                                            isLoadingAccounts ? <Loader2 className="w-4 h-4 mr-2 text-white animate-spin" />
                                            : accountError ? <AlertCircle className="w-4 h-4 mr-2 text-red-400" />
                                            : <Upload className="w-4 h-4 mr-2 text-white group-hover:text-blue-300" />
                                        }
                                        buttonText={
                                           <span className={`text-sm ${accountError ? 'text-red-300' : 'text-white'}`}>Bulk Upload</span>
                                        }
                                        disabled={bulkDisabled}
                                        title={bulkTitle}
                                    />
                                    <motion.button
                                        className="flex items-center space-x-2 px-4 py-2.5 bg-green-600/20 hover:bg-green-600/30 text-green-400 rounded-xl font-medium text-sm transition-all group backdrop-blur-sm border border-green-600/30"
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                    >
                                        <Zap className="w-4 h-4" />
                                        <span>Quick Start</span>
                                    </motion.button>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Toggle Button */}
                        <motion.button
                            onClick={() => setIsQuickActionsOpen(!isQuickActionsOpen)}
                            className="p-2.5 bg-gray-800/50 hover:bg-gray-700/50 rounded-xl transition-all backdrop-blur-sm border border-gray-700/50"
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                        >
                            <motion.div
                                animate={{ rotate: isQuickActionsOpen ? 0 : 180 }}
                                transition={{ duration: 0.3 }}
                            >
                                {isQuickActionsOpen ? <ChevronsLeft className="w-5 h-5" /> : <ChevronsRight className="w-5 h-5" />}
                            </motion.div>
                        </motion.button>

                        {/* Portfolio Balance */}
                        {!authLoading && (
                            <PortfolioBalance
                                balance={portfolioData?.current_value || 0}
                                dailyChange={portfolioData?.period_changes?.['1d']}
                                weeklyChange={portfolioData?.period_changes?.['1w']}
                                isVisible={balanceVisible}
                                onToggleVisibility={() => setBalanceVisible(!balanceVisible)}
                                isLoading={isLoadingPortfolio}
                                error={portfolioError}
                                onRefresh={loadPortfolioData}
                            />
                        )}
                    </div>

                    {/* Right Section */}
                    <motion.div 
                        className="flex items-center space-x-3"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.5 }}
                    >
                        {/* Update Status */}
                        <UpdateStatusIndicator />

                        {/* Market Status */}
                        <MarketStatus />

                        {/* Notifications */}
                        <NotificationsDropdown />

                        {/* User Dropdown */}
                        <div className="relative dropdown-container">
                            <motion.button
                                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                className="flex items-center space-x-3 bg-gray-800/50 backdrop-blur-md px-4 py-2.5 rounded-xl hover:bg-gray-700/50 transition-all border border-gray-700/50 group"
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                            >
                                <div className="relative">
                                    <motion.div 
                                        className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white shadow-lg font-bold"
                                        whileHover={{ rotate: [0, -5, 5, 0] }}
                                        transition={{ duration: 0.5 }}
                                    >
                                        {getInitials()}
                                    </motion.div>
                                    <motion.div
                                        className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-gray-900"
                                        animate={{ scale: [1, 1.2, 1] }}
                                        transition={{ duration: 2, repeat: Infinity }}
                                    />
                                </div>
                                <div className="text-left">
                                    <div className="text-sm font-medium text-white group-hover:text-blue-300 transition-colors">
                                        {displayName}
                                    </div>
                                    <div className="text-xs text-gray-400">Premium Member</div>
                                </div>
                                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                            </motion.button>
                            
                            <AnimatePresence>
                                {isDropdownOpen && (
                                    <>
                                        {/* Backdrop */}
                                        <motion.div
                                            className="fixed inset-0 z-40"
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                            onClick={() => setIsDropdownOpen(false)}
                                        />
                                        
                                        {/* Dropdown Menu */}
                                        <motion.div 
                                            className="absolute right-0 mt-2 w-80 bg-gray-900/95 backdrop-blur-xl rounded-2xl shadow-2xl overflow-hidden z-50 border border-gray-700/50"
                                            initial={{ opacity: 0, y: -20, scale: 0.95 }}
                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                            exit={{ opacity: 0, y: -20, scale: 0.95 }}
                                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                        >
                                            {/* User Info Header */}
                                            <div className="bg-gradient-to-br from-blue-600/20 via-purple-600/20 to-pink-600/20 p-6 relative overflow-hidden">
                                                {/* Animated background */}
                                                <motion.div
                                                    className="absolute inset-0 bg-gradient-to-br from-blue-600/30 to-purple-600/30"
                                                    animate={{
                                                        scale: [1, 1.2, 1],
                                                        rotate: [0, 180, 360],
                                                    }}
                                                    transition={{
                                                        duration: 20,
                                                        repeat: Infinity,
                                                        ease: "linear"
                                                    }}
                                                />
                                                
                                                <div className="relative z-10 flex items-center space-x-4">
                                                    <motion.div 
                                                        className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-2xl font-bold shadow-xl"
                                                        whileHover={{ scale: 1.1, rotate: 5 }}
                                                    >
                                                        {getInitials()}
                                                    </motion.div>
                                                    <div className="flex-1">
                                                        <h3 className="text-lg font-semibold text-white">{displayName}</h3>
                                                        <p className="text-sm text-gray-300">{user?.email}</p>
                                                        <div className="flex items-center space-x-2 mt-2">
                                                            <motion.span 
                                                                className="px-2 py-1 bg-gradient-to-r from-yellow-500 to-amber-500 text-white text-xs rounded-full font-medium flex items-center space-x-1"
                                                                whileHover={{ scale: 1.05 }}
                                                            >
                                                                <Crown className="w-3 h-3" />
                                                                <span>Premium</span>
                                                            </motion.span>
                                                            <span className="text-xs text-gray-400">Member since 2021</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                
                                                {/* Quick Stats */}
                                                <div className="grid grid-cols-3 gap-3 mt-4">
                                                    <motion.div 
                                                        className="bg-white/10 backdrop-blur-sm rounded-lg p-2 text-center cursor-pointer"
                                                        whileHover={{ scale: 1.05, backgroundColor: 'rgba(255, 255, 255, 0.15)' }}
                                                        onClick={() => { router.push('/accounts'); setIsDropdownOpen(false); }}
                                                    >
                                                        <div className="text-xl font-bold text-white">{accounts.length || 0}</div>
                                                        <div className="text-xs text-gray-300">Accounts</div>
                                                    </motion.div>
                                                    <motion.div 
                                                        className="bg-white/10 backdrop-blur-sm rounded-lg p-2 text-center cursor-pointer"
                                                        whileHover={{ scale: 1.05, backgroundColor: 'rgba(255, 255, 255, 0.15)' }}
                                                        onClick={() => { router.push('/positions'); setIsDropdownOpen(false); }}
                                                    >
                                                        <div className="text-xl font-bold text-white">{portfolioData?.position_count || 0}</div>
                                                        <div className="text-xs text-gray-300">Positions</div>
                                                    </motion.div>
                                                    <motion.div 
                                                        className="bg-white/10 backdrop-blur-sm rounded-lg p-2 text-center"
                                                        whileHover={{ scale: 1.05, backgroundColor: 'rgba(255, 255, 255, 0.15)' }}
                                                    >
                                                        <div className="text-xl font-bold text-green-400">
                                                            {portfolioData?.period_changes?.['1d']?.percent_change 
                                                                ? `${portfolioData.period_changes['1d'].percent_change > 0 ? '+' : ''}${portfolioData.period_changes['1d'].percent_change.toFixed(1)}%`
                                                                : '0%'
                                                            }
                                                        </div>
                                                        <div className="text-xs text-gray-300">Today</div>
                                                    </motion.div>
                                                </div>
                                            </div>
                                            
                                            {/* Menu Items */}
                                            <div className="p-2">
                                                {dropdownItems.map((item, index) => {
                                                    const Icon = item.icon;
                                                    const isLast = index === dropdownItems.length - 1;
                                                    
                                                    return (
                                                        <motion.div
                                                            key={index}
                                                            initial={{ opacity: 0, x: -20 }}
                                                            animate={{ opacity: 1, x: 0 }}
                                                            transition={{ delay: index * 0.05 }}
                                                            className={isLast ? 'mt-2 pt-2 border-t border-gray-800' : ''}
                                                        >
                                                            {item.action ? (
                                                                <motion.button
                                                                    onClick={() => { 
                                                                        item.action(); 
                                                                        setIsDropdownOpen(false); 
                                                                    }}
                                                                    className={`flex w-full items-center space-x-3 px-4 py-3 rounded-xl hover:bg-gray-800/50 transition-all text-left group ${item.className || 'text-gray-300 hover:text-white'}`}
                                                                    whileHover={{ x: 4 }}
                                                                >
                                                                    <motion.div
                                                                        className="p-2 bg-gray-800/50 rounded-lg group-hover:bg-gray-700/50 transition-colors"
                                                                        whileHover={{ scale: 1.1, rotate: 5 }}
                                                                    >
                                                                        <Icon className="w-5 h-5" />
                                                                    </motion.div>
                                                                    <div className="flex-1">
                                                                        <div className="font-medium">{item.label}</div>
                                                                        <div className="text-xs text-gray-500">{item.description}</div>
                                                                    </div>
                                                                </motion.button>
                                                            ) : (
                                                                <Link
                                                                    href={item.href}
                                                                    onClick={() => setIsDropdownOpen(false)}
                                                                    className={`flex items-center space-x-3 px-4 py-3 rounded-xl hover:bg-gray-800/50 transition-all group ${item.className || 'text-gray-300 hover:text-white'}`}
                                                                >
                                                                    <motion.div
                                                                        className="p-2 bg-gray-800/50 rounded-lg group-hover:bg-gray-700/50 transition-colors"
                                                                        whileHover={{ scale: 1.1, rotate: 5 }}
                                                                    >
                                                                        <Icon className="w-5 h-5" />
                                                                    </motion.div>
                                                                    <div className="flex-1">
                                                                        <div className="font-medium">{item.label}</div>
                                                                        <div className="text-xs text-gray-500">{item.description}</div>
                                                                    </div>
                                                                    <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-gray-400 transition-colors" />
                                                                </Link>
                                                            )}
                                                        </motion.div>
                                                    );
                                                })}
                                            </div>
                                            
                                            {/* Footer Actions */}
                                            <div className="p-4 bg-gray-800/30 border-t border-gray-700/50">
                                                <div className="grid grid-cols-2 gap-2">
                                                    <motion.button
                                                        className="flex items-center justify-center space-x-2 px-3 py-2 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 rounded-lg transition-all text-sm font-medium"
                                                        whileHover={{ scale: 1.02 }}
                                                        whileTap={{ scale: 0.98 }}
                                                        onClick={() => { router.push('/upgrade'); setIsDropdownOpen(false); }}
                                                    >
                                                        <Gem className="w-4 h-4" />
                                                        <span>Upgrade Plan</span>
                                                    </motion.button>
                                                    <motion.button
                                                        className="flex items-center justify-center space-x-2 px-3 py-2 bg-purple-600/20 hover:bg-purple-600/30 text-purple-400 rounded-lg transition-all text-sm font-medium"
                                                        whileHover={{ scale: 1.02 }}
                                                        whileTap={{ scale: 0.98 }}
                                                        onClick={() => { router.push('/insights'); setIsDropdownOpen(false); }}
                                                    >
                                                        <Brain className="w-4 h-4" />
                                                        <span>AI Insights</span>
                                                    </motion.button>
                                                </div>
                                            </div>
                                        </motion.div>
                                    </>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* Mobile Menu Button */}
                        <motion.button
                            className="lg:hidden text-white p-2 rounded-lg hover:bg-gray-800/50 transition-all"
                            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
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
                        </motion.button>
                    </motion.div>
                </div>
            </div>

            {/* Mobile Menu */}
            <AnimatePresence>
                {isMobileMenuOpen && (
                    <motion.div 
                        className="lg:hidden bg-gray-900/95 backdrop-blur-xl border-t border-gray-800"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                    >
                        <div className="p-4 space-y-4">
                            {/* Mobile User Info */}
                            <div className="flex items-center space-x-3 p-3 bg-gray-800/50 rounded-xl">
                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold">
                                    {getInitials()}
                                </div>
                                <div>
                                    <div className="font-medium text-white">{displayName}</div>
                                    <div className="text-xs text-gray-400">{user?.email}</div>
                                </div>
                            </div>
                            
                            {/* Mobile Portfolio Balance */}
                            {portfolioData && (
                                <div className="p-3 bg-gray-800/50 rounded-xl">
                                    <PortfolioBalance
                                        balance={portfolioData.current_value || 0}
                                        dailyChange={portfolioData.period_changes?.['1d']}
                                        weeklyChange={portfolioData.period_changes?.['1w']}
                                        isVisible={balanceVisible}
                                        onToggleVisibility={() => setBalanceVisible(!balanceVisible)}
                                        isLoading={isLoadingPortfolio}
                                        error={portfolioError}
                                        onRefresh={loadPortfolioData}
                                    />
                                </div>
                            )}
                            
                            {/* Mobile Quick Actions */}
                            <div className="space-y-2">
                                <AddAccountButton
                                    onAccountAdded={loadAccounts}
                                    className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-all"
                                />
                                <AddPositionButton
                                    onPositionAdded={placeholderFetchPositions}
                                    className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-gray-800/60 hover:bg-gray-700/60 text-white rounded-xl font-medium transition-all border border-gray-700/50"
                                />
                                <BulkPositionButton
                                    accounts={accounts}
                                    fetchAccounts={loadAccounts}
                                    fetchPositions={placeholderFetchPositions}
                                    fetchPortfolioSummary={placeholderFetchPortfolioSummary}
                                    className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-gray-800/60 hover:bg-gray-700/60 text-white rounded-xl font-medium transition-all border border-gray-700/50"
                                    buttonIcon={
                                        isLoadingAccounts ? <Loader2 className="w-4 h-4 text-white animate-spin" />
                                        : accountError ? <AlertCircle className="w-4 h-4 text-red-400" />
                                        : <Upload className="w-4 h-4 text-white" />
                                    }
                                    buttonText={
                                       <span className={`${accountError ? 'text-red-300' : 'text-white'}`}>Bulk Upload</span>
                                    }
                                    disabled={bulkDisabled}
                                    title={bulkTitle}
                                />
                            </div>
                            
                            {/* Mobile Menu Items */}
                            <div className="space-y-1 pt-4 border-t border-gray-800">
                                {dropdownItems.map((item, index) => {
                                    const Icon = item.icon;
                                    return (
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
                                                    className={`flex w-full items-center space-x-3 p-3 rounded-xl hover:bg-gray-800/50 transition-all ${item.className || 'text-gray-300'}`}
                                                >
                                                    <Icon className="w-5 h-5" />
                                                    <span className="font-medium">{item.label}</span>
                                                </button>
                                            ) : (
                                                <Link
                                                    href={item.href}
                                                    className={`flex items-center space-x-3 p-3 rounded-xl hover:bg-gray-800/50 transition-all ${item.className || 'text-gray-300'}`}
                                                    onClick={() => setIsMobileMenuOpen(false)}
                                                >
                                                    <Icon className="w-5 h-5" />
                                                    <span className="font-medium">{item.label}</span>
                                                </Link>
                                            )}
                                        </motion.div>
                                    );
                                })}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Bottom gradient line */}
            <motion.div
                className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-500 to-transparent"
                initial={{ scaleX: 0, opacity: 0 }}
                animate={{ scaleX: 1, opacity: 1 }}
                transition={{ duration: 1, delay: 0.5 }}
            />

            {/* Custom styles */}
            <style jsx>{`
                @keyframes shimmer {
                    0% { background-position: -200% 0; }
                    100% { background-position: 200% 0; }
                }

                .animate-shimmer {
                    background-size: 200% 100%;
                    animation: shimmer 3s ease-in-out infinite;
                }

                .custom-scrollbar::-webkit-scrollbar {
                    width: 6px;
                }

                .custom-scrollbar::-webkit-scrollbar-track {
                    background: rgba(255, 255, 255, 0.05);
                }

                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: rgba(255, 255, 255, 0.2);
                    border-radius: 3px;
                }

                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: rgba(255, 255, 255, 0.3);
                }
            `}</style>
        </motion.nav>
    );
};

export default Navbar;