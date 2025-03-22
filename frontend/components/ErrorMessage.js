// components/ErrorMessage.js
import React from 'react';
import { AlertTriangle, RefreshCw, ArrowLeft, ExternalLink, HelpCircle } from 'lucide-react';

const ErrorMessage = ({ 
  error, 
  onRetry, 
  onBack,
  showContactSupport = false,
  className = ''
}) => {
  // Define common error messages and recovery suggestions
  const getErrorDetails = () => {
    if (!error) return {
      title: 'An error occurred',
      message: 'Something went wrong. Please try again.',
      suggestion: 'Refresh the page and try again.'
    };
    
    // Check for specific error types and provide tailored messages
    if (error.includes('401') || error.includes('unauthorized')) {
      return {
        title: 'Authentication Error',
        message: 'Your session has expired or you are not authorized to access this resource.',
        suggestion: 'Please log in again to continue.'
      };
    }
    
    if (error.includes('403') || error.includes('forbidden')) {
      return {
        title: 'Access Denied',
        message: 'You don\'t have permission to access this resource.',
        suggestion: 'Please contact your administrator for assistance.'
      };
    }
    
    if (error.includes('404') || error.includes('not found')) {
      return {
        title: 'Resource Not Found',
        message: 'The requested resource could not be found.',
        suggestion: 'Check that the URL is correct or go back to the previous page.'
      };
    }
    
    if (error.includes('500') || error.includes('server error')) {
      return {
        title: 'Server Error',
        message: 'There was a problem with our server.',
        suggestion: 'Please try again later. Our team has been notified of this issue.'
      };
    }
    
    if (error.includes('network') || error.includes('connection')) {
      return {
        title: 'Network Error',
        message: 'Unable to connect to the server.',
        suggestion: 'Please check your internet connection and try again.'
      };
    }
    
    // Default generic error
    return {
      title: 'An error occurred',
      message: error,
      suggestion: 'Please try again or contact support if the issue persists.'
    };
  };
  
  const errorDetails = getErrorDetails();
  
  return (
    <div className={`bg-red-50 border border-red-200 rounded-lg p-4 ${className}`}>
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <AlertTriangle className="h-6 w-6 text-red-600" aria-hidden="true" />
        </div>
        <div className="ml-3 flex-1">
          <h3 className="text-lg font-medium text-red-800">{errorDetails.title}</h3>
          <div className="mt-2">
            <p className="text-sm text-red-700">{errorDetails.message}</p>
            {errorDetails.suggestion && (
              <p className="text-sm text-red-700 mt-1">
                <strong>Suggestion:</strong> {errorDetails.suggestion}
              </p>
            )}
          </div>
          <div className="mt-4 flex space-x-3">
            {onRetry && (
              <button
                type="button"
                onClick={onRetry}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                <RefreshCw className="w-4 h-4 mr-1" />
                Try Again
              </button>
            )}
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                <ArrowLeft className="w-4 h-4 mr-1" />
                Go Back
              </button>
            )}
            {showContactSupport && (
              <a
                href="mailto:support@nestegg.app"
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
              >
                <HelpCircle className="w-4 h-4 mr-1" />
                Contact Support
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ErrorMessage;