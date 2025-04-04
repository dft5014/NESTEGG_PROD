import React, { useState, useEffect } from 'react';
import { Line } from "react-chartjs-2";
import "chart.js/auto"; // Required for Chart.js v3+
import { X } from 'lucide-react';
// import { fetchHistoricalData } from '../utils/apiMethods/marketDataMethods'; // Already passed as prop


// Function to generate mock chart data (keep as fallback/placeholder)
const generateMockChartData = (symbol, name, timeframe, timePeriods, staticMarketData) => {
    const marketIndex = staticMarketData.find(m => m.symbol === symbol);
    if (!marketIndex) return null;

    const timeInfo = timePeriods.find(t => t.id === timeframe);
    if (!timeInfo) return null;

    // Simplified mock data generation - REPLACE WITH ACTUAL FETCHED DATA
    const labels = Array.from({ length: timeInfo.dataPoints }, (_, i) => `P${i + 1}`);
    const data = [];
    let startValue = 100; // Use a generic start or try to parse actual price
    try {
        startValue = parseFloat(marketIndex.price?.replace(/[^0-9.-]+/g, '')) || 100;
    } catch { /* ignore error */ }

    const changeKey = timeframeToChangeKey(timeframe); // Assume this helper is available or passed
    const targetChange = marketIndex[changeKey] || 0;
    const targetEndValue = startValue * (1 + targetChange / 100);

    for (let i = 0; i < timeInfo.dataPoints; i++) {
        const progress = i / (timeInfo.dataPoints - 1);
        const trendValue = startValue + progress * (targetEndValue - startValue);
        const randomFactor = (Math.random() - 0.5) * 5 * (startValue / 100); // Simple volatility
        data.push(i === timeInfo.dataPoints - 1 ? targetEndValue : trendValue + randomFactor);
    }

    return {
        labels,
        datasets: [{
            label: `${name} (${timeInfo.label})`,
            data,
            borderColor: marketIndex.color || '#4A90E2',
            backgroundColor: `${marketIndex.color || '#4A90E2'}33`,
            borderWidth: 2,
            pointRadius: 1,
            pointHoverRadius: 5,
            tension: 0.3,
            fill: true
        }]
    };
};

// Helper to map timeframe ID to change key (can be utility)
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

