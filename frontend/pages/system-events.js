import { useState, useEffect, useContext } from 'react';
import Head from 'next/head';
import { AuthContext } from '@/context/AuthContext';
import SystemEvents from '@/components/SystemEvents';

export default function SystemEventsPage() {
  const auth = useContext(AuthContext);
  
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Head>
        <title>System Events - NestEgg</title>
      </Head>
      
      <div className="container mx-auto p-4">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">System Events</h1>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
          {auth.user?.is_admin ? (
            <SystemEvents />
          ) : (
            <div className="flex items-center justify-center h-40">
              <div className="text-center">
                <div className="text-4xl mb-2">🔒</div>
                <h3 className="text-lg font-medium">Admin Access Required</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  You need administrator privileges to view system events
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}