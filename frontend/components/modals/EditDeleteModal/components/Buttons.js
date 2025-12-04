import React, { useState } from 'react';
import { Edit3, CreditCard } from 'lucide-react';
import EditDeleteModal from '../EditDeleteModal.js';

/**
 * Button to open the Edit & Delete modal (general purpose)
 */
export const QuickEditDeleteButton = ({ className = '', mobileView = false, label = 'Edit' }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  if (mobileView) {
    return (
      <>
        <button
          onClick={() => setIsModalOpen(true)}
          className={className}
        >
          <Edit3 className="h-6 w-6 mb-1 text-white group-hover:text-blue-300" />
          <span className="text-xs text-gray-200 group-hover:text-white">{label}</span>
        </button>

        <EditDeleteModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
        />
      </>
    );
  }

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className={`group relative flex items-center text-white py-1 px-4 transition-all duration-300 ${className}`}
        title="Edit or delete accounts, positions, and liabilities"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
        <div className="relative flex items-center">
          <Edit3 className="w-4 h-4 mr-1.5 text-blue-400 group-hover:text-white transition-colors" />
          <span className="text-sm text-gray-200 group-hover:text-white font-medium">{label}</span>
        </div>
      </button>

      <EditDeleteModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
};

/**
 * Button to open the Edit & Delete modal directly to liabilities view
 */
export const LiabilityEditDeleteButton = ({ className = '', mobileView = false }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  if (mobileView) {
    return (
      <>
        <button
          onClick={() => setIsModalOpen(true)}
          className={className}
        >
          <CreditCard className="h-6 w-6 mb-1 text-white group-hover:text-red-300" />
          <span className="text-xs text-gray-200 group-hover:text-white">Liabilities</span>
        </button>

        <EditDeleteModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          initialView="liabilities"
        />
      </>
    );
  }

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className={`group relative flex items-center text-white py-1 px-4 transition-all duration-300 ${className}`}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-red-600 to-orange-600 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
        <div className="relative flex items-center">
          <CreditCard className="w-5 h-5 mr-2 text-red-400 group-hover:text-white transition-colors" />
          <span className="text-sm text-gray-200 group-hover:text-white font-medium">Manage Liabilities</span>
        </div>
      </button>

      <EditDeleteModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        initialView="liabilities"
      />
    </>
  );
};

export default QuickEditDeleteButton;
