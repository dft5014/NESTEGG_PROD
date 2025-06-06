// components/Sidebar.js - Improved Version
import Link from 'next/link';
import { BarChart2, ChevronLeft, ChevronRight, 
         CheckSquare, Settings, Database, Shield, 
         Home, Coins, Bitcoin, ChevronDown, ChevronUp, 
         TrendingUp, Gauge, Info, LineChart, PieChart } from 'lucide-react';
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
        setSidebarCollapsed(true); // Collapse on mobile
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

  // Menu structure for better organization
  const menuItems = [
    { href: "/portfolio", label: "NestEgg", icon: <span className="text-xl">🥚</span> },
    { href: "/portfolio-command-center", label: "Portfolio Command Center", icon: <Gauge size={24} className={iconClasses}  /> },
    { 
      label: "Portfolio Management",
      items: [
        { href: "/accounts", label: "Accounts", icon: <Home size={24} className={iconClasses} /> },
        { href: "/positions", label: "Positions", icon: <TrendingUp size={24} className={iconClasses} /> },
        { href: "/AccountReconciliation", label: "Account Reconciliations", icon: <Database size={24} className={iconClasses} /> },
      ]
    },
    { href: "/tasks", label: "Task Tracker", icon: <CheckSquare size={24} className={iconClasses} /> },
    { 
      label: "Feature Testing",
      items: [
        { href: "/income", label: "Report V1", icon: <Settings size={24} className={iconClasses} /> },
        { href: "/test", label: "Report V2", icon: <Shield size={24} className={iconClasses} /> },
      ]
    }
  ];

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
          {!sidebarCollapsed && <span className="ml-2 text-lg font-semibold">NestEgg</span>}
        </div>
        
        {/* Navigation */}
        <nav className="flex-1 py-4 px-2">
          <div className="space-y-1">
            {/* Render menu items based on structure */}
            {menuItems.map((item, index) => (
              item.items ? (
                // Group with submenu
                <div key={`group-${index}`} className="mb-2">
                  {!sidebarCollapsed && (
                    <div 
                      className="flex items-center justify-between px-3 py-2 text-xs uppercase tracking-wider text-gray-400 font-semibold"
                      onClick={() => {
                        if (item.label === "Portfolio Management") {
                          setPortfolioCollapsed(!portfolioCollapsed);
                        }
                      }}
                    >
                      <span>{item.label}</span>
                      {item.label === "Portfolio Management" && (
                        portfolioCollapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />
                      )}
                    </div>
                  )}
                  
                  {/* Show submenu items if not collapsed or if it's not the Portfolio section */}
                  {(!portfolioCollapsed || sidebarCollapsed || item.label !== "Portfolio Management") && (
                    <div className={`space-y-1 ${sidebarCollapsed ? '' : 'ml-2'}`}>
                      {item.items.map((subItem, subIndex) => (
                        <Link 
                          key={`${index}-${subIndex}`} 
                          href={subItem.href}
                          className={menuItemClasses(isActive(subItem.href))}
                        >
                          {subItem.icon}
                          {!sidebarCollapsed && <span>{subItem.label}</span>}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                // Single menu item
                <Link 
                  key={`item-${index}`}
                  href={item.href}
                  className={menuItemClasses(isActive(item.href))}
                >
                  {item.icon}
                  {!sidebarCollapsed && <span>{item.label}</span>}
                </Link>
              )
            ))}
          </div>
        </nav>
        
        {/* Footer with logout button */}
        <div className="p-4 border-t border-gray-800">
          <button 
            onClick={logout}
            className={`${menuItemClasses(false)} w-full justify-center md:justify-start`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className={iconClasses} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            {!sidebarCollapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>
      
      {/* Toggle button for sidebar collapse/expand */}
      <button 
        onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
        className={`
          fixed z-50 p-2 rounded-full bg-gray-800 text-white
          hover:bg-gray-700 transition-colors duration-200 shadow-md
          ${sidebarCollapsed ? 'left-12 top-20' : 'left-60 top-20'}
        `}
        aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {sidebarCollapsed ? <ChevronRight size={24} /> : <ChevronLeft size={24} />}
      </button>
      
      {/* Main content wrapper */}
      <div className={`transition-all duration-300 ${sidebarCollapsed ? 'ml-16' : 'ml-64'}`}>
        {/* This wraps around the main content in _app.js */}
      </div>
    </>
  );
};

export default Sidebar;