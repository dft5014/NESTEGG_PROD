// components/tables/UnifiedAccountTable.js
import React, { useState, useEffect, useMemo } from 'react';
import { fetchAccountsWithDetails } from '@/utils/apimethods/accountMethods';
import { fetchUnifiedPositionsForAccount } from '@/utils/apimethods/positionMethods';
import { BarChart4, ChevronRight, Loader, Settings, Trash, Plus, Pencil, DollarSign, AlertTriangle, ArrowRightLeft } from 'lucide-react';
import { formatCurrency, formatDate, formatPercentage } from '@/utils/formatters';
import Link from 'next/link';
import { deleteAccount } from '@/utils/apimethods/accountMethods';

const UnifiedAccountTable = ({ title = "Accounts" }) => {
  const [accounts, setAccounts] = useState([]);
  const [accountPositions, setAccountPositions] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Account Detail Modal State
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [isAccountDetailModalOpen, setIsAccountDetailModalOpen] = useState(false);
  
  // Confirmation Modal State
  const [accountToDelete, setAccountToDelete] = useState(null);
  const [isConfirmDeleteModalOpen, setIsConfirmDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(null);

  // Fetch accounts and their positions
  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Fetch all accounts with their basic details
      const fetchedAccounts = await fetchAccountsWithDetails();
      setAccounts(fetchedAccounts);

      // Then fetch positions for each account using the unified API
      const positionsMap = {};
      await Promise.all(
        fetchedAccounts.map(async (account) => {
          try {
            const positions = await fetchUnifiedPositionsForAccount(account.id);
            positionsMap[account.id] = positions;
          } catch (err) {
            console.error(`Error fetching positions for account ${account.id}:`, err);
            positionsMap[account.id] = [];
          }
        })
      );
      
      setAccountPositions(positionsMap);
    } catch (err) {
      console.error("Error fetching accounts:", err);
      setError(err.message || "Failed to load accounts");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Calculate account metrics based on positions
  const accountsWithMetrics = useMemo(() => {
    return accounts.map(account => {
      const positions = accountPositions[account.id] || [];
      
      // Calculate totals across all position types
      const totalValue = positions.reduce((sum, pos) => sum + parseFloat(pos.current_value || 0), 0);
      const totalCostBasis = positions.reduce((sum, pos) => sum + parseFloat(pos.total_cost_basis || 0), 0);
      const totalGainLoss = totalValue - totalCostBasis;
      const totalGainLossPercent = totalCostBasis > 0 ? (totalGainLoss / totalCostBasis) * 100 : 0;
      
      // Calculate estimated annual income
      const annualIncome = positions.reduce((sum, pos) => {
        if (pos.asset_type === 'cash' && pos.dividend_rate) {
          return sum + (parseFloat(pos.current_value || 0) * parseFloat(pos.dividend_rate || 0) / 100);
        } else if (pos.dividend_yield) {
          return sum + (parseFloat(pos.current_value || 0) * parseFloat(pos.dividend_yield || 0) / 100);
        }
        return sum;
      }, 0);
      
      // Count positions by asset type
      const assetTypeCounts = {
        security: positions.filter(pos => pos.asset_type === 'security').length,
        crypto: positions.filter(pos => pos.asset_type === 'crypto').length,
        metal: positions.filter(pos => pos.asset_type === 'metal').length,
        cash: positions.filter(pos => pos.asset_type === 'cash').length,
        realestate: positions.filter(pos => pos.asset_type === 'realestate').length
      };
      
      const totalPositions = Object.values(assetTypeCounts).reduce((sum, count) => sum + count, 0);
      
      return {
        ...account,
        totalValue,
        totalCostBasis,
        totalGainLoss,
        totalGainLossPercent,
        annualIncome,
        assetTypeCounts,
        totalPositions,
        positions
      };
    });
  }, [accounts, accountPositions]);

  // Sort accounts by total value (highest first)
  const sortedAccounts = useMemo(() => {
    return [...accountsWithMetrics].sort((a, b) => b.totalValue - a.totalValue);
  }, [accountsWithMetrics]);

  // Calculate portfolio total metrics
  const portfolioTotals = useMemo(() => {
    return accountsWithMetrics.reduce((acc, account) => {
      acc.totalValue += account.totalValue || 0;
      acc.totalCostBasis += account.totalCostBasis || 0;
      acc.totalGainLoss += account.totalGainLoss || 0;
      acc.annualIncome += account.annualIncome || 0;
      acc.totalPositions += account.totalPositions || 0;
      return acc;
    }, {
      totalValue: 0,
      totalCostBasis: 0,
      totalGainLoss: 0,
      annualIncome: 0,
      totalPositions: 0
    });
  }, [accountsWithMetrics]);

  // Calculate total gain/loss percent for portfolio
  const portfolioGainLossPercent = useMemo(() => {
    return portfolioTotals.totalCostBasis > 0 
      ? (portfolioTotals.totalGainLoss / portfolioTotals.totalCostBasis) * 100 
      : 0;
  }, [portfolioTotals]);

  // Handle account detail modal
  const openAccountDetailModal = (account) => {
    setSelectedAccount(account);
    setIsAccountDetailModalOpen(true);
  };

  // Handle delete confirmation modal
  const openDeleteConfirmationModal = (event, account) => {
    event.stopPropagation();
    setAccountToDelete(account);
    setIsConfirmDeleteModalOpen(true);
  };

  // Handle account deletion
  const handleDeleteAccount = async () => {
    if (!accountToDelete) return;
    
    setIsDeleting(true);
    setDeleteError(null);
    
    try {
      await deleteAccount(accountToDelete.id);
      // Remove the deleted account from state
      setAccounts(prevAccounts => prevAccounts.filter(account => account.id !== accountToDelete.id));
      // Close the modal
      setIsConfirmDeleteModalOpen(false);
      setAccountToDelete(null);
    } catch (error) {
      console.error('Error deleting account:', error);
      setDeleteError(error.message || 'Failed to delete account');
    } finally {
      setIsDeleting(false);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="bg-gray-800/70 backdrop-blur-sm rounded-xl p-6 text-center min-h-[180px] flex items-center justify-center">
        <div>
          <Loader className="inline-block w-6 h-6 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-3" />
          <p className="text-gray-400">Loading accounts...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="bg-red-900/60 p-4 rounded-lg text-red-200">
        <div className="font-medium mb-1">Error Loading Accounts</div>
        <div className="text-sm">{error}</div>
        <button onClick={fetchData} className="mt-2 text-xs bg-red-800/80 hover:bg-red-700/80 py-1 px-2 rounded">
          Retry
        </button>
      </div>
    );
  }

  // No accounts state
  if (sortedAccounts.length === 0) {
    return (
      <div className="bg-gray-800/70 backdrop-blur-sm rounded-xl p-6 text-center min-h-[180px] flex flex-col items-center justify-center">
        <div className="bg-gray-700/50 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
          <DollarSign className="h-8 w-8 text-gray-500" />
        </div>
        <h3 className="text-xl font-medium mb-2">No accounts found</h3>
        <p className="text-gray-400 max-w-md mx-auto mb-4">
          Add your first investment account to start tracking your portfolio.
        </p>
        <Link href="/add-account">
          <button className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-700 transition-colors text-white font-medium focus:outline-none focus:ring-2 focus:ring-blue-500">
            <Plus className="h-4 w-4 inline-block mr-1" />
            Add Account
          </button>
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="bg-gray-800/70 backdrop-blur-sm rounded-xl mb-8 overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center p-3 border-b border-gray-700">
          <h2 className="text-xl font-semibold flex items-center">
            <DollarSign className="w-5 h-5 mr-2 text-blue-400" />
            {title}
          </h2>
          <Link href="/add-account">
            <button className="px-3 py-1.5 bg-blue-600 rounded hover:bg-blue-700 transition-colors text-sm text-white font-medium focus:outline-none focus:ring-2 focus:ring-blue-500">
              <Plus className="h-4 w-4 inline-block mr-1" />
              Add Account
            </button>
          </Link>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-700">
            <thead className="bg-gray-900/50">
              <tr>
                <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Account</th>
                <th scope="col" className="px-3 py-2 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">Type</th>
                <th scope="col" className="px-3 py-2 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">Current Value</th>
                <th scope="col" className="px-3 py-2 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">Cost Basis</th>
                <th scope="col" className="px-3 py-2 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">Gain/Loss</th>
                <th scope="col" className="px-3 py-2 text-right text-xs font-medium text-gray-400 uppercase tracking-wider hidden xl:table-cell">Est. Annual Income</th>
                <th scope="col" className="px-3 py-2 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">Positions</th>
                <th scope="col" className="px-3 py-2 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {/* Portfolio Summary Row */}
              <tr className="bg-blue-900/30 font-medium border-b-2 border-blue-700">
                <td className="px-3 py-2 whitespace-nowrap">
                  <div className="font-medium text-white">Total Portfolio</div>
                  <div className="text-xs text-gray-400">{sortedAccounts.length} accounts</div>
                </td>
                <td className="px-3 py-2 text-center whitespace-nowrap">
                  {/* No type for total */}
                </td>
                <td className="px-3 py-2 text-right whitespace-nowrap font-medium text-white">
                  {formatCurrency(portfolioTotals.totalValue)}
                </td>
                <td className="px-3 py-2 text-right whitespace-nowrap text-gray-300">
                  {formatCurrency(portfolioTotals.totalCostBasis)}
                </td>
                <td className="px-3 py-2 text-right whitespace-nowrap">
                  <div className="flex flex-col items-end">
                    <div className={`font-medium ${portfolioTotals.totalGainLoss >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {portfolioTotals.totalGainLoss >= 0 ? '+' : ''}{formatCurrency(portfolioTotals.totalGainLoss)}
                    </div>
                    <div className={`text-xs ${portfolioTotals.totalGainLoss >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      ({portfolioTotals.totalGainLoss >= 0 ? '+' : ''}{formatPercentage(portfolioGainLossPercent)})
                    </div>
                  </div>
                </td>
                <td className="px-3 py-2 text-right whitespace-nowrap text-gray-300 hidden xl:table-cell">
                  {formatCurrency(portfolioTotals.annualIncome)}
                </td>
                <td className="px-3 py-2 text-center whitespace-nowrap text-gray-300">
                  {portfolioTotals.totalPositions}
                </td>
                <td className="px-3 py-2 text-center whitespace-nowrap">
                  {/* No actions for total */}
                </td>
              </tr>
              
              {/* Individual account rows */}
              {sortedAccounts.map((account) => (
                <tr 
                  key={account.id} 
                  className="hover:bg-gray-700/50 transition-colors cursor-pointer"
                  onClick={() => openAccountDetailModal(account)}
                >
                  <td className="px-3 py-2 whitespace-nowrap">
                    <Link 
                      href={`/account/${account.id}`} 
                      className="text-blue-400 hover:text-blue-300 font-medium transition-colors"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {account.account_name}
                    </Link>
                    <div className="text-xs text-gray-400">{account.institution}</div>
                  </td>
                  <td className="px-3 py-2 text-center whitespace-nowrap">
                    <span className="px-2 py-1 text-xs rounded-full bg-gray-700">
                      {account.account_category || account.type || 'Portfolio'}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right whitespace-nowrap font-medium text-white">
                    {formatCurrency(account.totalValue)}
                  </td>
                  <td className="px-3 py-2 text-right whitespace-nowrap text-gray-300">
                    {formatCurrency(account.totalCostBasis)}
                  </td>
                  <td className="px-3 py-2 text-right whitespace-nowrap">
                    <div className="flex flex-col items-end">
                      <div className={`text-sm font-medium ${account.totalGainLoss >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {account.totalGainLoss >= 0 ? '+' : ''}{formatCurrency(account.totalGainLoss)}
                      </div>
                      <div className={`text-xs ${account.totalGainLoss >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        ({account.totalGainLoss >= 0 ? '+' : ''}{formatPercentage(account.totalGainLossPercent)})
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2 text-right whitespace-nowrap text-sm text-gray-300 hidden xl:table-cell">
                    {formatCurrency(account.annualIncome)}
                  </td>
                  <td className="px-3 py-2 text-center whitespace-nowrap">
                    <div className="text-sm flex flex-col items-center">
                      <div className="font-medium text-white">{account.totalPositions}</div>
                      {account.totalPositions > 0 && (
                        <div className="text-xs text-gray-400 flex space-x-1 items-center mt-1">
                          {account.assetTypeCounts.security > 0 && (
                            <span title="Securities" className="px-1 py-0.5 rounded bg-blue-900/40 text-blue-300">
                              S:{account.assetTypeCounts.security}
                            </span>
                          )}
                          {account.assetTypeCounts.crypto > 0 && (
                            <span title="Crypto" className="px-1 py-0.5 rounded bg-purple-900/40 text-purple-300">
                              C:{account.assetTypeCounts.crypto}
                            </span>
                          )}
                          {account.assetTypeCounts.metal > 0 && (
                            <span title="Metals" className="px-1 py-0.5 rounded bg-yellow-900/40 text-yellow-300">
                              M:{account.assetTypeCounts.metal}
                            </span>
                          )}
                          {account.assetTypeCounts.cash > 0 && (
                            <span title="Cash" className="px-1 py-0.5 rounded bg-green-900/40 text-green-300">
                              $:{account.assetTypeCounts.cash}
                            </span>
                          )}
                          {account.assetTypeCounts.realestate > 0 && (
                            <span title="Real Estate" className="px-1 py-0.5 rounded bg-red-900/40 text-red-300">
                              R:{account.assetTypeCounts.realestate}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-center whitespace-nowrap">
                    <div className="flex justify-center space-x-1">
                      <Link 
                        href={`/account/${account.id}`} 
                        className="text-gray-400 hover:text-blue-400 transition-colors p-1" 
                        title="View Account"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Link>
                      <Link 
                        href={`/account/${account.id}/edit`} 
                        className="text-gray-400 hover:text-blue-400 transition-colors p-1"
                        title="Edit Account"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Pencil className="h-4 w-4" />
                      </Link>
                      <Link 
                        href={`/account/${account.id}/add-position`} 
                        className="text-gray-400 hover:text-green-400 transition-colors p-1"
                        title="Add Position"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Plus className="h-4 w-4" />
                      </Link>
                      <button 
                        className="text-gray-400 hover:text-red-400 transition-colors p-1"
                        title="Delete Account"
                        onClick={(e) => openDeleteConfirmationModal(e, account)}
                      >
                        <Trash className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Account Detail Modal */}
      {isAccountDetailModalOpen && selectedAccount && (
        <div className="fixed inset-0 z-[100] overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-black/80 backdrop-blur-sm"></div>
            </div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

            <div className="inline-block align-bottom bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-3xl sm:w-full text-white">
              {/* Header */}
              <div className="flex justify-between items-start p-5 border-b border-gray-700 bg-gradient-to-r from-blue-900 to-green-800">
                <div className="flex items-center">
                  <div className="flex-shrink-0 h-10 w-10 rounded-full bg-white flex items-center justify-center mr-4">
                    <span className="font-bold text-blue-800 text-lg">{selectedAccount.account_name?.charAt(0) || '?'}</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">{selectedAccount.account_name}</h3>
                    <div className="flex flex-wrap items-center text-sm text-blue-200">
                      <span>{selectedAccount.institution}</span>
                      <span className="mx-2">•</span>
                      <span>{selectedAccount.account_category || selectedAccount.type || 'Portfolio'}</span>
                    </div>
                  </div>
                </div>
                <button onClick={() => setIsAccountDetailModalOpen(false)} className="text-white hover:text-blue-200 transition-colors p-1 -m-1 rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-white">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Body */}
              <div className="p-6 bg-gray-800 text-sm">
                {/* Metrics */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-gray-700 rounded-lg p-3">
                    <div className="text-gray-400 text-xs mb-1 uppercase tracking-wider">Current Value</div>
                    <div className="text-lg font-semibold truncate text-white">{formatCurrency(selectedAccount.totalValue)}</div>
                  </div>
                  <div className="bg-gray-700 rounded-lg p-3">
                    <div className="text-gray-400 text-xs mb-1 uppercase tracking-wider">Cost Basis</div>
                    <div className="text-lg font-semibold truncate text-white">{formatCurrency(selectedAccount.totalCostBasis)}</div>
                  </div>
                  <div className="bg-gray-700 rounded-lg p-3">
                    <div className="text-gray-400 text-xs mb-1 uppercase tracking-wider">Gain/Loss</div>
                    <div className={`text-lg font-semibold truncate ${selectedAccount.totalGainLoss >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {selectedAccount.totalGainLoss >= 0 ? '+' : ''}{formatCurrency(selectedAccount.totalGainLoss)}
                      <span className="text-xs ml-1">
                        ({selectedAccount.totalGainLoss >= 0 ? '+' : ''}{formatPercentage(selectedAccount.totalGainLossPercent)})
                      </span>
                    </div>
                  </div>
                  <div className="bg-gray-700 rounded-lg p-3">
                    <div className="text-gray-400 text-xs mb-1 uppercase tracking-wider">Est. Annual Income</div>
                    <div className="text-lg font-semibold truncate text-white">{formatCurrency(selectedAccount.annualIncome)}</div>
                  </div>
                </div>

                {/* Additional Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 bg-gray-700/50 p-4 rounded-lg mb-6">
                  <div>
                    <div className="text-gray-400 text-xs uppercase tracking-wider">Account Type</div>
                    <div className="font-medium text-white break-words">{selectedAccount.account_category || selectedAccount.type || 'Portfolio'}</div>
                  </div>
                  <div>
                    <div className="text-gray-400 text-xs uppercase tracking-wider">Institution</div>
                    <div className="font-medium text-white break-words">{selectedAccount.institution}</div>
                  </div>
                  <div>
                    <div className="text-gray-400 text-xs uppercase tracking-wider">Account Number</div>
                    <div className="font-medium text-white break-words">{selectedAccount.account_number || 'Not provided'}</div>
                  </div>
                  <div>
                    <div className="text-gray-400 text-xs uppercase tracking-wider">Last Updated</div>
                    <div className="font-medium text-white break-words">
                      {selectedAccount.updated_at ? formatDate(new Date(selectedAccount.updated_at)) : 'Never'}
                    </div>
                  </div>
                </div>

                {/* Position Summary */}
                <div className="mb-6">
                  <h4 className="font-medium text-lg mb-3">Position Summary</h4>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    <div className="bg-gray-700/50 rounded-lg p-3 text-center">
                      <div className="text-blue-300 font-semibold mb-1">Securities</div>
                      <div className="text-2xl font-bold">{selectedAccount.assetTypeCounts.security}</div>
                    </div>
                    <div className="bg-gray-700/50 rounded-lg p-3 text-center">
                      <div className="text-purple-300 font-semibold mb-1">Crypto</div>
                      <div className="text-2xl font-bold">{selectedAccount.assetTypeCounts.crypto}</div>
                    </div>
                    <div className="bg-gray-700/50 rounded-lg p-3 text-center">
                      <div className="text-yellow-300 font-semibold mb-1">Metals</div>
                      <div className="text-2xl font-bold">{selectedAccount.assetTypeCounts.metal}</div>
                    </div>
                    <div className="bg-gray-700/50 rounded-lg p-3 text-center">
                      <div className="text-green-300 font-semibold mb-1">Cash</div>
                      <div className="text-2xl font-bold">{selectedAccount.assetTypeCounts.cash}</div>
                    </div>
                    <div className="bg-gray-700/50 rounded-lg p-3 text-center">
                      <div className="text-red-300 font-semibold mb-1">Real Estate</div>
                      <div className="text-2xl font-bold">{selectedAccount.assetTypeCounts.realestate}</div>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <Link href={`/account/${selectedAccount.id}/edit`} className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-2 px-4 flex items-center justify-center transition-colors">
                    <Pencil className="h-4 w-4 mr-2" />
                    Edit Account
                  </Link>
                  <Link href={`/account/${selectedAccount.id}/add-position`} className="bg-green-600 hover:bg-green-700 text-white rounded-lg py-2 px-4 flex items-center justify-center transition-colors">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Position
                  </Link>
                  <Link href={`/account/${selectedAccount.id}`} className="bg-purple-600 hover:bg-purple-700 text-white rounded-lg py-2 px-4 flex items-center justify-center transition-colors">
                    <BarChart4 className="h-4 w-4 mr-2" />
                    View Details
                  </Link>
                </div>
              </div>

              {/* Footer */}
              <div className="px-6 py-4 bg-gray-900 text-right">
                <button 
                  onClick={() => setIsAccountDetailModalOpen(false)}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded text-white font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-white transition-colors text-sm"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isConfirmDeleteModalOpen && accountToDelete && (
        <div className="fixed inset-0 z-[100] overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-black/80 backdrop-blur-sm"></div>
            </div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

            <div className="inline-block align-bottom bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full text-white">
              {/* Header */}
              <div className="flex justify-between items-start p-5 border-b border-gray-700 bg-red-900">
                <div className="flex items-center">
                  <AlertTriangle className="h-6 w-6 text-red-300 mr-2" />
                  <h3 className="text-lg font-bold text-white">Delete Account</h3>
                </div>
                <button onClick={() => setIsConfirmDeleteModalOpen(false)} className="text-white hover:text-red-200 transition-colors p-1 -m-1 rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-white">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Body */}
              <div className="p-6 bg-gray-800">
                <p className="mb-4">Are you sure you want to delete the account <strong>{accountToDelete.account_name}</strong>?</p>
                <p className="mb-4 text-red-300">This will permanently delete the account and all associated positions. This action cannot be undone.</p>
                
                {deleteError && (
                  <div className="bg-red-900/60 p-3 rounded-lg mb-4 text-red-200">
                    {deleteError}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="px-6 py-4 bg-gray-900 flex justify-end space-x-3">
                <button 
                  onClick={() => setIsConfirmDeleteModalOpen(false)}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded text-white font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-white transition-colors text-sm"
                  disabled={isDeleting}
                >
                  Cancel
                </button>
                <button 
                  onClick={handleDeleteAccount}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded text-white font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-red-500 transition-colors text-sm flex items-center"
                  disabled={isDeleting}
                >
                  {isDeleting ? (
                    <>
                      <Loader className="animate-spin h-4 w-4 mr-2" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash className="h-4 w-4 mr-2" />
                      Delete Account
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default UnifiedAccountTable;