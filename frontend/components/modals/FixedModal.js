import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import { X } from 'lucide-react';

const FixedModal = ({
    isOpen,
    onClose,
    title,
    children,
    size = 'max-w-md',
    zIndex = 'z-50'
}) => {
    const [mounted, setMounted] = useState(false);

    // Log when modal state changes for debugging
    useEffect(() => {
        console.log("FixedModal render state:", { isOpen, title });
    }, [isOpen, title]);

    // Ensure portal root exists - with proper checking
    useEffect(() => {
        setMounted(true);
        
        // Only create if it doesn't exist
        if (typeof document !== 'undefined') {
            let portalRoot = document.getElementById('modal-root');
            if (!portalRoot) {
                console.log("Creating #modal-root element");
                portalRoot = document.createElement('div');
                portalRoot.setAttribute('id', 'modal-root');
                document.body.appendChild(portalRoot);
            }
        }
    }, []); // Empty dependency array ensures this runs only once

    // Prevent background scrolling when modal is open
    useEffect(() => {
        if (isOpen) {
            const originalOverflow = document.body.style.overflow;
            document.body.style.overflow = 'hidden';
            console.log("Modal opened - body scroll disabled");

            return () => {
                document.body.style.overflow = originalOverflow || 'unset';
                console.log("Modal cleanup - body scroll restored");
            };
        }
    }, [isOpen]);

    // Don't render on server or if not mounted
    if (!mounted || !isOpen) {
        return null;
    }

    // Get the portal root DOM node
    const portalRoot = document.getElementById('modal-root');
    if (!portalRoot) {
        console.error("FixedModal: #modal-root element not found.");
        return null;
    }

    // Render using ReactDOM.createPortal
    return ReactDOM.createPortal(
        <div
            className={`fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center ${zIndex} p-4`}
            onClick={onClose}
            style={{ backdropFilter: 'blur(4px)' }}
            aria-labelledby="modal-title"
            role="dialog"
            aria-modal="true"
        >
            <div
                className={`bg-white rounded-lg shadow-xl w-full ${size} text-gray-900`}
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex justify-between items-center p-4 border-b border-gray-200">
                    <h2 className="text-xl font-semibold text-gray-800" id="modal-title">{title}</h2>
                    <button
                        onClick={onClose}
                        className="text-gray-500 hover:text-gray-800 h-8 w-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
                        aria-label="Close modal"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>
                {/* Content Body */}
                <div className="p-6 overflow-y-auto max-h-[calc(100vh-150px)]">
                    {children}
                </div>
            </div>
        </div>,
        portalRoot
    );
};

export default FixedModal;