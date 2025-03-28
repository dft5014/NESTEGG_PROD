import { useState, useEffect, useContext } from 'react';
import { fetchWithAuth } from '@/utils/api';
import { AuthContext } from '@/context/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, AlertCircle, CheckCircle2, Info } from 'lucide-react';

export default function SystemEvents() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const auth = useContext(AuthContext); // Use AuthContext directly
  
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
  
  // Get severity badge
  const getSeverityBadge = (severity) => {
    switch (severity.toLowerCase()) {
      case 'error':
        return <Badge variant="destructive" className="flex items-center space-x-1">
          <AlertCircle className="h-3 w-3" />
          <span>Error</span>
        </Badge>;
      case 'warning':
        return <Badge variant="warning" className="flex items-center space-x-1 bg-yellow-500">
          <AlertCircle className="h-3 w-3" />
          <span>Warning</span>
        </Badge>;
      case 'info':
        return <Badge variant="secondary" className="flex items-center space-x-1">
          <Info className="h-3 w-3" />
          <span>Info</span>
        </Badge>;
      case 'success':
        return <Badge variant="success" className="flex items-center space-x-1 bg-green-500">
          <CheckCircle2 className="h-3 w-3" />
          <span>Success</span>
        </Badge>;
      default:
        return <Badge variant="outline">{severity}</Badge>;
    }
  };
  
  if (loading) {
    return (
      <div className="flex justify-center items-center h-40">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }
  
  if (error) {
    return (
      <Card className="border-destructive">
        <CardHeader className="pb-2">
          <CardTitle className="text-destructive flex items-center">
            <AlertCircle className="h-4 w-4 mr-2" />
            Error
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm">{error}</p>
        </CardContent>
      </Card>
    );
  }
  
  if (events.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle>System Events</CardTitle>
          <CardDescription>Recent system events and notifications</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center items-center h-24">
            <p className="text-sm text-muted-foreground">No system events to display</p>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle>System Events</CardTitle>
        <CardDescription>Recent system events and notifications</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {events.map((event, index) => (
            <div 
              key={index} 
              className="border-b pb-3 last:border-0 last:pb-0"
            >
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-1">
                <div className="font-medium">{event.title}</div>
                <div className="flex space-x-2 text-xs text-muted-foreground mt-1 sm:mt-0">
                  <span>{formatDate(event.timestamp)}</span>
                  {getSeverityBadge(event.severity)}
                </div>
              </div>
              <p className="text-sm mt-1">{event.message}</p>
              {event.details && (
                <div className="mt-2 p-2 bg-muted rounded text-xs font-mono whitespace-pre-wrap overflow-x-auto">
                  {typeof event.details === 'object' ? 
                    JSON.stringify(event.details, null, 2) : 
                    event.details}
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}