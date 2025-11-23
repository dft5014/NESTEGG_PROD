import React, { useEffect, useRef, useState, useId } from 'react';
import ReactDOM from 'react-dom';
import { X } from 'lucide-react';

const FixedModal = ({
    isOpen,
    onClose,
    title,
    children,
    size = 'max-w-4xl', // Better default: 896px instead of 448px
    zIndex = 'z-50',
    disableBackdropClose = false,
    colorfulHeader = false // NEW: Enable gradient header
}) => {
    const [mounted, setMounted] = useState(false);
    const portalRootRef = useRef(null);
    const titleId = useId();

    useEffect(() => {
        setMounted(true);
        if (typeof document !== 'undefined') {
            let portalRoot = document.getElementById('modal-root');
            if (!portalRoot) {
                portalRoot = document.createElement('div');
                portalRoot.setAttribute('id', 'modal-root');
                document.body.appendChild(portalRoot);
            }
            portalRootRef.current = portalRoot;
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

    if (!mounted || !portalRootRef.current) {
        return null;
    }

    return ReactDOM.createPortal(
        <div
            className={`fixed inset-0 bg-black/50 backdrop-blur-sm flex justify-center items-start ${zIndex} p-4 sm:p-6 lg:p-8 pt-8 sm:pt-12 lg:pt-16 overflow-y-auto`}
            style={{
                display: isOpen ? 'flex' : 'none'
            }}
            onClick={(e) => {
                if (!disableBackdropClose) onClose?.(e);
            }}
            aria-labelledby={titleId}
            role="dialog"
            aria-modal="true"
        >
            <div
                className={`bg-white rounded-2xl shadow-2xl w-full ${size} text-gray-900 my-auto max-h-[calc(100vh-8rem)] flex flex-col border border-gray-200`}
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className={`
                    flex justify-between items-center p-5 border-b flex-shrink-0
                    ${colorfulHeader
                        ? 'bg-gradient-to-r from-blue-600 to-purple-600 border-blue-700'
                        : 'border-gray-200 bg-white'
                    }
                `}>
                    <h2
                        className={`text-xl font-bold ${
                            colorfulHeader ? 'text-white' : 'text-gray-900'
                        }`}
                        id={titleId}
                    >
                        {title}
                    </h2>
                    <button
                        onClick={onClose}
                        className={`
                            h-8 w-8 flex items-center justify-center rounded-full
                            transition-colors
                            ${colorfulHeader
                                ? 'text-white hover:bg-white/20'
                                : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100'
                            }
                        `}
                        aria-label="Close modal"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Content - Clean white background */}
                <div className="flex-1 overflow-y-auto bg-white p-6">
                    {children}
                </div>
            </div>
        </div>,
        portalRootRef.current
    );
};

export default FixedModal;