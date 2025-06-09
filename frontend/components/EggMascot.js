import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence, useAnimation, useMotionValue, useTransform } from 'framer-motion';

// --- Static Data ---
// In a larger app, these would be in separate files (e.g., src/data/stageTraits.js)
const stageTraits = {
    baby: {
        size: 0.8, name: "Hatchling", eyeSize: 12, pupilSize: 8, headRatio: 0.6,
        bounceHeight: 15, accessories: [], cheekSize: 6, armLength: 'short',
        messages: ["Goo goo! 👶", "Me help! 🥚", "Yay money! 💰", "Up up! 📈"],
        specialMoves: ['giggle', 'peekaboo']
    },
    child: {
        size: 0.9, name: "Kiddo", eyeSize: 11, pupilSize: 7, headRatio: 0.55,
        bounceHeight: 12, accessories: ['cap'], cheekSize: 5, armLength: 'medium',
        messages: ["We're growing! 🌱", "Save more! 🐷", "Good job! ⭐", "Let's play! 🎮"],
        specialMoves: ['hopscotch', 'spinJump']
    },
    teen: {
        size: 1, name: "Cool Egg", eyeSize: 10, pupilSize: 6, headRatio: 0.5,
        bounceHeight: 10, accessories: ['glasses', 'headphones'], cheekSize: 4, armLength: 'medium',
        messages: ["Looking good! 😎", "Compound interest! 📊", "To the moon! 🚀"],
        specialMoves: ['breakdance', 'dab']
    },
    adult: {
        size: 1.1, name: "Eggsecutive", eyeSize: 9, pupilSize: 5, headRatio: 0.45,
        bounceHeight: 8, accessories: ['tie', 'watch'], cheekSize: 3, armLength: 'long',
        messages: ["Excellent strategy! 💼", "Diversify wisely! 🌍", "Strong returns! 💪"],
        specialMoves: ['presentation', 'meditation']
    },
    wise: {
        size: 1.15, name: "Sage", eyeSize: 9, pupilSize: 5, headRatio: 0.45,
        bounceHeight: 6, accessories: ['monocle', 'tophat', 'mustache'], cheekSize: 2, armLength: 'long',
        messages: ["Wealth wisdom! 🎩", "Legacy building! 🏛️", "Master investor! 👑"],
        specialMoves: ['magicTrick', 'philosopher']
    }
};

const achievementsList = {
  NEW_INVESTOR: { name: "New Investor", description: "You've started your journey!", icon: "🌱" },
  TENACIOUS_TRADER: { name: "Tenacious Trader", description: "Reached 'Teen' stage.", icon: "😎" },
  PORTFOLIO_PRO: { name: "Portfolio Pro", description: "Reached 'Adult' stage.", icon: "💼" },
  WEALTH_WIZARD: { name: "Wealth Wizard", description: "Reached 'Wise' stage.", icon: "👑" },
  COMBO_KING: { name: "Combo King", description: "Achieved a 10x combo!", icon: "🔥" },
  CENTURY_CLUB: { name: "Century Club", description: "Clicked 100 times.", icon: "💯" },
  HIGH_ROLLER: { name: "High Roller", description: "Portfolio value over $500,000.", icon: "💎" },
};


