import React from 'react';
import { PanelResizeHandle } from 'react-resizable-panels';

const CustomPanelResizeHandle = ({ className, ...props }) => (
  <PanelResizeHandle className={`custom-resize-handle ${className} bg-gray-300 hover:bg-gray-400`} {...props} />
);

export default CustomPanelResizeHandle;