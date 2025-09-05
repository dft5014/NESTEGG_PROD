// pages/test-clerk-signup.js
import { ClerkProvider, SignUp, useSignUp, useClerk } from "@clerk/nextjs";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { 
  ArrowLeft, Sparkles, Shield, Check, Crown, 
  Zap, Star, TrendingUp, X, ChevronRight,
  LogOut, User, CreditCard
} from 'lucide-react';

// Plan data
const plans = [
  {
    id: 'free',
    name: 'Free',
    price: '$0',
    period: 'forever',
    icon: <Star className="h-6 w-6" />,
    features: [
      '2 accounts',
      'Basic portfolio tracking',
      'Manual updates',
      'Community support'
    ],
    color: 'gray'
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '$9',
    period: '/month',
    icon: <Zap className="h-6 w-6" />,
    features: [
      'Unlimited accounts',
      'Advanced analytics',
      'API access',
      'Priority support',
      'Export to Excel',
      'Custom categories'
    ],
    popular: true,
    color: 'blue'
  },
  {
    id: 'premium',
    name: 'Premium',
    price: '$29',
    period: '/month',
    icon: <Crown className="h-6 w-6" />,
    features: [
      'Everything in Pro',
      'AI insights',
      'Tax optimization',
      'Financial advisor tools',
      'White-glove support',
      'Custom integrations'
    ],
    color: 'purple'
  }
];

