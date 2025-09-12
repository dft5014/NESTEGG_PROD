// pages/_app.js
import "@/styles/globals.css";
import Sidebar from "@/components/sidebar";
import Navbar from "@/components/navbar";
import EggMascot from "@/components/EggMascot";

import { AuthProvider, AuthContext } from "@/context/AuthContext";
import { EggMascotProvider, useEggMascot } from "@/context/EggMascotContext";
import { UpdateCheckProvider } from "@/context/UpdateCheckContext";
import { DataStoreProvider } from "@/store/DataStore";

import { ClerkProvider, useAuth } from "@clerk/nextjs";
import { dark } from "@clerk/themes";

import { useRouter } from "next/router";
import React, { useState, useEffect, createContext, useContext } from "react";

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

// Runs under ClerkProvider + AuthProvider so hooks have providers.
function DataStoreWithSessionKey({ children }) {
  const { clerkUser } = useContext(AuthContext);
  const { sessionId, isSignedIn } = useAuth();
  const key = isSignedIn ? (sessionId || clerkUser?.id || "clerk") : "anon";
  return <DataStoreProvider key={`ds:${key}`}>{children}</DataStoreProvider>;
}

export default function App({ Component, pageProps }) {
  return (
    <ClerkProvider
      publishableKey={CLERK_PK}
      appearance={{
        baseTheme: dark,
        variables: {
          colorPrimary: "#3b82f6",
          colorBackground: "#0f172a",
          colorInputBackground: "#1e293b",
          colorInputText: "#f1f5f9",
          colorText: "#f1f5f9",
          colorTextSecondary: "#94a3b8",
          colorShimmer: "#374151",
          colorSuccess: "#10b981",
          colorWarning: "#f59e0b",
          colorDanger: "#ef4444",
          borderRadius: "0.5rem",
          fontFamily: "inherit",
        },
        elements: {
          formButtonPrimary:
            "bg-blue-600 hover:bg-blue-700 text-white transition-colors text-base px-6 py-3",
          card:
            "bg-gray-900/70 backdrop-blur-sm border-gray-800 shadow-xl min-w-[400px] p-8",
          headerTitle: "text-gray-100 text-2xl font-bold",
          headerSubtitle: "text-gray-400 text-base",
          socialButtonsBlockButton:
            "bg-gray-800 border-gray-700 text-gray-100 hover:bg-gray-700 transition-colors",
          formFieldInput:
            "bg-gray-800 border-gray-600 text-gray-100 focus:border-blue-500 focus:ring-blue-500/20 text-base py-3 px-4",
          formFieldLabel: "text-gray-300 text-base font-medium",
          footerActionLink: "text-blue-400 hover:text-blue-300 transition-colors",
          userButtonAvatarBox: "w-10 h-10",
          userButtonPopoverCard: "bg-gray-800 border-gray-700 backdrop-blur-sm",
          userButtonPopoverActionButton:
            "text-gray-100 hover:bg-gray-700 transition-colors",
          userButtonPopoverActionButtonIcon: "text-gray-400",
          navbarButton: "text-gray-300 hover:text-gray-100",
          navbarMobileMenuButton: "text-gray-300",
          alertText: "text-gray-100",
          formHeaderTitle: "text-gray-100",
          formHeaderSubtitle: "text-gray-400",
          socialButtonsProviderIcon: "brightness-0 invert",
          dividerLine: "bg-gray-700",
          dividerText: "text-gray-400",
          formFieldSuccessText: "text-green-400",
          formFieldErrorText: "text-red-400",
          formFieldWarningText: "text-yellow-400",
          badge: "bg-blue-600 text-white",
          avatarBox: "border-gray-700",
          userPreviewMainIdentifier: "text-gray-100",
          userPreviewSecondaryIdentifier: "text-gray-400",
        },
      }}
    >
      <AuthProvider>
        <AuthSessionGate>
          <UpdateCheckProvider>
            <DataStoreWithSessionKey>
              <EggMascotProvider>
                <LayoutWrapper>
                  <Component {...pageProps} />
                </LayoutWrapper>
              </EggMascotProvider>
            </DataStoreWithSessionKey>
          </UpdateCheckProvider>
        </AuthSessionGate>
      </AuthProvider>
    </ClerkProvider>
  );
}

function AuthSessionGate({ children }) {
  // Exists so hooks used below are safely under providers.
  return children;
}

function EggMascotWithState() {
  const { isDoingCartwheel } = useEggMascot();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return <EggMascot isDoingCartwheel={isDoingCartwheel} />;
}
