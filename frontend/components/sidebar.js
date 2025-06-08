import Link from 'next/link';
import { 
  BarChart2, ChevronLeft, ChevronRight, CheckSquare, Settings, 
  Database, Shield, Home, Coins, Bitcoin, ChevronDown, ChevronUp, 
  TrendingUp, Gauge, Info, LineChart, PieChart, LogOut, Search,
  Bell, User, Sparkles, Activity, DollarSign, Target, Zap,
  Moon, Sun, Menu, X, Plus, Filter, ArrowUpRight, ArrowDownRight
} from 'lucide-react';
import { useContext, useState, useEffect, useRef } from 'react';
import { AuthContext } from '@/context/AuthContext';
import { useRouter } from 'next/router';
import { motion, AnimatePresence } from 'framer-motion';

const Sidebar = () => {
  const { logout, user } = useContext(AuthContext);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [portfolioCollapsed, setPortfolioCollapsed] = useState(false);
  const [featureCollapsed, setFeatureCollapsed] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [hoveredItem, setHoveredItem] = useState(null);
  const [notifications, setNotifications] = useState(3);
  const [darkMode, setDarkMode] = useState(true);
  const searchRef = useRef(null);
  const router = useRouter();

  // Handle resize for responsive behavior
  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') return;
    
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setSidebarCollapsed(true);
      } else {
        setSidebarCollapsed(false);
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

  // Enhanced menu structure with metadata
  const menuItems = [
    { 
      href: "/portfolio", 
      label: "Dashboard", 
      icon: <Gauge className="w-5 h-5" />,
      badge: null,
      description: "Portfolio overview"
    },
    { 
      href: "/portfolio-command-center", 
      label: "Command Center", 
      icon: <Activity className="w-5 h-5" />,
      badge: "Pro",
      badgeColor: "bg-gradient-to-r from-purple-500 to-pink-500",
      description: "Advanced analytics"
    },
    { 
      label: "Portfolio Management",
      icon: <PieChart className="w-5 h-5" />,
      items: [
        { 
          href: "/accounts", 
          label: "Accounts", 
          icon: <Home className="w-5 h-5" />,
          count: 12,
          trend: "up",
          trendValue: "+2"
        },
        { 
          href: "/positions", 
          label: "Positions", 
          icon: <TrendingUp className="w-5 h-5" />,
          count: 48,
          trend: "up",
          trendValue: "+5"
        },
        { 
          href: "/AccountReconciliation", 
          label: "Reconciliations", 
          icon: <Database className="w-5 h-5" />,
          badge: notifications > 0 ? notifications : null,
          badgeColor: "bg-red-500"
        },
      ]
    },
    { 
      href: "/tasks", 
      label: "Task Tracker", 
      icon: <CheckSquare className="w-5 h-5" />,
      count: 7,
      description: "Pending tasks"
    },
    { 
      label: "Feature Testing",
      icon: <Zap className="w-5 h-5" />,
      badge: "Beta",
      badgeColor: "bg-gradient-to-r from-yellow-500 to-orange-500",
      items: [
        { 
          href: "/income", 
          label: "Report V1", 
          icon: <BarChart2 className="w-5 h-5" />,
          badge: "New",
          badgeColor: "bg-green-500"
        },
        { 
          href: "/test", 
          label: "Report V2", 
          icon: <LineChart className="w-5 h-5" />,
          progress: 75
        },
      ]
    }
  ];

  // Filter menu items based on search
  const filterMenuItems = (items, query) => {
    if (!query) return items;
    return items.filter(item => {
      if (item.items) {
        const filteredSubItems = item.items.filter(subItem => 
          subItem.label.toLowerCase().includes(query.toLowerCase())
        );
        return filteredSubItems.length > 0 || item.label.toLowerCase().includes(query.toLowerCase());
      }
      return item.label.toLowerCase().includes(query.toLowerCase());
    });
  };

  const filteredMenuItems = filterMenuItems(menuItems, searchQuery);

  // Animation variants
  const sidebarVariants = {
    expanded: { width: '16rem' },
    collapsed: { width: '4rem' }
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

  return (
    <>
      {/* Mobile overlay */}
      <AnimatePresence>
        {!sidebarCollapsed && typeof window !== 'undefined' && window.innerWidth < 768 && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="md:hidden fixed inset-0 bg-black bg-opacity-50 z-20"
            onClick={() => setSidebarCollapsed(true)}
          />
        )}
      </AnimatePresence>
     
      <motion.aside 
        initial={false}
        animate={sidebarCollapsed ? 'collapsed' : 'expanded'}
        variants={sidebarVariants}
        className={`
          fixed inset-y-0 left-0 z-30
          bg-gradient-to-b from-gray-900 via-gray-900 to-gray-950
          text-white flex flex-col shadow-2xl
          overflow-hidden border-r border-gray-800
        `}
      >
        {/* Header */}
        <div className="relative">
          {/* Animated background gradient */}
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-purple-600/20 opacity-50" />
          
          <div className="relative flex items-center justify-between p-4 border-b border-gray-800/50">
            <motion.div 
              className="flex items-center gap-3"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="relative">
                <motion.div 
                  className="text-3xl"
                  animate={{ rotate: sidebarCollapsed ? 0 : 360 }}
                  transition={{ duration: 0.5 }}
                >
                  🥚
                </motion.div>
                <motion.div 
                  className="absolute -bottom-1 -right-1 w-2 h-2 bg-green-400 rounded-full"
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                />
              </div>
              {!sidebarCollapsed && (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex flex-col"
                >
                  <span className="text-lg font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                    NestEgg
                  </span>
                  <span className="text-[10px] text-gray-400 -mt-1">Portfolio Tracker</span>
                </motion.div>
              )}
            </motion.div>

            {!sidebarCollapsed && (
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setShowSearch(!showSearch)}
                className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
              >
                <Search className="w-4 h-4 text-gray-400" />
              </motion.button>
            )}
          </div>
        </div>

        {/* Search Bar */}
        <AnimatePresence>
          {showSearch && !sidebarCollapsed && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="px-4 py-3 border-b border-gray-800/50"
            >
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  ref={searchRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search menu..."
                  className="w-full pl-10 pr-8 py-2 bg-gray-800/50 border border-gray-700 rounded-lg 
                           text-sm text-white placeholder-gray-400 focus:outline-none focus:border-blue-500
                           transition-colors"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-700 rounded"
                  >
                    <X className="w-3 h-3 text-gray-400" />
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Navigation */}
        <nav className="flex-1 py-2 px-2 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
          <div className="space-y-1">
            {filteredMenuItems.map((item, index) => (
              <motion.div
                key={`menu-${index}`}
                variants={itemVariants}
                initial="hidden"
                animate="visible"
                transition={{ delay: index * 0.05 }}
              >
                {item.items ? (
                  // Group with submenu
                  <div className="mb-2">
                    {!sidebarCollapsed && (
                      <motion.button
                        whileHover={{ x: 2 }}
                        onClick={() => {
                          if (item.label === "Portfolio Management") {
                            setPortfolioCollapsed(!portfolioCollapsed);
                          } else if (item.label === "Feature Testing") {
                            setFeatureCollapsed(!featureCollapsed);
                          }
                        }}
                        className="w-full flex items-center justify-between px-3 py-2 text-xs uppercase tracking-wider text-gray-400 hover:text-gray-300 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          {item.icon}
                          <span className="font-semibold">{item.label}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {item.badge && (
                            <motion.span 
                              variants={badgeVariants}
                              initial="initial"
                              animate="animate"
                              whileHover="hover"
                              className={`px-1.5 py-0.5 text-[10px] font-bold rounded-full text-white ${item.badgeColor}`}
                            >
                              {item.badge}
                            </motion.span>
                          )}
                          <motion.div
                            animate={{ rotate: (item.label === "Portfolio Management" ? portfolioCollapsed : featureCollapsed) ? 0 : 180 }}
                            transition={{ duration: 0.2 }}
                          >
                            <ChevronDown className="w-4 h-4" />
                          </motion.div>
                        </div>
                      </motion.button>
                    )}
                    
                    <AnimatePresence>
                      {((!portfolioCollapsed && item.label === "Portfolio Management") || 
                        (!featureCollapsed && item.label === "Feature Testing") || 
                        sidebarCollapsed) && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className={`space-y-1 ${sidebarCollapsed ? '' : 'ml-2 mt-1'}`}
                        >
                          {item.items.map((subItem, subIndex) => (
                            <Link 
                              key={`${index}-${subIndex}`} 
                              href={subItem.href}
                              onMouseEnter={() => setHoveredItem(`${index}-${subIndex}`)}
                              onMouseLeave={() => setHoveredItem(null)}
                            >
                              <motion.div
                                whileHover={{ x: sidebarCollapsed ? 0 : 4 }}
                                whileTap={{ scale: 0.98 }}
                                className={`
                                  relative flex items-center gap-3 p-3 rounded-lg
                                  transition-all duration-200 group
                                  ${isActive(subItem.href) 
                                    ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-600/20' 
                                    : 'hover:bg-gray-800/50 text-gray-300 hover:text-white'
                                  }
                                  ${sidebarCollapsed ? 'justify-center' : ''}
                                `}
                              >
                                {/* Active indicator */}
                                {isActive(subItem.href) && (
                                  <motion.div
                                    layoutId="activeIndicator"
                                    className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-white rounded-r-full"
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                  />
                                )}

                                <div className="relative">
                                  {subItem.icon}
                                  {subItem.count && sidebarCollapsed && (
                                    <div className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full" />
                                  )}
                                </div>

                                {!sidebarCollapsed && (
                                  <>
                                    <span className="flex-1 font-medium">{subItem.label}</span>
                                    
                                    {/* Badges and counts */}
                                    <div className="flex items-center gap-2">
                                      {subItem.trend && (
                                        <div className={`flex items-center gap-1 text-xs ${
                                          subItem.trend === 'up' ? 'text-green-400' : 'text-red-400'
                                        }`}>
                                          {subItem.trend === 'up' ? (
                                            <ArrowUpRight className="w-3 h-3" />
                                          ) : (
                                            <ArrowDownRight className="w-3 h-3" />
                                          )}
                                          <span>{subItem.trendValue}</span>
                                        </div>
                                      )}
                                      
                                      {subItem.count && (
                                        <span className="text-xs text-gray-400">
                                          {subItem.count}
                                        </span>
                                      )}
                                      
                                      {subItem.badge && (
                                        <motion.span 
                                          variants={badgeVariants}
                                          initial="initial"
                                          animate="animate"
                                          whileHover="hover"
                                          className={`px-2 py-0.5 text-[10px] font-bold rounded-full text-white ${subItem.badgeColor || 'bg-gray-600'}`}
                                        >
                                          {subItem.badge}
                                        </motion.span>
                                      )}
                                      
                                      {subItem.progress !== undefined && (
                                        <div className="w-12 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                                          <motion.div 
                                            className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
                                            initial={{ width: 0 }}
                                            animate={{ width: `${subItem.progress}%` }}
                                            transition={{ duration: 1, delay: 0.2 }}
                                          />
                                        </div>
                                      )}
                                    </div>
                                  </>
                                )}

                                {/* Tooltip for collapsed state */}
                                {sidebarCollapsed && hoveredItem === `${index}-${subIndex}` && (
                                  <motion.div
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className="absolute left-full ml-2 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50 whitespace-nowrap"
                                  >
                                    <span className="text-sm font-medium">{subItem.label}</span>
                                    {subItem.count && (
                                      <span className="ml-2 text-xs text-gray-400">({subItem.count})</span>
                                    )}
                                  </motion.div>
                                )}
                              </motion.div>
                            </Link>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ) : (
                  // Single menu item
                  <Link 
                    href={item.href}
                    onMouseEnter={() => setHoveredItem(`single-${index}`)}
                    onMouseLeave={() => setHoveredItem(null)}
                  >
                    <motion.div
                      whileHover={{ x: sidebarCollapsed ? 0 : 4 }}
                      whileTap={{ scale: 0.98 }}
                      className={`
                        relative flex items-center gap-3 p-3 rounded-lg
                        transition-all duration-200 group
                        ${isActive(item.href) 
                          ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-600/20' 
                          : 'hover:bg-gray-800/50 text-gray-300 hover:text-white'
                        }
                        ${sidebarCollapsed ? 'justify-center' : ''}
                      `}
                    >
                      {/* Active indicator */}
                      {isActive(item.href) && (
                        <motion.div
                          layoutId="activeIndicator"
                          className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-white rounded-r-full"
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                        />
                      )}

                      <div className="relative">
                        {item.icon}
                        {item.count && sidebarCollapsed && (
                          <div className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full" />
                        )}
                      </div>

                      {!sidebarCollapsed && (
                        <>
                          <div className="flex-1">
                            <span className="font-medium">{item.label}</span>
                            {item.description && (
                              <p className="text-xs text-gray-400 mt-0.5">{item.description}</p>
                            )}
                          </div>
                          
                          {/* Badges and counts */}
                          <div className="flex items-center gap-2">
                            {item.count && (
                              <span className="text-xs text-gray-400">
                                {item.count}
                              </span>
                            )}
                            
                            {item.badge && (
                              <motion.span 
                                variants={badgeVariants}
                                initial="initial"
                                animate="animate"
                                whileHover="hover"
                                className={`px-2 py-0.5 text-[10px] font-bold rounded-full text-white ${item.badgeColor || 'bg-gray-600'}`}
                              >
                                {item.badge}
                              </motion.span>
                            )}
                          </div>
                        </>
                      )}

                      {/* Tooltip for collapsed state */}
                      {sidebarCollapsed && hoveredItem === `single-${index}` && (
                        <motion.div
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="absolute left-full ml-2 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50 whitespace-nowrap"
                        >
                          <span className="text-sm font-medium">{item.label}</span>
                          {item.count && (
                            <span className="ml-2 text-xs text-gray-400">({item.count})</span>
                          )}
                        </motion.div>
                      )}
                    </motion.div>
                  </Link>
                )}
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
                className={`
                  flex items-center gap-3 p-3 rounded-lg
                  hover:bg-gray-800/50 text-gray-300 hover:text-white
                  transition-all duration-200 group mb-1
                  ${sidebarCollapsed ? 'justify-center' : ''}
                `}
              >
                <Settings className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
                {!sidebarCollapsed && <span className="font-medium">Settings</span>}
              </motion.div>
            </Link>
            
            {/* Logout */}
            <motion.button 
              whileHover={{ x: sidebarCollapsed ? 0 : 4 }}
              whileTap={{ scale: 0.98 }}
              onClick={logout}
              className={`
                w-full flex items-center gap-3 p-3 rounded-lg
                hover:bg-red-500/10 text-gray-300 hover:text-red-400
                transition-all duration-200 group
                ${sidebarCollapsed ? 'justify-center' : ''}
              `}
            >
              <LogOut className="w-5 h-5 group-hover:rotate-12 transition-transform" />
              {!sidebarCollapsed && <span className="font-medium">Logout</span>}
            </motion.button>
          </div>
        </div>
      </motion.aside>
      
      {/* Toggle button */}
      <motion.button 
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
        className={`
          fixed z-40 p-2.5 rounded-full
          bg-gray-800 hover:bg-gray-700 text-white
          shadow-lg shadow-black/20 border border-gray-700
          transition-all duration-300
          ${sidebarCollapsed ? 'left-[4.5rem]' : 'left-[15rem]'}
          top-20
        `}
        aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        <motion.div
          animate={{ rotate: sidebarCollapsed ? 0 : 180 }}
          transition={{ duration: 0.3 }}
        >
          <ChevronRight className="w-5 h-5" />
        </motion.div>
      </motion.button>
      
      {/* Main content spacer */}
      <div className={`transition-all duration-300 ${sidebarCollapsed ? 'ml-16' : 'ml-64'}`} />
    </>
  );
};

export default Sidebar;