import "@/styles/globals.css";
import Sidebar from "@/components/sidebar";
import Navbar from "@/components/navbar";
import EggMascot from "@/components/EggMascot";
import { AuthProvider, AuthContext } from "@/context/AuthContext";
import { EggMascotProvider, useEggMascot } from "@/context/EggMascotContext";
import { useRouter } from "next/router";
import { UpdateCheckProvider } from '@/context/UpdateCheckContext';
import { useContext, useEffect } from 'react';

// Main app layout component that checks auth state
function AppLayout({ Component, pageProps }) {
  const router = useRouter();
  const { user, loading } = useContext(AuthContext);
  
  const noAuthRequired = ["/", "/login", "/signup"];
  const hideNavigation = ["/", "/login", "/signup"];

  // Redirect to login if not authenticated and trying to access protected route
  useEffect(() => {
    if (!loading && !user && !noAuthRequired.includes(router.pathname)) {
      router.push('/login');
    }
  }, [user, loading, router, noAuthRequired]);

  // Show loading state while checking authentication
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  // For auth pages, render without checking user
  if (noAuthRequired.includes(router.pathname)) {
    return (
      <div className="flex flex-col min-h-screen">
        <div className="flex flex-1">
          <div className="flex-1 p-6 overflow-auto">
            <Component {...pageProps} />
          </div>
        </div>
      </div>
    );
  }

  // For protected routes, only render if user exists
  if (!user) {
    return null; // Will redirect via useEffect above
  }

  // Render full app with navigation for authenticated users
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <div className="flex flex-1">
        <Sidebar />
        <div className="flex-1 p-6 overflow-auto">
          <Component {...pageProps} />
        </div>
      </div>
      <EggMascotWithState />
    </div>
  );
}

// Main App component with providers
export default function App({ Component, pageProps }) {
  return (
    <AuthProvider>
      <UpdateCheckProvider>
        <EggMascotProvider>
          <AppLayout Component={Component} pageProps={pageProps} />
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