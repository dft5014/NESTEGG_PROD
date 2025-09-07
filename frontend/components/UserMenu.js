// components/UserMenu.js
import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User, Settings, LogOut, HelpCircle, Shield, Clock, ChevronDown, Activity
} from 'lucide-react';
import UpdateStatusIndicator from '@/components/UpdateStatusIndicator';

export default function UserMenu({ user, onLogout }) {
  const [isOpen, setIsOpen] = useState(false);

  const getInitials = useCallback(() => {
    if (user?.first_name && user?.last_name) {
      return `${user.first_name[0]}${user.last_name[0]}`.toUpperCase();
    } else if (user?.email) {
      return user.email[0].toUpperCase();
    }
    return 'U';
  }, [user]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (isOpen && !e.target.closest('.user-dropdown')) setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const displayName = user?.first_name && user?.last_name
    ? `${user.first_name} ${user.last_name}`
    : user?.email || 'User';

  return (
    <div className="relative user-dropdown">
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => setIsOpen((s) => !s)}
        className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-800/50 transition-all border border-transparent hover:border-gray-700"
      >
        <div className="relative">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold shadow-lg">
            {getInitials()}
          </div>
          <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-gray-900" />
        </div>
        <div className="hidden md:block text-left">
          <p className="text-sm font-medium text-white">{displayName}</p>
          <p className="text-xs text-gray-400">Premium Member</p>
        </div>
        <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown className="w-4 h-4 text-gray-400" />
        </motion.div>
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute right-0 mt-2 w-72 bg-gray-800 rounded-xl shadow-2xl border border-gray-700 overflow-hidden z-50"
          >
            {/* User info header */}
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur flex items-center justify-center text-white font-bold text-lg">
                  {getInitials()}
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-white">{displayName}</p>
                  <p className="text-sm text-blue-100 truncate">{user?.email}</p>
                </div>
              </div>
            </div>

            {/* Market Data Status */}
            <div className="p-4 border-b border-gray-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-green-400" />
                  <span className="text-sm text-gray-300">Market Data</span>
                </div>
                <div className="flex items-center gap-2">
                  <UpdateStatusIndicator />
                  <span className="text-xs text-green-400">Live</span>
                </div>
              </div>
            </div>

            {/* Menu items */}
            <div className="py-2">
              <Link href="/profile">
                <motion.div whileHover={{ x: 4 }} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-700/50 transition-all text-gray-300 hover:text-white">
                  <User className="w-5 h-5" />
                  <span>Profile</span>
                </motion.div>
              </Link>

              <Link href="/admin">
                <motion.div whileHover={{ x: 4 }} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-700/50 transition-all text-gray-300 hover:text-white">
                  <Shield className="w-5 h-5" />
                  <span>Admin Panel</span>
                </motion.div>
              </Link>

              <Link href="/settings">
                <motion.div whileHover={{ x: 4 }} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-700/50 transition-all text-gray-300 hover:text-white">
                  <Settings className="w-5 h-5" />
                  <span>Settings</span>
                </motion.div>
              </Link>

              <Link href="/scheduler">
                <motion.div whileHover={{ x: 4 }} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-700/50 transition-all text-gray-300 hover:text-white">
                  <Clock className="w-5 h-5" />
                  <span>Scheduler</span>
                </motion.div>
              </Link>

              <Link href="/help">
                <motion.div whileHover={{ x: 4 }} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-700/50 transition-all text-gray-300 hover:text-white">
                  <HelpCircle className="w-5 h-5" />
                  <span>Help & Support</span>
                </motion.div>
              </Link>

              <div className="border-t border-gray-700 mt-2 pt-2">
                <motion.button
                  whileHover={{ x: 4 }}
                  onClick={() => {
                    setIsOpen(false);
                    onLogout?.();
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-red-500/10 transition-all text-red-400 hover:text-red-300"
                >
                  <LogOut className="w-5 h-5" />
                  <span>Logout</span>
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