const EggMascot = ({
    portfolioValue = 0,
    userTenureDays = 0,
}) => {
    // --- State Management ---
    const [evolutionStage, setEvolutionStage] = useState('baby');
    const [mood, setMood] = useState('happy');
    const [message, setMessage] = useState('');
    const [isAnimating, setIsAnimating] = useState(false);
    const [isBlinking, setIsBlinking] = useState(false);
    const [isWaving, setIsWaving] = useState(false);
    const [isDancing, setIsDancing] = useState(false);
    const [isJumping, setIsJumping] = useState(false);
    const [isSleeping, setIsSleeping] = useState(false);
    const [clickCount, setClickCount] = useState(0);
    const [comboCount, setComboCount] = useState(0);
    const [lastClickTime, setLastClickTime] = useState(0);
    const [particles, setParticles] = useState([]);
    const [specialEffect, setSpecialEffect] = useState(null); // 'evolution', 'rainbow', 'heartBurst'
    const [unlockedAchievements, setUnlockedAchievements] = useState(new Set());
    const [latestAchievement, setLatestAchievement] = useState(null);

    // --- Animation & Refs ---
    const controls = useAnimation();
    const mascotRef = useRef(null);
    const particleIdRef = useRef(0);
    const comboTimeoutRef = useRef(null);

    // --- 3D Mouse Follow Effect ---
    const mouseX = useMotionValue(0);
    const mouseY = useMotionValue(0);
    const rotateX = useTransform(mouseY, [-300, 300], [25, -25]);
    const rotateY = useTransform(mouseX, [-300, 300], [-25, 25]);

    useEffect(() => {
        const handleMouseMove = (e) => {
            if (!mascotRef.current) return;
            const rect = mascotRef.current.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;
            mouseX.set(e.clientX - centerX);
            mouseY.set(e.clientY - centerY);
        };
        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, [mouseX, mouseY]);

    const currentTraits = stageTraits[evolutionStage];
    
    // --- Core Logic Hooks ---

    // Evolution Logic
    useEffect(() => {
        const getEvolutionStage = () => {
            if (portfolioValue < 10000 && userTenureDays < 30) return 'baby';
            if (portfolioValue < 50000 && userTenureDays < 90) return 'child';
            if (portfolioValue < 100000 && userTenureDays < 180) return 'teen';
            if (portfolioValue < 500000 && userTenureDays < 365) return 'adult';
            return 'wise';
        };
        const newStage = getEvolutionStage();
        if (newStage !== evolutionStage) {
            setEvolutionStage(newStage);
            setSpecialEffect('evolution');
            for (let i = 0; i < 20; i++) setTimeout(() => createParticle('star'), i * 50);
            setTimeout(() => setSpecialEffect(null), 3000);
        }
    }, [portfolioValue, userTenureDays, evolutionStage]);

    // Achievement Logic
    useEffect(() => {
        const unlock = (id) => {
            if (!unlockedAchievements.has(id)) {
                setUnlockedAchievements(prev => new Set(prev).add(id));
                setLatestAchievement(id);
                setTimeout(() => setLatestAchievement(null), 3000); // Highlight for 3s
            }
        };
        if (portfolioValue > 0) unlock('NEW_INVESTOR');
        if (evolutionStage === 'teen') unlock('TENACIOUS_TRADER');
        if (evolutionStage === 'adult') unlock('PORTFOLIO_PRO');
        if (evolutionStage === 'wise') unlock('WEALTH_WIZARD');
        if (portfolioValue > 500000) unlock('HIGH_ROLLER');
        if (comboCount >= 10) unlock('COMBO_KING');
        if (clickCount >= 100) unlock('CENTURY_CLUB');
    }, [portfolioValue, evolutionStage, comboCount, clickCount, unlockedAchievements]);

    // Blinking Logic
    useEffect(() => {
        const blinkInterval = setInterval(() => {
            if (Math.random() > 0.85 && !isSleeping) {
                setIsBlinking(true);
                setTimeout(() => setIsBlinking(false), 150);
            }
        }, 2500);
        return () => clearInterval(blinkInterval);
    }, [isSleeping]);

    // --- Particle System ---
    const createParticle = useCallback((type, count = 1, area = 40) => {
        for (let i = 0; i < count; i++) {
            const id = particleIdRef.current++;
            const particle = {
                id, type,
                x: (Math.random() - 0.5) * area,
                y: (Math.random() - 0.5) * area,
                vx: (Math.random() - 0.5) * 5,
                vy: -Math.random() * 10 - 5,
                size: Math.random() * 0.5 + 0.5
            };
            setParticles(prev => [...prev, particle]);
            setTimeout(() => {
                setParticles(prev => prev.filter(p => p.id !== id));
            }, 2000);
        }
    }, []);

    // --- Animation Library ---
    const setTemporaryState = (states, duration = 2000) => {
      // Set initial states
      Object.keys(states).forEach(key => {
        if (key === 'mood') setMood(states[key]);
        if (key === 'message') setMessage(states[key]);
        if (key === 'isWaving') setIsWaving(states[key]);
        if (key === 'isDancing') setIsDancing(states[key]);
      });
      setIsAnimating(true);
      
      // Set timeout to reset states
      setTimeout(() => {
        setMood('happy');
        setMessage('');
        setIsWaving(false);
        setIsDancing(false);
        setIsAnimating(false);
      }, duration);
    };

    const performWave = async () => {
        setTemporaryState({ isWaving: true, mood: 'happy', message: "Hello there! 👋" });
        await controls.start({ rotate: [0, -15, 15, -15, 15, 0], transition: { duration: 1.2, ease: 'easeInOut' } });
    };

    const performBounce = async () => {
        setTemporaryState({ mood: 'excited', message: currentTraits.messages[Math.floor(Math.random() * currentTraits.messages.length)] }, 2500);
        await controls.start({ y: [0, -currentTraits.bounceHeight * 1.5, 0], scaleY: [1, 0.8, 1], scaleX: [1, 1.2, 1], transition: { type: "spring", stiffness: 400, damping: 10 } });
    };

    const performDance = async () => {
        setIsAnimating(true);
        setIsDancing(true);
        setMood('excited');
        setMessage("Let's party! 🎉");
        setSpecialEffect('rainbow');
        const partyInterval = setInterval(() => createParticle('confetti', 2), 200);

        for (let i = 0; i < 3; i++) {
            await controls.start({ rotate: [-10, 10, 0], y: [0, -15, 0], x: [-8, 8, 0], transition: { duration: 0.4, ease: 'easeInOut' } });
        }

        clearInterval(partyInterval);
        setIsAnimating(false);
        setIsDancing(false);
        setMood('happy');
        setMessage("");
        setSpecialEffect(null);
    };

    const performCartwheel = async () => {
        setIsAnimating(true);
        setMood('excited');
        setMessage("Wheee! 🤸");
        for (let i = 0; i < 5; i++) setTimeout(() => createParticle('trail', 1, 10), i * 80);
        
        await controls.start({
            rotate: [0, 180, 360],
            x: [0, 80, 0],
            y: [0, -60, 0],
            scale: [1, 0.9, 1],
            transition: { duration: 1.5, ease: "easeInOut" }
        });

        setMood('dizzy');
        await controls.start({ rotate: [-5, 5, -2, 2, 0], transition: { duration: 0.8 } });
        
        setIsAnimating(false);
        setTimeout(() => setMood('happy'), 2000);
    };

    // --- Main Click Handler ---
    const handleClick = async () => {
        if (isAnimating) return;
        
        const now = Date.now();
        const timeSinceLastClick = now - lastClickTime;
        setLastClickTime(now);

        const newComboCount = timeSinceLastClick < 400 ? comboCount + 1 : 1;
        setComboCount(newComboCount);
        if (newComboCount > 1) createParticle('combo', 1, 20);

        if (comboTimeoutRef.current) clearTimeout(comboTimeoutRef.current);
        comboTimeoutRef.current = setTimeout(() => setComboCount(0), 1000);

        setClickCount(prev => prev + 1);
        createParticle('click');
        
        const actions = [performBounce, performWave, performCartwheel, performDance, ...currentTraits.specialMoves];
        const randomAction = actions[Math.floor(Math.random() * actions.length)];
        
        if (typeof randomAction === 'function') {
           await randomAction();
        } else {
            // Placeholder for special moves like 'giggle'
            setTemporaryState({ mood: 'excited', message: `${randomAction}!` });
            await performBounce();
        }
    };
    
    // --- Render ---
    return (
        <>
            {/* Achievements Display */}
            <div className="fixed top-4 left-4 flex flex-col gap-2 z-[100]">
                <AnimatePresence>
                    {Array.from(unlockedAchievements).map((id) => {
                        const achievement = achievementsList[id];
                        if (!achievement) return null;
                        return (
                            <motion.div
                                key={id} layout initial={{ opacity: 0, x: -50 }}
                                animate={{ opacity: 1, x: 0, transition: { type: 'spring' } }}
                                exit={{ opacity: 0, x: 50 }}
                                className={`flex items-center gap-3 p-3 rounded-xl shadow-lg border bg-slate-800/80 backdrop-blur-sm transition-all duration-300 ${latestAchievement === id ? 'border-yellow-400 scale-105' : 'border-slate-700'}`}
                            >
                                <div className="text-3xl">{achievement.icon}</div>
                                <div>
                                    <h4 className="font-bold text-yellow-300">{achievement.name}</h4>
                                    <p className="text-sm text-slate-300">{achievement.description}</p>
                                </div>
                            </motion.div>
                        );
                    })}
                </AnimatePresence>
            </div>
            
            {/* Main Mascot Container */}
            <motion.div
                ref={mascotRef}
                className="fixed bottom-16 right-16 z-50 select-none cursor-grab active:cursor-grabbing"
                drag dragConstraints={{ top: -200, left: -400, right: 100, bottom: 50 }}
                dragTransition={{ bounceStiffness: 600, bounceDamping: 20 }}
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: currentTraits.size, rotate: 0 }}
                transition={{ type: "spring", stiffness: 100, damping: 15 }}
                style={{ perspective: 1000, transformStyle: 'preserve-3d' }}
                onMouseEnter={() => !isAnimating && setMood('curious')}
                onMouseLeave={() => !isAnimating && setMood('happy')}
            >
                {/* Combo Counter */}
                <AnimatePresence>
                    {comboCount > 2 && (
                        <motion.div
                            initial={{ scale: 0, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0, y: -20 }}
                            className="absolute -top-8 left-1/2 -translate-x-1/2"
                        >
                            <div className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-3 py-1 rounded-full font-bold text-sm shadow-lg">
                                {comboCount}x COMBO! 🔥
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Particle & Effect Layers */}
                <ParticleSystem particles={particles} onRemove={(id) => setParticles(p => p.filter(x => x.id !== id))} />
                <AnimatePresence>{specialEffect && <EffectLayer effect={specialEffect} />}</AnimatePresence>

                <MessageBubble message={message} />

                {/* The Character Itself */}
                <motion.div
                    onClick={handleClick}
                    animate={controls}
                    whileTap={{ scale: 0.95, transition: { type: 'spring', stiffness: 400, damping: 15 } }}
                    style={{ rotateX, rotateY, transformStyle: 'preserve-3d' }}
                >
                   {/* This is an inline version of CharacterSVG.jsx for a single-file component */}
                   <CharacterSVG_Inline traits={currentTraits} state={{ mood, isBlinking, isWaving, isDancing, isJumping, isSleeping, isAnimating }} />
                </motion.div>
            </motion.div>
        </>
    );
};


