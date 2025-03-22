// components/badges/AchievementBadge.jsx
import React from 'react';
import { motion } from 'framer-motion';

const AchievementBadge = ({ achievement, onClose }) => {
  return (
    <motion.div
      className="bg-white rounded-lg shadow-lg p-4 max-w-sm"
      initial={{ opacity: 0, scale: 0.9, y: -20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: -20 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex justify-between items-start">
        <div className="flex items-center">
          <div className="bg-blue-100 rounded-full p-3 mr-3">
            <span className="text-2xl">{achievement.icon}</span>
          </div>
          <div>
            <h3 className="font-bold text-gray-900">{achievement.title}</h3>
            <p className="text-sm text-gray-600">{achievement.description}</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div className="mt-2 bg-green-100 text-green-800 text-xs py-1 px-2 rounded-full inline-block">
        Achievement Unlocked!
      </div>
    </motion.div>
  );
};

export default AchievementBadge;