// components/UpdateOtherDataButton.js
import React, { useState } from 'react';
import { DollarSign } from 'lucide-react';
import UpdateOtherDataModal from '@/components/modals/UpdateOtherDataModal';
import DirectUpdateMarketDataModal from '@/components/modals/DirectUpdateMarketDataModal'

const UpdateOtherDataButton = ({ className = "" }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleOpenModal = () => {
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  return (
    <>
      <button 
        onClick={handleOpenModal}
        className={`flex items-center py-2 px-4 transition-colors ${className}`}
      >
        <DollarSign className="w-5 h-5 mr-2" />
        <span>Update Other Data</span>
      </button>

      <DirectUpdateMarketDataModal 
        isOpen={isModalOpen}
        onClose={handleCloseModal}
      />
    </>
  );
};

export default UpdateOtherDataButton;