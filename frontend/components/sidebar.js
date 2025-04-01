// components/Sidebar.js
import Link from 'next/link';
import { BarChart2, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, 
         CheckSquare, LogOut, Settings, Database, Shield, 
         Home, Briefcase, Coins, Bitcoin } from 'lucide-react';
import { useContext, useState, useEffect, useRef } from 'react';
import { AuthContext } from '@/context/AuthContext';
import { useRouter } from 'next/router';

const Sidebar = () => {
  const { logout, user } = useContext(AuthContext);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [subMenuOpen, setSubMenuOpen] = useState(true);
  const router = useRouter();
  const sidebarRef = useRef(null);

  // Set initial collapsed state based on screen width
  useEffect(() => {
    const handleResize = () => {
      setSidebarCollapsed(window.innerWidth < 768);
    };
    
    // Set initial state
    handleResize();
    
    // Add event listener
    window.addEventListener('resize', handleResize);
    
    // Clean up
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Check if current route matches the given path
  const isActive = (path) => {
    return router.pathname === path || router.pathname.startsWith(`${path}/`);
  };
  
  // Check if current route matches any of the investment submenu items
  const isInvestmentActive = () => {
    return isActive('/portfolio') || isActive('/investment-securities') || 
           isActive('/real-estate') || isActive('/metals') || isActive('/crypto');
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
    <aside 
      ref={sidebarRef}
      className={`
        fixed inset-y-0 left-0 z-30
        ${sidebarCollapsed ? 'w-16' : 'w-64'} 
        bg-gray-900 text-white flex flex-col shadow-lg transition-all duration-300
        overflow-y-auto scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-gray-900
      `}
    >
      {/* Toggle button */}
      <button 
        onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
        className="p-2 rounded-full bg-gray-800 text-white absolute top-4 right-0 transform translate-x-1/2 z-10
                   hover:bg-gray-700 transition-colors duration-200"
        aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {sidebarCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
      </button>
      
      {/* Logo */}
      <div className="flex items-center justify-center py-6 border-b border-gray-800">
        {sidebarCollapsed ? (
          <div className="text-2xl">🥚</div>
        ) : (
          <div className="flex items-center space-x-2">
            <span className="text-2xl">🪺</span>
            <span className="text-2xl">🥚</span>
            <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
              NestEgg
            </h1>
          </div>
        )}
      </div>
      
      {/* Navigation */}
      <nav className="flex-1 py-4 px-2">
        <div className="space-y-1">
          {/* Market Update (formerly Home) */}
          <Link href="/" className={menuItemClasses(isActive('/'))}>
            <BarChart2 size={24} className={iconClasses} />
            {!sidebarCollapsed && <span>Market Update</span>}
          </Link>

          {/* Your NestEgg (formerly Portfolio) with submenu */}
          <div className="space-y-1">
            <button 
              onClick={() => {
                if(!sidebarCollapsed) {
                  setSubMenuOpen(!subMenuOpen);
                } else {
                  router.push('/portfolio');
                }
              }}
              className={`${menuItemClasses(isInvestmentActive())} w-full`}
            >
              <div className="flex items-center">
                {!sidebarCollapsed && <span className="text-xl mr-1">🪺</span>}
                <span className="text-xl mr-1">🥚</span>
              </div>
              {!sidebarCollapsed && (
                <>
                  <span className="flex-1">Your NestEgg</span>
                  {subMenuOpen ? 
                    <ChevronUp size={16} /> : 
                    <ChevronDown size={16} />
                  }
                </>
              )}
            </button>

            {/* Submenu items */}
            {!sidebarCollapsed && subMenuOpen && (
              <div className="pl-10 space-y-1">
                <Link href="/portfolio" className={menuItemClasses(isActive('/portfolio'))}>
                  <Briefcase size={20} className={iconClasses} />
                  <span>Overview</span>
                </Link>
                <Link href="/investment-securities" className={menuItemClasses(isActive('/investment-securities'))}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={iconClasses}>
                    <path d="M3 6h18M3 12h18M3 18h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    <path d="M19 6l-5-4M14 18l5-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                  <span>Securities</span>
                </Link>
                <Link href="/real-estate" className={menuItemClasses(isActive('/real-estate'))}>
                  <Home size={20} className={iconClasses} />
                  <span>Real Estate</span>
                </Link>
                <Link href="/metals" className={menuItemClasses(isActive('/metals'))}>
                  <Coins size={20} className={iconClasses} />
                  <span>Metals</span>
                </Link>
                <Link href="/crypto" className={menuItemClasses(isActive('/crypto'))}>
                  <Bitcoin size={20} className={iconClasses} />
                  <span>Crypto</span>
                </Link>
              </div>
            )}
          </div>

          {/* To Do List with better icon */}
          <Link href="/todo" className={menuItemClasses(isActive('/todo'))}>
            <CheckSquare size={24} className={iconClasses} />
            {!sidebarCollapsed && <span>To Do List</span>}
          </Link>

          {/* Data Summary */}
          <Link href="/data-summary" className={menuItemClasses(isActive('/data-summary'))}>
            <Database size={24} className={iconClasses} />
            {!sidebarCollapsed && <span>Data Summary</span>}
          </Link>

          {/* Trial Page (formerly About) */}
          <Link href="/about" className={menuItemClasses(isActive('/about'))}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={iconClasses}>
              <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <path d="M12 7.5V9m0 6.5v-4" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
            </svg>
            {!sidebarCollapsed && <span>Trial Page</span>}
          </Link>

          {/* Test pages */}
          <div className="pt-4 space-y-1">
            <Link href="/test-fixed" className={menuItemClasses(isActive('/test-fixed'))}>
              <Shield size={24} className={iconClasses} />
              {!sidebarCollapsed && <span>Test Accounts</span>}
            </Link>
            <Link href="/test-combined" className={menuItemClasses(isActive('/test-combined'))}>
              <Settings size={24} className={iconClasses} />
              {!sidebarCollapsed && <span>Test Combined</span>}
            </Link>
          </div>
        </div>
      </nav>
      
      {/* User info and logout button */}
      <div className="border-t border-gray-800 p-4">
        {!sidebarCollapsed && user && (
          <div className="flex items-center mb-4 px-2">
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center mr-2">
              {user.email ? user.email[0].toUpperCase() : 'U'}
            </div>
            <div className="text-sm truncate">{user.email}</div>
          </div>
        )}
        
        <button 
          onClick={logout} 
          className={`
            ${sidebarCollapsed ? 'justify-center' : ''} 
            w-full flex items-center gap-2 p-2 rounded-lg 
            text-white bg-red-600 hover:bg-red-700 
            transition-colors duration-200 ease-in-out
          `}
        >
          <LogOut size={20} />
          {!sidebarCollapsed && <span>Logout</span>}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;