// components/tables/UnifiedAccountTable.js
import React, { useState, useEffect, useMemo } from 'react';
import { fetchAccountsWithDetails } from '@/utils/apimethods/accountMethods';
import { fetchUnifiedPositionsForAccount } from '@/utils/apimethods/positionMethods';
import { BarChart4, ChevronRight, Loader, Settings, Trash, Plus, Pencil, ArrowRightLeft, DollarSign, AlertTriangle } from 'lucide-react';
import { formatCurrency, formatDate, formatPercentage } from '@/utils/formatters';
import Link from 'next/link';

const UnifiedAccountTable = () => {
  const [accounts, setAccounts] = useState([]);
  const [accountPositions, setAccountPositions] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

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
        totalPositions
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
    <div className="bg-gray-800/70 backdrop-blur-sm rounded-xl mb-8 overflow-hidden">
      {/* Header */}
      <div className="flex justify-between items-center p-3 border-b border-gray-700">
        <h2 className="text-xl font-semibold flex items-center">
          <DollarSign className="w-5 h-5 mr-2 text-blue-400" />
          Accounts
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
              <tr key={account.id} className="hover:bg-gray-700/50 transition-colors">
                <td className="px-3 py-2 whitespace-nowrap">
                  <Link href={`/account/${account.id}`} className="text-blue-400 hover:text-blue-300 font-medium transition-colors">
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
                    <Link href={`/account/${account.id}`} 
                          className="text-gray-400 hover:text-blue-400 transition-colors p-1" 
                          title="View Account">
                      <ChevronRight className="h-4 w-4" />
                    </Link>
                    <Link href={`/account/${account.id}/edit`} 
                          className="text-gray-400 hover:text-blue-400 transition-colors p-1"
                          title="Edit Account">
                      <Pencil className="h-4 w-4" />
                    </Link>
                    <Link href={`/account/${account.id}/add-position`} 
                          className="text-gray-400 hover:text-green-400 transition-colors p-1"
                          title="Add Position">
                      <Plus className="h-4 w-4" />
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default UnifiedAccountTable;