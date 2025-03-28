// components/Navbar.js
import { useState, useContext } from 'react';
import Link from 'next/link';
import { AuthContext } from '@/context/AuthContext';
import { 
  User,
  Settings,
  LogOut,
  HelpCircle,
  Bell,
  DollarSign,
  ChartLine,
  PlusCircle,
  Shield,
  Clock
} from 'lucide-react';
import { UpdateStatusIndicator } from '@/components/UpdateStatusIndicator';

const Navbar = () => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const { user, logout } = useContext(AuthContext);
  const [showAddAccountModal, setShowAddAccountModal] = useState(false);
  const [showAddPositionModal, setShowAddPositionModal] = useState(false);

  const dropdownItems = [
    { 
      icon: <User className="w-5 h-5 mr-2" />, 
      label: "Profile", 
      href: "/profile" 
    },
    { 
      icon: <Shield className="w-5 h-5 mr-2" />, 
      label: "Admin", 
      href: "/admin" 
    },
    { 
      icon: <Settings className="w-5 h-5 mr-2" />, 
      label: "Settings", 
      href: "/settings" 
    },
    { 
      icon: <Clock className="w-5 h-5 mr-2" />, 
      label: "Scheduler", 
      href: "/scheduler" 
    },
    { 
      icon: <HelpCircle className="w-5 h-5 mr-2" />, 
      label: "Help", 
      href: "/help" 
    },
    { 
      icon: <LogOut className="w-5 h-5 mr-2 text-red-500" />, 
      label: "Logout", 
      action: logout,
      className: "text-red-500"
    }
  ];
  
  const handleClickOutside = () => {
    if (isDropdownOpen) {
      setIsDropdownOpen(false);
    }
  };

  const displayName = user ? 
    (user.first_name && user.last_name ? 
      `${user.first_name} ${user.last_name}` : 
      user.email) : 
    '';

  const getInitials = () => {
    if (user) {
      if (user.first_name && user.last_name) {
        return `${user.first_name[0]}${user.last_name[0]}`.toUpperCase();
      } else if (user.email) {
        return user.email[0].toUpperCase();
      }
    }
    return 'U';
  };

  const handleAddPositionClick = () => {
    if (window.location.pathname === '/portfolio') {
      window.dispatchEvent(new CustomEvent('resetSelectedAccount'));
      window.dispatchEvent(new CustomEvent('openSelectAccountModal'));
    } else {
      window.location.href = '/portfolio';
    }
  };
  
  const handleAddAccountClick = () => {
    if (window.location.pathname === '/portfolio') {
      window.dispatchEvent(new CustomEvent('openAddAccountModal'));
    } else {
      window.location.href = '/portfolio';
    }
  };

  // SVG for Egg logo
  const EggLogo = () => (
    <svg 
      width="36" 
      height="36" 
      viewBox="0 0 36 36" 
      xmlns="http://www.w3.org/2000/svg"
      className="text-blue-400"
    >
      <defs>
        <linearGradient id="eggGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#60A5FA" />
          <stop offset="100%" stopColor="#93C5FD" />
        </linearGradient>
      </defs>
      <path 
        d="M18 2C12 2 6 12 6 22C6 30 11 34 18 34C25 34 30 30 30 22C30 12 24 2 18 2Z" 
        fill="url(#eggGradient)" 
        stroke="currentColor" 
        strokeWidth="1.5"
      />
      <circle cx="14" cy="16" r="1.5" fill="#1E3A8A" />
      <circle cx="22" cy="16" r="1.5" fill="#1E3A8A" />
      <path d="M15 24C16.5 25.5 19.5 25.5 21 24" stroke="#1E3A8A" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );

  return (
    <nav className="bg-gradient-to-r from-gray-900 to-blue-900 shadow-lg sticky top-0 z-50">
      <div className="container mx-auto px-4">
        {/* Main Navbar with Logo and User Menu */}
        <div className="h-16 flex justify-between items-center">
          {/* Logo and App Name */}
          <div className="flex items-center">
            <div className="mr-3 animate-pulse">
              <EggLogo />
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-bold text-white">NestEgg</span>
              <span className="text-xs text-blue-300">Plan Your Future</span>
            </div>
          </div>

          {/* Quick Action Buttons - Only show if user is logged in */}
          {user && (
            <div className="hidden md:flex space-x-4">
              <button 
                onClick={handleAddPositionClick}
                className="flex items-center bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-4 py-2 rounded-lg transition-all shadow-md hover:shadow-lg"
              >
                <DollarSign className="w-5 h-5 mr-2" />
                <span>Add Positions</span>
              </button>
              
              <Link href="/portfolio" className="flex items-center bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white px-4 py-2 rounded-lg transition-all shadow-md hover:shadow-lg">
                <ChartLine className="w-5 h-5 mr-2" />
                <span>View Portfolio</span>
              </Link>
              
              <button 
                onClick={handleAddAccountClick}
                className="flex items-center bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white px-4 py-2 rounded-lg transition-all shadow-md hover:shadow-lg"
              >
                <PlusCircle className="w-5 h-5 mr-2" />
                <span>Add Account</span>
              </button>
            </div>
          )}

          {/* User Section */}
          {user ? (
            <div className="flex items-center space-x-4">
              {/* Update Status Indicator */}
              <UpdateStatusIndicator />
              
              {/* Notifications - Optional */}
              <button className="text-gray-300 hover:text-white relative">
                <Bell className="w-6 h-6" />
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  3
                </span>
              </button>
              
              {/* User Dropdown */}
              <div className="relative">
                <button 
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="flex items-center space-x-2 hover:bg-blue-800/30 p-2 rounded-lg transition-colors text-white"
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 flex items-center justify-center shadow-md">
                    {getInitials()}
                  </div>
                  <span className="font-medium hidden md:inline-block max-w-[180px] truncate">
                    {displayName}
                  </span>
                </button>

                {isDropdownOpen && (
                  <>
                    <div 
                      className="fixed inset-0 z-10" 
                      onClick={handleClickOutside}
                    ></div>
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-xl z-20 overflow-hidden">
                      <div className="bg-gradient-to-r from-blue-600 to-blue-700 border-b border-blue-500 p-4 text-white">
                        <p className="font-medium truncate">{displayName}</p>
                        <p className="text-sm text-blue-200 truncate">{user.email}</p>
                      </div>
                      {dropdownItems.map((item, index) => (
                        item.action ? (
                          <button
                            key={index}
                            onClick={item.action}
                            className={`flex w-full items-center px-4 py-3 hover:bg-gray-100 transition-colors text-left ${item.className || ''}`}
                          >
                            {item.icon}
                            {item.label}
                          </button>
                        ) : (
                          <Link
                            key={index}
                            href={item.href}
                            className={`flex items-center px-4 py-3 hover:bg-gray-100 transition-colors ${item.className || ''}`}
                          >
                            {item.icon}
                            {item.label}
                          </Link>
                        )
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center space-x-4">
              <Link 
                href="/login" 
                className="text-gray-300 hover:text-white transition-colors"
              >
                Login
              </Link>
              <Link 
                href="/signup" 
                className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-4 py-2 rounded-lg transition-colors shadow-md hover:shadow-lg"
              >
                Sign up
              </Link>
            </div>
          )}
        </div>
      </div>
      
      {/* Mobile Menu Quick Actions - Only shown on small screens when logged in */}
      {user && (
        <div className="md:hidden bg-blue-900/50 p-2 flex justify-around border-t border-blue-800">
          <button 
            onClick={handleAddPositionClick}
            className="flex flex-col items-center justify-center text-blue-300 hover:text-blue-200 p-2 w-1/3 transition-colors"
          >
            <DollarSign className="w-6 h-6 mb-1" />
            <span className="text-xs">Add Positions</span>
          </button>
          
          <Link 
            href="/portfolio" 
            className="flex flex-col items-center justify-center text-green-300 hover:text-green-200 p-2 w-1/3 transition-colors"
          >
            <ChartLine className="w-6 h-6 mb-1" />
            <span className="text-xs">Portfolio</span>
          </Link>
          
          <button 
            onClick={handleAddAccountClick}
            className="flex flex-col items-center justify-center text-purple-300 hover:text-purple-200 p-2 w-1/3 transition-colors"
          >
            <PlusCircle className="w-6 h-6 mb-1" />
            <span className="text-xs">Add Account</span>
          </button>
        </div>
      )}
    </nav>
  );
};

export default Navbar;