// --- Inline Sub-Components for single-file structure ---

const EffectLayer = ({ effect }) => {
    if (effect === 'evolution') {
        return (
            <motion.div
                className="absolute inset-0 pointer-events-none"
                initial={{ scale: 1, opacity: 0 }}
                animate={{ scale: [1.5, 2.5], opacity: [0, 1, 0] }}
                transition={{ duration: 2 }}
            >
                <div className="absolute inset-0 bg-gradient-radial from-yellow-300 via-orange-300 to-transparent rounded-full blur-xl" />
            </motion.div>
        );
    }
    // Add other effects like 'rainbow' here
    return null;
}

const MessageBubble = ({ message }) => (
    <AnimatePresence>
        {message && (
            <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.8, rotate: -5 }}
                animate={{ opacity: 1, y: 0, scale: 1, rotate: 0 }}
                exit={{ opacity: 0, y: -10, scale: 0.8, rotate: 5, transition: { duration: 0.2 } }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                className="absolute -top-24 left-1/2 -translate-x-1/2 z-50"
            >
                <div className="relative">
                    <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-2 rounded-2xl text-base whitespace-nowrap shadow-xl relative overflow-hidden font-semibold">
                        <div className="relative z-10 animate-float">{message}</div>
                        <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent animate-shine opacity-50" />
                    </div>
                    <div className="absolute -bottom-2 left-1/2 w-4 h-4 bg-purple-600 rotate-45 transform -translate-x-1/2" style={{ clipPath: 'polygon(50% 50%, 100% 100%, 0 100%)' }} />
                </div>
            </motion.div>
        )}
    </AnimatePresence>
);

