// components/tables/AccountTable.js
import React, { useState, useEffect, useMemo } from 'react';
import ReactDOM from 'react-dom';

// Data fetching and utils
// Replace fetchAccountsWithDetails with fetchUnifiedPositions
import { deleteAccount } from '@/utils/apimethods/accountMethods';
import { fetchUnifiedPositions } from '@/utils/apimethods/positionMethods';
import { formatCurrency, formatDate, formatPercentage } from '@/utils/formatters';
import { popularBrokerages } from '@/utils/constants';

// Button Components
import AddAccountButton from '@/components/AddAccountButton';
import EditAccountButton from '@/components/EditAccountButton';
import AddPositionButton from '@/components/AddPositionButton';

// Modal Components & Flows
import AccountDetailModal from '@/components/modals/AccountDetailModal';
import FixedModal from '@/components/modals/FixedModal';
import AccountModal from '@/components/modals/AccountModal';
import AddPositionFlow from '@/components/flows/AddPositionFlow';

// Icons
import { Briefcase, Loader, Search, Plus, SlidersHorizontal, Trash, Settings } from 'lucide-react';

// --- Delete Confirmation Component ---
const DeleteConfirmationModal = ({ isOpen, onClose, onConfirm, itemName, itemType = "item" }) => {
    return (
        <FixedModal
            isOpen={isOpen}
            onClose={onClose}
            title={`Delete ${itemType}?`}
            size="max-w-sm"
        >
            <div className="pt-2 pb-4 text-gray-700">
                <p>Are you sure you want to delete "{itemName}"? This action cannot be undone.</p>
            </div>
            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                <button onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 text-sm">Cancel</button>
                <button onClick={onConfirm} className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm">Delete</button>
            </div>
        </FixedModal>
    );
};

// Helper function to get logo
const getInstitutionLogo = (institutionName) => {
    if (!institutionName) return null;
    const brokerage = popularBrokerages.find(
        broker => broker.name.toLowerCase() === institutionName.toLowerCase()
    );
    const FallbackIcon = () => <Briefcase className="w-5 h-5 text-gray-500" />;
    return brokerage ? brokerage.logo : FallbackIcon;
};

