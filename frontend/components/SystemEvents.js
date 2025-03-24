import React, { useState, useEffect } from 'react';
import { RefreshCcw, CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react';
import { API_BASE_URL, fetchWithAuth } from '@/utils/api';


const SystemEvents = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const response = await fetchWithAuth(`/system/events?limit=5`);

      if (!response.ok) {
        throw new Error("Failed to fetch system events");
      }

      const data = await response.json();
      setEvents(data.events || []);
    } catch (err) {
      console.error("Error fetching system events:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchEvents();
    
    // Set up auto-refresh every 60 seconds
    const interval = setInterval(fetchEvents, 60000);
    return () => clearInterval(interval);
  }, []);

  // Format relative time (e.g., "2 minutes ago")
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

  // Get status icon based on event status
  const getStatusIcon = (status) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case "failed":
        return <XCircle className="w-5 h-5 text-red-500" />;
      case "started":
        return <Clock className="w-5 h-5 text-blue-500" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-500" />;
    }
  };

  // Get friendly name for event type
  const getEventTypeName = (type) => {
    const eventTypes = {
      "price_update": "Market Data Update",
      "portfolio_calculation": "Portfolio Calculation",
      "portfolio_snapshot": "Portfolio Snapshot",
      "metrics_update": "Company Metrics Update",
      "history_update": "Historical Data Update"
    };
    
    return eventTypes[type] || type;
  };

  // Calculate duration of completed events
  const getDuration = (startTime, endTime) => {
    if (!startTime || !endTime) return "N/A";
    
    const start = new Date(startTime);
    const end = new Date(endTime);
    const seconds = Math.floor((end - start) / 1000);
    
    if (seconds < 60) return `${seconds} seconds`;
    return `${Math.floor(seconds / 60)} minutes ${seconds % 60} seconds`;
  };

  return (
    <div className="bg-white rounded-xl shadow-md p-4 mb-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-gray-800">System Updates</h2>
        <button 
          onClick={fetchEvents} 
          className="flex items-center text-sm text-blue-600 hover:text-blue-800"
          disabled={loading}
        >
          <RefreshCcw className={`w-4 h-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>
      
      {error && (
        <div className="bg-red-50 text-red-700 p-3 rounded-md mb-4">
          {error}
        </div>
      )}
      
      {events.length === 0 ? (
        <p className="text-gray-500 text-center py-4">No recent system events</p>
      ) : (
        <div className="space-y-3">
          {events.map((event) => (
            <div key={event.id} className="border border-gray-100 rounded-lg p-3 hover:bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  {getStatusIcon(event.status)}
                  <span className="ml-2 font-medium">{getEventTypeName(event.event_type)}</span>
                </div>
                <span className="text-sm text-gray-500">{getRelativeTime(event.started_at)}</span>
              </div>
              
              <div className="mt-2 text-sm">
                <div className="flex justify-between text-gray-600">
                  <span>Status: <span className={
                    event.status === "completed" ? "text-green-600" : 
                    event.status === "failed" ? "text-red-600" : 
                    "text-blue-600"
                  }>{event.status}</span></span>
                  
                  {event.status === "completed" && (
                    <span>Duration: {getDuration(event.started_at, event.completed_at)}</span>
                  )}
                </div>
                
                {event.error_message && (
                  <div className="mt-1 text-red-600 text-xs">
                    Error: {event.error_message}
                  </div>
                )}
                
                {event.details && typeof event.details === 'object' && (
                  <div className="mt-2 text-xs bg-gray-50 p-2 rounded">
                    {Object.entries(event.details).map(([key, value]) => (
                      <div key={key} className="grid grid-cols-2 gap-2">
                        <span className="text-gray-500">{key}:</span>
                        <span>{typeof value === 'object' ? JSON.stringify(value) : value}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SystemEvents;