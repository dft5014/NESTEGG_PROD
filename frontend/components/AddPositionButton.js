// components/AddPositionButton.js
import { useState, useEffect, useContext } from 'react';
import { AuthContext } from '@/context/AuthContext';
import { DollarSign } from 'lucide-react';
import AccountSelectModal from '@/components/modals/AccountSelectModal';
import PositionTypeModal from '@/components/modals/PositionTypeModal';
import SecurityPositionModal from '@/components/modals/SecurityPositionModal';
import CryptoPositionModal from '@/components/modals/CryptoPositionModal';
import MetalPositionModal from '@/components/modals/MetalPositionModal';
import RealEstatePositionModal from '@/components/modals/RealEstatePositionModal'; // Check path
import { fetchAccounts } from '@/utils/apimethods/accountMethods';

const AddPositionButton = ({ className = "", onPositionAdded = () => {} }) => {
    // ... (keep all state variables, useEffect, loadAccounts, handleAddPosition, handleAccountSelected as before) ...
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
        setError(null);
        if (accounts.length === 0) {
            setError('Please add an account first before adding positions.');
            return;
        }
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
        // Ensure this function call is exactly correct
        openPositionModal(type);
        console.log('AddPositionButton: Called openPositionModal(type)'); // Log after the call
    };

    const openPositionModal = (type) => {
        // *** MOVED DEBUG LOG 2 & WRAPPED IN TRY/CATCH ***
        try {
            console.log('AddPositionButton: Entered openPositionModal function with type:', type); // Now the very first line

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
                    // *** ADDED DEBUG LOG 4 ***
                    console.warn(`AddPositionButton: Unknown position type in openPositionModal switch: ->${type}<-`); // Log type with delimiters
            }
        } catch (err) {
             // *** ADDED DEBUG LOG 5 ***
            console.error("AddPositionButton: Error occurred INSIDE openPositionModal function:", err);
            setError(`An error occurred while trying to open the modal for type "${type}".`); // Show error to user
        }
    };

    // ... (keep handlePositionSaved, handleCloseModal, and return statement as before) ...
    const handlePositionSaved = () => {
        console.log("AddPositionButton: Position saved, closing all modals and resetting state.");
        setIsSecurityModalOpen(false);
        setIsCryptoModalOpen(false);
        setIsMetalModalOpen(false);
        setIsRealEstateModalOpen(false);
        setSuccessMessage(`${selectedPositionType || 'Unknown'} position added successfully!`);
        setTimeout(() => setSuccessMessage(""), 3000);
        setSelectedPositionType(null);
        setSelectedAccount(null);
        onPositionAdded();
    };

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
            >
                <DollarSign className="w-6 h-6 mr-2 text-white group-hover:text-blue-300" />
                <span className="text-sm text-gray-200 group-hover:text-white">Add Position</span>
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

            {/* Modals */}
            <AccountSelectModal
                isOpen={isAccountSelectModalOpen}
                onClose={() => setIsAccountSelectModalOpen(false)}
                onAccountSelected={handleAccountSelected}
            />
            <PositionTypeModal
                isOpen={isPositionTypeModalOpen}
                onClose={() => setIsPositionTypeModalOpen(false)}
                onTypeSelected={handlePositionTypeSelected}
            />
            <RealEstatePositionModal
                isOpen={isRealEstateModalOpen}
                onClose={() => setIsRealEstateModalOpen(false)}
                accountId={selectedAccount?.id}
                onPositionSaved={handlePositionSaved}
            />
            <SecurityPositionModal
                isOpen={isSecurityModalOpen}
                onClose={() => setIsSecurityModalOpen(false)}
                accountId={selectedAccount?.id}
                onPositionSaved={handlePositionSaved}
            />
            <CryptoPositionModal
                isOpen={isCryptoModalOpen}
                onClose={() => setIsCryptoModalOpen(false)}
                accountId={selectedAccount?.id}
                onPositionSaved={handlePositionSaved}
            />
            <MetalPositionModal
                isOpen={isMetalModalOpen}
                onClose={() => setIsMetalModalOpen(false)}
                accountId={selectedAccount?.id}
                onPositionSaved={handlePositionSaved}
            />
        </>
    );
};

export default AddPositionButton;