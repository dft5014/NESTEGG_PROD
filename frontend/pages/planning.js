// pages/accounts.js
import React from 'react';
import Head from 'next/head';
import UnifiedAccountTable2 from '@/components/tables/UnifiedAccountTable2';
import { useAccounts } from '@/store/hooks/useAccounts';

export default function AccountsPage() {
  // Get the refresh function from the DataStore
  const { refresh } = useAccounts();

  return (
    <>
      <Head>
        <title>Accounts - NestEgg</title>
        <meta name="description" content="Manage and monitor all your investment accounts" />
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900">
        <div className="container mx-auto px-4 py-8">
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-white mb-2">Accounts</h1>
            <p className="text-gray-400 text-lg">Manage and monitor all your investment accounts</p>
          </div>

          {/* UnifiedAccountTable2 Component 
              This component already connects to the DataStore via useAccounts hook */}
          <div className="bg-gray-800/70 backdrop-blur-sm rounded-xl shadow-xl">
            <UnifiedAccountTable2 
              title="Your Accounts"
              initialSort="value-high"
              onDataChanged={refresh}
            />
          </div>
        </div>
      </div>
    </>
  );
}