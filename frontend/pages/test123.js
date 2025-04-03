// pages/test123.js
import React from 'react';
import TestSecurityTableAccount from '@/components/tables/TestSecurityTableAccount';
import TestCryptoTable from '@/components/tables/TestCryptoTable';
import TestMetalsTable from '@/components/tables/TestMetalsTable';
import TestRealEstateTable from '@/components/tables/TestRealEstateTable'; // Import the NEW RE table

export default function Test123Page() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-blue-900 text-white p-4 md:p-8">
      <div className="container mx-auto">
        <header className="mb-8">
           <h1 className="text-3xl font-bold">Positions Table Test Page</h1>
           <p className="text-gray-400 mt-2">Isolated components for testing position tables.</p>
        </header>

        <div className="mb-12"> <TestSecurityTableAccount /> </div>
        <div className="mb-12"> <TestCryptoTable /> </div>
        <div className="mb-12"> <TestMetalsTable /> </div>
        <div> <TestRealEstateTable /> </div> {/* Add the Real Estate Table */}

      </div>
    </div>
  );
}