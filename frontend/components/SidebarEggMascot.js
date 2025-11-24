import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePortfolioSummary } from '@/store/hooks/usePortfolioSummary';
import { useUser } from '@clerk/nextjs';
import { fetchWithAuth } from '@/utils/api';
import { TrendingUp, TrendingDown, DollarSign, X, ChevronRight } from 'lucide-react';
import Link from 'next/link';

// =============================================================================
// CONSTANTS
// =============================================================================

const EVOLUTION_MILESTONES = {
  baby: { maxNetWorth: 10000, maxTenure: 30, emoji: '👶', label: 'Baby' },
  child: { maxNetWorth: 50000, maxTenure: 90, emoji: '🧒', label: 'Child' },
  teen: { maxNetWorth: 150000, maxTenure: 180, emoji: '😎', label: 'Teen' },
  adult: { maxNetWorth: 500000, maxTenure: 365, emoji: '👔', label: 'Adult' },
  wise: { maxNetWorth: Infinity, maxTenure: Infinity, emoji: '🎩', label: 'Wise' }
};

const EVOLUTION_STAGES = ['baby', 'child', 'teen', 'adult', 'wise'];

// =============================================================================
// SIDEBAR EGG MASCOT
// =============================================================================

const SidebarEggMascot = ({ isCollapsed }) => {
  const { summary, loading: portfolioLoading } = usePortfolioSummary();
  const { user } = useUser();

  const [userTenureDays, setUserTenureDays] = useState(0);
  const [evolutionStage, setEvolutionStage] = useState('baby');
  const [mood, setMood] = useState('happy');
  const [showQuickStats, setShowQuickStats] = useState(false);
  const [showEvolutionCelebration, setShowEvolutionCelebration] = useState(false);
  const [hovering, setHovering] = useState(false);

  // ---------------------------------------------------------------------------
  // Get User Tenure
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const fetchUserTenure = async () => {
      try {
        const res = await fetchWithAuth("/user/profile");
        if (res.ok) {
          const data = await res.json();
          const created = new Date(data.created_at || user?.createdAt || Date.now());
          const days = Math.max(1, Math.ceil((Date.now() - created.getTime()) / 86400000));
          setUserTenureDays(days);
        } else if (user?.createdAt) {
          const created = new Date(user.createdAt);
          const days = Math.max(1, Math.ceil((Date.now() - created.getTime()) / 86400000));
          setUserTenureDays(days);
        }
      } catch (err) {
        console.error('[SidebarEggMascot] Error fetching user tenure:', err);
        if (user?.createdAt) {
          const created = new Date(user.createdAt);
          const days = Math.max(1, Math.ceil((Date.now() - created.getTime()) / 86400000));
          setUserTenureDays(days);
        }
      }
    };

    fetchUserTenure();
  }, [user]);

  // ---------------------------------------------------------------------------
  // Evolution Logic
  // ---------------------------------------------------------------------------
  const calculateEvolutionStage = useCallback((netWorth, tenureDays) => {
    for (let i = EVOLUTION_STAGES.length - 1; i >= 0; i--) {
      const stage = EVOLUTION_STAGES[i];
      const milestone = EVOLUTION_MILESTONES[stage];
      const netWorthQualified = netWorth >= milestone.maxNetWorth;
      const tenureBonus = tenureDays >= milestone.maxTenure && netWorth >= (milestone.maxNetWorth * 0.5);
      if (netWorthQualified || tenureBonus) return stage;
    }
    return 'baby';
  }, []);

  // ---------------------------------------------------------------------------
  // Mood Logic
  // ---------------------------------------------------------------------------
  const calculateMood = useCallback((summary) => {
    if (!summary) return 'happy';
    const dayChange = summary.periodChanges?.['1d']?.netWorthPercent || 0;
    const weekChange = summary.periodChanges?.['1w']?.netWorthPercent || 0;

    if (dayChange > 2 || weekChange > 5) return 'excited';
    if (dayChange < -2 || weekChange < -5) return 'worried';
    if (Math.abs(dayChange) < 0.1 && Math.abs(weekChange) < 0.5) return 'sleepy';
    if (dayChange >= 0) return 'happy';
    if (dayChange < 0 && dayChange > -2) return 'concerned';
    return 'happy';
  }, []);

  // ---------------------------------------------------------------------------
  // Update when data changes
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!summary || portfolioLoading) return;

    const netWorth = summary.netWorth || 0;
    const newStage = calculateEvolutionStage(netWorth, userTenureDays);
    const newMood = calculateMood(summary);

    if (newStage !== evolutionStage) {
      const currentIndex = EVOLUTION_STAGES.indexOf(evolutionStage);
      const newIndex = EVOLUTION_STAGES.indexOf(newStage);

      if (newIndex > currentIndex) {
        setEvolutionStage(newStage);
        setShowEvolutionCelebration(true);

        try {
          localStorage.setItem('nestegg_mascot_stage', newStage);
          localStorage.setItem('nestegg_mascot_stage_date', new Date().toISOString());
        } catch (e) {
          console.error('[SidebarEggMascot] localStorage error:', e);
        }

        setTimeout(() => setShowEvolutionCelebration(false), 3000);
      } else {
        setEvolutionStage(newStage);
      }
    }

    setMood(newMood);
  }, [summary, userTenureDays, portfolioLoading, calculateEvolutionStage, calculateMood, evolutionStage]);

  // ---------------------------------------------------------------------------
  // Mood colors and messages
  // ---------------------------------------------------------------------------
  const getMoodGlow = useMemo(() => {
    switch(mood) {
      case 'excited': return 'shadow-lg shadow-green-500/60';
      case 'happy': return 'shadow-lg shadow-blue-500/50';
      case 'worried': return 'shadow-lg shadow-red-500/60';
      case 'concerned': return 'shadow-lg shadow-yellow-500/50';
      case 'sleepy': return 'shadow-lg shadow-gray-500/30';
      case 'curious': return 'shadow-lg shadow-purple-500/50';
      default: return 'shadow-lg shadow-blue-500/40';
    }
  }, [mood]);

  const getMoodColor = useMemo(() => {
    switch(mood) {
      case 'excited': return '#10b981';
      case 'happy': return '#3b82f6';
      case 'worried': return '#ef4444';
      case 'concerned': return '#f59e0b';
      case 'sleepy': return '#6b7280';
      case 'curious': return '#a855f7';
      default: return '#3b82f6';
    }
  }, [mood]);

  const getMoodEmoji = useMemo(() => {
    switch(mood) {
      case 'excited': return '🔥';
      case 'happy': return '😊';
      case 'worried': return '😰';
      case 'concerned': return '😕';
      case 'sleepy': return '😴';
      case 'curious': return '🤔';
      default: return '😊';
    }
  }, [mood]);

  // ---------------------------------------------------------------------------
  // Quick Stats Formatting
  // ---------------------------------------------------------------------------
  const formatCurrency = (value) => {
    if (value === null || value === undefined) return '$0';
    const absValue = Math.abs(value);
    if (absValue >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
    if (absValue >= 1_000) return `$${(value / 1_000).toFixed(1)}k`;
    return `$${value.toFixed(0)}`;
  };

  const formatPercent = (value) => {
    if (value === null || value === undefined || isNaN(value)) return '0%';
    const sign = value > 0 ? '+' : '';
    return `${sign}${value.toFixed(2)}%`;
  };

  const dayChange = summary?.periodChanges?.['1d']?.netWorth || 0;
  const dayChangePct = summary?.periodChanges?.['1d']?.netWorthPercent || 0;
  const weekChangePct = summary?.periodChanges?.['1w']?.netWorthPercent || 0;

  // ---------------------------------------------------------------------------
  // Evolution Progress
  // ---------------------------------------------------------------------------
  const evolutionProgress = useMemo(() => {
    const currentIndex = EVOLUTION_STAGES.indexOf(evolutionStage);
    if (currentIndex >= EVOLUTION_STAGES.length - 1) return 100;

    const nextStage = EVOLUTION_STAGES[currentIndex + 1];
    const nextMilestone = EVOLUTION_MILESTONES[nextStage];
    const currentNetWorth = summary?.netWorth || 0;
    const currentStageMilestone = EVOLUTION_MILESTONES[evolutionStage];
    const range = nextMilestone.maxNetWorth - currentStageMilestone.maxNetWorth;
    const progress = ((currentNetWorth - currentStageMilestone.maxNetWorth) / range) * 100;

    return Math.min(Math.max(progress, 0), 100);
  }, [evolutionStage, summary]);

  const nextStageName = useMemo(() => {
    const currentIndex = EVOLUTION_STAGES.indexOf(evolutionStage);
    if (currentIndex >= EVOLUTION_STAGES.length - 1) return 'Max Level';
    return EVOLUTION_MILESTONES[EVOLUTION_STAGES[currentIndex + 1]].label;
  }, [evolutionStage]);

  // ---------------------------------------------------------------------------
  // Click handler
  // ---------------------------------------------------------------------------
  const handleClick = useCallback(() => {
    if (isCollapsed) {
      setShowQuickStats(true);
    } else {
      setShowQuickStats(!showQuickStats);
    }
  }, [isCollapsed, showQuickStats]);

  // ---------------------------------------------------------------------------
  // RENDER: Collapsed State (Small Egg Icon)
  // ---------------------------------------------------------------------------
  if (isCollapsed) {
    return (
      <>
        <motion.div
          className="relative p-2 flex justify-center items-center cursor-pointer group"
          onClick={handleClick}
          onMouseEnter={() => setHovering(true)}
          onMouseLeave={() => setHovering(false)}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          {/* Small Egg Icon with Glow */}
          <motion.div
            className={`relative ${getMoodGlow}`}
            animate={{
              scale: [1, 1.08, 1],
              opacity: [0.95, 1, 0.95]
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          >
            {/* Egg SVG */}
            <svg width="32" height="40" viewBox="0 0 120 150" fill="none" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <radialGradient id="smallBodyGradient" cx="50%" cy="40%" r="60%">
                  <stop offset="0%" stopColor="#FFFFFF" />
                  <stop offset="70%" stopColor="#F8F8F8" />
                  <stop offset="100%" stopColor="#E8E8E8" />
                </radialGradient>
                <filter id="smallGlow">
                  <feGaussianBlur stdDeviation="2"/>
                  <feComponentTransfer>
                    <feFuncA type="discrete" tableValues="0 .8"/>
                  </feComponentTransfer>
                </filter>
              </defs>

              {/* Body */}
              <ellipse cx="60" cy="80" rx="45" ry="55" fill="url(#smallBodyGradient)" stroke="#4A5568" strokeWidth="3" filter="url(#smallGlow)" />

              {/* Simple face */}
              <circle cx="45" cy="70" r="4" fill="#1A202C" />
              <circle cx="75" cy="70" r="4" fill="#1A202C" />
              <path d="M50 85 Q60 90 70 85" stroke="#1A202C" strokeWidth="2" fill="none" strokeLinecap="round" />
            </svg>

            {/* Evolution Stage Badge */}
            <motion.div
              className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-xs shadow-lg"
              animate={{ rotate: [0, 5, -5, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              {EVOLUTION_MILESTONES[evolutionStage].emoji}
            </motion.div>

            {/* Mood indicator (glow ring) */}
            <motion.div
              className="absolute inset-0 rounded-full"
              style={{
                background: `radial-gradient(circle, ${getMoodColor}20 0%, transparent 70%)`
              }}
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.5, 0.8, 0.5]
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />
          </motion.div>

          {/* Tooltip on Hover */}
          {hovering && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="absolute left-20 ml-2 px-4 py-3 bg-gray-800 rounded-lg shadow-xl border border-gray-700 whitespace-nowrap z-50 min-w-[200px]"
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">{EVOLUTION_MILESTONES[evolutionStage].emoji}</span>
                <div>
                  <p className="text-sm font-semibold text-white">{EVOLUTION_MILESTONES[evolutionStage].label} Egg</p>
                  <p className="text-xs text-gray-400">Mood: {getMoodEmoji} {mood}</p>
                </div>
              </div>
              <div className="border-t border-gray-700 pt-2 space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-400">Net Worth</span>
                  <span className="text-white font-medium">{formatCurrency(summary?.netWorth || 0)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-400">Today</span>
                  <span className={`font-medium ${dayChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {formatPercent(dayChangePct)}
                  </span>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2 italic">Click for details</p>
            </motion.div>
          )}
        </motion.div>

        {/* Quick Stats Popover (when clicked in collapsed mode) */}
        <AnimatePresence>
          {showQuickStats && (
            <>
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[60]"
                onClick={() => setShowQuickStats(false)}
              />

              {/* Popover */}
              <motion.div
                initial={{ opacity: 0, x: -20, scale: 0.9 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: -20, scale: 0.9 }}
                className="fixed left-24 bottom-20 w-80 bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl shadow-2xl border border-gray-700 z-[70] overflow-hidden"
              >
                <QuickStatsContent
                  summary={summary}
                  evolutionStage={evolutionStage}
                  evolutionProgress={evolutionProgress}
                  nextStageName={nextStageName}
                  mood={mood}
                  getMoodEmoji={getMoodEmoji}
                  formatCurrency={formatCurrency}
                  formatPercent={formatPercent}
                  onClose={() => setShowQuickStats(false)}
                />
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </>
    );
  }

  // ---------------------------------------------------------------------------
  // RENDER: Expanded State (Full Mascot)
  // ---------------------------------------------------------------------------
  return (
    <div className="relative p-3 border-t border-gray-800/50">
      {/* Evolution Celebration */}
      <AnimatePresence>
        {showEvolutionCelebration && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute -top-16 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-yellow-400 via-orange-500 to-pink-500 text-white px-4 py-2 rounded-lg text-xs font-bold whitespace-nowrap shadow-xl z-50"
          >
            🎉 EVOLVED TO {EVOLUTION_MILESTONES[evolutionStage].label.toUpperCase()}! 🎉
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mascot Container */}
      <motion.div
        className={`relative bg-gray-800/30 rounded-lg p-3 cursor-pointer border border-gray-700/50 hover:border-gray-600/50 transition-colors ${getMoodGlow}`}
        onClick={handleClick}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        animate={{
          borderColor: [getMoodColor + '30', getMoodColor + '50', getMoodColor + '30'],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-lg">{EVOLUTION_MILESTONES[evolutionStage].emoji}</span>
            <div>
              <p className="text-xs font-semibold text-white">{EVOLUTION_MILESTONES[evolutionStage].label} Egg</p>
              <p className="text-[10px] text-gray-400">Mood: {getMoodEmoji} {mood}</p>
            </div>
          </div>
          <motion.div
            className="text-xs text-gray-400"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            Click me
          </motion.div>
        </div>

        {/* Mini Stats */}
        <div className="space-y-1 text-xs">
          <div className="flex justify-between">
            <span className="text-gray-400">Net Worth</span>
            <span className="text-white font-medium">{formatCurrency(summary?.netWorth || 0)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Today</span>
            <span className={`font-medium flex items-center gap-1 ${dayChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {dayChange >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {formatPercent(dayChangePct)}
            </span>
          </div>
        </div>

        {/* Progress to Next Evolution */}
        {evolutionStage !== 'wise' && (
          <div className="mt-2 pt-2 border-t border-gray-700/50">
            <div className="flex justify-between text-[10px] text-gray-400 mb-1">
              <span>Progress to {nextStageName}</span>
              <span>{evolutionProgress.toFixed(0)}%</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-1.5">
              <motion.div
                className="bg-gradient-to-r from-blue-500 to-purple-500 h-1.5 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${evolutionProgress}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </div>
        )}

        {/* Breathing animation overlay */}
        <motion.div
          className="absolute inset-0 rounded-lg pointer-events-none"
          style={{
            background: `radial-gradient(circle at center, ${getMoodColor}15 0%, transparent 70%)`
          }}
          animate={{
            opacity: [0.3, 0.6, 0.3],
            scale: [0.98, 1.02, 0.98]
          }}
          transition={{
            duration: 2.5,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      </motion.div>

      {/* Quick Stats Drawer */}
      <AnimatePresence>
        {showQuickStats && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/20 z-[60]"
              onClick={() => setShowQuickStats(false)}
            />

            {/* Drawer */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="fixed left-64 bottom-4 w-96 bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl shadow-2xl border border-gray-700 z-[70] overflow-hidden"
            >
              <QuickStatsContent
                summary={summary}
                evolutionStage={evolutionStage}
                evolutionProgress={evolutionProgress}
                nextStageName={nextStageName}
                mood={mood}
                getMoodEmoji={getMoodEmoji}
                formatCurrency={formatCurrency}
                formatPercent={formatPercent}
                onClose={() => setShowQuickStats(false)}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

// =============================================================================
// QUICK STATS CONTENT COMPONENT
// =============================================================================

const QuickStatsContent = ({
  summary,
  evolutionStage,
  evolutionProgress,
  nextStageName,
  mood,
  getMoodEmoji,
  formatCurrency,
  formatPercent,
  onClose
}) => {
  const dayChange = summary?.periodChanges?.['1d']?.netWorth || 0;
  const dayChangePct = summary?.periodChanges?.['1d']?.netWorthPercent || 0;
  const weekChangePct = summary?.periodChanges?.['1w']?.netWorthPercent || 0;
  const monthChangePct = summary?.periodChanges?.['1m']?.netWorthPercent || 0;

  return (
    <div className="p-5">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="text-3xl">{EVOLUTION_MILESTONES[evolutionStage].emoji}</span>
          <div>
            <h3 className="text-lg font-bold text-white">{EVOLUTION_MILESTONES[evolutionStage].label} Egg</h3>
            <p className="text-sm text-gray-400">Mood: {getMoodEmoji} {mood.charAt(0).toUpperCase() + mood.slice(1)}</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Net Worth */}
      <div className="bg-gray-700/30 rounded-lg p-4 mb-4">
        <div className="flex items-center gap-2 mb-1">
          <DollarSign className="w-4 h-4 text-green-400" />
          <span className="text-xs text-gray-400">Net Worth</span>
        </div>
        <p className="text-2xl font-bold text-white">{formatCurrency(summary?.netWorth || 0)}</p>
        <div className={`flex items-center gap-1 mt-1 text-sm ${dayChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
          {dayChange >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
          <span>{formatCurrency(dayChange)} ({formatPercent(dayChangePct)}) today</span>
        </div>
      </div>

      {/* Performance Grid */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="bg-gray-700/30 rounded-lg p-3">
          <p className="text-[10px] text-gray-400 mb-1">1 Day</p>
          <p className={`text-sm font-semibold ${dayChangePct >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {formatPercent(dayChangePct)}
          </p>
        </div>
        <div className="bg-gray-700/30 rounded-lg p-3">
          <p className="text-[10px] text-gray-400 mb-1">1 Week</p>
          <p className={`text-sm font-semibold ${weekChangePct >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {formatPercent(weekChangePct)}
          </p>
        </div>
        <div className="bg-gray-700/30 rounded-lg p-3">
          <p className="text-[10px] text-gray-400 mb-1">1 Month</p>
          <p className={`text-sm font-semibold ${monthChangePct >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {formatPercent(monthChangePct)}
          </p>
        </div>
      </div>

      {/* Evolution Progress */}
      {evolutionStage !== 'wise' && (
        <div className="bg-gray-700/30 rounded-lg p-4 mb-4">
          <div className="flex justify-between text-xs text-gray-400 mb-2">
            <span>Evolution Progress</span>
            <span>{evolutionProgress.toFixed(1)}% to {nextStageName}</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2.5 mb-2">
            <motion.div
              className="bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 h-2.5 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${evolutionProgress}%` }}
              transition={{ duration: 0.8 }}
            />
          </div>
          <p className="text-[10px] text-gray-500 italic">
            {evolutionProgress < 50
              ? "Keep growing your wealth!"
              : evolutionProgress < 90
              ? "Almost there! Keep it up!"
              : "So close to evolution!"}
          </p>
        </div>
      )}

      {evolutionStage === 'wise' && (
        <div className="bg-gradient-to-r from-yellow-500/20 to-purple-500/20 rounded-lg p-4 mb-4 border border-yellow-500/30">
          <p className="text-sm text-center text-yellow-200 font-semibold">
            🎩 Maximum Evolution Achieved! 🎩
          </p>
          <p className="text-xs text-center text-gray-400 mt-1">
            You've reached financial mastery
          </p>
        </div>
      )}

      {/* Action Button */}
      <Link href="/portfolio">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white py-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
          onClick={onClose}
        >
          View Full Dashboard
          <ChevronRight className="w-4 h-4" />
        </motion.button>
      </Link>
    </div>
  );
};

export default SidebarEggMascot;
