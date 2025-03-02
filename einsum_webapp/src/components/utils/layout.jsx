import { hierarchy, tree } from 'd3-hierarchy';

/**
 * Builds a visualization tree for rendering expression trees using d3 hierarchy
 * @param {Object} root - The root node of the expression tree
 * @param {Array} faultyNodes - Array of nodes marked as faulty (default: [])
 * @param {string} layoutOption - Layout style ('tree', 'super_wide', 'hierarchical', 'compact', 'wide')
 * @returns {Object} Object containing nodes, edges and dimensions for the visualization
 */
const buildVisualizationTree = (root, faultyNodes = [], layoutOption = 'tree') => {
  /**
   * Recursively counts total number of nodes in the tree
   * @param {Object} node - Current tree node
   * @returns {number} Total count of nodes in the tree
   */
  const countNodes = (node) => {
    if (!node) return 0;
    return 1 + countNodes(node.left) + countNodes(node.right);
  };

  /**
   * Recursively finds the maximum depth of the tree
   * @param {Object} node - Current tree node
   * @param {number} currentDepth - Current depth in the traversal
   * @returns {number} Maximum depth of the tree
   */
  const findMaxDepth = (node, currentDepth = 0) => {
    if (!node) return currentDepth - 1;
    const leftDepth = findMaxDepth(node.left, currentDepth + 1);
    const rightDepth = findMaxDepth(node.right, currentDepth + 1);
    return Math.max(leftDepth, rightDepth);
  };

  // Calculate total nodes for sizing
  let totalNodes = countNodes(root);

  // Calculate maximum depth for height scaling
  const maxDepth = findMaxDepth(root);

  // Dynamic dimension calculation based on node count and depth
  const width = Math.max(300, totalNodes * 50);
  const height = Math.max(140, maxDepth * 110); // 80 pixels per level gives adequate vertical spacing

  // Create d3 hierarchy structure from the expression tree
  const hierarchyRoot = hierarchy(root, d => {
    return [d.left, d.right].filter(child => child !== null && child !== undefined);
  });

  // Configure layout based on selected option
  let layout;
  switch (layoutOption) {
    case 'super wide':
      layout = tree()
        .size([width * 3, height])
        .separation((a, b) => {
          if (a.parent === b.parent) return 4;
          return 6 + Math.abs(a.depth - b.depth);
        });
      break;
    case 'hierarchical':
      layout = tree()
        .size([width * 2, height * 1.5])
        .separation((a, b) => {
          const depthDiff = Math.abs(a.depth - b.depth);
          if (a.parent === b.parent) return 2.5;
          return 2.5 + (depthDiff * 0.5);
        });
      break;
    case 'compact':
      layout = tree()
        .size([width * 0.7, height * 0.8])
        .separation((a, b) => (2));
      break;
    case 'wide':
      layout = tree()
        .size([width * 1.5, height])
        .separation((a, b) => (a.parent === b.parent ? 2 : 2.5));
      break;
    default: // 'tree'
      layout = tree()
        .size([width, height])
        .separation((a, b) => (a.parent === b.parent ? 1.5 : 2));
  }

  // Apply layout to hierarchy
  const treeRoot = layout(hierarchyRoot);

  // Transform tree data into React Flow compatible format
  const nodes = treeRoot.descendants().map((d, i) => {
    const isFaulty = faultyNodes.some(faultyNode => faultyNode.id === d.data.id);
    const { left, right, value, ...restData } = d.data;
    return {
      id: d.data.id,
      type: 'custom',
      data: {
        ...restData,
        label: value,
        left: left?.value,
        right: right?.value,
        depth: d.depth,
        isFaulty
      },
      position: { x: d.x, y: d.y }
    };
  });

  // Create edges between nodes
  const edges = treeRoot.links().map((link, i) => ({
    id: `edge-${i}`,
    source: link.source.data.id,
    target: link.target.data.id,
    type: 'smoothstep'
  }));

  // Return complete visualization data
  return {
    nodes,
    edges,
    dimensions: { width, height }
  };
};

export default buildVisualizationTree;