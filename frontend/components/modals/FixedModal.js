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
    colorfulHeader = false, // NEW: Enable gradient header
    headerContent = null // NEW: Custom header content (replaces title)
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
            className={`fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-start ${zIndex} p-4 sm:p-6 lg:p-8 pt-8 sm:pt-12 lg:pt-16 overflow-y-auto`}
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
                className={`bg-gray-950 rounded-2xl shadow-2xl w-full ${size} text-white my-auto max-h-[calc(100vh-8rem)] flex flex-col border border-gray-800`}
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className={`
                    flex justify-between items-center p-4 border-b flex-shrink-0
                    ${colorfulHeader
                        ? 'bg-gradient-to-r from-indigo-600 to-purple-600 border-indigo-700'
                        : 'border-gray-800 bg-gray-950'
                    }
                `}>
                    {headerContent ? (
                        <div className="flex-1 flex items-center justify-between" id={titleId}>
                            {headerContent}
                        </div>
                    ) : (
                        <h2
                            className="text-xl font-bold text-white"
                            id={titleId}
                        >
                            {title}
                        </h2>
                    )}
                    <button
                        onClick={onClose}
                        className={`
                            h-8 w-8 flex items-center justify-center rounded-full
                            transition-colors ml-3 flex-shrink-0
                            ${colorfulHeader
                                ? 'text-white hover:bg-white/20'
                                : 'text-gray-400 hover:text-white hover:bg-gray-800'
                            }
                        `}
                        aria-label="Close modal"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Content - Clean dark background */}
                <div className="flex-1 overflow-y-auto bg-gray-950">
                    {children}
                </div>
            </div>
        </div>,
        portalRootRef.current
    );
};

export default FixedModal;