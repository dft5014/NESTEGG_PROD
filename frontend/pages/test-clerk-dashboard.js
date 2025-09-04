// pages/test-clerk-dashboard.js
import { ClerkProvider, useUser, UserButton, useAuth } from "@clerk/nextjs";
import { useState, useEffect } from "react";
import Link from "next/link";
import { 
  CheckCircle, XCircle, Info, Code, User, Mail, 
  Shield, Clock, ArrowLeft, Sparkles, Key, Database,
  Loader
} from 'lucide-react';

function DashboardContent() {
  const { isLoaded, isSignedIn, user } = useUser();
  const { userId, sessionId, getToken } = useAuth();
  const [token, setToken] = useState(null);
  const [tokenError, setTokenError] = useState(null);

  useEffect(() => {
    const fetchToken = async () => {
      try {
        if (isSignedIn && getToken) {
          const jwt = await getToken();
          setToken(jwt);
        }
      } catch (err) {
        setTokenError(err.message);
      }
    };
    
    if (isSignedIn) {
      fetchToken();
    }
  }, [isSignedIn, getToken]);

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
                <h1 className="text-2xl font-bold text-white">Clerk Test Success!</h1>
                <p className="text-gray-400">You're signed in with Clerk (Test Mode)</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Link 
                href="/signup" 
                className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700"
              >
                Regular App →
              </Link>
              <UserButton afterSignOutUrl="/test-clerk-login" />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* User Info Card */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center">
              <User className="h-5 w-5 mr-2 text-blue-500" />
              User Information
            </h2>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-400">User ID:</span>
                <span className="text-white font-mono text-sm">{userId || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Email:</span>
                <span className="text-white">{user?.primaryEmailAddress?.emailAddress || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Name:</span>
                <span className="text-white">{user?.fullName || 'Not provided'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Username:</span>
                <span className="text-white">{user?.username || 'Not set'}</span>
              </div>
            </div>
          </div>

          {/* Session Info Card */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center">
              <Shield className="h-5 w-5 mr-2 text-green-500" />
              Session Information
            </h2>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-400">Session ID:</span>
                <span className="text-white font-mono text-sm">
                  {sessionId ? `${sessionId.slice(0, 20)}...` : 'N/A'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Auth Status:</span>
                <span className="text-green-400">Authenticated ✓</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Created:</span>
                <span className="text-white">
                  {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">MFA Enabled:</span>
                <span className="text-white">{user?.twoFactorEnabled ? 'Yes' : 'No'}</span>
              </div>
            </div>
          </div>

          {/* JWT Token Preview */}
          <div className="lg:col-span-2 bg-gray-900 border border-gray-800 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center">
              <Key className="h-5 w-5 mr-2 text-purple-500" />
              JWT Token (for API testing)
            </h2>
            {token ? (
              <div>
                <div className="bg-gray-950 rounded-lg p-4 font-mono text-xs text-gray-400 break-all">
                  {token.substring(0, 100)}...
                </div>
                <p className="text-sm text-gray-500 mt-2">
                  ✓ This token can be used to authenticate with your backend API
                </p>
              </div>
            ) : tokenError ? (
              <div className="text-red-400">Error fetching token: {tokenError}</div>
            ) : (
              <div className="text-gray-400">Loading token...</div>
            )}
          </div>

          {/* Next Steps */}
          <div className="lg:col-span-2 bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center">
              <Sparkles className="h-5 w-5 mr-2 text-yellow-500" />
              Next Steps for Integration
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h3 className="text-white font-medium">✅ What's Working:</h3>
                <ul className="text-sm text-gray-400 space-y-1">
                  <li>• User registration via Clerk</li>
                  <li>• Social login providers</li>
                  <li>• Session management</li>
                  <li>• JWT token generation</li>
                </ul>
              </div>
              <div className="space-y-2">
                <h3 className="text-white font-medium">📋 To Complete Integration:</h3>
                <ul className="text-sm text-gray-400 space-y-1">
                  <li>• Connect Clerk JWT to FastAPI backend</li>
                  <li>• Sync Clerk users with database</li>
                  <li>• Update AuthContext to use Clerk</li>
                  <li>• Migrate existing users (optional)</li>
                </ul>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

export default function TestClerkDashboard() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null; // Prevent hydration mismatch
  }

  return (
    <ClerkProvider publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}>
      <DashboardContent />
    </ClerkProvider>
  );
}

// Skip static generation for this page
export async function getServerSideProps() {
  return {
    props: {},
  };
}