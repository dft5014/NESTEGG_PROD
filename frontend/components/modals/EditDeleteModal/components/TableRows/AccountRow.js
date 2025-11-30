import React from 'react';
import { Edit3, Trash2, Building } from 'lucide-react';
import { formatCurrency } from '@/utils/formatters';
import { getCategoryConfig } from '../../config';
import InstitutionBadge from '../InstitutionBadge';

/**
 * Account table row
 */
const AccountRow = ({
  account,
  index,
  isSelected,
  onToggleSelection,
  onEdit,
  onDelete,
  showValues
}) => {
  const category = getCategoryConfig(account.category);
  const Icon = category?.icon || Building;
  const balance = account.totalValue || 0;

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
          onChange={(e) => onToggleSelection(account.id, index, e.shiftKey)}
          className="w-4 h-4 text-blue-400 border-gray-600 rounded focus:ring-blue-500"
        />
      </td>

      <td className="px-4 py-3">
        <div className="flex items-center space-x-3">
          <div className={`p-2 rounded-lg bg-${category?.color || 'gray'}-100`}>
            <Icon className={`w-4 h-4 text-${category?.color || 'gray'}-600`} />
          </div>
          <div>
            <div className="font-medium text-white">{account.name}</div>
            <div className="text-sm text-gray-500">{category?.name}</div>
          </div>
        </div>
      </td>

      <td className="px-4 py-3">
        <InstitutionBadge name={account.institution} />
      </td>

      <td className="px-4 py-3 text-sm text-white">
        {account.type}
      </td>

      <td className="px-4 py-3 text-sm text-white text-right">
        {showValues ? formatCurrency(balance) : '••••'}
      </td>

      <td className="px-4 py-3">
        <div className="flex items-center justify-end space-x-2">
          <button
            onClick={() => onEdit(account)}
            className="p-1.5 text-gray-500 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-all"
            title="Edit"
          >
            <Edit3 className="w-4 h-4" />
          </button>
          <button
            onClick={() => onDelete(account)}
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

export default AccountRow;
