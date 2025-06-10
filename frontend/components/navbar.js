// components/Navbar.js
import { useState, useContext, useEffect, useCallback, memo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { AuthContext } from '@/context/AuthContext';
import {
    User, Settings, LogOut, HelpCircle, Bell, ChartLine,
    PlusCircle, Shield, Clock, Menu, X, LineChart, BarChart4,
    ChevronLeft, ChevronRight, Upload, Loader2, AlertCircle // Added Loader2, AlertCircle for status
} from 'lucide-react';
import UpdateStatusIndicator from '@/components/UpdateStatusIndicator';
import AddPositionButton from '@/components/AddPositionButton';
import AddAccountButton from '@/components/AddAccountButton';
import BulkPositionButton from '@/components/BulkPositionButton';
import { fetchAccounts } from '@/utils/apimethods/accountMethods';

// Memoized EggLogo component (no changes)
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
    const [isQuickActionsOpen, setIsQuickActionsOpen] = useState(true);
    const [scrolledDown, setScrolledDown] = useState(false);
    const [showNotifications, setShowNotifications] = useState(false);
    const [unreadNotifications, setUnreadNotifications] = useState(3); // Mock data

    const { user, logout } = useContext(AuthContext);
    const router = useRouter();

    // --- Account Fetching State & Logic ---
    const [accounts, setAccounts] = useState([]);
    const [isLoadingAccounts, setIsLoadingAccounts] = useState(false);
    const [accountError, setAccountError] = useState(null);

    const loadAccounts = useCallback(async () => {
        if (!user) {
            setAccounts([]);
            setIsLoadingAccounts(false);
            setAccountError(null);
            return;
        }
        setIsLoadingAccounts(true);
        setAccountError(null);
        try {
            // console.log("Navbar: Fetching accounts...");
            const accountsData = await fetchAccounts();
            setAccounts(accountsData || []);
            // console.log("Navbar: Accounts fetched:", accountsData ? accountsData.length : 0);
        } catch (error) {
            console.error("Navbar: Error fetching accounts:", error);
            setAccountError("Failed to load accounts."); // Set error message
            setAccounts([]);
        } finally {
            setIsLoadingAccounts(false);
        }
    }, [user]); // Dependency on user context

    useEffect(() => {
        loadAccounts();
    }, [loadAccounts]); // Dependency on the useCallback memoized function

    // --- End Account Fetching Logic ---


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
            // Close User Dropdown
            const userDropdown = event.target.closest('.user-dropdown');
            if (isDropdownOpen && !userDropdown) {
                // Check if the click was on the button that opens the dropdown
                 const userDropdownButton = event.target.closest('.user-dropdown-button');
                 if (!userDropdownButton) {
                     setIsDropdownOpen(false);
                 }
            }
             // Close Notifications Dropdown
             const notificationDropdown = event.target.closest('.notification-dropdown');
             if (showNotifications && !notificationDropdown) {
                 // Check if the click was on the button that opens the dropdown
                 const notificationButton = event.target.closest('.notification-button');
                 if (!notificationButton) {
                     setShowNotifications(false);
                 }
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

    // Notifications mock data
    const notifications = [
        { id: 1, title: "Account Updated", message: "Your retirement account has been synced", time: "2 minutes ago", isNew: true },
        { id: 2, title: "Market Alert", message: "AAPL is up 3.5% today", time: "1 hour ago", isNew: true },
        { id: 3, title: "Balance Change", message: "Your portfolio increased by 1.2%", time: "3 hours ago", isNew: true },
        { id: 4, title: "New Feature", message: "Crypto tracking now available", time: "Yesterday", isNew: false },
    ];

    // Placeholder functions for BulkPositionButton
    const placeholderFetchPositions = () => {
        console.warn('Navbar: fetchPositions function is not implemented or passed down.');
        // TODO: Implement actual refresh logic, likely via context or state management
    };
    const placeholderFetchPortfolioSummary = () => {
        console.warn('Navbar: fetchPortfolioSummary function is not implemented or passed down.');
         // TODO: Implement actual refresh logic, likely via context or state management
    };

    // Determine if bulk actions should be disabled
    const bulkDisabled = isLoadingAccounts || accountError || !accounts || accounts.length === 0;
    const bulkTitle = isLoadingAccounts ? "Loading accounts..."
                    : accountError ? accountError
                    : (!accounts || accounts.length === 0) ? "Add an account first"
                    : "Bulk upload positions";


    return (
        // Use pb-[height_of_mobile_bar] on the main layout container in _app.js or layout file
        // if the fixed mobile bar overlaps content at the bottom of the page.
        // The height here is py-3 * 2 + h-6 icon + mb-1 = roughly 55-60px? Measure button height. Let's estimate pb-16 needed on main content.
        <div className="sticky top-0 z-40">
            {/* Main Navbar */}
            <nav className={`${scrolledDown ? 'bg-gray-900/95 shadow-lg' : 'bg-gradient-to-r from-gray-900 to-blue-900'} transition-all duration-300`}>
                <div className="container mx-auto px-4">
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

                        {/* Center: Quick Actions and Toggle */}
                        <div className="hidden md:flex items-center space-x-4">
                            <div className="flex items-center">
                                {isQuickActionsOpen && (
                                    <div className="flex space-x-4 items-center"> {/* Added items-center */}
                                        <AddAccountButton
                                            onAccountAdded={loadAccounts}
                                            className="flex items-center text-white py-1 px-4 transition-colors group" // Ensure consistent styling
                                        />
                                        <AddPositionButton
                                            onPositionAdded={placeholderFetchPositions} // Example: Trigger position refresh
                                            className="flex items-center text-white py-1 px-4 transition-colors group" // Ensure consistent styling
                                        />
                                        {/* Updated Bulk Button Call */}
                                        <BulkPositionButton
                                            accounts={accounts}
                                            fetchAccounts={loadAccounts}
                                            fetchPositions={placeholderFetchPositions}
                                            fetchPortfolioSummary={placeholderFetchPortfolioSummary}
                                            className="flex items-center text-white py-1 px-4 transition-colors group" // Basic styling
                                            buttonIcon={
                                                isLoadingAccounts ? <Loader2 className="w-6 h-6 mr-2 text-white animate-spin" />
                                                : accountError ? <AlertCircle className="w-6 h-6 mr-2 text-red-400" />
                                                : <Upload className="w-6 h-6 mr-2 text-white group-hover:text-blue-300" />
                                            }
                                            buttonText={
                                               <span className={`text-sm ${accountError ? 'text-red-300' : 'text-gray-200 group-hover:text-white'}`}>Bulk Upload</span>
                                            }
                                            disabled={bulkDisabled}
                                            title={bulkTitle}
                                        />
                                         {/* Loading/Error indicator for accounts (subtle alternative) */}
                                         {/* {isLoadingAccounts && <Loader2 className="w-5 h-5 text-blue-300 animate-spin ml-2" />} */}
                                         {/* {accountError && <AlertCircle className="w-5 h-5 text-red-400 ml-2" title={accountError} />} */}
                                    </div>
                                )}
                                <button
                                    onClick={() => setIsQuickActionsOpen(!isQuickActionsOpen)}
                                    className="text-white p-2 hover:bg-blue-800/30 rounded-lg transition-colors ml-2" // Added ml-2 for spacing
                                >
                                    {isQuickActionsOpen ? <ChevronLeft className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>

                        {/* Right: Market Update Status, Notifications, and Profile */}
                        <div className="hidden md:flex items-center space-x-4">
                            {/* Market Update Status */}
                            <div className="bg-green-800/80 px-4 py-1.5 rounded-full flex items-center text-green-100">
                                <UpdateStatusIndicator /> {/* Assumes this component shows actual status */}
                                <span className="ml-2 text-sm">Prices up to date</span> {/* TODO: Make dynamic */}
                            </div>

                            {/* Notifications */}
                            <div className="relative notification-dropdown">
                                 {/* Added class for click outside detection */}
                                <button
                                    className="text-gray-300 hover:text-white relative p-1 rounded-full hover:bg-gray-800/50 transition-colors notification-button"
                                    onClick={() => setShowNotifications(!showNotifications)}
                                    aria-haspopup="true"
                                    aria-expanded={showNotifications}
                                >
                                    <Bell className="w-6 h-6" />
                                    {unreadNotifications > 0 && (
                                        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                                            {unreadNotifications} {/* TODO: Make dynamic */}
                                        </span>
                                    )}
                                </button>
                                {showNotifications && (
                                     // Dropdown Content (no changes from previous)
                                    <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl overflow-hidden z-20">
                                         {/* ... header ... */}
                                         {/* ... list ... */}
                                         {/* ... footer link ... */}
                                         <div className="bg-gradient-to-r from-blue-700 to-blue-600 p-3 text-white border-b border-blue-500">
                                            <div className="flex justify-between items-center">
                                                <h3 className="font-medium">Notifications</h3>
                                                {/* TODO: Implement mark as read */}
                                                <button className="text-blue-200 hover:text-white text-xs">Mark all as read</button>
                                            </div>
                                        </div>
                                        <div className="max-h-96 overflow-y-auto">
                                            {/* TODO: Replace with real notification data */}
                                            {notifications.map(notification => (
                                                <div
                                                    key={notification.id}
                                                    className={`p-3 border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer ${notification.isNew ? 'bg-blue-50' : ''}`}
                                                    // TODO: Add onClick to navigate or mark as read
                                                >
                                                    <div className="flex justify-between">
                                                        <h4 className="font-medium text-gray-900">{notification.title}</h4>
                                                        <span className="text-xs text-gray-500">{notification.time}</span>
                                                    </div>
                                                    <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
                                                </div>
                                            ))}
                                             {notifications.length === 0 && (
                                                <p className="p-4 text-sm text-gray-500 text-center">No new notifications</p>
                                            )}
                                        </div>
                                        <div className="p-2 text-center bg-gray-50 border-t border-gray-100">
                                            <Link
                                                 href="/notifications"
                                                 onClick={() => setShowNotifications(false)}
                                                 className="text-sm text-blue-600 hover:text-blue-800"
                                             >
                                                View all notifications
                                            </Link>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* User Dropdown */}
                            {user ? (
                                <div className="relative user-dropdown">
                                    {/* Added class for click outside detection */}
                                    <button
                                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                        className="flex items-center space-x-2 hover:bg-blue-800/30 p-2 rounded-lg transition-colors text-white user-dropdown-button"
                                        aria-expanded={isDropdownOpen}
                                        aria-haspopup="true"
                                    >
                                        <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white">
                                            {getInitials()}
                                        </div>
                                        <span className="text-sm font-medium">{displayName}</span>
                                         {/* Add loading/error indicator near profile */}
                                         {isLoadingAccounts && <Loader2 className="w-5 h-5 text-blue-300 animate-spin ml-2" />}
                                         {accountError && <AlertCircle className="w-5 h-5 text-red-400 ml-2" title={accountError} />}
                                    </button>
                                    {isDropdownOpen && (
                                        // Dropdown Content (added onClick handlers to close)
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
                                                            onClick={() => { item.action(); setIsDropdownOpen(false); }} // Close dropdown
                                                            className={`flex w-full items-center px-4 py-3 hover:bg-gray-100 transition-colors text-left text-gray-800 ${item.className || ''}`}
                                                        >
                                                            {item.icon}
                                                            {item.label}
                                                        </button>
                                                    ) : (
                                                        <Link
                                                            key={index}
                                                            href={item.href}
                                                            onClick={() => setIsDropdownOpen(false)} // Close dropdown
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
                            ) : (
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

                        {/* Mobile Menu Button */}
                        <button
                            className="md:hidden text-white focus:outline-none"
                            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                            aria-label="Toggle menu" // Added aria-label
                        >
                            {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                        </button>
                    </div>
                </div>
            </nav>

            {/* Mobile Menu */}
            {isMobileMenuOpen && (
                 <div className="md:hidden bg-gray-900 text-white">
                    {/* ... (Mobile menu content - no changes from previous) ... */}
                     <div className="p-4 space-y-3">
                         {/* ... header ... */}
                         {/* ... list ... */}
                         {user ? (
                            <>
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
                                     {/* Optional: Add loading/error indicator in mobile menu header */}
                                     {isLoadingAccounts && <Loader2 className="w-5 h-5 text-blue-300 animate-spin" />}
                                     {accountError && <AlertCircle className="w-5 h-5 text-red-400" title={accountError} />}
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
                            </>
                         ) : (
                            <div className="space-y-2">
                                <Link 
                                    href="/login" 
                                    className="block w-full text-center p-3 text-gray-300 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
                                    onClick={() => setIsMobileMenuOpen(false)}
                                >
                                    Login
                                </Link>
                                <Link
                                    href="/signup"
                                    className="block w-full text-center p-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-lg transition-colors shadow-md hover:shadow-lg"
                                    onClick={() => setIsMobileMenuOpen(false)}
                                >
                                    Sign up
                                </Link>
                            </div>
                         )}
                     </div>
                 </div>
            )}

            {/* Mobile Quick Actions Bar (Fixed) - Only show when user is authenticated */}
            {user && (
                <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-blue-900 border-t border-blue-800 shadow-lg">
                    <div className="grid grid-cols-3 text-center">
                        {/* Pass className for consistent mobile styling */}
                        <AddAccountButton
                            className="flex flex-col items-center justify-center py-3 text-white group w-full hover:bg-blue-800 transition-colors"
                            onAccountAdded={loadAccounts}
                            // Assuming internal icon/text rendering suitable for mobile
                        />
                        <AddPositionButton
                            className="flex flex-col items-center justify-center py-3 text-white group w-full hover:bg-blue-800 transition-colors"
                            onPositionAdded={placeholderFetchPositions}
                            // Assuming internal icon/text rendering suitable for mobile
                         />
                        {/* Updated Bulk Button call for mobile */}
                        <BulkPositionButton
                            accounts={accounts}
                            fetchAccounts={loadAccounts}
                            fetchPositions={placeholderFetchPositions}
                            fetchPortfolioSummary={placeholderFetchPortfolioSummary}
                            className="flex flex-col items-center justify-center py-3 text-white group w-full hover:bg-blue-800 transition-colors"
                             // Pass simplified/different props if needed for mobile rendering, or assume internal rendering handles it
                             buttonIcon={ // Example: Assuming BulkPositionButton uses these props
                                 isLoadingAccounts ? <Loader2 className="h-6 w-6 mb-1 text-white animate-spin" />
                                 : accountError ? <AlertCircle className="h-6 w-6 mb-1 text-red-400" />
                                 : <Upload className="h-6 w-6 mb-1 text-white group-hover:text-blue-300" />
                             }
                             buttonText={ // Example: Assuming BulkPositionButton uses these props
                                 <span className={`text-xs ${accountError ? 'text-red-300' : 'text-gray-200 group-hover:text-white'}`}>Bulk Upload</span>
                             }
                             disabled={bulkDisabled}
                             title={bulkTitle} // Title helps accessibility on mobile too
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

export default Navbar;