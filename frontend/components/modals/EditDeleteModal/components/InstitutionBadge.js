import React, { useMemo } from 'react';
import { popularBrokerages } from '@/utils/constants';

/**
 * Display institution name with logo if available
 */
const InstitutionBadge = ({ name, className = '' }) => {
  const match = useMemo(() => {
    const n = String(name || '').trim().toLowerCase();
    return popularBrokerages.find(b => b.name.toLowerCase() === n);
  }, [name]);

  if (!name) {
    return <span className="text-gray-500">—</span>;
  }

  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      {match?.logo && (
        <img
          src={match.logo}
          alt={match.name}
          className="w-5 h-5 rounded"
          onError={(e) => { e.currentTarget.style.display = 'none'; }}
        />
      )}
      <span className="text-gray-200">{name}</span>
    </span>
  );
};

export default InstitutionBadge;
