// components/modals/FixedModal.js
import React, { useEffect } from 'react';
import ReactDOM from 'react-dom'; // Import ReactDOM for Portals
import { X } from 'lucide-react'; // Assuming you want this icon for consistency, or keep original &times;

const FixedModal = ({
    isOpen,
    onClose,
    title,
    children,
    size = 'max-w-md', // Default size, can be overridden via prop
    zIndex = 'z-50'     // Default z-index, can be overridden
}) => {
    // Log when modal state changes for debugging
    useEffect(() => {
        console.log("FixedModal render state:", { isOpen, title });
    }, [isOpen, title]);

    // Ensure portal root exists (run once on client)
    useEffect(() => {
        let portalRoot = document.getElementById('modal-root');
        if (!portalRoot) {
            console.log("Creating #modal-root element");
            portalRoot = document.createElement('div');
            portalRoot.setAttribute('id', 'modal-root');
            // Optional: Add some base styles or classes to the root if needed
            // portalRoot.className = 'portal-container';
            document.body.appendChild(portalRoot);
        } else {
             console.log("#modal-root element already exists");
        }
    }, []); // Empty dependency array ensures this runs only once on mount


    // Prevent background scrolling when modal is open
    useEffect(() => {
        const body = document.body.style;
        if (isOpen) {
             const originalOverflow = body.overflow; // Store original value
             body.overflow = 'hidden';
             console.log("Modal opened - body scroll disabled");

             // Return cleanup function
             return () => {
                  body.overflow = originalOverflow || 'unset'; // Restore original or default
                  console.log("Modal cleanup - body scroll restored");
             };
        }
        // No cleanup needed if modal wasn't open
    }, [isOpen]); // Re-run effect if isOpen changes


    // If not open, don't render anything
    if (!isOpen) {
        return null;
    }

    // Get the portal root DOM node (should exist after the effect runs)
    const portalRoot = document.getElementById('modal-root');
    if (!portalRoot) {
         console.error("FixedModal: #modal-root element not found.");
         // You might want to return null or a fallback UI here if the root isn't ready
         return null;
    }

    // --- Render using ReactDOM.createPortal ---
    return ReactDOM.createPortal(
        <div
            className={`fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center ${zIndex} p-4`}
            onClick={onClose} // Click on backdrop closes modal
            style={{ backdropFilter: 'blur(4px)' }} // Keep your backdrop filter
            aria-labelledby="modal-title"
            role="dialog"
            aria-modal="true"
        >
            <div
                className={`bg-white rounded-lg shadow-xl w-full ${size} text-gray-900`} // Use size prop, adjust text color if needed
                onClick={e => e.stopPropagation()} // Prevent clicks inside modal from closing it
            >
                {/* Header */}
                <div className="flex justify-between items-center p-4 border-b border-gray-200">
                    <h2 className="text-xl font-semibold text-gray-800" id="modal-title">{title}</h2> {/* Ensure title contrasts with bg */}
                    <button
                        onClick={onClose}
                        className="text-gray-500 hover:text-gray-800 h-8 w-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
                        aria-label="Close modal"
                    >
                        {/* Using X icon from lucide-react for consistency */}
                        <X className="h-5 w-5" />
                        {/* Or keep your original: &times; */}
                    </button>
                </div>
                {/* Content Body */}
                <div className="p-6 overflow-y-auto max-h-[calc(100vh-150px)]">
                    {children}
                </div>
            </div>
        </div>,
        portalRoot // Target node for the portal
    );
};

export default FixedModal;