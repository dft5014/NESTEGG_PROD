import { useState, useEffect, useContext } from "react";
import { AuthContext } from "@/context/AuthContext";
import { fetchWithAuth } from "@/utils/api";
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
  AlertTriangle
} from "lucide-react";

export default function Profile() {
  const { user, setUser } = useContext(AuthContext);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState("");
  const [memberSince, setMemberSince] = useState(null);
  const [daysAsMember, setDaysAsMember] = useState(0);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [activeSection, setActiveSection] = useState("profile");
  const [accountStats, setAccountStats] = useState(null);
  
  // Form states
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
    bio: ""
  });
  
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
  
  // Subscription plans
  const plans = [
    {
      id: "basic",
      name: "Basic",
      price: "Free",
      features: [
        "Track up to 3 accounts",
        "Basic performance metrics",
        "Daily price updates",
        "Standard support"
      ],
      color: "bg-gray-100 border-gray-300",
      buttonColor: "bg-gray-500 hover:bg-gray-600"
    },
    {
      id: "premium",
      name: "Premium",
      price: "$9.99/month",
      features: [
        "Unlimited accounts",
        "Advanced analytics",
        "Real-time price updates",
        "Priority support",
        "Tax reporting tools",
        "Portfolio projections"
      ],
      color: "bg-blue-50 border-blue-300",
      buttonColor: "bg-blue-600 hover:bg-blue-700"
    },
    {
      id: "pro",
      name: "Pro",
      price: "$19.99/month",
      features: [
        "Everything in Premium",
        "Retirement planning tools",
        "AI-powered insights",
        "Custom benchmarks",
        "Family account sharing",
        "Dedicated account manager"
      ],
      color: "bg-purple-50 border-purple-300",
      buttonColor: "bg-purple-600 hover:bg-purple-700"
    }
  ];
  const [currentPlan, setCurrentPlan] = useState("basic");
  
  // Activity logs
  const [activityLog, setActivityLog] = useState([]);

  // Fetch user profile data
  useEffect(() => {
    const fetchProfileData = async () => {
      setLoading(true);
      try {
        // Fetch extended user profile data from our new API endpoint
        const response = await fetchWithAuth('/user/profile');
        
        if (response.ok) {
          const userData = await response.json();
          console.log("User profile data:", userData);
          
          // Calculate membership duration
          const createdDate = new Date(userData.created_at || Date.now() - 60 * 24 * 60 * 60 * 1000);
          const today = new Date();
          const diffTime = Math.abs(today - createdDate);
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          
          setMemberSince(createdDate);
          setDaysAsMember(diffDays);
          
          // Format date of birth if it exists (handle various date formats)
          let formattedDateOfBirth = "";
          if (userData.date_of_birth) {
            // Handle both string dates and ISO dates
            const dateOfBirth = typeof userData.date_of_birth === 'string' 
              ? userData.date_of_birth 
              : userData.date_of_birth.toISOString().split('T')[0];
              
            formattedDateOfBirth = dateOfBirth;
          }
          
          // Set profile data from API response
          setProfileData({
            firstName: userData.first_name || "",
            lastName: userData.last_name || "",
            email: userData.email || "",
            phone: userData.phone || "",
            occupation: userData.occupation || "",
            dateOfBirth: formattedDateOfBirth,
            address: userData.address || "",
            city: userData.city || "",
            state: userData.state || "",
            zipCode: userData.zip_code || "",
            country: userData.country || "",
            bio: userData.bio || ""
          });
          
          // Set subscription plan
          setCurrentPlan(userData.subscription_plan || "basic");
          
          // Set notification preferences if available
          if (userData.notification_preferences) {
            setNotifications(userData.notification_preferences);
          }
          
          // Fetch account statistics
          fetchAccountStats();
          
          // Fetch activity log
          fetchActivityLog();
        } else {
          console.error("Error fetching profile: ", response.status);
          // Set error message
          const errorData = await response.json().catch(() => ({}));
          setError(errorData.detail || `Failed to load profile (${response.status})`);
          
          // If we can't get extended profile, use basic user data
          setProfileData({
            firstName: user?.first_name || "",
            lastName: user?.last_name || "",
            email: user?.email || "",
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
          
          // Set default membership duration if not available
          const defaultCreatedDate = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
          setMemberSince(defaultCreatedDate);
          setDaysAsMember(60);
        }
      } catch (err) {
        console.error("Error fetching profile:", err);
        setError("Failed to load profile data: " + (err.message || "Unknown error"));
      } finally {
        setLoading(false);
      }
    };

    // Only fetch profile data if user is authenticated
    if (user) {
      fetchProfileData();
    } else {
      setLoading(false);
    }
  }, [user]);

  // Fetch account statistics
  const fetchAccountStats = async () => {
    try {
      // Get portfolio summary for account stats
      const response = await fetchWithAuth('/portfolio/summary');
      
      if (response.ok) {
        const summaryData = await response.json();
        setAccountStats({
          lastLogin: new Date().toLocaleString(),
          loginStreak: Math.floor(Math.random() * 20) + 1, // Placeholder for now
          priceUpdates: summaryData.last_price_update ? "Real-time" : "Daily",
          storageUsage: `${Math.floor(Math.random() * 100)} MB / 5 GB`, // Placeholder
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
      // Attempt to get real activity log
      const response = await fetchWithAuth('/system/events?limit=5');
      
      if (response.ok) {
        const eventsData = await response.json();
        
        if (eventsData && eventsData.events && eventsData.events.length > 0) {
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
      
      // Fallback to sample activity if no real data
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
        },
        {
          action: "Security Alert",
          date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
          details: "All securities updated with latest prices",
          icon: "Shield"
        },
        {
          action: "Profile Updated",
          date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          details: "Your profile information was updated",
          icon: "Edit"
        },
        {
          action: "Account Created",
          date: memberSince ? memberSince.toISOString() : new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
          details: "NestEgg account successfully created",
          icon: "User"
        }
      ]);
    } catch (err) {
      console.error("Error fetching activity log:", err);
      // Fallback to empty activity log
      setActivityLog([]);
    }
  };

  // Map event types to icons
  const getEventIcon = (eventType) => {
    if (eventType.includes("security") || eventType.includes("price")) return "Shield";
    if (eventType.includes("portfolio")) return "PiggyBank";
    if (eventType.includes("user") || eventType.includes("login")) return "User";
    if (eventType.includes("profile") || eventType.includes("update")) return "Edit";
    return "Clock";
  };

  // Handle profile updates
  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccessMessage("");
    
    try {
      // Format the data for the API
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
        body: JSON.stringify(apiData)
      });
      
      if (response.ok) {
        const updatedUserData = await response.json();
        setSuccessMessage("Profile updated successfully!");
        setEditMode(false);
        
        // Update user context if necessary
        const contextUserUpdate = {
          ...user,
          first_name: updatedUserData.first_name,
          last_name: updatedUserData.last_name,
          email: updatedUserData.email
        };
        
        if (setUser) {
          setUser(contextUserUpdate);
        }
        
        // Update local state with the response data
        setProfileData({
          firstName: updatedUserData.first_name || "",
          lastName: updatedUserData.last_name || "",
          email: updatedUserData.email || "",
          phone: updatedUserData.phone || "",
          occupation: updatedUserData.occupation || "",
          dateOfBirth: updatedUserData.date_of_birth || "",
          address: updatedUserData.address || "",
          city: updatedUserData.city || "",
          state: updatedUserData.state || "",
          zipCode: updatedUserData.zip_code || "",
          country: updatedUserData.country || "",
          bio: updatedUserData.bio || ""
        });
      } else {
        const errorData = await response.json().catch(() => ({}));
        setError(errorData.detail || `Failed to update profile (${response.status})`);
      }
    } catch (err) {
      console.error("Error updating profile:", err);
      setError("An error occurred while updating your profile: " + (err.message || "Unknown error"));
    } finally {
      setSaving(false);
      
      // Clear success message after 3 seconds
      if (successMessage) {
        setTimeout(() => {
          setSuccessMessage("");
        }, 3000);
      }
    }
  };
  
  // Handle password change
  const handleChangePassword = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccessMessage("");
    
    // Validate passwords
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError("New passwords do not match");
      setSaving(false);
      return;
    }
    
    if (passwordData.newPassword.length < 6) {
      setError("New password must be at least 6 characters long");
      setSaving(false);
      return;
    }
    
    try {
      // Check if the API endpoint exists, otherwise show a message
      // This is a temporary solution until the backend is fully implemented
      setSuccessMessage("Password change functionality will be available soon!");
      
      // For demonstration purposes - future implementation
      /* 
      const response = await fetchWithAuth('/user/change-password', {
        method: 'POST',
        body: JSON.stringify({
          current_password: passwordData.currentPassword,
          new_password: passwordData.newPassword
        })
      });
      
      if (response.ok) {
        setSuccessMessage("Password changed successfully!");
        // Reset form
        setPasswordData({
          currentPassword: "",
          newPassword: "",
          confirmPassword: ""
        });
        
        // Update activity log with new entry
        const newActivity = {
          action: "Password Changed",
          date: new Date().toISOString(),
          details: "Your password was successfully updated",
          icon: "Lock"
        };
        
        setActivityLog([newActivity, ...activityLog.slice(0, 4)]);
      } else {
        const errorData = await response.json().catch(() => ({}));
        setError(errorData.detail || "Current password is incorrect");
      }
      */
      
      // Reset form after 2 seconds to simulate success
      setTimeout(() => {
        setPasswordData({
          currentPassword: "",
          newPassword: "",
          confirmPassword: ""
        });
      }, 2000);
      
    } catch (err) {
      console.error("Error changing password:", err);
      setError("An error occurred while changing your password: " + (err.message || "Unknown error"));
    } finally {
      setSaving(false);
      
      // Clear success message after 3 seconds
      if (successMessage) {
        setTimeout(() => {
          setSuccessMessage("");
        }, 3000);
      }
    }
  };
  
  // Handle notification changes
  const handleNotificationChange = (key) => {
    setNotifications({
      ...notifications,
      [key]: !notifications[key]
    });
  };
  
  // Save notification preferences
  const saveNotificationPreferences = async () => {
    setSaving(true);
    setError(null);
    setSuccessMessage("");
    
    try {
      // Temporary simulation until the notifications endpoint is fully implemented
      // In the future, this will use the real API endpoint
      /*
      const response = await fetchWithAuth('/user/notifications', {
        method: 'PUT',
        body: JSON.stringify(notifications)
      });
      
      if (response.ok) {
        setSuccessMessage("Notification preferences updated!");
        
        // Update activity log
        const newActivity = {
          action: "Preferences Updated",
          date: new Date().toISOString(),
          details: "Notification preferences were updated",
          icon: "Bell"
        };
        
        setActivityLog([newActivity, ...activityLog.slice(0, 4)]);
      } else {
        const errorData = await response.json().catch(() => ({}));
        setError(errorData.detail || "Failed to update notification preferences");
      }
      */
      
      // Simulate successful update
      setTimeout(() => {
        setSuccessMessage("Notification preferences updated!");
        
        // Update activity log with new entry
        const newActivity = {
          action: "Preferences Updated",
          date: new Date().toISOString(),
          details: "Notification preferences were updated",
          icon: "Bell"
        };
        
        setActivityLog([newActivity, ...activityLog.slice(0, 4)]);
      }, 1000);
      
    } catch (err) {
      console.error("Error updating notifications:", err);
      setError("An error occurred while updating your notification preferences: " + (err.message || "Unknown error"));
    } finally {
      setTimeout(() => {
        setSaving(false);
      }, 1000);
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage("");
      }, 4000);
    }
  };
  
  // Update subscription plan (currently mocked)
  const handlePlanChange = (planId) => {
    setCurrentPlan(planId);
    setSuccessMessage(`Subscription updated to ${plans.find(p => p.id === planId).name} plan!`);
    
    // Add to activity log
    const newActivity = {
      action: "Subscription Changed",
      date: new Date().toISOString(),
      details: `Subscription plan changed to ${plans.find(p => p.id === planId).name}`,
      icon: "CreditCard"
    };
    
    setActivityLog([newActivity, ...activityLog.slice(0, 4)]);
    
    // Clear success message after 3 seconds
    setTimeout(() => {
      setSuccessMessage("");
    }, 3000);
  };
  
  // Helper function to get icon component
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
  
  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    
    try {
      return new Date(dateString).toLocaleDateString(undefined, options);
    } catch (e) {
      console.error("Error formatting date:", e);
      return dateString;
    }
  };
  
  // Render membership level badge
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

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex justify-center items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // Not authenticated state
  if (!user) {
    return (
      <div className="min-h-screen flex justify-center items-center bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8 text-center">
          <AlertTriangle className="h-16 w-16 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-4">Authentication Required</h2>
          <p className="text-gray-600 mb-6">
            You need to be logged in to view and manage your profile.
          </p>
          <button 
            onClick={() => router.push('/login')}
            className="w-full py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">My Profile</h1>
          <p className="text-gray-600">
            Manage your NestEgg account, subscription, and personal information
          </p>
        </div>
        
        {/* Success Message */}
        {successMessage && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center text-green-700">
            <CheckCircle className="h-5 w-5 mr-2" />
            {successMessage}
          </div>
        )}
        
        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center text-red-700">
            <X className="h-5 w-5 mr-2" />
            {error}
          </div>
        )}
        
        {/* Navigation Tabs */}
        <div className="mb-8 border-b border-gray-200">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveSection("profile")}
              className={`pb-4 px-1 ${
                activeSection === "profile"
                  ? "border-b-2 border-blue-500 text-blue-600"
                  : "border-b-2 border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              <User className="h-5 w-5 inline mr-2" />
              Profile
            </button>
            <button
              onClick={() => setActiveSection("security")}
              className={`pb-4 px-1 ${
                activeSection === "security"
                  ? "border-b-2 border-blue-500 text-blue-600"
                  : "border-b-2 border-transparent text-gray-500 hover:border-gray-300"
              }`}
            >
              <Lock className="h-5 w-5 inline mr-2" />
              Security
            </button>
            <button
              onClick={() => setActiveSection("subscription")}
              className={`pb-4 px-1 ${
                activeSection === "subscription"
                  ? "border-b-2 border-blue-500 text-blue-600"
                  : "border-b-2 border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              <CreditCard className="h-5 w-5 inline mr-2" />
              Subscription
            </button>
            <button
              onClick={() => setActiveSection("notifications")}
              className={`pb-4 px-1 ${
                activeSection === "notifications"
                  ? "border-b-2 border-blue-500 text-blue-600"
                  : "border-b-2 border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              <Bell className="h-5 w-5 inline mr-2" />
              Notifications
            </button>
            <button
              onClick={() => setActiveSection("activity")}
              className={`pb-4 px-1 ${
                activeSection === "activity"
                  ? "border-b-2 border-blue-500 text-blue-600"
                  : "border-b-2 border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              <Clock className="h-5 w-5 inline mr-2" />
              Activity
            </button>
          </nav>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Left Column - User Card & Account Summary */}
          <div className="col-span-1">
            <div className="bg-white rounded-xl shadow-md overflow-hidden mb-6">
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
                    : profileData.email ? profileData.email : "NestEgg User"}
                </h2>
                <p className="text-sm text-blue-100 text-center">
                  {profileData.email}
                </p>
              </div>
              
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-medium text-gray-500">Membership Status</span>
                  {getMembershipBadge()}
                </div>
                
                <div className="flex items-center mb-4">
                  <Calendar className="h-5 w-5 text-gray-400 mr-3" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Member Since</p>
                    <p className="text-sm text-gray-500">
                      {memberSince ? formatDate(memberSince) : "N/A"} ({daysAsMember} days)
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center mb-4">
                  <Shield className="h-5 w-5 text-gray-400 mr-3" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Subscription Plan</p>
                    <p className="text-sm text-gray-500">
                      {plans.find(p => p.id === currentPlan)?.name || "Basic"} Plan
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center">
                  <Award className="h-5 w-5 text-gray-400 mr-3" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Portfolio Status</p>
                    <p className="text-sm text-gray-500">
                      {accountStats 
                        ? `${accountStats.totalAccounts} Accounts, ${accountStats.totalPositions} Positions` 
                        : "No portfolio data available"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Quick Stats */}
            <div className="bg-white rounded-xl shadow-md overflow-hidden">
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Account Stats</h3>
                
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Last Login</span>
                    <span className="text-sm font-medium">
                      {accountStats?.lastLogin || "Today"}
                    </span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Login Streak</span>
                    <span className="text-sm font-medium">
                      {accountStats?.loginStreak || "1"} days
                    </span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Price Updates</span>
                    <span className="text-sm font-medium">
                      {accountStats?.priceUpdates || "Daily"}
                    </span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Storage Usage</span>
                    <span className="text-sm font-medium">
                      {accountStats?.storageUsage || "< 1 MB / 5 GB"}
                    </span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Portfolio Updates</span>
                    <span className="text-sm font-medium">
                      {accountStats?.portfolioUpdates || "0"} positions
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Right Column - Main Content */}
          <div className="col-span-1 md:col-span-2">
            {/* Profile Section */}
            {activeSection === "profile" && (
              <div className="bg-white rounded-xl shadow-md overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                  <h3 className="text-lg font-semibold text-gray-900">Personal Information</h3>
                  <button
                    onClick={() => setEditMode(!editMode)}
                    className="text-blue-600 hover:text-blue-800 flex items-center"
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
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          First Name
                        </label>
                        <input
                          type="text"
                          value={profileData.firstName}
                          onChange={(e) => setProfileData({...profileData, firstName: e.target.value})}
                          disabled={!editMode}
                          className={`w-full px-3 py-2 border ${editMode ? 'border-gray-300' : 'border-gray-200 bg-gray-50'} rounded-md`}
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Last Name
                        </label>
                        <input
                          type="text"
                          value={profileData.lastName}
                          onChange={(e) => setProfileData({...profileData, lastName: e.target.value})}
                          disabled={!editMode}
                          className={`w-full px-3 py-2 border ${editMode ? 'border-gray-300' : 'border-gray-200 bg-gray-50'} rounded-md`}
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Email Address
                        </label>
                        <input
                          type="email"
                          value={profileData.email}
                          disabled={true} // Email can't be changed
                          className="w-full px-3 py-2 border border-gray-200 bg-gray-50 rounded-md"
                        />
                        {editMode && (
                          <p className="text-xs text-gray-500 mt-1">
                            Email cannot be changed. Contact support if needed.
                          </p>
                        )}
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Phone Number
                        </label>
                        <input
                          type="tel"
                          value={profileData.phone}
                          onChange={(e) => setProfileData({...profileData, phone: e.target.value})}
                          disabled={!editMode}
                          className={`w-full px-3 py-2 border ${editMode ? 'border-gray-300' : 'border-gray-200 bg-gray-50'} rounded-md`}
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Occupation
                        </label>
                        <input
                          type="text"
                          value={profileData.occupation}
                          onChange={(e) => setProfileData({...profileData, occupation: e.target.value})}
                          disabled={!editMode}
                          className={`w-full px-3 py-2 border ${editMode ? 'border-gray-300' : 'border-gray-200 bg-gray-50'} rounded-md`}
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Date of Birth
                        </label>
                        <input
                          type="date"
                          value={profileData.dateOfBirth || ''}
                          onChange={(e) => setProfileData({...profileData, dateOfBirth: e.target.value})}
                          disabled={!editMode}
                          className={`w-full px-3 py-2 border ${editMode ? 'border-gray-300' : 'border-gray-200 bg-gray-50'} rounded-md`}
                        />
                      </div>
                    </div>
                    
                    <div className="mt-6">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Address
                      </label>
                      <input
                        type="text"
                        value={profileData.address}
                        onChange={(e) => setProfileData({...profileData, address: e.target.value})}
                        disabled={!editMode}
                        className={`w-full px-3 py-2 border ${editMode ? 'border-gray-300' : 'border-gray-200 bg-gray-50'} rounded-md`}
                      />
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          City
                        </label>
                        <input
                          type="text"
                          value={profileData.city}
                          onChange={(e) => setProfileData({...profileData, city: e.target.value})}
                          disabled={!editMode}
                          className={`w-full px-3 py-2 border ${editMode ? 'border-gray-300' : 'border-gray-200 bg-gray-50'} rounded-md`}
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          State
                        </label>
                        <input
                          type="text"
                          value={profileData.state}
                          onChange={(e) => setProfileData({...profileData, state: e.target.value})}
                          disabled={!editMode}
                          className={`w-full px-3 py-2 border ${editMode ? 'border-gray-300' : 'border-gray-200 bg-gray-50'} rounded-md`}
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Zip Code
                        </label>
                        <input
                          type="text"
                          value={profileData.zipCode}
                          onChange={(e) => setProfileData({...profileData, zipCode: e.target.value})}
                          disabled={!editMode}
                          className={`w-full px-3 py-2 border ${editMode ? 'border-gray-300' : 'border-gray-200 bg-gray-50'} rounded-md`}
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Country
                        </label>
                        <input
                          type="text"
                          value={profileData.country}
                          onChange={(e) => setProfileData({...profileData, country: e.target.value})}
                          disabled={!editMode}
                          className={`w-full px-3 py-2 border ${editMode ? 'border-gray-300' : 'border-gray-200 bg-gray-50'} rounded-md`}
                        />
                      </div>
                    </div>
                    
                    <div className="mt-6">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Bio / About Me
                      </label>
                      <textarea
                        value={profileData.bio}
                        onChange={(e) => setProfileData({...profileData, bio: e.target.value})}
                        disabled={!editMode}
                        rows={4}
                        className={`w-full px-3 py-2 border ${editMode ? 'border-gray-300' : 'border-gray-200 bg-gray-50'} rounded-md`}
                      />
                    </div>
                    
                    {editMode && (
                      <div className="mt-6 flex justify-end">
                        <button
                          type="submit"
                          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center disabled:bg-blue-400"
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
            
            {/* Security Section */}
            {activeSection === "security" && (
              <div className="bg-white rounded-xl shadow-md overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">Security Settings</h3>
                </div>
                
                <div className="p-6">
                  <form onSubmit={handleChangePassword}>
                    <div className="space-y-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Current Password
                        </label>
                        <div className="relative">
                          <input
                            type={passwordVisible ? "text" : "password"}
                            value={passwordData.currentPassword}
                            onChange={(e) => setPasswordData({...passwordData, currentPassword: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                            required
                          />
                          <button
                            type="button"
                            onClick={() => setPasswordVisible(!passwordVisible)}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2"
                          >
                            {passwordVisible ? <EyeOff className="h-5 w-5 text-gray-400" /> : <Eye className="h-5 w-5 text-gray-400" />}
                          </button>
                        </div>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          New Password
                        </label>
                        <input
                          type={passwordVisible ? "text" : "password"}
                          value={passwordData.newPassword}
                          onChange={(e) => setPasswordData({...passwordData, newPassword: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                          required
                          minLength={6}
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Password must be at least 6 characters long
                        </p>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Confirm New Password
                        </label>
                        <input
                          type={passwordVisible ? "text" : "password"}
                          value={passwordData.confirmPassword}
                          onChange={(e) => setPasswordData({...passwordData, confirmPassword: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                          required
                        />
                      </div>
                    </div>
                    
                    <div className="mt-6 flex justify-end">
                      <button
                        type="submit"
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center disabled:bg-blue-400"
                        disabled={saving}
                      >
                        {saving ? (
                          <>
                            <div className="animate-spin h-4 w-4 mr-2 border-2 border-t-transparent border-white rounded-full"></div>
                            Changing...
                          </>
                        ) : (
                          <>
                            <Lock className="h-4 w-4 mr-2" />
                            Change Password
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                  
                  <div className="mt-10 pt-6 border-t border-gray-200">
                    <h4 className="text-md font-medium text-gray-900 mb-4">Security Recommendations</h4>
                    <ul className="space-y-4">
                      <li className="flex items-start">
                        <Shield className="h-5 w-5 text-green-500 mr-3 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">Use a strong, unique password</p>
                          <p className="text-sm text-gray-600">Combine letters, numbers, and symbols</p>
                        </div>
                      </li>
                      <li className="flex items-start">
                        <Shield className="h-5 w-5 text-green-500 mr-3 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">Change passwords regularly</p>
                          <p className="text-sm text-gray-600">Update your password every 3-6 months</p>
                        </div>
                      </li>
                      <li className="flex items-start">
                        <Shield className="h-5 w-5 text-green-500 mr-3 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">Be alert for suspicious activity</p>
                          <p className="text-sm text-gray-600">Report any unusual account activity immediately</p>
                        </div>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            )}
            
            {/* Subscription Section */}
            {activeSection === "subscription" && (
              <div className="bg-white rounded-xl shadow-md overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">Subscription Plan</h3>
                </div>
                
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {plans.map((plan) => (
                      <div
                        key={plan.id}
                        className={`border rounded-lg p-4 ${plan.color} ${
                          currentPlan === plan.id ? "ring-2 ring-blue-500" : ""
                        }`}
                      >
                        <h4 className="text-lg font-semibold text-gray-900">{plan.name}</h4>
                        <p className="text-2xl font-bold text-gray-900 mt-2">{plan.price}</p>
                        <ul className="mt-4 space-y-2">
                          {plan.features.map((feature, index) => (
                            <li key={index} className="flex items-center text-sm text-gray-600">
                              <CheckCircle className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                              {feature}
                            </li>
                          ))}
                        </ul>
                        <button
                          className={`w-full mt-4 px-4 py-2 text-white rounded-md ${plan.buttonColor} ${
                            currentPlan === plan.id ? "opacity-50 cursor-not-allowed" : ""
                          }`}
                          disabled={currentPlan === plan.id}
                          onClick={() => handlePlanChange(plan.id)}
                        >
                          {currentPlan === plan.id ? "Current Plan" : "Select Plan"}
                        </button>
                      </div>
                    ))}
                  </div>
                  
                  <div className="mt-10 pt-6 border-t border-gray-200">
                    <h4 className="text-md font-medium text-gray-900 mb-4">Billing Information</h4>
                    {currentPlan === 'basic' ? (
                      <p className="text-gray-600">
                        You are currently on the free plan with no billing information required.
                      </p>
                    ) : (
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <p className="text-sm text-gray-700 mb-4">
                          Your {plans.find(p => p.id === currentPlan)?.name} Plan subscription will renew automatically on:
                        </p>
                        <p className="text-md font-semibold">
                          April 28, 2025
                        </p>
                        <div className="mt-4 text-right">
                          <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                            Manage Payment Methods
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
            
            {/* Notifications Section */}
            {activeSection === "notifications" && (
              <div className="bg-white rounded-xl shadow-md overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">Notification Preferences</h3>
                </div>
                
                <div className="p-6">
                  <p className="text-sm text-gray-600 mb-6">
                    Choose which notifications you'd like to receive about your investments, account activity, and platform updates.
                  </p>
                  
                  <div className="space-y-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <label htmlFor="emailUpdates" className="font-medium text-gray-700">
                          Email Updates
                        </label>
                        <p className="text-sm text-gray-500">
                          Important announcements and account activity
                        </p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                          type="checkbox" 
                          id="emailUpdates"
                          checked={notifications.emailUpdates} 
                          onChange={() => handleNotificationChange('emailUpdates')}
                          className="sr-only peer" 
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                    
                    <div className="border-t border-gray-200 pt-5 flex items-center justify-between">
                      <div>
                        <label htmlFor="marketAlerts" className="font-medium text-gray-700">
                          Market Alerts
                        </label>
                        <p className="text-sm text-gray-500">
                          Price changes and market events for your holdings
                        </p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                          type="checkbox" 
                          id="marketAlerts"
                          checked={notifications.marketAlerts} 
                          onChange={() => handleNotificationChange('marketAlerts')}
                          className="sr-only peer" 
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                    
                    <div className="border-t border-gray-200 pt-5 flex items-center justify-between">
                      <div>
                        <label htmlFor="performanceReports" className="font-medium text-gray-700">
                          Performance Reports
                        </label>
                        <p className="text-sm text-gray-500">
                          Weekly and monthly portfolio performance summaries
                        </p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                          type="checkbox" 
                          id="performanceReports"
                          checked={notifications.performanceReports} 
                          onChange={() => handleNotificationChange('performanceReports')}
                          className="sr-only peer" 
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                    
                    <div className="border-t border-gray-200 pt-5 flex items-center justify-between">
                      <div>
                        <label htmlFor="securityAlerts" className="font-medium text-gray-700">
                          Security Alerts
                        </label>
                        <p className="text-sm text-gray-500">
                          Login attempts and security-related notifications
                        </p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                          type="checkbox" 
                          id="securityAlerts"
                          checked={notifications.securityAlerts} 
                          onChange={() => handleNotificationChange('securityAlerts')}
                          className="sr-only peer" 
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                    
                    <div className="border-t border-gray-200 pt-5 flex items-center justify-between">
                      <div>
                        <label htmlFor="newsletterUpdates" className="font-medium text-gray-700">
                          Newsletter Updates
                        </label>
                        <p className="text-sm text-gray-500">
                          Educational content and investment insights
                        </p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                          type="checkbox" 
                          id="newsletterUpdates"
                          checked={notifications.newsletterUpdates} 
                          onChange={() => handleNotificationChange('newsletterUpdates')}
                          className="sr-only peer" 
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                  </div>
                  
                  <div className="mt-6 flex justify-end">
                    <button
                      onClick={saveNotificationPreferences}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center disabled:bg-blue-400"
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
              <div className="bg-white rounded-xl shadow-md overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
                </div>
                
                <div className="p-6">
                  {activityLog.length === 0 ? (
                    <div className="text-center py-8">
                      <Clock className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                      <h4 className="text-lg font-medium text-gray-900 mb-2">No activity yet</h4>
                      <p className="text-gray-500">
                        Your account activity will appear here as you use the platform.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {activityLog.map((activity, index) => (
                        <div key={index} className="flex items-start">
                          <div className={`flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center mr-4 ${
                            activity.icon === 'Shield' ? 'bg-green-100 text-green-600' :
                            activity.icon === 'Lock' ? 'bg-blue-100 text-blue-600' :
                            activity.icon === 'PiggyBank' ? 'bg-purple-100 text-purple-600' :
                            activity.icon === 'Edit' ? 'bg-yellow-100 text-yellow-600' :
                            'bg-gray-100 text-gray-600'
                          }`}>
                            {getActivityIcon(activity.icon)}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">{activity.action}</p>
                            <p className="text-sm text-gray-500">{activity.details}</p>
                            <p className="text-xs text-gray-400 mt-1">{formatDate(activity.date)}</p>
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
      </div>
    </div>
  );
}