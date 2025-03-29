import { useState, useEffect, useContext, useRef } from "react";
import { AuthContext } from "@/context/AuthContext";
import { useRouter } from "next/router";
import { 
  Search, Filter, TrendingUp, TrendingDown, Star, Clock,
  Bookmark, ArrowUpRight, Briefcase, BarChart4, SlidersHorizontal,
  X, Plus, Settings, Trash, DollarSign, Percent, LineChart,
  Users, PieChart, Info, Loader
} from 'lucide-react';
import { API_BASE_URL, fetchWithAuth } from '@/utils/api';
import SkeletonLoader from '@/components/SkeletonLoader';

export default function InvestmentDashboard() {
  const { user } = useContext(AuthContext);
  const router = useRouter();
  const canvasRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true);
  const [accounts, setAccounts] = useState([]);
  const [positions, setPositions] = useState({});
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [sortOption, setSortOption] = useState("name");
  const [watchlistModal, setWatchlistModal] = useState(false);
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
  const [securitySearch, setSecuritySearch] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [securityPrice, setSecurityPrice] = useState(0);
  const [securityShares, setSecurityShares] = useState(0);
  const [purchaseDate, setPurchaseDate] = useState("");
  const [costPerShare, setCostPerShare] = useState(0);
  const [isSearching, setIsSearching] = useState(false);
  const [accountName, setAccountName] = useState("");
  const [institution, setInstitution] = useState("");
  const [accountType, setAccountType] = useState("");
  const [balance, setBalance] = useState(0);
  const [formMessage, setFormMessage] = useState("");
  const [editAccount, setEditAccount] = useState(null);
  const [editPosition, setEditPosition] = useState(null);
  const [viewMode, setViewMode] = useState('grid');

  useEffect(() => {
    fetchUserData();
  }, []);

  useEffect(() => {
    if (portfolioAllocation.length > 0 && canvasRef.current) {
      drawPieChart();
    }
  }, [portfolioAllocation]);

  const fetchUserData = async () => {
    try {
      setIsLoading(true);
      const response = await fetchWithAuth('/accounts');
      if (!response.ok) throw new Error('Failed to fetch accounts');
      const data = await response.json();
      setAccounts(data.accounts || []);
      data.accounts.forEach(account => fetchPositions(account.id));
    } catch (error) {
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPositions = async (accountId) => {
    try {
      const response = await fetchWithAuth(`/positions/${accountId}`);
      if (response.ok) {
        const data = await response.json();
        setPositions(prev => {
          const updated = { ...prev, [accountId]: data.positions || [] };
          calculatePortfolioAllocation(updated);
          return updated;
        });
      }
    } catch (error) {
      console.error(error);
    }
  };

  const calculatePortfolioAllocation = (positionsData) => {
    const allPositions = Object.values(positionsData).flat();
    if (!allPositions.length) return setPortfolioAllocation([]);
    const totalValue = allPositions.reduce((sum, pos) => sum + pos.value, 0);
    const typeMap = { stocks: 0, etfs: 0, bonds: 0, cash: 0 };
    allPositions.forEach(pos => {
      const ticker = pos.ticker.toUpperCase();
      if (ticker.includes('ETF') || ticker.match(/VTI|SPY|QQQ/)) typeMap.etfs += pos.value;
      else if (ticker.includes('BOND') || ticker.match(/GOVT|BND|TLT/)) typeMap.bonds += pos.value;
      else if (ticker.includes('CASH') || ticker.match(/MMKT|SHV/)) typeMap.cash += pos.value;
      else typeMap.stocks += pos.value;
    });
    setPortfolioAllocation([
      { name: "Stocks", value: (typeMap.stocks / totalValue * 100), color: "#3b82f6" },
      { name: "ETFs", value: (typeMap.etfs / totalValue * 100), color: "#8b5cf6" },
      { name: "Bonds", value: (typeMap.bonds / totalValue * 100), color: "#10b981" },
      { name: "Cash", value: (typeMap.cash / totalValue * 100), color: "#f59e0b" }
    ]);
  };

  const drawPieChart = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = Math.min(canvas.width, canvas.height) / 2 - 20;
    let startAngle = 0;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    portfolioAllocation.forEach((slice) => {
      const sliceAngle = (slice.value / 100) * 2 * Math.PI;
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, startAngle, startAngle + sliceAngle);
      ctx.fillStyle = slice.color;
      ctx.fill();
      startAngle += sliceAngle;
    });

    // Add labels
    startAngle = 0;
    portfolioAllocation.forEach((slice) => {
      const sliceAngle = (slice.value / 100) * 2 * Math.PI;
      const midAngle = startAngle + sliceAngle / 2;
      const labelX = centerX + (radius * 0.7) * Math.cos(midAngle);
      const labelY = centerY + (radius * 0.7) * Math.sin(midAngle);
      ctx.fillStyle = '#fff';
      ctx.font = '12px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(`${slice.name} (${slice.value.toFixed(1)}%)`, labelX, labelY);
      startAngle += sliceAngle;
    });
  };

  const handleAddAccount = async (e) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      const response = await fetchWithAuth('/accounts', {
        method: "POST",
        body: JSON.stringify({ account_name: accountName, institution, type: accountType, balance: parseFloat(balance) || 0 })
      });
      if (response.ok) {
        setFormMessage("Account added successfully!");
        setTimeout(() => {
          setIsAddAccountModalOpen(false);
          resetForm();
          fetchUserData();
        }, 1000);
      }
    } catch (error) {
      setFormMessage("Error adding account");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setAccountName(""); setInstitution(""); setAccountType(""); setBalance(0);
    setSecuritySearch(""); setSecurityShares(0); setSecurityPrice(0); setPurchaseDate(""); setCostPerShare(0);
    setFormMessage("");
  };

  const handleEditAccount = async (e) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      const response = await fetchWithAuth(`/accounts/${editAccount.id}`, {
        method: "PUT",
        body: JSON.stringify({ account_name: editAccount.account_name, institution: editAccount.institution, type: editAccount.type })
      });
      if (response.ok) {
        setFormMessage("Account updated successfully!");
        setTimeout(() => {
          setIsEditAccountModalOpen(false);
          setEditAccount(null);
          fetchUserData();
        }, 1000);
      }
    } catch (error) {
      setFormMessage("Error updating account");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteAccount = async (accountId) => {
    if (!confirm("Are you sure?")) return;
    try {
      setIsLoading(true);
      const response = await fetchWithAuth(`/accounts/${accountId}`, { method: "DELETE" });
      if (response.ok) fetchUserData();
    } catch (error) {
      setError("Error deleting account");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddPosition = async () => {
    try {
      setIsSubmitting(true);
      const response = await fetchWithAuth(`/positions/${selectedAccount}`, {
        method: "POST",
        body: JSON.stringify({
          ticker: securitySearch.toUpperCase(),
          shares: parseFloat(securityShares),
          price: parseFloat(securityPrice),
          cost_basis: parseFloat(costPerShare),
          purchase_date: purchaseDate
        })
      });
      if (response.ok) {
        setFormMessage("Position added successfully!");
        setTimeout(() => {
          setIsAddPositionModalOpen(false);
          resetForm();
          fetchUserData();
        }, 1000);
      }
    } catch (error) {
      setFormMessage("Error adding position");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdatePosition = async (e) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      const response = await fetchWithAuth(`/positions/${editPosition.id}`, {
        method: "PUT",
        body: JSON.stringify({
          ticker: editPosition.ticker,
          shares: parseFloat(editPosition.shares),
          price: parseFloat(editPosition.price),
          cost_basis: parseFloat(editPosition.cost_basis || editPosition.price),
          purchase_date: editPosition.purchase_date || new Date().toISOString().split('T')[0]
        })
      });
      if (response.ok) {
        setFormMessage("Position updated successfully!");
        setTimeout(() => {
          setIsEditPositionModalOpen(false);
          setEditPosition(null);
          fetchUserData();
        }, 1000);
      }
    } catch (error) {
      setFormMessage("Error updating position");
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmDeletePosition = async () => {
    try {
      setIsSubmitting(true);
      const response = await fetchWithAuth(`/positions/${deletePositionId}`, { method: "DELETE" });
      if (response.ok) {
        setIsDeletePositionModalOpen(false);
        setDeletePositionId(null);
        setIsPositionDetailModalOpen(false);
        fetchUserData();
      }
    } catch (error) {
      setError("Error deleting position");
    } finally {
      setIsSubmitting(false);
    }
  };

  const searchSecurities = async (query) => {
    if (!query) return setSearchResults([]);
    try {
      setIsSearching(true);
      const response = await fetchWithAuth(`/securities/search?query=${encodeURIComponent(query)}`);
      if (response.ok) {
        const data = await response.json();
        setSearchResults(data.results.map(r => ({
          ticker: r.ticker || '',
          name: r.name || "Unknown",
          price: r.price || 0,
          sector: r.sector || ''
        })));
      }
    } catch (error) {
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSecuritySearch = (value) => {
    setSecuritySearch(value);
    if (value.length >= 2) searchSecurities(value);
  };

  const calculatePortfolioMetrics = () => {
    let totalValue = 0, totalCostBasis = 0;
    accounts.forEach(account => {
      totalValue += account.balance;
      totalCostBasis += (positions[account.id] || []).reduce((sum, pos) => sum + ((pos.cost_basis || pos.price) * pos.shares), 0);
    });
    const gainLoss = totalValue - totalCostBasis;
    return {
      totalValue,
      totalGainLoss: gainLoss,
      totalGainLossPercent: totalCostBasis > 0 ? (gainLoss / totalCostBasis * 100) : 0,
      totalPositions: Object.values(positions).flat().length,
      totalAccounts: accounts.length
    };
  };

  const filteredAccounts = accounts.filter(a => 
    a.account_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (a.institution || "").toLowerCase().includes(searchQuery.toLowerCase())
  ).sort((a, b) => {
    switch (sortOption) {
      case "balance-high": return b.balance - a.balance;
      case "balance-low": return a.balance - b.balance;
      case "name": return a.account_name.localeCompare(b.account_name);
      default: return 0;
    }
  });

  const allPositions = Object.entries(positions).flatMap(([accountId, pos]) => 
    pos.map(p => ({ ...p, accountName: accounts.find(a => a.id === parseInt(accountId))?.account_name || 'Unknown' }))
  ).filter(p => 
    p.ticker.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.accountName.toLowerCase().includes(searchQuery.toLowerCase())
  ).sort((a, b) => {
    switch (sortOption) {
      case "value-high": return b.value - a.value;
      case "value-low": return a.value - b.value;
      case "ticker": return a.ticker.localeCompare(b.ticker);
      default: return 0;
    }
  });

  const renderTrend = (value, costBasis) => {
    const change = costBasis ? ((value - costBasis) / costBasis * 100) : 0;
    return (
      <span className={`flex items-center gap-1 ${change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
        {change >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
        {change.toFixed(2)}%
      </span>
    );
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-indigo-900 flex items-center justify-center">
        <div className="bg-gray-800/90 p-8 rounded-2xl shadow-2xl text-center max-w-md">
          <Briefcase className="w-12 h-12 mx-auto text-indigo-400 mb-4" />
          <h1 className="text-3xl font-bold text-white mb-4">Welcome</h1>
          <p className="text-gray-300 mb-6">Log in to manage your investment portfolio</p>
          <button 
            onClick={() => router.push('/login')}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg transition-all duration-300"
          >
            Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-indigo-900 text-white">
      <div className="container mx-auto px-4 py-8">
        <header className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Briefcase className="w-8 h-8 text-indigo-400" />
            <h1 className="text-3xl font-bold">Investment Dashboard</h1>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={() => setIsAddPositionModalOpen(true)}
              className="bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-lg flex items-center gap-2 transition-all duration-300"
            >
              <Plus className="w-5 h-5" /> New Position
            </button>
            <button 
              onClick={() => setIsAddAccountModalOpen(true)}
              className="bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-lg flex items-center gap-2 transition-all duration-300"
            >
              <Plus className="w-5 h-5" /> New Account
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
          <div className="lg:col-span-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              {Object.entries(calculatePortfolioMetrics()).map(([key, value], i) => (
                <div key={i} className="bg-gray-800/80 p-6 rounded-xl backdrop-blur-sm hover:shadow-lg transition-all duration-300">
                  <div className="flex items-center gap-3">
                    {key.includes('Value') && <DollarSign className="w-5 h-5 text-indigo-400" />}
                    {key.includes('GainLossPercent') && <Percent className="w-5 h-5 text-indigo-400" />}
                    {key.includes('Positions') && <BarChart4 className="w-5 h-5 text-indigo-400" />}
                    {key.includes('Accounts') && <Users className="w-5 h-5 text-indigo-400" />}
                    <span className="text-sm text-gray-400 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                  </div>
                  <div className={`text-2xl font-bold mt-2 ${key.includes('GainLoss') && value < 0 ? 'text-red-400' : 'text-white'}`}>
                    {typeof value === 'number' ? 
                      (key.includes('Percent') ? `${value.toFixed(2)}%` : value.toLocaleString('en-US', { style: key.includes('Value') || key.includes('GainLoss') ? 'currency' : 'decimal', currency: 'USD' })) 
                      : value}
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-gray-800/80 p-6 rounded-xl mb-6">
              <div className="flex flex-col md:flex-row gap-4 items-center justify-between mb-4">
                <div className="relative w-full md:w-1/3">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search portfolio..."
                    className="w-full pl-10 pr-4 py-2 bg-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all duration-300"
                  />
                </div>
                <div className="flex gap-2">
                  {['all', 'accounts', 'positions'].map(type => (
                    <button
                      key={type}
                      onClick={() => setFilterType(type)}
                      className={`px-4 py-2 rounded-lg ${filterType === type ? 'bg-indigo-600' : 'bg-gray-700 hover:bg-gray-600'} transition-all duration-300`}
                    >
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </button>
                  ))}
                </div>
                <select
                  value={sortOption}
                  onChange={(e) => setSortOption(e.target.value)}
                  className="bg-gray-700 px-4 py-2 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all duration-300"
                >
                  <option value="name">Name</option>
                  <option value="balance-high">Balance ↓</option>
                  <option value="value-high">Value ↓</option>
                  <option value="ticker">Ticker</option>
                </select>
              </div>

              {(filterType === "all" || filterType === "accounts") && (
                <div className="mt-6">
                  <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                    <Briefcase className="w-5 h-5 text-indigo-400" /> Accounts
                  </h2>
                  {isLoading ? <SkeletonLoader /> : filteredAccounts.length === 0 ? (
                    <div className="text-center py-8 text-gray-400">
                      <Briefcase className="w-12 h-12 mx-auto mb-4" />
                      <p>No accounts found. Add one to get started!</p>
                    </div>
                  ) : (
                    <div className={`grid gap-4 ${viewMode === 'grid' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'}`}>
                      {filteredAccounts.map(account => {
                        const costBasis = (positions[account.id] || []).reduce((sum, pos) => sum + ((pos.cost_basis || pos.price) * pos.shares), 0);
                        const gainLoss = account.balance - costBasis;
                        return (
                          <div key={account.id} className="bg-gray-700/50 p-4 rounded-lg hover:bg-gray-700 transition-all duration-300 cursor-pointer" onClick={() => setSelectedAccountDetail(account) & setIsAccountDetailModalOpen(true)}>
                            <div className="flex justify-between items-start">
                              <div>
                                <h3 className="text-lg font-semibold">{account.account_name}</h3>
                                <p className="text-sm text-gray-400">{account.institution || 'N/A'}</p>
                              </div>
                              <div className="flex gap-2">
                                <button onClick={(e) => { e.stopPropagation(); setEditAccount(account); setIsEditAccountModalOpen(true); }} className="text-indigo-400 hover:text-indigo-300"><Settings className="w-5 h-5" /></button>
                                <button onClick={(e) => { e.stopPropagation(); handleDeleteAccount(account.id); }} className="text-red-400 hover:text-red-300"><Trash className="w-5 h-5" /></button>
                              </div>
                            </div>
                            <div className="mt-4 flex justify-between text-sm">
                              <span>Balance: ${account.balance.toLocaleString()}</span>
                              <span>{renderTrend(account.balance, costBasis)}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {(filterType === "all" || filterType === "positions") && (
                <div className="mt-6">
                  <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                    <BarChart4 className="w-5 h-5 text-indigo-400" /> Positions
                  </h2>
                  {isLoading ? <SkeletonLoader /> : allPositions.length === 0 ? (
                    <div className="text-center py-8 text-gray-400">
                      <BarChart4 className="w-12 h-12 mx-auto mb-4" />
                      <p>No positions found. Add some to track your investments!</p>
                    </div>
                  ) : (
                    <div className={`grid gap-4 ${viewMode === 'grid' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'}`}>
                      {allPositions.map(pos => (
                        <div key={pos.id} className="bg-gray-700/50 p-4 rounded-lg hover:bg-gray-700 transition-all duration-300 cursor-pointer" onClick={() => setSelectedPositionDetail(pos) & setIsPositionDetailModalOpen(true)}>
                          <div className="flex justify-between items-start">
                            <div>
                              <h3 className="text-lg font-semibold">{pos.ticker}</h3>
                              <p className="text-sm text-gray-400">{pos.accountName}</p>
                            </div>
                            <div className="flex gap-2">
                              <button onClick={(e) => { e.stopPropagation(); setEditPosition(pos); setIsEditPositionModalOpen(true); }} className="text-indigo-400 hover:text-indigo-300"><Settings className="w-5 h-5" /></button>
                              <button onClick={(e) => { e.stopPropagation(); setDeletePositionId(pos.id); setIsDeletePositionModalOpen(true); }} className="text-red-400 hover:text-red-300"><Trash className="w-5 h-5" /></button>
                            </div>
                          </div>
                          <div className="mt-4 flex justify-between text-sm">
                            <span>Value: ${pos.value.toLocaleString()}</span>
                            <span>{renderTrend(pos.value, (pos.cost_basis || pos.price) * pos.shares)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="bg-gray-800/80 p-6 rounded-xl">
            <h2 className="text-xl font-semibold mb-4">Portfolio Allocation</h2>
            {portfolioAllocation.length === 0 ? (
              <p className="text-center text-gray-400">No data available</p>
            ) : (
              <canvas ref={canvasRef} width={300} height={300} className="mx-auto" />
            )}
            <div className="mt-4 space-y-2">
              {portfolioAllocation.map(slice => (
                <div key={slice.name} className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded" style={{ backgroundColor: slice.color }}></div>
                  <span>{slice.name}: {slice.value.toFixed(1)}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Modals */}
        {isAddAccountModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
            <div className="bg-gray-800 rounded-2xl p-6 w-full max-w-md">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-semibold">Add Account</h3>
                <button onClick={() => setIsAddAccountModalOpen(false)}><X className="w-6 h-6" /></button>
              </div>
              <form onSubmit={handleAddAccount} className="space-y-4">
                <input type="text" value={accountName} onChange={(e) => setAccountName(e.target.value)} placeholder="Account Name" className="w-full p-2 bg-gray-700 rounded-lg" required />
                <input type="text" value={institution} onChange={(e) => setInstitution(e.target.value)} placeholder="Institution" className="w-full p-2 bg-gray-700 rounded-lg" />
                <select value={accountType} onChange={(e) => setAccountType(e.target.value)} className="w-full p-2 bg-gray-700 rounded-lg">
                  <option value="">Select Type</option>
                  <option value="401(k)">401(k)</option>
                  <option value="IRA">IRA</option>
                  <option value="Brokerage">Brokerage</option>
                </select>
                <input type="number" value={balance} onChange={(e) => setBalance(e.target.value)} placeholder="Initial Balance" className="w-full p-2 bg-gray-700 rounded-lg" />
                {formMessage && <p className={formMessage.includes("Error") ? "text-red-400" : "text-green-400"}>{formMessage}</p>}
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={() => setIsAddAccountModalOpen(false)} className="px-4 py-2 bg-gray-700 rounded-lg">Cancel</button>
                  <button type="submit" className="px-4 py-2 bg-indigo-600 rounded-lg" disabled={isSubmitting}>{isSubmitting ? <Loader className="w-5 h-5 animate-spin" /> : "Add"}</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {isEditAccountModalOpen && editAccount && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
            <div className="bg-gray-800 rounded-2xl p-6 w-full max-w-md">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-semibold">Edit Account</h3>
                <button onClick={() => setIsEditAccountModalOpen(false)}><X className="w-6 h-6" /></button>
              </div>
              <form onSubmit={handleEditAccount} className="space-y-4">
                <input type="text" value={editAccount.account_name} onChange={(e) => setEditAccount({ ...editAccount, account_name: e.target.value })} className="w-full p-2 bg-gray-700 rounded-lg" required />
                <input type="text" value={editAccount.institution || ""} onChange={(e) => setEditAccount({ ...editAccount, institution: e.target.value })} className="w-full p-2 bg-gray-700 rounded-lg" />
                <select value={editAccount.type || ""} onChange={(e) => setEditAccount({ ...editAccount, type: e.target.value })} className="w-full p-2 bg-gray-700 rounded-lg">
                  <option value="">Select Type</option>
                  <option value="401(k)">401(k)</option>
                  <option value="IRA">IRA</option>
                  <option value="Brokerage">Brokerage</option>
                </select>
                {formMessage && <p className={formMessage.includes("Error") ? "text-red-400" : "text-green-400"}>{formMessage}</p>}
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={() => setIsEditAccountModalOpen(false)} className="px-4 py-2 bg-gray-700 rounded-lg">Cancel</button>
                  <button type="submit" className="px-4 py-2 bg-indigo-600 rounded-lg" disabled={isSubmitting}>{isSubmitting ? <Loader className="w-5 h-5 animate-spin" /> : "Save"}</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {isAddPositionModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
            <div className="bg-gray-800 rounded-2xl p-6 w-full max-w-md">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-semibold">Add Position</h3>
                <button onClick={() => setIsAddPositionModalOpen(false)}><X className="w-6 h-6" /></button>
              </div>
              <div className="space-y-4">
                <select value={selectedAccount || ""} onChange={(e) => setSelectedAccount(e.target.value ? parseInt(e.target.value) : null)} className="w-full p-2 bg-gray-700 rounded-lg">
                  <option value="">Select Account</option>
                  {accounts.map(a => <option key={a.id} value={a.id}>{a.account_name}</option>)}
                </select>
                <input type="text" value={securitySearch} onChange={(e) => handleSecuritySearch(e.target.value)} placeholder="Search Ticker" className="w-full p-2 bg-gray-700 rounded-lg" />
                {searchResults.length > 0 && (
                  <div className="absolute z-10 bg-gray-700 rounded-lg max-h-40 overflow-y-auto w-[calc(100%-3rem)]">
                    {searchResults.map(r => (
                      <div key={r.ticker} className="p-2 hover:bg-gray-600 cursor-pointer" onClick={() => { setSecuritySearch(r.ticker); setSecurityPrice(r.price); setSearchResults([]); }}>
                        {r.ticker} - {r.name} (${r.price})
                      </div>
                    ))}
                  </div>
                )}
                <input type="number" value={securityShares} onChange={(e) => setSecurityShares(e.target.value)} placeholder="Shares" className="w-full p-2 bg-gray-700 rounded-lg" />
                <input type="number" value={securityPrice} onChange={(e) => setSecurityPrice(e.target.value)} placeholder="Price" className="w-full p-2 bg-gray-700 rounded-lg" />
                <input type="date" value={purchaseDate} onChange={(e) => setPurchaseDate(e.target.value)} className="w-full p-2 bg-gray-700 rounded-lg" />
                <input type="number" value={costPerShare} onChange={(e) => setCostPerShare(e.target.value)} placeholder="Cost Basis" className="w-full p-2 bg-gray-700 rounded-lg" />
                {formMessage && <p className={formMessage.includes("Error") ? "text-red-400" : "text-green-400"}>{formMessage}</p>}
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={() => setIsAddPositionModalOpen(false)} className="px-4 py-2 bg-gray-700 rounded-lg">Cancel</button>
                  <button onClick={handleAddPosition} className="px-4 py-2 bg-indigo-600 rounded-lg" disabled={isSubmitting}>{isSubmitting ? <Loader className="w-5 h-5 animate-spin" /> : "Add"}</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {isEditPositionModalOpen && editPosition && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
            <div className="bg-gray-800 rounded-2xl p-6 w-full max-w-md">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-semibold">Edit Position</h3>
                <button onClick={() => setIsEditPositionModalOpen(false)}><X className="w-6 h-6" /></button>
              </div>
              <form onSubmit={handleUpdatePosition} className="space-y-4">
                <input type="text" value={editPosition.ticker} readOnly className="w-full p-2 bg-gray-700 rounded-lg" />
                <input type="number" value={editPosition.shares} onChange={(e) => setEditPosition({ ...editPosition, shares: e.target.value })} className="w-full p-2 bg-gray-700 rounded-lg" />
                <input type="number" value={editPosition.price} onChange={(e) => setEditPosition({ ...editPosition, price: e.target.value })} className="w-full p-2 bg-gray-700 rounded-lg" />
                <input type="date" value={editPosition.purchase_date || ""} onChange={(e) => setEditPosition({ ...editPosition, purchase_date: e.target.value })} className="w-full p-2 bg-gray-700 rounded-lg" />
                <input type="number" value={editPosition.cost_basis || editPosition.price} onChange={(e) => setEditPosition({ ...editPosition, cost_basis: e.target.value })} className="w-full p-2 bg-gray-700 rounded-lg" />
                {formMessage && <p className={formMessage.includes("Error") ? "text-red-400" : "text-green-400"}>{formMessage}</p>}
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={() => setIsEditPositionModalOpen(false)} className="px-4 py-2 bg-gray-700 rounded-lg">Cancel</button>
                  <button type="submit" className="px-4 py-2 bg-indigo-600 rounded-lg" disabled={isSubmitting}>{isSubmitting ? <Loader className="w-5 h-5 animate-spin" /> : "Save"}</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {isDeletePositionModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
            <div className="bg-gray-800 rounded-2xl p-6 w-full max-w-md">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-semibold text-red-400">Delete Position</h3>
                <button onClick={() => setIsDeletePositionModalOpen(false)}><X className="w-6 h-6" /></button>
              </div>
              <p className="mb-4">Are you sure you want to delete this position?</p>
              <div className="flex justify-end gap-2">
                <button onClick={() => setIsDeletePositionModalOpen(false)} className="px-4 py-2 bg-gray-700 rounded-lg">Cancel</button>
                <button onClick={confirmDeletePosition} className="px-4 py-2 bg-red-600 rounded-lg" disabled={isSubmitting}>{isSubmitting ? <Loader className="w-5 h-5 animate-spin" /> : "Delete"}</button>
              </div>
            </div>
          </div>
        )}

        {isAccountDetailModalOpen && selectedAccountDetail && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
            <div className="bg-gray-800 rounded-2xl p-6 w-full max-w-2xl">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-semibold">{selectedAccountDetail.account_name}</h3>
                <button onClick={() => setIsAccountDetailModalOpen(false)}><X className="w-6 h-6" /></button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="p-4 bg-gray-700/50 rounded-lg">
                  <p className="text-sm text-gray-400">Balance</p>
                  <p className="text-lg font-semibold">${selectedAccountDetail.balance.toLocaleString()}</p>
                </div>
                <div className="p-4 bg-gray-700/50 rounded-lg">
                  <p className="text-sm text-gray-400">Positions</p>
                  <p className="text-lg font-semibold">{(positions[selectedAccountDetail.id] || []).length}</p>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-700">
                    <tr>
                      <th className="p-2 text-left">Ticker</th>
                      <th className="p-2 text-right">Shares</th>
                      <th className="p-2 text-right">Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(positions[selectedAccountDetail.id] || []).map(pos => (
                      <tr key={pos.id} className="border-t border-gray-700 hover:bg-gray-700/50">
                        <td className="p-2">{pos.ticker}</td>
                        <td className="p-2 text-right">{pos.shares.toLocaleString()}</td>
                        <td className="p-2 text-right">${pos.value.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {isPositionDetailModalOpen && selectedPositionDetail && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
            <div className="bg-gray-800 rounded-2xl p-6 w-full max-w-2xl">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-semibold">{selectedPositionDetail.ticker}</h3>
                <button onClick={() => setIsPositionDetailModalOpen(false)}><X className="w-6 h-6" /></button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-gray-700/50 rounded-lg">
                  <p className="text-sm text-gray-400">Value</p>
                  <p className="text-lg font-semibold">${selectedPositionDetail.value.toLocaleString()}</p>
                </div>
                <div className="p-4 bg-gray-700/50 rounded-lg">
                  <p className="text-sm text-gray-400">Shares</p>
                  <p className="text-lg font-semibold">{selectedPositionDetail.shares.toLocaleString()}</p>
                </div>
                <div className="p-4 bg-gray-700/50 rounded-lg">
                  <p className="text-sm text-gray-400">Price</p>
                  <p className="text-lg font-semibold">${selectedPositionDetail.price.toLocaleString()}</p>
                </div>
                <div className="p-4 bg-gray-700/50 rounded-lg">
                  <p className="text-sm text-gray-400">Cost Basis</p>
                  <p className="text-lg font-semibold">${(selectedPositionDetail.cost_basis || selectedPositionDetail.price).toLocaleString()}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}