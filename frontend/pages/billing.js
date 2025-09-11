// pages/billing.js
import { SignedIn, SignedOut, useUser, UserButton, PricingTable, Protect } from "@clerk/nextjs";
import { SubscriptionDetailsButton } from "@clerk/nextjs/experimental";
import { useSubscription } from "@clerk/nextjs/experimental";
import { useAuth } from "@clerk/nextjs";
import Link from "next/link";
import { useEffect, useState } from "react";
import { CreditCard, Check, ArrowRight, Zap, Shield, Gift, AlertCircle, CheckCircle, X, Crown, Star, Sparkles, Settings, User, Building, Download } from "lucide-react";

export default function BillingPage() {
  return <Content />;
}

function Content() {
  const { isSignedIn, user } = useUser();

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <div className="max-w-6xl mx-auto p-6 space-y-8">
        {/* Enhanced Header with UserButton */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Billing & Subscription</h1>
            <p className="text-gray-400 mt-1">Manage your NestEgg subscription and payment methods</p>
          </div>
          <div className="flex items-center space-x-4">
            {isSignedIn && (
              <div className="flex items-center space-x-4">
                <div className="text-right">
                  <p className="text-sm text-gray-300">{user.fullName}</p>
                  <p className="text-xs text-gray-500">{user.primaryEmailAddress?.emailAddress}</p>
                </div>
                <UserButton 
                  showName={false}
                  appearance={{
                    baseTheme: "dark",
                    elements: {
                      userButtonAvatarBox: "w-10 h-10",
                      userButtonPopoverCard: "bg-gray-800 border-gray-700",
                      userButtonPopoverActionButton: "text-gray-100 hover:bg-gray-700"
                    }
                  }}
                />
              </div>
            )}
            <Link 
              href="/dashboard" 
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors flex items-center"
            >
              <span>Back to Dashboard</span>
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </div>
        </div>

        <SignedOut>
          <div className="p-8 border border-gray-800 rounded-xl bg-gray-900/50 backdrop-blur-sm text-center">
            <h2 className="text-2xl font-semibold mb-4">Please Sign In</h2>
            <p className="text-gray-400 mb-6">You need to be signed in to manage your subscription</p>
            <Link 
              href="/login" 
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all inline-flex items-center"
            >
              Sign In
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </div>
        </SignedOut>

        <SignedIn>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <CurrentPlanCard />
              <FeatureAccessDebugger />
              <ClerkPricingTableSection />
              <ProtectedContentExample />
            </div>
            <div className="lg:col-span-1 space-y-6">
              <QuickActions />
              <BillingActions />
              <SubscriptionDebugInfo />
            </div>
          </div>
        </SignedIn>
      </div>
    </div>
  );
}

// New Quick Actions component
function QuickActions() {
  return (
    <div className="p-6 border border-gray-800 rounded-xl bg-gray-900/70 backdrop-blur-sm">
      <h2 className="text-xl font-bold mb-4 flex items-center">
        <Zap className="h-5 w-5 mr-2 text-yellow-400" />
        Quick Actions
      </h2>
      
      <div className="space-y-3">
        <SubscriptionDetailsButton>
          <button className="w-full py-2 px-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg flex items-center justify-center hover:from-blue-700 hover:to-blue-800 transition-colors text-sm">
            <Settings className="h-4 w-4 mr-2" />
            Subscription Settings
          </button>
        </SubscriptionDetailsButton>

        <SubscriptionDetailsButton for="user">
          <button className="w-full py-2 px-4 bg-gray-800 hover:bg-gray-700 text-white rounded-lg flex items-center justify-center transition-colors text-sm">
            <User className="h-4 w-4 mr-2" />
            User Billing
          </button>
        </SubscriptionDetailsButton>

        <button className="w-full py-2 px-4 bg-gray-800 hover:bg-gray-700 text-white rounded-lg flex items-center justify-center transition-colors text-sm">
          <Download className="h-4 w-4 mr-2" />
          Download Invoice
        </button>
      </div>
    </div>
  );
}

