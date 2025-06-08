import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useAnimation } from 'framer-motion';

const EggMascot = ({ isDoingCartwheel = false }) => {
  const [mood, setMood] = useState('happy'); // happy, excited, sleeping, winking, surprised
  const [isHovered, setIsHovered] = useState(false);
  const [clickCount, setClickCount] = useState(0);
  const [message, setMessage] = useState('');
  const [isAnimating, setIsAnimating] = useState(false);
  const [timeOfDay, setTimeOfDay] = useState('day');
  const [idleAnimation, setIdleAnimation] = useState('bounce');
  const [showHearts, setShowHearts] = useState(false);
  const [particles, setParticles] = useState([]);
  const controls = useAnimation();
  const audioRef = useRef(null);

  // Motivational messages based on time and interaction
  const messages = {
    morning: ["Rise and shine! 🌅", "Good morning, investor! 📈", "Let's grow that portfolio! 🚀"],
    afternoon: ["Keep it up! 💪", "You're doing great! ⭐", "Smart moves today! 🧠"],
    evening: ["Great work today! 🌙", "Rest well, plan tomorrow! 💤", "Portfolio looking good! ✨"],
    click: ["Woo! 🎉", "That tickles! 😄", "High five! ✋", "You found me! 🥚", "Nest-tastic! 🪺"],
    hover: ["Hey there! 👋", "Need a tip? 💡", "I believe in you! 💖"],
    achievement: ["Portfolio milestone! 🏆", "New high score! 📊", "You're crushing it! 💎"]
  };

  // Check time of day
  useEffect(() => {
    const checkTime = () => {
      const hour = new Date().getHours();
      if (hour >= 5 && hour < 12) setTimeOfDay('morning');
      else if (hour >= 12 && hour < 18) setTimeOfDay('afternoon');
      else setTimeOfDay('evening');
    };
    
    checkTime();
    const interval = setInterval(checkTime, 60000); // Check every minute
    return () => clearInterval(interval);
  }, []);

  // Idle animations cycle
  useEffect(() => {
    const animations = ['bounce', 'sway', 'breathe', 'lookAround'];
    let index = 0;
    
    const cycleAnimations = () => {
      setIdleAnimation(animations[index]);
      index = (index + 1) % animations.length;
    };
    
    const interval = setInterval(cycleAnimations, 8000);
    return () => clearInterval(interval);
  }, []);

  // Handle cartwheel animation
  useEffect(() => {
    if (isDoingCartwheel) {
      setIsAnimating(true);
      setMood('excited');
      setMessage("Wheee! 🤸");
      createParticles('star');
      
      const timer = setTimeout(() => {
        setIsAnimating(false);
        setMood('happy');
        setMessage("That was fun! 🎊");
        setTimeout(() => setMessage(''), 2000);
      }, 1500);
      
      return () => clearTimeout(timer);
    }
  }, [isDoingCartwheel]);

  // Create particle effects
  const createParticles = (type) => {
    const newParticles = Array.from({ length: 12 }, (_, i) => ({
      id: Date.now() + i,
      type,
      x: Math.random() * 60 - 30,
      y: Math.random() * 60 - 30,
    }));
    setParticles(newParticles);
    setTimeout(() => setParticles([]), 2000);
  };

  // Handle click interactions
  const handleClick = () => {
    setClickCount(prev => prev + 1);
    const clickMessages = messages.click;
    setMessage(clickMessages[clickCount % clickMessages.length]);
    
    // Special interactions based on click count
    if (clickCount % 5 === 4) {
      setMood('winking');
      createParticles('heart');
      setShowHearts(true);
      setTimeout(() => setShowHearts(false), 2000);
    } else if (clickCount % 10 === 9) {
      // Do a special spin
      controls.start({
        rotate: 360,
        scale: [1, 1.2, 1],
        transition: { duration: 0.6, ease: "easeInOut" }
      });
      setMood('excited');
      createParticles('star');
    } else {
      // Regular bounce
      controls.start({
        y: [-5, -20, 0],
        transition: { duration: 0.3, ease: "easeOut" }
      });
      setMood('happy');
    }
    
    // Play a subtle sound effect (optional - add actual sound file)
    // if (audioRef.current) audioRef.current.play();
    
    setTimeout(() => {
      setMessage('');
      setMood('happy');
    }, 2000);
  };

  // Mouse hover effects
  const handleMouseEnter = () => {
    setIsHovered(true);
    setMood('excited');
    const hoverMessages = messages.hover;
    setMessage(hoverMessages[Math.floor(Math.random() * hoverMessages.length)]);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setMood('happy');
    setTimeout(() => setMessage(''), 1000);
  };

  // Get appropriate greeting based on time
  useEffect(() => {
    const greetings = messages[timeOfDay];
    if (greetings && Math.random() < 0.1) { // 10% chance to show greeting
      setMessage(greetings[Math.floor(Math.random() * greetings.length)]);
      setTimeout(() => setMessage(''), 3000);
    }
  }, [timeOfDay]);

  // Idle animation variants
  const idleVariants = {
    bounce: {
      y: [0, -5, 0],
      transition: { duration: 2, repeat: Infinity, ease: "easeInOut" }
    },
    sway: {
      rotate: [-3, 3, -3],
      transition: { duration: 3, repeat: Infinity, ease: "easeInOut" }
    },
    breathe: {
      scale: [1, 1.05, 1],
      transition: { duration: 3, repeat: Infinity, ease: "easeInOut" }
    },
    lookAround: {
      x: [-5, 5, -5],
      transition: { duration: 4, repeat: Infinity, ease: "easeInOut" }
    }
  };

  // Eye expressions based on mood
  const getEyeExpression = () => {
    switch (mood) {
      case 'sleeping':
        return { leftEye: 'M19 40 L25 40', rightEye: 'M35 40 L41 40' };
      case 'winking':
        return { leftEye: 'M19 40 L25 40', rightEye: 'M38 40 A3 3 0 1 1 38.001 40' };
      case 'surprised':
        return { leftEye: 'M22 40 A4 4 0 1 1 22.001 40', rightEye: 'M38 40 A4 4 0 1 1 38.001 40' };
      case 'excited':
        return { leftEye: 'M19 38 Q22 35 25 38', rightEye: 'M35 38 Q38 35 41 38' };
      default:
        return { leftEye: 'M22 40 A3 3 0 1 1 22.001 40', rightEye: 'M38 40 A3 3 0 1 1 38.001 40' };
    }
  };

  const eyeExpression = getEyeExpression();

  return (
    <motion.div 
      className="fixed bottom-8 right-8 z-50"
      initial={{ scale: 0, rotate: -180 }}
      animate={{ scale: 1, rotate: 0 }}
      transition={{ type: "spring", stiffness: 260, damping: 20 }}
    >
      {/* Message bubble */}
      <AnimatePresence>
        {message && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.8 }}
            className="absolute -top-16 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white px-4 py-2 rounded-full text-sm whitespace-nowrap shadow-lg"
            style={{ pointerEvents: 'none' }}
          >
            {message}
            <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-gray-800 border-l-transparent border-r-transparent" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Particle effects */}
      <AnimatePresence>
        {particles.map((particle) => (
          <motion.div
            key={particle.id}
            initial={{ opacity: 1, scale: 0, x: 0, y: 0 }}
            animate={{ 
              opacity: 0, 
              scale: [0, 1.5, 0],
              x: particle.x,
              y: particle.y - 40
            }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.5, ease: "easeOut" }}
            className="absolute top-1/2 left-1/2 pointer-events-none"
            style={{ transform: 'translate(-50%, -50%)' }}
          >
            {particle.type === 'star' ? '⭐' : '❤️'}
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Main egg container */}
      <motion.div
        className={`relative cursor-pointer select-none ${isAnimating ? 'pointer-events-none' : ''}`}
        animate={controls}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <motion.div
          animate={isAnimating ? {
            rotate: 360,
            x: [0, 100, 100, 0],
            y: [0, -50, 50, 0],
          } : idleVariants[idleAnimation]}
          transition={isAnimating ? { duration: 1.5, ease: "easeInOut" } : undefined}
        >
          <svg width="80" height="100" viewBox="0 0 80 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Shadow */}
            <ellipse 
              cx="40" 
              cy="92" 
              rx="20" 
              ry="5" 
              fill="rgba(0,0,0,0.2)"
              className={isAnimating ? 'opacity-0' : 'opacity-100'}
            />
            
            {/* Egg body with gradient */}
            <defs>
              <linearGradient id="eggGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#FFFFFF" />
                <stop offset="100%" stopColor="#F0F0F0" />
              </linearGradient>
              <filter id="glow">
                <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                <feMerge>
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
            </defs>
            
            <motion.ellipse 
              cx="40" 
              cy="50" 
              rx="30" 
              ry="38" 
              fill="url(#eggGradient)" 
              stroke="#4A5568" 
              strokeWidth="2.5"
              filter={isHovered ? "url(#glow)" : ""}
              animate={{ 
                fill: showHearts ? "#FFE0E0" : "url(#eggGradient)"
              }}
            />
            
            {/* Blush circles when happy or excited */}
            {(mood === 'happy' || mood === 'excited' || showHearts) && (
              <>
                <circle cx="25" cy="50" r="4" fill="#FFB6C1" opacity="0.5" />
                <circle cx="55" cy="50" r="4" fill="#FFB6C1" opacity="0.5" />
              </>
            )}
            
            {/* Eyes */}
            {mood === 'sleeping' || mood === 'winking' ? (
              <>
                <path d={eyeExpression.leftEye} stroke="#333333" strokeWidth="2.5" strokeLinecap="round" />
                <path d={eyeExpression.rightEye} stroke="#333333" strokeWidth="2.5" strokeLinecap="round" />
              </>
            ) : (
              <>
                <motion.circle 
                  cx="30" 
                  cy="45" 
                  r={mood === 'surprised' ? "5" : "3.5"} 
                  fill="#333333"
                  animate={{ scale: mood === 'excited' ? [1, 1.2, 1] : 1 }}
                  transition={{ duration: 0.3, repeat: mood === 'excited' ? Infinity : 0 }}
                />
                <motion.circle 
                  cx="50" 
                  cy="45" 
                  r={mood === 'surprised' ? "5" : "3.5"} 
                  fill="#333333"
                  animate={{ scale: mood === 'excited' ? [1, 1.2, 1] : 1 }}
                  transition={{ duration: 0.3, repeat: mood === 'excited' ? Infinity : 0 }}
                />
                {/* Eye sparkles */}
                <circle cx="32" cy="43" r="1" fill="#FFFFFF" />
                <circle cx="52" cy="43" r="1" fill="#FFFFFF" />
              </>
            )}
            
            {/* Eyebrows for expression */}
            {mood === 'surprised' && (
              <>
                <path d="M25 38 Q30 35 35 38" stroke="#333333" strokeWidth="2" fill="none" />
                <path d="M45 38 Q50 35 55 38" stroke="#333333" strokeWidth="2" fill="none" />
              </>
            )}
            
            {/* Mouth */}
            <motion.path 
              d={mood === 'surprised' ? "M35 60 Q40 65 45 60" : "M30 58 Q40 68 50 58"}
              stroke="#333333" 
              strokeWidth="2.5" 
              fill="none"
              strokeLinecap="round"
              animate={{ 
                d: mood === 'excited' ? "M30 56 Q40 70 50 56" : 
                   mood === 'surprised' ? "M35 60 Q40 65 45 60" :
                   "M30 58 Q40 68 50 58"
              }}
            />
            
            {/* Arms with better animation */}
            <motion.path 
              d="M15 50 Q10 45 13 40" 
              stroke="#333333" 
              strokeWidth="2.5" 
              fill="none"
              strokeLinecap="round"
              animate={{ 
                d: isHovered ? "M15 50 Q8 35 15 30" : "M15 50 Q10 45 13 40",
                rotate: isAnimating ? [0, 45, -45, 0] : 0
              }}
              transition={{ duration: 0.3 }}
            />
            <motion.path 
              d="M65 50 Q70 45 67 40" 
              stroke="#333333" 
              strokeWidth="2.5" 
              fill="none"
              strokeLinecap="round"
              animate={{ 
                d: isHovered ? "M65 50 Q72 35 65 30" : "M65 50 Q70 45 67 40",
                rotate: isAnimating ? [0, -45, 45, 0] : 0
              }}
              transition={{ duration: 0.3 }}
            />
            
            {/* Legs */}
            <motion.path 
              d="M30 83 Q28 78 32 73" 
              stroke="#333333" 
              strokeWidth="2.5" 
              fill="none"
              strokeLinecap="round"
              animate={{ rotate: isAnimating ? [0, 20, -20, 0] : 0 }}
            />
            <motion.path 
              d="M50 83 Q52 78 48 73" 
              stroke="#333333" 
              strokeWidth="2.5" 
              fill="none"
              strokeLinecap="round"
              animate={{ rotate: isAnimating ? [0, -20, 20, 0] : 0 }}
            />
            
            {/* Accessories based on time of day */}
            {timeOfDay === 'evening' && (
              <g className="animate-pulse">
                <circle cx="20" cy="25" r="1" fill="#FFD700" />
                <circle cx="60" cy="30" r="1" fill="#FFD700" />
                <circle cx="40" cy="20" r="1.5" fill="#FFD700" />
              </g>
            )}
          </svg>
        </motion.div>

        {/* Hearts floating animation */}
        {showHearts && (
          <div className="absolute inset-0 pointer-events-none">
            {[...Array(5)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute text-2xl"
                initial={{ opacity: 0, y: 0, x: 20 + i * 10 }}
                animate={{ 
                  opacity: [0, 1, 0], 
                  y: -60, 
                  x: 20 + i * 10 + (Math.random() * 20 - 10) 
                }}
                transition={{ duration: 2, delay: i * 0.1 }}
              >
                ❤️
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Hidden audio element for sound effects */}
      <audio ref={audioRef} src="/sounds/pop.mp3" />
      
      {/* Tooltip on first visit */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2 }}
        className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 text-xs text-gray-500 whitespace-nowrap"
      >
        Click me! 👆
      </motion.div>
    </motion.div>
  );
};

export default EggMascot;