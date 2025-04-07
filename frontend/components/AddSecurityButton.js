// components/AddSecurityButton.js
import React, { useState } from 'react';
import { BarChart2 } from 'lucide-react';
import AddSecurityModal from '@/components/modals/AddSecurityModal';

const AddSecurityButton = ({ className = "" }) => {
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
        <BarChart2 className="w-5 h-5 mr-2" />
        <span>Add Security</span>
      </button>

      <AddSecurityModal 
        isOpen={isModalOpen}
        onClose={handleCloseModal}
      />
    </>
  );
};

export default AddSecurityButton;