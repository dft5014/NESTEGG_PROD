// pages/profile.js
import { useState, useEffect, useContext, useMemo } from "react";
import Link from "next/link";
import {
  SignedIn,
  SignedOut,
  useUser,
  useAuth,
  UserButton,
  UserProfile,
} from "@clerk/nextjs";
import { SubscriptionDetailsButton, useSubscription } from "@clerk/nextjs/experimental";
import { AuthContext } from "@/context/AuthContext";
import { fetchWithAuth } from "@/utils/api";
import toast from "react-hot-toast";

// DataStore hooks
import { useDataStore } from "@/store/DataStore";
import {
  usePortfolioSummary,
  useAccounts,
  useDetailedPositions,
  useSnapshots,
  useGroupedLiabilities
} from "@/store/hooks";


import {
  User,
  Calendar,
  Shield,
  CheckCircle,
  PiggyBank,
  Edit,
  Save,
  X,
  CreditCard,
  ArrowRight,
  Zap,
  Trash2,
  AlertTriangle,
  Database,
  History,
  TrendingUp,
  Wallet,
  Bitcoin,
  Gem,
  Home,
  Package,
  FileText,
  BarChart3,
} from "lucide-react";

/** ----------------------------
 *  Helpers & tiny UI atoms
 *  ---------------------------- */
const Section = ({ title, icon: Icon, children, right }) => (
  <div className="bg-gray-900/70 backdrop-blur-sm rounded-xl border border-gray-800 overflow-hidden">
    <div className="px-6 py-4 border-b border-gray-700 flex items-center justify-between">
      <h3 className="text-lg font-semibold text-gray-100 flex items-center">
        {Icon && <Icon className="h-5 w-5 mr-2 text-blue-400" />}
        {title}
      </h3>
      {right}
    </div>
    <div className="p-6">{children}</div>
  </div>
);

const LoadingScreen = () => (
  <div className="min-h-screen bg-gray-950 flex justify-center items-center">
    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500" />
  </div>
);

const InfoRow = ({ label, value }) => (
  <div className="flex justify-between">
    <span className="text-sm text-gray-400">{label}</span>
    <span className="text-sm font-medium text-gray-300">{value ?? "—"}</span>
  </div>
);

const Badge = ({ children, tone = "blue" }) => {
  const tones = {
    blue: "bg-blue-500/20 text-blue-300 border-blue-500/30",
    green: "bg-green-500/20 text-green-300 border-green-500/30",
    purple: "bg-purple-500/20 text-purple-300 border-purple-500/30",
    yellow: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
    gray: "bg-gray-500/20 text-gray-300 border-gray-500/30",
  };
  return (
    <span className={`px-3 py-1 text-sm rounded-full border ${tones[tone]}`}>{children}</span>
  );
};

export default function ProfilePage() {
  return <ProfileContent />;
}

