import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import SimpleTensorTree from './SimpleTensorTree.jsx';
import { dimensionTypes } from '../utils/dimensionClassifier.jsx';
import { TbArrowsExchange, TbArrowsShuffle, TbX } from "react-icons/tb";
import useDeviceSize from '../utils/useDeviceSize.jsx';

import { isEqual } from "lodash";

/**
 * InfoPanel Component
 * Displays detailed information about tensor contractions and their dimensions
 * 
 * @param {Object} props
 * @param {Object} props.node - Current node being displayed
 * @param {Object} props.connectedNodes - Connected nodes information {value: [], left: null, right: null}
 * @param {Function} props.setConnectedNodes - Function to update connected nodes
 * @param {Function} props.onClose - Function to handle panel closure
 * @param {Object} props.indexSizes - Sizes of different indices
 * @param {boolean} props.showSizes - Toggle between showing indices or sizes
 * @param {Function} props.onToggleSizes - Function to toggle size display
 * @param {Function} props.swapChildren - Function to swap left and right children
 * @param {Function} props.recalculateTreeAndOperations - Function to recalculate tree layout
 * @param {Function} props.addPermutationNode - Function to add permutation node
 * @param {Function} props.removePermutationNode - Function to remove permutation node
 * @param {boolean} props.isDraggablePanel - Whether the panel should be draggable
 * @param {Function} props.onMouseEnter - Mouse enter handler
 * @param {Function} props.onMouseLeave - Mouse leave handler
 */