// Plan selector component
function PlanSelector({ onSelectPlan, selectedPlan, onContinue, onSkip }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">Choose Your Plan</h3>
        <button
          onClick={onSkip}
          className="text-gray-400 hover:text-white text-sm flex items-center"
        >
          Skip for now
          <ChevronRight className="h-4 w-4 ml-1" />
        </button>
      </div>
      
      <div className="grid gap-4">
        {plans.map((plan) => (
          <div
            key={plan.id}
            onClick={() => onSelectPlan(plan.id)}
            className={`relative rounded-xl border-2 p-6 cursor-pointer transition-all ${
              selectedPlan === plan.id
                ? plan.color === 'blue' 
                  ? 'border-blue-500 bg-blue-500/10'
                  : plan.color === 'purple'
                  ? 'border-purple-500 bg-purple-500/10'
                  : 'border-gray-500 bg-gray-500/10'
                : 'border-gray-700 bg-gray-900 hover:border-gray-600'
            }`}
          >
            {plan.popular && (
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <span className="bg-gradient-to-r from-blue-500 to-purple-500 text-white text-xs font-semibold px-3 py-1 rounded-full">
                  MOST POPULAR
                </span>
              </div>
            )}
            
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className={`${
                  plan.color === 'blue' 
                    ? 'text-blue-500'
                    : plan.color === 'purple'
                    ? 'text-purple-500'
                    : 'text-gray-400'
                }`}>
                  {plan.icon}
                </div>
                <div>
                  <h4 className="text-white font-semibold">{plan.name}</h4>
                  <div className="flex items-baseline">
                    <span className="text-2xl font-bold text-white">{plan.price}</span>
                    <span className="text-gray-400 ml-1">{plan.period}</span>
                  </div>
                </div>
              </div>
              {selectedPlan === plan.id && (
                <div className="bg-green-500 rounded-full p-1">
                  <Check className="h-4 w-4 text-white" />
                </div>
              )}
            </div>
            
            <ul className="space-y-2">
              {plan.features.map((feature, i) => (
                <li key={i} className="flex items-start space-x-2">
                  <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-gray-300">{feature}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      
      <div className="flex gap-3 mt-6">
        <button
          onClick={onSkip}
          className="flex-1 py-3 px-4 bg-gray-800 text-white font-semibold rounded-lg hover:bg-gray-700 transition-all"
        >
          Skip & Use Free
        </button>
        <button
          onClick={onContinue}
          disabled={!selectedPlan}
          className="flex-1 py-3 px-4 bg-gradient-to-r from-blue-500 to-purple-500 text-white font-semibold rounded-lg hover:from-blue-600 hover:to-purple-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center"
        >
          Continue
          <ChevronRight className="h-5 w-5 ml-2" />
        </button>
      </div>
    </div>
  );
}

// Main signup component
function SignUpContent() {
  const [step, setStep] = useState('plan'); // 'plan' or 'signup'
  const [selectedPlan, setSelectedPlan] = useState('');
  const { signOut } = useClerk();
  const router = useRouter();

  // Store plan in sessionStorage
  useEffect(() => {
    if (selectedPlan) {
      sessionStorage.setItem('selectedPlan', selectedPlan);
    }
  }, [selectedPlan]);

  // Check if user is already signed in
  const handleSignOut = async () => {
    try {
      await signOut();
      router.push('/test-clerk-login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  // Plan selection step
  if (step === 'plan') {
    return (
      <div className="w-full max-w-2xl">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-8">
          {/* Navigation */}
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={() => router.push('/signup')}
              className="text-gray-400 hover:text-white flex items-center"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to regular signup
            </button>
            <button
              onClick={() => setStep('signup')}
              className="text-blue-400 hover:text-blue-300 text-sm"
            >
              Skip to signup →
            </button>
          </div>
          
          <PlanSelector 
            selectedPlan={selectedPlan}
            onSelectPlan={setSelectedPlan}
            onContinue={() => setStep('signup')}
            onSkip={() => {
              setSelectedPlan('free');
              setStep('signup');
            }}
          />
        </div>
      </div>
    );
  }

  // Signup step
  return (
    <div className="w-full max-w-md">
      {/* Plan Summary Bar */}
      {selectedPlan && (
        <div className="mb-6 p-4 bg-gray-900 border border-gray-800 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <CreditCard className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-400">Selected Plan</p>
                <p className="text-white font-semibold">
                  {plans.find(p => p.id === selectedPlan)?.name || 'Free'} - 
                  {plans.find(p => p.id === selectedPlan)?.price || '$0'}
                  {plans.find(p => p.id === selectedPlan)?.period || '/forever'}
                </p>
              </div>
            </div>
            <button
              onClick={() => setStep('plan')}
              className="text-blue-400 hover:text-blue-300 text-sm"
            >
              Change
            </button>
          </div>
        </div>
      )}
      
      {/* Navigation Bar */}
      <div className="mb-4 flex items-center justify-between">
        <button
          onClick={() => setStep('plan')}
          className="text-gray-400 hover:text-white flex items-center text-sm"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to plans
        </button>
        <Link 
          href="/test-clerk-login"
          className="text-blue-400 hover:text-blue-300 text-sm"
        >
          Already have an account?
        </Link>
      </div>
      
      {/* Clerk SignUp Component */}
      <SignUp 
        appearance={{
          baseTheme: "dark",
          elements: {
            formButtonPrimary: 
              'bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600',
            card: 'bg-gray-900 border border-gray-800 shadow-2xl',
            headerTitle: 'text-white',
            headerSubtitle: 'text-gray-400',
            socialButtonsBlockButton: 
              'bg-gray-800 border-gray-700 text-white hover:bg-gray-700',
            formFieldLabel: 'text-gray-300',
            formFieldInput: 'bg-gray-800 border-gray-700 text-white',
            footerActionLink: 'text-blue-400 hover:text-blue-300',
            identityPreviewText: 'text-gray-400',
            identityPreviewEditButton: 'text-blue-400 hover:text-blue-300'
          }
        }}
        routing="path"
        path="/test-clerk-signup"
        signInUrl="/test-clerk-login"
        fallbackRedirectUrl="/test-clerk-dashboard"
        unsafeMetadata={{
          plan: selectedPlan || 'free',
          signupDate: new Date().toISOString()
        }}
      />
      
      {/* Help Text */}
      <div className="mt-4 text-center">
        <p className="text-xs text-gray-500">
          Having trouble? 
          <button
            onClick={() => window.location.reload()}
            className="text-blue-400 hover:text-blue-300 ml-1"
          >
            Refresh page
          </button>
          {' or '}
          <Link href="/signup" className="text-blue-400 hover:text-blue-300">
            use regular signup
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function TestClerkSignup() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Clear any stuck session storage
    return () => {
      sessionStorage.removeItem('selectedPlan');
    };
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <ClerkProvider publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}>
      <div className="min-h-screen bg-gray-950">
        {/* Header */}
        <div className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border-b border-yellow-500/20">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Sparkles className="h-6 w-6 text-yellow-500" />
                <div>
                  <h1 className="text-lg font-semibold text-white">NestEgg - Clerk Test</h1>
                  <p className="text-sm text-gray-400">Testing signup with plans</p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <Link 
                  href="/test-clerk-login" 
                  className="text-blue-400 hover:text-blue-300 flex items-center"
                >
                  <User className="h-4 w-4 mr-2" />
                  Sign In
                </Link>
                <Link 
                  href="/signup" 
                  className="text-gray-400 hover:text-white flex items-center"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Regular Signup
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex min-h-[calc(100vh-80px)]">
          {/* Left side - Info Panel */}
          <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-gray-900 to-gray-950 p-12 flex-col justify-center">
            <div className="max-w-md">
              <h2 className="text-3xl font-bold text-white mb-6">
                Start Your Financial Journey
              </h2>
              
              <div className="space-y-4 mb-8">
                <div className="flex items-start space-x-3">
                  <div className="bg-blue-500/10 rounded-full p-2">
                    <span className="text-blue-500 font-bold">1</span>
                  </div>
                  <div>
                    <p className="text-white font-medium">Choose Your Plan</p>
                    <p className="text-gray-400 text-sm">Select the features you need</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <div className="bg-blue-500/10 rounded-full p-2">
                    <span className="text-blue-500 font-bold">2</span>
                  </div>
                  <div>
                    <p className="text-white font-medium">Create Your Account</p>
                    <p className="text-gray-400 text-sm">Sign up with email or social login</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <div className="bg-blue-500/10 rounded-full p-2">
                    <span className="text-blue-500 font-bold">3</span>
                  </div>
                  <div>
                    <p className="text-white font-medium">Start Tracking</p>
                    <p className="text-gray-400 text-sm">Add accounts and watch your wealth grow</p>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <p className="text-sm text-blue-400">
                  <strong>Test Mode:</strong> Try different options safely. Your production data is unaffected.
                </p>
              </div>
            </div>
          </div>

          {/* Right side - Dynamic Content */}
          <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
            <SignUpContent />
          </div>
        </div>
      </div>
    </ClerkProvider>
  );
}

// Skip static generation
export async function getServerSideProps() {
  return {
    props: {},
  };
}