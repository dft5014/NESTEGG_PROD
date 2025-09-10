// pages/billing.js
import { ClerkProvider, SignedIn, SignedOut, useUser } from "@clerk/nextjs";
import { SubscriptionDetailsButton } from "@clerk/nextjs/experimental"; // Clerk Billing button
import { useSubscription } from "@clerk/nextjs/experimental";
import Link from "next/link";
import { useEffect } from "react";

export default function BillingPage() {
  return (
    <ClerkProvider publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY} appearance={{ baseTheme: "dark" }}>
      <Content />
    </ClerkProvider>
  );
}

function Content() {
  const { isSignedIn } = useUser();

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <div className="max-w-3xl mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Billing</h1>
          <Link href="/test-clerk-dashboard" className="text-blue-400 hover:text-blue-300">Back to dashboard</Link>
        </div>

        <SignedOut>
          <div className="p-6 border border-gray-800 rounded-xl bg-gray-900">
            Please sign in to manage your subscription.
          </div>
        </SignedOut>

        <SignedIn>
          <PlanCard />
          <Actions />
        </SignedIn>
      </div>
    </div>
  );
}

function PlanCard() {
  const { data: subscription, isLoaded, isLoading, error } = useSubscription();

  useEffect(() => {
    console.groupCollapsed("[Billing] useSubscription");
    console.log("loaded:", isLoaded, "loading:", isLoading, "error:", error);
    console.log("subscription:", subscription);
    console.groupEnd();
  }, [subscription, isLoaded, isLoading, error]);

  if (isLoading || !isLoaded) {
    return <div className="p-6 border border-gray-800 rounded-xl bg-gray-900">Loading subscription…</div>;
  }
  if (error) {
    return <div className="p-6 border border-gray-800 rounded-xl bg-gray-900 text-red-400">
      Failed to load subscription: {String(error?.message || error)}
    </div>;
  }

  const status = subscription?.status ?? "none";
  const planName = subscription?.plan?.name || subscription?.plan?.id || "Free";
  const renewsAt = subscription?.currentPeriodEnd
    ? new Date(subscription.currentPeriodEnd).toLocaleString()
    : "—";

  return (
    <div className="p-6 border border-gray-800 rounded-xl bg-gray-900">
      <h2 className="text-lg font-semibold mb-3">Current plan</h2>
      <div className="space-y-1 text-sm">
        <div><b>Plan:</b> {planName}</div>
        <div><b>Status:</b> {status}</div>
        <div><b>Renews:</b> {renewsAt}</div>
      </div>
      <div className="mt-3 text-xs text-gray-400">
        (Server will sync to Supabase via Clerk billing webhooks.)
      </div>
    </div>
  );
}

function Actions() {
  return (
    <div className="p-6 border border-gray-800 rounded-xl bg-gray-900">
      <h2 className="text-lg font-semibold mb-4">Manage</h2>

      {/* Opens Clerk’s subscription drawer with upgrade/downgrade, cancel, payment methods, etc. */}
      <SubscriptionDetailsButton>
        <button className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-700">
          Open Subscription Details
        </button>
      </SubscriptionDetailsButton>
    </div>
  );
}
