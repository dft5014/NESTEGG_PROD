// components/sidebar.js
import Link from 'next/link';
import { 
  LayoutDashboard, Command, Home, TrendingUp, Database, 
  ChevronRight, ChevronDown, Settings, LogOut, Sparkles,
  Target, CreditCard, Menu, X, Activity, DollarSign
} from 'lucide-react';
import { useContext, useState, useEffect } from 'react';
import { AuthContext } from '@/context/AuthContext';
import { useRouter } from 'next/router';
import { motion, AnimatePresence } from 'framer-motion';

const Sidebar = () => {
  const { logout, user } = useContext(AuthContext);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true); // Start collapsed
  const [managementCollapsed, setManagementCollapsed] = useState(false);
  const [hoveredItem, setHoveredItem] = useState(null);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Check if current route matches
  const isActive = (path) => {
    return router.pathname === path || router.pathname.startsWith(`${path}/`);
  };

  // Enhanced menu structure
  const menuItems = [
    { 
      href: "/portfolio", 
      label: "Dashboard", 
      icon: <LayoutDashboard className="w-5 h-5" />,
      description: "Portfolio overview"
    },
    { 
      href: "/command-center", 
      label: "Command Center", 
      icon: <Command className="w-5 h-5" />,
      badge: "NestEgg+",
      isPremium: true,
      description: "Advanced analytics & insights"
    },
    { 
      label: "NestEgg Management",
      icon: <DollarSign className="w-5 h-5" />,
      isGroup: true,
      items: [
        { 
          href: "/accounts", 
          label: "Accounts", 
          icon: <Home className="w-5 h-5" />,
          description: "Investment accounts"
        },
        { 
          href: "/positions", 
          label: "Positions", 
          icon: <TrendingUp className="w-5 h-5" />,
          description: "Holdings & allocations"
        },
        { 
          href: "/liabilities", 
          label: "Liabilities", 
          icon: <CreditCard className="w-5 h-5" />,
          description: "Debts & obligations"
        }
      ]
    },
    { 
      href: "/planning", 
      label: "Planning", 
      icon: <Target className="w-5 h-5" />,
      badge: "NestEgg+",
      isPremium: true,
      description: "Financial planning tools"
    }
  ];

  // Logo component
  const NestEggLogo = () => (
    <motion.div 
      className="relative"
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
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
        <motion.path
          d="M20 4C14 4 8 14 8 24C8 32 13 36 20 36C27 36 32 32 32 24C32 14 26 4 20 4Z"
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
        <circle cx="16" cy="18" r="2" fill="#1E3A8A" />
        <circle cx="24" cy="18" r="2" fill="#1E3A8A" />
        <path d="M16 26C17.5 27.5 22.5 27.5 24 26" stroke="#1E3A8A" strokeWidth="2" strokeLinecap="round" />
      </svg>
      {/* Floating sparkles for premium feel */}
      <motion.div
        className="absolute -top-1 -right-1"
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.5, 1, 0.5],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      >
        <Sparkles className="w-3 h-3 text-yellow-400" />
      </motion.div>
    </motion.div>
  );

  if (!mounted) return null;

  return (
    <>
      <motion.aside 
        initial={{ width: 64 }}
        animate={{ width: sidebarCollapsed ? 64 : 256 }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className="fixed left-0 top-0 h-screen bg-gradient-to-b from-gray-900 via-gray-900 to-gray-950 
                   text-white border-r border-gray-800 shadow-2xl z-50 flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-800/50">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3">
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
                    <span className="text-xs text-gray-400">Grow Your Wealth</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </Link>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-2 overflow-y-auto custom-scrollbar">
          <div className="space-y-1">
            {menuItems.map((item, index) => (
              <div key={index}>
                {item.isGroup ? (
                  // Group with items
                  <div>
                    <motion.button
                      onClick={() => setManagementCollapsed(!managementCollapsed)}
                      className={`w-full flex items-center gap-3 p-3 rounded-lg
                        hover:bg-gray-800/50 text-gray-300 hover:text-white
                        transition-all duration-200 group
                        ${sidebarCollapsed ? 'justify-center' : 'justify-between'}
                      `}
                      whileHover={{ x: sidebarCollapsed ? 0 : 4 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <div className="flex items-center gap-3">
                        <motion.div
                          animate={{ rotate: managementCollapsed ? -90 : 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          {item.icon}
                        </motion.div>
                        {!sidebarCollapsed && <span className="font-medium">{item.label}</span>}
                      </div>
                      {!sidebarCollapsed && (
                        <motion.div
                          animate={{ rotate: managementCollapsed ? -90 : 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <ChevronDown className="w-4 h-4" />
                        </motion.div>
                      )}
                    </motion.button>

                    {/* Tooltip for collapsed state */}
                    {sidebarCollapsed && (
                      <AnimatePresence>
                        {hoveredItem === `group-${index}` && (
                          <motion.div
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -10 }}
                            className="absolute left-16 ml-2 px-3 py-2 bg-gray-800 rounded-lg shadow-xl 
                                     border border-gray-700 whitespace-nowrap z-50"
                            onMouseEnter={() => setHoveredItem(`group-${index}`)}
                            onMouseLeave={() => setHoveredItem(null)}
                          >
                            <span className="text-sm font-medium">{item.label}</span>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    )}

                    {/* Sub-items */}
                    <AnimatePresence>
                      {!managementCollapsed && !sidebarCollapsed && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="ml-4 mt-1 space-y-1 overflow-hidden"
                        >
                          {item.items.map((subItem, subIndex) => (
                            <Link key={subIndex} href={subItem.href}>
                              <motion.div
                                whileHover={{ x: 4, backgroundColor: "rgba(59, 130, 246, 0.1)" }}
                                whileTap={{ scale: 0.98 }}
                                className={`
                                  flex items-center gap-3 p-2.5 rounded-lg
                                  transition-all duration-200 group
                                  ${isActive(subItem.href) 
                                    ? 'bg-blue-600/20 text-blue-400 border-l-2 border-blue-400' 
                                    : 'hover:bg-gray-800/30 text-gray-400 hover:text-white'
                                  }
                                `}
                              >
                                <motion.div
                                  whileHover={{ rotate: 5 }}
                                  className="transition-transform"
                                >
                                  {subItem.icon}
                                </motion.div>
                                <span className="text-sm font-medium">{subItem.label}</span>
                              </motion.div>
                            </Link>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ) : (
                  // Single menu item
                  <Link href={item.href}>
                    <motion.div
                      whileHover={{ x: sidebarCollapsed ? 0 : 4 }}
                      whileTap={{ scale: 0.98 }}
                      onMouseEnter={() => setHoveredItem(`single-${index}`)}
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
                          className="transition-transform"
                        >
                          {item.icon}
                        </motion.div>
                        {!sidebarCollapsed && <span className="font-medium">{item.label}</span>}
                      </div>
                      
                      {/* Premium badge */}
                      {!sidebarCollapsed && item.isPremium && (
                        <motion.span
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="px-2 py-0.5 text-xs rounded-full bg-gradient-to-r from-purple-500 to-pink-500 
                                   text-white font-semibold shadow-lg"
                        >
                          {item.badge}
                        </motion.span>
                      )}

                      {/* Tooltip for collapsed state */}
                      {sidebarCollapsed && (
                        <AnimatePresence>
                          {hoveredItem === `single-${index}` && (
                            <motion.div
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              exit={{ opacity: 0, x: -10 }}
                              className="absolute left-16 ml-2 px-3 py-2 bg-gray-800 rounded-lg shadow-xl 
                                       border border-gray-700 whitespace-nowrap z-50"
                            >
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium">{item.label}</span>
                                {item.isPremium && (
                                  <span className="px-2 py-0.5 text-xs rounded-full bg-gradient-to-r 
                                               from-purple-500 to-pink-500 text-white font-semibold">
                                    {item.badge}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-gray-400 mt-1">{item.description}</p>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      )}
                    </motion.div>
                  </Link>
                )}
              </div>
            ))}
          </div>
        </nav>

        {/* Footer */}
        <div className="border-t border-gray-800/50 p-2">
          <Link href="/settings">
            <motion.div
              whileHover={{ x: sidebarCollapsed ? 0 : 4 }}
              whileTap={{ scale: 0.98 }}
              className={`
                flex items-center gap-3 p-3 rounded-lg mb-1
                hover:bg-gray-800/50 text-gray-300 hover:text-white
                transition-all duration-200 group
                ${sidebarCollapsed ? 'justify-center' : ''}
              `}
            >
              <Settings className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
              {!sidebarCollapsed && <span className="font-medium">Settings</span>}
            </motion.div>
          </Link>
          
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
            <LogOut className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            {!sidebarCollapsed && <span className="font-medium">Logout</span>}
          </motion.button>
        </div>

        {/* Toggle button */}
        <motion.button 
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="absolute -right-4 top-20 p-2 rounded-full
                   bg-gray-800 hover:bg-gray-700 text-white
                   shadow-lg border border-gray-700
                   transition-all duration-300 z-50"
        >
          <motion.div
            animate={{ rotate: sidebarCollapsed ? 0 : 180 }}
            transition={{ duration: 0.3 }}
          >
            <ChevronRight className="w-4 h-4" />
          </motion.div>
        </motion.button>
      </motion.aside>
      
      {/* Spacer for content */}
      <div className={`transition-all duration-300 ${sidebarCollapsed ? 'ml-16' : 'ml-64'}`} />
    </>
  );
};

export default Sidebar;