import { createContext, useState, useContext } from 'react';

// Create context
const EggMascotContext = createContext();

// Provider component
export const EggMascotProvider = ({ children }) => {
  const [isDoingCartwheel, setIsDoingCartwheel] = useState(false);

  const triggerCartwheel = () => {
    setIsDoingCartwheel(true);
    
    // Reset after animation completes
    setTimeout(() => {
      setIsDoingCartwheel(false);
    }, 1500);
  };

  return (
    <EggMascotContext.Provider value={{ isDoingCartwheel, triggerCartwheel }}>
      {children}
    </EggMascotContext.Provider>
  );
};

// Custom hook to use the egg mascot context
export const useEggMascot = () => useContext(EggMascotContext);