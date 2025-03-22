// components/skeletons/PortfolioSkeleton.js
import React from 'react';
import SkeletonLoader from '../SkeletonLoader';

export const PortfolioSummarySkeleton = () => (
  <div className="space-y-4">
    {/* Dashboard Cards */}
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <SkeletonLoader type="card" />
      <SkeletonLoader type="card" />
      <SkeletonLoader type="card" />
    </div>
    
    {/* Chart */}
    <div className="mt-6">
      <SkeletonLoader type="chart" height="h-80" />
    </div>
  </div>
);

export const AccountsTableSkeleton = () => (
  <div className="space-y-2">
    {/* Table header */}
    <div className="bg-gray-100 p-3 rounded-t">
      <SkeletonLoader />
    </div>
    
    {/* Table rows */}
    <SkeletonLoader type="table-row" count={5} />
  </div>
);

export const PositionsTableSkeleton = () => (
  <div className="space-y-2">
    {/* Table header */}
    <div className="bg-gray-100 p-3 rounded-t">
      <SkeletonLoader />
    </div>
    
    {/* Table rows */}
    <SkeletonLoader type="table-row" count={8} />
  </div>
);

export const SecurityDetailSkeleton = () => (
  <div className="space-y-4">
    {/* Header with icon and name */}
    <div className="flex items-center">
      <SkeletonLoader type="circle" width="w-12" height="h-12" />
      <div className="ml-4 space-y-2">
        <SkeletonLoader width="w-48" />
        <SkeletonLoader width="w-32" />
      </div>
    </div>
    
    {/* Price and stats */}
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <SkeletonLoader type="card" height="h-16" />
      <SkeletonLoader type="card" height="h-16" />
      <SkeletonLoader type="card" height="h-16" />
      <SkeletonLoader type="card" height="h-16" />
    </div>
    
    {/* Chart */}
    <SkeletonLoader type="chart" height="h-60" />
    
    {/* Additional info */}
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <SkeletonLoader count={4} />
      </div>
      <div>
        <SkeletonLoader count={4} />
      </div>
    </div>
  </div>
);

// components/skeletons/DataSummarySkeleton.js
export const DataSummarySkeleton = () => (
  <div className="space-y-6">
    {/* Header */}
    <div className="space-y-2">
      <SkeletonLoader width="w-1/3" />
      <SkeletonLoader width="w-1/2" />
    </div>
    
    {/* Search and filter bar */}
    <div className="flex flex-col sm:flex-row justify-between">
      <SkeletonLoader width="w-64" />
      <div className="mt-2 sm:mt-0 flex space-x-2">
        <SkeletonLoader width="w-32" />
        <SkeletonLoader width="w-32" />
      </div>
    </div>
    
    {/* Table */}
    <SkeletonLoader type="table-row" count={10} />
  </div>
);