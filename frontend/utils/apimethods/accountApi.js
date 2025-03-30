// frontend/utils/apimethods/accountApi.js
import { fetchWithAuth } from '@/utils/api';

/**
 * Fetches all accounts for the logged-in user.
 * @returns {Promise<Array>} A promise that resolves to an array of account objects.
 * @throws {Error} If the fetch fails or the response is not ok.
 */
export const getAccounts = async () => {
  const response = await fetchWithAuth('/accounts');
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: 'Failed to fetch accounts' }));
    throw new Error(errorData.detail || `HTTP error ${response.status}`);
  }
  const data = await response.json();
  return data.accounts || []; // Ensure returning an array
};

/**
 * Adds a new account for the logged-in user.
 * @param {object} accountData - Data for the new account (e.g., { account_name, institution, type, balance }).
 * @returns {Promise<object>} A promise that resolves to the response data from the server (e.g., { message, account_id }).
 * @throws {Error} If the fetch fails or the response is not ok.
 */
export const addAccount = async (accountData) => {
  const response = await fetchWithAuth('/accounts', {
    method: "POST",
    body: JSON.stringify(accountData)
  });
  const responseData = await response.json();
  if (!response.ok) {
    throw new Error(responseData.detail || `HTTP error ${response.status}`);
  }
  return responseData;
};

/**
 * Updates an existing account.
 * @param {number} accountId - The ID of the account to update.
 * @param {object} accountUpdateData - The data fields to update (e.g., { account_name, institution, type }).
 * @returns {Promise<object>} A promise that resolves to the response data from the server (e.g., { message }).
 * @throws {Error} If the fetch fails or the response is not ok.
 */
export const updateAccount = async (accountId, accountUpdateData) => {
  if (!accountId) throw new Error("Account ID is required for update.");
  
  const response = await fetchWithAuth(`/accounts/${accountId}`, {
    method: "PUT",
    body: JSON.stringify(accountUpdateData)
  });
  const responseData = await response.json();
  if (!response.ok) {
    throw new Error(responseData.detail || `HTTP error ${response.status}`);
  }
  return responseData;
};

/**
 * Deletes an existing account.
 * @param {number} accountId - The ID of the account to delete.
 * @returns {Promise<object>} A promise that resolves to the response data from the server (e.g., { message }).
 * @throws {Error} If the fetch fails or the response is not ok.
 */
export const deleteAccount = async (accountId) => {
  if (!accountId) throw new Error("Account ID is required for deletion.");

  const response = await fetchWithAuth(`/accounts/${accountId}`, {
    method: "DELETE"
  });
  // DELETE might return 200 OK with JSON or 204 No Content. Handle both.
  if (response.status === 204) {
      return { message: "Account deleted successfully" }; // Simulate success response
  }
  const responseData = await response.json();
  if (!response.ok) {
    throw new Error(responseData.detail || `HTTP error ${response.status}`);
  }
  return responseData;
};