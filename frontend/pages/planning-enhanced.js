// PREVIEW: Enhanced Planning Page with Real Data Integration
// This file demonstrates the improvements before merging into planning.js

import React, { useState, useMemo, useEffect } from 'react';
import {
  ChevronDown, ChevronRight, Plus, Trash2, Save, Copy, TrendingUp, DollarSign, Calculator,
  Settings, Download, Upload, BarChart3, PieChart, Eye, EyeOff, Zap, Target,
  Calendar, AlertCircle, Flag, Play, Sparkles, RefreshCw, Layers, Shield,
  TrendingDown, Clock, Award, Flame, ArrowRight, Check, X, HelpCircle, LineChart,
  Info, Loader2
} from 'lucide-react';
import { Protect } from '@clerk/nextjs';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LineChart as RechartsLineChart, Line, AreaChart, Area, PieChart as RechartsPieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine, ComposedChart, Bar
} from 'recharts';
import { usePortfolioSummary } from '@/store/hooks/usePortfolioSummary';
import { usePortfolioTrends } from '@/store/hooks/usePortfolioTrends';

// ==================== HELPER COMPONENTS ====================

// Tooltip Component
const TooltipWrapper = ({ children, content }) => {
  const [show, setShow] = useState(false);

  return (
    <div className="relative inline-block">
      <div
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        className="cursor-help"
      >
        {children}
      </div>
      {show && (
        <div className="absolute z-50 bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg shadow-xl border border-gray-700 whitespace-nowrap">
          {content}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-900" />
        </div>
      )}
    </div>
  );
};

