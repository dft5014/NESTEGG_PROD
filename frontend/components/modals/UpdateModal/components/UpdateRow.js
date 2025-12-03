// Update Row Component for Update Modal
import React, { memo, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Building2, Clock, AlertCircle } from 'lucide-react';
import { formatCurrency } from '@/utils/formatters';
import CurrencyInput from './CurrencyInput';
import { getItemTypeConfig } from '../config';

/**
 * Parse and format timestamps
 */
const parseTimestamp = (ts) => {
  if (!ts) return null;
  if (ts instanceof Date) return isNaN(ts.getTime()) ? null : ts;

  if (typeof ts === 'number') {
    const ms = ts > 1e12 ? ts : ts * 1000;
    const d = new Date(ms);
    return isNaN(d.getTime()) ? null : d;
  }

  let s = String(ts).trim();
  if (!s) return null;

  s = s.replace(' ', 'T').replace(/(\.\d{3})\d+/, '$1');
  if (!/[zZ]|[+\-]\d{2}:\d{2}$/.test(s)) s += 'Z';

  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
};

const formatAge = (ts) => {
  const d = parseTimestamp(ts);
  if (!d) return null;

  const diff = Date.now() - d.getTime();
  if (diff < 0) return '0m';

  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m`;

  const hrs = Math.floor(mins / 60);
  if (hrs < 48) return `${hrs}h`;

  const days = Math.floor(hrs / 24);
  return `${days}d`;
};

const formatLocalTime = (ts) => {
  const d = parseTimestamp(ts);
  return d ? d.toLocaleString(undefined, {
    hour12: true,
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  }) : null;
};

/**
 * Individual update row with inline editing
 */
const UpdateRow = memo(({
  row,
  index,
  draftValue,
  onValueChange,
  nextInputId,
  getInstitutionLogo,
  showValues = true,
  isFailed = false,
  isNew = false
}) => {
  const typeConfig = getItemTypeConfig(row._kind);

  // Calculate delta
  const delta = useMemo(() => {
    if (draftValue == null) return 0;
    return draftValue - row.currentValue;
  }, [draftValue, row.currentValue]);

  const pct = useMemo(() => {
    if (delta === 0 || row.currentValue === 0) return 0;
    return (delta / Math.abs(row.currentValue)) * 100;
  }, [delta, row.currentValue]);

  const hasChange = delta !== 0;
  const age = formatAge(row.lastUpdate);
  const localTime = formatLocalTime(row.lastUpdate);
  const logo = getInstitutionLogo?.(row.institution);

  return (
    <motion.tr
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.15, delay: index * 0.02 }}
      className={`
        group relative transition-colors duration-150
        ${hasChange
          ? 'bg-blue-500/5 hover:bg-blue-500/10'
          : 'hover:bg-gray-800/30'
        }
      `}
    >
      {/* Change indicator */}
      {hasChange && (
        <td className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500 rounded-r" />
      )}

      {/* Institution */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          {logo ? (
            <img src={logo} alt={row.institution} className="w-6 h-6 rounded object-contain" />
          ) : (
            <Building2 className="w-5 h-5 text-gray-500" />
          )}
          <span className="text-sm font-medium text-gray-200 truncate max-w-[120px]">
            {row.institution}
          </span>
        </div>
      </td>

      {/* Name */}
      <td className="px-3 py-3">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-200">{row.name}</span>

          {/* Badges */}
          <div className="flex items-center gap-1">
            {isNew && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                NEW
              </span>
            )}
            {isFailed && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> Failed
              </span>
            )}
          </div>
        </div>
        {row.sub && (
          <div className="text-xs text-gray-500 mt-0.5 truncate max-w-[180px]">{row.sub}</div>
        )}
      </td>

      {/* Identifier */}
      <td className="px-3 py-3">
        <span className="text-sm text-gray-400 truncate max-w-[100px] block">
          {row.identifier || '-'}
        </span>
      </td>

      {/* Type badge */}
      <td className="px-3 py-3">
        <span className={`
          inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-full
          ${typeConfig.color.badge} border
        `}>
          {React.createElement(typeConfig.icon, { className: 'w-3 h-3' })}
          {typeConfig.name}
        </span>
      </td>

      {/* Last updated */}
      <td className="px-3 py-3">
        {row.lastUpdate ? (
          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            <Clock className="w-3 h-3" />
            <span title={localTime}>{age || '-'}</span>
          </div>
        ) : (
          <span className="text-xs text-gray-500">-</span>
        )}
      </td>

      {/* Current value */}
      <td className="px-3 py-3 text-right">
        <span className="text-sm text-gray-300 tabular-nums">
          {showValues ? formatCurrency(row.currentValue) : '••••'}
        </span>
      </td>

      {/* Input */}
      <td className="px-3 py-3">
        <CurrencyInput
          id={`update-input-${row._key}`}
          value={draftValue != null ? draftValue : row.currentValue}
          originalValue={row.currentValue}
          onValueChange={(v) => onValueChange(row._key, v)}
          nextFocusId={nextInputId}
          showDelta={false}
          aria-label={`New value for ${row.name}`}
          className={hasChange ? 'border-blue-500' : ''}
        />
      </td>

      {/* Delta */}
      <td className="px-3 py-3 text-right">
        <span className={`text-sm font-medium tabular-nums ${
          delta > 0 ? 'text-emerald-400' : delta < 0 ? 'text-rose-400' : 'text-gray-500'
        }`}>
          {showValues
            ? delta !== 0
              ? `${delta > 0 ? '+' : ''}${formatCurrency(delta)}`
              : '-'
            : '••••'
          }
        </span>
      </td>

      {/* Percent change */}
      <td className="px-3 py-3 text-right">
        <span className={`text-sm tabular-nums ${
          pct > 0 ? 'text-emerald-400' : pct < 0 ? 'text-rose-400' : 'text-gray-500'
        }`}>
          {row.currentValue === 0
            ? '-'
            : pct !== 0
              ? `${pct > 0 ? '+' : ''}${pct.toFixed(1)}%`
              : '-'
          }
        </span>
      </td>
    </motion.tr>
  );
});

UpdateRow.displayName = 'UpdateRow';

export default UpdateRow;
