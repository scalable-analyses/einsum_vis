import { dimensionTypes } from './dimensionClassifier.jsx';

/**
 * Constants for node attribute names to avoid typos and improve clarity
 */
const NodeAttributes = {
    // Size related
    TENSOR_SIZE: 'tensorSize',
    SIZE_PERCENTAGE: 'sizePercentage',
    NORMALIZED_SIZE: 'normalizedSizePercentage',

    // Operation related
    OPERATIONS: 'operations',
    OPERATIONS_PERCENTAGE: 'operationsPercentage',
    NORMALIZED_OPERATIONS: 'normalizedPercentage',
    TOTAL_OPERATIONS: 'totalOperations',
    BYTE_ACCESSES: 'byteAccesses'
};

/**
 * Helper function to safely set attributes on a node
 * @param {Object} node - The node to modify
 * @param {Object} attributes - Object containing attribute key-value pairs to set
 */
const setNodeAttributes = (node, attributes) => {
    if (!node) return;
    Object.entries(attributes).forEach(([key, value]) => {
        node[key] = value;
    });
};

/**
 * Helper function to calculate the product of index sizes for given dimensions
 * @param {string[]} dimensions - Array of dimension indices
 * @param {Object} indexSizes - Object containing the sizes of each index
 * @param {number} initialValue - Initial value for multiplication
 * @returns {number} - Product of all dimension sizes
 */
const calculateDimensionProduct = (dimensions = [], indexSizes, initialValue = 1) => {
    return dimensions.reduce((product, index) =>
        product * (indexSizes[index] || 1), initialValue);
};

/**
 * Normalizes a value to a percentage within a range
 * @param {number} value - Value to normalize
 * @param {number} min - Minimum value in range
 * @param {number} max - Maximum value in range
 * @returns {number} - Normalized percentage value
 */
const normalizeToPercentage = (value, min, max) => {
    if (min === max) return 0;
    return ((value - min) / (max - min)) * 100;
};

/**
 * Calculate dimension products for metric calculations
 * @param {Object} dimTypes - Dimension types object
 * @param {Object} indexSizes - Index sizes mapping
 * @returns {Object} - Object containing dimension products
 */
const calculateDimProducts = (dimTypes, indexSizes) => {
    const calc = (type, dim) => calculateDimensionProduct(dimTypes[type][dim] || [], indexSizes);

    // Calculate dimension products
    const cDim = calc('primitive', 'cb') * calc('loop', 'bc');
    const mDim = calc('primitive', 'mb') * calc('loop', 'bm');
    const nDim = calc('primitive', 'nb') * calc('loop', 'bn');
    const kDim = calc('primitive', 'kb') * calc('loop', 'bk');

    return { cDim, mDim, nDim, kDim };
};

/**
 * Calculates operation count for matrix multiplication-like operations
 * @param {Object} dimTypes - Dimension types for the operation
 * @param {Object} indexSizes - Index sizes mapping
 * @returns {number} - Number of operations
 */
export const calculateOperations = (dimTypes, indexSizes) => {
    let cmn = 1;
    let k = 1;

    for (const key in dimTypes) {
        for (const dim in dimTypes[key]) {
            if (dim === 'kb' || dim === 'bk') {
                k = calculateDimensionProduct(dimTypes[key][dim], indexSizes, k);
            } else {
                cmn = calculateDimensionProduct(dimTypes[key][dim], indexSizes, cmn);
            }
        }
    }

    return 2 * cmn * k - cmn;
};

/**
 * Calculates memory access patterns for tensor operations
 * @param {Object} dimTypes - Dimension types for the operation
 * @param {Object} indexSizes - Index sizes mapping
 * @returns {number} - Number of byte accesses
 */
export const calculateByteAccesses = (dimTypes, indexSizes) => {
    const { cDim, mDim, nDim, kDim } = calculateDimProducts(dimTypes, indexSizes);

    const cmn = cDim * mDim * nDim;
    const cnk = nDim * kDim;
    const cmk = mDim * kDim;

    return cmn + cnk + cmk;
};

/**
 * Calculates node tensor sizes in the tree
 * @param {Object} node - Tree node
 * @param {Object} indexSizes - Index sizes mapping
 * @param {number} dataTypeSize - Size of data type in bytes
 * @param {Object} stats - Stats object to update
 */
const calculateNodeSizes = (node, indexSizes, dataTypeSize, stats) => {
    if (!node) return;

    const tensorSize = calculateDimensionProduct(node.value, indexSizes) * dataTypeSize;
    setNodeAttributes(node, {
        [NodeAttributes.TENSOR_SIZE]: tensorSize
    });

    stats.totalTensorSize += tensorSize;
    stats.maxTensorSize = Math.max(stats.maxTensorSize, tensorSize);
    stats.minTensorSize = Math.min(stats.minTensorSize, tensorSize);

    calculateNodeSizes(node.left, indexSizes, dataTypeSize, stats);
    calculateNodeSizes(node.right, indexSizes, dataTypeSize, stats);
};

/**
 * Adds size percentage information to tree nodes
 * @param {Object} node - Tree node
 * @param {Object} stats - Stats containing min/max/total sizes
 */
