import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// --- Sub-components for a cleaner SVG structure ---

const Face = ({ isBlinking, mouthOpen, isThinking }) => {
    // Defines the smiling mouth path
    const smilePath = "M 80 145 Q 100 160 120 145";
    // Defines the open "O" mouth path for when talking
    const openMouthPath = "M 85 145 Q 100 155 115 145";

    return (
        <>
            {/* Eyes */}
            <circle cx="75" cy="110" r="12" fill="#fff" />
            <circle cx="125" cy="110" r="12" fill="#fff" />

            <AnimatePresence>
                {!isBlinking && (
                    <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                        {/* Pupils */}
                        <circle cx="75" cy="110" r="6" fill="#353535" />
                        <circle cx="125" cy="110" r="6" fill="#353535" />
                        {/* Eye Glimmer */}
                        <circle cx="80" cy="105" r="2" fill="#fff" />
                        <circle cx="130" cy="105" r="2" fill="#fff" />
                    </motion.g>
                )}
            </AnimatePresence>

            {isBlinking && (
                <>
                    {/* Blinking lines */}
                    <line x1="63" y1="110" x2="87" y2="110" stroke="#353535" strokeWidth="4" strokeLinecap="round" />
                    <line x1="113" y1="110" x2="137" y2="110" stroke="#353535" strokeWidth="4" strokeLinecap="round" />
                </>
            )}

            {/* Eyebrows */}
             <motion.path
                d="M 65 95 Q 75 90 85 95"
                stroke="#5C2E00" strokeWidth="5" fill="transparent" strokeLinecap="round"
                animate={{ y: isThinking ? -5 : 0, rotate: isThinking ? -5: 0 }}
             />
             <motion.path
                d="M 115 95 Q 125 90 135 95"
                stroke="#5C2E00" strokeWidth="5" fill="transparent" strokeLinecap="round"
                animate={{ y: isThinking ? -5 : 0, rotate: isThinking ? 5: 0 }}
             />

            {/* Mouth */}
            <motion.path
                d={mouthOpen ? openMouthPath : smilePath}
                stroke="#333"
                strokeWidth="4"
                fill="transparent"
                strokeLinecap="round"
                transition={{ duration: 0.2 }}
            />
        </>
    );
};

const Hat = ({ stage }) => {
    const hats = {
        baby: null, // No hat for baby
        child: ( // A simple baseball cap
            <motion.g initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
                <path d="M 60 70 Q 100 50 140 70 L 120 70 Q 100 80 80 70 Z" fill="#4A90E2" />
                <path d="M 120 70 C 140 70 150 65 140 60" fill="#357ABD" />
            </motion.g>
        ),
        teen: ( // Cool beanie
             <motion.g initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
                <path d="M 65 75 Q 100 45 135 75 Z" fill="#50C878"/>
                <rect x="65" y="70" width="70" height="10" fill="#40A060" />
            </motion.g>
        ),
        adult: ( // A stylish fedora
             <motion.g initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
                <ellipse cx="100" cy="60" rx="55" ry="15" fill="#6A5ACD" />
                <rect x="65" y="40" width="70" height="20" fill="#5A4AAD" />
                <rect x="60" y="55" width="80" height="5" fill="#333" opacity="0.5" />
             </motion.g>
        ),
        wise: ( // A classic top hat
            <motion.g initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
                <ellipse cx="100" cy="65" rx="50" ry="10" fill="#333" />
                <rect x="70" y="25" width="60" height="40" fill="#444" />
                <rect x="65" y="45" width="70" height="5" fill="#E74C3C" />
            </motion.g>
        ),
    };
    return <AnimatePresence>{hats[stage]}</AnimatePresence>;
};

const Suit = ({ color, stage }) => {
    const suitPath = "M40 160 Q100 180 160 160 L160 210 Q100 240 40 210 Z";
    const bowtie = (
        <g>
            <polygon points="95,155 80,165 95,175 105,165" fill="#e74c3c" />
            <circle cx="100" cy="165" r="5" fill="#C0392B" />
        </g>
    );

    return (
        <motion.g initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }}>
            <path d={suitPath} fill={color} stroke={new THREE.Color(color).darken(0.5).getStyle()} strokeWidth="3" />
            {stage !== 'baby' && bowtie}
        </motion.g>
    );
};

// --- Main Mascot Component ---

