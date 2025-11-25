// Searchable Input Component for QuickStart Modal
// Used for ticker/symbol search and institution search
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import ReactDOM from 'react-dom';
import { ChevronDown, Check, Plus, Loader2, X, Search, Keyboard, Building2, TrendingUp } from 'lucide-react';
import { formatCurrency } from '@/utils/formatters';

export default function SearchableInput({
  value,
  onChange,
  onSelect,
  placeholder = 'Type to search...',
  options = [],
  searchResults = [],
  isSearching = false,
  showLogos = false,
  showPrices = false,
  showEnhancedSecurityInfo = false,
  allowCustom = true,
  transform,
  disabled = false,
  className = '',
  minWidth = 200,
  onFocus,
  onBlur
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value || '');
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);

  // Sync internal value with prop
  useEffect(() => {
    setInputValue(value || '');
  }, [value]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      const isDropdownClick = e.target.closest('[data-dropdown-portal="true"]');
      if (inputRef.current && !inputRef.current.contains(e.target) && !isDropdownClick) {
        setIsOpen(false);
        // Commit value on blur
        if (inputValue !== value) {
          onChange(inputValue);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [inputValue, value, onChange]);

  // Reset highlighted index when results change
  useEffect(() => {
    setHighlightedIndex(0);
  }, [searchResults, options]);

  const handleInputChange = useCallback((e) => {
    let newValue = e.target.value;
    if (transform === 'uppercase') {
      newValue = newValue.toUpperCase();
    }
    setInputValue(newValue);
    onChange(newValue);
    if (!isOpen) setIsOpen(true);
  }, [onChange, transform, isOpen]);

  const handleKeyDown = useCallback((e) => {
    const items = searchResults.length > 0 ? searchResults : options;

    switch (e.key) {
      case 'Enter':
        e.preventDefault();
        if (isOpen && items.length > 0 && highlightedIndex < items.length) {
          handleSelect(items[highlightedIndex]);
        } else if (allowCustom && inputValue) {
          onChange(inputValue);
          setIsOpen(false);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        break;
      case 'ArrowDown':
        e.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
        } else {
          setHighlightedIndex(prev =>
            prev < items.length - 1 ? prev + 1 : prev
          );
        }
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => prev > 0 ? prev - 1 : 0);
        break;
      case 'Tab':
        if (isOpen) {
          setIsOpen(false);
          if (inputValue !== value) {
            onChange(inputValue);
          }
        }
        break;
    }
  }, [isOpen, searchResults, options, highlightedIndex, allowCustom, inputValue, value, onChange]);

  const handleSelect = useCallback((item) => {
    const selectedValue = item.name || item.ticker || item.symbol || item.value;
    setInputValue(selectedValue);
    onChange(selectedValue);
    if (onSelect) {
      onSelect(item);
    }
    setIsOpen(false);
  }, [onChange, onSelect]);

  const handleFocus = useCallback((e) => {
    setIsOpen(true);
    onFocus?.(e);
  }, [onFocus]);

  const handleBlur = useCallback((e) => {
    onBlur?.(e);
  }, [onBlur]);

  // Determine which items to show
  const displayItems = searchResults.length > 0 ? searchResults : options;
  const hasItems = displayItems.length > 0;
  const showDropdown = isOpen && (hasItems || (allowCustom && inputValue));

  // Get selected item for logo display
  const selectedItem = options.find(opt =>
    opt.name === value || opt.value === value
  );

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          disabled={disabled}
          className={`
            w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white
            placeholder-gray-500 transition-all duration-200
            hover:border-gray-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20
            disabled:opacity-50 disabled:cursor-not-allowed
            ${showLogos && selectedItem?.logo ? 'pl-10' : ''}
            ${isSearching ? 'pr-10' : 'pr-8'}
          `}
        />

        {/* Logo display */}
        {showLogos && selectedItem?.logo && (
          <img
            src={selectedItem.logo}
            alt={selectedItem.name}
            className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded pointer-events-none"
            onError={(e) => { e.target.style.display = 'none'; }}
          />
        )}

        {/* Loading or chevron indicator */}
        <div className="absolute right-0 top-0 bottom-0 flex items-center pr-2">
          {isSearching ? (
            <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
          ) : (
            <button
              type="button"
              onClick={() => setIsOpen(!isOpen)}
              className="p-1 hover:bg-gray-700/60 rounded transition-colors"
              tabIndex={-1}
            >
              <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>
          )}
        </div>
      </div>

      {/* Dropdown Portal */}
      {showDropdown && inputRef.current && (
        <DropdownPortal
          anchorRef={inputRef}
          onClose={() => setIsOpen(false)}
          minWidth={minWidth}
        >
          {/* Search header for securities */}
          {showEnhancedSecurityInfo && displayItems.length > 0 && (
            <div className="px-3 py-2 bg-gradient-to-r from-blue-900/50 to-indigo-900/50 border-b border-blue-800">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-blue-300 flex items-center">
                  <Search className="w-3 h-3 mr-1.5" />
                  {displayItems.length} Result{displayItems.length !== 1 ? 's' : ''}
                </span>
                <span className="text-blue-400">Click to select</span>
              </div>
            </div>
          )}

          <div className="max-h-80 overflow-y-auto">
            {/* Custom value option */}
            {allowCustom && inputValue && !displayItems.some(item =>
              (item.name || item.ticker || item.symbol || item.value)?.toLowerCase() === inputValue.toLowerCase()
            ) && (
              <button
                type="button"
                onClick={() => {
                  onChange(inputValue);
                  setIsOpen(false);
                }}
                className="w-full px-3 py-2 flex items-center bg-blue-500/10 hover:bg-blue-500/20 transition-colors border-b border-gray-700"
              >
                <Plus className="w-4 h-4 mr-3 text-blue-400" />
                <span className="text-sm text-blue-300 font-medium">
                  Use "{inputValue}" {showLogos ? '(custom)' : ''}
                </span>
              </button>
            )}

            {/* Search results or options */}
            {displayItems.slice(0, 20).map((item, idx) => {
              const displayName = item.name || item.ticker || item.symbol || item.value || item.label;
              const isSelected = displayName === value || item.value === value;
              const isHighlighted = idx === highlightedIndex;

              return (
                <button
                  key={item.id || item.value || idx}
                  type="button"
                  onClick={() => handleSelect(item)}
                  onMouseEnter={() => setHighlightedIndex(idx)}
                  className={`
                    w-full px-3 py-2 flex items-center transition-colors
                    ${isSelected ? 'bg-blue-500/10' : ''}
                    ${isHighlighted ? 'bg-gray-700' : 'hover:bg-gray-700/60'}
                  `}
                >
                  {/* Logo */}
                  {showLogos && item.logo && (
                    <img
                      src={item.logo}
                      alt={displayName}
                      className="w-5 h-5 mr-3 rounded"
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                  )}

                  {/* Content */}
                  <div className="flex-1 text-left min-w-0">
                    <div className="flex items-center justify-between">
                      <div className="min-w-0">
                        <span className="text-sm text-white font-medium">
                          {item.ticker || item.symbol || ''}
                          {(item.ticker || item.symbol) && item.name && ' - '}
                        </span>
                        <span className="text-sm text-gray-300 truncate">
                          {item.name || item.label || displayName}
                        </span>
                      </div>
                      {showPrices && item.price != null && (
                        <span className="text-sm text-emerald-400 ml-2 flex-shrink-0">
                          {formatCurrency(item.price)}
                        </span>
                      )}
                    </div>
                    {item.asset_type && (
                      <div className="text-xs text-gray-500">
                        {item.asset_type}
                      </div>
                    )}
                  </div>

                  {/* Selected check */}
                  {isSelected && (
                    <Check className="w-4 h-4 text-blue-400 ml-2 flex-shrink-0" />
                  )}
                </button>
              );
            })}

            {/* No results message */}
            {displayItems.length === 0 && !allowCustom && (
              <div className="px-3 py-4 text-center text-gray-400 text-sm">
                No results found
              </div>
            )}
          </div>

          {/* Footer hint */}
          {allowCustom && (
            <div className="p-2 border-t border-gray-700 bg-gray-900/70">
              <p className="text-xs text-gray-400 text-center">
                {showPrices
                  ? 'Type symbol and select to auto-fill price'
                  : 'Type to search or enter custom value'}
              </p>
            </div>
          )}
        </DropdownPortal>
      )}
    </div>
  );
}

