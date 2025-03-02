/**
 * Core React and ReactFlow Imports
 */
import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import ReactFlow, { Background, Controls, Handle, Position, ControlButton, Panel } from 'reactflow';

import { createPortal } from 'react-dom';
import 'reactflow/dist/style.css';
// Add custom styles to override ReactFlow controls styling
import '../styles/FlowStyles.css';

/**
 * Component Imports
 */
import InfoPanel from './InfoPanel.jsx';
import { Toast } from '../common/Toast.jsx';

/**
 * Icon Imports
 */
import {
  TbLayoutDistributeHorizontal,
  TbEyeCancel,
  TbEyeCheck,
  TbPercentage,
  TbHighlight,
  TbCheck,
  TbBox
} from "react-icons/tb";

/**
 * Utility Imports
 */
import { LayoutOptionType } from '../utils/constants.jsx';
import { createShareableUrl } from '../utils/compression.jsx';
import { scaleLinear } from 'd3-scale';
import { formatNumber } from '../utils/formatting.jsx';

/* ====================== Utility Functions ====================== */

/**
 * Generates a color based on a percentage value using d3 scale
 * @param {number} percentage - Value between 0 and 100
 * @returns {string} Color in hex format
 */
const getColorForPercentage = (percentage) => {
  const colorScale = scaleLinear()
    .domain([0, 100])
    .range(['#add8e6', '#00008b']);
  return colorScale(percentage);
};

/* ====================== Node Component ====================== */

/**
 * Custom node component for the flow diagram
 */
const NODE_TYPES = {
  custom: React.memo(({ data }) => {
    const displayData = useMemo(() => {
      const fullLabel = Array.isArray(data.label) ? data.label.join(',') : data.label;
      const maxLength = 14;
      const displayLabel = fullLabel.length <= maxLength ?
        fullLabel :
        '...' + fullLabel.slice(-(maxLength - 2));

      const minWidth = 80;
      const maxWidth = 130;
      const textWidth = displayLabel.length * 8;
      const nodeWidth = Math.min(Math.max(textWidth, minWidth), maxWidth) + 8;
      let percentage = null;
      if (data.showOperations) {
        if (data.metricType === 'operations' && data.operationsPercentage !== null) {
          percentage = `${formatNumber(data.operationsPercentage)}%`;
        } else if (data.metricType === 'tensorSize' && data.sizePercentage !== null) {
          percentage = `${formatNumber(data.sizePercentage)}%`;
        }
      }

      return { displayLabel, nodeWidth, percentage };
    }, [data.label, data.showOperations, data.operationsPercentage, data.sizePercentage, data.metricType]);

    const isHighlighted = data.isHighlighted;
    const isSearchResult = data.isSearchResult;

    const getNodeStyle = () => {
      if (data.isFaulty) {
        return {
          background: '#fff',
          border: '2px solid red'
        };
      } else if (isSearchResult) {
        return {
          background: '#fff3cd',
          border: `1px solid #ffc107`
        };
      } else if (isHighlighted) {
        return {
          background: '#e3f2fd',
          border: `1px solid #2196f3`
        };
      }
      return {
        background: '#fff',
        border: '1px solid #777'
      };
    };

    const nodeStyle = getNodeStyle();

    return (
      <div style={{
        ...nodeStyle,
        opacity: (isHighlighted || isSearchResult) ? 1 : 0.7,
        borderRadius: '8px',
        width: `${displayData.nodeWidth}px`,
        height: displayData.percentage ? '60px' : '40px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        fontSize: '14px',
        cursor: 'pointer',
        padding: '0 10px',
        transition: 'all 0.2s ease-in-out'
      }}>
        <div style={{
          overflow: 'hidden',
          whiteSpace: 'nowrap',
          textOverflow: 'ellipsis',
          width: '100%',
          textAlign: 'center'
        }}>
          {displayData.displayLabel}
        </div>
        {displayData.percentage && (
          <div style={{
            fontSize: '12px',
            color: '#666',
            marginTop: '2px'
          }}>
            {displayData.percentage}
          </div>
        )}
        <Handle
          type="target"
          position={Position.Top}
          style={{ visibility: 'hidden' }}
        />
        <Handle
          type="source"
          position={Position.Bottom}
          style={{ visibility: 'hidden' }}
        />
      </div>
    );
  })
};

