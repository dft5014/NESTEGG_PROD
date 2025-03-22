// components/Sidebar.js
import Link from 'next/link';
import { Home, Briefcase, Info, LogOut, LogIn, Settings, Database, Shield } from 'lucide-react';
import { useContext } from 'react';
import { AuthContext } from '@/context/AuthContext';

const Sidebar = () => {
    const { logout } = useContext(AuthContext);

    return (
        <div className="h-screen w-64 bg-gray-900 text-white flex flex-col p-4 shadow-lg">
            <h1 className="text-2xl font-bold mb-6 text-center">NestEgg</h1>
            <nav className="space-y-4 flex-1">
                <Link href="/" className="flex items-center gap-3 p-3 hover:bg-gray-800 rounded-lg">
                    <Home size={20} />
                    <span>Home</span>
                </Link>
                <Link href="/portfolio" className="flex items-center gap-3 p-3 hover:bg-gray-800 rounded-lg">
                    <Briefcase size={20} />
                    <span>Portfolio</span>
                </Link>
                <Link href="/about" className="flex items-center gap-3 p-3 hover:bg-gray-800 rounded-lg">
                    <Info size={20} />
                    <span>About</span>
                </Link>
                <Link href="/settings" className="flex items-center gap-3 p-3 hover:bg-gray-800 rounded-lg">
                    <Settings size={20} />
                    <span>Settings</span>
                </Link>
                <Link href="/data-summary" className="flex items-center gap-3 p-3 hover:bg-gray-800 rounded-lg">
                    <Database size={20} />
                    <span>Data Summary</span>
                </Link>
                <Link href="/admin" className="flex items-center gap-3 p-3 hover:bg-gray-800 rounded-lg">
                    <Shield size={20} />
                    <span>Admin</span>
                </Link>
                <Link href="/login" className="flex items-center gap-3 p-3 hover:bg-blue-600 rounded-lg">
                    <LogIn size={20} />
                    <span>Login</span>
                </Link>
            </nav>
            <button 
                onClick={logout} 
                className="flex items-center gap-3 p-3 hover:bg-red-600 rounded-lg mt-auto text-white bg-red-500">
                <LogOut size={20} />
                <span>Logout</span>
            </button>
        </div>
    );
};

export default Sidebar;