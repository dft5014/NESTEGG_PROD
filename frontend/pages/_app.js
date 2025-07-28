// pages/_app.js
import "@/styles/globals.css";
import Sidebar from "@/components/sidebar";
import Navbar from "@/components/navbar";
import EggMascot from "@/components/EggMascot";
import { AuthProvider } from "@/context/AuthContext";
import { EggMascotProvider, useEggMascot } from "@/context/EggMascotContext";
import { useRouter } from "next/router";
import { UpdateCheckProvider } from '@/context/UpdateCheckContext';
import { DataStoreProvider } from '@/store/DataStore'; 
import { useState, useEffect } from 'react';

export default function App({ Component, pageProps }) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(80); // Track sidebar width
  
  const noAuthRequired = ["/", "/login", "/signup"];
  const hideNavigation = ["/", "/login", "/signup"];

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <AuthProvider>
      <UpdateCheckProvider>
        <DataStoreProvider> 
          <EggMascotProvider>
            <div className="min-h-screen bg-gray-950">
              {/* Navigation Components */}
              {!hideNavigation.includes(router.pathname) && mounted && (
                <>
                  <Sidebar />
                  {/* Navbar with dynamic margin */}
                  <div className={`fixed top-0 right-0 left-20 z-40 transition-all duration-300`}>
                    <Navbar />
                  </div>
                </>
              )}
              
              {/* Main Content Area with dynamic margins */}
              <div className={`
                ${!hideNavigation.includes(router.pathname) && mounted 
                  ? 'pt-24 pl-20 transition-all duration-300' 
                  : ''
                }
              `}>
                <Component {...pageProps} />
              </div>
              
              {/* Egg Mascot */}
              {!hideNavigation.includes(router.pathname) && mounted && <EggMascotWithState />}
            </div>
          </EggMascotProvider>
        </DataStoreProvider> 
      </UpdateCheckProvider>
    </AuthProvider>
  );
}

// A wrapper component that connects the EggMascot to the context
function EggMascotWithState() {
  const { isDoingCartwheel } = useEggMascot();
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);
  
  if (!mounted) return null;
  
  return <EggMascot isDoingCartwheel={isDoingCartwheel} />;
}