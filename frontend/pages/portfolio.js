import { useContext, useEffect, useState } from "react";
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
import { API_BASE_URL, fetchWithAuth } from '@/utils/api';



// Portfolio component to display user portfolio data, accounts, and manage interactions
export default function Portfolio() {
  const { user, setUser } = useContext(AuthContext);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState([]);
  const [positions, setPositions] = useState({});
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [portfolioValue, setPortfolioValue] = useState(0);
  const [dailyChange, setDailyChange] = useState(0);
  const [yearlyChange, setYearlyChange] = useState(0);
  const [selectedTimeframe, setSelectedTimeframe] = useState("1Y");
  const [isAddAccountModalOpen, setIsAddAccountModalOpen] = useState(false);
  const [isEditAccountModalOpen, setIsEditAccountModalOpen] = useState(false);
  const [error, setError] = useState(null);
  const [isAddPositionModalOpen, setIsAddPositionModalOpen] = useState(false);
  const [isUSSecuritiesModalOpen, setIsUSSecuritiesModalOpen] = useState(false);
  const [isEditPositionModalOpen, setIsEditPositionModalOpen] = useState(false);
  const [isDeletePositionModalOpen, setIsDeletePositionModalOpen] = useState(false);
  const [isSelectAccountModalOpen, setIsSelectAccountModalOpen] = useState(false);
  const [accountName, setAccountName] = useState("");
  const [institution, setInstitution] = useState("");
  const [accountType, setAccountType] = useState("");
  const [balance, setBalance] = useState(0);
  const [editAccount, setEditAccount] = useState(null);
  const [editPosition, setEditPosition] = useState(null);
  const [deletePositionId, setDeletePositionId] = useState(null);
  const [institutionSuggestions, setInstitutionSuggestions] = useState([]);
  const [selectedPositionDetail, setSelectedPositionDetail] = useState(null);
  const [isPositionDetailModalOpen, setIsPositionDetailModalOpen] = useState(false);
  const [formMessage, setFormMessage] = useState("");
  const [testQuery, setTestQuery] = useState('');
  const [testResults, setTestResults] = useState([]);
  const [testLoading, setTestLoading] = useState(false);
  const [testError, setTestError] = useState(null);
  const [securitySearch, setSecuritySearch] = useState("");
  const [accountCategory, setAccountCategory] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [securityPrice, setSecurityPrice] = useState(0);
  const [selectedAccountDetail, setSelectedAccountDetail] = useState(null);
  const [isAccountDetailModalOpen, setIsAccountDetailModalOpen] = useState(false);
  const [securityShares, setSecurityShares] = useState(0);
  const [showSystemStatus, setShowSystemStatus] = useState(false);
  const [portfolioSummary, setPortfolioSummary] = useState(null);
  const { triggerCartwheel } = useEggMascot();
  const [purchaseDate, setPurchaseDate] = useState("");
  const [costPerShare, setCostPerShare] = useState(0);
  const [isBulkUploadModalOpen, setIsBulkUploadModalOpen] = useState(false);
  const [selectedBulkAccount, setSelectedBulkAccount] = useState(null);
  const [bulkData, setBulkData] = useState("");
  const [isProcessingBulk, setIsProcessingBulk] = useState(false);
  const [bulkUploadStep, setBulkUploadStep] = useState(1);
  const [totalCost, setTotalCost] = useState(0);


  // Fetch user data and accounts on component mount
  useEffect(() => {
    const fetchUserData = async () => {


      try {
        console.log("🔍 Fetching user data...");
        const response = await fetchWithAuth('/user');

        if (response.ok) {
          const userData = await response.json();
          console.log("✅ User data fetched:", userData);
          setUser(userData);
          fetchAccounts();
          fetchPortfolioSummary();
        } else {
          console.log("❌ Failed to fetch user data. Logging out.");
          localStorage.removeItem("token");
          router.push("/login");
        }
      } catch (error) {
        console.error("🔥 Error fetching user data:", error);
        router.push("/login");
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [router, setUser]);

// In portfolio.js, inside the useEffect for event listeners
useEffect(() => {
  // Event handlers for navbar actions
  const handleOpenAddPositionModal = () => setIsAddPositionModalOpen(true);
  const handleOpenAddAccountModal = () => setIsAddAccountModalOpen(true);
  const handleResetSelectedAccount = () => setSelectedAccount(null);
  const handleOpenSelectAccountModal = () => {
    setSelectedAccount(null);
    setIsAddPositionModalOpen(false); // Close position type modal if open
    setIsUSSecuritiesModalOpen(false); // Close securities modal if open
    setIsSelectAccountModalOpen(true); // Open account selection modal
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

const handleAccountDetailClick = (account) => {
  setSelectedAccountDetail(account);
  setIsAccountDetailModalOpen(true);
};

const handlePositionDetailClick = (position) => {
  setSelectedPositionDetail(position);
  setIsPositionDetailModalOpen(true);
};

// Helper function to calculate account cost basis
const calculateAccountCostBasis = (accountId) => {
  if (!positions[accountId]) return 0;
  
  return positions[accountId].reduce((total, position) => {
    const positionCostBasis = position.cost_basis || position.price; // Fallback to price if cost_basis not available
    return total + (positionCostBasis * position.shares);
  }, 0);
};




// Fetch portfolio summary
const fetchPortfolioSummary = async () => {
  try {
    const response = await fetchWithAuth('/portfolio/summary');
    
    if (response.ok) {
      const data = await response.json();
      setPortfolioSummary(data);
      setPortfolioValue(data.net_worth || 0);
      
      // Set daily and yearly change from API response
      if (data.daily_change !== undefined) {
        setDailyChange(data.daily_change);
      }
      
      if (data.yearly_change !== undefined) {
        setYearlyChange(data.yearly_change);
      }
    }
  } catch (error) {
    console.error("Error fetching portfolio summary:", error);
  }
};

// Add this array to your portfolio.js, outside the component function
// Top 50 financial institutions including traditional brokerages, banks, and crypto platforms
const popularBrokerages = [
  // Traditional Brokerages & Investment Firms
  { 
    name: "Vanguard", 
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/6/62/Vanguard_Group_logo.svg/240px-Vanguard_Group_logo.svg.png" 
  },
  { 
    name: "Fidelity", 
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/15/Fidelity_Investments_logo.svg/240px-Fidelity_Investments_logo.svg.png" 
  },
  { 
    name: "Charles Schwab", 
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9e/Charles_Schwab_Corporation_logo.svg/240px-Charles_Schwab_Corporation_logo.svg.png" 
  },
  { 
    name: "TD Ameritrade", 
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/90/TD_Ameritrade.svg/240px-TD_Ameritrade.svg.png" 
  },
  { 
    name: "E*TRADE", 
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/42/ETrade_Logo.svg/240px-ETrade_Logo.svg.png" 
  },
  { 
    name: "Robinhood", 
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3c/Robinhood_Logo.png/240px-Robinhood_Logo.png" 
  },
  { 
    name: "Interactive Brokers", 
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c4/Interactive_Brokers_Logo.svg/240px-Interactive_Brokers_Logo.svg.png" 
  },
  { 
    name: "Merrill Lynch", 
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/7/79/Merrill_Lynch_logo.svg/240px-Merrill_Lynch_logo.svg.png" 
  },
  { 
    name: "T. Rowe Price", 
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/54/T._Rowe_Price_logo.svg/240px-T._Rowe_Price_logo.svg.png" 
  },
  { 
    name: "Ally Invest", 
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/d/df/Ally_Financial_logo.svg/240px-Ally_Financial_logo.svg.png" 
  },
  
  // Major Banks
  { 
    name: "JPMorgan Chase", 
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/af/J.P._Morgan_logo_2008_SQUARE.svg/240px-J.P._Morgan_logo_2008_SQUARE.svg.png" 
  },
  { 
    name: "Bank of America", 
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/23/Bank_of_America_logo.svg/240px-Bank_of_America_logo.svg.png" 
  },
  { 
    name: "Wells Fargo", 
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b3/Wells_Fargo_Bank.svg/240px-Wells_Fargo_Bank.svg.png" 
  },
  { 
    name: "Citibank", 
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7a/Citibank.svg/240px-Citibank.svg.png" 
  },
  { 
    name: "Goldman Sachs", 
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/6/61/Goldman_Sachs.svg/240px-Goldman_Sachs.svg.png" 
  },
  { 
    name: "Morgan Stanley", 
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/ce/Morgan_Stanley_Logo_1.svg/240px-Morgan_Stanley_Logo_1.svg.png" 
  },
  { 
    name: "HSBC", 
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/aa/HSBC_logo_%282018%29.svg/240px-HSBC_logo_%282018%29.svg.png" 
  },
  { 
    name: "Capital One", 
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/98/Capital_One_logo.svg/240px-Capital_One_logo.svg.png" 
  },
  { 
    name: "PNC Bank", 
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/6/68/PNC_Financial_Services_logo.svg/240px-PNC_Financial_Services_logo.svg.png" 
  },
  { 
    name: "US Bank", 
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/15/U.S._Bank_logo.svg/240px-U.S._Bank_logo.svg.png" 
  },
  
  // Crypto Exchanges
  { 
    name: "Coinbase", 
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/17/Coinbase_logo.svg/240px-Coinbase_logo.svg.png" 
  },
  { 
    name: "Binance", 
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e8/Binance_Logo.svg/240px-Binance_Logo.svg.png" 
  },
  { 
    name: "Kraken", 
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/7/70/Kraken_logo.svg/240px-Kraken_logo.svg.png" 
  },
  { 
    name: "Gemini", 
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c7/Gemini_logo.svg/240px-Gemini_logo.svg.png" 
  },
  { 
    name: "Crypto.com", 
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/98/Crypto.com_logo.svg/240px-Crypto.com_logo.svg.png" 
  },
  { 
    name: "Bitstamp", 
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/58/Bitstamp_Logo.svg/240px-Bitstamp_Logo.svg.png" 
  },
  
  // International & Other
  { 
    name: "Barclays", 
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7b/Barclays_logo.svg/240px-Barclays_logo.svg.png" 
  },
  { 
    name: "Deutsche Bank", 
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7b/Deutsche_Bank_logo_without_wordmark.svg/240px-Deutsche_Bank_logo_without_wordmark.svg.png" 
  },
  { 
    name: "UBS", 
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0a/UBS_Logo.svg/240px-UBS_Logo.svg.png" 
  },
  { 
    name: "Credit Suisse", 
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/f/ff/Credit_Suisse_2022_logo.svg/240px-Credit_Suisse_2022_logo.svg.png" 
  },
  { 
    name: "RBC", 
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8a/Royal_Bank_of_Canada_logo.svg/240px-Royal_Bank_of_Canada_logo.svg.png" 
  },
  { 
    name: "TD Bank", 
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a4/Toronto-Dominion_Bank_logo.svg/240px-Toronto-Dominion_Bank_logo.svg.png" 
  },
  { 
    name: "Scotiabank", 
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9f/Scotiabank_Logo.svg/240px-Scotiabank_Logo.svg.png" 
  },
  { 
    name: "ING", 
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/80/ING_Group_N.V._Logo.svg/240px-ING_Group_N.V._Logo.svg.png" 
  },
  { 
    name: "BBVA", 
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7f/BBVA_2019.svg/240px-BBVA_2019.svg.png" 
  },
  { 
    name: "Santander", 
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/b/bc/Santander_Bank_logo.svg/240px-Santander_Bank_logo.svg.png" 
  },
  
  // Additional Financial Institutions
  { 
    name: "American Express", 
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/f/fa/American_Express_logo_%282018%29.svg/240px-American_Express_logo_%282018%29.svg.png" 
  },
  { 
    name: "Discover", 
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/40/Discover_Financial_Services_logo.svg/240px-Discover_Financial_Services_logo.svg.png" 
  },
  { 
    name: "M1 Finance", 
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1a/M1_Finance_Logo.svg/240px-M1_Finance_Logo.svg.png" 
  },
  { 
    name: "Wealthsimple", 
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9a/Wealthsimple_Logo.svg/240px-Wealthsimple_Logo.svg.png" 
  },
  { 
    name: "State Street", 
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7b/State_Street_Corporation_logo.svg/240px-State_Street_Corporation_logo.svg.png" 
  },
  { 
    name: "BNY Mellon", 
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c7/BNY_Mellon_logo.svg/240px-BNY_Mellon_logo.svg.png" 
  },
  { 
    name: "BlackRock", 
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a0/BlackRock_wordmark.svg/240px-BlackRock_wordmark.svg.png" 
  },
  { 
    name: "Northern Trust", 
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8a/Northern_Trust_logo.svg/240px-Northern_Trust_logo.svg.png" 
  },
  { 
    name: "Truist", 
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/6/64/Truist_Logo.svg/240px-Truist_Logo.svg.png" 
  },
  { 
    name: "Citizens Bank", 
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e4/Citizens_Bank.svg/240px-Citizens_Bank.svg.png" 
  },
  { 
    name: "Fifth Third Bank", 
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/12/Fifth_Third_Bank_logo.svg/240px-Fifth_Third_Bank_logo.svg.png" 
  },
  { 
    name: "Huntington Bank", 
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/af/Huntington_Bancshares_logo.svg/240px-Huntington_Bancshares_logo.svg.png" 
  },
  { 
    name: "KeyBank", 
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9e/KeyBank_logo.svg/240px-KeyBank_logo.svg.png" 
  },
  { 
    name: "M&T Bank", 
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9d/M%26T_Bank_logo.svg/240px-M%26T_Bank_logo.svg.png" 
  }
];

const updateMarketPrices = async () => {
  setLoading(true);
  try {
    const response = await fetchWithAuth('/market/update-prices-v2', {
      method: "POST"
    });
    
    if (response.ok) {
      const data = await response.json();
      // Use setError for success messages too, with a short timeout
      setError(`Success: ${data.message}`);
      // Clear success message after 3 seconds
      setTimeout(() => setError(null), 3000);
      // Refresh positions to show updated prices
      fetchAccounts();
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

// Function to parse bulk data for preview
const getParsedBulkData = () => {
  if (!bulkData.trim()) return [];
  
  const lines = bulkData.split(/\r?\n/).filter(line => line.trim());
  const parsedData = [];
  
  for (const line of lines) {
    // Try to determine delimiter
    let row;
    if (line.includes('\t')) {
      row = line.split('\t');
    } else if (line.includes(',')) {
      row = line.split(',');
    } else if (line.includes(';')) {
      row = line.split(';');
    } else {
      // Use spaces as last resort, but this might be unreliable
      row = line.split(/\s+/);
    }
    
    // If we have at least some data, add it to the parsed results
    if (row.length >= 1) {
      // Ensure we always have 5 columns
      while (row.length < 5) row.push('');
      parsedData.push(row.slice(0, 5).map(item => item.trim()));
    }
  }
  
  return parsedData;
};

// Add this function near your other function declarations like updateMarketPrices, fetchAccounts, etc.
// This should be inside your Portfolio component but outside the return statement
const triggerPortfolioCalculation = async () => {
  setLoading(true);
  try {
    const response = await fetchWithAuth('/portfolios/calculate/user', {
      method: "POST"
    });
    
    if (response.ok) {
      const data = await response.json();
      alert(data.message);
      // Refresh accounts to show updated values
      fetchAccounts();
      fetchPortfolioSummary();
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

const fetchAccounts = async () => {
  try {
    setLoading(true);
    setError(null);
    const response = await fetchWithAuth('/accounts');

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to fetch accounts: ${response.status} ${errorText}`);
    }

    const data = await response.json();

    if (data.accounts && Array.isArray(data.accounts)) {
      setAccounts(data.accounts);
      
      // Calculate total portfolio value
      const totalValue = data.accounts.reduce(
        (sum, account) => sum + account.balance,
        0
      );
      setPortfolioValue(totalValue);
      
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
    setLoading(false);
  }
};
  
// get logo for account table
const getInstitutionLogo = (institutionName) => {
  if (!institutionName) return null;
  
  const brokerage = popularBrokerages.find(
    broker => broker.name.toLowerCase() === institutionName.toLowerCase()
  );
  
  return brokerage ? brokerage.logo : null;
};

  // Fetch positions for an account
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
    // Add this if you want to show errors for individual position fetches
    // setError(`Failed to load positions for one or more accounts. ${error.message}`);
  }
};

// Add this function with your other function declarations
const handleTestSearch = async () => {
  if (!testQuery) return;
  
  setTestLoading(true);
  setTestError(null);
  
  try {

    const response = await fetchWithAuth(`/securities/search?query=${encodeURIComponent(testQuery)}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Search failed: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json();
    console.log("DIRECT API RESULTS:", data);
    setTestResults(data.results || []);
  } catch (err) {
    console.error("Test search error:", err);
    setTestError(err.message);
  } finally {
    setTestLoading(false);
  }
};

// Enhanced searchSecurities function
// Enhanced searchSecurities function
const searchSecurities = async (query) => {
  if (!query || query.length < 1) {
    setSearchResults([]);
    return [];
  }
  
  try {
    console.log(`Searching securities with query: "${query}"`);
    
    const response = await fetchWithAuth(`/securities/search?query=${encodeURIComponent(query)}`);
        
    // Enhanced error handling
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Securities search error: ${response.status} - ${errorText}`);
      throw new Error(`Failed to search securities: ${response.status}`);
    }
    
    const data = await response.json();
    console.log("Search results:", data);
    
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
    
    console.log("Formatted results:", formattedResults);
    
    // Update state with search results
    setSearchResults(formattedResults);
    return formattedResults;
  } catch (error) {
    console.error("Error searching securities:", error);
    setSearchResults([]);
    return [];
  }
};

const handleInstitutionInput = (value) => {
    setInstitution(value);
    
    if (value.trim().length > 0) {
      const filteredSuggestions = popularBrokerages.filter(
        brokerage => brokerage.name.toLowerCase().includes(value.toLowerCase())
      );
      setInstitutionSuggestions(filteredSuggestions);
    } else {
      setInstitutionSuggestions([]);
    }
  };
  
  const selectInstitution = (institutionName) => {
    setInstitution(institutionName);
    setInstitutionSuggestions([]);
  };

// Handle adding a new account
const handleAddAccount = async (e) => {
  e.preventDefault();
  if (!accountName.trim()) {
    setFormMessage("Account name is required");
    return;
  }

  if (!accountCategory) {
    setFormMessage("Account category is required");
    return;
  }

  try {
    const response = await fetchWithAuth('/accounts', {
      method: "POST",
      body: JSON.stringify({
        account_name: accountName,
        institution: institution || "",
        type: accountType || "",
        account_category: accountCategory,
        balance: parseFloat(balance) || 0
      })
    });

    if (response.ok) {
      setFormMessage("Account added successfully!");
      setAccountName("");
      setInstitution("");
      setAccountType("");
      setAccountCategory(""); // Reset this field too
      setBalance(0);
      
      setTimeout(() => {
        setIsAddAccountModalOpen(false);
        setFormMessage("");
        fetchAccounts();
        fetchPortfolioSummary();
      }, 1000);
    } else {
      const errorData = await response.json();
      setFormMessage(`Failed to add account: ${JSON.stringify(errorData)}`);
    }
  } catch (error) {
    console.error("🔥 Error adding account:", error);
    setFormMessage("Error adding account");
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
        fetchAccounts();
        setEditAccount(null);
      }, 1000);
    } else {
      const errorText = await response.text();
      setFormMessage(`Failed to update account: ${errorText}`);
    }
  } catch (error) {
    console.error("🔥 Error updating account:", error);
    setFormMessage("Error updating account");
  }
};

// diagnostic 
// Add this diagnostic function to help with debugging
const runSecuritiesTest = async () => {
  console.group("Securities Search Diagnostic");
  
  try {

    // First test regular securities endpoint
    console.log("Testing main securities endpoint...");
    const secResponse = await fetchWithAuth('/securities');
    
    console.log("Main endpoint status:", secResponse.status);
    const secData = await secResponse.json();
    console.log("Securities count:", secData.securities ? secData.securities.length : 0);
    
    // Now test search with common tickers
    const testQueries = ["apple", "nke", "ms", "a", "goog"];
    
    for (const query of testQueries) {
      console.log(`Testing search for "${query}"...`);
      const searchUrl = `${API_BASE_URL}/securities/search?query=${encodeURIComponent(query)}`;
      console.log("Request URL:", searchUrl);
      
      const searchResponse = await fetchWithAuth(`/securities/search?query=${encodeURIComponent(query)}`);
      
      console.log(`Search status for "${query}":`, searchResponse.status);
      const searchData = await searchResponse.json();
      console.log(`Results for "${query}":`, searchData.results ? searchData.results.length : 0);
      
      if (searchData.results && searchData.results.length > 0) {
        console.log("First result:", searchData.results[0]);
      }
    }
    
  } catch (error) {
    console.error("Diagnostic error:", error);
  }
  
  console.groupEnd();
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
        alert("Account deleted successfully!");
        fetchAccounts();
        fetchPortfolioSummary();
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
const handleAddPosition = (type) => {
  // If no account is selected yet, show account selector first
  if (!selectedAccount) {
    // Make sure US Securities modal is closed
    setIsUSSecuritiesModalOpen(false);
    setIsSelectAccountModalOpen(true);
  } else {
    if (type === "US Securities") {
      setIsUSSecuritiesModalOpen(true);
    } else if (type === "Crypto") {
      // Add crypto handling logic later
      alert("Crypto support coming soon!");
    } else if (type === "Metals") {
      // Add metals handling logic later
      alert("Precious metals support coming soon!");
    } else if (type === "Manual Asset") {
      // Add manual asset handling logic later
      alert("Manual asset support coming soon!");
    }
    // Add logic for other types in the future
  }
};

// Add this function to help with debugging
const debugSearchProcess = async (query) => {
  console.group(`Securities Search Debug: "${query}"`);
  
  try {
    const response = await fetchWithAuth(`/securities/search?query=${encodeURIComponent(query)}`);

    
    console.log("Response status:", response.status);
    console.log("Response headers:", Object.fromEntries([...response.headers]));
    
    const text = await response.text();
    console.log("Raw response:", text);
    
    try {
      const data = JSON.parse(text);
      console.log("Parsed JSON:", data);
      console.log("Results array:", data.results);
      console.log("Results count:", data.results ? data.results.length : 0);
    } catch (e) {
      console.error("Failed to parse response as JSON:", e);
    }
  } catch (error) {
    console.error("Fetch error:", error);
  }
  
  console.groupEnd();
};


  // Handle security search and get placeholder price
// Update the handleSecuritySearch function
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
  
      const data = await response.json();
      setFormMessage("Position added successfully!");
  
      // Refresh data
      fetchAccounts();
      fetchPositions(selectedAccount);
      fetchPortfolioSummary();
  
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
    }
  };
  

// Handle bulk upload
const handleBulkUpload = async () => {
  if (!bulkData.trim() || !selectedBulkAccount) {
    setFormMessage("Please paste data to upload");
    return;
  }
  
  setIsProcessingBulk(true);
  setFormMessage("");
  
  // Handle Excel-style paste with various possible delimiters
  // Split by newlines first
  const lines = bulkData.split(/\r?\n/).filter(line => line.trim());
  let successCount = 0;
  let errorCount = 0;
  
  try {
    for (const line of lines) {
      // Try to determine delimiter (tab, comma, or even semicolon which Excel might use)
      let row;
      if (line.includes('\t')) {
        row = line.split('\t');
      } else if (line.includes(',')) {
        row = line.split(',');
      } else if (line.includes(';')) {
        row = line.split(';');
      } else {
        // Can't determine delimiter, skip line
        errorCount++;
        continue;
      }
      
      // Skip if we don't have at least 5 columns
      if (row.length < 5) {
        errorCount++;
        continue;
      }
      
      const [ticker, shares, price, costBasis, purchaseDate] = row.map(item => item.trim());
      
      // Validate data
      if (!ticker || isNaN(parseFloat(shares)) || isNaN(parseFloat(price)) || 
          isNaN(parseFloat(costBasis)) || !purchaseDate) {
        errorCount++;
        continue;
      }
      
      try {
        // Parse date in case it's in a different format
        let formattedDate = purchaseDate;
        
        // Try to handle common date formats from Excel
        if (purchaseDate.includes('/')) {
          const parts = purchaseDate.split('/');
          // Assuming MM/DD/YYYY format
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
          console.log(`Failed to add position: ${ticker}, ${shares}, ${price}, ${costBasis}, ${formattedDate}`);
          errorCount++;
        }
      } catch (error) {
        console.error("Error adding position:", error);
        errorCount++;
      }
    }
    
    if (successCount > 0) {
      setFormMessage(`Successfully uploaded ${successCount} positions${errorCount > 0 ? `, ${errorCount} failed` : ''}`);
      fetchAccounts();
      fetchPositions(selectedBulkAccount.id);
      fetchPortfolioSummary();
      
      // Close modal after successful upload
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
    console.error("Error in bulk upload:", error);
    setFormMessage("Error uploading positions");
  } finally {
    setIsProcessingBulk(false);
  }
};

  // Handle updating a position
  const handleUpdatePosition = async (e) => {
    e.preventDefault();
    
    if (!editPosition || !editPosition.shares || !editPosition.price) {
      setFormMessage("Shares and price are required");
      return;
    }
    
    try {
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
          fetchAccounts();
          fetchPositions(editPosition.account_id);
          fetchPortfolioSummary();
          setEditPosition(null);
        }, 1000);
      } else {
        const errorText = await response.text();
        setFormMessage(`Failed to update position: ${errorText}`);
      }
    } catch (error) {
      console.error("Error updating position:", error);
      setFormMessage("Error updating position");
    }
  };

  // Handle clicking the gear icon to edit an account
  const handleEditAccountClick = (account) => {
    setEditAccount({ ...account });
    setIsEditAccountModalOpen(true);
  };

  // Handle clicking the plus icon to add a position
  const handleAddPositionClick = (accountId) => {
    setSelectedAccount(accountId);
    setIsAddPositionModalOpen(true);
  };

  // Handle editing a position
  const handleEditPositionClick = (position) => {
    setEditPosition({ ...position });
    setIsEditPositionModalOpen(true);
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
        
        if (accountId) {
          fetchAccounts();
          fetchPositions(accountId);
          fetchPortfolioSummary();
        }
      } else {
        const errorText = await response.text();
        alert(`Failed to delete position: ${errorText}`);
      }
    } catch (error) {
      console.error("Error deleting position:", error);
      alert("Error deleting position");
    }
  };

  if (loading) return <p className="portfolio-loading">Loading...</p>;
  if (!user) return null;

  const netWorthData = {
    "1W": [250000, 252000, 251500, 253000, 255000, 257500, 260000],
    "1M": [240000, 242500, 245000, 247500, 250000, 252500, 255000],
    "6M": [200000, 210000, 220000, 230000, 240000, 250000, 260000],
    "YTD": [180000, 190000, 200000, 210000, 220000, 230000, 250000],
    "1Y": [200000, 210000, 220000, 230000, 240000, 250000, 260000],
    "5Y": [100000, 150000, 200000, 250000, 300000, 350000, 400000],
    "Max": [50000, 100000, 150000, 200000, 250000, 300000, 350000],
  };

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


// INTERFACE START  
  return (
    <div className="portfolio-container">
      <header className="portfolio-header">
        <h1 className="portfolio-title">Your Portfolio</h1>
        <p className="portfolio-subtitle">Track your NestEgg growth</p>
        
        {/* Add this button */}
        <button 
          onClick={() => setShowSystemStatus(!showSystemStatus)}
          className="mt-2 text-sm text-blue-600 hover:text-blue-800 underline"
        >
          {showSystemStatus ? 'Hide System Status' : 'Show System Status'}
        </button>
      </header>

{/* Add the system status dashboard below the header */}
{showSystemStatus && (
  <>
    <SystemStatusDashboard />
    <SystemEvents />
  </>
)}

{/* Error Message with Retry */}
{error && (
  <ErrorMessage 
    error={error}
    onRetry={() => {
      setError(null);
      setLoading(true);
      fetchAccounts();
      fetchPortfolioSummary();
    }}
    className="mb-6"
  />
)}

{/* TEST SEARCH FUNCTIONALITY */}
<div className="mt-8 p-4 border border-blue-300 rounded bg-blue-50">
  <h3 className="text-lg font-bold mb-2">Test Securities Search</h3>
  <div className="flex gap-2 mb-4">
    <input
      type="text"
      value={testQuery}
      onChange={(e) => setTestQuery(e.target.value)}
      className="px-3 py-2 border rounded flex-grow"
      placeholder="Enter ticker or company name"
    />
    <button
      onClick={handleTestSearch}
      className="px-4 py-2 bg-blue-600 text-white rounded"
      disabled={testLoading}
    >
      {testLoading ? "Searching..." : "Search"}
    </button>
  </div>
  
  {testError && (
    <div className="p-3 mb-4 bg-red-100 text-red-700 rounded">{testError}</div>
  )}
  
  {testResults.length > 0 ? (
    <div>
      <h4 className="font-medium mb-2">Direct API Results:</h4>
      <ul className="bg-white border rounded p-2">
        {testResults.map((result, i) => (
          <li key={i} className="p-2 hover:bg-gray-100">
            <strong>{result.ticker}</strong> 
            {result.name || result.company_name ? ` - ${result.name || result.company_name}` : ''}
            {typeof result.price === 'number' ? ` - $${result.price.toFixed(2)}` : ''}
          </li>
        ))}
      </ul>
    </div>
  ) : (
    !testLoading && <p className="text-gray-500">No results found directly from API</p>
  )}
</div>

      {/* Portfolio Dashboard */}
      {loading ? (
        <PortfolioSummarySkeleton />
      ) : (
        <div className="portfolio-dashboard">
          <div className="dashboard-card net-worth">
            <h2 className="dashboard-label">Net Worth</h2>
            <p className="dashboard-value">${portfolioValue.toLocaleString()}</p>
          </div>
          <div className="dashboard-card performance-today">
            <h2 className="dashboard-label">Today's Performance</h2>
            <p className="dashboard-value">+ $2,500</p>
          </div>
          <div className="dashboard-card performance-year">
            <h2 className="dashboard-label">12-Month Performance</h2>
            <p className="dashboard-value">+ 20%</p>
          </div>
        </div>
      )}





{/* Add this near your other action buttons, perhaps in the portfolio-dashboard section */}
{/* Find your existing dashboard card for market data and update it */}
<div className="dashboard-card">
  <h2 className="dashboard-label">Market Data</h2>
  
  <div className="flex mt-4 space-x-2">
    {/* This is your existing Update Prices button */}
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
    
    {/* This is the new Calculate Portfolio button */}
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

{/* Portfolio Summary Section */}
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
      <section className="portfolio-accounts">
        <div className="accounts-header">
          <h2 className="accounts-title">Your Accounts</h2>
          <div className="flex space-x-2">
            <button className="add-account-btn" onClick={() => setIsBulkUploadModalOpen(true)}>
              📋 Bulk Upload
            </button>
            <button className="add-account-btn" onClick={() => setIsAddAccountModalOpen(true)}>
              ➕ Add Account
            </button>
          </div>
        </div>
        
        {loading ? (
          <AccountsTableSkeleton />
        ) : accounts.length > 0 ? (
          <table className="accounts-table">
    <thead>
      <tr>
        <th className="table-header">Account Name</th>
        <th className="table-header">Institution</th>
        <th className="table-header">Category</th> {/* New column */}
        <th className="table-header">Type</th>
        <th className="table-header">Balance</th>
        <th className="table-header">Cost Basis</th> {/* New column */}
        <th className="table-header">Gain/Loss</th> {/* New column */}
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
                      // Use a data URI instead of placeholder.com
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
                onClick={() => handleEditAccountClick(account)}
                title="Edit Account"
              >
                ⚙️
              </button>
              <button
                className="action-btn add-position-btn"
                onClick={() => handleAddPositionClick(account.id)}
                title="Add Position"
              >
                ➕
              </button>
              <button
                className="action-btn delete-btn"
                onClick={() => handleDeleteAccount(account.id)}
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
    <p className="accounts-empty">
      🥚 Add accounts by clicking "Add Account" to start tracking your{" "}
      <span className="text-blue-600">NestEGG</span>!
    </p>
  )}
</section>

{/* Account Positions Section */}
{Object.keys(positions).length > 0 && (
  <section className="portfolio-positions mt-10">
    <h2 className="accounts-title mb-6">Holdings</h2>
    
    {loading ? (
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
                onClick={() => handleAddPositionClick(account.id)}
              >
                ➕ Add Position
              </button>
            </div>
            
            <table className="accounts-table">
              <thead>
                <tr>
                  <th className="table-header">Ticker</th>
                  <th className="table-header">Shares</th>
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
                  const positionCostBasis = (position.cost_basis || position.price) * position.shares;
                  const gainLoss = position.value - positionCostBasis;
                  const gainLossPercent = positionCostBasis > 0 ? (gainLoss / positionCostBasis) * 100 : 0;
                  
                  return (
                    <tr 
                      key={position.id} 
                      className="table-row hover:bg-gray-50 cursor-pointer"
                      onClick={() => handlePositionDetailClick(position)}
                    >
                      <td className="table-cell font-medium">{position.ticker}</td>
                      <td className="table-cell">{position.shares.toLocaleString()}</td>
                      <td className="table-cell">${position.price.toLocaleString()}</td>
                      <td className="table-cell">${position.value.toLocaleString()}</td>
                      <td className="table-cell">${positionCostBasis.toLocaleString()}</td>
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
                      <td className="table-cell">{position.purchase_date ? new Date(position.purchase_date).toLocaleDateString() : 'N/A'}</td>
                      <td className="table-cell actions-cell" onClick={(e) => e.stopPropagation()}>
                        <button
                          className="action-btn edit-btn"
                          onClick={() => handleEditPositionClick(position)}
                          title="Edit Position"
                        >
                          ⚙️
                        </button>
                        <button
                          className="action-btn delete-btn"
                          onClick={() => handleDeletePositionClick(position.id)}
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
  </section>
)}

      {/* Add Account Modal */}
{/* Add Account Modal */}
{isAddAccountModalOpen && (
  <div className="modal-overlay">
    <div className="modal-content">
      <h2 className="modal-title">Add New Account</h2>
      
      {/* Account Category Selection */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">Account Category</label>
        <div className="flex space-x-4">
          <label className="flex items-center">
            <input
              type="radio"
              name="accountCategory"
              value="brokerage"
              checked={accountCategory === "brokerage"}
              onChange={() => setAccountCategory("brokerage")}
              className="mr-2"
            />
            <span>Brokerage</span>
          </label>
          <label className="flex items-center">
            <input
              type="radio"
              name="accountCategory"
              value="retirement"
              checked={accountCategory === "retirement"}
              onChange={() => setAccountCategory("retirement")}
              className="mr-2"
            />
            <span>Retirement</span>
          </label>
        </div>
      </div>
      
      <form onSubmit={handleAddAccount} className="modal-form">
        <input
          type="text"
          value={accountName}
          onChange={(e) => setAccountName(e.target.value)}
          placeholder="Account Name"
          className="modal-input"
          required
        />
        {/* Replace the existing institution input */}
        <div className="relative">
          <input
            type="text"
            value={institution}
            onChange={(e) => handleInstitutionInput(e.target.value)}
            placeholder="Institution"
            className="modal-input"
          />
          {institutionSuggestions.length > 0 && (
            <div className="absolute left-0 right-0 bg-white border border-gray-300 mt-1 max-h-60 overflow-y-auto rounded-md shadow-lg z-10">
              {institutionSuggestions.map((brokerage, index) => (
                <div 
                  key={index} 
                  className="p-2 hover:bg-gray-100 cursor-pointer flex items-center border-b border-gray-200"
                  onClick={() => selectInstitution(brokerage.name)}
                >
                  <img 
                    src={brokerage.logo} 
                    alt={brokerage.name} 
                    className="w-8 h-8 object-contain mr-3"
                    onError={(e) => e.target.src = "https://via.placeholder.com/32"}
                  />
                  <div className="font-medium">{brokerage.name}</div>
                </div>
              ))}
            </div>
          )}
        </div>
        <select
          value={accountType}
          onChange={(e) => setAccountType(e.target.value)}
          className="modal-input"
        >
          <option value="">-- Select Account Type --</option>
          {accountCategory === "brokerage" ? (
            <>
              <option value="Individual">Individual</option>
              <option value="Joint">Joint</option>
              <option value="Custodial">Custodial</option>
              <option value="Trust">Trust</option>
            </>
          ) : accountCategory === "retirement" ? (
            <>
              <option value="Traditional IRA">Traditional IRA</option>
              <option value="Roth IRA">Roth IRA</option>
              <option value="401(k)">401(k)</option>
              <option value="Roth 401(k)">Roth 401(k)</option>
              <option value="SEP IRA">SEP IRA</option>
              <option value="SIMPLE IRA">SIMPLE IRA</option>
              <option value="HSA">HSA</option>
            </>
          ) : (
            <option value="">Select a category first</option>
          )}
        </select>
        <input
          type="number"
          value={balance}
          onChange={(e) => setBalance(e.target.value)}
          placeholder="Initial Balance"
          className="modal-input"
          min="0"
          step="0.01"
        />
        <div className="modal-buttons">
          <button 
            type="submit" 
            className="modal-submit" 
            disabled={!accountCategory}>
              Add
            </button>
          <button
            type="button"
            className="modal-cancel"
            onClick={() => {
              setIsAddAccountModalOpen(false);
              setAccountName("");
              setInstitution("");
              setAccountType("");
              setAccountCategory("");
              setBalance(0);
              setInstitutionSuggestions([]); // Clear suggestions
              setFormMessage("");
            }}
          >
            Cancel
          </button>
        </div>
      </form>
      {formMessage && (
        <p className={`modal-message ${formMessage.includes("Error") || formMessage.includes("Failed") ? "modal-error" : "modal-success"}`}>
          {formMessage}
        </p>
      )}
    </div>
  </div>
)}

{/* Account Selection Modal */}
{isSelectAccountModalOpen && (
  <div className="modal-overlay">
    <div className="modal-content">
      <h2 className="modal-title">Select Account</h2>
      <p className="mb-4 text-gray-600">Choose an account to add the position to:</p>
      
      <div className="space-y-2 max-h-80 overflow-y-auto">
        {accounts.map((account) => (
          <button
            key={account.id}
            onClick={() => {
              setSelectedAccount(account.id);
              setIsSelectAccountModalOpen(false);
              // After selecting an account, show the position type selection modal
              setIsAddPositionModalOpen(true);
            }}
            className="w-full p-3 border rounded-lg text-left hover:bg-gray-50 flex justify-between items-center"
          >
            <div>
              <p className="font-medium">{account.account_name}</p>
              <p className="text-sm text-gray-500">{account.institution || "N/A"} • {account.type || "N/A"}</p>
            </div>
            <div className="text-blue-600">
              Select →
            </div>
          </button>
        ))}
      </div>
      
      <div className="modal-buttons mt-4">
        <button
          onClick={() => {
            setIsSelectAccountModalOpen(false);
            setSelectedAccount(null);
          }}
          className="modal-cancel"
        >
          Cancel
        </button>
      </div>
    </div>
  </div>
)}

      {/* Edit Account Modal */}
      {isEditAccountModalOpen && editAccount && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2 className="modal-title">Edit Account</h2>
            <form onSubmit={handleEditAccount} className="modal-form">
              <input
                type="text"
                value={editAccount.account_name}
                onChange={(e) => setEditAccount({ ...editAccount, account_name: e.target.value })}
                placeholder="Account Name"
                className="modal-input"
                required
              />
                  <div className="relative">
                    <input
                      type="text"
                      value={editAccount.institution || ""}
                      onChange={(e) => {
                        setEditAccount({ ...editAccount, institution: e.target.value });
                        
                        if (e.target.value.trim().length > 0) {
                          const filteredSuggestions = popularBrokerages.filter(
                            brokerage => brokerage.name.toLowerCase().includes(e.target.value.toLowerCase())
                          );
                          setInstitutionSuggestions(filteredSuggestions);
                        } else {
                          setInstitutionSuggestions([]);
                        }
                      }}
                      placeholder="Institution"
                      className="modal-input"
                    />
                    {institutionSuggestions.length > 0 && (
                      <div className="absolute left-0 right-0 bg-white border border-gray-300 mt-1 max-h-60 overflow-y-auto rounded-md shadow-lg z-10">
                        {institutionSuggestions.map((brokerage, index) => (
                          <div 
                            key={index} 
                            className="p-2 hover:bg-gray-100 cursor-pointer flex items-center border-b border-gray-200"
                            onClick={() => {
                              setEditAccount({ ...editAccount, institution: brokerage.name });
                              setInstitutionSuggestions([]);
                            }}
                          >
                            <img 
                              src={brokerage.logo} 
                              alt={brokerage.name} 
                              className="w-8 h-8 object-contain mr-3"
                              onError={(e) => e.target.src = "/api/placeholder/32/32"}
                            />
                            <div className="font-medium">{brokerage.name}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
              <select
                value={editAccount.type || ""}
                onChange={(e) => setEditAccount({ ...editAccount, type: e.target.value })}
                className="modal-input"
              >
                <option value="">-- Select Account Type --</option>
                <option value="Brokerage">Brokerage</option>
                <option value="IRA">IRA</option>
                <option value="401(k)">401(k)</option>
                <option value="Roth IRA">Roth IRA</option>
                <option value="Savings">Savings</option>
                <option value="Other">Other</option>
              </select>
              <div className="modal-buttons">
                <button type="submit" className="modal-submit">Save</button>
                <button
                  type="button"
                  className="modal-cancel"
                  onClick={() => {
                    setIsEditAccountModalOpen(false);
                    setEditAccount(null);
                    setFormMessage("");
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
            {formMessage && (
              <p className={`modal-message ${formMessage.includes("Error") ? "modal-error" : "modal-success"}`}>
                {formMessage}
              </p>
            )}
          </div>
        </div>
      )}

{/* Add Position Modal */}
{isAddPositionModalOpen && (
  <div className="modal-overlay modal-overlay-action">
    <div className="modal-content rounded-xl overflow-hidden max-w-md">
      <div className="modal-header">
        <h2 className="modal-header-title">Add Securities to Account Portfolio</h2>
      </div>
      
      <div className="p-6">
        <div className="grid grid-cols-2 gap-3 mb-6">
          <button 
            onClick={() => handleAddPosition("US Securities")} 
            className="security-option-btn security-us"
          >
            <svg className="security-option-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 20C7.59 20 4 16.41 4 12C4 7.59 7.59 4 12 4C16.41 4 20 7.59 20 12C20 16.41 16.41 20 12 20ZM9.97 9.47L7.4 12.03L9.97 14.6L8.56 16.01L4.55 12L8.56 7.99L9.97 9.4L7.4 11.97L9.97 14.53L9.97 9.47ZM15.93 9.47L18.5 12.03L15.93 14.6L17.34 16.01L21.35 12L17.34 7.99L15.93 9.4L18.5 11.97L15.93 14.53L15.93 9.47ZM12 10.5L13.5 15.5H10.5L12 10.5Z" fill="white"/>
            </svg>
            <span className="security-option-label">US Securities</span>
          </button>
          
          <button 
            onClick={() => handleAddPosition("Crypto")} 
            className="security-option-btn security-crypto"
          >
            <svg className="security-option-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 20C7.59 20 4 16.41 4 12C4 7.59 7.59 4 12 4C16.41 4 20 7.59 20 12C20 16.41 16.41 20 12 20ZM9.31 17.9L6.1 14.69L7.52 13.27L9.31 15.06L16.48 7.89L17.9 9.31L9.31 17.9Z" fill="white"/>
            </svg>
            <span className="security-option-label">Crypto</span>
          </button>
          
          <button 
            onClick={() => handleAddPosition("Metals")} 
            className="security-option-btn security-metals"
          >
            <svg className="security-option-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 20C7.59 20 4 16.41 4 12C4 7.59 7.59 4 12 4C16.41 4 20 7.59 20 12C20 16.41 16.41 20 12 20ZM13 13H16V15H8V13H11V7H13V13Z" fill="white"/>
            </svg>
            <span className="security-option-label">Metals</span>
          </button>
          
          <button 
            onClick={() => handleAddPosition("Manual Asset")} 
            className="security-option-btn security-manual"
          >
            <svg className="security-option-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 20C7.59 20 4 16.41 4 12C4 7.59 7.59 4 12 4C16.41 4 20 7.59 20 12C20 16.41 16.41 20 12 20ZM11 7H13V13H11V7ZM11 15H13V17H11V15Z" fill="white"/>
            </svg>
            <span className="security-option-label">Manual Asset</span>
          </button>
        </div>
        
        <button
          className="modal-cancel-btn"
          onClick={() => {
            setIsAddPositionModalOpen(false);
            setSelectedAccount(null);
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  </div>
)}

{/* US Securities Modal */}
{isUSSecuritiesModalOpen && (
  <div className="modal-overlay modal-overlay-action">
    <div className="modal-content">
      <h2 className="modal-title">Add US Security</h2>
      <form className="modal-form">
        <div className="search-container relative">
          <input
            type="text"
            value={securitySearch}
            onChange={(e) => handleSecuritySearch(e.target.value)}
            placeholder="Search ticker (e.g., AAPL, MSFT, GOOGL)"
            className="modal-input"
            required
          />
            {searchResults.length > 0 && (
              <div className="search-results absolute left-0 right-0 bg-white border border-gray-300 mt-1 max-h-60 overflow-y-auto rounded-md shadow-lg z-10">
                {searchResults.map((result) => (
                  <div 
                    key={result.ticker} 
                    className="search-result-item p-3 hover:bg-gray-100 cursor-pointer flex justify-between items-center border-b border-gray-200"
                    onClick={() => {
                      setSecuritySearch(result.ticker);
                      setSecurityPrice(result.price || 0);
                      setSearchResults([]);
                    }}
                  >
                    <div>
                      <div className="font-bold text-blue-800">{result.ticker}</div>
                      <div className="text-sm text-gray-700">{result.name}</div>
                      {result.sector && (
                        <div className="text-xs text-gray-500">
                          {result.sector} {result.industry ? `• ${result.industry}` : ''}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col items-end">
                      <div className="text-sm font-semibold">${(result.price || 0).toFixed(2)}</div>
                      {typeof result.market_cap === 'number' && result.market_cap > 0 && (
                        <div className="text-xs text-gray-500">
                          Market Cap: ${(result.market_cap / 1_000_000_000).toFixed(1)}B
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
        </div>
        
        {securitySearch && (
          <>
            <div className="mt-4 p-3 bg-gray-100 rounded-lg">
              <p className="font-semibold">{securitySearch.toUpperCase()}</p>
              <div className="flex justify-between mt-1">
                <p className="text-sm text-gray-600">Current Price:</p>
                <input
                  type="number"
                  value={securityPrice}
                  onChange={(e) => setSecurityPrice(e.target.value)}
                  step="0.01"
                  min="0.01"
                  className="w-28 p-1 border rounded text-right"
                />
              </div>
            </div>
            
            {/* Shares Input */}
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Number of Shares
              </label>
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
                className="modal-input"
                min="0.01"
                step="0.01"
                required
              />
            </div>
            
            {/* Purchase Date */}
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Purchase Date
              </label>
              <input
                type="date"
                value={purchaseDate}
                onChange={(e) => setPurchaseDate(e.target.value)}
                className="modal-input"
                max={new Date().toISOString().split('T')[0]}
                required
              />
            </div>
            
            {/* Cost Basis Section */}
            <div className="mt-4 grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cost Per Share
                </label>
                <input
                  type="number"
                  value={costPerShare}
                  onChange={(e) => {
                    const costPerShare = parseFloat(e.target.value);
                    setCostPerShare(costPerShare);
                    setTotalCost(securityShares * costPerShare);
                  }}
                  className="modal-input"
                  min="0.01"
                  step="0.01"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Total Cost
                </label>
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
                  className="modal-input"
                  min="0.01"
                  step="0.01"
                  required
                />
              </div>
            </div>
            
            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <p className="text-sm">Current Value: <span className="font-semibold">${(securityPrice * securityShares).toFixed(2)}</span></p>
              {totalCost > 0 && (
                <p className="text-sm mt-1">
                  Gain/Loss: 
                  <span className={`font-semibold ${((securityPrice * securityShares) - totalCost) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {' '}${((securityPrice * securityShares) - totalCost).toFixed(2)} 
                    ({(((securityPrice * securityShares) / totalCost - 1) * 100).toFixed(2)}%)
                  </span>
                </p>
              )}
            </div>
          </>
        )}
        
        <div className="modal-buttons">
          <button
            type="button"
            className="modal-submit"
            onClick={handleAddSecurity}
            disabled={!securitySearch || securityShares <= 0 || securityPrice <= 0 || !costPerShare || !purchaseDate}
          >
            Add Position
          </button>
          <button
            type="button"
            className="modal-cancel"
            onClick={() => {
              setIsUSSecuritiesModalOpen(false);
              // Don't reset selectedAccount here since we need it for the next modal
              setSecuritySearch("");
              setSecurityShares(0);
              setSecurityPrice(0);
              setSearchResults([]);
              setCostPerShare(0);
              setTotalCost(0);
              setPurchaseDate("");
            }}
          >
            Cancel
          </button>
        </div>
      </form>
      {formMessage && (
        <p className={`modal-message ${formMessage.includes("Error") ? "modal-error" : "modal-success"}`}>
          {formMessage}
        </p>
      )}
    </div>
  </div>
)}
      
      {/* Edit Position Modal */}
      {isEditPositionModalOpen && editPosition && (
  <div className="modal-overlay modal-overlay-action">
    <div className="modal-content">
            <h2 className="modal-title">Edit Position</h2>
            <form onSubmit={handleUpdatePosition} className="modal-form">
              <div className="p-3 bg-gray-100 rounded-lg mb-4">
                <p className="font-semibold">{editPosition.ticker}</p>
              </div>
              
              <label className="block mb-1 font-medium">Shares</label>
              <input
                type="number"
                value={editPosition.shares}
                onChange={(e) => setEditPosition({ ...editPosition, shares: e.target.value })}
                className="modal-input"
                min="0.01"
                step="0.01"
                required
              />
              
              <label className="block mt-3 mb-1 font-medium">Price</label>
              <input
                type="number"
                value={editPosition.price}
                onChange={(e) => setEditPosition({ ...editPosition, price: e.target.value })}
                className="modal-input"
                min="0.01"
                step="0.01"
                required
              />
              
              <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                <p className="text-sm">Total Value: <span className="font-semibold">
                  ${(editPosition.shares * editPosition.price).toFixed(2)}
                </span></p>
              </div>
              
              <div className="modal-buttons">
                <button type="submit" className="modal-submit">Update</button>
                <button
                  type="button"
                  className="modal-cancel"
                  onClick={() => {
                    setIsEditPositionModalOpen(false);
                    setEditPosition(null);
                    setFormMessage("");
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
            {formMessage && (
              <p className={`modal-message ${formMessage.includes("Error") ? "modal-error" : "modal-success"}`}>
                {formMessage}
              </p>
            )}
          </div>
        </div>
      )}
      
      {/* Delete Position Confirmation Modal */}
      {isDeletePositionModalOpen && (
          <div className="modal-overlay modal-overlay-action">
          <div className="modal-content">
            <h2 className="modal-title text-red-600">Delete Position</h2>
            <p className="my-4">Are you sure you want to delete this position? This action cannot be undone.</p>
            <div className="modal-buttons">
              <button
                onClick={confirmDeletePosition}
                className="modal-cancel bg-red-600"
              >
                Delete
              </button>
              <button
                onClick={() => {
                  setIsDeletePositionModalOpen(false);
                  setDeletePositionId(null);
                }}
                className="modal-submit bg-gray-500"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

{/* Account Detail Modal */}
{isAccountDetailModalOpen && selectedAccountDetail && (
  <div className="modal-overlay">
    <div className="modal-content max-width-1100px h-3/4 flex flex-col">
      <div className="account-modal-header bg-gradient-to-r from-blue-600 to-indigo-700 text-white p-6 rounded-t-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {getInstitutionLogo(selectedAccountDetail.institution) ? (
              <img 
                src={getInstitutionLogo(selectedAccountDetail.institution)} 
                alt={selectedAccountDetail.institution} 
                className="w-12 h-12 object-contain bg-white rounded-lg p-1"
              />
            ) : (
              <div className="w-12 h-12 rounded-lg bg-white flex items-center justify-center text-blue-600 text-xl font-bold">
                {selectedAccountDetail.account_name.charAt(0)}
              </div>
            )}
            <div>
              <h2 className="text-2xl font-bold">{selectedAccountDetail.account_name}</h2>
              <p className="text-blue-100">{selectedAccountDetail.institution || "N/A"} • {selectedAccountDetail.type || "N/A"}</p>
            </div>
          </div>
          <button 
            onClick={() => setIsAccountDetailModalOpen(false)}
            className="text-white hover:text-blue-200 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="grid grid-cols-4 gap-4 mt-6">
          <div className="bg-white bg-opacity-20 p-3 rounded-lg">
            <p className="text-sm text-blue-100">Balance</p>
            <p className="text-xl font-semibold">${selectedAccountDetail.balance.toLocaleString()}</p>
          </div>
          <div className="bg-white bg-opacity-20 p-3 rounded-lg">
            <p className="text-sm text-blue-100">Cost Basis</p>
            <p className="text-xl font-semibold">${calculateAccountCostBasis(selectedAccountDetail.id).toLocaleString()}</p>
          </div>
          <div className="bg-white bg-opacity-20 p-3 rounded-lg">
            <p className="text-sm text-blue-100">Gain/Loss</p>
            {(() => {
              const costBasis = calculateAccountCostBasis(selectedAccountDetail.id);
              const gainLoss = selectedAccountDetail.balance - costBasis;
              return (
                <p className={`text-xl font-semibold ${gainLoss >= 0 ? "text-green-300" : "text-red-300"}`}>
                  {gainLoss >= 0 ? "+" : ""}{gainLoss.toLocaleString('en-US', {style: 'currency', currency: 'USD'})}
                </p>
              );
            })()}
          </div>
          <div className="bg-white bg-opacity-20 p-3 rounded-lg">
            <p className="text-sm text-blue-100">Performance</p>
            {(() => {
              const costBasis = calculateAccountCostBasis(selectedAccountDetail.id);
              const gainLoss = selectedAccountDetail.balance - costBasis;
              const gainLossPercent = costBasis > 0 ? (gainLoss / costBasis) * 100 : 0;
              return (
                <p className={`text-xl font-semibold ${gainLoss >= 0 ? "text-green-300" : "text-red-300"}`}>
                  {gainLoss >= 0 ? "+" : ""}{gainLossPercent.toFixed(2)}%
                </p>
              );
            })()}
          </div>
        </div>
      </div>
      
      <div className="account-modal-body bg-white p-6 overflow-y-auto flex-grow rounded-b-xl">
        <h3 className="text-xl font-bold mb-4">Holdings</h3>
        
        {positions[selectedAccountDetail.id] && positions[selectedAccountDetail.id].length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rank</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ticker</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Shares</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Value</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Cost Basis</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Gain/Loss</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">% of Account</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {positions[selectedAccountDetail.id]
                  .sort((a, b) => b.value - a.value)
                  .map((position, index) => {
                    const positionCostBasis = position.cost_basis * position.shares || 0;
                    const gainLoss = position.value - positionCostBasis;
                    const gainLossPercent = positionCostBasis > 0 ? (gainLoss / positionCostBasis) * 100 : 0;
                    const accountPercent = (position.value / selectedAccountDetail.balance) * 100;
                    
                    return (
                      <tr 
                        key={position.id} 
                        className="hover:bg-gray-50 cursor-pointer"
                        onClick={() => handlePositionDetailClick(position)}
                      >
                        <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{index + 1}</td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{position.ticker}</td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{position.shares.toLocaleString()}</td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 text-right">${position.price.toLocaleString()}</td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 text-right">${position.value.toLocaleString()}</td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 text-right">${positionCostBasis.toLocaleString()}</td>
                        <td className="px-4 py-4 whitespace-nowrap text-right">
                          <div className="flex flex-col items-end">
                            <span className={`text-sm font-medium ${gainLoss >= 0 ? "text-green-600" : "text-red-600"}`}>
                              {gainLoss >= 0 ? "+" : ""}{gainLoss.toLocaleString('en-US', {style: 'currency', currency: 'USD'})}
                            </span>
                            <span className={`text-xs ${gainLoss >= 0 ? "text-green-600" : "text-red-600"}`}>
                              {gainLoss >= 0 ? "+" : ""}{gainLossPercent.toFixed(2)}%
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 text-right">{accountPercent.toFixed(2)}%</td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-500 text-center py-8">No positions found in this account.</p>
        )}
        
        <div className="mt-6 flex justify-end">
          <button
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            onClick={() => handleAddPositionClick(selectedAccountDetail.id)}
          >
            Add New Position
          </button>
        </div>
      </div>
    </div>
  </div>
)}

{/* Position Detail Modal */}
{isPositionDetailModalOpen && selectedPositionDetail && (
  <div className="modal-overlay">
    <div className="modal-content max-w-4xl h-3/4 flex flex-col">
      <div className="position-modal-header bg-gradient-to-r from-indigo-600 to-purple-700 text-white p-6 rounded-t-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 rounded-lg bg-white flex items-center justify-center text-purple-600 text-xl font-bold">
              {selectedPositionDetail.ticker.charAt(0)}
            </div>
            <div>
              <h2 className="text-2xl font-bold">{selectedPositionDetail.ticker}</h2>
              <p className="text-purple-100">
                {selectedPositionDetail.shares.toLocaleString()} shares • 
                ${selectedPositionDetail.price.toLocaleString()} per share
              </p>
            </div>
          </div>
          <button 
            onClick={() => setIsPositionDetailModalOpen(false)}
            className="text-white hover:text-purple-200 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="grid grid-cols-4 gap-4 mt-6">
          {(() => {
            const positionCostBasis = (selectedPositionDetail.cost_basis || selectedPositionDetail.price) * selectedPositionDetail.shares;
            const gainLoss = selectedPositionDetail.value - positionCostBasis;
            const gainLossPercent = positionCostBasis > 0 ? (gainLoss / positionCostBasis) * 100 : 0;
            
            return (
              <>
                <div className="bg-white bg-opacity-20 p-3 rounded-lg">
                  <p className="text-sm text-purple-100">Current Value</p>
                  <p className="text-xl font-semibold">${selectedPositionDetail.value.toLocaleString()}</p>
                </div>
                <div className="bg-white bg-opacity-20 p-3 rounded-lg">
                  <p className="text-sm text-purple-100">Cost Basis</p>
                  <p className="text-xl font-semibold">${positionCostBasis.toLocaleString()}</p>
                </div>
                <div className="bg-white bg-opacity-20 p-3 rounded-lg">
                  <p className="text-sm text-purple-100">Gain/Loss</p>
                  <p className={`text-xl font-semibold ${gainLoss >= 0 ? "text-green-300" : "text-red-300"}`}>
                    {gainLoss >= 0 ? "+" : ""}{gainLoss.toLocaleString('en-US', {style: 'currency', currency: 'USD'})}
                  </p>
                </div>
                <div className="bg-white bg-opacity-20 p-3 rounded-lg">
                  <p className="text-sm text-purple-100">Performance</p>
                  <p className={`text-xl font-semibold ${gainLoss >= 0 ? "text-green-300" : "text-red-300"}`}>
                    {gainLoss >= 0 ? "+" : ""}{gainLossPercent.toFixed(2)}%
                  </p>
                </div>
              </>
            );
          })()}
        </div>
      </div>
      
      <div className="position-modal-body bg-white p-6 overflow-y-auto flex-grow rounded-b-xl">
        <h3 className="text-xl font-bold mb-4">Performance Trend</h3>
        
        <div className="h-64 bg-white p-4 rounded-lg border mb-6">
          {/* Mock chart - in a real app, you would use actual historical data */}
          <div className="h-full flex items-center justify-center">
            <div className="text-center text-gray-500">
              <p>Historical chart will appear here</p>
              <p className="text-sm">This would show performance relative to cost basis over time</p>
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-6">
          <div>
            <h4 className="font-semibold mb-2 text-gray-700">Position Details</h4>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="text-sm">
                  <p className="text-gray-500">Purchase Date</p>
                  <p className="font-medium">
                    {selectedPositionDetail.purchase_date 
                      ? new Date(selectedPositionDetail.purchase_date).toLocaleDateString() 
                      : 'N/A'}
                  </p>
                </div>
                <div className="text-sm">
                  <p className="text-gray-500">Days Held</p>
                  <p className="font-medium">
                    {selectedPositionDetail.purchase_date 
                      ? Math.floor((new Date() - new Date(selectedPositionDetail.purchase_date)) / (1000 * 60 * 60 * 24))
                      : 'N/A'}
                  </p>
                </div>
                <div className="text-sm">
                  <p className="text-gray-500">Cost Per Share</p>
                  <p className="font-medium">${(selectedPositionDetail.cost_basis || selectedPositionDetail.price).toLocaleString()}</p>
                </div>
                <div className="text-sm">
                  <p className="text-gray-500">Current Price</p>
                  <p className="font-medium">${selectedPositionDetail.price.toLocaleString()}</p>
                </div>
              </div>
            </div>
          </div>
          
          <div>
            <h4 className="font-semibold mb-2 text-gray-700">Account Information</h4>
            <div className="bg-gray-50 rounded-lg p-4">
              {(() => {
                const account = accounts.find(a => 
                  a.id === (selectedPositionDetail.account_id || parseInt(Object.keys(positions).find(
                    id => positions[id].some(p => p.id === selectedPositionDetail.id)
                  )))
                );
                
                if (!account) return <p>Account information not available</p>;
                
                return (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="text-sm">
                      <p className="text-gray-500">Account</p>
                      <p className="font-medium">{account.account_name}</p>
                    </div>
                    <div className="text-sm">
                      <p className="text-gray-500">Institution</p>
                      <p className="font-medium">{account.institution || 'N/A'}</p>
                    </div>
                    <div className="text-sm">
                      <p className="text-gray-500">Type</p>
                      <p className="font-medium">{account.type || 'N/A'}</p>
                    </div>
                    <div className="text-sm">
                      <p className="text-gray-500">Category</p>
                      <p className="font-medium">{account.account_category || 'N/A'}</p>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
        
        <div className="mt-6 flex justify-end space-x-3">
          <button
            className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
            onClick={() => {
              setIsPositionDetailModalOpen(false);
              handleEditPositionClick(selectedPositionDetail);
            }}
          >
            Edit Position
          </button>
          <button
            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
            onClick={() => {
              setIsPositionDetailModalOpen(false);
              handleDeletePositionClick(selectedPositionDetail.id);
            }}
          >
            Delete Position
          </button>
        </div>
      </div>
    </div>
  </div>
)}
















      {/* Bulk Upload Modal Step 1: Select Account */}
{isBulkUploadModalOpen && bulkUploadStep === 1 && (
  <div className="modal-overlay">
    <div className="modal-content">
      <h2 className="modal-title">Bulk Upload Positions</h2>
      <p className="mb-4 text-gray-600">Select an account to bulk upload positions:</p>
      
      <div className="space-y-2 max-h-80 overflow-y-auto">
        {accounts.map((account) => (
          <button
            key={account.id}
            onClick={() => {
              setSelectedBulkAccount(account);
              setBulkUploadStep(2);
            }}
            className="w-full p-3 border rounded-lg text-left hover:bg-gray-50 flex justify-between items-center"
          >
            <div>
              <p className="font-medium">{account.account_name}</p>
              <p className="text-sm text-gray-500">{account.institution || "N/A"} • {account.type || "N/A"}</p>
            </div>
            <div className="text-blue-600">
              Select →
            </div>
          </button>
        ))}
      </div>
      
      <div className="modal-buttons mt-4">
        <button
          onClick={() => {
            setIsBulkUploadModalOpen(false);
            setBulkUploadStep(1);
            setSelectedBulkAccount(null);
          }}
          className="modal-cancel"
        >
          Cancel
        </button>
      </div>
    </div>
  </div>
)}

{/* Bulk Upload Modal Step 2: Paste Data */}
{isBulkUploadModalOpen && bulkUploadStep === 2 && selectedBulkAccount && (
  <div className="modal-overlay">
    <div className="modal-content max-w-4xl">
      <h2 className="modal-title">Bulk Upload to {selectedBulkAccount.account_name}</h2>
      
      <div className="mb-4">
        <p className="mb-2 text-gray-600">Copy and paste directly from Excel or a spreadsheet.</p>
        
        {/* Data Input Area */}
        <div className="mb-4">
          <textarea
            value={bulkData}
            onChange={(e) => setBulkData(e.target.value)}
            placeholder="Paste your data here..."
            className="w-full h-32 p-3 border rounded-lg font-mono text-sm"
          />
        </div>
        
        {/* Data Preview Grid */}
        <div className="mb-4">
          <h3 className="text-sm font-semibold mb-2">Data Preview:</h3>
          <div className="border rounded-lg overflow-hidden max-h-64 overflow-y-auto">
            {/* Header Row */}
            <div className="grid grid-cols-5 gap-2 bg-gray-100 p-2 sticky top-0">
              <div className="text-xs font-bold">Ticker</div>
              <div className="text-xs font-bold">Shares</div>
              <div className="text-xs font-bold">Price ($)</div>
              <div className="text-xs font-bold">Cost Per Share ($)</div>
              <div className="text-xs font-bold">Purchase Date</div>
            </div>
            
            {/* Data Rows */}
            {getParsedBulkData().length > 0 ? (
              getParsedBulkData().map((row, rowIndex) => (
                <div key={rowIndex} className={`grid grid-cols-5 gap-2 p-2 ${rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                  <div className="text-xs">{row[0] || ''}</div>
                  <div className="text-xs">{row[1] || ''}</div>
                  <div className="text-xs">{row[2] || ''}</div>
                  <div className="text-xs">{row[3] || ''}</div>
                  <div className="text-xs">{row[4] || ''}</div>
                </div>
              ))
            ) : (
              <div className="p-4 text-center text-gray-500 text-sm">
                Paste your data above to see a preview here
              </div>
            )}
          </div>
        </div>
      </div>
      
      <div className="bg-blue-50 p-4 rounded-lg mb-4 text-sm">
        <h4 className="font-medium text-blue-800 mb-2">Import Instructions:</h4>
        <ol className="list-decimal ml-5 text-blue-700 space-y-1">
          <li>Arrange your Excel data in the order: Ticker, Shares, Price, Cost Per Share, Purchase Date</li>
          <li>Select and copy cells from your spreadsheet (Ctrl+C or Cmd+C)</li>
          <li>Paste into the text area above (Ctrl+V or Cmd+V)</li>
          <li>Verify your data in the preview grid below</li>
          <li>Dates can be in MM/DD/YYYY or YYYY-MM-DD format</li>
        </ol>
      </div>
      
      <div className="modal-buttons">
        <button
          onClick={() => handleBulkUpload()}
          className="modal-submit flex items-center justify-center"
          disabled={!bulkData.trim() || isProcessingBulk || getParsedBulkData().length === 0}
        >
          {isProcessingBulk ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Processing...
            </>
          ) : (
            `Upload ${getParsedBulkData().length} Positions`
          )}
        </button>
        <button
          onClick={() => setBulkUploadStep(1)}
          className="px-4 py-2 rounded-lg border hover:bg-gray-50"
        >
          Back
        </button>
        <button
          onClick={() => {
            setIsBulkUploadModalOpen(false);
            setBulkUploadStep(1);
            setSelectedBulkAccount(null);
            setBulkData("");
          }}
          className="modal-cancel"
        >
          Cancel
        </button>
      </div>
      
      {formMessage && (
        <p className={`modal-message ${formMessage.includes("Error") || formMessage.includes("Failed") ? "modal-error" : "modal-success"}`}>
          {formMessage}
        </p>
      )}
    </div>
  </div>
)}
    </div>
  );
}