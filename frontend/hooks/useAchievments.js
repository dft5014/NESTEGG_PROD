// hooks/useAchievements.js
import { useState, useEffect } from 'react';

// Achievement data
export const achievementsList = {
  first_account: {
    id: "first_account",
    title: "Account Creator",
    description: "Create your first investment account",
    icon: "🏦",
    level: 1
  },
  first_position: {
    id: "first_position",
    title: "Investor Initiate",
    description: "Add your first investment position",
    icon: "📈",
    level: 1
  },
  three_accounts: {
    id: "three_accounts",
    title: "Portfolio Diversifier",
    description: "Create three different accounts",
    icon: "🔱",
    level: 2
  },
  five_positions: {
    id: "five_positions",
    title: "Expanding Portfolio",
    description: "Track five different investment positions",
    icon: "🌟",
    level: 2
  },
  ten_positions: {
    id: "ten_positions",
    title: "Investment Maven",
    description: "Track ten different investment positions",
    icon: "💎",
    level: 3
  },
  first_price_update: {
    id: "first_price_update",
    title: "Market Watcher",
    description: "Update security prices for the first time",
    icon: "🔄",
    level: 1
  },
  three_day_streak: {
    id: "three_day_streak",
    title: "Consistent Investor",
    description: "Log in for 3 days in a row",
    icon: "🔥",
    level: 1
  },
  week_streak: {
    id: "week_streak",
    title: "Weekly Warrior",
    description: "Log in for 7 days in a row",
    icon: "📅",
    level: 2
  },
  month_streak: {
    id: "month_streak",
    title: "Investment Professional",
    description: "Log in for 30 days in a row",
    icon: "🏆",
    level: 3
  },
  portfolio_growth: {
    id: "portfolio_growth",
    title: "Growth Champion",
    description: "Grow your portfolio by 5% or more",
    icon: "💰",
    level: 2
  },
  ten_thousand: {
    id: "ten_thousand",
    title: "Five-Figure Investor",
    description: "Reach $10,000 in portfolio value",
    icon: "💵",
    level: 2
  },
  hundred_thousand: {
    id: "hundred_thousand",
    title: "Six-Figure Investor",
    description: "Reach $100,000 in portfolio value",
    icon: "💰",
    level: 3
  },
  bulk_upload: {
    id: "bulk_upload",
    title: "Power User",
    description: "Upload multiple positions at once using bulk upload",
    icon: "📊",
    level: 2
  }
};

export function useAchievements() {
  const [achievements, setAchievements] = useState({});
  const [newlyUnlocked, setNewlyUnlocked] = useState(null);

  // Load achievements from localStorage on component mount
  useEffect(() => {
    const loadAchievements = () => {
      const savedAchievements = localStorage.getItem('achievements');
      
      if (savedAchievements) {
        setAchievements(JSON.parse(savedAchievements));
      } else {
        // Initialize achievements
        const initialAchievements = {};
        
        Object.keys(achievementsList).forEach(key => {
          initialAchievements[key] = {
            ...achievementsList[key],
            unlocked: false,
            unlockDate: null
          };
        });
        
        setAchievements(initialAchievements);
        localStorage.setItem('achievements', JSON.stringify(initialAchievements));
      }
    };
    
    loadAchievements();
  }, []);

  // Function to unlock an achievement
  const unlockAchievement = (achievementId) => {
    if (!achievements[achievementId] || achievements[achievementId].unlocked) {
      return false; // Already unlocked or doesn't exist
    }
    
    const updatedAchievements = {
      ...achievements,
      [achievementId]: {
        ...achievements[achievementId],
        unlocked: true,
        unlockDate: new Date().toISOString()
      }
    };
    
    setAchievements(updatedAchievements);
    localStorage.setItem('achievements', JSON.stringify(updatedAchievements));
    
    // Set newly unlocked achievement for notification
    setNewlyUnlocked(achievementId);
    
    // Clear notification after 5 seconds
    setTimeout(() => {
      setNewlyUnlocked(null);
    }, 5000);
    
    return true;
  };

  return {
    achievements,
    unlockAchievement,
    newlyUnlocked,
    clearNewlyUnlocked: () => setNewlyUnlocked(null)
  };
}