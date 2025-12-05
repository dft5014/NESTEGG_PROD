import { useState } from 'react';
import AddPositionsModalV2 from '@/components/modals/AddPositionsModalV2';
import { Plus } from 'lucide-react';

export function AddPositionsModalV2Button() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center space-x-2 px-4 py-2"
      >
        <Plus className="w-4 h-4" />
        <span className="text-sm font-medium">Add V2 (Test)</span>
      </button>

      <AddPositionsModalV2
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onSuccess={() => {}}
      />
    </>
  );
}
