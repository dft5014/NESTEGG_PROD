// pages/real-estate.js
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useContext } from 'react';
import { AuthContext } from '@/context/AuthContext';
import { Building2, Home, Plus, PenTool, Trash, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import { Line } from 'react-chartjs-2';
import 'chart.js/auto';

export default function RealEstate() {
  const { user } = useContext(AuthContext);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [properties, setProperties] = useState([]);
  const [isAddPropertyModalOpen, setIsAddPropertyModalOpen] = useState(false);
  const [isEditPropertyModalOpen, setIsEditPropertyModalOpen] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [error, setError] = useState(null);
  
  // Form state for adding/editing properties
  const [propertyName, setPropertyName] = useState('');
  const [propertyAddress, setPropertyAddress] = useState('');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [mortgageBalance, setMortgageBalance] = useState('');
  const [yearAcquired, setYearAcquired] = useState('');
  const [propertyType, setPropertyType] = useState('Single Family');
  
  // Chart timeframe state
  const [selectedTimeframe, setSelectedTimeframe] = useState("1Y");

  // Mock data for demonstration purposes
  useEffect(() => {
    // In a real implementation, we would fetch from API
    setTimeout(() => {
      setProperties([
        {
          id: 1,
          name: 'Primary Residence',
          address: '123 Main St, Austin, TX 78701',
          purchasePrice: 450000,
          currentValue: 520000,
          zestimate: 510000,
          redfinEstimate: 525000,
          realtorEstimate: 530000,
          mortgageBalance: 380000,
          yearAcquired: 2018,
          type: 'Single Family',
          equity: 520000 - 380000,
          changePercent: ((520000 - 450000) / 450000) * 100
        },
        {
          id: 2,
          name: 'Rental Property',
          address: '456 Oak Dr, Austin, TX 78704',
          purchasePrice: 320000,
          currentValue: 375000,
          zestimate: 370000,
          redfinEstimate: 380000,
          realtorEstimate: 375000,
          mortgageBalance: 250000,
          yearAcquired: 2019,
          type: 'Duplex',
          equity: 375000 - 250000,
          changePercent: ((375000 - 320000) / 320000) * 100
        }
      ]);
      setLoading(false);
    }, 1000);
  }, []);

  // Calculate total portfolio value
  const totalValue = properties.reduce((sum, property) => sum + property.currentValue, 0);
  const totalEquity = properties.reduce((sum, property) => sum + (property.currentValue - property.mortgageBalance), 0);

  // Mock time-series data for charts
  const getChartData = (timeframe) => {
    // This would be replaced with actual historical data in a real implementation
    const months = timeframe === "1Y" ? 12 : (timeframe === "5Y" ? 60 : 24);
    const labels = Array.from({ length: months }, (_, i) => {
      const date = new Date();
      date.setMonth(date.getMonth() - (months - i - 1));
      return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    });
    
    // Generate mock data that shows general upward trend
    const data = Array.from({ length: months }, (_, i) => {
      // Start with base value and add general trend plus some randomness
      let baseValue = totalValue * 0.8; // Start at 80% of current value
      const trendFactor = i / (months - 1); // 0 to 1 over time period
      const randomFactor = Math.random() * 0.05 - 0.025; // -2.5% to +2.5% random fluctuation
      return baseValue + (totalValue - baseValue) * trendFactor + baseValue * randomFactor;
    });
    
    return {
      labels,
      datasets: [
        {
          label: 'Portfolio Value ($)',
          data,
          borderColor: '#4A90E2',
          backgroundColor: 'rgba(74, 144, 226, 0.2)',
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

  // Handle adding a new property
  const handleAddProperty = (e) => {
    e.preventDefault();
    
    // Validation
    if (!propertyName || !propertyAddress || !purchasePrice) {
      setError("Please fill out all required fields");
      return;
    }
    
    // Create new property object
    const newProperty = {
      id: properties.length + 1,
      name: propertyName,
      address: propertyAddress,
      purchasePrice: parseFloat(purchasePrice),
      currentValue: parseFloat(purchasePrice), // For demo, we use purchase price as current value
      zestimate: parseFloat(purchasePrice) * 0.98,
      redfinEstimate: parseFloat(purchasePrice) * 1.02,
      realtorEstimate: parseFloat(purchasePrice),
      mortgageBalance: parseFloat(mortgageBalance) || 0,
      yearAcquired: yearAcquired,
      type: propertyType,
      equity: parseFloat(purchasePrice) - (parseFloat(mortgageBalance) || 0),
      changePercent: 0
    };
    
    // Add to properties array
    setProperties([...properties, newProperty]);
    
    // Reset form and close modal
    resetForm();
    setIsAddPropertyModalOpen(false);
  };

  // Handle editing an existing property
  const handleEditProperty = (e) => {
    e.preventDefault();
    
    if (!propertyName || !propertyAddress || !purchasePrice) {
      setError("Please fill out all required fields");
      return;
    }
    
    // Update property
    const updatedProperties = properties.map(property => {
      if (property.id === selectedProperty.id) {
        const currentValue = parseFloat(purchasePrice) * 1.05; // Mock 5% appreciation
        return {
          ...property,
          name: propertyName,
          address: propertyAddress,
          purchasePrice: parseFloat(purchasePrice),
          currentValue: currentValue,
          zestimate: currentValue * 0.98,
          redfinEstimate: currentValue * 1.02,
          realtorEstimate: currentValue,
          mortgageBalance: parseFloat(mortgageBalance) || 0,
          yearAcquired: yearAcquired,
          type: propertyType,
          equity: currentValue - (parseFloat(mortgageBalance) || 0),
          changePercent: ((currentValue - parseFloat(purchasePrice)) / parseFloat(purchasePrice)) * 100
        };
      }
      return property;
    });
    
    setProperties(updatedProperties);
    resetForm();
    setIsEditPropertyModalOpen(false);
  };

  // Handle deleting a property
  const handleDeleteProperty = (propertyId) => {
    if (confirm("Are you sure you want to delete this property?")) {
      setProperties(properties.filter(property => property.id !== propertyId));
    }
  };

  // Open edit modal with property data
  const openEditModal = (property) => {
    setSelectedProperty(property);
    setPropertyName(property.name);
    setPropertyAddress(property.address);
    setPurchasePrice(property.purchasePrice.toString());
    setMortgageBalance(property.mortgageBalance.toString());
    setYearAcquired(property.yearAcquired.toString());
    setPropertyType(property.type);
    setIsEditPropertyModalOpen(true);
  };

  // Reset form fields
  const resetForm = () => {
    setPropertyName('');
    setPropertyAddress('');
    setPurchasePrice('');
    setMortgageBalance('');
    setYearAcquired('');
    setPropertyType('Single Family');
    setError(null);
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="bg-gray-800 p-8 rounded-xl shadow-lg text-center">
          <Building2 className="w-16 h-16 mx-auto text-blue-500 mb-4" />
          <h1 className="text-2xl font-bold text-white mb-4">Real Estate Portfolio Tracking</h1>
          <p className="text-gray-300 mb-6">Please log in to view your real estate portfolio.</p>
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
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold flex items-center">
              <Building2 className="mr-4 text-blue-500" />
              Real Estate Portfolio
            </h1>
            <p className="text-gray-400 mt-2">Track and manage your real estate investments</p>
          </div>
          <button
            onClick={() => setIsAddPropertyModalOpen(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center"
          >
            <Plus className="mr-2" size={18} />
            Add Property
          </button>
        </div>

        {/* Portfolio Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-gray-800 p-6 rounded-xl shadow-lg">
            <h2 className="text-lg text-gray-400 mb-2">Total Portfolio Value</h2>
            <p className="text-3xl font-bold">${totalValue.toLocaleString()}</p>
            <div className="mt-2 text-green-400 flex items-center">
              <TrendingUp size={16} className="mr-1" />
              <span>+15.3% past year</span>
            </div>
          </div>
          
          <div className="bg-gray-800 p-6 rounded-xl shadow-lg">
            <h2 className="text-lg text-gray-400 mb-2">Total Equity</h2>
            <p className="text-3xl font-bold">${totalEquity.toLocaleString()}</p>
            <div className="mt-2 text-green-400 flex items-center">
              <TrendingUp size={16} className="mr-1" />
              <span>+23.7% past year</span>
            </div>
          </div>
          
          <div className="bg-gray-800 p-6 rounded-xl shadow-lg">
            <h2 className="text-lg text-gray-400 mb-2">Properties</h2>
            <p className="text-3xl font-bold">{properties.length}</p>
            <div className="mt-2 text-gray-400">
              <span>Total mortgage debt: ${properties.reduce((sum, p) => sum + p.mortgageBalance, 0).toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Portfolio Value Chart */}
        <div className="bg-gray-800 p-6 rounded-xl shadow-lg mb-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">Portfolio Value History</h2>
            <div className="flex space-x-2">
              {["1Y", "2Y", "5Y"].map((time) => (
                <button
                  key={time}
                  className={`px-3 py-1 rounded ${selectedTimeframe === time ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'}`}
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

        {/* Properties Table */}
        <div className="bg-gray-800 rounded-xl shadow-lg overflow-hidden">
          <h2 className="text-xl font-semibold p-6 border-b border-gray-700">Your Properties</h2>
          
          {loading ? (
            <div className="p-6 text-center">
              <p>Loading properties...</p>
            </div>
          ) : properties.length === 0 ? (
            <div className="p-6 text-center">
              <p>No properties found. Add your first property to get started.</p>
              <button
                onClick={() => setIsAddPropertyModalOpen(true)}
                className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Add Your First Property
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-700">
                  <tr>
                    <th className="py-3 px-4 text-left">Property</th>
                    <th className="py-3 px-4 text-right">Purchase Price</th>
                    <th className="py-3 px-4 text-right">Current Value</th>
                    <th className="py-3 px-4 text-right">Mortgage Balance</th>
                    <th className="py-3 px-4 text-right">Equity</th>
                    <th className="py-3 px-4 text-right">Gain/Loss</th>
                    <th className="py-3 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {properties.map((property) => (
                    <tr key={property.id} className="border-t border-gray-700 hover:bg-gray-700/50">
                      <td className="py-4 px-4">
                        <div className="font-medium">{property.name}</div>
                        <div className="text-sm text-gray-400">{property.address}</div>
                        <div className="text-xs text-gray-500">{property.type} • Acquired {property.yearAcquired}</div>
                      </td>
                      <td className="py-4 px-4 text-right">${property.purchasePrice.toLocaleString()}</td>
                      <td className="py-4 px-4 text-right">
                        <div>${property.currentValue.toLocaleString()}</div>
                        <div className="text-xs text-gray-400 mt-1">
                          Zestimate: ${property.zestimate.toLocaleString()} • 
                          Redfin: ${property.redfinEstimate.toLocaleString()}
                        </div>
                      </td>
                      <td className="py-4 px-4 text-right">${property.mortgageBalance.toLocaleString()}</td>
                      <td className="py-4 px-4 text-right">${property.equity.toLocaleString()}</td>
                      <td className="py-4 px-4 text-right">
                        <div className={property.changePercent >= 0 ? "text-green-400" : "text-red-400"}>
                          {property.changePercent >= 0 ? "+" : ""}{property.changePercent.toFixed(1)}%
                        </div>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <div className="flex justify-center space-x-2">
                          <button
                            onClick={() => openEditModal(property)}
                            className="p-2 bg-blue-500 rounded-full hover:bg-blue-600 transition-colors"
                            title="Edit Property"
                          >
                            <PenTool size={16} />
                          </button>
                          <button
                            onClick={() => handleDeleteProperty(property.id)}
                            className="p-2 bg-red-500 rounded-full hover:bg-red-600 transition-colors"
                            title="Delete Property"
                          >
                            <Trash size={16} />
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
      </div>

      {/* Add Property Modal */}
      {isAddPropertyModalOpen && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-6 rounded-xl shadow-lg w-full max-w-md">
            <h2 className="text-xl font-semibold mb-4">Add New Property</h2>
            {error && <p className="text-red-500 mb-4">{error}</p>}
            <form onSubmit={handleAddProperty}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Property Name</label>
                  <input
                    type="text"
                    value={propertyName}
                    onChange={(e) => setPropertyName(e.target.value)}
                    className="w-full p-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                    placeholder="Primary Residence, Rental #1, etc."
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Address</label>
                  <input
                    type="text"
                    value={propertyAddress}
                    onChange={(e) => setPropertyAddress(e.target.value)}
                    className="w-full p-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                    placeholder="123 Main St, Anytown, US 12345"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Purchase Price ($)</label>
                    <input
                      type="number"
                      value={purchasePrice}
                      onChange={(e) => setPurchasePrice(e.target.value)}
                      className="w-full p-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                      placeholder="350000"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Mortgage Balance ($)</label>
                    <input
                      type="number"
                      value={mortgageBalance}
                      onChange={(e) => setMortgageBalance(e.target.value)}
                      className="w-full p-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                      placeholder="280000"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Year Acquired</label>
                    <input
                      type="number"
                      value={yearAcquired}
                      onChange={(e) => setYearAcquired(e.target.value)}
                      className="w-full p-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                      placeholder="2020"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Property Type</label>
                    <select
                      value={propertyType}
                      onChange={(e) => setPropertyType(e.target.value)}
                      className="w-full p-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                    >
                      <option value="Single Family">Single Family</option>
                      <option value="Condo">Condo</option>
                      <option value="Townhouse">Townhouse</option>
                      <option value="Duplex">Duplex</option>
                      <option value="Multifamily">Multifamily</option>
                      <option value="Commercial">Commercial</option>
                      <option value="Land">Land</option>
                    </select>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end space-x-4 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    resetForm();
                    setIsAddPropertyModalOpen(false);
                  }}
                  className="px-4 py-2 border border-gray-600 rounded-lg hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Add Property
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Property Modal */}
      {isEditPropertyModalOpen && selectedProperty && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-6 rounded-xl shadow-lg w-full max-w-md">
            <h2 className="text-xl font-semibold mb-4">Edit Property</h2>
            {error && <p className="text-red-500 mb-4">{error}</p>}
            <form onSubmit={handleEditProperty}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Property Name</label>
                  <input
                    type="text"
                    value={propertyName}
                    onChange={(e) => setPropertyName(e.target.value)}
                    className="w-full p-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Address</label>
                  <input
                    type="text"
                    value={propertyAddress}
                    onChange={(e) => setPropertyAddress(e.target.value)}
                    className="w-full p-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Purchase Price ($)</label>
                    <input
                      type="number"
                      value={purchasePrice}
                      onChange={(e) => setPurchasePrice(e.target.value)}
                      className="w-full p-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Mortgage Balance ($)</label>
                    <input
                      type="number"
                      value={mortgageBalance}
                      onChange={(e) => setMortgageBalance(e.target.value)}
                      className="w-full p-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Year Acquired</label>
                    <input
                      type="number"
                      value={yearAcquired}
                      onChange={(e) => setYearAcquired(e.target.value)}
                      className="w-full p-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Property Type</label>
                    <select
                      value={propertyType}
                      onChange={(e) => setPropertyType(e.target.value)}
                      className="w-full p-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                    >
                      <option value="Single Family">Single Family</option>
                      <option value="Condo">Condo</option>
                      <option value="Townhouse">Townhouse</option>
                      <option value="Duplex">Duplex</option>
                      <option value="Multifamily">Multifamily</option>
                      <option value="Commercial">Commercial</option>
                      <option value="Land">Land</option>
                    </select>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end space-x-4 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    resetForm();
                    setIsEditPropertyModalOpen(false);
                    setSelectedProperty(null);
                  }}
                  className="px-4 py-2 border border-gray-600 rounded-lg hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}