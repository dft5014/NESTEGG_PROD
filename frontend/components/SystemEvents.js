import { useState, useEffect, useContext } from 'react';
import { fetchWithAuth } from '@/utils/api';
import { AuthContext } from '@/context/AuthContext';

export default function SystemEvents() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const auth = useContext(AuthContext);
  
  useEffect(() => {
    const fetchSystemEvents = async () => {
      try {
        if (!auth.user) return;
        
        setLoading(true);
        const response = await fetchWithAuth('/system/events');
        
        if (response.ok) {
          const data = await response.json();
          setEvents(data.events || []);
          setError(null);
        } else {
          console.error('Failed to fetch system events');
          setError('Failed to fetch system events');
        }
      } catch (err) {
        console.error('Error fetching system events:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    
    fetchSystemEvents();
    
    // Set up polling interval for live updates
    const interval = setInterval(fetchSystemEvents, 30000); // Every 30 seconds
    
    return () => clearInterval(interval);
  }, [auth.user]);
  
  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleString();
  };
  
  // Get severity class
  const getSeverityClass = (severity) => {
    switch (severity.toLowerCase()) {
      case 'error':
        return 'text-red-600';
      case 'warning':
        return 'text-yellow-600';
      case 'info':
        return 'text-blue-600';
      case 'success':
        return 'text-green-600';
      default:
        return 'text-gray-600';
    }
  };
  
  if (loading) {
    return (
      <div className="flex justify-center items-center h-40">
        <div className="animate-spin h-6 w-6 border-2 border-blue-600 rounded-full border-t-transparent"></div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="border border-red-200 rounded-md p-4 bg-red-50">
        <h3 className="text-red-800 font-medium flex items-center">
          <span className="mr-2">⚠️</span>
          Error
        </h3>
        <p className="text-sm text-red-700 mt-1">{error}</p>
      </div>
    );
  }
  
  if (events.length === 0) {
    return (
      <div className="border border-gray-200 rounded-md p-4">
        <h3 className="font-medium text-lg">System Events</h3>
        <p className="text-sm text-gray-500">Recent system events and notifications</p>
        <div className="flex justify-center items-center h-24">
          <p className="text-sm text-gray-500">No system events to display</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="border border-gray-200 rounded-md p-4">
      <h3 className="font-medium text-lg">System Events</h3>
      <p className="text-sm text-gray-500 mb-4">Recent system events and notifications</p>
      
      <div className="space-y-4">
        {events.map((event, index) => (
          <div 
            key={index} 
            className="border-b pb-3 last:border-0 last:pb-0"
          >
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-1">
              <div className="font-medium">{event.title}</div>
              <div className="flex space-x-2 text-xs text-gray-500 mt-1 sm:mt-0">
                <span>{formatDate(event.timestamp)}</span>
                <span className={`${getSeverityClass(event.severity)} font-medium`}>
                  {event.severity}
                </span>
              </div>
            </div>
            <p className="text-sm mt-1">{event.message}</p>
            {event.details && (
              <div className="mt-2 p-2 bg-gray-100 rounded text-xs font-mono whitespace-pre-wrap overflow-x-auto">
                {typeof event.details === 'object' ? 
                  JSON.stringify(event.details, null, 2) : 
                  event.details}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}