// --- Main AccountTable Component ---
const AccountTable = ({
    initialSort = "value-high",
    title = "Your Accounts",
    onDataChanged = () => {}
}) => {
    console.log("AccountTable: Rendering start");

    const [accounts, setAccounts] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    // Modal States
    const [selectedAccountDetail, setSelectedAccountDetail] = useState(null);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [accountToDelete, setAccountToDelete] = useState(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [accountToEdit, setAccountToEdit] = useState(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [accountForPosition, setAccountForPosition] = useState(null);
    const [isAddPositionFlowOpen, setIsAddPositionFlowOpen] = useState(false);

    // UI Feedback State
    const [successMessage, setSuccessMessage] = useState("");

    // Sorting and Filtering State
    const [sortOption, setSortOption] = useState(initialSort);
    const [searchQuery, setSearchQuery] = useState("");

    // --- Data Fetching with unified positions ---
    const fetchData = async () => {
        console.log("AccountTable: fetchData START");
        setIsLoading(true);
        setError(null);
        try {
            // Fetch all unified positions
            const allPositions = await fetchUnifiedPositions();
            console.log("AccountTable: fetchUnifiedPositions SUCCESS");
            
            // Group by account_id to create account objects
            const accountsMap = {};
            
            allPositions.forEach(position => {
                const accountId = position.account_id;
                
                // Initialize account object if it doesn't exist
                if (!accountsMap[accountId]) {
                    accountsMap[accountId] = {
                        id: accountId,
                        account_name: position.account_name,
                        institution: position.institution || "Unknown",
                        type: position.account_type || "Unknown",
                        total_value: 0,
                        total_cost_basis: 0,
                        total_gain_loss: 0,
                        positions_count: 0,
                        cash_balance: 0
                    };
                }
                
                // Add position to count
                accountsMap[accountId].positions_count++;
                
                // Add position values to account totals
                const currentValue = parseFloat(position.current_value || 0);
                const costBasis = parseFloat(position.total_cost_basis || 0);
                
                accountsMap[accountId].total_value += currentValue;
                accountsMap[accountId].total_cost_basis += costBasis;
                accountsMap[accountId].total_gain_loss += (currentValue - costBasis);
                
                // Track cash balance separately
                if (position.asset_type === 'cash') {
                    accountsMap[accountId].cash_balance += currentValue;
                }
            });
            
            // Convert map to array and calculate percentages
            const accountsArray = Object.values(accountsMap).map(account => {
                const gainLossPercent = account.total_cost_basis > 0 
                    ? (account.total_gain_loss / account.total_cost_basis) * 100 
                    : 0;
                    
                return {
                    ...account,
                    total_gain_loss_percent: gainLossPercent
                };
            });
            
            console.log("AccountTable: Account data processed, found:", accountsArray.length);
            setAccounts(accountsArray || []);
        } catch (err) {
            console.error("AccountTable: fetchData CATCH", err);
            setError(err.message || "Failed to load account data.");
            setAccounts([]);
        } finally {
            setIsLoading(false);
            console.log("AccountTable: fetchData FINALLY");
        }
    };
    
    // Initial fetch
    useEffect(() => { fetchData(); }, []);

    // Calculate totals for summary row
    const totals = useMemo(() => {
        return accounts.reduce((acc, account) => {
            acc.totalValue += account.total_value ?? 0;
            acc.totalCostBasis += account.total_cost_basis ?? 0;
            acc.totalGainLoss += account.total_gain_loss ?? 0;
            acc.positionsCount += account.positions_count ?? 0;
            acc.cashBalance += account.cash_balance ?? 0;
            return acc;
        }, { 
            totalValue: 0, 
            totalCostBasis: 0, 
            totalGainLoss: 0, 
            positionsCount: 0,
            cashBalance: 0
        });
    }, [accounts]);

    // Calculate gain/loss percent for summary
    const totalGainLossPercent = totals.totalCostBasis > 0 
        ? (totals.totalGainLoss / totals.totalCostBasis) * 100 
        : 0;

    // --- Filtering & Sorting ---
    const filteredAndSortedAccounts = useMemo(() => {
        let filtered = accounts;
        if (searchQuery) {
            const lowerCaseQuery = searchQuery.toLowerCase();
            filtered = filtered.filter(acc =>
                acc.account_name?.toLowerCase().includes(lowerCaseQuery) ||
                acc.institution?.toLowerCase().includes(lowerCaseQuery) ||
                acc.type?.toLowerCase().includes(lowerCaseQuery)
            );
        }
        if (!Array.isArray(filtered)) return [];

        const sorted = [...filtered].sort((a, b) => {
            const valueA = a.total_value ?? 0;
            const valueB = b.total_value ?? 0;
            const costBasisA = a.total_cost_basis ?? 0;
            const costBasisB = b.total_cost_basis ?? 0;
            const gainLossA = a.total_gain_loss ?? 0;
            const gainLossB = b.total_gain_loss ?? 0;
            const nameA = a.account_name || "";
            const nameB = b.account_name || "";
            const institutionA = a.institution || "";
            const institutionB = b.institution || "";
            const positionsCountA = a.positions_count ?? 0;
            const positionsCountB = b.positions_count ?? 0;

            switch (sortOption) {
                case "value-high": return valueB - valueA;
                case "value-low": return valueA - valueB;
                case "cost_basis-high": return costBasisB - costBasisA;
                case "cost_basis-low": return costBasisA - costBasisB;
                case "gain_loss-high": return gainLossB - gainLossA;
                case "gain_loss-low": return gainLossA - gainLossB;
                case "name": return nameA.localeCompare(nameB);
                case "institution": return institutionA.localeCompare(institutionB);
                case "positions-high": return positionsCountB - positionsCountA;
                case "positions-low": return positionsCountA - positionsCountB;
                case "cash-high": return (b.cash_balance ?? 0) - (a.cash_balance ?? 0);
                case "cash-low": return (a.cash_balance ?? 0) - (b.cash_balance ?? 0);
                default: return 0;
            }
        });
        return sorted;
    }, [accounts, sortOption, searchQuery]);

    // --- Modal Trigger Handlers ---
    const handleRowClick = (account) => { 
        // When clicking a row, fetch unified positions for this account to populate the detail modal
        setSelectedAccountDetail(account); 
        setIsDetailModalOpen(true); 
    };
    
    const handleCloseDetailModal = () => setIsDetailModalOpen(false);

    // --- Delete Handlers ---
    const handleDeleteClick = (account) => {
        console.log("AccountTable: Delete triggered for:", account?.account_name);
        setAccountToDelete(account);
        setIsDeleteModalOpen(true);
    };
    const handleCloseDeleteModal = () => {
        setIsDeleteModalOpen(false);
        setTimeout(() => setAccountToDelete(null), 300);
    };
    const handleConfirmDelete = async () => {
        if (!accountToDelete) return;
        const deletedName = accountToDelete.account_name;
        console.log("AccountTable: Confirming delete for account:", accountToDelete.id);
        try {
            await deleteAccount(accountToDelete.id);
            handleCloseDeleteModal();
            setSuccessMessage(`Account "${deletedName}" deleted successfully!`);
            setTimeout(() => setSuccessMessage(""), 3000);
            // Refresh data after delete
            fetchData();
            onDataChanged();
        } catch (err) {
            console.error("AccountTable: Delete failed:", err);
            handleCloseDeleteModal();
            setError("Failed to delete account: " + err.message);
        }
    };

    // --- Edit Handlers ---
    const handleEditClick = (account) => {
        console.log("AccountTable: Edit triggered for account:", account?.account_name);
        setAccountToEdit(account);
        setIsEditModalOpen(true);
    };
    const handleCloseEditModal = (didSave) => {
        const accountName = accountToEdit?.account_name;
        setIsEditModalOpen(false);
        setAccountToEdit(null);
        if (didSave) {
            setSuccessMessage(`Account "${accountName}" updated successfully!`);
            setTimeout(() => setSuccessMessage(""), 3000);
            // Refresh data after edit
            fetchData();
            onDataChanged();
        }
    };

    // --- Add Position Handlers ---
    const handleAddPositionClick = (account) => {
        console.log("AccountTable: Add Position triggered for account:", account?.account_name);
        setAccountForPosition(account);
        setIsAddPositionFlowOpen(true);
    };
    const handleCloseAddPositionFlow = (didSave) => {
        const accountName = accountForPosition?.account_name;
        setIsAddPositionFlowOpen(false);
        setAccountForPosition(null);
        if (didSave) {
            setSuccessMessage(`Position added to "${accountName}" successfully!`);
            setTimeout(() => setSuccessMessage(""), 3000);
            // Refresh data after position add
            fetchData();
            onDataChanged();
        }
    };

    // --- Render Logic ---
    if (isLoading) {
        console.log("AccountTable: Rendering Loading State");
        return (
            <div className="bg-gray-800/70 backdrop-blur-sm rounded-xl p-6 text-center min-h-[180px] flex items-center justify-center text-white">
                <div>
                    <Loader className="inline-block w-6 h-6 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-3" />
                    <p className="text-gray-400">Loading accounts...</p>
                </div>
            </div>
        );
    }

    console.log("AccountTable: Rendering Table Content, accounts count:", accounts.length);

    // Main Table Render
    return (
        <>
            {/* --- Fixed Position UI Feedback --- */}
            {successMessage && (<div className="fixed bottom-4 right-4 p-4 bg-green-600 text-white rounded-lg shadow-lg z-[100]">{successMessage}</div>)}
            {error && !isLoading && (<div className="fixed bottom-4 right-4 p-4 bg-red-600 text-white rounded-lg shadow-lg z-[100]">Error: {error}<button onClick={()=>setError(null)} className="ml-2 text-xs underline font-semibold">Dismiss</button></div>)}

            {/* --- Table Section --- */}
            <div className="bg-gray-800/70 backdrop-blur-sm rounded-xl mb-8 overflow-hidden">
                {/* Header */}
                <div className="flex flex-wrap justify-between items-center p-3 border-b border-gray-700 gap-4 text-white">
                    <h2 className="text-xl font-semibold flex items-center whitespace-nowrap"><Briefcase className="w-5 h-5 mr-2 text-blue-400" />{title}</h2>
                    <div className='flex flex-wrap items-center gap-4'>
                        {/* Search Input */}
                        <div className="relative">
                            <Search className="absolute h-4 w-4 text-gray-400 left-3 inset-y-0 my-auto" />
                            <input type="text" className="bg-gray-700 text-white pl-9 pr-3 py-2 rounded-lg text-sm focus:ring-1 focus:ring-blue-500 focus:outline-none" placeholder="Search Name/Inst..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                        </div>
                        {/* Sort Select */}
                        <div className="relative">
                            <SlidersHorizontal className="absolute h-4 w-4 text-gray-400 left-3 inset-y-0 my-auto" />
                            <select className="bg-gray-700 text-white pl-9 pr-8 py-2 rounded-lg text-sm focus:ring-1 focus:ring-blue-500 focus:outline-none appearance-none" value={sortOption} onChange={(e) => setSortOption(e.target.value)}>
                                <option value="value-high">Sort: Value (High-Low)</option>
                                <option value="value-low">Sort: Value (Low-High)</option>
                                <option value="name">Sort: Name (A-Z)</option>
                                <option value="institution">Sort: Institution (A-Z)</option>
                                <option value="cost_basis-high">Sort: Cost Basis (High-Low)</option>
                                <option value="cost_basis-low">Sort: Cost Basis (Low-High)</option>
                                <option value="gain_loss-high">Sort: Gain $ (High-Low)</option>
                                <option value="gain_loss-low">Sort: Gain $ (Low-High)</option>
                                <option value="positions-high">Sort: Positions (High-Low)</option>
                                <option value="positions-low">Sort: Positions (Low-High)</option>
                                <option value="cash-high">Sort: Cash (High-Low)</option>
                                <option value="cash-low">Sort: Cash (Low-High)</option>
                            </select>
                            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none"><svg className="h-4 w-4 text-gray-400" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg></div>
                        </div>
                        {/* Add Account Button (Triggers parent refresh) */}
                        <AddAccountButton className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg text-sm" onAccountAdded={() => {
                            fetchData();
                            onDataChanged();
                        }} />
                    </div>
                </div>

                {/* Table Content */}
                {filteredAndSortedAccounts.length === 0 ? (
                    <div className="p-6 text-center text-gray-400">No accounts match your criteria.</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-700 text-white">
                            <thead className="bg-gray-900/50 sticky top-0 z-10 shadow-sm">
                                <tr>
                                    <th scope="col" className="px-3 py-2 text-center text-xs font-medium text-gray-400 uppercase tracking-wider w-10">#</th>
                                    <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Institution</th>
                                    <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Account Name</th>
                                    <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-400 uppercase tracking-wider hidden lg:table-cell w-24">Type</th>
                                    <th scope="col" className="px-3 py-2 text-right text-xs font-medium text-gray-400 uppercase tracking-wider hidden sm:table-cell w-20">Positions</th>
                                    <th scope="col" className="px-3 py-2 text-right text-xs font-medium text-gray-400 uppercase tracking-wider w-28">Value</th>
                                    <th scope="col" className="px-3 py-2 text-right text-xs font-medium text-gray-400 uppercase tracking-wider hidden md:table-cell w-28">Cash</th>
                                    <th scope="col" className="px-3 py-2 text-right text-xs font-medium text-gray-400 uppercase tracking-wider hidden md:table-cell w-28">Cost Basis</th>
                                    <th scope="col" className="px-3 py-2 text-right text-xs font-medium text-gray-400 uppercase tracking-wider w-28">Gain/Loss</th>
                                    <th scope="col" className="px-3 py-2 text-center text-xs font-medium text-gray-400 uppercase tracking-wider w-20">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-700">
                                {/* NestEgg Summary Row */}
                                <tr className="bg-blue-900/30 font-medium border-b-2 border-blue-700">
                                    <td className="px-3 py-2 text-center whitespace-nowrap">
                                        <span className="font-bold">•</span>
                                    </td>
                                    <td className="px-3 py-2 whitespace-nowrap">
                                        <span className="text-sm font-bold text-white">Total NestEgg</span>
                                    </td>
                                    <td className="px-3 py-2 whitespace-nowrap text-sm">
                                        {/* Leave account name cell empty */}
                                    </td>
                                    <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-300 hidden lg:table-cell">
                                        {/* Leave type cell empty */}
                                    </td>
                                    <td className="px-3 py-2 whitespace-nowrap text-right text-sm hidden sm:table-cell">
                                        {totals.positionsCount}
                                    </td>
                                    <td className="px-3 py-2 whitespace-nowrap text-right text-sm font-bold">
                                        {formatCurrency(totals.totalValue)}
                                    </td>
                                    <td className="px-3 py-2 whitespace-nowrap text-right text-sm hidden md:table-cell">
                                        {formatCurrency(totals.cashBalance)}
                                    </td>
                                    <td className="px-3 py-2 whitespace-nowrap text-right text-sm hidden md:table-cell">
                                        {formatCurrency(totals.totalCostBasis)}
                                    </td>
                                    <td className="px-3 py-2 whitespace-nowrap text-right">
                                        <div className="flex flex-col items-end">
                                            <div className={`text-sm font-bold ${totals.totalGainLoss >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                                {totals.totalGainLoss >= 0 ? '+' : ''}{formatCurrency(totals.totalGainLoss)}
                                            </div>
                                            <div className={`text-xs ${totals.totalGainLoss >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                                ({totals.totalGainLoss >= 0 ? '+' : ''}{formatPercentage(totalGainLossPercent)})
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-3 py-2 whitespace-nowrap text-center">
                                        {/* Leave actions cell empty */}
                                    </td>
                                </tr>
                                
                                {/* Regular account rows */}
                                {filteredAndSortedAccounts.map((account, index) => {
                                    const costBasis = account.total_cost_basis ?? 0;
                                    const gainLoss = account.total_gain_loss ?? 0;
                                    const gainLossPercent = account.total_gain_loss_percent ?? 0;
                                    const positionsCount = account.positions_count ?? 0;
                                    const totalValue = account.total_value ?? 0;
                                    const LogoComponent = getInstitutionLogo(account.institution);

                                    return (
                                        <tr key={account.id} className="hover:bg-gray-700/50 transition-colors cursor-pointer" onClick={() => handleRowClick(account)}>
                                            {/* Rank Number */}
                                            <td className="px-3 py-2 text-center whitespace-nowrap">
                                                <span className="text-sm text-gray-300">{index + 1}</span>
                                            </td>
                                            
                                            {/* Institution */}
                                            <td className="px-3 py-2 whitespace-nowrap text-sm">
                                                <div className="flex items-center max-w-xs">
                                                    {typeof LogoComponent === 'string'
                                                        ? <img src={LogoComponent} alt={account.institution || ''} className="w-5 h-5 object-contain mr-2 rounded-sm flex-shrink-0"/>
                                                        : LogoComponent
                                                            ? <div className="w-5 h-5 mr-2 flex items-center justify-center"><LogoComponent /></div>
                                                            : (account.institution &&
                                                                <div className="flex-shrink-0 h-5 w-5 rounded-sm bg-gray-600 flex items-center justify-center mr-2 text-xs font-medium text-gray-300">
                                                                    {account.institution.charAt(0).toUpperCase()}
                                                                </div>
                                                              )
                                                    }
                                                    <span className="break-words whitespace-normal">{account.institution || "N/A"}</span>
                                                </div>
                                            </td>
                                            
                                            {/* Account Name */}
                                            <td className="px-3 py-2 whitespace-nowrap">
                                                <div className="text-sm font-medium">{account.account_name}</div>
                                            </td>
                                            
                                            {/* Type */}
                                            <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-300 hidden lg:table-cell">{account.type || "N/A"}</td>
                                            
                                            {/* Positions Count */}
                                            <td className="px-3 py-2 whitespace-nowrap text-right text-sm hidden sm:table-cell">{positionsCount}</td>
                                            
                                            {/* Value */}
                                            <td className="px-3 py-2 whitespace-nowrap text-right text-sm font-medium">{formatCurrency(totalValue)}</td>
                                            
                                            {/* Cash Balance */}
                                            <td className="px-3 py-2 whitespace-nowrap text-right text-sm hidden md:table-cell">{formatCurrency(account.cash_balance ?? 0)}</td>
                                            
                                            {/* Cost Basis */}
                                            <td className="px-3 py-2 whitespace-nowrap text-right text-sm hidden md:table-cell">{formatCurrency(costBasis)}</td>
                                            
                                            {/* Gain/Loss */}
                                            <td className="px-3 py-2 whitespace-nowrap text-right">
                                                <div className="flex flex-col items-end">
                                                    <div className={`text-sm font-medium ${gainLoss >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                                        {gainLoss >= 0 ? '+' : ''}{formatCurrency(gainLoss)}
                                                    </div>
                                                    <div className={`text-xs ${gainLoss >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                                        ({gainLoss >= 0 ? '+' : ''}{formatPercentage(gainLossPercent)})
                                                    </div>
                                                </div>
                                            </td>
                                            
                                            {/* Actions Cell */}
                                            <td className="px-3 py-2 whitespace-nowrap text-center">
                                                <div className="flex items-center justify-center space-x-2">
                                                    <AddPositionButton 
                                                        accountId={account.id}
                                                        className="p-1.5 bg-green-600/20 text-green-400 rounded-full hover:bg-green-600/40"
                                                        buttonContent={<Plus className="h-4 w-4" />}
                                                        onPositionAdded={() => {
                                                            fetchData();
                                                            onDataChanged();
                                                        }}
                                                    />
                                                    <EditAccountButton 
                                                        account={account}
                                                        className="p-1.5 bg-purple-600/20 text-purple-400 rounded-full hover:bg-purple-600/40" 
                                                        onAccountEdited={() => {
                                                            fetchData();
                                                            onDataChanged();
                                                        }}
                                                    />
                                                    <button 
                                                        onClick={(e) => { e.stopPropagation(); handleDeleteClick(account); }} 
                                                        className="p-1.5 bg-red-600/20 text-red-400 rounded-full hover:bg-red-600/40" 
                                                        title="Delete Account"
                                                    >
                                                        <Trash className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* --- Render Modals / Flows --- */}
            {selectedAccountDetail && (
                <AccountDetailModal
                    isOpen={isDetailModalOpen}
                    onClose={handleCloseDetailModal}
                    account={selectedAccountDetail}
                    onTriggerEdit={handleEditClick}
                    onTriggerDelete={handleDeleteClick}
                    onTriggerAddPosition={handleAddPositionClick}
                />
            )}

            {accountToDelete && (
                <DeleteConfirmationModal
                    isOpen={isDeleteModalOpen}
                    onClose={handleCloseDeleteModal}
                    onConfirm={handleConfirmDelete}
                    itemName={accountToDelete?.account_name}
                    itemType="account"
                />
            )}

            {isEditModalOpen && (
                <AccountModal
                    isOpen={isEditModalOpen}
                    onClose={handleCloseEditModal}
                    editAccount={accountToEdit}
                />
            )}

            {isAddPositionFlowOpen && (
                <AddPositionFlow
                    isOpen={isAddPositionFlowOpen}
                    onClose={handleCloseAddPositionFlow}
                    initialAccount={accountForPosition}
                />
            )}
        </>
    );
};

export default AccountTable;