import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { CheckCircle2, Circle, Clock, Calendar, DollarSign, Zap, Tag, FolderOpen, Plus, Search, Filter, ChevronDown, ChevronRight, MoreVertical, Trash2, Edit2, Copy, Link2, MapPin, Smartphone, TrendingUp, Target, Brain, Coffee, Moon, Sun, Briefcase, Home, Heart, GraduationCap, ShoppingCart, Receipt, PiggyBank, X, Check, AlertCircle, Activity, BarChart3, Sparkles, Trophy, Flame, ArrowRight, Archive, Eye, EyeOff, Repeat, Star, Flag, Users, ChevronUp, Layers, Timer, BatteryLow, Battery, BatteryFull, Wind, Gauge, CalendarClock, ListTodo, Lightbulb, ArrowUpRight, Coins, Wallet, TrendingDown, Shield, RefreshCw, FileText, Calculator } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line, Area, AreaChart } from 'recharts';
import { fetchWithAuth } from '@/utils/api';
import { formatCurrency, formatPercentage } from '@/utils/formatters';

const TodoDashboard = () => {
  // State Management
  const [tasks, setTasks] = useState([]);
  const [groups, setGroups] = useState([]);
  const [tags, setTags] = useState([]);
  const [stats, setStats] = useState(null);
  const [productivityData, setProductivityData] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [selectedTask, setSelectedTask] = useState(null);
  const [showNewTask, setShowNewTask] = useState(false);
  const [filters, setFilters] = useState({
    status: [],
    priority: [],
    category: [],
    search: '',
    view: 'all' // all, today, week, overdue, financial, mobile
  });
  const [sortBy, setSortBy] = useState('due_date');
  const [viewMode, setViewMode] = useState('list'); // list, kanban, calendar
  const [suggestionContext, setSuggestionContext] = useState('now');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Constants with NestEgg color scheme
  const categories = {
    work: { icon: Briefcase, color: 'indigo', gradient: 'from-indigo-500 to-indigo-600' },
    personal: { icon: Home, color: 'blue', gradient: 'from-blue-500 to-blue-600' },
    financial: { icon: DollarSign, color: 'green', gradient: 'from-green-500 to-green-600' },
    health: { icon: Heart, color: 'red', gradient: 'from-red-500 to-red-600' },
    home: { icon: Home, color: 'purple', gradient: 'from-purple-500 to-purple-600' },
    family: { icon: Users, color: 'pink', gradient: 'from-pink-500 to-pink-600' },
    learning: { icon: GraduationCap, color: 'yellow', gradient: 'from-yellow-500 to-yellow-600' },
    shopping: { icon: ShoppingCart, color: 'orange', gradient: 'from-orange-500 to-orange-600' },
    bills: { icon: Receipt, color: 'rose', gradient: 'from-rose-500 to-rose-600' },
    investments: { icon: TrendingUp, color: 'emerald', gradient: 'from-emerald-500 to-emerald-600' },
    other: { icon: Layers, color: 'gray', gradient: 'from-gray-500 to-gray-600' }
  };

  const priorities = {
    critical: { icon: AlertCircle, color: 'red', label: 'Critical', gradient: 'from-red-600 to-red-700' },
    high: { icon: ChevronUp, color: 'orange', label: 'High', gradient: 'from-orange-500 to-orange-600' },
    medium: { icon: Flag, color: 'yellow', label: 'Medium', gradient: 'from-yellow-500 to-yellow-600' },
    low: { icon: ChevronDown, color: 'blue', label: 'Low', gradient: 'from-blue-500 to-blue-600' },
    someday: { icon: Star, color: 'gray', label: 'Someday', gradient: 'from-gray-500 to-gray-600' }
  };

  const energyLevels = {
    high: { icon: BatteryFull, color: 'green', label: 'High Energy', gradient: 'from-green-500 to-green-600' },
    medium: { icon: Battery, color: 'yellow', label: 'Medium Energy', gradient: 'from-yellow-500 to-yellow-600' },
    low: { icon: BatteryLow, color: 'orange', label: 'Low Energy', gradient: 'from-orange-500 to-orange-600' },
    minimal: { icon: Wind, color: 'blue', label: 'Minimal Effort', gradient: 'from-blue-400 to-blue-500' }
  };

  // Load initial data
  useEffect(() => {
    loadDashboardData();
  }, [filters, sortBy]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      // Build query params
      const params = new URLSearchParams({
        sort_by: sortBy,
        skip: 0,
        limit: 100
      });

      if (filters.search) params.append('search', filters.search);
      if (filters.status.length) filters.status.forEach(s => params.append('status', s));
      if (filters.priority.length) filters.priority.forEach(p => params.append('priority', p));
      if (filters.category.length) filters.category.forEach(c => params.append('category', c));

      // Apply view filters
      if (filters.view === 'today') {
        params.append('due_before', new Date(Date.now() + 86400000).toISOString());
        params.append('due_after', new Date().toISOString());
      } else if (filters.view === 'week') {
        params.append('due_before', new Date(Date.now() + 604800000).toISOString());
      } else if (filters.view === 'overdue') {
        params.append('overdue_only', 'true');
      } else if (filters.view === 'financial') {
        params.append('is_financial', 'true');
      } else if (filters.view === 'mobile') {
        params.append('is_mobile_friendly', 'true');
      }

      // Fetch all data in parallel
      const [tasksData, groupsData, statsData, suggestionsData] = await Promise.all([
        fetchWithAuth(`/api/tasks?${params}`),
        fetchWithAuth('/api/tasks/groups'),
        fetchWithAuth('/api/tasks/stats/summary'),
        fetchWithAuth(`/api/tasks/suggestions?context=${suggestionContext}`)
      ]);

      setTasks(tasksData);
      setGroups(groupsData);
      setStats(statsData);
      setSuggestions(suggestionsData.suggestions);

      // Load productivity data for the last 30 days
      const endDate = new Date();
      const startDate = new Date(Date.now() - 30 * 86400000);
      const productivityData = await fetchWithAuth(
        `/api/tasks/stats/productivity?start_date=${startDate.toISOString().split('T')[0]}&end_date=${endDate.toISOString().split('T')[0]}`
      );
      setProductivityData(productivityData);

    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Refresh data
  const handleRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  // Task Management Functions
  const createTask = async (taskData) => {
    try {
      const newTask = await fetchWithAuth('/api/tasks', {
        method: 'POST',
        body: JSON.stringify(taskData)
      });
      setTasks([newTask, ...tasks]);
      setShowNewTask(false);
      loadDashboardData(); // Refresh stats
    } catch (error) {
      console.error('Failed to create task:', error);
    }
  };

  const updateTask = async (taskId, updates) => {
    try {
      const updatedTask = await fetchWithAuth(`/api/tasks/${taskId}`, {
        method: 'PUT',
        body: JSON.stringify(updates)
      });
      setTasks(tasks.map(t => t.id === taskId ? updatedTask : t));
      if (selectedTask?.id === taskId) setSelectedTask(updatedTask);
      loadDashboardData(); // Refresh stats
    } catch (error) {
      console.error('Failed to update task:', error);
    }
  };

  const deleteTask = async (taskId) => {
    try {
      await fetchWithAuth(`/api/tasks/${taskId}`, {
        method: 'DELETE'
      });
      setTasks(tasks.filter(t => t.id !== taskId));
      if (selectedTask?.id === taskId) setSelectedTask(null);
      loadDashboardData(); // Refresh stats
    } catch (error) {
      console.error('Failed to delete task:', error);
    }
  };

  const toggleTaskComplete = async (task) => {
    const updates = {
      status: task.status === 'completed' ? 'pending' : 'completed',
      completed_at: task.status === 'completed' ? null : new Date().toISOString()
    };
    await updateTask(task.id, updates);
  };

  // Quick Add Task Component
  const QuickAddTask = () => {
    const [title, setTitle] = useState('');
    const [category, setCategory] = useState('personal');
    const [priority, setPriority] = useState('medium');
    const [dueDate, setDueDate] = useState('');
    const [estimatedCost, setEstimatedCost] = useState('');
    const [tagInput, setTagInput] = useState('');
    const [taskTags, setTaskTags] = useState([]);

    const handleSubmit = (e) => {
      e.preventDefault();
      createTask({
        title,
        category,
        priority,
        due_date: dueDate || null,
        estimated_cost: estimatedCost ? parseFloat(estimatedCost) : null,
        tags: taskTags,
        is_financial: category === 'financial' || category === 'bills' || category === 'investments',
        is_mobile_friendly: category === 'shopping' || priority === 'low'
      });
      setTitle('');
      setDueDate('');
      setEstimatedCost('');
      setTaskTags([]);
    };

    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
        <div className="bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-gray-700">
          <div className="p-6 border-b border-gray-700">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-white">Create New Task</h2>
                <p className="text-gray-400 text-sm mt-1">Time is money - make every task count!</p>
              </div>
              <button
                onClick={() => setShowNewTask(false)}
                className="p-2 hover:bg-gray-700 rounded-lg transition-all"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                What needs to be done?
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-gray-400"
                placeholder="Enter task title..."
                required
                autoFocus
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white"
                >
                  {Object.entries(categories).map(([key, { icon: Icon }]) => (
                    <option key={key} value={key}>
                      {key.charAt(0).toUpperCase() + key.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Priority
                </label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white"
                >
                  {Object.entries(priorities).map(([key, { label }]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Due Date
                </label>
                <input
                  type="datetime-local"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Estimated Cost
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">$</span>
                  <input
                    type="number"
                    value={estimatedCost}
                    onChange={(e) => setEstimatedCost(e.target.value)}
                    className="w-full pl-8 pr-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-gray-400"
                    placeholder="0.00"
                    step="0.01"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Tags
              </label>
              <div className="flex flex-wrap gap-2 mb-2">
                {taskTags.map((tag, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full text-sm flex items-center gap-1 border border-blue-500/30"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => setTaskTags(taskTags.filter((_, i) => i !== index))}
                      className="hover:bg-blue-500/30 rounded-full p-0.5 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && tagInput.trim()) {
                    e.preventDefault();
                    setTaskTags([...taskTags, tagInput.trim()]);
                    setTagInput('');
                  }
                }}
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-gray-400"
                placeholder="Type and press Enter to add tags..."
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={() => setShowNewTask(false)}
                className="px-6 py-2 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-700 transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all shadow-lg hover:shadow-xl"
              >
                Create Task
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  // Task Detail Modal
  const TaskDetailModal = ({ task, onClose }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editedTask, setEditedTask] = useState(task);

    const handleSave = async () => {
      await updateTask(task.id, editedTask);
      setIsEditing(false);
    };

    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
        <div className="bg-gray-800 rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto border border-gray-700">
          <div className="p-6 border-b border-gray-700">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => toggleTaskComplete(task)}
                  className="p-2 hover:bg-gray-700 rounded-lg transition-all"
                >
                  {task.status === 'completed' ? 
                    <CheckCircle2 className="w-6 h-6 text-green-500" /> : 
                    <Circle className="w-6 h-6 text-gray-400" />
                  }
                </button>
                {isEditing ? (
                  <input
                    type="text"
                    value={editedTask.title}
                    onChange={(e) => setEditedTask({...editedTask, title: e.target.value})}
                    className="text-2xl font-bold px-3 py-1 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  />
                ) : (
                  <h2 className="text-2xl font-bold text-white">{task.title}</h2>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => isEditing ? handleSave() : setIsEditing(true)}
                  className="p-2 hover:bg-gray-700 rounded-lg transition-all"
                >
                  {isEditing ? <Check className="w-5 h-5 text-green-500" /> : <Edit2 className="w-5 h-5 text-gray-400" />}
                </button>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-gray-700 rounded-lg transition-all"
                >
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* Meta Information */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gray-700/50 rounded-lg p-3 border border-gray-600">
                <div className="text-sm text-gray-400 mb-1">Priority</div>
                <div className="flex items-center gap-2">
                  {priorities[task.priority].icon && 
                    React.createElement(priorities[task.priority].icon, {
                      className: `w-4 h-4 text-${priorities[task.priority].color}-400`
                    })
                  }
                  <span className="font-medium text-white">{priorities[task.priority].label}</span>
                </div>
              </div>

              <div className="bg-gray-700/50 rounded-lg p-3 border border-gray-600">
                <div className="text-sm text-gray-400 mb-1">Category</div>
                <div className="flex items-center gap-2">
                  {categories[task.category].icon && 
                    React.createElement(categories[task.category].icon, {
                      className: `w-4 h-4 text-${categories[task.category].color}-400`
                    })
                  }
                  <span className="font-medium text-white capitalize">{task.category}</span>
                </div>
              </div>

              <div className="bg-gray-700/50 rounded-lg p-3 border border-gray-600">
                <div className="text-sm text-gray-400 mb-1">Energy Level</div>
                <div className="flex items-center gap-2">
                  {energyLevels[task.energy_level].icon && 
                    React.createElement(energyLevels[task.energy_level].icon, {
                      className: `w-4 h-4 text-${energyLevels[task.energy_level].color}-400`
                    })
                  }
                  <span className="font-medium text-white">{energyLevels[task.energy_level].label}</span>
                </div>
              </div>

              <div className="bg-gray-700/50 rounded-lg p-3 border border-gray-600">
                <div className="text-sm text-gray-400 mb-1">Due Date</div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <span className="font-medium text-white">
                    {task.due_date ? new Date(task.due_date).toLocaleDateString() : 'No due date'}
                  </span>
                </div>
              </div>
            </div>

            {/* Description */}
            {(task.description || isEditing) && (
              <div>
                <h3 className="font-semibold mb-2 text-gray-300">Description</h3>
                {isEditing ? (
                  <textarea
                    value={editedTask.description || ''}
                    onChange={(e) => setEditedTask({...editedTask, description: e.target.value})}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg resize-none text-white"
                    rows="4"
                  />
                ) : (
                  <p className="text-gray-300 whitespace-pre-wrap">{task.description}</p>
                )}
              </div>
            )}

            {/* Financial Information */}
            {(task.estimated_cost || task.actual_cost) && (
              <div className="bg-gradient-to-r from-green-900/20 to-emerald-900/20 rounded-lg p-4 border border-green-800/30">
                <h3 className="font-semibold mb-3 flex items-center gap-2 text-green-400">
                  <DollarSign className="w-5 h-5" />
                  Financial Impact
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-gray-400">Estimated Cost</div>
                    <div className="text-lg font-semibold text-white">${task.estimated_cost || '0.00'}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-400">Actual Cost</div>
                    <div className="text-lg font-semibold text-white">${task.actual_cost || '0.00'}</div>
                  </div>
                </div>
                {task.actual_cost && task.estimated_cost && (
                  <div className="mt-3 pt-3 border-t border-gray-700">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-400">Variance</span>
                      <span className={`font-medium ${task.actual_cost > task.estimated_cost ? 'text-red-400' : 'text-green-400'}`}>
                        {task.actual_cost > task.estimated_cost ? '+' : '-'}
                        ${Math.abs(task.actual_cost - task.estimated_cost).toFixed(2)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Subtasks */}
            {task.subtasks && task.subtasks.length > 0 && (
              <div>
                <h3 className="font-semibold mb-3 text-gray-300">Subtasks</h3>
                <div className="space-y-2">
                  {task.subtasks.map((subtask) => (
                    <div key={subtask.id} className="flex items-center gap-3 p-2 hover:bg-gray-700/50 rounded-lg transition-colors">
                      <button
                        onClick={() => {/* Handle subtask toggle */}}
                        className="p-1"
                      >
                        {subtask.is_completed ? 
                          <CheckCircle2 className="w-4 h-4 text-green-500" /> : 
                          <Circle className="w-4 h-4 text-gray-400" />
                        }
                      </button>
                      <span className={`${subtask.is_completed ? 'line-through text-gray-500' : 'text-gray-300'}`}>
                        {subtask.title}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tags */}
            {task.tags && task.tags.length > 0 && (
              <div>
                <h3 className="font-semibold mb-3 text-gray-300">Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {task.tags.map((tag) => (
                    <span
                      key={tag.id}
                      className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full text-sm border border-blue-500/30"
                    >
                      {tag.name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-between items-center pt-4 border-t border-gray-700">
              <button
                onClick={() => deleteTask(task.id)}
                className="px-4 py-2 text-red-400 hover:bg-red-900/20 rounded-lg transition-all flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Delete Task
              </button>
              <div className="flex gap-2">
                <button className="px-4 py-2 border border-gray-600 rounded-lg hover:bg-gray-700 transition-all flex items-center gap-2 text-gray-300">
                  <Copy className="w-4 h-4" />
                  Duplicate
                </button>
                <button className="px-4 py-2 border border-gray-600 rounded-lg hover:bg-gray-700 transition-all flex items-center gap-2 text-gray-300">
                  <Archive className="w-4 h-4" />
                  Archive
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Task Card Component
  const TaskCard = ({ task }) => {
    const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'completed';
    const CategoryIcon = categories[task.category]?.icon || Layers;
    const PriorityIcon = priorities[task.priority]?.icon || Flag;
    const EnergyIcon = energyLevels[task.energy_level]?.icon || Battery;

    return (
      <div
        className={`bg-gray-800/70 backdrop-blur-sm rounded-xl border p-4 hover:shadow-lg transition-all cursor-pointer ${
          task.status === 'completed' ? 'opacity-60' : ''
        } ${isOverdue ? 'border-red-500/50' : 'border-gray-700'} hover:border-blue-500/50`}
        onClick={() => setSelectedTask(task)}
      >
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-start gap-3 flex-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleTaskComplete(task);
              }}
              className="mt-0.5 flex-shrink-0"
            >
              {task.status === 'completed' ? 
                <CheckCircle2 className="w-5 h-5 text-green-500" /> : 
                <Circle className="w-5 h-5 text-gray-400 hover:text-blue-400 transition-colors" />
              }
            </button>
            <div className="flex-1">
              <h3 className={`font-medium text-white ${task.status === 'completed' ? 'line-through text-gray-500' : ''}`}>
                {task.title}
              </h3>
              {task.description && (
                <p className="text-sm text-gray-400 mt-1 line-clamp-2">{task.description}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 ml-2">
            <PriorityIcon className={`w-4 h-4 text-${priorities[task.priority].color}-400`} />
            <CategoryIcon className={`w-4 h-4 text-${categories[task.category].color}-400`} />
            <EnergyIcon className={`w-4 h-4 text-${energyLevels[task.energy_level].color}-400`} />
          </div>
        </div>

        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-3">
            {task.due_date && (
              <div className={`flex items-center gap-1 ${isOverdue ? 'text-red-400' : 'text-gray-400'}`}>
                <Calendar className="w-3 h-3" />
                <span>{new Date(task.due_date).toLocaleDateString()}</span>
              </div>
            )}
            {task.estimated_cost && (
              <div className="flex items-center gap-1 text-green-400">
                <DollarSign className="w-3 h-3" />
                <span>${task.estimated_cost}</span>
              </div>
            )}
            {task.estimated_duration_minutes && (
              <div className="flex items-center gap-1 text-blue-400">
                <Clock className="w-3 h-3" />
                <span>{task.estimated_duration_minutes}m</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            {task.is_financial && (
              <span className="px-2 py-0.5 bg-green-500/20 text-green-400 rounded-full text-xs border border-green-500/30">
                Financial
              </span>
            )}
            {task.is_mobile_friendly && (
              <Smartphone className="w-3 h-3 text-blue-400" />
            )}
            {task.subtasks && task.subtasks.length > 0 && (
              <span className="text-xs text-gray-500">
                {task.subtasks.filter(s => s.is_completed).length}/{task.subtasks.length}
              </span>
            )}
          </div>
        </div>

        {task.tags && task.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {task.tags.slice(0, 3).map((tag) => (
              <span
                key={tag.id}
                className="px-2 py-0.5 text-xs rounded-full bg-gray-700/50 text-gray-400 border border-gray-600"
              >
                {tag.name}
              </span>
            ))}
            {task.tags.length > 3 && (
              <span className="px-2 py-0.5 text-xs text-gray-500">
                +{task.tags.length - 3} more
              </span>
            )}
          </div>
        )}
      </div>
    );
  };

  // Smart Suggestions Component
  const SmartSuggestions = () => {
    const contextIcons = {
      now: Zap,
      morning: Sun,
      evening: Moon,
      weekend: Coffee,
      low_energy: BatteryLow,
      high_focus: Brain,
      financial: DollarSign,
      mobile: Smartphone
    };

    const contextMessages = {
      now: "Time to focus! Here's what needs your attention right now.",
      morning: "Start strong! High-energy tasks to power through your morning.",
      evening: "Wind down productively with these lighter tasks.",
      weekend: "Weekend warrior mode! Personal projects and life admin.",
      low_energy: "Feeling tired? These quick wins will keep you moving.",
      high_focus: "Deep work time! Complex tasks that need your full attention.",
      financial: "Money matters! Tasks that impact your financial future.",
      mobile: "On the go? Tasks you can knock out from anywhere."
    };

    return (
      <div className="bg-gradient-to-r from-blue-900/20 to-indigo-900/20 rounded-2xl p-6 mb-6 border border-blue-800/30">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-500/20 rounded-lg">
              <Lightbulb className="w-6 h-6 text-yellow-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Smart Suggestions</h2>
              <p className="text-sm text-gray-400">{contextMessages[suggestionContext]}</p>
            </div>
          </div>
          <div className="flex gap-2">
            {Object.entries(contextIcons).map(([context, Icon]) => (
              <button
                key={context}
                onClick={() => {
                  setSuggestionContext(context);
                  loadDashboardData();
                }}
                className={`p-2 rounded-lg transition-all ${
                  suggestionContext === context 
                    ? 'bg-blue-600 shadow-lg' 
                    : 'hover:bg-gray-700'
                }`}
                title={context.charAt(0).toUpperCase() + context.slice(1)}
              >
                <Icon className="w-4 h-4 text-white" />
              </button>
            ))}
          </div>
        </div>

        {suggestions.length > 0 ? (
          <div className="grid gap-3">
            {suggestions.slice(0, 5).map((task) => (
              <div
                key={task.id}
                className="bg-gray-800/50 rounded-lg p-3 flex items-center justify-between hover:bg-gray-700/50 transition-all cursor-pointer group"
                onClick={() => setSelectedTask(task)}
              >
                <div className="flex items-center gap-3">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleTaskComplete(task);
                    }}
                    className="flex-shrink-0"
                  >
                    <Circle className="w-5 h-5 text-gray-400 hover:text-blue-400 transition-colors" />
                  </button>
                  <div>
                    <h4 className="font-medium text-white">{task.title}</h4>
                    <div className="flex items-center gap-3 text-sm text-gray-400 mt-1">
                      <span className="flex items-center gap-1">
                        {React.createElement(priorities[task.priority].icon, { className: 'w-3 h-3' })}
                        {priorities[task.priority].label}
                      </span>
                      <span className="flex items-center gap-1">
                        {React.createElement(categories[task.category].icon, { className: 'w-3 h-3' })}
                        {task.category}
                      </span>
                      {task.due_date && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(task.due_date).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-white transition-colors" />
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-400 text-center py-4">
            No suggestions available for the current context.
          </p>
        )}
      </div>
    );
  };

  // Stats Dashboard Component with Charts
  const StatsDashboard = () => {
    if (!stats) return null;

    const { counts, insights, category_stats } = stats;
    const completionRate = Math.round(insights.completion_rate * 100);

    // Prepare chart data
    const categoryChartData = category_stats?.map(cat => ({
      name: cat.category,
      completed: cat.completed,
      pending: cat.total - cat.completed,
      total: cat.total
    })) || [];

    const productivityTrend = productivityData?.map(day => ({
      date: new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      completed: day.tasks_completed,
      score: day.focus_score
    })) || [];

    return (
      <>
        {/* Hero Stats Section */}
        <div className="bg-gradient-to-r from-blue-900/30 to-purple-900/30 rounded-2xl p-6 mb-6 border border-blue-800/30">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold text-white">Your Productivity Dashboard</h2>
              <p className="text-gray-400">Time is money - track your progress and maximize your potential!</p>
            </div>
            <button
              onClick={handleRefresh}
              className="p-2 hover:bg-gray-700 rounded-lg transition-all"
              disabled={refreshing}
            >
              <RefreshCw className={`w-5 h-5 text-gray-400 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-400">Completion Rate</h3>
                <Trophy className="w-5 h-5 text-yellow-400" />
              </div>
              <div className="text-3xl font-bold text-white">{completionRate}%</div>
              <div className="mt-2 w-full bg-gray-700 rounded-full h-2">
                <div 
                  className="bg-gradient-to-r from-green-400 to-green-600 h-2 rounded-full transition-all"
                  style={{ width: `${completionRate}%` }}
                />
              </div>
            </div>

            <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-400">Active Tasks</h3>
                <Activity className="w-5 h-5 text-blue-400" />
              </div>
              <div className="text-3xl font-bold text-white">{counts.pending_count + counts.in_progress_count}</div>
              <div className="flex items-center gap-4 mt-2 text-sm">
                <span className="flex items-center gap-1 text-orange-400">
                  <Circle className="w-3 h-3" />
                  {counts.pending_count} pending
                </span>
                <span className="flex items-center gap-1 text-blue-400">
                  <Clock className="w-3 h-3" />
                  {counts.in_progress_count} active
                </span>
              </div>
            </div>

            <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-400">Financial Impact</h3>
                <Wallet className="w-5 h-5 text-green-400" />
              </div>
              <div className="text-3xl font-bold text-white">${insights.financial_impact.toFixed(2)}</div>
              <div className="text-sm text-gray-400 mt-2">
                ${counts.budget_remaining?.toFixed(2) || '0.00'} budgeted
              </div>
            </div>

            <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-400">Time Invested</h3>
                <Timer className="w-5 h-5 text-purple-400" />
              </div>
              <div className="text-3xl font-bold text-white">{insights.total_time_hours.toFixed(1)}h</div>
              <div className="text-sm text-gray-400 mt-2">
                {insights.avg_daily_completions.toFixed(1)} tasks/day
              </div>
            </div>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Category Performance */}
          <div className="bg-gray-800/70 backdrop-blur-sm rounded-xl p-4 border border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-4">Category Performance</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="name" tick={{ fill: '#9CA3AF' }} />
                  <YAxis tick={{ fill: '#9CA3AF' }} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151' }}
                    itemStyle={{ color: '#E5E7EB' }}
                  />
                  <Bar dataKey="completed" stackId="a" fill="#10B981" />
                  <Bar dataKey="pending" stackId="a" fill="#EF4444" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Productivity Trend */}
          <div className="bg-gray-800/70 backdrop-blur-sm rounded-xl p-4 border border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-4">30-Day Productivity Trend</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={productivityTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="date" tick={{ fill: '#9CA3AF' }} />
                  <YAxis tick={{ fill: '#9CA3AF' }} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151' }}
                    itemStyle={{ color: '#E5E7EB' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="completed" 
                    stroke="#3B82F6" 
                    fill="#3B82F6" 
                    fillOpacity={0.3}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </>
    );
  };

  // Main Render
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-blue-900 text-white">
      <div className="container mx-auto p-4 md:p-8">
        {/* Header */}
        <header className="mb-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-3">
                <div className="p-2 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-lg">
                  <Target className="w-8 h-8" />
                </div>
                Task Command Center
              </h1>
              <p className="text-gray-400 mt-2">Transform your time into wealth - every task is an investment in your future!</p>
            </div>
            <button
              onClick={() => setShowNewTask(true)}
              className="mt-4 md:mt-0 px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all flex items-center gap-2 shadow-lg hover:shadow-xl"
            >
              <Plus className="w-5 h-5" />
              New Task
            </button>
          </div>
        </header>

        {/* Stats Dashboard */}
        <StatsDashboard />

        {/* Smart Suggestions */}
        <SmartSuggestions />

        {/* Filters and View Controls */}
        <div className="bg-gray-800/70 backdrop-blur-sm rounded-xl border border-gray-700 p-4 mb-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search tasks..."
                  value={filters.search}
                  onChange={(e) => setFilters({...filters, search: e.target.value})}
                  className="pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-gray-400"
                />
              </div>
              
              <div className="flex gap-2">
                <button
                  onClick={() => setFilters({...filters, view: 'all'})}
                  className={`px-3 py-1 rounded-lg transition-all ${
                    filters.view === 'all' ? 'bg-blue-600 text-white' : 'hover:bg-gray-700 text-gray-300'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setFilters({...filters, view: 'today'})}
                  className={`px-3 py-1 rounded-lg transition-all ${
                    filters.view === 'today' ? 'bg-blue-600 text-white' : 'hover:bg-gray-700 text-gray-300'
                  }`}
                >
                  Today
                </button>
                <button
                  onClick={() => setFilters({...filters, view: 'week'})}
                  className={`px-3 py-1 rounded-lg transition-all ${
                    filters.view === 'week' ? 'bg-blue-600 text-white' : 'hover:bg-gray-700 text-gray-300'
                  }`}
                >
                  This Week
                </button>
                <button
                  onClick={() => setFilters({...filters, view: 'overdue'})}
                  className={`px-3 py-1 rounded-lg transition-all flex items-center gap-1 ${
                    filters.view === 'overdue' ? 'bg-red-600 text-white' : 'hover:bg-gray-700 text-gray-300'
                  }`}
                >
                  <AlertCircle className="w-4 h-4" />
                  Overdue
                </button>
                <button
                  onClick={() => setFilters({...filters, view: 'financial'})}
                  className={`px-3 py-1 rounded-lg transition-all flex items-center gap-1 ${
                    filters.view === 'financial' ? 'bg-green-600 text-white' : 'hover:bg-gray-700 text-gray-300'
                  }`}
                >
                  <DollarSign className="w-4 h-4" />
                  Financial
                </button>
                <button
                  onClick={() => setFilters({...filters, view: 'mobile'})}
                  className={`px-3 py-1 rounded-lg transition-all flex items-center gap-1 ${
                    filters.view === 'mobile' ? 'bg-blue-600 text-white' : 'hover:bg-gray-700 text-gray-300'
                  }`}
                >
                  <Smartphone className="w-4 h-4" />
                  Mobile
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-3 py-1 bg-gray-700 border border-gray-600 rounded-lg text-sm text-white"
              >
                <option value="due_date">Due Date</option>
                <option value="priority">Priority</option>
                <option value="created_at">Created</option>
                <option value="status">Status</option>
              </select>
              
              <div className="flex border border-gray-600 rounded-lg overflow-hidden">
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 ${viewMode === 'list' ? 'bg-gray-700' : ''} hover:bg-gray-700 transition-colors`}
                >
                  <ListTodo className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('kanban')}
                  className={`p-2 ${viewMode === 'kanban' ? 'bg-gray-700' : ''} hover:bg-gray-700 transition-colors`}
                >
                  <Layers className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('calendar')}
                  className={`p-2 ${viewMode === 'calendar' ? 'bg-gray-700' : ''} hover:bg-gray-700 transition-colors`}
                >
                  <CalendarClock className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Task List */}
        <div className="space-y-3">
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-flex items-center gap-3">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400"></div>
                <span className="text-gray-400">Loading your productivity dashboard...</span>
              </div>
            </div>
          ) : tasks.length === 0 ? (
            <div className="bg-gray-800/70 backdrop-blur-sm rounded-xl border border-gray-700 p-12 text-center">
              <div className="max-w-md mx-auto">
                <div className="p-4 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                  <CheckCircle2 className="w-10 h-10 text-blue-400" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">Ready to Build Your Future?</h3>
                <p className="text-gray-400 mb-6">
                  Time is money! Start organizing your tasks and watch your productivity soar. 
                  Every completed task brings you closer to your financial goals.
                </p>
                <button
                  onClick={() => setShowNewTask(true)}
                  className="px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all inline-flex items-center gap-2 shadow-lg hover:shadow-xl"
                >
                  <Plus className="w-5 h-5" />
                  Create Your First Task
                </button>
              </div>
            </div>
          ) : (
            tasks.map((task) => <TaskCard key={task.id} task={task} />)
          )}
        </div>

        {/* Quick Tips Footer */}
        <div className="mt-12 bg-gradient-to-r from-indigo-900/30 to-purple-900/30 rounded-xl p-6 border border-indigo-800/30">
          <div className="flex items-center gap-3 mb-4">
            <Shield className="w-6 h-6 text-indigo-400" />
            <h3 className="text-lg font-semibold text-white">Pro Tips for Maximum Productivity</h3>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="flex items-start gap-3">
              <Calculator className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-medium text-white mb-1">Track Financial Impact</h4>
                <p className="text-sm text-gray-400">
                  Add cost estimates to see how tasks affect your budget and build better financial habits.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Coins className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-medium text-white mb-1">Time = Money</h4>
                <p className="text-sm text-gray-400">
                  Every hour saved is an hour you can invest in building wealth. Prioritize high-impact tasks!
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <TrendingUp className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-medium text-white mb-1">Track Your Progress</h4>
                <p className="text-sm text-gray-400">
                  Monitor your productivity trends to identify patterns and optimize your daily routine.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      {showNewTask && <QuickAddTask />}
      {selectedTask && (
        <TaskDetailModal 
          task={selectedTask} 
          onClose={() => setSelectedTask(null)} 
        />
      )}
    </div>
  );
};

export default TodoDashboard;