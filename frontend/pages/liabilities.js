import React, { useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { motion } from 'framer-motion';
import { Receipt, TrendingDown, CreditCard, Home, DollarSign, Percent, AlertCircle, RefreshCw, RotateCw, Plus, Target, Shield, Zap } from "lucide-react";
import LiabilityTable from '@/components/tables/LiabilityTable';
import { useGroupedLiabilities } from '@/store/hooks/useGroupedLiabilities';
import { formatCurrency, formatPercentage } from '@/utils/formatters';

export default function LiabilitiesPage() {
  const router = useRouter();
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const { 
    liabilities, 
    summary, 
    metrics, 
    loading, 
    error,
    refreshData 
  } = useGroupedLiabilities();

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshData();
    setIsRefreshing(false);
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <Head>
        <title>NestEgg | Liabilities</title>
        <meta name="description" content="Debt and liability management" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      
      {/* Background */}
      <div className="fixed inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-black to-gray-900" />
      </div>
      
      <div className="relative z-10 container mx-auto p-4 md:p-6">
        {/* Header */}
        <header className="mb-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold mb-2">Liabilities</h1>
              <p className="text-gray-400 text-sm flex items-center">
                <Receipt className="w-3 h-3 mr-2" />
                Track and manage your debts
              </p>
            </div>
            
            <div className="flex items-center space-x-3 mt-4 md:mt-0">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleRefresh}
                className="flex items-center px-4 py-2 bg-blue-600 rounded-lg font-medium hover:bg-blue-700 transition-colors"
                disabled={isRefreshing}
             >
               <RotateCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
               Refresh
             </motion.button>
             
             <motion.button
               whileHover={{ scale: 1.05 }}
               whileTap={{ scale: 0.95 }}
               onClick={() => router.push('/liabilities/add')}
               className="flex items-center px-4 py-2 bg-red-600 rounded-lg font-medium hover:bg-red-700 transition-colors"
             >
               <Plus className="w-4 h-4 mr-2" />
               Add Liability
             </motion.button>
           </div>
         </div>
       </header>

       {/* Summary Section */}
       <section className="mb-8">
         <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
           <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
             {/* Main metrics */}
             <div className="lg:col-span-2">
               <div className="flex items-center justify-between mb-3">
                 <p className="text-gray-400 text-sm">Total Debt</p>
                 <div className="flex items-center space-x-2">
                   <span className="text-xs text-gray-500">
                     {formatPercentage((summary.total_paid_down / summary.total_original_debt) * 100)} paid off
                   </span>
                 </div>
               </div>
               
               <h2 className="text-3xl font-bold mb-2 text-red-400">
                 {formatCurrency(summary.total_debt)}
               </h2>
               
               <div className="flex items-center space-x-4 text-sm">
                 <div className="flex items-center">
                   <TrendingDown className="w-4 h-4 text-green-400 mr-1" />
                   <span className="text-green-400">
                     {formatCurrency(summary.total_paid_down)} paid
                   </span>
                 </div>
                 <div className="text-gray-400">
                   from {formatCurrency(summary.total_original_debt)} original
                 </div>
               </div>
             </div>
             
             {/* Side metrics */}
             <div className="space-y-4">
               <div className="bg-gray-800/50 p-4 rounded-lg">
                 <div className="flex items-center justify-between mb-2">
                   <p className="text-gray-400 text-sm">Interest Cost</p>
                   <DollarSign className="w-4 h-4 text-yellow-400" />
                 </div>
                 <p className="text-xl font-bold">{formatCurrency(summary.total_annual_interest)}</p>
                 <p className="text-xs text-gray-500">per year</p>
               </div>
               
               {metrics.creditUtilization !== null && (
                 <div className="bg-gray-800/50 p-4 rounded-lg">
                   <div className="flex items-center justify-between mb-2">
                     <p className="text-gray-400 text-sm">Credit Usage</p>
                     <CreditCard className="w-4 h-4 text-blue-400" />
                   </div>
                   <p className={`text-xl font-bold ${
                     metrics.creditUtilization > 30 ? 'text-red-400' : 'text-green-400'
                   }`}>
                     {metrics.creditUtilization.toFixed(1)}%
                   </p>
                   <p className="text-xs text-gray-500">
                     {metrics.creditUtilization > 30 ? 'Above target' : 'Good standing'}
                   </p>
                 </div>
               )}
             </div>
           </div>
         </div>
       </section>

       {/* Quick Stats */}
       <section className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
         {[
           {
             title: "Average Rate",
             value: summary.avg_interest_rate,
             icon: <Percent className="w-5 h-5" />,
             color: "text-yellow-400",
             bgColor: "bg-yellow-500/10",
             format: (v) => `${v?.toFixed(2)}%`,
             subtitle: "weighted average"
           },
           {
             title: "High Interest Debt",
             value: metrics.totalHighInterestDebt,
             icon: <AlertCircle className="w-5 h-5" />,
             color: "text-red-400",
             bgColor: "bg-red-500/10",
             format: formatCurrency,
             subtitle: ">10% interest rate"
           },
           {
             title: "Highest Rate",
             value: metrics.highestInterestRate,
             icon: <Zap className="w-5 h-5" />,
             color: "text-orange-400",
             bgColor: "bg-orange-500/10",
             format: (v) => `${v?.toFixed(2)}%`,
             subtitle: "priority target"
           },
           {
             title: "Debt Types",
             value: Object.keys(summary.liability_type_breakdown || {}).length,
             icon: <Shield className="w-5 h-5" />,
             color: "text-purple-400",
             bgColor: "bg-purple-500/10",
             format: (v) => v,
             subtitle: `${summary.total_liabilities} total accounts`
           }
         ].map((metric, index) => (
           <motion.div
             key={metric.title}
             initial={{ opacity: 0, y: 20 }}
             animate={{ opacity: 1, y: 0 }}
             transition={{ delay: 0.1 + index * 0.05 }}
             className="bg-gray-900 rounded-lg p-4 border border-gray-800 hover:bg-gray-800 transition-colors"
           >
             <div className="flex items-start justify-between mb-2">
               <div className={`p-2 rounded-lg ${metric.bgColor}`}>
                 <div className={metric.color}>{metric.icon}</div>
               </div>
             </div>
             <h3 className="text-gray-400 text-xs mb-1">{metric.title}</h3>
             <p className="text-xl font-bold mb-1">{metric.format(metric.value)}</p>
             {metric.subtitle && (
               <p className="text-xs text-gray-500 truncate">{metric.subtitle}</p>
             )}
           </motion.div>
         ))}
       </section>

       {/* Debt Breakdown by Type */}
       {Object.keys(summary.liability_type_breakdown || {}).length > 0 && (
         <section className="mb-8">
           <h3 className="text-lg font-bold mb-4">Debt by Type</h3>
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
             {Object.entries(summary.liability_type_breakdown).map(([type, data]) => {
               const Icon = liabilityIcons[type] || Receipt;
               const percentage = (data.total_balance / summary.total_debt) * 100;
               
               return (
                 <div key={type} className="bg-gray-900 rounded-lg p-4 border border-gray-800">
                   <div className="flex items-center justify-between mb-3">
                     <div className="flex items-center space-x-2">
                       <Icon className="w-5 h-5 text-gray-400" />
                       <h4 className="font-medium capitalize">
                         {type.split('_').join(' ')}
                       </h4>
                     </div>
                     <span className="text-sm text-gray-400">
                       {data.count} {data.count === 1 ? 'account' : 'accounts'}
                     </span>
                   </div>
                   
                   <div className="space-y-2">
                     <div className="flex justify-between items-baseline">
                       <span className="text-2xl font-bold text-red-400">
                         {formatCurrency(data.total_balance)}
                       </span>
                       <span className="text-sm text-gray-400">
                         {percentage.toFixed(1)}%
                       </span>
                     </div>
                     
                     <div className="w-full bg-gray-800 rounded-full h-2">
                       <div 
                         className="bg-red-500 h-2 rounded-full"
                         style={{ width: `${percentage}%` }}
                       />
                     </div>
                     
                     <div className="flex justify-between text-xs text-gray-400">
                       <span>Rate: {data.avg_interest_rate?.toFixed(2)}%</span>
                       <span>Original: {formatCurrency(data.total_original)}</span>
                     </div>
                   </div>
                 </div>
               );
             })}
           </div>
         </section>
       )}

       {/* Liabilities Table */}
       <section className="mb-8">
         <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4">
           <h3 className="text-xl font-bold flex items-center">
             <Receipt className="w-5 h-5 mr-2" />
             All Liabilities
           </h3>
           <p className="text-sm text-gray-400">
             Click any row for detailed information
           </p>
         </div>
         
         <LiabilityTable 
           showHistoricalColumns={true}
         />
       </section>

       {/* Priority Actions */}
       {(metrics.highestInterestRate > 15 || metrics.creditUtilization > 30) && (
         <section className="mb-8">
           <div className="bg-red-900/20 rounded-xl p-6 border border-red-800/50">
             <h3 className="text-lg font-bold mb-4 flex items-center">
               <Target className="w-5 h-5 mr-2 text-red-400" />
               Priority Actions
             </h3>
             
             <div className="space-y-3">
               {metrics.highestInterestRate > 15 && (
                 <div className="flex items-start space-x-3">
                   <AlertCircle className="w-5 h-5 text-red-400 mt-0.5" />
                   <div>
                     <p className="font-medium">High Interest Alert</p>
                     <p className="text-sm text-gray-400">
                       You have debt with {metrics.highestInterestRate.toFixed(2)}% interest rate. 
                       Consider prioritizing payment or refinancing options.
                     </p>
                   </div>
                 </div>
               )}
               
               {metrics.creditUtilization > 30 && (
                 <div className="flex items-start space-x-3">
                   <CreditCard className="w-5 h-5 text-yellow-400 mt-0.5" />
                   <div>
                     <p className="font-medium">Credit Utilization Warning</p>
                     <p className="text-sm text-gray-400">
                       Your credit utilization is {metrics.creditUtilization.toFixed(1)}%. 
                       Aim to keep it below 30% to improve your credit score.
                     </p>
                   </div>
                 </div>
               )}
             </div>
           </div>
         </section>
       )}
     </div>
   </div>
 );
}

// Icon mapping (same as in LiabilityTable)
const liabilityIcons = {
 credit_card: CreditCard,
 mortgage: Home,
 auto_loan: Receipt,
 student_loan: Receipt,
 personal_loan: Receipt,
 other: Receipt
};