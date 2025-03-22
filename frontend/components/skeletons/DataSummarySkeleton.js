// components/skeletons/DataSummarySkeleton.js
import React from 'react';
import SkeletonLoader from '../SkeletonLoader';

export const DataSummarySkeleton = () => (
  <div className="space-y-6">
    {/* Search and filter bar */}
    <div className="flex flex-col sm:flex-row justify-between">
      <SkeletonLoader width="w-64" height="h-10" />
      <div className="mt-2 sm:mt-0 flex space-x-2">
        <SkeletonLoader width="w-32" height="h-10" />
        <SkeletonLoader width="w-32" height="h-10" />
      </div>
    </div>
    
    {/* Table header */}
    <div className="bg-gray-50 p-4 rounded-lg">
      <SkeletonLoader height="h-6" />
    </div>
    
    {/* Table rows */}
    {Array(10).fill(0).map((_, index) => (
      <div key={index} className="flex w-full mb-2">
        {Array(8).fill(0).map((_, cellIndex) => (
          <div 
            key={`cell-${cellIndex}`} 
            className="animate-pulse bg-gray-200 rounded h-12 mx-1 flex-1"
          ></div>
        ))}
      </div>
    ))}
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