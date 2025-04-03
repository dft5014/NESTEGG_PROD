// components/tables/TestMetalsTable.js
import React, { useState, useEffect, useMemo } from 'react';
import { fetchAllMetalsWithDetails } from '@/utils/apimethods/testPositionMethods'; // Use TEST methods
import TestMetalDetailModal from '@/components/modals/TestMetalDetailModal'; // Use TEST metal modal
import { Gem, Settings, Trash, Loader, Info, Search, SlidersHorizontal } from 'lucide-react'; // Use relevant icons
import { formatCurrency, formatDate, formatNumber } from '@/utils/formatters';

const TestMetalsTable = ({ initialSort = "total_value-high" }) => {
  const [positions, setPositions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedPositionDetail, setSelectedPositionDetail] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [sortOption, setSortOption] = useState(initialSort);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchData = async () => { /* ... (same as TestCryptoTable, but call fetchAllMetalsWithDetails) ... */
    console.log("TestMetalsTable: Fetching data...");
    setIsLoading(true); setError(null);
    try {
        const fetchedPositions = await fetchAllMetalsWithDetails();
        console.log("TestMetalsTable: Data received:", fetchedPositions);
        setPositions(fetchedPositions);
    } catch (err) {
        console.error("TestMetalsTable fetch error:", err);
        setError(err.message || "Failed to load metal positions.");
    } finally { setIsLoading(false); }
  };
  useEffect(() => { fetchData(); }, []);

  const filteredAndSortedPositions = useMemo(() => { /* ... (adapt sorting/filtering logic for metal fields) ... */
    let filtered = positions;
    if (searchQuery) {
        const lowerCaseQuery = searchQuery.toLowerCase();
        filtered = filtered.filter(pos =>
            (pos.metal_type && pos.metal_type.toLowerCase().includes(lowerCaseQuery)) ||
            (pos.account_name && pos.account_name.toLowerCase().includes(lowerCaseQuery)) ||
            (pos.storage_location && pos.storage_location.toLowerCase().includes(lowerCaseQuery))
        );
    }
    const sorted = [...filtered].sort((a, b) => {
      switch (sortOption) {
        case "total_value-high": return (b.total_value || 0) - (a.total_value || 0);
        case "total_value-low": return (a.total_value || 0) - (b.total_value || 0);
        case "gain_loss-high": return (b.gain_loss || 0) - (a.gain_loss || 0);
        case "gain_loss-low": return (a.gain_loss || 0) - (b.gain_loss || 0);
        case "gain_loss_percent-high": return (b.gain_loss_percent || 0) - (a.gain_loss_percent || 0);
        case "gain_loss_percent-low": return (a.gain_loss_percent || 0) - (b.gain_loss_percent || 0);
        case "metal_type": return (a.metal_type || "").localeCompare(b.metal_type || "");
        case "account": return (a.account_name || "").localeCompare(b.account_name || "");
        case "quantity-high": return (b.quantity || 0) - (a.quantity || 0);
        case "quantity-low": return (a.quantity || 0) - (b.quantity || 0);
        default: return 0;
      }
    });
    return sorted;
  }, [positions, sortOption, searchQuery]);

  const handleRowClick = (position) => { setSelectedPositionDetail(position); setIsDetailModalOpen(true); };

  if (isLoading) { return ( <div className="bg-gray-800/70 backdrop-blur-sm rounded-xl p-8 text-center min-h-[300px] flex items-center justify-center"><div> <Loader className="inline-block w-8 h-8 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin mb-4" /> <p className="text-gray-400">Loading metal positions...</p> </div></div> ); }
  if (error) { return ( <div className="bg-red-900/60 p-4 rounded-lg text-red-200"><div className="font-medium mb-1">Error Loading Metals</div><div className="text-sm">{error}</div><button onClick={fetchData} className="mt-2 text-xs bg-red-800/80 hover:bg-red-700/80 py-1 px-2 rounded">Retry</button></div> ); }

  return (
    <>
      <div className="bg-gray-800/70 backdrop-blur-sm rounded-xl mb-8 overflow-hidden">
        {/* Header */}
        <div className="flex flex-wrap justify-between items-center p-4 border-b border-gray-700 gap-4">
          <h2 className="text-xl font-semibold flex items-center whitespace-nowrap"> <Gem className="w-5 h-5 mr-2 text-gray-400" /> Test Metals Table </h2>
          {/* Controls */}
          <div className='flex flex-wrap items-center gap-4'>
            <div className="relative flex-grow sm:flex-grow-0"><div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Search className="h-4 w-4 text-gray-400" /></div><input type="text" className="bg-gray-700 text-white w-full pl-9 pr-3 py-2 rounded-lg text-sm focus:ring-1 focus:ring-blue-500 focus:outline-none" placeholder="Search Type/Acct..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} /></div>
            <div className="relative flex-grow sm:flex-grow-0"><div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><SlidersHorizontal className="h-4 w-4 text-gray-400" /></div><select className="bg-gray-700 text-white w-full pl-9 pr-8 py-2 rounded-lg text-sm focus:ring-1 focus:ring-blue-500 focus:outline-none appearance-none" value={sortOption} onChange={(e) => setSortOption(e.target.value)}> <option value="total_value-high">Sort: Value (High-Low)</option> <option value="total_value-low">Sort: Value (Low-High)</option> <option value="metal_type">Sort: Type (A-Z)</option> <option value="account">Sort: Account (A-Z)</option> <option value="gain_loss-high">Sort: Gain $ (High-Low)</option> <option value="gain_loss-low">Sort: Gain $ (Low-High)</option> <option value="gain_loss_percent-high">Sort: Gain % (High-Low)</option> <option value="gain_loss_percent-low">Sort: Gain % (Low-High)</option> <option value="quantity-high">Sort: Qty (High-Low)</option> <option value="quantity-low">Sort: Qty (Low-High)</option> </select><div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none"><svg className="h-4 w-4 text-gray-400" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg></div></div>
          </div>
        </div>

        {/* Table Content */}
        {filteredAndSortedPositions.length === 0 ? (
           <div className="p-8 text-center min-h-[200px] flex flex-col items-center justify-center"> <div className="bg-gray-700/50 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4"> <Gem className="h-8 w-8 text-gray-500" /> </div> <h3 className="text-xl font-medium mb-2">No metal positions found</h3> <p className="text-gray-400 max-w-md mx-auto">{searchQuery ? "No positions match your search." : "Add metal positions to see them here."}</p> </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-700">
              <thead className="bg-gray-900/50 sticky top-0 z-10">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Type</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider hidden md:table-cell">Account</th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">Quantity</th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider hidden sm:table-cell">Current Price</th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider hidden lg:table-cell">Cost Basis</th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">Value</th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">Gain/Loss</th>
                  <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {filteredAndSortedPositions.map((position) => {
                   const { gain_loss, gain_loss_percent } = position;
                   return (
                     <tr key={position.id} className="hover:bg-gray-700/50 transition-colors cursor-pointer" onClick={() => handleRowClick(position)}>
                       <td className="px-6 py-4 whitespace-nowrap"><div className="flex items-center"><div className="flex-shrink-0 h-8 w-8 rounded-full bg-gradient-to-br from-yellow-400 to-gray-500 flex items-center justify-center mr-3"><Gem className="h-4 w-4 text-white"/></div><div><div className="text-sm font-medium">{position.metal_type}</div><div className="text-xs text-gray-400 md:hidden">{position.account_name}</div></div></div></td>
                       <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300 hidden md:table-cell">{position.account_name}</td>
                       <td className="px-6 py-4 whitespace-nowrap text-right text-sm">{formatNumber(position.quantity)} {position.unit}</td>
                       <td className="px-6 py-4 whitespace-nowrap text-right text-sm hidden sm:table-cell">{formatCurrency(position.current_price_per_unit)}</td>
                       <td className="px-6 py-4 whitespace-nowrap text-right text-sm hidden lg:table-cell">{formatCurrency(position.cost_basis)}</td>
                       <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">{formatCurrency(position.total_value)}</td>
                       <td className="px-6 py-4 whitespace-nowrap text-right"><div className="flex flex-col items-end"><div className={`text-sm font-medium ${gain_loss >= 0 ? 'text-green-500' : 'text-red-500'}`}>{gain_loss >= 0 ? '+' : ''}{formatCurrency(gain_loss)}</div><div className={`text-xs ${gain_loss >= 0 ? 'text-green-500' : 'text-red-500'}`}>{gain_loss >= 0 ? '+' : ''}{gain_loss_percent.toFixed(2)}%</div></div></td>
                       <td className="px-6 py-4 whitespace-nowrap text-center"><button onClick={(e) => { e.stopPropagation(); handleRowClick(position); }} className="p-1.5 bg-gray-600/30 text-gray-400 rounded-full hover:bg-gray-600/50 transition-colors" title="View Details"><Info className="h-4 w-4" /></button></td>
                     </tr>
                   );
                 })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Render the Detail Modal */}
      <TestMetalDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        position={selectedPositionDetail}
      />
    </>
  );
};

export default TestMetalsTable;