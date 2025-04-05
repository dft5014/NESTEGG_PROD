// components/flows/AddPositionFlow.js
import { useState, useEffect, useContext } from 'react';
import { AuthContext } from '@/context/AuthContext';
import FixedModal from '@/components/modals/FixedModal'; // Use FixedModal
import AccountSelectModal from '@/components/modals/AccountSelectModal';
import PositionTypeModal from '@/components/modals/PositionTypeModal';
import SecurityPositionModal from '@/components/modals/SecurityPositionModal';
import CryptoPositionModal from '@/components/modals/CryptoPositionModal';
import MetalPositionModal from '@/components/modals/MetalPositionModal';
import RealEstatePositionModal from '@/components/modals/RealEstatePositionModal';
import { fetchAccounts } from '@/utils/apimethods/accountMethods';

// NOTE: This component now assumes FixedModal provides a white background.
// You might need to adjust the styling of the sub-components
// (AccountSelectModal, PositionTypeModal, etc.) if they were designed
// for a dark background.

const AddPositionFlow = ({ isOpen, onClose, initialAccount = null }) => {
    const { user } = useContext(AuthContext);
    const [accounts, setAccounts] = useState([]);
    const [selectedAccount, setSelectedAccount] = useState(initialAccount);
    const [selectedPositionType, setSelectedPositionType] = useState(null);
    const [error, setError] = useState(null);
    const [successMessage, setSuccessMessage] = useState(""); // Not currently displayed, could be added

    const [currentStep, setCurrentStep] = useState(null); // 'account', 'type', 'security', 'crypto', 'metal', 'realestate'

    // Load accounts
    useEffect(() => {
        if (isOpen && user && accounts.length === 0) {
            loadAccounts();
        }
        // Reset state if closed
        if (!isOpen) {
             setCurrentStep(null);
             setSelectedPositionType(null);
             setSelectedAccount(initialAccount); // Revert to initial if provided
             setError(null);
             setSuccessMessage("");
        }
    }, [isOpen, user]); // Rerun load on open, reset on close

    // Determine starting step
    useEffect(() => {
        if (!isOpen || accounts.length === 0) return; // Only run if open and accounts are loaded

        if (selectedAccount) {
            setCurrentStep('type');
        } else if (accounts.length === 1) {
            setSelectedAccount(accounts[0]);
            setCurrentStep('type');
        } else {
            setCurrentStep('account');
        }
    }, [isOpen, accounts, selectedAccount, initialAccount]);


    const loadAccounts = async () => {
        setError(null); // Clear previous errors
        try {
            const accountsData = await fetchAccounts();
            setAccounts(accountsData);
             if (accountsData.length === 0) {
                 setError('You need to add an account before adding positions.');
             }
        } catch (fetchError) {
            console.error("AddPositionFlow: Error fetching accounts:", fetchError);
            setError("Failed to load accounts. Please try again.");
        }
    };

    const handleAccountSelected = (accountId) => {
        const account = accounts.find(acc => acc.id === accountId);
        if (account) {
            setSelectedAccount(account);
            setError(null); // Clear error if selection succeeds
            setCurrentStep('type');
        } else {
            setError("Could not find the selected account.");
        }
    };

    const handlePositionTypeSelected = (type) => {
        setSelectedPositionType(type);
        setCurrentStep(type);
    };

    const handlePositionSaved = (success = true) => {
        if (success) {
            onClose(true); // Signal success to parent immediately
        } else {
            // Optionally set an error message here instead of closing
            setError("Failed to save position. Please check the details and try again.");
            // onClose(false); // Or close without signalling success
        }
    };

    // Handles closing/going back from specific steps
    const handleStepCloseOrBack = () => {
        setError(null); // Clear errors when navigating back/closing step
        if (currentStep === 'security' || currentStep === 'crypto' || currentStep === 'metal' || currentStep === 'realestate') {
            setCurrentStep('type');
            setSelectedPositionType(null);
        } else if (currentStep === 'type') {
            if (initialAccount || accounts.length <= 1) { // If account was pre-selected or only one exists
                 onClose(false); // Close the whole flow
            } else {
                 setCurrentStep('account');
                 setSelectedAccount(null);
            }
        } else { // 'account' step or unexpected state
             onClose(false); // Close the whole flow
        }
    };

    // Determine title for the FixedModal wrapper
    const getModalTitle = () => {
         switch (currentStep) {
             case 'account': return 'Select Account';
             case 'type': return `Add Position to ${selectedAccount?.account_name || 'Account'}`;
             case 'security': return 'Add Security Position';
             case 'crypto': return 'Add Cryptocurrency Position';
             case 'metal': return 'Add Precious Metal Position';
             case 'realestate': return 'Add Real Estate Position';
             default: return 'Add Position';
         }
    }

     // Render specific step content
     // These sub-components should render *only their form/content*,
     // assuming FixedModal provides the wrapper, title, padding, close etc.
     const renderStepContent = () => {
         // Handle loading and initial error states
         if (accounts.length === 0 && !error && isOpen) {
             return <div className="p-4 text-gray-500 text-center">Loading accounts...</div>;
         }
         // Display general errors within the modal body
         if (error) {
             return <div className="p-4 m-4 bg-red-100 text-red-700 rounded">{error}</div>;
         }

         // Ensure we have the required data before rendering step
         if (currentStep === 'type' && !selectedAccount) return <div className="p-4 text-gray-500">Account not selected.</div>;
         if (['security', 'crypto', 'metal', 'realestate'].includes(currentStep) && !selectedAccount) return <div className="p-4 text-gray-500">Account not selected.</div>;
         if (['security', 'crypto', 'metal', 'realestate'].includes(currentStep) && !selectedPositionType) return <div className="p-4 text-gray-500">Position type not selected.</div>;


        switch (currentStep) {
            case 'account':
                return (
                    <AccountSelectModal
                        accounts={accounts}
                        onAccountSelected={handleAccountSelected}
                        // Pass onClose as the back/cancel action for this step
                        onClose={() => onClose(false)}
                        // Indicate it's embedded, might need adjustments in AccountSelectModal
                        isEmbedded={true}
                    />
                );
            case 'type':
                return (
                    <PositionTypeModal
                        onTypeSelected={handlePositionTypeSelected}
                        // Pass onClose as the back/cancel action for this step
                        onClose={handleStepCloseOrBack}
                        isEmbedded={true}
                    />
                );
            case 'security':
                return (
                    <SecurityPositionModal
                        accountId={selectedAccount?.id}
                        onPositionSaved={() => handlePositionSaved(true)}
                        // Pass onClose as the back/cancel action for this step
                        onClose={handleStepCloseOrBack}
                        isEmbedded={true} // Use this prop if SecurityPositionModal needs to adjust its rendering
                    />
                );
             case 'crypto':
                 return (
                     <CryptoPositionModal
                         accountId={selectedAccount?.id}
                         onPositionSaved={() => handlePositionSaved(true)}
                         onClose={handleStepCloseOrBack}
                         isEmbedded={true}
                     />
                 );
            case 'metal':
                return (
                    <MetalPositionModal
                        accountId={selectedAccount?.id}
                        onPositionSaved={() => handlePositionSaved(true)}
                        onClose={handleStepCloseOrBack}
                        isEmbedded={true}
                    />
                 );
             case 'realestate':
                 return (
                     <RealEstatePositionModal
                         accountId={selectedAccount?.id}
                         onPositionSaved={() => handlePositionSaved(true)}
                         onClose={handleStepCloseOrBack}
                         isEmbedded={true}
                     />
                 );
            default:
                 // Only show 'please wait' if open and no other condition met
                  return isOpen ? <div className="p-4 text-gray-500 text-center">Please wait...</div> : null;
        }
    };

    return (
        <FixedModal
            isOpen={isOpen}
            onClose={() => onClose(false)} // Backdrop click or main X closes the whole flow
            title={getModalTitle()}
            // Use default size or specify e.g., size="max-w-lg"
            // Use default zIndex or specify e.g., zIndex="z-[70]"
        >
            {/* Render the content for the current step */}
            {/* FixedModal adds padding by default, adjust if needed */}
             {renderStepContent()}

            {/* Optional: Add shared Back/Cancel buttons in the footer */}
            {/*
             <div className="flex justify-end space-x-2 p-4 border-t border-gray-200">
                 {(currentStep !== 'account' && !(initialAccount || accounts.length <= 1)) && (
                      <button type="button" className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 text-sm" onClick={handleStepCloseOrBack}>
                          Back
                      </button>
                 )}
                 <button type="button" className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 text-sm" onClick={() => onClose(false)}>
                     Cancel
                 </button>
             </div>
            */}
        </FixedModal>
    );
};

export default AddPositionFlow;