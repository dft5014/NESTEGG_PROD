// components/modals/SecurityPositionModal.js
import React, { useState, useEffect, useCallback, useRef } from 'react';
import FixedModal from './FixedModal';
import { addSecurityPosition, searchSecurities, updatePosition } from '@/utils/apimethods/positionMethods';
import { fetchAccountById } from '@/utils/apimethods/accountMethods';
import debounce from 'lodash.debounce';
import { 
  Search, 
  X, 
  Check, 
  TrendingUp, 
  TrendingDown, 
  Clock,
  DollarSign,
  Percent,
  Tag,
  BarChart4,
  Plus,
  Edit
} from 'lucide-react';

const SecurityPositionModal = ({ 
  isOpen, 
  onClose, 
  accountId, 
  accountName = '',  // Add default empty string
  onPositionSaved, 
  positionToEdit = null 
}) => {  
  // Original data to compare for changes
  const originalData = useRef(null);
  
  // State for form fields
  const [ticker, setTicker] = useState('');
  const [shares, setShares] = useState('');
  const [currentPrice, setCurrentPrice] = useState('');
  const [costPerShare, setCostPerShare] = useState('');
  const [totalCost, setTotalCost] = useState('');
  const [purchaseDate, setPurchaseDate] = useState('');
  
  // Security details
  const [securityDetails, setSecurityDetails] = useState(null);
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedSecurity, setSelectedSecurity] = useState(null);
  
  // Form state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formMessage, setFormMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const [isEditMode, setIsEditMode] = useState(false);
  const [isCalculatingFromTotal, setIsCalculatingFromTotal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  
  // Track which fields have been changed
  const [changedFields, setChangedFields] = useState({});

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      console.log("SecurityPositionModal - positionToEdit:", positionToEdit);
      
      // Get account name if provided
      if (accountId && !accountName) {
        fetchAccountById(accountId)
          .then(account => {
            accountName = account.account_name || '';
          })
          .catch(err => console.error("Error fetching account name:", err));
      }
      
      if (positionToEdit) {
        // Edit mode - pre-fill form with position data
        setIsEditMode(true);
        
        const tickerValue = positionToEdit.ticker || '';
        const sharesValue = positionToEdit.shares?.toString() || '';
        const priceValue = positionToEdit.price?.toString() || '';
        const costValue = positionToEdit.cost_basis?.toString() || positionToEdit.price?.toString() || '';
        
        // Calculate total cost
        const shareVal = parseFloat(positionToEdit.shares || 0);
        const costVal = parseFloat(positionToEdit.cost_basis || positionToEdit.price || 0);
        const totalValue = !isNaN(shareVal) && !isNaN(costVal) ? (shareVal * costVal).toFixed(2) : '';
        
        // Format date from ISO to YYYY-MM-DD for input
        const dateValue = positionToEdit.purchase_date 
          ? new Date(positionToEdit.purchase_date).toISOString().split('T')[0]
          : '';
        
        setTicker(tickerValue);
        setShares(sharesValue);
        setCurrentPrice(priceValue);
        setCostPerShare(costValue);
        setTotalCost(totalValue);
        setPurchaseDate(dateValue);
        
        // Store original data for comparison
        originalData.current = {
          ticker: tickerValue,
          shares: sharesValue,
          price: priceValue,
          costPerShare: costValue,
          totalCost: totalValue,
          purchaseDate: dateValue
        };
        
        // Reset changed fields
        setChangedFields({});
        
        setSelectedSecurity({
          ticker: positionToEdit.ticker,
          name: positionToEdit.name || positionToEdit.ticker,
          price: positionToEdit.price,
          sector: positionToEdit.sector || '',
          industry: positionToEdit.industry || '',
          market_cap: positionToEdit.market_cap || 0,
          pe_ratio: positionToEdit.pe_ratio || null,
          dividend_yield: positionToEdit.dividend_yield || null
        });
        
        // Fetch additional details for the security
        if (positionToEdit.ticker) {
          searchSecurities(positionToEdit.ticker)
            .then(results => {
              if (results && results.length > 0) {
                setSecurityDetails(results[0]);
              }
            })
            .catch(err => console.error("Error fetching security details:", err));
        }
      } else {
        // Add mode - reset form
        setIsEditMode(false);
        setTicker('');
        setShares('');
        setCurrentPrice('');
        setCostPerShare('');
        setTotalCost('');
        setPurchaseDate(new Date().toISOString().split('T')[0]); // Default to today
        setSelectedSecurity(null);
        setSecurityDetails(null);
        originalData.current = null;
      }
      
      // Common reset
      setSearchQuery('');
      setSearchResults([]);
      setFormMessage('');
      setSuccessMessage('');
      setMessageType('');
      setIsSubmitting(false);
      setIsCalculatingFromTotal(false);
    }
  }, [isOpen, positionToEdit, accountId, accountName]);
  
  // Update changedFields whenever form fields change
  useEffect(() => {
    if (isEditMode && originalData.current) {
      const newChangedFields = {};
      
      if (ticker !== originalData.current.ticker) newChangedFields.ticker = true;
      if (shares !== originalData.current.shares) newChangedFields.shares = true;
      if (currentPrice !== originalData.current.price) newChangedFields.price = true;
      if (costPerShare !== originalData.current.costPerShare) newChangedFields.costPerShare = true;
      if (purchaseDate !== originalData.current.purchaseDate) newChangedFields.purchaseDate = true;
      
      setChangedFields(newChangedFields);
    }
  }, [ticker, shares, currentPrice, costPerShare, purchaseDate, isEditMode]);

  // Update totalCost when shares or costPerShare changes (if not calculating from total)
  useEffect(() => {
    if (!isCalculatingFromTotal) {
      const numShares = parseFloat(shares);
      const cost = parseFloat(costPerShare);
      
      if (!isNaN(numShares) && !isNaN(cost)) {
        setTotalCost((numShares * cost).toFixed(2));
      } else {
        setTotalCost('');
      }
    }
  }, [shares, costPerShare, isCalculatingFromTotal]);

  // Update costPerShare when totalCost changes (if calculating from total)
  useEffect(() => {
    if (isCalculatingFromTotal) {
      const numShares = parseFloat(shares);
      const total = parseFloat(totalCost);
      
      if (!isNaN(numShares) && numShares > 0 && !isNaN(total)) {
        setCostPerShare((total / numShares).toFixed(2));
      }
    }
  }, [totalCost, shares, isCalculatingFromTotal]);

  // Debounced search function
  const debouncedSearch = useCallback(
    debounce(async (query) => {
      if (!query || query.length < 2) {
        setSearchResults([]);
        setIsSearching(false);
        return;
      }
      
      setIsSearching(true);
      
      try {
        const results = await searchSecurities(query);
        setSearchResults(results);
      } catch (error) {
        console.error('Error searching securities:', error);
        setFormMessage('Error searching for securities. Please try again.');
        setMessageType('error');
      } finally {
        setIsSearching(false);
      }
    }, 300),
    []
  );

  // Handle search query change
  const handleSearchChange = (value) => {
    setSearchQuery(value);
    setTicker(value);
    
    if (value.length >= 2) {
      debouncedSearch(value);
    } else {
      setSearchResults([]);
    }
  };

  // Handle selecting a security from search results
  const handleSelectSecurity = (security) => {
    setSelectedSecurity(security);
    setSecurityDetails(security);
    setTicker(security.ticker);
    
    // Make sure we're storing all fields from the security object
    console.log("Selected security details:", security); // For debugging
  
    // Debug log with explicit property checks
    console.log("Security details properties:", {
      ticker: security.ticker,
      name: security.name,
      price: security.price,
      sector: security.sector,
      industry: security.industry,
      market_cap: security.market_cap,
      pe_ratio: security.pe_ratio,
      dividend_yield: security.dividend_yield,
      fifty_two_week_high: security.fifty_two_week_high,
      fifty_two_week_low: security.fifty_two_week_low,
      avg_volume: security.avg_volume
    });
    
    // Round to 2 decimal places for display and input
    const roundedPrice = parseFloat(security.price || 0).toFixed(2);
    setCurrentPrice(roundedPrice);
    
    // If cost basis is empty, default to current price
    if (!costPerShare) {
      setCostPerShare(roundedPrice);
      
      // Update total cost if shares are already entered
      const numShares = parseFloat(shares);
      const cost = parseFloat(roundedPrice);
      if (!isNaN(numShares) && !isNaN(cost)) {
        setTotalCost((numShares * cost).toFixed(2));
      }
    }
    
    setSearchResults([]);
  };

  // Handle total cost input
  const handleTotalCostChange = (value) => {
    setIsCalculatingFromTotal(true);
    setTotalCost(value);
  };

  // Handle cost per share input
  const handleCostPerShareChange = (value) => {
    setIsCalculatingFromTotal(false);
    setCostPerShare(value);
  };
  
  // Format position name for the title
  const getDisplayName = () => {
    if (!positionToEdit) return '';
    
    const name = positionToEdit.name || '';
    const ticker = positionToEdit.ticker || '';
    
    if (name && ticker && name !== ticker) {
      return `${ticker} | ${name}`;
    }
    
    return ticker || name || 'Security Position';
  };
  
  // Get field class based on whether it's been changed
  const getFieldClass = (fieldName) => {
    const baseClass = "w-full border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500";
    
    if (changedFields[fieldName]) {
      return `${baseClass} border-yellow-300 bg-yellow-50`;
    }
    
    return `${baseClass} border-gray-300`;
  };

  // Handle form submission
  const handleSubmit = async (e, addAnother = false) => {
    e.preventDefault();
    setFormMessage('');
    setSuccessMessage('');
    
    // Validation
    if (!ticker) {
      setFormMessage('Please enter a ticker symbol');
      setMessageType('error');
      return;
    }
    
    if (!shares || parseFloat(shares) <= 0) {
      setFormMessage('Please enter a valid number of shares');
      setMessageType('error');
      return;
    }
    
    if (!currentPrice || parseFloat(currentPrice) <= 0) {
      setFormMessage('Please enter a valid current price');
      setMessageType('error');
      return;
    }
    
    if (!costPerShare || parseFloat(costPerShare) <= 0) {
      setFormMessage('Please enter a valid cost basis');
      setMessageType('error');
      return;
    }
    
    if (!purchaseDate) {
      setFormMessage('Please enter a purchase date');
      setMessageType('error');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const positionData = {
        ticker: ticker.toUpperCase(),
        shares: parseFloat(shares),
        price: parseFloat(currentPrice),
        cost_basis: parseFloat(costPerShare),
        purchase_date: purchaseDate
      };
      
      // Add optional details if available
      if (securityDetails) {
        positionData.name = securityDetails.name;
        positionData.sector = securityDetails.sector;
        positionData.industry = securityDetails.industry;
        positionData.market_cap = securityDetails.market_cap;
        positionData.pe_ratio = securityDetails.pe_ratio;
        positionData.dividend_yield = securityDetails.dividend_yield;
      }
      
      console.log(`${isEditMode ? 'Updating' : 'Adding'} security position:`, positionData);
      
      let result;
      
      if (isEditMode) {
        result = await updatePosition(positionToEdit.id, positionData, 'security');
      } else {
        result = await addSecurityPosition(accountId, positionData);
      }
      
      console.log(`Security position ${isEditMode ? 'updated' : 'added'}:`, result);
      
      // Show success message
      const successMsg = `Security position ${ticker} ${isEditMode ? 'updated' : 'added'} successfully!`;
      setSuccessMessage(successMsg);
      setMessageType('success');
      
      // Call the callback
      if (onPositionSaved) {
        onPositionSaved(result);
      }
      
      // If 'Save and Add Another' was clicked
      if (addAnother) {
        setTimeout(() => {
          // Reset form for a new position
          setTicker('');
          setShares('');
          setCostPerShare('');
          setTotalCost('');
          setSelectedSecurity(null);
          setSecurityDetails(null);
          setSearchQuery('');
          setFormMessage('');
          setSuccessMessage('');
          setIsSubmitting(false);
        }, 1500);
      } else {
        // Close modal after delay
        setTimeout(() => {
          onClose();
        }, 1500);
      }
    } catch (error) {
      console.error(`Error ${isEditMode ? 'updating' : 'adding'} security position:`, error);
      setFormMessage(`Error ${isEditMode ? 'updating' : 'adding'} security position: ${error.message}`);
      setMessageType('error');
      setIsSubmitting(false);
    }
  };

  // Format market cap for display
  const formatMarketCap = (marketCap) => {
    if (!marketCap) return 'N/A';
    
    if (marketCap >= 1e12) {
      return `$${(marketCap / 1e12).toFixed(2)}T`;
    } else if (marketCap >= 1e9) {
      return `$${(marketCap / 1e9).toFixed(2)}B`;
    } else if (marketCap >= 1e6) {
      return `$${(marketCap / 1e6).toFixed(2)}M`;
    } else {
      return `$${marketCap.toLocaleString()}`;
    }
  };
  
  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return 'None';
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <FixedModal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditMode ? `Edit ${getDisplayName()}` : 'Add Security Position'}
    >  
      {/* Error Message */}
      {formMessage && messageType === 'error' && (
        <div className="bg-red-50 text-red-700 p-4 border-l-4 border-red-500 mb-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <X className="h-5 w-5 text-red-500" />
            </div>
            <div className="ml-3">
              <p className="text-sm">{formMessage}</p>
            </div>
          </div>
        </div>
      )}
      
      {/* Success Message */}
      {successMessage && (
        <div className="bg-green-50 text-green-700 p-4 border-l-4 border-green-500 mb-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <Check className="h-5 w-5 text-green-500" />
            </div>
            <div className="ml-3">
              <p className="text-sm">{successMessage}</p>
            </div>
          </div>
        </div>
      )}
      
      <form onSubmit={(e) => handleSubmit(e, false)} className="space-y-4">
        {/* Account Badge at the top */}
        <div className="mb-4 bg-blue-50 p-3 rounded-lg border border-blue-200">
          <div className="flex items-center">
            <Tag className="h-5 w-5 text-blue-600 mr-2" />
            <span className="font-medium text-blue-800">
              {isEditMode ? 'Editing position on:' : 'Adding to:'} {accountName || 'Account'}
            </span>
          </div>
        </div>

        {/* Ticker/Security Search */}
        <div className="relative">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Ticker / Company Name*
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search ticker or company name (e.g., AAPL, Apple)"
              className={`pl-10 pr-4 py-2 ${getFieldClass('ticker')}`}
              required
              disabled={isEditMode}
            />
            {isSearching && (
              <div className="absolute inset-y-0 right-3 flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
              </div>
            )}
          </div>
          {changedFields.ticker && (
            <p className="mt-1 text-xs text-amber-600 flex items-center">
              <Edit className="h-3 w-3 mr-1" />
              Changed from: {originalData.current?.ticker}
            </p>
          )}
          
          {/* Search Results Dropdown */}
          {!isEditMode && searchResults.length > 0 && (
            <div className="absolute z-10 left-0 right-0 mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
              {searchResults.map((result) => (
                <div
                  key={result.ticker}
                  className="p-3 hover:bg-gray-100 cursor-pointer border-b border-gray-200"
                  onClick={() => handleSelectSecurity(result)}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="font-bold text-blue-800">{result.ticker}</span>
                      <span className="ml-2 text-gray-700">{result.name}</span>
                      {result.sector && <div className="text-xs text-gray-500 mt-1">{result.sector} • {result.industry || 'N/A'}</div>}
                    </div>
                    <div className="text-right">
                      <div className="font-medium">${parseFloat(result.price).toFixed(2)}</div>
                      <div className="text-xs text-gray-500">{formatMarketCap(result.market_cap)}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Selected Security Info Card */}
        {selectedSecurity && (
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex justify-between items-center mb-2">
              <div className="flex items-center">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-800 font-bold">
                    {selectedSecurity.ticker && selectedSecurity.ticker.charAt(0)}
                </div>
                <div className="ml-3">
                  <div className="font-bold text-blue-900">{selectedSecurity.ticker}</div>
                  <div className="text-sm text-blue-700">{selectedSecurity.name}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-bold text-lg">${parseFloat(currentPrice).toFixed(2)}</div>
                <div className="text-sm text-gray-600">Current Price</div>
              </div>
            </div>
            
            {/* Additional Details */}
            <div className="mt-3 pt-3 border-t border-blue-200">
              {/* First row */}
              <div className="grid grid-cols-3 gap-4 mb-2">
                <div className="text-center">
                  <div className="text-xs text-gray-500">Sector</div>
                  <div className="font-medium text-blue-800">{selectedSecurity.sector || 'N/A'}</div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-gray-500">Industry</div>
                  <div className="font-medium text-blue-800">{selectedSecurity.industry || 'N/A'}</div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-gray-500">Market Cap</div>
                  <div className="font-medium text-blue-800">{formatMarketCap(selectedSecurity.market_cap)}</div>
                </div>
              </div>
              
              {/* Second row */}
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-xs text-gray-500">P/E Ratio</div>
                  <div className="font-medium text-blue-800">
                    {selectedSecurity.pe_ratio ? selectedSecurity.pe_ratio.toFixed(2) : 'N/A'}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-gray-500">Dividend Yield</div>
                  <div className="font-medium text-blue-800">
                    {selectedSecurity.dividend_yield 
                      ? `${(selectedSecurity.dividend_yield * 100).toFixed(2)}%` 
                      : 'N/A'}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-gray-500">Price As Of</div>
                  <div className="font-medium text-blue-800">
                    {new Date().toLocaleDateString()}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Position Details */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Number of Shares*
            </label>
            <div className="relative">
              <input
                type="number"
                value={shares}
                onChange={(e) => setShares(e.target.value)}
                placeholder="e.g., 10.5"
                step="0.000001"
                min="0.000001"
                className={`pl-3 pr-10 py-2 ${getFieldClass('shares')}`}
                required
              />
              <div className="absolute inset-y-0 right-3 flex items-center text-gray-400">
                <span className="text-xs">shares</span>
              </div>
            </div>
            {changedFields.shares && (
              <p className="mt-1 text-xs text-amber-600 flex items-center">
                <Edit className="h-3 w-3 mr-1" />
                Changed from: {originalData.current?.shares}
              </p>
            )}
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Current Price ($)*
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <DollarSign className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="number"
                value={currentPrice}
                onChange={(e) => setCurrentPrice(e.target.value)}
                placeholder="e.g., 150.25"
                step="0.01"
                min="0"
                className={`pl-10 pr-4 py-2 ${getFieldClass('price')}`}
                required
              />
            </div>
            {changedFields.price && (
              <p className="mt-1 text-xs text-amber-600 flex items-center">
                <Edit className="h-3 w-3 mr-1" />
                Changed from: ${parseFloat(originalData.current?.price).toFixed(2)}
              </p>
            )}
          </div>
        </div>
        
        {/* Cost Basis */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Cost Per Share ($)*
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <DollarSign className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="number"
                value={costPerShare}
                onChange={(e) => handleCostPerShareChange(e.target.value)}
                placeholder="e.g., 145.75"
                step="0.01"
                min="0"
                className={`pl-10 pr-4 py-2 ${getFieldClass('costPerShare')}`}
                required
              />
            </div>
            {changedFields.costPerShare && (
              <p className="mt-1 text-xs text-amber-600 flex items-center">
                <Edit className="h-3 w-3 mr-1" />
                Changed from: ${parseFloat(originalData.current?.costPerShare).toFixed(2)}
              </p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Total Cost ($)
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <DollarSign className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="number"
                value={totalCost}
                onChange={(e) => handleTotalCostChange(e.target.value)}
                placeholder="e.g., 1457.50"
                step="0.01"
                min="0"
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </div>
        
        {/* Purchase Date */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Purchase Date*
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Clock className="h-4 w-4 text-gray-400" />
            </div>
            <input
              type="date"
              value={purchaseDate}
              onChange={(e) => setPurchaseDate(e.target.value)}
              onPaste={(e) => {
                // Allow pasting dates
                e.preventDefault();
                const pastedText = e.clipboardData.getData('text');
                // Try to parse the pasted text as a date
                try {
                  const date = new Date(pastedText);
                  if (!isNaN(date.getTime())) {
                    setPurchaseDate(date.toISOString().split('T')[0]);
                  }
                } catch (err) {
                  console.error("Error parsing pasted date:", err);
                }
              }}
              className={`pl-10 pr-4 py-2 ${getFieldClass('purchaseDate')}`}
              max={new Date().toISOString().split('T')[0]}
              required
            />
          </div>
          {changedFields.purchaseDate && (
            <p className="mt-1 text-xs text-amber-600 flex items-center">
              <Edit className="h-3 w-3 mr-1" />
              Changed from: {formatDate(originalData.current?.purchaseDate)}
            </p>
          )}
        
          {/* Date Helper Buttons */}
          <div className="flex flex-wrap gap-2 mt-2">
            <button
              type="button"
              onClick={() => {
                const date = new Date();
                date.setFullYear(date.getFullYear() - 1);
                setPurchaseDate(date.toISOString().split('T')[0]);
              }}
              className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded transition-colors"
            >
              1yr ago
            </button>
            <button
              type="button"
              onClick={() => {
                const date = new Date();
                date.setFullYear(date.getFullYear() - 2);
                setPurchaseDate(date.toISOString().split('T')[0]);
              }}
              className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded transition-colors"
            >
              2yr ago
            </button>
            <button
              type="button"
              onClick={() => {
                const date = new Date();
                date.setMonth(date.getMonth() - 9);
                setPurchaseDate(date.toISOString().split('T')[0]);
              }}
              className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded transition-colors"
            >
              9mo ago
            </button>
            <button
              type="button"
              onClick={() => {
                const date = new Date();
                date.setMonth(date.getMonth() - 6);
                setPurchaseDate(date.toISOString().split('T')[0]);
              }}
              className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded transition-colors"
            >
              6mo ago
            </button>
            <button
              type="button"
              onClick={() => {
                const date = new Date();
                date.setMonth(date.getMonth() - 3);
                setPurchaseDate(date.toISOString().split('T')[0]);
              }}
              className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded transition-colors"
            >
              3mo ago
            </button>
          </div>
        </div>
        
        {/* Position Summary */}
        {shares && currentPrice && (
          <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex justify-between mb-2">
              <span className="text-gray-500">Current Value:</span>
              <span className="font-bold text-gray-800">
                ${(parseFloat(shares || 0) * parseFloat(currentPrice || 0)).toFixed(2)}
              </span>
            </div>
            
            {costPerShare && (
              <div className="flex justify-between">
                <span className="text-gray-500">Gain/Loss:</span>
                {(() => {
                  const currentVal = parseFloat(shares || 0) * parseFloat(currentPrice || 0);
                  const costVal = parseFloat(shares || 0) * parseFloat(costPerShare || 0);
                  const diff = currentVal - costVal;
                  const percent = costVal !== 0 ? (diff / costVal) * 100 : 0;
                  
                  return (
                    <span className={diff >= 0 ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                      {diff >= 0 ? '+' : '-'}${Math.abs(diff).toFixed(2)} 
                      <span className="text-sm ml-1">
                        ({diff >= 0 ? '+' : '-'}{Math.abs(percent).toFixed(2)}%)
                      </span>
                    </span>
                  );
                })()}
              </div>
            )}
          </div>
        )}
        
        {/* Summary of changes */}
        {isEditMode && Object.keys(changedFields).length > 0 && (
          <div className="bg-amber-50 p-3 rounded-md border border-amber-200">
            <h4 className="font-medium text-amber-800 mb-1 flex items-center">
              <Edit className="h-4 w-4 mr-1" />
              Changes to be saved:
            </h4>
            <ul className="text-sm text-amber-700 space-y-1">
              {Object.keys(changedFields).map(field => (
                <li key={field} className="ml-4">
                  • {field === 'ticker' ? 'Ticker' : 
                     field === 'shares' ? 'Number of Shares' : 
                     field === 'price' ? 'Current Price' : 
                     field === 'costPerShare' ? 'Cost Per Share' : 
                     field === 'purchaseDate' ? 'Purchase Date' : 
                     field.charAt(0).toUpperCase() + field.slice(1).replace(/([A-Z])/g, ' $1')}
                </li>
              ))}
            </ul>
          </div>
        )}
        
        {/* Form Actions */}
        <div className="flex justify-end space-x-3 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
            disabled={isSubmitting}
          >
            Cancel
          </button>
          
          {!isEditMode && (
            <button
              type="button"
              onClick={(e) => handleSubmit(e, true)}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors flex items-center"
              disabled={isSubmitting || !ticker || !shares || !currentPrice || !costPerShare || !purchaseDate}
            >
              {isSubmitting ? (
                <div className="flex items-center">
                  <div className="animate-spin mr-2 h-4 w-4 border-t-2 border-b-2 border-white rounded-full"></div>
                  <span>Saving...</span>
                </div>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Save & Add Another
                </>
              )}
            </button>
          )}
          
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center"
            disabled={isSubmitting || !ticker || !shares || !currentPrice || !costPerShare || !purchaseDate}
          >
            {isSubmitting ? (
              <div className="flex items-center">
                <div className="animate-spin mr-2 h-4 w-4 border-t-2 border-b-2 border-white rounded-full"></div>
                <span>Saving...</span>
              </div>
            ) : (
              <>
                <Check className="w-4 h-4 mr-2" />
                {isEditMode ? 'Update Position' : 'Save Position'}
              </>
            )}
          </button>
        </div>
      </form>
    </FixedModal>
  );
};

export default SecurityPositionModal;