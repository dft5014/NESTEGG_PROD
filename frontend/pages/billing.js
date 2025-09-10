// pages/billing.js
import { SignedIn, SignedOut, useUser, UserButton } from "@clerk/nextjs";
import { SubscriptionDetailsButton } from "@clerk/nextjs/experimental";
import { useSubscription } from "@clerk/nextjs/experimental";
import Link from "next/link";
import { useEffect, useState } from "react";
import { CreditCard, Check, ArrowRight, Zap, Shield, Gift } from "lucide-react";

export default function BillingPage() {
  return <Content />;
}

function Content() {
  const { isSignedIn, user } = useUser();

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <div className="max-w-5xl mx-auto p-6 space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Billing & Subscription</h1>
            <p className="text-gray-400 mt-1">Manage your NestEgg subscription and payment methods</p>
          </div>
          <div className="flex items-center space-x-4">
            {isSignedIn && (
              <div className="flex items-center">
                <span className="text-gray-400 mr-2">{user.primaryEmailAddress?.emailAddress}</span>
                <UserButton />
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
            <div className="lg:col-span-2">
              <CurrentPlanCard />
              <div className="mt-6">
                <PlanOptions />
              </div>
            </div>
            <div className="lg:col-span-1">
              <BillingActions />
              <div className="mt-6">
                <BillingHistory />
              </div>
            </div>
          </div>
        </SignedIn>
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
        <p>{String(error?.message || error)}</p>
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
  const planName = subscription?.plan?.name || subscription?.plan?.id || "Free";
  const renewsAt = subscription?.currentPeriodEnd
    ? new Date(subscription.currentPeriodEnd).toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      })
    : "—";

  // Determine plan badge color
  const getBadgeClass = () => {
    if (planName.toLowerCase().includes('premium')) {
      return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
    } else if (planName.toLowerCase().includes('pro')) {
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
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-gray-800/50 p-4 rounded-lg">
          <p className="text-gray-400 text-sm">Status</p>
          <p className="text-lg font-medium capitalize">{status}</p>
        </div>
        <div className="bg-gray-800/50 p-4 rounded-lg">
          <p className="text-gray-400 text-sm">Renewal Date</p>
          <p className="text-lg font-medium">{renewsAt}</p>
        </div>
        <div className="bg-gray-800/50 p-4 rounded-lg">
          <p className="text-gray-400 text-sm">Billing Cycle</p>
          <p className="text-lg font-medium">
            {subscription?.intervalCount 
              ? `Every ${subscription.intervalCount} ${subscription.interval}${subscription.intervalCount > 1 ? 's' : ''}` 
              : 'Monthly'}
          </p>
        </div>
      </div>
      
      <div className="text-sm text-gray-400 flex items-center">
        <Zap className="h-4 w-4 mr-2 text-blue-400" />
        Plan changes and billing info synced via Clerk webhooks
      </div>
    </div>
  );
}

function PlanOptions() {
  const { data: subscription } = useSubscription();
  const currentPlan = subscription?.plan?.name?.toLowerCase() || 'free';
  
  const plans = [
    {
      id: 'free',
      name: 'Free',
      price: '$0',
      period: 'forever',
      description: 'Track up to 5 investment accounts with basic portfolio analysis',
      features: [
        '5 investment accounts',
        'Basic portfolio analytics',
        'Manual asset tracking',
        'Daily portfolio snapshots'
      ],
      highlighted: false,
      color: 'from-gray-500 to-gray-600'
    },
    {
      id: 'standard',
      name: 'Standard',
      price: '$9.99',
      period: 'per month',
      description: 'Advanced portfolio tracking with unlimited accounts',
      features: [
        'Unlimited investment accounts',
        'Advanced portfolio analytics',
        'Performance benchmarking',
        '90-day historical data',
        'CSV export capabilities'
      ],
      highlighted: true,
      color: 'from-blue-500 to-blue-600'
    },
    {
      id: 'premium',
      name: 'Premium',
      price: '$19.99',
      period: 'per month',
      description: 'Complete financial tracking with premium analytics',
      features: [
        'Everything in Standard',
        'Real estate & alternative assets',
        'Advanced tax reporting',
        'Full historical data',
        'API access',
        'Priority support'
      ],
      highlighted: false,
      color: 'from-purple-500 to-purple-600'
    }
  ];

  return (
    <div className="p-8 border border-gray-800 rounded-xl bg-gray-900/70 backdrop-blur-sm">
      <h2 className="text-2xl font-bold mb-6">Available Plans</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((plan) => (
          <div 
            key={plan.id}
            className={`border rounded-xl p-6 flex flex-col ${
              currentPlan === plan.id.toLowerCase() 
                ? 'border-blue-500/50 bg-blue-900/10' 
                : 'border-gray-800 hover:border-gray-700 bg-gray-800/30'
            } ${plan.highlighted ? 'ring-2 ring-blue-500/50' : ''}`}
          >
            <div className="mb-4">
              <h3 className="text-xl font-bold">{plan.name}</h3>
              <div className="flex items-baseline mt-2">
                <span className="text-3xl font-bold">{plan.price}</span>
                <span className="text-gray-400 text-sm ml-1">{plan.period}</span>
              </div>
              <p className="text-gray-400 text-sm mt-2">{plan.description}</p>
            </div>
            
            <div className="flex-grow">
              <ul className="space-y-2">
                {plan.features.map((feature, idx) => (
                  <li key={idx} className="flex items-start">
                    <Check className="h-5 w-5 text-green-400 mr-2 flex-shrink-0 mt-0.5" />
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
            
            <div className="mt-6">
              {currentPlan === plan.id.toLowerCase() ? (
                <button 
                  disabled
                  className="w-full py-2 px-4 bg-blue-500/20 text-blue-300 rounded-lg text-center cursor-not-allowed"
                >
                  Current Plan
                </button>
              ) : (
                <SubscriptionDetailsButton>
                  <button 
                    className={`w-full py-2 px-4 bg-gradient-to-r ${plan.color} text-white rounded-lg text-center hover:opacity-90 transition-opacity`}
                  >
                    {plan.id === 'free' ? 'Downgrade' : 'Upgrade'} to {plan.name}
                  </button>
                </SubscriptionDetailsButton>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function BillingActions() {
  return (
    <div className="p-6 border border-gray-800 rounded-xl bg-gray-900/70 backdrop-blur-sm">
      <h2 className="text-xl font-bold mb-4">Manage Subscription</h2>
      
      <div className="space-y-4">
        <SubscriptionDetailsButton>
          <button className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg flex items-center justify-center hover:from-blue-700 hover:to-blue-800 transition-colors">
            <CreditCard className="h-5 w-5 mr-2" />
            Manage Payment Methods
          </button>
        </SubscriptionDetailsButton>
        
        <SubscriptionDetailsButton>
          <button className="w-full py-3 px-4 bg-gray-800 hover:bg-gray-700 text-white rounded-lg flex items-center justify-center transition-colors">
            <Shield className="h-5 w-5 mr-2" />
            Billing Details
          </button>
        </SubscriptionDetailsButton>
        
        <SubscriptionDetailsButton>
          <button className="w-full py-3 px-4 bg-gray-800 hover:bg-gray-700 text-white rounded-lg flex items-center justify-center transition-colors">
            <Gift className="h-5 w-5 mr-2" />
            Redeem Promo Code
          </button>
        </SubscriptionDetailsButton>
      </div>
      
      <div className="mt-4 text-center">
        <SubscriptionDetailsButton>
          <button className="text-gray-400 hover:text-gray-300 text-sm">
            Cancel Subscription
          </button>
        </SubscriptionDetailsButton>
      </div>
    </div>
  );
}

function BillingHistory() {
  // Placeholder billing history
  const transactions = [
    { id: 1, date: '2025-08-15', amount: '$19.99', status: 'Paid', plan: 'Premium' },
    { id: 2, date: '2025-07-15', amount: '$19.99', status: 'Paid', plan: 'Premium' },
    { id: 3, date: '2025-06-15', amount: '$9.99', status: 'Paid', plan: 'Standard' },
  ];

  return (
    <div className="p-6 border border-gray-800 rounded-xl bg-gray-900/70 backdrop-blur-sm">
      <h2 className="text-xl font-bold mb-4">Billing History</h2>
      
      {transactions.length > 0 ? (
        <div className="overflow-hidden rounded-lg border border-gray-800">
          <table className="min-w-full divide-y divide-gray-800">
            <thead className="bg-gray-800/50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Date</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Amount</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {transactions.map((transaction) => (
                <tr key={transaction.id} className="hover:bg-gray-800/30">
                  <td className="px-4 py-3 text-sm">
                    {new Date(transaction.date).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-sm">{transaction.amount}</td>
                  <td className="px-4 py-3 text-sm">
                    <span className="px-2 py-1 text-xs rounded-full bg-green-500/20 text-green-400">
                      {transaction.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-6 text-gray-400">
          No billing history available yet
        </div>
      )}
      
      <div className="mt-4 text-center">
        <button className="text-blue-400 hover:text-blue-300 text-sm">
          Download Invoice
        </button>
      </div>
    </div>
  );
}