/* ====================== Flow Component Types ====================== */

/**
 * @typedef {Object} FlowProps
 * @property {Object[]} nodes - Array of node objects to render
 * @property {Object[]} edges - Array of edge objects to connect nodes
 * @property {Function} onNodesChange - Callback for node changes
 * @property {Function} onEdgesChange - Callback for edge changes
 * @property {Function} onConnect - Callback when nodes are connected
 * @property {Function} onNodeClick - External node click handler
 * @property {Object} tree - Tree data structure with getRoot method
 * @property {Object} indexSizes - Map of index sizes
 * @property {Function} handleOptionClick - Layout option change handler
 * @property {Function} swapChildren - Function to swap node children
 * @property {Function} recalculateTreeAndOperations - Function to recalculate treeoperations
 * @property {Function} addPermutationNode - Function to add permutation node
 * @property {Function} removePermutationNode - Function to remove permutation node
 */

/* ====================== Flow Component ====================== */

/**
 * Main Flow component for rendering and managing the flow diagram
 * @param {FlowProps} props - Component properties
 */
const Flow = ({
  nodes = [],
  edges = [],
  onNodesChange = () => { },
  onEdgesChange = () => { },
  onConnect = () => { },
  onNodeClick: propOnNodeClick,
  tree = { getRoot: () => null },
  indexSizes = {},
  handleOptionClick = () => { },
  swapChildren = () => { },
  recalculateTreeAndOperations,
  addPermutationNode,
  removePermutationNode
}) => {
  /* === State Management === */

  /**
   * UI state controlling visual aspects of the flow
   * @type {Object}
   * @property {Object|null} hoveredNode - Currently hovered node
   * @property {Object|null} selectedNode - Currently selected node
   * @property {boolean} showPanel - Controls panel visibility
   * @property {boolean} showOperations - Controls operation percentage visibility
   * @property {boolean} showSizes - Controls sizes visibility
   * @property {boolean} hoverEnabled - Controls hover functionality
   * @property {boolean} highlightMode - Controls highlight mode
   */
  const [uiState, setUiState] = useState({
    hoveredNode: null,
    selectedNode: null,
    showPanel: false,
    showOperations: false,
    showSizes: false,
    hoverEnabled: false,
    highlightMode: false,
    metricType: 'operations'
  });

  /**
   * Search and highlight state
   * @type {Object}
   * @property {string} searchIndices - Current search query
   * @property {Set} searchedNodes - Set of nodes matching search
   * @property {Set} highlightedNodes - Set of highlighted nodes
   */
  const [searchState, setSearchState] = useState({
    searchIndices: '',
    searchedNodes: new Set(),
    highlightedNodes: new Set()
  });

  /**
   * Tree state for managing node connections and panel positioning
   * @type {Object}
   */
  const [treeState, setTreeState] = useState({
    connectedNodes: { value: [], left: null, right: null },
    panelPosition: { x: 0, y: 0 },
    lastSelectedNodeId: null // Add this to track last selected node
  });

  // Add state to track if panel is visible
  const [isPanelVisible, setPanelVisible] = useState(false);

  /* === Refs === */
  const refs = {
    flow: useRef(null),
    timeout: useRef(null),
    panel: useRef(null)
  };


  /* === Memoized Values === */

  /**
   * Augments nodes and edges with visual properties for rendering
   * @returns {Object} Object containing augmented nodes and edges
   */
  const { augmentedNodes, augmentedEdges } = useMemo(() => {
    if (!nodes.length) return { augmentedNodes: nodes, augmentedEdges: edges };

    const modifiedNodes = nodes.map(node => ({
      ...node,
      data: {
        ...node.data,
        showOperations: uiState.showOperations,
        metricType: uiState.metricType,
        operationsPercentage: node.data?.operationsPercentage ?? null,
        isHighlighted: searchState.highlightedNodes.has(node.id),
        isSearchResult: searchState.searchedNodes.has(node.id)
      }
    }));

    const modifiedEdges = edges.map(edge => {
      const defaultEdgeStyle = {
        ...edge,
        style: {
          stroke: '#b1b1b7',
          strokeWidth: 2
        }
      };

      const sourceNode = nodes.find(n => n.id === edge.source);
      if (sourceNode?.data) {
        const percentage = uiState.metricType === 'operations' ?
          sourceNode.data.normalizedPercentage :
          sourceNode.data.normalizedSizePercentage;
        return {
          ...defaultEdgeStyle,
          style: {
            stroke: getColorForPercentage(percentage),
            strokeWidth: 2
          },
          labelStyle: { fill: '#666', fontSize: '10px' },
          labelBgStyle: { fill: 'rgba(255, 255, 255, 0.8)' }
        };
      }

      return defaultEdgeStyle;
    });

    return {
      augmentedNodes: modifiedNodes,
      augmentedEdges: modifiedEdges
    };
  }, [nodes, edges, uiState.showOperations, searchState.highlightedNodes, searchState.searchedNodes, uiState.metricType]);

  /* === Tree Operations === */

  /**
   * Recursively finds connected nodes in the tree structure
   * @param {Object} lookUpNode - Node to start search from
   * @param {Object} node - Target node to find
   * @returns {Object|null} Connected node data or null if not found
   */
  const findConnectedNodes = useCallback((lookUpNode, node) => {
    if (!lookUpNode) return null;
    if (lookUpNode.id === node.id) {
      return {
        value: lookUpNode.value,
        ...{ left: lookUpNode.left },
        ...{ right: lookUpNode.right }
      };
    }
    const leftSearch = findConnectedNodes(lookUpNode.left, node);
    if (leftSearch) return leftSearch;

    return findConnectedNodes(lookUpNode.right, node);
  }, []);

  /**
   * Handles node highlighting and manages highlight state
   * @param {Object} node - Node to highlight/unhighlight
   */
  const onHighlightNode = useCallback((node) => {
    const getDescendants = (nodeId) => {
      const descendants = new Set();
      const stack = [nodeId];

      while (stack.length > 0) {
        const current = stack.pop();
        descendants.add(current);
        const childEdges = augmentedEdges.filter(e => e.source === current);
        childEdges.forEach(edge => {
          stack.push(edge.target);
        });
      }
      return descendants;
    };

    const getParents = (nodeId) => {
      const parents = new Set();
      const parentEdges = augmentedEdges.filter(e => e.target === nodeId);
      parentEdges.forEach(edge => parents.add(edge.source));
      return parents;
    };

    const isChildOfHighlighted = (nodeId) => {
      const parents = getParents(nodeId);
      return Array.from(parents).some(parentId => searchState.highlightedNodes.has(parentId));
    };

    if (searchState.highlightedNodes.has(node.id)) {
      const descendantsToRemove = getDescendants(node.id);
      const newHighlightedNodes = new Set(searchState.highlightedNodes);
      descendantsToRemove.forEach(id => newHighlightedNodes.delete(id));
      setSearchState(prevState => ({ ...prevState, highlightedNodes: newHighlightedNodes }));
    } else if (isChildOfHighlighted(node.id)) {
      const newHighlightedNodes = new Set(searchState.highlightedNodes);
      const descendants = getDescendants(node.id);
      descendants.forEach(id => newHighlightedNodes.add(id));
      setSearchState(prevState => ({ ...prevState, highlightedNodes: newHighlightedNodes }));
    } else {
      setSearchState(prevState => ({ ...prevState, highlightedNodes: getDescendants(node.id) }));
    }
  }, [searchState.highlightedNodes, augmentedEdges]);

  /* === Event Handlers === */

  /**
   * Handles search functionality for nodes
   * @param {string} searchValue - Search input value
   */
  const handleSearch = useCallback((searchValue) => {
    const trimmedValue = searchValue.replace(/\s/g, '');
    setSearchState(prevState => ({ ...prevState, searchIndices: trimmedValue }));

    if (!trimmedValue) {
      setSearchState(prevState => ({ ...prevState, searchedNodes: new Set() }));
      return;
    }

    const searchedIndices = trimmedValue.split(',').filter(Boolean);

    const getAllNodesWithIndices = () => {
      const nodesWithIndices = new Set();
      nodes.forEach(node => {
        if (node.data.label) {
          const containsAllIndices = searchedIndices.every(searchIdx =>
            node.data.label.includes(searchIdx));
          if (containsAllIndices) {
            nodesWithIndices.add(node.id);
          }
        }
      });
      return nodesWithIndices;
    };

    setSearchState(prevState => ({ ...prevState, searchedNodes: getAllNodesWithIndices() }));
  }, [nodes]);

  /**
   * Handles node click events and mode switching
   * @param {Event} event - Click event
   * @param {Object} node - Clicked node
   */
  const handleNodeClick = useCallback((event, node) => {
    if (uiState.highlightMode) {
      event.preventDefault();
      onHighlightNode(node);
    } else {
      const connectedNodes = findConnectedNodes(tree.getRoot(), node);

      // Set panel to visible when node is clicked
      setPanelVisible(true);

      setUiState(prevState => ({
        ...prevState,
        selectedNode: node,
        // Clear hovered node to prevent state conflicts
        hoveredNode: null
      }));

      setTreeState(prevState => ({
        ...prevState,
        connectedNodes,
        lastSelectedNodeId: node.id // Track which node was selected
      }));

      if (propOnNodeClick) {
        propOnNodeClick(event, node);
      }
    }
  }, [uiState.highlightMode, propOnNodeClick, findConnectedNodes, tree, onHighlightNode]);

  /**
   * Handles node mouse enter events
   * @param {Event} event - Mouse enter event
   * @param {Object} node - Hovered node
   */
  const handleNodeMouseEnter = useCallback((event, node) => {
    if (!uiState.hoverEnabled) return;
    if (uiState.selectedNode) return;

    clearTimeout(refs.timeout.current);
    const connectedNodes = findConnectedNodes(tree.getRoot(), node);
    setPanelVisible(true);

    setUiState(prevState => ({ ...prevState, hoveredNode: node }));
    setTreeState(prevState => ({ ...prevState, connectedNodes }));
  }, [findConnectedNodes, tree, uiState.hoverEnabled, uiState.selectedNode, refs.timeout]);

  /**
   * Handles node mouse leave events
   */
  const handleNodeMouseLeave = useCallback(() => {
    refs.timeout.current = setTimeout(() => {
      if (!uiState.selectedNode) {
        setPanelVisible(false);
        setUiState(prevState => ({ ...prevState, hoveredNode: null }));
        setTreeState(prevState => ({ ...prevState, connectedNodes: [] }));
      }
    }, 100);
  }, [uiState.selectedNode, refs.timeout]);

  /**
   * Toggles the visibility of operation percentages
   */
  const toggleOperations = useCallback(() => {
    setUiState(prevState => ({
      ...prevState,
      showOperations: !prevState.showOperations
    }));
  }, []);

  /**
   * Toggles the hover behavior
   */
  const toggleHoverBehavior = useCallback(() => {
    setUiState(prevState => {
      const newHoverEnabled = !prevState.hoverEnabled;
      if (!newHoverEnabled) {
        return {
          ...prevState,
          hoverEnabled: false,
          hoveredNode: null
        };
      }

      return { ...prevState, hoverEnabled: true };
    });

    if (!uiState.hoverEnabled && !uiState.selectedNode) {
      setTreeState(prevState => ({ ...prevState, connectedNodes: [] }));
    }
  }, [uiState.selectedNode]);

  /**
   * Toggles the highlight mode
   */
  const toggleHighlightMode = useCallback(() => {
    setUiState(prevState => ({ ...prevState, highlightMode: !prevState.highlightMode }));
    if (uiState.highlightMode) {
      setSearchState(prevState => ({ ...prevState, highlightedNodes: new Set() }));
    }
  }, [uiState.highlightMode]);

  /**
   * Handles the creation of a shareable URL from highlighted nodes
   */
  const handleCreateHighlightShare = useCallback(() => {
    if (searchState.highlightedNodes.size === 0) {
      Toast.show("No nodes selected");
      return;
    }

    const hasDisconnectedNodes = (node) => {
      if (!node) return false;

      if (node.left && node.right) {
        const isNodeHighlighted = searchState.highlightedNodes.has(node.id);
        const isLeftHighlighted = searchState.highlightedNodes.has(node.left.id);
        const isRightHighlighted = searchState.highlightedNodes.has(node.right.id);

        if (isNodeHighlighted && isLeftHighlighted !== isRightHighlighted) {
          return true;
        }
      }

      return hasDisconnectedNodes(node.left) || hasDisconnectedNodes(node.right);
    };

    if (hasDisconnectedNodes(tree.getRoot())) {
      const shouldProceed = window.confirm(
        'Warning: You are creating a subtree that excludes necessary nodes. ' +
        'This might result in a disconnected or incomplete expression. Continue?'
      );
      if (!shouldProceed) return;
    }

    const relevantIndices = new Set();
    nodes.forEach(node => {
      if (searchState.highlightedNodes.has(node.id) && node.data.label) {
        node.data.label.forEach(idx => relevantIndices.add(idx));
      }
    });

    const filteredSizes = {};
    relevantIndices.forEach(idx => {
      if (indexSizes[idx] !== undefined) {
        filteredSizes[idx] = indexSizes[idx];
      }
    });

    const subtreeExpression = tree.createSubtreeExpression(Array.from(searchState.highlightedNodes));

    if (!subtreeExpression || Object.keys(filteredSizes).length === 0) {
      Toast.show('Failed to create share URL: Invalid data');
      return;
    }

    const url = createShareableUrl(subtreeExpression, filteredSizes);
    if (!url) {
      Toast.show('Failed to create share URL');
      return;
    }

    navigator.clipboard.writeText(url)
      .then(() => {
        Toast.show('Share URL copied to clipboard!');
        setUiState(prevState => ({ ...prevState, highlightMode: false }));
        setSearchState(prevState => ({ ...prevState, highlightedNodes: new Set() }));
      })
      .catch(err => {
        console.error('Failed to copy URL:', err);
        Toast.show('Failed to copy URL to clipboard');
      });
  }, [searchState.highlightedNodes, nodes, indexSizes, tree]);

  /**
   * Handles control button click events
   * @param {Event} event - Click event
   */
  const handleControlButtonClick = useCallback((event) => {
    const button = event.currentTarget;
    const rect = button.getBoundingClientRect();
    setTreeState(prevState => ({ ...prevState, panelPosition: { x: rect.right + 10, y: rect.top } }));
    setUiState(prevState => ({ ...prevState, showPanel: !prevState.showPanel }));
  }, []);

  /**
   * Handles mouse enter events on the panel
   */
  const handlePanelMouseEnter = useCallback(() => {
    clearTimeout(refs.timeout.current);
  }, [refs.timeout]);

  /**
   * Handles mouse leave events on the panel
   */
  const handlePanelMouseLeave = useCallback(() => {
    if (!uiState.selectedNode) {
      refs.timeout.current = setTimeout(() => {
        setUiState(prevState => ({ ...prevState, hoveredNode: null }));
        setTreeState(prevState => ({ ...prevState, connectedNodes: [] }));
      }, 100);
    }
  }, [uiState.selectedNode, refs.timeout]);

  /**
   * Handles swapping of children nodes
   * @param {Object} node - Node whose children are to be swapped
   */
  const handleSwapChildren = useCallback(async (node) => {
    const updatedTree = await swapChildren(node);

    if (updatedTree) {
      const updatedConnectedNodes = findConnectedNodes(updatedTree.getRoot(), node);

      setTreeState(prevState => ({ ...prevState, connectedNodes: updatedConnectedNodes }));
      setUiState(prevState => ({ ...prevState, selectedNode: node }));
    }
  }, [swapChildren, findConnectedNodes]);

  /**
   * Handle panel close more carefully, preserving state
   */
  const handlePanelClose = useCallback(() => {
    setPanelVisible(false);
    setUiState(prevState => ({
      ...prevState,
      hoveredNode: null,
      selectedNode: null
    }));
  }, []);

  /* === Effects === */

  /**
   * Handles click outside panel for panel dismissal
   */
  useEffect(() => {
    const handleClickOutside = (event) => {
      const isClickInsidePanel = refs.panel.current && refs.panel.current.contains(event.target);
      const isClickOnControlButton = event.target.closest('.react-flow__controls-button');

      if (uiState.showPanel && !isClickInsidePanel && !isClickOnControlButton) {
        setUiState(prevState => ({ ...prevState, showPanel: false }));
      }
    };

    document.addEventListener('pointerdown', handleClickOutside, true);

    return () => {
      document.removeEventListener('pointerdown', handleClickOutside, true);
    };
  }, [uiState.showPanel, indexSizes, refs.panel]);

  /**
   * Handles layout option click events
   * @param {string} option - Selected layout option
   */
  const handleOptionClickFlow = useCallback((option) => {
    setUiState(prevState => ({ ...prevState, showPanel: false }));
    handleOptionClick(option);
  }, [handleOptionClick]);

  /**
   * Toggles the visibility of sizes
   */
  const handleToggleSizes = useCallback(() => {
    setUiState(prevState => ({ ...prevState, showSizes: !prevState.showSizes }));
  }, []);

  const toggleMetricType = useCallback(() => {
    setUiState(prevState => {
      // If metrics are not currently shown, just show them without switching type
      if (!prevState.showOperations) {
        return {
          ...prevState,
          showOperations: true
        };
      }

      // If metrics are already shown, switch the type
      return {
        ...prevState,
        showOperations: true, // Ensure percentages remain visible
        metricType: prevState.metricType === 'operations' ? 'tensorSize' : 'operations'
      };
    });
  }, []);

  /* === Render === */
  // Modified to use isPanelVisible
  const activeNode = uiState.selectedNode || uiState.hoveredNode;

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <ReactFlow
        ref={refs.flow}
        nodes={augmentedNodes}
        edges={augmentedEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={NODE_TYPES}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.1}
        maxZoom={4}
        style={{ width: '100%', height: '100%' }}
        onNodeClick={handleNodeClick}
        onNodeMouseEnter={handleNodeMouseEnter}
        onNodeMouseLeave={handleNodeMouseLeave}
        nodesDraggable={true}
        proOptions={{ hideAttribution: true }}
      >
        <Controls>
          <ControlButton
            onClick={handleControlButtonClick}
            title="change layout"
          >
            <TbLayoutDistributeHorizontal />
          </ControlButton>
          <ControlButton
            onClick={toggleHoverBehavior}
            className={`hover - toggle ${uiState.hoverEnabled ? 'active' : ''} `}
            title={uiState.hoverEnabled ? 'disable Hover' : 'enable Hover'}
          >
            {uiState.hoverEnabled ? <TbEyeCheck /> : <TbEyeCancel />}
          </ControlButton>
          <div className="flex items-center">
            <ControlButton
              onClick={toggleMetricType}
              className={`metric-toggle ${uiState.metricType === 'tensorSize' ? 'active' : ''}`}
              title={`show ${uiState.metricType === 'tensorSize' ? 'operation' : 'memory'} percentages`}
            >
              {uiState.metricType === 'tensorSize' ? <TbBox /> : <TbPercentage />}
            </ControlButton>
            {uiState.showOperations && (
              <ControlButton
                onClick={toggleOperations}
                className={`operations-toggle ${uiState.showOperations ? 'active' : ''}`}
                title={uiState.showOperations ? 'hide percentages' : 'show percentages'}
              >
                {uiState.showOperations ? <TbEyeCheck /> : <TbEyeCancel />}
              </ControlButton>
            )}
          </div>
          <div className="flex items-center">
            <ControlButton
              onClick={toggleHighlightMode}
              className={`highlight-mode ${uiState.highlightMode ? 'active' : ''}`}
              title={uiState.highlightMode ? 'exit highlight mode' : 'enter highlight mode'}
            >
              <TbHighlight />
            </ControlButton>
            {uiState.highlightMode && (
              <ControlButton
                onClick={handleCreateHighlightShare}
                title="create share URL from highlighted nodes"
              >
                <TbCheck />
              </ControlButton>

            )}
          </div>

        </Controls>
        <Background variant="dots" gap={12} size={1} />
        {!uiState.highlightMode && isPanelVisible && activeNode && (
          <Panel position="top-left">
            <div
              onMouseEnter={handlePanelMouseEnter}
              onMouseLeave={handlePanelMouseLeave}
            >
              <InfoPanel
                // Use a composite key that includes the lastSelectedNodeId to prevent unmounting
                key={`infopanel-${treeState.lastSelectedNodeId || activeNode.id}`}
                node={activeNode}
                connectedNodes={treeState.connectedNodes}
                setConnectedNodes={setTreeState}
                onClose={handlePanelClose}
                initialPosition={{ x: 12, y: 8 }}
                indexSizes={indexSizes}
                showSizes={uiState.showSizes}
                onToggleSizes={handleToggleSizes}
                swapChildren={handleSwapChildren}
                recalculateTreeAndOperations={recalculateTreeAndOperations}
                addPermutationNode={addPermutationNode}
                removePermutationNode={removePermutationNode}
                isDraggablePanel={true}
              />
            </div>
          </Panel>
        )}
        {uiState.showPanel && createPortal(
          <div
            ref={refs.panel}
            className="fixed bg-white border border-gray-200 p-3 w-48 shadow-md rounded-md z-50 text-sm"
            style={{
              left: treeState.panelPosition.x,
              top: treeState.panelPosition.y
            }}
          >
            <h3 className="text-base font-medium mb-1">Choose a layout:</h3>
            {Object.values(LayoutOptionType).map(option => (
              <div
                key={option}
                className="cursor-pointer hover:bg-gray-100 rounded p-1.5 text-sm"
                onClick={() => {
                  handleOptionClickFlow(option);
                }}
              >
                {`${option} `}
              </div>
            ))}
          </div>,
          document.body
        )}
        <Panel position="bottom-right" className="bg-white shadow-md rounded-md p-2">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={searchState.searchIndices}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search indices (e.g. 1,2,3)"
              className="p-1 border border-gray-300 rounded text-sm w-48"
            />
            {searchState.searchIndices && (
              <button
                onClick={() => handleSearch('')}
                className="text-gray-500 hover:text-gray-700"
              >
                ×
              </button>
            )}
          </div>
        </Panel>
      </ReactFlow>
    </div >
  );
};

export default Flow;