function ProfileContent() {
  const { isSignedIn, user } = useUser();
  const { has } = useAuth();
  const { data: subscription, isLoaded: subscriptionLoaded } = useSubscription();
  const { user: ctxUser, setUser } = useContext(AuthContext);

  // Tabs - simplified for production
  const TABS = useMemo(
    () => [
      { id: "profile", label: "Profile", icon: User },
      { id: "subscription", label: "Subscription", icon: CreditCard },
      { id: "security", label: "Security", icon: Shield },
      { id: "data", label: "Manage Data", icon: Database },
    ],
    []
  );

  // Initialize DataStore
  useDataStore();

  // DataStore hooks for stats
  const { accounts } = useAccounts();
  const { positions: detailedPositions } = useDetailedPositions();
  const { liabilities, summary: liabilitySummary } = useGroupedLiabilities();
  const { dates: snapshotDates, refetch: fetchSnapshots } = useSnapshots();
  const { summary } = usePortfolioSummary();

  // Computed stats from DataStore
  const dataStats = useMemo(() => {
    const accountCount = accounts?.length || 0;
    const positionCount = detailedPositions?.length || 0;
    // Use liabilities array length, or fall back to summary count
    const liabilityCount = liabilities?.length || liabilitySummary?.unique_liabilities || 0;
    const historyDays = snapshotDates?.length || 0;

    // Count by asset type from detailed positions
    const assetTypeCounts = (detailedPositions || []).reduce((acc, pos) => {
      const type = pos.assetType || pos.item_type || 'unknown';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {});

    return {
      accountCount,
      positionCount,
      liabilityCount,
      historyDays,
      assetTypeCounts,
      securitiesCount: assetTypeCounts['security'] || 0,
      cashCount: assetTypeCounts['cash'] || 0,
      cryptoCount: assetTypeCounts['crypto'] || 0,
      metalsCount: assetTypeCounts['metal'] || 0,
      realEstateCount: assetTypeCounts['real_estate'] || 0,
      otherAssetsCount: assetTypeCounts['other_asset'] || 0,
    };
  }, [accounts, detailedPositions, liabilities, liabilitySummary, snapshotDates]);

  // Core UI state
  const [active, setActive] = useState("profile");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");

  // Profile data
  const [memberSince, setMemberSince] = useState(null);
  const [daysAsMember, setDaysAsMember] = useState(0);
  const [editMode, setEditMode] = useState(false);
  const [profileData, setProfileData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    occupation: "",
    dateOfBirth: "",
    address: "",
    city: "",
    state: "",
    zipCode: "",
    country: "",
    bio: "",
  });


  // Feature gates & plans
  const FEATURE_KEYS = [
    "ai_assistant",
    "advanced_analytics",
    "real_estate_tracking",
    "api_access",
    "priority_support",
    "unlimited_accounts",
    "csv_export",
    "historical_data",
    "custom_reports",
    "white_label",
  ];
  const PLAN_KEYS = ["free", "basic", "standard", "pro", "premium", "enterprise"];
  const [features, setFeatures] = useState({});
  const [plans, setPlans] = useState({});


  // Init
  useEffect(() => {
    if (isSignedIn && user) {
      bootstrap();
    } else {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSignedIn, user, subscriptionLoaded]);

  const bootstrap = async () => {
    setLoading(true);
    try {
      await fetchProfile();
      // Also fetch snapshots for historical data count
      fetchSnapshots?.();
      computeFeatureAccess();
    } catch (e) {
      setError(e?.message ?? "Failed to initialize profile.");
    } finally {
      setLoading(false);
    }
  };

  const computeFeatureAccess = () => {
    const f = {};
    const p = {};
    FEATURE_KEYS.forEach((key) => {
      try {
        f[key] = has({ feature: key });
      } catch {
        f[key] = false;
      }
    });
    PLAN_KEYS.forEach((key) => {
      try {
        p[key] = has({ plan: key });
      } catch {
        p[key] = false;
      }
    });
    setFeatures(f);
    setPlans(p);
  };

  const fetchProfile = async () => {
    try {
      const res = await fetchWithAuth("/user/profile");
      if (res.ok) {
        const data = await res.json();
        const created = new Date(data.created_at || user?.createdAt || Date.now());
        setMemberSince(created);
        setDaysAsMember(Math.max(1, Math.ceil((Date.now() - created.getTime()) / 86400000)));
        setProfileData({
          firstName: data.first_name || user?.firstName || "",
          lastName: data.last_name || user?.lastName || "",
          email: data.email || user?.primaryEmailAddress?.emailAddress || "",
          phone: data.phone || "",
          occupation: data.occupation || "",
          dateOfBirth: data.date_of_birth || "",
          address: data.address || "",
          city: data.city || "",
          state: data.state || "",
          zipCode: data.zip_code || "",
          country: data.country || "",
          bio: data.bio || "",
        });
        if (data.notification_preferences) setNotifications(data.notification_preferences);
      } else {
        // fallback to Clerk
        setProfileData({
          firstName: user?.firstName || "",
          lastName: user?.lastName || "",
          email: user?.primaryEmailAddress?.emailAddress || "",
          phone: "",
          occupation: "",
          dateOfBirth: "",
          address: "",
          city: "",
          state: "",
          zipCode: "",
          country: "",
          bio: "",
        });
        const created = new Date(user?.createdAt || Date.now());
        setMemberSince(created);
        setDaysAsMember(Math.max(1, Math.ceil((Date.now() - created.getTime()) / 86400000)));
      }
    } catch (e) {
      setError("Failed to load profile data.");
    }
  };


  const membershipBadge = () => {
    let label = "New Egg";
    let tone = "green";
    if (daysAsMember > 365) (label = "Golden Egg"), (tone = "yellow");
    else if (daysAsMember > 180) (label = "Silver Egg"), (tone = "gray");
    else if (daysAsMember > 90) (label = "Bronze Egg"), (tone = "purple");
    else if (daysAsMember > 30) (label = "Nest Builder"), (tone = "blue");
    return <Badge tone={tone}>{label}</Badge>;
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setOk("");
    try {
      const payload = {
        first_name: profileData.firstName,
        last_name: profileData.lastName,
        phone: profileData.phone,
        occupation: profileData.occupation,
        date_of_birth: profileData.dateOfBirth || null,
        address: profileData.address,
        city: profileData.city,
        state: profileData.state,
        zip_code: profileData.zipCode,
        country: profileData.country,
        bio: profileData.bio,
      };
      const res = await fetchWithAuth("/user/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.detail || `Failed (${res.status})`);
      }
      const updated = await res.json();
      if (setUser && ctxUser) {
        setUser({ ...ctxUser, ...updated });
      }
      setOk("Profile updated!");
      setEditMode(false);
    } catch (e) {
      setError(e.message || "Update failed.");
    } finally {
      setSaving(false);
      setTimeout(() => setOk(""), 3000);
    }
  };


  const currentPlan = () => {
    const activeByHas = Object.entries(plans).find(([, val]) => val)?.[0];
    return subscription?.plan?.name || activeByHas || "free";
  };

  if (loading) return <LoadingScreen />;

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <div className="max-w-7xl mx-auto p-6 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">My Profile</h1>
            <p className="text-gray-400 mt-1">
              Manage your NestEgg account, subscription, security, and settings
            </p>
          </div>
          <div className="flex items-center gap-4">
            <SignedIn>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-sm text-gray-300">{user?.fullName}</p>
                  <p className="text-xs text-gray-500">{user?.primaryEmailAddress?.emailAddress}</p>
                </div>
                <UserButton
                  showName={false}
                  afterSignOutUrl="/"
                  appearance={{
                    baseTheme: "dark",
                    elements: {
                      userButtonAvatarBox: "w-10 h-10",
                      userButtonPopoverCard: "bg-gray-900 border border-gray-800",
                      userButtonPopoverActionButton: "text-gray-100 hover:bg-gray-800",
                    },
                  }}
                />
              </div>
            </SignedIn>
            <Link
              href="/portfolio"
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors inline-flex items-center"
            >
              <span>Back to Portfolio</span>
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </div>
        </div>

        {/* Alerts */}
        <SignedIn>
          {ok && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-center text-green-700">
              <CheckCircle className="h-5 w-5 mr-2" />
              {ok}
            </div>
          )}
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center text-red-700">
              <X className="h-5 w-5 mr-2" />
              {error}
            </div>
          )}
        </SignedIn>

        <SignedOut>
          <div className="p-8 border border-gray-800 rounded-xl bg-gray-900/50 backdrop-blur-sm text-center">
            <h2 className="text-2xl font-semibold mb-4">Please Sign In</h2>
            <p className="text-gray-400 mb-6">You need to be signed in to view and manage your profile</p>
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
          {/* Tabs */}
          <div className="border-b border-gray-800">
            <nav className="flex flex-wrap gap-6">
              {TABS.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setActive(id)}
                  className={`pb-4 px-1 flex items-center transition-colors ${
                    active === id
                      ? "border-b-2 border-blue-500 text-blue-400"
                      : "border-b-2 border-transparent text-gray-500 hover:text-gray-300 hover:border-gray-700"
                  }`}
                >
                  <Icon className="h-5 w-5 mr-2" />
                  {label}
                </button>
              ))}
            </nav>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Sidebar */}
            <aside className="lg:col-span-1 space-y-6">
              <div className="bg-gray-900/70 rounded-xl border border-gray-800 overflow-hidden">
                <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-6 text-white">
                  <div className="flex items-center justify-center">
                    <div className="w-24 h-24 rounded-full bg-white text-indigo-600 flex items-center justify-center text-3xl font-bold">
                      {profileData.firstName && profileData.lastName
                        ? `${profileData.firstName[0]}${profileData.lastName[0]}`
                        : profileData.email
                        ? profileData.email[0].toUpperCase()
                        : "N"}
                    </div>
                  </div>
                  <h2 className="mt-4 text-xl font-bold text-center">
                    {profileData.firstName && profileData.lastName
                      ? `${profileData.firstName} ${profileData.lastName}`
                      : profileData.email || "NestEgg User"}
                  </h2>
                  <p className="text-sm text-blue-100 text-center">{profileData.email}</p>
                </div>
                <div className="p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-400">Membership Status</span>
                    {membershipBadge()}
                  </div>
                  <div className="flex items-center">
                    <Calendar className="h-5 w-5 text-gray-400 mr-3" />
                    <div>
                      <p className="text-sm font-medium text-gray-300">Member Since</p>
                      <p className="text-sm text-gray-500">
                        {memberSince ? new Date(memberSince).toLocaleDateString() : "N/A"} ({daysAsMember} days)
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <Shield className="h-5 w-5 text-gray-400 mr-3" />
                    <div>
                      <p className="text-sm font-medium text-gray-300">Current Plan</p>
                      <p className="text-sm text-gray-500 capitalize">{currentPlan()} Plan</p>
                    </div>
                  </div>
                </div>
              </div>

              <Section title="Your Data" icon={BarChart3}>
                <div className="space-y-3">
                  <InfoRow label="Accounts" value={dataStats.accountCount} />
                  <InfoRow label="Positions" value={dataStats.positionCount} />
                  <InfoRow label="Liabilities" value={dataStats.liabilityCount} />
                  <InfoRow label="History Days" value={dataStats.historyDays > 0 ? `${dataStats.historyDays} snapshots` : "No history"} />
                </div>
                {dataStats.positionCount > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-700">
                    <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">By Type</p>
                    <div className="space-y-2 text-xs">
                      {dataStats.securitiesCount > 0 && (
                        <div className="flex justify-between text-gray-400">
                          <span>Securities</span>
                          <span className="text-gray-300">{dataStats.securitiesCount}</span>
                        </div>
                      )}
                      {dataStats.cashCount > 0 && (
                        <div className="flex justify-between text-gray-400">
                          <span>Cash</span>
                          <span className="text-gray-300">{dataStats.cashCount}</span>
                        </div>
                      )}
                      {dataStats.cryptoCount > 0 && (
                        <div className="flex justify-between text-gray-400">
                          <span>Crypto</span>
                          <span className="text-gray-300">{dataStats.cryptoCount}</span>
                        </div>
                      )}
                      {dataStats.metalsCount > 0 && (
                        <div className="flex justify-between text-gray-400">
                          <span>Metals</span>
                          <span className="text-gray-300">{dataStats.metalsCount}</span>
                        </div>
                      )}
                      {dataStats.realEstateCount > 0 && (
                        <div className="flex justify-between text-gray-400">
                          <span>Real Estate</span>
                          <span className="text-gray-300">{dataStats.realEstateCount}</span>
                        </div>
                      )}
                      {dataStats.otherAssetsCount > 0 && (
                        <div className="flex justify-between text-gray-400">
                          <span>Other</span>
                          <span className="text-gray-300">{dataStats.otherAssetsCount}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </Section>
            </aside>

            {/* Main */}
            <main className="lg:col-span-3 space-y-6">
              {/* PROFILE */}
              {active === "profile" && (
                <Section
                  title="Personal Information"
                  icon={User}
                  right={
                    <button
                      onClick={() => setEditMode((v) => !v)}
                      className="text-blue-400 hover:text-blue-300 flex items-center transition-colors"
                    >
                      {editMode ? (
                        <>
                          <X className="h-4 w-4 mr-1" />
                          Cancel
                        </>
                      ) : (
                        <>
                          <Edit className="h-4 w-4 mr-1" />
                          Edit
                        </>
                      )}
                    </button>
                  }
                >
                  <form onSubmit={handleSaveProfile} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <Field
                        label="First Name"
                        value={profileData.firstName}
                        onChange={(v) => setProfileData({ ...profileData, firstName: v })}
                        disabled={!editMode}
                      />
                      <Field
                        label="Last Name"
                        value={profileData.lastName}
                        onChange={(v) => setProfileData({ ...profileData, lastName: v })}
                        disabled={!editMode}
                      />
                      <Field label="Email" value={profileData.email} disabled />
                      <Field
                        label="Phone"
                        value={profileData.phone}
                        onChange={(v) => setProfileData({ ...profileData, phone: v })}
                        disabled={!editMode}
                      />
                      <Field
                        label="Occupation"
                        value={profileData.occupation}
                        onChange={(v) => setProfileData({ ...profileData, occupation: v })}
                        disabled={!editMode}
                      />
                      <Field
                        label="Date of Birth"
                        type="date"
                        value={profileData.dateOfBirth || ""}
                        onChange={(v) => setProfileData({ ...profileData, dateOfBirth: v })}
                        disabled={!editMode}
                      />
                    </div>

                    <Field
                      label="Address"
                      value={profileData.address}
                      onChange={(v) => setProfileData({ ...profileData, address: v })}
                      disabled={!editMode}
                    />
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <Field
                        label="City"
                        value={profileData.city}
                        onChange={(v) => setProfileData({ ...profileData, city: v })}
                        disabled={!editMode}
                      />
                      <Field
                        label="State"
                        value={profileData.state}
                        onChange={(v) => setProfileData({ ...profileData, state: v })}
                        disabled={!editMode}
                      />
                      <Field
                        label="Zip Code"
                        value={profileData.zipCode}
                        onChange={(v) => setProfileData({ ...profileData, zipCode: v })}
                        disabled={!editMode}
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <Field
                        label="Country"
                        value={profileData.country}
                        onChange={(v) => setProfileData({ ...profileData, country: v })}
                        disabled={!editMode}
                      />
                    </div>
                    <Field
                      label="Bio / About Me"
                      type="textarea"
                      value={profileData.bio}
                      onChange={(v) => setProfileData({ ...profileData, bio: v })}
                      disabled={!editMode}
                    />

                    {editMode && (
                      <div className="flex justify-end">
                        <button
                          type="submit"
                          disabled={saving}
                          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 inline-flex items-center disabled:bg-blue-400"
                        >
                          {saving ? (
                            <>
                              <span className="animate-spin h-4 w-4 mr-2 border-2 border-t-transparent border-white rounded-full" />
                              Saving...
                            </>
                          ) : (
                            <>
                              <Save className="h-4 w-4 mr-2" />
                              Save Changes
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </form>
                </Section>
              )}

              {/* SUBSCRIPTION & BILLING */}
              {active === "subscription" && (
                <>
                  <Section
                    title="Current Subscription"
                    icon={CreditCard}
                    right={
                      <Badge tone={["premium", "enterprise"].some((p) => currentPlan().includes(p)) ? "purple" : ["pro", "standard"].some((p) => currentPlan().includes(p)) ? "blue" : "green"}>
                        {currentPlan().charAt(0).toUpperCase() + currentPlan().slice(1)}
                      </Badge>
                    }
                  >
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
                      <StatBox label="Status" value={subscription?.status || "active"} />
                      <StatBox
                        label="Amount"
                        value={
                          subscription?.amount
                            ? `$${(subscription.amount / 100).toFixed(2)} / ${subscription?.interval ?? "period"}`
                            : "$0"
                        }
                      />
                      <StatBox label="Billing Cycle" value={subscription?.interval || "—"} />
                      <StatBox
                        label="Next Payment"
                        value={subscription?.currentPeriodEnd ? new Date(subscription.currentPeriodEnd).toLocaleDateString() : "—"}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-gray-400 flex items-center">
                        <Zap className="h-4 w-4 mr-2 text-blue-400" />
                        Managed by Clerk Billing
                      </div>
                      <div className="flex gap-3">
                        <SubscriptionDetailsButton>
                          <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors">
                            Manage Subscription
                          </button>
                        </SubscriptionDetailsButton>
                        <SubscriptionDetailsButton for="user">
                          <button className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm transition-colors">
                            Billing Details
                          </button>
                        </SubscriptionDetailsButton>
                      </div>
                    </div>
                  </Section>
                </>
              )}

              {/* SECURITY (Clerk-managed UI inline) */}
              {active === "security" && (
                <Section title="Security & Account" icon={Shield}>
                  <p className="text-sm text-gray-400 mb-4">
                    Authentication, passwords, MFA, emails, connected accounts, and danger zone are managed by Clerk.
                  </p>
                  {/* Embed Clerk’s fully-featured UserProfile inside this section */}
                  <div className="rounded-lg border border-gray-800 overflow-hidden">
                    <UserProfile
                      appearance={{
                        baseTheme: "dark",
                        variables: {
                          colorBackground: "#0b1220",
                          colorText: "#e5e7eb",
                          colorInputBackground: "#111827",
                          colorInputText: "#e5e7eb",
                          colorPrimary: "#3b82f6",
                        },
                        elements: {
                          card: "bg-gray-900 border-gray-800",
                          navbar: "bg-gray-900 border-b border-gray-800",
                          headerTitle: "text-white",
                          formButtonPrimary: "bg-blue-600 hover:bg-blue-700",
                        },
                      }}
                      routing="hash"
                    />
                  </div>
                </Section>
              )}

              {/* MANAGE DATA */}
              {active === "data" && (
                <ManageDataSection
                  dataStats={dataStats}
                  onDataDeleted={() => {
                    // DataStore will auto-refresh when data changes
                    // You can add additional refresh logic here if needed
                  }}
                />
              )}
            </main>
          </div>
        </SignedIn>
      </div>
    </div>
  );
}

/** ------- Small presentational components ------- */
function Field({ label, value, onChange, disabled, type = "text" }) {
  const base =
    "w-full px-3 py-2 border rounded-md bg-gray-800 text-gray-100 disabled:text-gray-400 disabled:bg-gray-800/50";
  if (type === "textarea") {
    return (
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">{label}</label>
        <textarea
          rows={4}
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          disabled={disabled}
          className={`${base} ${disabled ? "border-gray-700" : "border-gray-600 focus:border-blue-500"}`}
        />
      </div>
    );
  }
  return (
    <div>
      <label className="block text-sm font-medium text-gray-300 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        disabled={disabled}
        className={`${base} ${disabled ? "border-gray-700" : "border-gray-600 focus:border-blue-500"}`}
      />
    </div>
  );
}

function StatBox({ label, value }) {
  return (
    <div className="bg-gray-800/50 p-4 rounded-lg">
      <p className="text-gray-400 text-sm">{label}</p>
      <p className="text-lg font-medium text-gray-100">{value}</p>
    </div>
  );
}


/** ------- Manage Data Section ------- */
const POSITION_TYPES = [
  { id: "securities", label: "Securities", icon: TrendingUp, description: "Stocks, ETFs, mutual funds, bonds" },
  { id: "cash", label: "Cash Positions", icon: Wallet, description: "Bank accounts, savings, money market" },
  { id: "crypto", label: "Cryptocurrency", icon: Bitcoin, description: "Bitcoin, Ethereum, and other crypto" },
  { id: "metals", label: "Precious Metals", icon: Gem, description: "Gold, silver, platinum holdings" },
  { id: "realestate", label: "Real Estate", icon: Home, description: "Properties and real estate assets" },
  { id: "otherassets", label: "Other Assets", icon: Package, description: "Vehicles, collectibles, other assets" },
  { id: "liabilities", label: "Liabilities", icon: FileText, description: "Loans, credit cards, mortgages" },
];

function ManageDataSection({ dataStats, onDataDeleted }) {
  const [deleteModal, setDeleteModal] = useState(null); // null | 'positions' | 'accounts' | 'history'

  return (
    <div className="space-y-6">
      {/* Warning Banner */}
      <div className="bg-amber-900/20 border border-amber-700/50 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="text-amber-300 font-medium">Data Management Zone</h4>
            <p className="text-amber-200/70 text-sm mt-1">
              Actions in this section can permanently delete your financial data. Please proceed with caution.
              Deleted data cannot be recovered.
            </p>
          </div>
        </div>
      </div>

      {/* Current Data Summary */}
      <div className="bg-gray-900/70 backdrop-blur-sm rounded-xl border border-gray-800 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-700">
          <h3 className="text-lg font-semibold text-gray-100 flex items-center">
            <Database className="h-5 w-5 mr-2 text-blue-400" />
            Your Data Summary
          </h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gray-800/50 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-gray-100">{dataStats?.accountCount ?? 0}</p>
              <p className="text-sm text-gray-400">Accounts</p>
            </div>
            <div className="bg-gray-800/50 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-gray-100">{dataStats?.positionCount ?? 0}</p>
              <p className="text-sm text-gray-400">Positions</p>
            </div>
            <div className="bg-gray-800/50 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-gray-100">{dataStats?.liabilityCount ?? 0}</p>
              <p className="text-sm text-gray-400">Liabilities</p>
            </div>
            <div className="bg-gray-800/50 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-gray-100">{dataStats?.historyDays ?? 0}</p>
              <p className="text-sm text-gray-400">History Days</p>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Positions Section */}
      <div className="bg-gray-900/70 backdrop-blur-sm rounded-xl border border-gray-800 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-700">
          <h3 className="text-lg font-semibold text-gray-100 flex items-center">
            <Trash2 className="h-5 w-5 mr-2 text-red-400" />
            Delete Positions
          </h3>
        </div>
        <div className="p-6">
          <p className="text-sm text-gray-400 mb-4">
            Selectively delete positions by type. This will remove the selected position data but keep your accounts intact.
          </p>
          <button
            onClick={() => setDeleteModal("positions")}
            className="px-4 py-2 bg-red-600/20 border border-red-600/50 text-red-400 rounded-lg hover:bg-red-600/30 transition-colors inline-flex items-center"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete Positions...
          </button>
        </div>
      </div>

      {/* Delete All Accounts Section */}
      <div className="bg-gray-900/70 backdrop-blur-sm rounded-xl border border-gray-800 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-700">
          <h3 className="text-lg font-semibold text-gray-100 flex items-center">
            <Trash2 className="h-5 w-5 mr-2 text-red-400" />
            Delete All Accounts
          </h3>
        </div>
        <div className="p-6">
          <p className="text-sm text-gray-400 mb-4">
            Delete all your accounts and their associated positions. This is a destructive action that will remove all your financial tracking data.
          </p>
          <button
            onClick={() => setDeleteModal("accounts")}
            className="px-4 py-2 bg-red-600/20 border border-red-600/50 text-red-400 rounded-lg hover:bg-red-600/30 transition-colors inline-flex items-center"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete All Accounts...
          </button>
        </div>
      </div>

      {/* Delete Historical Balances Section */}
      <div className="bg-gray-900/70 backdrop-blur-sm rounded-xl border border-gray-800 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-700">
          <h3 className="text-lg font-semibold text-gray-100 flex items-center">
            <History className="h-5 w-5 mr-2 text-red-400" />
            Delete Historical Data
          </h3>
        </div>
        <div className="p-6">
          <p className="text-sm text-gray-400 mb-4">
            Delete all historical portfolio snapshots and balance history. Your current positions and accounts will remain intact, but you will lose the ability to view historical trends and performance.
          </p>
          <button
            onClick={() => setDeleteModal("history")}
            className="px-4 py-2 bg-red-600/20 border border-red-600/50 text-red-400 rounded-lg hover:bg-red-600/30 transition-colors inline-flex items-center"
          >
            <History className="h-4 w-4 mr-2" />
            Delete Historical Data...
          </button>
        </div>
      </div>

      {/* Delete Modals */}
      {deleteModal === "positions" && (
        <DeletePositionsModal
          onClose={() => setDeleteModal(null)}
          onConfirm={async (selectedTypes) => {
            try {
              const res = await fetchWithAuth("/user/data/positions", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ position_types: selectedTypes }),
              });
              if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err?.detail || `Failed to delete positions (${res.status})`);
              }
              const result = await res.json();
              toast.success(result.message || `Successfully deleted positions for: ${selectedTypes.join(", ")}`);
              setDeleteModal(null);
              onDataDeleted?.();
            } catch (e) {
              toast.error(e.message || "Failed to delete positions");
              throw e;
            }
          }}
        />
      )}

      {deleteModal === "accounts" && (
        <DeleteAccountsModal
          onClose={() => setDeleteModal(null)}
          onConfirm={async (includePositions) => {
            try {
              const res = await fetchWithAuth("/user/data/accounts", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ include_positions: includePositions }),
              });
              if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err?.detail || `Failed to delete accounts (${res.status})`);
              }
              const result = await res.json();
              toast.success(result.message || "Successfully deleted all accounts");
              setDeleteModal(null);
              onDataDeleted?.();
            } catch (e) {
              toast.error(e.message || "Failed to delete accounts");
              throw e;
            }
          }}
        />
      )}

      {deleteModal === "history" && (
        <DeleteHistoryModal
          onClose={() => setDeleteModal(null)}
          onConfirm={async () => {
            try {
              const res = await fetchWithAuth("/user/data/history", {
                method: "DELETE",
              });
              if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err?.detail || `Failed to delete historical data (${res.status})`);
              }
              const result = await res.json();
              toast.success(result.message || "Successfully deleted historical data");
              setDeleteModal(null);
              onDataDeleted?.();
            } catch (e) {
              toast.error(e.message || "Failed to delete historical data");
              throw e;
            }
          }}
        />
      )}
    </div>
  );
}

