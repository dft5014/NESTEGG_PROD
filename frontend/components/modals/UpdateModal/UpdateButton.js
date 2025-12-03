// Update Button Component - Navbar integration
import React, { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import UpdateModal from './UpdateModal';

/**
 * Button component to open the UpdateModal
 * Designed for navbar integration
 */
export const UpdateButton = ({
  label = 'Update',
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);

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
      />
    </>
  );
};

export default UpdateButton;
