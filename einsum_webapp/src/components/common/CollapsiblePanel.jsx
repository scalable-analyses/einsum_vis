import React, { useState } from 'react';
import { TbChevronDown } from 'react-icons/tb';

const CollapsiblePanel = ({ title, children, headerContent }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div className="mb-4">
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="w-full flex items-center justify-between p-2 bg-gray-50 hover:bg-gray-100 rounded-t-lg transition-colors"
      >
        <div className="flex items-center justify-between w-full">
          <span className="text-lg font-semibold">{title}</span>
          {headerContent}
        </div>
        <TbChevronDown
          className={`w-5 h-5 transform transition-transform ${!isCollapsed ? 'rotate-180' : ''
            }`}
        />
      </button>
      {!isCollapsed && (
        <div className="p-2 border border-t-0 border-gray-200 rounded-b-lg">
          {children}
        </div>
      )}
    </div>
  );
};
export default CollapsiblePanel;