/** ------- Delete Positions Modal ------- */
function DeletePositionsModal({ onClose, onConfirm }) {
  const [step, setStep] = useState(1); // 1: Select types, 2: Confirm, 3: Final confirmation
  const [selectedTypes, setSelectedTypes] = useState([]);
  const [confirmText, setConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const toggleType = (typeId) => {
    setSelectedTypes((prev) =>
      prev.includes(typeId) ? prev.filter((t) => t !== typeId) : [...prev, typeId]
    );
  };

  const handleFinalConfirm = async () => {
    if (confirmText !== "DELETE MY DATA") return;
    setIsDeleting(true);
    try {
      await onConfirm(selectedTypes);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-gray-900 border border-gray-700 rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-700 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-100 flex items-center">
            <Trash2 className="h-5 w-5 mr-2 text-red-400" />
            Delete Positions
          </h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-400" />
          </button>
        </div>

        {/* Step Indicator */}
        <div className="px-6 pt-4">
          <div className="flex items-center justify-center gap-2 mb-4">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                  step === s
                    ? "bg-red-600 text-white"
                    : step > s
                    ? "bg-red-600/30 text-red-300"
                    : "bg-gray-700 text-gray-400"
                }`}
              >
                {s}
              </div>
            ))}
          </div>
        </div>

        {/* Step 1: Select Position Types */}
        {step === 1 && (
          <div className="p-6">
            <p className="text-gray-300 mb-4">
              Select which position types you want to delete. You can select multiple types.
            </p>
            <div className="space-y-2">
              {POSITION_TYPES.map(({ id, label, icon: Icon, description }) => (
                <label
                  key={id}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedTypes.includes(id)
                      ? "bg-red-600/20 border-red-600/50"
                      : "bg-gray-800/50 border-gray-700 hover:border-gray-600"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedTypes.includes(id)}
                    onChange={() => toggleType(id)}
                    className="sr-only"
                  />
                  <div
                    className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                      selectedTypes.includes(id)
                        ? "bg-red-600 border-red-600"
                        : "border-gray-500"
                    }`}
                  >
                    {selectedTypes.includes(id) && (
                      <CheckCircle className="h-3 w-3 text-white" />
                    )}
                  </div>
                  <Icon className={`h-5 w-5 ${selectedTypes.includes(id) ? "text-red-400" : "text-gray-400"}`} />
                  <div className="flex-1">
                    <p className="text-gray-200 font-medium">{label}</p>
                    <p className="text-xs text-gray-500">{description}</p>
                  </div>
                </label>
              ))}
            </div>
            <div className="mt-6 flex justify-between">
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-700 text-gray-200 rounded-lg hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => setStep(2)}
                disabled={selectedTypes.length === 0}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Review Selection */}
        {step === 2 && (
          <div className="p-6">
            <div className="bg-red-900/20 border border-red-700/50 rounded-lg p-4 mb-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-red-300 font-medium">Warning: Destructive Action</h4>
                  <p className="text-red-200/70 text-sm mt-1">
                    You are about to permanently delete the following position types. This action cannot be undone.
                  </p>
                </div>
              </div>
            </div>
            <p className="text-gray-300 mb-3">Position types to be deleted:</p>
            <ul className="space-y-2 mb-6">
              {selectedTypes.map((typeId) => {
                const type = POSITION_TYPES.find((t) => t.id === typeId);
                const Icon = type?.icon || Package;
                return (
                  <li key={typeId} className="flex items-center gap-2 text-red-300">
                    <Icon className="h-4 w-4" />
                    <span>{type?.label || typeId}</span>
                  </li>
                );
              })}
            </ul>
            <div className="mt-6 flex justify-between">
              <button
                onClick={() => setStep(1)}
                className="px-4 py-2 bg-gray-700 text-gray-200 rounded-lg hover:bg-gray-600 transition-colors"
              >
                Back
              </button>
              <button
                onClick={() => setStep(3)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                I Understand, Continue
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Final Confirmation */}
        {step === 3 && (
          <div className="p-6">
            <div className="bg-red-900/30 border border-red-700/50 rounded-lg p-4 mb-4">
              <p className="text-red-300 text-sm">
                To confirm deletion, type <span className="font-mono font-bold">DELETE MY DATA</span> below:
              </p>
            </div>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="Type DELETE MY DATA to confirm"
              className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:border-red-500"
            />
            <div className="mt-6 flex justify-between">
              <button
                onClick={() => setStep(2)}
                disabled={isDeleting}
                className="px-4 py-2 bg-gray-700 text-gray-200 rounded-lg hover:bg-gray-600 transition-colors disabled:opacity-50"
              >
                Back
              </button>
              <button
                onClick={handleFinalConfirm}
                disabled={confirmText !== "DELETE MY DATA" || isDeleting}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center"
              >
                {isDeleting ? (
                  <>
                    <span className="animate-spin h-4 w-4 mr-2 border-2 border-t-transparent border-white rounded-full" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Selected Positions
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/** ------- Delete Accounts Modal ------- */
function DeleteAccountsModal({ onClose, onConfirm }) {
  const [step, setStep] = useState(1); // 1: Warning, 2: Confirm checkbox, 3: Final confirmation
  const [understood, setUnderstood] = useState(false);
  const [deletePositions, setDeletePositions] = useState(true);
  const [confirmText, setConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const handleFinalConfirm = async () => {
    if (confirmText !== "DELETE ALL ACCOUNTS") return;
    setIsDeleting(true);
    try {
      await onConfirm(deletePositions);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-gray-900 border border-gray-700 rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-700 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-100 flex items-center">
            <Trash2 className="h-5 w-5 mr-2 text-red-400" />
            Delete All Accounts
          </h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-400" />
          </button>
        </div>

        {/* Step Indicator */}
        <div className="px-6 pt-4">
          <div className="flex items-center justify-center gap-2 mb-4">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                  step === s
                    ? "bg-red-600 text-white"
                    : step > s
                    ? "bg-red-600/30 text-red-300"
                    : "bg-gray-700 text-gray-400"
                }`}
              >
                {s}
              </div>
            ))}
          </div>
        </div>

        {/* Step 1: Warning */}
        {step === 1 && (
          <div className="p-6">
            <div className="bg-red-900/30 border border-red-700/50 rounded-lg p-4 mb-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-6 w-6 text-red-400 flex-shrink-0" />
                <div>
                  <h4 className="text-red-300 font-bold text-lg">Danger Zone</h4>
                  <p className="text-red-200/80 text-sm mt-2">
                    You are about to delete <strong>ALL</strong> of your accounts. This is an extremely destructive action that will:
                  </p>
                  <ul className="text-red-200/70 text-sm mt-2 space-y-1 list-disc list-inside">
                    <li>Remove all your financial accounts</li>
                    <li>Delete all associated positions (securities, cash, crypto, etc.)</li>
                    <li>Remove all account-level tracking data</li>
                  </ul>
                  <p className="text-red-300 text-sm mt-3 font-medium">
                    This action CANNOT be undone.
                  </p>
                </div>
              </div>
            </div>
            <div className="mt-6 flex justify-between">
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-700 text-gray-200 rounded-lg hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => setStep(2)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                I Understand the Risks
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Confirm understanding */}
        {step === 2 && (
          <div className="p-6">
            <p className="text-gray-300 mb-4">
              Please confirm you understand what will be deleted:
            </p>
            <label className="flex items-start gap-3 p-4 rounded-lg border border-gray-700 bg-gray-800/50 cursor-pointer mb-4">
              <input
                type="checkbox"
                checked={understood}
                onChange={(e) => setUnderstood(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-gray-500 text-red-600 focus:ring-red-500"
              />
              <div>
                <p className="text-gray-200 font-medium">I understand this will delete all my accounts</p>
                <p className="text-sm text-gray-400 mt-1">
                  All accounts and their associated data will be permanently removed from NestEgg.
                </p>
              </div>
            </label>

            <label className="flex items-start gap-3 p-4 rounded-lg border border-gray-700 bg-gray-800/50 cursor-pointer">
              <input
                type="checkbox"
                checked={deletePositions}
                onChange={(e) => setDeletePositions(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-gray-500 text-red-600 focus:ring-red-500"
              />
              <div>
                <p className="text-gray-200 font-medium">Also delete all positions</p>
                <p className="text-sm text-gray-400 mt-1">
                  Include all securities, cash, crypto, metals, real estate, and other asset positions.
                </p>
              </div>
            </label>

            <div className="mt-6 flex justify-between">
              <button
                onClick={() => setStep(1)}
                className="px-4 py-2 bg-gray-700 text-gray-200 rounded-lg hover:bg-gray-600 transition-colors"
              >
                Back
              </button>
              <button
                onClick={() => setStep(3)}
                disabled={!understood}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Final Confirmation */}
        {step === 3 && (
          <div className="p-6">
            <div className="bg-red-900/30 border border-red-700/50 rounded-lg p-4 mb-4">
              <p className="text-red-300 text-sm">
                To confirm deletion, type <span className="font-mono font-bold">DELETE ALL ACCOUNTS</span> below:
              </p>
            </div>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="Type DELETE ALL ACCOUNTS to confirm"
              className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:border-red-500"
            />
            <div className="mt-6 flex justify-between">
              <button
                onClick={() => setStep(2)}
                disabled={isDeleting}
                className="px-4 py-2 bg-gray-700 text-gray-200 rounded-lg hover:bg-gray-600 transition-colors disabled:opacity-50"
              >
                Back
              </button>
              <button
                onClick={handleFinalConfirm}
                disabled={confirmText !== "DELETE ALL ACCOUNTS" || isDeleting}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center"
              >
                {isDeleting ? (
                  <>
                    <span className="animate-spin h-4 w-4 mr-2 border-2 border-t-transparent border-white rounded-full" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete All Accounts
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/** ------- Delete History Modal ------- */
function DeleteHistoryModal({ onClose, onConfirm }) {
  const [step, setStep] = useState(1); // 1: Info, 2: Final confirmation
  const [confirmText, setConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const handleFinalConfirm = async () => {
    if (confirmText !== "DELETE HISTORY") return;
    setIsDeleting(true);
    try {
      await onConfirm();
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-gray-900 border border-gray-700 rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-700 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-100 flex items-center">
            <History className="h-5 w-5 mr-2 text-red-400" />
            Delete Historical Data
          </h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-400" />
          </button>
        </div>

        {/* Step Indicator */}
        <div className="px-6 pt-4">
          <div className="flex items-center justify-center gap-2 mb-4">
            {[1, 2].map((s) => (
              <div
                key={s}
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                  step === s
                    ? "bg-red-600 text-white"
                    : step > s
                    ? "bg-red-600/30 text-red-300"
                    : "bg-gray-700 text-gray-400"
                }`}
              >
                {s}
              </div>
            ))}
          </div>
        </div>

        {/* Step 1: Info */}
        {step === 1 && (
          <div className="p-6">
            <div className="bg-amber-900/20 border border-amber-700/50 rounded-lg p-4 mb-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-amber-300 font-medium">What will be deleted</h4>
                  <p className="text-amber-200/70 text-sm mt-1">
                    This will remove all historical portfolio snapshots and balance tracking data. This includes:
                  </p>
                  <ul className="text-amber-200/70 text-sm mt-2 space-y-1 list-disc list-inside">
                    <li>Daily portfolio snapshots</li>
                    <li>Historical net worth data</li>
                    <li>Performance trend history</li>
                    <li>All charts showing historical data</li>
                  </ul>
                </div>
              </div>
            </div>
            <div className="bg-blue-900/20 border border-blue-700/50 rounded-lg p-4 mb-4">
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-blue-300 font-medium">What will be preserved</h4>
                  <ul className="text-blue-200/70 text-sm mt-1 space-y-1 list-disc list-inside">
                    <li>All your accounts</li>
                    <li>All current positions</li>
                    <li>All liabilities</li>
                    <li>Your profile and settings</li>
                  </ul>
                </div>
              </div>
            </div>
            <div className="mt-6 flex justify-between">
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-700 text-gray-200 rounded-lg hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => setStep(2)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Final Confirmation */}
        {step === 2 && (
          <div className="p-6">
            <div className="bg-red-900/30 border border-red-700/50 rounded-lg p-4 mb-4">
              <p className="text-red-300 text-sm">
                To confirm deletion, type <span className="font-mono font-bold">DELETE HISTORY</span> below:
              </p>
            </div>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="Type DELETE HISTORY to confirm"
              className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:border-red-500"
            />
            <div className="mt-6 flex justify-between">
              <button
                onClick={() => setStep(1)}
                disabled={isDeleting}
                className="px-4 py-2 bg-gray-700 text-gray-200 rounded-lg hover:bg-gray-600 transition-colors disabled:opacity-50"
              >
                Back
              </button>
              <button
                onClick={handleFinalConfirm}
                disabled={confirmText !== "DELETE HISTORY" || isDeleting}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center"
              >
                {isDeleting ? (
                  <>
                    <span className="animate-spin h-4 w-4 mr-2 border-2 border-t-transparent border-white rounded-full" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <History className="h-4 w-4 mr-2" />
                    Delete Historical Data
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
