import { useState, useEffect, useContext } from 'react';
import Head from 'next/head';
import { DashboardLayout } from '@/components/dashboard-layout';
import { fetchWithAuth } from '@/utils/api';
import { AuthContext } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Check, AlertCircle, Info, Calendar, Clock } from 'lucide-react';

export default function SchedulerPage() {
  const auth = useContext(AuthContext); // Use AuthContext directly
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [executionHistory, setExecutionHistory] = useState([]);
  const [selectedTab, setSelectedTab] = useState('schedules');
  const [configValues, setConfigValues] = useState({});
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  // Fetch scheduler data
  useEffect(() => {
    const fetchSchedulerData = async () => {
      try {
        if (!auth.user) return;
        
        setLoading(true);
        const response = await fetchWithAuth('/system/scheduler/status');
        
        if (response.ok) {
          const data = await response.json();
          setSchedules(data.schedules || []);
          setConfigValues(data.config || {});
        }
        
        // Fetch execution history
        const historyResponse = await fetchWithAuth('/system/scheduler/history');
        if (historyResponse.ok) {
          const historyData = await historyResponse.json();
          setExecutionHistory(historyData.history || []);
        }
      } catch (error) {
        console.error('Error fetching scheduler data:', error);
        toast({
          title: "Error",
          description: "Failed to fetch scheduler information",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchSchedulerData();
  }, [auth.user]);
  
  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    return date.toLocaleString();
  };
  
  // Get status badge color
  const getStatusBadge = (status) => {
    switch (status) {
      case 'success':
        return <Badge variant="success">Success</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      case 'running':
        return <Badge variant="default" className="bg-blue-500">Running</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };
  
  // Handle config value change
  const handleConfigChange = (key, value) => {
    setConfigValues(prev => ({
      ...prev,
      [key]: value
    }));
  };
  
  // Save config changes
  const saveConfigChanges = async () => {
    try {
      setIsSaving(true);
      const response = await fetchWithAuth('/system/scheduler/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(configValues),
      });
      
      if (response.ok) {
        toast({
          title: "Success",
          description: "Scheduler configuration updated",
          variant: "default"
        });
        setIsEditing(false);
      } else {
        toast({
          title: "Error",
          description: "Failed to update configuration",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error saving config:', error);
      toast({
        title: "Error",
        description: "An error occurred while saving configuration",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };
  
  // Manual trigger function
  const triggerSchedule = async (scheduleId) => {
    try {
      const response = await fetchWithAuth('/system/scheduler/trigger', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ schedule_id: scheduleId }),
      });
      
      if (response.ok) {
        toast({
          title: "Success",
          description: "Schedule triggered successfully",
          variant: "default"
        });
        
        // Refresh data
        const refreshResponse = await fetchWithAuth('/system/scheduler/status');
        if (refreshResponse.ok) {
          const data = await refreshResponse.json();
          setSchedules(data.schedules || []);
        }
      } else {
        toast({
          title: "Error",
          description: "Failed to trigger schedule",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error triggering schedule:', error);
      toast({
        title: "Error",
        description: "An error occurred",
        variant: "destructive"
      });
    }
  };
  
  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex justify-center items-center h-full">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }
  
  return (
    <>
      <Head>
        <title>System Scheduler - NestEgg</title>
      </Head>
      <DashboardLayout>
        <div className="container mx-auto p-4">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold">System Scheduler</h1>
            {auth.user?.is_admin && (
              <div>
                {isEditing ? (
                  <div className="space-x-2">
                    <Button 
                      variant="outline" 
                      onClick={() => setIsEditing(false)}
                      disabled={isSaving}
                    >
                      Cancel
                    </Button>
                    <Button 
                      onClick={saveConfigChanges}
                      disabled={isSaving}
                    >
                      {isSaving ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>Save Changes</>
                      )}
                    </Button>
                  </div>
                ) : (
                  <Button 
                    variant="outline" 
                    onClick={() => setIsEditing(true)}
                  >
                    Edit Configuration
                  </Button>
                )}
              </div>
            )}
          </div>
          
          <Tabs defaultValue="schedules" onValueChange={setSelectedTab} value={selectedTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="schedules">Scheduled Tasks</TabsTrigger>
              <TabsTrigger value="history">Execution History</TabsTrigger>
              {auth.user?.is_admin && (
                <TabsTrigger value="configuration">Configuration</TabsTrigger>
              )}
            </TabsList>
            
            <TabsContent value="schedules">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {schedules.map((schedule) => (
                  <Card key={schedule.id} className="flex flex-col">
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        {schedule.name}
                        {schedule.is_running && (
                          <Badge variant="default" className="ml-2 bg-blue-500">Running</Badge>
                        )}
                      </CardTitle>
                      <CardDescription>{schedule.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="flex-grow">
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Status:</span>
                          <span className="font-medium">
                            {schedule.enabled ? 'Enabled' : 'Disabled'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Schedule:</span>
                          <span className="font-medium flex items-center">
                            {schedule.cron_expression ? (
                              <span className="flex items-center">
                                <Calendar className="h-4 w-4 mr-1" />
                                {schedule.cron_expression}
                              </span>
                            ) : (
                              <span className="flex items-center">
                                <Clock className="h-4 w-4 mr-1" />
                                Every {schedule.interval_minutes} min
                              </span>
                            )}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Last run:</span>
                          <span className="font-medium">{formatDate(schedule.last_run)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Next run:</span>
                          <span className="font-medium">{formatDate(schedule.next_run)}</span>
                        </div>
                        {schedule.last_status && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Last status:</span>
                            <span>{getStatusBadge(schedule.last_status)}</span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                    <CardFooter>
                      <Button 
                        variant="outline" 
                        className="w-full" 
                        disabled={schedule.is_running}
                        onClick={() => triggerSchedule(schedule.id)}
                      >
                        {schedule.is_running ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Running...
                          </>
                        ) : (
                          <>Run Now</>
                        )}
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
                
                {schedules.length === 0 && (
                  <div className="col-span-full flex items-center justify-center h-40 border rounded-lg bg-muted/10">
                    <div className="text-center">
                      <Info className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                      <h3 className="text-lg font-medium">No scheduled tasks</h3>
                      <p className="text-sm text-muted-foreground">
                        No scheduled tasks are configured
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="history">
              <Card>
                <CardHeader>
                  <CardTitle>Execution History</CardTitle>
                  <CardDescription>
                    Recent task executions and their results
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {executionHistory.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse">
                        <thead>
                          <tr className="border-b">
                            <th className="px-4 py-2 text-left">Task</th>
                            <th className="px-4 py-2 text-left">Started</th>
                            <th className="px-4 py-2 text-left">Duration</th>
                            <th className="px-4 py-2 text-left">Status</th>
                            <th className="px-4 py-2 text-left">Message</th>
                          </tr>
                        </thead>
                        <tbody>
                          {executionHistory.map((entry, index) => (
                            <tr key={index} className="border-b">
                              <td className="px-4 py-2">{entry.task_name}</td>
                              <td className="px-4 py-2">{formatDate(entry.start_time)}</td>
                              <td className="px-4 py-2">
                                {entry.duration ? `${entry.duration.toFixed(2)}s` : '-'}
                              </td>
                              <td className="px-4 py-2">{getStatusBadge(entry.status)}</td>
                              <td className="px-4 py-2 max-w-xs truncate" title={entry.message || ''}>
                                {entry.message || '-'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-40">
                      <div className="text-center">
                        <Info className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                        <h3 className="text-lg font-medium">No history yet</h3>
                        <p className="text-sm text-muted-foreground">
                          No task execution history is available
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            {auth.user?.is_admin && (
              <TabsContent value="configuration">
                <Card>
                  <CardHeader>
                    <CardTitle>Scheduler Configuration</CardTitle>
                    <CardDescription>
                      Configure system scheduler settings
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="scheduler_enabled">Scheduler Enabled</Label>
                        <div className="flex items-center mt-1">
                          <Input
                            id="scheduler_enabled"
                            type="checkbox"
                            className="h-4 w-4"
                            checked={configValues.scheduler_enabled === "true"}
                            disabled={!isEditing}
                            onChange={(e) => handleConfigChange('scheduler_enabled', e.target.checked ? "true" : "false")}
                          />
                          <span className="ml-2">
                            {configValues.scheduler_enabled === "true" ? "Enabled" : "Disabled"}
                          </span>
                        </div>
                      </div>
                      
                      <div>
                        <Label htmlFor="price_update_frequency">Price Update Frequency (minutes)</Label>
                        <Input
                          id="price_update_frequency"
                          type="number"
                          value={configValues.price_update_frequency || ""}
                          disabled={!isEditing}
                          onChange={(e) => handleConfigChange('price_update_frequency', e.target.value)}
                          className="mt-1"
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="metrics_update_time">Metrics Update Time (HH:MM)</Label>
                        <Input
                          id="metrics_update_time"
                          type="time"
                          value={configValues.metrics_update_time || ""}
                          disabled={!isEditing}
                          onChange={(e) => handleConfigChange('metrics_update_time', e.target.value)}
                          className="mt-1"
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="history_update_time">History Update Time (HH:MM)</Label>
                        <Input
                          id="history_update_time"
                          type="time"
                          value={configValues.history_update_time || ""}
                          disabled={!isEditing}
                          onChange={(e) => handleConfigChange('history_update_time', e.target.value)}
                          className="mt-1"
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="portfolio_snapshot_time">Portfolio Snapshot Time (HH:MM)</Label>
                        <Input
                          id="portfolio_snapshot_time"
                          type="time"
                          value={configValues.portfolio_snapshot_time || ""}
                          disabled={!isEditing}
                          onChange={(e) => handleConfigChange('portfolio_snapshot_time', e.target.value)}
                          className="mt-1"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            )}
          </Tabs>
        </div>
      </DashboardLayout>
    </>
  );
}