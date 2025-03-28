import { useState, useEffect, useContext } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Moon, Sun, Menu, X, ChevronDown, LogOut, User, Settings, LineChart, Bell } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { AuthContext } from '@/context/AuthContext';
import { Badge } from '@/components/ui/badge';
import UpdateStatusIndicator from '@/components/UpdateStatusIndicator';
import { useUpdateCheck } from '@/context/UpdateCheckContext';

export function Navbar() {
  const { setTheme, theme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const router = useRouter();
  const auth = useContext(AuthContext);
  const { updateStatus } = useUpdateCheck();
  
  // Show the navbar only once mounted to avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);
  
  if (!mounted) return null;
  
  const isActive = (path) => {
    return router.pathname === path ? 
      'text-primary font-medium' : 
      'text-gray-700 hover:text-primary dark:text-gray-300 dark:hover:text-primary';
  };
  
  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };
  
  const handleLogout = () => {
    auth.logout();
  };
  
  return (
    <nav className="sticky top-0 z-50 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo and primary nav */}
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <Link href="/dashboard" className="flex items-center">
                <span className="text-xl font-bold text-primary">NestEgg</span>
              </Link>
            </div>
            
            {/* Desktop navigation */}
            {auth.user && (
              <div className="hidden sm:ml-6 sm:flex sm:space-x-4 sm:items-center">
                <Link 
                  href="/dashboard" 
                  className={`px-3 py-2 text-sm ${isActive('/dashboard')}`}
                >
                  Dashboard
                </Link>
                <Link 
                  href="/accounts" 
                  className={`px-3 py-2 text-sm ${isActive('/accounts')}`}
                >
                  Accounts
                </Link>
                <Link 
                  href="/positions" 
                  className={`px-3 py-2 text-sm ${isActive('/positions')}`}
                >
                  Positions
                </Link>
                <Link 
                  href="/securities" 
                  className={`px-3 py-2 text-sm ${isActive('/securities')}`}
                >
                  Securities
                </Link>
                <Link 
                  href="/history" 
                  className={`px-3 py-2 text-sm ${isActive('/history')}`}
                >
                  History
                </Link>
                {auth.user?.is_admin && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="px-3 py-2 text-sm flex items-center space-x-1">
                        <span>Admin</span>
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link href="/scheduler" className="flex items-center">
                          <Settings className="mr-2 h-4 w-4" />
                          <span>Scheduler</span>
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href="/system-events" className="flex items-center">
                          <Bell className="mr-2 h-4 w-4" />
                          <span>System Events</span>
                        </Link>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            )}
          </div>
          
          {/* Secondary nav - user menu, theme, etc. */}
          <div className="flex items-center">
            {mounted && updateStatus && (
              <div className="mr-2">
                <UpdateStatusIndicator />
              </div>
            )}
            
            <Button
              variant="ghost"
              size="icon"
              aria-label="Toggle theme"
              className="mr-2"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            >
              {theme === 'dark' ? (
                <Sun className="h-5 w-5" />
              ) : (
                <Moon className="h-5 w-5" />
              )}
            </Button>
            
            {auth.user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="flex items-center space-x-1">
                    <span className="hidden md:inline-block">{auth.user.email}</span>
                    <User className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>My Account</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/profile" className="flex items-center">
                      <User className="mr-2 h-4 w-4" />
                      <span>Profile</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/settings" className="flex items-center">
                      <Settings className="mr-2 h-4 w-4" />
                      <span>Settings</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="flex items-center">
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Logout</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button variant="default" size="sm" asChild>
                <Link href="/login">Sign In</Link>
              </Button>
            )}
            
            {/* Mobile menu button */}
            <div className="flex items-center sm:hidden ml-2">
              <Button
                variant="ghost"
                size="icon"
                aria-label="Open mobile menu"
                onClick={toggleMobileMenu}
              >
                {mobileMenuOpen ? (
                  <X className="h-5 w-5" />
                ) : (
                  <Menu className="h-5 w-5" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Mobile menu */}
      {mobileMenuOpen && auth.user && (
        <div className="sm:hidden">
          <div className="pt-2 pb-3 space-y-1 px-4">
            <Link
              href="/dashboard"
              className={`block px-3 py-2 rounded-md text-base font-medium ${
                router.pathname === '/dashboard'
                  ? 'bg-primary text-white'
                  : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
              }`}
              onClick={toggleMobileMenu}
            >
              Dashboard
            </Link>
            <Link
              href="/accounts"
              className={`block px-3 py-2 rounded-md text-base font-medium ${
                router.pathname === '/accounts'
                  ? 'bg-primary text-white'
                  : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
              }`}
              onClick={toggleMobileMenu}
            >
              Accounts
            </Link>
            <Link
              href="/positions"
              className={`block px-3 py-2 rounded-md text-base font-medium ${
                router.pathname === '/positions'
                  ? 'bg-primary text-white'
                  : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
              }`}
              onClick={toggleMobileMenu}
            >
              Positions
            </Link>
            <Link
              href="/securities"
              className={`block px-3 py-2 rounded-md text-base font-medium ${
                router.pathname === '/securities'
                  ? 'bg-primary text-white'
                  : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
              }`}
              onClick={toggleMobileMenu}
            >
              Securities
            </Link>
            <Link
              href="/history"
              className={`block px-3 py-2 rounded-md text-base font-medium ${
                router.pathname === '/history'
                  ? 'bg-primary text-white'
                  : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
              }`}
              onClick={toggleMobileMenu}
            >
              History
            </Link>
            {auth.user?.is_admin && (
              <>
                <Link
                  href="/scheduler"
                  className={`block px-3 py-2 rounded-md text-base font-medium ${
                    router.pathname === '/scheduler'
                      ? 'bg-primary text-white'
                      : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
                  }`}
                  onClick={toggleMobileMenu}
                >
                  Scheduler
                </Link>
                <Link
                  href="/system-events"
                  className={`block px-3 py-2 rounded-md text-base font-medium ${
                    router.pathname === '/system-events'
                      ? 'bg-primary text-white'
                      : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
                  }`}
                  onClick={toggleMobileMenu}
                >
                  System Events
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}