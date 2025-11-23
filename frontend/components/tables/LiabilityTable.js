import React, { useState, useMemo } from 'react';
import { 
  TrendingDown, TrendingUp, ChevronDown, ChevronUp, 
  CreditCard, Home, Car, GraduationCap, Receipt,
  AlertCircle, CheckCircle, Percent, DollarSign,
  Calendar, Building2, Minus, Plus, X, Search, RefreshCw
} from 'lucide-react';
import { formatCurrency, formatPercentage } from '@/utils/formatters';
import { useGroupedLiabilities } from '@/store/hooks/useGroupedLiabilities';

// Icon mapping for liability types
const liabilityIcons = {
  credit_card: CreditCard,
  mortgage: Home,
  auto_loan: Car,
  student_loan: GraduationCap,
  personal_loan: Receipt,
  other: Receipt
};

// Multi-select dropdown component (reused from positions)
const MultiSelectDropdown = ({ options, value, onChange, placeholder }) => {
  const [isOpen, setIsOpen] = useState(false);
  
  const toggleOption = (option) => {
    if (value.includes(option)) {
      onChange(value.filter(v => v !== option));
    } else {
      onChange([...value, option]);
    }
  };
  
  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-3 py-1.5 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors text-sm"
      >
        <span>{value.length > 0 ? `${value.length} selected` : placeholder}</span>
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      
      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-48 bg-gray-800 rounded-lg shadow-xl border border-gray-700 z-20">
            <div className="p-2 border-b border-gray-700">
              <button
                onClick={() => onChange(value.length === options.length ? [] : options)}
                className="w-full text-left px-2 py-1 text-sm hover:bg-gray-700 rounded"
              >
                {value.length === options.length ? 'Deselect All' : 'Select All'}
              </button>
            </div>
            <div className="border-t border-gray-700">
              {options.map(option => (
                <label
                  key={option}
                  className="flex items-center px-3 py-2 hover:bg-gray-700 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={value.includes(option)}
                    onChange={() => toggleOption(option)}
                    className="mr-2"
                  />
                  <span className="text-sm">
                    {option.split('_').map(word => 
                      word.charAt(0).toUpperCase() + word.slice(1)
                    ).join(' ')}
                  </span>
                </label>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

const LiabilityTable = ({ 
  initialSort = "balance-high", 
  title = "Debt Overview",
  showHistoricalColumns = false 
}) => {
  // Use DataStore hook
  const { 
    liabilities, 
    summary, 
    metrics, 
    loading, 
    error, 
    lastFetched, 
    isStale, 
    refreshData 
  } = useGroupedLiabilities();

  // Local UI State
  const [selectedLiability, setSelectedLiability] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [sortOption, setSortOption] = useState(initialSort);
  const [searchQuery, setSearchQuery] = useState("");
  const [liabilityTypeFilter, setLiabilityTypeFilter] = useState([]);
  const [interestRateFilter, setInterestRateFilter] = useState("all");
  const [showOnlyHighInterest, setShowOnlyHighInterest] = useState(false);

  // Sort function
  const getSortIcon = (field) => {
    const [sortField, sortDirection] = sortOption.split('-');
    if (sortField === field) {
      return sortDirection === 'high' || sortDirection === 'desc' 
        ? <ChevronDown className="w-3 h-3" /> 
        : <ChevronUp className="w-3 h-3" />;
    }
    return null;
  };

  const handleSort = (field) => {
    const [currentField, currentDirection] = sortOption.split('-');
    const newDirection = currentField === field && currentDirection === 'high' ? 'low' : 'high';
    setSortOption(`${field}-${newDirection}`);
  };

  // Process and filter liabilities
  const processedLiabilities = useMemo(() => {
    let filtered = [...liabilities];

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(liability => 
        liability.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        liability.institution?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        liability.identifier?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Type filter
    if (liabilityTypeFilter.length > 0) {
      filtered = filtered.filter(liability => 
        liabilityTypeFilter.includes(liability.liability_type)
      );
    }

    // Interest rate filter
    if (interestRateFilter === "high") {
      filtered = filtered.filter(liability => liability.weighted_avg_interest_rate > 10);
    } else if (interestRateFilter === "low") {
      filtered = filtered.filter(liability => liability.weighted_avg_interest_rate <= 10);
    }

    // High interest only filter
    if (showOnlyHighInterest) {
      filtered = filtered.filter(liability => liability.weighted_avg_interest_rate > 15);
    }

    // Sort
    const [sortField, sortDirection] = sortOption.split('-');
    filtered.sort((a, b) => {
      let aVal, bVal;
      
      switch (sortField) {
        case 'name':
          aVal = a.name || '';
          bVal = b.name || '';
          return sortDirection === 'low' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
        case 'balance':
          aVal = a.total_current_balance || 0;
          bVal = b.total_current_balance || 0;
          break;
        case 'interest':
          aVal = a.weighted_avg_interest_rate || 0;
          bVal = b.weighted_avg_interest_rate || 0;
          break;
        case 'paydown':
          aVal = a.paydown_percentage || 0;
          bVal = b.paydown_percentage || 0;
          break;
        case 'allocation':
          aVal = a.debt_allocation_pct || 0;
          bVal = b.debt_allocation_pct || 0;
          break;
        default:
          aVal = a.total_current_balance || 0;
          bVal = b.total_current_balance || 0;
      }
      
      return sortDirection === 'high' ? bVal - aVal : aVal - bVal;
    });

    return filtered;
  }, [liabilities, sortOption, searchQuery, liabilityTypeFilter, interestRateFilter, showOnlyHighInterest]);

  // Get unique liability types
  const availableLiabilityTypes = useMemo(() => {
    const types = new Set(liabilities.map(l => l.liability_type));
    return Array.from(types).sort();
  }, [liabilities]);

  // Detail modal component
  const LiabilityDetailModal = ({ liability, isOpen, onClose }) => {
    if (!isOpen || !liability) return null;

    const Icon = liabilityIcons[liability.liability_type] || Receipt;
    
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="fixed inset-0 bg-black bg-opacity-50" onClick={onClose} />
        
        <div className="relative bg-gray-900 rounded-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
          <div className="p-6 border-b border-gray-800">
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-red-500/10 rounded-lg">
                  <Icon className="w-6 h-6 text-red-400" />
                </div>
                <div>
                  <h3 className="text-xl font-bold">{liability.name}</h3>
                  <p className="text-gray-400 text-sm">{liability.institution}</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="p-6 overflow-y-auto max-h-[calc(90vh-100px)]">
            {/* Key Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-gray-800/50 p-4 rounded-lg">
                <p className="text-gray-400 text-sm mb-1">Current Balance</p>
                <p className="text-xl font-bold text-red-400">
                  {formatCurrency(liability.total_current_balance)}
                </p>
              </div>
              <div className="bg-gray-800/50 p-4 rounded-lg">
                <p className="text-gray-400 text-sm mb-1">Original Amount</p>
                <p className="text-xl font-bold">
                  {formatCurrency(liability.total_original_amount)}
                </p>
              </div>
              <div className="bg-gray-800/50 p-4 rounded-lg">
                <p className="text-gray-400 text-sm mb-1">Paid Down</p>
                <p className="text-xl font-bold text-green-400">
                  {formatCurrency(liability.total_paid_down)}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  {formatPercentage(liability.paydown_percentage)}
                </p>
              </div>
              <div className="bg-gray-800/50 p-4 rounded-lg">
                <p className="text-gray-400 text-sm mb-1">Interest Rate</p>
                <p className="text-xl font-bold">
                  {liability.weighted_avg_interest_rate?.toFixed(2)}%
                </p>
                {liability.min_interest_rate !== liability.max_interest_rate && (
                  <p className="text-xs text-gray-400 mt-1">
                    {liability.min_interest_rate?.toFixed(2)}% - {liability.max_interest_rate?.toFixed(2)}%
                  </p>
                )}
              </div>
            </div>

            {/* Credit Utilization (for credit cards) */}
            {liability.liability_type === 'credit_card' && liability.credit_utilization_pct !== null && (
              <div className="mb-6 bg-gray-800/50 p-4 rounded-lg">
                <h4 className="text-sm font-medium text-gray-400 mb-3">Credit Utilization</h4>
                <div className="relative pt-1">
                  <div className="flex mb-2 items-center justify-between">
                    <div>
                      <span className="text-xs font-semibold inline-block text-white">
                        {formatCurrency(liability.total_credit_card_balance)} / {formatCurrency(liability.total_credit_limit)}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className={`text-xs font-semibold inline-block ${
                        liability.credit_utilization_pct > 30 ? 'text-red-400' : 'text-green-400'
                      }`}>
                        {liability.credit_utilization_pct.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                  <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-gray-700">
                    <div 
                      style={{ width: `${Math.min(liability.credit_utilization_pct, 100)}%` }}
                      className={`shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center ${
                        liability.credit_utilization_pct > 30 ? 'bg-red-500' : 'bg-green-500'
                      }`}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Historical Performance */}
            {showHistoricalColumns && (
              <div className="mb-6">
                <h4 className="text-sm font-medium text-gray-400 mb-3">Balance Changes</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { label: '1 Day', change: liability.balance_1d_change, pct: liability.balance_1d_change_pct },
                    { label: '1 Week', change: liability.balance_1w_change, pct: liability.balance_1w_change_pct },
                    { label: '1 Month', change: liability.balance_1m_change, pct: liability.balance_1m_change_pct },
                    { label: 'YTD', change: liability.balance_ytd_change, pct: liability.balance_ytd_change_pct },
                  ].map(({ label, change, pct }) => (
                    <div key={label} className="bg-gray-800/30 p-3 rounded">
                      <p className="text-xs text-gray-400 mb-1">{label}</p>
                      <p className={`text-sm font-medium ${change > 0 ? 'text-red-400' : 'text-green-400'}`}>
                        {change > 0 ? '+' : ''}{formatCurrency(change)}
                      </p>
                      <p className={`text-xs ${change > 0 ? 'text-red-400' : 'text-green-400'}`}>
                        {change > 0 ? '+' : ''}{formatPercentage(pct)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Individual Liabilities */}
            <div>
              <h4 className="text-sm font-medium text-gray-400 mb-3">Individual Liabilities</h4>
              <div className="bg-gray-800/30 rounded overflow-hidden">
                <div className="max-h-64 overflow-y-auto">
                  <table className="min-w-full divide-y divide-gray-700">
                    <thead className="bg-gray-900/50 sticky top-0">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-400">Name</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-400">Institution</th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-gray-400">Balance</th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-gray-400">Original</th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-gray-400">Rate</th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-gray-400">Paid Down</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                      {Array.isArray(liability.liability_details) && liability.liability_details.length > 0 ? (
                        liability.liability_details.map((detail, idx) => (
                          <tr key={idx} className="hover:bg-gray-800/50">
                            <td className="px-3 py-2 text-sm">{detail.name}</td>
                            <td className="px-3 py-2 text-sm text-gray-400">{detail.institution}</td>
                            <td className="px-3 py-2 text-sm text-right text-red-400">
                              {formatCurrency(detail.current_balance)}
                            </td>
                            <td className="px-3 py-2 text-sm text-right">
                              {formatCurrency(detail.original_amount)}
                            </td>
                            <td className="px-3 py-2 text-sm text-right">
                              {detail.interest_rate?.toFixed(2)}%
                            </td>
                            <td className="px-3 py-2 text-sm text-right text-green-400">
                              {formatCurrency(detail.paid_down)}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="6" className="px-3 py-4 text-sm text-center text-gray-400">
                            No individual liability details available
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="bg-gray-900 rounded-xl p-8">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          <span className="ml-3 text-gray-400">Loading liabilities...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-gray-900 rounded-xl p-8">
        <div className="flex items-center text-red-400">
          <AlertCircle className="w-5 h-5 mr-2" />
          Error loading liabilities: {error}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 rounded-xl overflow-hidden">
      <div className="p-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold mb-1">{title}</h2>
            <p className="text-gray-400 text-sm">
              {summary.total_liabilities} liabilities across {summary.unique_liabilities} unique debts
            </p>
          </div>
          
          <div className="flex items-center space-x-2 mt-4 md:mt-0">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search liabilities..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-1.5 bg-gray-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Type Filter */}
            <MultiSelectDropdown
              options={availableLiabilityTypes}
              value={liabilityTypeFilter}
              onChange={setLiabilityTypeFilter}
              placeholder="All Types"
            />

            {/* Interest Rate Filter */}
            <select
              value={interestRateFilter}
              onChange={(e) => setInterestRateFilter(e.target.value)}
              className="px-3 py-1.5 bg-gray-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Rates</option>
              <option value="high">High Interest (&gt;10%)</option>
              <option value="low">Low Interest (≤10%)</option>
            </select>

            {/* High Interest Toggle */}
            <button
              onClick={() => setShowOnlyHighInterest(!showOnlyHighInterest)}
              className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                showOnlyHighInterest 
                  ? 'bg-red-600 text-white' 
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              <AlertCircle className="w-4 h-4 inline mr-1" />
              High Priority
            </button>

            {/* Refresh */}
            <button
              onClick={refreshData}
              className="p-1.5 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors"
              title="Refresh data"
            >
              <RefreshCw className={`w-4 h-4 ${isStale ? 'text-yellow-400' : 'text-gray-400'}`} />
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-800/50 p-4 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <p className="text-gray-400 text-sm">Total Debt</p>
              <DollarSign className="w-4 h-4 text-red-400" />
            </div>
            <p className="text-xl font-bold text-red-400">{formatCurrency(summary.total_debt)}</p>
            <p className="text-xs text-gray-500 mt-1">
              {formatPercentage((summary.total_paid_down / summary.total_original_debt) * 100)} paid off
            </p>
          </div>

          <div className="bg-gray-800/50 p-4 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <p className="text-gray-400 text-sm">Avg Interest Rate</p>
              <Percent className="w-4 h-4 text-yellow-400" />
            </div>
            <p className="text-xl font-bold">{summary.avg_interest_rate?.toFixed(2)}%</p>
            <p className="text-xs text-gray-500 mt-1">
              {formatCurrency(summary.total_annual_interest)}/year
            </p>
          </div>

          <div className="bg-gray-800/50 p-4 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <p className="text-gray-400 text-sm">Amount Paid</p>
              <CheckCircle className="w-4 h-4 text-green-400" />
            </div>
            <p className="text-xl font-bold text-green-400">{formatCurrency(summary.total_paid_down)}</p>
            <p className="text-xs text-gray-500 mt-1">
              from {formatCurrency(summary.total_original_debt)}
            </p>
          </div>

          {metrics.creditUtilization !== null && (
            <div className="bg-gray-800/50 p-4 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <p className="text-gray-400 text-sm">Credit Utilization</p>
                <CreditCard className="w-4 h-4 text-blue-400" />
              </div>
              <p className={`text-xl font-bold ${
                metrics.creditUtilization > 30 ? 'text-red-400' : 'text-green-400'
              }`}>
                {metrics.creditUtilization.toFixed(1)}%
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {metrics.creditUtilization > 30 ? 'Above 30% target' : 'Good standing'}
              </p>
            </div>
          )}
        </div>

        {/* Table */}
        {processedLiabilities.length === 0 ? (
          <div className="p-12 text-center">
            <Receipt className="h-12 w-12 text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No liabilities found</h3>
            <p className="text-gray-400">
              {searchQuery || liabilityTypeFilter.length > 0 
                ? "Try adjusting your filters" 
                : "Great! You have no debts to track"}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-700">
              <thead className="bg-gray-900/50">
                <tr>
                  <th className="px-2 py-1.5 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">
                    #
                  </th>
                  <th className="px-2 py-1.5 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    <button onClick={() => handleSort('name')} className="flex items-center space-x-1 hover:text-white">
                      <span>Liability</span>
                      {getSortIcon('name')}
                    </button>
                  </th>
                  <th className="px-2 py-1.5 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                    <button onClick={() => handleSort('balance')} className="flex items-center space-x-1 hover:text-white ml-auto">
                      <span>Balance</span>
                      {getSortIcon('balance')}
                    </button>
                  </th>
                  <th className="px-2 py-1.5 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                    <button onClick={() => handleSort('interest')} className="flex items-center space-x-1 hover:text-white ml-auto">
                      <span>Interest Rate</span>
                      {getSortIcon('interest')}
                    </button>
                  </th>
                  <th className="px-2 py-1.5 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Annual Interest
                  </th>
                  <th className="px-2 py-1.5 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                    <button onClick={() => handleSort('paydown')} className="flex items-center space-x-1 hover:text-white ml-auto">
                      <span>Paid Down</span>
                      {getSortIcon('paydown')}
                    </button>
                  </th>
                  <th className="px-2 py-1.5 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                    <button onClick={() => handleSort('allocation')} className="flex items-center space-x-1 hover:text-white ml-auto">
                      <span>% of Debt</span>
                      {getSortIcon('allocation')}
                    </button>
                  </th>
                  {showHistoricalColumns && (
                    <>
                      <th className="px-2 py-1.5 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                        1M Change
                      </th>
                      <th className="px-2 py-1.5 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                        YTD Change
                      </th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {processedLiabilities.map((liability, index) => {
                  const Icon = liabilityIcons[liability.liability_type] || Receipt;
                  const isHighInterest = liability.weighted_avg_interest_rate > 15;
                  
                  return (
                    <tr 
                      key={liability.identifier}
                      className="hover:bg-gray-800/50 cursor-pointer transition-colors"
                      onClick={() => {
                        setSelectedLiability(liability);
                        setIsDetailModalOpen(true);
                      }}
                    >
                      <td className="px-2 py-2 text-center text-xs text-gray-500">
                        {index + 1}
                      </td>
                      <td className="px-2 py-2">
                        <div className="flex items-center space-x-3">
                          <div className={`p-2 rounded-lg ${
                            isHighInterest ? 'bg-red-500/10' : 'bg-gray-800'
                          }`}>
                            <Icon className={`w-4 h-4 ${
                              isHighInterest ? 'text-red-400' : 'text-gray-400'
                            }`} />
                          </div>
                          <div>
                            <p className="font-medium text-sm">{liability.name}</p>
                            <p className="text-xs text-gray-400">
                              {liability.institution} • {liability.liability_count} {liability.liability_count === 1 ? 'account' : 'accounts'}
                            </p>
                          </div>
                          {isHighInterest && (
                            <AlertCircle className="w-4 h-4 text-red-400" title="High interest rate" />
                          )}
                        </div>
                      </td>
                      <td className="px-2 py-2 text-right">
                        <p className="font-medium text-red-400">{formatCurrency(liability.total_current_balance)}</p>
                        {liability.total_original_amount > 0 && (
                          <p className="text-xs text-gray-400">
                            of {formatCurrency(liability.total_original_amount)}
                          </p>
                        )}
                      </td>
                      <td className="px-2 py-2 text-right">
                        <p className={`font-medium ${
                          liability.weighted_avg_interest_rate > 10 ? 'text-yellow-400' : ''
                        }`}>
                          {liability.weighted_avg_interest_rate?.toFixed(2)}%
                        </p>
                        {liability.min_interest_rate !== liability.max_interest_rate && (
                          <p className="text-xs text-gray-400">
                            {liability.min_interest_rate?.toFixed(2)}-{liability.max_interest_rate?.toFixed(2)}%
                          </p>
                        )}
                      </td>
                      <td className="px-2 py-2 text-right">
                        <p className="text-sm text-gray-400">
                          {formatCurrency(liability.estimated_annual_interest)}
                        </p>
                      </td>
                      <td className="px-2 py-2 text-right">
                        <p className="font-medium text-green-400">
                          {formatCurrency(liability.total_paid_down)}
                        </p>
                        <p className="text-xs text-gray-400">
                          {formatPercentage(liability.paydown_percentage)}
                        </p>
                      </td>
                      <td className="px-2 py-2 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <div className="w-16 bg-gray-700 rounded-full h-1.5">
                            <div 
                              className="bg-red-500 h-1.5 rounded-full"
                              style={{ width: `${Math.min(liability.debt_allocation_pct, 100)}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-400 w-12 text-right">
                            {liability.debt_allocation_pct?.toFixed(1)}%
                          </span>
                        </div>
                      </td>
                      {showHistoricalColumns && (
                        <>
                          <td className="px-2 py-2 text-right">
                            <span className={`text-sm ${
                              liability.balance_1m_change > 0 ? 'text-red-400' : 'text-green-400'
                            }`}>
                              {liability.balance_1m_change > 0 && '+'}{formatCurrency(liability.balance_1m_change)}
                            </span>
                          </td>
                          <td className="px-2 py-2 text-right">
                            <span className={`text-sm ${
                              liability.balance_ytd_change > 0 ? 'text-red-400' : 'text-green-400'
                            }`}>
                              {liability.balance_ytd_change > 0 && '+'}{formatCurrency(liability.balance_ytd_change)}
                            </span>
                          </td>
                        </>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Last Updated */}
        <div className="mt-4 text-xs text-gray-500 text-right">
          Last updated: {lastFetched ? new Date(lastFetched).toLocaleTimeString() : '-'}
        </div>
      </div>

      {/* Detail Modal */}
      <LiabilityDetailModal
        liability={selectedLiability}
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedLiability(null);
        }}
      />
    </div>
  );
};

export default LiabilityTable;