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
  const [seededPositions, setSeededPositions] = useState(null);

  const handleAddPosition = useCallback(() => {
    // Open QuickStart modal for adding new positions (no seeding)
    setSeededPositions(null);
    setShowQuickStart(true);
  }, []);

  // Handle import of new positions from the quantity grid
  const handleImportPositions = useCallback((positions) => {
    // Set seeded positions and open QuickStart modal
    setSeededPositions(positions);
    setShowQuickStart(true);
  }, []);

  const handleQuickStartSuccess = useCallback(() => {
    setShowQuickStart(false);
    setSeededPositions(null);
    // Data will refresh automatically through DataStore
  }, []);

  const handleQuickStartClose = useCallback(() => {
    setShowQuickStart(false);
    setSeededPositions(null);
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
        onImportPositions={handleImportPositions}
      />

      {/* QuickStart modal for adding new positions */}
      <QuickStartModalV2
        isOpen={showQuickStart}
        onClose={handleQuickStartClose}
        onSuccess={handleQuickStartSuccess}
        initialPositions={seededPositions}
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
  const [seededPositions, setSeededPositions] = useState(null);

  const handleAddPosition = useCallback(() => {
    // Open QuickStart modal for adding new positions (no seeding)
    setSeededPositions(null);
    setShowQuickStart(true);
  }, []);

  // Handle import of new positions from the quantity grid
  const handleImportPositions = useCallback((positions) => {
    // Set seeded positions and open QuickStart modal
    setSeededPositions(positions);
    setShowQuickStart(true);
  }, []);

  const handleQuickStartSuccess = useCallback(() => {
    setShowQuickStart(false);
    setSeededPositions(null);
    // Data will refresh automatically through DataStore
  }, []);

  const handleQuickStartClose = useCallback(() => {
    setShowQuickStart(false);
    setSeededPositions(null);
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
        onImportPositions={handleImportPositions}
      />

      {/* QuickStart modal for adding new positions */}
      <QuickStartModalV2
        isOpen={showQuickStart}
        onClose={handleQuickStartClose}
        onSuccess={handleQuickStartSuccess}
        initialPositions={seededPositions}
      />
    </>
  );
};

export default UpdateButton;
