import React from 'react';
import { ASSET_TYPES, normalizeAssetType } from '../../config';

/**
 * Asset type filter buttons
 */
const AssetTypeFilter = ({
  positions,
  selectedAssetTypes,
  setSelectedAssetTypes
}) => {
  return (
    <div className="flex items-center space-x-2">
      {Object.entries(ASSET_TYPES).map(([key, config]) => {
        const count = positions.filter(p => {
          const assetType = normalizeAssetType(p.asset_type || p.item_type);
          return assetType === key;
        }).length;
        const isSelected = selectedAssetTypes.has(key);

        return (
          <button
            key={key}
            onClick={() => {
              const newSet = new Set(selectedAssetTypes);
              if (isSelected) {
                newSet.delete(key);
              } else {
                newSet.add(key);
              }
              setSelectedAssetTypes(newSet);
            }}
            className={`
              inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-medium
              transition-all duration-200 transform hover:scale-105
              ${isSelected
                ? `${config.color.bg} text-white shadow-sm`
                : `${config.color.lightBg} ${config.color.text} ${config.color.hover}`
              }
            `}
          >
            <config.icon className="w-3.5 h-3.5 mr-1.5" />
            {config.name}
            {count > 0 && (
              <span className={`
                ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold
                ${isSelected ? 'bg-gray-900/20' : 'bg-gray-800/10'}
              `}>
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};

export default AssetTypeFilter;
