import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useAnimation } from 'framer-motion';

const EggMascot = ({ 
  portfolioValue = 0, 
  userTenureDays = 0,
  isDoingCartwheel = false 
}) => {
  // Evolution stages based on portfolio value and tenure
  const getEvolutionStage = () => {
    const value = portfolioValue;
    const days = userTenureDays;
    
    if (value < 10000 && days < 30) return 'baby';
    if (value < 50000 && days < 90) return 'child';
    if (value < 100000 && days < 180) return 'teen';
    if (value < 500000 && days < 365) return 'adult';
    return 'wise';
  };

  const [evolutionStage, setEvolutionStage] = useState(getEvolutionStage());
  const [mood, setMood] = useState('happy');
  const [isBlinking, setIsBlinking] = useState(false);
  const [isTalking, setIsTalking] = useState(false);
  const [message, setMessage] = useState('');
  const [isAnimating, setIsAnimating] = useState(false);
  const [accessories, setAccessories] = useState([]);
  const controls = useAnimation();

  // Update evolution stage when props change
  useEffect(() => {
    setEvolutionStage(getEvolutionStage());
  }, [portfolioValue, userTenureDays]);

  // Character traits by evolution stage
  const stageTraits = {
    baby: {
      size: 0.8,
      eyeSize: 12,
      pupilSize: 8,
      headRatio: 0.6,
      voicePitch: 1.5,
      bounceHeight: 15,
      accessories: [],
      messages: ["Goo goo! 👶", "Me help! 🥚", "Yay money! 💰", "Up up! 📈"],
      eyeSparkles: 2,
      cheekSize: 6,
      armLength: 'short'
    },
    child: {
      size: 0.9,
      eyeSize: 11,
      pupilSize: 7,
      headRatio: 0.55,
      voicePitch: 1.3,
      bounceHeight: 12,
      accessories: ['cap'],
      messages: ["We're growing! 🌱", "Save more! 🐷", "Good job! ⭐", "I'm learning! 📚"],
      eyeSparkles: 2,
      cheekSize: 5,
      armLength: 'medium'
    },
    teen: {
      size: 1,
      eyeSize: 10,
      pupilSize: 6,
      headRatio: 0.5,
      voicePitch: 1.1,
      bounceHeight: 10,
      accessories: ['glasses', 'headphones'],
      messages: ["Looking good! 😎", "Compound interest! 📊", "Let's invest! 💎", "Portfolio goals! 🎯"],
      eyeSparkles: 1,
      cheekSize: 4,
      armLength: 'medium'
    },
    adult: {
      size: 1.1,
      eyeSize: 9,
      pupilSize: 5,
      headRatio: 0.45,
      voicePitch: 1,
      bounceHeight: 8,
      accessories: ['tie', 'watch'],
      messages: ["Excellent strategy! 💼", "Diversify wisely! 🌍", "Strong returns! 💪", "Keep it up! 🚀"],
      eyeSparkles: 1,
      cheekSize: 3,
      armLength: 'long'
    },
    wise: {
      size: 1.15,
      eyeSize: 9,
      pupilSize: 5,
      headRatio: 0.45,
      voicePitch: 0.9,
      bounceHeight: 6,
      accessories: ['monocle', 'tophat', 'mustache'],
      messages: ["Wealth wisdom! 🎩", "Legacy building! 🏛️", "Master investor! 👑", "Sage advice! 🦉"],
      eyeSparkles: 0,
      cheekSize: 2,
      armLength: 'long'
    }
  };

  const currentTraits = stageTraits[evolutionStage] || stageTraits.baby;

  // Realistic blinking
  useEffect(() => {
    const blinkInterval = setInterval(() => {
      if (Math.random() > 0.9) {
        setIsBlinking(true);
        setTimeout(() => setIsBlinking(false), 150);
      }
    }, 2000);
    return () => clearInterval(blinkInterval);
  }, []);

  // Random idle animations
  useEffect(() => {
    const idleAnimations = async () => {
      const animations = ['lookAround', 'stretch', 'yawn', 'dance'];
      const randomAnim = animations[Math.floor(Math.random() * animations.length)];
      
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
          setTimeout(() => setMood('happy'), 2000);
          break;
        case 'dance':
          await controls.start({ 
            rotate: [-5, 5, -5, 5, 0],
            y: [0, -10, 0, -10, 0],
            transition: { duration: 1 }
          });
          break;
      }
    };

    const interval = setInterval(idleAnimations, 10000);
    return () => clearInterval(interval);
  }, [controls]);

  // Handle cartwheel
  useEffect(() => {
    if (isDoingCartwheel) {
      handleCartwheel();
    }
  }, [isDoingCartwheel]);

  const handleCartwheel = async () => {
    setIsAnimating(true);
    setMood('excited');
    
    await controls.start({
      rotate: [0, 360, 720],
      x: [0, 150, 0],
      y: [0, -100, 0],
      transition: { duration: 1.5, ease: "easeInOut" }
    });
    
    setIsAnimating(false);
    setMood('dizzy');
    setTimeout(() => setMood('happy'), 2000);
  };

  const handleClick = () => {
    const messages = currentTraits.messages;
    const randomMessage = messages[Math.floor(Math.random() * messages.length)];
    setMessage(randomMessage);
    setIsTalking(true);
    
    // Bounce animation
    controls.start({
      y: [0, -currentTraits.bounceHeight, 0],
      scale: [1, 1.05, 1],
      transition: { duration: 0.5, type: "spring" }
    });
    
    setTimeout(() => {
      setMessage('');
      setIsTalking(false);
    }, 3000);
  };

  const handleMouseEnter = () => {
    setMood('curious');
    controls.start({ scale: 1.05 });
  };

  const handleMouseLeave = () => {
    setMood('happy');
    controls.start({ scale: 1 });
  };

  // Get eye path based on mood and blinking
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
      default:
        return null;
    }
  };

  // Safe values for animations to prevent undefined errors
  const safeLeftEyeX = 40;
  const safeLeftEyeY = 50;
  const safeRightEyeX = 80;
  const safeRightEyeY = 50;

  return (
    <motion.div 
      className="fixed bottom-8 right-8 z-50"
      initial={{ scale: 0, rotate: -360 }}
      animate={{ scale: currentTraits.size, rotate: 0 }}
      transition={{ type: "spring", stiffness: 100, damping: 15, duration: 1 }}
    >
      {/* Evolution effect */}
      <AnimatePresence>
        {evolutionStage !== 'baby' && (
          <motion.div
            className="absolute inset-0 pointer-events-none"
            initial={{ scale: 1.5, opacity: 0 }}
            animate={{ scale: 1, opacity: [0, 0.5, 0] }}
            transition={{ duration: 2 }}
          >
            <div className="absolute inset-0 bg-gradient-radial from-yellow-300 to-transparent rounded-full blur-xl" />
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
          <svg width="120" height="150" viewBox="0 0 120 150" fill="none" xmlns="http://www.w3.org/2000/svg">
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
                    (currentTraits.armLength === 'short' ? "M35 75 Q25 70 20 65" : "M35 75 Q20 70 15 60")
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
                    (currentTraits.armLength === 'short' ? "M85 75 Q95 70 100 65" : "M85 75 Q100 70 105 60")
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
                          {/* Left eye (transform-based pupil animation) */}
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

                    {/* Eye sparkles - with safe rendering */}
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
                  {/* Right eye (transform-based pupil animation) */}
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

                    {/* Eye sparkles - with safe rendering */}
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
                  <circle cx="40" cy="50" r="18" fill="none" stroke="#4A5568" strokeWidth="3" />
                  <circle cx="80" cy="50" r="18" fill="none" stroke="#4A5568" strokeWidth="3" />
                  <path d="M58 50 L62 50" stroke="#4A5568" strokeWidth="3" />
                </g>
              )}

              {/* Tie for adult */}
              {evolutionStage === 'adult' && (
                <path d="M60 100 L55 110 L60 125 L65 110 Z" fill="#4C6EF5" stroke="#364FC7" strokeWidth="2" />
              )}

              {/* Top hat and monocle for wise */}
              {evolutionStage === 'wise' && (
                <g>
                  {/* Top hat */}
                  <rect x="40" y="10" width="40" height="25" fill="#1A202C" stroke="#000" strokeWidth="2" />
                  <ellipse cx="60" cy="35" rx="25" ry="3" fill="#1A202C" />
                  <ellipse cx="60" cy="10" rx="20" ry="3" fill="#2D3748" />
                  
                  {/* Monocle */}
                  <circle cx="80" cy="50" r="20" fill="none" stroke="#D4AF37" strokeWidth="3" />
                  <path d="M100 50 Q105 55 105 60" stroke="#D4AF37" strokeWidth="2" fill="none" />
                  
                  {/* Mustache */}
                  <path d="M50 72 Q60 75 70 72" stroke="#4A5568" strokeWidth="3" fill="none" strokeLinecap="round" />
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

        {/* Evolution particles */}
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

      {/* Evolution indicator */}
      <motion.div
        className="absolute -bottom-12 left-1/2 transform -translate-x-1/2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
      >
        <div className="flex items-center space-x-1">
          {Object.keys(stageTraits).map((stage, index) => (
            <div
              key={stage}
              className={`h-2 w-2 rounded-full transition-all ${
                index <= Object.keys(stageTraits).indexOf(evolutionStage)
                  ? 'bg-gradient-to-r from-blue-500 to-purple-500'
                  : 'bg-gray-600'
              }`}
            />
          ))}
        </div>
        <p className="text-xs text-gray-500 mt-1 text-center capitalize">
          {evolutionStage} Egg
        </p>
      </motion.div>
    </motion.div>
  );
};

export default EggMascot;