// components/EditPositionButton.js
import { useState, useEffect, useContext } from 'react';
import { AuthContext } from '@/context/AuthContext';
import { Edit } from 'lucide-react';
import SecurityPositionModal from '@/components/modals/SecurityPositionModal';
import CryptoPositionModal from '@/components/modals/CryptoPositionModal';
import MetalPositionModal from '@/components/modals/MetalPositionModal';
import RealEstatePositionModal from '@/components/modals/RealEstatePositionModal';
import CashPositionModal from '@/components/modals/CashPositionModal';

const EditPositionButton = ({ 
    position,
    accountId,
    accountName = '', // Default to empty string if not provided
    assetType, // Explicitly pass the asset type
    onPositionEdited = () => {},
    className = "",
    buttonContent = null // Allow custom button content
}) => {
    const { user } = useContext(AuthContext);
    const [error, setError] = useState(null);
    const [successMessage, setSuccessMessage] = useState("");
    const [isSecurityModalOpen, setIsSecurityModalOpen] = useState(false);
    const [isCryptoModalOpen, setIsCryptoModalOpen] = useState(false);
    const [isMetalModalOpen, setIsMetalModalOpen] = useState(false);
    const [isRealEstateModalOpen, setIsRealEstateModalOpen] = useState(false);
    const [isCashModalOpen, setIsCashModalOpen] = useState(false);

    // Log position data when it changes
    useEffect(() => {
        if (position) {
            console.log("EditPositionButton - Position data received:", position);
        }
    }, [position]);

    const handleEditPosition = (e) => {
        if (e) e.stopPropagation(); // Stop event propagation for row clicks
        
        setError(null);
        if (!position) {
            setError('Position data is missing.');
            return;
        }
        
        if (!accountId) {
            setError('Account ID is missing.');
            return;
        }
        
        // Determine which modal to open based on position type
        openPositionModal();
    };

    const openPositionModal = () => {
        try {
            // Log all properties of the position object
            console.log("EditPositionButton - Position data for modal:", 
                Object.keys(position).reduce((acc, key) => {
                    acc[key] = position[key];
                    return acc;
                }, {})
            );
            
            // Additional debug info for date fields, which are often problematic
            if (position.purchase_date) {
                console.log("Purchase date format:", {
                    original: position.purchase_date,
                    type: typeof position.purchase_date,
                    asDate: new Date(position.purchase_date).toISOString()
                });
            }
            
            if (position.maturity_date) {
                console.log("Maturity date format:", {
                    original: position.maturity_date,
                    type: typeof position.maturity_date,
                    asDate: new Date(position.maturity_date).toISOString()
                });
            }
            
            // Determine position type
            const positionType = getPositionType();
            console.log('EditPositionButton: Determined position type:', positionType);

            switch (positionType) {
                case 'security':
                    setIsSecurityModalOpen(true);
                    break;
                case 'crypto':
                    setIsCryptoModalOpen(true);
                    break;
                case 'metal':
                    setIsMetalModalOpen(true);
                    break;
                case 'realestate':
                    setIsRealEstateModalOpen(true);
                    break;
                case 'cash': 
                    setIsCashModalOpen(true);
                    break;
                default:
                    console.warn(`EditPositionButton: Unknown position type: ${positionType}`);
                    setError(`Unknown position type: ${positionType}`);
            }
        } catch (err) {
            console.error("EditPositionButton: Error occurred while opening modal:", err);
            setError("An error occurred while trying to edit the position.");
        }
    };

    // Helper method to determine position type
    const getPositionType = () => {
        // First check if assetType prop is explicitly provided
        if (assetType) {
            return assetType.toLowerCase();
        }
        
        // Next check for asset_type property which is most likely in your data
        if (position.asset_type) {
            return position.asset_type.toLowerCase();
        }
        
        // Then try the other methods as fallbacks
        if (position.position_type) {
            return position.position_type.toLowerCase();
        }
        
        if (position.asset_class) {
            const assetClass = position.asset_class.toLowerCase();
            
            if (assetClass === 'equity' || assetClass === 'fixed income' || assetClass === 'etf' || assetClass === 'mutual fund') {
                return 'security';
            } else if (assetClass === 'cryptocurrency') {
                return 'crypto';
            } else if (assetClass === 'precious metal') {
                return 'metal';
            } else if (assetClass === 'real estate') {
                return 'realestate';
            } else if (assetClass === 'cash' || assetClass === 'cash equivalent') {
                return 'cash';
            }
        }
        
        // Check if we have specific properties that indicate the type
        if (position.ticker) {
            return 'security';
        }
        
        if (position.coin_type || position.coin_symbol) {
            return 'crypto';
        }
        
        if (position.metal_type) {
            return 'metal';
        }
        
        if (position.property_type || position.address) {
            return 'realestate';
        }
        
        if (position.cash_type) {
            return 'cash';
        }
        
        // Default to security as a fallback
        console.warn("EditPositionButton: Could not determine position type, defaulting to 'security'", position);
        return 'security';
    };

    const handlePositionSaved = () => {
        console.log("EditPositionButton: Position updated, closing all modals");
        setIsSecurityModalOpen(false);
        setIsCryptoModalOpen(false);
        setIsMetalModalOpen(false);
        setIsRealEstateModalOpen(false);
        setIsCashModalOpen(false);
        
        setSuccessMessage(`Position updated successfully!`);
        setTimeout(() => setSuccessMessage(""), 3000);
        
        // Notify parent component
        onPositionEdited();
    };

    const handleCloseModal = (modalSetStateFunction) => {
        modalSetStateFunction(false);
    };

    // Use custom button content or default
    const displayButtonContent = buttonContent || (
        <div className="text-gray-600 hover:text-gray-900" title="Edit Position">
            <Edit className="h-5 w-5" />
        </div>
    );

    return (
        <>
            {/* Edit Position Button */}
            <button
                onClick={handleEditPosition}
                className={`flex items-center transition-colors ${className}`}
                title="Edit Position"
            >
                {displayButtonContent}
            </button>

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

            {/* Position Edit Modals */}
            <SecurityPositionModal
                isOpen={isSecurityModalOpen}
                onClose={() => setIsSecurityModalOpen(false)}
                accountId={accountId}
                accountName={accountName}
                positionToEdit={position}
                onPositionSaved={handlePositionSaved}
            />

            <CryptoPositionModal
                isOpen={isCryptoModalOpen}
                onClose={() => setIsCryptoModalOpen(false)}
                accountId={accountId}
                accountName={accountName}
                positionToEdit={position}
                onPositionSaved={handlePositionSaved}
            />

            <MetalPositionModal
                isOpen={isMetalModalOpen}
                onClose={() => setIsMetalModalOpen(false)}
                accountId={accountId}
                accountName={accountName}
                positionToEdit={position}
                onPositionSaved={handlePositionSaved}
            />

            <RealEstatePositionModal
                isOpen={isRealEstateModalOpen}
                onClose={() => setIsRealEstateModalOpen(false)}
                accountId={accountId}
                accountName={accountName}
                positionToEdit={position}
                onPositionSaved={handlePositionSaved}
            />

            <CashPositionModal
                isOpen={isCashModalOpen}
                onClose={() => setIsCashModalOpen(false)}
                accountId={accountId}
                accountName={accountName}
                positionToEdit={position}
                onPositionSaved={handlePositionSaved}
            />
        </>
    );
};

export default EditPositionButton;