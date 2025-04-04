// components/modals/ConfirmationModal.js
import React from 'react';
import { X, AlertTriangle } from 'lucide-react'; // Using AlertTriangle for visual cue

const ConfirmationModal = ({
    isOpen,
    onClose,
    onConfirm,
    title = "Confirm Action",
    message = "Are you sure you want to proceed? This action might be irreversible.",
    confirmText = "Confirm",
    cancelText = "Cancel",
    confirmVariant = "danger" // 'danger', 'warning', 'info', 'success'
}) => {
    if (!isOpen) return null;

    // Determine button color based on variant
    const confirmButtonClasses = {
        danger: 'bg-red-600 hover:bg-red-700 focus:ring-red-500',
        warning: 'bg-yellow-500 hover:bg-yellow-600 focus:ring-yellow-400',
        info: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500',
        success: 'bg-green-600 hover:bg-green-700 focus:ring-green-500',
    };
    const iconColorClasses = {
        danger: 'text-red-400',
        warning: 'text-yellow-400',
        info: 'text-blue-400',
        success: 'text-green-400',
    }

    const buttonBaseClass = "px-4 py-2 rounded-md text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 transition-colors";
    const confirmClass = `${buttonBaseClass} ${confirmButtonClasses[confirmVariant] || confirmButtonClasses.danger}`;
    const cancelClass = `${buttonBaseClass} bg-gray-500 hover:bg-gray-600 focus:ring-gray-400`;
    const iconClass = `h-6 w-6 ${iconColorClasses[confirmVariant] || iconColorClasses.danger}`;

    return (
        <div className="fixed inset-0 z-[70] overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
            <div className="flex items-center sm:items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                {/* Background overlay */}
                <div className="fixed inset-0 bg-black/70 transition-opacity" aria-hidden="true" onClick={onClose}></div>

                {/* Modal panel */}
                <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
                <div className="inline-block align-bottom bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                    <div className="bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                        <div className="sm:flex sm:items-start">
                            <div className={`mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-gray-700 sm:mx-0 sm:h-10 sm:w-10 ${iconColorClasses[confirmVariant]} bg-opacity-50`}>
                                <AlertTriangle className={iconClass} aria-hidden="true" />
                            </div>
                            <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                                <h3 className="text-lg leading-6 font-medium text-gray-100" id="modal-title">
                                    {title}
                                </h3>
                                <div className="mt-2">
                                    <p className="text-sm text-gray-400">
                                        {message}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="bg-gray-800/50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse border-t border-gray-700">
                        <button
                            type="button"
                            className={`w-full inline-flex justify-center sm:ml-3 sm:w-auto ${confirmClass}`}
                            onClick={onConfirm}
                        >
                            {confirmText}
                        </button>
                        <button
                            type="button"
                            className={`mt-3 w-full inline-flex justify-center sm:mt-0 sm:w-auto ${cancelClass}`}
                            onClick={onClose}
                        >
                            {cancelText}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ConfirmationModal;