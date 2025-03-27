// pages/investment-securities.js
import { useContext, useEffect, useState } from "react";
import { AuthContext } from "@/context/AuthContext";
import { useRouter } from "next/router";
import { 
  BarChart3, 
  Briefcase, 
  ChevronDown, 
  ChevronUp, 
  DollarSign, 
  Download, 
  FileUp, 
  Filter, 
  PlusCircle, 
  RefreshCw, 
  Search, 
  Settings, 
  TrendingDown, 
  TrendingUp,
  X,
  Circle,
  AlertCircle,
  Info,
  Clock,
  Eye,
  EyeOff,
  ChevronRight,
  ArrowUpRight,
  ArrowDownRight,
  Plus
} from 'lucide-react';
import { Line, Doughnut } from "react-chartjs-2";
import "chart.js/auto";
import { fetchWithAuth } from '@/utils/api';
import { useEggMascot } from '@/context/EggMascotContext';

export default function InvestmentSecurities() {
  // Context and router
  const { user } = useContext(AuthContext);
  const router = useRouter();
  const { triggerCartwheel } = useEggMascot();
  
  // State for accounts and positions
  const [accounts, setAccounts] = useState([]);
  const [positions, setPositions] = useState({});
  const [expandedAccount, setExpandedAccount] = useState(null);
  const [viewMode, setViewMode] = useState('accounts'); // 'accounts', 'positions', 'summary'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  // State for account operations
  const [isAddAccountModalOpen, setIsAddAccountModalOpen] = useState(false);
  const [isSelectAccountModalOpen, setIsSelectAccountModalOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [isUSSecuritiesModalOpen, setIsUSSecuritiesModalOpen] = useState(false);
  
  // State for position operations
  const [isAddPositionModalOpen, setIsAddPositionModalOpen] = useState(false);
  const [isBulkUploadModalOpen, setIsBulkUploadModalOpen] = useState(false);
  const [editPosition, setEditPosition] = useState(null);
  const [isEditPositionModalOpen, setIsEditPositionModalOpen] = useState(false);
  const [isPositionDetailModalOpen, setIsPositionDetailModalOpen] = useState(false);
  const [selectedPositionDetail, setSelectedPositionDetail] = useState(null);
  
  // Filter and sort states
  const [sortField, setSortField] = useState('value');
  const [sortDirection, setSortDirection] = useState('desc');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterOptions, setFilterOptions] = useState({
    accountType: 'all',
    assetClass: 'all',
    gainLoss: 'all',
  });
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  
  // Chart states
  const [selectedTimeframe, setSelectedTimeframe] = useState("1Y");
  const [chartView, setChartView] = useState('value'); // 'value', 'allocation'
  const [hideBalances, setHideBalances] = useState(false);
  
  // Bulk upload state
  const [selectedBulkAccount, setSelectedBulkAccount] = useState(null);
  const [bulkData, setBulkData] = useState("");
  const [isProcessingBulk, setIsProcessingBulk] = useState(false);
  const [bulkUploadStep, setBulkUploadStep] = useState(1);
  
  // Position form state
  const [securitySearch, setSecuritySearch] = useState("");
  const [securityShares, setSecurityShares] = useState(0);
  const [securityPrice, setSecurityPrice] = useState(0);
  const [purchaseDate, setPurchaseDate] = useState("");
  const [costPerShare, setCostPerShare] = useState(0);
  const [totalCost, setTotalCost] = useState(0);
  const [searchResults, setSearchResults] = useState([]);
  const [formMessage, setFormMessage] = useState("");

  // Summary metrics
  const [portfolioSummary, setPortfolioSummary] = useState({
    total_value: 0,
    total_cost: 0,
    daily_change: 0,
    daily_change_value: 0,
    weekly_change: 0,
    monthly_change: 0,
    ytd_change: 0,
    yearly_change: 0,
  });
  
  // Fetch initial data
  useEffect(() => {
    fetchAccounts();
    fetchPortfolioSummary();
    
    // Set up event listeners for navbar actions
    const handleOpenAddPositionModal = () => setIsAddPositionModalOpen(true);
    const handleOpenAddAccountModal = () => setIsAddAccountModalOpen(true);
    const handleResetSelectedAccount = () => setSelectedAccount(null);
    const handleOpenSelectAccountModal = () => {
      setSelectedAccount(null);
      setIsAddPositionModalOpen(false);
      setIsUSSecuritiesModalOpen(false);
      setIsSelectAccountModalOpen(true);
    };
    
    // Add event listeners
    window.addEventListener('openAddPositionModal', handleOpenAddPositionModal);
    window.addEventListener('openAddAccountModal', handleOpenAddAccountModal);
    window.addEventListener('resetSelectedAccount', handleResetSelectedAccount);
    window.addEventListener('openSelectAccountModal', handleOpenSelectAccountModal);
    
    // Clean up
    return () => {
      window.removeEventListener('openAddPositionModal', handleOpenAddPositionModal);
      window.removeEventListener('openAddAccountModal', handleOpenAddAccountModal);
      window.removeEventListener('resetSelectedAccount', handleResetSelectedAccount);
      window.removeEventListener('openSelectAccountModal', handleOpenSelectAccountModal);
    };
  }, []);

  // Calculate portfolio metrics from account data
  useEffect(() => {
    if (accounts.length > 0) {
      calculatePortfolioSummary();
    }
  }, [accounts, positions]);

  // Fetch accounts data
  const fetchAccounts = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetchWithAuth('/accounts');

      if (!response.ok) {
        throw new Error(`Failed to fetch accounts: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.accounts && Array.isArray(data.accounts)) {
        setAccounts(data.accounts);
        
        // Fetch positions for each account
        data.accounts.forEach(account => {
          fetchPositions(account.id);
        });
        
        setLastUpdated(new Date());
      }
    } catch (error) {
      console.error("Error fetching accounts:", error);
      setError(error.message || "Failed to load accounts");
    } finally {
      setLoading(false);
    }
  };

  // Fetch positions for a specific account
  const fetchPositions = async (accountId) => {
    try {
      const response = await fetchWithAuth(`/positions/${accountId}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch positions: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data && data.positions) {
        setPositions(prevPositions => ({
          ...prevPositions,
          [accountId]: data.positions || []
        }));
      }
    } catch (error) {
      console.error(`Error fetching positions for account ${accountId}:`, error);
    }
  };

  // Fetch portfolio summary data
  const fetchPortfolioSummary = async () => {
    try {
      const response = await fetchWithAuth('/portfolio/summary');
      
      if (response.ok) {
        const data = await response.json();
        setPortfolioSummary({
          total_value: data.net_worth || 0,
          daily_change: data.daily_change || 0,
          daily_change_value: data.net_worth * (data.daily_change / 100) || 0,
          weekly_change: 2.5, // Mock data - would be from API
          monthly_change: 5.3, // Mock data - would be from API
          ytd_change: data.ytd_change || 8.7,
          yearly_change: data.yearly_change || 12.4,
          last_price_update: data.last_price_update,
        });
      }
    } catch (error) {
      console.error("Error fetching portfolio summary:", error);
    }
  };

  // Update market prices
  const updateMarketPrices = async () => {
    setLoading(true);
    try {
      const response = await fetchWithAuth('/market/update-prices-v2', {
        method: "POST"
      });
      
      if (response.ok) {
        const data = await response.json();
        setError(`Success: ${data.message}`);
        setTimeout(() => setError(null), 3000);
        
        // Refresh data
        fetchAccounts();
        fetchPortfolioSummary();
        triggerCartwheel(); // Animate the mascot
      } else {
        const errorText = await response.text();
        setError(`Failed to update prices: ${errorText}`);
      }
    } catch (error) {
      setError(`Error updating prices: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Calculate account cost basis
  const calculateAccountCostBasis = (accountId) => {
    if (!positions[accountId]) return 0;
    
    return positions[accountId].reduce((total, position) => {
      const positionCostBasis = position.cost_basis || position.price;
      return total + (positionCostBasis * position.shares);
    }, 0);
  };

  // Calculate portfolio summary
  const calculatePortfolioSummary = () => {
    let totalValue = 0;
    let totalCost = 0;
    
    accounts.forEach(account => {
      totalValue += account.balance || 0;
      const accountPositions = positions[account.id] || [];
      const accountCost = accountPositions.reduce((sum, position) => {
        return sum + ((position.cost_basis || position.price) * position.shares);
      }, 0);
      totalCost += accountCost;
    });
    
    // Update summary
    setPortfolioSummary(prev => ({
      ...prev,
      total_value: totalValue,
      total_cost: totalCost
    }));
  };

  // Handle adding a position to account
  const handleAddPosition = (type) => {
    if (!selectedAccount) {
      setIsSelectAccountModalOpen(true);
    } else {
      if (type === "US Securities") {
        setIsUSSecuritiesModalOpen(true);
      } else {
        alert(`${type} support coming soon!`);
      }
    }
  };

  // Toggle account expansion
  const toggleAccountExpansion = (accountId) => {
    setExpandedAccount(expandedAccount === accountId ? null : accountId);
  };

  // Change sort order
  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  // Filter positions by search query
  const filterBySearch = (item) => {
    if (!searchQuery) return true;
    
    const query = searchQuery.toLowerCase();
    if ('ticker' in item) {
      // Position filtering
      return item.ticker.toLowerCase().includes(query);
    } else {
      // Account filtering
      return item.account_name.toLowerCase().includes(query) || 
             (item.institution && item.institution.toLowerCase().includes(query));
    }
  };

  // Apply filters to accounts or positions
  const applyFilters = (item) => {
    if (!filterBySearch(item)) return false;
    
    // Account type filter
    if ('account_name' in item && filterOptions.accountType !== 'all') {
      if (!item.type || item.type.toLowerCase() !== filterOptions.accountType.toLowerCase()) {
        return false;
      }
    }
    
    // Gain/Loss filter for positions
    if ('ticker' in item && filterOptions.gainLoss !== 'all') {
      const gainLoss = item.value - (item.cost_basis * item.shares);
      if (filterOptions.gainLoss === 'gains' && gainLoss <= 0) return false;
      if (filterOptions.gainLoss === 'losses' && gainLoss >= 0) return false;
    }
    
    return true;
  };

  // Sort accounts or positions
  const sortItems = (items, isPositions = false) => {
    return [...items].sort((a, b) => {
      let aValue, bValue;
      
      if (isPositions) {
        // Position sorting
        switch(sortField) {
          case 'ticker':
            aValue = a.ticker;
            bValue = b.ticker;
            break;
          case 'price':
            aValue = a.price;
            bValue = b.price;
            break;
          case 'value':
            aValue = a.value || (a.price * a.shares);
            bValue = b.value || (b.price * b.shares);
            break;
          case 'gainLoss':
            aValue = (a.value || (a.price * a.shares)) - (a.cost_basis * a.shares);
            bValue = (b.value || (b.price * b.shares)) - (b.cost_basis * b.shares);
            break;
          default:
            aValue = a.ticker;
            bValue = b.ticker;
        }
      } else {
        // Account sorting
        switch(sortField) {
          case 'name':
            aValue = a.account_name;
            bValue = b.account_name;
            break;
          case 'institution':
            aValue = a.institution || '';
            bValue = b.institution || '';
            break;
          case 'value':
            aValue = a.balance || 0;
            bValue = b.balance || 0;
            break;
          case 'gainLoss':
            const aCostBasis = calculateAccountCostBasis(a.id);
            const bCostBasis = calculateAccountCostBasis(b.id);
            aValue = (a.balance || 0) - aCostBasis;
            bValue = (b.balance || 0) - bCostBasis;
            break;
          default:
            aValue = a.account_name;
            bValue = b.account_name;
        }
      }
      
      // String comparison
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortDirection === 'asc' 
          ? aValue.localeCompare(bValue) 
          : bValue.localeCompare(aValue);
      }
      
      // Numeric comparison
      return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
    });
  };

  // Get filtered and sorted accounts
  const getFilteredAccounts = () => {
    return sortItems(accounts.filter(applyFilters));
  };

  // Get filtered and sorted positions for an account
  const getFilteredPositions = (accountId) => {
    const accountPositions = positions[accountId] || [];
    return sortItems(accountPositions.filter(applyFilters), true);
  };

  // Get all positions across all accounts
  const getAllPositions = () => {
    const allPositions = [];
    
    accounts.forEach(account => {
      const accountPositions = positions[account.id] || [];
      accountPositions.forEach(position => {
        allPositions.push({
          ...position,
          account_name: account.account_name,
          account_id: account.id
        });
      });
    });
    
    return sortItems(allPositions.filter(applyFilters), true);
  };

  // Format currency values
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: 'USD',
      maximumFractionDigits: 2
    }).format(value);
  };

  // Format percentage values
  const formatPercentage = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'percent',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value / 100);
  };

  // Handle security search
  const handleSecuritySearch = async (value) => {
    setSecuritySearch(value);
    
    if (value.length >= 2) {
      try {
        const results = await searchSecurities(value);
        
        if (results.length > 0) {
          setSecurityPrice(results[0].price || 0);
        }
      } catch (error) {
        console.error("Error in security search:", error);
        setFormMessage(`Security search error: ${error.message}`);
      }
    } else {
      setSearchResults([]);
    }
  };

  // Search securities API
  const searchSecurities = async (query) => {
    if (!query || query.length < 1) {
      setSearchResults([]);
      return [];
    }
    
    try {
      const response = await fetchWithAuth(`/securities/search?query=${encodeURIComponent(query)}`);
      
      if (!response.ok) {
        throw new Error(`Failed to search securities: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (!data || !data.results) {
        return [];
      }
      
      const formattedResults = data.results.map(result => ({
        ticker: result.ticker || '',
        name: result.name || result.company_name || "Unknown",
        price: typeof result.price === 'number' ? result.price : 0,
        sector: result.sector || '',
        industry: result.industry || '',
        market_cap: result.market_cap || 0
      }));
      
      setSearchResults(formattedResults);
      return formattedResults;
    } catch (error) {
      console.error("Error searching securities:", error);
      setSearchResults([]);
      return [];
    }
  };

  // Add a security position
  const handleAddSecurity = async () => {
    if (!securitySearch || securityShares <= 0 || !selectedAccount || !purchaseDate || costPerShare <= 0) {
      setFormMessage("All fields are required and must be valid values");
      return;
    }
  
    setFormMessage("Adding position...");
    try {
      const response = await fetchWithAuth(`/positions/${selectedAccount}`, {
        method: "POST",
        body: JSON.stringify({
          ticker: securitySearch.toUpperCase(),
          shares: parseFloat(securityShares),
          price: parseFloat(securityPrice),
          cost_basis: parseFloat(costPerShare),
          purchase_date: purchaseDate
        }),
      });
  
      if (!response.ok) {
        const responseData = await response.json();
        setFormMessage(`Failed to add position: ${responseData.detail || 'Unknown error'}`);
        return;
      }
  
      setFormMessage("Position added successfully!");
  
      // Refresh data
      fetchAccounts();
      fetchPositions(selectedAccount);
      fetchPortfolioSummary();
  
      // Reset modal and form
      setTimeout(() => {
        setIsAddPositionModalOpen(false);
        setIsUSSecuritiesModalOpen(false);
        setSecuritySearch("");
        setSecurityShares(0);
        setSecurityPrice(0);
        setPurchaseDate("");
        setCostPerShare(0);
        setFormMessage("");
      }, 1000);
    } catch (error) {
      setFormMessage(`Error adding position: ${error.message}`);
    }
  };

  // View position details
  const handlePositionDetailClick = (position) => {
    setSelectedPositionDetail(position);
    setIsPositionDetailModalOpen(true);
  };

  // Parse bulk data
  const getParsedBulkData = () => {
    if (!bulkData.trim()) return [];
    
    const lines = bulkData.split(/\r?\n/).filter(line => line.trim());
    const parsedData = [];
    
    for (const line of lines) {
      let row;
      if (line.includes('\t')) {
        row = line.split('\t');
      } else if (line.includes(',')) {
        row = line.split(',');
      } else if (line.includes(';')) {
        row = line.split(';');
      } else {
        row = line.split(/\s+/);
      }
      
      if (row.length >= 1) {
        while (row.length < 5) row.push('');
        parsedData.push(row.slice(0, 5).map(item => item.trim()));
      }
    }
    
    return parsedData;
  };

  // Handle bulk upload
  const handleBulkUpload = async () => {
    if (!bulkData.trim() || !selectedBulkAccount) {
      setFormMessage("Please paste data to upload");
      return;
    }
    
    setIsProcessingBulk(true);
    setFormMessage("");
    
    const lines = bulkData.split(/\r?\n/).filter(line => line.trim());
    let successCount = 0;
    let errorCount = 0;
    
    try {
      for (const line of lines) {
        let row;
        if (line.includes('\t')) {
          row = line.split('\t');
        } else if (line.includes(',')) {
          row = line.split(',');
        } else if (line.includes(';')) {
          row = line.split(';');
        } else {
          errorCount++;
          continue;
        }
        
        if (row.length < 5) {
          errorCount++;
          continue;
        }
        
        const [ticker, shares, price, costBasis, purchaseDate] = row.map(item => item.trim());
        
        if (!ticker || isNaN(parseFloat(shares)) || isNaN(parseFloat(price)) || 
            isNaN(parseFloat(costBasis)) || !purchaseDate) {
          errorCount++;
          continue;
        }
        
        try {
          let formattedDate = purchaseDate;
          
          if (purchaseDate.includes('/')) {
            const parts = purchaseDate.split('/');
            if (parts.length === 3) {
              const month = parts[0].padStart(2, '0');
              const day = parts[1].padStart(2, '0');
              const year = parts[2].length === 2 ? `20${parts[2]}` : parts[2];
              formattedDate = `${year}-${month}-${day}`;
            }
          }
          
          const response = await fetchWithAuth(`/positions/${selectedBulkAccount.id}`, {
            method: "POST",
            body: JSON.stringify({
              ticker: ticker.toUpperCase(),
              shares: parseFloat(shares),
              price: parseFloat(price),
              cost_basis: parseFloat(costBasis),
              purchase_date: formattedDate
            }),
          });
          
          if (response.ok) {
            successCount++;
          } else {
            errorCount++;
          }
        } catch (error) {
          errorCount++;
        }
      }
      
      if (successCount > 0) {
        setFormMessage(`Successfully uploaded ${successCount} positions${errorCount > 0 ? `, ${errorCount} failed` : ''}`);
        fetchAccounts();
        fetchPositions(selectedBulkAccount.id);
        fetchPortfolioSummary();
        
        setTimeout(() => {
          setIsBulkUploadModalOpen(false);
          setBulkUploadStep(1);
          setSelectedBulkAccount(null);
          setBulkData("");
          setFormMessage("");
        }, 2000);
      } else {
        setFormMessage(`Failed to upload positions. Please check your data format.`);
      }
    } catch (error) {
      setFormMessage("Error uploading positions");
    } finally {
      setIsProcessingBulk(false);
    }
  };

  // Generate chart data for portfolio value over time
  const getPortfolioChartData = () => {
    // This would be replaced with actual historical data from API
    const months = selectedTimeframe === "1Y" ? 12 : 
                  selectedTimeframe === "5Y" ? 60 : 
                  selectedTimeframe === "1M" ? 30 : 
                  selectedTimeframe === "YTD" ? new Date().getMonth() + 1 : 6;
    
    const labels = Array.from({ length: months }, (_, i) => {
      const date = new Date();
      if (selectedTimeframe === "1M") {
        date.setDate(date.getDate() - (months - i - 1));
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      } else {
        date.setMonth(date.getMonth() - (months - i - 1));
        return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      }
    });
    
    // Generate mock data with realistic market patterns
    const volatility = selectedTimeframe === "1M" ? 0.01 : 
                      selectedTimeframe === "1Y" ? 0.03 : 0.05;
    const upwardBias = 0.002; // Slight upward bias over time
    
    const totalValue = portfolioSummary.total_value;
    const startValue = totalValue * 0.85; // Start at 85% of current value
    
    const data = Array.from({ length: months }, (_, i) => {
      const progress = i / (months - 1);
      const trendValue = startValue + (totalValue - startValue) * progress;
      const randomFactor = (Math.random() - 0.5) * 2 * volatility * trendValue;
      const biasValue = i * upwardBias * startValue;
      return trendValue + randomFactor + biasValue;
    });
    
    return {
      labels,
      datasets: [
        {
          label: "Portfolio Value ($)",
          data,
          borderColor: "#4A90E2",
          backgroundColor: "rgba(74, 144, 226, 0.2)",
          borderWidth: 2,
          pointRadius: 1,
          pointHoverRadius: 5,
          tension: 0.3,
          fill: true,
        },
      ],
    };
  };

  // Generate allocation pie chart data
  const getAllocationData = () => {
    const allPositions = getAllPositions();
    
    // Group by sector or asset class
    const threshold = portfolioSummary.total_value * 0.03; // 3% threshold
    let allocations = {};
    let otherTotal = 0;
    
    // Group by ticker for simplicity
    allPositions.forEach(position => {
      const value = position.value || (position.price * position.shares);
      if (value >= threshold) {
        allocations[position.ticker] = (allocations[position.ticker] || 0) + value;
      } else {
        otherTotal += value;
      }
    });
    
    if (otherTotal > 0) {
      allocations['Others'] = otherTotal;
    }
    
    // Generate a palette of professional-looking colors
    const generateColors = (count) => {
      const baseColors = [
        '#4A90E2', '#5DBB63', '#9B59B6', '#F39C12', '#E74C3C', 
        '#16A085', '#2C3E50', '#D35400', '#8E44AD', '#2980B9'
      ];
      
      let colors = [];
      for (let i = 0; i < count; i++) {
        colors.push(baseColors[i % baseColors.length]);
      }
      return colors;
    };
    
    const keys = Object.keys(allocations);
    const values = Object.values(allocations);
    const colors = generateColors(keys.length);
    
    return {
      labels: keys,
      datasets: [
        {
          data: values,
          backgroundColor: colors,
          borderWidth: 1,
          borderColor: 'rgba(255, 255, 255, 0.5)',
          hoverOffset: 15
        }
      ]
    };
  };

  // Chart options
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        ticks: {
          maxTicksLimit: 8,
          autoSkip: true,
          font: { size: 12 },
          padding: 10,
          color: "rgba(31, 41, 55, 0.7)",
        },
        grid: { display: false },
      },
      y: {
        ticks: {
          font: { size: 12 },
          color: "rgba(31, 41, 55, 0.7)",
          callback: (value) => `$${value.toLocaleString()}`,
        },
        grid: { color: "rgba(0, 0, 0, 0.05)" },
      },
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (context) => `Value: $${context.parsed.y.toLocaleString()}`
        }
      }
    },
  };

  // Pie chart options
  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right',
        labels: {
          color: 'rgba(31, 41, 55, 0.9)',
          font: {
            size: 12
          },
          boxWidth: 15,
          padding: 15
        }
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const value = context.raw;
            const percentage = ((value / portfolioSummary.total_value) * 100).toFixed(1);
            return `${context.label}: $${value.toLocaleString()} (${percentage}%)`;
          }
        }
      }
    }
  };

  // UI rendering based on login state
  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 text-gray-900">
        <div className="bg-white p-8 rounded-xl shadow-lg text-center max-w-md">
          <Briefcase className="w-16 h-16 mx-auto text-blue-600 mb-4" />
          <h1 className="text-2xl font-bold mb-4">Investment Securities</h1>
          <p className="text-gray-600 mb-6">Please log in to view your investment portfolio.</p>
          <button 
            onClick={() => router.push('/login')}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors"
          >
            Login
          </button>
        </div>
      </div>
    );
  }

  // Main UI
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <div className="container mx-auto px-4 py-6">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center">
              <Briefcase className="mr-3 text-blue-600" size={32} />
              Investment Securities
            </h1>
            <p className="text-gray-600 mt-1">
              Comprehensive view of your securities portfolio
            </p>
          </div>
          
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setHideBalances(!hideBalances)}
              className="flex items-center gap-2 text-gray-700 bg-white border border-gray-300 py-2 px-3 rounded-lg hover:bg-gray-100 transition-colors"
            >
              {hideBalances ? <Eye size={16} /> : <EyeOff size={16} />}
              {hideBalances ? "Show Balances" : "Hide Balances"}
            </button>
            
            <button
              onClick={updateMarketPrices}
              disabled={loading}
              className="flex items-center gap-2 text-gray-700 bg-white border border-gray-300 py-2 px-3 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
              {loading ? "Updating..." : "Refresh Prices"}
            </button>
            
            <button
              onClick={() => setIsFilterModalOpen(true)}
              className="flex items-center gap-2 text-gray-700 bg-white border border-gray-300 py-2 px-3 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <Filter size={16} />
              Filter
            </button>
            
            <button
              onClick={() => setIsBulkUploadModalOpen(true)}
              className="flex items-center gap-2 text-white bg-blue-500 border border-blue-600 py-2 px-3 rounded-lg hover:bg-blue-600 transition-colors"
            >
              <FileUp size={16} />
              Bulk Upload
            </button>
            
            <button
              onClick={() => setIsAddAccountModalOpen(true)}
              className="flex items-center gap-2 text-white bg-blue-600 py-2 px-3 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <PlusCircle size={16} />
              Add Account
            </button>
          </div>
        </div>
        
        {/* Last update notification */}
        {lastUpdated && (
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
            <Clock size={14} />
            <span>Last updated: {lastUpdated.toLocaleString()}</span>
            {portfolioSummary.last_price_update && (
              <span className="ml-2">
                Prices as of: {new Date(portfolioSummary.last_price_update).toLocaleString()}
              </span>
            )}
          </div>
        )}
        
        {/* Error message */}
        {error && (
          <div className={`mb-4 p-3 rounded-lg flex items-center gap-2 ${
            error.includes("Success") ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
          }`}>
            {error.includes("Success") ? (
              <Info size={18} className="flex-shrink-0" />
            ) : (
              <AlertCircle size={18} className="flex-shrink-0" />
            )}
            <span>{error}</span>
          </div>
        )}
        
        {/* Portfolio Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
          <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
            <h3 className="text-sm font-medium text-gray-500 mb-1">Total Value</h3>
            <div className="flex items-center">
              <span className="text-2xl font-bold">
                {hideBalances ? "••••••" : formatCurrency(portfolioSummary.total_value)}
              </span>
            </div>
          </div>
          
          <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
            <h3 className="text-sm font-medium text-gray-500 mb-1">Today's Change</h3>
            <div className="flex items-center">
              <span className={`text-2xl font-bold ${portfolioSummary.daily_change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {hideBalances ? "••••••" : (
                  <>
                    {portfolioSummary.daily_change >= 0 ? (
                      <ArrowUpRight size={18} className="inline mr-1" />
                    ) : (
                      <ArrowDownRight size={18} className="inline mr-1" />
                    )}
                    {formatPercentage(portfolioSummary.daily_change)}
                  </>
                )}
              </span>
            </div>
            {!hideBalances && (
              <div className={`text-sm ${portfolioSummary.daily_change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(portfolioSummary.daily_change_value)}
              </div>
            )}
          </div>
          
          <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
            <h3 className="text-sm font-medium text-gray-500 mb-1">1W Change</h3>
            <div className="flex items-center">
              <span className={`text-2xl font-bold ${portfolioSummary.weekly_change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {hideBalances ? "••••••" : (
                  <>
                    {portfolioSummary.weekly_change >= 0 ? (
                      <ArrowUpRight size={18} className="inline mr-1" />
                    ) : (
                      <ArrowDownRight size={18} className="inline mr-1" />
                    )}
                    {formatPercentage(portfolioSummary.weekly_change)}
                  </>
                )}
              </span>
            </div>
          </div>
          
          <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
            <h3 className="text-sm font-medium text-gray-500 mb-1">1M Change</h3>
            <div className="flex items-center">
              <span className={`text-2xl font-bold ${portfolioSummary.monthly_change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {hideBalances ? "••••••" : (
                  <>
                    {portfolioSummary.monthly_change >= 0 ? (
                      <ArrowUpRight size={18} className="inline mr-1" />
                    ) : (
                      <ArrowDownRight size={18} className="inline mr-1" />
                    )}
                    {formatPercentage(portfolioSummary.monthly_change)}
                  </>
                )}
              </span>
            </div>
          </div>
          
          <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
            <h3 className="text-sm font-medium text-gray-500 mb-1">YTD Change</h3>
            <div className="flex items-center">
              <span className={`text-2xl font-bold ${portfolioSummary.ytd_change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {hideBalances ? "••••••" : (
                  <>
                    {portfolioSummary.ytd_change >= 0 ? (
                      <ArrowUpRight size={18} className="inline mr-1" />
                    ) : (
                      <ArrowDownRight size={18} className="inline mr-1" />
                    )}
                    {formatPercentage(portfolioSummary.ytd_change)}
                  </>
                )}
              </span>
            </div>
          </div>
          
          <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
            <h3 className="text-sm font-medium text-gray-500 mb-1">1Y Change</h3>
            <div className="flex items-center">
              <span className={`text-2xl font-bold ${portfolioSummary.yearly_change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {hideBalances ? "••••••" : (
                  <>
                    {portfolioSummary.yearly_change >= 0 ? (
                      <ArrowUpRight size={18} className="inline mr-1" />
                    ) : (
                      <ArrowDownRight size={18} className="inline mr-1" />
                    )}
                    {formatPercentage(portfolioSummary.yearly_change)}
                  </>
                )}
              </span>
            </div>
          </div>
        </div>
        
        {/* View Toggle */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex border border-gray-300 rounded-lg overflow-hidden">
            <button
              className={`px-4 py-2 ${viewMode === 'accounts' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700'}`}
              onClick={() => setViewMode('accounts')}
            >
              Accounts
            </button>
            <button
              className={`px-4 py-2 ${viewMode === 'positions' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700'}`}
              onClick={() => setViewMode('positions')}
            >
              Positions
            </button>
            <button
              className={`px-4 py-2 ${viewMode === 'summary' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700'}`}
              onClick={() => setViewMode('summary')}
            >
              Summary
            </button>
          </div>
          
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search size={16} className="text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
        
        {/* Portfolio Charts */}
        {viewMode === 'summary' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold text-gray-800">Portfolio Value Over Time</h3>
                <div className="flex space-x-2">
                  {["1M", "YTD", "1Y", "5Y"].map((time) => (
                    <button
                      key={time}
                      className={`px-3 py-1 text-sm rounded ${
                        selectedTimeframe === time 
                          ? 'bg-blue-600 text-white' 
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                      onClick={() => setSelectedTimeframe(time)}
                    >
                      {time}
                    </button>
                  ))}
                </div>
              </div>
              <div className="h-72">
                <Line data={getPortfolioChartData()} options={chartOptions} />
              </div>
            </div>
            
            <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold text-gray-800">Portfolio Allocation</h3>
              </div>
              <div className="h-72">
                <Doughnut data={getAllocationData()} options={doughnutOptions} />
              </div>
            </div>
          </div>
        )}
        
        {/* Accounts View */}
        {viewMode === 'accounts' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer" onClick={() => handleSort('name')}>
                      <div className="flex items-center">
                        Account Name
                        {sortField === 'name' && (
                          sortDirection === 'asc' ? <ChevronUp size={16} className="ml-1" /> : <ChevronDown size={16} className="ml-1" />
                        )}
                      </div>
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer" onClick={() => handleSort('institution')}>
                      <div className="flex items-center">
                        Institution
                        {sortField === 'institution' && (
                          sortDirection === 'asc' ? <ChevronUp size={16} className="ml-1" /> : <ChevronDown size={16} className="ml-1" />
                        )}
                      </div>
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer" onClick={() => handleSort('value')}>
                      <div className="flex items-center justify-end">
                        Balance
                        {sortField === 'value' && (
                          sortDirection === 'asc' ? <ChevronUp size={16} className="ml-1" /> : <ChevronDown size={16} className="ml-1" />
                        )}
                      </div>
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer" onClick={() => handleSort('gainLoss')}>
                      <div className="flex items-center justify-end">
                        Gain/Loss
                        {sortField === 'gainLoss' && (
                          sortDirection === 'asc' ? <ChevronUp size={16} className="ml-1" /> : <ChevronDown size={16} className="ml-1" />
                        )}
                      </div>
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="p-6 text-center text-gray-500">
                        Loading accounts...
                      </td>
                    </tr>
                  ) : getFilteredAccounts().length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-6 text-center text-gray-500">
                        No accounts found. Add your first account to get started.
                      </td>
                    </tr>
                  ) : (
                    getFilteredAccounts().map((account) => {
                      const costBasis = calculateAccountCostBasis(account.id);
                      const gainLoss = (account.balance || 0) - costBasis;
                      const gainLossPercent = costBasis > 0 ? (gainLoss / costBasis) * 100 : 0;
                      
                      return (
                        <React.Fragment key={account.id}>
                          <tr className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <button 
                                  className="mr-2 text-blue-500"
                                  onClick={() => toggleAccountExpansion(account.id)}
                                >
                                  {expandedAccount === account.id ? (
                                    <ChevronDown size={18} />
                                  ) : (
                                    <ChevronRight size={18} />
                                  )}
                                </button>
                                <div className="font-medium text-gray-900">{account.account_name}</div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-gray-900">{account.institution || 'N/A'}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                              {account.type || 'N/A'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-gray-900 font-medium">
                              {hideBalances ? "••••••" : formatCurrency(account.balance || 0)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right">
                              <div className={gainLoss >= 0 ? 'text-green-600' : 'text-red-600'}>
                                <div className="font-medium">
                                  {hideBalances ? "••••••" : formatCurrency(gainLoss)}
                                </div>
                                <div className="text-xs">
                                  {hideBalances ? "••" : `${gainLossPercent >= 0 ? '+' : ''}${gainLossPercent.toFixed(2)}%`}
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right">
                              <button
                                onClick={() => handleAddPositionClick(account.id)}
                                className="text-blue-600 hover:text-blue-800 mr-4"
                                title="Add Position"
                              >
                                <Plus size={18} />
                              </button>
                              <button
                                onClick={() => router.push(`/settings?account=${account.id}`)}
                                className="text-gray-600 hover:text-gray-800"
                                title="Account Settings"
                              >
                                <Settings size={18} />
                              </button>
                            </td>
                          </tr>
                          
                          {/* Expanded positions for this account */}
                          {expandedAccount === account.id && (
                            <tr>
                              <td colSpan={6} className="p-0">
                                <div className="bg-gray-50 p-4">
                                  <h4 className="text-sm font-medium text-gray-700 mb-3">Positions in {account.account_name}</h4>
                                  
                                  {positions[account.id] && positions[account.id].length > 0 ? (
                                    <div className="overflow-x-auto">
                                      <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-100">
                                          <tr>
                                            <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                              Ticker
                                            </th>
                                            <th scope="col" className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                              Shares
                                            </th>
                                            <th scope="col" className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                              Price
                                            </th>
                                            <th scope="col" className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                              Value
                                            </th>
                                            <th scope="col" className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                              Cost Basis
                                            </th>
                                            <th scope="col" className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                              Gain/Loss
                                            </th>
                                          </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                          {getFilteredPositions(account.id).map((position) => {
                                            const positionValue = position.value || (position.price * position.shares);
                                            const positionCostBasis = (position.cost_basis || position.price) * position.shares;
                                            const positionGainLoss = positionValue - positionCostBasis;
                                            const gainLossPercent = positionCostBasis > 0 ? (positionGainLoss / positionCostBasis) * 100 : 0;
                                            
                                            return (
                                              <tr 
                                                key={position.id} 
                                                className="hover:bg-gray-50 cursor-pointer"
                                                onClick={() => handlePositionDetailClick(position)}
                                              >
                                                <td className="px-4 py-2 whitespace-nowrap">
                                                  <div className="font-medium text-blue-600">{position.ticker}</div>
                                                </td>
                                                <td className="px-4 py-2 whitespace-nowrap text-right">
                                                  {position.shares.toLocaleString()}
                                                </td>
                                                <td className="px-4 py-2 whitespace-nowrap text-right">
                                                  {formatCurrency(position.price)}
                                                </td>
                                                <td className="px-4 py-2 whitespace-nowrap text-right">
                                                  {hideBalances ? "••••••" : formatCurrency(positionValue)}
                                                </td>
                                                <td className="px-4 py-2 whitespace-nowrap text-right">
                                                  {hideBalances ? "••••••" : formatCurrency(positionCostBasis)}
                                                </td>
                                                <td className="px-4 py-2 whitespace-nowrap text-right">
                                                  <div className={positionGainLoss >= 0 ? 'text-green-600' : 'text-red-600'}>
                                                    <div>
                                                      {hideBalances ? "••••••" : formatCurrency(positionGainLoss)}
                                                    </div>
                                                    <div className="text-xs">
                                                      {hideBalances ? "••" : `${gainLossPercent >= 0 ? '+' : ''}${gainLossPercent.toFixed(2)}%`}
                                                    </div>
                                                  </div>
                                                </td>
                                              </tr>
                                            );
                                          })}
                                        </tbody>
                                      </table>
                                    </div>
                                  ) : (
                                    <div className="text-gray-500 text-sm">No positions found in this account.</div>
                                  )}
                                  
                                  <div className="mt-3 flex justify-end">
                                    <button 
                                      onClick={() => handleAddPositionClick(account.id)}
                                      className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
                                    >
                                      <Plus size={14} />
                                      Add Position
                                    </button>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
        
        {/* Positions View */}
        {viewMode === 'positions' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer" onClick={() => handleSort('ticker')}>
                      <div className="flex items-center">
                        Ticker
                        {sortField === 'ticker' && (
                          sortDirection === 'asc' ? <ChevronUp size={16} className="ml-1" /> : <ChevronDown size={16} className="ml-1" />
                        )}
                      </div>
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Account
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Shares
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer" onClick={() => handleSort('price')}>
                      <div className="flex items-center justify-end">
                        Price
                        {sortField === 'price' && (
                          sortDirection === 'asc' ? <ChevronUp size={16} className="ml-1" /> : <ChevronDown size={16} className="ml-1" />
                        )}
                      </div>
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer" onClick={() => handleSort('value')}>
                      <div className="flex items-center justify-end">
                        Value
                        {sortField === 'value' && (
                          sortDirection === 'asc' ? <ChevronUp size={16} className="ml-1" /> : <ChevronDown size={16} className="ml-1" />
                        )}
                      </div>
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Cost Basis
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer" onClick={() => handleSort('gainLoss')}>
                      <div className="flex items-center justify-end">
                        Gain/Loss
                        {sortField === 'gainLoss' && (
                          sortDirection === 'asc' ? <ChevronUp size={16} className="ml-1" /> : <ChevronDown size={16} className="ml-1" />
                        )}
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="p-6 text-center text-gray-500">
                        Loading positions...
                      </td>
                    </tr>
                  ) : getAllPositions().length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-6 text-center text-gray-500">
                        No positions found. Add a position to get started.
                      </td>
                    </tr>
                  ) : (
                    getAllPositions().map((position) => {
                      const positionValue = position.value || (position.price * position.shares);
                      const positionCostBasis = (position.cost_basis || position.price) * position.shares;
                      const positionGainLoss = positionValue - positionCostBasis;
                      const gainLossPercent = positionCostBasis > 0 ? (positionGainLoss / positionCostBasis) * 100 : 0;
                      
                      return (
                        <tr 
                          key={position.id} 
                          className="hover:bg-gray-50 cursor-pointer"
                          onClick={() => handlePositionDetailClick(position)}
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="font-medium text-blue-600">{position.ticker}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                            {position.account_name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-gray-900">
                            {position.shares.toLocaleString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-gray-900">
                            {formatCurrency(position.price)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-gray-900 font-medium">
                            {hideBalances ? "••••••" : formatCurrency(positionValue)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-gray-900">
                            {hideBalances ? "••••••"
                            formatCurrency(positionCostBasis)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            <div className={positionGainLoss >= 0 ? 'text-green-600' : 'text-red-600'}>
                              <div>
                                {hideBalances ? "••••••" : formatCurrency(positionGainLoss)}
                              </div>
                              <div className="text-xs">
                                {hideBalances ? "••" : `${gainLossPercent >= 0 ? '+' : ''}${gainLossPercent.toFixed(2)}%`}
                              </div>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
        
        {/* Add Account Modal */}
        {isAddAccountModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-lg max-w-lg w-full p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-900">Add New Account</h2>
                <button 
                  onClick={() => setIsAddAccountModalOpen(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X size={24} />
                </button>
              </div>
              
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-700 mb-2">Account Category</h3>
                <div className="flex space-x-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="accountCategory"
                      value="brokerage"
                      className="mr-2"
                    />
                    <span>Brokerage</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="accountCategory"
                      value="retirement"
                      className="mr-2"
                    />
                    <span>Retirement</span>
                  </label>
                </div>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Account Name</label>
                  <input
                    type="text"
                    placeholder="E.g., Main Brokerage, IRA"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Institution</label>
                  <input
                    type="text"
                    placeholder="E.g., Vanguard, Fidelity"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Account Type</label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">-- Select Account Type --</option>
                    <option value="Individual">Individual</option>
                    <option value="Joint">Joint</option>
                    <option value="IRA">Traditional IRA</option>
                    <option value="Roth IRA">Roth IRA</option>
                    <option value="401k">401(k)</option>
                    <option value="Trust">Trust</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Initial Balance</label>
                  <input
                    type="number"
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              
              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={() => setIsAddAccountModalOpen(false)}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Add Account
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* Add Position (US Securities) Modal */}
        {isUSSecuritiesModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-lg max-w-lg w-full p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-900">Add Security</h2>
                <button 
                  onClick={() => setIsUSSecuritiesModalOpen(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X size={24} />
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Search Ticker</label>
                  <input
                    type="text"
                    value={securitySearch}
                    onChange={(e) => handleSecuritySearch(e.target.value)}
                    placeholder="E.g., AAPL, MSFT, GOOGL"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  />
                  
                  {searchResults.length > 0 && (
                    <div className="absolute left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-10 max-h-60 overflow-y-auto">
                      {searchResults.map((result) => (
                        <div 
                          key={result.ticker} 
                          className="p-3 hover:bg-gray-100 cursor-pointer border-b border-gray-200 last:border-b-0"
                          onClick={() => {
                            setSecuritySearch(result.ticker);
                            setSecurityPrice(result.price || 0);
                            setSearchResults([]);
                          }}
                        >
                          <div className="flex justify-between">
                            <div>
                              <div className="font-medium text-blue-600">{result.ticker}</div>
                              <div className="text-sm text-gray-600">{result.name}</div>
                            </div>
                            <div className="text-gray-900 font-medium">
                              {formatCurrency(result.price || 0)}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                
                {securitySearch && (
                  <>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <div className="flex justify-between items-center mb-2">
                        <p className="font-medium">{securitySearch.toUpperCase()}</p>
                        <div className="text-sm text-gray-600">Current Price: {formatCurrency(securityPrice)}</div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Number of Shares</label>
                        <input
                          type="number"
                          value={securityShares}
                          onChange={(e) => {
                            const shares = parseFloat(e.target.value);
                            setSecurityShares(shares);
                            if (costPerShare) {
                              setTotalCost(shares * costPerShare);
                            }
                          }}
                          step="0.01"
                          min="0.01"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Purchase Date</label>
                        <input
                          type="date"
                          value={purchaseDate}
                          onChange={(e) => setPurchaseDate(e.target.value)}
                          max={new Date().toISOString().split('T')[0]}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Cost Per Share</label>
                        <input
                          type="number"
                          value={costPerShare}
                          onChange={(e) => {
                            const cost = parseFloat(e.target.value);
                            setCostPerShare(cost);
                            setTotalCost(securityShares * cost);
                          }}
                          step="0.01"
                          min="0.01"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Total Cost</label>
                        <input
                          type="number"
                          value={totalCost}
                          onChange={(e) => {
                            const total = parseFloat(e.target.value);
                            setTotalCost(total);
                            if (securityShares > 0) {
                              setCostPerShare(total / securityShares);
                            }
                          }}
                          step="0.01"
                          min="0.01"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    </div>
                    
                    <div className="bg-blue-50 p-3 rounded-lg">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-gray-600">Current Value</p>
                          <p className="font-medium">{formatCurrency(securityPrice * securityShares)}</p>
                        </div>
                        
                        {totalCost > 0 && (
                          <div>
                            <p className="text-sm text-gray-600">Unrealized Gain/Loss</p>
                            <p className={`font-medium ${(securityPrice * securityShares - totalCost) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {formatCurrency(securityPrice * securityShares - totalCost)}
                              {' '}
                              ({((securityPrice * securityShares) / totalCost * 100 - 100).toFixed(2)}%)
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
              
              {formMessage && (
                <div className={`mt-4 p-3 rounded-lg ${
                  formMessage.includes("Error") || formMessage.includes("Failed") 
                    ? "bg-red-100 text-red-700" 
                    : "bg-green-100 text-green-700"
                }`}>
                  {formMessage}
                </div>
              )}
              
              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={() => setIsUSSecuritiesModalOpen(false)}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddSecurity}
                  disabled={!securitySearch || securityShares <= 0 || !purchaseDate || costPerShare <= 0}
                  className={`px-4 py-2 rounded-lg ${
                    !securitySearch || securityShares <= 0 || !purchaseDate || costPerShare <= 0
                      ? 'bg-blue-300 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700'
                  } text-white`}
                >
                  Add Position
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* Filter Modal */}
        {isFilterModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-lg max-w-md w-full p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-900">Filter Options</h2>
                <button 
                  onClick={() => setIsFilterModalOpen(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X size={24} />
                </button>
              </div>
              
              <div className="space-y-5">
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Account Type</h3>
                  <select
                    value={filterOptions.accountType}
                    onChange={(e) => setFilterOptions({...filterOptions, accountType: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="all">All Account Types</option>
                    <option value="brokerage">Brokerage</option>
                    <option value="ira">IRA</option>
                    <option value="401k">401(k)</option>
                    <option value="roth">Roth IRA</option>
                  </select>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Gain/Loss Filter</h3>
                  <select
                    value={filterOptions.gainLoss}
                    onChange={(e) => setFilterOptions({...filterOptions, gainLoss: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="all">Show All</option>
                    <option value="gains">Gains Only</option>
                    <option value="losses">Losses Only</option>
                  </select>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Asset Class</h3>
                  <select
                    value={filterOptions.assetClass}
                    onChange={(e) => setFilterOptions({...filterOptions, assetClass: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="all">All Asset Classes</option>
                    <option value="stocks">Stocks</option>
                    <option value="etfs">ETFs</option>
                    <option value="funds">Mutual Funds</option>
                    <option value="bonds">Bonds</option>
                  </select>
                </div>
              </div>
              
              <div className="mt-6 flex justify-between">
                <button
                  onClick={() => {
                    setFilterOptions({
                      accountType: 'all',
                      assetClass: 'all',
                      gainLoss: 'all',
                    });
                  }}
                  className="px-4 py-2 text-blue-600 hover:text-blue-800"
                >
                  Reset Filters
                </button>
                <button
                  onClick={() => setIsFilterModalOpen(false)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Apply Filters
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* Bulk Upload Modal */}
        {isBulkUploadModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-lg max-w-4xl w-full p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-900">
                  {bulkUploadStep === 1 ? 'Select Account for Bulk Upload' : 'Bulk Upload Positions'}
                </h2>
                <button 
                  onClick={() => {
                    setIsBulkUploadModalOpen(false);
                    setBulkUploadStep(1);
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X size={24} />
                </button>
              </div>
              
              {bulkUploadStep === 1 ? (
                <div>
                  <p className="mb-4 text-gray-600">Select an account to bulk upload positions:</p>
                  
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {accounts.map((account) => (
                      <button
                        key={account.id}
                        onClick={() => {
                          setSelectedBulkAccount(account);
                          setBulkUploadStep(2);
                        }}
                        className="w-full p-4 border border-gray-200 rounded-lg hover:bg-gray-50 flex justify-between items-center"
                      >
                        <div className="text-left">
                          <div className="font-medium text-gray-900">{account.account_name}</div>
                          <div className="text-sm text-gray-500">
                            {account.institution || 'N/A'} • {account.type || 'N/A'}
                          </div>
                        </div>
                        <ChevronRight size={20} className="text-gray-400" />
                      </button>
                    ))}
                  </div>
                  
                  <div className="mt-6 flex justify-end">
                    <button
                      onClick={() => setIsBulkUploadModalOpen(false)}
                      className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <p className="mb-1 text-gray-600">
                    Uploading to: <span className="font-medium">{selectedBulkAccount.account_name}</span>
                  </p>
                  
                  <div className="mb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Download size={18} className="text-blue-600" />
                      <h3 className="font-medium text-gray-900">Paste your data below</h3>
                    </div>
                    <textarea
                      value={bulkData}
                      onChange={(e) => setBulkData(e.target.value)}
                      placeholder="Paste data from spreadsheet (CSV, TSV)..."
                      className="w-full h-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                    />
                  </div>
                  
                  <div className="bg-blue-50 p-4 rounded-lg mb-4">
                    <h4 className="text-sm font-semibold text-blue-700 mb-2">Format Instructions</h4>
                    <p className="text-sm text-blue-600 mb-2">
                      Your data should have the following columns in this order:
                    </p>
                    <div className="grid grid-cols-5 gap-2 mb-3">
                      <div className="text-xs font-semibold text-blue-700 text-center bg-blue-100 py-1 px-2 rounded">Ticker</div>
                      <div className="text-xs font-semibold text-blue-700 text-center bg-blue-100 py-1 px-2 rounded">Shares</div>
                      <div className="text-xs font-semibold text-blue-700 text-center bg-blue-100 py-1 px-2 rounded">Price</div>
                      <div className="text-xs font-semibold text-blue-700 text-center bg-blue-100 py-1 px-2 rounded">Cost Basis</div>
                      <div className="text-xs font-semibold text-blue-700 text-center bg-blue-100 py-1 px-2 rounded">Purchase Date</div>
                    </div>
                    <p className="text-xs text-blue-600">
                      Example: AAPL,10,185.92,150.75,2022-06-15
                    </p>
                  </div>
                  
                  {/* Data Preview */}
                  <div className="mb-4">
                    <h3 className="text-sm font-medium text-gray-700 mb-2">Data Preview</h3>
                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                      <div className="grid grid-cols-5 gap-1 bg-gray-100 p-2 text-xs font-medium text-gray-700">
                        <div>Ticker</div>
                        <div>Shares</div>
                        <div>Price</div>
                        <div>Cost Basis</div>
                        <div>Purchase Date</div>
                      </div>
                      
                      <div className="max-h-40 overflow-y-auto">
                        {getParsedBulkData().length > 0 ? (
                          getParsedBulkData().map((row, index) => (
                            <div 
                              key={index} 
                              className={`grid grid-cols-5 gap-1 p-2 text-xs ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
                            >
                              {row.map((cell, cellIndex) => (
                                <div key={cellIndex}>{cell}</div>
                              ))}
                            </div>
                          ))
                        ) : (
                          <div className="p-4 text-center text-gray-500 text-sm">
                            Paste your data above to see a preview
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {formMessage && (
                    <div className={`mb-4 p-3 rounded-lg ${
                      formMessage.includes("Error") || formMessage.includes("Failed") 
                        ? "bg-red-100 text-red-700" 
                        : "bg-green-100 text-green-700"
                    }`}>
                      {formMessage}
                    </div>
                  )}
                  
                  <div className="flex justify-between">
                    <button
                      onClick={() => setBulkUploadStep(1)}
                      className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                      Back
                    </button>
                    
                    <button
                      onClick={handleBulkUpload}
                      disabled={!bulkData.trim() || isProcessingBulk}
                      className={`px-4 py-2 rounded-lg ${
                        !bulkData.trim() || isProcessingBulk
                          ? 'bg-blue-300 cursor-not-allowed'
                          : 'bg-blue-600 hover:bg-blue-700'
                      } text-white flex items-center gap-2`}
                    >
                      {isProcessingBulk && (
                        <RefreshCw size={16} className="animate-spin" />
                      )}
                      {isProcessingBulk ? 'Processing...' : `Upload ${getParsedBulkData().length} Positions`}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* Position Detail Modal */}
        {isPositionDetailModalOpen && selectedPositionDetail && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-lg max-w-3xl w-full p-6">
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600 font-bold text-xl">
                    {selectedPositionDetail.ticker.charAt(0)}
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">{selectedPositionDetail.ticker}</h2>
                    <p className="text-gray-500">
                      {(() => {
                        // Find account name if it's not in the position data
                        if (selectedPositionDetail.account_name) {
                          return selectedPositionDetail.account_name;
                        } else {
                          const account = accounts.find(a => a.id === selectedPositionDetail.account_id);
                          return account ? account.account_name : 'Unknown Account';
                        }
                      })()}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsPositionDetailModalOpen(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X size={24} />
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-500 mb-1">Shares</p>
                  <p className="text-xl font-semibold">{selectedPositionDetail.shares.toLocaleString()}</p>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-500 mb-1">Current Price</p>
                  <p className="text-xl font-semibold">{formatCurrency(selectedPositionDetail.price)}</p>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-500 mb-1">Market Value</p>
                  <p className="text-xl font-semibold">
                    {formatCurrency(selectedPositionDetail.value || (selectedPositionDetail.price * selectedPositionDetail.shares))}
                  </p>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-500 mb-1">Cost Basis Per Share</p>
                  <p className="text-xl font-semibold">
                    {formatCurrency(selectedPositionDetail.cost_basis || selectedPositionDetail.price)}
                  </p>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-500 mb-1">Total Cost Basis</p>
                  <p className="text-xl font-semibold">
                    {formatCurrency((selectedPositionDetail.cost_basis || selectedPositionDetail.price) * selectedPositionDetail.shares)}
                  </p>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-500 mb-1">Unrealized Gain/Loss</p>
                  {(() => {
                    const positionValue = selectedPositionDetail.value || (selectedPositionDetail.price * selectedPositionDetail.shares);
                    const positionCostBasis = (selectedPositionDetail.cost_basis || selectedPositionDetail.price) * selectedPositionDetail.shares;
                    const positionGainLoss = positionValue - positionCostBasis;
                    const gainLossPercent = positionCostBasis > 0 ? (positionGainLoss / positionCostBasis) * 100 : 0;
                    
                    return (
                      <div className={positionGainLoss >= 0 ? 'text-green-600' : 'text-red-600'}>
                        <p className="text-xl font-semibold">{formatCurrency(positionGainLoss)}</p>
                        <p className="text-sm">{`${gainLossPercent >= 0 ? '+' : ''}${gainLossPercent.toFixed(2)}%`}</p>
                      </div>
                    );
                  })()}
                </div>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg mb-6">
                <h3 className="font-medium text-gray-700 mb-3">Position History</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Purchase Date</p>
                    formatCurrency(positionCostBasis)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            <div className={positionGainLoss >= 0 ? 'text-green-600' : 'text-red-600'}>
                              <div>
                                {hideBalances ? "••••••" : formatCurrency(positionGainLoss)}
                              </div>
                              <div className="text-xs">
                                {hideBalances ? "••" : `${gainLossPercent >= 0 ? '+' : ''}${gainLossPercent.toFixed(2)}%`}
                              </div>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
        
        {/* Add Account Modal */}
        {isAddAccountModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-lg max-w-lg w-full p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-900">Add New Account</h2>
                <button 
                  onClick={() => setIsAddAccountModalOpen(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X size={24} />
                </button>
              </div>
              
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-700 mb-2">Account Category</h3>
                <div className="flex space-x-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="accountCategory"
                      value="brokerage"
                      className="mr-2"
                    />
                    <span>Brokerage</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="accountCategory"
                      value="retirement"
                      className="mr-2"
                    />
                    <span>Retirement</span>
                  </label>
                </div>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Account Name</label>
                  <input
                    type="text"
                    placeholder="E.g., Main Brokerage, IRA"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Institution</label>
                  <input
                    type="text"
                    placeholder="E.g., Vanguard, Fidelity"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Account Type</label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">-- Select Account Type --</option>
                    <option value="Individual">Individual</option>
                    <option value="Joint">Joint</option>
                    <option value="IRA">Traditional IRA</option>
                    <option value="Roth IRA">Roth IRA</option>
                    <option value="401k">401(k)</option>
                    <option value="Trust">Trust</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Initial Balance</label>
                  <input
                    type="number"
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              
              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={() => setIsAddAccountModalOpen(false)}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Add Account
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* Add Position (US Securities) Modal */}
        {isUSSecuritiesModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-lg max-w-lg w-full p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-900">Add Security</h2>
                <button 
                  onClick={() => setIsUSSecuritiesModalOpen(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X size={24} />
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Search Ticker</label>
                  <input
                    type="text"
                    value={securitySearch}
                    onChange={(e) => handleSecuritySearch(e.target.value)}
                    placeholder="E.g., AAPL, MSFT, GOOGL"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  />
                  
                  {searchResults.length > 0 && (
                    <div className="absolute left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-10 max-h-60 overflow-y-auto">
                      {searchResults.map((result) => (
                        <div 
                          key={result.ticker} 
                          className="p-3 hover:bg-gray-100 cursor-pointer border-b border-gray-200 last:border-b-0"
                          onClick={() => {
                            setSecuritySearch(result.ticker);
                            setSecurityPrice(result.price || 0);
                            setSearchResults([]);
                          }}
                        >
                          <div className="flex justify-between">
                            <div>
                              <div className="font-medium text-blue-600">{result.ticker}</div>
                              <div className="text-sm text-gray-600">{result.name}</div>
                            </div>
                            <div className="text-gray-900 font-medium">
                              {formatCurrency(result.price || 0)}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                
                {securitySearch && (
                  <>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <div className="flex justify-between items-center mb-2">
                        <p className="font-medium">{securitySearch.toUpperCase()}</p>
                        <div className="text-sm text-gray-600">Current Price: {formatCurrency(securityPrice)}</div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Number of Shares</label>
                        <input
                          type="number"
                          value={securityShares}
                          onChange={(e) => {
                            const shares = parseFloat(e.target.value);
                            setSecurityShares(shares);
                            if (costPerShare) {
                              setTotalCost(shares * costPerShare);
                            }
                          }}
                          step="0.01"
                          min="0.01"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Purchase Date</label>
                        <input
                          type="date"
                          value={purchaseDate}
                          onChange={(e) => setPurchaseDate(e.target.value)}
                          max={new Date().toISOString().split('T')[0]}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Cost Per Share</label>
                        <input
                          type="number"
                          value={costPerShare}
                          onChange={(e) => {
                            const cost = parseFloat(e.target.value);
                            setCostPerShare(cost);
                            setTotalCost(securityShares * cost);
                          }}
                          step="0.01"
                          min="0.01"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Total Cost</label>
                        <input
                          type="number"
                          value={totalCost}
                          onChange={(e) => {
                            const total = parseFloat(e.target.value);
                            setTotalCost(total);
                            if (securityShares > 0) {
                              setCostPerShare(total / securityShares);
                            }
                          }}
                          step="0.01"
                          min="0.01"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    </div>
                    
                    <div className="bg-blue-50 p-3 rounded-lg">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-gray-600">Current Value</p>
                          <p className="font-medium">{formatCurrency(securityPrice * securityShares)}</p>
                        </div>
                        
                        {totalCost > 0 && (
                          <div>
                            <p className="text-sm text-gray-600">Unrealized Gain/Loss</p>
                            <p className={`font-medium ${(securityPrice * securityShares - totalCost) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {formatCurrency(securityPrice * securityShares - totalCost)}
                              {' '}
                              ({((securityPrice * securityShares) / totalCost * 100 - 100).toFixed(2)}%)
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
              
              {formMessage && (
                <div className={`mt-4 p-3 rounded-lg ${
                  formMessage.includes("Error") || formMessage.includes("Failed") 
                    ? "bg-red-100 text-red-700" 
                    : "bg-green-100 text-green-700"
                }`}>
                  {formMessage}
                </div>
              )}
              
              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={() => setIsUSSecuritiesModalOpen(false)}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddSecurity}
                  disabled={!securitySearch || securityShares <= 0 || !purchaseDate || costPerShare <= 0}
                  className={`px-4 py-2 rounded-lg ${
                    !securitySearch || securityShares <= 0 || !purchaseDate || costPerShare <= 0
                      ? 'bg-blue-300 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700'
                  } text-white`}
                >
                  Add Position
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* Filter Modal */}
        {isFilterModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-lg max-w-md w-full p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-900">Filter Options</h2>
                <button 
                  onClick={() => setIsFilterModalOpen(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X size={24} />
                </button>
              </div>
              
              <div className="space-y-5">
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Account Type</h3>
                  <select
                    value={filterOptions.accountType}
                    onChange={(e) => setFilterOptions({...filterOptions, accountType: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="all">All Account Types</option>
                    <option value="brokerage">Brokerage</option>
                    <option value="ira">IRA</option>
                    <option value="401k">401(k)</option>
                    <option value="roth">Roth IRA</option>
                  </select>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Gain/Loss Filter</h3>
                  <select
                    value={filterOptions.gainLoss}
                    onChange={(e) => setFilterOptions({...filterOptions, gainLoss: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="all">Show All</option>
                    <option value="gains">Gains Only</option>
                    <option value="losses">Losses Only</option>
                  </select>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Asset Class</h3>
                  <select
                    value={filterOptions.assetClass}
                    onChange={(e) => setFilterOptions({...filterOptions, assetClass: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="all">All Asset Classes</option>
                    <option value="stocks">Stocks</option>
                    <option value="etfs">ETFs</option>
                    <option value="funds">Mutual Funds</option>
                    <option value="bonds">Bonds</option>
                  </select>
                </div>
              </div>
              
              <div className="mt-6 flex justify-between">
                <button
                  onClick={() => {
                    setFilterOptions({
                      accountType: 'all',
                      assetClass: 'all',
                      gainLoss: 'all',
                    });
                  }}
                  className="px-4 py-2 text-blue-600 hover:text-blue-800"
                >
                  Reset Filters
                </button>
                <button
                  onClick={() => setIsFilterModalOpen(false)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Apply Filters
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* Bulk Upload Modal */}
        {isBulkUploadModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-lg max-w-4xl w-full p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-900">
                  {bulkUploadStep === 1 ? 'Select Account for Bulk Upload' : 'Bulk Upload Positions'}
                </h2>
                <button 
                  onClick={() => {
                    setIsBulkUploadModalOpen(false);
                    setBulkUploadStep(1);
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X size={24} />
                </button>
              </div>
              
              {bulkUploadStep === 1 ? (
                <div>
                  <p className="mb-4 text-gray-600">Select an account to bulk upload positions:</p>
                  
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {accounts.map((account) => (
                      <button
                        key={account.id}
                        onClick={() => {
                          setSelectedBulkAccount(account);
                          setBulkUploadStep(2);
                        }}
                        className="w-full p-4 border border-gray-200 rounded-lg hover:bg-gray-50 flex justify-between items-center"
                      >
                        <div className="text-left">
                          <div className="font-medium text-gray-900">{account.account_name}</div>
                          <div className="text-sm text-gray-500">
                            {account.institution || 'N/A'} • {account.type || 'N/A'}
                          </div>
                        </div>
                        <ChevronRight size={20} className="text-gray-400" />
                      </button>
                    ))}
                  </div>
                  
                  <div className="mt-6 flex justify-end">
                    <button
                      onClick={() => setIsBulkUploadModalOpen(false)}
                      className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <p className="mb-1 text-gray-600">
                    Uploading to: <span className="font-medium">{selectedBulkAccount.account_name}</span>
                  </p>
                  
                  <div className="mb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Download size={18} className="text-blue-600" />
                      <h3 className="font-medium text-gray-900">Paste your data below</h3>
                    </div>
                    <textarea
                      value={bulkData}
                      onChange={(e) => setBulkData(e.target.value)}
                      placeholder="Paste data from spreadsheet (CSV, TSV)..."
                      className="w-full h-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                    />
                  </div>
                  
                  <div className="bg-blue-50 p-4 rounded-lg mb-4">
                    <h4 className="text-sm font-semibold text-blue-700 mb-2">Format Instructions</h4>
                    <p className="text-sm text-blue-600 mb-2">
                      Your data should have the following columns in this order:
                    </p>
                    <div className="grid grid-cols-5 gap-2 mb-3">
                      <div className="text-xs font-semibold text-blue-700 text-center bg-blue-100 py-1 px-2 rounded">Ticker</div>
                      <div className="text-xs font-semibold text-blue-700 text-center bg-blue-100 py-1 px-2 rounded">Shares</div>
                      <div className="text-xs font-semibold text-blue-700 text-center bg-blue-100 py-1 px-2 rounded">Price</div>
                      <div className="text-xs font-semibold text-blue-700 text-center bg-blue-100 py-1 px-2 rounded">Cost Basis</div>
                      <div className="text-xs font-semibold text-blue-700 text-center bg-blue-100 py-1 px-2 rounded">Purchase Date</div>
                    </div>
                    <p className="text-xs text-blue-600">
                      Example: AAPL,10,185.92,150.75,2022-06-15
                    </p>
                  </div>
                  
                  {/* Data Preview */}
                  <div className="mb-4">
                    <h3 className="text-sm font-medium text-gray-700 mb-2">Data Preview</h3>
                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                      <div className="grid grid-cols-5 gap-1 bg-gray-100 p-2 text-xs font-medium text-gray-700">
                        <div>Ticker</div>
                        <div>Shares</div>
                        <div>Price</div>
                        <div>Cost Basis</div>
                        <div>Purchase Date</div>
                      </div>
                      
                      <div className="max-h-40 overflow-y-auto">
                        {getParsedBulkData().length > 0 ? (
                          getParsedBulkData().map((row, index) => (
                            <div 
                              key={index} 
                              className={`grid grid-cols-5 gap-1 p-2 text-xs ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
                            >
                              {row.map((cell, cellIndex) => (
                                <div key={cellIndex}>{cell}</div>
                              ))}
                            </div>
                          ))
                        ) : (
                          <div className="p-4 text-center text-gray-500 text-sm">
                            Paste your data above to see a preview
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {formMessage && (
                    <div className={`mb-4 p-3 rounded-lg ${
                      formMessage.includes("Error") || formMessage.includes("Failed") 
                        ? "bg-red-100 text-red-700" 
                        : "bg-green-100 text-green-700"
                    }`}>
                      {formMessage}
                    </div>
                  )}
                  
                  <div className="flex justify-between">
                    <button
                      onClick={() => setBulkUploadStep(1)}
                      className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                      Back
                    </button>
                    
                    <button
                      onClick={handleBulkUpload}
                      disabled={!bulkData.trim() || isProcessingBulk}
                      className={`px-4 py-2 rounded-lg ${
                        !bulkData.trim() || isProcessingBulk
                          ? 'bg-blue-300 cursor-not-allowed'
                          : 'bg-blue-600 hover:bg-blue-700'
                      } text-white flex items-center gap-2`}
                    >
                      {isProcessingBulk && (
                        <RefreshCw size={16} className="animate-spin" />
                      )}
                      {isProcessingBulk ? 'Processing...' : `Upload ${getParsedBulkData().length} Positions`}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* Position Detail Modal */}
        {isPositionDetailModalOpen && selectedPositionDetail && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-lg max-w-3xl w-full p-6">
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600 font-bold text-xl">
                    {selectedPositionDetail.ticker.charAt(0)}
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">{selectedPositionDetail.ticker}</h2>
                    <p className="text-gray-500">
                      {(() => {
                        // Find account name if it's not in the position data
                        if (selectedPositionDetail.account_name) {
                          return selectedPositionDetail.account_name;
                        } else {
                          const account = accounts.find(a => a.id === selectedPositionDetail.account_id);
                          return account ? account.account_name : 'Unknown Account';
                        }
                      })()}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsPositionDetailModalOpen(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X size={24} />
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-500 mb-1">Shares</p>
                  <p className="text-xl font-semibold">{selectedPositionDetail.shares.toLocaleString()}</p>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-500 mb-1">Current Price</p>
                  <p className="text-xl font-semibold">{formatCurrency(selectedPositionDetail.price)}</p>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-500 mb-1">Market Value</p>
                  <p className="text-xl font-semibold">
                    {formatCurrency(selectedPositionDetail.value || (selectedPositionDetail.price * selectedPositionDetail.shares))}
                  </p>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-500 mb-1">Cost Basis Per Share</p>
                  <p className="text-xl font-semibold">
                    {formatCurrency(selectedPositionDetail.cost_basis || selectedPositionDetail.price)}
                  </p>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-500 mb-1">Total Cost Basis</p>
                  <p className="text-xl font-semibold">
                    {formatCurrency((selectedPositionDetail.cost_basis || selectedPositionDetail.price) * selectedPositionDetail.shares)}
                  </p>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-500 mb-1">Unrealized Gain/Loss</p>
                  {(() => {
                    const positionValue = selectedPositionDetail.value || (selectedPositionDetail.price * selectedPositionDetail.shares);
                    const positionCostBasis = (selectedPositionDetail.cost_basis || selectedPositionDetail.price) * selectedPositionDetail.shares;
                    const positionGainLoss = positionValue - positionCostBasis;
                    const gainLossPercent = positionCostBasis > 0 ? (positionGainLoss / positionCostBasis) * 100 : 0;
                    
                    return (
                      <div className={positionGainLoss >= 0 ? 'text-green-600' : 'text-red-600'}>
                        <p className="text-xl font-semibold">{formatCurrency(positionGainLoss)}</p>
                        <p className="text-sm">{`${gainLossPercent >= 0 ? '+' : ''}${gainLossPercent.toFixed(2)}%`}</p>
                      </div>
                    );
                  })()}
                </div>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg mb-6">
                <h3 className="font-medium text-gray-700 mb-3">Position History</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Purchase Date</p>
                    <p className="text-base font-medium">
                      {selectedPositionDetail.purchase_date 
                        ? new Date(selectedPositionDetail.purchase_date).toLocaleDateString() 
                        : 'Unknown'}
                    </p>
                  </div>
                  
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Days Held</p>
                    <p className="text-base font-medium">
                      {selectedPositionDetail.purchase_date
                        ? Math.floor((new Date() - new Date(selectedPositionDetail.purchase_date)) / (1000 * 60 * 60 * 24))
                        : 'Unknown'}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    setIsPositionDetailModalOpen(false);
                    setEditPosition(selectedPositionDetail);
                    setIsEditPositionModalOpen(true);
                  }}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Edit Position
                </button>
                <button
                  onClick={() => setIsPositionDetailModalOpen(false)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}