// components/BulkPositionButton.js
import { useState, useEffect } from "react";
import BulkPositionModal from "./modals/BulkPositionModal";

/**
 * Button component that opens the BulkPositionModal
 * @param {Object} props
 * @param {Array} props.accounts - Array of account objects
 * @param {Function} props.fetchAccounts - Function to refresh accounts data
 * @param {Function} props.fetchPositions - Function to refresh positions data
 * @param {Function} props.fetchPortfolioSummary - Function to refresh portfolio summary
 * @param {string} props.className - Optional CSS classes to add to the button
 * @param {string} props.buttonText - Optional text to display on the button (defaults to "Bulk Upload")
 * @param {Object} props.buttonIcon - Optional icon to display on the button
 */
const BulkPositionButton = ({ 
  accounts, 
  fetchAccounts, 
  fetchPositions, 
  fetchPortfolioSummary,
  className = "",
  buttonText = "Bulk Upload",
  buttonIcon = null
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  // Show and hide success message with a timeout
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => {
        setSuccessMessage("");
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  const handleSuccess = (successCount, errorCount) => {
    setSuccessMessage(`Successfully uploaded ${successCount} positions${errorCount > 0 ? `, ${errorCount} failed` : ''}`);
  };

  return (
    <>
      {/* The button to open the modal */}
      <button
        onClick={() => setIsModalOpen(true)}
        className={`add-account-btn ${className}`}
        disabled={!accounts || accounts.length === 0}
        title={!accounts || accounts.length === 0 ? "Add an account first" : "Bulk upload positions"}
      >
        {buttonIcon && <span className="mr-2">{buttonIcon}</span>}
        {buttonText}
      </button>

      {/* Success message toast notification */}
      {successMessage && (
        <div className="fixed top-4 right-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded z-50 shadow-md">
          <div className="flex items-center">
            <svg className="h-5 w-5 mr-2 text-green-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <p>{successMessage}</p>
          </div>
        </div>
      )}

      {/* The bulk upload modal */}
      <BulkPositionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        accounts={accounts || []}
        onSuccess={handleSuccess}
        fetchAccounts={fetchAccounts}
        fetchPositions={fetchPositions}
        fetchPortfolioSummary={fetchPortfolioSummary}
      />
    </>
  );
};

export default BulkPositionButton;