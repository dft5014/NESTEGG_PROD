// nestegg/frontend/pages/test123.js
import React from 'react';
import TestSecurityTableAccount from '@/components/tables/TestSecurityTableAccount'; // Import the new TEST table component
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
             <p className="text-gray-400 mt-2">This page uses isolated components (`TestSecurityTableAccount`, `testPositionMethods`) to replicate the positions table.</p>
          </header>

          {/* Render the new, self-contained table component */}
          <TestSecurityTableAccount />

        </div>
      </div>
    // </Layout>
  );
}