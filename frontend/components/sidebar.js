// components/sidebar.js
import Link from 'next/link';
import {
  LayoutGrid, TrendingUp, Wallet, Coins, CreditCard,
  Settings, LogOut, Plus, Target, BarChart3, Menu, X,
  Search, Bell, Moon, Sun, Smartphone, User, Shield, Clock, HelpCircle, ChevronDown
} from 'lucide-react';
import { useContext, useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { AuthContext } from '@/context/AuthContext';
import { UserButton, useUser } from '@clerk/nextjs';
import { useRouter } from 'next/router';
import { motion, AnimatePresence } from 'framer-motion';
import { useSidebar } from '@/pages/_app';

/** Mobile detection with matchMedia (SSR-safe) */
const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(max-width: 767px)');
    const update = () => setIsMobile(mq.matches);
    update();
    if (mq.addEventListener) mq.addEventListener('change', update);
    else mq.addListener(update);
    return () => {
      if (mq.removeEventListener) mq.removeEventListener('change', update);
      else mq.removeListener(update);
    };
  }, []);
  return isMobile;
};

const Sidebar = () => {
  const { logout, user: authUser } = useContext(AuthContext);
  const { user: clerkUser } = useUser();
  const user = clerkUser || authUser; // Prefer Clerk user if available

  const router = useRouter();
  const isMobile = useIsMobile();

  const { sidebarCollapsed, setSidebarCollapsed } = useSidebar();
  const [hoveredItem, setHoveredItem] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [darkMode, setDarkMode] = useState(true);
  const [mounted, setMounted] = useState(false);

  // User dropdown (reserved for future custom menu)
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef(null);

  useEffect(() => setMounted(true), []);

  // Collapse automatically on small screens
  useEffect(() => {
    if (isMobile) setSidebarCollapsed(true);
  }, [isMobile, setSidebarCollapsed]);

  // Outside click for user dropdown
  useEffect(() => {
    const onClick = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  // Keyboard shortcuts: ⌘/Ctrl+K toggles search; Esc closes overlays
  useEffect(() => {
    const onKeyDown = (e) => {
      const key = e.key?.toLowerCase();
      const mod = e.metaKey || e.ctrlKey;
      if (mod && key === 'k') {
        e.preventDefault();
        setShowSearch((v) => !v);
        setSidebarCollapsed(false);
      }
      if (key === 'escape') {
        setShowSearch(false);
        setUserMenuOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  // Theme toggle wiring
  useEffect(() => {
    if (!mounted) return;
    const root = document.documentElement;
    if (darkMode) root.classList.add('dark');
    else root.classList.remove('dark');
  }, [darkMode, mounted]);

  // Reduced motion for logo spin
  const [allowSpin, setAllowSpin] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
    setAllowSpin(!reduce.matches);
    const onChange = () => setAllowSpin(!reduce.matches);
    if (reduce.addEventListener) reduce.addEventListener('change', onChange);
    else reduce.addListener(onChange);
    return () => {
      if (reduce.removeEventListener) reduce.removeEventListener('change', onChange);
      else reduce.removeListener(onChange);
    };
  }, []);

  const searchRef = useRef(null);
  useEffect(() => {
    if (showSearch && searchRef.current) searchRef.current.focus();
  }, [showSearch]);

  const isActive = useCallback(
    (path) => router.pathname === path || router.pathname.startsWith(`${path}/`),
    [router.pathname]
  );

  // ORDER: Dashboard, Accounts, Positions, Liabilities, Mobile App, **Command Center**, **Planning**
  const menuItems = useMemo(
    () => [
      {
        href: "/portfolio",
        label: "Dashboard",
        icon: LayoutGrid,
        description: "View your portfolio overview and key metrics"
      },
      {
        href: "/accounts",
        label: "Accounts",
        icon: Wallet,
        description: "Manage your investment and savings accounts"
      },
      {
        href: "/positions",
        label: "Positions",
        icon: Coins,
        description: "Track your holdings, stocks, and investments"
      },
      {
        href: "/liabilities",
        label: "Liabilities",
        icon: CreditCard,
        description: "Monitor your debts, loans, and obligations"
      },
      {
        href: "/mobile",
        label: "Mobile App",
        icon: Smartphone,
        description: "iOS/Android setup, features, and install"
      },
      // Premium items
      {
        href: "/command-center",
        label: "Command Center",
        icon: BarChart3,
        isPremium: true,
        description: "Advanced analytics, insights, and reporting tools"
      },
      {
        href: "/planning",
        label: "Planning",
        icon: Target,
        isPremium: true,
        description: "Financial planning and retirement tools"
      }
    ],
    []
  );

  const filteredMenuItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return menuItems;
    return menuItems.filter(i => i.label.toLowerCase().includes(q));
  }, [menuItems, searchQuery]);

  // Logo
  const NestEggLogo = () => {
    const [isSpinning, setIsSpinning] = useState(false);
    useEffect(() => setIsSpinning(!sidebarCollapsed), [sidebarCollapsed]);
    return (
      <motion.div className="relative cursor-default" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
        <motion.svg
          width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg"
          className="text-blue-400"
          animate={isSpinning && allowSpin ? { rotate: 360 } : {}}
          transition={isSpinning && allowSpin ? { duration: 20, repeat: Infinity, ease: "linear" } : {}}
          aria-hidden="true"
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
            fill="url(#eggGradient)" stroke="currentColor" strokeWidth="1.5" filter="url(#glow)"
          />
          <circle cx="16" cy="18" r="2" fill="#1E3A8A" />
          <circle cx="24" cy="18" r="2" fill="#1E3A8A" />
          <path d="M16 26C17.5 27.5 22.5 27.5 24 26" stroke="#1E3A8A" strokeWidth="2" strokeLinecap="round" />
        </motion.svg>
      </motion.div>
    );
  };

  // Variants
  const sidebarVariants = { expanded: { width: '16rem' }, collapsed: { width: '5rem' } };
  const itemVariants = { hidden: { opacity: 0, x: -20 }, visible: { opacity: 1, x: 0 } };
  const badgeVariants = { initial: { scale: 0 }, animate: { scale: 1 }, hover: { scale: 1.1 } };

  if (!mounted) return null;

  return (
    <>
      {/* Mobile overlay (SSR-safe) */}
      <AnimatePresence>
        {!sidebarCollapsed && isMobile && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="md:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
            onClick={() => setSidebarCollapsed(true)}
            aria-hidden="true"
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
        aria-label="Primary"
      >
        {/* Top bar: toggle, brand, quick actions */}
        <div className="p-4 border-b border-gray-800/50 flex items-center gap-2">
          <motion.button
            whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            onMouseEnter={() => setHoveredItem('menu-toggle')}
            onMouseLeave={() => setHoveredItem(null)}
            className="p-2 rounded-lg hover:bg-gray-800 transition-colors flex items-center justify-center relative"
            aria-label={sidebarCollapsed ? 'Expand menu' : 'Collapse menu'}
            aria-expanded={!sidebarCollapsed}
          >
            {sidebarCollapsed ? <Menu className="w-5 h-5 text-gray-300" /> : <X className="w-5 h-5 text-gray-300" />}
            {sidebarCollapsed && hoveredItem === 'menu-toggle' && (
              <motion.div
                initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                className="absolute left-20 ml-2 px-3 py-2 bg-gray-800 rounded-lg shadow-xl border border-gray-700 whitespace-nowrap z-50"
                role="tooltip"
              >
                <p className="text-sm font-medium">Expand Menu</p>
              </motion.div>
            )}
          </motion.button>

          {/* Brand */}
          <div className="flex items-center gap-3 relative">
            <div
              onMouseEnter={() => setHoveredItem('logo')}
              onMouseLeave={() => setHoveredItem(null)}
              className="flex items-center gap-3"
            >
              <NestEggLogo />
              <AnimatePresence>
                {!sidebarCollapsed && (
                  <motion.div
                    initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                    className="flex flex-col"
                  >
                    <span className="text-xl font-bold bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent">
                      NestEgg
                    </span>
                    <span className="text-xs text-gray-400">Plan Your Future</span>
                  </motion.div>
                )}
              </AnimatePresence>
              {sidebarCollapsed && hoveredItem === 'logo' && (
                <motion.div
                  initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                  className="absolute left-20 ml-2 px-3 py-2 bg-gray-800 rounded-lg shadow-xl border border-gray-700 whitespace-nowrap z-50"
                  role="tooltip"
                >
                  <p className="text-sm font-medium">NestEgg</p>
                  <p className="text-xs text-gray-400">Plan Your Future</p>
                </motion.div>
              )}
            </div>
          </div>

          {/* Right-aligned quick actions */}
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => { setShowSearch((v) => !v); if (sidebarCollapsed) setSidebarCollapsed(false); }}
              className="p-2 rounded-lg hover:bg-gray-800 transition-colors"
              aria-label="Toggle search (Cmd/Ctrl+K)"
              title="Search (Cmd/Ctrl+K)"
            >
              <Search className="w-5 h-5 text-gray-300" aria-hidden="true" />
            </button>
            <button
              onClick={() => setDarkMode((v) => !v)}
              className="p-2 rounded-lg hover:bg-gray-800 transition-colors"
              aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
              title={darkMode ? "Switch to light mode" : "Switch to dark mode"}
            >
              {darkMode ? <Sun className="w-5 h-5 text-gray-300" aria-hidden="true" /> : <Moon className="w-5 h-5 text-gray-300" aria-hidden="true" />}
            </button>
          </div>
        </div>

        {/* Search */}
        <AnimatePresence>
          {!sidebarCollapsed && showSearch && (
            <motion.div
              initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
              className="p-4 border-b border-gray-800/50"
            >
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  ref={searchRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search…"
                  className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg
                           text-sm text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                  aria-label="Search navigation"
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Navigation */}
        <nav className="flex-1 p-2 overflow-y-auto custom-scrollbar">
          <div className="space-y-1">
            {!sidebarCollapsed && (
              <div className="px-3 py-2 mt-4 mb-2">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  NestEgg Management
                </span>
              </div>
            )}

            {filteredMenuItems.map((item, index) => {
              const ActiveIcon = item.icon;
              const active = isActive(item.href);
              return (
                <motion.div
                  key={item.href}
                  variants={itemVariants} initial="hidden" animate="visible"
                  transition={{ delay: index * 0.05 }}
                >
                  <Link
                    href={item.href}
                    className={`
                      relative flex items-center gap-3 p-3 rounded-lg
                      transition-all duration-200 group
                      ${active
                        ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-600/20'
                        : 'hover:bg-gray-800/50 text-gray-300 hover:text-white'}
                      ${sidebarCollapsed ? 'justify-center' : 'justify-between'}
                    `}
                    aria-current={active ? 'page' : undefined}
                    aria-label={sidebarCollapsed ? item.label : undefined}
                    prefetch
                  >
                    <div className="flex items-center gap-3">
                      <motion.span whileHover={{ rotate: 5, scale: 1.1 }} className="transition-transform relative">
                        <ActiveIcon className="w-5 h-5" aria-hidden="true" />
                        {sidebarCollapsed && item.isPremium && (
                          <motion.span
                            variants={badgeVariants} initial="initial" animate="animate" whileHover="hover"
                            className="absolute -top-1 -right-1 w-3 h-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full grid place-items-center"
                            aria-hidden="true"
                          >
                            <Plus className="w-3 h-3 text-white p-0.5" />
                          </motion.span>
                        )}
                      </motion.span>
                      {!sidebarCollapsed && <span className="font-medium">{item.label}</span>}
                    </div>

                    {!sidebarCollapsed && item.isPremium && (
                      <motion.span
                        variants={badgeVariants} initial="initial" animate="animate"
                        className="px-2 py-0.5 text-xs rounded-full bg-gradient-to-r from-purple-500 to-pink-500
                                   text-white font-semibold shadow-lg"
                      >
                        NestEgg+
                      </motion.span>
                    )}

                    {sidebarCollapsed && hoveredItem === `item-${index}` && (
                      <motion.div
                        initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                        className="absolute left-20 ml-2 px-3 py-2 bg-gray-800 rounded-lg shadow-xl
                                   border border-gray-700 whitespace-nowrap z-50 max-w-xs"
                        role="tooltip"
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
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </nav>

        {/* Footer: Account + Logout */}
        <div className="border-t border-gray-800/50 p-2 relative">
          <div className="mb-1 relative" ref={userMenuRef}>
            <motion.div
              whileHover={{ x: sidebarCollapsed ? 0 : 4 }}
              whileTap={{ scale: 0.98 }}
              onMouseEnter={() => setHoveredItem('user-menu')}
              onMouseLeave={() => setHoveredItem(null)}
              className={`p-3 rounded-lg transition-all duration-200 group ${sidebarCollapsed ? 'flex justify-center' : ''}`}
              role="button"
              aria-label="Account"
            >
              <div className={`flex items-center ${!sidebarCollapsed ? 'w-full justify-between' : ''}`}>
                <div className="flex items-center gap-3">
                  <UserButton
                    afterSignOutUrl="/"
                    appearance={{
                      baseTheme: "dark",
                      elements: {
                        userButtonAvatarBox: "w-8 h-8",
                        userButtonPopoverCard: "bg-gray-900 border border-gray-800",
                        userButtonPopoverActionButton: "text-gray-100 hover:bg-gray-800",
                      },
                    }}
                  />
                  {!sidebarCollapsed && (
                    <div className="flex flex-col text-left">
                      <span className="text-sm font-medium">
                        {user?.first_name && user?.last_name
                          ? `${user.first_name} ${user.last_name}`
                          : (user?.email || 'User')}
                      </span>
                      <span className="text-[11px] text-gray-400">Account</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Tooltip when collapsed */}
              {sidebarCollapsed && hoveredItem === 'user-menu' && (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="absolute left-20 ml-2 px-3 py-2 bg-gray-800 rounded-lg shadow-xl
                            border border-gray-700 whitespace-nowrap z-50"
                  role="tooltip"
                >
                  <p className="text-sm font-medium">Account</p>
                  <p className="text-xs text-gray-400 mt-1">{user?.email}</p>
                </motion.div>
              )}
            </motion.div>
          </div>

          <motion.button
            whileHover={{ x: sidebarCollapsed ? 0 : 4 }} whileTap={{ scale: 0.98 }}
            onClick={async () => { await logout(); }}
            onMouseEnter={() => setHoveredItem('logout')}
            onMouseLeave={() => setHoveredItem(null)}
            className={`
              w-full flex items-center gap-3 p-3 rounded-lg
              hover:bg-red-500/10 text-gray-300 hover:text-red-400
              transition-all duration-200 group relative
              ${sidebarCollapsed ? 'justify-center' : ''}
            `}
            aria-label="Logout"
          >
            <LogOut className="w-5 h-5 group-hover:translate-x-1 transition-transform" aria-hidden="true" />
            {!sidebarCollapsed && <span className="font-medium">Logout</span>}

            {sidebarCollapsed && hoveredItem === 'logout' && (
              <motion.div
                initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                className="absolute left-20 ml-2 px-3 py-2 bg-gray-800 rounded-lg shadow-xl
                          border border-gray-700 whitespace-nowrap z-50"
                role="tooltip"
              >
                <p className="text-sm font-medium">Logout</p>
                <p className="text-xs text-gray-400 mt-1">Sign out of NestEgg</p>
              </motion.div>
            )}
          </motion.button>
        </div>
      </motion.aside>
    </>
  );
};

export default Sidebar;
