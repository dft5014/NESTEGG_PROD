// components/charts/DiversificationCharts.js
import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, LabelList } from 'recharts';
import { formatCurrency, formatPercentage } from '@/utils/formatters';

/**
 * Financial Institution Diversity Chart Component
 * Displays a breakdown of your portfolio exposure across different financial institutions
 */
export const InstitutionDiversityChart = ({ accounts }) => {
  // Process data for institution diversity
  const institutionData = useMemo(() => {
    if (!accounts || !accounts.length) return [];
    
    // Group accounts by institution and calculate total values
    const institutionMap = accounts.reduce((acc, account) => {
      const institution = account.institution || 'Other';
      const value = parseFloat(account.total_value || account.balance || 0);
      
      if (!acc[institution]) {
        acc[institution] = {
          name: institution,
          value: 0,
          accounts: 0,
          color: getInstitutionColor(institution)
        };
      }
      
      acc[institution].value += value;
      acc[institution].accounts += 1;
      
      return acc;
    }, {});
    
    // Convert to array and sort by value
    let result = Object.values(institutionMap).sort((a, b) => b.value - a.value);
    
    // Calculate percentage
    const totalValue = result.reduce((sum, item) => sum + item.value, 0);
    result = result.map(item => ({
      ...item,
      percentage: totalValue > 0 ? item.value / totalValue : 0
    }));
    
    return result;
  }, [accounts]);

  // Get a consistent color based on institution name
  function getInstitutionColor(name) {
    const colorMap = {
      'Vanguard': '#C94227',
      'Fidelity': '#569A38',
      'Charles Schwab': '#027BC7',
      'Robinhood': '#00C805',
      'TD Ameritrade': '#4F5B65',
      'Chase': '#117ACA',
      'Bank of America': '#E11B3C', 
      'Wells Fargo': '#D71E28',
      'E*TRADE': '#6633CC',
      'Interactive Brokers': '#F79125',
      'Coinbase': '#0052FF',
      'Merrill Lynch': '#0073CF',
      'Morgan Stanley': '#0073CF',
      'Betterment': '#0A9ACF',
      'Wealthfront': '#3ECBBC',
      'Citibank': '#057CC0',
      'SoFi': '#A7A8AA',
    };
    
    return colorMap[name] || getRandomColor(name);
  }
  
  // Generate consistent color for institutions not in the colorMap
  function getRandomColor(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    const hue = Math.abs(hash) % 360;
    return `hsl(${hue}, 70%, 50%)`;
  }
  
  // If no data, show placeholder message
  if (!institutionData.length) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-400">
        <p>No institution data available</p>
      </div>
    );
  }
  
  // Custom tooltip formatter
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-gray-900 p-3 rounded-md border border-gray-700 shadow-lg">
          <p className="font-medium text-white">{data.name}</p>
          <p className="text-sm text-gray-300">Value: {formatCurrency(data.value)}</p>
          <p className="text-sm text-gray-300">Percentage: {formatPercentage(data.percentage)}</p>
          <p className="text-sm text-gray-300">Accounts: {data.accounts}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="h-full flex flex-col">
      <ResponsiveContainer width="100%" height="85%">
        <PieChart>
          <Pie
            data={institutionData}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={90}
            paddingAngle={1}
            dataKey="value"
            nameKey="name"
            label={({ name, percentage }) => `${name} (${formatPercentage(percentage)})`}
            labelLine={true}
          >
            {institutionData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
        </PieChart>
      </ResponsiveContainer>
      <div className="text-xs text-gray-400 mt-2 text-center">
        Based on {institutionData.length} financial institutions
      </div>
    </div>
  );
};

/**
 * Sector Diversity Chart Component
 * Displays a breakdown of your securities by industry sector
 */
export const SectorDiversityChart = ({ positions }) => {
  // Process data for sector diversity
  const sectorData = useMemo(() => {
    if (!positions || !positions.length) return [];
    
    // Filter to only include security positions with sector data
    const securityPositions = positions.filter(p => 
      p.asset_type === 'security' && p.sector && p.sector !== 'N/A'
    );
    
    // Group by sector and calculate total values
    const sectorMap = securityPositions.reduce((acc, position) => {
      const sector = position.sector || 'Other';
      const value = parseFloat(position.current_value || 0);
      
      if (!acc[sector]) {
        acc[sector] = {
          name: sector,
          value: 0,
          positions: 0,
          color: getSectorColor(sector)
        };
      }
      
      acc[sector].value += value;
      acc[sector].positions += 1;
      
      return acc;
    }, {});
    
    // Convert to array and sort by value
    let result = Object.values(sectorMap).sort((a, b) => b.value - a.value);
    
    // Calculate percentage
    const totalValue = result.reduce((sum, item) => sum + item.value, 0);
    result = result.map(item => ({
      ...item,
      percentage: totalValue > 0 ? item.value / totalValue : 0
    }));
    
    return result;
  }, [positions]);
  
  // Get a consistent color based on sector name
  function getSectorColor(sector) {
    const colorMap = {
      'Technology': '#0078D7',
      'Information Technology': '#0078D7',
      'Financial Services': '#107C10',
      'Financials': '#107C10',
      'Healthcare': '#E81123',
      'Health Care': '#E81123',
      'Consumer Discretionary': '#FFB900',
      'Consumer Cyclical': '#FFB900',
      'Communication Services': '#734DA9',
      'Communications': '#734DA9',
      'Industrials': '#B4009E',
      'Energy': '#D83B01',
      'Consumer Staples': '#4A154B',
      'Consumer Defensive': '#4A154B',
      'Materials': '#00B294',
      'Basic Materials': '#00B294',
      'Utilities': '#00BCF2',
      'Real Estate': '#F7630C'
    };
    
    return colorMap[sector] || getRandomColor(sector);
  }
  
  // Generate consistent color for sectors not in the colorMap
  function getRandomColor(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    const hue = Math.abs(hash) % 360;
    return `hsl(${hue}, 70%, 50%)`;
  }
  
  // If no data, show placeholder message
  if (!sectorData.length) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-400">
        <p>No sector data available</p>
      </div>
    );
  }

  // Format sector data for horizontal bar chart
  const barChartData = sectorData.slice(0, 10); // Show top 10 sectors
  
  return (
    <div className="h-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={barChartData}
          layout="vertical"
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        >
          <XAxis type="number" tickFormatter={(value) => formatCurrency(value)} />
          <YAxis 
            type="category" 
            dataKey="name" 
            tickLine={false}
            axisLine={false}
            width={100}
            tick={{ fontSize: 12, fill: '#9CA3AF' }}
          />
          <Tooltip
            formatter={(value, name, props) => [
              formatCurrency(value),
              'Value'
            ]}
            labelFormatter={(label) => `${label}`}
            contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151' }}
          />
          <Legend formatter={(value) => `Sector Value`} />
          <Bar dataKey="value" nameKey="name" radius={[0, 4, 4, 0]}>
            {barChartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
            <LabelList 
              dataKey="percentage" 
              position="right" 
              formatter={(value) => formatPercentage(value)}
              style={{ fill: '#9CA3AF', fontSize: 11 }} 
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};