import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence, useScroll, useTransform, useSpring, useMotionValue } from 'framer-motion';
import { 
    DollarSign, Briefcase, Building2, Landmark, 
    ArrowUp, ArrowDown, CreditCard, PieChart as PieChartIcon,
    Shield, BarChart2, LineChart as LineChartIcon, Plus, RefreshCw,
    TrendingUp, TrendingDown, Zap, Sparkles, ChevronRight,
    Activity, ArrowUpRight, Eye, EyeOff,
    Wallet, PiggyBank, Target, Award, Info, Calendar,
    Clock, Star, AlertCircle, ChevronDown,
    Globe, Filter, Search, Download, Settings, Bell,
    CheckCircle, XCircle, Layers, MoreHorizontal, Copy,
    ExternalLink, FileText, Users, Banknote, Lock,
    Maximize2, Minimize2, BadgeCheck, Gem, Crown, Gauge,
    Rocket, HandCoins, Scale, ShoppingBag, Trash2, Edit3,
    CandlestickChart, Calculator, Receipt, FileBarChart, PieChart,
    CheckSquare, Square, CircleDollarSign,
    Percent, Hash, AtSign, Waves
} from 'lucide-react';

// --- Reusable UI Components ---

// Particle System Component for background ambiance
const ParticleField = ({ count = 30 }) => {
    const particles = useMemo(() => {
        return Array.from({ length: count }, (_, i) => ({
            id: i,
            x: Math.random() * 100,
            y: Math.random() * 100,
            size: Math.random() * 3 + 1,
            duration: Math.random() * 15 + 10,
        }));
    }, [count]);

    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {particles.map((p) => (
                <motion.div
                    key={p.id}
                    className="absolute bg-white/10 rounded-full"
                    style={{ width: p.size, height: p.size, left: `${p.x}%`, top: `${p.y}%` }}
                    animate={{ y: [0, -20, 0], opacity: [0, 0.5, 0] }}
                    transition={{
                        duration: p.duration,
                        repeat: Infinity,
                        ease: "easeInOut",
                        delay: Math.random() * 5,
                    }}
                />
            ))}
        </div>
    );
};

// Glowing Orb Component for background color blobs
const GlowingOrb = ({ color, size, x, y, delay = 0 }) => (
    <motion.div
        className="absolute rounded-full pointer-events-none"
        style={{
            background: `radial-gradient(circle, ${color} 0%, transparent 70%)`,
            width: size, height: size, left: x, top: y,
            filter: 'blur(50px)',
        }}
        animate={{ scale: [1, 1.3, 1], opacity: [0.2, 0.4, 0.2] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay }}
    />
);

// Optimized 3D Card Component using useMotionValue
const Card3D = ({ children, className = "" }) => {
    const cardRef = useRef(null);
    const rotateX = useMotionValue(0);
    const rotateY = useMotionValue(0);

    const springConfig = { stiffness: 300, damping: 30 };
    const springRotateX = useSpring(rotateX, springConfig);
    const springRotateY = useSpring(rotateY, springConfig);

    const handleMouseMove = (e) => {
        if (!cardRef.current) return;
        const rect = cardRef.current.getBoundingClientRect();
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        const mouseX = e.clientX - rect.left - centerX;
        const mouseY = e.clientY - rect.top - centerY;
        
        rotateX.set(mouseY / 15);
        rotateY.set(-mouseX / 15);
    };

    const handleMouseLeave = () => {
        rotateX.set(0);
        rotateY.set(0);
    };

    return (
        <motion.div
            ref={cardRef}
            className={`relative ${className}`}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            style={{
                transformStyle: "preserve-3d",
                rotateX: springRotateX,
                rotateY: springRotateY,
            }}
        >
            <div style={{ transform: "translateZ(40px)" }}>
                {children}
            </div>
        </motion.div>
    );
};

// Animated Background Component
const AnimatedBackground = () => {
    return (
        <div className="fixed inset-0 z-0 bg-black">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-900/10 via-black to-blue-900/10" />
            <GlowingOrb color="rgba(168, 85, 247, 0.3)" size="400px" x="10%" y="20%" />
            <GlowingOrb color="rgba(59, 130, 246, 0.3)" size="500px" x="70%" y="50%" delay={2} />
            <ParticleField />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
        </div>
    );
};

// Animated counter with spring physics for smooth counting
const AnimatedCounter = ({ value, format = (v) => v, delay = 0 }) => {
    const springValue = useSpring(0, { stiffness: 100, damping: 20 });
    const [displayValue, setDisplayValue] = useState(0);

    useEffect(() => {
        const timeout = setTimeout(() => {
            springValue.set(value || 0);
        }, delay);
        const unsubscribe = springValue.on("change", (v) => setDisplayValue(v));
        return () => {
            clearTimeout(timeout);
            unsubscribe();
        };
    }, [value, springValue, delay]);
    
    return <span>{format(displayValue)}</span>;
};

