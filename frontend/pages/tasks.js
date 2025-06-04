import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { CheckCircle2, Circle, Clock, Calendar, DollarSign, Zap, Tag, Plus, Search, ChevronDown, ChevronRight, MoreVertical, Trash2, Edit2, X, Check, AlertCircle, Activity, Trophy, Timer, BatteryLow, Battery, BatteryFull, Gauge, ListTodo, Lightbulb, ArrowRight, Target, Briefcase, Home, Heart, GraduationCap, ShoppingCart, Receipt, TrendingUp, Users, ChevronUp, Flag, Star, Smartphone, RefreshCw, BarChart3, PieChart as PieChartIcon, Layers } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { fetchWithAuth } from '@/utils/api';
import { formatCurrency } from '@/utils/formatters';

const TodoDashboard = () => {
  // State Management
  const [tasks, setTasks] = useState([]);
  const [categories, setCategories] = useState([]);
  const [stats, setStats] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [selectedTask, setSelectedTask] = useState(null);
  const [showNewTask, setShowNewTask] = useState(false);
  const [filters, setFilters] = useState({
    status: [],
    priority: [],
    category_id: null,
    tags: [],
    search: '',
    view: 'all'
  });
  const [sortBy, setSortBy] = useState('due_date');
  const [suggestionContext, setSuggestionContext] = useState('now');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Icon mapping for categories
  const categoryIcons = {
    'briefcase': Briefcase,
    'home': Home,
    'dollar-sign': DollarSign,
    'heart': Heart,
    'users': Users,
    'graduation-cap': GraduationCap,
    'shopping-cart': ShoppingCart,
    'receipt': Receipt,
    'trending-up': TrendingUp,
    'layers': Layers
  };

  const priorities = {
    critical: { icon: AlertCircle, color: 'red', label: 'Critical' },
    high: { icon: ChevronUp, color: 'orange', label: 'High' },
    medium: { icon: Flag, color: 'yellow', label: 'Medium' },
    low: { icon: ChevronDown, color: 'blue', label: 'Low' }
  };

  const energyLevels = {
    high: { icon: BatteryFull, color: 'green', label: 'High Energy' },
    medium: { icon: Battery, color: 'yellow', label: 'Medium Energy' },
    low: { icon: BatteryLow, color: 'orange', label: 'Low Energy' },
    minimal: { icon: Gauge, color: 'blue', label: 'Minimal Effort' }
  };

  // Load initial data
  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [filters, sortBy, suggestionContext]);

  const loadCategories = async () => {
    try {
      const response = await fetchWithAuth('/api/categories');
      if (response.ok) {
        const data = await response.json();
        setCategories(data);
      }
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  };

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
      filters.status.forEach(s => params.append('status', s));
      filters.priority.forEach(p => params.append('priority', p));
      if (filters.category_id) params.append('category_id', filters.category_id);
      filters.tags.forEach(t => params.append('tags', t));

      // Apply view filters
      if (filters.view === 'today') {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        params.append('due_before', tomorrow.toISOString());
        params.append('due_after', today.toISOString());
      } else if (filters.view === 'week') {
        const nextWeek = new Date();
        nextWeek.setDate(nextWeek.getDate() + 7);
        params.append('due_before', nextWeek.toISOString());
      } else if (filters.view === 'overdue') {
        params.append('overdue_only', 'true');
      } else if (filters.view === 'financial') {
        params.append('is_financial', 'true');
      } else if (filters.view === 'mobile') {
        params.append('is_mobile_friendly', 'true');
      }

      // Fetch data
      const [tasksResponse, statsResponse, suggestionsResponse] = await Promise.all([
        fetchWithAuth(`/api/tasks?${params}`),
        fetchWithAuth('/api/tasks/stats'),
        fetchWithAuth(`/api/tasks/suggestions?context=${suggestionContext}`)
      ]);

      if (!tasksResponse.ok || !statsResponse.ok || !suggestionsResponse.ok) {
        throw new Error('Failed to fetch data');
      }

      const tasksData = await tasksResponse.json();
      const statsData = await statsResponse.json();
      const suggestionsData = await suggestionsResponse.json();

      setTasks(tasksData);
      setStats(statsData);
      setSuggestions(suggestionsData);

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
      const response = await fetchWithAuth('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(taskData)
      });
      
      if (!response.ok) throw new Error('Failed to create task');
      
      const newTask = await response.json();
      setTasks([newTask, ...tasks]);
      setShowNewTask(false);
      loadDashboardData();
    } catch (error) {
      console.error('Failed to create task:', error);
    }
  };

  const updateTask = async (taskId, updates) => {
    try {
      const response = await fetchWithAuth(`/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      
      if (!response.ok) throw new Error('Failed to update task');
      
      const updatedTask = await response.json();
      setTasks(tasks.map(t => t.id === taskId ? updatedTask : t));
      if (selectedTask?.id === taskId) setSelectedTask(updatedTask);
      loadDashboardData();
    } catch (error) {
      console.error('Failed to update task:', error);
    }
  };

  const deleteTask = async (taskId) => {
    try {
      const response = await fetchWithAuth(`/api/tasks/${taskId}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) throw new Error('Failed to delete task');
      
      setTasks(tasks.filter(t => t.id !== taskId));
      if (selectedTask?.id === taskId) setSelectedTask(null);
      loadDashboardData();
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

  // Helper function to get category icon
  const getCategoryIcon = (category) => {
    if (!category) return Layers;
    const IconComponent = categoryIcons[category.icon] || Layers;
    return IconComponent;
  };

  // Quick Add Task Component
  const QuickAddTask = () => {
    const [title, setTitle] = useState('');
    const [categoryId, setCategoryId] = useState('');
    const [priority, setPriority] = useState('medium');
    const [dueDate, setDueDate] = useState('');
    const [estimatedCost, setEstimatedCost] = useState('');
    const [tagInput, setTagInput] = useState('');
    const [taskTags, setTaskTags] = useState([]);

    const handleSubmit = async (e) => {
      e.preventDefault();
      const selectedCategory = categories.find(c => c.id === categoryId);
      await createTask({
        title,
        category_id: categoryId || null,
        priority,
        due_date: dueDate || null,
        estimated_cost: estimatedCost ? parseFloat(estimatedCost) : 0,
        tags: taskTags,
        is_financial: selectedCategory && ['Financial', 'Bills', 'Investments'].includes(selectedCategory.name),
        is_mobile_friendly: selectedCategory && selectedCategory.name === 'Shopping' || priority === 'low'
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
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white placeholder-gray-400"
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
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
                >
                  <option value="">Select category...</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
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
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
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
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
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
                    className="w-full pl-8 pr-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white placeholder-gray-400"
                    placeholder="0.00"
                    step="0.01"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Tags (optional)
              </label>
              <div className="flex flex-wrap gap-2 mb-2">
                {taskTags.map((tag, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full text-sm flex items-center gap-1"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => setTaskTags(taskTags.filter((_, i) => i !== index))}
                      className="hover:bg-blue-500/30 rounded-full p-0.5"
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
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white placeholder-gray-400"
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
      const updates = {};
      
      if (editedTask.title !== task.title) updates.title = editedTask.title;
      if (editedTask.description !== task.description) updates.description = editedTask.description;
      if (editedTask.priority !== task.priority) updates.priority = editedTask.priority;
      if (editedTask.category_id !== task.category_id) updates.category_id = editedTask.category_id;
      if (editedTask.energy_level !== task.energy_level) updates.energy_level = editedTask.energy_level;
      if (editedTask.estimated_cost !== task.estimated_cost) updates.estimated_cost = editedTask.estimated_cost;
      if (editedTask.actual_cost !== task.actual_cost) updates.actual_cost = editedTask.actual_cost;
      if (editedTask.due_date !== task.due_date) updates.due_date = editedTask.due_date;
      if (JSON.stringify(editedTask.tags) !== JSON.stringify(task.tags)) updates.tags = editedTask.tags;
      
      if (Object.keys(updates).length > 0) {
        await updateTask(task.id, updates);
      }
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
                  {React.createElement(priorities[task.priority].icon, {
                    className: `w-4 h-4 text-${priorities[task.priority].color}-400`
                  })}
                  <span className="font-medium text-white">{priorities[task.priority].label}</span>
                </div>
              </div>

              <div className="bg-gray-700/50 rounded-lg p-3 border border-gray-600">
                <div className="text-sm text-gray-400 mb-1">Category</div>
                <div className="flex items-center gap-2">
                  {task.category && React.createElement(getCategoryIcon(task.category), {
                    className: 'w-4 h-4',
                    style: { color: task.category.color }
                  })}
                  <span className="font-medium text-white">{task.category?.name || 'Uncategorized'}</span>
                </div>
              </div>

              <div className="bg-gray-700/50 rounded-lg p-3 border border-gray-600">
                <div className="text-sm text-gray-400 mb-1">Energy Level</div>
                <div className="flex items-center gap-2">
                  {React.createElement(energyLevels[task.energy_level].icon, {
                    className: `w-4 h-4 text-${energyLevels[task.energy_level].color}-400`
                  })}
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
            {(task.estimated_cost > 0 || task.actual_cost > 0) && (
              <div className="bg-gradient-to-r from-green-900/20 to-emerald-900/20 rounded-lg p-4 border border-green-800/30">
                <h3 className="font-semibold mb-3 flex items-center gap-2 text-green-400">
                  <DollarSign className="w-5 h-5" />
                  Financial Impact
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-gray-400">Estimated Cost</div>
                    <div className="text-lg font-semibold text-white">${task.estimated_cost.toFixed(2)}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-400">Actual Cost</div>
                    <div className="text-lg font-semibold text-white">${task.actual_cost.toFixed(2)}</div>
                  </div>
                </div>
              </div>
            )}

            {/* Tags */}
            {task.tags && task.tags.length > 0 && (
              <div>
                <h3 className="font-semibold mb-3 text-gray-300">Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {task.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full text-sm border border-blue-500/30"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-between items-center pt-4 border-t border-gray-700">
              <button
                onClick={() => {
                  deleteTask(task.id);
                  onClose();
                }}
                className="px-4 py-2 text-red-400 hover:bg-red-900/20 rounded-lg transition-all flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Delete Task
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Task Card Component
  const TaskCard = ({ task }) => {
    const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'completed';
    const CategoryIcon = getCategoryIcon(task.category);
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
            <CategoryIcon className="w-4 h-4" style={{ color: task.category?.color || '#6B7280' }} />
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
            {task.estimated_cost > 0 && (
              <div className="flex items-center gap-1 text-green-400">
                <DollarSign className="w-3 h-3" />
                <span>${task.estimated_cost.toFixed(2)}</span>
              </div>
            )}
            {task.estimated_duration_minutes > 0 && (
              <div className="flex items-center gap-1 text-blue-400">
                <Clock className="w-3 h-3" />
                <span>{task.estimated_duration_minutes}m</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            {task.is_financial && (
              <span className="px-2 py-0.5 bg-green-500/20 text-green-400 rounded-full text-xs">
                Financial
              </span>
            )}
            {task.is_mobile_friendly && (
              <Smartphone className="w-3 h-3 text-blue-400" />
            )}
          </div>
        </div>

        {task.tags && task.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {task.tags.slice(0, 3).map((tag, index) => (
              <span
                key={index}
                className="px-2 py-0.5 text-xs rounded-full bg-gray-700/50 text-gray-400 border border-gray-600"
              >
                {tag}
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
      morning: Activity,
      evening: Clock,
      weekend: Calendar,
      low_energy: BatteryLow,
      high_focus: Target,
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
                onClick={() => setSuggestionContext(context)}
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
            {suggestions.map((task) => (
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
                        {React.createElement(getCategoryIcon(task.category), { className: 'w-3 h-3' })}
                        {task.category?.name || 'Uncategorized'}
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

  // Stats Dashboard Component
  const StatsDashboard = () => {
    if (!stats) return null;

    const completionRate = Math.round(stats.completion_rate * 100);

    // Prepare chart data
    const categoryData = Object.entries(stats.category_breakdown || {}).map(([category, data]) => ({
      name: category,
      value: data.total,
      completed: data.completed
    }));

    // Show popular tags
    const popularTags = stats.popular_tags || [];

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
              <div className="text-3xl font-bold text-white">{stats.pending_count + stats.in_progress_count}</div>
              <div className="flex items-center gap-4 mt-2 text-sm">
                <span className="flex items-center gap-1 text-orange-400">
                  <Circle className="w-3 h-3" />
                  {stats.pending_count} pending
                </span>
                <span className="flex items-center gap-1 text-blue-400">
                  <Clock className="w-3 h-3" />
                  {stats.in_progress_count} active
                </span>
              </div>
            </div>

            <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-400">Financial Impact</h3>
                <DollarSign className="w-5 h-5 text-green-400" />
              </div>
              <div className="text-3xl font-bold text-white">${stats.total_spent.toFixed(2)}</div>
              <div className="text-sm text-gray-400 mt-2">
                ${stats.total_estimated.toFixed(2)} budgeted
              </div>
            </div>

            <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-400">Time Invested</h3>
                <Timer className="w-5 h-5 text-purple-400" />
              </div>
              <div className="text-3xl font-bold text-white">{stats.total_time_hours.toFixed(1)}h</div>
              <div className="text-sm text-gray-400 mt-2">
                {stats.overdue_count} overdue tasks
              </div>
            </div>
          </div>
        </div>

        {/* Category Chart and Popular Tags */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {categoryData.length > 0 && (
            <div className="bg-gray-800/70 backdrop-blur-sm rounded-xl p-4 border border-gray-700">
              <h3 className="text-lg font-semibold text-white mb-4">Tasks by Category</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={categoryData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="name" tick={{ fill: '#9CA3AF' }} />
                    <YAxis tick={{ fill: '#9CA3AF' }} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151' }}
                      itemStyle={{ color: '#E5E7EB' }}
                    />
                    <Bar dataKey="value" fill="#3B82F6" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {popularTags.length > 0 && (
            <div className="bg-gray-800/70 backdrop-blur-sm rounded-xl p-4 border border-gray-700">
              <h3 className="text-lg font-semibold text-white mb-4">Popular Tags</h3>
              <div className="space-y-3">
                {popularTags.map((tag, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Tag className="w-4 h-4 text-blue-400" />
                      <span className="text-white">{tag.name}</span>
                    </div>
                    <span className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full text-sm">
                      {tag.count} tasks
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
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

        {/* Filters */}
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
            </div>
          </div>
        </div>

        {/* Task List */}
        <div className="space-y-3">
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-flex items-center gap-3">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400"></div>
                <span className="text-gray-400">Loading your tasks...</span>
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

        {/* Upcoming Tasks Section */}
        {stats && stats.upcoming_tasks && stats.upcoming_tasks.length > 0 && (
          <div className="mt-8 bg-gray-800/70 backdrop-blur-sm rounded-xl border border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-400" />
              Upcoming Tasks
            </h3>
            <div className="grid gap-3">
              {stats.upcoming_tasks.slice(0, 5).map((task) => {
                const CategoryIcon = getCategoryIcon(task.category);
                return (
                  <div
                    key={task.id}
                    className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg hover:bg-gray-700 transition-all cursor-pointer"
                    onClick={() => setSelectedTask(task)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-1 rounded" style={{ backgroundColor: `${task.category?.color}20` }}>
                        <CategoryIcon className="w-4 h-4" style={{ color: task.category?.color || '#6B7280' }} />
                      </div>
                      <div>
                        <h4 className="font-medium text-white">{task.title}</h4>
                        <p className="text-sm text-gray-400">
                          Due {new Date(task.due_date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {task.estimated_cost > 0 && (
                        <span className="text-sm text-green-400">${task.estimated_cost.toFixed(2)}</span>
                      )}
                      <ArrowRight className="w-4 h-4 text-gray-400" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
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