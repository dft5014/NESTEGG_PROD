// nestegg/frontend/pages/test123.js
import React from 'react';
import TestSecurityTableAccount from '@/components/tables/TestSecurityTableAccount'; // Import the TEST security table
import TestCryptoTable from '@/components/tables/TestCryptoTable'; // Import the NEW TEST crypto table
// You might want to wrap this in your standard Layout component if you have one
// import Layout from '@/components/Layout';

export default function Test123Page() {
  return (
    // Optional: Wrap in your app's Layout if needed
    // <Layout>
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-blue-900 text-white p-4 md:p-8">
        <div className="container mx-auto">
          <header className="mb-8">
             <h1 className="text-3xl font-bold">Positions Table Test Page</h1>
             <p className="text-gray-400 mt-2">This page uses isolated components to replicate position tables.</p>
          </header>

          {/* Render the security table component */}
          <div className="mb-12"> {/* Add some margin between tables */}
             <TestSecurityTableAccount />
          </div>

          {/* Render the NEW crypto table component */}
           <div>
             <TestCryptoTable />
           </div>

        </div>
      </div>
    // </Layout>
  );
}