import { useEffect, useState, useCallback } from "react";
import {
    BarChartHorizontalBig, // Changed icon for page title
    TrendingUp,
    TrendingDown,
    PlusCircle,
    GripVertical, // Icon for drag handle
    Trash2, // Icon for remove button
    X
} from 'lucide-react';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';

// Import the new components (assuming they are created in ./components/)
import BenchmarkTable from '../components/tables/BenchmarkTable';
import ChartModal from '../components/ChartModal';
import { fetchDashboardData, fetchHistoricalData } from '../utils/apimethods/marketDataMethods'; // Placeholder API methods
import { fetchPortfolioSummary } from '../utils/apimethods/portfolioMethods'; // Placeholder for NestEgg data

// Mock user data - in real app, this would come from authentication context
const mockUser = {
    name: "Sarah Johnson",
    email: "sarah.johnson@example.com",
    profilePicture: null
};

// Initial state for dashboard items - REPLACE WITH ACTUAL FETCHED DATA
const initialDashboardItems = [
    {
      id: "NEST_EGG", // Special ID for user's portfolio
      symbol: "NEST_EGG",
      name: "Your NestEgg",
      price: "Loading...", // Will be fetched
      change1d: 0, change1w: 0, changeYTD: 0, change1y: 0, change2y: 0, change3y: 0,
      color: "#8B5CF6", // Example color
      isUserPortfolio: true,
      isRemovable: false,
    },
    {
      id: "SPX",
      symbol: "SPX",
      name: "S&P 500",
      price: "5,983.25",
      change1d: -0.50, change1w: 1.25, changeYTD: 8.75, change1y: 22.45, change2y: 15.20, change3y: 35.80,
      color: "#4A90E2",
      isRemovable: true,
    },
    {
      id: "DJI",
      symbol: "DJI",
      name: "Dow Jones",
      price: "43,461.21",
      change1d: 0.08, change1w: 0.95, changeYTD: 5.45, change1y: 15.80, change2y: 10.25, change3y: 28.40,
      color: "#10B981",
      isRemovable: true,
    },
    {
      id: "BTC",
      symbol: "BTC",
      name: "Bitcoin",
      price: "$93,356.18",
      change1d: -2.45, change1w: 5.85, changeYTD: 38.75, change1y: 145.60, change2y: 85.25, change3y: 380.40,
      color: "#F97316",
      isRemovable: true,
    },
    {
      id: "GOLD", // Added Gold
      symbol: "GC=F", // Example symbol for Gold Futures
      name: "Gold",
      price: "$2,450.50",
      change1d: 0.15, change1w: -0.50, changeYTD: 6.20, change1y: 18.90, change2y: 12.10, change3y: 25.50,
      color: "#FACC15", // Gold color
      isRemovable: true,
    },
    {
      id: "TNX",
      symbol: "TNX", // Or ^TNX depending on source
      name: "10-Year Treasury",
      price: "4.393%",
      change1d: -0.03, change1w: 0.12, changeYTD: 0.45, change1y: -0.65, change2y: 1.25, change3y: 2.85,
      color: "#F59E0B",
      isRemovable: true,
    },
    // Add "Select Stocks" here if needed, or handle via Add button
];

// Time periods remain the same
const timePeriods = [
    { id: "1d", label: "1 Day", dataPoints: 24 },
    { id: "1w", label: "1 Week", dataPoints: 7 },
    { id: "ytd", label: "YTD", dataPoints: 12 }, // Simplified points for mock data
    { id: "1y", label: "1 Year", dataPoints: 12 },
    { id: "2y", label: "2 Year", dataPoints: 24 },
    { id: "3y", label: "3 Year", dataPoints: 36 }
];

