// components/SkeletonLoader.js
import React from 'react';

const SkeletonLoader = ({ type = 'text', count = 1, className = '', width, height }) => {
  // Generate a skeleton item based on type
  const renderSkeletonItem = (index) => {
    const baseClasses = "animate-pulse bg-gray-200 rounded";
    
    switch (type) {
      case 'text':
        return (
          <div 
            key={index} 
            className={`${baseClasses} h-4 ${width ? width : 'w-full'} ${className}`}
          ></div>
        );
      
      case 'circle':
        return (
          <div 
            key={index} 
            className={`${baseClasses} rounded-full ${width ? width : 'w-10'} ${height ? height : 'h-10'} ${className}`}
          ></div>
        );
        
      case 'image':
        return (
          <div 
            key={index} 
            className={`${baseClasses} ${width ? width : 'w-full'} ${height ? height : 'h-40'} ${className}`}
          ></div>
        );
        
      case 'card':
        return (
          <div key={index} className={`${baseClasses} ${width ? width : 'w-full'} ${height ? height : 'h-32'} ${className}`}></div>
        );
        
      case 'table-row':
        return (
          <div key={index} className={`flex w-full mb-2 ${className}`}>
            {Array(5).fill(0).map((_, cellIndex) => (
              <div 
                key={`cell-${cellIndex}`} 
                className={`${baseClasses} h-6 mx-1 flex-1`}
              ></div>
            ))}
          </div>
        );
        
      case 'chart':
        return (
          <div 
            key={index} 
            className={`${baseClasses} ${width ? width : 'w-full'} ${height ? height : 'h-60'} ${className}`}
          ></div>
        );
      
      default:
        return (
          <div 
            key={index} 
            className={`${baseClasses} h-4 ${width ? width : 'w-full'} ${className}`}
          ></div>
        );
    }
  };

  // Create array with specified count and render skeleton items
  return (
    <div className="space-y-2">
      {Array(count).fill(0).map((_, index) => renderSkeletonItem(index))}
    </div>
  );
};

export default SkeletonLoader;