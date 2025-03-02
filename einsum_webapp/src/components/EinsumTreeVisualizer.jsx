// React and core imports
import React, { useState, useCallback, useRef, useEffect } from 'react';

// Third-party component imports
import { Panel, PanelGroup } from 'react-resizable-panels';
import {
  ReactFlowProvider,
  addEdge,
  useNodesState,
  useEdgesState
} from 'reactflow';
import 'reactflow/dist/style.css';

// Local component imports
import { Tree } from './utils/einsumContractionTree.jsx';
import Flow from './visual/Flow.jsx';
import HistoryPanel from './visual/HistoryPanel.jsx';
import IndexSizeInput from './visual/IndexSizeInput.jsx';
import CollapsiblePanel from './common/CollapsiblePanel.jsx';
import CustomPanelResizeHandle from './common/CustomPanelResizeHandle.jsx';
import { Toast } from './common/Toast.jsx';

// Utility imports
import buildVisualizationTree from './utils/layout.jsx';
import { LayoutOptionType } from './utils/constants.jsx';
import { calculateNodeMetrics } from './utils/metricCalculation.jsx';
import { createShareableUrl } from './utils/compression.jsx';
import { formatNumber } from './utils/formatting.jsx';
import { useContainerDimensions } from './common/useContainerDimensions.jsx';

// Constants
const DEFAULT_DATA_TYPE = '4';
const DEFAULT_SIZE_UNIT = 'KiB';
const DEFAULT_EXPRESSION = "[[[8,0,9,4],[[2,8,6,9]->[8,2,6,9]]->[0,8,2,6,4]]->[6,2,0,4,8]],[[[3,7],[[[3,2,1,0]->[2,0,1,3]],[[1,5]->[5,1]]->[2,0,5,3]]->[2,0,5,7]]->[7,5,2,0]]->[7,6,5,4,8]";

/**
 * Main component for visualizing Einsum contraction trees
 * @param {Object} props - Component props
 * @param {string} props.initialExpression - Initial einsum expression
 * @param {Object} props.initialSizes - Initial index sizes
 */
