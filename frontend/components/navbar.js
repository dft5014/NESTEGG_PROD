// components/Navbar.js
import { useState, useContext } from 'react';
import Link from 'next/link';
import { AuthContext } from '@/context/AuthContext';
import { 
  PiggyBank, 
  User,
  Settings,
  LogOut,
  HelpCircle,
  Bell,
  DollarSign,
  ChartLine,
  PlusCircle,
  Shield // Added for Admin icon
} from 'lucide-react';

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

  // Rest of the component remains unchanged
  
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

  return (
    <nav className="bg-gray-900 shadow-lg sticky top-0 z-50">
      <div className="container mx-auto px-4">
        {/* Main Navbar with Logo and User Menu */}
        <div className="h-16 flex justify-between items-center">
          {/* Logo and App Name */}
          <div className="flex items-center">
            <div className="mr-3">
              <PiggyBank className="w-8 h-8 text-blue-400" />
            </div>
            <span className="text-xl font-bold text-white">NestEgg</span>
          </div>

          {/* Quick Action Buttons - Only show if user is logged in */}
          {user && (
            <div className="hidden md:flex space-x-4">
              <button 
                onClick={handleAddPositionClick}
                className="flex items-center bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-all"
              >
                <DollarSign className="w-5 h-5 mr-2" />
                <span>Add Positions</span>
              </button>
              
              <Link href="/portfolio" className="flex items-center bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-all">
                <ChartLine className="w-5 h-5 mr-2" />
                <span>View Portfolio</span>
              </Link>
              
              <button 
                onClick={handleAddAccountClick}
                className="flex items-center bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-all"
              >
                <PlusCircle className="w-5 h-5 mr-2" />
                <span>Add Account</span>
              </button>
            </div>
          )}

          {/* User Section */}
          {user ? (
            <div className="flex items-center space-x-4">
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
                  className="flex items-center space-x-2 hover:bg-gray-800 p-2 rounded-lg transition-colors text-white"
                >
                  <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center">
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
                    <div className="absolute right-0 mt-2 w-56 bg-white text-gray-800 rounded-lg shadow-xl z-20">
                      <div className="border-b border-gray-200 p-4">
                        <p className="font-medium truncate">{displayName}</p>
                        <p className="text-sm text-gray-500 truncate">{user.email}</p>
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
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Sign up
              </Link>
            </div>
          )}
        </div>
      </div>
      
      {/* Mobile Menu Quick Actions - Only shown on small screens when logged in */}
      {user && (
        <div className="md:hidden bg-gray-800 p-2 flex justify-around">
          <button 
            onClick={handleAddPositionClick}
            className="flex flex-col items-center justify-center text-blue-400 p-2 w-1/3"
          >
            <DollarSign className="w-6 h-6 mb-1" />
            <span className="text-xs">Add Positions</span>
          </button>
          
          <Link 
            href="/portfolio" 
            className="flex flex-col items-center justify-center text-green-400 p-2 w-1/3"
          >
            <ChartLine className="w-6 h-6 mb-1" />
            <span className="text-xs">Portfolio</span>
          </Link>
          
          <button 
            onClick={handleAddAccountClick}
            className="flex flex-col items-center justify-center text-purple-400 p-2 w-1/3"
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