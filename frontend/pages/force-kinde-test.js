import { useEffect, useState } from 'react';

export default function ForceKindeTest() {
  const [loading, setLoading] = useState(false);
  const [debugInfo, setDebugInfo] = useState('');

  const forceKindeRedirect = (action) => {
    setLoading(true);
    
    // Manually construct the Kinde OAuth URL based on your actual settings
    const kindeBaseUrl = 'https://nestegg.kinde.com';
    const clientId = '45c2efde450c402783a146d939ee4b27';
    const redirectUri = 'https://nestegg-prod.vercel.app/api/auth/kinde_callback';
    
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'openid profile email',
      state: Math.random().toString(36).substring(7),
    });

    // Use the correct Kinde OAuth endpoints
    const endpoint = action === 'register' ? 'register' : 'authorize';
    const authUrl = `${kindeBaseUrl}/oauth/${endpoint}?${params.toString()}`;
    
    setDebugInfo(`Redirecting to: ${authUrl}`);
    console.log(`🚀 Manual redirect to: ${authUrl}`);
    
    // Small delay to see the debug info, then redirect
    setTimeout(() => {
      window.location.href = authUrl;
    }, 1000);
  };

  // Test if we can reach Kinde's domain
  const testKindeConnection = async () => {
    try {
      const response = await fetch('https://nestegg.kinde.com/.well-known/openid_configuration');
      if (response.ok) {
        const data = await response.json();
        setDebugInfo(`✅ Kinde is reachable! Authorization endpoint: ${data.authorization_endpoint}`);
      }
    } catch (error) {
      setDebugInfo(`❌ Cannot reach Kinde: ${error.message}`);
    }
  };

  useEffect(() => {
    testKindeConnection();
  }, []);

  return (
    <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center p-6">
      <div className="w-full max-w-2xl bg-gray-900/70 border border-gray-800 rounded-2xl shadow-xl p-8">
        <h1 className="text-3xl font-bold mb-6 text-center">🔧 Manual Kinde Test</h1>
        
        <p className="text-gray-400 text-center mb-6">
          This bypasses the Next.js SDK completely and manually redirects to Kinde
        </p>

        {/* Debug Info */}
        <div className="mb-6 p-4 bg-gray-800/50 rounded-lg">
          <h3 className="font-semibold mb-2">🐛 Debug Info:</h3>
          <div className="text-sm font-mono text-green-400 whitespace-pre-wrap">
            {debugInfo || 'Testing connection to Kinde...'}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-4">
          <button
            onClick={() => forceKindeRedirect('login')}
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 px-6 py-4 rounded-lg font-semibold text-lg transition-colors"
          >
            {loading ? '🔄 Redirecting in 1 second...' : '🚀 Manual Login Test'}
          </button>

          <button
            onClick={() => forceKindeRedirect('register')}
            disabled={loading}
            className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 px-6 py-4 rounded-lg font-semibold text-lg transition-colors"
          >
            {loading ? '🔄 Redirecting in 1 second...' : '📝 Manual Register Test'}
          </button>
        </div>

        {/* Expected Behavior */}
        <div className="mt-8 p-4 bg-blue-900/20 border border-blue-600/30 rounded-lg">
          <h4 className="font-semibold text-blue-400 mb-2">🎯 Expected Behavior:</h4>
          <ol className="text-sm space-y-1 text-blue-200">
            <li>1. Click a button above</li>
            <li>2. Should redirect to <strong>nestegg.kinde.com</strong></li>
            <li>3. Should show Kinde's actual login/register page</li>
            <li>4. Create account there</li>
            <li>5. Get redirected back to your app</li>
          </ol>
        </div>

        {/* Navigation */}
        <div className="mt-6 flex justify-between text-sm">
          <a href="/kindelogin" className="text-blue-400 hover:underline">
            ← Back to SDK Test
          </a>
          <a href="/kinde-debug" className="text-green-400 hover:underline">
            Debug Page →
          </a>
        </div>

        {/* Current Config Display */}
        <div className="mt-6 p-4 bg-gray-800/30 rounded-lg">
          <h4 className="font-semibold text-gray-400 mb-2">Current Config:</h4>
          <div className="text-xs font-mono space-y-1">
            <div>Domain: https://nestegg.kinde.com</div>
            <div>Client: 45c2ef...4b27</div>
            <div>Callback: https://nestegg-prod.vercel.app/api/auth/kinde_callback</div>
          </div>
        </div>
      </div>
    </div>
  );
}