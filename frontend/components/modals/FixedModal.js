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

    useEffect(() => {
        setMounted(true);
        
        // Ensure modal root exists
        if (typeof document !== 'undefined') {
            let portalRoot = document.getElementById('modal-root');
            if (!portalRoot) {
                portalRoot = document.createElement('div');
                portalRoot.setAttribute('id', 'modal-root');
                document.body.appendChild(portalRoot);
            }
        }
    }, []);

    useEffect(() => {
        if (isOpen && mounted) {
            const originalOverflow = document.body.style.overflow;
            document.body.style.overflow = 'hidden';
            
            return () => {
                document.body.style.overflow = originalOverflow || 'unset';
            };
        }
    }, [isOpen, mounted]);

    if (!mounted || !isOpen) {
        return null;
    }

    const portalRoot = document.getElementById('modal-root');
    if (!portalRoot) {
        return null;
    }

    return ReactDOM.createPortal(
        <div
            className={`fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center ${zIndex} p-4`}
            onClick={onClose}
            style={{ backdropFilter: 'blur(4px)' }}
            aria-labelledby={`modal-title-${title.replace(/\s+/g, '-').toLowerCase()}`}
            role="dialog"
            aria-modal="true"
        >
            <div
                className={`bg-white rounded-lg shadow-xl w-full ${size} text-gray-900`}
                onClick={e => e.stopPropagation()}
            >
                <div className="flex justify-between items-center p-4 border-b border-gray-200">
                    <h2 
                        className="text-xl font-semibold text-gray-800" 
                        id={`modal-title-${title.replace(/\s+/g, '-').toLowerCase()}`}
                    >
                        {title}
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-gray-500 hover:text-gray-800 h-8 w-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
                        aria-label="Close modal"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>
                <div className="p-6 overflow-y-auto max-h-[calc(100vh-150px)]">
                    {children}
                </div>
            </div>
        </div>,
        portalRoot
    );
};

export default FixedModal;