import React from 'react';
import { LIABILITY_TYPES } from '../../config';

/**
 * Liability type filter buttons
 */
const LiabilityTypeFilter = ({
  liabilities,
  selectedLiabilityTypes,
  setSelectedLiabilityTypes
}) => {
  return (
    <div className="flex items-center space-x-2">
      {Object.entries(LIABILITY_TYPES).map(([key, config]) => {
        const count = liabilities.filter(l => l.liability_type === key).length;
        const isSelected = selectedLiabilityTypes.has(key);
        const Icon = config.icon;

        return (
          <button
            key={key}
            onClick={() => {
              const newSet = new Set(selectedLiabilityTypes);
              if (isSelected) {
                newSet.delete(key);
              } else {
                newSet.add(key);
              }
              setSelectedLiabilityTypes(newSet);
            }}
            className={`
              inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-medium
              transition-all duration-200 transform hover:scale-105
              ${isSelected
                ? 'bg-red-600 text-white shadow-sm'
                : 'bg-rose-500/10 text-rose-400 hover:bg-rose-500/20'
              }
            `}
          >
            <Icon className="w-3.5 h-3.5 mr-1.5" />
            {config.label}
            {count > 0 && (
              <span className={`
                ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold
                ${isSelected ? 'bg-white/20 text-white' : 'bg-red-900/40 text-red-200'}
              `}>
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};

export default LiabilityTypeFilter;
