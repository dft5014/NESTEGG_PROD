import React, { useState, useMemo, useEffect } from 'react';
import {
  ChevronDown, ChevronRight, Plus, Trash2, Save, Copy, TrendingUp, DollarSign, Calculator,
  Settings, Download, Upload, BarChart3, PieChart, Eye, EyeOff, Zap, Target,
  Calendar, AlertCircle, Flag, Play, Sparkles, RefreshCw, Layers, Shield,
  TrendingDown, Clock, Award, Flame, ArrowRight, Check, X, HelpCircle, LineChart,
  Lightbulb, Info, Loader2, Gift, Home, Baby, GraduationCap, Briefcase, Heart,
  Wallet, Plane, Car, Banknote, Package, ShoppingCart, Users, Repeat
} from 'lucide-react';
import { Protect } from '@clerk/nextjs';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LineChart as RechartsLineChart, Line, AreaChart, Area, PieChart as RechartsPieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine, ComposedChart, Bar
} from 'recharts';
import { usePortfolioSummary } from '@/store/hooks/usePortfolioSummary';
import { usePortfolioTrends } from '@/store/hooks/usePortfolioTrends';

const FinancialPlanning = () => {
  const currentYear = new Date().getFullYear();

  // DataStore integration
  const { summary, loading: portfolioLoading } = usePortfolioSummary();
  const { trends, loading: trendsLoading } = usePortfolioTrends();

  // Debug logging
  useEffect(() => {
    console.log('=== PLANNING DEBUG ===');
    console.log('Portfolio Loading:', portfolioLoading, 'Summary:', summary);
    console.log('Trends Loading:', trendsLoading, 'Trends:', trends);
    console.log('Starting Net Worth:', summary?.netWorth);
    console.log('Trends Data Length:', trends?.chartData?.length);
    console.log('=====================');
  }, [portfolioLoading, trendsLoading, summary, trends]);

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

  // Log tab changes
  useEffect(() => {
    console.log('Active Planning Tab Changed:', activeTab);
  }, [activeTab]);
  const [monteCarloRuns, setMonteCarloRuns] = useState(1000);
  const [isRunningMonteCarlo, setIsRunningMonteCarlo] = useState(false);
  const [monteCarloResults, setMonteCarloResults] = useState(null);

  // NEW: Premium features state
  const [isInitialized, setIsInitialized] = useState(false);
  const [lifeEvents, setLifeEvents] = useState([]);
  const [withdrawalSettings, setWithdrawalSettings] = useState({
    startYear: 30,
    duration: 30,
    strategy: 'fixed-percentage',
    annualWithdrawal: 80000,
    inflationAdjusted: true,
    socialSecurityAge: 67,
    socialSecurityAmount: 30000,
  });
  const [compareMode, setCompareMode] = useState(false);
  const [showInsights, setShowInsights] = useState(true);

  // Personal Information & Finance State
  const [personalInfo, setPersonalInfo] = useState({
    name: '',
    currentAge: 35,
    retirementAge: 65,
  });

  const [personalFinance, setPersonalFinance] = useState({
    annualIncome: 100000,
    annualExpenses: 60000,
    annualIncomeChange: 3, // % per year
    maxIncome: 200000,
    cashAllocationPercent: 20, // % of cash flow to cash vs invested
    emergencyFundTarget: 50000,
    emergencyFundGrowthRate: 2.5, // default to inflation
  });

  // Tooltip state
  const [activeTooltip, setActiveTooltip] = useState(null);

  // Starting portfolio value from DataStore
  const startingNetWorth = useMemo(() => {
    return summary?.netWorth || 0;
  }, [summary]);

  // Calculate personal finance derived values
  const personalFinanceCalculated = useMemo(() => {
    const annualCashFlow = personalFinance.annualIncome - personalFinance.annualExpenses;
    const monthlyCashFlow = annualCashFlow / 12;
    const cashToSavings = annualCashFlow * (personalFinance.cashAllocationPercent / 100);
    const cashToInvestments = annualCashFlow * ((100 - personalFinance.cashAllocationPercent) / 100);
    const savingsRate = (annualCashFlow / personalFinance.annualIncome) * 100;

    return {
      annualCashFlow,
      monthlyCashFlow,
      cashToSavings,
      cashToInvestments,
      savingsRate,
    };
  }, [personalFinance]);

  // PHASE 1: Calculate historical return from trends
  const calculateHistoricalReturn = useMemo(() => {
    if (!trends?.chartData || trends.chartData.length < 2) return 8;
    const recent = trends.chartData.slice(-12);
    if (recent.length < 2) return 8;
    const startValue = recent[0].netWorth;
    const endValue = recent[recent.length - 1].netWorth;
    if (!startValue || startValue <= 0) return 8;
    const totalReturn = ((endValue - startValue) / startValue);
    const periods = recent.length - 1;
    const annualReturn = (Math.pow(1 + totalReturn, 12 / periods) - 1) * 100;
    return Math.max(0, Math.min(20, annualReturn));
  }, [trends]);

  // PHASE 1: Infer monthly contribution from net worth growth
  const inferredContribution = useMemo(() => {
    if (!trends?.chartData || trends.chartData.length < 3) return 2000;
    const data = trends.chartData.slice(-6);
    if (data.length < 2) return 2000;
    let totalChange = 0;
    for (let i = 1; i < data.length; i++) {
      const change = data[i].netWorth - data[i - 1].netWorth;
      const marketGain = data[i - 1].netWorth * (calculateHistoricalReturn / 100 / 12);
      const contribution = change - marketGain;
      if (contribution > 0 && contribution < 50000) {
        totalChange += contribution;
      }
    }
    const avgMonthly = totalChange / (data.length - 1);
    return Math.max(0, Math.round(avgMonthly / 100) * 100);
  }, [trends, calculateHistoricalReturn]);

  // Asset classes with configurations
  const [assetClasses, setAssetClasses] = useState([
    { id: 1, name: 'US Stocks', color: '#3B82F6', growthRate: 10, volatility: 16, risk: 'High', allocation: 50, visible: true },
    { id: 2, name: 'Int\'l Stocks', color: '#8B5CF6', growthRate: 8, volatility: 18, risk: 'High', allocation: 15, visible: true },
    { id: 3, name: 'Bonds', color: '#10B981', growthRate: 5, volatility: 6, risk: 'Low', allocation: 20, visible: true },
    { id: 4, name: 'Real Estate', color: '#F59E0B', growthRate: 7, volatility: 12, risk: 'Medium', allocation: 10, visible: true },
    { id: 5, name: 'Cash', color: '#6B7280', growthRate: 3, volatility: 1, risk: 'Low', allocation: 5, visible: true },
  ]);

  // Cash flows
  const [cashFlows, setCashFlows] = useState([
    { id: 1, name: 'Monthly Investment', type: 'monthly', amount: 2000, startYear: 0, endYear: 30, growthRate: 3 },
    { id: 2, name: 'Annual Bonus', type: 'annual', amount: 10000, startYear: 0, endYear: 20, growthRate: 2 },
  ]);

  // Goals/Milestones
  const [goals, setGoals] = useState([
    { id: 1, name: 'Emergency Fund', targetAmount: 50000, targetYear: currentYear + 2, priority: 'high', color: '#EF4444' },
    { id: 2, name: 'House Down Payment', targetAmount: 150000, targetYear: currentYear + 5, priority: 'high', color: '#F59E0B' },
    { id: 3, name: 'Financial Independence', targetAmount: 2000000, targetYear: currentYear + 20, priority: 'medium', color: '#10B981' },
  ]);

  // Scenarios for comparison
  const [scenarios, setScenarios] = useState([
    { id: 1, name: 'Base Case', active: true, modifier: 1.0 },
    { id: 2, name: 'Conservative', active: false, modifier: 0.7 },
    { id: 3, name: 'Aggressive', active: false, modifier: 1.3 },
  ]);

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

  // PHASE 1: Initialize from real portfolio
  useEffect(() => {
    if (!summary || isInitialized || portfolioLoading) return;
    const allocation = summary.assetAllocation;
    if (!allocation) return;

    const newAssetClasses = [];
    let id = 1;

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
      });
    }

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
      });
    }

    if (allocation.crypto?.value > 0) {
      newAssetClasses.push({
        id: id++,
        name: 'Crypto',
        color: '#F59E0B',
        growthRate: 15,
        volatility: 60,
        risk: 'Very High',
        allocation: allocation.crypto.percentage || 0,
        visible: true,
      });
    }

    if (allocation.metals?.value > 0) {
      newAssetClasses.push({
        id: id++,
        name: 'Precious Metals',
        color: '#EAB308',
        growthRate: 6,
        volatility: 15,
        risk: 'Medium',
        allocation: allocation.metals.percentage || 0,
        visible: true,
      });
    }

    if (allocation.realEstate?.value > 0) {
      newAssetClasses.push({
        id: id++,
        name: 'Real Estate',
        color: '#8B5CF6',
        growthRate: 7,
        volatility: 12,
        risk: 'Medium',
        allocation: allocation.realEstate.percentage || 0,
        visible: true,
      });
    }

    if (newAssetClasses.length > 0) {
      setAssetClasses(newAssetClasses);
      setIsInitialized(true);
    }
  }, [summary, isInitialized, portfolioLoading, calculateHistoricalReturn]);

  // PHASE 1: Update cash flows with inferred contribution
  useEffect(() => {
    if (inferredContribution > 0 && cashFlows.length > 0 && cashFlows[0].amount === 2000) {
      setCashFlows(prev => prev.map((flow, idx) =>
        idx === 0 ? { ...flow, amount: inferredContribution } : flow
      ));
    }
  }, [inferredContribution]);

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

  // Main projection calculation
  const yearlyData = useMemo(() => {
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
          const amt = toNum(flow.amount);
          const grown = amt * Math.pow(1 + g, t);
          yearlyContribution += (flow.type === 'monthly' ? grown * 12 : grown);
        }
      }

      // PHASE 3: Apply life events for this year
      for (const event of lifeEvents) {
        if (event.year === year) {
          if (event.type === 'windfall' || event.type === 'gift') {
            yearlyContribution += Math.abs(toNum(event.amount));
          } else if (event.type === 'purchase' || event.type === 'expense') {
            yearlyContribution -= Math.abs(toNum(event.amount));
          }
        }
        // Recurring events (e.g., college tuition)
        if (event.type === 'recurring' && event.startYear && event.duration) {
          const eventStartYear = currentYear + toNum(event.startYear);
          const eventEndYear = eventStartYear + toNum(event.duration);
          if (year >= eventStartYear && year < eventEndYear) {
            yearlyContribution += toNum(event.annualAmount || 0);
          }
        }
      }

      // Calculate portfolio growth
      if (yearIndex > 0) {
        const returnRate = portfolioMetrics.expectedReturn / 100;
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
  }, [currentYear, selectedYears, cashFlows, assetClasses, portfolioMetrics, startingNetWorth, showRealDollars, inflationRate, lifeEvents]);

  // Summary statistics
  const summaryStats = useMemo(() => {
    console.log('Computing summaryStats, yearlyData length:', yearlyData.length);
    if (yearlyData.length === 0) {
      console.log('summaryStats: No yearlyData, returning empty object');
      return {};
    }

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

    const stats = {
      totalContributions,
      finalValue,
      totalGrowth,
      growthMultiplier: totalContributions > 0 ? finalValue / totalContributions : 0,
      avgAnnualReturn: portfolioMetrics.expectedReturn,
      fireNumber,
      yearsToFire: yearsToFire >= 0 ? yearsToFire : null,
      fireAge,
      goalAchievements,
    };

    console.log('summaryStats computed:', stats);
    return stats;
  }, [yearlyData, fireSettings, goals, portfolioMetrics]);

  // PHASE 2: Generate AI insights based on portfolio data
  const aiInsights = useMemo(() => {
    if (!summary || !yearlyData.length || !summaryStats.finalValue) return [];

    const insights = [];
    const finalData = yearlyData[yearlyData.length - 1];

    // Insight 1: Track to FIRE
    if (summaryStats.yearsToFire !== null && summaryStats.yearsToFire < fireSettings.retirementAge - fireSettings.currentAge) {
      const yearsAhead = fireSettings.retirementAge - fireSettings.currentAge - summaryStats.yearsToFire;
      insights.push({
        id: 1,
        type: 'success',
        icon: 'target',
        title: 'On Track for Early Retirement',
        message: `You're projected to reach FI in ${summaryStats.yearsToFire} years, ${yearsAhead} years ahead of schedule at age ${summaryStats.fireAge}!`,
        action: 'Maintain current savings rate'
      });
    }

    // Insight 2: Concentration risk
    const maxAllocation = Math.max(...assetClasses.map(a => a.allocation));
    if (maxAllocation > 60) {
      const concentrated = assetClasses.find(a => a.allocation === maxAllocation);
      insights.push({
        id: 2,
        type: 'warning',
        icon: 'alert',
        title: 'High Concentration Risk',
        message: `${maxAllocation.toFixed(0)}% in ${concentrated.name}. Consider diversifying to reduce risk and volatility.`,
        action: 'Rebalance portfolio'
      });
    }

    // Insight 3: Contribution optimization
    const optimalContribution = (summaryStats.fireNumber - startingNetWorth) / (fireSettings.retirementAge - fireSettings.currentAge) / 12 / 1.5;
    const currentMonthly = cashFlows.reduce((sum, f) => sum + (f.type === 'monthly' ? f.amount : f.amount / 12), 0);
    if (optimalContribution > currentMonthly * 1.1) {
      const additional = Math.round((optimalContribution - currentMonthly) / 100) * 100;
      insights.push({
        id: 3,
        type: 'info',
        icon: 'lightbulb',
        title: 'Increase Contributions for Faster FIRE',
        message: `Adding $${additional}/mo could help you retire ${Math.max(1, Math.round((summaryStats.yearsToFire || 20) * 0.2))} years earlier.`,
        action: 'Adjust savings plan'
      });
    }

    // Insight 4: Performance vs benchmark
    if (calculateHistoricalReturn > 0 && calculateHistoricalReturn < 7) {
      insights.push({
        id: 4,
        type: 'warning',
        icon: 'trending-down',
        title: 'Underperforming Market',
        message: `Your ${calculateHistoricalReturn.toFixed(1)}% return is below the S&P 500 average of ~10%. Review your allocation.`,
        action: 'Review investment strategy'
      });
    } else if (calculateHistoricalReturn > 12) {
      insights.push({
        id: 4,
        type: 'success',
        icon: 'trending-up',
        title: 'Outperforming Market',
        message: `Your ${calculateHistoricalReturn.toFixed(1)}% return exceeds the market average. Great portfolio performance!`,
        action: 'Stay the course'
      });
    }

    // Insight 5: Emergency fund check (if goals exist)
    const emergencyFundGoal = goals.find(g => g.name.toLowerCase().includes('emergency'));
    if (emergencyFundGoal && summary.assetAllocation?.cash) {
      const cashValue = summary.assetAllocation.cash.value;
      if (cashValue < emergencyFundGoal.targetAmount * 0.5) {
        insights.push({
          id: 5,
          type: 'warning',
          icon: 'shield',
          title: 'Low Emergency Fund',
          message: `You have ${formatCompact(cashValue)} in cash. Target: ${formatCompact(emergencyFundGoal.targetAmount)}. Build reserves first.`,
          action: 'Build emergency reserves'
        });
      }
    }

    // Insight 6: Growth trajectory
    if (summaryStats.growthMultiplier > 2) {
      insights.push({
        id: 6,
        type: 'success',
        icon: 'flame',
        title: 'Excellent Growth Trajectory',
        message: `Your portfolio is projected to grow to ${summaryStats.growthMultiplier.toFixed(1)}x your contributions. Compound interest working!`,
        action: 'Keep compounding'
      });
    }

    return insights.slice(0, 5); // Max 5 insights
  }, [summary, yearlyData, summaryStats, assetClasses, cashFlows, goals, calculateHistoricalReturn, fireSettings, startingNetWorth]);

  // PHASE 4: Withdrawal phase projection
  const withdrawalData = useMemo(() => {
    if (!withdrawalSettings || selectedYears < withdrawalSettings.startYear) return [];

    const data = [];
    const startValue = yearlyData[withdrawalSettings.startYear]?.portfolioValue || startingNetWorth;
    let portfolioValue = startValue;

    for (let yearIndex = 0; yearIndex <= withdrawalSettings.duration; yearIndex++) {
      const year = currentYear + withdrawalSettings.startYear + yearIndex;
      const age = fireSettings.currentAge + withdrawalSettings.startYear + yearIndex;

      // Calculate withdrawal
      let withdrawal = 0;
      if (withdrawalSettings.strategy === 'fixed-percentage') {
        withdrawal = portfolioValue * (fireSettings.safeWithdrawalRate / 100);
      } else if (withdrawalSettings.strategy === 'fixed-dollar') {
        const inflationFactor = withdrawalSettings.inflationAdjusted
          ? Math.pow(1 + inflationRate / 100, yearIndex)
          : 1;
        withdrawal = withdrawalSettings.annualWithdrawal * inflationFactor;
      } else if (withdrawalSettings.strategy === 'dynamic') {
        // Dynamic: adjust based on portfolio performance
        const targetValue = startValue * Math.pow(1 + (portfolioMetrics.expectedReturn / 100), yearIndex);
        const adjustmentFactor = portfolioValue / (targetValue || 1);
        withdrawal = (portfolioValue * 0.04) * Math.min(1.2, Math.max(0.8, adjustmentFactor));
      }

      // Add Social Security if age qualifies
      let socialSecurity = 0;
      if (age >= withdrawalSettings.socialSecurityAge) {
        const yearsCollecting = age - withdrawalSettings.socialSecurityAge;
        socialSecurity = withdrawalSettings.socialSecurityAmount * Math.pow(1 + 0.02, yearsCollecting); // 2% COLA
      }

      // Net withdrawal from portfolio
      const netWithdrawal = Math.max(0, withdrawal - socialSecurity);

      // Calculate portfolio growth
      if (yearIndex > 0) {
        const returnRate = portfolioMetrics.expectedReturn / 100;
        portfolioValue = (portfolioValue - netWithdrawal) * (1 + returnRate);
      }

      data.push({
        year,
        age,
        portfolioValue: Math.max(0, portfolioValue),
        withdrawal,
        socialSecurity,
        netWithdrawal,
        totalIncome: withdrawal + socialSecurity,
      });
    }

    return data;
  }, [withdrawalSettings, yearlyData, portfolioMetrics, fireSettings, currentYear, selectedYears, inflationRate, startingNetWorth]);

  // PHASE 4: Withdrawal success probability
  const withdrawalSuccessProbability = useMemo(() => {
    if (!withdrawalData.length) return null;

    const finalValue = withdrawalData[withdrawalData.length - 1].portfolioValue;
    const startValue = withdrawalData[0].portfolioValue;

    if (finalValue <= 0) return 0;
    if (finalValue > startValue * 0.75) return 95;
    if (finalValue > startValue * 0.5) return 85;
    if (finalValue > startValue * 0.25) return 70;
    return 50;
  }, [withdrawalData]);

  // PHASE 5: Waterfall chart data
  const waterfallData = useMemo(() => {
    if (!yearlyData.length) return [];

    const finalData = yearlyData[yearlyData.length - 1];
    const startValue = startingNetWorth;
    const contributions = finalData.totalContributions - startingNetWorth;
    const growth = finalData.portfolioValue - finalData.totalContributions;

    return [
      { name: 'Starting', value: startValue, fill: '#6B7280', cumulativeValue: startValue },
      { name: 'Contributions', value: contributions, fill: '#10B981', cumulativeValue: startValue + contributions },
      { name: 'Market Growth', value: growth, fill: '#3B82F6', cumulativeValue: finalData.portfolioValue },
      { name: 'Final Value', value: 0, fill: 'transparent', cumulativeValue: finalData.portfolioValue, label: formatCompact(finalData.portfolioValue) },
    ];
  }, [yearlyData, startingNetWorth]);

  // Monte Carlo simulation
  const runMonteCarlo = () => {
    setIsRunningMonteCarlo(true);

    setTimeout(() => {
      const simulations = [];
      const finalValues = [];

      for (let sim = 0; sim < monteCarloRuns; sim++) {
        let portfolioValue = startingNetWorth;
        const simData = [{ year: currentYear, value: portfolioValue }];

        for (let yearIndex = 1; yearIndex <= selectedYears; yearIndex++) {
          // Random return based on expected return and volatility
          const randomReturn = portfolioMetrics.expectedReturn / 100 +
            (portfolioMetrics.volatility / 100) * (Math.random() * 2 - 1) * 1.5;

          // Calculate contributions
          let yearlyContribution = 0;
          for (const flow of cashFlows) {
            const s = clamp(toNum(flow.startYear), 0, selectedYears);
            const e = clamp(toNum(flow.endYear), 0, selectedYears);
            if (yearIndex >= s && yearIndex <= e) {
              const t = yearIndex - s;
              const g = (toNum(flow.growthRate) / 100) || 0;
              const amt = toNum(flow.amount);
              const grown = amt * Math.pow(1 + g, t);
              yearlyContribution += (flow.type === 'monthly' ? grown * 12 : grown);
            }
          }

          portfolioValue = portfolioValue * (1 + randomReturn) + yearlyContribution;
          simData.push({ year: currentYear + yearIndex, value: portfolioValue });
        }

        simulations.push(simData);
        finalValues.push(portfolioValue);
      }

      // Calculate percentiles
      finalValues.sort((a, b) => a - b);
      const p10 = finalValues[Math.floor(monteCarloRuns * 0.1)];
      const p25 = finalValues[Math.floor(monteCarloRuns * 0.25)];
      const p50 = finalValues[Math.floor(monteCarloRuns * 0.5)];
      const p75 = finalValues[Math.floor(monteCarloRuns * 0.75)];
      const p90 = finalValues[Math.floor(monteCarloRuns * 0.9)];

      // Build chart data with percentile bands
      const chartData = [];
      for (let yearIndex = 0; yearIndex <= selectedYears; yearIndex++) {
        const yearValues = simulations.map(sim => sim[yearIndex].value).sort((a, b) => a - b);
        chartData.push({
          year: currentYear + yearIndex,
          p10: yearValues[Math.floor(monteCarloRuns * 0.1)],
          p25: yearValues[Math.floor(monteCarloRuns * 0.25)],
          p50: yearValues[Math.floor(monteCarloRuns * 0.5)],
          p75: yearValues[Math.floor(monteCarloRuns * 0.75)],
          p90: yearValues[Math.floor(monteCarloRuns * 0.9)],
        });
      }

      setMonteCarloResults({
        percentiles: { p10, p25, p50, p75, p90 },
        chartData,
        successRate: (finalValues.filter(v => v >= summaryStats.fireNumber).length / monteCarloRuns) * 100,
      });

      setIsRunningMonteCarlo(false);
      setShowMonteCarlo(true);
    }, 100);
  };

  // Chart data for projections
  const projectionChartData = useMemo(() => {
    return yearlyData.map(d => ({
      year: d.year,
      'Portfolio Value': d.portfolioValue,
      'Total Contributions': d.totalContributions,
      'Growth': d.growth,
    }));
  }, [yearlyData]);

  // Allocation pie chart data
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
      amount: 1000,
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

  // Custom tooltip for charts
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

  // Info tooltip component for KPIs
  const InfoTooltip = ({ id, title, description }) => (
    <div className="relative inline-block">
      <button
        onMouseEnter={() => setActiveTooltip(id)}
        onMouseLeave={() => setActiveTooltip(null)}
        onClick={(e) => {
          e.stopPropagation();
          setActiveTooltip(activeTooltip === id ? null : id);
        }}
        className="text-gray-500 hover:text-gray-300 transition-colors ml-1"
      >
        <HelpCircle className="w-3.5 h-3.5" />
      </button>
      {activeTooltip === id && (
        <div className="absolute z-50 w-64 p-3 bg-gray-800 border border-gray-700 rounded-lg shadow-xl text-left bottom-full left-1/2 transform -translate-x-1/2 mb-2">
          <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2 rotate-45 w-2 h-2 bg-gray-800 border-r border-b border-gray-700"></div>
          <h4 className="text-white font-semibold text-sm mb-1">{title}</h4>
          <p className="text-gray-300 text-xs leading-relaxed">{description}</p>
        </div>
      )}
    </div>
  );

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
        {/* Header */}
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
                  <p className="text-gray-400 text-sm mt-1">
                    {selectedYears}-year projection
                    {startingNetWorth > 0 && ` • Starting: ${formatCompact(startingNetWorth)}`}
                    {showRealDollars && ' • Inflation-adjusted'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors flex items-center gap-2 text-sm">
                  <Upload className="w-4 h-4" />
                  <span className="hidden sm:inline">Import</span>
                </button>
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
                <p className="text-gray-400 text-xs font-medium uppercase tracking-wider flex items-center">
                  Final Value
                  <InfoTooltip
                    id="final-value"
                    title="Final Portfolio Value"
                    description="The projected total value of your portfolio at the end of the planning period. This includes your starting amount, all contributions, and investment returns compounded over time."
                  />
                </p>
                <p className="text-xl font-bold text-white mt-1">
                  {formatCompact(summaryStats.finalValue)}
                </p>
              </div>

              <div className="bg-gray-800/50 backdrop-blur p-4 rounded-xl border border-gray-700/50">
                <p className="text-gray-400 text-xs font-medium uppercase tracking-wider flex items-center">
                  Total Growth
                  <InfoTooltip
                    id="total-growth"
                    title="Total Investment Growth"
                    description="The amount your investments have grown through market returns. This is the difference between your final portfolio value and the total amount you've contributed. It represents the power of compound returns."
                  />
                </p>
                <p className="text-xl font-bold text-green-400 mt-1">
                  {formatCompact(summaryStats.totalGrowth)}
                </p>
              </div>

              <div className="bg-gray-800/50 backdrop-blur p-4 rounded-xl border border-gray-700/50">
                <p className="text-gray-400 text-xs font-medium uppercase tracking-wider flex items-center">
                  Multiplier
                  <InfoTooltip
                    id="multiplier"
                    title="Growth Multiplier"
                    description="How many times your portfolio value has grown compared to what you contributed. A 3x multiplier means for every $1 invested, you now have $3. Higher multipliers show the powerful effect of compound interest over time."
                  />
                </p>
                <p className="text-xl font-bold text-purple-400 mt-1">
                  {summaryStats.growthMultiplier?.toFixed(1)}x
                </p>
              </div>

              <div className="bg-gray-800/50 backdrop-blur p-4 rounded-xl border border-gray-700/50">
                <p className="text-gray-400 text-xs font-medium uppercase tracking-wider flex items-center">
                  Exp. Return
                  <InfoTooltip
                    id="exp-return"
                    title="Expected Annual Return"
                    description="The weighted average annual return of your portfolio based on your asset allocation. This is calculated from the growth rates of your different asset classes (stocks, bonds, etc.) and their percentages in your portfolio."
                  />
                </p>
                <p className="text-xl font-bold text-blue-400 mt-1">
                  {portfolioMetrics.expectedReturn.toFixed(1)}%
                </p>
              </div>

              <div className="bg-gray-800/50 backdrop-blur p-4 rounded-xl border border-gray-700/50">
                <p className="text-gray-400 text-xs font-medium uppercase tracking-wider flex items-center">
                  FIRE Number
                  <InfoTooltip
                    id="fire-number"
                    title="Financial Independence Number"
                    description="The portfolio value needed to retire using the 4% rule. Calculated as 25x your annual expenses (or your expenses divided by your safe withdrawal rate). When you reach this number, you can theoretically live off your investments indefinitely."
                  />
                </p>
                <p className="text-xl font-bold text-amber-400 mt-1">
                  {formatCompact(summaryStats.fireNumber)}
                </p>
              </div>

              <div className="bg-gray-800/50 backdrop-blur p-4 rounded-xl border border-gray-700/50">
                <p className="text-gray-400 text-xs font-medium uppercase tracking-wider flex items-center">
                  Years to FI
                  <InfoTooltip
                    id="years-to-fi"
                    title="Years to Financial Independence"
                    description="How many years until your portfolio reaches your FIRE number at your current savings rate and expected returns. This shows when you could potentially retire and live off your investments. The faster you save and invest, the sooner you reach FI."
                  />
                </p>
                <p className="text-xl font-bold text-emerald-400 mt-1">
                  {summaryStats.yearsToFire !== null ? `${summaryStats.yearsToFire} yrs` : '—'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-gray-900/50 border-b border-gray-800">
          <div className="max-w-7xl mx-auto px-6">
            <div className="flex gap-1">
              {[
                { id: 'overview', label: 'Overview', icon: LineChart },
                { id: 'inputs', label: 'Inputs', icon: Settings },
                { id: 'goals', label: 'Goals', icon: Target },
                { id: 'projections', label: 'Projections', icon: TrendingUp },
                { id: 'monte-carlo', label: 'Monte Carlo', icon: Sparkles },
                { id: 'withdrawal', label: 'Withdrawal', icon: Wallet },
                { id: 'insights', label: 'Insights', icon: Lightbulb },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-3 text-sm font-medium flex items-center gap-2 border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-400'
                      : 'border-transparent text-gray-400 hover:text-gray-200'
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-6 py-6">
          <AnimatePresence mode="wait">
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <motion.div
                key="overview"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                {/* Main Projection Chart */}
                <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6">
                  <h3 className="text-lg font-semibold text-white mb-4">Portfolio Projection</h3>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={projectionChartData}>
                        <defs>
                          <linearGradient id="portfolioGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                          </linearGradient>
                          <linearGradient id="contributionsGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis dataKey="year" stroke="#9CA3AF" fontSize={12} />
                        <YAxis
                          stroke="#9CA3AF"
                          fontSize={12}
                          tickFormatter={(value) => formatCompact(value)}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend />
                        <Area
                          type="monotone"
                          dataKey="Portfolio Value"
                          stroke="#3B82F6"
                          fill="url(#portfolioGradient)"
                          strokeWidth={2}
                        />
                        <Area
                          type="monotone"
                          dataKey="Total Contributions"
                          stroke="#10B981"
                          fill="url(#contributionsGradient)"
                          strokeWidth={2}
                        />
                        {goals.map(goal => (
                          <ReferenceLine
                            key={goal.id}
                            y={goal.targetAmount}
                            stroke={goal.color}
                            strokeDasharray="5 5"
                            label={{ value: goal.name, fill: goal.color, fontSize: 10 }}
                          />
                        ))}
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Two Column Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Asset Allocation Pie */}
                  <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6">
                    <h3 className="text-lg font-semibold text-white mb-4">Asset Allocation</h3>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <RechartsPieChart>
                          <Pie
                            data={allocationChartData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={2}
                            dataKey="value"
                          >
                            {allocationChartData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip
                            formatter={(value) => `${value}%`}
                            contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '8px' }}
                          />
                          <Legend />
                        </RechartsPieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Goal Progress */}
                  <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6">
                    <h3 className="text-lg font-semibold text-white mb-4">Goal Progress</h3>
                    <div className="space-y-4">
                      {summaryStats.goalAchievements?.map(goal => (
                        <div key={goal.id} className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-300 flex items-center gap-2">
                              <Flag className="w-3 h-3" style={{ color: goal.color }} />
                              {goal.name}
                            </span>
                            <span className="text-gray-400">
                              {formatCompact(goal.targetAmount)}
                              {goal.achievedYear && (
                                <span className="text-green-400 ml-2">
                                  <Check className="w-3 h-3 inline" /> {goal.achievedYear}
                                </span>
                              )}
                            </span>
                          </div>
                          <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{
                                width: `${Math.min(100, goal.progress)}%`,
                                backgroundColor: goal.color,
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* FIRE Metrics */}
                <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 rounded-2xl border border-amber-500/30 p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <Flame className="w-6 h-6 text-amber-400" />
                    <h3 className="text-lg font-semibold text-white">Financial Independence</h3>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-amber-200/70 text-xs uppercase tracking-wider">FIRE Number</p>
                      <p className="text-2xl font-bold text-white mt-1">{formatCompact(summaryStats.fireNumber)}</p>
                    </div>
                    <div>
                      <p className="text-amber-200/70 text-xs uppercase tracking-wider">Years to FI</p>
                      <p className="text-2xl font-bold text-white mt-1">
                        {summaryStats.yearsToFire !== null ? summaryStats.yearsToFire : '—'}
                      </p>
                    </div>
                    <div>
                      <p className="text-amber-200/70 text-xs uppercase tracking-wider">FI Age</p>
                      <p className="text-2xl font-bold text-white mt-1">
                        {summaryStats.fireAge || '—'}
                      </p>
                    </div>
                    <div>
                      <p className="text-amber-200/70 text-xs uppercase tracking-wider">Safe Withdrawal</p>
                      <p className="text-2xl font-bold text-white mt-1">
                        {formatCompact(summaryStats.fireNumber * (fireSettings.safeWithdrawalRate / 100))}/yr
                      </p>
                    </div>
                  </div>
                </div>

                {/* PHASE 9: Waterfall Chart - Growth Breakdown */}
                <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6">
                  <h3 className="text-lg font-semibold text-white mb-4">Wealth Building Breakdown</h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={waterfallData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis dataKey="name" stroke="#9CA3AF" fontSize={12} />
                        <YAxis
                          stroke="#9CA3AF"
                          fontSize={12}
                          tickFormatter={(value) => formatCompact(value)}
                        />
                        <Tooltip
                          formatter={(value) => formatCurrency(value)}
                          contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '8px' }}
                        />
                        <Bar dataKey="value">
                          {waterfallData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Bar>
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-gray-400 text-xs uppercase">Starting</p>
                      <p className="text-lg font-bold text-gray-300">{formatCompact(startingNetWorth)}</p>
                    </div>
                    <div>
                      <p className="text-gray-400 text-xs uppercase">Contributed</p>
                      <p className="text-lg font-bold text-green-400">
                        {summaryStats.totalContributions && formatCompact(summaryStats.totalContributions - startingNetWorth)}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-400 text-xs uppercase">Market Gains</p>
                      <p className="text-lg font-bold text-blue-400">{summaryStats.totalGrowth && formatCompact(summaryStats.totalGrowth)}</p>
                    </div>
                  </div>
                </div>

                {/* PHASE 10: Life Events Timeline */}
                <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-white">Life Events</h3>
                    <button
                      onClick={() => {
                        const newEvent = {
                          id: Date.now(),
                          type: 'purchase',
                          name: 'New Event',
                          year: currentYear + 5,
                          amount: -10000,
                        };
                        setLifeEvents([...lifeEvents, newEvent]);
                      }}
                      className="px-3 py-1.5 bg-purple-500/20 text-purple-400 rounded-lg hover:bg-purple-500/30 text-sm flex items-center gap-1"
                    >
                      <Plus className="w-4 h-4" />
                      Add Event
                    </button>
                  </div>

                  {lifeEvents.length > 0 ? (
                    <div className="relative">
                      <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-700" />

                      <div className="space-y-4">
                        {lifeEvents.sort((a, b) => a.year - b.year).map((event) => (
                          <div key={event.id} className="relative pl-12">
                            <div className="absolute left-0 w-8 h-8 rounded-full bg-gray-800 border-2 border-purple-500 flex items-center justify-center">
                              {event.type === 'windfall' && <Gift className="w-4 h-4 text-purple-400" />}
                              {event.type === 'purchase' && <Home className="w-4 h-4 text-purple-400" />}
                              {event.type === 'gift' && <Gift className="w-4 h-4 text-purple-400" />}
                              {event.type === 'expense' && <ShoppingCart className="w-4 h-4 text-purple-400" />}
                              {event.type === 'baby' && <Baby className="w-4 h-4 text-purple-400" />}
                              {event.type === 'education' && <GraduationCap className="w-4 h-4 text-purple-400" />}
                            </div>

                            <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
                              <div className="flex items-start justify-between mb-2">
                                <input
                                  type="text"
                                  value={event.name}
                                  onChange={(e) => {
                                    setLifeEvents(prev => prev.map(ev =>
                                      ev.id === event.id ? { ...ev, name: e.target.value } : ev
                                    ));
                                  }}
                                  className="font-medium bg-transparent border-b border-transparent hover:border-gray-600 focus:border-purple-500 outline-none text-white"
                                />
                                <button
                                  onClick={() => setLifeEvents(prev => prev.filter(ev => ev.id !== event.id))}
                                  className="text-red-400 hover:text-red-300 p-1"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>

                              <div className="grid grid-cols-3 gap-3">
                                <div>
                                  <label className="text-xs text-gray-500">Type</label>
                                  <select
                                    value={event.type}
                                    onChange={(e) => {
                                      setLifeEvents(prev => prev.map(ev =>
                                        ev.id === event.id ? { ...ev, type: e.target.value } : ev
                                      ));
                                    }}
                                    className="w-full mt-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white"
                                  >
                                    <option value="windfall">Windfall</option>
                                    <option value="gift">Gift</option>
                                    <option value="purchase">Purchase</option>
                                    <option value="expense">Expense</option>
                                    <option value="baby">Baby</option>
                                    <option value="education">Education</option>
                                  </select>
                                </div>

                                <div>
                                  <label className="text-xs text-gray-500">Year</label>
                                  <input
                                    type="number"
                                    value={event.year}
                                    onChange={(e) => {
                                      setLifeEvents(prev => prev.map(ev =>
                                        ev.id === event.id ? { ...ev, year: parseInt(e.target.value) } : ev
                                      ));
                                    }}
                                    className="w-full mt-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white"
                                  />
                                </div>

                                <div>
                                  <label className="text-xs text-gray-500">Amount</label>
                                  <input
                                    type="number"
                                    value={event.amount}
                                    onChange={(e) => {
                                      setLifeEvents(prev => prev.map(ev =>
                                        ev.id === event.id ? { ...ev, amount: toNum(e.target.value) } : ev
                                      ));
                                    }}
                                    className="w-full mt-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white"
                                  />
                                </div>
                              </div>

                              <div className="mt-2 text-xs text-gray-400">
                                Impact: {event.amount > 0 ? '+' : ''}{formatCurrency(event.amount)}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <Calendar className="w-12 h-12 mx-auto mb-2 text-gray-600" />
                      <p>No life events planned. Add events to see their impact on your plan.</p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* Inputs Tab */}
            {activeTab === 'inputs' && (
              <motion.div
                key="inputs"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                {/* Settings Bar */}
                <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
                  <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <select
                        value={selectedYears}
                        onChange={(e) => setSelectedYears(parseInt(e.target.value))}
                        className="px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-sm focus:border-blue-500 outline-none"
                      >
                        {[10, 15, 20, 25, 30, 40, 50].map(y => (
                          <option key={y} value={y}>{y} years</option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-center gap-2">
                      <select
                        value={currency}
                        onChange={(e) => setCurrency(e.target.value)}
                        className="px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-sm focus:border-blue-500 outline-none"
                      >
                        <option value="USD">USD</option>
                        <option value="EUR">EUR</option>
                        <option value="GBP">GBP</option>
                      </select>
                    </div>

                    <button
                      onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
                      className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm flex items-center gap-2"
                    >
                      <Settings className="w-4 h-4" />
                      Advanced
                      {showAdvancedSettings ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </button>

                    <div className="flex-1" />

                    <button
                      onClick={() => setShowValues(!showValues)}
                      className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm flex items-center gap-2"
                    >
                      {showValues ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      {showValues ? 'Hide' : 'Show'}
                    </button>
                  </div>

                  {showAdvancedSettings && (
                    <div className="mt-4 pt-4 border-t border-gray-800 grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="text-sm text-gray-400">Inflation Rate %</label>
                        <input
                          type="number"
                          value={inflationRate}
                          onChange={(e) => setInflationRate(toNum(e.target.value))}
                          className="w-full mt-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm focus:border-blue-500 outline-none"
                          step="0.1"
                        />
                      </div>
                      <div className="flex items-end">
                        <label className="flex items-center gap-2 text-sm text-gray-300">
                          <input
                            type="checkbox"
                            checked={showRealDollars}
                            onChange={(e) => setShowRealDollars(e.target.checked)}
                            className="rounded bg-gray-800 border-gray-600"
                          />
                          Show in today's dollars
                        </label>
                      </div>
                    </div>
                  )}
                </div>

                {/* Personal Information Section */}
                <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-2xl border border-blue-500/30 p-6">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <Users className="w-5 h-5 text-blue-400" />
                    Personal Information
                  </h3>
                  <p className="text-gray-300 text-sm mb-4">
                    Basic information used throughout your financial plan and projections.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="text-sm text-gray-400">Name (Optional)</label>
                      <input
                        type="text"
                        value={personalInfo.name}
                        onChange={(e) => setPersonalInfo(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="Your Name"
                        className="w-full mt-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm focus:border-blue-500 outline-none text-white"
                      />
                    </div>
                    <div>
                      <label className="text-sm text-gray-400">Current Age</label>
                      <input
                        type="number"
                        value={personalInfo.currentAge}
                        onChange={(e) => setPersonalInfo(prev => ({ ...prev, currentAge: toNum(e.target.value) }))}
                        className="w-full mt-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm focus:border-blue-500 outline-none text-white"
                      />
                    </div>
                    <div>
                      <label className="text-sm text-gray-400">Target Retirement Age</label>
                      <input
                        type="number"
                        value={personalInfo.retirementAge}
                        onChange={(e) => setPersonalInfo(prev => ({ ...prev, retirementAge: toNum(e.target.value) }))}
                        className="w-full mt-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm focus:border-blue-500 outline-none text-white"
                      />
                    </div>
                  </div>
                </div>

                {/* Personal Finance Section */}
                <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <Banknote className="w-5 h-5 text-green-400" />
                    Personal Finance
                  </h3>
                  <p className="text-gray-300 text-sm mb-4">
                    Your current financial situation including income, expenses, and savings strategy.
                  </p>

                  {/* Income & Expenses */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    <div>
                      <label className="text-sm text-gray-400">Annual Income</label>
                      <input
                        type="number"
                        value={personalFinance.annualIncome}
                        onChange={(e) => setPersonalFinance(prev => ({ ...prev, annualIncome: toNum(e.target.value) }))}
                        className="w-full mt-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm focus:border-blue-500 outline-none text-white"
                      />
                    </div>
                    <div>
                      <label className="text-sm text-gray-400">Annual Expenses</label>
                      <input
                        type="number"
                        value={personalFinance.annualExpenses}
                        onChange={(e) => setPersonalFinance(prev => ({ ...prev, annualExpenses: toNum(e.target.value) }))}
                        className="w-full mt-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm focus:border-blue-500 outline-none text-white"
                      />
                    </div>
                    <div>
                      <label className="text-sm text-gray-400">Income Growth (% per year)</label>
                      <input
                        type="number"
                        value={personalFinance.annualIncomeChange}
                        onChange={(e) => setPersonalFinance(prev => ({ ...prev, annualIncomeChange: toNum(e.target.value) }))}
                        step="0.5"
                        className="w-full mt-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm focus:border-blue-500 outline-none text-white"
                      />
                    </div>
                    <div>
                      <label className="text-sm text-gray-400">Max Expected Income</label>
                      <input
                        type="number"
                        value={personalFinance.maxIncome}
                        onChange={(e) => setPersonalFinance(prev => ({ ...prev, maxIncome: toNum(e.target.value) }))}
                        className="w-full mt-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm focus:border-blue-500 outline-none text-white"
                      />
                    </div>
                  </div>

                  {/* Calculated Fields */}
                  <div className="bg-gray-800/50 rounded-xl p-4 mb-6">
                    <h4 className="text-sm font-semibold text-white mb-3">Calculated Cash Flow</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <p className="text-xs text-gray-500 uppercase">Annual Cash Flow</p>
                        <p className="text-lg font-bold text-green-400 mt-1">{formatCurrency(personalFinanceCalculated.annualCashFlow)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 uppercase">Monthly Cash Flow</p>
                        <p className="text-lg font-bold text-green-400 mt-1">{formatCurrency(personalFinanceCalculated.monthlyCashFlow)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 uppercase">Savings Rate</p>
                        <p className="text-lg font-bold text-blue-400 mt-1">{personalFinanceCalculated.savingsRate.toFixed(1)}%</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 uppercase">Years to Max Income</p>
                        <p className="text-lg font-bold text-purple-400 mt-1">
                          {personalFinance.annualIncomeChange > 0
                            ? Math.ceil(Math.log(personalFinance.maxIncome / personalFinance.annualIncome) / Math.log(1 + personalFinance.annualIncomeChange / 100))
                            : '—'
                          }
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Allocation & Emergency Fund */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="text-sm text-gray-400">Cash Allocation (% to savings)</label>
                      <input
                        type="number"
                        value={personalFinance.cashAllocationPercent}
                        onChange={(e) => setPersonalFinance(prev => ({ ...prev, cashAllocationPercent: toNum(e.target.value) }))}
                        min="0"
                        max="100"
                        className="w-full mt-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm focus:border-blue-500 outline-none text-white"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        {personalFinance.cashAllocationPercent}% to cash ({formatCurrency(personalFinanceCalculated.cashToSavings)}/yr),
                        {' '}{100 - personalFinance.cashAllocationPercent}% to investments ({formatCurrency(personalFinanceCalculated.cashToInvestments)}/yr)
                      </p>
                    </div>
                    <div>
                      <label className="text-sm text-gray-400">Emergency Fund Target</label>
                      <input
                        type="number"
                        value={personalFinance.emergencyFundTarget}
                        onChange={(e) => setPersonalFinance(prev => ({ ...prev, emergencyFundTarget: toNum(e.target.value) }))}
                        className="w-full mt-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm focus:border-blue-500 outline-none text-white"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        {(personalFinance.emergencyFundTarget / (personalFinance.annualExpenses / 12)).toFixed(1)} months of expenses
                      </p>
                    </div>
                    <div>
                      <label className="text-sm text-gray-400">Emergency Fund Growth (% per year)</label>
                      <input
                        type="number"
                        value={personalFinance.emergencyFundGrowthRate}
                        onChange={(e) => setPersonalFinance(prev => ({ ...prev, emergencyFundGrowthRate: toNum(e.target.value) }))}
                        step="0.1"
                        className="w-full mt-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm focus:border-blue-500 outline-none text-white"
                      />
                      <p className="text-xs text-gray-500 mt-1">Default: {inflationRate}% (inflation-adjusted)</p>
                    </div>
                  </div>
                </div>

                {/* FIRE Settings Section */}
                <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 rounded-2xl border border-amber-500/30 p-6">
                  <div className="flex items-center gap-3 mb-2">
                    <Flame className="w-6 h-6 text-amber-400" />
                    <h3 className="text-lg font-semibold text-white">FIRE Settings</h3>
                  </div>
                  <div className="bg-amber-500/10 rounded-lg p-3 mb-4">
                    <p className="text-amber-100 text-sm leading-relaxed">
                      <strong>FIRE (Financial Independence, Retire Early)</strong> is a movement focused on achieving financial freedom through aggressive saving and smart investing.
                      The core principle is the <strong>4% rule</strong>: you need 25x your annual expenses invested to retire safely.
                      At this point, you can withdraw 4% per year indefinitely without running out of money.
                    </p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                      <label className="text-sm text-gray-400">Annual Expenses in Retirement</label>
                      <input
                        type="number"
                        value={fireSettings.annualExpenses}
                        onChange={(e) => setFireSettings(prev => ({ ...prev, annualExpenses: toNum(e.target.value) }))}
                        className="w-full mt-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm focus:border-blue-500 outline-none text-white"
                      />
                      <p className="text-xs text-gray-500 mt-1">FIRE Number: {formatCurrency(fireSettings.annualExpenses * 25)}</p>
                    </div>
                    <div>
                      <label className="text-sm text-gray-400">Safe Withdrawal Rate (%)</label>
                      <input
                        type="number"
                        value={fireSettings.safeWithdrawalRate}
                        onChange={(e) => setFireSettings(prev => ({ ...prev, safeWithdrawalRate: toNum(e.target.value) }))}
                        step="0.1"
                        className="w-full mt-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm focus:border-blue-500 outline-none text-white"
                      />
                      <p className="text-xs text-gray-500 mt-1">Annual withdrawal: {formatCurrency(fireSettings.annualExpenses)}</p>
                    </div>
                    <div>
                      <label className="text-sm text-gray-400">Target FIRE Age</label>
                      <input
                        type="number"
                        value={fireSettings.retirementAge}
                        onChange={(e) => setFireSettings(prev => ({ ...prev, retirementAge: toNum(e.target.value) }))}
                        className="w-full mt-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm focus:border-blue-500 outline-none text-white"
                      />
                    </div>
                    <div>
                      <label className="text-sm text-gray-400">Current Age</label>
                      <input
                        type="number"
                        value={fireSettings.currentAge}
                        onChange={(e) => setFireSettings(prev => ({ ...prev, currentAge: toNum(e.target.value) }))}
                        className="w-full mt-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm focus:border-blue-500 outline-none text-white"
                      />
                      <p className="text-xs text-gray-500 mt-1">{fireSettings.retirementAge - fireSettings.currentAge} years until FIRE target</p>
                    </div>
                  </div>
                </div>

                {/* Two Column Layout for Inputs */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Cash Flows */}
                  <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                        <DollarSign className="w-5 h-5 text-green-400" />
                        Cash Flows
                      </h3>
                      <button
                        onClick={addCashFlow}
                        className="px-3 py-1.5 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 text-sm flex items-center gap-1"
                      >
                        <Plus className="w-4 h-4" />
                        Add
                      </button>
                    </div>

                    <div className="space-y-3">
                      {cashFlows.map((flow) => (
                        <div key={flow.id} className="bg-gray-800/50 rounded-xl p-4 border border-gray-700 hover:border-gray-600 transition-colors">
                          <div className="flex items-center justify-between mb-3">
                            <input
                              type="text"
                              value={flow.name}
                              onChange={(e) => updateCashFlow(flow.id, 'name', e.target.value)}
                              className="font-medium bg-transparent border-b border-transparent hover:border-gray-600 focus:border-blue-500 outline-none"
                            />
                            <button
                              onClick={() => deleteCashFlow(flow.id)}
                              className="text-red-400 hover:text-red-300 p-1"
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
                                className="w-full mt-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm focus:border-blue-500 outline-none"
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
                                className="w-full mt-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm focus:border-blue-500 outline-none"
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
                                  className="w-1/2 px-2 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm focus:border-blue-500 outline-none"
                                  min="0"
                                  max={selectedYears}
                                />
                                <input
                                  type="number"
                                  value={flow.endYear}
                                  onChange={(e) => {
                                    const v = clamp(parseInt(e.target.value), 0, selectedYears);
                                    updateCashFlow(flow.id, 'endYear', Math.max(v, flow.startYear));
                                  }}
                                  className="w-1/2 px-2 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm focus:border-blue-500 outline-none"
                                  min="0"
                                  max={selectedYears}
                                />
                              </div>
                            </div>

                            <div>
                              <label className="text-xs text-gray-500">Growth %/yr</label>
                              <input
                                type="number"
                                value={flow.growthRate}
                                onChange={(e) => updateCashFlow(flow.id, 'growthRate', toNum(e.target.value))}
                                className="w-full mt-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm focus:border-blue-500 outline-none"
                                step="0.1"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Asset Allocation */}
                  <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                        <PieChart className="w-5 h-5 text-purple-400" />
                        Asset Allocation
                      </h3>
                      <button
                        onClick={addAssetClass}
                        className="px-3 py-1.5 bg-purple-500/20 text-purple-400 rounded-lg hover:bg-purple-500/30 text-sm flex items-center gap-1"
                      >
                        <Plus className="w-4 h-4" />
                        Add
                      </button>
                    </div>

                    {Math.round(totalAllocation) !== 100 && (
                      <div className="mb-3 px-3 py-2 bg-amber-500/10 border border-amber-500/30 rounded-lg flex items-center gap-3">
                        <AlertCircle className="w-4 h-4 text-amber-400" />
                        <span className="text-sm text-amber-200">
                          Total: {totalAllocation.toFixed(1)}%
                        </span>
                        <button
                          onClick={normalizeAllocations}
                          className="ml-auto px-2.5 py-1 text-xs rounded-md bg-amber-500 text-black hover:bg-amber-400"
                        >
                          Balance
                        </button>
                      </div>
                    )}

                    <div className="space-y-3">
                      {assetClasses.map((asset) => (
                        <div key={asset.id} className="bg-gray-800/50 rounded-xl p-4 border border-gray-700 hover:border-gray-600 transition-colors">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded" style={{ backgroundColor: asset.color }} />
                              <input
                                type="text"
                                value={asset.name}
                                onChange={(e) => updateAssetClass(asset.id, 'name', e.target.value)}
                                className="font-medium bg-transparent border-b border-transparent hover:border-gray-600 focus:border-blue-500 outline-none"
                              />
                            </div>
                            <button
                              onClick={() => deleteAssetClass(asset.id)}
                              className="text-red-400 hover:text-red-300 p-1"
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
                                className="w-full mt-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm focus:border-blue-500 outline-none"
                                min="0"
                                max="100"
                              />
                            </div>

                            <div>
                              <label className="text-xs text-gray-500">Return %</label>
                              <input
                                type="number"
                                value={asset.growthRate}
                                onChange={(e) => updateAssetClass(asset.id, 'growthRate', toNum(e.target.value))}
                                className="w-full mt-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm focus:border-blue-500 outline-none"
                                step="0.1"
                              />
                            </div>

                            <div>
                              <label className="text-xs text-gray-500">Volatility %</label>
                              <input
                                type="number"
                                value={asset.volatility}
                                onChange={(e) => updateAssetClass(asset.id, 'volatility', toNum(e.target.value))}
                                className="w-full mt-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm focus:border-blue-500 outline-none"
                                step="0.1"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* FIRE Settings */}
                <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6">
                  <h3 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
                    <Flame className="w-5 h-5 text-amber-400" />
                    FIRE Settings
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <label className="text-sm text-gray-400">Annual Expenses</label>
                      <input
                        type="number"
                        value={fireSettings.annualExpenses}
                        onChange={(e) => setFireSettings(prev => ({ ...prev, annualExpenses: toNum(e.target.value) }))}
                        className="w-full mt-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm focus:border-blue-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-sm text-gray-400">SWR %</label>
                      <input
                        type="number"
                        value={fireSettings.safeWithdrawalRate}
                        onChange={(e) => setFireSettings(prev => ({ ...prev, safeWithdrawalRate: toNum(e.target.value) }))}
                        className="w-full mt-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm focus:border-blue-500 outline-none"
                        step="0.1"
                      />
                    </div>
                    <div>
                      <label className="text-sm text-gray-400">Current Age</label>
                      <input
                        type="number"
                        value={fireSettings.currentAge}
                        onChange={(e) => setFireSettings(prev => ({ ...prev, currentAge: toNum(e.target.value) }))}
                        className="w-full mt-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm focus:border-blue-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-sm text-gray-400">Target Retirement Age</label>
                      <input
                        type="number"
                        value={fireSettings.retirementAge}
                        onChange={(e) => setFireSettings(prev => ({ ...prev, retirementAge: toNum(e.target.value) }))}
                        className="w-full mt-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm focus:border-blue-500 outline-none"
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Goals Tab */}
            {activeTab === 'goals' && (
              <motion.div
                key="goals"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                      <Target className="w-5 h-5 text-blue-400" />
                      Financial Goals
                    </h3>
                    <button
                      onClick={addGoal}
                      className="px-3 py-1.5 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 text-sm flex items-center gap-1"
                    >
                      <Plus className="w-4 h-4" />
                      Add Goal
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {goals.map((goal) => {
                      const achievement = summaryStats.goalAchievements?.find(g => g.id === goal.id);
                      return (
                        <div
                          key={goal.id}
                          className="bg-gray-800/50 rounded-xl p-4 border border-gray-700 hover:border-gray-600 transition-colors"
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <Flag className="w-4 h-4" style={{ color: goal.color }} />
                              <input
                                type="text"
                                value={goal.name}
                                onChange={(e) => updateGoal(goal.id, 'name', e.target.value)}
                                className="font-medium bg-transparent border-b border-transparent hover:border-gray-600 focus:border-blue-500 outline-none text-sm"
                              />
                            </div>
                            <button
                              onClick={() => deleteGoal(goal.id)}
                              className="text-red-400 hover:text-red-300 p-1"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>

                          <div className="space-y-3">
                            <div>
                              <label className="text-xs text-gray-500">Target Amount</label>
                              <input
                                type="number"
                                value={goal.targetAmount}
                                onChange={(e) => updateGoal(goal.id, 'targetAmount', toNum(e.target.value))}
                                className="w-full mt-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm focus:border-blue-500 outline-none"
                              />
                            </div>
                            <div>
                              <label className="text-xs text-gray-500">Target Year</label>
                              <input
                                type="number"
                                value={goal.targetYear}
                                onChange={(e) => updateGoal(goal.id, 'targetYear', toNum(e.target.value))}
                                className="w-full mt-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm focus:border-blue-500 outline-none"
                                min={currentYear}
                              />
                            </div>

                            {/* Progress */}
                            <div className="pt-2">
                              <div className="flex justify-between text-xs mb-1">
                                <span className="text-gray-400">Progress</span>
                                <span className="text-gray-300">{achievement?.progress?.toFixed(0) || 0}%</span>
                              </div>
                              <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                                <div
                                  className="h-full rounded-full transition-all duration-500"
                                  style={{
                                    width: `${Math.min(100, achievement?.progress || 0)}%`,
                                    backgroundColor: goal.color,
                                  }}
                                />
                              </div>
                              {achievement?.achievedYear && (
                                <p className="text-xs text-green-400 mt-1 flex items-center gap-1">
                                  <Check className="w-3 h-3" />
                                  Achieved by {achievement.achievedYear}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            )}

            {/* Projections Tab */}
            {activeTab === 'projections' && (
              <motion.div
                key="projections"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-800/50 border-b border-gray-700">
                        <tr>
                          <th className="sticky left-0 z-10 bg-gray-800 px-6 py-4 text-left text-xs font-bold text-gray-300 uppercase tracking-wider">
                            Year
                          </th>
                          <th className="px-6 py-4 text-right text-xs font-bold text-gray-300 uppercase tracking-wider">
                            Contribution
                          </th>
                          {assetClasses.map(asset => (
                            <th key={asset.id} className="px-6 py-4 text-right text-xs font-bold text-gray-300 uppercase tracking-wider">
                              <div className="flex items-center justify-end gap-2">
                                <span>{asset.name}</span>
                                <div className="w-2 h-2 rounded" style={{ backgroundColor: asset.color }} />
                              </div>
                            </th>
                          ))}
                          <th className="px-6 py-4 text-right text-xs font-bold text-gray-300 uppercase tracking-wider">
                            Total
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-800">
                        {yearlyData.map((data) => {
                          const isCurrentYear = data.year === currentYear;
                          const isMilestone = (data.year - currentYear) % 5 === 0;

                          return (
                            <tr
                              key={data.year}
                              className={`
                                transition-colors
                                ${isCurrentYear ? 'bg-blue-500/10' : ''}
                                ${isMilestone && !isCurrentYear ? 'bg-gray-800/30' : ''}
                                hover:bg-gray-800/50
                              `}
                            >
                              <td className="sticky left-0 z-10 bg-gray-900 px-6 py-3 text-sm font-medium text-gray-200">
                                <div className="flex items-center gap-2">
                                  {data.year}
                                  {isCurrentYear && (
                                    <span className="px-2 py-0.5 bg-blue-500 text-white text-xs rounded-full">
                                      Now
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="px-6 py-3 text-right text-sm text-gray-300">
                                {showValues ? formatCurrency(data.contributions) : '•••••'}
                              </td>
                              {assetClasses.map(asset => (
                                <td key={asset.id} className="px-6 py-3 text-right text-sm text-gray-300">
                                  {showValues ? formatCurrency(data.assetValues[asset.id] || 0) : '•••••'}
                                </td>
                              ))}
                              <td className="px-6 py-3 text-right text-sm font-semibold text-green-400">
                                {showValues ? formatCurrency(data.portfolioValue) : '•••••'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Monte Carlo Tab */}
            {activeTab === 'monte-carlo' && (
              <motion.div
                key="monte-carlo"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-purple-400" />
                        Monte Carlo Simulation
                      </h3>
                      <p className="text-sm text-gray-400 mt-1">
                        Run {monteCarloRuns.toLocaleString()} simulations with randomized returns
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <select
                        value={monteCarloRuns}
                        onChange={(e) => setMonteCarloRuns(parseInt(e.target.value))}
                        className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm focus:border-blue-500 outline-none"
                      >
                        <option value={100}>100 runs</option>
                        <option value={500}>500 runs</option>
                        <option value={1000}>1,000 runs</option>
                        <option value={5000}>5,000 runs</option>
                        <option value={10000}>10,000 runs</option>
                      </select>
                      <button
                        onClick={runMonteCarlo}
                        disabled={isRunningMonteCarlo}
                        className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:shadow-lg hover:shadow-purple-500/25 transition-all flex items-center gap-2 disabled:opacity-50"
                      >
                        {isRunningMonteCarlo ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          <Play className="w-4 h-4" />
                        )}
                        Run Simulation
                      </button>
                    </div>
                  </div>

                  {monteCarloResults && (
                    <>
                      {/* Results Summary */}
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                        <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
                          <p className="text-gray-400 text-xs uppercase tracking-wider">10th %ile</p>
                          <p className="text-lg font-bold text-red-400 mt-1">
                            {formatCompact(monteCarloResults.percentiles.p10)}
                          </p>
                        </div>
                        <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
                          <p className="text-gray-400 text-xs uppercase tracking-wider">25th %ile</p>
                          <p className="text-lg font-bold text-orange-400 mt-1">
                            {formatCompact(monteCarloResults.percentiles.p25)}
                          </p>
                        </div>
                        <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
                          <p className="text-gray-400 text-xs uppercase tracking-wider">Median</p>
                          <p className="text-lg font-bold text-yellow-400 mt-1">
                            {formatCompact(monteCarloResults.percentiles.p50)}
                          </p>
                        </div>
                        <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
                          <p className="text-gray-400 text-xs uppercase tracking-wider">75th %ile</p>
                          <p className="text-lg font-bold text-green-400 mt-1">
                            {formatCompact(monteCarloResults.percentiles.p75)}
                          </p>
                        </div>
                        <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
                          <p className="text-gray-400 text-xs uppercase tracking-wider">90th %ile</p>
                          <p className="text-lg font-bold text-emerald-400 mt-1">
                            {formatCompact(monteCarloResults.percentiles.p90)}
                          </p>
                        </div>
                      </div>

                      {/* Success Rate */}
                      <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-xl p-4 border border-purple-500/30 mb-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-purple-200 text-sm font-medium">FIRE Success Rate</p>
                            <p className="text-gray-400 text-xs mt-1">
                              Probability of reaching {formatCompact(summaryStats.fireNumber)}
                            </p>
                          </div>
                          <div className="text-3xl font-bold text-white">
                            {monteCarloResults.successRate.toFixed(1)}%
                          </div>
                        </div>
                      </div>

                      {/* Monte Carlo Chart */}
                      <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={monteCarloResults.chartData}>
                            <defs>
                              <linearGradient id="mcGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.3}/>
                                <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0}/>
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                            <XAxis dataKey="year" stroke="#9CA3AF" fontSize={12} />
                            <YAxis
                              stroke="#9CA3AF"
                              fontSize={12}
                              tickFormatter={(value) => formatCompact(value)}
                            />
                            <Tooltip content={<CustomTooltip />} />
                            <Area
                              type="monotone"
                              dataKey="p90"
                              stroke="transparent"
                              fill="#10B981"
                              fillOpacity={0.2}
                              name="90th Percentile"
                            />
                            <Area
                              type="monotone"
                              dataKey="p75"
                              stroke="transparent"
                              fill="#22C55E"
                              fillOpacity={0.3}
                              name="75th Percentile"
                            />
                            <Area
                              type="monotone"
                              dataKey="p50"
                              stroke="#EAB308"
                              fill="#EAB308"
                              fillOpacity={0.4}
                              strokeWidth={2}
                              name="Median"
                            />
                            <Area
                              type="monotone"
                              dataKey="p25"
                              stroke="transparent"
                              fill="#F97316"
                              fillOpacity={0.3}
                              name="25th Percentile"
                            />
                            <Area
                              type="monotone"
                              dataKey="p10"
                              stroke="transparent"
                              fill="#EF4444"
                              fillOpacity={0.2}
                              name="10th Percentile"
                            />
                            <ReferenceLine
                              y={summaryStats.fireNumber}
                              stroke="#F59E0B"
                              strokeDasharray="5 5"
                              label={{ value: 'FIRE', fill: '#F59E0B', fontSize: 12 }}
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </>
                  )}

                  {!monteCarloResults && (
                    <div className="text-center py-12">
                      <Sparkles className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                      <p className="text-gray-400">
                        Run a simulation to see probability ranges for your portfolio
                      </p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* PHASE 7: Withdrawal Tab */}
            {activeTab === 'withdrawal' && (
              <motion.div
                key="withdrawal"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                {/* Strategy Selector */}
                <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <Wallet className="w-5 h-5 text-blue-400" />
                    Withdrawal Strategy
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {['fixed-percentage', 'fixed-dollar', 'dynamic'].map(strategy => (
                      <button
                        key={strategy}
                        onClick={() => setWithdrawalSettings(prev => ({ ...prev, strategy }))}
                        className={`p-4 rounded-xl border-2 transition-all ${
                          withdrawalSettings.strategy === strategy
                            ? 'border-blue-500 bg-blue-500/10'
                            : 'border-gray-700 hover:border-gray-600'
                        }`}
                      >
                        <h4 className="font-semibold text-white capitalize">
                          {strategy.replace('-', ' ')}
                        </h4>
                        <p className="text-sm text-gray-400 mt-1">
                          {strategy === 'fixed-percentage' && '4% rule - withdraw fixed % annually'}
                          {strategy === 'fixed-dollar' && 'Fixed amount adjusted for inflation'}
                          {strategy === 'dynamic' && 'Adjust based on portfolio performance'}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Settings */}
                <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6">
                  <h3 className="text-lg font-semibold text-white mb-4">Retirement Settings</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <label className="text-sm text-gray-400">Start Year</label>
                      <input
                        type="number"
                        value={withdrawalSettings.startYear}
                        onChange={(e) => setWithdrawalSettings(prev => ({ ...prev, startYear: toNum(e.target.value) }))}
                        className="w-full mt-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white"
                      />
                    </div>
                    <div>
                      <label className="text-sm text-gray-400">Duration (years)</label>
                      <input
                        type="number"
                        value={withdrawalSettings.duration}
                        onChange={(e) => setWithdrawalSettings(prev => ({ ...prev, duration: toNum(e.target.value) }))}
                        className="w-full mt-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white"
                      />
                    </div>
                    <div>
                      <label className="text-sm text-gray-400">Annual Withdrawal</label>
                      <input
                        type="number"
                        value={withdrawalSettings.annualWithdrawal}
                        onChange={(e) => setWithdrawalSettings(prev => ({ ...prev, annualWithdrawal: toNum(e.target.value) }))}
                        className="w-full mt-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white"
                      />
                    </div>
                    <div>
                      <label className="text-sm text-gray-400">Social Security</label>
                      <input
                        type="number"
                        value={withdrawalSettings.socialSecurityAmount}
                        onChange={(e) => setWithdrawalSettings(prev => ({ ...prev, socialSecurityAmount: toNum(e.target.value) }))}
                        className="w-full mt-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white"
                      />
                    </div>
                  </div>
                </div>

                {/* Drawdown Chart */}
                <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-white">Portfolio Drawdown</h3>
                    {withdrawalSuccessProbability !== null && (
                      <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                        withdrawalSuccessProbability >= 90 ? 'bg-green-500/20 text-green-400' :
                        withdrawalSuccessProbability >= 70 ? 'bg-yellow-500/20 text-yellow-400' :
                        'bg-red-500/20 text-red-400'
                      }`}>
                        {withdrawalSuccessProbability}% Success Rate
                      </div>
                    )}
                  </div>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={withdrawalData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis dataKey="year" stroke="#9CA3AF" fontSize={12} />
                        <YAxis
                          stroke="#9CA3AF"
                          fontSize={12}
                          tickFormatter={(value) => formatCompact(value)}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend />
                        <Area
                          type="monotone"
                          dataKey="portfolioValue"
                          stroke="#3B82F6"
                          fill="#3B82F6"
                          fillOpacity={0.2}
                          name="Portfolio Value"
                        />
                        <Bar
                          dataKey="withdrawal"
                          fill="#EF4444"
                          name="Annual Withdrawal"
                        />
                        <Line
                          type="monotone"
                          dataKey="socialSecurity"
                          stroke="#10B981"
                          strokeWidth={2}
                          name="Social Security"
                        />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </motion.div>
            )}

            {/* PHASE 8: Insights Tab */}
            {activeTab === 'insights' && (
              <motion.div
                key="insights"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-2xl border border-purple-500/30 p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <Lightbulb className="w-6 h-6 text-purple-400" />
                    <h3 className="text-lg font-semibold text-white">AI-Powered Insights</h3>
                  </div>
                  <p className="text-gray-300 text-sm mb-6">
                    Personalized recommendations based on your portfolio, goals, and financial trajectory.
                  </p>

                  {aiInsights.length === 0 ? (
                    <div className="text-center py-8">
                      <Info className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                      <p className="text-gray-400">No insights available yet. Complete your inputs to get personalized recommendations.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {aiInsights.map((insight) => (
                        <div
                          key={insight.id}
                          className={`p-4 rounded-xl border ${
                            insight.type === 'success' ? 'bg-green-500/10 border-green-500/30' :
                            insight.type === 'warning' ? 'bg-yellow-500/10 border-yellow-500/30' :
                            'bg-blue-500/10 border-blue-500/30'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div className={`p-2 rounded-lg ${
                              insight.type === 'success' ? 'bg-green-500/20' :
                              insight.type === 'warning' ? 'bg-yellow-500/20' :
                              'bg-blue-500/20'
                            }`}>
                              {insight.icon === 'target' && <Target className="w-5 h-5" />}
                              {insight.icon === 'alert' && <AlertCircle className="w-5 h-5" />}
                              {insight.icon === 'lightbulb' && <Lightbulb className="w-5 h-5" />}
                              {insight.icon === 'trending-down' && <TrendingDown className="w-5 h-5" />}
                              {insight.icon === 'trending-up' && <TrendingUp className="w-5 h-5" />}
                              {insight.icon === 'shield' && <Shield className="w-5 h-5" />}
                              {insight.icon === 'flame' && <Flame className="w-5 h-5" />}
                            </div>
                            <div className="flex-1">
                              <h4 className="font-semibold text-white mb-1">{insight.title}</h4>
                              <p className="text-sm text-gray-300 mb-2">{insight.message}</p>
                              <button className="text-sm font-medium text-blue-400 hover:text-blue-300 flex items-center gap-1">
                                {insight.action}
                                <ArrowRight className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Portfolio Health Score */}
                <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6">
                  <h3 className="text-lg font-semibold text-white mb-4">Portfolio Health Score</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-gray-800/50 rounded-xl">
                      <div className="text-4xl font-bold text-green-400 mb-2">
                        {Math.min(100, Math.round((100 - Math.abs(totalAllocation - 100)) * 0.85))}
                      </div>
                      <p className="text-sm text-gray-400">Diversification</p>
                    </div>
                    <div className="text-center p-4 bg-gray-800/50 rounded-xl">
                      <div className="text-4xl font-bold text-yellow-400 mb-2">
                        {Math.round(Math.min(100, (portfolioMetrics.expectedReturn / 10) * 85))}
                      </div>
                      <p className="text-sm text-gray-400">Risk-Adjusted Returns</p>
                    </div>
                    <div className="text-center p-4 bg-gray-800/50 rounded-xl">
                      <div className="text-4xl font-bold text-blue-400 mb-2">
                        {summaryStats.fireAge ? Math.min(100, Math.round((1 - (summaryStats.yearsToFire / 30)) * 100)) : 50}
                      </div>
                      <p className="text-sm text-gray-400">Goal Progress</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer Actions */}
        <div className="max-w-7xl mx-auto px-6 py-6 border-t border-gray-800">
          <div className="flex justify-center gap-4">
            <button className="px-6 py-3 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors flex items-center gap-2">
              <Copy className="w-5 h-5" />
              Duplicate Plan
            </button>
            <button
              onClick={() => setActiveTab('monte-carlo')}
              className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:shadow-lg hover:shadow-purple-500/25 transition-all flex items-center gap-2"
            >
              <Sparkles className="w-5 h-5" />
              Run Monte Carlo
            </button>
          </div>
        </div>
      </div>
    </Protect>
  );
};

export default FinancialPlanning;
