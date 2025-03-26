// pages/metals.js
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useContext } from 'react';
import { AuthContext } from '@/context/AuthContext';
import { Gem, Plus, PenTool, Trash, TrendingUp, TrendingDown, DollarSign, Scale } from 'lucide-react';
import { Line } from 'react-chartjs-2';
import 'chart.js/auto';

export default function Metals() {
  const { user } = useContext(AuthContext);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [metals, setMetals] = useState([]);
  const [isAddMetalModalOpen, setIsAddMetalModalOpen] = useState(false);
  const [isEditMetalModalOpen, setIsEditMetalModalOpen] = useState(false);
  const [selectedMetal, setSelectedMetal] = useState(null);
  const [error, setError] = useState(null);
  
  // Form state for adding/editing metals
  const [metalType, setMetalType] = useState('Gold');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState('oz');
  const [purity, setPurity] = useState('999');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [purchaseDate, setPurchaseDate] = useState('');
  const [storageLocation, setStorageLocation] = useState('Home Safe');
  const [description, setDescription] = useState('');
  
  // Chart timeframe state
  const [selectedTimeframe, setSelectedTimeframe] = useState("1Y");

  // Mock data for demonstration purposes
  useEffect(() => {
    // In a real implementation, we would fetch from API
    setTimeout(() => {
      setMetals([
        {
          id: 1,
          metalType: 'Gold',
          quantity: 10,
          unit: 'oz',
          purity: '999', // 24K
          purchasePrice: 1750,
          currentPrice: 2250,
          purchaseDate: '2021-06-15',
          storageLocation: 'Home Safe',
          description: 'American Eagle coins',
          totalValue: 10 * 2250,
          gainLoss: (2250 - 1750) * 10,
          gainLossPercent: ((2250 - 1750) / 1750) * 100
        },
        {
          id: 2,
          metalType: 'Silver',
          quantity: 100,
          unit: 'oz',
          purity: '999',
          purchasePrice: 22,
          currentPrice: 28,
          purchaseDate: '2020-03-20',
          storageLocation: 'Safety Deposit Box',
          description: '1oz Silver rounds',
          totalValue: 100 * 28,
          gainLoss: (28 - 22) * 100,
          gainLossPercent: ((28 - 22) / 22) * 100
        },
        {
          id: 3,
          metalType: 'Platinum',
          quantity: 5,
          unit: 'oz',
          purity: '999',
          purchasePrice: 900,
          currentPrice: 950,
          purchaseDate: '2022-01-10',
          storageLocation: 'Home Safe',
          description: 'Platinum bars',
          totalValue: 5 * 950,
          gainLoss: (950 - 900) * 5,
          gainLossPercent: ((950 - 900) / 900) * 100
        }
      ]);
      setLoading(false);
    }, 1000);
  }, []);

  // Calculate total portfolio value
  const totalValue = metals.reduce((sum, metal) => sum + (metal.quantity * metal.currentPrice), 0);
  const totalInvestment = metals.reduce((sum, metal) => sum + (metal.quantity * metal.purchasePrice), 0);
  const totalGainLoss = totalValue - totalInvestment;
  const totalGainLossPercent = totalInvestment > 0 ? (totalGainLoss / totalInvestment) * 100 : 0;

  // Get current price for a metal type (would use actual API in real implementation)
  const getCurrentPrice = (type) => {
    const prices = {
      'Gold': 2250,
      'Silver': 28,
      'Platinum': 950,
      'Palladium': 1050,
      'Copper': 3.75,
      'Rhodium': 9500
    };
    return prices[type] || 0;
  };

  // Mock time-series data for charts
  const getChartData = (timeframe) => {
    // This would be replaced with actual historical data in a real implementation
    const months = timeframe === "1Y" ? 12 : (timeframe === "5Y" ? 60 : 36);
    const labels = Array.from({ length: months }, (_, i) => {
      const date = new Date();
      date.setMonth(date.getMonth() - (months - i - 1));
      return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    });
    
    // Generate mock data that shows volatile precious metals market
    const data = Array.from({ length: months }, (_, i) => {
      // Start with base value and add more volatile trends compared to real estate
      let baseValue = totalValue * 0.6; // Start at 60% of current value
      const trendFactor = i / (months - 1); // 0 to 1 over time period
      const randomFactor = Math.random() * 0.2 - 0.1; // -10% to +10% random fluctuation
      const sineCycle = Math.sin(i / months * Math.PI * 3) * 0.15; // Add cyclical pattern
      return baseValue + (totalValue - baseValue) * trendFactor + baseValue * randomFactor + baseValue * sineCycle;
    });
    
    return {
      labels,
      datasets: [
        {
          label: 'Portfolio Value ($)',
          data,
          borderColor: '#9F7AEA', // Purple for precious metals
          backgroundColor: 'rgba(159, 122, 234, 0.2)',
          borderWidth: 2,
          pointRadius: 1,
          pointHoverRadius: 5,
          tension: 0.3,
          fill: true
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
          callback: (value) => `$${value.toLocaleString()}`
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
          label: (context) => `Value: $${context.parsed.y.toLocaleString()}`
        }
      }
    }
  };

  // Handle adding a new metal
  const handleAddMetal = (e) => {
    e.preventDefault();
    
    // Validation
    if (!metalType || !quantity || !purchasePrice || !purchaseDate) {
      setError("Please fill out all required fields");
      return;
    }
    
    // Get current market price
    const currentPrice = getCurrentPrice(metalType);
    
    // Create new metal object
    const newMetal = {
      id: metals.length + 1,
      metalType,
      quantity: parseFloat(quantity),
      unit,
      purity,
      purchasePrice: parseFloat(purchasePrice),
      currentPrice,
      purchaseDate,
      storageLocation,
      description,
      totalValue: parseFloat(quantity) * currentPrice,
      gainLoss: (currentPrice - parseFloat(purchasePrice)) * parseFloat(quantity),
      gainLossPercent: ((currentPrice - parseFloat(purchasePrice)) / parseFloat(purchasePrice)) * 100
    };
    
    // Add to metals array
    setMetals([...metals, newMetal]);
    
    // Reset form and close modal
    resetForm();
    setIsAddMetalModalOpen(false);
  };

  // Handle editing an existing metal
  const handleEditMetal = (e) => {
    e.preventDefault();
    
    if (!metalType || !quantity || !purchasePrice || !purchaseDate) {
      setError("Please fill out all required fields");
      return;
    }
    
    // Get current market price
    const currentPrice = getCurrentPrice(metalType);
    
    // Update metal
    const updatedMetals = metals.map(metal => {
      if (metal.id === selectedMetal.id) {
        return {
          ...metal,
          metalType,
          quantity: parseFloat(quantity),
          unit,
          purity,
          purchasePrice: parseFloat(purchasePrice),
          currentPrice,
          purchaseDate,
          storageLocation,
          description,
          totalValue: parseFloat(quantity) * currentPrice,
          gainLoss: (currentPrice - parseFloat(purchasePrice)) * parseFloat(quantity),
          gainLossPercent: ((currentPrice - parseFloat(purchasePrice)) / parseFloat(purchasePrice)) * 100
        };
      }
      return metal;
    });
    
    setMetals(updatedMetals);
    resetForm();
    setIsEditMetalModalOpen(false);
  };

  // Handle deleting a metal
  const handleDeleteMetal = (metalId) => {
    if (confirm("Are you sure you want to delete this metal holding?")) {
      setMetals(metals.filter(metal => metal.id !== metalId));
    }
  };

  // Open edit modal with metal data
  const openEditModal = (metal) => {
    setSelectedMetal(metal);
    setMetalType(metal.metalType);
    setQuantity(metal.quantity.toString());
    setUnit(metal.unit);
    setPurity(metal.purity);
    setPurchasePrice(metal.purchasePrice.toString());
    setPurchaseDate(metal.purchaseDate);
    setStorageLocation(metal.storageLocation);
    setDescription(metal.description);
    setIsEditMetalModalOpen(true);
  };

  // Reset form fields
  const resetForm = () => {
    setMetalType('Gold');
    setQuantity('');
    setUnit('oz');
    setPurity('999');
    setPurchasePrice('');
    setPurchaseDate('');
    setStorageLocation('Home Safe');
    setDescription('');
    setError(null);
  };

  // Helper to get metal type icon and color
  const getMetalTypeStyle = (type) => {
    const styles = {
      'Gold': { color: 'text-yellow-400', bgColor: 'bg-yellow-900', icon: '🥇' },
      'Silver': { color: 'text-gray-300', bgColor: 'bg-gray-700', icon: '🥈' },
      'Platinum': { color: 'text-blue-200', bgColor: 'bg-blue-900', icon: '💎' },
      'Palladium': { color: 'text-gray-200', bgColor: 'bg-gray-800', icon: '⚙️' },
      'Copper': { color: 'text-orange-400', bgColor: 'bg-orange-900', icon: '🔶' },
      'Rhodium': { color: 'text-red-300', bgColor: 'bg-red-900', icon: '🔴' }
    };
    return styles[type] || { color: 'text-purple-400', bgColor: 'bg-purple-900', icon: '💎' };
  };

  // Helper for refreshing metal prices (would connect to real API)
  const refreshPrices = () => {
    // In a real implementation, this would fetch the latest prices from an API
    const updatedMetals = metals.map(metal => {
      const currentPrice = getCurrentPrice(metal.metalType);
      return {
        ...metal,
        currentPrice,
        totalValue: metal.quantity * currentPrice,
        gainLoss: (currentPrice - metal.purchasePrice) * metal.quantity,
        gainLossPercent: ((currentPrice - metal.purchasePrice) / metal.purchasePrice) * 100
      };
    });
    
    setMetals(updatedMetals);
    // Display a success message
    alert("Metal prices refreshed successfully!");
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="bg-gray-800 p-8 rounded-xl shadow-lg text-center">
          <Gem className="w-16 h-16 mx-auto text-purple-500 mb-4" />
          <h1 className="text-2xl font-bold text-white mb-4">Precious Metals Portfolio</h1>
          <p className="text-gray-300 mb-6">Please log in to view your metals portfolio.</p>
          <button 
            onClick={() => router.push('/login')}
            className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 transition-colors"
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
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold flex items-center">
              <Gem className="mr-4 text-purple-500" />
              Precious Metals Portfolio
            </h1>
            <p className="text-gray-400 mt-2">Track and manage your physical precious metals</p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={refreshPrices}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center"
            >
              <DollarSign className="mr-2" size={18} />
              Refresh Prices
            </button>
            <button
              onClick={() => setIsAddMetalModalOpen(true)}
              className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors flex items-center"
            >
              <Plus className="mr-2" size={18} />
              Add Metal
            </button>
          </div>
        </div>

        {/* Portfolio Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-gray-800 p-6 rounded-xl shadow-lg">
            <h2 className="text-lg text-gray-400 mb-2">Total Portfolio Value</h2>
            <p className="text-3xl font-bold">${totalValue.toLocaleString()}</p>
            <div className={`mt-2 flex items-center ${totalGainLossPercent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {totalGainLossPercent >= 0 ? <TrendingUp size={16} className="mr-1" /> : <TrendingDown size={16} className="mr-1" />}
              <span>{totalGainLossPercent >= 0 ? '+' : ''}{totalGainLossPercent.toFixed(1)}% overall</span>
            </div>
          </div>
          
          <div className="bg-gray-800 p-6 rounded-xl shadow-lg">
            <h2 className="text-lg text-gray-400 mb-2">Total Gain/Loss</h2>
            <p className={`text-3xl font-bold ${totalGainLoss >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {totalGainLoss >= 0 ? '+' : ''}{totalGainLoss.toLocaleString('en-US', {
                style: 'currency',
                currency: 'USD',
              })}
            </p>
            <div className="mt-2 text-gray-400">
              <span>Initial investment: ${totalInvestment.toLocaleString()}</span>
            </div>
          </div>
          
          <div className="bg-gray-800 p-6 rounded-xl shadow-lg">
            <h2 className="text-lg text-gray-400 mb-2">Holdings</h2>
            <p className="text-3xl font-bold">{metals.length}</p>
            <div className="mt-2 text-gray-400 flex items-center">
              <Scale size={16} className="mr-1" />
              <span>Total weight: {metals.reduce((sum, m) => sum + m.quantity, 0).toFixed(2)}oz</span>
            </div>
          </div>
        </div>

        {/* Portfolio Value Chart */}
        <div className="bg-gray-800 p-6 rounded-xl shadow-lg mb-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">Portfolio Value History</h2>
            <div className="flex space-x-2">
              {["1Y", "3Y", "5Y"].map((time) => (
                <button
                  key={time}
                  className={`px-3 py-1 rounded ${selectedTimeframe === time ? 'bg-purple-600 text-white' : 'bg-gray-700 text-gray-300'}`}
                  onClick={() => setSelectedTimeframe(time)}
                >
                  {time}
                </button>
              ))}
            </div>
          </div>
          <div className="h-80">
            <Line data={getChartData(selectedTimeframe)} options={chartOptions} />
          </div>
        </div>

        {/* Metals Allocation Breakdown */}
        <div className="bg-gray-800 p-6 rounded-xl shadow-lg mb-8">
          <h2 className="text-xl font-semibold mb-4">Metals Allocation</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {['Gold', 'Silver', 'Platinum', 'Other'].map(metalCategory => {
              // Calculate total for this metal category
              const categoryMetals = metals.filter(m => 
                metalCategory === 'Other' 
                  ? !['Gold', 'Silver', 'Platinum'].includes(m.metalType) 
                  : m.metalType === metalCategory
              );
              const categoryValue = categoryMetals.reduce((sum, m) => sum + m.totalValue, 0);
              const percentage = totalValue > 0 ? (categoryValue / totalValue) * 100 : 0;
              
              // Get style for this metal
              const style = getMetalTypeStyle(metalCategory);
              
              return (
                <div key={metalCategory} className="bg-gray-700 p-4 rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center">
                      <span className={`mr-2 ${style.color}`}>{style.icon}</span>
                      <h3>{metalCategory}</h3>
                    </div>
                    <span className="font-semibold">{percentage.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-gray-600 rounded-full h-2.5">
                    <div 
                      className={`${style.bgColor} h-2.5 rounded-full`} 
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                  <div className="mt-2 text-right">
                    ${categoryValue.toLocaleString()}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Metals Table */}
        <div className="bg-gray-800 rounded-xl shadow-lg overflow-hidden">
          <h2 className="text-xl font-semibold p-6 border-b border-gray-700">Your Metals</h2>
          
          {loading ? (
            <div className="p-6 text-center">
              <p>Loading metals...</p>
            </div>
          ) : metals.length === 0 ? (
            <div className="p-6 text-center">
              <p>No metals found. Add your first precious metal to get started.</p>
              <button
                onClick={() => setIsAddMetalModalOpen(true)}
                className="mt-4 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
              >
                Add Your First Metal
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-700">
                  <tr>
                    <th className="py-3 px-4 text-left">Metal</th>
                    <th className="py-3 px-4 text-right">Quantity</th>
                    <th className="py-3 px-4 text-right">Purchase Price</th>
                    <th className="py-3 px-4 text-right">Current Price</th>
                    <th className="py-3 px-4 text-right">Total Value</th>
                    <th className="py-3 px-4 text-right">Gain/Loss</th>
                    <th className="py-3 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {metals.map((metal) => {
                    const style = getMetalTypeStyle(metal.metalType);
                    
                    return (
                      <tr key={metal.id} className="border-t border-gray-700 hover:bg-gray-700/50">
                        <td className="py-4 px-4">
                          <div className="flex items-center">
                            <span className={`mr-2 text-lg ${style.color}`}>{style.icon}</span>
                            <div>
                              <div className="font-medium">{metal.metalType}</div>
                              <div className="text-sm text-gray-400">{metal.description}</div>
                              <div className="text-xs text-gray-500">Purity: {metal.purity} • Storage: {metal.storageLocation}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4 text-right">{metal.quantity} {metal.unit}</td>
                        <td className="py-4 px-4 text-right">${metal.purchasePrice.toLocaleString()}/{metal.unit}</td>
                        <td className="py-4 px-4 text-right">${metal.currentPrice.toLocaleString()}/{metal.unit}</td>
                        <td className="py-4 px-4 text-right">${metal.totalValue.toLocaleString()}</td>
                        <td className="py-4 px-4 text-right">
                          <div className={metal.gainLoss >= 0 ? "text-green-400" : "text-red-400"}>
                            <div>{metal.gainLoss >= 0 ? "+" : ""}{metal.gainLoss.toLocaleString('en-US', {
                              style: 'currency',
                              currency: 'USD',
                            })}</div>
                            <div className="text-sm">
                              {metal.gainLossPercent >= 0 ? "+" : ""}{metal.gainLossPercent.toFixed(1)}%
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4 text-center">
                          <div className="flex justify-center space-x-2">
                            <button
                              onClick={() => openEditModal(metal)}
                              className="p-2 bg-purple-500 rounded-full hover:bg-purple-600 transition-colors"
                              title="Edit Metal"
                            >
                              <PenTool size={16} />
                            </button>
                            <button
                              onClick={() => handleDeleteMetal(metal.id)}
                              className="p-2 bg-red-500 rounded-full hover:bg-red-600 transition-colors"
                              title="Delete Metal"
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
      </div>

      {/* Add Metal Modal */}
      {isAddMetalModalOpen && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-6 rounded-xl shadow-lg w-full max-w-md">
            <h2 className="text-xl font-semibold mb-4">Add New Metal</h2>
            {error && <p className="text-red-500 mb-4">{error}</p>}
            <form onSubmit={handleAddMetal}>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Metal Type</label>
                    <select
                      value={metalType}
                      onChange={(e) => setMetalType(e.target.value)}
                      className="w-full p-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                    >
                      <option value="Gold">Gold</option>
                      <option value="Silver">Silver</option>
                      <option value="Platinum">Platinum</option>
                      <option value="Palladium">Palladium</option>
                      <option value="Copper">Copper</option>
                      <option value="Rhodium">Rhodium</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Purity</label>
                    <select
                      value={purity}
                      onChange={(e) => setPurity(e.target.value)}
                      className="w-full p-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                    >
                      <option value="999">Fine (999)</option>
                      <option value="995">995 (23.9K)</option>
                      <option value="916">916 (22K)</option>
                      <option value="900">900 (21.6K)</option>
                      <option value="750">750 (18K)</option>
                      <option value="585">585 (14K)</option>
                      <option value="416">416 (10K)</option>
                    </select>
                  </div>
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
                      step="0.01"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Unit</label>
                    <select
                      value={unit}
                      onChange={(e) => setUnit(e.target.value)}
                      className="w-full p-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                    >
                      <option value="oz">Troy Ounce (oz)</option>
                      <option value="g">Gram (g)</option>
                      <option value="kg">Kilogram (kg)</option>
                      <option value="coin">Coin</option>
                      <option value="bar">Bar</option>
                    </select>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Purchase Price per {unit}</label>
                    <input
                      type="number"
                      value={purchasePrice}
                      onChange={(e) => setPurchasePrice(e.target.value)}
                      className="w-full p-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                      placeholder="1500"
                      step="0.01"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Purchase Date</label>
                    <input
                      type="date"
                      value={purchaseDate}
                      onChange={(e) => setPurchaseDate(e.target.value)}
                      className="w-full p-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Storage Location</label>
                  <select
                    value={storageLocation}
                    onChange={(e) => setStorageLocation(e.target.value)}
                    className="w-full p-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  >
                    <option value="Home Safe">Home Safe</option>
                    <option value="Safety Deposit Box">Safety Deposit Box</option>
                    <option value="Vault">Vault</option>
                    <option value="Custodian">Custodian</option>
                    <option value="Mint Storage">Mint Storage</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Description</label>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full p-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                    placeholder="American Eagle coins, bars, etc."
                  />
                </div>
              </div>
              
              <div className="flex justify-end space-x-4 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    resetForm();
                    setIsAddMetalModalOpen(false);
                  }}
                  className="px-4 py-2 border border-gray-600 rounded-lg hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                >
                  Add Metal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Metal Modal */}
      {isEditMetalModalOpen && selectedMetal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-6 rounded-xl shadow-lg w-full max-w-md">
            <h2 className="text-xl font-semibold mb-4">Edit Metal</h2>
            {error && <p className="text-red-500 mb-4">{error}</p>}
            <form onSubmit={handleEditMetal}>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Metal Type</label>
                    <select
                      value={metalType}
                      onChange={(e) => setMetalType(e.target.value)}
                      className="w-full p-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                    >
                      <option value="Gold">Gold</option>
                      <option value="Silver">Silver</option>
                      <option value="Platinum">Platinum</option>
                      <option value="Palladium">Palladium</option>
                      <option value="Copper">Copper</option>
                      <option value="Rhodium">Rhodium</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Purity</label>
                    <select
                      value={purity}
                      onChange={(e) => setPurity(e.target.value)}
                      className="w-full p-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                    >
                      <option value="999">Fine (999)</option>
                      <option value="995">995 (23.9K)</option>
                      <option value="916">916 (22K)</option>
                      <option value="900">900 (21.6K)</option>
                      <option value="750">750 (18K)</option>
                      <option value="585">585 (14K)</option>
                      <option value="416">416 (10K)</option>
                    </select>
                  </div>
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
                      step="0.01"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Unit</label>
                    <select
                      value={unit}
                      onChange={(e) => setUnit(e.target.value)}
                      className="w-full p-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                    >
                      <option value="oz">Troy Ounce (oz)</option>
                      <option value="g">Gram (g)</option>
                      <option value="kg">Kilogram (kg)</option>
                      <option value="coin">Coin</option>
                      <option value="bar">Bar</option>
                    </select>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Purchase Price per {unit}</label>
                    <input
                      type="number"
                      value={purchasePrice}
                      onChange={(e) => setPurchasePrice(e.target.value)}
                      className="w-full p-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                      placeholder="1500"
                      step="0.01"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Purchase Date</label>
                    <input
                      type="date"
                      value={purchaseDate}
                      onChange={(e) => setPurchaseDate(e.target.value)}
                      className="w-full p-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Storage Location</label>
                  <select
                    value={storageLocation}
                    onChange={(e) => setStorageLocation(e.target.value)}
                    className="w-full p-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  >
                    <option value="Home Safe">Home Safe</option>
                    <option value="Safety Deposit Box">Safety Deposit Box</option>
                    <option value="Vault">Vault</option>
                    <option value="Custodian">Custodian</option>
                    <option value="Mint Storage">Mint Storage</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Description</label>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full p-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                    placeholder="American Eagle coins, bars, etc."
                  />
                </div>
              </div>
              
              <div className="flex justify-end space-x-4 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    resetForm();
                    setIsEditMetalModalOpen(false);
                  }}
                  className="px-4 py-2 border border-gray-600 rounded-lg hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Metal Detail Modal - We can add this for showing more details when a user clicks on a metal */}
      {selectedMetal && (
        <div className="metal-detail-modal">
          {/* Metal detail content would go here */}
        </div>
      )}
      
      {/* Market Price History Modal - We can add this to show price charts for individual metals */}
      <div className="market-price-history-modal">
        {/* Price history charts would go here */}
      </div>
    </div>
  );
}