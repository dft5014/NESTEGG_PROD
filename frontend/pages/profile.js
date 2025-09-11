// pages/profile.js
import { useState, useEffect, useContext } from "react";
import { SignedIn, SignedOut, useUser, UserButton, PricingTable, Protect, useAuth } from "@clerk/nextjs";
import { SubscriptionDetailsButton, useSubscription } from "@clerk/nextjs/experimental";
import { AuthContext } from "@/context/AuthContext";
import { fetchWithAuth } from "@/utils/api";
import Link from "next/link";
import { 
  User, 
  Mail, 
  Calendar, 
  Shield, 
  Award, 
  CheckCircle, 
  Clock, 
  PiggyBank,
  Lock,
  Edit,
  Save,
  X,
  Eye,
  EyeOff,
  CreditCard,
  Bell,
  Settings,
  AlertTriangle,
  ArrowRight,
  Zap,
  Gift,
  Crown,
  Star,
  Sparkles,
  Download,
  Building,
  TrendingUp,
  AlertCircle
} from "lucide-react";

export default function ProfilePage() {
  return <ProfileContent />;
}

function ProfileContent() {
  const { isSignedIn, user } = useUser();
  const { has } = useAuth();
  const { data: subscription, isLoaded: subscriptionLoaded } = useSubscription();
  const { user: contextUser, setUser } = useContext(AuthContext);
  
  // Core state management
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState("");
  const [activeSection, setActiveSection] = useState("profile");
  
  // Profile data state
  const [memberSince, setMemberSince] = useState(null);
  const [daysAsMember, setDaysAsMember] = useState(0);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [accountStats, setAccountStats] = useState(null);
  const [editMode, setEditMode] = useState(false);
  
  // Profile form data
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
    bio: ""
  });
  
  // Password change data
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });
  
  // Notification preferences
  const [notifications, setNotifications] = useState({
    emailUpdates: true,
    marketAlerts: true,
    performanceReports: true,
    securityAlerts: true,
    newsletterUpdates: false
  });
  
  // Activity log
  const [activityLog, setActivityLog] = useState([]);
  
  // Feature access state
  const [features, setFeatures] = useState({});
  const [plans, setPlans] = useState({});

  // Initialize data on mount
  useEffect(() => {
    if (isSignedIn && user) {
      fetchProfileData();
      checkFeatureAccess();
    } else {
      setLoading(false);
    }
  }, [isSignedIn, user, subscription]);

  // Check feature access using Clerk's has() helper
  const checkFeatureAccess = () => {
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
      }
    });

    testPlans.forEach(plan => {
      try {
        planResults[plan] = has({ plan });
      } catch (error) {
        planResults[plan] = false;
      }
    });

    setFeatures(featureResults);
    setPlans(planResults);
  };

  // Fetch profile data from API
  const fetchProfileData = async () => {
    setLoading(true);
    try {
      const response = await fetchWithAuth('/user/profile');
      
      if (response.ok) {
        const userData = await response.json();
        
        // Calculate membership duration
        const createdDate = new Date(userData.created_at || Date.now() - 60 * 24 * 60 * 60 * 1000);
        const today = new Date();
        const diffTime = Math.abs(today - createdDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        setMemberSince(createdDate);
        setDaysAsMember(diffDays);
        
        // Set profile data
        setProfileData({
          firstName: userData.first_name || user?.firstName || "",
          lastName: userData.last_name || user?.lastName || "",
          email: userData.email || user?.primaryEmailAddress?.emailAddress || "",
          phone: userData.phone || "",
          occupation: userData.occupation || "",
          dateOfBirth: userData.date_of_birth || "",
          address: userData.address || "",
          city: userData.city || "",
          state: userData.state || "",
          zipCode: userData.zip_code || "",
          country: userData.country || "",
          bio: userData.bio || ""
        });
        
        if (userData.notification_preferences) {
          setNotifications(userData.notification_preferences);
        }
        
        fetchAccountStats();
        fetchActivityLog();
      } else {
        // Fallback to Clerk user data
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
          bio: ""
        });
        
        const defaultCreatedDate = new Date(user?.createdAt || Date.now() - 30 * 24 * 60 * 60 * 1000);
        setMemberSince(defaultCreatedDate);
        setDaysAsMember(30);
      }
    } catch (err) {
      setError("Failed to load profile data: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Fetch account statistics
  const fetchAccountStats = async () => {
    try {
      const response = await fetchWithAuth('/portfolio/summary');
      
      if (response.ok) {
        const summaryData = await response.json();
        setAccountStats({
          lastLogin: new Date().toLocaleString(),
          loginStreak: Math.floor(Math.random() * 20) + 1,
          priceUpdates: summaryData.last_price_update ? "Real-time" : "Daily",
          storageUsage: `${Math.floor(Math.random() * 100)} MB / 5 GB`,
          portfolioUpdates: summaryData.positions_count || 0,
          totalAccounts: summaryData.accounts_count || 0,
          totalPositions: summaryData.positions_count || 0
        });
      }
    } catch (err) {
      console.error("Error fetching account stats:", err);
    }
  };

  // Fetch activity log
  const fetchActivityLog = async () => {
    try {
      const response = await fetchWithAuth('/system/events?limit=5');
      
      if (response.ok) {
        const eventsData = await response.json();
        
        if (eventsData?.events?.length > 0) {
          const mappedEvents = eventsData.events.map(event => ({
            action: event.event_type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
            date: event.started_at,
            details: event.status === 'failed' 
              ? `Failed: ${event.error_message || 'Unknown error'}`
              : `Status: ${event.status || 'unknown'}`,
            icon: getEventIcon(event.event_type)
          }));
          
          setActivityLog(mappedEvents);
          return;
        }
      }
      
      // Fallback activity log
      setActivityLog([
        {
          action: "Account Login",
          date: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
          details: "Successful login from your usual device",
          icon: "User"
        },
        {
          action: "Portfolio Updated",
          date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          details: "Portfolio values updated with latest market data",
          icon: "PiggyBank"
        }
      ]);
    } catch (err) {
      console.error("Error fetching activity log:", err);
      setActivityLog([]);
    }
  };

  // Helper functions
  const getEventIcon = (eventType) => {
    if (eventType.includes("security") || eventType.includes("price")) return "Shield";
    if (eventType.includes("portfolio")) return "PiggyBank";
    if (eventType.includes("user") || eventType.includes("login")) return "User";
    if (eventType.includes("profile") || eventType.includes("update")) return "Edit";
    return "Clock";
  };

  const getActivityIcon = (iconName) => {
    switch (iconName) {
      case "User": return <User className="h-5 w-5" />;
      case "Lock": return <Lock className="h-5 w-5" />;
      case "Shield": return <Shield className="h-5 w-5" />;
      case "PiggyBank": return <PiggyBank className="h-5 w-5" />;
      case "Edit": return <Edit className="h-5 w-5" />;
      case "Bell": return <Bell className="h-5 w-5" />;
      case "CreditCard": return <CreditCard className="h-5 w-5" />;
      default: return <Clock className="h-5 w-5" />;
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    try {
      return new Date(dateString).toLocaleDateString(undefined, {
        year: 'numeric', 
        month: 'long', 
        day: 'numeric'
      });
    } catch (e) {
      return dateString;
    }
  };

  const getMembershipBadge = () => {
    let label = "New Egg";
    let color = "bg-green-100 text-green-800";
    
    if (daysAsMember > 365) {
      label = "Golden Egg";
      color = "bg-yellow-100 text-yellow-800";
    } else if (daysAsMember > 180) {
      label = "Silver Egg";
      color = "bg-gray-100 text-gray-800";
    } else if (daysAsMember > 90) {
      label = "Bronze Egg";
      color = "bg-orange-100 text-orange-800";
    } else if (daysAsMember > 30) {
      label = "Nest Builder";
      color = "bg-blue-100 text-blue-800";
    }
    
    return (
      <span className={`px-3 py-1 rounded-full text-sm font-medium ${color}`}>
        {label}
      </span>
    );
  };

  // Event handlers
  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccessMessage("");
    
    try {
      const apiData = {
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
        bio: profileData.bio
      };
      
      const response = await fetchWithAuth('/user/profile', {
        method: 'PUT',
        body: JSON.stringify(apiData),
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const updatedUserData = await response.json();
        setSuccessMessage("Profile updated successfully!");
        setEditMode(false);
        
        // Update context user if available
        if (setUser && contextUser) {
          setUser({
            ...contextUser,
            first_name: updatedUserData.first_name,
            last_name: updatedUserData.last_name,
            email: updatedUserData.email
          });
        }
        
        // Update activity log
        const newActivity = {
          action: "Profile Updated",
          date: new Date().toISOString(),
          details: "Your profile information was updated",
          icon: "Edit"
        };
        
        setActivityLog([newActivity, ...activityLog.slice(0, 4)]);
        
      } else {
        const errorData = await response.json().catch(() => ({}));
        setError(errorData.detail || `Failed to update profile (${response.status})`);
      }
    } catch (err) {
      setError("An error occurred while updating your profile: " + err.message);
    } finally {
      setSaving(false);
      if (successMessage) {
        setTimeout(() => setSuccessMessage(""), 3000);
      }
    }
  };

  const handleNotificationChange = (key) => {
    setNotifications({
      ...notifications,
      [key]: !notifications[key]
    });
  };

  const saveNotificationPreferences = async () => {
    setSaving(true);
    setError(null);
    setSuccessMessage("");
    
    try {
      // Simulate API call - replace with actual endpoint
      setTimeout(() => {
        setSuccessMessage("Notification preferences updated!");
        
        const newActivity = {
          action: "Preferences Updated",
          date: new Date().toISOString(),
          details: "Notification preferences were updated",
          icon: "Bell"
        };
        
        setActivityLog([newActivity, ...activityLog.slice(0, 4)]);
      }, 1000);
      
    } catch (err) {
      setError("An error occurred while updating your notification preferences: " + err.message);
    } finally {
      setTimeout(() => setSaving(false), 1000);
      setTimeout(() => setSuccessMessage(""), 4000);
    }
  };

  // Get current plan from Clerk subscription or feature access
  const getCurrentPlan = () => {
    const activePlan = Object.entries(plans).find(([plan, hasAccess]) => hasAccess)?.[0];
    return subscription?.plan?.name || activePlan || 'free';
  };

  const getEnabledFeatures = () => {
    return Object.entries(features).filter(([feature, hasAccess]) => hasAccess);
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex justify-center items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <div className="max-w-7xl mx-auto p-6 space-y-8">
        {/* Enhanced Header with UserButton */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">My Profile</h1>
            <p className="text-gray-400 mt-1">Manage your NestEgg account, subscription, and personal information</p>
          </div>
          <div className="flex items-center space-x-4">
            <SignedIn>
              <div className="flex items-center space-x-4">
                <div className="text-right">
                  <p className="text-sm text-gray-300">{user?.fullName}</p>
                  <p className="text-xs text-gray-500">{user?.primaryEmailAddress?.emailAddress}</p>
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
            </SignedIn>
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
          {/* Success/Error Messages */}
          {successMessage && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-center text-green-700">
              <CheckCircle className="h-5 w-5 mr-2" />
              {successMessage}
            </div>
          )}
          
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center text-red-700">
              <X className="h-5 w-5 mr-2" />
              {error}
            </div>
          )}

          {/* Navigation Tabs */}
          <div className="border-b border-gray-800">
            <nav className="flex space-x-8">
              {[
                { id: "profile", label: "Profile", icon: User },
                { id: "subscription", label: "Subscription & Billing", icon: CreditCard },
                { id: "security", label: "Security", icon: Lock },
                { id: "notifications", label: "Notifications", icon: Bell },
                { id: "activity", label: "Activity", icon: Clock }
              ].map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setActiveSection(id)}
                  className={`pb-4 px-1 flex items-center transition-colors ${
                    activeSection === id
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
            {/* Left Sidebar - User Card */}
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-gray-900/70 backdrop-blur-sm rounded-xl border border-gray-800 overflow-hidden">
                <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-6 text-white">
                  <div className="flex items-center justify-center">
                    <div className="w-24 h-24 rounded-full bg-white text-indigo-600 flex items-center justify-center text-3xl font-bold">
                      {profileData.firstName && profileData.lastName 
                        ? `${profileData.firstName[0]}${profileData.lastName[0]}` 
                        : profileData.email ? profileData.email[0].toUpperCase() : "N"}
                    </div>
                  </div>
                  <h2 className="mt-4 text-xl font-bold text-center">
                    {profileData.firstName && profileData.lastName 
                      ? `${profileData.firstName} ${profileData.lastName}` 
                      : profileData.email || "NestEgg User"}
                  </h2>
                  <p className="text-sm text-blue-100 text-center">
                    {profileData.email}
                  </p>
                </div>
                
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm font-medium text-gray-400">Membership Status</span>
                    {getMembershipBadge()}
                  </div>
                  
                  <div className="space-y-4">
                    <div className="flex items-center">
                      <Calendar className="h-5 w-5 text-gray-400 mr-3" />
                      <div>
                        <p className="text-sm font-medium text-gray-300">Member Since</p>
                        <p className="text-sm text-gray-500">
                          {memberSince ? formatDate(memberSince) : "N/A"} ({daysAsMember} days)
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center">
                      <Shield className="h-5 w-5 text-gray-400 mr-3" />
                      <div>
                        <p className="text-sm font-medium text-gray-300">Current Plan</p>
                        <p className="text-sm text-gray-500 capitalize">
                          {getCurrentPlan()} Plan
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center">
                      <Award className="h-5 w-5 text-gray-400 mr-3" />
                      <div>
                        <p className="text-sm font-medium text-gray-300">Features Enabled</p>
                        <p className="text-sm text-gray-500">
                          {getEnabledFeatures().length} of {Object.keys(features).length} features
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Stats */}
              <div className="bg-gray-900/70 backdrop-blur-sm rounded-xl border border-gray-800 p-6">
                <h3 className="text-lg font-semibold text-gray-300 mb-4">Account Stats</h3>
                
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-400">Last Login</span>
                    <span className="text-sm font-medium text-gray-300">
                      {accountStats?.lastLogin || "Today"}
                    </span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-400">Total Accounts</span>
                    <span className="text-sm font-medium text-gray-300">
                      {accountStats?.totalAccounts || "0"}
                    </span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-400">Total Positions</span>
                    <span className="text-sm font-medium text-gray-300">
                      {accountStats?.totalPositions || "0"}
                    </span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-400">Price Updates</span>
                    <span className="text-sm font-medium text-gray-300">
                      {accountStats?.priceUpdates || "Daily"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Main Content Area */}
            <div className="lg:col-span-3 space-y-6">
              {/* Profile Section */}
              {activeSection === "profile" && (
                <div className="bg-gray-900/70 backdrop-blur-sm rounded-xl border border-gray-800 overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-700 flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-gray-100">Personal Information</h3>
                    <button
                      onClick={() => setEditMode(!editMode)}
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
                  </div>
                  
                  <div className="p-6">
                    <form onSubmit={handleUpdateProfile}>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-1">
                            First Name
                          </label>
                          <input
                            type="text"
                            value={profileData.firstName}
                            onChange={(e) => setProfileData({...profileData, firstName: e.target.value})}
                            disabled={!editMode}
                            className={`w-full px-3 py-2 border rounded-md bg-gray-800 text-gray-100 ${
                              editMode ? 'border-gray-600 focus:border-blue-500' : 'border-gray-700 bg-gray-800/50'
                            }`}
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-1">
                            Last Name
                          </label>
                          <input
                            type="text"
                            value={profileData.lastName}
                            onChange={(e) => setProfileData({...profileData, lastName: e.target.value})}
                            disabled={!editMode}
                            className={`w-full px-3 py-2 border rounded-md bg-gray-800 text-gray-100 ${
                              editMode ? 'border-gray-600 focus:border-blue-500' : 'border-gray-700 bg-gray-800/50'
                            }`}
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-1">
                            Email Address
                          </label>
                          <input
                            type="email"
                            value={profileData.email}
                            disabled={true}
                            className="w-full px-3 py-2 border border-gray-700 bg-gray-800/50 rounded-md text-gray-400"
                          />
                          {editMode && (
                            <p className="text-xs text-gray-500 mt-1">
                              Email is managed by your authentication provider
                            </p>
                          )}
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-1">
                            Phone Number
                          </label>
                          <input
                            type="tel"
                            value={profileData.phone}
                            onChange={(e) => setProfileData({...profileData, phone: e.target.value})}
                            disabled={!editMode}
                            className={`w-full px-3 py-2 border rounded-md bg-gray-800 text-gray-100 ${
                              editMode ? 'border-gray-600 focus:border-blue-500' : 'border-gray-700 bg-gray-800/50'
                            }`}
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-1">
                            Occupation
                          </label>
                          <input
                            type="text"
                            value={profileData.occupation}
                            onChange={(e) => setProfileData({...profileData, occupation: e.target.value})}
                            disabled={!editMode}
                            className={`w-full px-3 py-2 border rounded-md bg-gray-800 text-gray-100 ${
                              editMode ? 'border-gray-600 focus:border-blue-500' : 'border-gray-700 bg-gray-800/50'
                            }`}
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-1">
                            Date of Birth
                          </label>
                          <input
                            type="date"
                            value={profileData.dateOfBirth || ''}
                            onChange={(e) => setProfileData({...profileData, dateOfBirth: e.target.value})}
                            disabled={!editMode}
                            className={`w-full px-3 py-2 border rounded-md bg-gray-800 text-gray-100 ${
                              editMode ? 'border-gray-600 focus:border-blue-500' : 'border-gray-700 bg-gray-800/50'
                            }`}
                          />
                        </div>
                      </div>
                      
                      <div className="mt-6">
                        <label className="block text-sm font-medium text-gray-300 mb-1">
                          Address
                        </label>
                        <input
                          type="text"
                          value={profileData.address}
                          onChange={(e) => setProfileData({...profileData, address: e.target.value})}
                          disabled={!editMode}
                          className={`w-full px-3 py-2 border rounded-md bg-gray-800 text-gray-100 ${
                            editMode ? 'border-gray-600 focus:border-blue-500' : 'border-gray-700 bg-gray-800/50'
                          }`}
                        />
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-1">
                            City
                          </label>
                          <input
                            type="text"
                            value={profileData.city}
                            onChange={(e) => setProfileData({...profileData, city: e.target.value})}
                            disabled={!editMode}
                            className={`w-full px-3 py-2 border rounded-md bg-gray-800 text-gray-100 ${
                              editMode ? 'border-gray-600 focus:border-blue-500' : 'border-gray-700 bg-gray-800/50'
                            }`}
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-1">
                            State
                          </label>
                          <input
                            type="text"
                            value={profileData.state}
                            onChange={(e) => setProfileData({...profileData, state: e.target.value})}
                            disabled={!editMode}
                            className={`w-full px-3 py-2 border rounded-md bg-gray-800 text-gray-100 ${
                              editMode ? 'border-gray-600 focus:border-blue-500' : 'border-gray-700 bg-gray-800/50'
                            }`}
                          />
                        </div>
                      </div>
                      
                      <div className="mt-6">
                        <label className="block text-sm font-medium text-gray-300 mb-1">
                          Bio / About Me
                        </label>
                        <textarea
                          value={profileData.bio}
                          onChange={(e) => setProfileData({...profileData, bio: e.target.value})}
                          disabled={!editMode}
                          rows={4}
                          className={`w-full px-3 py-2 border rounded-md bg-gray-800 text-gray-100 ${
                            editMode ? 'border-gray-600 focus:border-blue-500' : 'border-gray-700 bg-gray-800/50'
                          }`}
                        />
                      </div>
                      
                      {editMode && (
                        <div className="mt-6 flex justify-end">
                          <button
                            type="submit"
                            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center disabled:bg-blue-400 transition-colors"
                            disabled={saving}
                          >
                            {saving ? (
                              <>
                                <div className="animate-spin h-4 w-4 mr-2 border-2 border-t-transparent border-white rounded-full"></div>
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
                  </div>
                </div>
              )}

              {/* Subscription & Billing Section */}
              {activeSection === "subscription" && (
                <div className="space-y-6">
                  {/* Current Plan Card */}
                  <div className="bg-gray-900/70 backdrop-blur-sm rounded-xl border border-gray-800 overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-700 flex justify-between items-center">
                      <h3 className="text-lg font-semibold text-gray-100">Current Subscription</h3>
                      <span className={`px-3 py-1 text-sm rounded-full border ${
                        getCurrentPlan().includes('premium') || getCurrentPlan().includes('enterprise')
                          ? 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                          : getCurrentPlan().includes('pro') || getCurrentPlan().includes('standard')
                          ? 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                          : 'bg-green-500/20 text-green-300 border-green-500/30'
                      }`}>
                        {getCurrentPlan().charAt(0).toUpperCase() + getCurrentPlan().slice(1)} Plan
                      </span>
                    </div>
                    
                    <div className="p-6">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
                        <div className="bg-gray-800/50 p-4 rounded-lg">
                          <p className="text-gray-400 text-sm">Status</p>
                          <p className="text-lg font-medium text-gray-100 capitalize">
                            {subscription?.status || 'active'}
                          </p>
                        </div>
                        <div className="bg-gray-800/50 p-4 rounded-lg">
                          <p className="text-gray-400 text-sm">Amount</p>
                          <p className="text-lg font-medium text-gray-100">
                            {subscription?.amount 
                              ? `$${(subscription.amount / 100).toFixed(2)}` 
                              : '$0'}
                          </p>
                        </div>
                        <div className="bg-gray-800/50 p-4 rounded-lg">
                          <p className="text-gray-400 text-sm">Billing Cycle</p>
                          <p className="text-lg font-medium text-gray-100 capitalize">
                            {subscription?.interval || 'N/A'}
                          </p>
                        </div>
                        <div className="bg-gray-800/50 p-4 rounded-lg">
                          <p className="text-gray-400 text-sm">Next Payment</p>
                          <p className="text-lg font-medium text-gray-100">
                            {subscription?.currentPeriodEnd 
                              ? formatDate(subscription.currentPeriodEnd)
                              : 'N/A'}
                          </p>
                        </div>
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
                    </div>
                  </div>

                  {/* Feature Access Status */}
                  <div className="bg-gray-900/70 backdrop-blur-sm rounded-xl border border-gray-800 overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-700">
                      <h3 className="text-lg font-semibold text-gray-100 flex items-center">
                        <Shield className="h-5 w-5 mr-2 text-blue-400" />
                        Access Control Status
                      </h3>
                    </div>
                    
                    <div className="p-6">
                      <div className="mb-6 p-4 bg-gray-800/50 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-gray-300">Feature Access</span>
                          <span className="text-sm text-gray-400">
                            {getEnabledFeatures().length} of {Object.keys(features).length} enabled
                          </span>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <h4 className="text-sm font-semibold text-gray-300 mb-3 uppercase tracking-wide">Features</h4>
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

                        <div>
                          <h4 className="text-sm font-semibold text-gray-300 mb-3 uppercase tracking-wide">Plans</h4>
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
                    </div>
                  </div>

                  {/* Protected Content Demo */}
                  <div className="bg-gray-900/70 backdrop-blur-sm rounded-xl border border-gray-800 overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-700">
                      <h3 className="text-lg font-semibold text-gray-100 flex items-center">
                        <Shield className="h-5 w-5 mr-2 text-purple-400" />
                        Feature Access Demo
                      </h3>
                    </div>
                    
                    <div className="p-6 space-y-4">
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
                  </div>

                  {/* Pricing Table */}
                  <div className="bg-gray-900/70 backdrop-blur-sm rounded-xl border border-gray-800 overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-700">
                      <h3 className="text-lg font-semibold text-gray-100 flex items-center">
                        <Crown className="h-5 w-5 mr-2 text-purple-400" />
                        Available Plans
                      </h3>
                      <p className="text-gray-400 text-sm mt-1">
                        Live pricing from your Clerk Dashboard configuration
                      </p>
                    </div>

                    <div className="p-6">
                      <div className="bg-gray-800/30 rounded-lg border border-gray-700">
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
                    </div>
                  </div>
                </div>
              )}

              {/* Security Section */}
              {activeSection === "security" && (
                <div className="bg-gray-900/70 backdrop-blur-sm rounded-xl border border-gray-800 overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-700">
                    <h3 className="text-lg font-semibold text-gray-100">Security Settings</h3>
                  </div>
                  
                  <div className="p-6">
                    <div className="space-y-6">
                      <div className="p-4 bg-blue-900/20 border border-blue-800/50 rounded-lg">
                        <div className="flex items-center">
                          <Shield className="h-5 w-5 text-blue-400 mr-2" />
                          <div>
                            <h4 className="text-sm font-medium text-blue-300">Authentication Managed by Clerk</h4>
                            <p className="text-xs text-blue-200/80 mt-1">
                              Your password and authentication settings are securely managed by Clerk. 
                              Use the User Button menu to manage your account security.
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="space-y-4">
                        <h4 className="text-md font-medium text-gray-100">Security Recommendations</h4>
                        <ul className="space-y-4">
                          <li className="flex items-start">
                            <Shield className="h-5 w-5 text-green-400 mr-3 mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="text-sm font-medium text-gray-100">Use a strong, unique password</p>
                              <p className="text-sm text-gray-400">Combine letters, numbers, and symbols</p>
                            </div>
                          </li>
                          <li className="flex items-start">
                            <Shield className="h-5 w-5 text-green-400 mr-3 mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="text-sm font-medium text-gray-100">Enable two-factor authentication</p>
                              <p className="text-sm text-gray-400">Add an extra layer of security to your account</p>
                            </div>
                          </li>
                          <li className="flex items-start">
                            <Shield className="h-5 w-5 text-green-400 mr-3 mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="text-sm font-medium text-gray-100">Review active sessions regularly</p>
                              <p className="text-sm text-gray-400">Sign out from devices you no longer use</p>
                            </div>
                          </li>
                          <li className="flex items-start">
                            <Shield className="h-5 w-5 text-green-400 mr-3 mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="text-sm font-medium text-gray-100">Be alert for suspicious activity</p>
                              <p className="text-sm text-gray-400">Report any unusual account activity immediately</p>
                            </div>
                          </li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Notifications Section */}
              {activeSection === "notifications" && (
                <div className="bg-gray-900/70 backdrop-blur-sm rounded-xl border border-gray-800 overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-700">
                    <h3 className="text-lg font-semibold text-gray-100">Notification Preferences</h3>
                  </div>
                  
                  <div className="p-6">
                    <p className="text-sm text-gray-400 mb-6">
                      Choose which notifications you'd like to receive about your investments, account activity, and platform updates.
                    </p>
                    
                    <div className="space-y-5">
                      {Object.entries(notifications).map(([key, enabled]) => {
                        const notificationLabels = {
                          emailUpdates: {
                            title: "Email Updates",
                            description: "Important announcements and account activity"
                          },
                          marketAlerts: {
                            title: "Market Alerts", 
                            description: "Price changes and market events for your holdings"
                          },
                          performanceReports: {
                            title: "Performance Reports",
                            description: "Weekly and monthly portfolio performance summaries"
                          },
                          securityAlerts: {
                            title: "Security Alerts",
                            description: "Login attempts and security-related notifications"
                          },
                          newsletterUpdates: {
                            title: "Newsletter Updates",
                            description: "Educational content and investment insights"
                          }
                        };

                        const label = notificationLabels[key];
                        if (!label) return null;

                        return (
                          <div key={key} className={`flex items-center justify-between ${key !== 'emailUpdates' ? 'border-t border-gray-700 pt-5' : ''}`}>
                            <div>
                              <label htmlFor={key} className="font-medium text-gray-100">
                                {label.title}
                              </label>
                              <p className="text-sm text-gray-400">
                                {label.description}
                              </p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input 
                                type="checkbox" 
                                id={key}
                                checked={enabled} 
                                onChange={() => handleNotificationChange(key)}
                                className="sr-only peer" 
                              />
                              <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                            </label>
                          </div>
                        );
                      })}
                    </div>
                    
                    <div className="mt-6 flex justify-end">
                      <button
                        onClick={saveNotificationPreferences}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center disabled:bg-blue-400 transition-colors"
                        disabled={saving}
                      >
                        {saving ? (
                          <>
                            <div className="animate-spin h-4 w-4 mr-2 border-2 border-t-transparent border-white rounded-full"></div>
                            Saving...
                          </>
                        ) : (
                          <>
                            <Bell className="h-4 w-4 mr-2" />
                            Save Preferences
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Activity Section */}
              {activeSection === "activity" && (
                <div className="bg-gray-900/70 backdrop-blur-sm rounded-xl border border-gray-800 overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-700">
                    <h3 className="text-lg font-semibold text-gray-100">Recent Activity</h3>
                  </div>
                  
                  <div className="p-6">
                    {activityLog.length === 0 ? (
                      <div className="text-center py-8">
                        <Clock className="h-12 w-12 mx-auto text-gray-500 mb-4" />
                        <h4 className="text-lg font-medium text-gray-100 mb-2">No activity yet</h4>
                        <p className="text-gray-400">
                          Your account activity will appear here as you use the platform.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        {activityLog.map((activity, index) => (
                          <div key={index} className="flex items-start">
                            <div className={`flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center mr-4 ${
                              activity.icon === 'Shield' ? 'bg-green-500/20 text-green-400' :
                              activity.icon === 'Lock' ? 'bg-blue-500/20 text-blue-400' :
                              activity.icon === 'PiggyBank' ? 'bg-purple-500/20 text-purple-400' :
                              activity.icon === 'Edit' ? 'bg-yellow-500/20 text-yellow-400' :
                              'bg-gray-500/20 text-gray-400'
                            }`}>
                              {getActivityIcon(activity.icon)}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-100">{activity.action}</p>
                              <p className="text-sm text-gray-400">{activity.details}</p>
                              <p className="text-xs text-gray-500 mt-1">{formatDate(activity.date)}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </SignedIn>
      </div>
    </div>
  );
}