// Success View - Completion summary with animations
import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  CheckCircle, Plus, Building, FileSpreadsheet, CreditCard,
  Activity, TrendingUp, Info, ArrowRight, Home, Sparkles
} from 'lucide-react';
import { VIEWS, ASSET_TYPES, LIABILITY_TYPES } from '../utils/constants';
import { formatCurrency } from '@/utils/formatters';

// Animated number counter
function AnimatedNumber({ value, duration = 1000 }) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const startTime = Date.now();
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(Math.floor(value * easeProgress));

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    requestAnimationFrame(animate);
  }, [value, duration]);

  return <span>{displayValue}</span>;
}

export default function SuccessView({
  state,
  dispatch,
  actions,
  goToView,
  onComplete,
  onClose
}) {
  const successData = state.successData;

  if (!successData) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-gray-400">No data to display</p>
      </div>
    );
  }

  const { type, count, items = [], failed = 0 } = successData;

  // Calculate summary stats based on type
  const getSummaryStats = () => {
    if (type === 'accounts') {
      const institutions = new Set(items.map(a => a.institution)).size;
      const categories = new Set(items.map(a => a.accountCategory || a.account_category)).size;
      return [
        { label: 'Accounts Added', value: count, color: 'indigo' },
        { label: 'Institutions', value: institutions, color: 'purple' },
        { label: 'Categories', value: categories, color: 'emerald' }
      ];
    } else if (type === 'positions') {
      let totalValue = 0;
      const byType = {};

      items.forEach(item => {
        const assetType = item.assetType;
        if (!byType[assetType]) byType[assetType] = { count: 0, value: 0 };
        byType[assetType].count++;

        // Calculate value
        const data = item.data || item;
        if (assetType === 'security') {
          totalValue += (parseFloat(data.shares) || 0) * (parseFloat(data.price) || 0);
        } else if (assetType === 'cash') {
          totalValue += parseFloat(data.amount) || 0;
        } else if (assetType === 'crypto') {
          totalValue += (parseFloat(data.quantity) || 0) * (parseFloat(data.current_price) || 0);
        } else if (assetType === 'metal') {
          totalValue += (parseFloat(data.quantity) || 0) * (parseFloat(data.current_price_per_unit) || 0);
        } else if (assetType === 'other') {
          totalValue += parseFloat(data.current_value) || 0;
        }
      });

      return [
        { label: 'Positions Added', value: count, color: 'purple' },
        { label: 'Asset Types', value: Object.keys(byType).length, color: 'blue' },
        { label: 'Est. Value', value: formatCurrency(totalValue), color: 'emerald', isText: true }
      ];
    } else if (type === 'liabilities') {
      let totalBalance = 0;
      let rateSum = 0;
      let rateCount = 0;

      items.forEach(item => {
        totalBalance += parseFloat(item.current_balance) || 0;
        if (item.interest_rate) {
          rateSum += parseFloat(item.interest_rate);
          rateCount++;
        }
      });

      const avgRate = rateCount > 0 ? rateSum / rateCount : 0;

      return [
        { label: 'Liabilities Added', value: count, color: 'rose' },
        { label: 'Total Balance', value: formatCurrency(totalBalance), color: 'orange', isText: true },
        { label: 'Avg Rate', value: `${avgRate.toFixed(1)}%`, color: 'amber', isText: true }
      ];
    }

    return [];
  };

  const stats = getSummaryStats();

  // Get icon and color based on type
  const getTypeConfig = () => {
    switch (type) {
      case 'accounts':
        return { icon: Building, color: 'blue', gradient: 'from-blue-500 to-indigo-600' };
      case 'positions':
        return { icon: FileSpreadsheet, color: 'purple', gradient: 'from-purple-500 to-indigo-600' };
      case 'liabilities':
        return { icon: CreditCard, color: 'rose', gradient: 'from-rose-500 to-orange-600' };
      default:
        return { icon: CheckCircle, color: 'emerald', gradient: 'from-emerald-500 to-teal-600' };
    }
  };

  const typeConfig = getTypeConfig();
  const TypeIcon = typeConfig.icon;

  // What's next suggestions
  const getNextSteps = () => {
    if (type === 'accounts') {
      return [
        { text: 'Add positions to your new accounts', action: () => goToView(VIEWS.positions), icon: FileSpreadsheet },
        { text: 'Add liabilities to track debt', action: () => goToView(VIEWS.liabilities), icon: CreditCard }
      ];
    } else if (type === 'positions') {
      return [
        { text: 'View your portfolio dashboard', action: onComplete, icon: TrendingUp },
        { text: 'Add more positions', action: () => goToView(VIEWS.positions), icon: Plus }
      ];
    } else if (type === 'liabilities') {
      return [
        { text: 'View your net worth', action: onComplete, icon: Activity },
        { text: 'Add more liabilities', action: () => goToView(VIEWS.liabilities), icon: Plus }
      ];
    }
    return [];
  };

  const nextSteps = getNextSteps();

  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="max-w-2xl mx-auto text-center space-y-8">
        {/* Animated Success Icon */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15 }}
          className="relative inline-block"
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.2 }}
            transition={{ delay: 0.3 }}
            className="absolute inset-0 flex items-center justify-center"
          >
            <div className="w-32 h-32 bg-emerald-500 rounded-full animate-ping" />
          </motion.div>
          <div className={`inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br ${typeConfig.gradient} rounded-full shadow-lg`}>
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <CheckCircle className="w-10 h-10 text-white" />
            </motion.div>
          </div>
        </motion.div>

        {/* Success Message */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <h2 className="text-3xl font-bold text-white mb-2">
            {failed > 0 ? 'Partially Complete!' : 'Success!'}
          </h2>
          <p className="text-gray-400">
            {type === 'accounts' && `Successfully added ${count} account${count !== 1 ? 's' : ''}`}
            {type === 'positions' && `Successfully imported ${count} position${count !== 1 ? 's' : ''}`}
            {type === 'liabilities' && `Successfully added ${count} liability${count !== 1 ? 'ies' : ''}`}
            {failed > 0 && ` (${failed} failed)`}
          </p>
        </motion.div>

        {/* Stats Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="grid grid-cols-3 gap-4"
        >
          {stats.map((stat, idx) => {
            const colorClasses = {
              indigo: 'text-indigo-400 bg-indigo-500/10',
              purple: 'text-purple-400 bg-purple-500/10',
              blue: 'text-blue-400 bg-blue-500/10',
              emerald: 'text-emerald-400 bg-emerald-500/10',
              rose: 'text-rose-400 bg-rose-500/10',
              orange: 'text-orange-400 bg-orange-500/10',
              amber: 'text-amber-400 bg-amber-500/10'
            };

            return (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.5 + idx * 0.1 }}
                className={`p-4 rounded-xl ${colorClasses[stat.color]}`}
              >
                <p className={`text-2xl font-bold ${colorClasses[stat.color].split(' ')[0]}`}>
                  {stat.isText ? stat.value : <AnimatedNumber value={stat.value} />}
                </p>
                <p className="text-xs text-gray-400 mt-1">{stat.label}</p>
              </motion.div>
            );
          })}
        </motion.div>

        {/* Items List */}
        {items.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className={`bg-gradient-to-br from-${typeConfig.color}-900/20 to-gray-900/20 rounded-xl p-6 border border-${typeConfig.color}-500/20`}
          >
            <h4 className="font-semibold text-white mb-4 flex items-center justify-center">
              <TypeIcon className={`w-5 h-5 mr-2 text-${typeConfig.color}-400`} />
              {type === 'accounts' ? 'Accounts' : type === 'positions' ? 'Positions' : 'Liabilities'} Added
            </h4>

            <div className="space-y-2 max-h-48 overflow-y-auto">
              {items.slice(0, 10).map((item, idx) => {
                let itemName = '';
                let itemDetail = '';

                if (type === 'accounts') {
                  itemName = item.accountName || item.account_name;
                  itemDetail = item.institution;
                } else if (type === 'positions') {
                  const data = item.data || item;
                  itemName = data.ticker || data.symbol || data.asset_name || data.cash_type || data.metal_type;
                  itemDetail = `${data.shares || data.quantity || data.amount || ''} units`;
                } else if (type === 'liabilities') {
                  itemName = item.name;
                  itemDetail = `${formatCurrency(item.current_balance)} @ ${item.institution_name}`;
                }

                return (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.7 + idx * 0.05 }}
                    className="flex items-center justify-between bg-gray-800/50 rounded-lg p-3"
                  >
                    <div className="flex items-center space-x-3">
                      <CheckCircle className="w-4 h-4 text-emerald-400" />
                      <div className="text-left">
                        <p className="text-sm font-medium text-white">{itemName}</p>
                        <p className="text-xs text-gray-400">{itemDetail}</p>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
              {items.length > 10 && (
                <p className="text-xs text-gray-500 text-center py-2">
                  ... and {items.length - 10} more
                </p>
              )}
            </div>
          </motion.div>
        )}

        {/* What's Next */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="bg-emerald-900/20 rounded-xl p-6 border border-emerald-500/20"
        >
          <h4 className="font-semibold text-white mb-4 flex items-center justify-center">
            <Sparkles className="w-5 h-5 mr-2 text-emerald-400" />
            What's Next?
          </h4>
          <div className="space-y-3">
            {nextSteps.map((step, idx) => {
              const StepIcon = step.icon;
              return (
                <button
                  key={idx}
                  onClick={step.action}
                  className="w-full flex items-center justify-between p-3 bg-gray-800/50 hover:bg-gray-800 rounded-lg transition-colors group"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-emerald-500/20 rounded-lg flex items-center justify-center">
                      <StepIcon className="w-4 h-4 text-emerald-400" />
                    </div>
                    <span className="text-sm text-gray-300">{step.text}</span>
                  </div>
                  <ArrowRight className="w-4 h-4 text-gray-500 group-hover:text-emerald-400 group-hover:translate-x-1 transition-all" />
                </button>
              );
            })}
          </div>
        </motion.div>

        {/* Tip */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="flex items-center justify-center text-xs text-gray-500"
        >
          <Info className="w-3 h-3 mr-1.5" />
          You can continue adding data anytime from the QuickStart menu
        </motion.div>

        {/* Actions */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.1 }}
          className="flex justify-center space-x-3"
        >
          <button
            onClick={() => {
              dispatch(actions.clearSuccessData());
              goToView(VIEWS.welcome);
            }}
            className="px-4 py-2 bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors"
          >
            Add More
          </button>
          <button
            onClick={onComplete}
            className="px-6 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-medium rounded-lg hover:from-emerald-700 hover:to-teal-700 transition-all"
          >
            Done
          </button>
        </motion.div>
      </div>
    </div>
  );
}
