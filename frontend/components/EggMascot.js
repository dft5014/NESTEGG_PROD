import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence, useAnimation } from 'framer-motion';
import { usePortfolioSummary } from '@/store/hooks/usePortfolioSummary';
import { useUser } from '@clerk/nextjs';
import { fetchWithAuth } from '@/utils/api';

// =============================================================================
// CONSTANTS & CONFIGURATION
// =============================================================================

// Evolution thresholds - net worth based with tenure as secondary factor
const EVOLUTION_MILESTONES = {
  baby: { maxNetWorth: 10000, maxTenure: 30 },
  child: { maxNetWorth: 50000, maxTenure: 90 },
  teen: { maxNetWorth: 150000, maxTenure: 180 },
  adult: { maxNetWorth: 500000, maxTenure: 365 },
  wise: { maxNetWorth: Infinity, maxTenure: Infinity }
};

const EVOLUTION_STAGES = ['baby', 'child', 'teen', 'adult', 'wise'];

// Animation timings
const ANIMATION_CONFIG = {
  blinkInterval: 2000,
  blinkChance: 0.9,
  blinkDuration: 150,
  idleAnimationInterval: 12000,
  messageDisplayDuration: 3000,
  cartwheelDuration: 1500,
};

// =============================================================================
// COMPONENT
// =============================================================================