const EinsumTreeVisualizer = ({ initialExpression, initialSizes }) => {
  const containerRef = useRef(null);
  const { width } = useContainerDimensions(containerRef);
  const getMinSizePercentage = useCallback((minPixels) => {
    try {
      // Add guards against invalid values
      if (!width || width <= 0 || !minPixels || minPixels <= 0) {
        return 20; // Safe default
      }

      const MIN_PERCENTAGE = 15;
      const MAX_PERCENTAGE = 85;

      const percentage = Math.ceil((minPixels / width) * 100);
      return Math.min(Math.max(percentage, MIN_PERCENTAGE), MAX_PERCENTAGE);
    } catch (error) {
      console.warn('Error calculating panel size:', error);
      return 20; // Fallback to safe default
    }
  }, [width]);

  // ============= State Management =============
  /**
   * ReactFlow State - Handles the visual graph representation
   */
  const [nodes1, setNodes1, onNodesChange1] = useNodesState();
  const [edges1, setEdges1, onEdgesChange1] = useEdgesState();
  const fitViewFunctions = useRef({ tree1: null });

  /**
   * Tree State - Manages the einsum tree data structure
   */
  const [tree, setTree] = useState(null);
  const [einsumExpression, setEinsumExpression] = useState('');
  const [selectedNode, setSelectedNode] = useState(null);
  const [indexSizes, setIndexSizes] = useState({});

  /**
   * UI State - Controls interface elements
   */
  const [history, setHistory] = useState([]);
  const [dataType, setDataType] = useState(DEFAULT_DATA_TYPE);
  const [sizeUnit, setSizeUnit] = useState(DEFAULT_SIZE_UNIT);
  const [layoutOption, setLayoutOption] = useState(LayoutOptionType.Tree);
  const [initStep, setInitStep] = useState(0);

  /**
   * Calculation State - Stores computation results
   */
  const [totalOperations, setTotalOperations] = useState(0);
  const [selectedNodeOperations, setSelectedNodeOperations] = useState(0);

  // ============= History Management =============
  /**
    * updating and deleting history
    */
  useEffect(() => {
    const savedHistory = localStorage.getItem('einsumHistory');
    if (savedHistory) {
      try {
        const parsedHistory = JSON.parse(savedHistory);
        if (Array.isArray(parsedHistory)) {
          setHistory(parsedHistory);
        }
      } catch (e) {
        console.warn('Failed to parse saved history, starting fresh');
        localStorage.removeItem('einsumHistory');
      }
    }
  }, []);

  const updateHistory = useCallback((newHistory) => {
    const historyToSave = typeof newHistory === 'function'
      ? newHistory(history)
      : newHistory;

    setHistory(historyToSave);
    try {
      const serializableHistory = historyToSave.map(item => ({
        expression: item.expression,
        nodes: item.nodes,
        edges: item.edges,
        indexSizes: item.indexSizes
        // Note: we don't save the tree instance as it's not serializable
      }));

      localStorage.setItem('einsumHistory', JSON.stringify(serializableHistory));
    } catch (e) {
      console.error('Failed to save history to local storage:', e);
    }
  }, [history]);

  const handleClearHistory = useCallback(() => {
    setHistory([]);
    localStorage.removeItem('einsumHistory');
  }, []);

  // ============= Core Tree Operations =============

  /**
   * Parses an einsum expression and initializes the tree
   * @param {string} einsumExpression - The expression to parse
   * @returns {Promise<Tree>} The initialized tree
   */
  const parseInput = useCallback(async (einsumExpression, providedIndexSizes = null) => {
    return new Promise((resolve) => {
      const input = einsumExpression || DEFAULT_EXPRESSION;
      const tree = new Tree(input);
      setEinsumExpression(einsumExpression);
      const unorderedTree = tree.getRoot();

      if (!unorderedTree) {
        resolve(null);
        return;
      }

      setTree(tree);

      let newIndexSizes = {};
      const traverseTree = (node) => {
        if (!node) return;
        if (node.value && Array.isArray(node.value)) {
          for (const indice of node.value) {
            // Use provided index sizes if available
            if (providedIndexSizes && providedIndexSizes.hasOwnProperty(indice)) {
              newIndexSizes[indice] = providedIndexSizes[indice];
            } else if (indexSizes && indexSizes.hasOwnProperty(indice)) {
              newIndexSizes[indice] = indexSizes[indice];
            } else if (!newIndexSizes.hasOwnProperty(indice)) {
              newIndexSizes[indice] = 2;
            }
          }
        }
        traverseTree(node.left);
        traverseTree(node.right);
      };

      traverseTree(unorderedTree);

      setIndexSizes(newIndexSizes);
      tree.updateIndexSizes(newIndexSizes);

      const { totalOperations, faultyNodes } = calculateNodeMetrics(newIndexSizes, unorderedTree, parseInt(dataType, 10));
      setTotalOperations(totalOperations);

      const { nodes, edges } = buildVisualizationTree(unorderedTree, faultyNodes, layoutOption);

      setNodes1(nodes);
      setEdges1(edges);

      setSelectedNode(null);
      setSelectedNodeOperations(null);

      // Update history
      updateHistory(prevHistory => {
        const newItem = {
          expression: input,
          nodes,
          edges,
          indexSizes: { ...newIndexSizes },
          tree: tree
        };
        const existingIndex = prevHistory.findIndex(item => item.expression === input);

        let updatedHistory;
        if (existingIndex !== -1) {
          updatedHistory = [
            newItem,
            ...prevHistory.slice(0, existingIndex),
            ...prevHistory.slice(existingIndex + 1)
          ];
        } else {
          updatedHistory = [newItem, ...prevHistory];
        }

        return updatedHistory.slice(0, 5);
      });

      setTimeout(() => {
        fitView('tree1');
        resolve(tree);
      }, 0);
    });
  }, [setNodes1, setEdges1, updateHistory, setTree, setTotalOperations, layoutOption, indexSizes, dataType]);

  /**
   * Updates tree structure and recalculates operations after changes
   * @param {Object} updatedConnectedNodes - New node connections
   */
  const recalculateTreeAndOperations = useCallback((updatedConnectedNodes) => {
    if (!tree) return;

    try {
      // Clone the tree and update indices
      const newTree = tree.clone();
      const wasUpdated = newTree.updateIndices(updatedConnectedNodes);

      if (!wasUpdated) {
        console.warn('Tree update failed');
        return;
      }

      // Important: Get the updated root after updateIndices
      const updatedRoot = newTree.getRoot();

      // Get updated tree representation using the new root
      const treeString = newTree.treeToString();
      setEinsumExpression(treeString);

      // Recalculate operations with the new root
      const { totalOperations: newTotalOps, faultyNodes } = calculateNodeMetrics(indexSizes, updatedRoot, parseInt(dataType, 10));
      setTotalOperations(newTotalOps);

      // Build visualization with the new root
      const { nodes, edges } = buildVisualizationTree(updatedRoot, faultyNodes, layoutOption);
      setNodes1(nodes);
      setEdges1(edges);

      // Update the tree state with the new tree
      setTree(newTree);

      // Update selected node if needed
      if (selectedNode) {
        const updatedSelectedNode = newTree.findNode(selectedNode.id);
        if (updatedSelectedNode) {
          selectedNode.data.label = updatedSelectedNode.value;
          setSelectedNode(selectedNode);
        }
      }

      // Update history with the new tree
      updateHistory(prevHistory => {
        const newItem = {
          expression: treeString,
          nodes,
          edges,
          indexSizes,
          tree: newTree
        };
        return [newItem, ...prevHistory.slice(0, 4)];
      });

    } catch (error) {
      console.error('Error updating tree:', error);
      Toast.show('Error updating indices');
    }
  }, [tree, indexSizes, layoutOption, setNodes1, setEdges1, selectedNode, updateHistory, dataType]);

  // ============= Tree Manipulation =============

  /**
   * Recursively searches for a node in the tree
   * @param {Object} treeNode - Current node being searched
   * @param {string} id - ID of the node to find
   * @returns {Object|null} Found node or null
   */
  const findNodeInTree = useCallback((treeNode, id) => {
    if (!treeNode) return null;
    if (treeNode.id === id) return treeNode;
    const leftResult = findNodeInTree(treeNode.left, id);
    if (leftResult) return leftResult;
    return findNodeInTree(treeNode.right, id);
  }, []);

  /**
   * Swaps the children of a specified node
   * @param {Object} nodeToSwap - Node whose children should be swapped
   * @returns {Promise<Tree>} Updated tree
   */
  const swapChildren = useCallback((nodeToSwap) => {
    return new Promise((resolve) => {
      if (!nodeToSwap || !nodeToSwap.data.left || !nodeToSwap.data.right || !tree) {
        resolve(null);
        return;
      }

      // Create a new tree instance using the clone method
      const newTree = tree.clone();

      // Swap children in the new tree
      newTree.swapChildren(nodeToSwap.id);

      // Update the tree state
      setTree(newTree);

      // Get updated tree representation
      const treeString = newTree.treeToString();
      setEinsumExpression(treeString);

      // Calculate new operations
      const { totalOperations: newTotalOps, faultyNodes } = calculateNodeMetrics(indexSizes, newTree.getRoot(), parseInt(dataType, 10));
      setTotalOperations(newTotalOps);

      // Rebuild visualization with new tree structure
      const { nodes, edges } = buildVisualizationTree(newTree.getRoot(), faultyNodes);

      // Update nodes and edges
      setNodes1(nodes);
      setEdges1(edges);

      // Update history
      updateHistory(prevHistory => {
        const newItem = { expression: treeString, nodes, edges, indexSizes: indexSizes, tree: newTree };
        const existingIndex = prevHistory.findIndex(item => item.expression === treeString);

        let updatedHistory;
        if (existingIndex !== -1) {
          updatedHistory = [
            newItem,
            ...prevHistory.slice(0, existingIndex),
            ...prevHistory.slice(existingIndex + 1)
          ];
        } else {
          updatedHistory = [newItem, ...prevHistory];
        }

        return updatedHistory.slice(0, 5);
      });


      // Resolve with the updated tree
      resolve(newTree);
    });
  }, [indexSizes, tree, setNodes1, setEdges1, updateHistory, setTree, setTotalOperations, dataType]);

  /**
   * Adds a permutation node to the tree
   * @param {Object} nodeToAddPerm - Node where permutation should be added
   * @returns {Promise<Tree>} Updated tree
   */
  const addPermutationNode = useCallback(async (nodeToAddPerm) => {
    return new Promise((resolve) => {
      if (!nodeToAddPerm || !tree) {
        resolve(null);
        return;
      }

      // Create a new tree instance using the clone method
      const newTree = tree.clone();

      // Add permutation node in the new tree
      newTree.addPermutationNode(nodeToAddPerm.id);

      // Update the tree state
      setTree(newTree);

      // Get updated tree representation
      const treeString = newTree.treeToString();
      setEinsumExpression(treeString);

      const { totalOperations: newTotalOps, faultyNodes } = calculateNodeMetrics(indexSizes, newTree.getRoot(), parseInt(dataType, 10));
      setTotalOperations(newTotalOps);

      // Rebuild visualization with new tree structure
      const { nodes, edges } = buildVisualizationTree(newTree.getRoot(), faultyNodes);

      // Update nodes and edges
      setNodes1(nodes);
      setEdges1(edges);

      // Update history
      updateHistory(prevHistory => {
        const newItem = { expression: treeString, nodes, edges, indexSizes: indexSizes, tree: newTree };
        return [newItem, ...prevHistory.slice(0, 4)];
      });

      // Resolve with the updated tree
      resolve(newTree);
    });
  }, [indexSizes, tree, setNodes1, setEdges1, updateHistory, setTree, setTotalOperations, dataType]);

  /**
   * Removes a permutation node from the tree
   * @param {Object} nodeToRemovePerm - Node to remove
   * @returns {Promise<Tree>} Updated tree
   */
  const removePermutationNode = useCallback(async (nodeToRemovePerm) => {
    return new Promise((resolve) => {
      if (!nodeToRemovePerm || !tree) {
        resolve(null);
        return;
      }

      // Create a new tree instance using the clone method
      const newTree = tree.clone();

      // Remove permutation node in the new tree
      newTree.removePermutationNode(nodeToRemovePerm.id);

      // Update the tree state
      setTree(newTree);

      // Get updated tree representation
      const treeString = newTree.treeToString();
      setEinsumExpression(treeString);

      const { totalOperations: newTotalOps, faultyNodes } = calculateNodeMetrics(indexSizes, newTree.getRoot(), parseInt(dataType, 10));
      setTotalOperations(newTotalOps);

      // Rebuild visualization with new tree structure
      const { nodes, edges } = buildVisualizationTree(newTree.getRoot(), faultyNodes);

      // Update nodes and edges
      setNodes1(nodes);
      setEdges1(edges);

      // Update history
      updateHistory(prevHistory => {
        const newItem = { expression: treeString, nodes, edges, indexSizes: indexSizes, tree: newTree };
        return [newItem, ...prevHistory.slice(0, 4)];
      });

      // Resolve with the updated tree
      resolve(newTree);
    });
  }, [indexSizes, tree, setNodes1, setEdges1, updateHistory, setTree, setTotalOperations, dataType]);

  // ============= Calculations =============

  /**
   * Calculates the size of tensors based on their indices
   * @param {Array} indices - Array of indices
   * @returns {number} Size in bytes
   */
  const tensorSizes = (indices) => {
    if (!Array.isArray(indices)) return 0;

    let size = dataType === '4' ? 4 : 8; // Base size in bytes

    indices.forEach(index => {
      if (indexSizes[index]) {
        size *= Math.max(1, Math.floor(indexSizes[index]));
      }
    });

    return size;
  };

  const calcByteAccess = (bytes) => {
    let size = dataType === '4' ? 4 : 8;
    return size * bytes;
  };

  /**
   * Calculates strides for given indices
   * @param {Array} indices - Array of indices
   * @returns {Array} Array of calculated strides
   */
  const calculateStrides = (indices) => {
    if (!Array.isArray(indices)) return [];

    let stride = 1;
    const strides = new Array(indices.length).fill(0);

    for (let i = indices.length - 1; i >= 0; i--) {
      strides[i] = stride;
      stride *= Math.max(1, Math.floor(indexSizes[indices[i]] || 1));
    }

    return strides;
  };

  /**
   * Recalculates operations after index size changes
   * @param {Object} indexSizes - Updated index sizes
   */
  const recalculateOperations = useCallback((indexSizes) => {
    setIndexSizes(indexSizes);
    tree.updateIndexSizes(indexSizes);

    const { totalOperations, faultyNodes } = calculateNodeMetrics(indexSizes, tree.getRoot(), parseInt(dataType, 10));
    setTotalOperations(totalOperations);

    const updatedNodes = nodes1.map(node => {
      const isFaulty = faultyNodes.some(faultyNode => faultyNode.id === node.id);
      if (node.data) {
        const nodeInTree = findNodeInTree(tree.getRoot(), node.id);
        if (nodeInTree) {
          const updatedNode = {
            ...node,
            data: {
              ...node.data,
              isFaulty: isFaulty,
              ...nodeInTree,
            }
          };

          // Update selected node if this is the selected one
          if (selectedNode && node.id === selectedNode.id) {
            setSelectedNode(updatedNode);
            setSelectedNodeOperations(updatedNode.data.operations || 0);
          }

          return updatedNode;
        }
      }
      return { ...node, data: { ...node.data, isFaulty: isFaulty } };
    });

    setNodes1(updatedNodes);

    // Update history by modifying the existing entry
    updateHistory(prevHistory => {
      const currentExpression = tree.treeToString();
      const existingIndex = prevHistory.findIndex(item => item.expression === currentExpression);

      if (existingIndex !== -1) {
        // Update existing entry
        const updatedHistory = [...prevHistory];
        updatedHistory[existingIndex] = {
          ...updatedHistory[existingIndex],
          indexSizes: indexSizes,
          nodes: updatedNodes,
          edges: edges1
        };
        return updatedHistory;
      }
      return prevHistory;
    });
  }, [nodes1, selectedNode, tree, setNodes1, edges1, findNodeInTree, updateHistory, dataType]);

  // ============= Event Handlers =============

  /**
   * Handles ReactFlow node connections
   */
  const onConnect1 = useCallback((params) =>
    setEdges1((eds) => addEdge(params, eds)), [setEdges1]);

  /**
   * Handles node selection in visualization
   */
  const onNodeClick = (_, node) => {
    setSelectedNode(node);
    if (node.data && node.data.left && node.data.right) {
      setSelectedNodeOperations(node.data.operations);
    } else {
      setSelectedNodeOperations(0);
    }
  };

  /**
   * Handles changes to the einsum expression input
   */
  const handleEinsumInputChange = (event) => {
    setEinsumExpression(event.target.value);
  };

  /**
   * Handles data type selection changes
   */
  const handleDataTypeChange = (event) => {
    setDataType(event.target.value);
  };

  /**
   * Handles size unit selection changes
   */
  const handleSizeUnitChange = (event) => {
    setSizeUnit(event.target.value);
  };

  /**
   * Handles layout option changes
   */
  const handleOptionClick = (option) => {
    // Validate that option is one of the defined layout types
    if (Object.values(LayoutOptionType).includes(option)) {
      console.log('Setting layout option:', option);
      setLayoutOption(option);
      if (!tree) return;

      const { faultyNodes } = calculateNodeMetrics(indexSizes, tree.getRoot(), parseInt(dataType, 10));
      const { nodes, edges } = buildVisualizationTree(tree.getRoot(), faultyNodes, option);

      setNodes1(nodes);
      setEdges1(edges);
      setTimeout(() => fitView('tree1'), 0);
    }
  };

  /**
   * Handles share button clicks
   */
  const handleShare = useCallback(() => {
    if (!einsumExpression || !indexSizes) {
      Toast.show("No einsum expression or index sizes to share");
      return;
    }

    const url = createShareableUrl(einsumExpression, indexSizes);
    if (!url) {
      Toast.show("Failed to create share URL");
      return;
    }

    navigator.clipboard.writeText(url)
      .then(() => Toast.show('Share URL copied to clipboard!'))
      .catch(err => {
        console.error('Failed to copy URL:', err);
        Toast.show('Failed to copy URL to clipboard');
      });
  }, [einsumExpression, indexSizes]);

  // ============= UI Helpers =============

  /**
   * Formats size values with appropriate units
   */
  const formatSize = (size) => {
    if (sizeUnit === 'MiB') {
      return `${formatNumber(Number((size / (1024 * 1024)).toFixed(2)))} MiB`;
    } else if (sizeUnit === 'KiB') {
      return `${formatNumber(Number((size / 1024).toFixed(2)))} KiB`;
    } else {
      return `${formatNumber(Number(size.toFixed(2)))} Bytes`;
    }
  };

  /**
   * Renders indices with their strides
   */
  const renderIndices = (indices) => {
    if (!Array.isArray(indices)) return null;

    const strides = calculateStrides(indices);

    return indices.map((index, i) => (
      <div key={i} className="flex  mr-4 ">
        <span className="text-xl mr-2">{index}</span>
        <span className="text-lg text-gray-600">
          = {strides[i] === 1 ? 'unit' : strides[i]}
        </span>
      </div>
    ));
  };

  /**
   * Centers the view on a specific tree
   */
  const fitView = (tree) => {
    fitViewFunctions.current[tree]?.();
  };

  /**
   * Loads a tree from history
   */
  const selectTreeFromHistory = (item) => {
    // First create a new tree instance from the expression
    const newTree = new Tree(item.expression);

    // Set all the states
    setNodes1(item.nodes);
    setEdges1(item.edges);
    setIndexSizes(item.indexSizes);
    setEinsumExpression(item.expression);
    setTree(newTree);

    // Update the tree with the stored index sizes
    newTree.updateIndexSizes(item.indexSizes);

    // Calculate operations for the new tree
    const { totalOperations: newTotalOps } = calculateNodeMetrics(item.indexSizes, newTree.getRoot(), parseInt(dataType, 10));
    setTotalOperations(newTotalOps);

    setTimeout(() => fitView('tree1'), 10);
  };

  // ============= Effects =============

  /**
   * Initializes the component with initial expression and sizes
   */
  useEffect(() => {
    const initialize = async () => {
      if (initStep === 0 && initialExpression && initialSizes) {
        setIndexSizes(initialSizes);
        setInitStep(1);
      } else if (initStep === 1) {
        setEinsumExpression(initialExpression);
        // Pass initialSizes to parseInput
        await parseInput(initialExpression, initialSizes);
        setInitStep(2);
      }
    };

    initialize();
  }, [initStep, initialExpression, initialSizes]);

  // ============= Render =============
  return (
    <div ref={containerRef} className="h-screen bg-gray-50 overflow-hidden">
      <PanelGroup direction="horizontal" className="h-full overflow-hidden">
        <Panel defaultSize={60} minSize={getMinSizePercentage(350)}>
          <div className="h-full border border-gray-200 overflow-hidden shadow-lg">
            <PanelGroup direction="vertical" className="h-full overflow-hidden">
              <Panel defaultSize={70} minSize={10}>
                <div className="h-full overflow-hidden">
                  <ReactFlowProvider>
                    <Flow
                      nodes={nodes1}
                      edges={edges1}
                      onNodesChange={onNodesChange1}
                      onEdgesChange={onEdgesChange1}
                      onConnect={onConnect1}
                      onNodeClick={onNodeClick}
                      tree={tree}
                      indexSizes={indexSizes}
                      totalOperations={totalOperations}
                      fitViewFunction={(fn) => (fitViewFunctions.current.tree1 = fn)}
                      handleOptionClick={handleOptionClick}
                      swapChildren={swapChildren}
                      recalculateTreeAndOperations={recalculateTreeAndOperations}
                      addPermutationNode={addPermutationNode}
                      removePermutationNode={removePermutationNode}
                    />
                  </ReactFlowProvider>
                </div>
              </Panel>
              <CustomPanelResizeHandle />
              <Panel minSize={10}>
                <div
                  className="p-4 bg-white shadow-lg h-full overflow-auto"
                  style={{ touchAction: 'pan-y', overscrollBehavior: 'contain' }}
                >
                  <div className="flex flex-col">
                    <div className="flex items-center mb-4">
                      <div className="mr-4 flex-1">
                        <h3 className="text-lg font-semibold">Select Data Type:</h3>
                        <select
                          value={dataType}
                          onChange={handleDataTypeChange}
                          className="mt-1 block w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="4">4 Bytes</option>
                          <option value="8">8 Bytes</option>
                        </select>
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold">Select Size Unit:</h3>
                        <select
                          value={sizeUnit}
                          onChange={handleSizeUnitChange}
                          className="mt-1 block w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="KiB">KiB</option>
                          <option value="MiB">MiB</option>
                        </select>
                      </div>
                    </div>
                  </div>
                  {selectedNode && (
                    <CollapsiblePanel title="Selected Node Data">
                      <div className="text-lg mb-2 flex flex-wrap">
                        <span className="font-medium">Indices and Stride:&nbsp;</span>
                        {renderIndices(selectedNode.data.label)}
                      </div>
                      <div className="text-lg mb-2">
                        <span className="font-medium">Tensor Size:&nbsp;</span>
                        {formatSize(tensorSizes(selectedNode.data.label))}
                      </div>
                      {selectedNode?.data?.label && (
                        <div className="text-lg mb-2">
                          <span className="font-medium">#Size/#Size per Tree:&nbsp;</span>
                          {(() => {
                            return formatNumber(selectedNode.data.sizePercentage);
                          })()} %
                        </div>
                      )}
                      {selectedNodeOperations > 0 && (
                        <div className="text-lg mb-2">
                          <span className="font-medium">#Ops/#Ops per Tree:&nbsp;</span>
                          {formatNumber(selectedNodeOperations * 100 / totalOperations)} %
                        </div>
                      )}
                      {selectedNodeOperations > 0 && selectedNode?.data?.label && (
                        <div className="text-lg mb-2">
                          <span className="font-medium">Arithemtic Intensity:&nbsp;</span>
                          {(() => {
                            return formatNumber(selectedNodeOperations / calcByteAccess(selectedNode.data.byteAccesses));
                          })()}
                        </div>
                      )}
                    </CollapsiblePanel>
                  )}
                </div>
              </Panel>
            </PanelGroup>
          </div>
        </Panel>
        <CustomPanelResizeHandle />
        <Panel minSize={getMinSizePercentage(420)}>
          <div className="h-full overflow-hidden flex flex-col bg-white shadow-lg">
            <div className="p-6 flex-shrink-0">
              <div className="flex items-center gap-2 mb-6">
                <input
                  type="text"
                  placeholder="Enter einsum tree"
                  value={einsumExpression}
                  onChange={handleEinsumInputChange}
                  className="flex-grow p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={() => parseInput(einsumExpression)}
                  className="px-5 py-2 bg-[#1e3a5f] text-white rounded-md transition-all duration-300 shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-[#61dafb] focus:ring-offset-2"
                >
                  Parse
                </button>
                <button
                  onClick={handleShare}
                  className="px-5 py-2 bg-[#282c34] text-white rounded-md transition-all duration-300 shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-[#61dafb] focus:ring-offset-2"
                >
                  Share
                </button>
              </div>
            </div>
            <div
              className="flex-grow overflow-auto p-6 pt-0"
              style={{ touchAction: 'pan-y', overscrollBehavior: 'contain' }}
            >
              <HistoryPanel
                history={history}
                onSelectTree={selectTreeFromHistory}
                onClear={handleClearHistory}
              />
              <IndexSizeInput indexSizes={indexSizes} setIndexSizes={setIndexSizes} onUpdate={recalculateOperations} />
            </div>
          </div>
        </Panel>
      </PanelGroup>
    </div>
  );
};

export default EinsumTreeVisualizer;