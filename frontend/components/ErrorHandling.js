// components/ErrorHandler.js
import React from 'react';
import { AlertCircle, AlertTriangle, Info, Check } from 'lucide-react';

// Error types with corresponding styles and icons
const errorTypes = {
  error: {
    containerClass: "bg-red-50 border-red-200 text-red-700",
    iconClass: "text-red-500",
    icon: AlertCircle
  },
  warning: {
    containerClass: "bg-yellow-50 border-yellow-200 text-yellow-700",
    iconClass: "text-yellow-500",
    icon: AlertTriangle
  },
  info: {
    containerClass: "bg-blue-50 border-blue-200 text-blue-700",
    iconClass: "text-blue-500",
    icon: Info
  },
  success: {
    containerClass: "bg-green-50 border-green-200 text-green-700",
    iconClass: "text-green-500",
    icon: Check
  }
};

// List of common errors and suggested actions
const errorMessages = {
  // Network errors
  "Network Error": {
    type: "error",
    message: "Unable to connect to the server. Please check your internet connection.",
    action: "Refresh the page or try again later."
  },
  "Failed to fetch": {
    type: "error",
    message: "Unable to connect to the server. Please check your internet connection.",
    action: "Refresh the page or try again later."
  },
  "timeout": {
    type: "warning",
    message: "The server took too long to respond.",
    action: "Please try again. If the problem persists, contact support."
  },
  
  // Authentication errors
  "Unauthorized": {
    type: "warning",
    message: "Your session has expired or you are not logged in.",
    action: "Please log in again to continue."
  },
  "Invalid token": {
    type: "warning",
    message: "Your session is invalid or has expired.",
    action: "Please log in again to continue."
  },
  "Token has expired": {
    type: "warning",
    message: "Your session has expired.",
    action: "Please log in again to continue."
  },
  
  // Data errors
  "Not found": {
    type: "info",
    message: "The requested resource was not found.",
    action: "Please check your input or try a different search."
  },
  "Invalid data": {
    type: "warning",
    message: "The data you provided is invalid or incomplete.",
    action: "Please check your input and try again."
  },
  
  // Market data errors
  "No data available": {
    type: "info",
    message: "No market data is available for this security.",
    action: "Try a different security or check back later."
  },
  "Failed to update prices": {
    type: "warning",
    message: "Unable to update security prices at this time.",
    action: "Please try again later. Market data sources may be temporarily unavailable."
  }
};

/**
 * Analyzes an error message and returns appropriate feedback
 * @param {string} errorMessage - The error message to analyze
 * @returns {Object} Object containing type, message, and action
 */
const analyzeError = (errorMessage) => {
  if (!errorMessage) {
    return {
      type: "error",
      message: "An unknown error occurred.",
      action: "Please try again or contact support if the problem persists."
    };
  }
  
  // Check if we have a predefined response for this error
  for (const [key, value] of Object.entries(errorMessages)) {
    if (errorMessage.toLowerCase().includes(key.toLowerCase())) {
      return value;
    }
  }
  
  // Default error response
  return {
    type: "error",
    message: errorMessage,
    action: "Please try again or contact support if the problem persists."
  };
};

/**
 * Error display component that shows user-friendly error messages with suggested actions
 */
const ErrorHandler = ({ error, onRetry = null, onDismiss = null }) => {
  // No error, no component
  if (!error) return null;
  
  // Analyze the error
  const errorString = typeof error === 'string' ? error : 
                      error.message || error.detail || JSON.stringify(error);
  const { type, message, action } = analyzeError(errorString);
  
  // Get styling based on error type
  const style = errorTypes[type] || errorTypes.error;
  const IconComponent = style.icon;
  
  return (
    <div className={`rounded-lg border p-4 mb-4 ${style.containerClass}`}>
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <IconComponent className={`w-5 h-5 ${style.iconClass}`} />
        </div>
        <div className="ml-3 flex-1">
          <h3 className="text-sm font-medium">{message}</h3>
          {action && (
            <div className="mt-2 text-sm">
              <p>{action}</p>
            </div>
          )}
          
          {/* Action buttons */}
          {(onRetry || onDismiss) && (
            <div className="mt-4 flex space-x-3">
              {onRetry && (
                <button
                  type="button"
                  onClick={onRetry}
                  className="rounded-md bg-white px-2.5 py-1.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  Try Again
                </button>
              )}
              {onDismiss && (
                <button
                  type="button"
                  onClick={onDismiss}
                  className="rounded-md bg-white px-2.5 py-1.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  Dismiss
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ErrorHandler;