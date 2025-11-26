import React from 'react';
import { Edit3, Trash2, Banknote } from 'lucide-react';
import { formatCurrency } from '@/utils/formatters';
import { getLiabilityTypeConfig } from '../../config';

/**
 * Liability table row
 */
const LiabilityRow = ({
  liability,
  index,
  isSelected,
  onToggleSelection,
  onEdit,
  onDelete,
  showValues
}) => {
  const typeConfig = getLiabilityTypeConfig(liability.liability_type);
  const Icon = typeConfig?.icon || Banknote;
  const balance = parseFloat(liability.current_balance || 0);
  const interestRate = parseFloat(liability.interest_rate || 0);

  return (
    <tr
      className={`
        border-b border-gray-800 transition-all duration-200
        ${isSelected
          ? 'bg-rose-500/10 hover:bg-rose-500/20'
          : 'hover:bg-gray-800'
        }
      `}
    >
      <td className="w-12 px-4 py-3">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={(e) => onToggleSelection(liability.id, index, e.shiftKey)}
          className="w-4 h-4 text-rose-400 border-gray-600 rounded focus:ring-red-500"
        />
      </td>

      <td className="px-4 py-3">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-lg bg-rose-500/20">
            <Icon className="w-4 h-4 text-rose-400" />
          </div>
          <div>
            <div className="font-medium text-white">{liability.name}</div>
            <div className="text-sm text-gray-500">{typeConfig?.label}</div>
          </div>
        </div>
      </td>

      <td className="px-4 py-3 text-sm text-white text-right">
        {showValues ? `-${formatCurrency(balance)}` : '••••'}
      </td>

      <td className="px-4 py-3 text-sm text-white text-right">
        {interestRate.toFixed(2)}%
      </td>

      <td className="px-4 py-3 text-sm text-white text-right">
        {showValues && liability.minimum_payment ? formatCurrency(liability.minimum_payment) : '-'}
      </td>

      <td className="px-4 py-3 text-sm text-white">
        {liability.due_date ? new Date(liability.due_date).toLocaleDateString() : '-'}
      </td>

      <td className="px-4 py-3">
        <div className="flex items-center justify-end space-x-2">
          <button
            onClick={() => onEdit(liability)}
            className="p-1.5 text-gray-500 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-all"
            title="Edit"
          >
            <Edit3 className="w-4 h-4" />
          </button>
          <button
            onClick={() => onDelete(liability)}
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

export default LiabilityRow;
