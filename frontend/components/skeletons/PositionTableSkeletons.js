// components/skeletons/PositionTableSkeletons.js
import React from 'react';
import SkeletonLoader from '../SkeletonLoader';

export const SecurityTableSkeleton = () => (
  <div className="space-y-4">
    <div className="flex justify-between">
      <SkeletonLoader width="w-64" height="h-10" />
      <SkeletonLoader width="w-40" height="h-10" />
    </div>
    
    <div className="bg-gray-50 p-4 rounded-lg">
      <SkeletonLoader height="h-6" />
    </div>
    
    {Array(5).fill(0).map((_, index) => (
      <div key={index} className="flex w-full mb-2">
        {Array(7).fill(0).map((_, cellIndex) => (
          <div 
            key={`cell-${cellIndex}`} 
            className="animate-pulse bg-gray-200 rounded h-12 mx-1 flex-1"
          ></div>
        ))}
      </div>
    ))}
  </div>
);

export const CryptoTableSkeleton = () => (
  <div className="space-y-4">
    <div className="flex justify-between">
      <SkeletonLoader width="w-64" height="h-10" />
      <SkeletonLoader width="w-40" height="h-10" />
    </div>
    
    <div className="bg-gray-50 p-4 rounded-lg">
      <SkeletonLoader height="h-6" />
    </div>
    
    {Array(5).fill(0).map((_, index) => (
      <div key={index} className="flex w-full mb-2">
        {Array(7).fill(0).map((_, cellIndex) => (
          <div 
            key={`cell-${cellIndex}`} 
            className="animate-pulse bg-gray-200 rounded h-12 mx-1 flex-1"
          ></div>
        ))}
      </div>
    ))}
  </div>
);

export const MetalTableSkeleton = () => (
  <div className="space-y-4">
    <div className="flex justify-between">
      <SkeletonLoader width="w-64" height="h-10" />
      <SkeletonLoader width="w-40" height="h-10" />
    </div>
    
    <div className="bg-gray-50 p-4 rounded-lg">
      <SkeletonLoader height="h-6" />
    </div>
    
    {Array(5).fill(0).map((_, index) => (
      <div key={index} className="flex w-full mb-2">
        {Array(9).fill(0).map((_, cellIndex) => (
          <div 
            key={`cell-${cellIndex}`} 
            className="animate-pulse bg-gray-200 rounded h-12 mx-1 flex-1"
          ></div>
        ))}
      </div>
    ))}
  </div>
);

export const RealEstateTableSkeleton = () => (
  <div className="space-y-4">
    <div className="flex justify-between">
      <SkeletonLoader width="w-64" height="h-10" />
      <SkeletonLoader width="w-40" height="h-10" />
    </div>
    
    <div className="bg-gray-50 p-4 rounded-lg">
      <SkeletonLoader height="h-6" />
    </div>
    
    {Array(5).fill(0).map((_, index) => (
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