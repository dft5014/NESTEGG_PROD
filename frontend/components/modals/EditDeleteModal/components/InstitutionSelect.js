import React, { useState, useEffect, useMemo, useRef } from 'react';
import { popularBrokerages } from '@/utils/constants';

/**
 * Searchable institution dropdown with logos
 */
const InstitutionSelect = ({
  value,
  onChange,
  placeholder = 'Type to search...',
  className = ''
}) => {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState(value || '');
  const wrapRef = useRef(null);

  useEffect(() => setInput(value || ''), [value]);

  useEffect(() => {
    const onDocClick = (e) => {
      if (!wrapRef.current?.contains(e.target)) {
        setOpen(false);
        // Commit any custom text when closing
        if (input && input !== value) onChange(input);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [input, value, onChange]);

  const filtered = useMemo(() => {
    if (!input) return popularBrokerages;
    const q = input.toLowerCase();
    return popularBrokerages.filter(b => b.name.toLowerCase().includes(q));
  }, [input]);

  const selected = popularBrokerages.find(b => b.name === value);

  return (
    <div ref={wrapRef} className={`relative ${className}`}>
      <div className="relative">
        <input
          type="text"
          value={input}
          onFocus={() => setOpen(true)}
          onChange={(e) => { setInput(e.target.value); setOpen(true); }}
          placeholder={placeholder}
          className="w-full px-3 py-2 bg-gray-900 text-white placeholder-gray-500 border border-gray-600 rounded-lg hover:border-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all pr-10"
          style={{ paddingLeft: selected?.logo ? '2.5rem' : undefined }}
        />
        {selected?.logo && (
          <img
            src={selected.logo}
            alt={selected.name}
            className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded pointer-events-none"
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
          />
        )}
        <button
          type="button"
          className="absolute right-0 top-0 bottom-0 px-3 flex items-center justify-center hover:bg-gray-800 rounded-r-lg transition-colors"
          onClick={() => setOpen(o => !o)}
        >
          <svg
            className={`w-4 h-4 text-gray-500 transition-transform ${open ? 'rotate-180' : ''}`}
            viewBox="0 0 24 24"
            fill="none"
          >
            <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      {open && (
        <div className="absolute z-50 mt-1 w-full bg-gray-900 border border-gray-700 rounded-lg shadow-xl max-h-64 overflow-y-auto">
          {/* "Use custom" row when input not an exact match */}
          {input && !popularBrokerages.find(b => b.name.toLowerCase() === input.toLowerCase()) && (
            <button
              type="button"
              onClick={() => { onChange(input); setOpen(false); }}
              className="w-full px-3 py-2 flex items-center bg-blue-500/10 hover:bg-blue-500/20 transition-colors border-b border-gray-800 text-left"
            >
              <span className="text-sm text-blue-400 font-medium">Use "{input}" (custom)</span>
            </button>
          )}

          {filtered.map((b) => (
            <button
              key={b.name}
              type="button"
              onClick={() => { onChange(b.name); setInput(b.name); setOpen(false); }}
              className={`w-full px-3 py-2 flex items-center hover:bg-gray-800 transition-colors text-left ${value === b.name ? 'bg-blue-500/10' : ''}`}
            >
              {b.logo && (
                <img
                  src={b.logo}
                  alt={b.name}
                  className="w-5 h-5 mr-3 rounded"
                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                />
              )}
              <span className="text-sm text-white">{b.name}</span>
              {value === b.name && (
                <svg className="w-4 h-4 text-blue-400 ml-auto" viewBox="0 0 24 24" fill="none">
                  <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </button>
          ))}

          <div className="p-2 border-t border-gray-800 bg-gray-800 text-center">
            <p className="text-xs text-gray-500">Select an institution or type a custom name</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default InstitutionSelect;