// Performance Chart Component
const PerformanceChart = ({ showValues }) => {
    const [hoveredIndex, setHoveredIndex] = useState(null);
    const chartData = useMemo(() => Array.from({ length: 30 }, () => ({
        height: Math.random() * 80 + 20,
        isPositive: Math.random() > 0.4,
        change: (Math.random() * 5).toFixed(2)
    })), []);

    return (
        <div className="relative h-full">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-xl blur-lg" />
            <div className="relative h-full bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10">
                <div className="flex items-center justify-between mb-2">
                    <p className="text-sm text-gray-400">Performance Trend</p>
                    <div className="flex items-center gap-2">
                        <Waves className="w-4 h-4 text-blue-400 animate-pulse" />
                        <span className="text-xs text-gray-500">Live</span>
                    </div>
                </div>
                <div className="h-32 flex items-end justify-between gap-1 relative">
                    {chartData.map((bar, index) => (
                        <motion.div
                            key={index}
                            className="flex-1 relative group cursor-pointer"
                            initial={{ height: 0 }}
                            animate={{ height: `${bar.height}%` }}
                            transition={{ delay: index * 0.02, type: "spring" }}
                            onHoverStart={() => setHoveredIndex(index)}
                            onHoverEnd={() => setHoveredIndex(null)}
                        >
                            <div className={`w-full h-full rounded-t-sm transition-all ${
                                bar.isPositive ? 'bg-gradient-to-t from-green-500 to-emerald-400' : 'bg-gradient-to-t from-red-500 to-pink-400'
                            } ${hoveredIndex === index ? 'opacity-100' : 'opacity-70'}`} />
                            <AnimatePresence>
                                {hoveredIndex === index && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: 10 }}
                                        className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-black/80 text-white px-2 py-1 rounded text-xs whitespace-nowrap z-10"
                                    >
                                        <div className={bar.isPositive ? 'text-green-400' : 'text-red-400'}>
                                            {bar.isPositive ? '+' : '-'}{bar.change}%
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </motion.div>
                    ))}
                </div>
            </div>
        </div>
    );
};

