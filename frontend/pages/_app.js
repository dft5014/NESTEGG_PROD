// In _app.js
import { useState, useEffect } from 'react';
import "@/styles/globals.css";
import Sidebar from "@/components/sidebar";
import Navbar from "@/components/navbar";
import EggMascot from "@/components/EggMascot";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { EggMascotProvider, useEggMascot } from "@/context/EggMascotContext";
import { useRouter } from "next/router";
import { UpdateCheckProvider } from '@/context/UpdateCheckContext';
import { fetchAccounts } from '@/utils/apimethods/accountMethods';

// Create a wrapper component that provides data to the Navbar
const NavbarWithData = () => {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState([]);
  
  useEffect(() => {
    if (user) {
      loadAccounts();
    }
  }, [user]);
  
  const loadAccounts = async () => {
    try {
      const accountsData = await fetchAccounts();
      setAccounts(accountsData);
    } catch (error) {
      console.error("Error loading accounts for navbar:", error);
    }
  };
  
  const fetchPositions = async (accountId) => {
    // Implement as needed
    console.log(`Fetching positions for account ${accountId}`);
  };
  
  const fetchPortfolioSummary = async () => {
    // Implement as needed
    console.log("Fetching portfolio summary");
  };
  
  return (
    <Navbar 
      accounts={accounts}
      fetchAccounts={loadAccounts}
      fetchPositions={fetchPositions}
      fetchPortfolioSummary={fetchPortfolioSummary}
    />
  );
};

export default function App({ Component, pageProps }) {
  const router = useRouter();
  const noAuthRequired = ["/login", "/signup"];
  const hideNavigation = ["/login", "/signup"];

  return (
    <AuthProvider>
      <UpdateCheckProvider>
        <EggMascotProvider>
          <div className="flex flex-col min-h-screen">
            {!hideNavigation.includes(router.pathname) && <NavbarWithData />}
            <div className="flex flex-1">
              {!hideNavigation.includes(router.pathname) && <Sidebar />}
              <div className="flex-1 p-6 overflow-auto">
                <Component {...pageProps} />
              </div>
            </div>
            {!hideNavigation.includes(router.pathname) && <EggMascotWithState />}
          </div>
        </EggMascotProvider>
      </UpdateCheckProvider>
    </AuthProvider>
  );
}

// A wrapper component that connects the EggMascot to the context
function EggMascotWithState() {
  const { isDoingCartwheel } = useEggMascot();
  return <EggMascot isDoingCartwheel={isDoingCartwheel} />;
}