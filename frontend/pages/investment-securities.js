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
  Trash
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
  const [error, setError] = useState(null);
  
  // Form states
  const [accountName, setAccountName] = useState("");
  const [institution, setInstitution] = useState("");
  const [accountType, setAccountType] = useState("");
  const [balance, setBalance] = useState(0);
  const [formMessage, setFormMessage] = useState("");
  
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
        setPositions(prevPositions => ({
          ...prevPositions,
          [accountId]: data.positions || []
        }));
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

  // Handle adding a new account
  const handleAddAccount = async (e) => {
    e.preventDefault();
    if (!accountName.trim()) {
      setFormMessage("Account name is required");
      return;
    }

    try {
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
    }
  };

  // Handle deleting an account
  const handleDeleteAccount = async (accountId) => {
    if (!confirm("Are you sure you want to delete this account and all its positions?")) {
      return;
    }
   
    try {
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
    }
  };

  // Handle adding a position to an account
  const handleAddPositionClick = (accountId) => {
    setSelectedAccount(accountId);
    setIsAddPositionModalOpen(true);
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
          accountName: account ? account.account_name : 'Unknown Account'
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
                onClick={() => setIsAddAccountModalOpen(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center transition-colors"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Account
              </button>
              <button 
                onClick={() => setWatchlistModal(true)}
                className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg flex items-center transition-colors"
              >
                <Star className="w-4 h-4 mr-2" />
                Manage Watchlists
              </button>
            </div>
          </div>
          <p className="text-gray-300 max-w-3xl mb-4">
            Manage your investment accounts and positions. Track performance and analyze your portfolio to make informed investment decisions.
          </p>
        </header>

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
                        Balance
                      </th>
                      <th scope="col" className="px-6 py-4 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700">
                    {sortedAccounts.map((account) => (
                      <tr 
                        key={account.id}
                        className="hover:bg-gray-700/50 transition-colors"
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
                          <div className="text-sm font-medium">${account.balance.toLocaleString()}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <div className="flex items-center justify-center space-x-3">
                            <button
                              onClick={() => handleAddPositionClick(account.id)}
                              className="p-2 bg-blue-600/20 text-blue-400 rounded-full hover:bg-blue-600/30 transition-colors"
                              title="Add Position"
                            >
                              <Plus className="h-5 w-5" />
                            </button>
                            <button
                              onClick={() => {/* handle edit account */}}
                              className="p-2 bg-purple-600/20 text-purple-400 rounded-full hover:bg-purple-600/30 transition-colors"
                              title="Edit Account"
                            >
                              <Settings className="h-5 w-5" />
                            </button>
                            <button
                              onClick={() => handleDeleteAccount(account.id)}
                              className="p-2 bg-red-600/20 text-red-400 rounded-full hover:bg-red-600/30 transition-colors"
                              title="Delete Account"
                            >
                              <Trash className="h-5 w-5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
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
              <div className="text-sm text-gray-400">
                {Object.keys(positions).reduce((sum, accountId) => sum + (positions[accountId]?.length || 0), 0)} positions across {accounts.length} accounts
              </div>
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
                      return (
                        <tr 
                          key={position.id}
                          className="hover:bg-gray-700/50 transition-colors"
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
                            <div className="text-sm font-medium">${position.value.toLocaleString()}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            {renderTrend(position.value, position.shares * costBasis)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <div className="flex items-center justify-center space-x-3">
                              <button
                                onClick={() => {/* handle edit position */}}
                                className="p-2 bg-purple-600/20 text-purple-400 rounded-full hover:bg-purple-600/30 transition-colors"
                                title="Edit Position"
                              >
                                <Settings className="h-5 w-5" />
                              </button>
                              <button
                                onClick={() => {/* handle delete position */}}
                                className="p-2 bg-red-600/20 text-red-400 rounded-full hover:bg-red-600/30 transition-colors"
                                title="Delete Position"
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
            <div className="space-y-4">
              {[
                { name: "Stocks", value: 65, color: "bg-blue-500" },
                { name: "ETFs", value: 25, color: "bg-purple-500" },
                { name: "Bonds", value: 7, color: "bg-green-500" },
                { name: "Cash", value: 3, color: "bg-yellow-500" }
              ].map((asset) => (
                <div key={asset.name}>
                  <div className="flex justify-between text-sm mb-1">
                    <span>{asset.name}</span>
                    <span>{asset.value}%</span>
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
          </div>

          <div className="bg-gray-800/70 backdrop-blur-sm p-6 rounded-xl">
            <h2 className="text-xl font-semibold mb-4">Top Holdings</h2>
            <div className="space-y-3">
              {sortedPositions.slice(0, 5).map((position) => (
                <div 
                  key={`top-${position.id}`}
                  className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg hover:bg-gray-700 transition-colors cursor-pointer"
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
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">Account Type</label>
                    <select
                      value={accountType}
                      onChange={(e) => setAccountType(e.target.value)}
                      className="w-full p-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
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
                    />
                  </div>
                </div>
                
                {formMessage && (
                  <div className={`mt-4 p-3 rounded-lg ${formMessage.includes("Error") || formMessage.includes("Failed") ? "bg-red-900/50 text-red-300" : "bg-green-900/50 text-green-300"}`}>
                    {formMessage}
                  </div>
                )}
                
                <div className="mt-6 flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setIsAddAccountModalOpen(false)}
                    className="px-4 py-2 border border-gray-600 rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Add Account
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
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="p-6">
                <div className="mb-4">
                  <p className="text-gray-300">
                    Adding position to account: <span className="font-medium text-white">
                      {accounts.find(a => a.id === selectedAccount)?.account_name || "Account"}
                    </span>
                  </p>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">Ticker Symbol</label>
                    <input
                      type="text"
                      className="w-full p-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      placeholder="e.g. AAPL, MSFT, GOOGL"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">Shares</label>
                      <input
                        type="number"
                        className="w-full p-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        placeholder="0.00"
                        min="0.0001"
                        step="0.0001"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">Price Per Share</label>
                      <input
                        type="number"
                        className="w-full p-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        placeholder="0.00"
                        min="0.01"
                        step="0.01"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">Purchase Date</label>
                      <input
                        type="date"
                        className="w-full p-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">Cost Basis</label>
                      <input
                        type="number"
                        className="w-full p-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        placeholder="0.00"
                        min="0.01"
                        step="0.01"
                      />
                    </div>
                  </div>
                </div>
                
                {formMessage && (
                  <div className={`mt-4 p-3 rounded-lg ${formMessage.includes("Error") || formMessage.includes("Failed") ? "bg-red-900/50 text-red-300" : "bg-green-900/50 text-green-300"}`}>
                    {formMessage}
                  </div>
                )}
                
                <div className="mt-6 flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setIsAddPositionModalOpen(false)}
                    className="px-4 py-2 border border-gray-600 rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                  >
                    Add Position
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
                    <p className="text-sm">Add securities to track them here</p>
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