import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, Check, SlidersHorizontal } from 'lucide-react';

/**
 * Enhanced dropdown for selecting single options (like grouping)
 */
const EnhancedDropdown = ({
  title,
  options,
  selectedOption,
  onChange,
  icon: DropdownIcon = SlidersHorizontal,
  width = 'w-56'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedItem = options.find(item => item.id === selectedOption);
  const Icon = selectedItem?.icon || DropdownIcon;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`
          flex items-center px-4 py-2 bg-gray-900 rounded-lg shadow-sm
          transition-all duration-200 text-sm border
          ${isOpen ? 'ring-2 ring-blue-500 border-blue-500/50 shadow-md' : 'border-gray-700 hover:border-gray-600'}
          transform hover:scale-[1.02] active:scale-[0.98]
        `}
      >
        <Icon className={`w-4 h-4 mr-2 transition-transform duration-200 ${isOpen ? 'rotate-12' : ''}`} />
        <span className="font-medium whitespace-nowrap">{selectedItem?.name || title}</span>
        <ChevronDown className={`w-4 h-4 ml-3 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className={`absolute z-50 right-0 mt-2 ${width} bg-gray-900 border border-gray-700 rounded-xl shadow-2xl animate-in slide-in-from-top-2 duration-200 overflow-hidden`}>
          <div className="p-3 border-b border-gray-800 bg-gradient-to-r from-gray-900 to-gray-800">
            <div className="flex items-center space-x-2">
              <DropdownIcon className="w-4 h-4 text-gray-300" />
              <span className="text-sm font-semibold text-gray-200">{title}</span>
            </div>
          </div>

          <div className="max-h-64 overflow-y-auto p-2">
            {options.map(option => {
              const OptionIcon = option.icon;
              const isSelected = option.id === selectedOption;

              return (
                <button
                  key={option.id}
                  onClick={() => {
                    onChange(option.id);
                    setIsOpen(false);
                  }}
                  className={`
                    w-full px-3 py-2.5 flex items-center justify-between rounded-lg
                    transition-all duration-200 text-sm group
                    ${isSelected
                      ? 'bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30'
                      : 'hover:bg-gray-800 border border-transparent'
                    }
                  `}
                >
                  <div className="flex items-center flex-1 mr-2">
                    <div className={`
                      w-5 h-5 rounded-md border-2 mr-3 flex items-center justify-center
                      transition-all duration-200 group-hover:scale-110
                      ${isSelected
                        ? 'bg-blue-600 border-blue-600 shadow-sm'
                        : 'border-gray-600 group-hover:border-gray-400'
                      }
                    `}>
                      {isSelected && <Check className="w-3 h-3 text-white" />}
                    </div>
                    <div className="flex items-center flex-1">
                      {OptionIcon && (
                        <OptionIcon className={`w-4 h-4 mr-2 ${isSelected ? 'text-blue-400' : 'text-gray-500'}`} />
                      )}
                      <span className={`font-medium ${isSelected ? 'text-white' : 'text-gray-400'}`}>
                        {option.name}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default EnhancedDropdown;
