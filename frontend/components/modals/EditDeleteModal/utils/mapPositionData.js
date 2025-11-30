import { normalizeAssetType } from '../config';

/**
 * Map position data from API/DataStore format to form format
 */
export const mapPositionToFormData = (position, assetType) => {
  const normalizedType = normalizeAssetType(assetType);

  const baseData = {
    ...position,
    purchase_date: position.purchase_date ? position.purchase_date.split('T')[0] : ''
  };

  switch (normalizedType) {
    case 'security':
      return {
        ...baseData,
        ticker: position.identifier || '',
        name: position.name || '',
        shares: position.quantity || '',
        price: position.current_price_per_unit || '',
        cost_basis: position.cost_per_unit || ''
      };

    case 'crypto':
      return {
        ...baseData,
        symbol: position.identifier || '',
        quantity: position.quantity || '',
        purchase_price: position.cost_per_unit || (position.cost_basis / (position.quantity || 1)) || '',
        current_price: position.current_price || position.current_price_per_unit || ''
      };

    case 'metal':
      return {
        ...baseData,
        metal_type: position.identifier || position.name || '',
        quantity: position.quantity || '',
        purchase_price: position.cost_per_unit || (position.cost_basis / (position.quantity || 1)) || '',
        current_price_per_unit: position.current_price || position.current_price_per_unit || ''
      };

    case 'otherAssets':
      return {
        ...baseData,
        asset_name: position.identifier || position.name || '',
        asset_type: position.asset_type || 'other',
        cost: position.total_cost_basis || 0,
        current_value: position.current_value || 0,
        notes: position.notes || ''
      };

    case 'cash':
      return {
        ...baseData,
        currency: position.identifier || 'USD',
        amount: position.current_value || position.quantity || '',
        account_type: position.account_type || '',
        interest_rate: position.interest_rate || 0
      };

    default:
      return baseData;
  }
};

/**
 * Map form data back to API format for saving
 */
export const mapFormDataToPosition = (formData, originalPosition, assetType) => {
  const normalizedType = normalizeAssetType(assetType);
  let updatedData = { ...originalPosition };

  switch (normalizedType) {
    case 'security':
      updatedData.quantity = parseFloat(formData.shares) || 0;
      updatedData.cost_per_unit = parseFloat(formData.cost_basis) || 0;
      updatedData.total_cost_basis = updatedData.quantity * updatedData.cost_per_unit;
      updatedData.purchase_date = formData.purchase_date;
      break;

    case 'crypto':
      updatedData.quantity = parseFloat(formData.quantity) || 0;
      updatedData.cost_per_unit = parseFloat(formData.purchase_price) || 0;
      updatedData.total_cost_basis = updatedData.quantity * updatedData.cost_per_unit;
      updatedData.current_price = parseFloat(formData.current_price) || 0;
      updatedData.purchase_date = formData.purchase_date;
      break;

    case 'metal':
      updatedData.quantity = parseFloat(formData.quantity) || 0;
      updatedData.cost_per_unit = parseFloat(formData.purchase_price) || 0;
      updatedData.total_cost_basis = updatedData.quantity * updatedData.cost_per_unit;
      updatedData.current_price_per_unit = parseFloat(formData.current_price_per_unit) || 0;
      updatedData.purchase_date = formData.purchase_date;
      break;

    case 'otherAssets':
      updatedData.identifier = formData.asset_name;
      updatedData.name = formData.asset_name;
      updatedData.asset_type = formData.asset_type;
      updatedData.total_cost_basis = parseFloat(formData.cost) || 0;
      updatedData.current_value = parseFloat(formData.current_value) || 0;
      updatedData.purchase_date = formData.purchase_date;
      updatedData.notes = formData.notes;
      break;

    case 'cash':
      updatedData.current_value = parseFloat(formData.amount) || 0;
      updatedData.cash_amount = parseFloat(formData.amount) || 0;
      updatedData.quantity = 1;
      updatedData.interest_rate = parseFloat(formData.interest_rate) || 0;
      break;
  }

  return updatedData;
};

/**
 * Prepare position data for API update call
 */
export const preparePositionUpdatePayload = (updatedPosition, assetType) => {
  const normalizedType = normalizeAssetType(assetType);

  switch (normalizedType) {
    case 'security':
      return {
        shares: parseFloat(updatedPosition.quantity),
        price: parseFloat(updatedPosition.current_price || updatedPosition.current_price_per_unit),
        cost_basis: parseFloat(updatedPosition.cost_per_unit || (updatedPosition.cost_basis / updatedPosition.quantity)),
        purchase_date: updatedPosition.purchase_date
      };

    case 'crypto':
      return {
        quantity: parseFloat(updatedPosition.quantity),
        purchase_price: parseFloat(updatedPosition.cost_per_unit || (updatedPosition.cost_basis / updatedPosition.quantity)),
        purchase_date: updatedPosition.purchase_date
      };

    case 'metal':
      return {
        quantity: parseFloat(updatedPosition.quantity),
        purchase_price: parseFloat(updatedPosition.cost_per_unit || (updatedPosition.cost_basis / updatedPosition.quantity)),
        purchase_date: updatedPosition.purchase_date
      };

    case 'cash':
      return {
        amount: parseFloat(updatedPosition.cash_amount || updatedPosition.current_value || updatedPosition.quantity),
        interest_rate: parseFloat(updatedPosition.interest_rate || 0)
      };

    case 'otherAssets':
      return {
        asset_name: updatedPosition.identifier || updatedPosition.name,
        asset_type: updatedPosition.asset_type,
        cost: updatedPosition.total_cost_basis || 0,
        current_value: updatedPosition.current_value || 0,
        purchase_date: updatedPosition.purchase_date,
        notes: updatedPosition.notes || ''
      };

    default:
      return updatedPosition;
  }
};
