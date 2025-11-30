import { BarChart3, Coins, Gem, Home, DollarSign } from 'lucide-react';

/**
 * Asset type configuration for positions
 * Defines display properties and editable fields for each asset type
 */
export const ASSET_TYPES = {
  security: {
    name: 'Securities',
    icon: BarChart3,
    color: {
      main: 'blue',
      bg: 'bg-blue-600',
      lightBg: 'bg-blue-500/10',
      border: 'border-blue-500/30',
      text: 'text-blue-400',
      hover: 'hover:bg-blue-500/20',
      gradient: 'from-blue-500 to-blue-600'
    },
    fields: ['ticker', 'name', 'shares', 'price', 'cost_basis', 'purchase_date'],
    editableFields: ['shares', 'cost_basis', 'purchase_date']
  },
  crypto: {
    name: 'Crypto',
    icon: Coins,
    color: {
      main: 'orange',
      bg: 'bg-orange-600',
      lightBg: 'bg-orange-500/10',
      border: 'border-orange-500/50',
      text: 'text-orange-400',
      hover: 'hover:bg-orange-500/20',
      gradient: 'from-orange-500 to-orange-600'
    },
    fields: ['symbol', 'quantity', 'purchase_price', 'current_price', 'purchase_date'],
    editableFields: ['quantity', 'purchase_price', 'purchase_date']
  },
  metal: {
    name: 'Metals',
    icon: Gem,
    color: {
      main: 'yellow',
      bg: 'bg-yellow-600',
      lightBg: 'bg-yellow-500/10',
      border: 'border-yellow-500/50',
      text: 'text-yellow-400',
      hover: 'hover:bg-yellow-500/20',
      gradient: 'from-yellow-500 to-yellow-600'
    },
    fields: ['metal_type', 'quantity', 'purchase_price', 'current_price_per_unit', 'purchase_date'],
    editableFields: ['quantity', 'purchase_price', 'purchase_date']
  },
  otherAssets: {
    name: 'Other Assets',
    icon: Home,
    color: {
      main: 'green',
      bg: 'bg-green-600',
      lightBg: 'bg-emerald-500/10',
      border: 'border-emerald-500/30',
      text: 'text-emerald-400',
      hover: 'hover:bg-emerald-500/20',
      gradient: 'from-emerald-500 to-green-600'
    },
    fields: ['asset_name', 'asset_type', 'cost', 'current_value', 'purchase_date', 'notes'],
    editableFields: ['asset_name', 'asset_type', 'cost', 'current_value', 'purchase_date', 'notes']
  },
  cash: {
    name: 'Cash',
    icon: DollarSign,
    color: {
      main: 'purple',
      bg: 'bg-purple-600',
      lightBg: 'bg-purple-500/10',
      border: 'border-purple-200',
      text: 'text-purple-400',
      hover: 'hover:bg-purple-500/20',
      gradient: 'from-purple-500 to-purple-600'
    },
    fields: ['currency', 'amount', 'account_type', 'interest_rate'],
    editableFields: ['amount', 'interest_rate']
  }
};

/**
 * Field labels for display
 */
export const FIELD_LABELS = {
  shares: 'Shares',
  cost_basis: 'Cost Basis (per share)',
  purchase_date: 'Purchase Date',
  quantity: 'Quantity',
  purchase_price: 'Purchase Price (per unit)',
  asset_name: 'Asset Name',
  asset_type: 'Asset Type',
  cost: 'Total Cost',
  current_value: 'Current Value',
  notes: 'Notes',
  amount: 'Cash Amount',
  interest_rate: 'Interest Rate (%)',
  ticker: 'Ticker',
  name: 'Name',
  symbol: 'Symbol',
  metal_type: 'Metal Type',
  currency: 'Currency',
  current_price: 'Current Price',
  current_price_per_unit: 'Current Price'
};

/**
 * Other asset subtypes
 */
export const OTHER_ASSET_SUBTYPES = [
  { value: 'real_estate', label: 'Real Estate' },
  { value: 'vehicle', label: 'Vehicle' },
  { value: 'collectible', label: 'Collectible' },
  { value: 'jewelry', label: 'Jewelry' },
  { value: 'art', label: 'Art' },
  { value: 'equipment', label: 'Equipment' },
  { value: 'other', label: 'Other' }
];

/**
 * Normalize asset type to standard key
 */
export const normalizeAssetType = (assetType) => {
  const otherAssetTypes = [
    'other_asset', 'other_assets', 'real_estate', 'vehicle',
    'collectible', 'jewelry', 'art', 'equipment', 'other', 'otherAsset'
  ];

  if (otherAssetTypes.includes(assetType)) {
    return 'otherAssets';
  }

  return assetType;
};

/**
 * Get asset type config with fallback
 */
export const getAssetTypeConfig = (assetType) => {
  const normalized = normalizeAssetType(assetType);
  return ASSET_TYPES[normalized] || {
    name: 'Unknown',
    icon: Home,
    color: {
      main: 'gray',
      bg: 'bg-gray-600',
      lightBg: 'bg-gray-500/10',
      border: 'border-gray-500/30',
      text: 'text-gray-400',
      hover: 'hover:bg-gray-500/20',
      gradient: 'from-gray-500 to-gray-600'
    },
    fields: [],
    editableFields: []
  };
};
