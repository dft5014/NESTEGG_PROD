import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { ChevronDown, ChevronRight, Plus, Trash2, Save, Copy, TrendingUp, DollarSign, Calculator, Info, Settings, Download, Upload, BarChart3, PieChart, Eye, EyeOff, Zap, Target, Calendar, AlertCircle } from 'lucide-react';

const FinancialPlanning = () => {
  const currentYear = new Date().getFullYear();
  const [planName, setPlanName] = useState('My Financial Plan');
  const [isEditingName, setIsEditingName] = useState(false);
  const [selectedYears, setSelectedYears] = useState(20);
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
  const [currency, setCurrency] = useState('USD');
  const [inflationRate, setInflationRate] = useState(2.5);
  
  // Asset classes with their configurations
  const [assetClasses, setAssetClasses] = useState([
    { id: 1, name: 'Stocks', color: '#3B82F6', growthRate: 10, risk: 'High', allocation: 60, visible: true },
    { id: 2, name: 'Bonds', color: '#10B981', growthRate: 5, risk: 'Low', allocation: 30, visible: true },
    { id: 3, name: 'Real Estate', color: '#F59E0B', growthRate: 8, risk: 'Medium', allocation: 10, visible: true },
  ]);

  // Cash flow configuration
  const [cashFlows, setCashFlows] = useState([
    { id: 1, name: 'Monthly Salary Investment', type: 'monthly', amount: 2000, startYear: 0, endYear: 30, growthRate: 3 },
    { id: 2, name: 'Annual Bonus', type: 'annual', amount: 10000, startYear: 0, endYear: 20, growthRate: 2 },
  ]);

  // Initialize yearly data
  const initializeYearlyData = useCallback(() => {
    const data = {};
    for (let i = 0; i <= selectedYears; i++) {
      data[currentYear + i] = {
        contributions: 0,
        totalValue: 0,
        assetValues: {},
        cumulative: 0,
        netWorth: 0,
      };
      assetClasses.forEach(asset => {
        data[currentYear + i].assetValues[asset.id] = 0;
      });
    }
    return data;
  }, [currentYear, selectedYears, assetClasses]);

  const [yearlyData, setYearlyData] = useState(initializeYearlyData);
  const [showValues, setShowValues] = useState(true);
  const [viewMode, setViewMode] = useState('table'); // table, chart, summary

  // Calculate projections
  const calculateProjections = useCallback(() => {
    const data = initializeYearlyData();
    let cumulative = 0;

    for (let yearIndex = 0; yearIndex <= selectedYears; yearIndex++) {
      const year = currentYear + yearIndex;
      let yearlyContribution = 0;

      // Calculate contributions for this year
      cashFlows.forEach(flow => {
        if (yearIndex >= flow.startYear && yearIndex <= flow.endYear) {
          const growthMultiplier = Math.pow(1 + flow.growthRate / 100, yearIndex);
          if (flow.type === 'monthly') {
            yearlyContribution += flow.amount * 12 * growthMultiplier;
          } else {
            yearlyContribution += flow.amount * growthMultiplier;
          }
        }
      });

      data[year].contributions = yearlyContribution;
      cumulative += yearlyContribution;

      // Calculate asset values
      let totalValue = 0;
      assetClasses.forEach(asset => {
        const allocation = asset.allocation / 100;
        const assetContribution = yearlyContribution * allocation;
        
        // Add previous year's value with growth
        if (yearIndex > 0) {
          const prevYear = currentYear + yearIndex - 1;
          const prevValue = data[prevYear].assetValues[asset.id];
          data[year].assetValues[asset.id] = prevValue * (1 + asset.growthRate / 100) + assetContribution;
        } else {
          data[year].assetValues[asset.id] = assetContribution;
        }
        
        totalValue += data[year].assetValues[asset.id];
      });

      data[year].totalValue = totalValue;
      data[year].cumulative = cumulative;
      data[year].netWorth = totalValue;
    }

    setYearlyData(data);
  }, [currentYear, selectedYears, cashFlows, assetClasses, initializeYearlyData]);

  useEffect(() => {
    calculateProjections();
  }, [calculateProjections]);

  // Format currency
  const formatCurrency = (value) => {
    const symbols = { USD: '$', EUR: '€', GBP: '£' };
    const symbol = symbols[currency] || '$';
    return `${symbol}${value.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
  };

  // Add new asset class
  const addAssetClass = () => {
    const colors = ['#8B5CF6', '#EC4899', '#6366F1', '#14B8A6', '#F97316'];
    const newAsset = {
      id: Date.now(),
      name: 'New Asset Class',
      color: colors[assetClasses.length % colors.length],
      growthRate: 7,
      risk: 'Medium',
      allocation: 0,
      visible: true,
    };
    setAssetClasses([...assetClasses, newAsset]);
  };

  // Add new cash flow
  const addCashFlow = () => {
    const newFlow = {
      id: Date.now(),
      name: 'New Cash Flow',
      type: 'monthly',
      amount: 1000,
      startYear: 0,
      endYear: selectedYears,
      growthRate: 2,
    };
    setCashFlows([...cashFlows, newFlow]);
  };

  // Update asset class
  const updateAssetClass = (id, field, value) => {
    setAssetClasses(prev => prev.map(asset => 
      asset.id === id ? { ...asset, [field]: value } : asset
    ));
  };

  // Update cash flow
  const updateCashFlow = (id, field, value) => {
    setCashFlows(prev => prev.map(flow => 
      flow.id === id ? { ...flow, [field]: value } : flow
    ));
  };

  // Delete functions
  const deleteAssetClass = (id) => {
    setAssetClasses(prev => prev.filter(asset => asset.id !== id));
  };

  const deleteCashFlow = (id) => {
    setCashFlows(prev => prev.filter(flow => flow.id !== id));
  };

  // Calculate summary statistics
  const summaryStats = useMemo(() => {
    const finalYear = currentYear + selectedYears;
    const finalData = yearlyData[finalYear];
    const totalContributions = Object.values(yearlyData).reduce((sum, year) => sum + year.contributions, 0);
    const finalValue = finalData?.totalValue || 0;
    const totalGrowth = finalValue - totalContributions;
    const avgAnnualReturn = totalContributions > 0 ? ((finalValue / totalContributions) ** (1 / selectedYears) - 1) * 100 : 0;

    return {
      totalContributions,
      finalValue,
      totalGrowth,
      avgAnnualReturn,
      growthMultiplier: totalContributions > 0 ? finalValue / totalContributions : 0,
    };
  }, [yearlyData, currentYear, selectedYears]);

  // Ensure allocations sum to 100%
  const totalAllocation = assetClasses.reduce((sum, asset) => sum + asset.allocation, 0);

  return (
    <div className="w-full max-w-full mx-auto p-6 bg-gradient-to-br from-gray-50 to-gray-100 min-h-screen">
      {/* Header */}
      <div className="mb-8 bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl text-white">
              <Target className="w-8 h-8" />
            </div>
            <div>
              {isEditingName ? (
                <input
                  type="text"
                  value={planName}
                  onChange={(e) => setPlanName(e.target.value)}
                  onBlur={() => setIsEditingName(false)}
                  onKeyPress={(e) => e.key === 'Enter' && setIsEditingName(false)}
                  className="text-2xl font-bold bg-transparent border-b-2 border-blue-500 outline-none"
                  autoFocus
                />
              ) : (
                <h1 
                  className="text-2xl font-bold text-gray-800 cursor-pointer hover:text-blue-600 transition-colors"
                  onClick={() => setIsEditingName(true)}
                >
                  {planName}
                </h1>
              )}
              <p className="text-gray-500 text-sm mt-1">
                Financial projection for the next {selectedYears} years
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-all duration-200 flex items-center gap-2">
              <Upload className="w-4 h-4" />
              <span className="hidden sm:inline">Import</span>
            </button>
            <button className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-all duration-200 flex items-center gap-2">
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Export</span>
            </button>
            <button className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:shadow-lg transition-all duration-200 flex items-center gap-2">
              <Save className="w-4 h-4" />
              <span className="hidden sm:inline">Save Plan</span>
            </button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-xl border border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-600 text-sm font-medium">Total Contributions</p>
                <p className="text-2xl font-bold text-blue-900 mt-1">
                  {formatCurrency(summaryStats.totalContributions)}
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-blue-400" />
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-xl border border-green-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-600 text-sm font-medium">Final Portfolio Value</p>
                <p className="text-2xl font-bold text-green-900 mt-1">
                  {formatCurrency(summaryStats.finalValue)}
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-400" />
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-xl border border-purple-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-600 text-sm font-medium">Total Growth</p>
                <p className="text-2xl font-bold text-purple-900 mt-1">
                  {formatCurrency(summaryStats.totalGrowth)}
                </p>
              </div>
              <BarChart3 className="w-8 h-8 text-purple-400" />
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-amber-50 to-amber-100 p-4 rounded-xl border border-amber-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-amber-600 text-sm font-medium">Growth Multiplier</p>
                <p className="text-2xl font-bold text-amber-900 mt-1">
                  {summaryStats.growthMultiplier.toFixed(2)}x
                </p>
              </div>
              <Zap className="w-8 h-8 text-amber-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Configuration Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Cash Flows */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-green-500" />
              Cash Flows
            </h2>
            <button
              onClick={addCashFlow}
              className="px-3 py-1.5 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors flex items-center gap-1 text-sm"
            >
              <Plus className="w-4 h-4" />
              Add Flow
            </button>
          </div>
          
          <div className="space-y-3">
            {cashFlows.map((flow, index) => (
              <div key={flow.id} className="bg-gray-50 rounded-xl p-4 border border-gray-200 hover:border-blue-300 transition-all duration-200">
                <div className="flex items-center justify-between mb-3">
                  <input
                    type="text"
                    value={flow.name}
                    onChange={(e) => updateCashFlow(flow.id, 'name', e.target.value)}
                    className="font-medium bg-transparent border-b border-transparent hover:border-gray-400 focus:border-blue-500 outline-none transition-colors"
                  />
                  <button
                    onClick={() => deleteCashFlow(flow.id)}
                    className="text-red-500 hover:text-red-700 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-500">Type</label>
                    <select
                      value={flow.type}
                      onChange={(e) => updateCashFlow(flow.id, 'type', e.target.value)}
                      className="w-full mt-1 px-3 py-2 bg-white border border-gray-200 rounded-lg focus:border-blue-500 outline-none transition-colors"
                    >
                      <option value="monthly">Monthly</option>
                      <option value="annual">Annual</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="text-xs text-gray-500">Amount</label>
                    <input
                      type="number"
                      value={flow.amount}
                      onChange={(e) => updateCashFlow(flow.id, 'amount', parseFloat(e.target.value) || 0)}
                      className="w-full mt-1 px-3 py-2 bg-white border border-gray-200 rounded-lg focus:border-blue-500 outline-none transition-colors"
                    />
                  </div>
                  
                  <div>
                    <label className="text-xs text-gray-500">Years {flow.startYear}-{flow.endYear}</label>
                    <div className="flex gap-2 mt-1">
                      <input
                        type="number"
                        value={flow.startYear}
                        onChange={(e) => updateCashFlow(flow.id, 'startYear', parseInt(e.target.value) || 0)}
                        className="w-1/2 px-2 py-2 bg-white border border-gray-200 rounded-lg focus:border-blue-500 outline-none transition-colors"
                        min="0"
                        max={selectedYears}
                      />
                      <input
                        type="number"
                        value={flow.endYear}
                        onChange={(e) => updateCashFlow(flow.id, 'endYear', parseInt(e.target.value) || 0)}
                        className="w-1/2 px-2 py-2 bg-white border border-gray-200 rounded-lg focus:border-blue-500 outline-none transition-colors"
                        min="0"
                        max={selectedYears}
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-xs text-gray-500">Annual Growth %</label>
                    <input
                      type="number"
                      value={flow.growthRate}
                      onChange={(e) => updateCashFlow(flow.id, 'growthRate', parseFloat(e.target.value) || 0)}
                      className="w-full mt-1 px-3 py-2 bg-white border border-gray-200 rounded-lg focus:border-blue-500 outline-none transition-colors"
                      step="0.1"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Asset Classes */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <PieChart className="w-5 h-5 text-purple-500" />
              Asset Allocation
            </h2>
            <button
              onClick={addAssetClass}
              className="px-3 py-1.5 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors flex items-center gap-1 text-sm"
            >
              <Plus className="w-4 h-4" />
              Add Asset
            </button>
          </div>
          
          {totalAllocation !== 100 && (
            <div className="mb-3 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600" />
              <span className="text-sm text-amber-700">
                Total allocation is {totalAllocation}% (should be 100%)
              </span>
            </div>
          )}
          
          <div className="space-y-3">
            {assetClasses.map((asset) => (
              <div key={asset.id} className="bg-gray-50 rounded-xl p-4 border border-gray-200 hover:border-purple-300 transition-all duration-200">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-4 h-4 rounded"
                      style={{ backgroundColor: asset.color }}
                    />
                    <input
                      type="text"
                      value={asset.name}
                      onChange={(e) => updateAssetClass(asset.id, 'name', e.target.value)}
                      className="font-medium bg-transparent border-b border-transparent hover:border-gray-400 focus:border-blue-500 outline-none transition-colors"
                    />
                  </div>
                  <button
                    onClick={() => deleteAssetClass(asset.id)}
                    className="text-red-500 hover:text-red-700 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs text-gray-500">Allocation %</label>
                    <input
                      type="number"
                      value={asset.allocation}
                      onChange={(e) => updateAssetClass(asset.id, 'allocation', parseFloat(e.target.value) || 0)}
                      className="w-full mt-1 px-3 py-2 bg-white border border-gray-200 rounded-lg focus:border-blue-500 outline-none transition-colors"
                      min="0"
                      max="100"
                    />
                  </div>
                  
                  <div>
                    <label className="text-xs text-gray-500">Annual Return %</label>
                    <input
                      type="number"
                      value={asset.growthRate}
                      onChange={(e) => updateAssetClass(asset.id, 'growthRate', parseFloat(e.target.value) || 0)}
                      className="w-full mt-1 px-3 py-2 bg-white border border-gray-200 rounded-lg focus:border-blue-500 outline-none transition-colors"
                      step="0.1"
                    />
                  </div>
                  
                  <div>
                    <label className="text-xs text-gray-500">Risk Level</label>
                    <select
                      value={asset.risk}
                      onChange={(e) => updateAssetClass(asset.id, 'risk', e.target.value)}
                      className="w-full mt-1 px-3 py-2 bg-white border border-gray-200 rounded-lg focus:border-blue-500 outline-none transition-colors"
                    >
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                    </select>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Settings Bar */}
      <div className="bg-white rounded-2xl shadow-lg p-4 mb-6 border border-gray-100">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-500" />
            <label className="text-sm font-medium text-gray-700">Planning Period:</label>
            <select
              value={selectedYears}
              onChange={(e) => setSelectedYears(parseInt(e.target.value))}
              className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg focus:border-blue-500 outline-none transition-colors"
            >
              <option value={10}>10 years</option>
              <option value={15}>15 years</option>
              <option value={20}>20 years</option>
              <option value={25}>25 years</option>
              <option value={30}>30 years</option>
              <option value={40}>40 years</option>
            </select>
          </div>
          
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Currency:</label>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg focus:border-blue-500 outline-none transition-colors"
            >
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
              <option value="GBP">GBP</option>
            </select>
          </div>
          
          <button
            onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
            className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors flex items-center gap-2 text-sm"
          >
            <Settings className="w-4 h-4" />
            Advanced
            {showAdvancedSettings ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
          
          <div className="flex-1" />
          
          <button
            onClick={() => setShowValues(!showValues)}
            className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors flex items-center gap-2 text-sm"
          >
            {showValues ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            {showValues ? 'Hide' : 'Show'} Values
          </button>
        </div>
        
        {showAdvancedSettings && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Inflation Rate %</label>
                <input
                  type="number"
                  value={inflationRate}
                  onChange={(e) => setInflationRate(parseFloat(e.target.value) || 0)}
                  className="w-full mt-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:border-blue-500 outline-none transition-colors"
                  step="0.1"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Main Grid View */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
              <tr>
                <th className="sticky left-0 z-10 bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 text-left text-sm font-bold text-gray-700">
                  Year
                </th>
                <th className="px-6 py-4 text-right text-sm font-bold text-gray-700">
                  Annual Contribution
                </th>
                {assetClasses.map(asset => (
                  <th key={asset.id} className="px-6 py-4 text-right text-sm font-bold text-gray-700">
                    <div className="flex items-center justify-end gap-2">
                      <span>{asset.name}</span>
                      <div className="w-3 h-3 rounded" style={{ backgroundColor: asset.color }} />
                    </div>
                  </th>
                ))}
                <th className="px-6 py-4 text-right text-sm font-bold text-gray-700">
                  Total Value
                </th>
                <th className="px-6 py-4 text-right text-sm font-bold text-gray-700">
                  Net Worth
                </th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(yearlyData).map(([year, data], index) => {
                const isCurrentYear = parseInt(year) === currentYear;
                const isMilestone = (parseInt(year) - currentYear) % 5 === 0;
                
                return (
                  <tr 
                    key={year}
                    className={`
                      border-b border-gray-100 transition-all duration-200
                      ${isCurrentYear ? 'bg-blue-50 font-semibold' : ''}
                      ${isMilestone && !isCurrentYear ? 'bg-gray-50' : ''}
                      hover:bg-gray-50
                    `}
                  >
                    <td className="sticky left-0 z-10 bg-white px-6 py-4 text-sm font-medium text-gray-900">
                      <div className="flex items-center gap-2">
                        {year}
                        {isCurrentYear && (
                          <span className="px-2 py-0.5 bg-blue-500 text-white text-xs rounded-full">
                            Current
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right text-sm text-gray-700">
                      {showValues ? formatCurrency(data.contributions) : '•••••'}
                    </td>
                    {assetClasses.map(asset => (
                      <td key={asset.id} className="px-6 py-4 text-right text-sm text-gray-700">
                        {showValues ? formatCurrency(data.assetValues[asset.id] || 0) : '•••••'}
                      </td>
                    ))}
                    <td className="px-6 py-4 text-right text-sm font-medium text-gray-900">
                      {showValues ? formatCurrency(data.totalValue) : '•••••'}
                    </td>
                    <td className="px-6 py-4 text-right text-sm font-bold text-green-600">
                      {showValues ? formatCurrency(data.netWorth) : '•••••'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="mt-6 flex justify-center gap-4">
        <button className="px-6 py-3 bg-gray-100 hover:bg-gray-200 rounded-lg transition-all duration-200 flex items-center gap-2">
          <Copy className="w-5 h-5" />
          Duplicate Plan
        </button>
        <button className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:shadow-lg transition-all duration-200 flex items-center gap-2">
          <Calculator className="w-5 h-5" />
          Run Monte Carlo Simulation
        </button>
      </div>
    </div>
  );
};

export default FinancialPlanning;