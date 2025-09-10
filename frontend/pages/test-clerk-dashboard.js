// pages/test-clerk-dashboard.js
import { ClerkProvider, useUser, UserButton, useAuth } from "@clerk/nextjs";
import { useState, useEffect } from "react";
import Link from "next/link";
import { 
  CheckCircle, XCircle, User, Shield, Sparkles, Key,
  Loader, Copy, ExternalLink, Crown, Zap, Star,
  CreditCard, ArrowUpRight, Calendar, Settings, Check, AlertCircle
} from 'lucide-react';

// Plan details
const planDetails = {
  free: {
    name: 'Free',
    icon: <Star className="h-5 w-5" />,
    color: 'text-gray-400',
    bgColor: 'bg-gray-500/10',
    features: ['2 accounts', 'Basic tracking', 'Community support']
  },
  pro: {
    name: 'Pro',
    icon: <Zap className="h-5 w-5" />,
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
    features: ['Unlimited accounts', 'Advanced analytics', 'Priority support', 'API access']
  },
  premium: {
    name: 'Premium',
    icon: <Crown className="h-5 w-5" />,
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/10',
    features: ['Everything in Pro', 'AI insights', 'Tax optimization', 'White-glove support']
  }
};

function DashboardContent() {
  const { isLoaded, isSignedIn, user } = useUser();
  const { userId, sessionId, getToken } = useAuth();

  // Clerk session token (raw)
  const [clerkToken, setClerkToken] = useState(null);
  const [clerkTokenError, setClerkTokenError] = useState(null);

  // NestEgg app token (after exchange)
  const [appToken, setAppToken] = useState(null);
  const [appTokenError, setAppTokenError] = useState(null);

  // Quick /user ping result to prove round-trip
  const [userPing, setUserPing] = useState({ ok: null, msg: '' });

  const [copied, setCopied] = useState({ clerk: false, app: false });
  const [showUpgrade, setShowUpgrade] = useState(false);

  // Get user's plan from metadata
  const userPlan = user?.unsafeMetadata?.plan || user?.publicMetadata?.plan || 'free';
  const signupDate = user?.unsafeMetadata?.signupDate || user?.publicMetadata?.signupDate;
  const plan = planDetails[userPlan] || planDetails.free;

  // Clerk → (exchange) → NestEgg JWT
  useEffect(() => {
    const run = async () => {
      if (!isSignedIn || !getToken) return;
      try {
        // 1) Clerk session token
        const cJwt = await getToken();
        setClerkToken(cJwt);

        // 2) Exchange for NestEgg JWT (your backend)
        const base = process.env.NEXT_PUBLIC_API_BASE_URL;
        if (!base) {
          throw new Error("NEXT_PUBLIC_API_BASE_URL is not set");
        }

        const res = await fetch(`${base}/auth/exchange`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ clerk_jwt: cJwt })
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.detail || `Exchange failed (${res.status})`);
        }

        const data = await res.json();
        setAppToken(data.access_token);
        localStorage.setItem("token", data.access_token); // <-- your app already reads this key

        // 3) Prove it works: call /user with our token
        const ures = await fetch(`${base}/user`, {
          headers: { Authorization: `Bearer ${data.access_token}` }
        });

        if (ures.ok) {
          setUserPing({ ok: true, msg: "✓ /user returned 200" });
        } else {
          const errText = await ures.text().catch(() => "");
          setUserPing({ ok: false, msg: `✗ /user ${ures.status} ${errText}` });
        }
      } catch (e) {
        // Split errors between Clerk and exchange for easier debugging
        if (!clerkToken) setClerkTokenError(e.message);
        else setAppTokenError(e.message);
      }
    };
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSignedIn, getToken]);

  const copy = (what) => {
    const val = what === 'clerk' ? clerkToken : appToken;
    if (!val) return;
    navigator.clipboard.writeText(val);
    setCopied(prev => ({ ...prev, [what]: true }));
    setTimeout(() => setCopied(prev => ({ ...prev, [what]: false })), 2000);
  };

  const handleUpgrade = async (newPlan) => {
    try {
      await user.update({
        unsafeMetadata: {
          ...user.unsafeMetadata,
          plan: newPlan,
          planUpdatedAt: new Date().toISOString()
        }
      });
      setShowUpgrade(false);
      alert(`Upgraded to ${newPlan}! (Replace with Clerk billing checkout in prod)`);
    } catch (error) {
      console.error('Error updating plan:', error);
    }
  };

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <Loader className="h-8 w-8 text-blue-500 animate-spin mx-auto mb-4" />
          <div className="text-white">Loading Clerk...</div>
        </div>
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Not Signed In</h1>
          <p className="text-gray-400 mb-4">Please sign in to test Clerk</p>
          <Link href="/test-clerk-login" className="text-blue-400 hover:text-blue-300">
            Go to Test Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-500/10 to-blue-500/10 border-b border-green-500/20">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <CheckCircle className="h-8 w-8 text-green-500" />
              <div>
                <h1 className="text-2xl font-bold text-white">Welcome, {user?.firstName || 'User'}!</h1>
                <p className="text-gray-400">Clerk Test Dashboard</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Link 
                href="/signup" 
                className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                Regular App →
              </Link>
                <SignOutButton
                  signOutCallback={() => {
                    localStorage.removeItem('token'); // Clear NestEgg JWT
                    window.location.href = '/test-clerk-login';
                  }}
                >
                  <button className="flex items-center space-x-2 text-gray-400 hover:text-white transition-colors">
                    <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center">
                      <User className="h-5 w-5" />
                    </div>
                    <span>Sign Out</span>
                  </button>
                </SignOutButton>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Plan Card */}
          <div className={`bg-gray-900 border border-gray-800 rounded-xl p-6 ${plan.bgColor}`}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white flex items-center">
                <CreditCard className="h-5 w-5 mr-2 text-green-500" />
                Subscription
              </h2>
              <div className={`${plan.color}`}>
                {plan.icon}
              </div>
            </div>
            <div className="space-y-3">
              <div>
                <p className="text-gray-400 text-sm">Current Plan</p>
                <p className={`text-2xl font-bold ${plan.color}`}>{plan.name}</p>
              </div>
              {signupDate && (
                <div>
                  <p className="text-gray-400 text-sm">Member Since</p>
                  <p className="text-white">{new Date(signupDate).toLocaleDateString()}</p>
                </div>
              )}
              <div className="pt-3 border-t border-gray-700">
                <p className="text-gray-400 text-sm mb-2">Features:</p>
                <ul className="space-y-1">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="text-sm text-gray-300 flex items-center">
                      <CheckCircle className="h-3 w-3 text-green-500 mr-2" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
              {userPlan !== 'premium' && (
                <button
                  onClick={() => setShowUpgrade(true)}
                  className="w-full mt-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg hover:from-blue-600 hover:to-purple-600 transition-all flex items-center justify-center"
                >
                  Upgrade Plan <ArrowUpRight className="h-4 w-4 ml-2" />
                </button>
              )}
            </div>
          </div>

          {/* User Info Card */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center">
              <User className="h-5 w-5 mr-2 text-blue-500" />
              User Information
            </h2>
            <div className="space-y-3">
              <div>
                <p className="text-gray-400 text-sm">Name</p>
                <p className="text-white">{user?.fullName || `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'Not provided'}</p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Email</p>
                <p className="text-white text-sm">{user?.primaryEmailAddress?.emailAddress}</p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">User ID</p>
                <p className="text-white font-mono text-xs">{userId}</p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Verified</p>
                <p className="text-white">
                  {user?.primaryEmailAddress?.verification?.status === 'verified' ? '✓ Yes' : '○ No'}
                </p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">MFA</p>
                <p className="text-white">{user?.twoFactorEnabled ? '✓ Enabled' : '○ Disabled'}</p>
              </div>
            </div>
          </div>

          {/* Session Info Card */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center">
              <Shield className="h-5 w-5 mr-2 text-green-500" />
              Session Details
            </h2>
            <div className="space-y-3">
              <div>
                <p className="text-gray-400 text-sm">Status</p>
                <p className="text-green-400 font-semibold">● Active</p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Session ID</p>
                <p className="text-white font-mono text-xs">
                  {sessionId ? `${sessionId.slice(0, 12)}...` : 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Created</p>
                <p className="text-white text-sm">
                  {user?.createdAt ? new Date(user.createdAt).toLocaleString() : 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Last Sign In</p>
                <p className="text-white text-sm">
                  {user?.lastSignInAt ? new Date(user.lastSignInAt).toLocaleString() : 'First session'}
                </p>
              </div>
            </div>
          </div>

          {/* TOKENS */}
          <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Clerk token */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center">
                <Key className="h-5 w-5 mr-2 text-purple-500" />
                Clerk Session Token
              </h2>
              {clerkToken ? (
                <div>
                  <div className="bg-gray-950 rounded-lg p-4 font-mono text-xs text-gray-400 break-all relative">
                    <div className="pr-12">{clerkToken.substring(0, 150)}...</div>
                    <button
                      onClick={() => copy('clerk')}
                      className="absolute top-2 right-2 p-2 bg-gray-800 hover:bg-gray-700 rounded transition-colors"
                      title="Copy token"
                    >
                      {copied.clerk ? <CheckCircle className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4 text-gray-400" />}
                    </button>
                  </div>
                  <p className="text-sm text-gray-500 mt-2">
                    Raw Clerk token returned by <code>getToken()</code>.
                  </p>
                </div>
              ) : clerkTokenError ? (
                <div className="text-red-400 flex items-center gap-2"><AlertCircle className="h-4 w-4" />{clerkTokenError}</div>
              ) : (
                <div className="text-gray-400">Loading Clerk token...</div>
              )}
            </div>

            {/* App token */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center">
                <Key className="h-5 w-5 mr-2 text-green-500" />
                NestEgg App Token (after exchange)
              </h2>
              {appToken ? (
                <div>
                  <div className="bg-gray-950 rounded-lg p-4 font-mono text-xs text-gray-400 break-all relative">
                    <div className="pr-12">{appToken.substring(0, 150)}...</div>
                    <button
                      onClick={() => copy('app')}
                      className="absolute top-2 right-2 p-2 bg-gray-800 hover:bg-gray-700 rounded transition-colors"
                      title="Copy token"
                    >
                      {copied.app ? <CheckCircle className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4 text-gray-400" />}
                    </button>
                  </div>
                  <p className="text-sm text-gray-500 mt-2">
                    Stored in <code>localStorage.token</code>. All existing API calls can use it.
                  </p>
                  <div className="mt-3 text-sm">
                    {userPing.ok === true && <span className="text-green-400 inline-flex items-center"><Check className="h-4 w-4 mr-1" /> {userPing.msg}</span>}
                    {userPing.ok === false && <span className="text-red-400 inline-flex items-center"><AlertCircle className="h-4 w-4 mr-1" /> {userPing.msg}</span>}
                    {userPing.ok == null && <span className="text-gray-400">Pinging /user…</span>}
                  </div>
                </div>
              ) : appTokenError ? (
                <div className="text-red-400 flex items-center gap-2"><AlertCircle className="h-4 w-4" />{appTokenError}</div>
              ) : (
                <div className="text-gray-400">Exchanging Clerk token for app token…</div>
              )}
            </div>
          </div>

          {/* Metadata Display */}
          <div className="lg:col-span-3 bg-gray-900 border border-gray-800 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center">
              <Settings className="h-5 w-5 mr-2 text-gray-500" />
              User Metadata (Testing View)
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h3 className="text-sm font-medium text-gray-400 mb-2">Public Metadata</h3>
                <pre className="bg-gray-950 rounded p-3 text-xs text-gray-400 overflow-auto">
                  {JSON.stringify(user?.publicMetadata || {}, null, 2)}
                </pre>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-400 mb-2">Unsafe Metadata</h3>
                <pre className="bg-gray-950 rounded p-3 text-xs text-gray-400 overflow-auto">
                  {JSON.stringify(user?.unsafeMetadata || {}, null, 2)}
                </pre>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Upgrade Modal */}
      {showUpgrade && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-white mb-4">Upgrade Your Plan</h3>
            <div className="space-y-3">
              {userPlan === 'free' && (
                <>
                  <button
                    onClick={() => handleUpgrade('pro')}
                    className="w-full p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg hover:bg-blue-500/20 transition-colors text-left"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-white font-semibold">Pro - $9/mo</p>
                        <p className="text-sm text-gray-400">Unlimited accounts, advanced features</p>
                      </div>
                      <Zap className="h-5 w-5 text-blue-400" />
                    </div>
                  </button>
                  <button
                    onClick={() => handleUpgrade('premium')}
                    className="w-full p-4 bg-purple-500/10 border border-purple-500/20 rounded-lg hover:bg-purple-500/20 transition-colors text-left"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-white font-semibold">Premium - $29/mo</p>
                        <p className="text-sm text-gray-400">Everything + AI insights</p>
                      </div>
                      <Crown className="h-5 w-5 text-purple-400" />
                    </div>
                  </button>
                </>
              )}
              {userPlan === 'pro' && (
                <button
                  onClick={() => handleUpgrade('premium')}
                  className="w-full p-4 bg-purple-500/10 border border-purple-500/20 rounded-lg hover:bg-purple-500/20 transition-colors text-left"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white font-semibold">Premium - $29/mo</p>
                      <p className="text-sm text-gray-400">Add AI insights & premium support</p>
                    </div>
                    <Crown className="h-5 w-5 text-purple-400" />
                  </div>
                </button>
              )}
            </div>
            <button
              onClick={() => setShowUpgrade(false)}
              className="w-full mt-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function TestClerkDashboard() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  return (
    <ClerkProvider publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}>
      <DashboardContent />
    </ClerkProvider>
  );
}

// Skip static generation
export async function getServerSideProps() {
  return { props: {} };
}
