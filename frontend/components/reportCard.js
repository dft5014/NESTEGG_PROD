// components/ReportCard.js
import { useState } from 'react';
import { ChevronDown, ChevronUp, Maximize2, Download, Share2 } from 'lucide-react';

/**
 * Report Card Component
 * A styled container for report sections with optional expand/collapse functionality
 */
export default function ReportCard({ 
  title, 
  subtitle, 
  children, 
  className = "", 
  actions = null,
  collapsible = false,
  initiallyExpanded = true,
  onDownload = null,
  onShare = null,
  fullScreenEnabled = false
}) {
  const [isExpanded, setIsExpanded] = useState(initiallyExpanded);
  const [isFullScreen, setIsFullScreen] = useState(false);
  
  // Handle card toggle
  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };
  
  // Handle fullscreen toggle
  const toggleFullScreen = () => {
    setIsFullScreen(!isFullScreen);
    // Additional code for actual full screen implementation would go here
  };
  
  // Main card class
  const cardClasses = `
    bg-gray-800 dark:bg-gray-800 
    rounded-xl shadow-md transition-all duration-200
    ${isFullScreen ? 'fixed inset-4 z-50 overflow-auto' : ''}
    ${className}
  `;
  
  return (
    <div className={cardClasses}>
      <div className="p-5">
        {/* Card header */}
        <div className="flex justify-between items-start mb-4">
          <div>
            <div className="flex items-center">
              <h3 className="text-lg font-semibold text-white">{title}</h3>
              {collapsible && (
                <button 
                  onClick={toggleExpand}
                  className="ml-2 text-gray-400 hover:text-white transition-colors"
                >
                  {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
              )}
            </div>
            {subtitle && <p className="text-sm text-gray-400">{subtitle}</p>}
          </div>
          
          {/* Action buttons */}
          <div className="flex space-x-2">
            {actions}
            
            {onDownload && (
              <button
                onClick={onDownload}
                className="p-1.5 rounded-md bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white transition-colors"
                title="Download"
              >
                <Download className="h-4 w-4" />
              </button>
            )}
            
            {onShare && (
              <button
                onClick={onShare}
                className="p-1.5 rounded-md bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white transition-colors"
                title="Share"
              >
                <Share2 className="h-4 w-4" />
              </button>
            )}
            
            {fullScreenEnabled && (
              <button
                onClick={toggleFullScreen}
                className="p-1.5 rounded-md bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white transition-colors"
                title="Full Screen"
              >
                <Maximize2 className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
        
        {/* Card content */}
        <div className={`transition-all duration-300 overflow-hidden ${
          collapsible && !isExpanded ? 'max-h-0 opacity-0' : 'max-h-[2000px] opacity-100'
        }`}>
          {children}
        </div>
      </div>
    </div>
  );
}