import React, { useState, useEffect, useContext } from "react";
import { AuthContext } from "@/context/AuthContext";
import { useRouter } from "next/router";
import SystemEvents from '@/components/SystemEvents';
import {
  RefreshCcw,
  Database,
  Clock,
  BarChart2,
  AlertTriangle,
  CheckCircle,
  PieChart,
  TrendingUp,
  Server,
  List,
  FileText,
  Plus,
  ChevronDown,
  ChevronUp,
  X,
  Send,
  Search,
  Filter,
  Eye,
  Download,
  Upload,
  Trash2,
  Edit,
  Layers,
  HardDrive,
  Activity,
  ArrowUpDown,
  GitBranch,
  Code,
  Users,
  DollarSign,
  BarChart,
  BookOpen,
  Briefcase,
  RotateCcw,
  Cpu,
  Workflow,
  Share2
} from 'lucide-react';
import { fetchWithAuth } from '@/utils/api';


export default function Admin() {
  const { user } = useContext(AuthContext);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [tableStats, setTableStats] = useState({});
  const [processingRequest, setProcessingRequest] = useState(false);
  const [activeRequest, setActiveRequest] = useState(null);
  const [requestResponse, setRequestResponse] = useState(null);
  const [systemHealth, setSystemHealth] = useState({
    status: "unknown",
    lastCheck: null,
    components: {}
  });
  const [selectedTable, setSelectedTable] = useState(null);
  const [tableDetails, setTableDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [apiFilter, setApiFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortKey, setSortKey] = useState("group");
  const [sortDirection, setSortDirection] = useState("asc");

  // Function to sort endpoints
  const sortEndpoints = (endpoints, key, direction) => {
    return [...endpoints].sort((a, b) => {
      let valueA = a[key];
      let valueB = b[key];
      
      if (key === "group") {
        // Sort by group, then by subgroup
        if (a.group === b.group) {
          return a.subgroup.localeCompare(b.subgroup) * (direction === "asc" ? 1 : -1);
        }
        return a.group.localeCompare(b.group) * (direction === "asc" ? 1 : -1);
      }
      
      if (typeof valueA === "string" && typeof valueB === "string") {
        return valueA.localeCompare(valueB) * (direction === "asc" ? 1 : -1);
      }
      
      return (valueA - valueB) * (direction === "asc" ? 1 : -1);
    });
  };

  // Complete API Inventory with source and functional grouping
  const allApiEndpoints = [
    // User Management
    {
      id: "get_users",
      name: "Get All Users",
      endpoint: "/users",
      method: "GET",
      description: "Retrieve list of all users in the system",
      category: "Reporting",
      source: "main.py",
      group: "User Management",
      subgroup: "User Reporting",
      icon: <Users className="w-5 h-5" />
    },
    {
      id: "get_user",
      name: "Get Current User",
      endpoint: "/user",
      method: "GET",
      description: "Get current authenticated user data",
      category: "Reporting",
      source: "main.py",
      group: "User Management",
      subgroup: "User Authentication",
      icon: <Users className="w-5 h-5" />
    },
    {
      id: "signup_user",
      name: "Create User",
      endpoint: "/signup",
      method: "POST",
      description: "Create a new user account",
      category: "Database Update",
      body: { email: "user@example.com", password: "******" },
      source: "main.py",
      group: "User Management",
      subgroup: "User Authentication",
      icon: <Plus className="w-5 h-5" />
    },
    {
      id: "login_user",
      name: "User Login",
      endpoint: "/token",
      method: "POST",
      description: "Authenticate user and get access token",
      category: "Authentication",
      body: { username: "user@example.com", password: "******" },
      source: "main.py",
      group: "User Management",
      subgroup: "User Authentication",
      icon: <Users className="w-5 h-5" />
    },

    // Account Management
    {
      id: "get_accounts",
      name: "Get User Accounts",
      endpoint: "/accounts",
      method: "GET",
      description: "Get accounts for the logged-in user",
      category: "Reporting",
      source: "main.py",
      group: "Account Management",
      subgroup: "Account Reporting",
      icon: <Briefcase className="w-5 h-5" />
    },
    {
      id: "add_account",
      name: "Add Account",
      endpoint: "/accounts",
      method: "POST",
      description: "Create a new investment account",
      category: "Database Update",
      body: {
        account_name: "New Account",
        institution: "Example Bank",
        type: "Brokerage",
        balance: 0
      },
      source: "main.py",
      group: "Account Management",
      subgroup: "Account Operations",
      icon: <Plus className="w-5 h-5" />
    },
    {
      id: "update_account",
      name: "Update Account",
      endpoint: "/accounts/{account_id}",
      method: "PUT",
      description: "Update an existing account",
      category: "Database Update",
      params: { account_id: 1 },
      body: {
        account_name: "Updated Account",
        institution: "Updated Bank",
        type: "Updated Type"
      },
      source: "main.py",
      group: "Account Management",
      subgroup: "Account Operations",
      icon: <Edit className="w-5 h-5" />
    },
    {
      id: "delete_account",
      name: "Delete Account",
      endpoint: "/accounts/{account_id}",
      method: "DELETE",
      description: "Delete an account and all its positions",
      category: "Database Update",
      params: { account_id: 1 },
      source: "main.py",
      group: "Account Management",
      subgroup: "Account Operations",
      icon: <Trash2 className="w-5 h-5" />
    },

    // Position Management
    {
      id: "get_positions",
      name: "Get Account Positions",
      endpoint: "/positions/{account_id}",
      method: "GET",
      description: "Get positions for a specific account",
      category: "Reporting",
      params: { account_id: 1 },
      source: "main.py",
      group: "Position Management",
      subgroup: "Position Reporting",
      icon: <Eye className="w-5 h-5" />
    },
    {
      id: "add_position",
      name: "Add Position",
      endpoint: "/positions/{account_id}",
      method: "POST",
      description: "Add a new position to an account",
      category: "Database Update",
      params: { account_id: 1 },
      body: {
        ticker: "AAPL",
        shares: 10,
        cost_basis: 150.0,
        purchase_date: "2023-01-01"
      },
      source: "main.py",
      group: "Position Management",
      subgroup: "Position Operations",
      icon: <Plus className="w-5 h-5" />
    },
    {
      id: "update_position",
      name: "Update Position",
      endpoint: "/positions/{position_id}",
      method: "PUT",
      description: "Update an existing position",
      category: "Database Update",
      params: { position_id: 1 },
      body: {
        ticker: "AAPL",
        shares: 15,
        price: 160.0
      },
      source: "main.py",
      group: "Position Management",
      subgroup: "Position Operations",
      icon: <Edit className="w-5 h-5" />
    },
    {
      id: "delete_position",
      name: "Delete Position",
      endpoint: "/positions/{position_id}",
      method: "DELETE",
      description: "Delete a position",
      category: "Database Update",
      params: { position_id: 1 },
      source: "main.py",
      group: "Position Management",
      subgroup: "Position Operations",
      icon: <Trash2 className="w-5 h-5" />
    },

    // Market Data APIs
    {
      id: "update_prices_v2",
      name: "Update Market Prices (V2)",
      endpoint: "/market/update-prices-v2",
      method: "POST",
      description: "Fetch current market prices from multiple sources",
      category: "Market Data",
      source: "price_updater_v2.py",
      group: "Market Data",
      subgroup: "Price Updates",
      icon: <RefreshCcw className="w-5 h-5" />
    },
    {
      id: "update_metrics",
      name: "Update Company Metrics",
      endpoint: "/market/update-metrics",
      method: "POST",
      description: "Update company metrics (PE ratio, dividend, etc.)",
      category: "Market Data",
      source: "price_updater_v2.py",
      group: "Market Data",
      subgroup: "Company Data",
      icon: <BarChart2 className="w-5 h-5" />
    },
    {
      id: "update_history",
      name: "Update Historical Prices",
      endpoint: "/market/update-history",
      method: "POST",
      description: "Fetch historical price data",
      category: "Market Data",
      body: { days: 30 },
      source: "price_updater_v2.py",
      group: "Market Data",
      subgroup: "Historical Data",
      icon: <Activity className="w-5 h-5" />
    },
    {
      id: "update_legacy_prices",
      name: "Update Prices (Legacy)",
      endpoint: "/market/update-prices",
      method: "POST",
      description: "Legacy API for updating market prices",
      category: "Market Data",
      source: "price_updater.py",
      group: "Market Data",
      subgroup: "Price Updates",
      icon: <RefreshCcw className="w-5 h-5" />
    },

    // Security Management
    {
      id: "get_securities",
      name: "Get Securities List",
      endpoint: "/securities",
      method: "GET",
      description: "Get all securities in the database",
      category: "Reporting",
      source: "main.py",
      group: "Security Management",
      subgroup: "Security Reporting",
      icon: <Eye className="w-5 h-5" />
    },
    {
      id: "search_securities",
      name: "Search Securities",
      endpoint: "/securities/search",
      method: "GET",
      description: "Search for securities by name or ticker",
      category: "Reporting",
      params: { query: "AAPL" },
      source: "main.py",
      group: "Security Management",
      subgroup: "Security Reporting",
      icon: <Search className="w-5 h-5" />
    },
    {
      id: "get_security_details",
      name: "Get Security Details",
      endpoint: "/securities/{ticker}/details",
      method: "GET",
      description: "Get detailed information for a specific security",
      category: "Reporting",
      params: { ticker: "AAPL" },
      source: "main.py",
      group: "Security Management",
      subgroup: "Security Reporting",
      icon: <Eye className="w-5 h-5" />
    },
    {
      id: "get_security_history",
      name: "Get Security Price History",
      endpoint: "/securities/{ticker}/history",
      method: "GET",
      description: "Get historical price data for a security",
      category: "Reporting",
      params: { ticker: "AAPL" },
      source: "main.py",
      group: "Security Management",
      subgroup: "Historical Data",
      icon: <Activity className="w-5 h-5" />
    },
    {
      id: "add_security",
      name: "Add Security",
      endpoint: "/securities",
      method: "POST",
      description: "Add a new security to track",
      category: "Database Update",
      body: { ticker: "NVDA" },
      source: "main.py",
      group: "Security Management",
      subgroup: "Security Operations",
      icon: <Plus className="w-5 h-5" />
    },
    {
      id: "update_security",
      name: "Update Security",
      endpoint: "/securities/{ticker}/update",
      method: "POST",
      description: "Update a specific security's data",
      category: "Database Update",
      params: { ticker: "AAPL" },
      body: { update_type: "metrics" },
      source: "main.py",
      group: "Security Management",
      subgroup: "Security Operations",
      icon: <Edit className="w-5 h-5" />
    },

    // Portfolio Management
    {
      id: "get_portfolio_summary",
      name: "Get Portfolio Summary",
      endpoint: "/portfolio/summary",
      method: "GET",
      description: "Get summary of user's investment portfolio",
      category: "Reporting",
      source: "main.py",
      group: "Portfolio Management",
      subgroup: "Portfolio Reporting",
      icon: <PieChart className="w-5 h-5" />
    },
    {
      id: "get_portfolio_history",
      name: "Get Portfolio History",
      endpoint: "/portfolio/history",
      method: "GET",
      description: "Get historical portfolio value data",
      category: "Reporting",
      params: { period: "1m" },
      source: "main.py",
      group: "Portfolio Management",
      subgroup: "Portfolio History",
      icon: <Activity className="w-5 h-5" />
    },
    {
      id: "calculate_portfolios",
      name: "Calculate All Portfolios",
      endpoint: "/portfolios/calculate",
      method: "POST",
      description: "Recalculate values for all user portfolios",
      category: "Calculation",
      source: "portfolio_calculator.py",
      group: "Portfolio Management",
      subgroup: "Portfolio Calculations",
      icon: <PieChart className="w-5 h-5" />
    },
    {
      id: "calculate_user_portfolio",
      name: "Calculate User Portfolio",
      endpoint: "/portfolios/calculate/user",
      method: "POST",
      description: "Calculate portfolio values for current user",
      category: "Calculation",
      source: "portfolio_calculator.py",
      group: "Portfolio Management",
      subgroup: "Portfolio Calculations",
      icon: <PieChart className="w-5 h-5" />
    },
    {
      id: "portfolio_snapshot",
      name: "Take Portfolio Snapshot",
      endpoint: "/portfolios/snapshot",
      method: "POST",
      description: "Record current portfolio values for historical tracking",
      category: "Calculation",
      source: "portfolio_calculator.py",
      group: "Portfolio Management",
      subgroup: "Portfolio History",
      icon: <Clock className="w-5 h-5" />
    },

    // Combined Operations
    {
      id: "update_and_calculate",
      name: "Update & Calculate",
      endpoint: "/market/update-and-calculate",
      method: "POST",
      description: "Update prices and calculate portfolio values in one step",
      category: "Combined Operations",
      source: "main.py",
      group: "Combined Operations",
      subgroup: "Integrated Functions",
      icon: <GitBranch className="w-5 h-5" />
    },

    // System Management
    {
      id: "get_system_events",
      name: "Get System Events",
      endpoint: "/system/events",
      method: "GET",
      description: "Get recent system events",
      category: "Reporting",
      params: { limit: 10 },
      source: "main.py",
      group: "System Management",
      subgroup: "Monitoring",
      icon: <List className="w-5 h-5" />
    },
    {
      id: "get_admin_tables",
      name: "Get Database Tables Stats",
      endpoint: "/admin/tables",
      method: "GET",
      description: "Get statistics for all database tables",
      category: "Reporting",
      source: "main.py",
      group: "System Management",
      subgroup: "Administration",
      icon: <Database className="w-5 h-5" />
    },
    {
      id: "get_admin_health",
      name: "Get System Health",
      endpoint: "/admin/health",
      method: "GET",
      description: "Check system and database health status",
      category: "Reporting",
      source: "main.py",
      group: "System Management",
      subgroup: "Monitoring",
      icon: <Activity className="w-5 h-5" />
    },
    {
      id: "generate_test_data",
      name: "Generate Test Data",
      endpoint: "/admin/generate-test-data",
      method: "POST",
      description: "Generate test data for development",
      category: "Database Update",
      source: "main.py",
      group: "System Management",
      subgroup: "Administration",
      icon: <HardDrive className="w-5 h-5" />
    }
  ];

  // System Architecture Components
  const systemComponents = [
    {
      name: "Main API Handler",
      file: "main.py",
      description: "Core FastAPI application handling authentication, accounts, positions, and serving data",
      responsibilities: [
        "User authentication and management",
        "Account and position CRUD operations",
        "Portfolio summary and history endpoints",
        "Security information endpoints",
        "System monitoring and health checks"
      ],
      connections: ["PriceUpdaterV2", "PortfolioCalculator", "Database"]
    },
    {
      name: "Price Updater V2",
      file: "price_updater_v2.py",
      description: "Enhanced market data service with multiple data sources and fallback mechanisms",
      responsibilities: [
        "Fetch current security prices from various sources",
        "Update company metrics (P/E, dividend yield, etc.)",
        "Maintain historical price data",
        "Handle rate limits and API errors intelligently"
      ],
      connections: ["MarketDataManager", "Database"]
    },
    {
        name: "Historical Price Service",
        file: "price_updater_v2.py (update_historical_prices method)",
        description: "Specialized service for managing historical price data with different retention policies",
        responsibilities: [
          "Fetch multiple days of OHLCV data for each security",
          "Store complete price history with proper date indexing",
          "Implement different retention strategies (30 days, 1 year, 5 years)",
          "Coordinate with market data API rate limits for batch historical requests"
        ],
        connections: ["MarketDataManager", "Database (price_history table)"]
      },
    {
        name: "Common Utilities",
        file: "utils/common.py",
        description: "Shared utility functions used across multiple system components",
        responsibilities: [
          "System event tracking and management",
          "Standardized error handling and logging",
          "Database connection management and query helpers",
          "Data conversion and formatting utilities"
        ],
        connections: ["All Components", "Database (system_events table)"]
      },  
    {
      name: "Market Data Manager",
      file: "market_data_manager.py",
      description: "Coordinates between different market data providers",
      responsibilities: [
        "Manage multiple data sources with priorities",
        "Implement fallback logic when primary source fails",
        "Standardize data format across sources",
        "Handle batching and rate limiting"
      ],
      connections: ["Polygon.io API", "Yahoo Finance API"]
    },
    {
      name: "Portfolio Calculator",
      file: "portfolio_calculator.py",
      description: "Handles all portfolio value calculations based on latest prices",
      responsibilities: [
        "Calculate portfolio values across accounts",
        "Track gain/loss metrics for each position",
        "Generate historical snapshots of portfolio values",
        "Record performance metrics over time"
      ],
      connections: ["Database"]
    },
    {
      name: "Legacy Price Updater",
      file: "price_updater.py",
      description: "Original price updating service (maintained for backward compatibility)",
      responsibilities: [
        "Basic price updates from Yahoo Finance",
        "Simple company metrics updates",
        "Limited error handling"
      ],
      connections: ["Yahoo Finance API", "Database"]
    }
  ];

  // System Flow Descriptions
  const systemFlows = [
    {
      name: "User Authentication Flow",
      description: "How users authenticate and access the system",
      steps: [
        "Client sends credentials to /token endpoint",
        "main.py validates credentials against the database",
        "JWT token generated and sent to client",
        "Client includes token in Authorization header for subsequent requests"
      ]
    },
    {
      name: "Market Data Update Flow",
      description: "How security prices are updated in the system",
      steps: [
        "Scheduled job or manual trigger calls price_updater_v2.py",
        "PriceUpdaterV2 requests data from MarketDataManager",
        "MarketDataManager fetches from primary source (Polygon.io)",
        "If primary source fails, system falls back to Yahoo Finance",
        "Updated prices stored in securities table and price_history",
        "System event recorded for monitoring"
      ]
    },
    {
      name: "Portfolio Calculation Flow",
      description: "How portfolio values are calculated",
      steps: [
        "Scheduled job or manual trigger calls portfolio_calculator.py",
        "PortfolioCalculator fetches all positions for each account",
        "Current prices applied to calculate position values",
        "Account balances updated based on position values",
        "Performance metrics (gain/loss) calculated",
        "Optional: Historical snapshot taken for tracking"
      ]
    },
    {
        name: "System Event Recording",
        description: "How operations are tracked and recorded for monitoring",
        steps: [
          "Operation begins and calls record_system_event() from common.py",
          "Event recorded in system_events table with 'started' status",
          "Operation proceeds with its main function",
          "On completion, update_system_event() is called with results",
          "Event updated with 'completed' status and execution details",
          "On failure, event updated with 'failed' status and error information"
        ]
    },
    {
        name: "Database Write Events",
        description: "Operations that trigger database writes",
        steps: [
          "Price updates (current and historical)",
          "Company metrics updates",
          "Portfolio value calculations",
          "Portfolio snapshot creation",
          "Position and account value adjustments",
          "System events recording",
          "Security addition or modification"
        ]
    }
  ];

  // Get unique groups
  const apiGroups = [...new Set(allApiEndpoints.map(endpoint => endpoint.group))];
  
  // Filter endpoints based on search and category
  const filteredEndpoints = allApiEndpoints.filter(endpoint => {
    const matchesSearch = searchQuery === "" || 
      endpoint.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      endpoint.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      endpoint.endpoint.toLowerCase().includes(searchQuery.toLowerCase()) ||
      endpoint.source.toLowerCase().includes(searchQuery.toLowerCase()) ||
      endpoint.group.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = apiFilter === "All" || endpoint.group === apiFilter;
    
    return matchesSearch && matchesCategory;
  });
  
  // Sort the filtered endpoints
  const sortedEndpoints = sortEndpoints(filteredEndpoints, sortKey, sortDirection);

  // Handle sorting request
  const requestSort = (key) => {
    let direction = "asc";
    if (sortKey === key && sortDirection === "asc") {
      direction = "desc";
    }
    setSortKey(key);
    setSortDirection(direction);
  };

  // Check user authentication
  useEffect(() => {
    if (!user) {
      router.push("/login");
    } else {
      fetchTableStats();
      checkSystemHealth();
    }
  }, [user, router]);

  // Fetch database table statistics
  const fetchTableStats = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      
      if (!token) {
        router.push("/login");
        return;
      }
      
      console.log('Fetching admin tables');
      
      const response = await fetchWithAuth('/admin/tables');
      
      console.log('Response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Table stats data:', data);
        setTableStats(data.tables || {});
      } else {
        // Try to get error details
        const errorText = await response.text();
        console.error("Error response:", errorText);
        
        // Fallback to mock data if endpoint doesn't exist
        console.warn("Falling back to mock table statistics");
        setTableStats({
          users: { count: 0, last_updated: new Date().toISOString() },
          accounts: { count: 0, last_updated: new Date().toISOString() },
          positions: { count: 0, last_updated: new Date().toISOString() },
          securities: { count: 0, last_updated: new Date().toISOString() },
          price_history: { count: 0, last_updated: new Date().toISOString() },
          portfolio_history: { count: 0, last_updated: new Date().toISOString() },
          system_events: { count: 0, last_updated: new Date().toISOString() }
        });
      }
    } catch (error) {
      console.error("Error fetching table statistics:", error);
      // Use mock data on error
      setTableStats({
        users: { count: 0, last_updated: new Date().toISOString() },
        accounts: { count: 0, last_updated: new Date().toISOString() },
        positions: { count: 0, last_updated: new Date().toISOString() },
        securities: { count: 0, last_updated: new Date().toISOString() },
        price_history: { count: 0, last_updated: new Date().toISOString() },
        portfolio_history: { count: 0, last_updated: new Date().toISOString() },
        system_events: { count: 0, last_updated: new Date().toISOString() }
      });
    } finally {
      setLoading(false);
    }
  };

  // Fetch table details
  const fetchTableDetails = async (tableName) => {
    setLoadingDetails(true);
    try {
      const token = localStorage.getItem("token");
      
      if (!token) {
        router.push("/login");
        return;
      }
      
      // Different endpoints based on table type
      let endpoint = "";
      let limit = 10; // Default limit
      
      switch(tableName) {
        case "users":
          endpoint = "/users";
          break;
        case "accounts":
          endpoint = "/accounts";
          break;
        case "securities":
          endpoint = "/securities";
          break;
        case "system_events":
          endpoint = "/system/events?limit=10";
          break;
        default:
          // For tables without specific endpoints, use a generic one or mock data
          setTableDetails({
            columns: ["No specific details available"],
            rows: [{}]
          });
          setLoadingDetails(false);
          return;
      }
      
      const response = await fetchWithAuth(endpoint);
      
      if (response.ok) {
        const data = await response.json();
        
        // Process the data based on table type
        let processedData = {
          columns: [],
          rows: []
        };
        
        switch(tableName) {
          case "users":
            if (data.users && data.users.length > 0) {
              processedData.columns = ["ID", "Email", "Password Hash"];
              processedData.rows = data.users.map(user => ({
                id: user.id,
                email: user.email,
                password_hash: user.password_hash ? "********" : "N/A"
              }));
            }
            break;
          
          case "accounts":
            if (data.accounts && data.accounts.length > 0) {
              processedData.columns = ["ID", "Name", "Institution", "Type", "Balance"];
              processedData.rows = data.accounts.map(account => ({
                id: account.id,
                name: account.account_name,
                institution: account.institution || "N/A",
                type: account.type || "N/A",
                balance: account.balance ? `$${account.balance.toLocaleString()}` : "$0.00"
              }));
            }
            break;
            
          case "securities":
            if (data.securities && data.securities.length > 0) {
              processedData.columns = ["Ticker", "Company", "Price", "Last Updated"];
              processedData.rows = data.securities.map(security => ({
                ticker: security.ticker,
                company: security.company_name || "N/A",
                price: security.price ? `$${security.price.toFixed(2)}` : "N/A",
                last_updated: security.last_updated ? new Date(security.last_updated).toLocaleString() : "Never"
              }));
            }
            break;
            
          case "system_events":
            if (data.events && data.events.length > 0) {
              processedData.columns = ["ID", "Type", "Status", "Started At", "Completed At"];
              processedData.rows = data.events.map(event => ({
                id: event.id,
                type: event.event_type,
                status: event.status,
                started_at: event.started_at ? new Date(event.started_at).toLocaleString() : "N/A",
                completed_at: event.completed_at ? new Date(event.completed_at).toLocaleString() : "N/A"
              }));
            }
            break;
            
          default:
            break;
        }
        
        setTableDetails(processedData);
      } else {
        // Create mock data for tables without specific endpoints
        setTableDetails({
          columns: ["Data not available for this table"],
          rows: [{}]
        });
      }
    } catch (error) {
      console.error(`Error fetching details for ${tableName}:`, error);
      setTableDetails({
        columns: ["Error fetching data"],
        rows: [{ error: error.message }]
      });
    } finally {
      setLoadingDetails(false);
    }
  };

  // Handle table row click - show details
  const handleTableRowClick = (tableName) => {
    if (selectedTable === tableName) {
      // If clicking the same table, toggle it off
      setSelectedTable(null);
      setTableDetails(null);
    } else {
      setSelectedTable(tableName);
      fetchTableDetails(tableName);
    }
  };

  // Check system health status
  const checkSystemHealth = async () => {
    try {
      const token = localStorage.getItem("token");
      
      if (!token) {
        router.push("/login");
        return;
      }
      
      const response = await fetchWithAuth('/admin/health');
      
      if (response.ok) {
        const data = await response.json();
        setSystemHealth(data);
      } else {
        // Fallback health status if endpoint doesn't exist
        setSystemHealth({
          status: "unknown",
          lastCheck: new Date().toISOString(),
          components: {
            database: { status: "unknown" },
            api: { status: "unknown" }
          }
        });
      }
    } catch (error) {
      console.error("Error checking system health:", error);
      setSystemHealth({
        status: "error",
        lastCheck: new Date().toISOString(),
        components: {
          database: { status: "unknown" },
          api: { status: "online" }
        }
      });
    }
  };

  // Execute an API request
  const executeRequest = async (endpoint) => {
    setProcessingRequest(true);
    setActiveRequest(endpoint.id);
    setRequestResponse(null);

    try {
        const token = localStorage.getItem("token");
        
        if (!token) {
          router.push("/login");
          return;
        }
        
        // Create the URL with path parameters replaced
        let url = `${apiBaseUrl}${endpoint.endpoint}`;
        
        // Replace path parameters if they exist
        if (endpoint.params) {
          Object.entries(endpoint.params).forEach(([key, value]) => {
            url = url.replace(`{${key}}`, value);
          });
        }
        
        // Add query parameters for GET requests
        if (endpoint.method === "GET" && endpoint.params) {
          const queryParams = new URLSearchParams();
          Object.entries(endpoint.params).forEach(([key, value]) => {
            if (!url.includes(`{${key}}`)) { // Only add if not a path parameter
              queryParams.append(key, value);
            }
          });
          
          const queryString = queryParams.toString();
          if (queryString) {
            url += (url.includes('?') ? '&' : '?') + queryString;
          }
        }
        
        // Prepare request options
        const requestOptions = {
          method: endpoint.method,
          headers: { 
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
          },
        };
        
        // Add body for non-GET requests
        if (endpoint.method !== "GET" && (endpoint.body || endpoint.params)) {
          requestOptions.body = JSON.stringify(endpoint.body || endpoint.params);
        }
        
        console.log(`Executing ${endpoint.method} request to ${url}`);
        const response = await fetch(url, requestOptions);
        
        let data;
        try {
          data = await response.json();
        } catch (e) {
          data = { message: "No JSON response" };
        }
        
        setRequestResponse({
          success: response.ok,
          data: data,
          status: response.status,
          timestamp: new Date().toISOString()
        });
        
        // Refresh system events and table stats after successful operation
        if (response.ok) {
          setTimeout(() => {
            fetchTableStats();
          }, 2000); // Give the system a moment to update
        }
      } catch (error) {
        console.error(`Error executing ${endpoint.name}:`, error);
        setRequestResponse({
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      } finally {
        setProcessingRequest(false);
        // Auto-clear response after 10 seconds
        setTimeout(() => {
          if (activeRequest === endpoint.id) {
            setActiveRequest(null);
            setRequestResponse(null);
          }
        }, 10000);
      }
    };
  
    // Reset API response - NEW FUNCTION
    const resetApiResponse = () => {
      setActiveRequest(null);
      setRequestResponse(null);
    };
  
    // Render system health status
    const renderHealthStatus = (status) => {
      switch (status) {
        case "online":
          return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <CheckCircle className="w-3 h-3 mr-1" /> Online
          </span>;
        case "degraded":
          return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            <AlertTriangle className="w-3 h-3 mr-1" /> Degraded
          </span>;
        case "offline":
          return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            <AlertTriangle className="w-3 h-3 mr-1" /> Offline
          </span>;
        default:
          return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            <Server className="w-3 h-3 mr-1" /> Unknown
          </span>;
      }
    };
  
    // Render method badge
    const renderMethodBadge = (method) => {
      let bgColor = "";
      let textColor = "";
      
      switch (method) {
        case "GET":
          bgColor = "bg-blue-100";
          textColor = "text-blue-800";
          break;
        case "POST":
          bgColor = "bg-green-100";
          textColor = "text-green-800";
          break;
        case "PUT":
          bgColor = "bg-yellow-100";
          textColor = "text-yellow-800";
          break;
        case "DELETE":
          bgColor = "bg-red-100";
          textColor = "text-red-800";
          break;
        default:
          bgColor = "bg-gray-100";
          textColor = "text-gray-800";
      }
      
      return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${bgColor} ${textColor}`}>
          {method}
        </span>
      );
    };
  
    // Render source file badge
    const renderSourceBadge = (source) => {
      let color;
      
      switch (source) {
        case "main.py":
          color = "bg-indigo-100 text-indigo-800";
          break;
        case "price_updater_v2.py":
          color = "bg-green-100 text-green-800";
          break;
        case "price_updater.py":
          color = "bg-yellow-100 text-yellow-800";
          break;
        case "portfolio_calculator.py":
          color = "bg-blue-100 text-blue-800";
          break;
        default:
          color = "bg-gray-100 text-gray-800";
      }
      
      return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${color}`}>
          {source}
        </span>
      );
    };
  
    if (loading) {
      return (
        <div className="min-h-screen p-6 flex justify-center items-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading admin dashboard...</p>
          </div>
        </div>
      );
    }
  
    return (
      <div className="min-h-screen p-6">
        <div className="max-w-7xl mx-auto">
          <header className="mb-8">
            <h1 className="text-3xl font-bold text-blue-800 mb-2">NestEgg Admin Dashboard</h1>
            <p className="text-gray-600">System monitoring and control panel</p>
            
            {/* Tabs for different sections */}
            <div className="flex space-x-1 mt-6 border-b border-gray-200">
              <button
                onClick={() => setActiveTab("overview")}
                className={`px-4 py-2 font-medium rounded-t-lg ${
                  activeTab === "overview" 
                    ? "bg-white text-blue-600 border-b-2 border-blue-600" 
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                <Server className="w-4 h-4 inline-block mr-2" />
                Overview
              </button>
              <button
                onClick={() => setActiveTab("database")}
                className={`px-4 py-2 font-medium rounded-t-lg ${
                  activeTab === "database" 
                    ? "bg-white text-blue-600 border-b-2 border-blue-600" 
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                <Database className="w-4 h-4 inline-block mr-2" />
                Database
              </button>
              <button
                onClick={() => setActiveTab("api")}
                className={`px-4 py-2 font-medium rounded-t-lg ${
                  activeTab === "api" 
                    ? "bg-white text-blue-600 border-b-2 border-blue-600" 
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                <Code className="w-4 h-4 inline-block mr-2" />
                API Inventory
              </button>
            </div>
          </header>
  
          {activeTab === "overview" && (
            <>
              {/* System Health Summary */}
              <div className="bg-white rounded-xl shadow-md p-6 mb-8">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold flex items-center">
                    <Server className="w-6 h-6 mr-2 text-blue-600" />
                    System Health
                  </h2>
                  <button 
                    onClick={checkSystemHealth}
                    className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg text-sm hover:bg-blue-200 transition-colors flex items-center"
                  >
                    <RefreshCcw className="w-4 h-4 mr-1" />
                    Refresh
                  </button>
                </div>
  
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="text-sm font-medium text-gray-500 mb-2">Overall Status</h3>
                    <div className="flex items-center">
                      {renderHealthStatus(systemHealth.status)}
                    </div>
                  </div>
                  
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="text-sm font-medium text-gray-500 mb-2">Database</h3>
                    <div className="flex items-center">
                      {renderHealthStatus(systemHealth.components.database?.status || 'unknown')}
                    </div>
                  </div>
                  
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="text-sm font-medium text-gray-500 mb-2">API</h3>
                    <div className="flex items-center">
                      {renderHealthStatus(systemHealth.components.api?.status || 'unknown')}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* NEW: System Architecture Overview */}
              <div className="bg-white rounded-xl shadow-md p-6 mb-8">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold flex items-center">
                    <Workflow className="w-6 h-6 mr-2 text-purple-600" />
                    Architecture Blueprint
                  </h2>
                </div>
                
                <div className="space-y-8">
                  {/* Core Components Section */}
                  <div>
                    <h3 className="text-lg font-medium text-gray-800 mb-4 flex items-center">
                      <Cpu className="w-5 h-5 mr-2 text-blue-500" />
                      Core Components
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {systemComponents.map((component, index) => (
                        <div key={index} className="bg-gray-50 p-4 rounded-lg border border-gray-100 hover:shadow-md transition-shadow">
                          <div className="flex justify-between items-start">
                            <h4 className="font-medium text-gray-900">{component.name}</h4>
                            <span className="px-2 py-1 bg-gray-200 text-gray-700 text-xs rounded">
                              {component.file}
                            </span>
                          </div>
                          <p className="text-gray-600 text-sm mt-2">{component.description}</p>
                          
                          <div className="mt-3">
                            <h5 className="text-xs uppercase text-gray-500 mb-1">Responsibilities:</h5>
                            <ul className="text-sm space-y-1">
                              {component.responsibilities.map((resp, i) => (
                                <li key={i} className="flex items-start">
                                  <span className="inline-block w-2 h-2 bg-blue-400 rounded-full mt-1.5 mr-2 flex-shrink-0"></span>
                                  <span>{resp}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                          
                          <div className="mt-3">
                            <h5 className="text-xs uppercase text-gray-500 mb-1">Connects to:</h5>
                            <div className="flex flex-wrap gap-2">
                              {component.connections.map((conn, i) => (
                                <span key={i} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                                  {conn}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {/* System Flows Section */}
                  <div>
                    <h3 className="text-lg font-medium text-gray-800 mb-4 flex items-center">
                      <Share2 className="w-5 h-5 mr-2 text-green-500" />
                      System Workflows
                    </h3>
                    
                    <div className="space-y-4">
                      {systemFlows.map((flow, index) => (
                        <div key={index} className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                          <h4 className="font-medium text-gray-900">{flow.name}</h4>
                          <p className="text-gray-600 text-sm mt-1">{flow.description}</p>
                          
                          <div className="mt-3 border-l-2 border-green-400 pl-4">
                            <ol className="text-sm space-y-2">
                              {flow.steps.map((step, i) => (
                                <li key={i} className="flex items-start">
                                  <span className="inline-flex items-center justify-center w-5 h-5 bg-green-100 text-green-800 rounded-full mr-2 text-xs flex-shrink-0">
                                    {i+1}
                                  </span>
                                  <span className="pt-0.5">{step}</span>
                                </li>
                              ))}
                            </ol>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {/* System Design Principles */}
                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                    <h3 className="text-lg font-medium text-blue-900 mb-2">Design Principles</h3>
                    <ul className="space-y-2">
                      <li className="flex items-start">
                        <span className="inline-block w-2 h-2 bg-blue-500 rounded-full mt-1.5 mr-2"></span>
                        <span className="text-blue-800"><strong>Decoupled Architecture:</strong> Price updating and portfolio calculations are independent services</span>
                      </li>
                      <li className="flex items-start">
                        <span className="inline-block w-2 h-2 bg-blue-500 rounded-full mt-1.5 mr-2"></span>
                        <span className="text-blue-800"><strong>Multi-Source Strategy:</strong> System can fetch data from multiple providers with fallback mechanisms</span>
                      </li>
                      <li className="flex items-start">
                        <span className="inline-block w-2 h-2 bg-blue-500 rounded-full mt-1.5 mr-2"></span>
                        <span className="text-blue-800"><strong>Event-Driven:</strong> Operations are recorded as system events for monitoring and debugging</span>
                      </li>
                      <li className="flex items-start">
                        <span className="inline-block w-2 h-2 bg-blue-500 rounded-full mt-1.5 mr-2"></span>
                        <span className="text-blue-800"><strong>Comprehensive History:</strong> Portfolio values and security prices are recorded for historical analysis</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
  
                    {/* System Health Criteria */}
                    <div className="bg-green-50 p-4 rounded-lg border border-green-100 mt-6">
                    <h3 className="text-lg font-medium text-green-900 mb-2">System Health Criteria</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                        <h4 className="font-medium text-green-800 mb-1">Database Health</h4>
                        <ul className="space-y-1">
                            <li className="flex items-start text-sm">
                            <span className="inline-block w-2 h-2 bg-green-500 rounded-full mt-1.5 mr-2 flex-shrink-0"></span>
                            <span><strong>Online:</strong> Connection established, queries execute in &lt;500ms</span>
                            </li>
                            <li className="flex items-start text-sm">
                            <span className="inline-block w-2 h-2 bg-yellow-500 rounded-full mt-1.5 mr-2 flex-shrink-0"></span>
                            <span><strong>Degraded:</strong> Connection established, but queries slow (&gt;500ms)</span>
                            </li>
                            <li className="flex items-start text-sm">
                            <span className="inline-block w-2 h-2 bg-red-500 rounded-full mt-1.5 mr-2 flex-shrink-0"></span>
                            <span><strong>Offline:</strong> Connection failed or timeout exceeded</span>
                            </li>
                        </ul>
                        </div>
                        <div>
                        <h4 className="font-medium text-green-800 mb-1">API Services Health</h4>
                        <ul className="space-y-1">
                            <li className="flex items-start text-sm">
                            <span className="inline-block w-2 h-2 bg-green-500 rounded-full mt-1.5 mr-2 flex-shrink-0"></span>
                            <span><strong>Online:</strong> All endpoints responding with 2xx status</span>
                            </li>
                            <li className="flex items-start text-sm">
                            <span className="inline-block w-2 h-2 bg-yellow-500 rounded-full mt-1.5 mr-2 flex-shrink-0"></span>
                            <span><strong>Degraded:</strong> Some endpoints slow or returning errors</span>
                            </li>
                            <li className="flex items-start text-sm">
                            <span className="inline-block w-2 h-2 bg-red-500 rounded-full mt-1.5 mr-2 flex-shrink-0"></span>
                            <span><strong>Offline:</strong> Critical endpoints unresponsive</span>
                            </li>
                        </ul>
                        </div>
                    </div>
                    </div>

              {/* Recent System Events */}
              <SystemEvents />
            </>
          )}
  
          {activeTab === "database" && (
            <div className="bg-white rounded-xl shadow-md p-6 mb-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold flex items-center">
                  <Database className="w-6 h-6 mr-2 text-blue-600" />
                  Database Statistics
                </h2>
                <div className="flex space-x-2">
                  <button 
                    onClick={async () => {
                      try {
                        setLoading(true);
                        const token = localStorage.getItem("token");
                        const response = await fetchWithAuth('/admin/generate-test-data', {
                          method: "POST"
                        });
                        if (response.ok) {
                          const result = await response.json();
                          alert(result.message || "Test data generated successfully");
                          fetchTableStats();
                        } else {
                          const errorText = await response.text();
                          alert(`Failed to generate test data: ${errorText}`);
                        }
                      } catch (error) {
                        console.error("Error generating test data:", error);
                        alert(`Error: ${error.message}`);
                      } finally {
                        setLoading(false);
                      }
                    }}
                    className="px-3 py-1 bg-green-100 text-green-700 rounded-lg text-sm hover:bg-green-200 transition-colors flex items-center"
                  >
                    <Plus className="w-4 h-4 mr-1" /> Generate Test Data
                  </button>
                  <button 
                    onClick={fetchTableStats}
                    className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg text-sm hover:bg-blue-200 transition-colors flex items-center"
                  >
                    <RefreshCcw className="w-4 h-4 mr-1" />
                    Refresh
                  </button>
                </div>
              </div>
  
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Table</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Row Count</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Last Updated</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Details</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {Object.entries(tableStats).map(([tableName, stats]) => (
                      <React.Fragment key={tableName}>
                        <tr 
                          className={`hover:bg-gray-50 cursor-pointer ${selectedTable === tableName ? 'bg-blue-50' : ''}`}
                          onClick={() => handleTableRowClick(tableName)}
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="font-medium text-gray-900">{tableName}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            <div className="text-sm font-semibold">{stats.count?.toLocaleString() || 0}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            <div className="text-sm text-gray-500">
                              {stats.last_updated ? new Date(stats.last_updated).toLocaleString() : 'Never'}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            {selectedTable === tableName ? (
                              <ChevronUp className="w-5 h-5 text-blue-500 inline-block" />
                            ) : (
                              <ChevronDown className="w-5 h-5 text-gray-400 inline-block" />
                            )}
                          </td>
                        </tr>
                        
                        {/* Detail View */}
                        {selectedTable === tableName && (
                          <tr>
                            <td colSpan="4" className="px-0 py-0">
                              <div className="bg-gray-50 p-4 border-t border-b border-gray-200">
                                <div className="flex justify-between items-center mb-3">
                                  <h3 className="text-lg font-medium text-gray-700">{tableName} Details</h3>
                                  <button 
                                    onClick={() => {
                                      setSelectedTable(null);
                                      setTableDetails(null);
                                    }}
                                    className="text-gray-400 hover:text-gray-600"
                                  >
                                    <X className="w-5 h-5" />
                                  </button>
                                </div>
                                
                                {loadingDetails ? (
                                  <div className="flex justify-center py-8">
                                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                                  </div>
                                ) : tableDetails ? (
                                  <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-gray-200">
                                      <thead className="bg-gray-100">
                                        <tr>
                                          {tableDetails.columns.map((column, index) => (
                                            <th 
                                              key={index}
                                              className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                                            >
                                              {column}
                                            </th>
                                          ))}
                                        </tr>
                                      </thead>
                                      <tbody className="bg-white divide-y divide-gray-200">
                                        {tableDetails.rows.length > 0 ? (
                                          tableDetails.rows.map((row, rowIndex) => (
                                            <tr key={rowIndex} className="hover:bg-gray-50">
                                              {tableDetails.columns.map((column, colIndex) => (
                                                <td key={colIndex} className="px-4 py-2 whitespace-nowrap text-sm">
                                                  {row[column.toLowerCase().replace(/\s+/g, '_')] || 
                                                   row[Object.keys(row)[colIndex]] || 
                                                   '-'}
                                                </td>
                                              ))}
                                            </tr>
                                          ))
                                        ) : (
                                          <tr>
                                            <td 
                                              colSpan={tableDetails.columns.length} 
                                              className="px-4 py-4 text-center text-gray-500"
                                            >
                                              No data available
                                            </td>
                                          </tr>
                                        )}
                                      </tbody>
                                    </table>
                                  </div>
                                ) : (
                                  <p className="text-center py-4 text-gray-500">
                                    No details available for this table
                                  </p>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          
          {activeTab === "api" && (
            <div className="bg-white rounded-xl shadow-md p-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
                <h2 className="text-xl font-semibold flex items-center mb-4 md:mb-0">
                  <Code className="w-6 h-6 mr-2 text-blue-600" />
                  NestEgg API Inventory
                </h2>
                
                <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4">
                  {/* Search box */}
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search APIs..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 pr-4 py-2 border rounded-lg w-full sm:w-64 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  </div>
                  
                  {/* Group filter */}
                  <div className="relative">
                    <select
                      value={apiFilter}
                      onChange={(e) => setApiFilter(e.target.value)}
                      className="pl-10 pr-4 py-2 border rounded-lg w-full appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="All">All Groups</option>
                      {apiGroups.map(group => (
                        <option key={group} value={group}>{group}</option>
                      ))}
                    </select>
                    <Filter className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  </div>
                </div>
              </div>
              
              {/* API Inventory Table */}
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 rounded-lg overflow-hidden">
                  <thead className="bg-gray-50">
                    <tr>
                      <th 
                        className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                        onClick={() => requestSort('name')}
                      >
                        <div className="flex items-center">
                          Name
                          <ArrowUpDown className="w-3 h-3 ml-1" />
                          {sortKey === 'name' && (
                            <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                          )}
                        </div>
                      </th>
                      <th 
                        className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                        onClick={() => requestSort('endpoint')}
                      >
                        <div className="flex items-center">
                          Endpoint
                          <ArrowUpDown className="w-3 h-3 ml-1" />
                          {sortKey === 'endpoint' && (
                            <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                          )}
                        </div>
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Method
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Source
                      </th>
                      <th 
                        className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                        onClick={() => requestSort('group')}
                      >
                        <div className="flex items-center">
                          Group
                          <ArrowUpDown className="w-3 h-3 ml-1" />
                          {sortKey === 'group' && (
                            <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                          )}
                        </div>
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {sortedEndpoints.length > 0 ? (
                      sortedEndpoints.map((endpoint, index) => {
                        // Determine if this is the first item in a new group
                        const isNewGroup = index === 0 || sortedEndpoints[index - 1].group !== endpoint.group;
                        const isNewSubgroup = index === 0 || 
                                             sortedEndpoints[index - 1].subgroup !== endpoint.subgroup || 
                                             sortedEndpoints[index - 1].group !== endpoint.group;
                        
                        return (
                          <React.Fragment key={endpoint.id}>
                            {/* Optional: Group header row for better organization */}
                            {isNewGroup && (
                              <tr className="bg-gray-100">
                                <td colSpan="6" className="px-4 py-2 font-medium text-gray-700">
                                  {endpoint.group}
                                </td>
                              </tr>
                            )}
                            
                            {/* Optional: Subgroup header for even better organization */}
                            {isNewSubgroup && (
                              <tr className="bg-gray-50">
                                <td colSpan="6" className="px-4 py-1 text-sm text-gray-500 pl-8">
                                  {endpoint.subgroup}
                                </td>
                                </tr>
                          )}
                          
                          {/* Main endpoint row */}
                          <tr className="hover:bg-blue-50 transition-colors">
                            <td className="px-4 py-3">
                              <div className="flex items-center">
                                <div className="p-1 rounded-full bg-blue-100 mr-2 flex-shrink-0">
                                  {endpoint.icon}
                                </div>
                                <span className="font-medium text-gray-900">{endpoint.name}</span>
                              </div>
                              <div className="text-xs text-gray-500 ml-7 mt-1">{endpoint.description}</div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="text-sm text-gray-500 font-mono">{endpoint.endpoint}</div>
                            </td>
                            <td className="px-4 py-3 text-center">
                              {renderMethodBadge(endpoint.method)}
                            </td>
                            <td className="px-4 py-3">
                              {renderSourceBadge(endpoint.source)}
                            </td>
                            <td className="px-4 py-3">
                              <div className="text-sm">{endpoint.group}</div>
                              <div className="text-xs text-gray-500">{endpoint.subgroup}</div>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <div className="flex justify-end space-x-2">
                                {/* Execute Button */}
                                <button
                                  onClick={() => executeRequest(endpoint)}
                                  disabled={processingRequest && activeRequest === endpoint.id}
                                  className={`inline-flex items-center justify-center px-3 py-1 border border-transparent text-sm font-medium rounded-md shadow-sm ${
                                    processingRequest && activeRequest === endpoint.id
                                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                      : 'text-white bg-blue-600 hover:bg-blue-700'
                                  }`}
                                >
                                  {processingRequest && activeRequest === endpoint.id ? (
                                    <>
                                      <RefreshCcw className="w-3 h-3 mr-1 animate-spin" />
                                      ...
                                    </>
                                  ) : (
                                    <>
                                      <Send className="w-3 h-3 mr-1" />
                                      Execute
                                    </>
                                  )}
                                </button>
                                
                                {/* NEW: Reset Button - Only show when there's a response */}
                                {activeRequest === endpoint.id && requestResponse && (
                                  <button
                                    onClick={resetApiResponse}
                                    className="inline-flex items-center justify-center px-3 py-1 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50"
                                  >
                                    <RotateCcw className="w-3 h-3 mr-1" />
                                    Reset
                                  </button>
                                )}
                              </div>
                              
                              {/* Response display */}
                              {activeRequest === endpoint.id && requestResponse && (
                                <div className={`mt-2 p-2 rounded-md text-xs ${
                                  requestResponse.success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
                                } text-left`}>
                                  <div className="font-medium">
                                    {requestResponse.success ? '✓ Success' : '✕ Error'}
                                  </div>
                                  <div className="max-h-20 overflow-y-auto mt-1">
                                    <pre className="whitespace-pre-wrap text-xs">
                                      {requestResponse.error ? requestResponse.error : JSON.stringify(requestResponse.data, null, 2)}
                                    </pre>
                                  </div>
                                </div>
                              )}
                            </td>
                          </tr>
                        </React.Fragment>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan="6" className="px-4 py-8 text-center text-gray-500">
                        No API endpoints found matching your criteria
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            
            <div className="mt-4 text-sm text-gray-500">
              Showing {sortedEndpoints.length} of {allApiEndpoints.length} API endpoints
            </div>
          </div>
        )}
      </div>
    </div>
  );
}