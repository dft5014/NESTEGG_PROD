import React, { useState, useEffect, useContext } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { motion, AnimatePresence } from 'framer-motion';
import { AuthContext } from '@/context/AuthContext';
import {
    Home, PieChart, LineChart, Wallet, DollarSign, BarChart3,
    Settings, HelpCircle, LogOut, ChevronLeft, ChevronRight,
    Activity, Shield, Clock, FileText, TrendingUp, Target,
    Award, Zap, Sparkles, Menu, X, Calendar, BookOpen,
    Calculator, Globe, Database, Bell, CreditCard
} from 'lucide-react';

const Sidebar = () => {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isMobileOpen, setIsMobileOpen] = useState(false);
    const { user, logout } = useContext(AuthContext);
    const router = useRouter();

    // Close mobile sidebar when route changes
    useEffect(() => {
        setIsMobileOpen(false);
    }, [router.pathname]);

    // Prevent body scroll when mobile sidebar is open
    useEffect(() => {
        if (isMobileOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isMobileOpen]);

    const navigationItems = [
        {
            section: 'Main',
            items: [
                { 
                    href: '/', 
                    label: 'Dashboard', 
                    icon: Home,
                    gradient: 'from-blue-500 to-indigo-600',
                    description: 'Overview & insights'
                },
                { 
                    href: '/portfolio', 
                    label: 'Portfolio', 
                    icon: PieChart,
                    gradient: 'from-purple-500 to-pink-600',
                    description: 'Asset allocation'
                },
                { 
                    href: '/positions', 
                    label: 'Positions', 
                    icon: LineChart,
                    gradient: 'from-green-500 to-emerald-600',
                    description: 'Individual holdings'
                },
                { 
                    href: '/accounts', 
                    label: 'Accounts', 
                    icon: Wallet,
                    gradient: 'from-orange-500 to-amber-600',
                    description: 'Connected accounts'
                },
                { 
                    href: '/transactions', 
                    label: 'Transactions', 
                    icon: DollarSign,
                    gradient: 'from-cyan-500 to-blue-600',
                    description: 'Trading history'
                }
            ]
        },
        {
            section: 'Analytics',
            items: [
                { 
                    href: '/performance', 
                    label: 'Performance', 
                    icon: TrendingUp,
                    gradient: 'from-emerald-500 to-teal-600',
                    description: 'Returns analysis'
                },
                { 
                    href: '/analytics', 
                    label: 'Analytics', 
                    icon: BarChart3,
                    gradient: 'from-indigo-500 to-purple-600',
                    description: 'Deep insights'
                },
                { 
                    href: '/goals', 
                    label: 'Goals', 
                    icon: Target,
                    gradient: 'from-pink-500 to-rose-600',
                    description: 'Track objectives'
                }
            ]
        },
        {
            section: 'Tools',
            items: [
                { 
                    href: '/calculator', 
                    label: 'Calculator', 
                    icon: Calculator,
                    gradient: 'from-blue-500 to-cyan-600',
                    description: 'Financial tools'
                },
                { 
                    href: '/research', 
                    label: 'Research', 
                    icon: BookOpen,
                    gradient: 'from-purple-500 to-indigo-600',
                    description: 'Market research'
                },
                { 
                    href: '/calendar', 
                    label: 'Calendar', 
                    icon: Calendar,
                    gradient: 'from-green-500 to-emerald-600',
                    description: 'Events & dividends'
                }
            ]
        }
    ];

    const bottomItems = [
        { 
            href: '/activity', 
            label: 'Activity', 
            icon: Activity,
            gradient: 'from-gray-600 to-gray-700'
        },
        { 
            href: '/settings', 
            label: 'Settings', 
            icon: Settings,
            gradient: 'from-gray-600 to-gray-700'
        },
        { 
            href: '/help', 
            label: 'Help', 
            icon: HelpCircle,
            gradient: 'from-gray-600 to-gray-700'
        }
    ];

    const NavItem = ({ item, isActive }) => {
        const Icon = item.icon;
        
        return (
            <Link href={item.href}>
                <motion.div
                    className={`
                        relative flex items-center px-3 py-2.5 rounded-xl cursor-pointer
                        transition-all duration-300 group
                        ${isActive 
                            ? 'bg-white/10 text-white' 
                            : 'text-gray-300 hover:bg-white/5 hover:text-white'
                        }
                    `}
                    whileHover={{ x: 2 }}
                    whileTap={{ scale: 0.98 }}
                >
                    {/* Active indicator */}
                    {isActive && (
                        <motion.div
                            layoutId="activeNav"
                            className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-gradient-to-b from-blue-400 to-purple-400 rounded-r-full"
                            initial={false}
                            transition={{ type: "spring", stiffness: 300 }}
                        />
                    )}
                    
                    <div className={`
                        p-2 rounded-lg mr-3 bg-gradient-to-r ${item.gradient}
                        ${isActive ? 'shadow-lg' : 'opacity-80 group-hover:opacity-100'}
                        transition-all duration-300
                    `}>
                        <Icon className="w-5 h-5 text-white" />
                    </div>
                    
                    {!isCollapsed && (
                        <div className="flex-1">
                            <p className="font-medium text-sm">{item.label}</p>
                            {item.description && (
                                <p className="text-xs text-gray-400 mt-0.5">{item.description}</p>
                            )}
                        </div>
                    )}
                    
                    {/* Hover effect */}
                    {!isActive && (
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-xl" />
                    )}
                </motion.div>
            </Link>
        );
    };

    return (
        <>
            {/* Mobile Menu Button */}
            <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsMobileOpen(!isMobileOpen)}
                className="lg:hidden fixed top-24 left-4 z-50 p-3 bg-gray-900/90 backdrop-blur-sm rounded-xl border border-white/10 shadow-lg"
            >
                {isMobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </motion.button>

            {/* Mobile Overlay */}
            <AnimatePresence>
                {isMobileOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setIsMobileOpen(false)}
                        className="lg:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
                    />
                )}
            </AnimatePresence>

            {/* Sidebar */}
            <motion.aside
                initial={{ x: -280 }}
                animate={{ 
                    x: isMobileOpen ? 0 : -280,
                    width: isCollapsed ? 80 : 280 
                }}
                className={`
                    fixed lg:sticky top-0 h-screen
                    bg-gray-900/95 backdrop-blur-xl
                    border-r border-white/10
                    transition-all duration-300 z-40
                    lg:translate-x-0
                    ${isCollapsed ? 'lg:w-20' : 'lg:w-72'}
                `}
            >
                <div className="flex flex-col h-full">
                    {/* Header */}
                    <div className="p-4 border-b border-white/10">
                        <div className="flex items-center justify-between">
                            {!isCollapsed ? (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="flex items-center space-x-3"
                                >
                                    <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl">
                                        <Sparkles className="w-6 h-6 text-white" />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-bold text-white">NestEgg</h2>
                                        <p className="text-xs text-gray-400">Financial Hub</p>
                                    </div>
                                </motion.div>
                            ) : (
                                <div className="mx-auto p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl">
                                    <Sparkles className="w-6 h-6 text-white" />
                                </div>
                            )}
                            
                            <motion.button
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={() => setIsCollapsed(!isCollapsed)}
                                className="hidden lg:block p-2 rounded-lg hover:bg-white/10 transition-colors"
                            >
                                {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
                            </motion.button>
                        </div>
                    </div>

                    {/* Navigation */}
                    <div className="flex-1 overflow-y-auto px-3 py-4">
                        {navigationItems.map((section, sectionIndex) => (
                            <div key={section.section} className={sectionIndex > 0 ? 'mt-6' : ''}>
                                {!isCollapsed && (
                                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-3">
                                        {section.section}
                                    </h3>
                                )}
                                <div className="space-y-1">
                                    {section.items.map((item) => (
                                        <NavItem
                                            key={item.href}
                                            item={item}
                                            isActive={router.pathname === item.href}
                                        />
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Bottom Section */}
                    <div className="border-t border-white/10 p-3">
                        <div className="space-y-1">
                            {bottomItems.map((item) => (
                                <NavItem
                                    key={item.href}
                                    item={item}
                                    isActive={router.pathname === item.href}
                                />
                            ))}
                            
                            {/* Logout Button */}
                            <motion.button
                                whileHover={{ x: 2 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={logout}
                                className="w-full flex items-center px-3 py-2.5 rounded-xl text-gray-300 hover:bg-red-500/10 hover:text-red-400 transition-all"
                            >
                                <div className="p-2 rounded-lg bg-gradient-to-r from-red-600 to-red-700 mr-3">
                                    <LogOut className="w-5 h-5 text-white" />
                                </div>
                                {!isCollapsed && <span className="font-medium text-sm">Logout</span>}
                            </motion.button>
                        </div>
                    </div>

                    {/* Pro Badge */}
                    {!isCollapsed && (
                        <div className="p-4 border-t border-white/10">
                            <motion.div
                                whileHover={{ scale: 1.02 }}
                                className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl p-4 text-center cursor-pointer"
                            >
                                <Award className="w-8 h-8 text-white mx-auto mb-2" />
                                <p className="text-white font-bold">Premium Plan</p>
                                <p className="text-white/80 text-xs mt-1">All features unlocked</p>
                            </motion.div>
                        </div>
                    )}
                </div>
            </motion.aside>
        </>
    );
};

export default Sidebar;