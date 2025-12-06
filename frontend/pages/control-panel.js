import React, { useState, useEffect, useContext, useCallback } from "react";
import { AuthContext } from "@/context/AuthContext";
import { useRouter } from "next/router";
import { fetchWithAuth } from "@/utils/api";
import {
  RefreshCcw,
  Users,
  Activity,
  AlertTriangle,
  CheckCircle,
  Server,
  Database,
  Clock,
  TrendingUp,
  Shield,
  Search,
  ChevronDown,
  ChevronUp,
  BarChart3,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  XCircle,
  Eye,
  Settings,
  Zap,
  Calendar,
  Globe,
  Smartphone,
  Monitor,
  Mail,
  ShieldCheck,
  ShieldX,
  Loader2,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  PieChart,
  Layers,
  HardDrive,
  WifiOff,
  Wifi
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// Stat Card Component
const StatCard = ({ title, value, subValue, icon: Icon, trend, trendValue, color = "blue" }) => {
  const colorClasses = {
    blue: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    green: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    amber: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    red: "bg-red-500/10 text-red-400 border-red-500/20",
    purple: "bg-purple-500/10 text-purple-400 border-purple-500/20"
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-5 border border-gray-700/50"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-gray-400 text-sm font-medium">{title}</p>
          <p className="text-2xl font-bold text-white mt-1">{value}</p>
          {subValue && <p className="text-gray-500 text-xs mt-1">{subValue}</p>}
        </div>
        <div className={`p-3 rounded-lg border ${colorClasses[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      {trend && (
        <div className="flex items-center mt-3 text-sm">
          {trend === "up" ? (
            <ArrowUpRight className="w-4 h-4 text-emerald-400 mr-1" />
          ) : (
            <ArrowDownRight className="w-4 h-4 text-red-400 mr-1" />
          )}
          <span className={trend === "up" ? "text-emerald-400" : "text-red-400"}>
            {trendValue}
          </span>
        </div>
      )}
    </motion.div>
  );
};

// Health Status Badge
const HealthBadge = ({ status }) => {
  const statusConfig = {
    online: { icon: CheckCircle2, color: "text-emerald-400 bg-emerald-500/10", label: "Online" },
    degraded: { icon: AlertCircle, color: "text-amber-400 bg-amber-500/10", label: "Degraded" },
    offline: { icon: XCircle, color: "text-red-400 bg-red-500/10", label: "Offline" },
    unknown: { icon: HardDrive, color: "text-gray-400 bg-gray-500/10", label: "Unknown" }
  };

  const config = statusConfig[status] || statusConfig.unknown;
  const Icon = config.icon;

  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${config.color}`}>
      <Icon className="w-3 h-3 mr-1" />
      {config.label}
    </span>
  );
};

// User Row Component
const UserRow = ({ user, onToggleAdmin, isUpdating }) => {
  return (
    <motion.tr
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="border-b border-gray-700/50 hover:bg-gray-800/30"
    >
      <td className="px-4 py-3">
        <div className="flex items-center">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-sm font-medium">
            {user.first_name?.[0] || user.email?.[0]?.toUpperCase() || "?"}
          </div>
          <div className="ml-3">
            <p className="text-white font-medium">
              {user.first_name || user.last_name
                ? `${user.first_name || ""} ${user.last_name || ""}`.trim()
                : "No name"}
            </p>
            <p className="text-gray-500 text-xs">{user.email}</p>
          </div>
        </div>
      </td>
      <td className="px-4 py-3 text-gray-400 text-sm">
        {user.created_at ? new Date(user.created_at).toLocaleDateString() : "N/A"}
      </td>
      <td className="px-4 py-3 text-gray-400 text-sm">
        {user.last_login_at ? new Date(user.last_login_at).toLocaleString() : "Never"}
      </td>
      <td className="px-4 py-3 text-gray-400 text-sm text-center">
        {user.login_count || 0}
      </td>
      <td className="px-4 py-3 text-gray-400 text-sm text-center">
        {user.account_count || 0}
      </td>
      <td className="px-4 py-3">
        <span className={`inline-flex items-center px-2 py-1 rounded text-xs ${
          user.subscription_plan === "pro"
            ? "bg-purple-500/20 text-purple-400"
            : user.subscription_plan === "premium"
            ? "bg-amber-500/20 text-amber-400"
            : "bg-gray-500/20 text-gray-400"
        }`}>
          {user.subscription_plan || "basic"}
        </span>
      </td>
      <td className="px-4 py-3">
        <button
          onClick={() => onToggleAdmin(user.id, !user.is_admin)}
          disabled={isUpdating}
          className={`inline-flex items-center px-2.5 py-1 rounded text-xs font-medium transition-colors ${
            user.is_admin
              ? "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30"
              : "bg-gray-500/20 text-gray-400 hover:bg-gray-500/30"
          } ${isUpdating ? "opacity-50 cursor-not-allowed" : ""}`}
        >
          {user.is_admin ? (
            <>
              <ShieldCheck className="w-3 h-3 mr-1" />
              Admin
            </>
          ) : (
            <>
              <ShieldX className="w-3 h-3 mr-1" />
              User
            </>
          )}
        </button>
      </td>
    </motion.tr>
  );
};

// Activity Row Component
const ActivityRow = ({ activity }) => {
  return (
    <motion.tr
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="border-b border-gray-700/50 hover:bg-gray-800/30"
    >
      <td className="px-4 py-3">
        <div className="flex items-center">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-sm font-medium">
            {activity.first_name?.[0] || activity.email?.[0]?.toUpperCase() || "?"}
          </div>
          <div className="ml-3">
            <p className="text-white font-medium">
              {activity.first_name || activity.last_name
                ? `${activity.first_name || ""} ${activity.last_name || ""}`.trim()
                : activity.email}
            </p>
            <p className="text-gray-500 text-xs">{activity.email}</p>
          </div>
        </div>
      </td>
      <td className="px-4 py-3 text-gray-400 text-sm">
        {activity.last_login_at ? new Date(activity.last_login_at).toLocaleString() : "N/A"}
      </td>
      <td className="px-4 py-3 text-gray-400 text-sm">
        <div className="flex items-center">
          <Globe className="w-3 h-3 mr-1.5 text-gray-500" />
          {activity.last_login_city && activity.last_login_country
            ? `${activity.last_login_city}, ${activity.last_login_country}`
            : activity.last_login_country || "Unknown"}
        </div>
      </td>
      <td className="px-4 py-3 text-gray-400 text-sm font-mono text-xs">
        {activity.last_login_ip || "N/A"}
      </td>
      <td className="px-4 py-3 text-gray-400 text-sm">
        <div className="flex items-center">
          {activity.last_login_device?.toLowerCase().includes("mobile") ? (
            <Smartphone className="w-3 h-3 mr-1.5 text-gray-500" />
          ) : (
            <Monitor className="w-3 h-3 mr-1.5 text-gray-500" />
          )}
          {activity.last_login_browser || "Unknown"}
        </div>
      </td>
    </motion.tr>
  );
};

// Error Row Component
const ErrorRow = ({ error, isExpanded, onToggle }) => {
  return (
    <>
      <motion.tr
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="border-b border-gray-700/50 hover:bg-gray-800/30 cursor-pointer"
        onClick={onToggle}
      >
        <td className="px-4 py-3">
          <div className="flex items-center">
            <XCircle className="w-4 h-4 text-red-400 mr-2" />
            <span className="text-white font-medium">{error.event_type}</span>
          </div>
        </td>
        <td className="px-4 py-3 text-gray-400 text-sm">
          {error.started_at ? new Date(error.started_at).toLocaleString() : "N/A"}
        </td>
        <td className="px-4 py-3 text-red-400 text-sm truncate max-w-xs">
          {error.error_message || "No error message"}
        </td>
        <td className="px-4 py-3 text-gray-400">
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </td>
      </motion.tr>
      <AnimatePresence>
        {isExpanded && (
          <motion.tr
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
          >
            <td colSpan={4} className="px-4 py-3 bg-gray-800/50">
              <div className="text-sm">
                <p className="text-gray-400 mb-2">
                  <span className="text-gray-500">Started:</span>{" "}
                  {error.started_at ? new Date(error.started_at).toLocaleString() : "N/A"}
                </p>
                <p className="text-gray-400 mb-2">
                  <span className="text-gray-500">Completed:</span>{" "}
                  {error.completed_at ? new Date(error.completed_at).toLocaleString() : "N/A"}
                </p>
                <p className="text-red-400 mb-2">
                  <span className="text-gray-500">Error:</span> {error.error_message || "No message"}
                </p>
                {error.details && (
                  <div className="mt-2">
                    <span className="text-gray-500">Details:</span>
                    <pre className="mt-1 p-2 bg-gray-900 rounded text-xs text-gray-400 overflow-x-auto">
                      {JSON.stringify(error.details, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </td>
          </motion.tr>
        )}
      </AnimatePresence>
    </>
  );
};

// Data Refresh Event Row
const RefreshEventRow = ({ event }) => {
  const statusColors = {
    completed: "text-emerald-400 bg-emerald-500/10",
    failed: "text-red-400 bg-red-500/10",
    started: "text-amber-400 bg-amber-500/10"
  };

  return (
    <tr className="border-b border-gray-700/50 hover:bg-gray-800/30">
      <td className="px-4 py-3">
        <span className="text-white text-sm">{event.event_type}</span>
      </td>
      <td className="px-4 py-3">
        <span className={`inline-flex items-center px-2 py-1 rounded text-xs ${statusColors[event.status] || statusColors.started}`}>
          {event.status === "completed" && <CheckCircle className="w-3 h-3 mr-1" />}
          {event.status === "failed" && <XCircle className="w-3 h-3 mr-1" />}
          {event.status === "started" && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
          {event.status}
        </span>
      </td>
      <td className="px-4 py-3 text-gray-400 text-sm">
        {event.started_at ? new Date(event.started_at).toLocaleString() : "N/A"}
      </td>
      <td className="px-4 py-3 text-gray-400 text-sm">
        {event.completed_at
          ? new Date(event.completed_at).toLocaleString()
          : event.status === "started"
          ? "In progress..."
          : "N/A"}
      </td>
    </tr>
  );
};

export default function ControlPanel() {
  const { user } = useContext(AuthContext);
  const router = useRouter();

  // State
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [stats, setStats] = useState(null);
  const [health, setHealth] = useState(null);
  const [users, setUsers] = useState([]);
  const [usersTotal, setUsersTotal] = useState(0);
  const [activities, setActivities] = useState([]);
  const [errors, setErrors] = useState([]);
  const [dataRefresh, setDataRefresh] = useState(null);
  const [expandedError, setExpandedError] = useState(null);
  const [userSearch, setUserSearch] = useState("");
  const [updating, setUpdating] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Check admin status
  useEffect(() => {
    if (!user) {
      router.push("/login");
      return;
    }

    const checkAdmin = async () => {
      try {
        const response = await fetchWithAuth("/admin/check");
        if (response.ok) {
          const data = await response.json();
          setIsAdmin(data.is_admin);
          if (!data.is_admin) {
            // Redirect non-admins
            router.push("/portfolio");
          } else {
            // Load initial data
            await loadDashboardData();
          }
        } else {
          router.push("/portfolio");
        }
      } catch (error) {
        console.error("Error checking admin status:", error);
        router.push("/portfolio");
      } finally {
        setLoading(false);
      }
    };

    checkAdmin();
  }, [user, router]);

  // Load dashboard data
  const loadDashboardData = useCallback(async () => {
    setRefreshing(true);
    try {
      const [statsRes, healthRes] = await Promise.all([
        fetchWithAuth("/admin/dashboard/stats"),
        fetchWithAuth("/admin/health")
      ]);

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }

      if (healthRes.ok) {
        const healthData = await healthRes.json();
        setHealth(healthData);
      }
    } catch (error) {
      console.error("Error loading dashboard data:", error);
    } finally {
      setRefreshing(false);
    }
  }, []);

  // Load users
  const loadUsers = useCallback(async () => {
    try {
      const params = new URLSearchParams({ limit: "50", offset: "0" });
      if (userSearch) params.append("search", userSearch);

      const response = await fetchWithAuth(`/admin/users?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users);
        setUsersTotal(data.total);
      }
    } catch (error) {
      console.error("Error loading users:", error);
    }
  }, [userSearch]);

  // Load activities
  const loadActivities = useCallback(async () => {
    try {
      const response = await fetchWithAuth("/admin/activity?limit=50");
      if (response.ok) {
        const data = await response.json();
        setActivities(data.activities);
      }
    } catch (error) {
      console.error("Error loading activities:", error);
    }
  }, []);

  // Load errors
  const loadErrors = useCallback(async () => {
    try {
      const response = await fetchWithAuth("/admin/errors?limit=50");
      if (response.ok) {
        const data = await response.json();
        setErrors(data.errors);
      }
    } catch (error) {
      console.error("Error loading errors:", error);
    }
  }, []);

  // Load data refresh status
  const loadDataRefresh = useCallback(async () => {
    try {
      const response = await fetchWithAuth("/admin/data-refresh");
      if (response.ok) {
        const data = await response.json();
        setDataRefresh(data);
      }
    } catch (error) {
      console.error("Error loading data refresh status:", error);
    }
  }, []);

  // Load tab data when tab changes
  useEffect(() => {
    if (!isAdmin) return;

    switch (activeTab) {
      case "users":
        loadUsers();
        break;
      case "activity":
        loadActivities();
        break;
      case "errors":
        loadErrors();
        break;
      case "refresh":
        loadDataRefresh();
        break;
    }
  }, [activeTab, isAdmin, loadUsers, loadActivities, loadErrors, loadDataRefresh]);

  // Reload users when search changes
  useEffect(() => {
    if (activeTab === "users") {
      const debounce = setTimeout(() => {
        loadUsers();
      }, 300);
      return () => clearTimeout(debounce);
    }
  }, [userSearch, activeTab, loadUsers]);

  // Toggle admin status
  const toggleAdminStatus = async (userId, newStatus) => {
    setUpdating(true);
    try {
      const response = await fetchWithAuth(`/admin/users/${userId}/admin-status`, {
        method: "PUT",
        body: JSON.stringify({ is_admin: newStatus })
      });

      if (response.ok) {
        // Update local state
        setUsers(prev =>
          prev.map(u => (u.id === userId ? { ...u, is_admin: newStatus } : u))
        );
        // Reload stats
        loadDashboardData();
      }
    } catch (error) {
      console.error("Error updating admin status:", error);
    } finally {
      setUpdating(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-500 animate-spin mx-auto" />
          <p className="text-gray-400 mt-4">Loading admin panel...</p>
        </div>
      </div>
    );
  }

  // Non-admin access denied
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Shield className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Access Denied</h1>
          <p className="text-gray-400">You need admin privileges to access this page.</p>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: "overview", label: "Overview", icon: BarChart3 },
    { id: "users", label: "Users", icon: Users },
    { id: "activity", label: "Activity", icon: Activity },
    { id: "refresh", label: "Data Refresh", icon: RefreshCw },
    { id: "errors", label: "Errors", icon: AlertTriangle }
  ];

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <header className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Shield className="w-8 h-8 text-blue-400" />
                <h1 className="text-3xl font-bold text-white">Admin Control Panel</h1>
              </div>
              <p className="text-gray-400">Monitor and manage your NestEgg application</p>
            </div>
            <button
              onClick={() => loadDashboardData()}
              disabled={refreshing}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              <RefreshCcw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mt-6 border-b border-gray-700">
            {tabs.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-3 font-medium transition-colors border-b-2 -mb-px ${
                    activeTab === tab.id
                      ? "text-blue-400 border-blue-400"
                      : "text-gray-400 border-transparent hover:text-gray-300"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                  {tab.id === "errors" && errors.length > 0 && (
                    <span className="ml-1 px-1.5 py-0.5 bg-red-500/20 text-red-400 text-xs rounded-full">
                      {errors.length}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </header>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          {/* Overview Tab */}
          {activeTab === "overview" && stats && (
            <motion.div
              key="overview"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              {/* System Health */}
              {health && (
                <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-5 border border-gray-700/50 mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                      <Server className="w-5 h-5 text-blue-400" />
                      System Health
                    </h2>
                    <HealthBadge status={health.status} />
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {Object.entries(health.components || {}).map(([name, component]) => (
                      <div key={name} className="bg-gray-900/50 rounded-lg p-3">
                        <p className="text-gray-400 text-sm capitalize mb-1">{name.replace(/([A-Z])/g, " $1").trim()}</p>
                        <HealthBadge status={component.status} />
                        {component.latency_ms && (
                          <p className="text-gray-500 text-xs mt-1">{component.latency_ms}ms latency</p>
                        )}
                        {component.recentFailures !== undefined && (
                          <p className="text-gray-500 text-xs mt-1">{component.recentFailures} recent failures</p>
                        )}
                        {component.staleSecurities !== undefined && (
                          <p className="text-gray-500 text-xs mt-1">{component.staleSecurities} stale prices</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* User Stats */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <StatCard
                  title="Total Users"
                  value={stats.users?.total || 0}
                  subValue={`${stats.users?.adminCount || 0} admins`}
                  icon={Users}
                  color="blue"
                />
                <StatCard
                  title="Active Users (7d)"
                  value={stats.users?.activeLast7d || 0}
                  subValue={`${stats.users?.activeLast24h || 0} in last 24h`}
                  icon={Activity}
                  color="green"
                />
                <StatCard
                  title="New Users (30d)"
                  value={stats.users?.newLast30d || 0}
                  subValue={`${stats.users?.newLast7d || 0} this week`}
                  icon={TrendingUp}
                  color="purple"
                />
                <StatCard
                  title="Total Logins"
                  value={stats.users?.totalLogins?.toLocaleString() || 0}
                  icon={Shield}
                  color="amber"
                />
              </div>

              {/* Data Stats */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <StatCard
                  title="Total Accounts"
                  value={stats.data?.totalAccounts || 0}
                  subValue={`${stats.data?.usersWithAccounts || 0} users with accounts`}
                  icon={Wallet}
                  color="blue"
                />
                <StatCard
                  title="Total Positions"
                  value={stats.data?.positions?.total || 0}
                  subValue={`${stats.data?.positions?.securities || 0} securities`}
                  icon={Layers}
                  color="green"
                />
                <StatCard
                  title="Securities Tracked"
                  value={stats.marketData?.totalSecurities || 0}
                  subValue={`${stats.marketData?.stalePrices || 0} stale`}
                  icon={PieChart}
                  color="purple"
                />
                <StatCard
                  title="Portfolio Snapshots"
                  value={stats.snapshots?.total || 0}
                  subValue={`${stats.snapshots?.usersWithSnapshots || 0} users`}
                  icon={Calendar}
                  color="amber"
                />
              </div>

              {/* System Events Stats */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                  title="System Events (24h)"
                  value={stats.systemEvents?.eventsLast24h || 0}
                  subValue={`${stats.systemEvents?.total || 0} total`}
                  icon={Activity}
                  color="blue"
                />
                <StatCard
                  title="Completed Events"
                  value={stats.systemEvents?.completed || 0}
                  icon={CheckCircle}
                  color="green"
                />
                <StatCard
                  title="Errors (24h)"
                  value={stats.systemEvents?.errorsLast24h || 0}
                  subValue={`${stats.systemEvents?.failed || 0} total failed`}
                  icon={AlertTriangle}
                  color="red"
                />
                <StatCard
                  title="Stuck Jobs"
                  value={stats.systemEvents?.stuck || 0}
                  icon={Clock}
                  color="amber"
                />
              </div>

              {/* Position Breakdown */}
              {stats.data?.positions && (
                <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-5 border border-gray-700/50 mt-6">
                  <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <Database className="w-5 h-5 text-blue-400" />
                    Position Breakdown
                  </h2>
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                    {[
                      { label: "Securities", value: stats.data.positions.securities, color: "blue" },
                      { label: "Cash", value: stats.data.positions.cash, color: "green" },
                      { label: "Crypto", value: stats.data.positions.crypto, color: "purple" },
                      { label: "Metals", value: stats.data.positions.metals, color: "amber" },
                      { label: "Real Estate", value: stats.data.positions.realEstate, color: "red" },
                      { label: "Other Assets", value: stats.data.positions.otherAssets, color: "gray" },
                      { label: "Liabilities", value: stats.data.positions.liabilities, color: "red" }
                    ].map(item => (
                      <div key={item.label} className="bg-gray-900/50 rounded-lg p-3 text-center">
                        <p className="text-2xl font-bold text-white">{item.value || 0}</p>
                        <p className="text-gray-400 text-sm">{item.label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* Users Tab */}
          {activeTab === "users" && (
            <motion.div
              key="users"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 overflow-hidden">
                <div className="p-4 border-b border-gray-700/50 flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-white">Users ({usersTotal})</h2>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input
                      type="text"
                      placeholder="Search users..."
                      value={userSearch}
                      onChange={e => setUserSearch(e.target.value)}
                      className="pl-10 pr-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
                    />
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-900/50">
                      <tr className="text-left text-gray-400 text-sm">
                        <th className="px-4 py-3 font-medium">User</th>
                        <th className="px-4 py-3 font-medium">Joined</th>
                        <th className="px-4 py-3 font-medium">Last Login</th>
                        <th className="px-4 py-3 font-medium text-center">Logins</th>
                        <th className="px-4 py-3 font-medium text-center">Accounts</th>
                        <th className="px-4 py-3 font-medium">Plan</th>
                        <th className="px-4 py-3 font-medium">Role</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map(user => (
                        <UserRow
                          key={user.id}
                          user={user}
                          onToggleAdmin={toggleAdminStatus}
                          isUpdating={updating}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
                {users.length === 0 && (
                  <div className="p-8 text-center text-gray-500">
                    {userSearch ? "No users match your search" : "No users found"}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* Activity Tab */}
          {activeTab === "activity" && (
            <motion.div
              key="activity"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 overflow-hidden">
                <div className="p-4 border-b border-gray-700/50">
                  <h2 className="text-lg font-semibold text-white">Recent Activity</h2>
                  <p className="text-gray-400 text-sm">User login activity</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-900/50">
                      <tr className="text-left text-gray-400 text-sm">
                        <th className="px-4 py-3 font-medium">User</th>
                        <th className="px-4 py-3 font-medium">Login Time</th>
                        <th className="px-4 py-3 font-medium">Location</th>
                        <th className="px-4 py-3 font-medium">IP Address</th>
                        <th className="px-4 py-3 font-medium">Device</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activities.map(activity => (
                        <ActivityRow key={activity.id} activity={activity} />
                      ))}
                    </tbody>
                  </table>
                </div>
                {activities.length === 0 && (
                  <div className="p-8 text-center text-gray-500">No activity data available</div>
                )}
              </div>
            </motion.div>
          )}

          {/* Data Refresh Tab */}
          {activeTab === "refresh" && (
            <motion.div
              key="refresh"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              {/* Price Updates */}
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 overflow-hidden">
                <div className="p-4 border-b border-gray-700/50">
                  <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-green-400" />
                    Price Updates
                  </h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-900/50">
                      <tr className="text-left text-gray-400 text-sm">
                        <th className="px-4 py-3 font-medium">Event Type</th>
                        <th className="px-4 py-3 font-medium">Status</th>
                        <th className="px-4 py-3 font-medium">Started</th>
                        <th className="px-4 py-3 font-medium">Completed</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dataRefresh?.priceUpdates?.map(event => (
                        <RefreshEventRow key={event.id} event={event} />
                      ))}
                    </tbody>
                  </table>
                </div>
                {(!dataRefresh?.priceUpdates || dataRefresh.priceUpdates.length === 0) && (
                  <div className="p-8 text-center text-gray-500">No price update events</div>
                )}
              </div>

              {/* Portfolio Calculations */}
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 overflow-hidden">
                <div className="p-4 border-b border-gray-700/50">
                  <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                    <PieChart className="w-5 h-5 text-blue-400" />
                    Portfolio Calculations
                  </h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-900/50">
                      <tr className="text-left text-gray-400 text-sm">
                        <th className="px-4 py-3 font-medium">Event Type</th>
                        <th className="px-4 py-3 font-medium">Status</th>
                        <th className="px-4 py-3 font-medium">Started</th>
                        <th className="px-4 py-3 font-medium">Completed</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dataRefresh?.portfolioCalculations?.map(event => (
                        <RefreshEventRow key={event.id} event={event} />
                      ))}
                    </tbody>
                  </table>
                </div>
                {(!dataRefresh?.portfolioCalculations || dataRefresh.portfolioCalculations.length === 0) && (
                  <div className="p-8 text-center text-gray-500">No portfolio calculation events</div>
                )}
              </div>

              {/* Snapshots */}
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 overflow-hidden">
                <div className="p-4 border-b border-gray-700/50">
                  <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-purple-400" />
                    Portfolio Snapshots
                  </h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-900/50">
                      <tr className="text-left text-gray-400 text-sm">
                        <th className="px-4 py-3 font-medium">Event Type</th>
                        <th className="px-4 py-3 font-medium">Status</th>
                        <th className="px-4 py-3 font-medium">Started</th>
                        <th className="px-4 py-3 font-medium">Completed</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dataRefresh?.snapshots?.map(event => (
                        <RefreshEventRow key={event.id} event={event} />
                      ))}
                    </tbody>
                  </table>
                </div>
                {(!dataRefresh?.snapshots || dataRefresh.snapshots.length === 0) && (
                  <div className="p-8 text-center text-gray-500">No snapshot events</div>
                )}
              </div>
            </motion.div>
          )}

          {/* Errors Tab */}
          {activeTab === "errors" && (
            <motion.div
              key="errors"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 overflow-hidden">
                <div className="p-4 border-b border-gray-700/50">
                  <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-red-400" />
                    System Errors
                  </h2>
                  <p className="text-gray-400 text-sm">Failed system events</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-900/50">
                      <tr className="text-left text-gray-400 text-sm">
                        <th className="px-4 py-3 font-medium">Event Type</th>
                        <th className="px-4 py-3 font-medium">Time</th>
                        <th className="px-4 py-3 font-medium">Error Message</th>
                        <th className="px-4 py-3 font-medium w-10"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {errors.map(error => (
                        <ErrorRow
                          key={error.id}
                          error={error}
                          isExpanded={expandedError === error.id}
                          onToggle={() => setExpandedError(expandedError === error.id ? null : error.id)}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
                {errors.length === 0 && (
                  <div className="p-8 text-center">
                    <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
                    <p className="text-gray-400">No errors to display</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
