// Institution Card Component for Update Modal
import React from 'react';
import { motion } from 'framer-motion';
import { Building2, ChevronRight, Check } from 'lucide-react';
import { formatCurrency } from '@/utils/formatters';

/**
 * Institution selection card with summary stats
 */
const InstitutionCard = ({
  institution,
  logo,
  cashValue = 0,
  liabilityValue = 0,
  otherValue = 0,
  cashCount = 0,
  liabilityCount = 0,
  otherCount = 0,
  netValue = 0,
  totalCount = 0,
  isSelected = false,
  onClick,
  showValues = true,
  delay = 0
}) => {
  const isAll = institution === 'all';

  return (
    <motion.button
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
      onClick={onClick}
      className={`
        group relative w-full text-left overflow-hidden
        rounded-xl border transition-all duration-300
        ${isSelected
          ? 'bg-gradient-to-br from-blue-600/20 to-indigo-600/20 border-blue-500/50 shadow-lg shadow-blue-500/10'
          : 'bg-gray-800/50 border-gray-700/50 hover:border-gray-600 hover:bg-gray-800/80'
        }
        ${isAll ? 'border-dashed' : ''}
      `}
    >
      {/* Selected indicator glow */}
      {isSelected && (
        <motion.div
          layoutId="institution-selected"
          className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-indigo-500/5"
        />
      )}

      <div className="relative p-4">
        {/* Header */}
        <div className="flex items-start gap-3 mb-3">
          {/* Logo/Icon */}
          <div className={`
            w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0
            ${isAll
              ? 'bg-gradient-to-br from-indigo-600 to-purple-600'
              : 'bg-gray-700/50'
            }
          `}>
            {logo ? (
              <img src={logo} alt={institution} className="w-6 h-6 rounded object-contain" />
            ) : (
              <Building2 className={`w-5 h-5 ${isAll ? 'text-white' : 'text-gray-400'}`} />
            )}
          </div>

          {/* Title */}
          <div className="flex-1 min-w-0">
            <h3 className={`font-semibold truncate ${
              isSelected ? 'text-white' : 'text-gray-200'
            }`}>
              {isAll ? 'All Institutions' : institution}
            </h3>
            <p className="text-xs text-gray-400">
              {totalCount} {totalCount === 1 ? 'item' : 'items'}
            </p>
          </div>

          {/* Selection indicator */}
          {isSelected ? (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center"
            >
              <Check className="w-4 h-4 text-white" />
            </motion.div>
          ) : (
            <ChevronRight className={`
              w-5 h-5 text-gray-500 transition-transform duration-200
              group-hover:translate-x-1 group-hover:text-gray-400
            `} />
          )}
        </div>

        {/* Stats */}
        {!isAll && (
          <div className="space-y-1.5">
            {/* Cash */}
            {cashCount > 0 && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-emerald-400">Cash ({cashCount})</span>
                <span className="text-gray-300 font-medium tabular-nums">
                  {showValues ? formatCurrency(cashValue) : '••••'}
                </span>
              </div>
            )}

            {/* Liabilities */}
            {liabilityCount > 0 && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-rose-400">Liabilities ({liabilityCount})</span>
                <span className="text-gray-300 font-medium tabular-nums">
                  {showValues ? formatCurrency(liabilityValue) : '••••'}
                </span>
              </div>
            )}

            {/* Other */}
            {otherCount > 0 && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-violet-400">Other ({otherCount})</span>
                <span className="text-gray-300 font-medium tabular-nums">
                  {showValues ? formatCurrency(otherValue) : '••••'}
                </span>
              </div>
            )}

            {/* Net */}
            <div className="flex items-center justify-between text-xs pt-1.5 border-t border-gray-700/50">
              <span className="text-gray-400 font-medium">Net</span>
              <span className={`font-semibold tabular-nums ${
                netValue >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}>
                {showValues ? formatCurrency(netValue) : '••••'}
              </span>
            </div>
          </div>
        )}

        {/* All institutions message */}
        {isAll && (
          <p className="text-xs text-gray-400">
            View and update all cash, liabilities, and other assets
          </p>
        )}
      </div>
    </motion.button>
  );
};

export default InstitutionCard;
