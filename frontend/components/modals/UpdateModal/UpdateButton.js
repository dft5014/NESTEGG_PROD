// Update Button Component - Navbar integration
import React, { useState, useCallback } from 'react';
import { RefreshCw } from 'lucide-react';
import UpdateModal from './UpdateModal';
import QuickStartModalV2 from '../quickstart/QuickStartModalV2';

/**
 * Button component to open the UpdateModal
 * Designed for navbar integration
 */
export const UpdateButton = ({
  label = 'Update',
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showQuickStart, setShowQuickStart] = useState(false);

  const handleAddPosition = useCallback(() => {
    // Open QuickStart modal for adding new positions
    setShowQuickStart(true);
  }, []);

  const handleQuickStartSuccess = useCallback(() => {
    setShowQuickStart(false);
    // Data will refresh automatically through DataStore
  }, []);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={`flex items-center gap-2 ${className}`}
        title="Update manual account balances"
      >
        <RefreshCw className="w-4 h-4" />
        <span>{label}</span>
      </button>

      <UpdateModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onAddPosition={handleAddPosition}
      />

      {/* QuickStart modal for adding new positions */}
      <QuickStartModalV2
        isOpen={showQuickStart}
        onClose={() => setShowQuickStart(false)}
        onSuccess={handleQuickStartSuccess}
      />
    </>
  );
};

/**
 * Alternative button with V2 suffix for testing
 */
export const UpdateButtonV2 = ({
  label = 'Update V2',
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showQuickStart, setShowQuickStart] = useState(false);

  const handleAddPosition = useCallback(() => {
    // Open QuickStart modal for adding new positions
    setShowQuickStart(true);
  }, []);

  const handleQuickStartSuccess = useCallback(() => {
    setShowQuickStart(false);
    // Data will refresh automatically through DataStore
  }, []);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={`flex items-center gap-2 ${className}`}
        title="Update balances (new version)"
      >
        <RefreshCw className="w-4 h-4" />
        <span>{label}</span>
      </button>

      <UpdateModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onAddPosition={handleAddPosition}
      />

      {/* QuickStart modal for adding new positions */}
      <QuickStartModalV2
        isOpen={showQuickStart}
        onClose={() => setShowQuickStart(false)}
        onSuccess={handleQuickStartSuccess}
      />
    </>
  );
};

export default UpdateButton;
