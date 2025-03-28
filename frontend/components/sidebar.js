// components/Sidebar.js
import Link from 'next/link';
import { Home, Briefcase, Info, LogOut, LogIn, Settings, Database, Shield, ChevronLeft, ChevronRight, Home as RealEstate, Coins, Bitcoin } from 'lucide-react';
import { useContext, useState, useEffect } from 'react';
import { AuthContext } from '@/context/AuthContext';

const Sidebar = () => {
    const { logout } = useContext(AuthContext);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    
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

    // Set icon size to 32px, we'll use CSS to ensure proper sizing
    const iconSize = 32;

    return (
        <div className={`h-screen ${sidebarCollapsed ? 'w-16 sidebar-collapsed' : 'w-64'} bg-gray-900 text-white flex flex-col p-4 shadow-lg transition-all duration-300 relative`}>
            {/* Toggle button */}
            <button 
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="p-2 rounded-full bg-gray-800 text-white absolute top-4 right-0 transform translate-x-1/2 z-10"
            >
                {sidebarCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
            </button>
            
            {/* Logo */}
            <div className="mb-6 text-center">
                {sidebarCollapsed ? (
                    <span className="text-3xl font-bold">🥚</span>
                ) : (
                    <h1 className="text-2xl font-bold">NestEgg</h1>
                )}
            </div>
            
            {/* Navigation */}
            <nav className="space-y-4 flex-1">
                <Link href="/" className={`flex items-center gap-3 p-3 hover:bg-gray-800 rounded-lg ${sidebarCollapsed ? 'justify-center' : ''}`}>
                    <Home size={iconSize} className="sidebar-icon min-w-[32px] min-h-[32px]" />
                    {!sidebarCollapsed && <span>Home</span>}
                </Link>
                <Link href="/portfolio" className={`flex items-center gap-3 p-3 hover:bg-gray-800 rounded-lg ${sidebarCollapsed ? 'justify-center' : ''}`}>
                    <Briefcase size={iconSize} className="sidebar-icon min-w-[32px] min-h-[32px]" />
                    {!sidebarCollapsed && <span>Portfolio</span>}
                </Link>
                <Link href="/investment-securities" className={`flex items-center gap-3 p-3 hover:bg-gray-800 rounded-lg ${sidebarCollapsed ? 'justify-center' : ''}`}>
                    <Briefcase size={iconSize} className="sidebar-icon min-w-[32px] min-h-[32px]" />
                    {!sidebarCollapsed && <span>Investments</span>}
                </Link>
                <Link href="/real-estate" className={`flex items-center gap-3 p-3 hover:bg-gray-800 rounded-lg ${sidebarCollapsed ? 'justify-center' : ''}`}>
                    <RealEstate size={iconSize} className="sidebar-icon min-w-[32px] min-h-[32px]" />
                    {!sidebarCollapsed && <span>Real Estate</span>}
                </Link>
                <Link href="/metals" className={`flex items-center gap-3 p-3 hover:bg-gray-800 rounded-lg ${sidebarCollapsed ? 'justify-center' : ''}`}>
                    <Coins size={iconSize} className="sidebar-icon min-w-[32px] min-h-[32px]" />
                    {!sidebarCollapsed && <span>Metals</span>}
                </Link>
                <Link href="/crypto" className={`flex items-center gap-3 p-3 hover:bg-gray-800 rounded-lg ${sidebarCollapsed ? 'justify-center' : ''}`}>
                    <Bitcoin size={iconSize} className="sidebar-icon min-w-[32px] min-h-[32px]" />
                    {!sidebarCollapsed && <span>Crypto</span>}
                </Link>
                <Link href="/todo" className={`flex items-center gap-3 p-3 hover:bg-gray-800 rounded-lg ${sidebarCollapsed ? 'justify-center' : ''}`}>
                    <Settings size={iconSize} className="sidebar-icon min-w-[32px] min-h-[32px]" />
                    {!sidebarCollapsed && <span>To Do List</span>}
                </Link>
                <Link href="/data-summary" className={`flex items-center gap-3 p-3 hover:bg-gray-800 rounded-lg ${sidebarCollapsed ? 'justify-center' : ''}`}>
                    <Database size={iconSize} className="sidebar-icon min-w-[32px] min-h-[32px]" />
                    {!sidebarCollapsed && <span>Data Summary</span>}
                </Link>
                <Link href="/about" className={`flex items-center gap-3 p-3 hover:bg-gray-800 rounded-lg ${sidebarCollapsed ? 'justify-center' : ''}`}>
                    <Info size={iconSize} className="sidebar-icon min-w-[32px] min-h-[32px]" />
                    {!sidebarCollapsed && <span>About</span>}
                </Link>
                <Link href="/scheduler" className={`flex items-center gap-3 p-3 hover:bg-gray-800 rounded-lg ${sidebarCollapsed ? 'justify-center' : ''}`}>
                    <Info size={iconSize} className="sidebar-icon min-w-[32px] min-h-[32px]" />
                    {!sidebarCollapsed && <span>scheduler page</span>}
                </Link>
            </nav>
            
            {/* Logout button */}
            <button 
                onClick={logout} 
                className={`flex items-center gap-3 p-3 hover:bg-red-600 rounded-lg mt-auto text-white ${sidebarCollapsed ? 'justify-center' : 'bg-red-500'}`}
            >
                <LogOut size={iconSize} className="sidebar-icon min-w-[32px] min-h-[32px]" />
                {!sidebarCollapsed && <span>Logout</span>}
            </button>
        </div>
    );
};

export default Sidebar;