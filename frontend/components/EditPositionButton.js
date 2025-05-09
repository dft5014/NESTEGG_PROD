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
    accountName,
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
        // Based on your data structure, determine the type
        // This might need adjustment based on how position type is stored
        
        // Option 1: If position has a direct 'position_type' field
        if (position.position_type) {
            return position.position_type.toLowerCase();
        }
        
        // Option 2: If position has an 'asset_class' field
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
        
        // Option 3: If we have a symbol, it's likely a security
        if (position.symbol && !position.symbol.includes('crypto:')) {
            return 'security';
        }
        
        // Option 4: If symbol starts with 'crypto:', it's cryptocurrency
        if (position.symbol && position.symbol.includes('crypto:')) {
            return 'crypto';
        }
        
        // Default to cash if we can't determine
        return 'cash';
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
                position={position}
                isEditing={true}
                onPositionSaved={handlePositionSaved}
            />
            <CryptoPositionModal
                isOpen={isCryptoModalOpen}
                onClose={() => setIsCryptoModalOpen(false)}
                accountId={accountId}
                position={position}
                isEditing={true}
                onPositionSaved={handlePositionSaved}
            />
            <MetalPositionModal
                isOpen={isMetalModalOpen}
                onClose={() => setIsMetalModalOpen(false)}
                accountId={accountId}
                position={position}
                isEditing={true}
                onPositionSaved={handlePositionSaved}
            />
            <RealEstatePositionModal
                isOpen={isRealEstateModalOpen}
                onClose={() => setIsRealEstateModalOpen(false)}
                accountId={accountId}
                position={position}
                isEditing={true}
                onPositionSaved={handlePositionSaved}
            />
            <CashPositionModal
                isOpen={isCashModalOpen}
                onClose={() => setIsCashModalOpen(false)}
                accountId={accountId}
                position={position}
                isEditing={true}
                onPositionSaved={handlePositionSaved}
            />
        </>
    );
};

export default EditPositionButton;