// components/Navbar.js
import { useState, useContext, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
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
  Clock,
  HomeIcon,
  ChevronDown,
  Menu,
  X
} from 'lucide-react';
import UpdateStatusIndicator from '@/components/UpdateStatusIndicator';

const Navbar = () => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user, logout } = useContext(AuthContext);
  const router = useRouter();
  const [scrolledDown, setScrolledDown] = useState(false);
  const [showAddAccountModal, setShowAddAccountModal] = useState(false);
  const [showAddPositionModal, setShowAddPositionModal] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(3);

  // Handle scroll events for navbar appearance
  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY;
      setScrolledDown(scrollPosition > 10);
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isDropdownOpen && !event.target.closest('.user-dropdown')) {
        setIsDropdownOpen(false);
      }
      if (showNotifications && !event.target.closest('.notification-dropdown')) {
        setShowNotifications(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isDropdownOpen, showNotifications]);

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
      className: "text-red-500 border-t border-gray-200 mt-2 pt-2"
    }
  ];

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

  const handleAddAccountClick = () => {
    if (window.dispatchEvent) {
      window.dispatchEvent(new CustomEvent('openAddAccountModal'));
    } else {
      router.push('/portfolio');
    }
  };
  
  const handleAddPositionClick = () => {
    if (window.dispatchEvent) {
      window.dispatchEvent(new CustomEvent('openPositionTypeModal'));
    } else {
      router.push('/portfolio');
    }
  };

  // Custom EggLogo component
  const EggLogo = () => (
    <div className="relative">
      <svg 
        width="36" 
        height="36" 
        viewBox="0 0 36 36" 
        xmlns="http://www.w3.org/2000/svg"
        className="transition-all duration-300 ease-in-out"
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
          className="transition-all duration-300"
        />
        <circle cx="14" cy="16" r="1.5" fill="#1E3A8A" />
        <circle cx="22" cy="16" r="1.5" fill="#1E3A8A" />
        <path d="M15 24C16.5 25.5 19.5 25.5 21 24" stroke="#1E3A8A" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
      <div className={`absolute -top-1 -right-1 transition-all duration-500 ${scrolledDown ? 'opacity-100 scale-100' : 'opacity-0 scale-0'}`}>
        <span className="flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-sky-500"></span>
        </span>
      </div>
    </div>
  );

  // Notifications mock data
  const notifications = [
    { id: 1, title: "Account Updated", message: "Your retirement account has been synced", time: "2 minutes ago", isNew: true },
    { id: 2, title: "Market Alert", message: "AAPL is up 3.5% today", time: "1 hour ago", isNew: true },
    { id: 3, title: "Balance Change", message: "Your portfolio increased by 1.2%", time: "3 hours ago", isNew: true },
    { id: 4, title: "New Feature", message: "Crypto tracking now available", time: "Yesterday", isNew: false },
  ];

  return (
    <div className="sticky top-0 z-50">
      {/* Main Navbar */}
      <nav className={`${scrolledDown ? 'bg-gray-900/95 backdrop-blur-sm shadow-lg' : 'bg-gradient-to-r from-gray-900 to-blue-900'} transition-all duration-300`}>
        <div className="container mx-auto px-4">
          {/* Top Row: Logo and User Menu */}
          <div className="h-16 flex justify-between items-center">
            {/* Logo and App Name */}
            <div className="flex items-center">
              <Link href="/" className="flex items-center">
                <div className={`mr-3 ${scrolledDown ? '' : 'animate-pulse'}`}>
                  <EggLogo />
                </div>
                <div className="flex flex-col">
                  <span className="text-xl font-bold text-white">NestEgg</span>
                  <span className="text-xs text-blue-300">Plan Your Future</span>
                </div>
              </Link>
            </div>

            {/* Mobile Menu Button */}
            <button 
              className="md:hidden text-white focus:outline-none" 
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? 
                <X className="h-6 w-6" /> : 
                <Menu className="h-6 w-6" />
              }
            </button>

            {/* Desktop User Menu Section */}
            {user && (
              <div className="hidden md:flex items-center space-x-4">
                {/* Update Status Indicator */}
                <UpdateStatusIndicator />
                
                {/* Notifications */}
                <div className="relative notification-dropdown">
                  <button 
                    className="text-gray-300 hover:text-white relative p-1 rounded-full hover:bg-gray-800/50 transition-colors"
                    onClick={() => setShowNotifications(!showNotifications)}
                  >
                    <Bell className="w-6 h-6" />
                    {unreadNotifications > 0 && (
                      <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                        {unreadNotifications}
                      </span>
                    )}
                  </button>
                  
                  {/* Notifications Dropdown */}
                  {showNotifications && (
                    <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl overflow-hidden z-20">
                      <div className="bg-gradient-to-r from-blue-700 to-blue-600 p-3 text-white border-b border-blue-500">
                        <div className="flex justify-between items-center">
                          <h3 className="font-medium">Notifications</h3>
                          <button className="text-blue-200 hover:text-white text-xs">Mark all as read</button>
                        </div>
                      </div>
                      <div className="max-h-96 overflow-y-auto">
                        {notifications.map(notification => (
                          <div 
                            key={notification.id} 
                            className={`p-3 border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer ${notification.isNew ? 'bg-blue-50' : ''}`}
                          >
                            <div className="flex justify-between">
                              <h4 className="font-medium text-gray-900">{notification.title}</h4>
                              <span className="text-xs text-gray-500">{notification.time}</span>
                            </div>
                            <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
                          </div>
                        ))}
                      </div>
                      <div className="p-2 text-center bg-gray-50 border-t border-gray-100">
                        <Link href="/notifications" className="text-sm text-blue-600 hover:text-blue-800">
                          View all notifications
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* User Dropdown */}
                <div className="relative user-dropdown">
                  <button 
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className="flex items-center space-x-2 hover:bg-blue-800/30 p-2 rounded-lg transition-colors text-white"
                    aria-expanded={isDropdownOpen}
                    aria-haspopup="true"
                  >
                    <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 flex items-center justify-center shadow-md">
                      {getInitials()}
                    </div>
                    <span className="font-medium hidden lg:inline-block max-w-[180px] truncate">
                      {displayName}
                    </span>
                    <ChevronDown className="h-4 w-4 hidden lg:block" />
                  </button>

                  {isDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-xl z-20 overflow-hidden">
                      <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-4 text-white">
                        <p className="font-medium truncate">{displayName}</p>
                        <p className="text-sm text-blue-200 truncate">{user.email}</p>
                      </div>
                      <div className="py-1">
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
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Non-Authenticated Links */}
            {!user && (
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
        
        {/* Bottom Action Bar - Desktop */}
        {user && (
          <div className="hidden md:block border-t border-blue-800/30 bg-blue-900/20 backdrop-blur-sm">
            <div className="container mx-auto px-4">
              <div className="flex justify-between items-center py-2">
                {/* Left Side: Current Page */}
                <div className="text-blue-300 text-sm">
                  {router.pathname === "/" ? "Dashboard" : 
                   router.pathname === "/portfolio" ? "Portfolio Management" : 
                   router.pathname === "/investment-securities" ? "Investment Securities" : 
                   "Account Management"}
                </div>
                
                {/* Right Side: Quick Actions */}
                <div className="flex space-x-2">
                  <button 
                    onClick={handleAddAccountClick}
                    className="flex items-center bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-3 py-1.5 rounded-lg transition-all shadow-sm hover:shadow-md text-sm"
                  >
                    <PlusCircle className="w-4 h-4 mr-1.5" />
                    <span>Add Account</span>
                  </button>
                  
                  <button 
                    onClick={handleAddPositionClick}
                    className="flex items-center bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white px-3 py-1.5 rounded-lg transition-all shadow-sm hover:shadow-md text-sm"
                  >
                    <DollarSign className="w-4 h-4 mr-1.5" />
                    <span>Add Position</span>
                  </button>
                  
                  <Link 
                    href="/portfolio" 
                    className="flex items-center bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white px-3 py-1.5 rounded-lg transition-all shadow-sm hover:shadow-md text-sm"
                  >
                    <ChartLine className="w-4 h-4 mr-1.5" />
                    <span>View Portfolio</span>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}
      </nav>
      
      {/* Mobile Menu */}
      {isMobileMenuOpen && user && (
        <div className="md:hidden bg-gray-900 text-white">
          <div className="container mx-auto p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-gray-800 pb-3">
              <div className="flex items-center">
                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 flex items-center justify-center mr-3">
                  {getInitials()}
                </div>
                <div>
                  <div className="font-medium">{displayName}</div>
                  <div className="text-xs text-gray-400">{user.email}</div>
                </div>
              </div>
              <UpdateStatusIndicator />
            </div>
            
            {/* Dropdown Menu Items */}
            <div className="space-y-2 py-2">
              {dropdownItems.map((item, index) => (
                item.action ? (
                  <button
                    key={index}
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      item.action();
                    }}
                    className={`flex w-full items-center p-3 hover:bg-gray-800 rounded-lg transition-colors ${item.className || ''}`}
                  >
                    {item.icon}
                    {item.label}
                  </button>
                ) : (
                  <Link
                    key={index}
                    href={item.href}
                    className={`flex items-center p-3 hover:bg-gray-800 rounded-lg transition-colors ${item.className || ''}`}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    {item.icon}
                    {item.label}
                  </Link>
                )
              ))}
            </div>
            
            {/* Mobile Quick Actions */}
            <div className="grid grid-cols-3 gap-2 pt-3 border-t border-gray-800">
              <button 
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  handleAddAccountClick();
                }}
                className="flex flex-col items-center justify-center text-blue-300 hover:text-blue-200 p-3 rounded bg-gray-800/80 hover:bg-gray-800 transition-colors"
              >
                <PlusCircle className="w-6 h-6 mb-1" />
                <span className="text-xs">Add Account</span>
              </button>
              
              <button 
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  handleAddPositionClick();
                }}
                className="flex flex-col items-center justify-center text-purple-300 hover:text-purple-200 p-3 rounded bg-gray-800/80 hover:bg-gray-800 transition-colors"
              >
                <DollarSign className="w-6 h-6 mb-1" />
                <span className="text-xs">Add Position</span>
              </button>
              
              <Link 
                href="/portfolio" 
                className="flex flex-col items-center justify-center text-green-300 hover:text-green-200 p-3 rounded bg-gray-800/80 hover:bg-gray-800 transition-colors"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <ChartLine className="w-6 h-6 mb-1" />
                <span className="text-xs">Portfolio</span>
              </Link>
            </div>
          </div>
        </div>
      )}
      
      {/* Mobile Menu Quick Actions - Only shown on small screens when menu is closed */}
      {user && !isMobileMenuOpen && (
        <div className="md:hidden bg-blue-900/95 backdrop-blur-sm p-2 flex justify-around shadow-lg">
          <button 
            onClick={handleAddAccountClick}
            className="flex flex-col items-center justify-center text-blue-300 hover:text-blue-200 p-2 w-1/3 transition-colors"
          >
            <PlusCircle className="w-5 h-5 mb-1" />
            <span className="text-xs">Add Account</span>
          </button>
          
          <button 
            onClick={handleAddPositionClick}
            className="flex flex-col items-center justify-center text-purple-300 hover:text-purple-200 p-2 w-1/3 transition-colors"
          >
            <DollarSign className="w-5 h-5 mb-1" />
            <span className="text-xs">Add Position</span>
          </button>
          
          <Link 
            href="/portfolio" 
            className="flex flex-col items-center justify-center text-green-300 hover:text-green-200 p-2 w-1/3 transition-colors"
          >
            <ChartLine className="w-5 h-5 mb-1" />
            <span className="text-xs">Portfolio</span>
          </Link>
        </div>
      )}
    </div>
  );
};

export default Navbar;