// pages/portfolio-new.js
// This page demonstrates the refactored structure using dedicated modal components.

import React, { useContext, useEffect, useState, useCallback } from "react";
import { AuthContext } from "@/context/AuthContext";
import { useRouter } from "next/router";
import { Line } from "react-chartjs-2";
import "chart.js/auto";
import SkeletonLoader from '@/components/SkeletonLoader';
import { PortfolioSummarySkeleton, AccountsTableSkeleton, PositionsTableSkeleton } from '@/components/skeletons/PortfolioSkeleton';
import ErrorMessage from '@/components/ErrorMessage';
import SystemStatusDashboard from '@/components/SystemStatusDashboard';
import SystemEvents from '@/components/SystemEvents';
import { useEggMascot } from '@/context/EggMascotContext';
import { API_BASE_URL, fetchWithAuth } from '@/utils/api'; // Using fetchWithAuth directly

// Import Modal Components
import AddAccountModal from "@/components/modals/AddAccountModal";
import EditAccountModal from "@/components/modals/EditAccountModal";
import SelectAccountModal from "@/components/modals/SelectAccountModal";
import SelectPositionTypeModal from "@/components/modals/SelectPositionTypeModal";
import AddSecurityPositionModal from "@/components/modals/AddSecurityPositionModal";
import EditSecurityPositionModal from "@/components/modals/EditSecurityPositionModal";
import AddCryptoPositionModal from "@/components/modals/AddCryptoPositionModal";
import EditCryptoPositionModal from "@/components/modals/EditCryptoPositionModal";
import AddMetalPositionModal from "@/components/modals/AddMetalPositionModal";
import EditMetalPositionModal from "@/components/modals/EditMetalPositionModal";
import AddRealEstatePositionModal from "@/components/modals/AddRealEstatePositionModal"; 
import EditRealEstatePositionModal from "@/components/modals/EditRealEstatePositionModal"; 
import ConfirmDeleteModal from "@/components/modals/ConfirmDeleteModal";
import BulkUploadAccountSelectModal from "@/components/modals/BulkUploadAccountSelectModal";
import BulkUploadDataPasteModal from "@/components/modals/BulkUploadDataPasteModal";

// Assuming constants are imported
import { popularBrokerages } from '@/utils/constants'; 

