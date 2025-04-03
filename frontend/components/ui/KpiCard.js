// components/ui/KpiCard.js
import React from 'react';
import { Loader } from 'lucide-react';

const KpiCard = ({ title, value, icon, isLoading, format = (val) => val, color = "blue", children }) => {
  const colorClasses = {
    blue: "from-blue-900 to-blue-700 text-blue-300",
    purple: "from-purple-900 to-purple-700 text-purple-300",
    green: "from-green-900 to-green-700 text-green-300",
    red: "from-red-900 to-red-700 text-red-300",
    amber: "from-amber-900 to-amber-700 text-amber-300",
    indigo: "from-indigo-900 to-indigo-700 text-indigo-300",
    // Add more colors as needed
  };

  const gainLossColor = (val) => {
      if (typeof val !== 'number') return 'text-white'; // Default for non-numeric
      if (val > 0) return 'text-green-400';
      if (val < 0) return 'text-red-400';
      return 'text-white';
  }

  const valueColor = title.toLowerCase().includes('gain') || title.toLowerCase().includes('change') ? gainLossColor(value) : 'text-white';

  return (
    <div className={`bg-gradient-to-br ${colorClasses[color]} p-4 rounded-xl shadow-lg flex flex-col h-full`}>
      <div className={`text-sm mb-1 flex items-center opacity-80`}>
        {icon && React.cloneElement(icon, { className: "h-4 w-4 mr-1.5" })}
        {title}
      </div>
      {isLoading ? (
        <div className="flex items-center justify-center flex-grow">
           <Loader className="h-5 w-5 animate-spin text-white/50" />
        </div>
      ) : (
        <>
          <div className={`text-2xl font-bold ${valueColor} truncate`}>
            {format(value)}
          </div>
           {children && <div className="mt-1 text-xs opacity-70">{children}</div>}
         </>
      )}
    </div>
  );
};

export default KpiCard;