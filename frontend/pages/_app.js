// pages/_app.js
import "@/styles/globals.css";
import Sidebar from "@/components/sidebar";
import Navbar from "@/components/navbar";
import EggMascot from "@/components/EggMascot";
import { AuthProvider } from "@/context/AuthContext";
import { EggMascotProvider, useEggMascot } from "@/context/EggMascotContext";
import { useRouter } from "next/router";
import { UpdateCheckProvider } from "@/context/UpdateCheckContext";
import { DataStoreProvider } from "@/store/DataStore";
import { useState, useEffect, createContext, useContext } from "react";
import { ClerkProvider } from "@clerk/nextjs";

const CLERK_PK = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

const SidebarContext = createContext();
export const useSidebar = () => useContext(SidebarContext);

function LayoutWrapper({ children }) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);

  const hideNavigation = ["/", "/login", "/signup"];

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleResize = () => {
      // (You set true in both branches previously; keeping same behavior)
      setSidebarCollapsed(true);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <SidebarContext.Provider value={{ sidebarCollapsed, setSidebarCollapsed }}>
      <div className="min-h-screen bg-gray-950">
        {!hideNavigation.includes(router.pathname) && mounted && (
          <>
            <Sidebar />
            <div
              className="fixed top-0 right-0 z-40 transition-all duration-300"
              style={{ left: sidebarCollapsed ? "80px" : "256px" }}
            >
              <Navbar />
            </div>
          </>
        )}

        <div
          className={`min-h-screen transition-all duration-300 ${
            !hideNavigation.includes(router.pathname) && mounted ? "pt-24" : ""
          }`}
          style={{
            paddingLeft:
              !hideNavigation.includes(router.pathname) && mounted
                ? sidebarCollapsed
                  ? "80px"
                  : "256px"
                : "0",
          }}
        >
          {children}
        </div>

        {!hideNavigation.includes(router.pathname) && mounted && <EggMascotWithState />}
      </div>
    </SidebarContext.Provider>
  );
}

export default function App({ Component, pageProps }) {
  return (
    <ClerkProvider publishableKey={CLERK_PK} appearance={{ baseTheme: "dark" }}>
      <AuthProvider>
        <UpdateCheckProvider>
          <DataStoreProvider>
            <EggMascotProvider>
              <LayoutWrapper>
                <Component {...pageProps} />
              </LayoutWrapper>
            </EggMascotProvider>
          </DataStoreProvider>
        </UpdateCheckProvider>
      </AuthProvider>
    </ClerkProvider>
  );
}

function EggMascotWithState() {
  const { isDoingCartwheel } = useEggMascot();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return <EggMascot isDoingCartwheel={isDoingCartwheel} />;
}