const ChartModal = ({
    isOpen,
    onClose,
    symbol,
    name,
    timeframe,
    timePeriods,
    renderTrend,
    fetchHistoricalData, // Function to fetch real data
    staticMarketData // Pass the static data for summary info fallback
}) => {
    const [chartData, setChartData] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (isOpen && symbol && timeframe && fetchHistoricalData) {
            const loadChartData = async () => {
                setIsLoading(true);
                setError(null);
                setChartData(null); // Clear previous data
                try {
                    // --- API Call for REAL Data ---
                    const historicalData = await fetchHistoricalData(symbol, timeframe);

                    // --- Process API Response ---
                    // This depends heavily on your API response structure
                    // Example: Assuming API returns { labels: [...], data: [...] }
                    if (!historicalData || !historicalData.labels || !historicalData.data) {
                        throw new Error("Invalid data format received from API.");
                    }

                     const currentItem = staticMarketData.find(m => m.symbol === symbol);
                     const timeInfo = timePeriods.find(t => t.id === timeframe);

                    setChartData({
                        labels: historicalData.labels,
                        datasets: [{
                            label: `${name} (${timeInfo?.label})`,
                            data: historicalData.data,
                            borderColor: currentItem?.color || '#4A90E2',
                            backgroundColor: `${currentItem?.color || '#4A90E2'}33`,
                            borderWidth: 2, pointRadius: 1, pointHoverRadius: 5, tension: 0.3, fill: true
                        }]
                    });
                } catch (err) {
                    console.error("Error fetching historical data:", err);
                    setError(`Failed to load chart data for ${symbol}.`);
                    // Optionally fall back to mock data for display?
                    // setChartData(generateMockChartData(symbol, name, timeframe, timePeriods, staticMarketData));
                } finally {
                    setIsLoading(false);
                }
            };
            loadChartData();
        } else {
             // Reset when modal is closed or parameters missing
            setChartData(null);
            setIsLoading(false);
            setError(null);
        }
    }, [isOpen, symbol, timeframe, name, fetchHistoricalData, timePeriods, staticMarketData]); // Dependencies


    // Chart Options (similar to before, adjusted slightly)
    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false }, // Keep it clean, title is above
            tooltip: { mode: 'index', intersect: false, bodyFont: { size: 12 }, titleFont: { size: 14 } }
        },
        scales: {
            x: {
                grid: { color: 'rgba(255, 255, 255, 0.1)' },
                ticks: { color: 'rgba(255, 255, 255, 0.7)', maxRotation: 0, autoSkip: true, maxTicksLimit: 10 } // Limit ticks
            },
            y: {
                grid: { color: 'rgba(255, 255, 255, 0.1)' },
                ticks: {
                    color: 'rgba(255, 255, 255, 0.7)',
                    callback: function(value) {
                        // Formatting based on symbol type (example)
                        if (symbol === 'BTC') return '$' + value.toLocaleString();
                        if (symbol === 'TNX') return value.toFixed(2) + '%';
                        return value.toLocaleString();
                    }
                }
            }
        },
        interaction: { mode: 'nearest', axis: 'x', intersect: false }
    };

    // Calculate summary data (use real chart data when available)
    const currentItemData = staticMarketData.find(m => m.symbol === symbol);
    let periodRange = "N/A";
    if (chartData && chartData.datasets[0].data.length > 0) {
         const dataPoints = chartData.datasets[0].data.filter(p => p !== null && p !== undefined); // Filter nulls if any
         if (dataPoints.length > 0) {
            const min = Math.min(...dataPoints);
            const max = Math.max(...dataPoints);
            // Apply formatting similar to y-axis ticks
             if (symbol === 'BTC') periodRange = `$${min.toLocaleString()} - $${max.toLocaleString()}`;
             else if (symbol === 'TNX') periodRange = `${min.toFixed(2)}% - ${max.toFixed(2)}%`;
             else periodRange = `${min.toLocaleString()} - ${max.toLocaleString()}`;
         }

    }

    if (!isOpen) return null;

    const timeLabel = timePeriods.find(t => t.id === timeframe)?.label || timeframe;

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 transition-opacity duration-300">
            <div className="bg-gray-800 rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden">
                {/* Modal Header */}
                <div className="flex justify-between items-center p-4 border-b border-gray-700 flex-shrink-0">
                    <h3 className="text-lg sm:text-xl font-semibold text-gray-100">
                         {name} - {timeLabel} Performance
                    </h3>
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-full transition-colors"
                        aria-label="Close modal"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Modal Body */}
                <div className="p-4 sm:p-6 overflow-y-auto flex-grow">
                     {/* Chart Area */}
                    <div className="bg-gray-900/50 p-4 rounded-lg mb-4 min-h-[300px] sm:min-h-[350px] flex items-center justify-center">
                        {isLoading && <div className="text-gray-400">Loading chart data...</div>}
                        {error && <div className="text-red-400 text-center">{error}</div>}
                        {!isLoading && !error && chartData && (
                            <div className="h-72 sm:h-80 w-full"> {/* Fixed height container */}
                                <Line data={chartData} options={chartOptions} />
                            </div>
                        )}
                         {!isLoading && !error && !chartData && <div className="text-gray-500">No chart data available.</div>}
                    </div>

                    {/* Data Summary */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-gray-900/50 p-4 rounded-lg">
                            <h4 className="text-gray-400 text-sm mb-1">Current Price</h4>
                            <p className="text-lg sm:text-xl font-semibold text-gray-100">
                                {currentItemData?.price || 'N/A'}
                            </p>
                        </div>
                        <div className="bg-gray-900/50 p-4 rounded-lg">
                            <h4 className="text-gray-400 text-sm mb-1">{timeLabel} Change</h4>
                            <div className="text-lg sm:text-xl font-semibold">
                                {renderTrend(currentItemData?.[timeframeToChangeKey(timeframe)])}
                            </div>
                        </div>
                        <div className="bg-gray-900/50 p-4 rounded-lg">
                            <h4 className="text-gray-400 text-sm mb-1">{timeLabel} Range (Chart)</h4>
                            <p className="text-lg sm:text-xl font-semibold text-gray-100">
                                {isLoading ? 'Loading...' : error ? 'Error' : periodRange}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ChartModal;