const EggMascot = ({
  isDoingCartwheel = false,
  variant = "floating" // "floating" (default bottom-right) or "navbar"
}) => {
  // ---------------------------------------------------------------------------
  // Data Hooks
  // ---------------------------------------------------------------------------
  const { summary, loading: portfolioLoading } = usePortfolioSummary();
  const { user } = useUser();

  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------
  const [userTenureDays, setUserTenureDays] = useState(0);
  const [evolutionStage, setEvolutionStage] = useState('baby');
  const [previousStage, setPreviousStage] = useState('baby');
  const [mood, setMood] = useState('happy');
  const [isBlinking, setIsBlinking] = useState(false);
  const [isTalking, setIsTalking] = useState(false);
  const [message, setMessage] = useState('');
  const [isAnimating, setIsAnimating] = useState(false);
  const [showEvolutionCelebration, setShowEvolutionCelebration] = useState(false);
  const [lastKnownNetWorth, setLastKnownNetWorth] = useState(0);

  const controls = useAnimation();
  const messageTimeoutRef = useRef(null);
  const moodTimeoutRef = useRef(null);

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
        console.error('[EggMascot] Error fetching user tenure:', err);
        // Fallback to Clerk data
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
  // Evolution Logic - Smart milestone-based system
  // ---------------------------------------------------------------------------
  const calculateEvolutionStage = useCallback((netWorth, tenureDays) => {
    // Primary driver: Net worth milestones
    // Secondary factor: Tenure (bonus progression)

    for (let i = EVOLUTION_STAGES.length - 1; i >= 0; i--) {
      const stage = EVOLUTION_STAGES[i];
      const milestone = EVOLUTION_MILESTONES[stage];

      // You reach a stage if EITHER:
      // 1. Your net worth exceeds the threshold, OR
      // 2. Your tenure exceeds the threshold AND you're at least 50% of the way to net worth goal
      const netWorthQualified = netWorth >= milestone.maxNetWorth;
      const tenureBonus = tenureDays >= milestone.maxTenure && netWorth >= (milestone.maxNetWorth * 0.5);

      if (netWorthQualified || tenureBonus) {
        return stage;
      }
    }

    return 'baby';
  }, []);

  // ---------------------------------------------------------------------------
  // Mood Logic - Based on portfolio performance
  // ---------------------------------------------------------------------------
  const calculateMood = useCallback((summary) => {
    if (!summary) return 'happy';

    // Check 1-day performance first (most immediate)
    const dayChange = summary.periodChanges?.['1d']?.netWorthPercent || 0;
    const weekChange = summary.periodChanges?.['1w']?.netWorthPercent || 0;

    // Excited: Big gains (>2% daily or >5% weekly)
    if (dayChange > 2 || weekChange > 5) return 'excited';

    // Worried: Significant losses (<-2% daily or <-5% weekly)
    if (dayChange < -2 || weekChange < -5) return 'worried';

    // Sleepy: No change (flat performance)
    if (Math.abs(dayChange) < 0.1 && Math.abs(weekChange) < 0.5) return 'sleepy';

    // Happy: Default positive state
    if (dayChange >= 0) return 'happy';

    // Concerned: Minor losses
    if (dayChange < 0 && dayChange > -2) return 'concerned';

    return 'happy';
  }, []);

  // ---------------------------------------------------------------------------
  // Update evolution stage and mood when data changes
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!summary || portfolioLoading) return;

    const netWorth = summary.netWorth || 0;
    const newStage = calculateEvolutionStage(netWorth, userTenureDays);
    const newMood = calculateMood(summary);

    // Check for evolution (level up!)
    if (newStage !== evolutionStage) {
      const currentIndex = EVOLUTION_STAGES.indexOf(evolutionStage);
      const newIndex = EVOLUTION_STAGES.indexOf(newStage);

      // Only celebrate if moving forward
      if (newIndex > currentIndex) {
        setPreviousStage(evolutionStage);
        setEvolutionStage(newStage);
        setShowEvolutionCelebration(true);

        // Store in localStorage to avoid re-celebrating
        try {
          localStorage.setItem('nestegg_mascot_stage', newStage);
          localStorage.setItem('nestegg_mascot_stage_date', new Date().toISOString());
        } catch (e) {
          console.error('[EggMascot] localStorage error:', e);
        }

        // Hide celebration after 3 seconds
        setTimeout(() => setShowEvolutionCelebration(false), 3000);
      } else {
        // Just update stage without celebration (in case of data corrections)
        setEvolutionStage(newStage);
      }
    }

    // Update mood if it changed
    if (newMood !== mood && !isTalking && !isAnimating) {
      setMood(newMood);
    }

    // Track net worth for performance monitoring
    setLastKnownNetWorth(netWorth);
  }, [summary, userTenureDays, portfolioLoading, calculateEvolutionStage, calculateMood]);

  // ---------------------------------------------------------------------------
  // Character traits by evolution stage
  // ---------------------------------------------------------------------------
  const stageTraits = useMemo(() => ({
    baby: {
      size: variant === "navbar" ? 0.7 : 0.8,
      eyeSize: 12,
      pupilSize: 8,
      headRatio: 0.6,
      bounceHeight: 15,
      messages: {
        happy: ["Goo goo! 👶", "Me help! 🥚", "Yay money! 💰", "Up up! 📈"],
        excited: ["WOW! 🎉", "Big money! 💵", "Happy egg! 😄", "Yippee! 🎊"],
        worried: ["Oh no! 😟", "Me scared! 😰", "Help help! 🆘", "Down down! 📉"],
        concerned: ["Uh oh! 😕", "Be careful! ⚠️", "Me worry! 😟"],
        sleepy: ["Zzz... 😴", "Sleepy egg... 🌙", "Naptime? 🛏️"],
        curious: ["What's that? 🤔", "Me wonder! 💭", "Interesting! 👀"],
      },
      eyeSparkles: 2,
      cheekSize: 6,
      armLength: 'short'
    },
    child: {
      size: variant === "navbar" ? 0.8 : 0.9,
      eyeSize: 11,
      pupilSize: 7,
      headRatio: 0.55,
      bounceHeight: 12,
      messages: {
        happy: ["We're growing! 🌱", "Save more! 🐷", "Good job! ⭐", "I'm learning! 📚"],
        excited: ["Amazing gains! 🚀", "To the moon! 🌙", "We're crushing it! 💪", "Let's go! 🎯"],
        worried: ["That's not good... 📉", "We'll bounce back! 💪", "Stay strong! 🛡️"],
        concerned: ["Hmm, be careful! ⚠️", "Watch out! 👀", "Let's be cautious! 🤔"],
        sleepy: ["Quiet day... 😴", "Not much happening... 💤", "Resting up! 🌙"],
        curious: ["What's happening? 🤔", "Tell me more! 📖", "Interesting move! 👀"],
      },
      eyeSparkles: 2,
      cheekSize: 5,
      armLength: 'medium'
    },
    teen: {
      size: variant === "navbar" ? 0.85 : 1,
      eyeSize: 10,
      pupilSize: 6,
      headRatio: 0.5,
      bounceHeight: 10,
      messages: {
        happy: ["Looking good! 😎", "Compound interest! 📊", "Let's invest! 💎", "Portfolio goals! 🎯"],
        excited: ["HUGE gains! 🔥", "This is epic! 🚀", "We're killing it! 💰", "Absolutely crushing! 💪"],
        worried: ["Market downturn 📉", "Stay calm, hodl! 🧘", "Volatility happens! 📊"],
        concerned: ["Minor setback... 😐", "We've seen worse! 💪", "Staying vigilant! 👁️"],
        sleepy: ["Consolidating... 😴", "Sideways trading... 📊", "Patience mode! ⏳"],
        curious: ["Analyzing trends... 📈", "What's the play? 🤔", "Studying the market! 📚"],
      },
      eyeSparkles: 1,
      cheekSize: 4,
      armLength: 'medium'
    },
    adult: {
      size: variant === "navbar" ? 0.9 : 1.1,
      eyeSize: 9,
      pupilSize: 5,
      headRatio: 0.45,
      bounceHeight: 8,
      messages: {
        happy: ["Excellent strategy! 💼", "Diversify wisely! 🌍", "Strong returns! 💪", "Keep it up! 🚀"],
        excited: ["Outstanding performance! 📈", "Exceptional growth! 🎯", "Remarkable gains! 💎", "Portfolio excellence! ⭐"],
        worried: ["Significant decline 📉", "Risk management time! 🛡️", "Reassess strategy! 📊"],
        concerned: ["Monitor closely! 👁️", "Maintain discipline! 📋", "Stay the course! 🧭"],
        sleepy: ["Market equilibrium... ⚖️", "Steady state... 📊", "Patience pays! ⏳"],
        curious: ["Evaluating opportunities... 🔍", "Market analysis! 📊", "Strategic thinking! 🧠"],
      },
      eyeSparkles: 1,
      cheekSize: 3,
      armLength: 'long'
    },
    wise: {
      size: variant === "navbar" ? 0.95 : 1.15,
      eyeSize: 9,
      pupilSize: 5,
      headRatio: 0.45,
      bounceHeight: 6,
      messages: {
        happy: ["Wealth wisdom! 🎩", "Legacy building! 🏛️", "Master investor! 👑", "Sage advice! 🦉"],
        excited: ["Magnificent portfolio! 🌟", "Generational wealth! 👨‍👩‍👧‍👦", "Empire building! 🏰", "Financial mastery! 🎓"],
        worried: ["Temporary turbulence 🌊", "Long-term perspective! 🔭", "Wisdom prevails! 🦉"],
        concerned: ["Prudent observation! 👁️", "Calculated patience! ⚖️", "Strategic waiting! ♟️"],
        sleepy: ["Market meditation... 🧘", "Contemplative state... 💭", "Zen investing! ☯️"],
        curious: ["Fascinating dynamics... 🤔", "Historical perspective! 📜", "Deep analysis! 🧠"],
      },
      eyeSparkles: 0,
      cheekSize: 2,
      armLength: 'long'
    }
  }), [variant]);

  const currentTraits = stageTraits[evolutionStage] || stageTraits.baby;

  // ---------------------------------------------------------------------------
  // Realistic blinking
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const blinkInterval = setInterval(() => {
      if (Math.random() > ANIMATION_CONFIG.blinkChance) {
        setIsBlinking(true);
        setTimeout(() => setIsBlinking(false), ANIMATION_CONFIG.blinkDuration);
      }
    }, ANIMATION_CONFIG.blinkInterval);
    return () => clearInterval(blinkInterval);
  }, []);

  // ---------------------------------------------------------------------------
  // Random idle animations
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (isAnimating || isTalking) return;

    const performIdleAnimation = async () => {
      const animations = ['lookAround', 'stretch', 'yawn', 'dance'];
      const randomAnim = animations[Math.floor(Math.random() * animations.length)];

      try {
        switch(randomAnim) {
          case 'lookAround':
            await controls.start({
              rotateY: [0, 20, -20, 0],
              transition: { duration: 2 }
            });
            break;
          case 'stretch':
            await controls.start({
              scaleY: [1, 1.1, 1],
              scaleX: [1, 0.95, 1],
              transition: { duration: 1.5 }
            });
            break;
          case 'yawn':
            setMood('yawning');
            setTimeout(() => setMood(calculateMood(summary)), 2000);
            break;
          case 'dance':
            await controls.start({
              rotate: [-5, 5, -5, 5, 0],
              y: [0, -10, 0, -10, 0],
              transition: { duration: 1 }
            });
            break;
        }
      } catch (err) {
        // Animation interrupted, that's ok
      }
    };

    const interval = setInterval(performIdleAnimation, ANIMATION_CONFIG.idleAnimationInterval);
    return () => clearInterval(interval);
  }, [controls, isAnimating, isTalking, summary, calculateMood]);

  // ---------------------------------------------------------------------------
  // Handle cartwheel
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (isDoingCartwheel && !isAnimating) {
      handleCartwheel();
    }
  }, [isDoingCartwheel]);

  const handleCartwheel = async () => {
    setIsAnimating(true);
    const prevMood = mood;
    setMood('excited');

    try {
      await controls.start({
        rotate: [0, 360, 720],
        x: [0, 150, 0],
        y: [0, -100, 0],
        transition: { duration: ANIMATION_CONFIG.cartwheelDuration / 1000, ease: "easeInOut" }
      });
    } catch (err) {
      // Animation interrupted
    }

    setIsAnimating(false);
    setMood('dizzy');

    if (moodTimeoutRef.current) clearTimeout(moodTimeoutRef.current);
    moodTimeoutRef.current = setTimeout(() => {
      setMood(prevMood);
    }, 2000);
  };

  // ---------------------------------------------------------------------------
  // Handle click/interaction
  // ---------------------------------------------------------------------------
  const handleClick = useCallback(() => {
    const messages = currentTraits.messages[mood] || currentTraits.messages.happy;
    const randomMessage = messages[Math.floor(Math.random() * messages.length)];
    setMessage(randomMessage);
    setIsTalking(true);

    // Bounce animation
    controls.start({
      y: [0, -currentTraits.bounceHeight, 0],
      scale: [1, 1.05, 1],
      transition: { duration: 0.5, type: "spring" }
    });

    // Clear existing timeout
    if (messageTimeoutRef.current) {
      clearTimeout(messageTimeoutRef.current);
    }

    messageTimeoutRef.current = setTimeout(() => {
      setMessage('');
      setIsTalking(false);
    }, ANIMATION_CONFIG.messageDisplayDuration);
  }, [currentTraits, mood, controls]);

  // Handle keyboard interaction
  const handleKeyPress = useCallback((e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  }, [handleClick]);

  const handleMouseEnter = () => {
    setMood('curious');
    controls.start({ scale: 1.05 });
  };

  const handleMouseLeave = () => {
    setMood(calculateMood(summary));
    controls.start({ scale: 1 });
  };

  // ---------------------------------------------------------------------------
  // Cleanup
  // ---------------------------------------------------------------------------
  useEffect(() => {
    return () => {
      if (messageTimeoutRef.current) clearTimeout(messageTimeoutRef.current);
      if (moodTimeoutRef.current) clearTimeout(moodTimeoutRef.current);
    };
  }, []);

  // ---------------------------------------------------------------------------
  // Get eye path based on mood and blinking
  // ---------------------------------------------------------------------------
  const getEyePath = (isLeft) => {
    if (isBlinking) return `M${isLeft ? 20 : 60} 50 Q${isLeft ? 30 : 70} 50 ${isLeft ? 40 : 80} 50`;

    switch(mood) {
      case 'happy':
        return null; // Use regular circles
      case 'excited':
        return `M${isLeft ? 20 : 60} 45 Q${isLeft ? 30 : 70} 40 ${isLeft ? 40 : 80} 45`;
      case 'yawning':
        return `M${isLeft ? 25 : 65} 55 Q${isLeft ? 30 : 70} 60 ${isLeft ? 35 : 75} 55`;
      case 'dizzy':
        return `M${isLeft ? 25 : 65} 45 L${isLeft ? 35 : 75} 55 M${isLeft ? 35 : 75} 45 L${isLeft ? 25 : 65} 55`;
      case 'curious':
        return null; // Use larger circles
      case 'worried':
        return null; // Use regular circles with different eyebrows
      case 'concerned':
        return null; // Use regular circles
      case 'sleepy':
        return `M${isLeft ? 25 : 65} 50 Q${isLeft ? 30 : 70} 52 ${isLeft ? 35 : 75} 50`;
      default:
        return null;
    }
  };

  // Safe values for animations to prevent undefined errors
  const safeLeftEyeX = 40;
  const safeLeftEyeY = 50;
  const safeRightEyeX = 80;
  const safeRightEyeY = 50;

  // ---------------------------------------------------------------------------
  // Progress to next evolution
  // ---------------------------------------------------------------------------
  const evolutionProgress = useMemo(() => {
    const currentIndex = EVOLUTION_STAGES.indexOf(evolutionStage);
    if (currentIndex >= EVOLUTION_STAGES.length - 1) return 100; // Max level

    const nextStage = EVOLUTION_STAGES[currentIndex + 1];
    const nextMilestone = EVOLUTION_MILESTONES[nextStage];
    const currentNetWorth = summary?.netWorth || 0;

    // Calculate progress based on net worth
    const currentStageMilestone = EVOLUTION_MILESTONES[evolutionStage];
    const range = nextMilestone.maxNetWorth - currentStageMilestone.maxNetWorth;
    const progress = ((currentNetWorth - currentStageMilestone.maxNetWorth) / range) * 100;

    return Math.min(Math.max(progress, 0), 100);
  }, [evolutionStage, summary]);

  // ---------------------------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------------------------
  return (
    <motion.div
      className={`z-50 ${variant === "floating"
        ? "fixed bottom-8 right-8"
        : "relative w-12 h-12 flex items-center justify-center"}`}
      initial={{ scale: 0, rotate: -360 }}
      animate={{ scale: currentTraits.size, rotate: 0 }}
      transition={{ type: "spring", stiffness: 100, damping: 15, duration: 1 }}
      role="button"
      tabIndex={0}
      aria-label={`${evolutionStage} egg mascot. Click for message. Current mood: ${mood}`}
      onKeyDown={handleKeyPress}
    >
      {/* Evolution celebration */}
      <AnimatePresence>
        {showEvolutionCelebration && (
          <motion.div
            className="absolute -top-24 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-yellow-400 via-orange-500 to-pink-500 text-white px-6 py-3 rounded-2xl text-lg font-bold whitespace-nowrap shadow-2xl z-50"
            initial={{ opacity: 0, y: 20, scale: 0.5 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.5 }}
          >
            <motion.div
              animate={{
                rotate: [0, -5, 5, -5, 5, 0],
                scale: [1, 1.1, 1, 1.1, 1]
              }}
              transition={{ duration: 0.5, repeat: 3 }}
            >
              🎉 EVOLVED TO {evolutionStage.toUpperCase()}! 🎉
            </motion.div>
            <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-4 h-4 bg-pink-500 rotate-45" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Message bubble */}
      <AnimatePresence>
        {message && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.8 }}
            className="absolute -top-20 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-2 rounded-2xl text-sm whitespace-nowrap shadow-xl"
          >
            <motion.div
              animate={{ y: [0, -2, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              {message}
            </motion.div>
            <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-4 h-4 bg-gradient-to-br from-blue-600 to-purple-600 rotate-45" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main character */}
      <motion.div
        className="relative cursor-pointer select-none"
        animate={controls}
        whileHover={{ scale: currentTraits.size * 1.05 }}
        whileTap={{ scale: currentTraits.size * 0.95 }}
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <motion.div
          animate={{
            y: [0, -currentTraits.bounceHeight/3, 0],
            rotate: [-1, 1, -1]
          }}
          transition={{
            duration: 3 + (evolutionStage === 'wise' ? 1 : 0),
            repeat: Infinity,
            ease: "easeInOut"
          }}
        >
          <svg
            width="120"
            height="150"
            viewBox="0 0 120 150"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={variant === "navbar" ? "w-full h-full" : ""}
            preserveAspectRatio="xMidYMid meet"
          >
            <defs>
              {/* Gradients for 3D effect */}
              <radialGradient id="bodyGradient" cx="50%" cy="40%" r="60%">
                <stop offset="0%" stopColor="#FFFFFF" />
                <stop offset="70%" stopColor="#F8F8F8" />
                <stop offset="100%" stopColor="#E8E8E8" />
              </radialGradient>

              <radialGradient id="shadowGradient">
                <stop offset="0%" stopColor="#000000" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#000000" stopOpacity="0" />
              </radialGradient>

              <filter id="softGlow">
                <feGaussianBlur stdDeviation="3"/>
                <feComponentTransfer>
                  <feFuncA type="discrete" tableValues="0 .8"/>
                </feComponentTransfer>
              </filter>
            </defs>

            {/* Shadow */}
            <motion.ellipse
              cx="60"
              cy="140"
              rx="35"
              ry="8"
              fill="url(#shadowGradient)"
              animate={{
                scaleX: isAnimating ? 0 : 1,
                opacity: isAnimating ? 0 : 0.3
              }}
            />

            {/* Arms - behind body */}
            <g className="arms">
              {/* Left arm */}
              <motion.path
                d={currentTraits.armLength === 'short' ? "M35 75 Q25 70 20 65" :
                   currentTraits.armLength === 'medium' ? "M35 75 Q20 70 15 60" :
                   "M35 75 Q15 70 10 55"}
                stroke="#4A5568"
                strokeWidth="8"
                strokeLinecap="round"
                fill="none"
                animate={{
                  d: isTalking ?
                    (currentTraits.armLength === 'short' ? "M35 75 Q25 65 20 60" : "M35 75 Q20 60 15 50") :
                    (currentTraits.armLength === 'short' ? "M35 75 Q25 70 20 65" :
                     currentTraits.armLength === 'medium' ? "M35 75 Q20 70 15 60" : "M35 75 Q15 70 10 55")
                }}
              />

              {/* Right arm */}
              <motion.path
                d={currentTraits.armLength === 'short' ? "M85 75 Q95 70 100 65" :
                   currentTraits.armLength === 'medium' ? "M85 75 Q100 70 105 60" :
                   "M85 75 Q105 70 110 55"}
                stroke="#4A5568"
                strokeWidth="8"
                strokeLinecap="round"
                fill="none"
                animate={{
                  d: isTalking ?
                    (currentTraits.armLength === 'short' ? "M85 75 Q95 65 100 60" : "M85 75 Q100 60 105 50") :
                    (currentTraits.armLength === 'short' ? "M85 75 Q95 70 100 65" :
                     currentTraits.armLength === 'medium' ? "M85 75 Q100 70 105 60" : "M85 75 Q105 70 110 55")
                }}
              />
            </g>

            {/* Body */}
            <motion.ellipse
              cx="60"
              cy="80"
              rx="45"
              ry="55"
              fill="url(#bodyGradient)"
              stroke="#4A5568"
              strokeWidth="3"
              filter="url(#softGlow)"
              animate={{
                scaleY: mood === 'yawning' ? 1.05 : 1
              }}
            />

            {/* Face region */}
            <g transform={`translate(0, ${-55 * currentTraits.headRatio})`}>
              {/* Eyes */}
              <g className="eyes">
                {/* Left eye */}
                {getEyePath(true) ? (
                  <path d={getEyePath(true)} stroke="#1A202C" strokeWidth="3" fill="none" />
                ) : (
                  <g>
                    <circle
                      cx={safeLeftEyeX}
                      cy={safeLeftEyeY}
                      r={Number(mood === 'curious' ? (currentTraits.eyeSize * 1.2) : currentTraits.eyeSize) || 10}
                      fill="white"
                      stroke="#1A202C"
                      strokeWidth="2"
                    />
                    <motion.g
                      initial={{ x: 0, y: 0 }}
                      animate={{
                        x: mood === 'curious' ? [0, 2, 0] : 0,
                        y: mood === 'curious' ? [0, -2, 0] : 0,
                      }}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      <circle
                        cx={safeLeftEyeX}
                        cy={safeLeftEyeY}
                        r={Number(currentTraits.pupilSize) || 6}
                        fill="#1A202C"
                      />
                    </motion.g>

                    {/* Eye sparkles */}
                    {currentTraits.eyeSparkles > 0 && [...Array(currentTraits.eyeSparkles)].map((_, i) => (
                      <circle
                        key={`left-sparkle-${i}`}
                        cx={safeLeftEyeX + 2 + i * 2}
                        cy={safeLeftEyeY - 2 - i}
                        r="2"
                        fill="white"
                        opacity="0.8"
                      />
                    ))}
                  </g>
                )}

                {/* Right eye */}
                {getEyePath(false) ? (
                  <path d={getEyePath(false)} stroke="#1A202C" strokeWidth="3" fill="none" />
                ) : (
                  <g>
                    <circle
                      cx={safeRightEyeX}
                      cy={safeRightEyeY}
                      r={Number(mood === 'curious' ? (currentTraits.eyeSize * 1.2) : currentTraits.eyeSize) || 10}
                      fill="white"
                      stroke="#1A202C"
                      strokeWidth="2"
                    />
                    <motion.g
                      initial={{ x: 0, y: 0 }}
                      animate={{
                        x: mood === 'curious' ? [0, -2, 0] : 0,
                        y: mood === 'curious' ? [0, -2, 0] : 0,
                      }}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      <circle
                        cx={safeRightEyeX}
                        cy={safeRightEyeY}
                        r={Number(currentTraits.pupilSize) || 6}
                        fill="#1A202C"
                      />
                    </motion.g>

                    {/* Eye sparkles */}
                    {currentTraits.eyeSparkles > 0 && [...Array(currentTraits.eyeSparkles)].map((_, i) => (
                      <circle
                        key={`right-sparkle-${i}`}
                        cx={safeRightEyeX + 2 + i * 2}
                        cy={safeRightEyeY - 2 - i}
                        r="2"
                        fill="white"
                        opacity="0.8"
                      />
                    ))}
                  </g>
                )}

                {/* Eyebrows */}
                {evolutionStage !== 'baby' && (
                  <>
                    <motion.path
                      d="M30 40 Q40 35 50 40"
                      stroke="#1A202C"
                      strokeWidth="2.5"
                      fill="none"
                      strokeLinecap="round"
                      animate={{
                        d: mood === 'curious' ? "M30 35 Q40 30 50 35" :
                           mood === 'excited' ? "M30 35 Q40 32 50 35" :
                           mood === 'worried' ? "M30 42 Q40 38 50 42" :
                           mood === 'concerned' ? "M30 41 Q40 37 50 41" :
                           "M30 40 Q40 35 50 40"
                      }}
                    />
                    <motion.path
                      d="M70 40 Q80 35 90 40"
                      stroke="#1A202C"
                      strokeWidth="2.5"
                      fill="none"
                      strokeLinecap="round"
                      animate={{
                        d: mood === 'curious' ? "M70 35 Q80 30 90 35" :
                           mood === 'excited' ? "M70 35 Q80 32 90 35" :
                           mood === 'worried' ? "M70 42 Q80 38 90 42" :
                           mood === 'concerned' ? "M70 41 Q80 37 90 41" :
                           "M70 40 Q80 35 90 40"
                      }}
                    />
                  </>
                )}
              </g>

              {/* Nose (for older stages) */}
              {(evolutionStage === 'adult' || evolutionStage === 'wise') && (
                <ellipse cx="60" cy="65" rx="4" ry="3" fill="#E8D8D8" />
              )}

              {/* Mouth */}
              <motion.path
                d={mood === 'yawning' ? "M50 75 Q60 85 70 75" :
                   mood === 'worried' ? "M45 80 Q60 75 75 80" :
                   mood === 'concerned' ? "M45 78 Q60 76 75 78" :
                   isTalking ? "M45 75 Q60 85 75 75" :
                   "M45 75 Q60 80 75 75"}
                stroke="#1A202C"
                strokeWidth="3"
                fill={mood === 'yawning' ? "#FF6B6B" : "none"}
                strokeLinecap="round"
                animate={{
                  d: isTalking ?
                    ["M45 75 Q60 85 75 75", "M45 75 Q60 80 75 75", "M45 75 Q60 85 75 75"] :
                    mood === 'yawning' ? "M50 75 Q60 85 70 75" :
                    mood === 'worried' ? "M45 80 Q60 75 75 80" :
                    mood === 'concerned' ? "M45 78 Q60 76 75 78" :
                    "M45 75 Q60 80 75 75"
                }}
                transition={{ duration: 0.3, repeat: isTalking ? Infinity : 0 }}
              />

              {/* Cheeks */}
              <circle
                cx="25"
                cy="65"
                r={Number(currentTraits.cheekSize) || 4}
                fill="#FFB6C1"
                opacity="0.6"
              />
              <circle
                cx="95"
                cy="65"
                r={Number(currentTraits.cheekSize) || 4}
                fill="#FFB6C1"
                opacity="0.6"
              />
            </g>

            {/* Accessories based on evolution */}
            <g className="accessories">
              {/* Cap for child */}
              {evolutionStage === 'child' && (
                <g>
                  <path d="M30 30 Q60 20 90 30 L85 40 L35 40 Z" fill="#FF6B6B" stroke="#C92A2A" strokeWidth="2" />
                  <ellipse cx="60" cy="35" rx="30" ry="3" fill="#C92A2A" />
                </g>
              )}

              {/* Glasses for teen */}
              {evolutionStage === 'teen' && (
                <g>
                  <circle cx="40" cy="50" r="18" fill="none" stroke="#4A5568" strokeWidth="3" opacity="0.8" />
                  <circle cx="80" cy="50" r="18" fill="none" stroke="#4A5568" strokeWidth="3" opacity="0.8" />
                  <path d="M58 50 L62 50" stroke="#4A5568" strokeWidth="3" />
                  {/* Temples */}
                  <path d="M22 50 L15 52" stroke="#4A5568" strokeWidth="2" />
                  <path d="M98 50 L105 52" stroke="#4A5568" strokeWidth="2" />
                </g>
              )}

              {/* Tie and Watch for adult */}
              {evolutionStage === 'adult' && (
                <g>
                  {/* Tie */}
                  <path d="M60 100 L55 110 L60 125 L65 110 Z" fill="#4C6EF5" stroke="#364FC7" strokeWidth="2" />
                  {/* Knot */}
                  <ellipse cx="60" cy="100" rx="6" ry="4" fill="#364FC7" />

                  {/* Watch on left wrist */}
                  <g transform="translate(18, 62)">
                    <rect x="-4" y="-3" width="8" height="6" rx="1" fill="#D4AF37" stroke="#B8860B" strokeWidth="1" />
                    <circle cx="0" cy="0" r="2" fill="#1A202C" opacity="0.3" />
                  </g>
                </g>
              )}

              {/* Top hat, monocle, and mustache for wise */}
              {evolutionStage === 'wise' && (
                <g>
                  {/* Top hat */}
                  <rect x="40" y="10" width="40" height="25" rx="2" fill="#1A202C" stroke="#000" strokeWidth="2" />
                  <ellipse cx="60" cy="35" rx="25" ry="3" fill="#1A202C" />
                  <ellipse cx="60" cy="10" rx="20" ry="3" fill="#2D3748" />
                  {/* Hat band */}
                  <rect x="40" y="30" width="40" height="4" fill="#D4AF37" />

                  {/* Monocle */}
                  <circle cx="80" cy="50" r="20" fill="none" stroke="#D4AF37" strokeWidth="3" />
                  <circle cx="80" cy="50" r="18" fill="white" opacity="0.2" />
                  <path d="M100 50 Q105 55 105 60" stroke="#D4AF37" strokeWidth="2" fill="none" />

                  {/* Mustache */}
                  <path d="M45 72 Q60 70 60 70 Q60 70 75 72" stroke="#4A5568" strokeWidth="4" fill="none" strokeLinecap="round" />
                  <path d="M45 72 Q40 74 38 73" stroke="#4A5568" strokeWidth="3" fill="none" strokeLinecap="round" />
                  <path d="M75 72 Q80 74 82 73" stroke="#4A5568" strokeWidth="3" fill="none" strokeLinecap="round" />
                </g>
              )}
            </g>

            {/* Legs */}
            <g className="legs">
              <motion.ellipse
                cx="45"
                cy="125"
                rx="8"
                ry="15"
                fill="#4A5568"
                animate={{
                  rotate: isAnimating ? [0, -20, 20, 0] : 0,
                  y: isTalking ? [0, -3, 0] : 0
                }}
                transition={{ duration: 0.5, repeat: isTalking ? Infinity : 0 }}
              />
              <motion.ellipse
                cx="75"
                cy="125"
                rx="8"
                ry="15"
                fill="#4A5568"
                animate={{
                  rotate: isAnimating ? [0, 20, -20, 0] : 0,
                  y: isTalking ? [0, -3, 0] : [0, -3, 0]
                }}
                transition={{
                  duration: 0.5,
                  repeat: isTalking ? Infinity : 0,
                  delay: isTalking ? 0.25 : 0
                }}
              />
            </g>
          </svg>
        </motion.div>

        {/* Wise stage sparkles */}
        <AnimatePresence>
          {evolutionStage === 'wise' && (
            <motion.div className="absolute inset-0 pointer-events-none">
              {[...Array(3)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute"
                  initial={{ opacity: 0 }}
                  animate={{
                    opacity: [0, 1, 0],
                    y: [-20, -40],
                    x: [0, (i - 1) * 20]
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    delay: i * 1,
                    ease: "easeOut"
                  }}
                  style={{
                    left: '50%',
                    bottom: '100%',
                    transform: 'translateX(-50%)'
                  }}
                >
                  ✨
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Evolution indicator - only show in floating mode */}
      {variant === "floating" && (
        <motion.div
          className="absolute -bottom-12 left-1/2 transform -translate-x-1/2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
        >
          <div className="flex items-center space-x-1">
            {EVOLUTION_STAGES.map((stage, index) => (
              <div
                key={stage}
                className={`h-2 w-2 rounded-full transition-all ${
                  index <= EVOLUTION_STAGES.indexOf(evolutionStage)
                    ? 'bg-gradient-to-r from-blue-500 to-purple-500'
                    : 'bg-gray-600'
                }`}
                title={`${stage} stage`}
              />
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-1 text-center capitalize">
            {evolutionStage} Egg
          </p>
          {/* Progress to next level */}
          {EVOLUTION_STAGES.indexOf(evolutionStage) < EVOLUTION_STAGES.length - 1 && (
            <div className="mt-1 w-full bg-gray-700 rounded-full h-1">
              <motion.div
                className="bg-gradient-to-r from-blue-500 to-purple-500 h-1 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${evolutionProgress}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          )}
        </motion.div>
      )}
    </motion.div>
  );
};

export default EggMascot;
