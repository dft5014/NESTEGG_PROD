// components/Sidebar.js
import Link from 'next/link';
import { BarChart2, ChevronLeft, ChevronRight, 
         CheckSquare, Settings, Database, Shield, 
         Home, Briefcase, Coins, Bitcoin } from 'lucide-react';
import { useContext, useState, useEffect } from 'react';
import { AuthContext } from '@/context/AuthContext';
import { useRouter } from 'next/router';

const Sidebar = () => {
  const { logout } = useContext(AuthContext);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const router = useRouter();

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
            {/* NestEgg (Overview) */}
            <Link href="/portfolio" className={menuItemClasses(isActive('/portfolio'))}>
              <span className="text-xl">🥚</span>
              {!sidebarCollapsed && <span>NestEgg</span>}
            </Link>

            {/* Investment Securities */}
            <Link href="/investment-securities" className={menuItemClasses(isActive('/investment-securities'))}>
              <Briefcase size={24} className={iconClasses} />
              {!sidebarCollapsed && <span>Securities</span>}
            </Link>

            {/* Real Estate */}
            <Link href="/real-estate" className={menuItemClasses(isActive('/real-estate'))}>
              <Home size={24} className={iconClasses} />
              {!sidebarCollapsed && <span>Real Estate</span>}
            </Link>

            {/* Metals */}
            <Link href="/metals" className={menuItemClasses(isActive('/metals'))}>
              <Coins size={24} className={iconClasses} />
              {!sidebarCollapsed && <span>Metals</span>}
            </Link>

            {/* Crypto */}
            <Link href="/crypto" className={menuItemClasses(isActive('/crypto'))}>
              <Bitcoin size={24} className={iconClasses} />
              {!sidebarCollapsed && <span>Crypto</span>}
            </Link>
            
            {/* Market Update (formerly Home) */}
            <Link href="/" className={menuItemClasses(isActive('/'))}>
              <BarChart2 size={24} className={iconClasses} />
              {!sidebarCollapsed && <span>Market Update</span>}
            </Link>

            {/* To Do List */}
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
      </aside>
      
      {/* Main content wrapper that adjusts to sidebar width */}
      <div className={`transition-all duration-300 ${sidebarCollapsed ? 'ml-16' : 'ml-64'}`}>
        {/* This wraps around the main content in _app.js */}
      </div>
    </>
  );
};

export default Sidebar;