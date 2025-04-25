// components/Sidebar.js
import Link from 'next/link';
import { BarChart2, ChevronLeft, ChevronRight, 
         CheckSquare, Settings, Database, Shield, 
         Home, Coins, Bitcoin, ChevronDown, ChevronUp, TrendingUp } from 'lucide-react';
import { useContext, useState, useEffect } from 'react';
import { AuthContext } from '@/context/AuthContext';
import { useRouter } from 'next/router';

const Sidebar = () => {
  const { logout } = useContext(AuthContext);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false); // Start expanded (not collapsed)
  const [portfolioCollapsed, setPortfolioCollapsed] = useState(false); // Portfolio sections start expanded
  const router = useRouter();

  // Handle resize for mobile behavior
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setSidebarCollapsed(true); // *** FIXED: Set to TRUE to collapse on mobile ***
      } else {
        setSidebarCollapsed(false); // Expand on desktop
      }
    };
    handleResize(); // Run on mount to set initial state
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []); // Empty dependency array ensures this runs only on mount and cleans up on unmount

  // Check if current route matches the given path
  const isActive = (path) => {
    return router.pathname === path || router.pathname.startsWith(`${path}/`);
  };

  // Common classes for menu items
  const menuItemClasses = (active) => `
    flex items-center gap-3 p-3 
    ${active ? 'bg-blue-700 text-white' : 'hover:bg-gray-800 text-gray-300 hover:text-white'} 
    rounded-lg transition-colors duration-200 ease-in-out
    ${sidebarCollapsed ? 'justify-center' : ''}
  `;

  // Common classes for icons
  const iconClasses = "min-w-[24px] min-h-[24px]";

  return (
    <>
      {/* Overlay to close sidebar on mobile */}
      {!sidebarCollapsed && (
        <div 
          className="md:hidden fixed inset-0 bg-black bg-opacity-50 z-20"
          onClick={() => setSidebarCollapsed(true)}
        />
      )}
     
      <aside 
        className={`
          fixed inset-y-0 left-0 z-30
          ${sidebarCollapsed ? 'w-16 border-r-4 border-blue-600' : 'w-64 border-r border-gray-800'} 
          bg-gray-900 text-white flex flex-col shadow-lg transition-all duration-300
          overflow-y-auto scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-gray-900
        `}
      >
        {/* Logo (Emoji Only) */}
        <div className="flex items-center justify-center py-6 border-b border-gray-800">
          <div className="text-2xl">🥚</div>
        </div>
        
        {/* Navigation */}
        <nav className="flex-1 py-4 px-2">
          <div className="space-y-1">
            {/* NestEgg (Portfolio) with Child Components Toggle */}
            <div className="flex items-center justify-between px-3">
              <Link href="/portfolio" className={menuItemClasses(isActive('/portfolio'))}>
                <span className="text-xl">🥚</span>
                {!sidebarCollapsed && <span className="ml-3">NestEgg</span>}
              </Link>
              
              {/* Toggle button for sidebar collapse/expand */}
              <button 
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className={`
                  absolute z-50 p-2 rounded-full bg-gray-800 text-white
                  hover:bg-gray-700 transition-colors duration-200 shadow-md
                  ${sidebarCollapsed ? 'right-0 top-20 -translate-x-1/2' : 'right-2 top-20 translate-x-0'}
                `}
                aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              >
                {sidebarCollapsed ? <ChevronRight size={24} /> : <ChevronLeft size={24} />}
              </button>
              
              {/* Toggle for child components - only visible in expanded mode */}
              {!sidebarCollapsed && (
                <button 
                  onClick={() => setPortfolioCollapsed(!portfolioCollapsed)}
                  className="p-2 text-gray-300 hover:text-white"
                  aria-label={portfolioCollapsed ? "Expand portfolio components" : "Collapse portfolio components"}
                >
                  {portfolioCollapsed ? <ChevronDown size={20} /> : <ChevronUp size={20} />}
                </button>
              )}
            </div>

            {/* Portfolio Child Pages - always visible, styled based on sidebar state */}
            {/* Show expanded list if sidebar is expanded and portfolio is not collapsed */}
            {(!sidebarCollapsed && !portfolioCollapsed) && (
              <div className="pl-4 space-y-1">
                {/* Investment Securities */}
                <Link href="/investment-securities" className={menuItemClasses(isActive('/investment-securities'))}>
                  <TrendingUp size={24} className={iconClasses} />
                  <span>Securities</span>
                </Link>

                {/* Real Estate */}
                <Link href="/real-estate" className={menuItemClasses(isActive('/real-estate'))}>
                  <Home size={24} className={iconClasses} />
                  <span>Real Estate</span>
                </Link>

                {/* Metals */}
                <Link href="/metals" className={menuItemClasses(isActive('/metals'))}>
                  <Coins size={24} className={iconClasses} />
                  <span>Metals</span>
                </Link>

                {/* Crypto */}
                <Link href="/crypto" className={menuItemClasses(isActive('/crypto'))}>
                  <Bitcoin size={24} className={iconClasses} />
                  <span>Crypto</span>
                </Link>
              </div>
            )}

            {/* Show icons-only list if sidebar is collapsed */}
            {sidebarCollapsed && (
              <div className="space-y-1">
                {/* Investment Securities */}
                <Link href="/investment-securities" className={menuItemClasses(isActive('/investment-securities'))}>
                  <TrendingUp size={24} className={iconClasses} />
                </Link>

                {/* Real Estate */}
                <Link href="/real-estate2" className={menuItemClasses(isActive('/real-estate'))}>
                  <Home size={24} className={iconClasses} />
                </Link>

                {/* Metals */}
                <Link href="/metals2" className={menuItemClasses(isActive('/metals'))}>
                  <Coins size={24} className={iconClasses} />
                </Link>

                {/* Crypto */}
                <Link href="/crypto2" className={menuItemClasses(isActive('/crypto'))}>
                  <Bitcoin size={24} className={iconClasses} />
                </Link>
              </div>
            )}

            {/* Other Navigation Items */}
            <Link href="/" className={menuItemClasses(isActive('/'))}>
              <BarChart2 size={24} className={iconClasses} />
              {!sidebarCollapsed && <span>Market Update</span>}
            </Link>
            <Link href="/AccountReconciliation" className={menuItemClasses(isActive('/todo'))}>
              <CheckSquare size={24} className={iconClasses} />
              {!sidebarCollapsed && <span>Account Reconciliations</span>}
            </Link>


            <Link href="/todo" className={menuItemClasses(isActive('/todo'))}>
              <CheckSquare size={24} className={iconClasses} />
              {!sidebarCollapsed && <span>To Do List</span>}
            </Link>
            <Link href="/income" className={menuItemClasses(isActive('/test-combined'))}>
                <Settings size={24} className={iconClasses} />
                {!sidebarCollapsed && <span>Test 123</span>}
              </Link>
            <Link href="/data-summary" className={menuItemClasses(isActive('/data-summary'))}>
              <Database size={24} className={iconClasses} />
              {!sidebarCollapsed && <span>Data Summary</span>}
            </Link>

            <Link href="/watchlist" className={menuItemClasses(isActive('/about'))}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={iconClasses}>
                <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                <path d="M12 7.5V9m0 6.5v-4" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
              </svg>
              {!sidebarCollapsed && <span>Trial Page</span>}
            </Link>

            {/* Test Pages */}
            <div className="pt-4 space-y-1">
              <Link href="/test" className={menuItemClasses(isActive('/test-fixed'))}>
                <Shield size={24} className={iconClasses} />
                {!sidebarCollapsed && <span>Test Accounts</span>}
              </Link>

            </div>
          </div>
        </nav>
      </aside>
      
      {/* Main content wrapper */}
      <div className={`transition-all duration-300 ${sidebarCollapsed ? 'ml-16' : 'ml-64'}`}>
        {/* This wraps around the main content in _app.js */}
      </div>
    </>
  );
};

export default Sidebar;