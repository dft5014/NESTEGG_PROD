import { useState, useEffect, useContext } from "react";
import { AuthContext } from "@/context/AuthContext";
import { useRouter } from "next/router";
import { 
  Search, 
  Filter, 
  TrendingUp, 
  TrendingDown, 
  Star, 
  Clock,
  Bookmark,
  ArrowUpRight,
  Briefcase,
  BarChart4,
  SlidersHorizontal,
  X,
  Plus,
  Settings,
  Trash,
  DollarSign,
  Percent,
  LineChart,
  Users,
  PieChart,
  Info,
  Loader
} from 'lucide-react';
import { API_BASE_URL, fetchWithAuth } from '@/utils/api';
import SkeletonLoader from '@/components/SkeletonLoader';

export default function InvestmentSecurities() {
  const { user } = useContext(AuthContext);
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [accounts, setAccounts] = useState([]);
  const [positions, setPositions] = useState({});
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [sortOption, setSortOption] = useState("name");
  const [watchlistModal, setWatchlistModal] = useState(false);
  const [selectedSecurity, setSelectedSecurity] = useState(null);
  const [isAddAccountModalOpen, setIsAddAccountModalOpen] = useState(false);
  const [isEditAccountModalOpen, setIsEditAccountModalOpen] = useState(false);
  const [isAddPositionModalOpen, setIsAddPositionModalOpen] = useState(false);
  const [isEditPositionModalOpen, setIsEditPositionModalOpen] = useState(false);
  const [isDeletePositionModalOpen, setIsDeletePositionModalOpen] = useState(false);
  const [isAccountDetailModalOpen, setIsAccountDetailModalOpen] = useState(false);
  const [isPositionDetailModalOpen, setIsPositionDetailModalOpen] = useState(false);
  const [selectedAccountDetail, setSelectedAccountDetail] = useState(null);
  const [selectedPositionDetail, setSelectedPositionDetail] = useState(null);
  const [deletePositionId, setDeletePositionId] = useState(null);
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [portfolioAllocation, setPortfolioAllocation] = useState([]);
  
  // Search securities state
  const [securitySearch, setSecuritySearch] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [securityPrice, setSecurityPrice] = useState(0);
  const [securityShares, setSecurityShares] = useState(0);
  const [purchaseDate, setPurchaseDate] = useState("");
  const [costPerShare, setCostPerShare] = useState(0);
  const [isSearching, setIsSearching] = useState(false);
  
  // Form states
  const [accountName, setAccountName] = useState("");
  const [institution, setInstitution] = useState("");
  const [accountType, setAccountType] = useState("");
  const [balance, setBalance] = useState(0);
  const [formMessage, setFormMessage] = useState("");
  const [editAccount, setEditAccount] = useState(null);
  const [editPosition, setEditPosition] = useState(null);
  
  useEffect(() => {
    fetchUserData();
  }, []);
  
  const fetchUserData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      // Fetch accounts
      const response = await fetchWithAuth('/accounts');
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to fetch accounts: ${response.status} ${errorText}`);
      }
      
      const data = await response.json();
      
      if (data.accounts && Array.isArray(data.accounts)) {
        setAccounts(data.accounts);
        
        // Fetch positions for each account
        data.accounts.forEach(account => {
          fetchPositions(account.id);
        });
      } else {
        setError("Unexpected data format received from server.");
      }
    } catch (error) {
      console.error("Error fetching accounts:", error);
      setError(error.message || "Failed to load accounts. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };
  
  const fetchPositions = async (accountId) => {
    try {
      const response = await fetchWithAuth(`/positions/${accountId}`);
      
      if (!response.ok) {
        console.error(`Failed to fetch positions for account ${accountId}`);
        return;
      }
      
      const data = await response.json();
      
      if (data && data.positions) {
        setPositions(prevPositions => {
          const updatedPositions = {
            ...prevPositions,
            [accountId]: data.positions || []
          };
          
          // After updating positions, calculate portfolio allocation
          calculatePortfolioAllocation(updatedPositions);
          
          return updatedPositions;
        });
      } else {
        console.warn(`No positions data returned for account ${accountId}`);
        setPositions(prevPositions => ({
          ...prevPositions,
          [accountId]: []
        }));
      }
    } catch (error) {
      console.error(`Error fetching positions for account ${accountId}:`, error);
    }
  };

  // Calculate portfolio allocation by security type
  const calculatePortfolioAllocation = (positionsData) => {
    const allPositions = [];
    
    // Get all positions
    Object.values(positionsData).forEach(accountPositions => {
      allPositions.push(...accountPositions);
    });
    
    if (allPositions.length === 0) {
      setPortfolioAllocation([]);
      return;
    }
    
    // Determine allocation types by ticker patterns
    const totalValue = allPositions.reduce((sum, position) => sum + position.value, 0);
    
    // Simple classification logic (in a real app you'd have more sophisticated classification)
    const typeMap = {
      stocks: 0,
      etfs: 0,
      bonds: 0,
      cash: 0
    };
    
    allPositions.forEach(position => {
      const ticker = position.ticker.toUpperCase();
      
      // Simple classification heuristic - in a real app you would have actual security type data
      if (ticker.includes('ETF') || ticker.includes('VTI') || ticker.includes('SPY') || ticker.includes('QQQ')) {
        typeMap.etfs += position.value;
      } else if (ticker.includes('BOND') || ticker.includes('GOVT') || ticker.includes('BND') || ticker.includes('TLT')) {
        typeMap.bonds += position.value;
      } else if (ticker.includes('CASH') || ticker.includes('MMKT') || ticker.includes('SHV')) {
        typeMap.cash += position.value;
      } else {
        // Default to stocks
        typeMap.stocks += position.value;
      }
    });
    
    // Convert to percentage format for display
    const allocation = [
      { name: "Stocks", value: totalValue > 0 ? (typeMap.stocks / totalValue * 100) : 0, color: "bg-blue-500" },
      { name: "ETFs", value: totalValue > 0 ? (typeMap.etfs / totalValue * 100) : 0, color: "bg-purple-500" },
      { name: "Bonds", value: totalValue > 0 ? (typeMap.bonds / totalValue * 100) : 0, color: "bg-green-500" },
      { name: "Cash", value: totalValue > 0 ? (typeMap.cash / totalValue * 100) : 0, color: "bg-yellow-500" }
    ];
    
    setPortfolioAllocation(allocation);
  };

  // Handle adding a new account
  const handleAddAccount = async (e) => {
    e.preventDefault();
    if (!accountName.trim()) {
      setFormMessage("Account name is required");
      return;
    }

    try {
      setIsSubmitting(true);
      setFormMessage("Adding account...");
      
      const response = await fetchWithAuth('/accounts', {
        method: "POST",
        body: JSON.stringify({
          account_name: accountName,
          institution: institution || "",
          type: accountType || "",
          balance: parseFloat(balance) || 0
        })
      });

      if (response.ok) {
        setFormMessage("Account added successfully!");
        setAccountName("");
        setInstitution("");
        setAccountType("");
        setBalance(0);
        
        setTimeout(() => {
          setIsAddAccountModalOpen(false);
          setFormMessage("");
          fetchUserData();
        }, 1000);
      } else {
        const errorData = await response.json();
        setFormMessage(`Failed to add account: ${JSON.stringify(errorData)}`);
      }
    } catch (error) {
      console.error("Error adding account:", error);
      setFormMessage("Error adding account");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle editing an existing account
  const handleEditAccount = async (e) => {
    e.preventDefault();

    if (!editAccount.account_name.trim()) {
      setFormMessage("Account name is required");
      return;
    }

    try {
      setIsSubmitting(true);
      setFormMessage("Updating account...");
      
      const response = await fetchWithAuth(`/accounts/${editAccount.id}`, {
        method: "PUT",
        body: JSON.stringify({
          account_name: editAccount.account_name,
          institution: editAccount.institution || "",
          type: editAccount.type || ""
        }),
      });

      if (response.ok) {
        setFormMessage("Account updated successfully!");
        setTimeout(() => {
          setIsEditAccountModalOpen(false);
          setFormMessage("");
          fetchUserData();
          setEditAccount(null);
        }, 1000);
      } else {
        const errorText = await response.text();
        setFormMessage(`Failed to update account: ${errorText}`);
      }
    } catch (error) {
      console.error("Error updating account:", error);
      setFormMessage("Error updating account");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle deleting an account
  const handleDeleteAccount = async (accountId) => {
    if (!confirm("Are you sure you want to delete this account and all its positions?")) {
      return;
    }
   
    try {
      setIsLoading(true);
      const response = await fetchWithAuth(`/accounts/${accountId}`, {
        method: "DELETE"
      });
      
      if (response.ok) {
        fetchUserData();
      } else {
        const errorText = await response.text();
        alert(`Failed to delete account: ${errorText}`);
      }
    } catch (error) {
      console.error("Error deleting account:", error);
      alert("Error deleting account");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle clicking the gear icon to edit an account
  const handleEditAccountClick = (account) => {
    setEditAccount({ ...account });
    setIsEditAccountModalOpen(true);
  };

  // Handle adding a position to an account
  const handleAddPositionClick = (accountId) => {
    setSelectedAccount(accountId);
    setIsAddPositionModalOpen(true);
  };

  // Handle account detail click
  const handleAccountDetailClick = (account) => {
    setSelectedAccountDetail(account);
    setIsAccountDetailModalOpen(true);
  };

  // Handle position detail click
  const handlePositionDetailClick = (position) => {
    setSelectedPositionDetail(position);
    setIsPositionDetailModalOpen(true);
  };

  // Handle editing a position
  const handleEditPositionClick = (position) => {
    setEditPosition({ ...position });
    setIsEditPositionModalOpen(true);
  };

  // Handle updating a position
  const handleUpdatePosition = async (e) => {
    e.preventDefault();
    
    if (!editPosition || !editPosition.shares || !editPosition.price) {
      setFormMessage("Shares and price are required");
      return;
    }
    
    try {
      setIsSubmitting(true);
      setFormMessage("Updating position...");
      
      const response = await fetchWithAuth(`/positions/${editPosition.id}`, {
        method: "PUT",
        body: JSON.stringify({
          ticker: editPosition.ticker,
          shares: parseFloat(editPosition.shares),
          price: parseFloat(editPosition.price),
          cost_basis: parseFloat(editPosition.cost_basis || editPosition.price),
          purchase_date: editPosition.purchase_date || new Date().toISOString().split('T')[0]
        }),
      });
      
      if (response.ok) {
        setFormMessage("Position updated successfully!");
        
        setTimeout(() => {
          setIsEditPositionModalOpen(false);
          setFormMessage("");
          fetchUserData();
          setEditPosition(null);
        }, 1000);
      } else {
        const errorText = await response.text();
        setFormMessage(`Failed to update position: ${errorText}`);
      }
    } catch (error) {
      console.error("Error updating position:", error);
      setFormMessage("Error updating position");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle deleting a position
  const handleDeletePositionClick = (positionId) => {
    setDeletePositionId(positionId);
    setIsDeletePositionModalOpen(true);
  };

  // Confirm deletion of a position
  const confirmDeletePosition = async () => {
    if (!deletePositionId) return;
    
    try {
      setIsSubmitting(true);
      
      const response = await fetchWithAuth(`/positions/${deletePositionId}`, {
        method: "DELETE"
      });
      
      if (response.ok) {
        // Find which account this position belongs to
        let accountId = null;
        for (const [accId, positionsList] of Object.entries(positions)) {
          const found = positionsList.find(p => p.id === deletePositionId);
          if (found) {
            accountId = parseInt(accId);
            break;
          }
        }
        
        setIsDeletePositionModalOpen(false);
        setDeletePositionId(null);
        setIsPositionDetailModalOpen(false);
        
        if (accountId) {
          fetchUserData();
        }
      } else {
        const errorText = await response.text();
        alert(`Failed to delete position: ${errorText}`);
      }
    } catch (error) {
      console.error("Error deleting position:", error);
      alert("Error deleting position");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Enhanced searchSecurities function
  const searchSecurities = async (query) => {
    if (!query || query.length < 1) {
      setSearchResults([]);
      return [];
    }
    
    try {
      setIsSearching(true);
      console.log(`Searching securities with query: "${query}"`);
      
      const response = await fetchWithAuth(`/securities/search?query=${encodeURIComponent(query)}`);
          
      // Enhanced error handling
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Securities search error: ${response.status} - ${errorText}`);
        throw new Error(`Failed to search securities: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Check for undefined or missing results
      if (!data || !data.results) {
        console.warn("API response is missing expected 'results' property:", data);
        return [];
      }
      
      // Transform results to ensure consistent format
      const formattedResults = data.results.map(result => ({
        ticker: result.ticker || '',
        name: result.name || result.company_name || "Unknown",
        price: typeof result.price === 'number' ? result.price : 0,
        sector: result.sector || '',
        industry: result.industry || '',
        market_cap: result.market_cap || 0
      }));
      
      // Update state with search results
      setSearchResults(formattedResults);
      return formattedResults;
    } catch (error) {
      console.error("Error searching securities:", error);
      setSearchResults([]);
      return [];
    } finally {
      setIsSearching(false);
    }
  };

  // Handle security search
  const handleSecuritySearch = async (value) => {
    setSecuritySearch(value);
    
    if (value.length >= 2) {
      try {
        const results = await searchSecurities(value);
        
        // If we got a result, use the first one's price
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

  // Handle submitting a new security position
  const handleAddSecurity = async () => {
    if (!securitySearch || securityShares <= 0 || !selectedAccount || !purchaseDate || costPerShare <= 0) {
      setFormMessage("All fields are required and must be valid values");
      return;
    }
  
    try {
      setIsSubmitting(true);
      setFormMessage("Adding position...");
      
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
  
      const data = await response.json();
      setFormMessage("Position added successfully!");
  
      // Refresh data
      fetchUserData();
  
      // Reset modal and form
      setTimeout(() => {
        setIsAddPositionModalOpen(false);
        setSecuritySearch("");
        setSecurityShares(0);
        setSecurityPrice(0);
        setPurchaseDate("");
        setCostPerShare(0);
        setFormMessage("");
      }, 1000);
    } catch (error) {
      console.error("Error adding position:", error);
      setFormMessage(`Error adding position: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter accounts based on search query
  const filteredAccounts = accounts.filter(account => {
    const matchesSearch = 
      account.account_name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      (account.institution && account.institution.toLowerCase().includes(searchQuery.toLowerCase()));
    
    return matchesSearch;
  });

  // Sort accounts based on sort option
  const sortedAccounts = [...filteredAccounts].sort((a, b) => {
    switch (sortOption) {
      case "balance-high":
        return b.balance - a.balance;
      case "balance-low":
        return a.balance - b.balance;
      case "name":
        return a.account_name.localeCompare(b.account_name);
      case "institution":
        return (a.institution || "").localeCompare(b.institution || "");
      default:
        return 0;
    }
  });

  // Get all positions across all accounts
  const getAllPositions = () => {
    const allPositions = [];
    
    Object.keys(positions).forEach(accountId => {
      const accountPositions = positions[accountId] || [];
      const account = accounts.find(a => a.id === parseInt(accountId));
      
      accountPositions.forEach(position => {
        allPositions.push({
          ...position,
          accountName: account ? account.account_name : 'Unknown Account',
          accountId: parseInt(accountId)
        });
      });
    });
    
    return allPositions;
  };

  // Filter positions based on search query
  const filteredPositions = getAllPositions().filter(position => {
    const matchesSearch = 
      position.ticker.toLowerCase().includes(searchQuery.toLowerCase()) || 
      position.accountName.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesSearch;
  });

  // Sort positions based on sort option
  const sortedPositions = [...filteredPositions].sort((a, b) => {
    switch (sortOption) {
      case "value-high":
        return b.value - a.value;
      case "value-low":
        return a.value - b.value;
      case "ticker":
        return a.ticker.localeCompare(b.ticker);
      case "account":
        return a.accountName.localeCompare(b.accountName);
      default:
        return 0;
    }
  });

  // Render trend indicator based on change value
  const renderTrend = (value, costBasis) => {
    if (!costBasis) return <span className="text-gray-500">N/A</span>;
    
    const change = ((value - costBasis) / costBasis) * 100;
    
    if (change > 0) {
      return (
        <div className="flex items-center text-green-500">
          <TrendingUp className="h-4 w-4 mr-1" />
          <span>+{change.toFixed(2)}%</span>
        </div>
      );
    } else if (change < 0) {
      return (
        <div className="flex items-center text-red-500">
          <TrendingDown className="h-4 w-4 mr-1" />
          <span>{change.toFixed(2)}%</span>
        </div>
      );
    } else {
      return <span className="text-gray-500">0.00%</span>;
    }
  };

  // Calculate cost basis for a position
  const getPositionCostBasis = (position) => {
    return position.cost_basis || position.price;
  };

  // Helper function to calculate account cost basis
  const calculateAccountCostBasis = (accountId) => {
    if (!positions[accountId]) return 0;
    
    return positions[accountId].reduce((total, position) => {
      const positionCostBasis = position.cost_basis || position.price; // Fallback to price if cost_basis not available
      return total + (positionCostBasis * position.shares);
    }, 0);
  };

  // Calculate total portfolio metrics
  const calculatePortfolioMetrics = () => {
    let totalValue = 0;
    let totalCostBasis = 0;
    let totalPositions = 0;
    
    accounts.forEach(account => {
      totalValue += account.balance;
      
      const accountPositions = positions[account.id] || [];
      totalPositions += accountPositions.length;
      
      totalCostBasis += calculateAccountCostBasis(account.id);
    });
    
    const totalGainLoss = totalValue - totalCostBasis;
    const totalGainLossPercent = totalCostBasis > 0 ? (totalGainLoss / totalCostBasis) * 100 : 0;
    
    return {
      totalValue,
      totalCostBasis,
      totalGainLoss,
      totalGainLossPercent,
      totalPositions,
      totalAccounts: accounts.length
    };
  };

  const portfolioMetrics = calculatePortfolioMetrics();

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="bg-gray-800 p-8 rounded-xl shadow-lg text-center">
          <Briefcase className="w-16 h-16 mx-auto text-blue-500 mb-4" />
          <h1 className="text-2xl font-bold text-white mb-4">Investment Securities</h1>
          <p className="text-gray-300 mb-6">Please log in to view your investment accounts and positions.</p>
          <button 
            onClick={() => router.push('/login')}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-blue-900 text-white">
      {/* Main Content Container */}
      <div className="container mx-auto px-4 py-10">
        {/* Header */}
        <header className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-bold flex items-center">
              <Briefcase className="w-8 h-8 text-blue-400 mr-3" />
              Investment Securities
            </h1>
            <div className="flex space-x-3">
              <button 
                onClick={() => setIsAddPositionModalOpen(true)}
                className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg flex items-center transition-colors"
                disabled={isLoading}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Position
              </button>
              <button 
                onClick={() => setIsAddAccountModalOpen(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center transition-colors"
                disabled={isLoading}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Account
              </button>
              <button 
                onClick={() => setWatchlistModal(true)}
                className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg flex items-center transition-colors"
                disabled={isLoading}
              >
                <Star className="w-4 h-4 mr-2" />
                Manage Watchlists
              </button>
            </div>
          </div>
          <p className="text-gray-300 max-w-3xl mb-4">
            Manage your investment accounts and positions. Track performance and analyze your portfolio to make informed investment decisions.
          </p>
          
          {/* Loading/Error Banner */}
          {isLoading && (
            <div className="bg-blue-900/60 p-3 rounded-lg mb-4 flex items-center text-blue-200">
              <Loader className="w-5 h-5 mr-2 animate-spin" />
              Loading portfolio data...
            </div>
          )}
          
          {error && (
            <div className="bg-red-900/60 p-3 rounded-lg mb-4 text-red-200">
              <div className="font-medium mb-1">Error</div>
              <div className="text-sm">{error}</div>
              <button 
                onClick={() => {
                  setError(null);
                  fetchUserData();
                }}
                className="mt-2 text-xs bg-red-800/80 hover:bg-red-700/80 py-1 px-2 rounded"
              >
                Retry
              </button>
            </div>
          )}
        </header>

        {/* Portfolio KPI Section */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          <div className="bg-gradient-to-br from-blue-900 to-blue-700 p-4 rounded-xl shadow-lg flex flex-col">
            <div className="text-blue-300 text-sm mb-1 flex items-center">
              <DollarSign className="h-4 w-4 mr-1" />
              Total Value
            </div>
            <div className="text-xl font-bold">${portfolioMetrics.totalValue.toLocaleString()}</div>
          </div>
          
          <div className="bg-gradient-to-br from-purple-900 to-purple-700 p-4 rounded-xl shadow-lg flex flex-col">
            <div className="text-purple-300 text-sm mb-1 flex items-center">
              <DollarSign className="h-4 w-4 mr-1" />
              Total Cost Basis
            </div>
            <div className="text-xl font-bold">${portfolioMetrics.totalCostBasis.toLocaleString()}</div>
          </div>
          
          <div className={`bg-gradient-to-br ${portfolioMetrics.totalGainLoss >= 0 ? 'from-green-900 to-green-700' : 'from-red-900 to-red-700'} p-4 rounded-xl shadow-lg flex flex-col`}>
            <div className={`${portfolioMetrics.totalGainLoss >= 0 ? 'text-green-300' : 'text-red-300'} text-sm mb-1 flex items-center`}>
              <DollarSign className="h-4 w-4 mr-1" />
              Total Gain/Loss
            </div>
            <div className="text-xl font-bold">
              {portfolioMetrics.totalGainLoss >= 0 ? '+' : ''}
              ${Math.abs(portfolioMetrics.totalGainLoss).toLocaleString()}
            </div>
          </div>
          
          <div className={`bg-gradient-to-br ${portfolioMetrics.totalGainLossPercent >= 0 ? 'from-green-900 to-green-700' : 'from-red-900 to-red-700'} p-4 rounded-xl shadow-lg flex flex-col`}>
            <div className={`${portfolioMetrics.totalGainLossPercent >= 0 ? 'text-green-300' : 'text-red-300'} text-sm mb-1 flex items-center`}>
              <Percent className="h-4 w-4 mr-1" />
              Gain/Loss %
            </div>
            <div className="text-xl font-bold">
              {portfolioMetrics.totalGainLossPercent >= 0 ? '+' : ''}
              {portfolioMetrics.totalGainLossPercent.toFixed(2)}%
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-amber-900 to-amber-700 p-4 rounded-xl shadow-lg flex flex-col">
            <div className="text-amber-300 text-sm mb-1 flex items-center">
              <BarChart4 className="h-4 w-4 mr-1" />
              Total Positions
            </div>
            <div className="text-xl font-bold">{portfolioMetrics.totalPositions}</div>
          </div>
            <div className="bg-gradient-to-br from-indigo-900 to-indigo-700 p-4 rounded-xl shadow-lg flex flex-col">
            <div className="text-indigo-300 text-sm mb-1 flex items-center">
              <Users className="h-4 w-4 mr-1" />
              Total Accounts
            </div>
            <div className="text-xl font-bold">{portfolioMetrics.totalAccounts}</div>
          </div>
        </div>

        {/* Search and Filter Controls */}
        <div className="bg-gray-800/80 p-6 rounded-xl mb-8 backdrop-blur-sm">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            {/* Search */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                className="bg-gray-700 text-white w-full pl-10 pr-4 py-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                placeholder="Search accounts or positions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Filter Type */}
            <div className="flex items-center space-x-2 bg-gray-700 rounded-lg p-1">
              <button
                className={`flex-1 py-2 px-3 rounded-md transition-colors ${
                  filterType === "all" ? "bg-blue-600 text-white" : "text-gray-300 hover:bg-gray-600"
                }`}
                onClick={() => setFilterType("all")}
              >
                All
              </button>
              <button
                className={`flex-1 py-2 px-3 rounded-md transition-colors ${
                  filterType === "accounts" ? "bg-blue-600 text-white" : "text-gray-300 hover:bg-gray-600"
                }`}
                onClick={() => setFilterType("accounts")}
              >
                Accounts
              </button>
              <button
                className={`flex-1 py-2 px-3 rounded-md transition-colors ${
                  filterType === "positions" ? "bg-blue-600 text-white" : "text-gray-300 hover:bg-gray-600"
                }`}
                onClick={() => setFilterType("positions")}
              >
                Positions
              </button>
            </div>

            {/* Sort Options */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <SlidersHorizontal className="h-5 w-5 text-gray-400" />
              </div>
              <select
                className="bg-gray-700 text-white w-full pl-10 pr-4 py-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none appearance-none"
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value)}
              >
                <option value="name">Sort by Name (A-Z)</option>
                <option value="balance-high">Balance (High to Low)</option>
                <option value="balance-low">Balance (Low to High)</option>
                <option value="institution">Institution (A-Z)</option>
                <option value="value-high">Value (High to Low)</option>
                <option value="value-low">Value (Low to High)</option>
                <option value="ticker">Ticker (A-Z)</option>
                <option value="account">Account (A-Z)</option>
              </select>
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
          </div>

          {/* Active Filters Display */}
          <div className="flex items-center space-x-2 text-sm text-gray-400">
            <Filter className="h-4 w-4" />
            <span>Active filters:</span>
            <div className="flex flex-wrap gap-2">
              {filterType !== "all" && (
                <span className="bg-blue-900/50 text-blue-300 px-2 py-1 rounded-md">
                  {filterType === "accounts" ? "Accounts" : "Positions"}
                </span>
              )}
              {searchQuery && (
                <span className="bg-blue-900/50 text-blue-300 px-2 py-1 rounded-md">
                  Search: "{searchQuery}"
                </span>
              )}
              {(filterType !== "all" || searchQuery) && (
                <button
                  onClick={() => {
                    setFilterType("all");
                    setSearchQuery("");
                  }}
                  className="text-gray-400 hover:text-white"
                >
                  Clear all
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Accounts Table */}
        {(filterType === "all" || filterType === "accounts") && (
          <div className="bg-gray-800/70 backdrop-blur-sm rounded-xl mb-8 overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b border-gray-700">
              <h2 className="text-xl font-semibold flex items-center">
                <Briefcase className="w-5 h-5 mr-2 text-blue-400" />
                Your Accounts
              </h2>
              <button 
                onClick={() => setIsAddAccountModalOpen(true)}
                className="px-3 py-1 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors flex items-center"
                disabled={isLoading}
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Account
              </button>
            </div>
            
            {isLoading ? (
              <div className="p-8 text-center">
                <div className="inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-gray-400">Loading accounts data...</p>
              </div>
            ) : sortedAccounts.length === 0 ? (
              <div className="p-8 text-center">
                <div className="bg-gray-700/50 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                  <Briefcase className="h-8 w-8 text-gray-500" />
                </div>
                <h3 className="text-xl font-medium mb-2">No accounts found</h3>
                <p className="text-gray-400 max-w-md mx-auto">
                  Add your first investment account to start tracking your portfolio.
                </p>
                <button 
                  onClick={() => setIsAddAccountModalOpen(true)}
                  className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Add Account
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-700">
                  <thead className="bg-gray-900/50">
                    <tr>
                      <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Account Name
                      </th>
                      <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Institution
                      </th>
                      <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Type
                      </th>
                      <th scope="col" className="px-6 py-4 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Positions
                      </th>
                      <th scope="col" className="px-6 py-4 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Cost Basis
                      </th>
                      <th scope="col" className="px-6 py-4 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Balance
                      </th>
                      <th scope="col" className="px-6 py-4 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Gain/Loss
                      </th>
                      <th scope="col" className="px-6 py-4 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700">
                    {sortedAccounts.map((account) => {
                      const costBasis = calculateAccountCostBasis(account.id);
                      const gainLoss = account.balance - costBasis;
                      const gainLossPercent = costBasis > 0 ? (gainLoss / costBasis) * 100 : 0;
                      const positionsCount = positions[account.id]?.length || 0;
                      
                      return (
                        <tr 
                          key={account.id}
                          className="hover:bg-gray-700/50 transition-colors cursor-pointer"
                          onClick={() => handleAccountDetailClick(account)}
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="flex-shrink-0 h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                                <span className="font-bold">{account.account_name.charAt(0)}</span>
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-medium">
                                  {account.account_name}
                                </div>
                                <div className="text-sm text-gray-400">
                                  Last updated: {new Date(account.updated_at).toLocaleDateString()}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm">{account.institution || "N/A"}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm">{account.type || "N/A"}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            <div className="text-sm font-medium">{positionsCount}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            <div className="text-sm font-medium">${costBasis.toLocaleString()}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            <div className="text-sm font-medium">${account.balance.toLocaleString()}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            <div className="flex flex-col items-end">
                              <div className={`text-sm font-medium ${gainLoss >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                {gainLoss >= 0 ? '+' : ''}{gainLoss.toLocaleString('en-US', {
                                  style: 'currency',
                                  currency: 'USD',
                                })}
                              </div>
                              <div className={`text-xs ${gainLoss >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                {gainLoss >= 0 ? '+' : ''}{gainLossPercent.toFixed(2)}%
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-center space-x-3">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleAddPositionClick(account.id);
                                }}
                                className="p-2 bg-blue-600/20 text-blue-400 rounded-full hover:bg-blue-600/30 transition-colors"
                                title="Add Position"
                                disabled={isLoading}
                              >
                                <Plus className="h-5 w-5" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEditAccountClick(account);
                                }}
                                className="p-2 bg-purple-600/20 text-purple-400 rounded-full hover:bg-purple-600/30 transition-colors"
                                title="Edit Account"
                                disabled={isLoading}
                              >
                                <Settings className="h-5 w-5" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteAccount(account.id);
                                }}
                                className="p-2 bg-red-600/20 text-red-400 rounded-full hover:bg-red-600/30 transition-colors"
                                title="Delete Account"
                                disabled={isLoading}
                              >
                                <Trash className="h-5 w-5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Positions Table */}
        {(filterType === "all" || filterType === "positions") && (
          <div className="bg-gray-800/70 backdrop-blur-sm rounded-xl mb-8 overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b border-gray-700">
              <h2 className="text-xl font-semibold flex items-center">
                <BarChart4 className="w-5 h-5 mr-2 text-purple-400" />
                Your Positions
              </h2>
              <button 
                onClick={() => setIsAddPositionModalOpen(true)}
                className="px-3 py-1 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700 transition-colors flex items-center"
                disabled={isLoading}
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Position
              </button>
            </div>
            
            {isLoading ? (
              <div className="p-8 text-center">
                <div className="inline-block w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-gray-400">Loading positions data...</p>
              </div>
            ) : sortedPositions.length === 0 ? (
              <div className="p-8 text-center">
                <div className="bg-gray-700/50 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                  <BarChart4 className="h-8 w-8 text-gray-500" />
                </div>
                <h3 className="text-xl font-medium mb-2">No positions found</h3>
                <p className="text-gray-400 max-w-md mx-auto">
                  Add positions to your accounts to start tracking your investments.
                </p>
                {accounts.length > 0 && (
                  <button 
                    onClick={() => handleAddPositionClick(accounts[0].id)}
                    className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                  >
                    Add Position
                  </button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-700">
                  <thead className="bg-gray-900/50">
                    <tr>
                      <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Ticker
                      </th>
                      <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Account
                      </th>
                      <th scope="col" className="px-6 py-4 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Shares
                      </th>
                      <th scope="col" className="px-6 py-4 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Price
                      </th>
                      <th scope="col" className="px-6 py-4 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Cost Basis
                      </th>
                      <th scope="col" className="px-6 py-4 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Value
                      </th>
                      <th scope="col" className="px-6 py-4 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Gain/Loss
                      </th>
                      <th scope="col" className="px-6 py-4 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700">
                    {sortedPositions.map((position) => {
                      const costBasis = getPositionCostBasis(position);
                      const totalCostBasis = position.shares * costBasis;
                      const gainLoss = position.value - totalCostBasis;
                      const gainLossPercent = totalCostBasis > 0 ? (gainLoss / totalCostBasis) * 100 : 0;
                      
                      return (
                        <tr 
                          key={position.id}
                          className="hover:bg-gray-700/50 transition-colors cursor-pointer"
                          onClick={() => handlePositionDetailClick(position)}
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="flex-shrink-0 h-10 w-10 rounded-full bg-gradient-to-br from-green-500 to-blue-600 flex items-center justify-center">
                                <span className="font-bold">{position.ticker.charAt(0)}</span>
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-medium">
                                  {position.ticker}
                                </div>
                                <div className="text-sm text-gray-400">
                                  {position.purchase_date ? new Date(position.purchase_date).toLocaleDateString() : 'N/A'}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm">{position.accountName}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            <div className="text-sm">{position.shares.toLocaleString()}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            <div className="text-sm">${position.price.toLocaleString()}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            <div className="text-sm">${costBasis.toLocaleString()}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            <div className="text-sm font-medium">${position.value.toLocaleString()}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            <div className="flex flex-col items-end">
                              <div className={`text-sm font-medium ${gainLoss >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                {gainLoss >= 0 ? '+' : ''}{gainLoss.toLocaleString('en-US', {
                                  style: 'currency',
                                  currency: 'USD',
                                })}
                              </div>
                              <div className={`text-xs ${gainLoss >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                {gainLoss >= 0 ? '+' : ''}{gainLossPercent.toFixed(2)}%
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-center space-x-3">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEditPositionClick(position);
                                }}
                                className="p-2 bg-purple-600/20 text-purple-400 rounded-full hover:bg-purple-600/30 transition-colors"
                                title="Edit Position"
                                disabled={isLoading}
                              >
                                <Settings className="h-5 w-5" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeletePositionClick(position.id);
                                }}
                                className="p-2 bg-red-600/20 text-red-400 rounded-full hover:bg-red-600/30 transition-colors"
                                title="Delete Position"
                                disabled={isLoading}
                              >
                                <Trash className="h-5 w-5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Portfolio Summary Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="bg-gray-800/70 backdrop-blur-sm p-6 rounded-xl lg:col-span-2">
            <h2 className="text-xl font-semibold mb-4">Portfolio Allocation</h2>
            {portfolioAllocation.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <PieChart className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No allocation data available</p>
                <p className="text-sm mt-1">Add positions to your accounts to see portfolio allocation</p>
              </div>
            ) : (
              <div className="space-y-4">
                {portfolioAllocation.map((asset) => (
                  <div key={asset.name}>
                    <div className="flex justify-between text-sm mb-1">
                      <span>{asset.name}</span>
                      <span>{asset.value.toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2.5">
                      <div
                        className={`${asset.color} h-2.5 rounded-full`}
                        style={{ width: `${asset.value}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-gray-800/70 backdrop-blur-sm p-6 rounded-xl">
            <h2 className="text-xl font-semibold mb-4">Top Holdings</h2>
            {sortedPositions.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <BarChart4 className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No positions found</p>
                <p className="text-sm mt-1">Add positions to view your top holdings</p>
              </div>
            ) : (
              <div className="space-y-3">
                {sortedPositions.slice(0, 5).map((position) => (
                  <div 
                    key={`top-${position.id}`}
                    className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg hover:bg-gray-700 transition-colors cursor-pointer"
                    onClick={() => handlePositionDetailClick(position)}
                  >
                    <div className="flex items-center">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-500 to-blue-500 flex items-center justify-center mr-3">
                        <span className="text-xs font-bold">{position.ticker.charAt(0)}</span>
                      </div>
                      <div>
                        <div className="font-medium">{position.ticker}</div>
                        <div className="text-xs text-gray-400">{position.accountName}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">${position.value.toLocaleString()}</div>
                      <div className="text-xs text-gray-400">{position.shares} shares</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add Account Modal */}
      {isAddAccountModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-black/80 backdrop-blur-sm"></div>
            </div>

            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            
            <div className="inline-block align-bottom bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="flex justify-between items-start p-6 border-b border-gray-700">
                <div className="flex items-center">
                  <Briefcase className="w-6 h-6 text-blue-500 mr-3" />
                  <h3 className="text-xl font-semibold">Add New Account</h3>
                </div>
                <button
                  onClick={() => setIsAddAccountModalOpen(false)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <form onSubmit={handleAddAccount} className="p-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">Account Name</label>
                    <input
                      type="text"
                      value={accountName}
                      onChange={(e) => setAccountName(e.target.value)}
                      className="w-full p-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      placeholder="e.g. Retirement Account, Brokerage Account"
                      required
                      disabled={isSubmitting}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">Institution</label>
                    <input
                      type="text"
                      value={institution}
                      onChange={(e) => setInstitution(e.target.value)}
                      className="w-full p-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      placeholder="e.g. Vanguard, Fidelity, Schwab"
                      disabled={isSubmitting}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">Account Type</label>
                    <select
                      value={accountType}
                      onChange={(e) => setAccountType(e.target.value)}
                      className="w-full p-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      disabled={isSubmitting}
                    >
                      <option value="">-- Select Account Type --</option>
                      <option value="401(k)">401(k)</option>
                      <option value="IRA">IRA</option>
                      <option value="Roth IRA">Roth IRA</option>
                      <option value="">-- Select Account Type --</option>
                      <option value="401(k)">401(k)</option>
                      <option value="IRA">IRA</option>
                      <option value="Roth IRA">Roth IRA</option>
                      <option value="Brokerage">Brokerage</option>
                      <option value="HSA">HSA</option>
                      <option value="529">529</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">Initial Balance</label>
                    <input
                      type="number"
                      value={balance}
                      onChange={(e) => setBalance(e.target.value)}
                      className="w-full p-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      placeholder="0.00"
                      min="0"
                      step="0.01"
                      disabled={isSubmitting}
                    />
                  </div>
                </div>
                
                {formMessage && (
                  <div className={`mt-4 p-3 rounded-lg ${formMessage.includes("Error") || formMessage.includes("Failed") ? "bg-red-900/50 text-red-300" : "bg-green-900/50 text-green-300"}`}>
                    {isSubmitting && (
                      <div className="flex items-center mb-1">
                        <div className="w-4 h-4 mr-2 rounded-full border-2 border-t-transparent border-white animate-spin"></div>
                        <span>Processing...</span>
                      </div>
                    )}
                    {formMessage}
                  </div>
                )}
                
                <div className="mt-6 flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setIsAddAccountModalOpen(false)}
                    className="px-4 py-2 border border-gray-600 rounded-lg hover:bg-gray-700 transition-colors"
                    disabled={isSubmitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center"
                    disabled={isSubmitting}
                  >
                    {isSubmitting && <Loader className="animate-spin mr-2 h-4 w-4" />}
                    Add Account
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit Account Modal */}
      {isEditAccountModalOpen && editAccount && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-black/80 backdrop-blur-sm"></div>
            </div>

            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            
            <div className="inline-block align-bottom bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="flex justify-between items-start p-6 border-b border-gray-700">
                <div className="flex items-center">
                  <Settings className="w-6 h-6 text-purple-500 mr-3" />
                  <h3 className="text-xl font-semibold">Edit Account</h3>
                </div>
                <button
                  onClick={() => {
                    setIsEditAccountModalOpen(false);
                    setEditAccount(null);
                  }}
                  className="text-gray-400 hover:text-white transition-colors"
                  disabled={isSubmitting}
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <form onSubmit={handleEditAccount} className="p-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">Account Name</label>
                    <input
                      type="text"
                      value={editAccount.account_name}
                      onChange={(e) => setEditAccount({ ...editAccount, account_name: e.target.value })}
                      className="w-full p-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      placeholder="e.g. Retirement Account, Brokerage Account"
                      required
                      disabled={isSubmitting}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">Institution</label>
                    <input
                      type="text"
                      value={editAccount.institution || ""}
                      onChange={(e) => setEditAccount({ ...editAccount, institution: e.target.value })}
                      className="w-full p-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      placeholder="e.g. Vanguard, Fidelity, Schwab"
                      disabled={isSubmitting}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">Account Type</label>
                    <select
                      value={editAccount.type || ""}
                      onChange={(e) => setEditAccount({ ...editAccount, type: e.target.value })}
                      className="w-full p-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      disabled={isSubmitting}
                    >
                      <option value="">-- Select Account Type --</option>
                      <option value="401(k)">401(k)</option>
                      <option value="IRA">IRA</option>
                      <option value="Roth IRA">Roth IRA</option>
                      <option value="Brokerage">Brokerage</option>
                      <option value="HSA">HSA</option>
                      <option value="529">529</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>
                
                {formMessage && (
                  <div className={`mt-4 p-3 rounded-lg ${formMessage.includes("Error") || formMessage.includes("Failed") ? "bg-red-900/50 text-red-300" : "bg-green-900/50 text-green-300"}`}>
                    {isSubmitting && (
                      <div className="flex items-center mb-1">
                        <div className="w-4 h-4 mr-2 rounded-full border-2 border-t-transparent border-white animate-spin"></div>
                        <span>Processing...</span>
                      </div>
                    )}
                    {formMessage}
                  </div>
                )}
                
                <div className="mt-6 flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditAccountModalOpen(false);
                      setEditAccount(null);
                    }}
                    className="px-4 py-2 border border-gray-600 rounded-lg hover:bg-gray-700 transition-colors"
                    disabled={isSubmitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center"
                    disabled={isSubmitting}
                  >
                    {isSubmitting && <Loader className="animate-spin mr-2 h-4 w-4" />}
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Add Position Modal */}
      {isAddPositionModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-black/80 backdrop-blur-sm"></div>
            </div>

            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            
            <div className="inline-block align-bottom bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="flex justify-between items-start p-6 border-b border-gray-700">
                <div className="flex items-center">
                  <BarChart4 className="w-6 h-6 text-purple-500 mr-3" />
                  <h3 className="text-xl font-semibold">Add New Position</h3>
                </div>
                <button
                  onClick={() => setIsAddPositionModalOpen(false)}
                  className="text-gray-400 hover:text-white transition-colors"
                  disabled={isSubmitting}
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="p-6">
                <div className="mb-4">
                  <p className="text-gray-300">
                    Adding position to account: <span className="font-medium text-white">
                      {accounts.find(a => a.id === selectedAccount)?.account_name || "Select an account"}
                    </span>
                  </p>
                  {!selectedAccount && (
                    <div className="mt-2">
                      <label className="block text-sm font-medium text-gray-400 mb-1">Select Account</label>
                      <select
                        value={selectedAccount || ""}
                        onChange={(e) => setSelectedAccount(e.target.value ? parseInt(e.target.value) : null)}
                        className="w-full p-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        disabled={isSubmitting}
                      >
                        <option value="">-- Select Account --</option>
                        {accounts.map((account) => (
                          <option key={account.id} value={account.id}>
                            {account.account_name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
                
                <div className="space-y-4">
                  <div className="search-container relative">
                    <label className="block text-sm font-medium text-gray-400 mb-1">Security Search</label>
                    <div className="relative">
                      <input
                        type="text"
                        value={securitySearch}
                        onChange={(e) => handleSecuritySearch(e.target.value)}
                        className="w-full p-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        placeholder="Search ticker (e.g., AAPL, MSFT, GOOGL)"
                        disabled={isSubmitting || isSearching}
                      />
                      {isSearching && (
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                          <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                        </div>
                      )}
                    </div>
                    {searchResults.length > 0 && (
                      <div className="absolute z-10 left-0 right-0 mt-1 bg-gray-700 border border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                        {searchResults.map((result) => (
                          <div 
                            key={result.ticker} 
                            className="p-3 hover:bg-gray-600 cursor-pointer flex justify-between items-center border-b border-gray-600"
                            onClick={() => {
                              setSecuritySearch(result.ticker);
                              setSecurityPrice(result.price || 0);
                              setSearchResults([]);
                            }}
                          >
                            <div>
                              <div className="font-medium text-white">{result.ticker}</div>
                              <div className="text-sm text-gray-300">{result.name}</div>
                            </div>
                            <div className="text-right">
                              <div className="font-medium">${result.price.toFixed(2)}</div>
                              {result.sector && <div className="text-xs text-gray-400">{result.sector}</div>}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">Shares</label>
                      <input
                        type="number"
                        value={securityShares}
                        onChange={(e) => setSecurityShares(parseFloat(e.target.value))}
                        className="w-full p-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        placeholder="0.00"
                        min="0.0001"
                        step="0.0001"
                        disabled={isSubmitting}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">Current Price</label>
                      <input
                        type="number"
                        value={securityPrice}
                        onChange={(e) => setSecurityPrice(parseFloat(e.target.value))}
                        className="w-full p-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        placeholder="0.00"
                        min="0.01"
                        step="0.01"
                        readOnly
                        disabled={isSubmitting}
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">Purchase Date</label>
                      <input
                        type="date"
                        value={purchaseDate}
                        onChange={(e) => setPurchaseDate(e.target.value)}
                        className="w-full p-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        disabled={isSubmitting}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">Cost Per Share</label>
                      <input
                        type="number"
                        value={costPerShare}
                        onChange={(e) => setCostPerShare(parseFloat(e.target.value))}
                        className="w-full p-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        placeholder="0.00"
                        min="0.01"
                        step="0.01"
                        disabled={isSubmitting}
                      />
                    </div>
                  </div>

                  {securitySearch && securityShares > 0 && costPerShare > 0 && (
                    <div className="bg-gray-700/50 p-4 rounded-lg">
                      <div className="flex justify-between mb-2">
                        <span className="text-gray-400">Total Cost:</span>
                        <span className="font-medium">${(securityShares * costPerShare).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Current Value:</span>
                        <span className="font-medium">${(securityShares * securityPrice).toLocaleString()}</span>
                      </div>
                    </div>
                  )}
                </div>
                
                {formMessage && (
                  <div className={`mt-4 p-3 rounded-lg ${formMessage.includes("Error") || formMessage.includes("Failed") ? "bg-red-900/50 text-red-300" : "bg-green-900/50 text-green-300"}`}>
                    {isSubmitting && (
                      <div className="flex items-center mb-1">
                        <div className="w-4 h-4 mr-2 rounded-full border-2 border-t-transparent border-white animate-spin"></div>
                        <span>Processing...</span>
                      </div>
                    )}
                    {formMessage}
                  </div>
                )}
                
                <div className="mt-6 flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddPositionModalOpen(false);
                      setSecuritySearch("");
                      setSecurityShares(0);
                      setSecurityPrice(0);
                      setPurchaseDate("");
                      setCostPerShare(0);
                    }}
                    className="px-4 py-2 border border-gray-600 rounded-lg hover:bg-gray-700 transition-colors"
                    disabled={isSubmitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleAddSecurity}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center"
                    disabled={!securitySearch || securityShares <= 0 || !selectedAccount || !purchaseDate || costPerShare <= 0 || isSubmitting}
                  >
                    {isSubmitting && <Loader className="animate-spin mr-2 h-4 w-4" />}
                    Add Position
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Position Modal */}
      {isEditPositionModalOpen && editPosition && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-black/80 backdrop-blur-sm"></div>
            </div>

            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            
            <div className="inline-block align-bottom bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="flex justify-between items-start p-6 border-b border-gray-700">
                <div className="flex items-center">
                  <Settings className="w-6 h-6 text-purple-500 mr-3" />
                  <h3 className="text-xl font-semibold">Edit Position</h3>
                </div>
                <button
                  onClick={() => {
                    setIsEditPositionModalOpen(false);
                    setEditPosition(null);
                  }}
                  className="text-gray-400 hover:text-white transition-colors"
                  disabled={isSubmitting}
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <form onSubmit={handleUpdatePosition} className="p-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">Ticker</label>
                    <input
                      type="text"
                      value={editPosition.ticker}
                      className="w-full p-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                      readOnly
                      disabled={isSubmitting}
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">Shares</label>
                      <input
                        type="number"
                        value={editPosition.shares}
                        onChange={(e) => setEditPosition({ ...editPosition, shares: e.target.value })}
                        className="w-full p-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        placeholder="0.00"
                        min="0.0001"
                        step="0.0001"
                        required
                        disabled={isSubmitting}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">Current Price</label>
                      <input
                        type="number"
                        value={editPosition.price}
                        onChange={(e) => setEditPosition({ ...editPosition, price: e.target.value })}
                        className="w-full p-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        placeholder="0.00"
                        min="0.01"
                        step="0.01"
                        required
                        disabled={isSubmitting}
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">Purchase Date</label>
                      <input
                        type="date"
                        value={editPosition.purchase_date || ""}
                        onChange={(e) => setEditPosition({ ...editPosition, purchase_date: e.target.value })}
                        className="w-full p-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        disabled={isSubmitting}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">Cost Basis</label>
                      <input
                        type="number"
                        value={editPosition.cost_basis || editPosition.price}
                        onChange={(e) => setEditPosition({ ...editPosition, cost_basis: e.target.value })}
                        className="w-full p-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        placeholder="0.00"
                        min="0.01"
                        step="0.01"
                        disabled={isSubmitting}
                      />
                    </div>
                  </div>

                  <div className="bg-gray-700/50 p-4 rounded-lg">
                    <div className="flex justify-between mb-2">
                      <span className="text-gray-400">Total Cost:</span>
                      <span className="font-medium">
                        ${((editPosition.cost_basis || editPosition.price) * editPosition.shares).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Current Value:</span>
                      <span className="font-medium">
                        ${(editPosition.price * editPosition.shares).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
                
                {formMessage && (
                  <div className={`mt-4 p-3 rounded-lg ${formMessage.includes("Error") || formMessage.includes("Failed") ? "bg-red-900/50 text-red-300" : "bg-green-900/50 text-green-300"}`}>
                    {isSubmitting && (
                      <div className="flex items-center mb-1">
                        <div className="w-4 h-4 mr-2 rounded-full border-2 border-t-transparent border-white animate-spin"></div>
                        <span>Processing...</span>
                      </div>
                    )}
                    {formMessage}
                  </div>
                )}
                
                <div className="mt-6 flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditPositionModalOpen(false);
                      setEditPosition(null);
                    }}
                    className="px-4 py-2 border border-gray-600 rounded-lg hover:bg-gray-700 transition-colors"
                    disabled={isSubmitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center"
                    disabled={isSubmitting}
                  >
                    {isSubmitting && <Loader className="animate-spin mr-2 h-4 w-4" />}
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Delete Position Confirmation Modal */}
      {isDeletePositionModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-black/80 backdrop-blur-sm"></div>
            </div>

            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            
            <div className="inline-block align-bottom bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="flex justify-between items-start p-6 border-b border-gray-700">
                <div className="flex items-center">
                  <Trash className="w-6 h-6 text-red-500 mr-3" />
                  <h3 className="text-xl font-semibold text-red-500">Delete Position</h3>
                </div>
                <button
                  onClick={() => {
                    setIsDeletePositionModalOpen(false);
                    setDeletePositionId(null);
                  }}
                  className="text-gray-400 hover:text-white transition-colors"
                  disabled={isSubmitting}
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="p-6">
                <p className="text-gray-300 mb-4">
                  Are you sure you want to delete this position? This action cannot be undone.
                </p>
                
                {isSubmitting && (
                  <div className="bg-gray-700/50 p-3 rounded-lg mb-4 flex items-center text-gray-300">
                    <div className="w-4 h-4 mr-2 rounded-full border-2 border-t-transparent border-white animate-spin"></div>
                    <span>Deleting position...</span>
                  </div>
                )}
                
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setIsDeletePositionModalOpen(false);
                      setDeletePositionId(null);
                    }}
                    className="px-4 py-2 border border-gray-600 rounded-lg hover:bg-gray-700 transition-colors"
                    disabled={isSubmitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={confirmDeletePosition}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center"
                    disabled={isSubmitting}
                  >
                    {isSubmitting && <Loader className="animate-spin mr-2 h-4 w-4" />}
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Account Detail Modal */}
      {isAccountDetailModalOpen && selectedAccountDetail && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-black/80 backdrop-blur-sm"></div>
            </div>

            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            
            <div className="inline-block align-bottom bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-5xl sm:w-full">
              <div className="flex justify-between items-start p-6 border-b border-gray-700 bg-gradient-to-r from-blue-900 to-blue-700">
                <div className="flex items-center">
                  <div className="flex-shrink-0 h-12 w-12 rounded-full bg-white flex items-center justify-center mr-4">
                    <span className="font-bold text-blue-800 text-xl">{selectedAccountDetail.account_name.charAt(0)}</span>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">{selectedAccountDetail.account_name}</h3>
                    <div className="flex items-center text-blue-200">
                      <span>{selectedAccountDetail.institution || "N/A"}</span>
                      {selectedAccountDetail.type && (
                        <>
                          <span className="mx-2">•</span>
                          <span>{selectedAccountDetail.type}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setIsAccountDetailModalOpen(false)}
                  className="text-white hover:text-blue-200 transition-colors"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              {/* Account Metrics */}
              <div className="p-6 bg-gray-800">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                  {(() => {
                    const costBasis = calculateAccountCostBasis(selectedAccountDetail.id);
                    const gainLoss = selectedAccountDetail.balance - costBasis;
                    const gainLossPercent = costBasis > 0 ? (gainLoss / costBasis) * 100 : 0;
                    const positionsCount = positions[selectedAccountDetail.id]?.length || 0;
                    
                    return (
                      <>
                        <div className="bg-gray-700 rounded-lg p-4">
                          <div className="text-gray-400 text-sm mb-1">Current Value</div>
                          <div className="text-xl font-bold">${selectedAccountDetail.balance.toLocaleString()}</div>
                        </div>
                        <div className="bg-gray-700 rounded-lg p-4">
                          <div className="text-gray-400 text-sm mb-1">Total Cost Basis</div>
                          <div className="text-xl font-bold">${costBasis.toLocaleString()}</div>
                        </div>
                        <div className="bg-gray-700 rounded-lg p-4">
                          <div className="text-gray-400 text-sm mb-1">Gain/Loss</div>
                          <div className={`text-xl font-bold ${gainLoss >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                            {gainLoss >= 0 ? '+' : ''}{gainLoss.toLocaleString('en-US', {
                              style: 'currency',
                              currency: 'USD',
                            })}
                            <span className="block text-sm">
                              {gainLoss >= 0 ? '+' : ''}{gainLossPercent.toFixed(2)}%
                            </span>
                          </div>
                        </div>
                        <div className="bg-gray-700 rounded-lg p-4">
                          <div className="text-gray-400 text-sm mb-1">Total Positions</div>
                          <div className="text-xl font-bold">{positionsCount}</div>
                        </div>
                      </>
                    );
                  })()}
                </div>

                {/* Positions Table */}
                <div className="bg-gray-700 rounded-lg overflow-hidden">
                  <div className="flex justify-between items-center px-4 py-3 bg-gray-700 border-b border-gray-600">
                    <h4 className="font-medium">Account Positions</h4>
                    <button
                      onClick={() => handleAddPositionClick(selectedAccountDetail.id)}
                      className="px-3 py-1 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 transition-colors flex items-center"
                      disabled={isLoading}
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Add Position
                    </button>
                  </div>
                  
                  {isLoading ? (
                    <div className="p-6 text-center">
                      <div className="inline-block w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full animate-spin mb-2"></div>
                      <p className="text-gray-400 text-sm">Loading positions...</p>
                    </div>
                  ) : positions[selectedAccountDetail.id]?.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-800">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Ticker</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">Shares</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">Price</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">Cost Basis</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">Value</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">Gain/Loss</th>
                            <th className="px-4 py-3 text-center text-xs font-medium text-gray-400 uppercase">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {positions[selectedAccountDetail.id].map((position) => {
                            const costBasis = getPositionCostBasis(position);
                            const totalCostBasis = position.shares * costBasis;
                            const gainLoss = position.value - totalCostBasis;
                            const gainLossPercent = totalCostBasis > 0 ? (gainLoss / totalCostBasis) * 100 : 0;
                            
                            return (
                              <tr 
                                key={position.id}
                                className="border-t border-gray-600 hover:bg-gray-600/50 transition-colors cursor-pointer"
                                onClick={() => handlePositionDetailClick(position)}
                              >
                                <td className="px-4 py-3">
                                  <div className="flex items-center">
                                    <div className="h-8 w-8 rounded-full bg-gradient-to-br from-green-500 to-blue-600 flex items-center justify-center mr-3">
                                      <span className="font-bold text-xs">{position.ticker.charAt(0)}</span>
                                    </div>
                                    <span className="font-medium">{position.ticker}</span>
                                  </div>
                                </td>
                                <td className="px-4 py-3 text-right">{position.shares.toLocaleString()}</td>
                                <td className="px-4 py-3 text-right">${position.price.toLocaleString()}</td>
                                <td className="px-4 py-3 text-right">${costBasis.toLocaleString()}</td>
                                <td className="px-4 py-3 text-right font-medium">${position.value.toLocaleString()}</td>
                                <td className="px-4 py-3 text-right">
                                  <div className="flex flex-col items-end">
                                    <div className={`font-medium ${gainLoss >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                      {gainLoss >= 0 ? '+' : ''}{gainLoss.toLocaleString('en-US', {
                                        style: 'currency',
                                        currency: 'USD',
                                      })}
                                    </div>
                                    <div className={`text-xs ${gainLoss >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                      {gainLoss >= 0 ? '+' : ''}{gainLossPercent.toFixed(2)}%
                                    </div>
                                  </div>
                                </td>
                                <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                                  <div className="flex items-center justify-center space-x-2">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleEditPositionClick(position);
                                      }}
                                      className="p-1 text-blue-400 hover:text-blue-300 transition-colors"
                                      title="Edit Position"
                                      disabled={isLoading}
                                    >
                                      <Settings className="h-4 w-4" />
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeletePositionClick(position.id);
                                      }}
                                      className="p-1 text-red-400 hover:text-red-300 transition-colors"
                                      title="Delete Position"
                                      disabled={isLoading}
                                    >
                                      <Trash className="h-4 w-4" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="p-8 text-center text-gray-400">
                      <BarChart4 className="h-10 w-10 mx-auto mb-2 opacity-50" />
                      <p>No positions found in this account</p>
                      <p className="text-sm mt-1">Add positions to start tracking your investments</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Position Detail Modal */}
      {isPositionDetailModalOpen && selectedPositionDetail && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-black/80 backdrop-blur-sm"></div>
            </div>

            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            
            <div className="inline-block align-bottom bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-5xl sm:w-full">
              <div className="flex justify-between items-start p-6 border-b border-gray-700 bg-gradient-to-r from-green-900 to-blue-800">
                <div className="flex items-center">
                  <div className="flex-shrink-0 h-12 w-12 rounded-full bg-white flex items-center justify-center mr-4">
                    <span className="font-bold text-green-800 text-xl">{selectedPositionDetail.ticker.charAt(0)}</span>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">{selectedPositionDetail.ticker}</h3>
                    <div className="flex items-center text-blue-200">
                      <span>{selectedPositionDetail.shares.toLocaleString()} shares</span>
                      <span className="mx-2">•</span>
                      <span>${selectedPositionDetail.price.toLocaleString()} per share</span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setIsPositionDetailModalOpen(false)}
                  className="text-white hover:text-blue-200 transition-colors"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              {/* Position Metrics */}
              <div className="p-6 bg-gray-800">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                  {(() => {
                    const costBasis = getPositionCostBasis(selectedPositionDetail);
                    const totalCostBasis = selectedPositionDetail.shares * costBasis;
                    const gainLoss = selectedPositionDetail.value - totalCostBasis;
                    const gainLossPercent = totalCostBasis > 0 ? (gainLoss / totalCostBasis) * 100 : 0;
                    const account = accounts.find(a => a.id === selectedPositionDetail.accountId);
                    
                    return (
                      <>
                        <div className="bg-gray-700 rounded-lg p-4">
                          <div className="text-gray-400 text-sm mb-1">Current Value</div>
                          <div className="text-xl font-bold">${selectedPositionDetail.value.toLocaleString()}</div>
                        </div>
                        <div className="bg-gray-700 rounded-lg p-4">
                          <div className="text-gray-400 text-sm mb-1">Total Cost Basis</div>
                          <div className="text-xl font-bold">${totalCostBasis.toLocaleString()}</div>
                        </div>
                        <div className="bg-gray-700 rounded-lg p-4">
                          <div className="text-gray-400 text-sm mb-1">Gain/Loss</div>
                          <div className={`text-xl font-bold ${gainLoss >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                            {gainLoss >= 0 ? '+' : ''}{gainLoss.toLocaleString('en-US', {
                              style: 'currency',
                              currency: 'USD',
                            })}
                            <span className="block text-sm">
                              {gainLoss >= 0 ? '+' : ''}{gainLossPercent.toFixed(2)}%
                            </span>
                          </div>
                        </div>
                        <div className="bg-gray-700 rounded-lg p-4">
                          <div className="text-gray-400 text-sm mb-1">Purchase Date</div>
                          <div className="text-xl font-bold">
                            {selectedPositionDetail.purchase_date ? 
                              new Date(selectedPositionDetail.purchase_date).toLocaleDateString() : 
                              'N/A'
                            }
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </div>

                <div className="bg-gray-700 rounded-lg overflow-hidden mb-6">
                  <div className="bg-gray-700 p-4 border-b border-gray-600">
                    <h4 className="font-medium">Position Details</h4>
                  </div>
                  <div className="p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <div className="mb-4">
                          <div className="text-gray-400 text-sm mb-1">Ticker Symbol</div>
                          <div className="font-medium">{selectedPositionDetail.ticker}</div>
                        </div>
                        <div className="mb-4">
                          <div className="text-gray-400 text-sm mb-1">Number of Shares</div>
                          <div className="font-medium">{selectedPositionDetail.shares.toLocaleString()}</div>
                        </div>
                        <div className="mb-4">
                          <div className="text-gray-400 text-sm mb-1">Current Price</div>
                          <div className="font-medium">${selectedPositionDetail.price.toLocaleString()}</div>
                        </div>
                        <div className="mb-4">
                          <div className="text-gray-400 text-sm mb-1">Cost Basis (per share)</div>
                          <div className="font-medium">
                            ${(selectedPositionDetail.cost_basis || selectedPositionDetail.price).toLocaleString()}
                          </div>
                        </div>
                      </div>
                      <div>
                        <div className="mb-4">
                          <div className="text-gray-400 text-sm mb-1">Account</div>
                          <div className="font-medium">{
                            accounts.find(a => a.id === selectedPositionDetail.accountId)?.account_name || 
                            'Unknown Account'
                          }</div>
                        </div>
                        <div className="mb-4">
                          <div className="text-gray-400 text-sm mb-1">Purchase Date</div>
                          <div className="font-medium">
                            {selectedPositionDetail.purchase_date ? 
                              new Date(selectedPositionDetail.purchase_date).toLocaleDateString() : 
                              'N/A'
                            }
                          </div>
                        </div>
                        <div>
                          <div className="text-gray-400 text-sm mb-1">Days Held</div>
                          <div className="font-medium">
                            {selectedPositionDetail.purchase_date ? 
                              Math.floor((new Date() - new Date(selectedPositionDetail.purchase_date)) / 
                                (1000 * 60 * 60 * 24)) : 
                              'N/A'
                            }
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => handleEditPositionClick(selectedPositionDetail)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center"
                    disabled={isLoading}
                  >
                    <Settings className="w-4 h-4 mr-2" />
                    Edit Position
                  </button>
                  <button
                    onClick={() => handleDeletePositionClick(selectedPositionDetail.id)}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center"
                    disabled={isLoading}
                  >
                    <Trash className="w-4 h-4 mr-2" />
                    Delete Position
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Watchlist Modal */}
      {watchlistModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-black/80 backdrop-blur-sm"></div>
            </div>

            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            
            <div className="inline-block align-bottom bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="flex justify-between items-start p-6 border-b border-gray-700">
                <div className="flex items-center">
                  <Star className="w-6 h-6 text-yellow-400 mr-3" />
                  <h3 className="text-xl font-semibold">Manage Watchlists</h3>
                </div>
                <button
                  onClick={() => setWatchlistModal(false)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="p-6">
                <div className="bg-gray-700/50 rounded-lg mb-6">
                  <div className="p-4 border-b border-gray-700 flex justify-between items-center">
                    <h4 className="font-medium">Default Watchlist</h4>
                    <span className="bg-blue-900/30 text-blue-400 text-xs px-2 py-1 rounded-full">
                      0 items
                    </span>
                  </div>

                  <div className="p-6 text-center text-gray-400">
                    <Bookmark className="h-10 w-10 mx-auto mb-2 opacity-50" />
                    <p>Your watchlist is empty</p>
                    <p className="text-sm mt-1">Add securities to track them here</p>
                  </div>
                </div>

                {/* Create New Watchlist (Placeholder) */}
                <div className="bg-blue-900/20 border border-blue-800/30 border-dashed rounded-lg p-4 text-center">
                  <Plus className="h-8 w-8 mx-auto mb-2 text-blue-400" />
                  <p className="text-blue-400">Create New Watchlist</p>
                  <p className="text-sm text-blue-500/70 mt-1">Organize securities by strategy or goal</p>
                </div>
              </div>

              <div className="bg-gray-900/50 px-6 py-4 flex justify-end">
                <button
                  onClick={() => setWatchlistModal(false)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}