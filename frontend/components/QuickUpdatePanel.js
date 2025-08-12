// components/QuickUpdatePanel.js
import React, { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Banknote, CreditCard, PiggyBank, TrendingUp, TrendingDown,
  Plus, Minus, Edit2, Check, X, Zap, Calculator, Hash,
  DollarSign, Percent, AlertCircle, ChevronRight, Building,
  Wallet, Home, Car, GraduationCap, Gem, Briefcase
} from 'lucide-react';
import { formatCurrency } from '@/utils/formatters';

const QuickUpdatePanel = ({ 
  accounts = [], 
  positions = [], 
  liabilities = [],
  draft = new Map(),
  onUpdate = () => {},
  animateValues = new Map(),
  mode = 'quick'
}) => {
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [quickAdjustMode, setQuickAdjustMode] = useState('value'); // value, percent, delta
  const [filter, setFilter] = useState('all'); // all, needsUpdate, recent
  
  // Asset type configurations
  const assetConfigs = {
    cash: { icon: Banknote, color: 'emerald', priority: 1 },
    checking: { icon: Wallet, color: 'green', priority: 1 },
    savings: { icon: PiggyBank, color: 'teal', priority: 1 },
    credit_card: { icon: CreditCard, color: 'red', priority: 2 },
    loan: { icon: Building, color: 'orange', priority: 2 },
    mortgage: { icon: Home, color: 'purple', priority: 3 },
    auto_loan: { icon: Car, color: 'blue', priority: 3 },
    student_loan: { icon: GraduationCap, color: 'indigo', priority: 3 },
    investment: { icon: TrendingUp, color: 'blue', priority: 4 },
    brokerage: { icon: Briefcase, color: 'cyan', priority: 4 },
    retirement: { icon: Gem, color: 'purple', priority: 5 },
    '401k': { icon: TrendingUp, color: 'violet', priority: 5 },
    ira: { icon: TrendingUp, color: 'pink', priority: 5 }
  };
  
  // Group and prioritize items
  const prioritizedItems = useMemo(() => {
    const items = [];
    
    // Process accounts
    accounts.forEach(account => {
      const config = assetConfigs[account.type] || assetConfigs[account.category] || {
        icon: Building,
        color: 'gray',
        priority: 10
      };
      
      items.push({
        ...account,
        itemType: 'account',
        itemId: `account_${account.id}`,
        displayName: account.name || account.accountName,
        displayValue: account.totalValue || 0,
        institution: account.institution,
        ...config
      });
    });
    
    // Process liabilities
    liabilities.forEach(liability => {
      const config = assetConfigs[liability.type] || assetConfigs[liability.liability_type] || {
        icon: CreditCard,
        color: 'red',
        priority: 2
      };
      
      items.push({
        ...liability,
        itemType: 'liability',
        itemId: `liability_${liability.id}`,
        displayName: liability.name || liability.liability_name,
        displayValue: liability.current_balance || liability.balance || 0,
        institution: liability.institution,
        ...config
      });
    });
    
    // Sort by priority
    return items.sort((a, b) => a.priority - b.priority);
  }, [accounts, liabilities]);
  
  // Filter items based on selected filter
  const filteredItems = useMemo(() => {
    switch (filter) {
      case 'needsUpdate':
        return prioritizedItems.filter(item => {
          // Items that haven't been updated in 7+ days
          return !draft.has(item.itemId);
        });
      case 'recent':
        return prioritizedItems.filter(item => draft.has(item.itemId));
      default:
        return prioritizedItems;
    }
  }, [prioritizedItems, draft, filter]);
  
  const handleQuickAdjust = useCallback((item, adjustment) => {
    const currentValue = draft.get(item.itemId)?.value || item.displayValue;
    let newValue;
    
    switch (quickAdjustMode) {
      case 'percent':
        newValue = currentValue * (1 + adjustment / 100);
        break;
      case 'delta':
        newValue = currentValue + adjustment;
        break;
      default:
        newValue = currentValue + adjustment;
    }
    
    onUpdate(item.id, Math.max(0, newValue), item.itemType);
  }, [draft, quickAdjustMode, onUpdate]);
  
  const handleStartEdit = (item) => {
    setEditingId(item.id);
    const currentValue = draft.get(item.itemId)?.value || item.displayValue;
    setEditValue(currentValue.toString());
  };
  
  const handleSaveEdit = () => {
    const item = prioritizedItems.find(i => i.id === editingId);
    if (item && editValue) {
      const value = parseFloat(editValue.replace(/[^0-9.-]/g, ''));
      if (!isNaN(value)) {
        onUpdate(item.id, value, item.itemType);
      }
    }
    setEditingId(null);
    setEditValue('');
  };
  
  const handleCancelEdit = () => {
    setEditingId(null);
    setEditValue('');
  };
  
  const getQuickAdjustments = () => {
    switch (quickAdjustMode) {
      case 'percent':
        return [
          { label: '-5%', value: -5 },
          { label: '-1%', value: -1 },
          { label: '+1%', value: 1 },
          { label: '+5%', value: 5 }
        ];
      case 'delta':
        return [
          { label: '-$1k', value: -1000 },
          { label: '-$100', value: -100 },
          { label: '+$100', value: 100 },
          { label: '+$1k', value: 1000 }
        ];
      default:
        return [
          { label: '-$1k', value: -1000 },
          { label: '-$100', value: -100 },
          { label: '+$100', value: 100 },
          { label: '+$1k', value: 1000 }
        ];
    }
  };
  
  const quickAdjustments = getQuickAdjustments();
  
  return (
    <div className="bg-gray-800 rounded-xl p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white flex items-center">
          <Zap className="w-5 h-5 mr-2 text-yellow-500" />
          Quick Updates
          <span className="ml-2 px-2 py-1 bg-blue-600/20 text-blue-400 text-xs rounded-full">
            {filteredItems.length} items
          </span>
        </h3>
        
        <div className="flex items-center space-x-2">
          {/* Mode Toggle */}
          <div className="flex items-center bg-gray-700 rounded-lg p-1">
            <button
              onClick={() => setQuickAdjustMode('value')}
              className={`px-2 py-1 rounded transition-colors ${
                quickAdjustMode === 'value' 
                  ? 'bg-blue-600 text-white' 
                  : 'text-gray-400 hover:text-white'
              }`}
              title="Absolute values"
            >
              <DollarSign className="w-4 h-4" />
            </button>
            <button
              onClick={() => setQuickAdjustMode('percent')}
              className={`px-2 py-1 rounded transition-colors ${
                quickAdjustMode === 'percent' 
                  ? 'bg-blue-600 text-white' 
                  : 'text-gray-400 hover:text-white'
              }`}
              title="Percentage change"
            >
              <Percent className="w-4 h-4" />
            </button>
            <button
              onClick={() => setQuickAdjustMode('delta')}
              className={`px-2 py-1 rounded transition-colors ${
                quickAdjustMode === 'delta' 
                  ? 'bg-blue-600 text-white' 
                  : 'text-gray-400 hover:text-white'
              }`}
              title="Add/subtract amount"
            >
              <Hash className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
      
      {/* Filter Tabs */}
      <div className="flex space-x-2 mb-4">
        <button
          onClick={() => setFilter('all')}
          className={`px-3 py-1 rounded-lg text-sm transition-colors ${
            filter === 'all' 
              ? 'bg-blue-600 text-white' 
              : 'bg-gray-700 text-gray-400 hover:text-white'
          }`}
        >
          All Items
        </button>
        <button
          onClick={() => setFilter('needsUpdate')}
          className={`px-3 py-1 rounded-lg text-sm transition-colors ${
            filter === 'needsUpdate' 
              ? 'bg-blue-600 text-white' 
              : 'bg-gray-700 text-gray-400 hover:text-white'
          }`}
        >
          Needs Update
        </button>
        <button
          onClick={() => setFilter('recent')}
          className={`px-3 py-1 rounded-lg text-sm transition-colors ${
            filter === 'recent' 
              ? 'bg-blue-600 text-white' 
              : 'bg-gray-700 text-gray-400 hover:text-white'
          }`}
        >
          Recently Updated
        </button>
      </div>
      
      {/* Items List */}
      <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2">
        <AnimatePresence mode="popLayout">
          {filteredItems.map((item, index) => {
            const draftValue = draft.get(item.itemId);
            const currentValue = draftValue?.value || item.displayValue;
            const hasChanges = draft.has(item.itemId);
            const isAnimating = animateValues.get(item.itemId);
            const isEditing = editingId === item.id;
            const ItemIcon = item.icon;
            
            return (
              <motion.div
                key={item.itemId}
                layout
                initial={{ opacity: 0, x: -20 }}
                animate={{ 
                  opacity: 1, 
                  x: 0,
                  scale: isAnimating ? 1.02 : 1
                }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ 
                  duration: 0.2,
                  delay: index * 0.02
                }}
                className={`
                  p-3 rounded-lg border transition-all
                  ${hasChanges 
                    ? 'bg-blue-900/30 border-blue-600' 
                    : 'bg-gray-900 border-gray-700 hover:border-gray-600'
                  }
                  ${isAnimating ? 'ring-2 ring-blue-500 ring-opacity-50' : ''}
                `}
              >
                <div className="flex items-center justify-between">
                  {/* Left side - Icon and Name */}
                  <div className="flex items-center space-x-3 flex-1">
                    <div className={`
                      p-2 rounded-lg
                      bg-${item.color}-500/20
                    `}>
                      <ItemIcon className={`w-5 h-5 text-${item.color}-500`} />
                    </div>
                    
                    <div className="flex-1">
                      <div className="text-sm font-medium text-white">
                        {item.displayName}
                      </div>
                      <div className="text-xs text-gray-400">
                        {item.institution || item.type}
                        {hasChanges && (
                          <span className="ml-2 text-blue-400">• Modified</span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Right side - Value and Actions */}
                  <div className="flex items-center space-x-2">
                    {isEditing ? (
                      <>
                        <input
                          type="text"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="w-32 px-2 py-1 bg-gray-700 text-white rounded text-right focus:outline-none focus:ring-2 focus:ring-blue-500"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveEdit();
                            if (e.key === 'Escape') handleCancelEdit();
                          }}
                        />
                        <button
                          onClick={handleSaveEdit}
                          className="p-1 text-green-500 hover:bg-green-500/20 rounded transition-colors"
                          title="Save"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          className="p-1 text-red-500 hover:bg-red-500/20 rounded transition-colors"
                          title="Cancel"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </>
                    ) : (
                      <>
                        <div className="text-right">
                          <div className="text-sm font-mono text-white">
                            {formatCurrency(currentValue)}
                          </div>
                          {hasChanges && draftValue?.originalValue !== undefined && (
                            <div className="text-xs text-gray-400">
                              was {formatCurrency(draftValue.originalValue)}
                            </div>
                          )}
                        </div>
                        
                        {/* Quick Adjust Buttons */}
                        <div className="flex items-center space-x-1">
                          {quickAdjustments.slice(0, 2).map((adj, idx) => (
                            <button
                              key={idx}
                              onClick={() => handleQuickAdjust(item, adj.value)}
                              className="px-2 py-1 text-xs text-red-400 hover:bg-red-500/20 rounded transition-colors"
                              title={adj.label}
                            >
                              {adj.label}
                            </button>
                          ))}
                          {quickAdjustments.slice(2).map((adj, idx) => (
                            <button
                              key={idx}
                              onClick={() => handleQuickAdjust(item, adj.value)}
                              className="px-2 py-1 text-xs text-green-400 hover:bg-green-500/20 rounded transition-colors"
                              title={adj.label}
                            >
                              {adj.label}
                            </button>
                          ))}
                          <button
                            onClick={() => handleStartEdit(item)}
                            className="p-1 text-blue-400 hover:bg-blue-500/20 rounded transition-colors"
                            title="Edit manually"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
                
                {/* Pattern/Suggestion Row */}
                {item.pattern && !isEditing && (
                  <div className="mt-2 pt-2 border-t border-gray-700">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-400">
                        Pattern: {item.pattern.type}
                      </span>
                      {item.suggestion && (
                        <button
                          onClick={() => onUpdate(item.id, item.suggestion.value, item.itemType)}
                          className="text-blue-400 hover:text-blue-300 flex items-center transition-colors"
                        >
                          Use suggestion: {formatCurrency(item.suggestion.value)}
                          <ChevronRight className="w-3 h-3 ml-1" />
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
      
      {/* Summary */}
      <div className="mt-4 pt-4 border-t border-gray-700">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-400">
            {draft.size} unsaved changes
          </span>
          <span className="text-blue-400">
            Press Tab to navigate • Enter to save
          </span>
        </div>
      </div>
    </div>
  );
};

export default QuickUpdatePanel;