export default function PortfolioNew() {
  const { user, setUser } = useContext(AuthContext);
  const router = useRouter();
  const { triggerCartwheel } = useEggMascot();
  
  // Page Level State
  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState([]);
  const [positions, setPositions] = useState({}); // { accountId: [position1, position2] }
  const [portfolioSummary, setPortfolioSummary] = useState(null);
  const [portfolioValue, setPortfolioValue] = useState(0);
  const [dailyChange, setDailyChange] = useState(0);
  const [yearlyChange, setYearlyChange] = useState(0);
  const [error, setError] = useState(null);
  const [selectedTimeframe, setSelectedTimeframe] = useState("1Y");
  const [showSystemStatus, setShowSystemStatus] = useState(false);
  
  // State for Modal Visibility & Data
  const [isAddAccountModalOpen, setIsAddAccountModalOpen] = useState(false);
  const [isEditAccountModalOpen, setIsEditAccountModalOpen] = useState(false);
  const [accountToEdit, setAccountToEdit] = useState(null); // Data for EditAccountModal
  
  const [isSelectAccountModalOpen, setIsSelectAccountModalOpen] = useState(false);
  const [isSelectPositionTypeModalOpen, setIsSelectPositionTypeModalOpen] = useState(false);
  const [selectedAccountIdForPosition, setSelectedAccountIdForPosition] = useState(null);

  // Specific Add Position Modals
  const [isAddSecurityModalOpen, setIsAddSecurityModalOpen] = useState(false);
  const [isAddCryptoModalOpen, setIsAddCryptoModalOpen] = useState(false);
  const [isAddMetalModalOpen, setIsAddMetalModalOpen] = useState(false);
  const [isAddRealEstateModalOpen, setIsAddRealEstateModalOpen] = useState(false);

  // Edit Position Modals
  const [isEditSecurityModalOpen, setIsEditSecurityModalOpen] = useState(false);
  const [isEditCryptoModalOpen, setIsEditCryptoModalOpen] = useState(false);
  const [isEditMetalModalOpen, setIsEditMetalModalOpen] = useState(false);
  const [isEditRealEstateModalOpen, setIsEditRealEstateModalOpen] = useState(false);
  const [positionToEdit, setPositionToEdit] = useState(null);

  // Detail view modals (optional implementation)
  const [isAccountDetailModalOpen, setIsAccountDetailModalOpen] = useState(false);
  const [selectedAccountDetail, setSelectedAccountDetail] = useState(null);
  const [isPositionDetailModalOpen, setIsPositionDetailModalOpen] = useState(false);
  const [selectedPositionDetail, setSelectedPositionDetail] = useState(null);

  // Delete Confirmation Modals
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState({ id: null, type: null, name: '' });

  // Bulk Upload State
  const [isBulkUploadAccountSelectOpen, setIsBulkUploadAccountSelectOpen] = useState(false);
  const [isBulkUploadDataPasteOpen, setIsBulkUploadDataPasteOpen] = useState(false);
  const [selectedBulkAccount, setSelectedBulkAccount] = useState(null);

  // --- Data Fetching ---
  const fetchPortfolioSummary = useCallback(async () => {
    try {
      const response = await fetchWithAuth('/portfolio/summary');
      if (!response.ok) throw new Error('Failed to fetch summary');
      const data = await response.json();
      setPortfolioSummary(data);
      
      // Set portfolio value and changes from the summary
      if (data) {
        setPortfolioValue(data.net_worth || 0);
        setDailyChange(data.daily_change || 0);
        setYearlyChange(data.yearly_change || 0);
      }
    } catch (err) {
      console.error("Error fetching portfolio summary:", err);
      // Don't set page error for summary fetch failure
    }
  }, []);

  // Helper function to determine position type
  const determinePositionType = useCallback((position) => {
    // Logic to determine position type based on properties
    if (position.ticker !== undefined) return 'security';
    if (position.coin_symbol !== undefined) return 'crypto';
    if (position.metal_type !== undefined) return 'metal';
    if (position.address !== undefined) return 'realestate';
    return 'security'; // Default fallback
  }, []);

  const fetchPositions = useCallback(async (accountId) => {
    try {
      // Fetch securities positions
      const securitiesResponse = await fetchWithAuth(`/positions/${accountId}`);
      let securitiesPositions = [];
      if (securitiesResponse.ok) {
        const securitiesData = await securitiesResponse.json();
        securitiesPositions = securitiesData.positions || [];
        // Tag each position with its type for easier handling
        securitiesPositions = securitiesPositions.map(p => ({ ...p, positionType: 'security' }));
      }
      
      // Fetch crypto positions (if the endpoint exists)
      let cryptoPositions = [];
      try {
        const cryptoResponse = await fetchWithAuth(`/crypto/${accountId}`);
        if (cryptoResponse.ok) {
          const cryptoData = await cryptoResponse.json();
          cryptoPositions = cryptoData.positions || [];
          cryptoPositions = cryptoPositions.map(p => ({ ...p, positionType: 'crypto' }));
        }
      } catch (error) {
        console.log("No crypto positions or endpoint not available");
      }
      
      // Fetch metal positions (if the endpoint exists)
      let metalPositions = [];
      try {
        const metalResponse = await fetchWithAuth(`/metals/${accountId}`);
        if (metalResponse.ok) {
          const metalData = await metalResponse.json();
          metalPositions = metalData.positions || [];
          metalPositions = metalPositions.map(p => ({ ...p, positionType: 'metal' }));
        }
      } catch (error) {
        console.log("No metal positions or endpoint not available");
      }
      
      // Fetch real estate positions (if the endpoint exists)
      let realEstatePositions = [];
      try {
        const realEstateResponse = await fetchWithAuth(`/realestate/${accountId}`);
        if (realEstateResponse.ok) {
          const realEstateData = await realEstateResponse.json();
          realEstatePositions = realEstateData.positions || [];
          realEstatePositions = realEstatePositions.map(p => ({ ...p, positionType: 'realestate' }));
        }
      } catch (error) {
        console.log("No real estate positions or endpoint not available");
      }
      
      // Combine all position types
      const allPositions = [
        ...securitiesPositions, 
        ...cryptoPositions, 
        ...metalPositions,
        ...realEstatePositions
      ];
      
      // Update positions state
      setPositions(prevPositions => ({
        ...prevPositions,
        [accountId]: allPositions
      }));
    } catch (error) {
      console.error(`Error fetching positions for account ${accountId}:`, error);
      setPositions(prev => ({ ...prev, [accountId]: [] }));
    }
  }, []);

  const fetchAccounts = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const response = await fetchWithAuth('/accounts');
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to fetch accounts: ${response.status} ${errorText}`);
      }
      const data = await response.json();
      if (data.accounts && Array.isArray(data.accounts)) {
        setAccounts(data.accounts);
        // Fetch positions for all accounts
        await Promise.all(data.accounts.map(account => fetchPositions(account.id)));
      } else {
        throw new Error("Unexpected data format for accounts.");
      }
    } catch (err) {
      console.error("Error fetching accounts:", err);
      setError(err.message || "Failed to load account data.");
      setAccounts([]);
      setPositions({});
    } finally {
      setLoading(false);
    }
  }, [fetchPositions]);

  const refreshAllData = useCallback(() => {
    fetchAccounts(); // Will also fetch positions
    fetchPortfolioSummary();
  }, [fetchAccounts, fetchPortfolioSummary]);

  // Selective refresh - only update a specific account's positions
  const refreshAccountPositions = useCallback((accountId) => {
    if (accountId) {
      fetchPositions(accountId);
      fetchPortfolioSummary(); // Update summary too since positions changed
    }
  }, [fetchPositions, fetchPortfolioSummary]);

  // Initial data fetch on component mount
  useEffect(() => {
    const fetchUserData = async () => {
      setLoading(true);
      try {
        const response = await fetchWithAuth('/user');
        if (response.ok) {
          const userData = await response.json();
          setUser(userData);
          refreshAllData();
        } else {
          // Redirect to login if user data can't be fetched
          localStorage.removeItem("token");
          router.push("/login");
        }
      } catch (error) {
        console.error("🔥 Error fetching user data:", error);
        router.push("/login");
      }
    };
    fetchUserData();
  }, [router, setUser, refreshAllData]);

  // Event listener for the portfolio page
  useEffect(() => {
    // Event handlers for navbar actions
    const handleOpenAddPositionModal = () => {
      setIsSelectAccountModalOpen(true);
    };
    
    const handleOpenAddAccountModal = () => {
      setIsAddAccountModalOpen(true);
    };
    
    const handleResetSelectedAccount = () => {
      setSelectedAccountIdForPosition(null);
    };
    
    const handleOpenSelectAccountModal = () => {
      setSelectedAccountIdForPosition(null);
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

  // Update market prices functionality
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
        refreshAllData();
      } else {
        const errorText = await response.text();
        setError(`Failed to update prices: ${errorText}`);
      }
    } catch (error) {
      console.error("Error updating prices:", error);
      setError(`Error updating prices: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Trigger portfolio calculation
  const triggerPortfolioCalculation = async () => {
    setLoading(true);
    try {
      const response = await fetchWithAuth('/portfolios/calculate/user', {
        method: "POST"
      });
      
      if (response.ok) {
        const data = await response.json();
        alert(data.message);
        refreshAllData();
      } else {
        const error = await response.text();
        alert(`Failed to calculate portfolio: ${error}`);
      }
    } catch (error) {
      console.error("Error calculating portfolio:", error);
      alert(`Error calculating portfolio: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // --- Modal Trigger Handlers ---
  const handleOpenAddAccount = () => setIsAddAccountModalOpen(true);

  const handleOpenEditAccount = (account) => {
    setAccountToEdit(account);
    setIsEditAccountModalOpen(true);
  };

  const handleOpenDeleteAccount = (account) => {
    setItemToDelete({ id: account.id, type: 'account', name: account.account_name });
    setIsDeleteModalOpen(true);
  };

  const handleAccountDetailClick = (account) => {
    setSelectedAccountDetail(account);
    setIsAccountDetailModalOpen(true);
  };

  const handlePositionDetailClick = (position) => {
    setSelectedPositionDetail(position);
    setIsPositionDetailModalOpen(true);
  };

  // Add Position Flow: Step 1
  const handleInitiateAddPosition = (accountId) => {
    setSelectedAccountIdForPosition(accountId);
    setIsSelectPositionTypeModalOpen(true);
  };

  // Add Position Flow: Step 2 (Callback from SelectAccountModal)
  const handleAccountSelectedForPosition = (accountId) => {
    setSelectedAccountIdForPosition(accountId);
    setIsSelectAccountModalOpen(false);
    setIsSelectPositionTypeModalOpen(true);
  };

  // Add Position Flow: Step 3 (Callback from SelectPositionTypeModal)
  const handlePositionTypeSelected = (typeId) => {
    setIsSelectPositionTypeModalOpen(false);
    
    if (typeId === 'stock') setIsAddSecurityModalOpen(true);
    else if (typeId === 'crypto') setIsAddCryptoModalOpen(true);
    else if (typeId === 'metal') setIsAddMetalModalOpen(true);
    else if (typeId === 'realestate') setIsAddRealEstateModalOpen(true);
    else console.warn("Selected position type not yet handled:", typeId);
  };

  // Edit Position Trigger
  const handleOpenEditPosition = (position) => {
    setPositionToEdit(position);
    
    // Use positionType property if it exists, otherwise determine from the position data
    const positionType = position.positionType || determinePositionType(position);
    
    if (positionType === 'security') setIsEditSecurityModalOpen(true);
    else if (positionType === 'crypto') setIsEditCryptoModalOpen(true);
    else if (positionType === 'metal') setIsEditMetalModalOpen(true);
    else if (positionType === 'realestate') setIsEditRealEstateModalOpen(true);
    else console.warn("Unknown position type:", positionType);
  };

  // Delete Position Trigger
  const handleOpenDeletePosition = (position) => {
    const positionType = position.positionType || determinePositionType(position);
    const positionName = position.ticker || position.coin_symbol || position.metal_type || 'Position';
    
    setItemToDelete({ 
      id: position.id, 
      type: `position-${positionType}`,
      name: `${positionName} position`
    });
    setIsDeleteModalOpen(true);
  };

  // Bulk Upload Trigger
  const handleOpenBulkUpload = () => {
    setIsBulkUploadAccountSelectOpen(true);
  };

  // Bulk Upload Step 2 (Account Selection)
  const handleBulkAccountSelected = (account) => {
    setSelectedBulkAccount(account);
    setIsBulkUploadAccountSelectOpen(false);
    setIsBulkUploadDataPasteOpen(true);
  };

  // --- Action Handlers (Deletion, Callbacks from Modals) ---
  const confirmDeletion = async () => {
    if (!itemToDelete || !itemToDelete.id) return;
    
    const { id, type } = itemToDelete;
    let endpoint = '';
    let accountId = null;
    
    if (type === 'account') {
      endpoint = `/accounts/${id}`;
    } else if (type.startsWith('position-')) {
      const positionType = type.split('-')[1];
      
      // Find the account this position belongs to
      for (const [accId, positionsList] of Object.entries(positions)) {
        const found = positionsList.find(p => p.id === id);
        if (found) {
          accountId = parseInt(accId);
          break;
        }
      }
      
      // Determine the right endpoint based on position type
      if (positionType === 'security') endpoint = `/positions/${id}`;
      else if (positionType === 'crypto') endpoint = `/crypto/${id}`;
      else if (positionType === 'metal') endpoint = `/metals/${id}`;
      else if (positionType === 'realestate') endpoint = `/realestate/${id}`;
      else {
        console.error("Unknown position type to delete:", positionType);
        return;
      }
    } else {
      console.error("Unknown item type to delete:", type);
      return;
    }

    try {
      const response = await fetchWithAuth(endpoint, { method: "DELETE" });
      if (response.ok) {
        if (type === 'account') {
          refreshAllData();
        } else if (accountId) {
          // Only refresh the positions for this account
          refreshAccountPositions(accountId);
        }
      } else {
        const errorText = await response.text();
        alert(`Failed to delete ${type}: ${errorText}`);
      }
    } catch (error) {
      console.error(`Error deleting ${type}:`, error);
      alert(`Error deleting ${type}`);
    } finally {
      setIsDeleteModalOpen(false);
      setItemToDelete({ id: null, type: null, name: '' });
    }
  };

  // --- Chart Data & Options ---
  const getChartLabels = (timeframe) => {
    const today = new Date();
    const formatDate = (date) => date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    const formatMonth = (date) => date.toLocaleDateString("en-US", { month: "short", year: "numeric" });

    switch (timeframe) {
      case "1W":
        return Array.from({ length: 7 }, (_, i) => {
          const date = new Date(today);
          date.setDate(today.getDate() - (6 - i));
          return formatDate(date);
        });
      case "1M":
        return Array.from({ length: 30 }, (_, i) => {
          const date = new Date(today);
          date.setDate(today.getDate() - (29 - i));
          return formatDate(date);
        });
      case "6M":
        return Array.from({ length: 6 }, (_, i) => {
          const date = new Date(today);
          date.setMonth(today.getMonth() - (5 - i));
          return formatMonth(date);
        });
      case "YTD":
        const startOfYear = new Date(today.getFullYear(), 0, 1);
        const monthsSinceStart = today.getMonth();
        return Array.from({ length: monthsSinceStart + 1 }, (_, i) => {
          const date = new Date(today.getFullYear(), i, 1);
          return formatMonth(date);
        });
      case "1Y":
        return Array.from({ length: 12 }, (_, i) => {
          const date = new Date(today);
          date.setMonth(today.getMonth() - (11 - i));
          return formatMonth(date);
        });
      case "5Y":
        return Array.from({ length: 5 }, (_, i) => {
          const date = new Date(today);
          date.setFullYear(today.getFullYear() - (4 - i));
          return date.getFullYear().toString();
        });
      case "Max":
        return Array.from({ length: 7 }, (_, i) => {
          const date = new Date(today);
          date.setFullYear(today.getFullYear() - (6 - i));
          return date.getFullYear().toString();
        });
      default:
        return ["4Y Ago", "3Y Ago", "2Y Ago", "1Y Ago", "6M Ago", "Today"];
    }
  };

  // Placeholder data for chart - replace with actual history data from API
  const netWorthData = {
    "1W": [250000, 252000, 251500, 253000, 255000, 257500, 260000],
    "1M": [240000, 242500, 245000, 247500, 250000, 252500, 255000],
    "6M": [200000, 210000, 220000, 230000, 240000, 250000, 260000],
    "YTD": [180000, 190000, 200000, 210000, 220000, 230000, 250000],
    "1Y": [200000, 210000, 220000, 230000, 240000, 250000, 260000],
    "5Y": [100000, 150000, 200000, 250000, 300000, 350000, 400000],
    "Max": [50000, 100000, 150000, 200000, 250000, 300000, 350000],
  };

  const chartData = {
    labels: getChartLabels(selectedTimeframe),
    datasets: [
      {
        label: "Net Worth ($)",
        data: netWorthData[selectedTimeframe],
        borderColor: "#4A90E2",
        backgroundColor: "rgba(74, 144, 226, 0.2)",
        borderWidth: 2,
        pointRadius: 4,
        fill: true,
      },
    ],
  };

  const chartOptions = {
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
      title: {
        display: true,
        text: `Net Worth Over ${selectedTimeframe}`,
        font: { size: 16, weight: "bold" },
        color: "#1e3a8a",
        padding: { bottom: 10 },
      },
    },
  };

  // Helper functions
  const getInstitutionLogo = (institutionName) => {
    if (!institutionName) return null;
    
    const brokerage = popularBrokerages.find(
      broker => broker.name.toLowerCase() === institutionName.toLowerCase()
    );
    
    return brokerage ? brokerage.logo : null;
  };

  const calculateAccountCostBasis = (accountId) => {
    if (!positions[accountId]) return 0;
    
    return positions[accountId].reduce((total, position) => {
      // Handle different position types
      if (position.positionType === 'security') {
        const positionCostBasis = (position.cost_basis || position.price) * position.shares;
        return total + positionCostBasis;
      } else if (position.positionType === 'crypto') {
        return total + ((position.purchase_price * position.quantity) || 0);
      } else if (position.positionType === 'metal') {
        return total + ((position.cost_basis || position.purchase_price) * position.quantity || 0);
      } else if (position.positionType === 'realestate') {
        return total + (position.purchase_price || 0);
      }
      return total;
    }, 0);
  };

  // --- JSX Rendering ---
  if (loading && !accounts.length) { // Show initial full page loader only if no accounts yet
    return <p className="portfolio-loading p-6">Loading Portfolio...</p>; 
  }
  
  return (
    <div className="portfolio-container">
      {/* Header */}
      <header className="portfolio-header">
        <h1 className="portfolio-title">Your Portfolio</h1>
        <p className="portfolio-subtitle">Track your NestEgg growth</p>
        <button 
          onClick={() => setShowSystemStatus(!showSystemStatus)}
          className="mt-2 text-sm text-blue-600 hover:text-blue-800 underline"
        >
          {showSystemStatus ? 'Hide System Status' : 'Show System Status'}
        </button>
      </header>

      {/* System Status Section */}
      {showSystemStatus && (
        <>
          <SystemStatusDashboard />
          <SystemEvents />
        </>
      )}

      {/* Error Message */}
      {error && (
        <ErrorMessage 
          error={error}
          onRetry={refreshAllData}
          className="mb-6"
        />
      )}

      {/* Portfolio Dashboard */}
      {loading && !portfolioSummary ? (
        <PortfolioSummarySkeleton />
      ) : (
        <div className="portfolio-dashboard">
          <div className="dashboard-card net-worth">
            <h2 className="dashboard-label">Net Worth</h2>
            <p className="dashboard-value">${portfolioValue.toLocaleString()}</p>
          </div>
          <div className="dashboard-card performance-today">
            <h2 className="dashboard-label">Today's Performance</h2>
            <p className={`dashboard-value ${dailyChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {dailyChange >= 0 ? '+' : ''} 
              {(dailyChange || 0).toFixed(2)}%
            </p>
          </div>
          <div className="dashboard-card performance-year">
            <h2 className="dashboard-label">Overall Performance</h2>
            <p className={`dashboard-value ${portfolioSummary?.overall_gain_loss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {portfolioSummary?.overall_gain_loss >= 0 ? '+' : ''}
              {(portfolioSummary?.overall_gain_loss || 0).toFixed(2)}%
            </p>
          </div>
          
          {/* Market Data Card */}
          <div className="dashboard-card">
            <h2 className="dashboard-label">Market Data</h2>
            <div className="flex mt-4 space-x-2">
              <button 
                onClick={updateMarketPrices}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center"
                disabled={loading}
              >
                {loading ? "Updating..." : "Update Prices"}
                {loading ? (
                  <svg className="animate-spin ml-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  <svg className="ml-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                )}
              </button>
              
              <button 
                onClick={triggerPortfolioCalculation}
                
                className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 flex items-center"
                disabled={loading}
              >
                {loading ? "Calculating..." : "Calculate Portfolio"}
                {loading ? (
                  <svg className="animate-spin ml-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  <svg className="ml-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                )}
              </button>
            </div>
            
            <p className="text-sm text-gray-500 mt-2">
              Last updated: {portfolioSummary?.last_price_update ? new Date(portfolioSummary.last_price_update).toLocaleString() : 'Never'}
            </p>
          </div>
        </div>
      )}
      
      {/* Portfolio Summary Section - Display if we have data */}
      {portfolioSummary && portfolioSummary.top_holdings && portfolioSummary.top_holdings.length > 0 && (
        <div className="portfolio-summary mt-6">
          <div className="summary-header">
            <h2 className="summary-title">Portfolio Summary</h2>
            <div className="text-gray-500 text-sm">
              {new Date().toLocaleDateString(undefined, {month: 'long', day: 'numeric', year: 'numeric'})}
            </div>
          </div>
          
          <div className="summary-body">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Top Holdings */}
              <div className="summary-section border rounded-xl">
                <div className="summary-section-header">
                  <h3 className="summary-section-title">Top Holdings</h3>
                </div>
                <div className="summary-section-body">
                  <table className="summary-table">
                    <thead>
                      <tr>
                        <th>Ticker</th>
                        <th className="text-right">Value</th>
                        <th className="text-right">% of Portfolio</th>
                        <th className="text-right">Gain/Loss</th>
                      </tr>
                    </thead>
                    <tbody>
                      {portfolioSummary.top_holdings.map((holding) => (
                        <tr key={holding.ticker}>
                          <td className="ticker-cell">
                            <div className="ticker-icon">{holding.ticker.slice(0, 1)}</div>
                            {holding.ticker}
                          </td>
                          <td className="value-cell">${holding.value.toLocaleString()}</td>
                          <td className="percent-cell">{holding.percentage.toFixed(2)}%</td>
                          <td className="gain-loss-cell">
                            {holding.gain_loss !== undefined ? (
                              <div className="gain-loss-value">
                                <span className={`gain-loss-percent ${holding.gain_loss >= 0 ? 'gain-positive' : 'gain-negative'}`}>
                                  {holding.gain_loss >= 0 ? '+' : ''}{holding.gain_loss.toFixed(2)}%
                                </span>
                                <span className={`gain-loss-amount ${holding.gain_loss >= 0 ? 'gain-positive' : 'gain-negative'}`}>
                                  {holding.gain_loss_amount >= 0 ? '+' : ''}${Math.abs(holding.gain_loss_amount).toLocaleString(undefined, {maximumFractionDigits: 2})}
                                </span>
                              </div>
                            ) : (
                              <span className="gain-neutral">N/A</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              
              {/* Overview and Gain/Loss */}
              <div className="flex flex-col gap-4">
                {/* Overview Card */}
                <div className="summary-section border rounded-xl">
                  <div className="summary-section-header">
                    <h3 className="summary-section-title">Overview</h3>
                  </div>
                  <div className="summary-section-body">
                    <div className="overview-list">
                      <div className="overview-item">
                        <span className="overview-label">Total Accounts</span>
                        <span className="overview-value">{portfolioSummary.accounts_count}</span>
                      </div>
                      <div className="overview-item">
                        <span className="overview-label">Total Positions</span>
                        <span className="overview-value">{portfolioSummary.positions_count}</span>
                      </div>
                      <div className="overview-item border-t border-gray-100 pt-2 mt-2">
                        <span className="overview-label">Total Net Worth</span>
                        <span className="overview-value text-lg">${portfolioSummary.net_worth.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Gain/Loss Card */}
                <div className="summary-section border rounded-xl">
                  <div className="summary-section-header">
                    <h3 className="summary-section-title">Performance</h3>
                  </div>
                  <div className="summary-section-body">
                    <div className="gain-loss-grid">
                      <div className="gain-loss-card">
                        <div className="gain-loss-period">Today</div>
                        <div className={`gain-loss-percentage ${portfolioSummary.daily_change >= 0 ? 'gain-positive' : 'gain-negative'}`}>
                          {portfolioSummary.daily_change >= 0 ? '+' : ''}{(portfolioSummary.daily_change || 0).toFixed(2)}%
                        </div>
                        <div className={`gain-loss-dollar ${portfolioSummary.daily_change >= 0 ? 'gain-positive' : 'gain-negative'}`}>
                          {portfolioSummary.daily_change >= 0 ? '+' : ''}${((portfolioSummary.net_worth * (portfolioSummary.daily_change || 0)) / 100).toFixed(2)}
                        </div>
                      </div>
                      
                      <div className="gain-loss-card">
                        <div className="gain-loss-period">Overall</div>
                        <div className={`gain-loss-percentage ${portfolioSummary.overall_gain_loss >= 0 ? 'gain-positive' : 'gain-negative'}`}>
                          {portfolioSummary.overall_gain_loss >= 0 ? '+' : ''}{(portfolioSummary.overall_gain_loss || 0).toFixed(2)}%
                        </div>
                        <div className={`gain-loss-dollar ${portfolioSummary.overall_gain_loss >= 0 ? 'gain-positive' : 'gain-negative'}`}>
                          {portfolioSummary.overall_gain_loss_amount >= 0 ? '+' : ''}${Math.abs(portfolioSummary.overall_gain_loss_amount || 0).toLocaleString(undefined, {maximumFractionDigits: 2})}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Chart Section */}
      <div className="portfolio-timeframe mt-6">
        {["1W", "1M", "6M", "YTD", "1Y", "5Y", "Max"].map((time) => (
          <button
            key={time}
            className={`time-btn ${selectedTimeframe === time ? "time-btn-active" : ""}`}
            onClick={() => setSelectedTimeframe(time)}
          >
            {time}
          </button>
        ))}
      </div>

      {loading ? (
        <SkeletonLoader type="chart" height="h-60" className="mb-10" />
      ) : (
        <div className="portfolio-chart">
          <Line data={chartData} options={chartOptions} />
        </div>
      )}

      {/* Accounts Section */}
      <section className="portfolio-accounts">
        <div className="accounts-header">
          <h2 className="accounts-title">Your Accounts</h2>
          <div className="flex space-x-2">
            <button className="add-account-btn" onClick={handleOpenBulkUpload}> 
              📋 Bulk Upload
            </button>
            <button className="add-account-btn" onClick={handleOpenAddAccount}>
              ➕ Add Account
            </button>
          </div>
        </div>
        
        {loading && !accounts.length ? (
          <AccountsTableSkeleton />
        ) : accounts.length > 0 ? (
          <table className="accounts-table">
            <thead>
              <tr>
                <th className="table-header">Account Name</th>
                <th className="table-header">Institution</th>
                <th className="table-header">Category</th>
                <th className="table-header">Type</th>
                <th className="table-header">Balance</th>
                <th className="table-header">Cost Basis</th>
                <th className="table-header">Gain/Loss</th>
                <th className="table-header">Last Updated</th>
                <th className="table-header">Actions</th>
              </tr>
            </thead>
            <tbody>
              {accounts.map((account) => {
                // Calculate gain/loss for the account
                const costBasis = account.cost_basis || calculateAccountCostBasis(account.id);
                const gainLoss = account.balance - costBasis;
                const gainLossPercent = costBasis > 0 ? (gainLoss / costBasis) * 100 : 0;
                
                return (
                  <tr 
                    key={account.id} 
                    className="table-row hover:bg-gray-50 cursor-pointer"
                    onClick={() => handleAccountDetailClick(account)}
                  >
                    <td className="table-cell font-medium">{account.account_name}</td>
                    <td className="table-cell">
                      <div className="flex items-center">
                        {getInstitutionLogo(account.institution) ? (
                          <img 
                            src={getInstitutionLogo(account.institution)} 
                            alt={account.institution} 
                            className="w-6 h-6 object-contain mr-2"
                            onError={(e) => {
                              e.target.src = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjI0IiBoZWlnaHQ9IjI0IiBmaWxsPSIjZTJlOGYwIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtc2l6ZT0iMTIiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGFsaWdubWVudC1iYXNlbGluZT0ibWlkZGxlIiBmb250LWZhbWlseT0ic2Fucy1zZXJpZiIgZmlsbD0iIzk0YTNiOCI+PzwvdGV4dD48L3N2Zz4=";
                            }}
                          />
                        ) : account.institution && (
                          <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center mr-2 text-xs font-medium">
                            {account.institution.charAt(0)}
                          </div>
                        )}
                        {account.institution || "N/A"}
                      </div>
                    </td>
                    <td className="table-cell">{account.account_category || "N/A"}</td>
                    <td className="table-cell">{account.type || "N/A"}</td>
                    <td className="table-cell">${account.balance.toLocaleString()}</td>
                    <td className="table-cell">${costBasis.toLocaleString()}</td>
                    <td className="table-cell">
                      <div className="flex flex-col">
                        <span className={gainLoss >= 0 ? "text-green-600" : "text-red-600"}>
                          {gainLoss >= 0 ? "+" : ""}{gainLoss.toLocaleString('en-US', {style: 'currency', currency: 'USD'})}
                        </span>
                        <span className={`text-xs ${gainLoss >= 0 ? "text-green-600" : "text-red-600"}`}>
                          {gainLoss >= 0 ? "+" : ""}{gainLossPercent.toFixed(2)}%
                        </span>
                      </div>
                    </td>
                    <td className="table-cell">{new Date(account.updated_at).toLocaleDateString()}</td>
                    <td className="table-cell actions-cell" onClick={(e) => e.stopPropagation()}>
                      <button
                        className="action-btn edit-btn"
                        onClick={() => handleOpenEditAccount(account)}
                        title="Edit Account"
                      >
                        ⚙️
                      </button>
                      <button
                        className="action-btn add-position-btn"
                        onClick={() => handleInitiateAddPosition(account.id)}
                        title="Add Position"
                      >
                        ➕
                      </button>
                      <button
                        className="action-btn delete-btn"
                        onClick={() => handleOpenDeleteAccount(account)}
                        title="Delete Account"
                      >
                        🗑️
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          !error && (
            <p className="accounts-empty">
              🥚 Add accounts by clicking "Add Account" to start tracking your{" "}
              <span className="text-blue-600">NestEGG</span>!
            </p>
          )
        )}
      </section>

      {/* Positions Section */}
      {Object.keys(positions).length > 0 && (
        <section className="portfolio-positions mt-10">
          <h2 className="accounts-title mb-6">Holdings</h2>
          
          {loading && Object.keys(positions).every(key => positions[key].length === 0) ? (
            <PositionsTableSkeleton />
          ) : (
            Object.entries(positions).map(([accountId, accountPositions]) => {
              const account = accounts.find(a => a.id === parseInt(accountId));
              if (!account || !accountPositions.length) return null;
              
              return (
                <div key={accountId} className="mb-8 bg-white p-4 rounded-lg shadow-sm">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="text-lg font-semibold">{account.account_name}</h3>
                    <button 
                      className="px-3 py-1 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600 transition-colors"
                      onClick={() => handleInitiateAddPosition(parseInt(accountId))}
                    >
                      ➕ Add Position
                    </button>
                  </div>
                  
                  <table className="accounts-table">
                    <thead>
                      <tr>
                        <th className="table-header">Asset</th>
                        <th className="table-header">Type</th>
                        <th className="table-header">Quantity</th>
                        <th className="table-header">Price</th>
                        <th className="table-header">Value</th>
                        <th className="table-header">Cost Basis</th>
                        <th className="table-header">Gain/Loss</th>
                        <th className="table-header">Purchase Date</th>
                        <th className="table-header">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {accountPositions.map((position) => {
                        // Get position identifier based on type
                        const positionType = position.positionType || determinePositionType(position);
                        let identifier, quantity, price, costBasisPerUnit, costBasisTotal, value;
                        
                        // Set variables based on position type
                        if (positionType === 'security') {
                          identifier = position.ticker;
                          quantity = position.shares;
                          price = position.price;
                          costBasisPerUnit = position.cost_basis || position.price;
                          costBasisTotal = costBasisPerUnit * quantity;
                          value = position.value || (price * quantity);
                        } else if (positionType === 'crypto') {
                          identifier = position.coin_symbol;
                          quantity = position.quantity;
                          price = position.current_price;
                          costBasisPerUnit = position.purchase_price;
                          costBasisTotal = costBasisPerUnit * quantity;
                          value = price * quantity;
                        } else if (positionType === 'metal') {
                          identifier = `${position.metal_type} (${position.unit})`;
                          quantity = position.quantity;
                          price = position.purchase_price; // Current price might be different
                          costBasisPerUnit = position.cost_basis || position.purchase_price;
                          costBasisTotal = costBasisPerUnit * quantity;
                          value = price * quantity;
                        } else if (positionType === 'realestate') {
                          identifier = position.address ? position.address.split(',')[0] : 'Property';
                          quantity = 1; // Real estate is typically 1 unit
                          price = position.estimated_market_value;
                          costBasisPerUnit = position.purchase_price;
                          costBasisTotal = costBasisPerUnit;
                          value = price; // Same as estimated_market_value
                        }
                        
                        const gainLoss = value - costBasisTotal;
                        const gainLossPercent = costBasisTotal > 0 ? (gainLoss / costBasisTotal) * 100 : 0;
                        
                        return (
                          <tr 
                            key={position.id} 
                            className="table-row hover:bg-gray-50 cursor-pointer"
                            onClick={() => handlePositionDetailClick(position)}
                          >
                            <td className="table-cell font-medium">{identifier}</td>
                            <td className="table-cell">{positionType.charAt(0).toUpperCase() + positionType.slice(1)}</td>
                            <td className="table-cell">{quantity.toLocaleString(undefined, {maximumFractionDigits: 8})}</td>
                            <td className="table-cell">${price.toLocaleString(undefined, {maximumFractionDigits: 2})}</td>
                            <td className="table-cell">${value.toLocaleString(undefined, {maximumFractionDigits: 2})}</td>
                            <td className="table-cell">${costBasisTotal.toLocaleString(undefined, {maximumFractionDigits: 2})}</td>
                            <td className="table-cell">
                              <div className="flex flex-col">
                                <span className={gainLoss >= 0 ? "text-green-600" : "text-red-600"}>
                                  {gainLoss >= 0 ? "+" : ""}{gainLoss.toLocaleString('en-US', {style: 'currency', currency: 'USD', maximumFractionDigits: 2})}
                                </span>
                                <span className={`text-xs ${gainLoss >= 0 ? "text-green-600" : "text-red-600"}`}>
                                  {gainLoss >= 0 ? "+" : ""}{gainLossPercent.toFixed(2)}%
                                </span>
                              </div>
                            </td>
                            <td className="table-cell">{position.purchase_date ? new Date(position.purchase_date).toLocaleDateString() : 'N/A'}</td>
                            <td className="table-cell actions-cell" onClick={(e) => e.stopPropagation()}>
                              <button
                                className="action-btn edit-btn"
                                onClick={() => handleOpenEditPosition(position)}
                                title="Edit Position"
                              >
                                ⚙️
                              </button>
                              <button
                                className="action-btn delete-btn"
                                onClick={() => handleOpenDeletePosition(position)}
                                title="Delete Position"
                              >
                                🗑️
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              );
            })
          )}
          
          {/* Display message if no positions found across all accounts */}
          {!loading && accounts.length > 0 && Object.values(positions).every(posList => posList.length === 0) && (
            <p className="text-center text-gray-500 mt-6">No positions found in any account. Add positions to your accounts to start tracking your investments.</p>
          )}
        </section>
      )}

      {/* --- Render All Modal Components --- */}
      
      {/* Account Modals */}
      <AddAccountModal 
        isOpen={isAddAccountModalOpen}
        onClose={() => setIsAddAccountModalOpen(false)}
        onAccountAdded={refreshAllData}
      />

      <EditAccountModal
        isOpen={isEditAccountModalOpen}
        onClose={() => setIsEditAccountModalOpen(false)}
        accountData={accountToEdit}
        onAccountUpdated={refreshAllData}
      />

      <SelectAccountModal
        isOpen={isSelectAccountModalOpen}
        onClose={() => setIsSelectAccountModalOpen(false)}
        onAccountSelected={handleAccountSelectedForPosition}
      />

      <SelectPositionTypeModal
        isOpen={isSelectPositionTypeModalOpen}
        onClose={() => setIsSelectPositionTypeModalOpen(false)}
        onTypeSelected={handlePositionTypeSelected}
      />

      {/* Add Position Modals */}
      <AddSecurityPositionModal
        isOpen={isAddSecurityModalOpen}
        onClose={() => setIsAddSecurityModalOpen(false)}
        accountId={selectedAccountIdForPosition}
        onPositionAdded={() => {
          refreshAccountPositions(selectedAccountIdForPosition);
          setIsAddSecurityModalOpen(false);
        }}
      />
      
      <AddCryptoPositionModal
        isOpen={isAddCryptoModalOpen}
        onClose={() => setIsAddCryptoModalOpen(false)}
        accountId={selectedAccountIdForPosition}
        onPositionAdded={() => {
          refreshAccountPositions(selectedAccountIdForPosition);
          setIsAddCryptoModalOpen(false);
        }}
      />
      
      <AddMetalPositionModal
        isOpen={isAddMetalModalOpen}
        onClose={() => setIsAddMetalModalOpen(false)}
        accountId={selectedAccountIdForPosition}
        onPositionAdded={() => {
          refreshAccountPositions(selectedAccountIdForPosition);
          setIsAddMetalModalOpen(false);
        }}
      />
      
      <AddRealEstatePositionModal
        isOpen={isAddRealEstateModalOpen}
        onClose={() => setIsAddRealEstateModalOpen(false)}
        accountId={selectedAccountIdForPosition}
        onPositionAdded={() => {
          refreshAccountPositions(selectedAccountIdForPosition);
          setIsAddRealEstateModalOpen(false);
        }}
      />
      
      {/* Edit Position Modals */}
      <EditSecurityPositionModal
        isOpen={isEditSecurityModalOpen}
        onClose={() => setIsEditSecurityModalOpen(false)}
        positionData={positionToEdit}
        onPositionUpdated={() => {
          // Find which account this position belongs to
          let accountId = null;
          if (positionToEdit) {
            accountId = positionToEdit.account_id;
            if (!accountId) {
              // Find account ID from positions state
              for (const [accId, positionsList] of Object.entries(positions)) {
                if (positionsList.some(p => p.id === positionToEdit.id)) {
                  accountId = parseInt(accId);
                  break;
                }
              }
            }
          }
          if (accountId) refreshAccountPositions(accountId);
          setIsEditSecurityModalOpen(false);
        }}
      />
      
      <EditCryptoPositionModal
        isOpen={isEditCryptoModalOpen}
        onClose={() => setIsEditCryptoModalOpen(false)}
        positionData={positionToEdit}
        onPositionUpdated={() => {
          const accountId = positionToEdit?.account_id;
          if (accountId) refreshAccountPositions(accountId);
          setIsEditCryptoModalOpen(false);
        }}
      />
      
      <EditMetalPositionModal
        isOpen={isEditMetalModalOpen}
        onClose={() => setIsEditMetalModalOpen(false)}
        positionData={positionToEdit}
        onPositionUpdated={() => {
          const accountId = positionToEdit?.account_id;
          if (accountId) refreshAccountPositions(accountId);
          setIsEditMetalModalOpen(false);
        }}
      />
      
      <EditRealEstatePositionModal
        isOpen={isEditRealEstateModalOpen}
        onClose={() => setIsEditRealEstateModalOpen(false)}
        positionData={positionToEdit}
        onPositionUpdated={() => {
          const accountId = positionToEdit?.account_id;
          if (accountId) refreshAccountPositions(accountId);
          setIsEditRealEstateModalOpen(false);
        }}
      />

      {/* Delete Confirmation */}
      <ConfirmDeleteModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDeletion}
        itemName={itemToDelete.name || itemToDelete.type || 'item'}
      />

      {/* Bulk Upload Modals */}
      <BulkUploadAccountSelectModal
        isOpen={isBulkUploadAccountSelectOpen}
        onClose={() => setIsBulkUploadAccountSelectOpen(false)}
        accounts={accounts}
        isLoading={loading && accounts.length === 0}
        onAccountSelected={handleBulkAccountSelected}
      />
      
      <BulkUploadDataPasteModal
        isOpen={isBulkUploadDataPasteOpen}
        onClose={() => setIsBulkUploadDataPasteOpen(false)}
        selectedAccount={selectedBulkAccount}
        onUploadComplete={() => {
          if (selectedBulkAccount) refreshAccountPositions(selectedBulkAccount.id);
          setIsBulkUploadDataPasteOpen(false);
        }}
        onBack={() => {
          setIsBulkUploadDataPasteOpen(false);
          setIsBulkUploadAccountSelectOpen(true);
        }}
      />
    </div>
  );
}