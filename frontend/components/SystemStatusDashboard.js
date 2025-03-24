// components/SystemStatusDashboard.js
import React, { useState, useEffect } from 'react';
import { RefreshCw, Server, Database, AlertCircle, CheckCircle, Clock, Activity, X } from 'lucide-react';
import SkeletonLoader from './SkeletonLoader';
import { fetchWithAuth } from '@/utils/api';

const SystemStatusDashboard = () => {
  const [systemStatus, setSystemStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchSystemStatus = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const healthResponse = await fetchWithAuth(`/admin/health`);
      
      if (!healthResponse.ok) {
        throw new Error(`Failed to fetch system health: ${healthResponse.status}`);
      }
      
      const healthData = await healthResponse.json();
      
      // Fetch recent system events for additional status context
      const eventsResponse = await fetchWithAuth(`/system/events?limit=5`);
      
      let eventsData = { events: [] };
      if (eventsResponse.ok) {
        eventsData = await eventsResponse.json();
      }
      
      // Combine health and events data
      setSystemStatus({
        health: healthData,
        events: eventsData.events || []
      });
      
      setLastUpdated(new Date());
    } catch (err) {
      setError(err.message || "Failed to fetch system status");
      console.error("Error fetching system status:", err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch status on component mount
  useEffect(() => {
    fetchSystemStatus();
    
    // Auto-refresh every 5 minutes
    const interval = setInterval(fetchSystemStatus, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);

  // Helper function to render status indicators
  const renderStatusBadge = (status) => {
    const statusConfig = {
      online: { icon: <CheckCircle className="w-4 h-4" />, color: "text-green-500 bg-green-100" },
      degraded: { icon: <AlertCircle className="w-4 h-4" />, color: "text-yellow-500 bg-yellow-100" },
      offline: { icon: <X className="w-4 h-4" />, color: "text-red-500 bg-red-100" },
      unknown: { icon: <Activity className="w-4 h-4" />, color: "text-gray-500 bg-gray-100" }
    };
    
    const config = statusConfig[status] || statusConfig.unknown;
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        {config.icon}
        <span className="ml-1 capitalize">{status}</span>
      </span>
    );
  };

  // Helper function to get event status icon
  const getEventStatusIcon = (status) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case "failed":
        return <X className="w-5 h-5 text-red-500" />;
      case "started":
        return <Clock className="w-5 h-5 text-blue-500" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-500" />;
    }
  };

  // Helper function to format relative time
  const getRelativeTime = (timestamp) => {
    if (!timestamp) return "N/A";
    
    const date = new Date(timestamp);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);
    
    if (seconds < 60) return `${seconds} seconds ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
    return `${Math.floor(seconds / 86400)} days ago`;
  };

  if (loading && !systemStatus) {
    return (
      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">System Status</h3>
          <SkeletonLoader type="card" height="h-16" count={3} className="mb-4" />
          <SkeletonLoader type="table-row" count={3} />
        </div>
      </div>
    );
  }

  if (error && !systemStatus) {
    return (
      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">System Status</h3>
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <AlertCircle className="h-5 w-5 text-red-400" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Failed to load system status</h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>{error}</p>
                </div>
                <div className="mt-4">
                  <button
                    type="button"
                    onClick={fetchSystemStatus}
                    className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                  >
                    <RefreshCw className="w-4 h-4 mr-1" />
                    Retry
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden">
      <div className="px-4 py-5 sm:p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg leading-6 font-medium text-gray-900">System Status</h3>
          <div className="flex items-center">
            {lastUpdated && (
              <span className="text-sm text-gray-500 mr-3">
                Last updated: {lastUpdated.toLocaleTimeString()}
              </span>
            )}
            <button
              onClick={fetchSystemStatus}
              disabled={loading}
              className="inline-flex items-center px-2.5 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <RefreshCw className={`w-4 h-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>
        
        {systemStatus && (
          <>
            {/* Health Status Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium text-gray-500">Overall Status</h4>
                  {renderStatusBadge(systemStatus.health.status)}
                </div>
                <Server className="w-8 h-8 text-gray-400 my-2" />
                <p className="text-xs text-gray-500">
                  Last check: {systemStatus.health.lastCheck 
                    ? new Date(systemStatus.health.lastCheck).toLocaleString() 
                    : "Unknown"}
                </p>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium text-gray-500">Database</h4>
                  {renderStatusBadge(systemStatus.health.components.database?.status || 'unknown')}
                </div>
                <Database className="w-8 h-8 text-gray-400 my-2" />
                <p className="text-xs text-gray-500">Primary data storage</p>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium text-gray-500">API Services</h4>
                  {renderStatusBadge(systemStatus.health.components.api?.status || 'unknown')}
                </div>
                <Activity className="w-8 h-8 text-gray-400 my-2" />
                <p className="text-xs text-gray-500">Core application services</p>
              </div>
            </div>
            
            {/* Recent System Events */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-3">Recent System Events</h4>
              <div className="space-y-3">
                {systemStatus.events.length > 0 ? (
                  systemStatus.events.map((event) => (
                    <div key={event.id} className="border border-gray-100 rounded-lg p-3 hover:bg-gray-50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          {getEventStatusIcon(event.status)}
                          <span className="ml-2 font-medium">{event.event_type}</span>
                        </div>
                        <span className="text-sm text-gray-500">
                          {getRelativeTime(event.started_at)}
                        </span>
                      </div>
                      
                      <div className="mt-2 text-sm">
                        <div className="flex justify-between text-gray-600">
                          <span>Status: <span className={
                            event.status === "completed" ? "text-green-600" : 
                            event.status === "failed" ? "text-red-600" : 
                            "text-blue-600"
                          }>{event.status}</span></span>
                          
                          {event.status === "completed" && event.completed_at && event.started_at && (
                            <span>
                              Duration: {
                                Math.floor((new Date(event.completed_at) - new Date(event.started_at)) / 1000)
                              } seconds
                            </span>
                          )}
                        </div>
                        
                        {event.error_message && (
                          <div className="mt-1 text-red-600 text-xs">
                            Error: {event.error_message}
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 text-center py-4">No recent system events</p>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default SystemStatusDashboard;