const EggMascot = ({ portfolioValue = 0, userTenureDays = 0 }) => {
    const [isBlinking, setIsBlinking] = useState(false);
    const [isWaving, setIsWaving] = useState(false);
    const [message, setMessage] = useState('');
    const [isThinking, setIsThinking] = useState(false);

    // --- Evolution Logic ---
    const evolutionStage = useMemo(() => {
        if (portfolioValue < 10000 && userTenureDays < 30) return 'baby';
        if (portfolioValue < 50000 && userTenureDays < 90) return 'child';
        if (portfolioValue < 100000 && userTenureDays < 180) return 'teen';
        if (portfolioValue < 500000 && userTenureDays < 365) return 'adult';
        return 'wise';
    }, [portfolioValue, userTenureDays]);

    const stageTraits = useMemo(() => ({
        baby: { name: "Baby Eggbert", suitColor: "#ADD8E6" },
        child: { name: "Kid Eggbert", suitColor: "#90EE90" },
        teen: { name: "Teen Eggbert", suitColor: "#FFB6C1" },
        adult: { name: "Adult Eggbert", suitColor: "#D3D3D3" },
        wise: { name: "Wise Eggbert", suitColor: "#4a90e2" },
    }), []);
    
    const currentTraits = stageTraits[evolutionStage];

    // --- Animations & Effects ---
    useEffect(() => { // Blinking timer
        const id = setInterval(() => {
            setIsBlinking(true);
            setTimeout(() => setIsBlinking(false), 200);
        }, 4000);
        return () => clearInterval(id);
    }, []);

    const handleWave = () => { // Simple wave on click
        if (isWaving || isThinking) return;
        setIsWaving(true);
        setTimeout(() => setIsWaving(false), 1200);
    };

    // --- Gemini API Interaction ---
    const handleGetAdvice = async () => {
        if (isThinking || isWaving) return;
        setIsThinking(true);
        setMessage('');

        const prompt = `You are a financial mascot named Eggbert. Your current evolution is '${evolutionStage}'. Give a user with a portfolio of $${portfolioValue} a single, short, encouraging financial tip (under 20 words) that matches your personality.`;
        
        try {
            const apiKey = ""; // Provided by environment
            const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
            const payload = {
                contents: [{ role: "user", parts: [{ text: prompt }] }],
                generationConfig: { maxOutputTokens: 60, temperature: 0.7 }
            };

            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) throw new Error(`API Error: ${response.status}`);

            const result = await response.json();
            const advice = result.candidates?.[0]?.content?.parts?.[0]?.text.trim().replace(/"/g, '') || "Thinking is hard! Try again.";
            setMessage(advice);
        } catch (error) {
            console.error("Gemini API call failed:", error);
            setMessage("My circuits fizzled! Please try again.");
        } finally {
            setIsThinking(false);
            setTimeout(() => setMessage(''), 5000); // Clear message after 5s
        }
    };
    
    // Framer Motion variants
    const armVariants = {
        idle: { rotate: 0 },
        wave: { 
            rotate: [0, -60, 60, -45, 0], 
            transition: { times: [0, 0.2, 0.5, 0.8, 1], duration: 1.2, ease: "easeInOut" } 
        },
    };
    
    const mascotVariants = {
        initial: { y: 20, opacity: 0 },
        animate: { y: 0, opacity: 1 },
        hover: { scale: 1.05, rotate: -3, transition: { duration: 0.3 } },
        tap: { scale: 0.95 }
    };

    return (
        <div className="relative flex flex-col items-center p-4 bg-gray-100 dark:bg-gray-800 rounded-2xl shadow-lg w-72">
            
            {/* Message Bubble */}
            <AnimatePresence>
            {message && (
                <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.8 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute -top-4 bg-white dark:bg-gray-700 text-gray-800 dark:text-white text-center px-4 py-2 rounded-xl text-sm font-semibold shadow-md mb-4"
                >
                    {message}
                </motion.div>
            )}
            </AnimatePresence>

            {/* SVG Mascot */}
            <motion.svg
                width={200}
                height={260}
                viewBox="0 0 200 260"
                onClick={handleWave}
                variants={mascotVariants}
                initial="initial"
                animate="animate"
                whileHover="hover"
                whileTap="tap"
                style={{ cursor: 'pointer' }}
            >
                {/* Idle breathing animation */}
                <motion.g animate={{ scale: [1, 1.02, 1], y: [0, -2, 0] }} transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}>
                    {/* Body */}
                    <ellipse cx="100" cy="130" rx="60" ry="85" fill="#fff1da" stroke="#e0cda9" strokeWidth="4" />
                    <Suit color={currentTraits.suitColor} stage={evolutionStage} />
                    <Face isBlinking={isBlinking} mouthOpen={!!message} isThinking={isThinking} />

                    {/* Arms */}
                    <motion.line x1="40" y1="160" x2="20" y2="190" stroke="#fff1da" strokeWidth="15" strokeLinecap="round" variants={armVariants} animate={isWaving ? "wave" : "idle"}/>
                    <motion.line x1="160" y1="160" x2="180" y2="190" stroke="#fff1da" strokeWidth="15" strokeLinecap="round" />
                    
                    {/* Legs */}
                    <line x1="80" y1="215" x2="70" y2="250" stroke="#fff1da" strokeWidth="15" strokeLinecap="round" />
                    <line x1="120" y1="215" x2="130" y2="250" stroke="#fff1da" strokeWidth="15" strokeLinecap="round" />
                </motion.g>
                <Hat stage={evolutionStage} />
            </motion.svg>
            
            {/* UI Section */}
            <div className="text-center mt-4 w-full">
                <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200">{currentTraits.name}</h3>
                
                {/* Evolution Progress Bar */}
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 my-2">
                    <motion.div
                        className="bg-gradient-to-r from-green-400 to-blue-500 h-2.5 rounded-full"
                        initial={{ width: '0%' }}
                        animate={{ width: `${(Object.keys(stageTraits).indexOf(evolutionStage) + 1) / Object.keys(stageTraits).length * 100}%` }}
                        transition={{ duration: 1, ease: 'easeOut' }}
                    />
                </div>
                
                <motion.button
                    onClick={handleGetAdvice}
                    disabled={isThinking}
                    className="w-full mt-2 bg-indigo-600 text-white font-bold py-2 px-4 rounded-lg shadow-md disabled:bg-gray-400"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                >
                    {isThinking ? 'Thinking...' : 'Get a Tip ✨'}
                </motion.button>
            </div>
        </div>
    );
};

export default EggMascot;
