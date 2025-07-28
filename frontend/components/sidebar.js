// components/sidebar.js
import Link from 'next/link';
import { 
  LayoutGrid, TrendingUp, Wallet, Coins, CreditCard, 
  Settings, LogOut, Plus, Target, BarChart3, Menu, X,
  Search, Bell, Moon, Sun
} from 'lucide-react';
import { useContext, useState, useEffect, useRef } from 'react';
import { AuthContext } from '@/context/AuthContext';
import { useRouter } from 'next/router';
import { motion, AnimatePresence } from 'framer-motion';

const Sidebar = () => {
  const { logout, user } = useContext(AuthContext);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [hoveredItem, setHoveredItem] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [notifications, setNotifications] = useState(3);
  const [darkMode, setDarkMode] = useState(true);
  const searchRef = useRef(null);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Handle resize for responsive behavior
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setSidebarCollapsed(true);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Focus search when opened
  useEffect(() => {
    if (showSearch && searchRef.current) {
      searchRef.current.focus();
    }
  }, [showSearch]);

  // Check if current route matches
  const isActive = (path) => {
    return router.pathname === path || router.pathname.startsWith(`${path}/`);
  };

  // Enhanced menu structure with better icons
  const menuItems = [
    { 
      href: "/portfolio", 
      label: "Dashboard", 
      icon: <LayoutGrid className="w-5 h-5" />,
      description: "View your portfolio overview and key metrics"
    },
    { 
      href: "/command-center", 
      label: "Command Center", 
      icon: <BarChart3 className="w-5 h-5" />,
      isPremium: true,
      description: "Advanced analytics, insights, and reporting tools"
    },
    // NestEgg Management items (no group header)
    { 
      href: "/accounts", 
      label: "Accounts", 
      icon: <Wallet className="w-5 h-5" />,
      description: "Manage your investment and savings accounts"
    },
    { 
      href: "/positions", 
      label: "Positions", 
      icon: <Coins className="w-5 h-5" />,
      description: "Track your holdings, stocks, and investments"
    },
    { 
      href: "/liabilities", 
      label: "Liabilities", 
      icon: <CreditCard className="w-5 h-5" />,
      description: "Monitor your debts, loans, and obligations"
    },
    { 
      href: "/planning", 
      label: "Planning", 
      icon: <Target className="w-5 h-5" />,
      isPremium: true,
      description: "Financial planning and retirement tools"
    }
  ];

  // Filter menu items based on search
  const filterMenuItems = (items, query) => {
    if (!query) return items;
    return items.filter(item => 
      item.label.toLowerCase().includes(query.toLowerCase())
    );
  };

  const filteredMenuItems = filterMenuItems(menuItems, searchQuery);

  // Logo component with spinning animation
  const NestEggLogo = () => {
    const [isSpinning, setIsSpinning] = useState(false);

    useEffect(() => {
      setIsSpinning(!sidebarCollapsed);
    }, []);

    return (
      <motion.div 
        className="relative cursor-default" // Remove cursor pointer
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <motion.svg
          width="40"
          height="40"
          viewBox="0 0 40 40"
          xmlns="http://www.w3.org/2000/svg"
          className="text-blue-400"
          animate={isSpinning ? { rotate: 360 } : {}}
          transition={isSpinning ? {
            duration: 20,
            repeat: Infinity,
            ease: "linear"
          } : {}}
        >
          <defs>
            <linearGradient id="eggGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#60A5FA" />
              <stop offset="50%" stopColor="#3B82F6" />
              <stop offset="100%" stopColor="#2563EB" />
            </linearGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>
          <path
            d="M20 4C14 4 8 14 8 24C8 32 13 36 20 36C27 36 32 32 32 24C32 14 26 4 20 4Z"
            fill="url(#eggGradient)"
            stroke="currentColor"
            strokeWidth="1.5"
            filter="url(#glow)"
          />
          <circle cx="16" cy="18" r="2" fill="#1E3A8A" />
          <circle cx="24" cy="18" r="2" fill="#1E3A8A" />
          <path d="M16 26C17.5 27.5 22.5 27.5 24 26" stroke="#1E3A8A" strokeWidth="2" strokeLinecap="round" />
        </motion.svg>
      </motion.div>
    );
  };

  // Animation variants
  const sidebarVariants = {
    expanded: { width: '16rem' },
    collapsed: { width: '5rem' }
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: { opacity: 1, x: 0 }
  };

  const badgeVariants = {
    initial: { scale: 0 },
    animate: { scale: 1 },
    hover: { scale: 1.1 }
  };

  if (!mounted) return null;

  return (
    <>
      {/* Mobile overlay */}
      <AnimatePresence>
        {!sidebarCollapsed && typeof window !== 'undefined' && window.innerWidth < 768 && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="md:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
            onClick={() => setSidebarCollapsed(true)}
          />
        )}
      </AnimatePresence>

      <motion.aside 
        initial={false}
        animate={sidebarCollapsed ? 'collapsed' : 'expanded'}
        variants={sidebarVariants}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className="fixed left-0 top-0 h-screen bg-gradient-to-b from-gray-900 via-gray-900 to-gray-950 
                   text-white shadow-2xl z-50 flex flex-col overflow-hidden"
      >
        {/* Toggle button at the very top */}
        <div className="p-4 border-b border-gray-800/50">
          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            onMouseEnter={() => setHoveredItem('menu-toggle')}
            onMouseLeave={() => setHoveredItem(null)}
            className="w-full p-2 rounded-lg hover:bg-gray-800 transition-colors flex items-center justify-center relative"
          >
            {sidebarCollapsed ? (
              <Menu className="w-5 h-5 text-gray-300" />
            ) : (
              <X className="w-5 h-5 text-gray-300" />
            )}
            
            {/* Tooltip */}
            {sidebarCollapsed && hoveredItem === 'menu-toggle' && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="absolute left-20 ml-2 px-3 py-2 bg-gray-800 rounded-lg shadow-xl 
                         border border-gray-700 whitespace-nowrap z-50"
              >
                <p className="text-sm font-medium">Expand Menu</p>
              </motion.div>
            )}
          </motion.button>
        </div>

        {/* Logo - No longer clickable */}
        <div className="p-4 border-b border-gray-800/50">
          <div className="flex items-center gap-3">
            <NestEggLogo />
            <AnimatePresence>
              {!sidebarCollapsed && (
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="flex flex-col"
                >
                  <span className="text-xl font-bold bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent">
                    NestEgg
                  </span>
                  <span className="text-xs text-gray-400">Plan Your Future</span>
                </motion.div>
              )}
            </AnimatePresence>
            
            {/* Tooltip for collapsed logo */}
            {sidebarCollapsed && hoveredItem === 'logo' && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="absolute left-20 ml-2 px-3 py-2 bg-gray-800 rounded-lg shadow-xl 
                         border border-gray-700 whitespace-nowrap z-50"
              >
                <p className="text-sm font-medium">NestEgg</p>
                <p className="text-xs text-gray-400">Plan Your Future</p>
              </motion.div>
            )}
          </div>
        </div>

        {/* Search bar - only when expanded */}
        <AnimatePresence>
          {!sidebarCollapsed && showSearch && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="p-4 border-b border-gray-800/50"
            >
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  ref={searchRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search..."
                  className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg 
                           text-sm text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Navigation */}
        <nav className="flex-1 p-2 overflow-y-auto custom-scrollbar">
          <div className="space-y-1">
            {/* Show section header only when expanded */}
            {!sidebarCollapsed && (
              <div className="px-3 py-2 mt-4 mb-2">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  NestEgg Management
                </span>
              </div>
            )}

            {/* Menu items */}
            {filteredMenuItems.map((item, index) => (
              <motion.div
                key={index}
                variants={itemVariants}
                initial="hidden"
                animate="visible"
                transition={{ delay: index * 0.05 }}
              >
                <Link href={item.href}>
                  <motion.div
                    whileHover={{ x: sidebarCollapsed ? 0 : 4 }}
                    whileTap={{ scale: 0.98 }}
                    onMouseEnter={() => setHoveredItem(`item-${index}`)}
                    onMouseLeave={() => setHoveredItem(null)}
                    className={`
                      relative flex items-center gap-3 p-3 rounded-lg
                      transition-all duration-200 group
                      ${isActive(item.href) 
                        ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-600/20' 
                        : 'hover:bg-gray-800/50 text-gray-300 hover:text-white'
                      }
                      ${sidebarCollapsed ? 'justify-center' : 'justify-between'}
                    `}
                  >
                    <div className="flex items-center gap-3">
                      <motion.div
                        whileHover={{ rotate: 5, scale: 1.1 }}
                        className="transition-transform relative"
                      >
                        {item.icon}
                        {/* Premium indicator for collapsed state */}
                        {sidebarCollapsed && item.isPremium && (
                          <motion.div
                            variants={badgeVariants}
                            initial="initial"
                            animate="animate"
                            whileHover="hover"
                            className="absolute -top-1 -right-1 w-3 h-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"
                          >
                            <Plus className="w-3 h-3 text-white p-0.5" />
                          </motion.div>
                        )}
                      </motion.div>
                      {!sidebarCollapsed && <span className="font-medium">{item.label}</span>}
                    </div>
                    
                    {/* Premium badge for expanded state */}
                    {!sidebarCollapsed && item.isPremium && (
                      <motion.span
                        variants={badgeVariants}
                        initial="initial"
                        animate="animate"
                        className="px-2 py-0.5 text-xs rounded-full bg-gradient-to-r from-purple-500 to-pink-500 
                                 text-white font-semibold shadow-lg"
                      >
                        NestEgg+
                      </motion.span>
                    )}

                    {/* Enhanced tooltip for collapsed state with full description */}
                    {sidebarCollapsed && hoveredItem === `item-${index}` && (
                      <motion.div
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="absolute left-20 ml-2 px-3 py-2 bg-gray-800 rounded-lg shadow-xl 
                                 border border-gray-700 whitespace-nowrap z-50 max-w-xs"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium">{item.label}</span>
                          {item.isPremium && (
                            <span className="px-2 py-0.5 text-xs rounded-full bg-gradient-to-r 
                                         from-purple-500 to-pink-500 text-white font-semibold">
                              NestEgg+
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-400">{item.description}</p>
                      </motion.div>
                    )}
                  </motion.div>
                </Link>
              </motion.div>
            ))}
          </div>
        </nav>

        {/* Footer actions */}
        <div className="border-t border-gray-800/50">
          <div className="p-2">
            {/* Settings */}
            <Link href="/settings">
              <motion.div
                whileHover={{ x: sidebarCollapsed ? 0 : 4 }}
                whileTap={{ scale: 0.98 }}
                onMouseEnter={() => setHoveredItem('settings')}
                onMouseLeave={() => setHoveredItem(null)}
                className={`
                  flex items-center gap-3 p-3 rounded-lg mb-1
                  hover:bg-gray-800/50 text-gray-300 hover:text-white
                  transition-all duration-200 group relative
                  ${sidebarCollapsed ? 'justify-center' : ''}
                `}
              >
                <Settings className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
                {!sidebarCollapsed && <span className="font-medium">Settings</span>}
                
                {/* Tooltip */}
                {sidebarCollapsed && hoveredItem === 'settings' && (
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="absolute left-20 ml-2 px-3 py-2 bg-gray-800 rounded-lg shadow-xl 
                             border border-gray-700 whitespace-nowrap z-50"
                  >
                    <p className="text-sm font-medium">Settings</p>
                    <p className="text-xs text-gray-400 mt-1">Manage your preferences</p>
                  </motion.div>
                )}
              </motion.div>
            </Link>
            
            {/* Logout */}
            <motion.button 
              whileHover={{ x: sidebarCollapsed ? 0 : 4 }}
              whileTap={{ scale: 0.98 }}
              onClick={logout}
              onMouseEnter={() => setHoveredItem('logout')}
              onMouseLeave={() => setHoveredItem(null)}
              className={`
                w-full flex items-center gap-3 p-3 rounded-lg
                hover:bg-red-500/10 text-gray-300 hover:text-red-400
                transition-all duration-200 group relative
                ${sidebarCollapsed ? 'justify-center' : ''}
              `}
            >
              <LogOut className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              {!sidebarCollapsed && <span className="font-medium">Logout</span>}
              
              {/* Tooltip */}
              {sidebarCollapsed && hoveredItem === 'logout' && (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="absolute left-20 ml-2 px-3 py-2 bg-gray-800 rounded-lg shadow-xl 
                           border border-gray-700 whitespace-nowrap z-50"
                >
                  <p className="text-sm font-medium">Logout</p>
                  <p className="text-xs text-gray-400 mt-1">Sign out of NestEgg</p>
                </motion.div>
              )}
            </motion.button>
          </div>
        </div>
      </motion.aside>
      
      {/* This spacer div is REMOVED - we'll handle spacing in _app.js */}
    </>
  );
};

export default Sidebar;