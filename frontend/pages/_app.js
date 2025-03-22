import "@/styles/globals.css";
import Sidebar from "@/components/sidebar";
import Navbar from "@/components/navbar";
import EggMascot from "@/components/EggMascot"; // Import the new component
import { AuthProvider } from "@/context/AuthContext";
import { EggMascotProvider, useEggMascot } from "@/context/EggMascotContext"; // Import both provider and hook
import { useRouter } from "next/router";

export default function App({ Component, pageProps }) {
  const router = useRouter();
  const noAuthRequired = ["/login", "/signup"];
  const hideNavigation = ["/login", "/signup"];

  return (
    <AuthProvider>
      <EggMascotProvider> {/* Add the EggMascot Provider */}
        <div className="flex flex-col min-h-screen">
          {!hideNavigation.includes(router.pathname) && <Navbar />}
          <div className="flex flex-1">
            {!hideNavigation.includes(router.pathname) && <Sidebar />}
            <div className="flex-1 p-6 overflow-auto">
              <Component {...pageProps} />
            </div>
          </div>
          {!hideNavigation.includes(router.pathname) && <EggMascotWithState />}
        </div>
      </EggMascotProvider>
    </AuthProvider>
  );
}

// A wrapper component that connects the EggMascot to the context
function EggMascotWithState() {
  const { isDoingCartwheel } = useEggMascot();
  return <EggMascot isDoingCartwheel={isDoingCartwheel} />;
}