// Range Slider Component
const RangeSlider = ({ label, value, onChange, min, max, step = 1, unit = '', tooltip }) => {
  const percentage = ((value - min) / (max - min)) * 100;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
          {label}
          {tooltip && (
            <TooltipWrapper content={tooltip}>
              <HelpCircle className="w-3 h-3 text-gray-500" />
            </TooltipWrapper>
          )}
        </label>
        <span className="text-sm font-semibold text-blue-400">
          {value}{unit}
        </span>
      </div>
      <div className="relative">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="w-full h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer slider"
          style={{
            background: `linear-gradient(to right, #3B82F6 0%, #3B82F6 ${percentage}%, #1F2937 ${percentage}%, #1F2937 100%)`
          }}
        />
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>{min}{unit}</span>
          <span>{max}{unit}</span>
        </div>
      </div>
      <style jsx>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #3B82F6;
          cursor: pointer;
          box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.2);
        }
        .slider::-moz-range-thumb {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #3B82F6;
          cursor: pointer;
          border: none;
          box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.2);
        }
      `}</style>
    </div>
  );
};

const FinancialPlanningEnhanced = () => {
  const currentYear = new Date().getFullYear();

  // DataStore integration
  const { summary, loading: portfolioLoading } = usePortfolioSummary();
  const { trends, loading: trendsLoading } = usePortfolioTrends();

  // Initialization state
  const [isInitialized, setIsInitialized] = useState(false);

  // Core state
  const [planName, setPlanName] = useState('My Financial Plan');
  const [isEditingName, setIsEditingName] = useState(false);
  const [selectedYears, setSelectedYears] = useState(25);
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
  const [currency, setCurrency] = useState('USD');
  const [inflationRate, setInflationRate] = useState(2.5);
  const [showRealDollars, setShowRealDollars] = useState(false);
  const [showValues, setShowValues] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [showMonteCarlo, setShowMonteCarlo] = useState(false);
  const [monteCarloRuns, setMonteCarloRuns] = useState(1000);
  const [isRunningMonteCarlo, setIsRunningMonteCarlo] = useState(false);
  const [monteCarloResults, setMonteCarloResults] = useState(null);

  // Scenario state
  const [activeScenario, setActiveScenario] = useState('base');

  // Starting portfolio value from DataStore
  const startingNetWorth = useMemo(() => {
    return summary?.netWorth || 0;
  }, [summary]);

  // Calculate historical return from trends
  const calculateHistoricalReturn = useMemo(() => {
    if (!trends?.chartData || trends.chartData.length < 2) return 8;

    const data = trends.chartData;
    const recent = data.slice(-12); // Last 12 data points

    if (recent.length < 2) return 8;

    const startValue = recent[0].netWorth;
    const endValue = recent[recent.length - 1].netWorth;

    if (!startValue || startValue <= 0) return 8;

    const totalReturn = ((endValue - startValue) / startValue);
    const periods = recent.length - 1;
    const annualReturn = (Math.pow(1 + totalReturn, 12 / periods) - 1) * 100;

    // Clamp between reasonable bounds
    return Math.max(0, Math.min(20, annualReturn));
  }, [trends]);

  // Infer monthly contribution from historical data
  const inferredContribution = useMemo(() => {
    if (!trends?.chartData || trends.chartData.length < 3) return 2000;

    const data = trends.chartData.slice(-6); // Last 6 points
    if (data.length < 2) return 2000;

    // Calculate average monthly change
    let totalChange = 0;
    for (let i = 1; i < data.length; i++) {
      const change = data[i].netWorth - data[i - 1].netWorth;
      // Subtract estimated market gains to isolate contributions
      const marketGain = data[i - 1].netWorth * (calculateHistoricalReturn / 100 / 12);
      const contribution = change - marketGain;
      if (contribution > 0 && contribution < 50000) { // Sanity check
        totalChange += contribution;
      }
    }

    const avgMonthly = totalChange / (data.length - 1);
    return Math.max(0, Math.round(avgMonthly / 100) * 100); // Round to nearest 100
  }, [trends, calculateHistoricalReturn]);

  // Asset classes - Initialize from real portfolio
  const [assetClasses, setAssetClasses] = useState([
    { id: 1, name: 'Securities', color: '#3B82F6', growthRate: 10, volatility: 16, risk: 'High', allocation: 50, visible: true },
    { id: 2, name: 'Cash', color: '#10B981', growthRate: 3, volatility: 1, risk: 'Low', allocation: 20, visible: true },
    { id: 3, name: 'Crypto', color: '#8B5CF6', growthRate: 15, volatility: 40, risk: 'Very High', allocation: 10, visible: true },
    { id: 4, name: 'Real Estate', color: '#F59E0B', growthRate: 7, volatility: 12, risk: 'Medium', allocation: 15, visible: true },
    { id: 5, name: 'Other', color: '#6B7280', growthRate: 5, volatility: 8, risk: 'Low', allocation: 5, visible: true },
  ]);

  // Initialize from real portfolio data (ONE TIME)
  useEffect(() => {
    if (!summary || isInitialized || portfolioLoading) return;

    const allocation = summary.assetAllocation;
    if (!allocation) return;

    const newAssetClasses = [];
    let id = 1;

    // Securities
    if (allocation.securities?.value > 0) {
      newAssetClasses.push({
        id: id++,
        name: 'Securities',
        color: '#3B82F6',
        growthRate: calculateHistoricalReturn || 10,
        volatility: 16,
        risk: 'High',
        allocation: allocation.securities.percentage || 0,
        visible: true,
        realValue: allocation.securities.value,
      });
    }

    // Cash
    if (allocation.cash?.value > 0) {
      newAssetClasses.push({
        id: id++,
        name: 'Cash',
        color: '#10B981',
        growthRate: 3,
        volatility: 1,
        risk: 'Low',
        allocation: allocation.cash.percentage || 0,
        visible: true,
        realValue: allocation.cash.value,
      });
    }

    // Crypto
    if (allocation.crypto?.value > 0) {
      newAssetClasses.push({
        id: id++,
        name: 'Crypto',
        color: '#8B5CF6',
        growthRate: 15,
        volatility: 40,
        risk: 'Very High',
        allocation: allocation.crypto.percentage || 0,
        visible: true,
        realValue: allocation.crypto.value,
      });
    }

    // Metals
    if (allocation.metals?.value > 0) {
      newAssetClasses.push({
        id: id++,
        name: 'Precious Metals',
        color: '#F59E0B',
        growthRate: 5,
        volatility: 15,
        risk: 'Medium',
        allocation: allocation.metals.percentage || 0,
        visible: true,
        realValue: allocation.metals.value,
      });
    }

    // Other Assets
    if (allocation.otherAssets?.value > 0) {
      newAssetClasses.push({
        id: id++,
        name: 'Other Assets',
        color: '#6B7280',
        growthRate: 7,
        volatility: 10,
        risk: 'Medium',
        allocation: allocation.otherAssets.percentage || 0,
        visible: true,
        realValue: allocation.otherAssets.value,
      });
    }

    if (newAssetClasses.length > 0) {
      setAssetClasses(newAssetClasses);
      setIsInitialized(true);
    }
  }, [summary, isInitialized, portfolioLoading, calculateHistoricalReturn]);

  // Cash flows - Initialize with inferred contribution
  const [cashFlows, setCashFlows] = useState([
    { id: 1, name: 'Monthly Investment', type: 'monthly', amount: 2000, startYear: 0, endYear: 30, growthRate: 3 },
  ]);

  // Update default cash flow when inference is ready
  useEffect(() => {
    if (inferredContribution > 0 && cashFlows.length > 0 && cashFlows[0].amount === 2000) {
      setCashFlows(prev => prev.map((flow, idx) =>
        idx === 0 ? { ...flow, amount: inferredContribution } : flow
      ));
    }
  }, [inferredContribution]);

  // Goals/Milestones
  const [goals, setGoals] = useState([
    { id: 1, name: 'Emergency Fund', targetAmount: 50000, targetYear: currentYear + 2, priority: 'high', color: '#EF4444' },
    { id: 2, name: 'House Down Payment', targetAmount: 150000, targetYear: currentYear + 5, priority: 'high', color: '#F59E0B' },
    { id: 3, name: 'Financial Independence', targetAmount: 2000000, targetYear: currentYear + 20, priority: 'medium', color: '#10B981' },
  ]);

  // Scenarios
  const scenarios = [
    { id: 'base', name: 'Base Case', returnModifier: 1.0, contributionModifier: 1.0, color: '#3B82F6' },
    { id: 'conservative', name: 'Bear Market', returnModifier: 0.6, contributionModifier: 0.8, color: '#EF4444' },
    { id: 'aggressive', name: 'Bull Market', returnModifier: 1.4, contributionModifier: 1.2, color: '#10B981' },
  ];

  // FIRE settings
  const [fireSettings, setFireSettings] = useState({
    annualExpenses: 60000,
    safeWithdrawalRate: 4,
    retirementAge: 65,
    currentAge: 35,
  });

  // Helpers
  const clamp = (n, min, max) => Math.min(max, Math.max(min, n ?? 0));
  const toNum = (v, fallback = 0) => {
    const n = typeof v === 'number' ? v : parseFloat(v);
    return Number.isFinite(n) ? n : fallback;
  };

  // Currency formatter
  const currencyFormatter = useMemo(() => {
    const code = ['USD', 'EUR', 'GBP'].includes(currency) ? currency : 'USD';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: code, maximumFractionDigits: 0 });
  }, [currency]);
  const formatCurrency = (value) => currencyFormatter.format(toNum(value));
  const formatCompact = (value) => {
    const num = toNum(value);
    if (num >= 1000000) return `$${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `$${(num / 1000).toFixed(0)}K`;
    return formatCurrency(num);
  };

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

  // Portfolio weighted return and volatility
  const portfolioMetrics = useMemo(() => {
    let weightedReturn = 0;
    let weightedVolatility = 0;

    assetClasses.forEach(asset => {
      const weight = toNum(asset.allocation) / 100;
      weightedReturn += weight * toNum(asset.growthRate);
      weightedVolatility += weight * toNum(asset.volatility);
    });

    return { expectedReturn: weightedReturn, volatility: weightedVolatility };
  }, [assetClasses]);

  // Apply scenario modifier
  const scenarioModifiedMetrics = useMemo(() => {
    const scenario = scenarios.find(s => s.id === activeScenario);
    if (!scenario) return portfolioMetrics;

    return {
      expectedReturn: portfolioMetrics.expectedReturn * scenario.returnModifier,
      volatility: portfolioMetrics.volatility,
    };
  }, [portfolioMetrics, activeScenario, scenarios]);

  // Main projection calculation (with scenario support)
  const yearlyData = useMemo(() => {
    const scenario = scenarios.find(s => s.id === activeScenario);
    const returnMod = scenario?.returnModifier || 1;
    const contribMod = scenario?.contributionModifier || 1;

    const data = [];
    let portfolioValue = startingNetWorth;
    let totalContributions = startingNetWorth;

    for (let yearIndex = 0; yearIndex <= selectedYears; yearIndex++) {
      const year = currentYear + yearIndex;
      let yearlyContribution = 0;

      // Calculate contributions for this year
      for (const flow of cashFlows) {
        const s = clamp(toNum(flow.startYear), 0, selectedYears);
        const e = clamp(toNum(flow.endYear), 0, selectedYears);
        if (yearIndex >= s && yearIndex <= e) {
          const t = yearIndex - s;
          const g = (toNum(flow.growthRate) / 100) || 0;
          const amt = toNum(flow.amount) * contribMod;
          const grown = amt * Math.pow(1 + g, t);
          yearlyContribution += (flow.type === 'monthly' ? grown * 12 : grown);
        }
      }

      // Calculate portfolio growth
      if (yearIndex > 0) {
        const returnRate = (scenarioModifiedMetrics.expectedReturn / 100) * returnMod;
        portfolioValue = portfolioValue * (1 + returnRate) + yearlyContribution;
      }

      totalContributions += yearlyContribution;

      // Calculate asset breakdown
      const assetValues = {};
      assetClasses.forEach(asset => {
        const weight = toNum(asset.allocation) / 100;
        assetValues[asset.id] = portfolioValue * weight;
      });

      // Apply inflation adjustment if needed
      let displayValue = portfolioValue;
      let displayContributions = totalContributions;
      if (showRealDollars && yearIndex > 0) {
        const deflator = Math.pow(1 + inflationRate / 100, yearIndex);
        displayValue = portfolioValue / deflator;
        displayContributions = totalContributions / deflator;
      }

      data.push({
        year,
        yearIndex,
        contributions: yearlyContribution,
        totalContributions: displayContributions,
        portfolioValue: displayValue,
        nominalValue: portfolioValue,
        assetValues,
        growth: displayValue - displayContributions,
      });
    }

    return data;
  }, [currentYear, selectedYears, cashFlows, assetClasses, scenarioModifiedMetrics, startingNetWorth, showRealDollars, inflationRate, activeScenario, scenarios]);

  // Summary statistics
  const summaryStats = useMemo(() => {
    if (yearlyData.length === 0) return {};

    const finalData = yearlyData[yearlyData.length - 1];
    const totalContributions = finalData.totalContributions;
    const finalValue = finalData.portfolioValue;
    const totalGrowth = finalValue - totalContributions;

    // FIRE calculations
    const fireNumber = fireSettings.annualExpenses * (100 / fireSettings.safeWithdrawalRate);
    const yearsToFire = yearlyData.findIndex(d => d.portfolioValue >= fireNumber);
    const fireAge = yearsToFire >= 0 ? fireSettings.currentAge + yearsToFire : null;

    // Find goal achievements
    const goalAchievements = goals.map(goal => {
      const achieveYear = yearlyData.find(d => d.portfolioValue >= goal.targetAmount);
      return {
        ...goal,
        achievedYear: achieveYear ? achieveYear.year : null,
        progress: Math.min(100, (finalValue / goal.targetAmount) * 100),
      };
    });

    return {
      totalContributions,
      finalValue,
      totalGrowth,
      growthMultiplier: totalContributions > 0 ? finalValue / totalContributions : 0,
      avgAnnualReturn: scenarioModifiedMetrics.expectedReturn,
      fireNumber,
      yearsToFire: yearsToFire >= 0 ? yearsToFire : null,
      fireAge,
      goalAchievements,
    };
  }, [yearlyData, fireSettings, goals, scenarioModifiedMetrics]);

  // Monte Carlo (same as before - omitted for brevity, assume same implementation)
  const runMonteCarlo = () => {
    // ... existing implementation
  };

  // Chart data
  const projectionChartData = useMemo(() => {
    return yearlyData.map(d => ({
      year: d.year,
      'Portfolio Value': d.portfolioValue,
      'Total Contributions': d.totalContributions,
      'Growth': d.growth,
    }));
  }, [yearlyData]);

  const allocationChartData = useMemo(() => {
    return assetClasses.map(asset => ({
      name: asset.name,
      value: asset.allocation,
      color: asset.color,
    }));
  }, [assetClasses]);

  // Mutators
  const addAssetClass = () => {
    const colors = ['#EC4899', '#6366F1', '#14B8A6', '#F97316', '#84CC16'];
    const newAsset = {
      id: Date.now(),
      name: 'New Asset',
      color: colors[assetClasses.length % colors.length],
      growthRate: 7,
      volatility: 10,
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
      amount: inferredContribution || 1000,
      startYear: 0,
      endYear: selectedYears,
      growthRate: 2,
    };
    setCashFlows([...cashFlows, newFlow]);
  };

  const addGoal = () => {
    const colors = ['#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6'];
    const newGoal = {
      id: Date.now(),
      name: 'New Goal',
      targetAmount: 100000,
      targetYear: currentYear + 10,
      priority: 'medium',
      color: colors[goals.length % colors.length],
    };
    setGoals([...goals, newGoal]);
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

  const updateGoal = (id, field, value) => {
    setGoals(prev => prev.map(goal =>
      goal.id === id ? { ...goal, [field]: value } : goal
    ));
  };

  const deleteAssetClass = (id) => setAssetClasses(prev => prev.filter(a => a.id !== id));
  const deleteCashFlow = (id) => setCashFlows(prev => prev.filter(f => f.id !== id));
  const deleteGoal = (id) => setGoals(prev => prev.filter(g => g.id !== id));

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-3 shadow-xl">
          <p className="text-gray-300 text-sm font-medium mb-2">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {formatCurrency(entry.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  // Loading state
  if (portfolioLoading || trendsLoading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading your portfolio data...</p>
        </div>
      </div>
    );
  }

  return (
    <Protect
      condition={(has) => has({ feature: 'feature_dynamic_planning' })}
      fallback={
        <main className="mx-auto max-w-2xl p-8 mt-16 rounded-2xl border border-yellow-500/30 bg-yellow-500/10 text-yellow-100">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-yellow-500/20 rounded-xl">
              <Target className="w-8 h-8 text-yellow-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-yellow-50">Dynamic Planning</h1>
              <p className="text-sm text-yellow-200/70">Premium Feature</p>
            </div>
          </div>
          <p className="text-sm text-yellow-100/90 mb-6">
            Unlock powerful financial planning tools including Monte Carlo simulations,
            goal tracking, FIRE calculations, and scenario analysis.
          </p>
          <div className="flex items-center gap-3">
            <a
              href="/upgrade"
              className="inline-flex items-center gap-2 rounded-xl bg-yellow-500 px-4 py-2 text-sm font-medium text-black hover:bg-yellow-400 transition-colors"
            >
              <Zap className="w-4 h-4" />
              Upgrade Now
            </a>
            <a
              href="/"
              className="inline-flex items-center gap-2 rounded-xl border border-yellow-400/30 px-4 py-2 text-sm hover:bg-yellow-500/10 transition-colors"
            >
              Go Home
            </a>
          </div>
        </main>
      }
    >
      <div className="min-h-screen bg-gray-950 text-gray-100">
        {/* Header with Scenario Switcher */}
        <div className="bg-gray-900 border-b border-gray-800">
          <div className="max-w-7xl mx-auto px-6 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl">
                  <Target className="w-8 h-8 text-white" />
                </div>
                <div>
                  {isEditingName ? (
                    <input
                      type="text"
                      value={planName}
                      onChange={(e) => setPlanName(e.target.value)}
                      onBlur={() => setIsEditingName(false)}
                      onKeyDown={(e) => e.key === 'Enter' && setIsEditingName(false)}
                      className="text-2xl font-bold bg-transparent border-b-2 border-blue-500 outline-none text-white"
                      autoFocus
                    />
                  ) : (
                    <h1
                      className="text-2xl font-bold text-white cursor-pointer hover:text-blue-400 transition-colors"
                      onClick={() => setIsEditingName(true)}
                    >
                      {planName}
                    </h1>
                  )}
                  <p className="text-gray-400 text-sm mt-1 flex items-center gap-2">
                    {selectedYears}-year projection
                    {startingNetWorth > 0 && ` • Starting: ${formatCompact(startingNetWorth)}`}
                    {isInitialized && (
                      <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded-full">
                        <Check className="w-3 h-3 inline mr-1" />
                        Auto-populated
                      </span>
                    )}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {/* Scenario Switcher */}
                <div className="flex items-center gap-2 bg-gray-800 rounded-lg p-1">
                  {scenarios.map(scenario => (
                    <button
                      key={scenario.id}
                      onClick={() => setActiveScenario(scenario.id)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                        activeScenario === scenario.id
                          ? 'bg-gray-700 text-white'
                          : 'text-gray-400 hover:text-gray-200'
                      }`}
                      style={{
                        borderLeft: activeScenario === scenario.id ? `3px solid ${scenario.color}` : 'none',
                      }}
                    >
                      {scenario.name}
                    </button>
                  ))}
                </div>

                <button className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors flex items-center gap-2 text-sm">
                  <Download className="w-4 h-4" />
                  <span className="hidden sm:inline">Export</span>
                </button>
                <button className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:shadow-lg hover:shadow-blue-500/25 transition-all flex items-center gap-2">
                  <Save className="w-4 h-4" />
                  <span className="hidden sm:inline">Save</span>
                </button>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mt-6">
              <div className="bg-gray-800/50 backdrop-blur p-4 rounded-xl border border-gray-700/50">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-gray-400 text-xs font-medium uppercase tracking-wider">Final Value</p>
                  <TooltipWrapper content="Projected portfolio value at end of plan">
                    <HelpCircle className="w-3 h-3 text-gray-500" />
                  </TooltipWrapper>
                </div>
                <p className="text-xl font-bold text-white">
                  {formatCompact(summaryStats.finalValue)}
                </p>
              </div>

              <div className="bg-gray-800/50 backdrop-blur p-4 rounded-xl border border-gray-700/50">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-gray-400 text-xs font-medium uppercase tracking-wider">Total Growth</p>
                  <TooltipWrapper content="Investment gains from market returns">
                    <HelpCircle className="w-3 h-3 text-gray-500" />
                  </TooltipWrapper>
                </div>
                <p className="text-xl font-bold text-green-400">
                  {formatCompact(summaryStats.totalGrowth)}
                </p>
              </div>

              <div className="bg-gray-800/50 backdrop-blur p-4 rounded-xl border border-gray-700/50">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-gray-400 text-xs font-medium uppercase tracking-wider">Multiplier</p>
                  <TooltipWrapper content="How many times your money will grow">
                    <HelpCircle className="w-3 h-3 text-gray-500" />
                  </TooltipWrapper>
                </div>
                <p className="text-xl font-bold text-purple-400">
                  {summaryStats.growthMultiplier?.toFixed(1)}x
                </p>
              </div>

              <div className="bg-gray-800/50 backdrop-blur p-4 rounded-xl border border-gray-700/50">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-gray-400 text-xs font-medium uppercase tracking-wider">Exp. Return</p>
                  <TooltipWrapper content="Weighted average expected annual return">
                    <HelpCircle className="w-3 h-3 text-gray-500" />
                  </TooltipWrapper>
                </div>
                <p className="text-xl font-bold text-blue-400">
                  {scenarioModifiedMetrics.expectedReturn.toFixed(1)}%
                </p>
              </div>

              <div className="bg-gray-800/50 backdrop-blur p-4 rounded-xl border border-gray-700/50">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-gray-400 text-xs font-medium uppercase tracking-wider">FIRE Number</p>
                  <TooltipWrapper content={`Annual expenses ÷ ${fireSettings.safeWithdrawalRate}%`}>
                    <HelpCircle className="w-3 h-3 text-gray-500" />
                  </TooltipWrapper>
                </div>
                <p className="text-xl font-bold text-amber-400">
                  {formatCompact(summaryStats.fireNumber)}
                </p>
              </div>

              <div className="bg-gray-800/50 backdrop-blur p-4 rounded-xl border border-gray-700/50">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-gray-400 text-xs font-medium uppercase tracking-wider">Years to FI</p>
                  <TooltipWrapper content="Years until you reach your FIRE number">
                    <HelpCircle className="w-3 h-3 text-gray-500" />
                  </TooltipWrapper>
                </div>
                <p className="text-xl font-bold text-emerald-400">
                  {summaryStats.yearsToFire !== null ? `${summaryStats.yearsToFire} yrs` : '—'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Rest of the UI - simplified for demo */}
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Demo: Slider Components</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <RangeSlider
                label="Expected Return"
                value={assetClasses[0]?.growthRate || 10}
                onChange={(val) => updateAssetClass(assetClasses[0]?.id, 'growthRate', val)}
                min={0}
                max={20}
                step={0.5}
                unit="%"
                tooltip="Historical average is ~10% for stocks"
              />

              <RangeSlider
                label="Monthly Contribution"
                value={cashFlows[0]?.amount || 2000}
                onChange={(val) => updateCashFlow(cashFlows[0]?.id, 'amount', val)}
                min={0}
                max={10000}
                step={100}
                unit=""
                tooltip={`Auto-detected: $${inferredContribution}/month from your history`}
              />
            </div>

            <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-blue-400 mt-0.5" />
                <div>
                  <p className="text-blue-200 font-medium">Smart Initialization</p>
                  <p className="text-blue-300/70 text-sm mt-1">
                    This page auto-populated with your actual portfolio allocation ({assetClasses.length} assets detected)
                    and inferred a ${inferredContribution}/month contribution rate from your net worth history.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Protect>
  );
};

export default FinancialPlanningEnhanced;
