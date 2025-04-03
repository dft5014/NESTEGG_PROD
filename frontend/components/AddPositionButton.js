// components/AddPositionButton.js
import { useState, useEffect, useContext } from 'react';
import { AuthContext } from '@/context/AuthContext';
import { DollarSign } from 'lucide-react';
import AccountSelectModal from '@/components/modals/AccountSelectModal';
import PositionTypeModal from '@/components/modals/PositionTypeModal';
import SecurityPositionModal from '@/components/modals/SecurityPositionModal';
import CryptoPositionModal from '@/components/modals/CryptoPositionModal';
import MetalPositionModal from '@/components/modals/MetalPositionModal';
import RealEstatePositionModal from '@/components/modals/RealEstatePositionModal'; // Check this import path carefully
import { fetchAccounts } from '@/utils/apimethods/accountMethods';

const AddPositionButton = ({ className = "", onPositionAdded = () => {} }) => {
    const { user } = useContext(AuthContext);
    const [accounts, setAccounts] = useState([]);
    const [selectedAccount, setSelectedAccount] = useState(null);
    const [selectedPositionType, setSelectedPositionType] = useState(null);
    const [error, setError] = useState(null);
    const [successMessage, setSuccessMessage] = useState("");
    const [isAccountSelectModalOpen, setIsAccountSelectModalOpen] = useState(false);
    const [isPositionTypeModalOpen, setIsPositionTypeModalOpen] = useState(false);
    const [isSecurityModalOpen, setIsSecurityModalOpen] = useState(false);
    const [isCryptoModalOpen, setIsCryptoModalOpen] = useState(false);
    const [isMetalModalOpen, setIsMetalModalOpen] = useState(false);
    const [isRealEstateModalOpen, setIsRealEstateModalOpen] = useState(false);

    // Load accounts on mount
    useEffect(() => {
        if (user) {
            loadAccounts();
        }
    }, [user]);

    const loadAccounts = async () => {
        try {
            const accountsData = await fetchAccounts();
            setAccounts(accountsData);
        } catch (error) {
            console.error("AddPositionButton: Error fetching accounts:", error);
            setError("Failed to load accounts: " + error.message);
        }
    };

    const handleAddPosition = () => {
        // Clear previous errors/selections maybe? Or handle in onClose.
        setError(null);

        if (accounts.length === 0) {
            setError('Please add an account first before adding positions.');
            // Maybe open Add Account modal here? Or rely on user seeing the button elsewhere.
            return;
        }

        // Reset previous selections from potentially cancelled flows
        // Note: Step 5 will refine this reset logic further based on onClose
        setSelectedAccount(null);
        setSelectedPositionType(null);

        if (accounts.length === 1) {
            console.log("AddPositionButton: Single account detected, selecting:", accounts[0]);
            setSelectedAccount(accounts[0]);
            setIsPositionTypeModalOpen(true);
        } else {
            console.log("AddPositionButton: Multiple accounts detected, opening AccountSelectModal");
            setIsAccountSelectModalOpen(true);
        }
    };

    const handleAccountSelected = (accountId) => {
        const account = accounts.find(acc => acc.id === accountId);
        console.log("AddPositionButton: Account selected:", account);

        if (account) {
            setSelectedAccount(account);
            setIsAccountSelectModalOpen(false);

            // If type was somehow selected before account (shouldn't happen with current flow, but safe check)
            if (selectedPositionType) {
                 console.log("AddPositionButton: Position type already selected:", selectedPositionType, "Opening specific modal.");
                 openPositionModal(selectedPositionType);
            } else {
                 console.log("AddPositionButton: Opening PositionTypeModal");
                 setIsPositionTypeModalOpen(true);
            }
        } else {
             console.error("AddPositionButton: Selected account ID not found:", accountId);
             setError("Could not find the selected account.");
        }
    };

    const handlePositionTypeSelected = (type) => {
        // *** DEBUG LOG 1 ***
        console.log('AddPositionButton: handlePositionTypeSelected called with type:', type);
        setSelectedPositionType(type);
        setIsPositionTypeModalOpen(false);
        openPositionModal(type);
    };

    const openPositionModal = (type) => {
         // *** DEBUG LOG 2 ***
        console.log('AddPositionButton: openPositionModal called for type:', type);
        switch (type) {
            case 'security':
                 console.log('AddPositionButton: Setting isSecurityModalOpen = true');
                setIsSecurityModalOpen(true);
                break;
            case 'crypto':
                console.log('AddPositionButton: Setting isCryptoModalOpen = true');
                setIsCryptoModalOpen(true);
                break;
            case 'metal':
                console.log('AddPositionButton: Setting isMetalModalOpen = true');
                setIsMetalModalOpen(true);
                break;
            case 'realestate':
                 // *** DEBUG LOG 3 ***
                console.log('AddPositionButton: Setting isRealEstateModalOpen = true');
                setIsRealEstateModalOpen(true);
                break;
            default:
                console.warn(`AddPositionButton: Unknown position type in openPositionModal: ${type}`);
        }
    };

    const handlePositionSaved = () => {
        console.log("AddPositionButton: Position saved, closing all modals and resetting state.");
        setIsSecurityModalOpen(false);
        setIsCryptoModalOpen(false);
        setIsMetalModalOpen(false);
        setIsRealEstateModalOpen(false);
        setSuccessMessage(`${selectedPositionType || 'Unknown'} position added successfully!`); // Handle case where type might be null somehow
        setTimeout(() => setSuccessMessage(""), 3000);
        setSelectedPositionType(null);
        setSelectedAccount(null);
        onPositionAdded(); // Callback to notify parent component
    };

    // Function to handle modal closure (will be expanded in Step 5)
    const handleCloseModal = (modalSetStateFunction) => {
         console.log(`AddPositionButton: Closing modal via handleCloseModal for ${modalSetStateFunction.name}`);
         modalSetStateFunction(false);
         // Step 5 will add state reset logic here:
         // resetSelection();
    };


    return (
        <>
            {/* Add Positions Button */}
            <button
                onClick={handleAddPosition}
                className={`flex items-center text-white py-1 px-4 transition-colors group ${className}`}
                 // Disable if accounts haven't loaded? Depends if accounts are fetched here or passed via props.
                 // Currently fetching here, so maybe disable while loading.
            >
                <DollarSign className="w-6 h-6 mr-2 text-white group-hover:text-blue-300" />
                <span className="text-sm text-gray-200 group-hover:text-white">Add Position</span> {/* Changed from 'Add Positions' for consistency? */}
            </button>

            {/* Error Message */}
            {error && (
                <div className="fixed top-16 left-1/2 transform -translate-x-1/2 p-4 bg-red-100 text-red-700 rounded-lg z-[70]"> {/* Ensure higher z-index than modal overlay */}
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
                <div className="fixed top-16 left-1/2 transform -translate-x-1/2 p-4 bg-green-100 text-green-700 rounded-lg z-[70]"> {/* Ensure higher z-index */}
                    {successMessage}
                </div>
            )}

            {/* Modals */}
            {/* Pass simplified close handlers for now, Step 5 will refine */}
            <AccountSelectModal
                isOpen={isAccountSelectModalOpen}
                onClose={() => setIsAccountSelectModalOpen(false)} // Step 5 will enhance this
                onAccountSelected={handleAccountSelected}
            />
            <PositionTypeModal
                isOpen={isPositionTypeModalOpen}
                onClose={() => setIsPositionTypeModalOpen(false)} // Step 5 will enhance this
                onTypeSelected={handlePositionTypeSelected}
            />
             {/* Check import path and component name carefully */}
            <RealEstatePositionModal
                isOpen={isRealEstateModalOpen}
                onClose={() => setIsRealEstateModalOpen(false)} // Step 5 will enhance this
                accountId={selectedAccount?.id}
                onPositionSaved={handlePositionSaved}
            />
            <SecurityPositionModal
                isOpen={isSecurityModalOpen}
                onClose={() => setIsSecurityModalOpen(false)} // Step 5 will enhance this
                accountId={selectedAccount?.id}
                onPositionSaved={handlePositionSaved}
            />
            <CryptoPositionModal
                isOpen={isCryptoModalOpen}
                onClose={() => setIsCryptoModalOpen(false)} // Step 5 will enhance this
                accountId={selectedAccount?.id}
                onPositionSaved={handlePositionSaved}
            />
            <MetalPositionModal
                isOpen={isMetalModalOpen}
                onClose={() => setIsMetalModalOpen(false)} // Step 5 will enhance this
                accountId={selectedAccount?.id}
                onPositionSaved={handlePositionSaved}
            />

        </>
    );
};

export default AddPositionButton;