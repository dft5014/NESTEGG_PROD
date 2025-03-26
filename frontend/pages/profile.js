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
  Settings
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
  const [currentPlan, setCurrentPlan] = useState("premium");
  
  // Activity logs (mock data)
  const [activityLog, setActivityLog] = useState([
    {
      action: "Password changed",
      date: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
      details: "Password successfully updated from a device in New York",
      icon: "Lock"
    },
    {
      action: "Account created",
      date: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
      details: "NestEgg account successfully created",
      icon: "User"
    },
    {
      action: "Login from new device",
      date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      details: "New login detected from Windows PC in San Francisco",
      icon: "Shield"
    },
    {
      action: "Portfolio recalculated",
      date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      details: "Portfolio values updated based on latest market data",
      icon: "PiggyBank"
    },
    {
      action: "Profile updated",
      date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      details: "Profile information was updated",
      icon: "Edit"
    }
  ]);

  // Fetch user profile data
  useEffect(() => {
    const fetchProfileData = async () => {
      setLoading(true);
      try {
        // Fetch extended user profile data
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
            firstName: userData.first_name || user?.first_name || "",
            lastName: userData.last_name || user?.last_name || "",
            email: userData.email || user?.email || "",
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
          
          // Set plan
          setCurrentPlan(userData.plan || "premium");
          
          // Set notification preferences if available
          if (userData.notification_preferences) {
            setNotifications(userData.notification_preferences);
          }
        } else {
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
        setError("Failed to load profile data");
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchProfileData();
    }
  }, [user]);

  // Handle profile updates
  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccessMessage("");
    
    try {
      const response = await fetchWithAuth('/user/profile', {
        method: 'PUT',
        body: JSON.stringify(profileData)
      });
      
      if (response.ok) {
        setSuccessMessage("Profile updated successfully!");
        setEditMode(false);
        
        // Update user context if necessary
        const updatedUserData = {
          ...user,
          first_name: profileData.firstName,
          last_name: profileData.lastName,
          email: profileData.email
        };
        setUser(updatedUserData);
      } else {
        const errorData = await response.json();
        setError(errorData.detail || "Failed to update profile");
      }
    } catch (err) {
      console.error("Error updating profile:", err);
      setError("An error occurred while updating your profile");
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
    
    try {
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
      } else {
        const errorData = await response.json();
        setError(errorData.detail || "Failed to change password");
      }
    } catch (err) {
      console.error("Error changing password:", err);
      setError("An error occurred while changing your password");
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
      const response = await fetchWithAuth('/user/notifications', {
        method: 'PUT',
        body: JSON.stringify(notifications)
      });
      
      if (response.ok) {
        setSuccessMessage("Notification preferences updated!");
      } else {
        const errorData = await response.json();
        setError(errorData.detail || "Failed to update notification preferences");
      }
    } catch (err) {
      console.error("Error updating notifications:", err);
      setError("An error occurred while updating your notification preferences");
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
  
  // Helper function to get icon component
  const getActivityIcon = (iconName) => {
    switch (iconName) {
      case "User": return <User className="h-5 w-5" />;
      case "Lock": return <Lock className="h-5 w-5" />;
      case "Shield": return <Shield className="h-5 w-5" />;
      case "PiggyBank": return <PiggyBank className="h-5 w-5" />;
      case "Edit": return <Edit className="h-5 w-5" />;
      default: return <Clock className="h-5 w-5" />;
    }
  };
  
  // Format date for display
  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
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
                      {plans.find(p => p.id === currentPlan)?.name || "Premium"} Plan
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center">
                  <Award className="h-5 w-5 text-gray-400 mr-3" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Portfolio Status</p>
                    <p className="text-sm text-gray-500">
                      3 Active Accounts, 28 Positions
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
                    <span className="text-sm font-medium">Today, 9:32 AM</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Login Streak</span>
                    <span className="text-sm font-medium">12 days</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Price Updates</span>
                    <span className="text-sm font-medium">Real-time</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Storage Usage</span>
                    <span className="text-sm font-medium">48 MB / 5 GB</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Portfolio Updates</span>
                    <span className="text-sm font-medium">152 times</span>
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
                          onChange={(e) => setProfileData({...profileData, email: e.target.value})}
                          disabled={!editMode}
                          className={`w-full px-3 py-2 border ${editMode ? 'border-gray-300' : 'border-gray-200 bg-gray-50'} rounded-md`}
                        />
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
                          value={profileData.dateOfBirth}
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
                          className="px-4 py-2 bg-blue-600 text-white rounded-m                  d hover:bg-blue-700 flex items-center disabled:bg-blue-400"
                          disabled={saving}
                        >
                          <Save className="h-4 w-4 mr-2" />
                          {saving ? "Saving..." : "Save Changes"}
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
                        />
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
                        />
                      </div>
                    </div>
                    
                    <div className="mt-6 flex justify-end">
                      <button
                        type="submit"
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center disabled:bg-blue-400"
                        disabled={saving}
                      >
                        <Lock className="h-4 w-4 mr-2" />
                        {saving ? "Changing..." : "Change Password"}
                      </button>
                    </div>
                  </form>
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
                              <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                              {feature}
                            </li>
                          ))}
                        </ul>
                        <button
                          className={`w-full mt-4 px-4 py-2 text-white rounded-md ${plan.buttonColor} ${
                            currentPlan === plan.id ? "opacity-50 cursor-not-allowed" : ""
                          }`}
                          disabled={currentPlan === plan.id}
                        >
                          {currentPlan === plan.id ? "Current Plan" : "Select Plan"}
                        </button>
                      </div>
                    ))}
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
                  <div className="space-y-4">
                    {Object.entries(notifications).map(([key, value]) => (
                      <div key={key} className="flex items-center justify-between">
                        <span className="text-sm text-gray-700">
                          {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                        </span>
                        <input
                          type="checkbox"
                          checked={value}
                          onChange={() => handleNotificationChange(key)}
                          className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                        />
                      </div>
                    ))}
                  </div>
                  <div className="mt-6 flex justify-end">
                    <button
                      onClick={saveNotificationPreferences}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center disabled:bg-blue-400"
                      disabled={saving}
                    >
                      <Bell className="h-4 w-4 mr-2" />
                      {saving ? "Saving..." : "Save Preferences"}
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
                  <div className="space-y-6">
                    {activityLog.map((activity, index) => (
                      <div key={index} className="flex items-start">
                        <div className="flex-shrink-0 mr-4 text-gray-400">
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
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}