// frontend/utils/apimethods/positionApi.js
import { fetchWithAuth } from '@/utils/api';

// --- Security Positions ---

/**
 * Fetches security positions for a specific account.
 * @param {number} accountId - The ID of the account.
 * @returns {Promise<Array>} A promise that resolves to an array of security position objects.
 * @throws {Error} If the fetch fails or the response is not ok.
 */
export const getSecurityPositionsForAccount = async (accountId) => {
  if (!accountId) return []; // Or throw error if accountId is mandatory
  const response = await fetchWithAuth(`/positions/${accountId}`);
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: `Failed to fetch security positions for account ${accountId}` }));
    console.error(`Error fetching security positions for account ${accountId}: ${errorData.detail || response.status}`);
    return []; // Return empty array on error for this specific fetch
  }
  const data = await response.json();
  return data.positions || [];
};

/**
 * Adds a new security position to an account.
 * @param {number} accountId - The ID of the target account.
 * @param {object} positionData - Data for the new position (ticker, shares, price, cost_basis, purchase_date).
 * @returns {Promise<object>} Server response (e.g., { message, position_id, position_value }).
 * @throws {Error} If the fetch fails or the response is not ok.
 */
export const addSecurityPosition = async (accountId, positionData) => {
  if (!accountId) throw new Error("Account ID is required to add a position.");
  
  const response = await fetchWithAuth(`/positions/${accountId}`, {
    method: "POST",
    body: JSON.stringify(positionData)
  });
  const responseData = await response.json();
  if (!response.ok) {
    throw new Error(responseData.detail || `HTTP error ${response.status}`);
  }
  return responseData;
};

/**
 * Updates an existing security position.
 * @param {number} positionId - The ID of the position to update.
 * @param {object} positionUpdateData - The updated position data (ticker, shares, price, cost_basis, purchase_date).
 * @returns {Promise<object>} Server response (e.g., { message }).
 * @throws {Error} If the fetch fails or the response is not ok.
 */
export const updateSecurityPosition = async (positionId, positionUpdateData) => {
   if (!positionId) throw new Error("Position ID is required for update.");
  
  const response = await fetchWithAuth(`/positions/${positionId}`, {
    method: "PUT",
    body: JSON.stringify(positionUpdateData)
  });
  const responseData = await response.json();
  if (!response.ok) {
    throw new Error(responseData.detail || `HTTP error ${response.status}`);
  }
  return responseData;
};

/**
 * Deletes an existing security position.
 * @param {number} positionId - The ID of the position to delete.
 * @returns {Promise<object>} Server response (e.g., { message }).
 * @throws {Error} If the fetch fails or the response is not ok.
 */
export const deleteSecurityPosition = async (positionId) => {
  if (!positionId) throw new Error("Position ID is required for deletion.");

  const response = await fetchWithAuth(`/positions/${positionId}`, {
    method: "DELETE"
  });
   if (response.status === 204) {
       return { message: "Position deleted successfully" };
   }
  const responseData = await response.json();
  if (!response.ok) {
    throw new Error(responseData.detail || `HTTP error ${response.status}`);
  }
  return responseData;
};

// --- Crypto Positions --- (Add similar functions for Crypto)

export const getCryptoPositionsForAccount = async (accountId) => {
  if (!accountId) return [];
  const response = await fetchWithAuth(`/crypto/${accountId}`); // Use crypto endpoint
  if (!response.ok) {
     console.error(`Error fetching crypto positions for account ${accountId}: ${response.status}`);
     return [];
  }
  const data = await response.json();
  return data.crypto_positions || [];
};

export const addCryptoPosition = async (accountId, positionData) => {
   if (!accountId) throw new Error("Account ID is required.");
   const response = await fetchWithAuth(`/crypto/${accountId}`, { // Use crypto endpoint
     method: "POST",
     body: JSON.stringify(positionData)
   });
   const responseData = await response.json();
   if (!response.ok) throw new Error(responseData.detail || `HTTP error ${response.status}`);
   return responseData;
};

export const updateCryptoPosition = async (positionId, positionUpdateData) => {
   if (!positionId) throw new Error("Position ID is required.");
   const response = await fetchWithAuth(`/crypto/${positionId}`, { // Use crypto endpoint
     method: "PUT",
     body: JSON.stringify(positionUpdateData)
   });
   const responseData = await response.json();
   if (!response.ok) throw new Error(responseData.detail || `HTTP error ${response.status}`);
   return responseData;
};

export const deleteCryptoPosition = async (positionId) => {
   if (!positionId) throw new Error("Position ID is required.");
   const response = await fetchWithAuth(`/crypto/${positionId}`, { // Use crypto endpoint
     method: "DELETE"
   });
    if (response.status === 204) return { message: "Crypto position deleted successfully" };
   const responseData = await response.json();
   if (!response.ok) throw new Error(responseData.detail || `HTTP error ${response.status}`);
   return responseData;
};

// --- Metal Positions --- (Add similar functions for Metals)

export const getMetalPositionsForAccount = async (accountId) => {
  if (!accountId) return [];
  const response = await fetchWithAuth(`/metals/${accountId}`); // Use metals endpoint
  if (!response.ok) {
     console.error(`Error fetching metal positions for account ${accountId}: ${response.status}`);
     return [];
  }
  const data = await response.json();
  return data.metal_positions || [];
};

export const addMetalPosition = async (accountId, positionData) => {
   if (!accountId) throw new Error("Account ID is required.");
   const response = await fetchWithAuth(`/metals/${accountId}`, { // Use metals endpoint
     method: "POST",
     body: JSON.stringify(positionData)
   });
   const responseData = await response.json();
   if (!response.ok) throw new Error(responseData.detail || `HTTP error ${response.status}`);
   return responseData;
};

export const updateMetalPosition = async (positionId, positionUpdateData) => {
   if (!positionId) throw new Error("Position ID is required.");
   const response = await fetchWithAuth(`/metals/${positionId}`, { // Use metals endpoint
     method: "PUT",
     body: JSON.stringify(positionUpdateData)
   });
   const responseData = await response.json();
   if (!response.ok) throw new Error(responseData.detail || `HTTP error ${response.status}`);
   return responseData;
};

export const deleteMetalPosition = async (positionId) => {
   if (!positionId) throw new Error("Position ID is required.");
   const response = await fetchWithAuth(`/metals/${positionId}`, { // Use metals endpoint
     method: "DELETE"
   });
    if (response.status === 204) return { message: "Metal position deleted successfully" };
   const responseData = await response.json();
   if (!response.ok) throw new Error(responseData.detail || `HTTP error ${response.status}`);
   return responseData;
};

// --- Real Estate Positions --- (Add similar functions for Real Estate - PLACEHOLDERS)
/*
export const getRealEstatePositionsForAccount = async (accountId) => { ... };
export const addRealEstatePosition = async (accountId, positionData) => { ... };
export const updateRealEstatePosition = async (positionId, positionUpdateData) => { ... };
export const deleteRealEstatePosition = async (positionId) => { ... };
*/