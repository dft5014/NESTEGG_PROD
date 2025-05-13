// components/DeletePositionButton.js
import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { fetchWithAuth } from '@/utils/api';

const DeletePositionButton = ({ 
    position,
    accountId,
    onPositionDeleted = () => {},
    className = "",
    buttonContent = null // Allow custom button content
}) => {
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [error, setError] = useState(null);
    const [successMessage, setSuccessMessage] = useState("");

    const handleDeleteClick = (e) => {
        if (e) e.stopPropagation(); // Stop event propagation for row clicks
        setIsConfirmOpen(true);
    };

    const handleCancel = () => {
        setIsConfirmOpen(false);
    };

    const handleConfirmDelete = async () => {
        if (!position?.id) {
            setError("Position ID is missing");
            return;
        }

        setIsDeleting(true);
        setError(null);

        try {
            const response = await fetchWithAuth(`/positions/${position.id}`, {
                method: 'DELETE',
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.detail || `Failed to delete position. Status: ${response.status}`);
            }

            setSuccessMessage("Position deleted successfully");
            setTimeout(() => setSuccessMessage(""), 3000);
            
            // Close confirmation dialog
            setIsConfirmOpen(false);
            
            // Notify parent component
            onPositionDeleted();
        } catch (err) {
            console.error("Error deleting position:", err);
            setError(err.message || "Failed to delete position");
        } finally {
            setIsDeleting(false);
        }
    };

    // Use custom button content or default
    const displayButtonContent = buttonContent || (
        <div className="text-red-600 hover:text-red-800" title="Delete Position">
            <Trash2 className="h-5 w-5" />
        </div>
    );

    return (
        <>
            {/* Delete Button */}
            <button
                onClick={handleDeleteClick}
                className={`flex items-center transition-colors ${className}`}
                disabled={isDeleting}
            >
                {displayButtonContent}
            </button>

            {/* Confirmation Modal */}
            {isConfirmOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 max-w-md w-full">
                        <h3 className="text-lg font-medium text-gray-900 mb-4">
                            Delete Position
                        </h3>
                        <p className="text-sm text-gray-500 mb-6">
                            Are you sure you want to delete this position? This action cannot be undone.
                        </p>
                        <div className="flex space-x-2 justify-end">
                            <button
                                onClick={handleCancel}
                                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                                disabled={isDeleting}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleConfirmDelete}
                                className="px-4 py-2 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                                disabled={isDeleting}
                            >
                                {isDeleting ? 'Deleting...' : 'Delete'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Error Message */}
            {error && (
                <div className="fixed top-16 left-1/2 transform -translate-x-1/2 p-4 bg-red-100 text-red-700 rounded-lg z-[70]">
                    {error}
                    <button
                        className="ml-4 px-2 py-0.5 bg-red-200 text-red-800 rounded hover:bg-red-300 text-sm"
                        onClick={() => setError(null)}
                    >
                        Dismiss
                    </button>
                </div>
            )}

            {/* Success Message */}
            {successMessage && (
                <div className="fixed top-16 left-1/2 transform -translate-x-1/2 p-4 bg-green-100 text-green-700 rounded-lg z-[70]">
                    {successMessage}
                </div>
            )}
        </>
    );
};

export default DeletePositionButton;