// Enhanced Feature Access Debugger with real-time data
function FeatureAccessDebugger() {
  const { has } = useAuth();
  const { data: subscription } = useSubscription();
  const [features, setFeatures] = useState({});
  const [plans, setPlans] = useState({});

  useEffect(() => {
    // Test feature access based on your actual dashboard configuration
    // Update these with your real feature names from Clerk Dashboard
    const testFeatures = [
      'ai_assistant',
      'advanced_analytics', 
      'real_estate_tracking',
      'api_access',
      'priority_support',
      'unlimited_accounts',
      'csv_export',
      'historical_data',
      'custom_reports',
      'white_label'
    ];

    // Test plan access based on your actual dashboard configuration
    // Update these with your real plan names from Clerk Dashboard
    const testPlans = [
      'free',
      'basic',
      'standard', 
      'premium',
      'pro',
      'enterprise'
    ];

    const featureResults = {};
    const planResults = {};

    testFeatures.forEach(feature => {
      try {
        featureResults[feature] = has({ feature });
      } catch (error) {
        featureResults[feature] = false;
        console.warn(`Feature check failed for ${feature}:`, error);
      }
    });

    testPlans.forEach(plan => {
      try {
        planResults[plan] = has({ plan });
      } catch (error) {
        planResults[plan] = false;
        console.warn(`Plan check failed for ${plan}:`, error);
      }
    });

    setFeatures(featureResults);
    setPlans(planResults);

    console.groupCollapsed("[Billing] Feature/Plan Access Check");
    console.log("Current subscription:", subscription);
    console.log("Features:", featureResults);
    console.log("Plans:", planResults);
    console.groupEnd();
  }, [has, subscription]);

  const currentPlan = Object.entries(plans).find(([plan, hasAccess]) => hasAccess)?.[0] || 'none';
  const enabledFeatures = Object.entries(features).filter(([feature, hasAccess]) => hasAccess);

  return (
    <div className="p-6 border border-gray-800 rounded-xl bg-gray-900/70 backdrop-blur-sm">
      <h2 className="text-xl font-bold mb-4 flex items-center">
        <Shield className="h-5 w-5 mr-2 text-blue-400" />
        Access Control Status
      </h2>
      
      {/* Current Plan Summary */}
      <div className="mb-6 p-4 bg-gray-800/50 rounded-lg">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-300">Current Plan</span>
          <span className={`px-2 py-1 text-xs rounded-full ${
            currentPlan === 'none' ? 'bg-gray-600 text-gray-300' :
            currentPlan === 'free' ? 'bg-green-600 text-white' :
            currentPlan === 'premium' ? 'bg-purple-600 text-white' :
            'bg-blue-600 text-white'
          }`}>
            {currentPlan.toUpperCase()}
          </span>
        </div>
        <div className="text-sm text-gray-400">
          {enabledFeatures.length} of {Object.keys(features).length} features enabled
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Feature Access */}
        <div>
          <h3 className="text-sm font-semibold text-gray-300 mb-3 uppercase tracking-wide">Features</h3>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {Object.entries(features).map(([feature, hasAccess]) => (
              <div key={feature} className="flex items-center justify-between py-2 px-3 bg-gray-800/50 rounded-lg">
                <span className="text-sm text-gray-300 capitalize">{feature.replace(/_/g, ' ')}</span>
                <div className="flex items-center">
                  {hasAccess ? (
                    <CheckCircle className="h-4 w-4 text-green-400" />
                  ) : (
                    <X className="h-4 w-4 text-red-400" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Plan Access */}
        <div>
          <h3 className="text-sm font-semibold text-gray-300 mb-3 uppercase tracking-wide">Plans</h3>
          <div className="space-y-2">
            {Object.entries(plans).map(([plan, hasAccess]) => (
              <div key={plan} className="flex items-center justify-between py-2 px-3 bg-gray-800/50 rounded-lg">
                <span className="text-sm text-gray-300 capitalize">{plan}</span>
                <div className="flex items-center">
                  {hasAccess ? (
                    <CheckCircle className="h-4 w-4 text-green-400" />
                  ) : (
                    <X className="h-4 w-4 text-red-400" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 p-3 bg-blue-900/20 border border-blue-800/50 rounded-lg">
        <p className="text-xs text-blue-300">
          <Zap className="h-3 w-3 inline mr-1" />
          Real-time access control using Clerk's `has()` helper. Update feature/plan names in code to match your dashboard.
        </p>
      </div>
    </div>
  );
}

// New component showcasing Protect component
function ProtectedContentExample() {
  return (
    <div className="p-6 border border-gray-800 rounded-xl bg-gray-900/70 backdrop-blur-sm">
      <h2 className="text-xl font-bold mb-4 flex items-center">
        <Shield className="h-5 w-5 mr-2 text-purple-400" />
        Protected Content Demo
      </h2>
      
      <div className="space-y-4">
        <Protect 
          feature="ai_assistant" 
          fallback={
            <div className="p-4 border border-red-800/50 bg-red-900/20 rounded-lg">
              <p className="text-red-300 text-sm">
                🔒 AI Assistant feature requires a premium subscription
              </p>
            </div>
          }
        >
          <div className="p-4 border border-green-800/50 bg-green-900/20 rounded-lg">
            <p className="text-green-300 text-sm">
              ✨ You have access to the AI Assistant feature!
            </p>
          </div>
        </Protect>

        <Protect 
          feature="advanced_analytics" 
          fallback={
            <div className="p-4 border border-red-800/50 bg-red-900/20 rounded-lg">
              <p className="text-red-300 text-sm">
                📊 Advanced Analytics requires a paid plan
              </p>
            </div>
          }
        >
          <div className="p-4 border border-green-800/50 bg-green-900/20 rounded-lg">
            <p className="text-green-300 text-sm">
              📈 Advanced Analytics is available to you!
            </p>
          </div>
        </Protect>
      </div>

      <div className="mt-4 p-3 bg-purple-900/20 border border-purple-800/50 rounded-lg">
        <p className="text-xs text-purple-300">
          <Sparkles className="h-3 w-3 inline mr-1" />
          The `&lt;Protect&gt;` component automatically shows/hides content based on user access.
        </p>
      </div>
    </div>
  );
}

// Clerk's built-in PricingTable component
function ClerkPricingTableSection() {
  return (
    <div className="p-6 border border-gray-800 rounded-xl bg-gray-900/70 backdrop-blur-sm">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold flex items-center">
            <Crown className="h-5 w-5 mr-2 text-purple-400" />
            Available Plans
          </h2>
          <p className="text-gray-400 text-sm mt-1">
            Live pricing from your Clerk Dashboard configuration
          </p>
        </div>
      </div>

      <div className="bg-gray-800/30 rounded-lg p-4 border border-gray-700">
        <PricingTable 
          appearance={{
            baseTheme: "dark",
            variables: {
              colorPrimary: "#3b82f6",
              colorBackground: "#1f2937",
              colorText: "#f9fafb",
              colorTextSecondary: "#9ca3af"
            },
            elements: {
              card: "bg-gray-800 border-gray-700",
              cardBox: "bg-gray-800",
              headerTitle: "text-white",
              headerSubtitle: "text-gray-300",
              pricingPlan: "bg-gray-800 border-gray-700",
              pricingPlanBox: "bg-gray-800",
              formButtonPrimary: "bg-blue-600 hover:bg-blue-700"
            }
          }}
          ctaPosition="bottom"
          collapseFeatures={false}
        />
      </div>

      <div className="mt-4 p-3 bg-purple-900/20 border border-purple-800/50 rounded-lg">
        <p className="text-xs text-purple-300">
          <Sparkles className="h-3 w-3 inline mr-1" />
          This component automatically syncs with plans configured in your Clerk Dashboard.
        </p>
      </div>
    </div>
  );
}

function CurrentPlanCard() {
  const { data: subscription, isLoaded, isLoading, error } = useSubscription();

  useEffect(() => {
    console.groupCollapsed("[Billing] useSubscription");
    console.log("loaded:", isLoaded, "loading:", isLoading, "error:", error);
    console.log("subscription:", subscription);
    console.groupEnd();
  }, [subscription, isLoaded, isLoading, error]);

  if (isLoading || !isLoaded) {
    return (
      <div className="p-6 border border-gray-800 rounded-xl bg-gray-900/70 backdrop-blur-sm animate-pulse">
        <div className="h-6 bg-gray-800 rounded w-1/3 mb-4"></div>
        <div className="h-4 bg-gray-800 rounded w-1/2 mb-2"></div>
        <div className="h-4 bg-gray-800 rounded w-1/4 mb-2"></div>
        <div className="h-4 bg-gray-800 rounded w-2/3"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 border border-red-900/50 rounded-xl bg-red-900/10 backdrop-blur-sm text-red-400">
        <h2 className="text-lg font-semibold mb-2">Failed to load subscription</h2>
        <p className="text-sm">{String(error?.message || error)}</p>
        <button 
          onClick={() => window.location.reload()} 
          className="mt-3 px-3 py-1 bg-gray-800 rounded-lg text-sm hover:bg-gray-700 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  const status = subscription?.status ?? "none";
  const planName = subscription?.plan?.name || "Free";
  const planId = subscription?.plan?.id || "free";
  const amount = subscription?.amount ? `$${(subscription.amount / 100).toFixed(2)}` : "$0";
  const interval = subscription?.interval || "forever";
  
  const renewsAt = subscription?.currentPeriodEnd
    ? new Date(subscription.currentPeriodEnd).toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      })
    : "—";

  // Determine plan badge color based on actual plan
  const getBadgeClass = () => {
    const lowerPlan = planName.toLowerCase();
    if (lowerPlan.includes('premium') || lowerPlan.includes('enterprise')) {
      return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
    } else if (lowerPlan.includes('pro') || lowerPlan.includes('standard')) {
      return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
    } else {
      return 'bg-green-500/20 text-green-300 border-green-500/30';
    }
  };

  return (
    <div className="p-8 border border-gray-800 rounded-xl bg-gray-900/70 backdrop-blur-sm">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Current Subscription</h2>
        <span 
          className={`px-3 py-1 text-sm rounded-full border ${getBadgeClass()}`}
        >
          {planName}
        </span>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div className="bg-gray-800/50 p-4 rounded-lg">
          <p className="text-gray-400 text-sm">Status</p>
          <p className="text-lg font-medium capitalize">{status}</p>
        </div>
        <div className="bg-gray-800/50 p-4 rounded-lg">
          <p className="text-gray-400 text-sm">Amount</p>
          <p className="text-lg font-medium">{amount}</p>
        </div>
        <div className="bg-gray-800/50 p-4 rounded-lg">
          <p className="text-gray-400 text-sm">Billing Cycle</p>
          <p className="text-lg font-medium capitalize">{interval}</p>
        </div>
        <div className="bg-gray-800/50 p-4 rounded-lg">
          <p className="text-gray-400 text-sm">Next Payment</p>
          <p className="text-lg font-medium">{renewsAt}</p>
        </div>
      </div>
      
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-400 flex items-center">
          <Zap className="h-4 w-4 mr-2 text-blue-400" />
          Managed by Clerk Billing
        </div>
        
        {subscription && (
          <SubscriptionDetailsButton>
            <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors">
              Manage Plan
            </button>
          </SubscriptionDetailsButton>
        )}
      </div>
    </div>
  );
}

function BillingActions() {
  return (
    <div className="p-6 border border-gray-800 rounded-xl bg-gray-900/70 backdrop-blur-sm">
      <h2 className="text-xl font-bold mb-4">Subscription Management</h2>
      
      <div className="space-y-4">
        <SubscriptionDetailsButton
          onSubscriptionCancel={() => {
            console.log('Subscription was cancelled');
            // You could add analytics tracking or redirect here
          }}
        >
          <button className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg flex items-center justify-center hover:from-blue-700 hover:to-blue-800 transition-colors">
            <CreditCard className="h-5 w-5 mr-2" />
            Payment & Billing
          </button>
        </SubscriptionDetailsButton>
        
        <SubscriptionDetailsButton
          subscriptionDetailsProps={{
            appearance: {
              baseTheme: "dark"
            }
          }}
        >
          <button className="w-full py-3 px-4 bg-gray-800 hover:bg-gray-700 text-white rounded-lg flex items-center justify-center transition-colors">
            <Shield className="h-5 w-5 mr-2" />
            Subscription Details
          </button>
        </SubscriptionDetailsButton>
        
        <SubscriptionDetailsButton>
          <button className="w-full py-3 px-4 bg-gray-800 hover:bg-gray-700 text-white rounded-lg flex items-center justify-center transition-colors">
            <Gift className="h-5 w-5 mr-2" />
            Manage Add-ons
          </button>
        </SubscriptionDetailsButton>
      </div>
      
      <div className="mt-6 pt-4 border-t border-gray-700">
        <SubscriptionDetailsButton>
          <button className="text-gray-400 hover:text-red-400 text-sm transition-colors">
            Cancel Subscription
          </button>
        </SubscriptionDetailsButton>
      </div>
    </div>
  );
}

// Debug component showing real subscription data (no placeholder data)
function SubscriptionDebugInfo() {
  const { data: subscription, isLoaded } = useSubscription();
  const { user } = useUser();
  const [showDebug, setShowDebug] = useState(false);

  if (!isLoaded) return null;

  return (
    <div className="p-6 border border-gray-800 rounded-xl bg-gray-900/70 backdrop-blur-sm">
      <button 
        onClick={() => setShowDebug(!showDebug)}
        className="flex items-center justify-between w-full text-left"
      >
        <h2 className="text-xl font-bold">Debug Information</h2>
        <AlertCircle className="h-5 w-5 text-orange-400" />
      </button>
      
      {showDebug && (
        <div className="mt-4 space-y-3">
          <div className="bg-gray-800/50 p-3 rounded-lg">
            <h3 className="text-sm font-semibold text-gray-300 mb-2">Subscription Data</h3>
            <pre className="text-xs text-gray-400 overflow-auto max-h-40">
              {JSON.stringify(subscription || "No subscription data", null, 2)}
            </pre>
          </div>
          
          <div className="bg-gray-800/50 p-3 rounded-lg">
            <h3 className="text-sm font-semibold text-gray-300 mb-2">User Data</h3>
            <pre className="text-xs text-gray-400 overflow-auto max-h-40">
              {JSON.stringify({
                id: user?.id,
                email: user?.primaryEmailAddress?.emailAddress,
                name: user?.fullName,
                createdAt: user?.createdAt,
                lastSignInAt: user?.lastSignInAt
              }, null, 2)}
            </pre>
          </div>
          
          <div className="bg-gray-800/50 p-3 rounded-lg">
            <h3 className="text-sm font-semibold text-gray-300 mb-2">Environment</h3>
            <div className="text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-gray-400">Mode:</span>
                <span className="text-white">{process.env.NODE_ENV}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">API Base:</span>
                <span className="text-white text-right truncate ml-2" title={process.env.NEXT_PUBLIC_API_URL}>
                  {process.env.NEXT_PUBLIC_API_URL}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}