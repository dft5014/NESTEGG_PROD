import React, { useState, useMemo } from 'react';
import {
  ChevronDown, ChevronRight, Plus, Trash2, Save, Copy, TrendingUp, DollarSign, Calculator,
  Info, Settings, Download, Upload, BarChart3, PieChart, Eye, EyeOff, Zap, Target,
  Calendar, AlertCircle
} from 'lucide-react';

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
    { id: 1, name: 'Stocks',      color: '#3B82F6', growthRate: 10, risk: 'High',   allocation: 60, visible: true },
    { id: 2, name: 'Bonds',       color: '#10B981', growthRate: 5,  risk: 'Low',    allocation: 30, visible: true },
    { id: 3, name: 'Real Estate', color: '#F59E0B', growthRate: 8,  risk: 'Medium', allocation: 10, visible: true },
  ]);

  // Cash flows
  const [cashFlows, setCashFlows] = useState([
    { id: 1, name: 'Monthly Salary Investment', type: 'monthly', amount: 2000, startYear: 0, endYear: 30, growthRate: 3 },
    { id: 2, name: 'Annual Bonus',              type: 'annual',  amount: 10000, startYear: 0, endYear: 20, growthRate: 2 },
  ]);

  // --- Derivations & Toggles ---
  const [showValues, setShowValues] = useState(true);
  const [viewMode, setViewMode] = useState('table');
  const [showRealDollars, setShowRealDollars] = useState(false); // NEW

  // Helpers
  const clamp = (n, min, max) => Math.min(max, Math.max(min, n ?? 0));
  const toNum = (v, fallback = 0) => {
    const n = typeof v === 'number' ? v : parseFloat(v);
    return Number.isFinite(n) ? n : fallback;
  };

  // Currency
  const currencyFormatter = useMemo(() => {
    const code = ['USD', 'EUR', 'GBP'].includes(currency) ? currency : 'USD';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: code, maximumFractionDigits: 0 });
  }, [currency]);
  const formatCurrency = (value) => currencyFormatter.format(toNum(value));

  // Allocation utilities
  const totalAllocation = useMemo(
    () => assetClasses.reduce((sum, a) => sum + toNum(a.allocation), 0),
    [assetClasses]
  );
  const normalizeAllocations = () => {
    const sum = totalAllocation || 1;
    setAssetClasses(prev =>
      prev.map(a => ({ ...a, allocation: parseFloat(((toNum(a.allocation) / sum) * 100).toFixed(2)) }))
    );
  };

  // Base yearly scaffold
  const baseYearly = useMemo(() => {
    const data = {};
    for (let i = 0; i <= selectedYears; i++) {
      data[currentYear + i] = {
        contributions: 0,
        totalValue: 0,
        assetValues: Object.fromEntries(assetClasses.map(a => [a.id, 0])),
        cumulative: 0,
        netWorth: 0,
      };
    }
    return data;
  }, [currentYear, selectedYears, assetClasses]);

  // Projections
  const yearlyData = useMemo(() => {
    const data = JSON.parse(JSON.stringify(baseYearly));
    let cumulative = 0;

    for (let yearIndex = 0; yearIndex <= selectedYears; yearIndex++) {
      const year = currentYear + yearIndex;
      let yearlyContribution = 0;

      for (const flow of cashFlows) {
        const s = clamp(toNum(flow.startYear), 0, selectedYears);
        const e = clamp(toNum(flow.endYear), 0, selectedYears);
        if (yearIndex >= s && yearIndex <= e) {
          const t = yearIndex - s; // FIX: growth from startYear
          const g = (toNum(flow.growthRate) / 100) || 0;
          const amt = toNum(flow.amount);
          const grown = amt * Math.pow(1 + g, t);
          yearlyContribution += (flow.type === 'monthly' ? grown * 12 : grown);
        }
      }

      data[year].contributions = yearlyContribution;
      cumulative += yearlyContribution;

      let totalValue = 0;
      for (const asset of assetClasses) {
        const alloc = (toNum(asset.allocation) / 100) || 0;
        const rtn = (toNum(asset.growthRate) / 100) || 0;
        const assetContribution = yearlyContribution * alloc;

        const prevYear = yearIndex > 0 ? currentYear + yearIndex - 1 : null;
        const prevValue = prevYear ? toNum(data[prevYear].assetValues[asset.id]) : 0;

        const next = (prevValue * (1 + rtn)) + assetContribution;
        data[year].assetValues[asset.id] = next;
        totalValue += next;
      }

      if (showRealDollars) {
        const inf = (toNum(inflationRate) / 100) || 0;
        const deflator = Math.pow(1 + inf, yearIndex);
        const deflate = (v) => v / (deflator || 1);

        for (const asset of assetClasses) {
          data[year].assetValues[asset.id] = deflate(data[year].assetValues[asset.id]);
        }
        data[year].contributions = deflate(data[year].contributions);
        totalValue = deflate(totalValue);
        cumulative = deflate(cumulative);
      }

      data[year].totalValue = totalValue;
      data[year].cumulative = cumulative;
      data[year].netWorth = totalValue;
    }

    return data;
  }, [baseYearly, selectedYears, currentYear, cashFlows, assetClasses, showRealDollars, inflationRate]);

  // Summary
  const summaryStats = useMemo(() => {
    const years = Object.keys(yearlyData).map(Number).sort((a,b)=>a-b);
    const finalYear = years[years.length - 1];
    const finalData = yearlyData[finalYear] || { totalValue: 0 };

    const totalContributions = Object.values(yearlyData)
      .reduce((sum, row) => sum + toNum(row.contributions), 0);

    const finalValue = toNum(finalData.totalValue);
    const totalGrowth = finalValue - totalContributions;

    const n = Math.max(1, selectedYears);
    const avgAnnualReturn = totalContributions > 0
      ? ((finalValue / totalContributions) ** (1 / n) - 1) * 100
      : 0;

    return {
      totalContributions,
      finalValue,
      totalGrowth,
      avgAnnualReturn,
      growthMultiplier: totalContributions > 0 ? finalValue / totalContributions : 0,
    };
  }, [yearlyData, selectedYears]);

  // Mutators
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

  const updateAssetClass = (id, field, value) => {
    setAssetClasses(prev => prev.map(asset =>
      asset.id === id ? { ...asset, [field]: value } : asset
    ));
  };

  const updateCashFlow = (id, field, value) => {
    setCashFlows(prev => prev.map(flow =>
      flow.id === id ? { ...flow, [field]: value } : flow
    ));
  };

  const deleteAssetClass = (id) => {
    setAssetClasses(prev => prev.filter(asset => asset.id !== id));
  };

  const deleteCashFlow = (id) => {
    setCashFlows(prev => prev.filter(flow => flow.id !== id));
  };

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
                  onKeyDown={(e) => e.key === 'Enter' && setIsEditingName(false)}
                  className="text-2xl font-bold bg-transparent border-b-2 border-blue-500 outline-none"
                  autoFocus
                  aria-label="Plan name"
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
                {showRealDollars ? ' (today’s dollars)' : ''}
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
            {cashFlows.map((flow) => (
              <div key={flow.id} className="bg-gray-50 rounded-xl p-4 border border-gray-200 hover:border-blue-300 transition-all duration-200">
                <div className="flex items-center justify-between mb-3">
                  <input
                    type="text"
                    value={flow.name}
                    onChange={(e) => updateCashFlow(flow.id, 'name', e.target.value)}
                    className="font-medium bg-transparent border-b border-transparent hover:border-gray-400 focus:border-blue-500 outline-none transition-colors"
                    aria-label="Cash flow name"
                  />
                  <button
                    onClick={() => deleteCashFlow(flow.id)}
                    className="text-red-500 hover:text-red-700 transition-colors"
                    aria-label="Delete cash flow"
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
                      onChange={(e) => updateCashFlow(flow.id, 'amount', toNum(e.target.value))}
                      className="w-full mt-1 px-3 py-2 bg-white border border-gray-200 rounded-lg focus:border-blue-500 outline-none transition-colors"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-gray-500">Years {flow.startYear}-{flow.endYear}</label>
                    <div className="flex gap-2 mt-1">
                      <input
                        type="number"
                        value={flow.startYear}
                        onChange={(e) => {
                          const v = clamp(parseInt(e.target.value), 0, selectedYears);
                          updateCashFlow(flow.id, 'startYear', v);
                          if (v > flow.endYear) updateCashFlow(flow.id, 'endYear', v);
                        }}
                        className="w-1/2 px-2 py-2 bg-white border border-gray-200 rounded-lg focus:border-blue-500 outline-none transition-colors"
                        min="0"
                        max={selectedYears}
                        aria-label="Cash flow start year"
                      />
                      <input
                        type="number"
                        value={flow.endYear}
                        onChange={(e) => {
                          const v = clamp(parseInt(e.target.value), 0, selectedYears);
                          updateCashFlow(flow.id, 'endYear', Math.max(v, flow.startYear));
                        }}
                        className="w-1/2 px-2 py-2 bg-white border border-gray-200 rounded-lg focus:border-blue-500 outline-none transition-colors"
                        min="0"
                        max={selectedYears}
                        aria-label="Cash flow end year"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs text-gray-500">Annual Growth %</label>
                    <input
                      type="number"
                      value={flow.growthRate}
                      onChange={(e) => updateCashFlow(flow.id, 'growthRate', toNum(e.target.value))}
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

          {Math.round(totalAllocation) !== 100 && (
            <div className="mb-3 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-3">
              <AlertCircle className="w-4 h-4 text-amber-600" />
              <span className="text-sm text-amber-700">
                Total allocation is {totalAllocation.toFixed(2)}% (should be 100%)
              </span>
              <button
                onClick={normalizeAllocations}
                className="ml-auto px-2.5 py-1 text-xs rounded-md bg-amber-600 text-white hover:bg-amber-700 transition"
              >
                Auto-balance
              </button>
            </div>
          )}

          <div className="space-y-3">
            {assetClasses.map((asset) => (
              <div key={asset.id} className="bg-gray-50 rounded-xl p-4 border border-gray-200 hover:border-purple-300 transition-all duration-200">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded" style={{ backgroundColor: asset.color }} />
                    <input
                      type="text"
                      value={asset.name}
                      onChange={(e) => updateAssetClass(asset.id, 'name', e.target.value)}
                      className="font-medium bg-transparent border-b border-transparent hover:border-gray-400 focus:border-blue-500 outline-none transition-colors"
                      aria-label="Asset class name"
                    />
                  </div>
                  <button
                    onClick={() => deleteAssetClass(asset.id)}
                    className="text-red-500 hover:text-red-700 transition-colors"
                    aria-label="Delete asset class"
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
                      onChange={(e) => updateAssetClass(asset.id, 'allocation', toNum(e.target.value))}
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
                      onChange={(e) => updateAssetClass(asset.id, 'growthRate', toNum(e.target.value))}
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
                  onChange={(e) => setInflationRate(toNum(e.target.value))}
                  className="w-full mt-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:border-blue-500 outline-none transition-colors"
                  step="0.1"
                  min="0"
                  aria-label="Inflation rate"
                />
                <div className="mt-3 flex items-center gap-2">
                  <input
                    id="showReal"
                    type="checkbox"
                    checked={showRealDollars}
                    onChange={(e) => setShowRealDollars(e.target.checked)}
                    className="h-4 w-4"
                  />
                  <label htmlFor="showReal" className="text-sm text-gray-700">
                    Show values in today’s dollars
                  </label>
                </div>
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
              {Object.entries(yearlyData).map(([year, data]) => {
                const y = parseInt(year);
                const isCurrentYear = y === currentYear;
                const isMilestone = (y - currentYear) % 5 === 0;

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
