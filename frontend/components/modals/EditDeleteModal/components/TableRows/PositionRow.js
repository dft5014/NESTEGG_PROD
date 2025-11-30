import React from 'react';
import { Edit3, Trash2, TrendingUp, TrendingDown, Package } from 'lucide-react';
import { formatCurrency } from '@/utils/formatters';
import { normalizeAssetType, getAssetTypeConfig } from '../../config';

/**
 * Position table row
 */
const PositionRow = ({
  position,
  index,
  isSelected,
  onToggleSelection,
  onEdit,
  onDelete,
  showValues
}) => {
  const assetType = normalizeAssetType(position.asset_type || position.item_type);
  const config = getAssetTypeConfig(assetType);
  const Icon = config.icon || Package;

  const value = parseFloat(position.current_value || 0);
  const cost = parseFloat(position.total_cost_basis || 0);
  const gainLoss = position.gain_loss_amt || (value - cost);
  const gainLossPercent = position.gain_loss_pct || (cost > 0 ? ((value - cost) / cost) * 100 : 0);

  return (
    <tr
      className={`
        border-b border-gray-800 transition-all duration-200
        ${isSelected
          ? 'bg-blue-500/10 hover:bg-blue-500/20'
          : 'hover:bg-gray-800'
        }
      `}
    >
      <td className="w-12 px-4 py-3">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={(e) => onToggleSelection(position.id, index, e.shiftKey)}
          className="w-4 h-4 text-blue-400 border-gray-600 rounded focus:ring-blue-500"
        />
      </td>

      <td className="px-4 py-3">
        <div className="flex items-center space-x-3">
          <div className={`p-2 rounded-lg ${config.color.lightBg}`}>
            <Icon className={`w-4 h-4 ${config.color.text}`} />
          </div>
          <div>
            <div className="font-medium text-white">
              {position.identifier || position.name || 'Unknown'}
            </div>
            <div className="text-sm text-gray-500">{position.name || config.name}</div>
          </div>
        </div>
      </td>

      <td className="px-4 py-3 text-sm text-white">
        {position.account_name || 'No Account'}
      </td>

      <td className="px-4 py-3 text-sm text-white text-right">
        {position.quantity || '-'}
      </td>

      <td className="px-4 py-3 text-sm text-white text-right">
        {showValues ? formatCurrency(value) : '••••'}
      </td>

      <td className="px-4 py-3 text-sm text-right">
        <div className={`
          flex items-center justify-end space-x-1
          ${gainLoss >= 0 ? 'text-emerald-400' : 'text-rose-400'}
        `}>
          {gainLoss >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
          <span>{showValues ? formatCurrency(Math.abs(gainLoss)) : '••••'}</span>
          <span className="text-xs">({gainLossPercent.toFixed(1)}%)</span>
        </div>
      </td>

      <td className="px-4 py-3">
        <div className="flex items-center justify-end space-x-2">
          <button
            onClick={() => onEdit(position)}
            className="p-1.5 text-gray-500 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-all"
            title="Edit"
          >
            <Edit3 className="w-4 h-4" />
          </button>
          <button
            onClick={() => onDelete(position)}
            className="p-1.5 text-gray-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all"
            title="Delete"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </td>
    </tr>
  );
};

export default PositionRow;