export default function PortfolioBenchmarking() {
    const [user, setUser] = useState(mockUser); // Replace with auth context
    const [dashboardItems, setDashboardItems] = useState(initialDashboardItems);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [chartModalData, setChartModalData] = useState({
        isOpen: false,
        symbol: null,
        name: null,
        timeframe: null
    });

    // --- Data Fetching ---
    useEffect(() => {
        const loadData = async () => {
            setIsLoading(true);
            setError(null);
            try {
                // 1. Fetch User's Portfolio Summary ("NestEgg") - Placeholder
                // const portfolioSummary = await fetchPortfolioSummary(); // Needs implementation
                const portfolioSummary = { price: "$123,456.78", change1d: 0.55, /* other changes */ }; // Mock

                // 2. Fetch data for other benchmark symbols
                const symbolsToFetch = initialDashboardItems
                    .filter(item => !item.isUserPortfolio)
                    .map(item => item.symbol);

                // const marketQuotes = await fetchDashboardData(symbolsToFetch); // Needs implementation
                const marketQuotes = initialDashboardItems.reduce((acc, item) => { // Mock - Use API result instead
                    if (!item.isUserPortfolio) acc[item.symbol] = { ...item };
                    return acc;
                }, {});

                // 3. Update dashboard items state
                setDashboardItems(prevItems =>
                    prevItems.map(item => {
                        if (item.isUserPortfolio) {
                            return { ...item, ...portfolioSummary, price: portfolioSummary.price }; // Update NestEgg
                        }
                        if (marketQuotes[item.symbol]) {
                            return { ...item, ...marketQuotes[item.symbol] }; // Update benchmark data
                        }
                        return item;
                    })
                );

            } catch (err) {
                console.error("Error loading dashboard data:", err);
                setError("Failed to load benchmarking data. Please try again later.");
                // Keep initial mock data on error? Or show an error message?
                 setDashboardItems(initialDashboardItems); // Reset to mock on error for now
            } finally {
                setIsLoading(false);
            }
        };

        loadData();
        // TODO: Add logic to fetch user's saved dashboard items/order if persistence is implemented
    }, []); // Runs on mount

    // --- Handlers ---
    const handleChartOpen = useCallback((symbol, name, timeframe) => {
        setChartModalData({ isOpen: true, symbol, name, timeframe });
    }, []);

    const handleChartClose = useCallback(() => {
        setChartModalData({ isOpen: false, symbol: null, name: null, timeframe: null });
    }, []);

    const handleAddItemClick = () => {
        // TODO: Implement Add Item Modal/Search functionality
        alert("Placeholder: Open modal to search and add benchmarks/securities.");
        // 1. Open Modal
        // 2. User searches/selects item (needs backend search endpoint)
        // 3. Fetch data for the new item (using fetchDashboardData or similar)
        // 4. Add item to dashboardItems state
        // 5. Optionally save the updated list to user preferences (backend)
    };

    const handleRemoveItem = useCallback((idToRemove) => {
        setDashboardItems(prevItems => prevItems.filter(item => item.id !== idToRemove));
        // TODO: Save updated list to user preferences (backend)
    }, []);

    // --- Drag & Drop ---
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                 // Require pointer movement before starting drag
                distance: 5,
            },
        })
    );

    const handleDragEnd = useCallback((event) => {
        const { active, over } = event;
        if (active.id !== over.id) {
            setDashboardItems((items) => {
                const oldIndex = items.findIndex((item) => item.id === active.id);
                const newIndex = items.findIndex((item) => item.id === over.id);
                // Ensure "Your NestEgg" always stays at the top if desired
                // if (items[oldIndex]?.isUserPortfolio || items[newIndex]?.isUserPortfolio) {
                //   // Optional: Prevent dragging NestEgg or dragging over it
                //   // return items;
                // }
                 const reorderedItems = arrayMove(items, oldIndex, newIndex);
                 // TODO: Save new order to user preferences (backend)
                 return reorderedItems;

            });
        }
    }, []);


    // Helper to map timeframe ID to change key in dashboardItems
    const timeframeToChangeKey = (timeframe) => {
        switch(timeframe) {
            case "1d": return "change1d";
            case "1w": return "change1w";
            case "ytd": return "changeYTD";
            case "1y": return "change1y";
            case "2y": return "change2y";
            case "3y": return "change3y";
            default: return "change1d";
        }
    };

    // Function to render trend (moved here, could be in BenchmarkTable or utils)
    const renderTrend = (change) => {
        if (typeof change !== 'number') return <span className="text-gray-500">-</span>;
        if (change > 0) {
            return (
                <div className="flex items-center justify-end text-green-500">
                    <TrendingUp className="h-4 w-4 mr-1" />
                    <span>+{change.toFixed(2)}%</span>
                </div>
            );
        } else if (change < 0) {
            return (
                <div className="flex items-center justify-end text-red-500">
                    <TrendingDown className="h-4 w-4 mr-1" />
                    <span>{change.toFixed(2)}%</span>
                </div>
            );
        } else {
            return <span className="text-gray-500">0.00%</span>;
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 to-blue-900 text-white p-4 md:p-8">
            <div className="container mx-auto">
                {/* Header */}
                <header className="mb-8 md:mb-12">
                    <h1 className="text-3xl md:text-4xl font-bold mb-2 flex items-center">
                        <BarChartHorizontalBig className="w-8 h-8 mr-3 text-blue-400" />
                        Portfolio Benchmarking Dashboard
                    </h1>
                    <p className="text-lg text-gray-300">
                        Track your portfolio's performance against key market benchmarks and custom securities.
                    </p>
                </header>

                {/* Benchmarking Table Section */}
                <div className="bg-gray-800/60 backdrop-blur-sm p-4 sm:p-6 md:p-8 rounded-xl shadow-xl">
                    <h2 className="text-2xl font-semibold mb-4 text-gray-100">Your Dashboard</h2>
                    <p className="text-gray-400 mb-6 text-sm">
                        Drag <GripVertical className="inline h-4 w-4 mx-1 text-gray-500" /> to reorder. Click trend percentages to view charts.
                    </p>

                    {error && (
                         <div className="text-red-400 text-center mb-4 p-4 bg-red-900/30 rounded">
                            {error}
                        </div>
                    )}

                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd}
                    >
                        <SortableContext
                            items={dashboardItems.map(item => item.id)}
                            strategy={verticalListSortingStrategy}
                        >
                            <BenchmarkTable
                                items={dashboardItems}
                                timePeriods={timePeriods}
                                isLoading={isLoading}
                                onChartOpen={handleChartOpen}
                                onRemoveItem={handleRemoveItem}
                                renderTrend={renderTrend} // Pass render function
                                timeframeToChangeKey={timeframeToChangeKey} // Pass helper
                            />
                        </SortableContext>
                    </DndContext>

                    {/* Add Item Button */}
                    <div className="mt-6 text-center">
                         <button
                            onClick={handleAddItemClick}
                            className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800"
                         >
                            <PlusCircle className="w-5 h-5 mr-2" />
                            Add Benchmark/Security
                         </button>
                    </div>
                </div>
            </div>

            {/* Chart Modal */}
            <ChartModal
                isOpen={chartModalData.isOpen}
                onClose={handleChartClose}
                symbol={chartModalData.symbol}
                name={chartModalData.name}
                timeframe={chartModalData.timeframe}
                timePeriods={timePeriods} // Pass timePeriods for label lookup
                renderTrend={renderTrend} // Pass render function
                timeframeToChangeKey={timeframeToChangeKey} // Pass helper
                fetchHistoricalData={fetchHistoricalData} // Pass the actual fetch function
                 // Pass existing static data as a fallback or for comparison
                staticMarketData={dashboardItems} // Or pass the specific item if needed
            />
        </div>
    );
}