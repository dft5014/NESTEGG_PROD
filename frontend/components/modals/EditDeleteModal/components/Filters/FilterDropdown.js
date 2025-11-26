import React, { useState, useEffect, useMemo, useRef } from 'react';
import { ChevronDown, Check, Search, Activity } from 'lucide-react';

/**
 * Multi-select filter dropdown with search
 */
const FilterDropdown = ({
  title,
  icon: Icon,
  options,
  selected,
  onChange,
  showCounts = true,
  colorConfig = null
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef(null);
  const searchInputRef = useRef(null);

  // Filter options based on search
  const filteredOptions = useMemo(() => {
    if (!searchQuery) return options;
    const query = searchQuery.toLowerCase();
    return options.filter(opt =>
      opt.label?.toLowerCase().includes(query) ||
      opt.institution?.toLowerCase().includes(query) ||
      opt.categoryName?.toLowerCase().includes(query)
    );
  }, [options, searchQuery]);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    } else {
      setSearchQuery('');
    }
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedCount = selected.size;
  const isAllSelected = selectedCount === 0 || selectedCount === options.length;

  const handleSelectAll = () => {
    onChange(new Set(options.map(opt => opt.value)));
  };

  const handleSelectNone = () => {
    onChange(new Set());
  };

  const handleToggleOption = (value) => {
    const newSet = new Set(selected);
    if (newSet.has(value)) {
      newSet.delete(value);
    } else {
      newSet.add(value);
    }
    onChange(newSet);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`
          flex items-center px-4 py-2 bg-gray-900 rounded-lg shadow-sm
          transition-all duration-200 text-sm border
          ${isOpen ? 'ring-2 ring-blue-500 border-blue-500/50 shadow-md' : ''}
          ${selectedCount > 0 && !isAllSelected
            ? 'border-blue-500/50 text-blue-400 bg-blue-500/10 hover:bg-blue-500/20'
            : 'border-gray-700 text-gray-300 hover:bg-gray-800 hover:border-gray-600'
          }
          transform hover:scale-[1.02] active:scale-[0.98]
        `}
      >
        <Icon className={`w-4 h-4 mr-2 transition-transform duration-200 ${isOpen ? 'rotate-12' : ''}`} />
        <span className="font-medium">{title}</span>
        {selectedCount > 0 && !isAllSelected && (
          <span className="ml-2 px-2 py-0.5 bg-blue-600 text-white text-xs rounded-full font-bold animate-pulse">
            {selectedCount}
          </span>
        )}
        <ChevronDown className={`w-4 h-4 ml-3 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute z-50 right-0 mt-2 w-80 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl animate-in slide-in-from-top-2 duration-200 overflow-hidden">
          <div className="p-3 border-b border-gray-800 bg-gradient-to-r from-gray-900 to-gray-800">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <Icon className="w-5 h-5 text-gray-300" />
                <span className="text-sm font-semibold text-gray-200">{title}</span>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleSelectAll}
                  className="text-xs text-blue-400 hover:text-blue-400 font-medium px-2 py-1 hover:bg-blue-500/10 rounded transition-all duration-200"
                >
                  All
                </button>
                <button
                  onClick={handleSelectNone}
                  className="text-xs text-gray-400 hover:text-gray-300 font-medium px-2 py-1 hover:bg-gray-800 rounded transition-all duration-200"
                >
                  None
                </button>
              </div>
            </div>
            <div className="text-xs text-gray-500 flex items-center">
              <Activity className="w-3 h-3 mr-1" />
              {isAllSelected
                ? `Showing all ${options.length} ${title.toLowerCase()}`
                : `${selectedCount} of ${options.length} selected`
              }
            </div>
          </div>

          {/* Search bar */}
          <div className="p-2 border-b border-gray-800">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={`Search ${title.toLowerCase()}...`}
                className="w-full pl-9 pr-3 py-2 text-sm bg-gray-800 text-white placeholder-gray-500 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="max-h-64 overflow-y-auto p-2">
            {filteredOptions.map(option => {
              const isSelected = selected.has(option.value);
              const OptionIcon = option.icon;
              const color = colorConfig?.[option.value] || 'gray';

              return (
                <button
                  key={option.value}
                  onClick={() => handleToggleOption(option.value)}
                  className={`
                    w-full px-2 py-1.5 flex items-start rounded-lg
                    transition-all duration-200 text-sm group
                    ${isSelected
                      ? 'bg-gray-800 hover:bg-gray-750 border border-gray-600'
                      : 'hover:bg-gray-800 border border-transparent'
                    }
                  `}
                >
                  <div className="flex items-start flex-1 mr-2">
                    <div className={`
                      w-4 h-4 rounded border-2 mr-2 flex items-center justify-center mt-0.5 flex-shrink-0
                      transition-all duration-200 group-hover:scale-110
                      ${isSelected
                        ? `bg-${color}-600 border-${color}-600 shadow-sm`
                        : 'border-gray-600 group-hover:border-gray-400'
                      }
                    `}>
                      {isSelected && <Check className="w-3 h-3 text-white" />}
                    </div>

                    <div className="flex items-start flex-1">
                      {OptionIcon && (
                        <OptionIcon className={`w-4 h-4 mr-2 mt-0.5 flex-shrink-0 ${isSelected ? `text-${color}-400` : 'text-gray-500'}`} />
                      )}
                      <div className="flex flex-col items-start flex-1">
                        <span className={`font-medium text-left ${isSelected ? 'text-white' : 'text-gray-400'}`}>
                          {option.label}
                        </span>
                        {(option.institution || option.categoryName) && (
                          <div className="flex items-center space-x-2 mt-0.5">
                            {option.institution && (
                              <span className="text-[10px] text-gray-500 font-medium">
                                {option.institution}
                              </span>
                            )}
                            {option.institution && option.categoryName && (
                              <span className="text-[10px] text-gray-500">•</span>
                            )}
                            {option.categoryName && (
                              <span className={`text-[10px] font-medium text-${option.categoryColor || 'gray'}-400`}>
                                {option.categoryName}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  {showCounts && option.count !== undefined && (
                    <span className={`
                      px-2 py-1 rounded-full text-xs font-bold
                      ${isSelected
                        ? `bg-${color}-600 text-white`
                        : 'bg-gray-800 text-gray-400'
                      }
                    `}>
                      {option.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default FilterDropdown;