// Utility functions
const formatCurrency = (value) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
const formatPercentage = (value) => `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;

// Main Component
export default function AccountsPage() {
    // --- State Management ---
    const [accounts, setAccounts] = useState([]);
    const [portfolioData, setPortfolioData] = useState(null);
    const [accountsMetrics, setAccountsMetrics] = useState({});
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showValues, setShowValues] = useState(true);
    const [selectedTimeframe, setSelectedTimeframe] = useState('1m');
    const [hoveredInstitution, setHoveredInstitution] = useState(null);
    
    const containerRef = useRef(null);
    const { scrollYProgress } = useScroll({ target: containerRef, offset: ["start start", "end start"] });

    // Parallax scroll animations for the header
    const headerY = useTransform(scrollYProgress, [0, 0.2], [0, -50]);
    const headerOpacity = useTransform(scrollYProgress, [0, 0.1], [1, 0.8]);

    // --- Data Configuration & Mocks ---
    const institutionGradients = useMemo(() => ({
        'Vanguard': 'from-red-500 to-pink-600',
        'Fidelity': 'from-green-500 to-teal-600',
        'Charles Schwab': 'from-blue-500 to-indigo-600',
        'Robinhood': 'from-emerald-400 to-green-600',
        'Chase': 'from-blue-600 to-blue-800',
        'E*TRADE': 'from-purple-500 to-indigo-600',
        'Other': 'from-gray-500 to-gray-700'
    }), []);

    // --- Data Loading and Processing ---
    const calculateAccountMetrics = useCallback((accountsData, portfolioInfo) => {
        if (!accountsData || !portfolioInfo) return {};
        const totalValue = portfolioInfo.current_value || 0;
        
        const institutionMap = accountsData.reduce((acc, account) => {
            const inst = account.institution || 'Other';
            if (!acc[inst]) acc[inst] = { name: inst, value: 0, accounts: 0 };
            acc[inst].value += account.total_value;
            acc[inst].accounts++;
            return acc;
        }, {});

        const institutionBreakdown = Object.values(institutionMap).map(inst => ({
            ...inst,
            percentage: totalValue > 0 ? (inst.value / totalValue) * 100 : 0,
            gradient: institutionGradients[inst.name] || institutionGradients.Other
        })).sort((a, b) => b.value - a.value);

        return {
            totalValue,
            totalAccounts: accountsData.length,
            totalInstitutionsCount: institutionBreakdown.length,
            institutionBreakdown,
        };
    }, [institutionGradients]);

    const loadAllData = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate API delay
            const mockAccounts = [
                { id: 1, account_name: 'Vanguard Brokerage', institution: 'Vanguard', account_type: 'Brokerage', total_value: 156789.45 },
                { id: 2, account_name: 'Fidelity 401k', institution: 'Fidelity', account_type: '401k', total_value: 234567.89 },
                { id: 3, account_name: 'Robinhood Fun', institution: 'Robinhood', account_type: 'Brokerage', total_value: 45678.90 },
                { id: 4, account_name: 'Chase Savings', institution: 'Chase', account_type: 'Savings', total_value: 25000.00 },
                { id: 5, account_name: 'Schwab Roth IRA', institution: 'Charles Schwab', account_type: 'Roth IRA', total_value: 78234.56 },
                { id: 6, account_name: 'E*TRADE IRA', institution: 'E*TRADE', account_type: 'IRA', total_value: 123456.78 },
            ];
            const mockPortfolio = {
                current_value: mockAccounts.reduce((sum, acc) => sum + acc.total_value, 0),
                period_changes: {
                    '1d': { value_change: 3318.79, percent_change: 0.50 },
                    '1w': { value_change: 9956.36, percent_change: 1.52 },
                    '1m': { value_change: 19912.73, percent_change: 3.09 },
                    'ytd': { value_change: 73757.58, percent_change: 12.50 }
                },
            };
            setAccounts(mockAccounts);
            setPortfolioData(mockPortfolio);
            setAccountsMetrics(calculateAccountMetrics(mockAccounts, mockPortfolio));
        } catch (err) {
            setError(err.message || "Failed to load data");
        } finally {
            setIsLoading(false);
        }
    }, [calculateAccountMetrics]);
    
    useEffect(() => {
        loadAllData();
    }, [loadAllData]);

    const currentPeriodChange = portfolioData?.period_changes[selectedTimeframe];

    // --- Render Logic ---
    if (isLoading) {
        return (
            <div className="min-h-screen bg-black text-white flex items-center justify-center">
                <AnimatedBackground />
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
                    <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                        className="w-20 h-20 mx-auto mb-4"
                    >
                        <CircleDollarSign className="w-full h-full text-purple-500" />
                    </motion.div>
                    <h2 className="text-xl font-bold">Loading your financial dashboard...</h2>
                </motion.div>
            </div>
        );
    }
    
    return (
        <div ref={containerRef} className="min-h-screen bg-black text-white">
            <AnimatedBackground />
            <div className="relative z-10 max-w-[1600px] mx-auto p-4 md:p-8">
                <motion.header 
                    className="mb-12"
                    style={{ y: headerY, opacity: headerOpacity }}
                >
                    <div className="flex justify-between items-center">
                         <h1 className="text-5xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
                            Accounts Dashboard
                        </h1>
                        <div className="flex items-center gap-2">
                             <motion.button
                                whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                                onClick={loadAllData}
                                className="flex items-center px-4 py-2 bg-white/10 rounded-lg font-medium"
                                disabled={isLoading}
                            >
                                <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                                Refresh
                            </motion.button>
                             <motion.button
                                whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                                onClick={() => setShowValues(!showValues)}
                                className="p-2 bg-white/10 rounded-lg"
                            >
                                {showValues ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
                            </motion.button>
                        </div>
                    </div>
                </motion.header>

                <motion.section
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="mb-12"
                >
                     <Card3D>
                        <div className="bg-gradient-to-br from-purple-900/30 via-black/30 to-blue-900/30 backdrop-blur-lg rounded-3xl p-8 border border-white/10 shadow-2xl">
                            <div className="flex justify-between items-center">
                                <div>
                                    <p className="text-gray-400 mb-2">Total Portfolio Value</p>
                                    <h2 className="text-6xl font-bold">
                                        {showValues ? (
                                            <AnimatedCounter value={accountsMetrics.totalValue} format={formatCurrency} />
                                        ) : '••••••'}
                                    </h2>
                                    <div className="flex items-center gap-4 mt-2">
                                        <div className={`flex items-center gap-1 ${currentPeriodChange?.percent_change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                            {currentPeriodChange?.percent_change >= 0 ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
                                            <span className="font-semibold text-xl">{currentPeriodChange ? formatPercentage(currentPeriodChange.percent_change) : ''}</span>
                                        </div>
                                        <span className="text-gray-400">{showValues && currentPeriodChange ? formatCurrency(currentPeriodChange.value_change) : ''}</span>
                                    </div>
                                </div>
                                <div className="flex gap-1 bg-white/10 p-1 rounded-lg">
                                     {['1d', '1w', '1m', 'ytd'].map((period) => (
                                        <motion.button
                                            key={period}
                                            onClick={() => setSelectedTimeframe(period)}
                                            className={`px-3 py-1 rounded-md text-sm relative ${selectedTimeframe !== period ? 'text-gray-400' : ''}`}
                                        >
                                            {selectedTimeframe === period && (
                                                <motion.div layoutId="activeTimeframe" className="absolute inset-0 bg-white/20 rounded-md" />
                                            )}
                                            <span className="relative">{period.toUpperCase()}</span>
                                        </motion.button>
                                    ))}
                                </div>
                            </div>
                        </div>
                     </Card3D>
                </motion.section>

                <motion.section
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="mb-12"
                >
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <div>
                            <h3 className="text-2xl font-bold mb-4 flex items-center gap-2"><Building2 className="text-purple-400"/> Institution Distribution</h3>
                            <div className="space-y-4">
                                {accountsMetrics.institutionBreakdown?.map((inst, i) => (
                                    <motion.div
                                        key={inst.name}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: 0.5 + i * 0.1 }}
                                        onHoverStart={() => setHoveredInstitution(inst.name)}
                                        onHoverEnd={() => setHoveredInstitution(null)}
                                    >
                                        <p className="text-sm flex justify-between mb-1">
                                            <span>{inst.name}</span>
                                            <span className="font-semibold">{formatPercentage(inst.percentage)}</span>
                                        </p>
                                        <div className="w-full h-2 bg-white/10 rounded-full">
                                            <motion.div 
                                                className={`h-full rounded-full bg-gradient-to-r ${inst.gradient}`}
                                                initial={{ width: 0 }}
                                                animate={{ width: `${inst.percentage}%`}}
                                                transition={{ duration: 0.8, ease: "easeOut", delay: 0.6 + i * 0.1 }}
                                            />
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </div>
                        <div className="relative h-[300px] flex items-center justify-center">
                             <motion.svg 
                                viewBox="0 0 256 256"
                                className="w-64 h-64"
                                animate={{ rotate: 360 }}
                                transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
                            >
                                <defs>
                                    {accountsMetrics.institutionBreakdown?.map((inst, index) => (
                                        <linearGradient key={`grad-${inst.name}`} id={`grad-${index}`} x1="0%" y1="0%" x2="100%" y2="100%">
                                            <stop offset="0%" stopColor={inst.gradient.split(' ')[0].replace('from-','')} />
                                            <stop offset="100%" stopColor={inst.gradient.split(' ')[1].replace('to-','')} />
                                        </linearGradient>
                                    ))}
                                </defs>
                                <g transform="rotate(-90 128 128)">
                                    {accountsMetrics.institutionBreakdown?.map((inst, index, arr) => {
                                        const startAngle = arr.slice(0, index).reduce((sum, i) => sum + i.percentage, 0);
                                        const sweep = inst.percentage;
                                        if (sweep === 0) return null;
                                        
                                        const startRad = (startAngle / 100) * 2 * Math.PI;
                                        const endRad = ((startAngle + sweep) / 100) * 2 * Math.PI;
                                        const largeArcFlag = sweep > 50 ? 1 : 0;
                                        
                                        const x1 = 128 + 128 * Math.cos(startRad);
                                        const y1 = 128 + 128 * Math.sin(startRad);
                                        const x2 = 128 + 128 * Math.cos(endRad);
                                        const y2 = 128 + 128 * Math.sin(endRad);

                                        const pathD = `M 128 128 L ${x1} ${y1} A 128 128 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;
                                        
                                        return (
                                            <motion.path
                                                key={inst.name}
                                                d={pathD}
                                                fill={`url(#grad-${index})`}
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: hoveredInstitution === null || hoveredInstitution === inst.name ? 1 : 0.5 }}
                                                whileHover={{ scale: 1.05, transition: { duration: 0.2 } }}
                                                style={{ transformOrigin: '128px 128px', transition: 'opacity 0.2s, transform 0.2s' }}
                                            />
                                        );
                                    })}
                                </g>
                                <circle cx="128" cy="128" r="60" fill="black" />
                                <text x="128" y="128" textAnchor="middle" dominantBaseline="middle" fill="white" fontSize="48" fontWeight="bold">
                                    {accountsMetrics.totalInstitutionsCount}
                                </text>
                                 <text x="128" y="155" textAnchor="middle" dominantBaseline="middle" fill="gray" fontSize="16">
                                    Institutions
                                </text>
                            </motion.svg>
                        </div>
                    </div>
                </motion.section>
            </div>
        </div>
    );
}
