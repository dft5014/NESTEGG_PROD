// components/Navbar.js
import { useState, useContext, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { QuickStartButton } from '@/components/QuickStartModal';
import { AuthContext } from '@/context/AuthContext';
import {
    User, Settings, LogOut, HelpCircle, Shield, Clock, 
    ChevronDown, Loader2, AlertCircle, Activity, TrendingUp,
    Bell, Search, Moon, Sun, MoreVertical
} from 'lucide-react';
import UpdateStatusIndicator from '@/components/UpdateStatusIndicator';
import AddPositionButton from '@/components/AddPositionButton';
import AddAccountButton from '@/components/AddAccountButton';
import { fetchAccounts } from '@/utils/apimethods/accountMethods';
import { QuickReconciliationButton } from '@/components/modals/QuickReconciliationModal';
import { QuickEditDeleteButton } from '@/components/modals/QuickEditDeleteModal';
import { motion, AnimatePresence } from 'framer-motion';

const Navbar = () => {
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const [accounts, setAccounts] = useState([]);
    const [isLoadingAccounts, setIsLoadingAccounts] = useState(false);
    const [accountError, setAccountError] = useState(null);
    const [searchOpen, setSearchOpen] = useState(false);
    const [darkMode, setDarkMode] = useState(true);
    const { logout, user } = useContext(AuthContext);
    const router = useRouter();

    // Handle scroll
    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 10);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Load accounts
    const loadAccounts = useCallback(async () => {
        setIsLoadingAccounts(true);
        setAccountError(null);
        try {
            const response = await fetchAccounts();
            setAccounts(response.data || []);
        } catch (error) {
            console.error("Error loading accounts:", error);
            setAccountError("Failed to load accounts");
            setAccounts([]);
        } finally {
            setIsLoadingAccounts(false);
        }
    }, []);

    useEffect(() => {
        loadAccounts();
    }, [loadAccounts]);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (isDropdownOpen && !event.target.closest('.user-dropdown')) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isDropdownOpen]);

    const getInitials = useCallback(() => {
        if (user?.first_name && user?.last_name) {
            return `${user.first_name[0]}${user.last_name[0]}`.toUpperCase();
        } else if (user?.email) {
            return user.email[0].toUpperCase();
        }
        return 'U';
    }, [user]);

    const displayName = user?.first_name && user?.last_name 
        ? `${user.first_name} ${user.last_name}` 
        : user?.email || 'User';

    return (
        <motion.nav
            initial={{ y: -100 }}
            animate={{ y: 0 }}
            className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 ${
                scrolled 
                    ? 'bg-gray-900/95 backdrop-blur-md shadow-lg' 
                    : 'bg-gradient-to-r from-gray-900 via-gray-850 to-blue-900'
            }`}
        >
            <div className="h-16 px-4 flex items-center justify-between">
                {/* Left side - Quick Actions (Always visible) */}
                <div className="flex items-center gap-2 ml-16">
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 }}
                    >
                        <QuickStartButton />
                    </motion.div>
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 }}
                    >
                        <QuickEditDeleteButton />
                    </motion.div>
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.3 }}
                    >
                        <QuickReconciliationButton />
                    </motion.div>
                    
                    {/* Manual Add Dropdown */}
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.4 }}
                        className="relative"
                    >
                        <AddPositionButton accounts={accounts} fetchPositions={() => {}} />
                    </motion.div>
                    
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.5 }}
                    >
                        <AddAccountButton fetchAccounts={loadAccounts} />
                    </motion.div>
                </div>

                {/* Right side - User Menu */}
                <div className="flex items-center gap-4">
                    {/* Search */}
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setSearchOpen(!searchOpen)}
                        className="p-2 rounded-lg hover:bg-gray-800/50 text-gray-300 hover:text-white transition-all"
                    >
                        <Search className="w-5 h-5" />
                    </motion.button>

                    {/* Notifications */}
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="relative p-2 rounded-lg hover:bg-gray-800/50 text-gray-300 hover:text-white transition-all"
                    >
                        <Bell className="w-5 h-5" />
                        <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                    </motion.button>

                    {/* Dark Mode Toggle */}
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setDarkMode(!darkMode)}
                        className="p-2 rounded-lg hover:bg-gray-800/50 text-gray-300 hover:text-white transition-all"
                    >
                        <AnimatePresence mode="wait">
                            {darkMode ? (
                                <motion.div
                                    key="moon"
                                    initial={{ rotate: -90, opacity: 0 }}
                                    animate={{ rotate: 0, opacity: 1 }}
                                    exit={{ rotate: 90, opacity: 0 }}
                                >
                                    <Moon className="w-5 h-5" />
                                </motion.div>
                            ) : (
                                <motion.div
                                    key="sun"
                                    initial={{ rotate: 90, opacity: 0 }}
                                    animate={{ rotate: 0, opacity: 1 }}
                                    exit={{ rotate: -90, opacity: 0 }}
                                >
                                    <Sun className="w-5 h-5" />
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.button>

                    {/* User Dropdown */}
                    <div className="relative user-dropdown">
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                            className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-800/50 
                                     transition-all border border-transparent hover:border-gray-700"
                        >
                            <div className="relative">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 
                                              flex items-center justify-center text-white font-semibold shadow-lg">
                                    {getInitials()}
                                </div>
                                {/* Status indicator */}
                                <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full 
                                              border-2 border-gray-900 animate-pulse" />
                            </div>
                            <div className="hidden md:block text-left">
                                <p className="text-sm font-medium text-white">{displayName}</p>
                                <p className="text-xs text-gray-400">Premium Member</p>
                            </div>
                            <motion.div
                                animate={{ rotate: isDropdownOpen ? 180 : 0 }}
                                transition={{ duration: 0.2 }}
                            >
                                <ChevronDown className="w-4 h-4 text-gray-400" />
                            </motion.div>
                        </motion.button>

                        <AnimatePresence>
                            {isDropdownOpen && (
                                <motion.div
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className="absolute right-0 mt-2 w-72 bg-gray-800 rounded-xl shadow-2xl 
                                             border border-gray-700 overflow-hidden"
                                >
                                    {/* User info header */}
                                    <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur 
                                                          flex items-center justify-center text-white font-bold text-lg">
                                                {getInitials()}
                                            </div>
                                            <div className="flex-1">
                                                <p className="font-semibold text-white">{displayName}</p>
                                                <p className="text-sm text-blue-100 truncate">{user?.email}</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Market Data Status */}
                                    <div className="p-4 border-b border-gray-700">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <Activity className="w-4 h-4 text-green-400" />
                                                <span className="text-sm text-gray-300">Market Data</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <UpdateStatusIndicator />
                                                <span className="text-xs text-green-400">Live</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Menu items */}
                                    <div className="py-2">
                                        <Link href="/profile">
                                            <motion.div
                                                whileHover={{ x: 4 }}
                                                className="flex items-center gap-3 px-4 py-3 hover:bg-gray-700/50 
                                                         transition-all text-gray-300 hover:text-white"
                                            >
                                                <User className="w-5 h-5" />
                                                <span>Profile</span>
                                            </motion.div>
                                        </Link>
                                        
                                        <Link href="/admin">
                                            <motion.div
                                                whileHover={{ x: 4 }}
                                                className="flex items-center gap-3 px-4 py-3 hover:bg-gray-700/50 
                                                         transition-all text-gray-300 hover:text-white"
                                            >
                                                <Shield className="w-5 h-5" />
                                                <span>Admin Panel</span>
                                            </motion.div>
                                        </Link>
                                        
                                        <Link href="/settings">
                                            <motion.div
                                                whileHover={{ x: 4 }}
                                                className="flex items-center gap-3 px-4 py-3 hover:bg-gray-700/50 
                                                         transition-all text-gray-300 hover:text-white"
                                            >
                                                <Settings className="w-5 h-5" />
                                                <span>Settings</span>
                                            </motion.div>
                                        </Link>
                                        
                                        <Link href="/scheduler">
                                            <motion.div
                                                whileHover={{ x: 4 }}
                                                className="flex items-center gap-3 px-4 py-3 hover:bg-gray-700/50 
                                                         transition-all text-gray-300 hover:text-white"
                                            >
                                                <Clock className="w-5 h-5" />
                                                <span>Scheduler</span>
                                            </motion.div>
                                        </Link>
                                        
                                        <Link href="/help">
                                            <motion.div
                                                whileHover={{ x: 4 }}
                                                className="flex items-center gap-3 px-4 py-3 hover:bg-gray-700/50 
                                                         transition-all text-gray-300 hover:text-white"
                                            >
                                                <HelpCircle className="w-5 h-5" />
                                                <span>Help & Support</span>
                                            </motion.div>
                                        </Link>
                                        
                                        <div className="border-t border-gray-700 mt-2 pt-2">
                                            <motion.button
                                                whileHover={{ x: 4 }}
                                                onClick={() => {
                                                    setIsDropdownOpen(false);
                                                    logout();
                                                }}
                                                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-red-500/10 
                                                         transition-all text-red-400 hover:text-red-300"
                                            >
                                                <LogOut className="w-5 h-5" />
                                                <span>Logout</span>
                                            </motion.button>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>

                {/* Search overlay */}
                <AnimatePresence>
                    {searchOpen && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-gray-900/95 backdrop-blur-md flex items-center px-4"
                        >
                            <div className="flex-1 max-w-2xl mx-auto">
                                <input
                                    type="text"
                                    placeholder="Search accounts, positions, or features..."
                                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg 
                                             text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                                    autoFocus
                                />
                            </div>
                            <motion.button
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={() => setSearchOpen(false)}
                                className="ml-4 p-2 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-white"
                            >
                                <span className="text-sm">ESC</span>
                            </motion.button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </motion.nav>
    );
};

export default Navbar;