const CharacterSVG_Inline = ({ traits, state }) => {
    // This is the SVG rendering logic, kept separate for clarity even in a single file.
    const { mood, isBlinking, isAnimating } = state;

    return (
        <motion.div animate={{ y: isAnimating ? 0 : [0, -traits.bounceHeight / 4, 0] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}>
             <svg width="120" height="150" viewBox="0 0 120 150" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* SVG defs, gradients, filters... */}
                 <defs>
                    <radialGradient id="bodyGradient" cx="50%" cy="40%" r="60%"><stop offset="0%" stopColor="#FFFFFF" /><stop offset="70%" stopColor="#F8F8F8" /><stop offset="100%" stopColor="#E8E8E8" /></radialGradient>
                    <radialGradient id="shadowGradient"><stop offset="0%" stopColor="rgba(0,0,0,0.3)" /><stop offset="100%" stopColor="rgba(0,0,0,0)" /></radialGradient>
                </defs>
                {/* Shadow */}
                <motion.ellipse cx="60" cy="140" rx="35" ry="8" fill="url(#shadowGradient)" animate={{ scaleX: state.isJumping || isAnimating ? 0.8 : 1, opacity: state.isJumping ? 0.2 : 0.4 }}/>
                {/* Body */}
                <motion.ellipse cx="60" cy="80" rx="45" ry="55" fill="url(#bodyGradient)" stroke="#4A5568" strokeWidth="3" />
                {/* Face */}
                <g transform={`translate(0, ${-55 * traits.headRatio})`}>
                    <g>
                        {/* Eyes */}
                         <motion.circle cx="40" cy="50" fill="white" stroke="#1A202C" strokeWidth="2" animate={{ r: isBlinking ? 2 : traits.eyeSize }}/>
                         <motion.circle cx="80" cy="50" fill="white" stroke="#1A202C" strokeWidth="2" animate={{ r: isBlinking ? 2 : traits.eyeSize }}/>
                         <motion.circle cx="40" cy="50" fill="#1A202C" animate={{ r: isBlinking ? 0 : traits.pupilSize }}/>
                         <motion.circle cx="80" cy="50" fill="#1A202C" animate={{ r: isBlinking ? 0 : traits.pupilSize }}/>
                    </g>
                    {/* Mouth */}
                    <motion.path d="M45 75 Q60 80 75 75" stroke="#1A202C" strokeWidth="3" fill="none" strokeLinecap="round" animate={{ d: mood === 'excited' ? "M45 72 Q60 85 75 72" : "M45 75 Q60 80 75 75" }}/>
                </g>
                 {/* Accessories */}
                <g>
                    {traits.accessories.includes('cap') && (<path d="M30 30 Q60 20 90 30 L85 40 L35 40 Z" fill="#FF6B6B" stroke="#C92A2A" strokeWidth="2" />)}
                    {traits.accessories.includes('tie') && (<path d="M60 100 L55 110 L60 125 L65 110 Z" fill="#4C6EF5" stroke="#364FC7" strokeWidth="2" />)}
                </g>
            </svg>
        </motion.div>
    );
};

export default EggMascot;
