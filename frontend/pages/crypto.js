// pages/crypto.js
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useContext } from 'react';
import { AuthContext } from '@/context/AuthContext';
import { 
  Bitcoin, 
  Plus, 
  PenTool, 
  Trash, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Wallet, 
  Shield,
  Info,
  AlertCircle,
  HelpCircle,
  RefreshCw
} from 'lucide-react';
import { Line, Doughnut } from 'react-chartjs-2';
import 'chart.js/auto';
import { fetchWithAuth } from '@/utils/api';

export default function Crypto() {
  const { user } = useContext(AuthContext);
  const router = useRouter();
  const [loading, setisLoading] = useState(true);
  const [cryptos, setCryptos] = useState([]);
  const [isAddCryptoModalOpen, setIsAddCryptoModalOpen] = useState(false);
  const [isEditCryptoModalOpen, setIsEditCryptoModalOpen] = useState(false);
  const [isCryptoDetailModalOpen, setIsCryptoDetailModalOpen] = useState(false);
  const [selectedCrypto, setSelectedCrypto] = useState(null);
  const [error, setError] = useState(null);
  const [syncStatus, setSyncStatus] = useState({ lastSync: null, syncing: false });
  const [filterType, setFilterType] = useState('All');
  const [chartView, setChartView] = useState('value'); // 'value' or 'allocation'
  
  // Form state for adding/editing crypto
  const [coinType, setCoinType] = useState('Bitcoin');
  const [quantity, setQuantity] = useState('');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [purchaseDate, setPurchaseDate] = useState('');
  const [storageType, setStorageType] = useState('Cold Wallet');
  const [exchangeName, setExchangeName] = useState('');
  const [walletAddress, setWalletAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [isFavorite, setIsFavorite] = useState(false);
  const [tags, setTags] = useState([]);
  const [newTag, setNewTag] = useState('');
  const [accounts, setAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState(null);
  
  // Chart timeframe state
  const [selectedTimeframe, setSelectedTimeframe] = useState("1Y");
  const [activeCurrencyTab, setActiveCurrencyTab] = useState('USD');

  useEffect(() => {
    if (user) {
      fetchUserData();
    }
  }, [user]);

  const fetchUserData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Fetch accounts
      const accountsResponse = await fetchWithAuth('/accounts');
      if (!accountsResponse.ok) {
        throw new Error('Failed to fetch accounts');
      }
      
      const accountsData = await accountsResponse.json();
      setAccounts(accountsData.accounts || []);
      
      // If we have accounts, select the first one and fetch its crypto positions
      if (accountsData.accounts && accountsData.accounts.length > 0) {
        const firstAccount = accountsData.accounts[0];
        setSelectedAccount(firstAccount.id);
        await fetchCryptoPositions(firstAccount.id);
      } else {
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
      setError('Failed to load your data. Please try again.');
      setIsLoading(false);
    }
  };

  const fetchCryptoPositions = async (accountId) => {
    try {
      const response = await fetchWithAuth(`/crypto/${accountId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch crypto positions');
      }
      
      const data = await response.json();
      setCryptos(data.crypto_positions || []);
      setSyncStatus({ lastSync: new Date(), syncing: false });
    } catch (error) {
      console.error('Error fetching crypto positions:', error);
      setError('Failed to load crypto positions. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAccountChange = async (accountId) => {
    setSelectedAccount(accountId);
    setIsLoading(true);
    await fetchCryptoPositions(accountId);
  };

  // Calculate total portfolio value
  const totalValue = cryptos.reduce((sum, crypto) => sum + crypto.totalValue, 0);
  const totalInvestment = cryptos.reduce((sum, crypto) => sum + (crypto.quantity * crypto.purchasePrice), 0);
  const totalGainLoss = totalValue - totalInvestment;
  const totalGainLossPercent = totalInvestment > 0 ? (totalGainLoss / totalInvestment) * 100 : 0;

  // Filter cryptos based on selected filter
  const filteredCryptos = (() => {
    switch (filterType) {
      case 'Favorites':
        return cryptos.filter(crypto => crypto.isFavorite);
      case 'Gains':
        return cryptos.filter(crypto => crypto.gainLoss > 0);
      case 'Losses':
        return cryptos.filter(crypto => crypto.gainLoss < 0);
      case 'Exchanges':
        return cryptos.filter(crypto => crypto.storageType === 'Exchange');
      case 'Hardware Wallets':
        return cryptos.filter(crypto => crypto.storageType === 'Hardware Wallet' || crypto.storageType === 'Cold Wallet');
      default:
        return cryptos;
    }
  })();

  // Get unique tags across all cryptos
  const allTags = [...new Set(cryptos.flatMap(crypto => crypto.tags || []))];

  // Helper function to get current price for a coin type
  const getCurrentPrice = (type) => {
    const prices = {
      'Bitcoin': 65000,
      'Ethereum': 3500,
      'Solana': 120,
      'Cardano': 0.85,
      'Ripple': 0.55,
      'Polkadot': 12,
      'Avalanche': 35,
      'Dogecoin': 0.12
    };
    return prices[type] || 0;
  };

  // Get coin symbol and icon
  const getCoinInfo = (type) => {
    const info = {
      'Bitcoin': { symbol: 'BTC', icon: '₿' },
      'Ethereum': { symbol: 'ETH', icon: 'Ξ' },
      'Solana': { symbol: 'SOL', icon: '◎' },
      'Cardano': { symbol: 'ADA', icon: '₳' },
      'Ripple': { symbol: 'XRP', icon: '✕' },
      'Polkadot': { symbol: 'DOT', icon: '●' },
      'Avalanche': { symbol: 'AVAX', icon: '△' },
      'Dogecoin': { symbol: 'DOGE', icon: 'Ð' }
    };
    return info[type] || { symbol: '?', icon: '?' };
  };

  // Generate chart data for portfolio value over time
  const getChartData = (timeframe) => {
    // This would be replaced with actual historical data in a real implementation
    const months = timeframe === "1Y" ? 12 : (timeframe === "5Y" ? 60 : 36);
    const labels = Array.from({ length: months }, (_, i) => {
      const date = new Date();
      date.setMonth(date.getMonth() - (months - i - 1));
      return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    });
    
    // Generate mock data that shows volatile crypto market
    const data = Array.from({ length: months }, (_, i) => {
      // Crypto is very volatile, so we'll exaggerate the randomness
      let baseValue = totalValue * 0.3; // Start at 30% of current value (crypto tends to appreciate dramatically)
      const trendFactor = Math.pow(i / (months - 1), 1.5); // Non-linear growth
      const randomFactor = Math.random() * 0.5 - 0.2; // -20% to +30% random fluctuation
      const sineCycle = Math.sin(i / months * Math.PI * 4) * 0.2; // Add cyclical pattern
      return Math.max(baseValue + (totalValue - baseValue) * trendFactor + baseValue * randomFactor + baseValue * sineCycle, 0);
    });
    
    return {
      labels,
      datasets: [
        {
          label: `Portfolio Value (${activeCurrencyTab})`,
          data,
          borderColor: '#F7931A', // Bitcoin orange
          backgroundColor: 'rgba(247, 147, 26, 0.2)',
          borderWidth: 2,
          pointRadius: 1,
          pointHoverRadius: 5,
          tension: 0.3,
          fill: true
        }
      ]
    };
  };

  // Generate data for allocation pie chart
  const getAllocationData = () => {
    // Group small holdings into "Others" category
    const threshold = totalValue * 0.03; // 3% of total portfolio
    let allocations = {};
    let otherTotal = 0;
    
    cryptos.forEach(crypto => {
      if (crypto.totalValue >= threshold) {
        allocations[crypto.coinType] = crypto.totalValue;
      } else {
        otherTotal += crypto.totalValue;
      }
    });
    
    if (otherTotal > 0) {
      allocations['Others'] = otherTotal;
    }
    
    const colors = {
      'Bitcoin': '#F7931A',
      'Ethereum': '#627EEA',
      'Solana': '#14F195',
      'Cardano': '#0033AD',
      'Ripple': '#23292F',
      'Polkadot': '#E6007A',
      'Avalanche': '#E84142',
      'Dogecoin': '#C2A633',
      'Others': '#808080'
    };
    
    return {
      labels: Object.keys(allocations),
      datasets: [
        {
          data: Object.values(allocations),
          backgroundColor: Object.keys(allocations).map(coin => colors[coin] || '#808080'),
          borderWidth: 0,
          hoverOffset: 10
        }
      ]
    };
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        ticks: {
          maxTicksLimit: 6,
          color: 'rgba(255, 255, 255, 0.7)'
        },
        grid: {
          display: false
        }
      },
      y: {
        ticks: {
          color: 'rgba(255, 255, 255, 0.7)',
          callback: (value) => `${activeCurrencyTab === 'USD' ? '$' : '€'}${value.toLocaleString()}`
        },
        grid: {
          color: 'rgba(255, 255, 255, 0.1)'
        }
      }
    },
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const prefix = activeCurrencyTab === 'USD' ? '$' : '€';
            return `Value: ${prefix}${context.parsed.y.toLocaleString()}`;
          }
        }
      }
    }
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right',
        labels: {
          color: 'rgba(255, 255, 255, 0.7)',
          font: {
            size: 12
          },
          boxWidth: 15
        }
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const value = context.raw;
            const percentage = ((value / totalValue) * 100).toFixed(1);
            return `${context.label}: ${activeCurrencyTab === 'USD' ? '$' : '€'}${value.toLocaleString()} (${percentage}%)`;
          }
        }
      }
    }
  };

  // Handle adding a new crypto
  const handleAddCrypto = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!coinType || !quantity || !purchasePrice || !purchaseDate || !storageType) {
      setError("Please fill out all required fields");
      return;
    }
    
    // Get current market price
    const currentPrice = getCurrentPrice(coinType);
    
    // Get coin info
    const coinInfo = getCoinInfo(coinType);
    
    try {
      setIsLoading(true);
      
      const response = await fetchWithAuth(`/crypto/${selectedAccount}`, {
        method: 'POST',
        body: JSON.stringify({
          coin_type: coinType,
          coin_symbol: coinInfo.symbol,
          quantity: parseFloat(quantity),
          purchase_price: parseFloat(purchasePrice),
          current_price: currentPrice,
          purchase_date: purchaseDate,
          storage_type: storageType,
          exchange_name: storageType === 'Exchange' ? exchangeName : null,
          wallet_address: storageType !== 'Exchange' ? walletAddress : null,
          notes: notes,
          tags: tags,
          is_favorite: isFavorite
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to add crypto');
      }
      
      // Reset form and close modal
      resetForm();
      setIsAddCryptoModalOpen(false);
      
      // Refresh crypto list
      await fetchCryptoPositions(selectedAccount);
      
    } catch (error) {
      console.error('Error adding crypto:', error);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditCrypto = async (e) => {
    e.preventDefault();
    
    if (!coinType || !quantity || !purchasePrice || !purchaseDate || !storageType) {
      setError("Please fill out all required fields");
      return;
    }
    
    try {
      setIsLoading(true);
      
      const response = await fetchWithAuth(`/crypto/${selectedCrypto.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          coin_type: coinType,
          coin_symbol: getCoinInfo(coinType).symbol,
          quantity: parseFloat(quantity),
          purchase_price: parseFloat(purchasePrice),
          current_price: getCurrentPrice(coinType),
          purchase_date: purchaseDate,
          storage_type: storageType,
          exchange_name: storageType === 'Exchange' ? exchangeName : null,
          wallet_address: storageType !== 'Exchange' ? walletAddress : null,
          notes: notes,
          tags: tags,
          is_favorite: isFavorite
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to update crypto');
      }
      
      // Reset form and close modal
      resetForm();
      setIsEditCryptoModalOpen(false);
      
      // Refresh crypto list
      await fetchCryptoPositions(selectedAccount);
      
    } catch (error) {
      console.error('Error updating crypto:', error);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteCrypto = async (cryptoId) => {
    if (confirm("Are you sure you want to delete this cryptocurrency?")) {
      try {
        setIsLoading(true);
        
        const response = await fetchWithAuth(`/crypto/${cryptoId}`, {
          method: 'DELETE'
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.detail || 'Failed to delete crypto');
        }
        
        // Refresh crypto list
        await fetchCryptoPositions(selectedAccount);
        
        // Close detail modal if open
        if (isCryptoDetailModalOpen) {
          setIsCryptoDetailModalOpen(false);
        }
        
      } catch (error) {
        console.error('Error deleting crypto:', error);
        setError(error.message);
      } finally {
        setIsLoading(false);
      }
    }
  };

  // Open edit modal with crypto data
  const openEditModal = (crypto) => {
    setSelectedCrypto(crypto);
    setCoinType(crypto.coinType);
    setQuantity(crypto.quantity.toString());
    setPurchasePrice(crypto.purchasePrice.toString());
    setPurchaseDate(crypto.purchaseDate);
    setStorageType(crypto.storageType);
    setExchangeName(crypto.exchangeName);
    setWalletAddress(crypto.walletAddress);
    setNotes(crypto.notes);
    setTags(crypto.tags || []);
    setIsFavorite(crypto.isFavorite || false);
    setIsEditCryptoModalOpen(true);
  };

  // Open detail modal for a crypto
  const openDetailModal = (crypto) => {
    setSelectedCrypto(crypto);
    setIsCryptoDetailModalOpen(true);
  };

  // Reset form fields
  const resetForm = () => {
    setCoinType('Bitcoin');
    setQuantity('');
    setPurchasePrice('');
    setPurchaseDate('');
    setStorageType('Cold Wallet');
    setExchangeName('');
    setWalletAddress('');
    setNotes('');
    setTags([]);
    setNewTag('');
    setIsFavorite(false);
    setError(null);
  };

  // Helper to get coin color
  const getCoinColor = (type) => {
    const colors = {
      'Bitcoin': 'text-orange-500',
      'Ethereum': 'text-purple-500',
      'Solana': 'text-green-500',
      'Cardano': 'text-blue-400',
      'Ripple': 'text-blue-600',
      'Polkadot': 'text-pink-600',
      'Avalanche': 'text-red-500',
      'Dogecoin': 'text-yellow-500'
    };
    return colors[type] || 'text-gray-400';
  };

  // Toggle favorite status
  const toggleFavorite = async (cryptoId) => {
    // Find the crypto
    const crypto = cryptos.find(c => c.id === cryptoId);
    if (!crypto) return;
    
    try {
      const response = await fetchWithAuth(`/crypto/${cryptoId}`, {
        method: 'PUT',
        body: JSON.stringify({
          is_favorite: !crypto.is_favorite
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to update favorite status');
      }
      
      // Update the local state
      setCryptos(cryptos.map(c => {
        if (c.id === cryptoId) {
          return { ...c, is_favorite: !c.is_favorite };
        }
        return c;
      }));
      
    } catch (error) {
      console.error('Error toggling favorite:', error);
      setError('Failed to update favorite status');
    }
  };

  // Remove a tag from the current form
  const handleRemoveTag = (tagToRemove) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  // Simulate synchronizing with crypto price APIs
  const syncPrices = async () => {
    setSyncStatus({ ...syncStatus, syncing: true });
    
    try {
      // Refresh data by fetching positions again
      await fetchCryptoPositions(selectedAccount);
    } catch (error) {
      console.error('Error syncing prices:', error);
      setError('Failed to sync prices');
    } finally {
      setSyncStatus({ lastSync: new Date(), syncing: false });
    }
  };

  // Function to format currency based on active tab
  const formatCurrency = (value) => {
    return activeCurrencyTab === 'USD' 
      ? `$${value.toLocaleString()}`
      : `€${(value * 0.93).toLocaleString()}`; // Assuming EUR/USD = 0.93
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="bg-gray-800 p-8 rounded-xl shadow-lg text-center">
          <Bitcoin className="w-16 h-16 mx-auto text-orange-500 mb-4" />
          <h1 className="text-2xl font-bold text-white mb-4">Cryptocurrency Portfolio</h1>
          <p className="text-gray-300 mb-6">Please log in to view your crypto portfolio.</p>
          <button 
            onClick={() => router.push('/login')}
            className="bg-orange-600 text-white px-6 py-2 rounded-lg hover:bg-orange-700 transition-colors"
          >
            Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center">
              <Bitcoin className="mr-4 text-orange-500" />
              Cryptocurrency Portfolio
            </h1>
            <p className="text-gray-400 mt-2">Track and manage your cryptocurrency investments</p>
          </div>
          
          <div className="flex flex-wrap gap-3">
            <button
              onClick={syncPrices}
              disabled={syncStatus.syncing}
              className={`flex items-center px-4 py-2 rounded-lg border border-gray-700 hover:bg-gray-800 transition-colors ${syncStatus.syncing ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <RefreshCw className={`mr-2 ${syncStatus.syncing ? 'animate-spin' : ''}`} size={18} />
              {syncStatus.syncing ? 'Syncing...' : 'Sync Prices'}
            </button>
            
            <button
              onClick={() => setIsAddCryptoModalOpen(true)}
              className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors flex items-center"
            >
              <Plus className="mr-2" size={18} />
              Add Crypto
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-900/50 border border-red-500 text-red-200 px-4 py-3 rounded-lg mb-6 flex items-start">
            <AlertCircle className="mr-2 mt-1 flex-shrink-0" size={20} />
            <div>
              <p className="font-semibold">Error</p>
              <p>{error}</p>
            </div>
          </div>
        )}

        {/* Last Sync Info */}
        <div className="text-right text-sm text-gray-400 mb-4">
          {syncStatus.lastSync ? (
            <span>Last synced: {syncStatus.lastSync.toLocaleString()}</span>
          ) : (
            <span>Never synced</span>
          )}
        </div>

        {/* Portfolio Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-gray-800 p-6 rounded-xl shadow-lg">
            <h2 className="text-lg text-gray-400 mb-2">Total Portfolio Value</h2>
            <div className="flex items-center justify-between">
              <p className="text-3xl font-bold">{formatCurrency(totalValue)}</p>
              
              <div className="flex border border-gray-700 rounded-lg overflow-hidden">
                <button 
                  className={`px-3 py-1 text-sm ${activeCurrencyTab === 'USD' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'}`}
                  onClick={() => setActiveCurrencyTab('USD')}
                >
                  USD
                </button>
                <button 
                  className={`px-3 py-1 text-sm ${activeCurrencyTab === 'EUR' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'}`}
                  onClick={() => setActiveCurrencyTab('EUR')}
                >
                  EUR
                </button>
              </div>
            </div>
            <div className={`mt-2 flex items-center ${totalGainLossPercent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {totalGainLossPercent >= 0 ? <TrendingUp size={16} className="mr-1" /> : <TrendingDown size={16} className="mr-1" />}
              <span>{totalGainLossPercent >= 0 ? '+' : ''}{totalGainLossPercent.toFixed(1)}% overall</span>
            </div>
          </div>
          
          <div className="bg-gray-800 p-6 rounded-xl shadow-lg">
            <h2 className="text-lg text-gray-400 mb-2">Total Gain/Loss</h2>
            <p className={`text-3xl font-bold ${totalGainLoss >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {totalGainLoss >= 0 ? '+' : ''}{formatCurrency(totalGainLoss)}
            </p>
            <div className="mt-2 text-gray-400">
              <span>Initial investment: {formatCurrency(totalInvestment)}</span>
            </div>
          </div>
          
          <div className="bg-gray-800 p-6 rounded-xl shadow-lg">
            <h2 className="text-lg text-gray-400 mb-2">Storage Security</h2>
            <div className="flex items-center mt-4">
              <div className="w-1/2">
                <div className="flex items-center">
                  <Shield className="mr-2 text-green-400" size={18} />
                  <span>Self-custody: {cryptos.filter(c => c.storageType !== 'Exchange').length}</span>
                </div>
              </div>
              <div className="w-1/2">
                <div className="flex items-center">
                  <Wallet className="mr-2 text-yellow-400" size={18} />
                  <span>On Exchange: {cryptos.filter(c => c.storageType === 'Exchange').length}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-wrap gap-2 mb-6">
          {['All', 'Favorites', 'Gains', 'Losses', 'Exchanges', 'Hardware Wallets'].map(filter => (
            <button
              key={filter}
              className={`px-3 py-1 rounded-lg text-sm ${filterType === filter ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
              onClick={() => setFilterType(filter)}
            >
              {filter}
            </button>
          ))}
          
          {allTags.length > 0 && (
            <select 
              className="px-3 py-1 rounded-lg text-sm bg-gray-700 text-gray-300 hover:bg-gray-600"
              onChange={(e) => e.target.value && setFilterType(e.target.value)}
              value=""
            >
              <option value="" disabled>Filter by Tag</option>
              {allTags.map(tag => (
                <option key={tag} value={tag}>{tag}</option>
              ))}
            </select>
          )}
        </div>

        {/* Portfolio Charts */}
        <div className="bg-gray-800 p-6 rounded-xl shadow-lg mb-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
            <div className="flex items-center gap-4">
              <h2 className="text-xl font-semibold">Portfolio Overview</h2>
              <div className="flex border border-gray-700 rounded-lg overflow-hidden">
                <button 
                  className={`px-3 py-1 text-sm ${chartView === 'value' ? 'bg-orange-600 text-white' : 'bg-gray-700 text-gray-300'}`}
                  onClick={() => setChartView('value')}
                >
                  Value History
                </button>
                <button 
                  className={`px-3 py-1 text-sm ${chartView === 'allocation' ? 'bg-orange-600 text-white' : 'bg-gray-700 text-gray-300'}`}
                  onClick={() => setChartView('allocation')}
                >
                  Allocation
                </button>
              </div>
            </div>
            {chartView === 'value' && (
              <div className="flex space-x-2">
                {["1Y", "3Y", "5Y"].map((time) => (
                  <button
                    key={time}
                    className={`px-3 py-1 rounded ${selectedTimeframe === time ? 'bg-orange-600 text-white' : 'bg-gray-700 text-gray-300'}`}
                    onClick={() => setSelectedTimeframe(time)}
                  >
                    {time}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="h-80">
            {chartView === 'value' ? (
              <Line data={getChartData(selectedTimeframe)} options={chartOptions} />
            ) : (
              <Doughnut data={getAllocationData()} options={doughnutOptions} />
            )}
          </div>
          
          {chartView === 'allocation' && (
            <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
              {cryptos.slice(0, 4).map(crypto => (
                <div key={crypto.id} className="bg-gray-700 p-3 rounded-lg flex items-center">
                  <span className={`text-xl mr-3 ${getCoinColor(crypto.coinType)}`}>{crypto.coinIcon}</span>
                  <div>
                    <div className="font-medium">{crypto.coinType}</div>
                    <div className="text-sm text-gray-400">
                      {((crypto.totalValue / totalValue) * 100).toFixed(1)}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Crypto Table */}
        <div className="bg-gray-800 rounded-xl shadow-lg overflow-hidden mb-8">
          <h2 className="text-xl font-semibold p-6 border-b border-gray-700 flex items-center justify-between">
            <span>Your Cryptocurrencies</span>
            <span className="text-sm text-gray-400 font-normal">Showing {filteredCryptos.length} of {cryptos.length}</span>
          </h2>
          
          {loading ? (
            <div className="p-6 text-center">
              <p>Loading cryptocurrencies...</p>
            </div>
          ) : cryptos.length === 0 ? (
            <div className="p-6 text-center">
              <p>No cryptocurrencies found. Add your first crypto to get started.</p>
              <button
                onClick={() => setIsAddCryptoModalOpen(true)}
                className="mt-4 bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors"
              >
                Add Your First Crypto
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-700">
                  <tr>
                    <th className="py-3 px-4 text-left">Cryptocurrency</th>
                    <th className="py-3 px-4 text-right">Holdings</th>
                    <th className="py-3 px-4 text-right">Purchase Price</th>
                    <th className="py-3 px-4 text-right">Current Price</th>
                    <th className="py-3 px-4 text-right">Total Value</th>
                    <th className="py-3 px-4 text-right">Gain/Loss</th>
                    <th className="py-3 px-4 text-center">Storage</th>
                    <th className="py-3 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCryptos.map((crypto) => {
                    const coinColor = getCoinColor(crypto.coinType);
                    
                    return (
                      <tr 
                        key={crypto.id} 
                        className="border-t border-gray-700 hover:bg-gray-700/50 cursor-pointer"
                        onClick={() => openDetailModal(crypto)}
                      >
                        <td className="py-4 px-4" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center">
                            <span className={`mr-3 text-xl ${coinColor}`}>{crypto.coinIcon}</span>
                            <div>
                              <div className="font-medium flex items-center">
                                {crypto.coinType}
                                {crypto.isFavorite && (
                                  <span className="ml-2 text-yellow-400" title="Favorite">★</span>
                                )}
                              </div>
                              <div className="text-sm text-gray-400">{crypto.coinSymbol}</div>
                              <div className="text-xs text-gray-500">
                                {new Date(crypto.purchaseDate).toLocaleDateString()}
                                {crypto.tags && crypto.tags.length > 0 && (
                                  <span className="ml-2">
                                    {crypto.tags.slice(0, 2).map(tag => (
                                      <span key={tag} className="inline-block bg-gray-600 text-gray-200 rounded-full px-2 py-0.5 text-xs mr-1">
                                        {tag}
                                      </span>
                                    ))}
                                    {crypto.tags.length > 2 && (
                                      <span className="inline-block bg-gray-600 text-gray-200 rounded-full px-2 py-0.5 text-xs">
                                        +{crypto.tags.length - 2}
                                      </span>
                                    )}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4 text-right">{crypto.quantity.toLocaleString()}</td>
                        <td className="py-4 px-4 text-right">{formatCurrency(crypto.purchasePrice)}</td>
                        <td className="py-4 px-4 text-right">{formatCurrency(crypto.currentPrice)}</td>
                        <td className="py-4 px-4 text-right">{formatCurrency(crypto.totalValue)}</td>
                        <td className="py-4 px-4 text-right">
                          <div className={crypto.gainLoss >= 0 ? "text-green-400" : "text-red-400"}>
                            <div>{crypto.gainLoss >= 0 ? "+" : ""}{formatCurrency(crypto.gainLoss)}</div>
                            <div className="text-sm">
                              {crypto.gainLossPercent >= 0 ? "+" : ""}{crypto.gainLossPercent.toFixed(1)}%
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4 text-center">
                          <div className="flex flex-col items-center">
                            <span className={crypto.storageType === 'Exchange' ? 'text-yellow-400' : 'text-green-400'}>
                              {crypto.storageType === 'Exchange' ? <Wallet size={18} /> : <Shield size={18} />}
                            </span>
                            <span className="text-xs mt-1">
                              {crypto.storageType === 'Exchange' ? crypto.exchangeName : crypto.storageType}
                            </span>
                          </div>
                        </td>
                        <td className="py-4 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                          <div className="flex justify-center space-x-2">
                            <button
                              onClick={() => toggleFavorite(crypto.id)}
                              className={`p-2 rounded-full hover:bg-gray-600 transition-colors ${crypto.isFavorite ? 'text-yellow-400' : 'text-gray-400'}`}
                              title={crypto.isFavorite ? 'Remove from Favorites' : 'Add to Favorites'}
                            >
                              {crypto.isFavorite ? '★' : '☆'}
                            </button>
                            <button
                              onClick={() => openEditModal(crypto)}
                              className="p-2 bg-orange-500 rounded-full hover:bg-orange-600 transition-colors"
                              title="Edit Crypto"
                            >
                              <PenTool size={16} />
                            </button>
                            <button
                              onClick={() => handleDeleteCrypto(crypto.id)}
                              className="p-2 bg-red-500 rounded-full hover:bg-red-600 transition-colors"
                              title="Delete Crypto"
                            >
                              <Trash size={16} />
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

        {/* Security Tips */}
        <div className="bg-gray-800 p-6 rounded-xl shadow-lg">
          <div className="flex items-start">
            <Shield className="mr-4 text-green-400 flex-shrink-0" size={24} />
            <div>
              <h2 className="text-xl font-semibold mb-2">Crypto Security Tips</h2>
              <ul className="space-y-2 text-gray-300">
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>Consider using hardware wallets for long-term or high-value crypto storage</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>Enable two-factor authentication on all exchange accounts</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>Never share your private keys or recovery phrases with anyone</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>Be cautious of phishing attempts and always verify URLs before logging in</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Add Crypto Modal */}
      {isAddCryptoModalOpen && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-gray-800 p-6 rounded-xl shadow-lg w-full max-w-md">
            <h2 className="text-xl font-semibold mb-4">Add New Cryptocurrency</h2>
            {error && <p className="text-red-500 mb-4">{error}</p>}
            <form onSubmit={handleAddCrypto} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Cryptocurrency</label>
                <select
                  value={coinType}
                  onChange={(e) => setCoinType(e.target.value)}
                  className="w-full p-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                >
                  <option value="Bitcoin">Bitcoin (BTC)</option>
                  <option value="Ethereum">Ethereum (ETH)</option>
                  <option value="Solana">Solana (SOL)</option>
                  <option value="Cardano">Cardano (ADA)</option>
                  <option value="Ripple">Ripple (XRP)</option>
                  <option value="Polkadot">Polkadot (DOT)</option>
                  <option value="Avalanche">Avalanche (AVAX)</option>
                  <option value="Dogecoin">Dogecoin (DOGE)</option>
                </select>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Quantity</label>
                  <input
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="w-full p-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                    placeholder="1.0"
                    step="any"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Current Price: {formatCurrency(getCurrentPrice(coinType))}</label>
                  <input
                    type="number"
                    value={purchasePrice}
                    onChange={(e) => setPurchasePrice(e.target.value)}
                    className="w-full p-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                    placeholder="Purchase price per coin"
                    step="any"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Purchase Date</label>
                  <input
                    type="date"
                    value={purchaseDate}
                    onChange={(e) => setPurchaseDate(e.target.value)}
                    className="w-full p-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                    max={new Date().toISOString().split('T')[0]}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Storage Type</label>
                  <select
                    value={storageType}
                    onChange={(e) => setStorageType(e.target.value)}
                    className="w-full p-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  >
                    <option value="Cold Wallet">Cold Wallet</option>
                    <option value="Hot Wallet">Hot Wallet</option>
                    <option value="Exchange">Exchange</option>
                    <option value="Paper Wallet">Paper Wallet</option>
                    <option value="Hardware Wallet">Hardware Wallet</option>
                  </select>
                </div>
              </div>
              
              {storageType === 'Exchange' ? (
                <div>
                  <label className="block text-sm font-medium mb-1">Exchange Name</label>
                  <select
                    value={exchangeName}
                    onChange={(e) => setExchangeName(e.target.value)}
                    className="w-full p-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  >
                    <option value="">Select Exchange</option>
                    <option value="Coinbase">Coinbase</option>
                    <option value="Binance">Binance</option>
                    <option value="Kraken">Kraken</option>
                    <option value="Gemini">Gemini</option>
                    <option value="FTX">FTX</option>
                    <option value="Crypto.com">Crypto.com</option>
                    <option value="Bitfinex">Bitfinex</option>
                    <option value="KuCoin">KuCoin</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium mb-1">Wallet Address (optional)</label>
                  <input
                    type="text"
                    value={walletAddress}
                    onChange={(e) => setWalletAddress(e.target.value)}
                    className="w-full p-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                    placeholder="3FZbgi29cp..."
                  />
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium mb-1">Notes (optional)</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full p-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  placeholder="Hardware wallet details, staking information, etc."
                  rows="2"
                ></textarea>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Tags (optional)</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {tags.map(tag => (
                    <span key={tag} className="bg-blue-500/30 text-blue-200 px-2 py-1 rounded-full text-xs flex items-center">
                      {tag}
                      <button 
                        type="button" 
                        className="ml-1 text-blue-200 hover:text-white"
                        onClick={() => handleRemoveTag(tag)}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex">
                  <input
                    type="text"
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    className="flex-grow p-2 bg-gray-700 border border-gray-600 rounded-l-lg text-white"
                    placeholder="Add a tag (e.g., Long Term, DeFi)"
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                  />
                  <button
                    type="button"
                    onClick={handleAddTag}
                    className="bg-blue-600 text-white px-3 rounded-r-lg"
                  >
                    Add
                  </button>
                </div>
              </div>
              
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="favorite"
                  checked={isFavorite}
                  onChange={(e) => setIsFavorite(e.target.checked)}
                  className="mr-2"
                />
                <label htmlFor="favorite" className="text-sm">Mark as favorite</label>
              </div>
              
              <div className="flex justify-end space-x-4 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    resetForm();
                    setIsAddCryptoModalOpen(false);
                  }}
                  className="px-4 py-2 border border-gray-600 rounded-lg hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
                >
                  Add Crypto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Crypto Modal */}
      {isEditCryptoModalOpen && selectedCrypto && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-gray-800 p-6 rounded-xl shadow-lg w-full max-w-md">
            <h2 className="text-xl font-semibold mb-4">Edit Cryptocurrency</h2>
            {error && <p className="text-red-500 mb-4">{error}</p>}
            <form onSubmit={handleEditCrypto} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Cryptocurrency</label>
                <select
                  value={coinType}
                  onChange={(e) => setCoinType(e.target.value)}
                  className="w-full p-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                >
                  <option value="Bitcoin">Bitcoin (BTC)</option>
                  <option value="Ethereum">Ethereum (ETH)</option>
                  <option value="Solana">Solana (SOL)</option>
                  <option value="Cardano">Cardano (ADA)</option>
                  <option value="Ripple">Ripple (XRP)</option>
                  <option value="Polkadot">Polkadot (DOT)</option>
                  <option value="Avalanche">Avalanche (AVAX)</option>
                  <option value="Dogecoin">Dogecoin (DOGE)</option>
                </select>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Quantity</label>
                  <input
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="w-full p-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                    step="any"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Current Price: {formatCurrency(getCurrentPrice(coinType))}</label>
                  <input
                    type="number"
                    value={purchasePrice}
                    onChange={(e) => setPurchasePrice(e.target.value)}
                    className="w-full p-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                    placeholder="Purchase price per coin"
                    step="any"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Purchase Date</label>
                  <input
                    type="date"
                    value={purchaseDate}
                    onChange={(e) => setPurchaseDate(e.target.value)}
                    className="w-full p-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                    max={new Date().toISOString().split('T')[0]}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Storage Type</label>
                  <select
                    value={storageType}
                    onChange={(e) => setStorageType(e.target.value)}
                    className="w-full p-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  >
                    <option value="Cold Wallet">Cold Wallet</option>
                    <option value="Hot Wallet">Hot Wallet</option>
                    <option value="Exchange">Exchange</option>
                    <option value="Paper Wallet">Paper Wallet</option>
                    <option value="Hardware Wallet">Hardware Wallet</option>
                  </select>
                </div>
              </div>
              
              {storageType === 'Exchange' ? (
                <div>
                  <label className="block text-sm font-medium mb-1">Exchange Name</label>
                  <select
                    value={exchangeName}
                    onChange={(e) => setExchangeName(e.target.value)}
                    className="w-full p-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  >
                    <option value="">Select Exchange</option>
                    <option value="Coinbase">Coinbase</option>
                    <option value="Binance">Binance</option>
                    <option value="Kraken">Kraken</option>
                    <option value="Gemini">Gemini</option>
                    <option value="FTX">FTX</option>
                    <option value="Crypto.com">Crypto.com</option>
                    <option value="Bitfinex">Bitfinex</option>
                    <option value="KuCoin">KuCoin</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium mb-1">Wallet Address (optional)</label>
                  <input
                    type="text"
                    value={walletAddress}
                    onChange={(e) => setWalletAddress(e.target.value)}
                    className="w-full p-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  />
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium mb-1">Notes (optional)</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full p-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  rows="2"
                ></textarea>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Tags (optional)</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {tags.map(tag => (
                    <span key={tag} className="bg-blue-500/30 text-blue-200 px-2 py-1 rounded-full text-xs flex items-center">
                      {tag}
                      <button 
                        type="button" 
                        className="ml-1 text-blue-200 hover:text-white"
                        onClick={() => handleRemoveTag(tag)}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex">
                  <input
                    type="text"
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    className="flex-grow p-2 bg-gray-700 border border-gray-600 rounded-l-lg text-white"
                    placeholder="Add a tag (e.g., Long Term, DeFi)"
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                  />
                  <button
                    type="button"
                    onClick={handleAddTag}
                    className="bg-blue-600 text-white px-3 rounded-r-lg"
                  >
                    Add
                  </button>
                </div>
              </div>
              
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="favorite-edit"
                  checked={isFavorite}
                  onChange={(e) => setIsFavorite(e.target.checked)}
                  className="mr-2"
                />
                <label htmlFor="favorite-edit" className="text-sm">Mark as favorite</label>
              </div>
              
              <div className="flex justify-end space-x-4 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    resetForm();
                    setIsEditCryptoModalOpen(false);
                    setSelectedCrypto(null);
                  }}
                  className="px-4 py-2 border border-gray-600 rounded-lg hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Crypto Detail Modal */}
      {isCryptoDetailModalOpen && selectedCrypto && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-gray-800 p-6 rounded-xl shadow-lg w-full max-w-xl">
            <div className="flex justify-between items-start mb-6">
              <div className="flex items-center">
                <span className={`text-3xl ${getCoinColor(selectedCrypto.coinType)} mr-4`}>
                  {selectedCrypto.coinIcon}
                </span>
                <div>
                  <h2 className="text-2xl font-bold flex items-center">
                    {selectedCrypto.coinType}
                    {selectedCrypto.isFavorite && (
                      <span className="ml-2 text-yellow-400">★</span>
                    )}
                  </h2>
                  <p className="text-gray-400">{selectedCrypto.coinSymbol}</p>
                </div>
              </div>
              <button 
                onClick={() => setIsCryptoDetailModalOpen(false)}
                className="text-gray-400 hover:text-white"
              >
                ×
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="bg-gray-700 p-4 rounded-lg">
                <h3 className="text-sm text-gray-400 mb-1">Total Value</h3>
                <p className="text-xl font-bold">{formatCurrency(selectedCrypto.totalValue)}</p>
              </div>
              
              <div className="bg-gray-700 p-4 rounded-lg">
                <h3 className="text-sm text-gray-400 mb-1">Gain/Loss</h3>
                <p className={`text-xl font-bold ${selectedCrypto.gainLoss >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {selectedCrypto.gainLoss >= 0 ? "+" : ""}{formatCurrency(selectedCrypto.gainLoss)} ({selectedCrypto.gainLossPercent.toFixed(2)}%)
                </p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-gray-700 p-4 rounded-lg">
                <h3 className="text-sm text-gray-400 mb-1">Quantity</h3>
                <p className="text-lg">{selectedCrypto.quantity.toLocaleString()} {selectedCrypto.coinSymbol}</p>
              </div>
              
              <div className="bg-gray-700 p-4 rounded-lg">
                <h3 className="text-sm text-gray-400 mb-1">Purchase Price</h3>
                <p className="text-lg">{formatCurrency(selectedCrypto.purchasePrice)}</p>
              </div>
              
              <div className="bg-gray-700 p-4 rounded-lg">
                <h3 className="text-sm text-gray-400 mb-1">Current Price</h3>
                <p className="text-lg">{formatCurrency(selectedCrypto.currentPrice)}</p>
              </div>
              
              <div className="bg-gray-700 p-4 rounded-lg">
                <h3 className="text-sm text-gray-400 mb-1">Purchase Date</h3>
                <p className="text-lg">{new Date(selectedCrypto.purchaseDate).toLocaleDateString()}</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="bg-gray-700 p-4 rounded-lg">
                <h3 className="text-sm text-gray-400 mb-1">Storage</h3>
                <div className="flex items-center mt-2">
                  <span className={selectedCrypto.storageType === 'Exchange' ? 'text-yellow-400' : 'text-green-400'}>
                    {selectedCrypto.storageType === 'Exchange' ? <Wallet size={20} className="mr-2" /> : <Shield size={20} className="mr-2" />}
                  </span>
                  <span>
                    {selectedCrypto.storageType === 'Exchange' ? 
                      `${selectedCrypto.exchangeName} Exchange` : 
                      selectedCrypto.storageType
                    }
                  </span>
                </div>
                {selectedCrypto.walletAddress && (
                  <div className="mt-2 text-sm">
                    <span className="text-gray-400">Address: </span>
                    <span className="font-mono">{selectedCrypto.walletAddress}</span>
                  </div>
                )}
              </div>
              
              <div className="bg-gray-700 p-4 rounded-lg">
                <h3 className="text-sm text-gray-400 mb-1">Tags</h3>
                <div className="flex flex-wrap gap-2 mt-2">
                  {selectedCrypto.tags && selectedCrypto.tags.length > 0 ? (
                    selectedCrypto.tags.map(tag => (
                      <span key={tag} className="bg-blue-500/30 text-blue-200 px-2 py-1 rounded-full text-xs">
                        {tag}
                      </span>
                    ))
                  ) : (
                    <span className="text-gray-500">No tags</span>
                  )}
                </div>
              </div>
            </div>
            
            {selectedCrypto.notes && (
              <div className="bg-gray-700 p-4 rounded-lg mb-6">
                <h3 className="text-sm text-gray-400 mb-1">Notes</h3>
                <p className="whitespace-pre-line">{selectedCrypto.notes}</p>
              </div>
            )}
            
            <div className="flex justify-end space-x-4">
              <button
                onClick={() => {
                  setIsCryptoDetailModalOpen(false);
                  openEditModal(selectedCrypto);
                }}
                className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600"
              >
                Edit
              </button>
              <button
                onClick={() => setIsCryptoDetailModalOpen(false)}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}