import Head from "next/head";
import { useEffect } from "react";

export default function IsolatedKindeTest() {
  useEffect(() => {
    console.log("Isolated test page loaded - no AuthContext interference");
  }, []);

  const manualKindeRedirect = () => {
    const kindeUrl = `https://nestegg.kinde.com/oauth/authorize?client_id=9e99c4e49f2c41a3b3224db845881adc&redirect_uri=https://nestegg-prod.vercel.app/api/auth/kinde_callback&response_type=code&scope=openid%20profile%20email&state=test123`;
    console.log("Manual redirect to:", kindeUrl);
    window.location.href = kindeUrl;
  };

  return (
    <>
      <Head><title>Isolated Kinde Test</title></Head>
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-gray-900 rounded-lg p-6">
          <h1 className="text-2xl font-bold mb-4">Isolated Test</h1>
          <p className="mb-4 text-gray-400">No AuthContext, no interference</p>
          
          <button
            onClick={manualKindeRedirect}
            className="w-full bg-blue-600 hover:bg-blue-700 px-4 py-3 rounded-lg"
          >
            Manual Kinde Redirect
          </button>
        </div>
      </div>
    </>
  );
}

// Bypass AuthContext by exporting our own layout
IsolatedKindeTest.getLayout = function getLayout(page) {
  return page; // No AuthContext wrapper
};