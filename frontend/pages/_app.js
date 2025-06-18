import "@/styles/globals.css";
import Sidebar from "@/components/sidebar";
import Navbar from "@/components/navbar";
import EggMascot from "@/components/EggMascot";
import { AuthProvider } from "@/context/AuthContext";
import { EggMascotProvider, useEggMascot } from "@/context/EggMascotContext";
import { useRouter } from "next/router";
import { UpdateCheckProvider } from '@/context/UpdateCheckContext';
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
        <EggMascotProvider>
          <div className="flex flex-col min-h-screen">
            {!hideNavigation.includes(router.pathname) && mounted && <Navbar />}
            <div className="flex flex-1">
              {!hideNavigation.includes(router.pathname) && mounted && <Sidebar />}
              <div className="flex-1 p-6 overflow-auto">
                <Component {...pageProps} />
              </div>
            </div>
            {!hideNavigation.includes(router.pathname) && mounted && <EggMascotWithState />}
          </div>
        </EggMascotProvider>
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