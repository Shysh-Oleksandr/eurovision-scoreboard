import React from 'react';

import Button from '../Button';

interface ModalBottomContentProps {
  onClose: () => void;
  onSave: () => void;
  onDelete?: () => void;
}

const ModalBottomContent: React.FC<ModalBottomContentProps> = ({
  onClose,
  onSave,
  onDelete,
}) => {
  return (
    <div
      className={`flex items-center xs:gap-4 gap-2 bg-primary-900 p-4 z-30 ${
        onDelete ? 'justify-between' : 'justify-end'
      }`}
    >
      {onDelete && (
        <Button
          className="sm:!text-base text-sm"
          variant="destructive"
          onClick={onDelete}
        >
          Delete
        </Button>
      )}
      <div className="flex justify-end xs:gap-4 gap-2">
        <Button
          variant="secondary"
          className="sm:!text-base text-sm"
          onClick={onClose}
        >
          Cancel
        </Button>
        <Button
          className="w-full sm:!text-base text-sm px-6 font-semibold"
          onClick={onSave}
        >
          Save
        </Button>
      </div>
    </div>
  );
};

export default ModalBottomContent;
