{/* Manual Add - opens modal or navigates to add page */}
                    <button
                        onClick={() => setIsMobileAddModalOpen(true)}
                        className="flex flex-col items-center justify-center py-3 text-white group w-full hover:bg-blue-800 transition-colors"
                    >
                        <PlusCircle className="h-6 w-6 mb-1 text-white group-hover:text-blue-300" />
                        <span className="text-xs text-gray-200 group-hover:text-white">Add</span>
                    </button>
                </div>
            </div>

            {/* Mobile Add Modal */}
            {isMobileAddModalOpen && (
                <div className="md:hidden fixed inset-0 z-50 bg-black bg-opacity-50 flex items-end">
                    <div className="bg-gray-900 w-full rounded-t-2xl p-6 pb-8">
                        <div className="flex justify-between items-center mb-4">
                            <h3// components/Navbar.js
import { useState, useContext, useEffect, useCallback, memo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { QuickStartButton } from '@/components/QuickStartModal';
import { AuthContext } from '@/context/AuthContext';
import {
    User, Settings, LogOut, HelpCircle, ChartLine,
    PlusCircle, Shield, Clock, Menu, X, LineChart, BarChart4,
    ChevronLeft, ChevronRight, ChevronDown, Loader2, AlertCircle,
    Edit3, Trash2, CheckSquare
} from 'lucide-react';
import UpdateStatusIndicator from '@/components/UpdateStatusIndicator';
import AddPositionButton from '@/components/AddPositionButton';
import AddAccountButton from '@/components/AddAccountButton';
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
    const [isManualAddOpen, setIsManualAddOpen] = useState(false);
    const [isMobileAddModalOpen, setIsMobileAddModalOpen] = useState(false);

    const { user, logout } = useContext(AuthContext);
    const router = useRouter();

    // --- Account Fetching State & Logic ---
    const [accounts, setAccounts] = useState([]);
    const [isLoadingAccounts, setIsLoadingAccounts] = useState(false);
    const [accountError, setAccountError] = useState(null);

    const loadAccounts = useCallback(async () => {
        setIsLoadingAccounts(true);
        setAccountError(null);
        try {
            const accountsData = await fetchAccounts();
            setAccounts(accountsData || []);
        } catch (error) {
            console.error("Navbar: Error fetching accounts:", error);
            setAccountError("Failed to load accounts.");
            setAccounts([]);
        } finally {
            setIsLoadingAccounts(false);
        }
    }, []);

    useEffect(() => {
        loadAccounts();
    }, [loadAccounts]);

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
                const userDropdownButton = event.target.closest('.user-dropdown-button');
                if (!userDropdownButton) {
                    setIsDropdownOpen(false);
                }
            }
            
            // Close Manual Add Dropdown
            const manualAddDropdown = event.target.closest('.manual-add-dropdown');
            if (isManualAddOpen && !manualAddDropdown) {
                const manualAddButton = event.target.closest('.manual-add-button');
                if (!manualAddButton) {
                    setIsManualAddOpen(false);
                }
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isDropdownOpen, isManualAddOpen]);

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

    const displayName = user?.first_name && user?.last_name 
        ? `${user.first_name} ${user.last_name}` 
        : user?.email || '';

    const getInitials = useCallback(() => {
        if (user?.first_name && user?.last_name) {
            return `${user.first_name[0]}${user.last_name[0]}`.toUpperCase();
        } else if (user?.email) {
            return user.email[0].toUpperCase();
        }
        return '';
    }, [user]);

    // Placeholder functions
    const placeholderFetchPositions = () => {
        console.warn('Navbar: fetchPositions function is not implemented or passed down.');
    };

    // Quick Edit/Delete button handler (placeholder)
    const handleQuickEdit = () => {
        // TODO: Implement quick edit/delete functionality
        console.log('Quick Edit/Delete clicked');
        router.push('/edit'); // or open a modal
    };

    // Reconciliation button handler
    const handleReconciliation = () => {
        router.push('/AccountReconciliation');
    };

    return (
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
                                    <div className="flex space-x-4 items-center">
                                        {/* Quick Start Button */}
                                        <QuickStartButton className="mr-2" />
                                        
                                        {/* Quick Edit/Delete Button */}
                                        <button
                                            onClick={handleQuickEdit}
                                            className="flex items-center text-white py-1 px-4 hover:bg-blue-800/30 rounded-lg transition-colors group"
                                        >
                                            <Edit3 className="w-5 h-5 mr-2 text-white group-hover:text-blue-300" />
                                            <span className="text-sm text-gray-200 group-hover:text-white">Quick Edit / Delete</span>
                                        </button>
                                        
                                        {/* Reconciliation Button */}
                                        <button
                                            onClick={handleReconciliation}
                                            className="flex items-center text-white py-1 px-4 hover:bg-blue-800/30 rounded-lg transition-colors group"
                                        >
                                            <CheckSquare className="w-5 h-5 mr-2 text-white group-hover:text-blue-300" />
                                            <span className="text-sm text-gray-200 group-hover:text-white">Reconciliation</span>
                                        </button>
                                        
                                        {/* Manual Add Dropdown */}
                                        <div className="relative manual-add-dropdown">
                                            <button
                                                onClick={() => setIsManualAddOpen(!isManualAddOpen)}
                                                className="flex items-center text-white py-1 px-4 hover:bg-blue-800/30 rounded-lg transition-colors group manual-add-button"
                                            >
                                                <PlusCircle className="w-5 h-5 mr-2 text-white group-hover:text-blue-300" />
                                                <span className="text-sm text-gray-200 group-hover:text-white">Manual Add</span>
                                                <ChevronDown className="w-4 h-4 ml-1 text-gray-400" />
                                            </button>
                                            
                                            {isManualAddOpen && (
                                                <div className="absolute top-full mt-2 w-48 bg-gray-900 border border-gray-700 rounded-lg shadow-xl z-20 overflow-hidden">
                                                    <div className="py-1">
                                                        <AddAccountButton
                                                            onAccountAdded={loadAccounts}
                                                            className="flex items-center w-full px-4 py-3 hover:bg-blue-800/30 transition-colors text-white hover:text-blue-300"
                                                            onClick={() => setIsManualAddOpen(false)}
                                                        />
                                                        <AddPositionButton
                                                            onPositionAdded={placeholderFetchPositions}
                                                            className="flex items-center w-full px-4 py-3 hover:bg-blue-800/30 transition-colors text-white hover:text-blue-300"
                                                            onClick={() => setIsManualAddOpen(false)}
                                                        />
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                                <button
                                    onClick={() => setIsQuickActionsOpen(!isQuickActionsOpen)}
                                    className="text-white p-2 hover:bg-blue-800/30 rounded-lg transition-colors ml-2"
                                >
                                    {isQuickActionsOpen ? <ChevronLeft className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>

                        {/* Right: Market Update Status and Profile */}
                        <div className="hidden md:flex items-center space-x-4">
                            {/* Market Update Status */}
                            <div className="bg-green-800/80 px-4 py-1.5 rounded-full flex items-center text-green-100">
                                <UpdateStatusIndicator />
                                <span className="ml-2 text-sm">Prices up to date</span>
                            </div>

                            {/* User Dropdown */}
                            <div className="relative user-dropdown">
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
                                    {isLoadingAccounts && <Loader2 className="w-5 h-5 text-blue-300 animate-spin ml-2" />}
                                    {accountError && <AlertCircle className="w-5 h-5 text-red-400 ml-2" title={accountError} />}
                                </button>
                                {isDropdownOpen && (
                                    <div className="absolute right-0 mt-2 w-60 bg-white rounded-lg shadow-xl z-20 overflow-hidden">
                                        <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-4">
                                            <p className="font-medium text-lg text-white">{displayName}</p>
                                            <p className="text-sm text-blue-100 truncate">{user?.email || ''}</p>
                                        </div>
                                        <div className="py-1">
                                            {dropdownItems.map((item, index) => (
                                                item.action ? (
                                                    <button
                                                        key={index}
                                                        onClick={() => { item.action(); setIsDropdownOpen(false); }}
                                                        className={`flex w-full items-center px-4 py-3 hover:bg-gray-100 transition-colors text-left text-gray-800 ${item.className || ''}`}
                                                    >
                                                        {item.icon}
                                                        {item.label}
                                                    </button>
                                                ) : (
                                                    <Link
                                                        key={index}
                                                        href={item.href}
                                                        onClick={() => setIsDropdownOpen(false)}
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

                        {/* Mobile Menu Button */}
                        <button
                            className="md:hidden text-white focus:outline-none"
                            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                            aria-label="Toggle menu"
                        >
                            {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                        </button>
                    </div>
                </div>
            </nav>

            {/* Mobile Menu */}
            {isMobileMenuOpen && (
                <div className="md:hidden bg-gray-900 text-white">
                    <div className="p-4 space-y-3">
                        <div className="flex items-center justify-between border-b border-gray-800 pb-3">
                            <div className="flex items-center">
                                <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center text-white mr-3">
                                    {getInitials()}
                                </div>
                                <div>
                                    <div className="font-medium">{displayName}</div>
                                                                                <div className="text-xs text-gray-400">{user?.email || ''}</div>
                                </div>
                            </div>
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
                    </div>
                </div>
            )}

            {/* Mobile Quick Actions Bar (Fixed) */}
            <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-blue-900 border-t border-blue-800 shadow-lg">
                <div className="grid grid-cols-4 text-center">
                    {/* Quick Start */}
                    <QuickStartButton 
                        className="flex flex-col items-center justify-center py-3 text-white group w-full hover:bg-blue-800 transition-colors"
                        mobileView={true}
                    />
                    
                    {/* Quick Edit/Delete */}
                    <button
                        onClick={handleQuickEdit}
                        className="flex flex-col items-center justify-center py-3 text-white group w-full hover:bg-blue-800 transition-colors"
                    >
                        <Edit3 className="h-6 w-6 mb-1 text-white group-hover:text-blue-300" />
                        <span className="text-xs text-gray-200 group-hover:text-white">Edit</span>
                    </button>
                    
                    {/* Reconciliation */}
                    <button
                        onClick={handleReconciliation}
                        className="flex flex-col items-center justify-center py-3 text-white group w-full hover:bg-blue-800 transition-colors"
                    >
                        <CheckSquare className="h-6 w-6 mb-1 text-white group-hover:text-blue-300" />
                        <span className="text-xs text-gray-200 group-hover:text-white">Reconcile</span>
                    </button>
                    
                    {/* Manual Add - opens modal */}
                    <button
                        onClick={() => setIsMobileAddModalOpen(true)}
                        className="flex flex-col items-center justify-center py-3 text-white group w-full hover:bg-blue-800 transition-colors"
                    >
                        <PlusCircle className="h-6 w-6 mb-1 text-white group-hover:text-blue-300" />
                        <span className="text-xs text-gray-200 group-hover:text-white">Add</span>
                    </button>
                </div>
            </div>

            {/* Mobile Add Modal */}
            {isMobileAddModalOpen && (
                <div className="md:hidden fixed inset-0 z-50 bg-black bg-opacity-50 flex items-end">
                    <div className="bg-gray-900 w-full rounded-t-2xl p-6 pb-8">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-semibold text-white">Add New</h3>
                            <button
                                onClick={() => setIsMobileAddModalOpen(false)}
                                className="text-gray-400 hover:text-white"
                            >
                                <X className="h-6 w-6" />
                            </button>
                        </div>
                        <div className="space-y-3">
                            <AddAccountButton
                                onAccountAdded={() => {
                                    loadAccounts();
                                    setIsMobileAddModalOpen(false);
                                }}
                                className="flex items-center w-full px-4 py-3 bg-blue-800/30 hover:bg-blue-800/50 rounded-lg transition-colors text-white"
                            />
                            <AddPositionButton
                                onPositionAdded={() => {
                                    placeholderFetchPositions();
                                    setIsMobileAddModalOpen(false);
                                }}
                                className="flex items-center w-full px-4 py-3 bg-blue-800/30 hover:bg-blue-800/50 rounded-lg transition-colors text-white"
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Navbar;