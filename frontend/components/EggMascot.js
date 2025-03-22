import { useState, useEffect } from 'react';

const EggMascot = ({ isDoingCartwheel = false }) => {
  const [isAnimating, setIsAnimating] = useState(false);
  
  // When isDoingCartwheel prop changes to true, start animation
  useEffect(() => {
    if (isDoingCartwheel) {
      setIsAnimating(true);
      
      // Reset after animation completes
      const timer = setTimeout(() => {
        setIsAnimating(false);
      }, 1500); // Animation duration
      
      return () => clearTimeout(timer);
    }
  }, [isDoingCartwheel]);

  return (
    <div className="egg-mascot-container">
      <div className={`egg-mascot ${isAnimating ? 'do-cartwheel' : 'idle-bounce'}`}>
        <svg width="60" height="80" viewBox="0 0 60 80" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Egg body */}
          <ellipse cx="30" cy="45" rx="25" ry="32" fill="#FFFFFF" stroke="#333333" strokeWidth="2" />
          
          {/* Face */}
          <circle cx="22" cy="40" r="3" fill="#333333" className="eye left-eye" /> {/* Left eye */}
          <circle cx="38" cy="40" r="3" fill="#333333" className="eye right-eye" /> {/* Right eye */}
          
          {/* Mouth - happy by default, changes with animation */}
          <path 
            d="M22 52 Q30 60 38 52" 
            stroke="#333333" 
            strokeWidth="2" 
            fill="none"
            className="mouth"
          />
          
          {/* Arms */}
          <path 
            d="M10 45 Q5 40 8 35" 
            stroke="#333333" 
            strokeWidth="2" 
            fill="none"
            className="arm left-arm"
          />
          <path 
            d="M50 45 Q55 40 52 35" 
            stroke="#333333" 
            strokeWidth="2" 
            fill="none"
            className="arm right-arm"
          />
          
          {/* Legs */}
          <path 
            d="M20 75 Q18 70 22 65" 
            stroke="#333333" 
            strokeWidth="2" 
            fill="none"
            className="leg left-leg"
          />
          <path 
            d="M40 75 Q42 70 38 65" 
            stroke="#333333" 
            strokeWidth="2" 
            fill="none"
            className="leg right-leg"
          />
        </svg>
      </div>
    </div>
  );
};

export default EggMascot;