const InfoPanel = ({
  node,
  connectedNodes = { value: [], left: null, right: null },
  setConnectedNodes,
  onClose,
  indexSizes,
  showSizes,
  onToggleSizes,
  swapChildren,
  recalculateTreeAndOperations,
  addPermutationNode,
  removePermutationNode,
  className = "",
  isDraggablePanel = false,
  onMouseEnter,
  onMouseLeave
}) => {
  const { getInfoPanelDimensions, isTablet } = useDeviceSize();
  const dimensions = getInfoPanelDimensions();
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const panelRef = useRef(null);
  const prevConnectedNodesRef = useRef(connectedNodes);

  useEffect(() => {
    if (!isEqual(prevConnectedNodesRef.current, connectedNodes)) {
      prevConnectedNodesRef.current = connectedNodes;
    }
  }, [connectedNodes, indexSizes]);

  // Force refresh panel when node changes to ensure proper display
  useEffect(() => {
    if (node && node.id) {
      setIsDragging(false); // Reset drag state when node changes
    }
  }, [node]);

  const dimTypes = useMemo(() => {
    if (connectedNodes.right)
      return dimensionTypes(connectedNodes.value, connectedNodes.left?.value, connectedNodes.right?.value);
  }, [connectedNodes.value, connectedNodes.left?.value, connectedNodes.right]);

  const isEmptyDimTypes = useMemo(() => {
    if (dimTypes) {
      return Object.values(dimTypes).every(category =>
        Object.values(category).every(arr => arr.length === 0)
      );
    }
    return true;
  }, [dimTypes]);

  /**
   * Calculates the size of a dimension based on its indices
   * @param {Array} indices - Array of index identifiers
   * @returns {string|number} - Calculated size or '-' if no indices
   */
  const calculateSize = (indices) => {
    if (!indices || indices.length === 0) return '-';
    return indices.reduce((acc, index) => acc * (indexSizes[index] || 1), 1);
  };

  /**
   * Handles mouse down event for panel dragging
   * @param {MouseEvent|TouchEvent} e - Mouse or touch event
   */
  const handleMouseDown = (e) => {
    if (!isDraggablePanel) return;

    // Don't initiate dragging if clicking the close button
    if (e.target.closest('button[data-close-button]')) {
      return;
    }

    const event = e.touches ? e.touches[0] : e;
    if (panelRef.current?.contains(event.target)) {
      setIsDragging(true);
      // Calculate offset from current position, not just from the click point
      setDragOffset({
        x: event.clientX - position.x,
        y: event.clientY - position.y,
      });
      e.preventDefault(); // Prevent text selection during drag
    }
  };

  /**
   * Handles mouse movement during panel drag
   * @param {MouseEvent} e - Mouse move event
   */
  const handleMouseMove = useCallback((e) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - dragOffset.x,
        y: e.clientY - dragOffset.y,
      });
    }
  }, [isDragging, dragOffset]);

  /**
   * Handles touch movement during panel drag
   * @param {TouchEvent} e - Touch move event
   */
  const handleTouchMove = useCallback((e) => {
    if (isDragging) {
      e.preventDefault(); // Prevent scrolling while dragging
      const touch = e.touches[0];
      setPosition({
        x: touch.clientX - dragOffset.x,
        y: touch.clientY - dragOffset.y,
      });
    }
  }, [isDragging, dragOffset]);

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDraggablePanel && isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchmove', handleTouchMove, { passive: false });
      window.addEventListener('touchend', handleMouseUp);
    } else {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleTouchMove, isDraggablePanel]);

  /**
   * Handles swapping of left and right children
   * @param {Event} e - Click event
   */
  const handleSwap = useCallback(async (e) => {
    e.stopPropagation();
    await swapChildren(node);
  }, [swapChildren, node]);

  /**
   * Handles addition of permutation node
   * @param {Event} e - Click event
   */
  const handleAddPermutation = useCallback(async (e) => {
    e.stopPropagation();
    await addPermutationNode(node);
    onClose();
  }, [addPermutationNode, node, onClose]);

  /**
   * Handles removal of permutation node
   * @param {Event} e - Click event
   */
  const handleRemovePermutation = useCallback(async (e) => {
    e.stopPropagation();
    await removePermutationNode(node);
    onClose(); // Close panel after removing
  }, [removePermutationNode, node, onClose]);

  /**
   * Handles changes in indices for nodes
   * @param {string} nodeId - ID of the node being modified
   * @param {Array} newIndices - New indices to be set
   */
  const handleIndicesChange = useCallback((nodeId, newIndices) => {
    if (!setConnectedNodes) return;

    const updatedConnectedNodes = {
      ...connectedNodes,
      id: node.id,
      value: nodeId === 'root' ? newIndices : connectedNodes.value,
      left: nodeId === 'left'
        ? { ...connectedNodes.left, value: newIndices }
        : connectedNodes.left,
      right: nodeId === 'right'
        ? { ...connectedNodes.right, value: newIndices }
        : connectedNodes.right
    };

    setConnectedNodes(prevState => ({
      ...prevState,
      connectedNodes: updatedConnectedNodes
    }));

    if (recalculateTreeAndOperations) {
      recalculateTreeAndOperations(updatedConnectedNodes);
    }
  }, [connectedNodes, setConnectedNodes, recalculateTreeAndOperations, node.id]);

  // Dynamic panel style for draggable panels
  const panelDragStyle = isDraggablePanel ? {
    transform: `translate(${position.x}px, ${position.y}px)`,
    position: 'relative',
    cursor: isDragging ? 'grabbing' : 'grab',
    transition: isDragging ? 'none' : 'transform 0.2s ease, box-shadow 0.2s ease'
  } : {};

  return (
    <div
      ref={panelRef}
      className={`
        bg-white/95 backdrop-blur-md rounded-lg shadow-lg 
        border border-gray-200 overflow-hidden flex flex-col
        select-none w-full max-w-[95vw]
        ${isDragging ? 'shadow-xl' : ''} 
        ${className}`}
      style={{
        width: `${dimensions.panelWidth}px`,
        fontSize: `${dimensions.fontSize}px`,
        padding: `${dimensions.padding}px`,
        ...panelDragStyle
      }}
      onMouseDown={handleMouseDown}
      onTouchStart={handleMouseDown}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div className="flex items-center justify-between mb-1 pb-2 border-b border-gray-100">
        <h3 className="text-xl font-semibold text-gray-800">Contraction Info</h3>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 font-medium">
              {showSizes ? "Sizes" : "Indices"}
            </span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={showSizes}
                onChange={onToggleSizes}
              />
              <div className="w-9 h-5 bg-gray-200 rounded-full peer                               
                              after:content-[''] after:absolute after:top-0.5 after:left-0.5 
                              after:bg-white after:rounded-full after:h-4 after:w-4 
                              after:transition-all peer-checked:after:translate-x-4"></div>
            </label>
          </div>

          <button
            className="rounded-full p-1.5 text-gray-500 hover:bg-gray-100 
                      hover:text-gray-700 transition-colors focus:outline-none 
                      focus:ring-2 focus:ring-gray-300"
            data-close-button="true"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onClose();
            }}
            onTouchEnd={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onClose();
            }}
          >
            <TbX size={20} />
          </button>
        </div>
      </div>

      {/* Flow tree visualization */}
      <div className="flex items-start justify-center relative overflow-hidden">
        <div className="flex flex-col justify-start items-center mt-2">
          <SimpleTensorTree
            key={`${connectedNodes.value}-${connectedNodes.left?.value}-${connectedNodes.right?.value}`}
            node={connectedNodes.value}
            left={connectedNodes.left?.value}
            right={connectedNodes.right?.value}
            dimTypes={dimTypes}
            onIndicesChange={handleIndicesChange}
            isDragging={isDragging}
          />
        </div>
      </div>

      <div className="flex flex-wrap justify-center w-full gap-2">
        {node.data.left && node.data.right && (
          <button
            className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 
                          hover:bg-gray-100 text-gray-700 rounded-md 
                          transition-all shadow-sm border border-gray-200
                          hover:shadow focus:outline-none focus:ring-2 focus:ring-gray-300"
            onClick={handleSwap}
            title="Swap Left and Right Children"
          >
            <TbArrowsExchange size={dimensions.fontSize} />
            <span className="text-sm font-medium">Swap</span>
          </button>
        )}

        {!node.data.deleteAble && (
          <button
            className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 
                          hover:bg-gray-100 text-gray-700 rounded-md 
                          transition-all shadow-sm border border-gray-200
                          hover:shadow focus:outline-none focus:ring-2 focus:ring-gray-300"
            onClick={handleAddPermutation}
            title="Add Permutation Node"
          >
            <TbArrowsShuffle size={dimensions.fontSize} />
            <span className="text-sm font-medium">Add Permutation</span>
          </button>
        )}

        {node.data.deleteAble && (
          <button
            className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 
                          hover:bg-gray-100 text-gray-700 rounded-md 
                          transition-all shadow-sm border border-gray-200
                          hover:shadow focus:outline-none focus:ring-2 focus:ring-gray-300"
            onClick={handleRemovePermutation}
            title="Remove Permutation Node"
          >
            <TbArrowsShuffle size={dimensions.fontSize} />
            <span className="text-sm font-medium">Remove Permutation</span>
          </button>
        )}
      </div>

      {!isEmptyDimTypes && (
        <div className="w-full overflow-x-auto mt-2">
          <table className="w-full border-collapse rounded-lg overflow-hidden shadow-sm">
            <thead>
              <tr className="bg-gray-50">
                <th className="py-2 px-4 text-left font-semibold text-gray-700 border-b border-gray-200">Type</th>
                <th className="py-2 px-4 text-center font-semibold text-gray-700 border-b border-gray-200">
                  <div className="flex flex-col items-center">
                    <span>Primitive</span>
                    <span className={`text-xs text-gray-500 h-3 leading-3 ${showSizes ? 'opacity-100' : 'opacity-0'}`}>
                      (sizes)
                    </span>
                  </div>
                </th>
                <th className="py-2 px-4 text-center font-semibold text-gray-700 border-b border-gray-200">
                  <div className="flex flex-col items-center">
                    <span>Loop</span>
                    <span className={`text-xs text-gray-500 h-3 leading-3 ${showSizes ? 'opacity-100' : 'opacity-0'}`}>
                      (sizes)
                    </span>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {['C', 'M', 'N', 'K'].map((type, index) => {
                const primitiveKey = `${type.toLowerCase()}b`;
                const loopKey = `b${type.toLowerCase()}`;
                const primitiveData = dimTypes.primitive[primitiveKey] || [];
                const loopData = dimTypes.loop[loopKey] || [];

                // Map CMNK types to their colors
                const typeColors = {
                  'C': 'text-[#62c8d3]',
                  'M': 'text-[#007191]',
                  'N': 'text-[#d31f11]',
                  'K': 'text-[#b2df8a]'
                };

                return (
                  <tr key={type} className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                    <td className="py-2 px-3 border-b border-gray-100">
                      <span className={`font-bold text-l ${typeColors[type]}`}>{type}</span>
                    </td>
                    <td className="border-gray-100 text-center relative">
                      <div className="relative w-full h-full flex items-center justify-center min-h-[2rem]">
                        <div
                          className={`absolute inset-0 flex items-center justify-center transition-all duration-300 ${showSizes ? 'opacity-0 transform -translate-y-2' : 'opacity-100 transform translate-y-0'
                            }`}
                        >
                          <span className="text-gray-700">{primitiveData.join(', ') || '-'}</span>
                        </div>
                        <div
                          className={`absolute inset-0 flex items-center justify-center transition-all duration-300 ${showSizes ? 'opacity-100 transform translate-y-0' : 'opacity-0 transform translate-y-2'
                            }`}
                        >
                          <span className="text-gray-700">{calculateSize(primitiveData)}</span>
                        </div>
                      </div>
                    </td>
                    <td className="border-gray-100 text-center relative">
                      <div className="relative w-full h-full flex items-center justify-center min-h-[2rem]">
                        <div
                          className={`absolute inset-0 flex items-center justify-center transition-all duration-300 ${showSizes ? 'opacity-0 transform -translate-y-2' : 'opacity-100 transform translate-y-0'
                            }`}
                        >
                          <span className="text-gray-700">{loopData.join(', ') || '-'}</span>
                        </div>
                        <div
                          className={`absolute inset-0 flex items-center justify-center transition-all duration-300 ${showSizes ? 'opacity-100 transform translate-y-0' : 'opacity-0 transform translate-y-2'
                            }`}
                        >
                          <span className="text-gray-700">{calculateSize(loopData)}</span>
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

/**
 * Memoized InfoPanel component with custom comparison function
 * Prevents unnecessary re-renders by comparing relevant props
 */
export default React.memo(InfoPanel, (prevProps, nextProps) =>
  isEqual(prevProps.connectedNodes, nextProps.connectedNodes) &&
  isEqual(prevProps.indexSizes, nextProps.indexSizes) &&
  prevProps.showSizes === nextProps.showSizes &&
  prevProps.onToggleSizes === nextProps.onToggleSizes &&
  isEqual(prevProps.node, nextProps.node) &&
  prevProps.swapChildren === nextProps.swapChildren &&
  prevProps.addPermutationNode === nextProps.addPermutationNode &&
  prevProps.removePermutationNode === nextProps.removePermutationNode &&
  prevProps.setConnectedNodes === nextProps.setConnectedNodes
);