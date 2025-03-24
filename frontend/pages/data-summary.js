import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { 
  ChartLine, 
  RefreshCcw, 
  Search, 
  ArrowUpDown, 
  ExternalLink, 
  PlusCircle,
  BarChart2,
  Info,
  Percent,
  DollarSign,
  TrendingUp,
  Calendar,
  Tag
} from 'lucide-react';
import { Line } from "react-chartjs-2";
import "chart.js/auto";
import SkeletonLoader from '@/components/SkeletonLoader';
import { DataSummarySkeleton } from '@/components/skeletons/DataSummarySkeleton';
import { SecurityDetailSkeleton } from '@/components/skeletons/PortfolioSkeleton';
import ErrorMessage from '@/components/ErrorMessage';
import { fetchWithAuth } from '@/utils/api';

export default function DataSummary() {
  const router = useRouter();
  const [securities, setSecurities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortConfig, setSortConfig] = useState({ key: 'ticker', direction: 'ascending' });
  const [refreshing, setRefreshing] = useState(false);
  const [selectedSecurity, setSelectedSecurity] = useState(null);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [showAddSecurityModal, setShowAddSecurityModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [newSecurity, setNewSecurity] = useState({ ticker: "" });
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [securityDetails, setSecurityDetails] = useState(null);
  const [historicalData, setHistoricalData] = useState([]);

  // Fetch securities function
  const fetchSecurities = async () => {
    setLoading(true);
    setError(null);
    
    try {
      setLoading(true);
      setError(null); // Reset error state
      const response = await fetchWithAuth('/securities');
  
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Failed to fetch securities data");
      }
      
      const data = await response.json();
      if (data && data.securities) {
        setSecurities(data.securities);
      } else {
        setError("Received unexpected data format from server");
      }
    } catch (error) {
      console.error("Error fetching securities:", error);
      if (error instanceof TypeError) {
        setError("Network error. Please check your connection and try again.");
      } else {
        setError(error.message || "Failed to load securities data. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  // Fetch security details
  const fetchSecurityDetails = async (ticker) => {
    setDetailsLoading(true);
    
    try {
      const response = await fetchWithAuth(`/securities/${ticker}/details`);
  
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Failed to fetch security details");
      }
      
      const data = await response.json();
      setSecurityDetails(data);
    } catch (error) {
      setSecurityDetails({
        ticker: ticker,
        last_metrics_update: null,
        days_of_history: 0,
        low_price: null,
        high_price: null,
        avg_price: null,
        pe_ratio: null,
        dividend_yield: null,
        dividend_rate: null,
        market_cap: null,
        price: null,
        message: "No detailed data available. Consider updating the security."
      });
    } finally {
      setDetailsLoading(false);
    }
  };

  // Fetch historical price data for chart
  const fetchHistoricalData = async (ticker) => {
    try {
      const response = await fetchWithAuth(`/securities/${ticker}/history`);
  
      if (!response.ok) {
        throw new Error("Failed to fetch historical data");
      }
      
      const data = await response.json();
      setHistoricalData(data.history || []);
    } catch (error) {
      console.error("Error fetching historical data:", error);
      setHistoricalData([]); // Default to empty if error
    }
  };

  // Calculate percentage changes for KPI
  const calculatePercentageChange = (data, period) => {
    if (!data || data.length < 2) return "N/A";
    
    const today = new Date();
    const periodDates = {
      '1d': new Date(today.setDate(today.getDate() - 1)),
      '1w': new Date(today.setDate(today.getDate() - 7)),
      '1y': new Date(today.setFullYear(today.getFullYear() - 1)),
    };
    
    const sortedData = [...data].sort((a, b) => new Date(b.date) - new Date(a.date)); // Sort by date descending
    const endPrice = sortedData[0]?.close_price || null;
    const startItem = sortedData.find(item => 
      item.date && new Date(item.date) <= periodDates[period]
    );
    const startPrice = startItem?.close_price || null;
    
    if (!endPrice || !startPrice) return "N/A";
    
    const change = ((endPrice - startPrice) / startPrice) * 100;
    return `${change.toFixed(2)}%`;
  };

  // Refresh prices function
  const refreshPrices = async () => {
    setRefreshing(true);
    setError(null);
    
    try {
      const token = localStorage.getItem("token");
      
      if (!token) {
        setError("Authentication required. Please log in to continue.");
        setTimeout(() => router.push("/login"), 2000);
        return;
      }
      
      const response = await fetch(`${apiBaseUrl}/market/update-prices`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Failed to refresh prices");
      }
      
      const data = await response.json();
      // Use a temporary success message that will appear and then disappear
      setError(`Success: ${data.message}`);
      setTimeout(() => setError(null), 3000);
      await fetchSecurities();
    } catch (error) {
      console.error("Error refreshing prices:", error);
      setError(`Failed to refresh prices: ${error.message}`);
    } finally {
      setRefreshing(false);
    }
  };

  // Update individual security
  const updateSecurity = async (ticker, updateType) => {
    setRefreshing(true);
    
    try {
      const token = localStorage.getItem("token");
      
      if (!token) {
        setError("Authentication required. Please log in to continue.");
        setTimeout(() => router.push("/login"), 2000);
        return;
      }
      
      const response = await fetch(`${apiBaseUrl}/securities/${ticker}/update`, {
        method: "POST",
        headers: { 
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json" 
        },
        body: JSON.stringify({ update_type: updateType })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || `Failed to update ${ticker}: ${updateType}`);
      }
      
      const data = await response.json();
      setError(`Success: ${data.message || `${ticker} updated successfully`}`);
      setTimeout(() => setError(null), 3000);
      setShowUpdateModal(false);
      await fetchSecurities();
      
      // If updating the currently selected security, refresh its details
      if (selectedSecurity && selectedSecurity.ticker === ticker) {
        await fetchSecurityDetails(ticker);
        await fetchHistoricalData(ticker);
      }
    } catch (error) {
      console.error("Error updating security:", error);
      setError(`Failed to update ${ticker}: ${error.message}`);
    } finally {
      setRefreshing(false);
    }
  };

  // Add new security
  const addSecurity = async (e) => {
    e.preventDefault();
    
    if (!newSecurity.ticker.trim()) {
      setError("Please enter a valid ticker symbol");
      return;
    }
    
    setRefreshing(true);
    
    try {
      const token = localStorage.getItem("token");
      
      if (!token) {
        setError("Authentication required. Please log in to continue.");
        setTimeout(() => router.push("/login"), 2000);
        return;
      }
      
      const response = await fetch(`${apiBaseUrl}/securities`, {
        method: "POST",
        headers: { 
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json" 
        },
        body: JSON.stringify({ ticker: newSecurity.ticker.toUpperCase() })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Failed to add security");
      }
      
      const data = await response.json();
      // Use a temporary success message
      setError(`Success: ${data.message || "Security added successfully"}`);
      setTimeout(() => setError(null), 3000);
      
      setShowAddSecurityModal(false);
      setNewSecurity({ ticker: "" });
      await fetchSecurities();
    } catch (error) {
      console.error("Error adding security:", error);
      setError(`Failed to add security: ${error.message}`);
    } finally {
      setRefreshing(false);
    }
  };

  // Fetch securities when component mounts
  useEffect(() => {
    fetchSecurities();
  }, []);

  // Sorting, filtering, and formatting logic
  const requestSort = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const filteredSecurities = securities.filter(security => {
    return (
      security.ticker.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (security.company_name && security.company_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (security.sector && security.sector.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (security.industry && security.industry.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  });
  
  const sortedSecurities = [...filteredSecurities].sort((a, b) => {
    if (a[sortConfig.key] === null) return 1;
    if (b[sortConfig.key] === null) return -1;
    
    if (a[sortConfig.key] < b[sortConfig.key]) {
      return sortConfig.direction === 'ascending' ? -1 : 1;
    }
    if (a[sortConfig.key] > b[sortConfig.key]) {
      return sortConfig.direction === 'ascending' ? 1 : -1;
    }
    return 0;
  });

  const getSortIndicator = (key) => {
    if (sortConfig.key !== key) return null;
    return sortConfig.direction === 'ascending' ? '↑' : '↓';
  };

  const formatNumber = (num) => {
    if (num === undefined || num === null) return 'N/A';
    return new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 2 }).format(num);
  };

  // Handle security row click for detail modal
  const handleRowClick = async (security) => {
    setSelectedSecurity(security);
    await fetchSecurityDetails(security.ticker);
    await fetchHistoricalData(security.ticker);
    setShowDetailModal(true);
  };

  // Handle security selection for update
  const handleSecuritySelect = async (security) => {
    setSelectedSecurity(security);
    await fetchSecurityDetails(security.ticker);
    setShowUpdateModal(true);
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen p-6">
        <div className="max-w-8xl mx-auto">
          <header className="mb-8 bg-blue-900 text-white p-4 rounded-lg">
            <div className="flex items-center">
              <ChartLine className="w-6 h-6 text-blue-400 mr-2" />
              <h1 className="text-3xl font-bold">NestEgg Data Summary</h1>
            </div>
            <p className="text-blue-200 mt-2">View and manage your securities data</p>
          </header>
          
          <div className="bg-white rounded-xl shadow-md p-6 mb-8">
            <div className="flex flex-col md:flex-row justify-between items-center mb-6">
              <div className="flex items-center mb-4 md:mb-0">
                <ChartLine className="w-6 h-6 text-blue-600 mr-2" />
                <h2 className="text-xl font-semibold">Securities Data</h2>
              </div>
            </div>
            
            <DataSummarySkeleton />
          </div>
        </div>
      </div>
    );
  }

  // Chart data for historical trends
  const chartData = {
    labels: historicalData.map(item => item.date ? new Date(item.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : 'N/A'),
    datasets: [{
      label: 'Price ($)',
      data: historicalData.map(item => item.close_price || 0),
      borderColor: '#4A90E2',
      backgroundColor: 'rgba(74, 144, 226, 0.2)',
      borderWidth: 2,
      pointRadius: 2,
      fill: true,
    }],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: { title: { display: true, text: 'Date' } },
      y: { title: { display: true, text: 'Price ($)' }, beginAtZero: false },
    },
    plugins: { legend: { position: 'top' } },
  };

  // Main render
  return (
    <div className="min-h-screen p-6">
      <div className="max-w-8xl mx-auto">
        <header className="mb-8 bg-blue-900 text-white p-4 rounded-lg">
          <div className="flex items-center">
            <ChartLine className="w-6 h-6 text-blue-400 mr-2" />
            <h1 className="text-3xl font-bold">NestEgg Data Summary</h1>
          </div>
          <p className="text-blue-200 mt-2">View and manage your securities data</p>
        </header>

        <div className="bg-white rounded-xl shadow-md p-6 mb-8">
          <div className="flex flex-col md:flex-row justify-between items-center mb-6">
            <div className="flex items-center mb-4 md:mb-0">
              <ChartLine className="w-6 h-6 text-blue-600 mr-2" />
              <h2 className="text-xl font-semibold">Securities Data</h2>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search securities..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <button
                onClick={() => setShowAddSecurityModal(true)}
                className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <PlusCircle className="w-5 h-5 mr-2" />
                <span>Add Security</span>
              </button>
              
              <button
                onClick={refreshPrices}
                disabled={refreshing}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-blue-300"
              >
                {refreshing ? (
                  <>
                    <RefreshCcw className="w-5 h-5 mr-2 animate-spin" />
                    <span>Refreshing...</span>
                  </>
                ) : (
                  <>
                    <RefreshCcw className="w-5 h-5 mr-2" />
                    <span>Refresh All Prices</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {error && (
            <ErrorMessage 
              error={error}
              onRetry={() => {
                setError(null);
                fetchSecurities();
              }}
              onBack={() => router.push('/portfolio')}
              className="mb-6"
            />
          )}

          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse table-auto">
              <thead className="bg-gray-50 sticky top-0 z-20">
                <tr>
                  <th
                    className="sticky left-0 bg-gray-50 z-30 px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => requestSort('ticker')}
                  >
                    <div className="flex items-center">
                      <Tag className="w-4 h-4 mr-1" />
                      <span>Ticker</span>
                      <ArrowUpDown className="w-4 h-4 ml-1" />
                      {getSortIndicator('ticker')}
                    </div>
                  </th>
                  <th
                    className="sticky left-24 bg-gray-50 z-30 px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => requestSort('company_name')}
                  >
                    <div className="flex items-center">
                      <span>Company</span>
                      <ArrowUpDown className="w-4 h-4 ml-1" />
                      {getSortIndicator('company_name')}
                    </div>
                  </th>
                  <th
                    className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => requestSort('sector')}
                  >
                    <div className="flex items-center">
                      <span>Sector</span>
                      <ArrowUpDown className="w-4 h-4 ml-1" />
                      {getSortIndicator('sector')}
                    </div>
                  </th>
                  <th
                    className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => requestSort('industry')}
                  >
                    <div className="flex items-center">
                      <span>Industry</span>
                      <ArrowUpDown className="w-4 h-4 ml-1" />
                      {getSortIndicator('industry')}
                    </div>
                  </th>
                  <th
                    className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => requestSort('price')}
                  >
                    <div className="flex items-center justify-end">
                      <DollarSign className="w-4 h-4 mr-1" />
                      <span>Price</span>
                      <ArrowUpDown className="w-4 h-4 ml-1" />
                      {getSortIndicator('price')}
                    </div>
                  </th>
                  <th
                    className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => requestSort('market_cap')}
                  >
                    <div className="flex items-center justify-end">
                      <span>Market Cap</span>
                      <ArrowUpDown className="w-4 h-4 ml-1" />
                      {getSortIndicator('market_cap')}
                    </div>
                  </th>
                  <th
                    className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => requestSort('pe_ratio')}
                  >
                    <div className="flex items-center justify-end">
                      <span>P/E</span>
                      <ArrowUpDown className="w-4 h-4 ml-1" />
                      {getSortIndicator('pe_ratio')}
                    </div>
                  </th>
                  <th
                    className="px-3 py-4 whitespace-nowrap text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => requestSort('volume')}
                  >
                    <div className="flex items-center justify-end">
                      <BarChart2 className="w-4 h-4 mr-1" />
                      <span>Volume</span>
                      <ArrowUpDown className="w-4 h-4 ml-1" />
                      {getSortIndicator('volume')}
                    </div>
                  </th>
                  <th
                    className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => requestSort('dividend_yield')}
                  >
                    <div className="flex items-center justify-end">
                      <Percent className="w-4 h-4 mr-1" />
                      <span>Yield</span>
                      <ArrowUpDown className="w-4 h-4 ml-1" />
                      {getSortIndicator('dividend_yield')}
                    </div>
                  </th>
                  <th
                    className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => requestSort('dividend_rate')}
                  >
                    <div className="flex items-center justify-end">
                      <span>Div Rate</span>
                      <ArrowUpDown className="w-4 h-4 ml-1" />
                      {getSortIndicator('dividend_rate')}
                    </div>
                  </th>
                  <th
                    className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => requestSort('last_updated')}
                  >
                    <div className="flex items-center justify-end">
                      <Calendar className="w-4 h-4 mr-1" />
                      <span>Last Updated</span>
                      <ArrowUpDown className="w-4 h-4 ml-1" />
                      {getSortIndicator('last_updated')}
                    </div>
                  </th>
                  <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <span>Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sortedSecurities.length > 0 ? (
                  sortedSecurities.map((security) => (
                    <tr 
                      key={security.ticker} 
                      className="hover:bg-gray-100 transition-colors cursor-pointer"
                      onClick={() => handleRowClick(security)}
                    >
                      <td className="sticky left-0 bg-white px-3 py-4 whitespace-nowrap font-medium text-gray-900 hover:bg-gray-100">
                        <div className="font-medium text-gray-900">{security.ticker}</div>
                      </td>
                      <td className="sticky left-24 bg-white px-3 py-4 whitespace-pre-wrap text-xs text-gray-900 hover:bg-gray-100"> {/* Wrapped text, reduced size */}
                        <div className="text-xs text-gray-900">{security.company_name || '-'}</div>
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{security.sector || '-'}</div>
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{security.industry || '-'}</div>
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap text-right">
                        <div className="text-sm font-medium">
                          {security.price ? `$${security.price.toFixed(2)}` : '-'}
                        </div>
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap text-right">
                        <div className="text-sm text-gray-900">
                          {typeof security.market_cap === 'number' ? formatNumber(security.market_cap) : '-'}
                        </div>
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap text-right">
                        <div className="text-sm text-gray-900">
                          {typeof security.pe_ratio === 'number' ? security.pe_ratio.toFixed(2) : '-'}
                        </div>
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap text-right">
                        <div className="text-sm text-gray-900">
                          {typeof security.volume === 'number' ? formatNumber(security.volume) : '-'}
                        </div>
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap text-right">
                        <div className="text-sm text-gray-900">
                          {typeof security.dividend_yield === 'number' 
                            ? `${(security.dividend_yield * 100).toFixed(2)}%` 
                            : '-'}
                        </div>
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap text-right">
                        <div className="text-sm text-gray-900">
                          {typeof security.dividend_rate === 'number' 
                            ? `$${security.dividend_rate.toFixed(2)}` 
                            : '-'}
                        </div>
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap text-right">
                        <div className="text-sm text-gray-500">
                          {security.time_ago || 'Never'}
                          {security.last_updated && (
                            <span className="text-xs block">
                              {new Date(security.last_updated).toLocaleString()}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={(e) => { e.stopPropagation(); handleSecuritySelect(security); }}
                            className="text-blue-600 hover:text-blue-900 p-1"
                            title="Update Security"
                          >
                            <RefreshCcw className="w-5 h-5" />
                          </button>
                          <a 
                            href={`https://finance.yahoo.com/quote/${security.ticker}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-900 p-1"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <ExternalLink className="w-5 h-5" />
                          </a>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="13" className="px-3 py-8 text-center text-gray-500">
                      {searchTerm
                        ? 'No securities match your search criteria'
                        : 'No securities data available'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-4 text-sm text-gray-500">
            Total: {filteredSecurities.length} securities
            {filteredSecurities.length !== securities.length && (
              <span> (filtered from {securities.length})</span>
            )}
          </div>
        </div>
      </div>

      {/* Update Security Modal */}
      {showUpdateModal && selectedSecurity && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg max-w-4xl w-full p-6 flex flex-col md:flex-row">
            {/* Left side - Update options */}
            <div className="md:w-1/2 p-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold">{selectedSecurity.ticker} - Update</h3>
                <button 
                  onClick={() => setShowUpdateModal(false)}
                  className="text-gray-400 hover:text-gray-600 focus:outline-none"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-800">Select an update type below:</p>
              </div>
              
              <div className="space-y-4">
                <button
                  onClick={() => updateSecurity(selectedSecurity.ticker, 'metrics')}
                  disabled={refreshing}
                  className="w-full flex items-center justify-between bg-white border border-gray-300 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center">
                    <Info className="w-6 h-6 text-blue-500 mr-3" />
                    <div className="text-left">
                      <h4 className="font-medium text-gray-900">Refresh Metrics</h4>
                      <p className="text-xs text-gray-500">Update company information, PE, dividends</p>
                    </div>
                  </div>
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
                
                <button
                  onClick={() => updateSecurity(selectedSecurity.ticker, 'current_price')}
                  disabled={refreshing}
                  className="w-full flex items-center justify-between bg-white border border-gray-300 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center">
                    <DollarSign className="w-6 h-6 text-green-500 mr-3" />
                    <div className="text-left">
                      <h4 className="font-medium text-gray-900">Refresh Current Price</h4>
                      <p className="text-xs text-gray-500">Update today's latest price only</p>
                    </div>
                  </div>
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
                
                <button
                  onClick={() => updateSecurity(selectedSecurity.ticker, 'history')}
                  disabled={refreshing}
                  className="w-full flex items-center justify-between bg-white border border-gray-300 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center">
                    <ChartLine className="w-6 h-6 text-purple-500 mr-3" />
                    <div className="text-left">
                      <h4 className="font-medium text-gray-900">Update Price History</h4>
                      <p className="text-xs text-gray-500">Fetch missing historical price data</p>
                    </div>
                  </div>
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
            
            {/* Right side - Security details */}
            <div className="md:w-1/2 bg-gray-50 p-4 rounded-lg mt-4 md:mt-0 md:ml-4">
              <h3 className="text-lg font-semibold mb-3">Security Details</h3>
              
              {detailsLoading ? (
                <SecurityDetailSkeleton />
              ) : securityDetails ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white p-3 rounded-lg shadow-sm">
                      <p className="text-xs text-gray-500">Last Metrics Update</p>
                      <p className="font-medium">
                        {securityDetails.last_metrics_update 
                          ? new Date(securityDetails.last_metrics_update).toLocaleString() 
                          : "Never Updated"}
                      </p>
                    </div>
                    <div className="bg-white p-3 rounded-lg shadow-sm">
                      <p className="text-xs text-gray-500">Days of Historical Data</p>
                      <p className="font-medium">
                        {securityDetails.days_of_history 
                          ? `${securityDetails.days_of_history} days` 
                          : "No Historical Data"}
                      </p>
                    </div>
                  </div>
                  
                  <div className="bg-white p-3 rounded-lg shadow-sm">
                    <p className="text-xs text-gray-500">Price Range</p>
                    <div className="flex justify-between mt-1">
                      <div className="text-left">
                        <p className="text-xs text-gray-500">Low</p>
                        <p className="font-medium">
                          {securityDetails.low_price 
                            ? `$${parseFloat(securityDetails.low_price).toFixed(2)}` 
                            : "N/A"}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-gray-500">Average</p>
                        <p className="font-medium">
                          {securityDetails.avg_price 
                            ? `$${parseFloat(securityDetails.avg_price).toFixed(2)}` 
                            : "N/A"}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-500">High</p>
                        <p className="font-medium">
                          {securityDetails.high_price 
                            ? `$${parseFloat(securityDetails.high_price).toFixed(2)}` 
                            : "N/A"}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-white p-3 rounded-lg shadow-sm">
                    <p className="text-xs text-gray-500">Company Info</p>
                    <p className="text-sm mt-1">
                      {selectedSecurity.company_name || "No company name available"} - {selectedSecurity.sector || "Unknown sector"}
                    </p>
                    <p className="text-xs text-gray-500 mt-2">
                      {selectedSecurity.industry || "No industry information available"}
                    </p>
                  </div>
                  
                  <div className="bg-white p-3 rounded-lg shadow-sm">
                    <p className="text-xs text-gray-500">Financial Metrics</p>
                    <div className="grid grid-cols-2 gap-4 mt-2">
                      <p><strong>Market Cap:</strong> {typeof securityDetails.market_cap === 'number' ? formatNumber(securityDetails.market_cap) : 'N/A'}</p>
                      <p><strong>P/E Ratio:</strong> {typeof securityDetails.pe_ratio === 'number' ? securityDetails.pe_ratio.toFixed(2) : 'N/A'}</p>
                      <p><strong>Dividend Yield:</strong> {typeof securityDetails.dividend_yield === 'number' ? `${(securityDetails.dividend_yield * 100).toFixed(2)}%` : 'N/A'}</p>
                      <p><strong>Dividend Rate:</strong> {typeof securityDetails.dividend_rate === 'number' ? `$${securityDetails.dividend_rate.toFixed(2)}` : 'N/A'}</p>
                    </div>
                  </div>
                  
                  <p><strong>Current Price:</strong> {securityDetails.price ? `$${securityDetails.price.toFixed(2)}` : 'N/A'}</p>
                  <p><strong>Last Updated:</strong> {securityDetails.last_updated ? new Date(securityDetails.last_updated).toLocaleString() : 'Never'}</p>
                  
                  {securityDetails.message && (
                    <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
                      <p className="text-sm text-blue-800">{securityDetails.message}</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex justify-center items-center h-64">
                  <p className="text-gray-500">No details available</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add Security Modal (unchanged) */}
      {showAddSecurityModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">Add New Security</h3>
              <button 
                onClick={() => setShowAddSecurityModal(false)}
                className="text-gray-400 hover:text-gray-600 focus:outline-none"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <form onSubmit={addSecurity} className="space-y-4">
              <div>
                <label htmlFor="ticker" className="block text-sm font-medium text-gray-700 mb-1">
                  Ticker Symbol
                </label>
                <input
                  type="text"
                  id="ticker"
                  value={newSecurity.ticker}
                  onChange={(e) => setNewSecurity({ ...newSecurity, ticker: e.target.value })}
                  placeholder="e.g., AAPL, MSFT, TSLA"
                  className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Enter the stock ticker symbol exactly as it appears on Yahoo Finance.
                </p>
              </div>
              
              <div className="pt-4 border-t border-gray-200">
                <p className="text-sm text-gray-500 mb-4">
                  After adding the security, you can update its metrics and price history 
                  using the refresh button in the securities table.
                </p>
                
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowAddSecurityModal(false)}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center"
                    disabled={refreshing || !newSecurity.ticker.trim()}
                  >
                    {refreshing ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Adding...
                      </>
                    ) : (
                      "Add Security"
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Stock Detail Modal */}
      {showDetailModal && selectedSecurity && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg max-w-4xl w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-2xl font-bold">{selectedSecurity.ticker} - Overview</h3>
              <button 
                onClick={() => setShowDetailModal(false)}
                className="text-gray-400 hover:text-gray-600 focus:outline-none"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {detailsLoading ? (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Stock Overview */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="text-lg font-semibold mb-2">Stock Details</h4>
                    <p><strong>Ticker:</strong> {selectedSecurity.ticker}</p>
                    <p><strong>Company:</strong> {selectedSecurity.company_name || 'N/A'}</p>
                    <p><strong>Sector:</strong> {selectedSecurity.sector || 'N/A'}</p>
                    <p><strong>Industry:</strong> {selectedSecurity.industry || 'N/A'}</p>
                    <p><strong>Current Price:</strong> {securityDetails?.price ? `$${securityDetails.price.toFixed(2)}` : 'N/A'}</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="text-lg font-semibold mb-2">Metrics</h4>
                    <p><strong>Market Cap:</strong> {typeof securityDetails?.market_cap === 'number' ? formatNumber(securityDetails.market_cap) : 'N/A'}</p>
                    <p><strong>P/E Ratio:</strong> {typeof securityDetails?.pe_ratio === 'number' ? securityDetails.pe_ratio.toFixed(2) : 'N/A'}</p>
                    <p><strong>Dividend Yield:</strong> {typeof securityDetails?.dividend_yield === 'number' ? `${(securityDetails.dividend_yield * 100).toFixed(2)}%` : 'N/A'}</p>
                    <p><strong>Dividend Rate:</strong> {typeof securityDetails?.dividend_rate === 'number' ? `$${securityDetails.dividend_rate.toFixed(2)}` : 'N/A'}</p>
                    <p><strong>Last Updated:</strong> {securityDetails?.last_updated ? new Date(securityDetails.last_updated).toLocaleString() : 'Never'}</p>
                  </div>
                </div>
                
                {/* KPI Squares for Percentage Changes */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-green-100 p-4 rounded-lg shadow-sm text-center">
                    <p className="text-sm font-medium text-green-800">1-Day Change</p>
                    <p className="text-lg font-bold">{calculatePercentageChange(historicalData, '1d')}</p>
                  </div>
                  <div className="bg-blue-100 p-4 rounded-lg shadow-sm text-center">
                    <p className="text-sm font-medium text-blue-800">1-Week Change</p>
                    <p className="text-lg font-bold">{calculatePercentageChange(historicalData, '1w')}</p>
                  </div>
                  <div className="bg-purple-100 p-4 rounded-lg shadow-sm text-center">
                    <p className="text-sm font-medium text-purple-800">1-Year Change</p>
                    <p className="text-lg font-bold">{calculatePercentageChange(historicalData, '1y')}</p>
                  </div>
                </div>
                
                {/* Historical Price Chart */}
                <div className="bg-white p-4 rounded-lg shadow-md">
                  <h4 className="text-lg font-semibold mb-2">Historical Price Trends</h4>
                  <div className="h-64">
                    {detailsLoading ? (
                      <SkeletonLoader type="chart" height="h-64" />
                    ) : historicalData.length > 0 ? (
                      <Line data={chartData} options={chartOptions} />
                    ) : (
                      <p className="text-center text-gray-500">No historical data available.</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}