// Dropdown Portal Component with minimum width support
function DropdownPortal({ anchorRef, children, onClose, minWidth = 200 }) {
  const [position, setPosition] = useState({ top: 0, left: 0, width: 0 });

  useEffect(() => {
    if (!anchorRef.current) return;

    const updatePosition = () => {
      const rect = anchorRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const viewportWidth = window.innerWidth;
      const spaceBelow = viewportHeight - rect.bottom;
      const dropdownHeight = 400; // Increased for better visibility
      const shouldShowAbove = spaceBelow < dropdownHeight && rect.top > dropdownHeight;

      // Calculate width - use minimum width or input width, whichever is larger
      const dropdownWidth = Math.max(rect.width, minWidth);

      // Adjust left position to keep dropdown in viewport
      let leftPos = rect.left;
      if (leftPos + dropdownWidth > viewportWidth - 10) {
        leftPos = Math.max(10, viewportWidth - dropdownWidth - 10);
      }

      setPosition({
        top: shouldShowAbove ? 'auto' : rect.bottom + 4,
        bottom: shouldShowAbove ? viewportHeight - rect.top + 4 : 'auto',
        left: leftPos,
        width: dropdownWidth
      });
    };

    updatePosition();
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);

    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [anchorRef, minWidth]);

  return ReactDOM.createPortal(
    <div
      data-dropdown-portal="true"
      style={{
        position: 'fixed',
        top: position.top !== 'auto' ? `${position.top}px` : undefined,
        bottom: position.bottom !== 'auto' ? `${position.bottom}px` : undefined,
        left: `${position.left}px`,
        width: `${position.width}px`,
        zIndex: 9999999,
        pointerEvents: 'auto'
      }}
      className="bg-gray-900 border-2 border-blue-500/30 rounded-xl shadow-2xl overflow-hidden"
      onClick={(e) => e.stopPropagation()}
    >
      {children}
    </div>,
    document.body
  );
}

// Specialized variant for institution search
export function InstitutionSearchInput({
  value,
  onChange,
  onSelect,
  institutions = [],
  placeholder = 'Search or type institution...',
  disabled = false,
  className = ''
}) {
  return (
    <SearchableInput
      value={value}
      onChange={onChange}
      onSelect={onSelect}
      placeholder={placeholder}
      options={institutions}
      showLogos={true}
      showPrices={false}
      allowCustom={true}
      disabled={disabled}
      className={className}
    />
  );
}

// Specialized variant for ticker/symbol search
export function SecuritySearchInput({
  value,
  onChange,
  onSelect,
  searchResults = [],
  isSearching = false,
  placeholder = 'Enter ticker...',
  disabled = false,
  className = ''
}) {
  return (
    <SearchableInput
      value={value}
      onChange={onChange}
      onSelect={onSelect}
      placeholder={placeholder}
      searchResults={searchResults}
      isSearching={isSearching}
      showLogos={false}
      showPrices={true}
      allowCustom={true}
      transform="uppercase"
      disabled={disabled}
      className={className}
    />
  );
}
