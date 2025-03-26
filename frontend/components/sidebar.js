// components/Sidebar.js
import Link from 'next/link';
import { Home, Briefcase, Info, LogOut, LogIn, Settings, Database, Shield, ChevronLeft, ChevronRight } from 'lucide-react';
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

    return (
        <div className={`h-screen ${sidebarCollapsed ? 'w-16' : 'w-64'} bg-gray-900 text-white flex flex-col p-4 shadow-lg transition-all duration-300 relative`}>
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
                    <span className="text-2xl font-bold">🥚</span>
                ) : (
                    <h1 className="text-2xl font-bold">NestEgg</h1>
                )}
            </div>
            
            {/* Navigation */}
            <nav className="space-y-4 flex-1">
                <Link href="/" className="flex items-center gap-3 p-3 hover:bg-gray-800 rounded-lg">
                    <Home size={20} />
                    {!sidebarCollapsed && <span>Home</span>}
                </Link>
                <Link href="/portfolio" className="flex items-center gap-3 p-3 hover:bg-gray-800 rounded-lg">
                    <Briefcase size={20} />
                    {!sidebarCollapsed && <span>Portfolio</span>}
                </Link>
                <Link href="/about" className="flex items-center gap-3 p-3 hover:bg-gray-800 rounded-lg">
                    <Info size={20} />
                    {!sidebarCollapsed && <span>About</span>}
                </Link>
                <Link href="/settings" className="flex items-center gap-3 p-3 hover:bg-gray-800 rounded-lg">
                    <Settings size={20} />
                    {!sidebarCollapsed && <span>Settings</span>}
                </Link>
                <Link href="/data-summary" className="flex items-center gap-3 p-3 hover:bg-gray-800 rounded-lg">
                    <Database size={20} />
                    {!sidebarCollapsed && <span>Data Summary</span>}
                </Link>
                <Link href="/admin" className="flex items-center gap-3 p-3 hover:bg-gray-800 rounded-lg">
                    <Shield size={20} />
                    {!sidebarCollapsed && <span>Admin</span>}
                </Link>
                <Link href="/login" className="flex items-center gap-3 p-3 hover:bg-blue-600 rounded-lg">
                    <LogIn size={20} />
                    {!sidebarCollapsed && <span>Login</span>}
                </Link>
            </nav>
            
            {/* Logout button */}
            <button 
                onClick={logout} 
                className={`flex items-center gap-3 p-3 hover:bg-red-600 rounded-lg mt-auto text-white ${sidebarCollapsed ? 'justify-center' : 'bg-red-500'}`}
            >
                <LogOut size={20} />
                {!sidebarCollapsed && <span>Logout</span>}
            </button>
        </div>
    );
};

export default Sidebar;