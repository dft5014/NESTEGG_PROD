// pages/accounts.js
import React from 'react';
import Layout from '@/components/layout';
import UnifiedAccountTable2 from '@/components/tables/UnifiedAccountTable2';
import { useAccounts } from '@/store/hooks/useAccounts';

const AccountsPage = () => {
  // Get the refresh function from the DataStore
  const { refresh } = useAccounts();

  return (
    <Layout>
      <div className="min-h-screen bg-gray-900">
        <div className="container mx-auto px-4 py-8">
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">Accounts</h1>
            <p className="text-gray-400">Manage and monitor all your investment accounts</p>
          </div>

          {/* UnifiedAccountTable2 Component 
              This component already connects to the DataStore via useAccounts hook */}
          <div className="bg-gray-800 rounded-xl shadow-lg">
            <UnifiedAccountTable2 
              title="Your Accounts"
              initialSort="value-high"
              onDataChanged={refresh}
            />
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default AccountsPage;