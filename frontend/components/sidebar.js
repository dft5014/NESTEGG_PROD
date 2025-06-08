// components/Sidebar.js - Premium Enhanced Version with Live Data
import Link from 'next/link';
import { 
  BarChart2, ChevronLeft, ChevronRight, CheckSquare, Settings, 
  Database, Shield, Home, Coins, Bitcoin, ChevronDown, ChevronUp, 
  TrendingUp, Gauge, Info, LineChart, PieChart, LogOut, Search,
  Bell, User, Sparkles, Activity, DollarSign, Target, Zap,
  Moon, Sun, Menu, X, Plus, Filter, ArrowUpRight, ArrowDownRight,
  RefreshCw, AlertCircle
} from 'lucide-react';
import { useContext, useState, useEffect, useRef } from 'react';
import { AuthContext } from '@/context/AuthContext';
import { useRouter } from 'next/router';
import { motion, AnimatePresence } from 'framer-motion';
import { fetchWithAuth } from '@/utils/api';

const Sidebar = () => {
  const { logout, user } = useContext(AuthContext);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [portfolioCollapsed, setPortfolioCollapsed] = useState(false);
  const [featureCollapsed, setFeatureCollapsed] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [hoveredItem, setHoveredItem] = useState(null);
  const [notifications, setNotifications] = useState(0);
  const [darkMode, setDarkMode] = useState(true);
  const [showQuickStats, setShowQuickStats] = useState(true);
  const searchRef = useRef(null);
  const router = useRouter();

  // State for live data
  const [portfolioData, setPortfolioData] = useState(null);
  const [accountsData, setAccountsData] = useState(null);
  const [positionsData, setPositionsData] = useState(null);
  const [tasksData, setTasksData] = useState(null);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [dataError, setDataError] = useState(null);
  const [lastRefresh, setLastRefresh] = useState(null);

  // Portfolio stats from API
  const [portfolioStats, setPortfolioStats] = useState({
    totalValue: 0,
    dayChange: 0,
    dayChangePercent: 0,
    weekChangePercent: 0
  });

  // Fetch portfolio data
  const fetchPortfolioData = async () => {
    try {
      const response = await fetchWithAuth('/portfolio/snapshots?timeframe=1w&group_by=day&include_cost_basis=true');
      if (!response.ok) throw new Error('Failed to fetch portfolio data');
      
      const data = await response.json();
      setPortfolioData(data);
      
      // Update portfolio stats
      const periodChanges = data.period_changes || {};
      setPortfolioStats({
        totalValue: data.current_value || 0,
        dayChange: periodChanges['1d']?.value_change || 0,
        dayChangePercent: periodChanges['1d']?.percent_change || 0,
        weekChangePercent: periodChanges['1w']?.percent_change || 0
      });
    } catch (error) {
      console.error('Error fetching portfolio data:', error);
      setDataError('Failed to load portfolio data');
    }
  };

  // Fetch accounts data
  const fetchAccountsData = async () => {
    try {
      const response = await fetchWithAuth('/accounts');
      if (!response.ok) throw new Error('Failed to fetch accounts');
      
      const data = await response.json();
      setAccountsData(data);
    } catch (error) {
      console.error('Error fetching accounts:', error);
    }
  };

  // Fetch positions data
  const fetchPositionsData = async () => {
    try {
      const response = await fetchWithAuth('/positions');
      if (!response.ok) throw new Error('Failed to fetch positions');
      
      const data = await response.json();
      setPositionsData(data);
    } catch (error) {
      console.error('Error fetching positions:', error);
    }
  };

  // Fetch tasks data
  const fetchTasksData = async () => {
    try {
      const response = await fetchWithAuth('/tasks');
      if (!response.ok) throw new Error('Failed to fetch tasks');
      
      const data = await response.json();
      setTasksData(data);
      
      // Count pending tasks for notifications
      const pendingTasks = data.filter(task => !task.completed).length;
      setNotifications(pendingTasks);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    }
  };

  // Fetch all data
  const fetchAllData = async () => {
    setIsLoadingData(true);
    setDataError(null);
    
    try {
      await Promise.all([
        fetchPortfolioData(),
        fetchAccountsData(),
        fetchPositionsData(),
        fetchTasksData()
      ]);
      setLastRefresh(new Date());
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoadingData(false);
    }
  };

  // Load data on mount and set up refresh interval
  useEffect(() => {
    fetchAllData();
    
    // Refresh data every 5 minutes
    const interval = setInterval(fetchAllData, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);

  // Handle resize for responsive behavior
  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') return;
    
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setSidebarCollapsed(true);
        setShowQuickStats(false);
      } else {
        setSidebarCollapsed(false);
        setShowQuickStats(true);
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

  // Format currency
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  // Enhanced menu structure with live data
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
          count: accountsData?.length || 0,
          trend: accountsData?.length > 0 ? "up" : null,
          trendValue: accountsData?.length > 0 ? `${accountsData.length}` : null
        },
        { 
          href: "/positions", 
          label: "Positions", 
          icon: <TrendingUp className="w-5 h-5" />,
          count: positionsData?.length || 0,
          trend: positionsData?.length > 0 ? "up" : null,
          trendValue: positionsData?.length > 0 ? `${positionsData.length}` : null
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
      count: tasksData?.filter(t => !t.completed).length || 0,
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

        {/* Quick Stats */}
        <AnimatePresence>
          {showQuickStats && !sidebarCollapsed && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="px-4 py-4 border-b border-gray-800/50"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400">Portfolio Value</span>
                  <div className="flex items-center space-x-2">
                    <motion.button
                      whileHover={{ scale: 1.1, rotate: 180 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => fetchAllData()}
                      className="p-1 hover:bg-gray-800 rounded"
                      title="Refresh data"
                    >
                      <RefreshCw className={`w-3 h-3 text-gray-400 ${isLoadingData ? 'animate-spin' : ''}`} />
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => setShowQuickStats(false)}
                      className="p-1 hover:bg-gray-800 rounded"
                    >
                      <ChevronUp className="w-3 h-3 text-gray-400" />
                    </motion.button>
                  </div>
                </div>
                
                {dataError ? (
                  <div className="flex items-center space-x-2 text-red-400 text-xs">
                    <AlertCircle className="w-3 h-3" />
                    <span>{dataError}</span>
                  </div>
                ) : (
                  <>
                    <div className="space-y-1">
                      <motion.div 
                        className="text-2xl font-bold"
                        initial={{ scale: 0.9 }}
                        animate={{ scale: 1 }}
                        key={portfolioStats.totalValue}
                      >
                        {formatCurrency(portfolioStats.totalValue)}
                      </motion.div>
                      <div className="flex items-center gap-2">
                        <div className={`flex items-center gap-1 text-xs ${
                          portfolioStats.dayChange > 0 ? 'text-green-400' : 'text-red-400'
                        }`}>
                          {portfolioStats.dayChange > 0 ? (
                            <ArrowUpRight className="w-3 h-3" />
                          ) : (
                            <ArrowDownRight className="w-3 h-3" />
                          )}
                          <span>{formatCurrency(Math.abs(portfolioStats.dayChange))}</span>
                          <span>({portfolioStats.dayChangePercent.toFixed(2)}%)</span>
                        </div>
                      </div>
                      <div className="flex gap-4 text-xs text-gray-400">
                        <span>Week: <span className={portfolioStats.weekChangePercent > 0 ? 'text-green-400' : 'text-red-400'}>
                          {portfolioStats.weekChangePercent > 0 ? '+' : ''}{portfolioStats.weekChangePercent.toFixed(2)}%
                        </span></span>
                      </div>
                    </div>
                    
                    {portfolioData && (
                      <motion.div 
                        className="h-1 bg-gray-800 rounded-full overflow-hidden"
                        initial={{ scaleX: 0 }}
                        animate={{ scaleX: 1 }}
                        transition={{ duration: 1, delay: 0.2 }}
                      >
                        <motion.div 
                          className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min((portfolioStats.totalValue / 1000000) * 100, 100)}%` }}
                          transition={{ duration: 1, delay: 0.5 }}
                        />
                      </motion.div>
                    )}
                    
                    {lastRefresh && (
                      <div className="text-xs text-gray-500 text-center">
                        Last updated: {lastRefresh.toLocaleTimeString()}
                      </div>
                    )}
                  </>
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
                                      
                                      {subItem.count !== undefined && subItem.count > 0 && (
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
                                    {subItem.count !== undefined && subItem.count > 0 && (
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
                            {item.count !== undefined && item.count > 0 && (
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
                          {item.count !== undefined && item.count > 0 && (
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

        {/* Quick Actions */}
        {!sidebarCollapsed && (
          <div className="px-4 py-3 border-t border-gray-800/50">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => router.push('/positions/add')}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 
                       bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700
                       text-white font-medium rounded-lg shadow-lg shadow-blue-600/20
                       transition-all duration-200"
            >
              <Plus className="w-4 h-4" />
              <span>Add Position</span>
            </motion.button>
          </div>
        )}

        {/* User section */}
        <div className="border-t border-gray-800/50">
          {/* User info */}
          {!sidebarCollapsed && user && (
            <div className="px-4 py-3 border-b border-gray-800/50">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                    <User className="w-5 h-5 text-white" />
                  </div>
                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 border-2 border-gray-900 rounded-full" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">
                    {user.email || 'User'}
                  </p>
                  <p className="text-xs text-gray-400">Premium Member</p>
                </div>
                <div className="flex gap-1">
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    className="p-1.5 hover:bg-gray-800 rounded-lg transition-colors relative"
                  >
                    <Bell className="w-4 h-4 text-gray-400" />
                    {notifications > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-500 rounded-full" />
                    )}
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setDarkMode(!darkMode)}
                    className="p-1.5 hover:bg-gray-800 rounded-lg transition-colors"
                  >
                    {darkMode ? (
                      <Moon className="w-4 h-4 text-gray-400" />
                    ) : (
                      <Sun className="w-4 h-4 text-gray-400" />
                    )}
                  </motion.button>
                </div>
              </div>
            </div>
          )}

          {/* Footer actions */}
          <div className="p-2">
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