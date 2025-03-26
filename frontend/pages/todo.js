// pages/todo.js
import { useState, useEffect, useContext } from 'react';
import { AuthContext } from '@/context/AuthContext';
import { 
  CheckCircle2, 
  Circle, 
  Clock, 
  Calendar, 
  Tag, 
  Star, 
  Filter, 
  Plus, 
  Trash2, 
  Edit, 
  ChevronDown, 
  ChevronUp,
  AlertCircle,
  X,
  Save,
  CalendarDays,
  Bookmark,
  BookmarkCheck
} from 'lucide-react';
import { useRouter } from 'next/router';
import { API_BASE_URL } from '@/utils/api';

const priorityColors = {
  high: "text-red-500",
  medium: "text-yellow-500",
  low: "text-blue-500",
  none: "text-gray-400"
};

const categoryColors = {
  personal: "bg-purple-100 text-purple-800",
  work: "bg-blue-100 text-blue-800",
  financial: "bg-green-100 text-green-800",
  health: "bg-red-100 text-red-800",
  shopping: "bg-yellow-100 text-yellow-800",
  other: "bg-gray-100 text-gray-800"
};

export default function TodoList() {
  const { user } = useContext(AuthContext);
  const router = useRouter();
  
  // State for tasks and UI
  const [tasks, setTasks] = useState([]);
  const [newTask, setNewTask] = useState('');
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [editTask, setEditTask] = useState(null);
  const [filter, setFilter] = useState('all');
  const [sortBy, setSortBy] = useState('date');
  const [sortDirection, setSortDirection] = useState('asc');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedPriority, setSelectedPriority] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [taskDetailOpen, setTaskDetailOpen] = useState(null);
  
  // New task state
  const [newTaskCategory, setNewTaskCategory] = useState('personal');
  const [newTaskPriority, setNewTaskPriority] = useState('medium');
  const [newTaskDueDate, setNewTaskDueDate] = useState('');
  const [newTaskNotes, setNewTaskNotes] = useState('');

  // Placeholder for loading state
  const [isLoading, setIsLoading] = useState(true);
  
  // Sample categories and priorities
  const categories = [
    { id: 'personal', name: 'Personal' },
    { id: 'work', name: 'Work' },
    { id: 'financial', name: 'Financial' },
    { id: 'health', name: 'Health' },
    { id: 'shopping', name: 'Shopping' },
    { id: 'other', name: 'Other' }
  ];
  
  const priorities = [
    { id: 'high', name: 'High' },
    { id: 'medium', name: 'Medium' },
    { id: 'low', name: 'Low' },
    { id: 'none', name: 'None' }
  ];

  // Load sample tasks on component mount
  useEffect(() => {
    // This would be replaced with an API call in production
    const sampleTasks = [
      {
        id: 1,
        title: 'Review retirement account allocation',
        completed: false,
        category: 'financial',
        priority: 'high',
        dueDate: '2025-04-01',
        notes: 'Check if allocations match targets and consider rebalancing.',
        createdAt: '2025-03-20'
      },
      {
        id: 2,
        title: 'Pay quarterly taxes',
        completed: false,
        category: 'financial',
        priority: 'high',
        dueDate: '2025-04-15',
        notes: 'Don\'t forget to include the recent consulting income.',
        createdAt: '2025-03-10'
      },
      {
        id: 3,
        title: 'Update budget for next month',
        completed: false,
        category: 'financial',
        priority: 'medium',
        dueDate: '2025-03-28',
        notes: 'Factor in upcoming travel expenses.',
        createdAt: '2025-03-15'
      },
      {
        id: 4,
        title: 'Research home insurance options',
        completed: false,
        category: 'financial',
        priority: 'medium',
        dueDate: '2025-04-10',
        notes: 'Current policy expires next month.',
        createdAt: '2025-03-18'
      },
      {
        id: 5,
        title: 'Schedule dentist appointment',
        completed: false,
        category: 'health',
        priority: 'low',
        dueDate: '2025-04-05',
        notes: 'Use dental insurance before it resets.',
        createdAt: '2025-03-21'
      }
    ];
    
    setTimeout(() => {
      setTasks(sampleTasks);
      setIsLoading(false);
    }, 800); // Simulate loading delay
    
    // In a real implementation, we would have:
    // fetchTasks();
  }, []);

  // Function to fetch tasks from API
  /* 
  const fetchTasks = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`${API_BASE_URL}/tasks`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setTasks(data.tasks);
      } else {
        console.error('Failed to fetch tasks');
      }
    } catch (error) {
      console.error('Error fetching tasks:', error);
    } finally {
      setIsLoading(false);
    }
  };
  */

  // Add a new task
  const handleAddTask = (e) => {
    e.preventDefault();
    
    if (!newTask.trim()) return;
    
    const task = {
      id: Date.now(),
      title: newTask,
      completed: false,
      category: newTaskCategory,
      priority: newTaskPriority,
      dueDate: newTaskDueDate || null,
      notes: newTaskNotes || '',
      createdAt: new Date().toISOString().split('T')[0]
    };
    
    setTasks([...tasks, task]);
    
    // Reset form
    setNewTask('');
    setNewTaskCategory('personal');
    setNewTaskPriority('medium');
    setNewTaskDueDate('');
    setNewTaskNotes('');
    setIsAddingTask(false);
    
    // In production, we would also:
    // saveTask(task);
  };

  // Toggle task completion
  const toggleComplete = (id) => {
    setTasks(
      tasks.map(task =>
        task.id === id ? { ...task, completed: !task.completed } : task
      )
    );
    
    // In production, we would also:
    // updateTask(id, { completed: !tasks.find(t => t.id === id).completed });
  };

  // Delete a task
  const deleteTask = (id) => {
    setTasks(tasks.filter(task => task.id !== id));
    
    // In production, we would also:
    // deleteTaskFromAPI(id);
  };

  // Set up task editing
  const startEditTask = (task) => {
    setEditTask({ ...task });
    setTaskDetailOpen(task.id);
  };

  // Save edited task
  const saveEditTask = () => {
    if (!editTask) return;
    
    setTasks(tasks.map(task => 
      task.id === editTask.id ? editTask : task
    ));
    
    setEditTask(null);
    
    // In production, we would also:
    // updateTask(editTask.id, editTask);
  };

  // Cancel editing
  const cancelEdit = () => {
    setEditTask(null);
  };

  // Toggle sort direction
  const toggleSortDirection = () => {
    setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
  };

  // Filter and sort tasks
  const filteredAndSortedTasks = tasks
    .filter(task => {
      // Filter by completion status
      if (filter === 'completed' && !task.completed) return false;
      if (filter === 'active' && task.completed) return false;
      
      // Filter by category
      if (selectedCategory !== 'all' && task.category !== selectedCategory) return false;
      
      // Filter by priority
      if (selectedPriority !== 'all' && task.priority !== selectedPriority) return false;
      
      // Filter by search query
      if (searchQuery && !task.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      
      return true;
    })
    .sort((a, b) => {
      // Sort by selected field
      switch (sortBy) {
        case 'title':
          return sortDirection === 'asc' 
            ? a.title.localeCompare(b.title) 
            : b.title.localeCompare(a.title);
        case 'dueDate':
          if (!a.dueDate) return sortDirection === 'asc' ? 1 : -1;
          if (!b.dueDate) return sortDirection === 'asc' ? -1 : 1;
          return sortDirection === 'asc' 
            ? a.dueDate.localeCompare(b.dueDate) 
            : b.dueDate.localeCompare(a.dueDate);
        case 'priority':
          const priorityOrder = { high: 3, medium: 2, low: 1, none: 0 };
          return sortDirection === 'asc' 
            ? priorityOrder[a.priority] - priorityOrder[b.priority] 
            : priorityOrder[b.priority] - priorityOrder[a.priority];
        case 'category':
          return sortDirection === 'asc' 
            ? a.category.localeCompare(b.category) 
            : b.category.localeCompare(a.category);
        default: // date
          return sortDirection === 'asc' 
            ? a.createdAt.localeCompare(b.createdAt) 
            : b.createdAt.localeCompare(a.createdAt);
      }
    });

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return '';
    
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  // Check if a task is overdue
  const isOverdue = (dueDate) => {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date(new Date().toISOString().split('T')[0]);
  };

  // Calculate days remaining
  const getDaysRemaining = (dueDate) => {
    if (!dueDate) return null;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0);
    
    const diffTime = due - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays;
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Task Manager</h1>
        <p className="text-gray-600">
          Track and manage your tasks and financial to-dos
        </p>
      </header>

      {/* Stats Bar */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-lg shadow-sm p-4 border-l-4 border-blue-500">
          <div className="flex justify-between">
            <div>
              <p className="text-gray-500 text-sm">Total Tasks</p>
              <p className="text-2xl font-semibold">{tasks.length}</p>
            </div>
            <div className="bg-blue-100 p-2 rounded-lg">
              <CheckCircle2 className="h-6 w-6 text-blue-500" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-4 border-l-4 border-green-500">
          <div className="flex justify-between">
            <div>
              <p className="text-gray-500 text-sm">Completed</p>
              <p className="text-2xl font-semibold">
                {tasks.filter(task => task.completed).length}
              </p>
            </div>
            <div className="bg-green-100 p-2 rounded-lg">
              <CheckCircle2 className="h-6 w-6 text-green-500" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-4 border-l-4 border-yellow-500">
          <div className="flex justify-between">
            <div>
              <p className="text-gray-500 text-sm">Pending</p>
              <p className="text-2xl font-semibold">
                {tasks.filter(task => !task.completed).length}
              </p>
            </div>
            <div className="bg-yellow-100 p-2 rounded-lg">
              <Clock className="h-6 w-6 text-yellow-500" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-4 border-l-4 border-red-500">
          <div className="flex justify-between">
            <div>
              <p className="text-gray-500 text-sm">Overdue</p>
              <p className="text-2xl font-semibold">
                {tasks.filter(task => !task.completed && isOverdue(task.dueDate)).length}
              </p>
            </div>
            <div className="bg-red-100 p-2 rounded-lg">
              <AlertCircle className="h-6 w-6 text-red-500" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Controls */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
          {/* Search */}
          <div className="relative w-full md:w-1/3">
            <input
              type="text"
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-2">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Tasks</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
            </select>
            
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Categories</option>
              {categories.map(category => (
                <option key={category.id} value={category.id}>{category.name}</option>
              ))}
            </select>
            
            <select
              value={selectedPriority}
              onChange={(e) => setSelectedPriority(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Priorities</option>
              {priorities.map(priority => (
                <option key={priority.id} value={priority.id}>{priority.name}</option>
              ))}
            </select>
          </div>
        </div>
        
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          {/* Sort controls */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="date">Date Created</option>
              <option value="dueDate">Due Date</option>
              <option value="title">Title</option>
              <option value="priority">Priority</option>
              <option value="category">Category</option>
            </select>
            
            <button
              onClick={toggleSortDirection}
              className="p-2 border border-gray-300 rounded-lg"
            >
              {sortDirection === 'asc' ? (
                <ChevronUp className="h-4 w-4 text-gray-500" />
              ) : (
                <ChevronDown className="h-4 w-4 text-gray-500" />
              )}
            </button>
          </div>
          
          {/* Add task button */}
          <button
            onClick={() => setIsAddingTask(!isAddingTask)}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            {isAddingTask ? (
              <>
                <X className="h-5 w-5" />
                <span>Cancel</span>
              </>
            ) : (
              <>
                <Plus className="h-5 w-5" />
                <span>Add Task</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Add Task Form */}
      {isAddingTask && (
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Add New Task</h2>
          <form onSubmit={handleAddTask}>
            <div className="mb-4">
              <label htmlFor="taskTitle" className="block text-sm font-medium text-gray-700 mb-1">
                Task Title*
              </label>
              <input
                id="taskTitle"
                type="text"
                value={newTask}
                onChange={(e) => setNewTask(e.target.value)}
                placeholder="Enter task title"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                required
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label htmlFor="taskCategory" className="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>
                <select
                  id="taskCategory"
                  value={newTaskCategory}
                  onChange={(e) => setNewTaskCategory(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                >
                  {categories.map(category => (
                    <option key={category.id} value={category.id}>{category.name}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label htmlFor="taskPriority" className="block text-sm font-medium text-gray-700 mb-1">
                  Priority
                </label>
                <select
                  id="taskPriority"
                  value={newTaskPriority}
                  onChange={(e) => setNewTaskPriority(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                >
                  {priorities.map(priority => (
                    <option key={priority.id} value={priority.id}>{priority.name}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label htmlFor="taskDueDate" className="block text-sm font-medium text-gray-700 mb-1">
                  Due Date
                </label>
                <input
                  id="taskDueDate"
                  type="date"
                  value={newTaskDueDate}
                  onChange={(e) => setNewTaskDueDate(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            
            <div className="mb-4">
              <label htmlFor="taskNotes" className="block text-sm font-medium text-gray-700 mb-1">
                Notes
              </label>
              <textarea
                id="taskNotes"
                value={newTaskNotes}
                onChange={(e) => setNewTaskNotes(e.target.value)}
                placeholder="Add notes or details about this task"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 h-24"
              ></textarea>
            </div>
            
            <div className="flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => setIsAddingTask(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Add Task
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Task List */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="divide-y divide-gray-200">
          {isLoading ? (
            // Loading skeleton
            [...Array(5)].map((_, i) => (
              <div key={i} className="p-4 animate-pulse">
                <div className="flex items-center">
                  <div className="h-4 w-4 bg-gray-200 rounded-full mr-3"></div>
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                </div>
                <div className="mt-2 flex space-x-2">
                  <div className="h-3 bg-gray-200 rounded w-20"></div>
                  <div className="h-3 bg-gray-200 rounded w-24"></div>
                </div>
              </div>
            ))
          ) : filteredAndSortedTasks.length === 0 ? (
            // No tasks
            <div className="p-8 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
                <CheckCircle2 className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-1">No tasks found</h3>
              <p className="text-gray-500">
                {filter === 'all' && selectedCategory === 'all' && selectedPriority === 'all' && !searchQuery
                  ? "Your task list is empty. Add a new task to get started."
                  : "No tasks match your current filters. Try adjusting your filters or add a new task."}
              </p>
            </div>
          ) : (
            // Task list
            filteredAndSortedTasks.map(task => (
              <div 
                key={task.id} 
                className={`group transition-colors hover:bg-gray-50 ${task.completed ? 'bg-gray-50' : ''}`}
              >
                {/* Main task row (always visible) */}
                <div className="p-4">
                  <div className="flex items-start">
                    {/* Checkbox */}
                    <button
                      onClick={() => toggleComplete(task.id)}
                      className="mt-1 mr-3 flex-shrink-0 focus:outline-none"
                      aria-label={task.completed ? "Mark as incomplete" : "Mark as complete"}
                    >
                      {task.completed ? (
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                      ) : (
                        <Circle className="h-5 w-5 text-gray-300 group-hover:text-gray-400" />
                      )}
                    </button>
                    
                    {/* Task content */}
                    <div className="flex-grow min-w-0">
                      <div 
                        className="flex flex-col sm:flex-row sm:items-center justify-between"
                        onClick={() => setTaskDetailOpen(taskDetailOpen === task.id ? null : task.id)}
                      >
                        <h3 className={`text-base font-medium hover:cursor-pointer ${task.completed ? 'text-gray-500 line-through' : 'text-gray-900'}`}>
                          {task.title}
                        </h3>
                        
                        <div className="flex items-center mt-1 sm:mt-0 flex-wrap gap-2">
                          {/* Priority */}
                          <div className={`flex items-center text-xs ${priorityColors[task.priority]}`}>
                            <Star className="h-3 w-3 mr-1" />
                            <span className="capitalize">{task.priority}</span>
                          </div>
                          
                          {/* Category */}
                          <div className={`px-2 py-1 rounded-full text-xs ${categoryColors[task.category]}`}>
                            {categories.find(c => c.id === task.category)?.name}
                          </div>
                          
                          {/* Due date */}
                          {task.dueDate && (
                            <div className={`flex items-center text-xs ${
                              isOverdue(task.dueDate) && !task.completed 
                                ? 'text-red-500' 
                                : 'text-gray-500'
                            }`}>
                              <Calendar className="h-3 w-3 mr-1" />
                              <span>
                                {formatDate(task.dueDate)}
                                {isOverdue(task.dueDate) && !task.completed && " (Overdue)"}
                                {!isOverdue(task.dueDate) && getDaysRemaining(task.dueDate) <= 3 && getDaysRemaining(task.dueDate) > 0 && !task.completed && 
                                  ` (${getDaysRemaining(task.dueDate)} day${getDaysRemaining(task.dueDate) === 1 ? '' : 's'} left)`
                                }
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {/* Action buttons */}
                    <div className="ml-4 flex-shrink-0 flex space-x-2">
                      <button
                        onClick={() => startEditTask(task)}
                        className="text-gray-400 hover:text-blue-500 focus:outline-none"
                      >
                        <Edit className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => deleteTask(task.id)}
                        className="text-gray-400 hover:text-red-500 focus:outline-none"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                </div>
                
                {/* Expanded task details (conditionally visible) */}
                {taskDetailOpen === task.id && (
                  <div className="px-12 pb-4">
                    {editTask && editTask.id === task.id ? (
                      /* Edit mode */
                      <div className="bg-blue-50 p-4 rounded-md">
                        <h4 className="font-medium text-blue-800 mb-3">Edit Task</h4>
                        <div className="space-y-3">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Title
                            </label>
                            <input
                              type="text"
                              value={editTask.title}
                              onChange={(e) => setEditTask({...editTask, title: e.target.value})}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                            />
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Category
                              </label>
                              <select
                            value={editTask.category}
                                onChange={(e) => setEditTask({...editTask, category: e.target.value})}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                              >
                                {categories.map(category => (
                                  <option key={category.id} value={category.id}>{category.name}</option>
                                ))}
                              </select>
                            </div>
                            
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Priority
                              </label>
                              <select
                                value={editTask.priority}
                                onChange={(e) => setEditTask({...editTask, priority: e.target.value})}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                              >
                                {priorities.map(priority => (
                                  <option key={priority.id} value={priority.id}>{priority.name}</option>
                                ))}
                              </select>
                            </div>
                            
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Due Date
                              </label>
                              <input
                                type="date"
                                value={editTask.dueDate || ''}
                                onChange={(e) => setEditTask({...editTask, dueDate: e.target.value})}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                              />
                            </div>
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Notes
                            </label>
                            <textarea
                              value={editTask.notes || ''}
                              onChange={(e) => setEditTask({...editTask, notes: e.target.value})}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 h-24"
                            ></textarea>
                          </div>
                          
                          <div className="flex justify-end space-x-2 pt-2">
                            <button
                              onClick={cancelEdit}
                              className="px-3 py-2 border border-gray-300 rounded-md text-gray-700 text-sm hover:bg-gray-50"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={saveEditTask}
                              className="px-3 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 flex items-center"
                            >
                              <Save className="h-4 w-4 mr-1" />
                              Save Changes
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* View mode */
                      <div className="space-y-3 text-sm text-gray-600">
                        {/* Notes section */}
                        {task.notes && (
                          <div>
                            <h4 className="font-medium text-gray-700 mb-1">Notes:</h4>
                            <p className="whitespace-pre-line">{task.notes}</p>
                          </div>
                        )}
                        
                        {/* Details section */}
                        <div className="flex flex-wrap gap-6">
                          <div>
                            <h4 className="font-medium text-gray-700 mb-1">Created:</h4>
                            <div className="flex items-center">
                              <CalendarDays className="h-4 w-4 mr-1 text-gray-400" />
                              {formatDate(task.createdAt)}
                            </div>
                          </div>
                          
                          {task.dueDate && (
                            <div>
                              <h4 className="font-medium text-gray-700 mb-1">Due:</h4>
                              <div className={`flex items-center ${
                                isOverdue(task.dueDate) && !task.completed 
                                  ? 'text-red-500' 
                                  : ''
                              }`}>
                                <Calendar className="h-4 w-4 mr-1 text-gray-400" />
                                {formatDate(task.dueDate)}
                                {!task.completed && (
                                  <span className="ml-2">
                                    {isOverdue(task.dueDate) && (
                                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                                        Overdue
                                      </span>
                                    )}
                                    {!isOverdue(task.dueDate) && getDaysRemaining(task.dueDate) <= 3 && getDaysRemaining(task.dueDate) > 0 && (
                                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                                        Due soon
                                      </span>
                                    )}
                                  </span>
                                )}
                              </div>
                            </div>
                          )}
                          
                          <div>
                            <h4 className="font-medium text-gray-700 mb-1">Status:</h4>
                            <div className="flex items-center">
                              {task.completed ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                  <CheckCircle2 className="h-3 w-3 mr-1" />
                                  Completed
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                  <Clock className="h-3 w-3 mr-1" />
                                  In Progress
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
      
      {/* Empty state CTA */}
      {!isLoading && tasks.length === 0 && (
        <div className="mt-8 text-center">
          <button
            onClick={() => setIsAddingTask(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Plus className="mr-2 h-5 w-5" />
            Add Your First Task
          </button>
        </div>
      )}
      
      {/* Bottom actions */}
      {!isLoading && tasks.length > 0 && (
        <div className="mt-6 flex flex-col md:flex-row justify-between items-center">
          <p className="text-sm text-gray-500 mb-4 md:mb-0">
            Showing {filteredAndSortedTasks.length} of {tasks.length} tasks
          </p>
          
          <div className="flex space-x-2">
            <button
              onClick={() => setTasks(tasks.filter(task => !task.completed))}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
            >
              Clear Completed
            </button>
            
            <button
              onClick={() => setIsAddingTask(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 flex items-center"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Task
            </button>
          </div>
        </div>
      )}
      
      {/* Future integrations notice */}
      <div className="mt-10 pt-6 border-t border-gray-200">
        <p className="text-sm text-gray-500 text-center">
          Coming soon: Connect your to-do list directly with NestEgg financial planning tools 
          to track budget items, financial goals, and upcoming bill payments.
        </p>
      </div>
    </div>
  );
}