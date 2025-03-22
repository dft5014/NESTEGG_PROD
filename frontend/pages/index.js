import { useEffect, useState } from "react";
import { 
  PiggyBank, 
  ChartLine, 
  PlusCircle,
  TrendingUp,
  TrendingDown,
  BarChart2,
  DollarSign,
  X
} from 'lucide-react';
import { Line } from "react-chartjs-2";
import "chart.js/auto";

export default function Home() {
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [chartModal, setChartModal] = useState({
        isOpen: false,
        index: null,
        timeframe: null
    });
    
    // Mock user data - in real app, this would come from authentication context
    const user = {
        name: "Sarah Johnson",
        email: "sarah.johnson@example.com",
        profilePicture: null
    };

    // Market data
    const [marketData, setMarketData] = useState([
        {
          name: "S&P 500",
          symbol: "SPX",
          price: "5,983.25",
          change1d: -0.50,
          change1w: 1.25,
          changeYTD: 8.75,
          change1y: 22.45,
          change2y: 15.20,
          change3y: 35.80,
          color: "#4A90E2"
        },
        {
          name: "Nasdaq",
          symbol: "COMP",
          price: "19,286.93",
          change1d: -1.21,
          change1w: -0.85,
          changeYTD: 12.35,
          change1y: 28.60,
          change2y: 18.45,
          change3y: 42.60,
          color: "#7C3AED"
        },
        {
          name: "Dow Jones",
          symbol: "DJI",
          price: "43,461.21",
          change1d: 0.08,
          change1w: 0.95,
          changeYTD: 5.45,
          change1y: 15.80,
          change2y: 10.25,
          change3y: 28.40,
          color: "#10B981"
        },
        {
          name: "10-Year Treasury",
          symbol: "TNX",
          price: "4.393%",
          change1d: -0.03,
          change1w: 0.12,
          changeYTD: 0.45,
          change1y: -0.65,
          change2y: 1.25,
          change3y: 2.85,
          color: "#F59E0B"
        },
        {
          name: "Bitcoin",
          symbol: "BTC",
          price: "$93,356.18",
          change1d: -2.45,
          change1w: 5.85,
          changeYTD: 38.75,
          change1y: 145.60,
          change2y: 85.25,
          change3y: 380.40,
          color: "#F97316"
        }
    ]);

    // Time periods
    const timePeriods = [
        { id: "1d", label: "1 Day", dataPoints: 24 },
        { id: "1w", label: "1 Week", dataPoints: 7 },
        { id: "ytd", label: "YTD", dataPoints: 12 },
        { id: "1y", label: "1 Year", dataPoints: 12 },
        { id: "2y", label: "2 Year", dataPoints: 24 },
        { id: "3y", label: "3 Year", dataPoints: 36 }
    ];

    // Function to generate mock chart data
    const generateChartData = (index, timeframe) => {
        const marketIndex = marketData.find(m => m.symbol === index);
        if (!marketIndex) return null;
        
        const timeInfo = timePeriods.find(t => t.id === timeframe);
        if (!timeInfo) return null;
        
        const labels = [];
        const data = [];
        let startValue = parseInt(marketIndex.price.replace(/[^0-9.]/g, ''));
        let volatility = 0;
        
        // Set volatility based on time period
        switch(timeframe) {
            case "1d": volatility = 0.2; break;
            case "1w": volatility = 0.5; break;
            case "ytd": volatility = 2; break;
            case "1y": volatility = 5; break;
            case "2y": volatility = 8; break;
            case "3y": volatility = 12; break;
            default: volatility = 1;
        }
        
        // Generate dates based on timeframe
        for (let i = 0; i < timeInfo.dataPoints; i++) {
            const date = new Date();
            
            switch(timeframe) {
                case "1d":
                    date.setHours(date.getHours() - (timeInfo.dataPoints - i - 1));
                    labels.push(date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}));
                    break;
                case "1w":
                    date.setDate(date.getDate() - (timeInfo.dataPoints - i - 1));
                    labels.push(date.toLocaleDateString([], {weekday: 'short'}));
                    break;
                case "ytd":
                    date.setMonth(i);
                    labels.push(date.toLocaleDateString([], {month: 'short'}));
                    break;
                case "1y":
                    date.setMonth(date.getMonth() - (timeInfo.dataPoints - i - 1));
                    labels.push(date.toLocaleDateString([], {month: 'short'}));
                    break;
                case "2y":
                    date.setMonth(date.getMonth() - (timeInfo.dataPoints - i - 1));
                    labels.push(date.toLocaleDateString([], {month: 'short', year: '2-digit'}));
                    break;
                case "3y":
                    date.setMonth(date.getMonth() - (timeInfo.dataPoints - i - 1));
                    labels.push(date.toLocaleDateString([], {month: 'short', year: '2-digit'}));
                    break;
                default:
                    labels.push(`Point ${i}`);
            }
        }
        
        // Generate data with a trend that matches the overall change percentage
        const changeKey = timeframeToChangeKey(timeframe);
        const targetChange = marketIndex[changeKey] || 0;
        const targetEndValue = startValue * (1 + targetChange/100);
        
        // Generate fluctuating data that ends at the target value
        for (let i = 0; i < timeInfo.dataPoints; i++) {
            if (i === 0) {
                data.push(startValue);
            } else if (i === timeInfo.dataPoints - 1) {
                data.push(targetEndValue);
            } else {
                // Calculate a point along the path from start to target with some randomness
                const progress = i / (timeInfo.dataPoints - 1);
                const trendValue = startValue + progress * (targetEndValue - startValue);
                const randomFactor = (Math.random() - 0.5) * volatility * (startValue / 100);
                data.push(trendValue + randomFactor);
            }
        }
        
        return {
            labels,
            datasets: [
                {
                    label: `${marketIndex.name} (${timeInfo.label})`,
                    data,
                    borderColor: marketIndex.color,
                    backgroundColor: `${marketIndex.color}33`,
                    borderWidth: 2,
                    pointRadius: 1,
                    pointHoverRadius: 5,
                    tension: 0.3,
                    fill: true
                }
            ]
        };
    };

    // Helper to map timeframe ID to change key in marketData
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

    // Function to render trend arrow and proper styling based on change value
    const renderTrend = (change) => {
        if (change > 0) {
            return (
                <div className="flex items-center text-green-500">
                    <TrendingUp className="h-4 w-4 mr-1" />
                    <span>+{change.toFixed(2)}%</span>
                </div>
            );
        } else if (change < 0) {
            return (
                <div className="flex items-center text-red-500">
                    <TrendingDown className="h-4 w-4 mr-1" />
                    <span>{change.toFixed(2)}%</span>
                </div>
            );
        } else {
            return <span className="text-gray-500">0.00%</span>;
        }
    };

    // Chart options
    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'top',
                labels: {
                    color: 'rgba(255, 255, 255, 0.9)'
                }
            },
            tooltip: {
                mode: 'index',
                intersect: false
            }
        },
        scales: {
            x: {
                grid: {
                    color: 'rgba(255, 255, 255, 0.1)'
                },
                ticks: {
                    color: 'rgba(255, 255, 255, 0.7)'
                }
            },
            y: {
                grid: {
                    color: 'rgba(255, 255, 255, 0.1)'
                },
                ticks: {
                    color: 'rgba(255, 255, 255, 0.7)',
                    callback: function(value) {
                        if (chartModal.index === 'BTC') {
                            return '$' + value.toLocaleString();
                        } else if (chartModal.index === 'TNX') {
                            return value.toFixed(2) + '%';
                        } else {
                            return value.toLocaleString();
                        }
                    }
                }
            }
        },
        interaction: {
            mode: 'nearest',
            axis: 'x',
            intersect: false
        }
    };

    // Mock function for position adding
    const handleAddPosition = (symbol) => {
        alert(`Add position for ${symbol}`);
        // In a real implementation, this would open the position adding modal
    };

    // Open chart modal
    const openChartModal = (index, timeframe) => {
        setChartModal({
            isOpen: true,
            index: index,
            timeframe: timeframe
        });
    };

    // Close chart modal
    const closeChartModal = () => {
        setChartModal({
            isOpen: false,
            index: null,
            timeframe: null
        });
    };

    useEffect(() => {
        // Mock loading state
        setTimeout(() => {
            setIsLoading(false);
        }, 1000);
    }, []);

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 to-blue-900 text-white">
            {/* Main Content Container */}
            <div className="container mx-auto px-4 py-16">
                {/* Header */}
                <header className="text-center mb-16">
                    <div className="flex items-center justify-center mb-6">
                        <PiggyBank className="w-16 h-16 text-blue-400 mr-4" />
                        <h1 className="text-5xl font-extrabold">NestEgg</h1>
                    </div>
                    <p className="text-xl text-gray-300 max-w-2xl mx-auto">
                        Your comprehensive platform for tracking and growing your retirement investments
                    </p>
                </header>

                {/* Quick Actions */}
                <div className="grid md:grid-cols-3 gap-6 mb-16">
                    <div className="bg-gray-800 p-6 rounded-xl hover:bg-gray-700 transition-colors group">
                        <DollarSign className="w-12 h-12 text-blue-400 mb-4 group-hover:animate-pulse" />
                        <h3 className="text-xl font-semibold mb-2">Add Positions</h3>
                        <p className="text-gray-400 mb-4">
                            Track your favorite stocks and other investments
                        </p>
                        <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                            Add Positions
                        </button>
                    </div>

                    <div className="bg-gray-800 p-6 rounded-xl hover:bg-gray-700 transition-colors group">
                        <ChartLine className="w-12 h-12 text-green-400 mb-4 group-hover:animate-pulse" />
                        <h3 className="text-xl font-semibold mb-2">Portfolio Overview</h3>
                        <p className="text-gray-400 mb-4">
                            Track your investments across multiple accounts
                        </p>
                        <button className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors">
                            View Portfolio
                        </button>
                    </div>

                    <div className="bg-gray-800 p-6 rounded-xl hover:bg-gray-700 transition-colors group">
                        <PlusCircle className="w-12 h-12 text-purple-400 mb-4 group-hover:animate-pulse" />
                        <h3 className="text-xl font-semibold mb-2">Add New Account</h3>
                        <p className="text-gray-400 mb-4">
                            Connect a new investment or retirement account
                        </p>
                        <button className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors">
                            Add Account
                        </button>
                    </div>
                </div>

                {/* Market Trends Section */}
                <div className="bg-gray-800 p-8 rounded-xl mb-16">
                    <h2 className="text-2xl font-semibold mb-6 flex items-center">
                        <BarChart2 className="w-8 h-8 mr-4 text-blue-400" />
                        Market Trends
                    </h2>
                    <p className="text-gray-400 mb-4">Click on any cell to view detailed performance charts</p>

                    {isLoading ? (
                        <div className="text-center text-gray-400">
                            Loading market data...
                        </div>
                    ) : error ? (
                        <div className="text-red-400 text-center">
                            {error}
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full">
                                <thead>
                                    <tr className="border-b border-gray-700">
                                        <th className="py-3 px-4 text-left text-gray-300">Index</th>
                                        <th className="py-3 px-4 text-right text-gray-300">Price</th>
                                        <th className="py-3 px-4 text-right text-gray-300">1 Day</th>
                                        <th className="py-3 px-4 text-right text-gray-300">1 Week</th>
                                        <th className="py-3 px-4 text-right text-gray-300">YTD</th>
                                        <th className="py-3 px-4 text-right text-gray-300">1 Year</th>
                                        <th className="py-3 px-4 text-right text-gray-300">2 Year</th>
                                        <th className="py-3 px-4 text-right text-gray-300">3 Year</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {marketData.map((item) => (
                                        <tr 
                                            key={item.symbol} 
                                            className="border-b border-gray-700 hover:bg-gray-700/50 transition-colors"
                                        >
                                            <td className="py-4 px-4">
                                                <div className="font-medium">{item.name}</div>
                                                <div className="text-sm text-gray-400">{item.symbol}</div>
                                            </td>
                                            <td className="py-4 px-4 text-right font-medium">{item.price}</td>
                                            <td 
                                                className="py-4 px-4 text-right cursor-pointer hover:bg-blue-900/30 transition-colors" 
                                                onClick={() => openChartModal(item.symbol, "1d")}
                                            >
                                                {renderTrend(item.change1d)}
                                            </td>
                                            <td 
                                                className="py-4 px-4 text-right cursor-pointer hover:bg-blue-900/30 transition-colors" 
                                                onClick={() => openChartModal(item.symbol, "1w")}
                                            >
                                                {renderTrend(item.change1w)}
                                            </td>
                                            <td 
                                                className="py-4 px-4 text-right cursor-pointer hover:bg-blue-900/30 transition-colors" 
                                                onClick={() => openChartModal(item.symbol, "ytd")}
                                            >
                                                {renderTrend(item.changeYTD)}
                                            </td>
                                            <td 
                                                className="py-4 px-4 text-right cursor-pointer hover:bg-blue-900/30 transition-colors" 
                                                onClick={() => openChartModal(item.symbol, "1y")}
                                            >
                                                {renderTrend(item.change1y)}
                                            </td>
                                            <td 
                                                className="py-4 px-4 text-right cursor-pointer hover:bg-blue-900/30 transition-colors" 
                                                onClick={() => openChartModal(item.symbol, "2y")}
                                            >
                                                {renderTrend(item.change2y)}
                                            </td>
                                            <td 
                                                className="py-4 px-4 text-right cursor-pointer hover:bg-blue-900/30 transition-colors" 
                                                onClick={() => openChartModal(item.symbol, "3y")}
                                            >
                                                {renderTrend(item.change3y)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Popular Stocks Section */}
                <div className="bg-gray-800 p-8 rounded-xl">
                    <h2 className="text-2xl font-semibold mb-6 flex items-center">
                        <TrendingUp className="w-8 h-8 mr-4 text-green-400" />
                        Popular Stocks
                    </h2>

                    <div className="grid md:grid-cols-3 gap-4">
                        {["AAPL", "MSFT", "GOOGL", "AMZN", "META", "NVDA"].map((symbol) => (
                            <div 
                                key={symbol} 
                                className="bg-gray-700 p-4 rounded-lg hover:bg-gray-600 transition-colors flex justify-between items-center"
                            >
                                <div>
                                    <h3 className="font-medium">{symbol}</h3>
                                    <p className="text-sm text-gray-400">Add to portfolio</p>
                                </div>
                                <button
                                    onClick={() => handleAddPosition(symbol)}
                                    className="p-2 bg-blue-500 rounded-full text-white hover:bg-blue-600 transition-colors"
                                >
                                    <PlusCircle className="w-5 h-5" />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Chart Modal */}
            {chartModal.isOpen && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 overflow-auto">
                    <div className="bg-gray-800 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-auto">
                        <div className="flex justify-between items-center p-4 border-b border-gray-700">
                            <h3 className="text-xl font-semibold">
                                {marketData.find(m => m.symbol === chartModal.index)?.name} - 
                                {" " + timePeriods.find(t => t.id === chartModal.timeframe)?.label} Performance
                            </h3>
                            <button 
                                onClick={closeChartModal}
                                className="p-2 hover:bg-gray-700 rounded-full transition-colors"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                        
                        <div className="p-4">
                            <div className="bg-gray-900 p-4 rounded-lg">
                                <div className="h-80">
                                    {chartModal.index && chartModal.timeframe && (
                                        <Line 
                                            data={generateChartData(chartModal.index, chartModal.timeframe)} 
                                            options={chartOptions} 
                                        />
                                    )}
                                </div>
                            </div>
                            
                            {/* Additional Data Summary */}
                            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="bg-gray-900 p-4 rounded-lg">
                                    <h4 className="text-gray-400 text-sm mb-1">Current Price</h4>
                                    <p className="text-xl font-semibold">
                                        {marketData.find(m => m.symbol === chartModal.index)?.price}
                                    </p>
                                </div>
                                <div className="bg-gray-900 p-4 rounded-lg">
                                    <h4 className="text-gray-400 text-sm mb-1">Period Change</h4>
                                    <div className="text-xl font-semibold">
                                        {renderTrend(
                                            marketData.find(m => m.symbol === chartModal.index)?.[timeframeToChangeKey(chartModal.timeframe)] || 0
                                        )}
                                    </div>
                                </div>
                                <div className="bg-gray-900 p-4 rounded-lg">
                                    <h4 className="text-gray-400 text-sm mb-1">Period Range</h4>
                                    <p className="text-xl font-semibold">
                                        {
                                            (() => {
                                                const chartData = generateChartData(chartModal.index, chartModal.timeframe);
                                                if (!chartData || !chartData.datasets[0].data.length) return "N/A";
                                                
                                                const data = chartData.datasets[0].data;
                                                const min = Math.min(...data);
                                                const max = Math.max(...data);
                                                
                                                if (chartModal.index === 'BTC') {
                                                    return `$${min.toLocaleString()} - $${max.toLocaleString()}`;
                                                } else if (chartModal.index === 'TNX') {
                                                    return `${min.toFixed(2)}% - ${max.toFixed(2)}%`;
                                                } else {
                                                    return `${min.toLocaleString()} - ${max.toLocaleString()}`;
                                                }
                                            })()
                                        }
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}