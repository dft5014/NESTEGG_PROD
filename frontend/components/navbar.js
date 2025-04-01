// components/Navbar.js
import { useState, useContext, useEffect, useCallback, memo } from 'react';
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
  Menu,
  X,
  CirclePlus,
  LineChart,
  BarChart4,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import UpdateStatusIndicator from '@/components/UpdateStatusIndicator';
import AccountModal from '@/components/modals/AccountModal';
import PositionTypeModal from '@/components/modals/PositionTypeModal';

// Memoized EggLogo component to prevent unnecessary re-renders
const EggLogo = memo(() => (
  <div className="relative">
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
  </div>
));
EggLogo.displayName = 'EggLogo';

const Navbar = () => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isQuickActionsOpen, setIsQuickActionsOpen] = useState(false);
  const [scrolledDown, setScrolledDown] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(3);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [isPositionTypeModalOpen, setIsPositionTypeModalOpen] = useState(false);

  const { user, logout } = useContext(AuthContext);
  const router = useRouter();

  // Handle scroll events for navbar appearance
  useEffect(() => {
    const handleScroll = () => {
      setScrolledDown(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close dropdowns when clicking outside
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
    { icon: <User className="w-5 h-5 mr-2" />, label: "Profile", href: "/profile" },
    { icon: <Shield className="w-5 h-5 mr-2" />, label: "Admin", href: "/admin" },
    { icon: <Settings className="w-5 h-5 mr-2" />, label: "Settings", href: "/settings" },
    { icon: <Clock className="w-5 h-5 mr-2" />, label: "Scheduler", href: "/scheduler" },
    { icon: <HelpCircle className="w-5 h-5 mr-2" />, label: "Help", href: "/help" },
    { 
      icon: <LogOut className="w-5 h-5 mr-2 text-red-500" />, 
      label: "Logout", 
      action: logout,
      className: "text-red-500 border-t border-gray-200 mt-2 pt-2"
    }
  ];

  const displayName = user ? 
    (user.first_name && user.last_name ? `${user.first_name} ${user.last_name}` : user.email) : 
    '';

  const getInitials = useCallback(() => {
    if (user) {
      if (user.first_name && user.last_name) {
        return `${user.first_name[0]}${user.last_name[0]}`.toUpperCase();
      } else if (user.email) {
        return user.email[0].toUpperCase();
      }
    }
    return 'U';
  }, [user]);

  // Modal handlers
  const handleAddAccount = () => setIsAccountModalOpen(true);
  const handleAddPosition = () => setIsPositionTypeModalOpen(true);
  const handleViewPortfolio = () => router.push('/portfolio');
  const handleAccountSaved = () => {
    setIsAccountModalOpen(false);
    // Add any refresh logic if needed
  };
  const handlePositionSaved = () => {
    setIsPositionTypeModalOpen(false);
    // Add any refresh logic if needed
  };

  // Notifications mock data
  const notifications = [
    { id: 1, title: "Account Updated", message: "Your retirement account has been synced", time: "2 minutes ago", isNew: true },
    { id: 2, title: "Market Alert", message: "AAPL is up 3.5% today", time: "1 hour ago", isNew: true },
    { id: 3, title: "Balance Change", message: "Your portfolio increased by 1.2%", time: "3 hours ago", isNew: true },
    { id: 4, title: "New Feature", message: "Crypto tracking now available", time: "Yesterday", isNew: false },
  ];

  return (
    <div className="sticky top-0 z-40"> {/* Lower z-index to sit behind sidebar */}
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

            {/* Center Status */}
            {user && (
              <div className="hidden md:flex items-center">
                <div className="bg-green-800/80 px-4 py-1.5 rounded-full flex items-center text-green-100">
                  <UpdateStatusIndicator />
                  <span className="ml-2">Prices up to date</span>
                </div>
              </div>
            )}

            {/* Mobile Menu Button */}
            <button 
              className="md:hidden text-white focus:outline-none" 
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>

            {/* Desktop User Menu Section */}
            {user && (
              <div className="hidden md:flex items-center space-x-4">
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
                    <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white">
                      {getInitials()}
                    </div>
                    <span className="text-sm font-medium">{displayName}</span>
                  </button>
                  {isDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-60 bg-white rounded-lg shadow-xl z-20 overflow-hidden">
                      <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-4">
                        <p className="font-medium text-lg text-white">{displayName}</p>
                        <p className="text-sm text-blue-100 truncate">{user.email}</p>
                      </div>
                      <div className="py-1">
                        {dropdownItems.map((item, index) => (
                          item.action ? (
                            <button
                              key={index}
                              onClick={item.action}
                              className={`flex w-full items-center px-4 py-3 hover:bg-gray-100 transition-colors text-left text-gray-800 ${item.className || ''}`}
                            >
                              {item.icon}
                              {item.label}
                            </button>
                          ) : (
                            <Link
                              key={index}
                              href={item.href}
                              className={`flex items-center px-4 py-3 hover:bg-gray-100 transition-colors text-gray-800 ${item.className || ''}`}
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
                <Link href="/login" className="text-gray-300 hover:text-white transition-colors">
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

        {/* Quick Action Bar - Desktop */}
        {user && (
          <div className="hidden md:block border-t border-blue-800/30 bg-blue-900/80">
            <div className="container mx-auto px-4">
              <div className="flex justify-center items-center py-2">
                <button 
                  onClick={() => setIsQuickActionsOpen(!isQuickActionsOpen)}
                  className="flex items-center text-white px-4 py-2 transition-colors group"
                >
                  <span className="text-sm font-medium mr-2">Quick Actions</span>
                  {isQuickActionsOpen ? (
                    <ChevronUp className="w-5 h-5 text-white group-hover:text-blue-300" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-white group-hover:text-blue-300" />
                  )}
                </button>
              </div>
              {isQuickActionsOpen && (
                <div className="flex justify-center items-center py-2 space-x-12">
                  <button 
                    onClick={handleAddAccount}
                    className="flex flex-col items-center text-white py-1 px-4 transition-colors group"
                  >
                    <CirclePlus className="w-6 h-6 mb-1 text-white group-hover:text-blue-300" />
                    <span className="text-sm text-gray-200 group-hover:text-white">Add Account</span>
                  </button>
                  <button 
                    onClick={handleAddPosition}
                    className="flex flex-col items-center text-white py-1 px-4 transition-colors group"
                  >
                    <DollarSign className="w-6 h-6 mb-1 text-white group-hover:text-blue-300" />
                    <span className="text-sm text-gray-200 group-hover:text-white">Add Positions</span>
                  </button>
                  <button 
                    onClick={handleViewPortfolio}
                    className="flex flex-col items-center text-white py-1 px-4 transition-colors group"
                  >
                    <LineChart className="w-6 h-6 mb-1 text-white group-hover:text-blue-300" />
                    <span className="text-sm text-gray-200 group-hover:text-white">Portfolio</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </nav>

      {/* Mobile Menu */}
      {isMobileMenuOpen && user && (
        <div className="md:hidden bg-gray-900 text-white">
          <div className="p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-gray-800 pb-3">
              <div className="flex items-center">
                <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center text-white mr-3">
                  {getInitials()}
                </div>
                <div>
                  <div className="font-medium">{displayName}</div>
                  <div className="text-xs text-gray-400">{user.email}</div>
                </div>
              </div>
            </div>
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
          </div>
        </div>
      )}

      {/* Mobile Quick Actions */}
      {user && (
        <div className="md:hidden bg-blue-900 border-t border-blue-800">
          <div className="grid grid-cols-3 text-center">
            <button 
              onClick={handleAddAccount}
              className="flex flex-col items-center justify-center py-3"
            >
              <CirclePlus className="h-6 w-6 text-white mb-1" />
              <span className="text-xs text-gray-200">Add Account</span>
            </button>
            <button 
              onClick={handleAddPosition}
              className="flex flex-col items-center justify-center py-3"
            >
              <DollarSign className="h-6 w-6 text-white mb-1" />
              <span className="text-xs text-gray-200">Add Positions</span>
            </button>
            <button 
              onClick={handleViewPortfolio}
              className="flex flex-col items-center justify-center py-3"
            >
              <BarChart4 className="h-6 w-6 text-white mb-1" />
              <span className="text-xs text-gray-200">Portfolio</span>
            </button>
          </div>
        </div>
      )}

      {/* Modals */}
      <AccountModal
        isOpen={isAccountModalOpen}
        onClose={() => setIsAccountModalOpen(false)}
        onAccountAdded={handleAccountSaved}
      />
      <PositionTypeModal
        isOpen={isPositionTypeModalOpen}
        onClose={() => setIsPositionTypeModalOpen(false)}
        onTypeSelected={handlePositionSaved}
      />
    </div>
  );
};

export default Navbar;