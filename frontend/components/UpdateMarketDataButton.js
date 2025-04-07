// components/UpdateMarketDataButton.js
import React, { useState } from 'react';
import { Database } from 'lucide-react';
import UpdateMarketDataModal from '@/components/modals/UpdateMarketDataModal';

const UpdateMarketDataButton = ({ className = "" }) => {
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
        <Database className="w-5 h-5 mr-2" />
        <span>Update Market Data</span>
      </button>

      <UpdateMarketDataModal 
        isOpen={isModalOpen}
        onClose={handleCloseModal}
      />
    </>
  );
};

export default UpdateMarketDataButton;