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
            <div className="flex flex-col min-h-screen bg-gray-950">
              {/* Navigation Components - Sidebar overlays Navbar */}
              {!hideNavigation.includes(router.pathname) && mounted && (
                <>
                  <Sidebar />
                  <Navbar />
                </>
              )}
              
              {/* Main Content Area */}
              <div className={`flex-1 ${!hideNavigation.includes(router.pathname) && mounted ? 'mt-24' : ''}`}>
                {/* mt-24 accounts for navbar (64px) + ticker (32px) = 96px ≈ 24 tailwind units */}
                <div className="min-h-full">
                  <Component {...pageProps} />
                </div>
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