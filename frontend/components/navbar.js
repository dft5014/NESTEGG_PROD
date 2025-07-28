// components/Navbar.js
import { useState, useContext, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { QuickStartButton } from '@/components/QuickStartModal';
import { AuthContext } from '@/context/AuthContext';
import {
    User, Settings, LogOut, HelpCircle, Shield, Clock, 
    ChevronDown, Loader2, AlertCircle, Activity, Plus,
    TrendingUp, TrendingDown
} from 'lucide-react';
import UpdateStatusIndicator from '@/components/UpdateStatusIndicator';
import AddPositionButton from '@/components/AddPositionButton';
import AddAccountButton from '@/components/AddAccountButton';
import { fetchAccounts } from '@/utils/apimethods/accountMethods';
import { QuickReconciliationButton } from '@/components/modals/QuickReconciliationModal';
import { QuickEditDeleteButton } from '@/components/modals/QuickEditDeleteModal';
import { motion, AnimatePresence } from 'framer-motion';

// Stock ticker component
const StockTicker = () => {
  const [tickerPosition, setTickerPosition] = useState(0);
  
  // Mock data - replace with real data
  const stocks = [
    { symbol: 'AAPL', price: 182.52, change: 2.34, changePercent: 1.30, isUp: true },
    { symbol: 'GOOGL', price: 142.18, change: -1.23, changePercent: -0.86, isUp: false },
    { symbol: 'MSFT', price: 378.91, change: 4.56, changePercent: 1.22, isUp: true },
    { symbol: 'AMZN', price: 156.33, change: 3.21, changePercent: 2.10, isUp: true },
    { symbol: 'TSLA', price: 238.45, change: -5.67, changePercent: -2.32, isUp: false },
    { symbol: 'META', price: 456.78, change: 8.90, changePercent: 1.99, isUp: true },
    { symbol: 'NVDA', price: 678.90, change: 12.34, changePercent: 1.85, isUp: true },
    { symbol: 'BTC', price: 64230.50, change: 1234.56, changePercent: 1.96, isUp: true },
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setTickerPosition((prev) => prev - 1);
    }, 30);
    return () => clearInterval(interval);
  }, []);

  const tickerContent = [...stocks, ...stocks, ...stocks]; // Triple for smooth loop

  return (
    <div className="relative h-8 bg-gray-950 border-t border-gray-800 overflow-hidden">
      <div 
        className="absolute flex items-center h-full whitespace-nowrap"
        style={{ transform: `translateX(${tickerPosition}px)` }}
      >
        {tickerContent.map((stock, index) => (
          <div key={index} className="inline-flex items-center px-6">
            <span className="font-semibold text-gray-300 mr-2">{stock.symbol}</span>
            <span className="text-gray-400 mr-3">${stock.price.toFixed(2)}</span>
            <span className={`flex items-center ${stock.isUp ? 'text-green-400' : 'text-red-400'}`}>
              {stock.isUp ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
              {stock.isUp ? '+' : ''}{stock.change.toFixed(2)} ({stock.changePercent.toFixed(2)}%)
            </span>
          </div>
        ))}
      </div>
      {/* Gradient overlays for smooth edges */}
      <div className="absolute left-0 top-0 h-full w-20 bg-gradient-to-r from-gray-950 to-transparent pointer-events-none" />
      <div className="absolute right-0 top-0 h-full w-20 bg-gradient-to-l from-gray-950 to-transparent pointer-events-none" />
    </div>
  );
};

const Navbar = () => {
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [isManualAddOpen, setIsManualAddOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const [accounts, setAccounts] = useState([]);
    const [isLoadingAccounts, setIsLoadingAccounts] = useState(false);
    const [accountError, setAccountError] = useState(null);
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

    // Close dropdowns when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (isDropdownOpen && !event.target.closest('.user-dropdown')) {
                setIsDropdownOpen(false);
            }
            if (isManualAddOpen && !event.target.closest('.manual-add-dropdown')) {
                setIsManualAddOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isDropdownOpen, isManualAddOpen]);

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
        <div className="fixed top-0 left-0 right-0 z-40">
            <motion.nav
                initial={{ y: -100 }}
                animate={{ y: 0 }}
                className={`transition-all duration-300 ${
                    scrolled 
                        ? 'bg-gray-900/95 backdrop-blur-md shadow-lg' 
                        : 'bg-gradient-to-r from-gray-900 via-gray-850 to-blue-900'
                }`}
            >
                <div className="h-16 px-4 flex items-center justify-between">
                    {/* Center-aligned Quick Actions */}
                    <div className="flex-1 flex justify-center">
                        <div className="flex items-center gap-2 ml-20"> {/* ml-20 to account for expanded sidebar */}
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.1 }}
                            >
                                <QuickStartButton />
                            </motion.div>
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2 }}
                            >
                                <QuickEditDeleteButton />
                            </motion.div>
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.3 }}
                            >
                                <QuickReconciliationButton />
                            </motion.div>
                            
                            {/* Manual Add Dropdown */}
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.4 }}
                                className="relative manual-add-dropdown"
                            >
                                <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => setIsManualAddOpen(!isManualAddOpen)}
                                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 
                                             text-white rounded-lg transition-all shadow-lg hover:shadow-xl"
                                >
                                    <Plus className="w-4 h-4" />
                                    <span className="text-sm font-medium">Add New</span>
                                    <motion.div
                                        animate={{ rotate: isManualAddOpen ? 180 : 0 }}
                                        transition={{ duration: 0.2 }}
                                    >
                                        <ChevronDown className="w-4 h-4" />
                                    </motion.div>
                                </motion.button>

                                <AnimatePresence>
                                    {isManualAddOpen && (
                                        <motion.div
                                            initial={{ opacity: 0, y: -10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -10 }}
                                            className="absolute top-full mt-2 w-48 bg-gray-800 rounded-lg shadow-xl 
                                                     border border-gray-700 overflow-hidden z-50"
                                        >
                                            <AddAccountButton 
                                                fetchAccounts={loadAccounts} 
                                                className="w-full text-left px-4 py-3 hover:bg-gray-700 transition-colors"
                                            />
                                            <AddPositionButton 
                                                accounts={accounts} 
                                                fetchPositions={() => {}}
                                                className="w-full text-left px-4 py-3 hover:bg-gray-700 transition-colors"
                                            />
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </motion.div>
                        </div>
                    </div>

                    {/* Right side - User Menu */}
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
                                <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full 
                                              border-2 border-gray-900" />
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
            </motion.nav>
            
            {/* Stock ticker */}
            <StockTicker />
        </div>
    );
};

export default Navbar;