const addSizePercentages = (node, stats) => {
    if (!node) return;

    const sizePercentage = (node[NodeAttributes.TENSOR_SIZE] / stats.totalTensorSize) * 100;
    const normalizedSizePercentage = normalizeToPercentage(
        node[NodeAttributes.TENSOR_SIZE],
        stats.minTensorSize,
        stats.maxTensorSize
    );

    setNodeAttributes(node, {
        [NodeAttributes.SIZE_PERCENTAGE]: sizePercentage,
        [NodeAttributes.NORMALIZED_SIZE]: normalizedSizePercentage
    });

    addSizePercentages(node.left, stats);
    addSizePercentages(node.right, stats);
};

/**
 * Resets all operation-related properties in the tree
 * @param {Object} node - Current tree node
 */
const resetTreeOperations = (node) => {
    if (!node) return;

    setNodeAttributes(node, {
        [NodeAttributes.OPERATIONS]: null,
        [NodeAttributes.OPERATIONS_PERCENTAGE]: null,
        [NodeAttributes.NORMALIZED_OPERATIONS]: null
    });

    resetTreeOperations(node.left);
    resetTreeOperations(node.right);
};

/**
 * Calculate operations and byte accesses for a tree
 * @param {Object} node - Tree node
 * @param {Object} indexSizes - Index sizes mapping
 * @param {Array} faultyNodes - Array to collect faulty nodes
 * @param {Array} binaryNodes - Array to collect binary nodes
 * @returns {Object} - Results object with operations and error status
 */
const calculateNodeOperations = (node, indexSizes, faultyNodes, binaryNodes) => {
    if (!node.left) return { hasError: false, operations: 0 };

    let totalOps = 0;
    let hasError = false;

    // Process left side
    const leftResult = calculateNodeOperations(node.left, indexSizes, faultyNodes, binaryNodes);
    if (leftResult.hasError) hasError = true;
    totalOps += leftResult.operations;

    // Process right side and current node operations
    if (node.right) {
        const rightResult = calculateNodeOperations(node.right, indexSizes, faultyNodes, binaryNodes);
        if (rightResult.hasError) hasError = true;
        totalOps += rightResult.operations;

        // Calculate operations for current node
        const dimtypes = dimensionTypes(node.value, node.left.value, node.right.value);
        if (!dimtypes) {
            faultyNodes.push(node);
            return { hasError: true, operations: 0 };
        }

        const operations = calculateOperations(dimtypes, indexSizes);
        const byteAccesses = calculateByteAccesses(dimtypes, indexSizes);

        setNodeAttributes(node, {
            [NodeAttributes.OPERATIONS]: operations,
            [NodeAttributes.BYTE_ACCESSES]: byteAccesses
        });

        totalOps += operations;
        binaryNodes.push(node);
    }

    return { hasError, operations: totalOps };
};

/**
 * Add operation percentages to tree nodes
 * @param {Object} tree - The tree root node
 * @param {Array} binaryNodes - Array of binary nodes
 * @param {number} totalOperations - Total operation count
 */
const addOperationPercentages = (tree, binaryNodes, totalOperations) => {
    // Calculate operation percentages
    binaryNodes.forEach(node => {
        const operationsPercentage = (node[NodeAttributes.OPERATIONS] / totalOperations) * 100;
        setNodeAttributes(node, {
            [NodeAttributes.OPERATIONS_PERCENTAGE]: operationsPercentage,
            [NodeAttributes.TOTAL_OPERATIONS]: totalOperations
        });
    });

    // Normalize operation percentages
    const percentages = binaryNodes.map(node => node[NodeAttributes.OPERATIONS_PERCENTAGE]);
    const minPercentage = Math.min(...percentages) || 0;
    const maxPercentage = Math.max(...percentages) || 0;

    const addNormalizedPercentages = (node) => {
        if (!node) return;
        if (node.left && node.right) {
            const normalizedPercentage = normalizeToPercentage(
                node[NodeAttributes.OPERATIONS_PERCENTAGE],
                minPercentage,
                maxPercentage
            );

            setNodeAttributes(node, {
                [NodeAttributes.NORMALIZED_OPERATIONS]: normalizedPercentage
            });
        }
        addNormalizedPercentages(node.left);
        addNormalizedPercentages(node.right);
    };

    addNormalizedPercentages(tree);
};

/**
 * Calculates and annotates metrics for an expression tree
 * @param {Object} indexSizes - Size mapping for each dimension
 * @param {Object} tree - Expression tree to analyze
 * @param {number} dataTypeSize - Size of the data type in bytes
 * @returns {Object} Analysis results including operations and errors
 */
export const calculateNodeMetrics = (indexSizes, tree, dataTypeSize) => {
    if (!tree) return { totalOperations: 0, faultyNodes: [] };

    // Track statistics
    const stats = {
        totalTensorSize: 0,
        maxTensorSize: 0,
        minTensorSize: Infinity
    };

    const faultyNodes = [];
    const binaryNodes = [];

    // Calculate tensor sizes
    calculateNodeSizes(tree, indexSizes, dataTypeSize, stats);
    addSizePercentages(tree, stats);

    // Calculate operations
    const { hasError, operations } = calculateNodeOperations(tree, indexSizes, faultyNodes, binaryNodes);

    // Handle error case or finalize
    if (hasError) {
        resetTreeOperations(tree);
        return { totalOperations: 0, faultyNodes };
    }

    // Set total operations on tree
    setNodeAttributes(tree, {
        [NodeAttributes.TOTAL_OPERATIONS]: operations
    });

    // Add operation percentages
    addOperationPercentages(tree, binaryNodes, operations);

    return { totalOperations: operations, faultyNodes };
};