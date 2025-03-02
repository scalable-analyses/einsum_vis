import { cloneDeep } from "lodash";
import { Toast } from '../common/Toast.jsx';

/**
 * Dimension states for classification process
 */
const DimState = {
    INITIAL: 'INITIAL',
    PRIMITIVE: 'PRIMITIVE',
    LOOP: 'LOOP'
};

/**
 * Dimension types for classification
 */
const DimType = {
    // Primitive dimension types
    CB: 'cb',
    MB: 'mb',
    NB: 'nb',
    KB: 'kb',
    // Loop dimension types
    BC: 'bc',
    BM: 'bm',
    BN: 'bn',
    BK: 'bk'
};

/**
 * Primitive dimension types with defined processing order
 */
const PrimitiveDimType = {
    CB: 'cb',
    MB: 'mb',
    KB: 'kb',
    NB: 'nb',
    LOOP: 'loop'
};

// Processing order for primitive dimensions
const PRIMITIVE_DIM_ORDER = Object.values(PrimitiveDimType);

// Mapping for dimension type relationships
const DIM_TYPE_RELATIONS = {
    [DimType.CB]: { primitive: DimType.CB, loop: DimType.BC },
    [DimType.MB]: { primitive: DimType.MB, loop: DimType.BM },
    [DimType.NB]: { primitive: DimType.NB, loop: DimType.BN },
    [DimType.KB]: { primitive: DimType.KB, loop: DimType.BK },
};

/**
 * Base class for dimension classifiers that provides common functionality
 */
class BaseDimensionClassifier {
    /**
     * Creates a dimension classifier instance
     * @param {Array} node - The node indices
     * @param {Array} left - The left operand indices
     * @param {Array} right - The right operand indices
     */
    constructor(node, left, right) {
        // Deep clone inputs to prevent modification of original data
        this.clonedNode = cloneDeep(node);
        this.node = cloneDeep(node);
        this.left = cloneDeep(left) || [];
        this.right = cloneDeep(right) || [];
        this.rightK = cloneDeep(right) || [];
        this.leftK = cloneDeep(left) || [];

        // Initialize state tracking
        this.state = DimState.INITIAL;
        this.dimTypes = this.initializeDimTypes();
        this.processedIndices = new Set();
        this.dimType = DimType.CB;

        // Error handling
        this.errors = [];
    }

    /**
     * Initialize dimension type structure
     * @returns {Object} The dimension types structure
     */
    initializeDimTypes() {
        return {
            primitive: { cb: [], mb: [], nb: [], kb: [] },
            loop: { bc: [], bm: [], bn: [], bk: [] }
        };
    }

    /**
     * Reverse all dimension arrays
     */
    reverseAllArrays() {
        Object.values(this.dimTypes.primitive).forEach(arr => arr.reverse());
        Object.values(this.dimTypes.loop).forEach(arr => arr.reverse());
    }

    /**
     * Check if the current dimension type can accept a new primitive dimension
     * @param {string} dimType - The dimension type to check
     * @returns {boolean} Whether the dimension type can be accepted
     */
    acceptDimForPrimitive(dimType) {
        const currentTypeIndex = PRIMITIVE_DIM_ORDER.indexOf(this.dimType);
        const newTypeIndex = PRIMITIVE_DIM_ORDER.indexOf(dimType);
        return currentTypeIndex <= newTypeIndex;
    }

    /**
     * Add an element to the primitive dimension type
     * @param {string} type - The dimension type
     * @param {string} element - The element to add
     */
    addToPrimitive(type, element) {
        this.validateElement(element);
        this.validateNotProcessed(element);
        this.dimTypes.primitive[type].push(element);
        this.processedIndices.add(element);
    }

    /**
     * Add an element to the loop dimension type
     * @param {string} type - The dimension type
     * @param {string} element - The element to add
     */
    addToLoop(type, element) {
        this.validateElement(element);
        this.validateNotProcessed(element);
        this.dimTypes.loop[type].push(element);
        this.processedIndices.add(element);
    }

    /**
     * Validate that an element exists
     * @param {string} element - The element to validate
     * @throws {Error} If element is null or undefined
     */
    validateElement(element) {
        if (!element) {
            throw new Error(`Contraction element: ${element} is undefined or null`);
        }
    }

    /**
     * Validate that an element has not been processed yet
     * @param {string} element - The element to validate
     * @throws {Error} If element has already been processed
     */
    validateNotProcessed(element) {
        if (this.processedIndices.has(element)) {
            throw new Error(`Index ${element} already processed`);
        }
    }

    /**
     * Remove an element from all arrays (node, left, right)
     * @param {string} element - The element to remove
     */
    removeFromAll(element) {
        this.node = this.node.filter(e => e !== element);
        this.left = this.left.filter(e => e !== element);
        this.right = this.right.filter(e => e !== element);
    }

    /**
     * Remove an element from node and left arrays
     * @param {string} element - The element to remove
     */
    removeFromNodeAndLeft(element) {
        this.node = this.node.filter(e => e !== element);
        this.left = this.left.filter(e => e !== element);
    }

    /**
     * Remove an element from node and right arrays
     * @param {string} element - The element to remove
     */
    removeFromNodeAndRight(element) {
        this.node = this.node.filter(e => e !== element);
        this.right = this.right.filter(e => e !== element);
    }

    /**
     * Remove an element from left and right arrays
     * @param {string} element - The element to remove
     */
    removeFromLeftAndRight(element) {
        this.left = this.left.filter(e => e !== element);
        this.right = this.right.filter(e => e !== element);
    }

    /**
     * Abstract method to be implemented by subclasses
     * @throws {Error} If not implemented by subclass
     */
    classify() {
        throw new Error('classify() must be implemented by subclass');
    }

    /**
     * Handle classification errors
     * @param {Error} error - The error to handle
     * @returns {null} Returns null to indicate failure
     */
    handleError(error) {
        const message = `Classification error: ${error.message}`;
        console.error(message);
        Toast.show(message);
        this.errors.push(error);
        return null;
    }
}

/**
 * Standard implementation of dimension classification
 */
class StandardDimensionClassifier extends BaseDimensionClassifier {
    /**
     * Classify dimensions according to standard algorithm
     * @returns {Object|null} The classified dimensions or null if error
     */
    classify() {
        try {
            this.processCMN();
            this.processK();
            this.reverseAllArrays();
            return this.dimTypes;
        } catch (error) {
            return this.handleError(error);
        }
    }

    /**
     * Process C, M, and N dimensions
     */
    processCMN() {
        for (let i = this.node.length - 1; i >= 0; i--) {
            const element = this.node[i];
            const occurrenceLast = this.checkOccurrenceLast(element);

            let retCode = this.handleInitialState(element, occurrenceLast);

            if (retCode === 2) {
                this.updateDimTypeForLoop();
                retCode = this.handleLoopState(element);
            }

            // Continue processing based on return code
            if (retCode === 1) {
                i++; // Re-process this index
            }
        }
    }

    /**
     * Update dimension type when transitioning to loop state
     */
    updateDimTypeForLoop() {
        if (this.state === DimState.INITIAL) {
            this.dimType = DimType.KB;
        } else if (this.state === DimState.PRIMITIVE) {
            const currentIndex = PRIMITIVE_DIM_ORDER.indexOf(this.dimType);
            if (currentIndex === -1 || currentIndex + 1 >= PRIMITIVE_DIM_ORDER.length) {
                this.dimType = DimType.NB;
            } else {
                this.dimType = PRIMITIVE_DIM_ORDER[currentIndex + 1];
            }
        }
        this.state = DimState.LOOP;
    }

    /**
     * Process K dimensions
     */
    processK() {
        const primitive = this.processRightKDimensions();
        this.processLeftKDimensions(primitive);
    }

    /**
     * Process K dimensions from the right operand
     * @returns {Array} Primitive K dimensions
     */
    processRightKDimensions() {
        this.dimType = DimType.CB;
        this.state = DimState.PRIMITIVE;
        const primitive = [];

        this.rightK?.reverse().forEach(element => {
            if (this.isElementInExistingDimension(element)) return;

            if (this.leftK.includes(element)) {
                this.handleRightKElement(element, primitive);
            } else {
                throw new Error(`Node ${this.clonedNode} has invalid K dimension`);
            }
        });

        return primitive;
    }

    /**
     * Process K dimensions from the left operand
     * @param {Array} primitive - Primitive K dimensions from right
     */
    processLeftKDimensions(primitive) {
        this.dimType = DimType.CB;
        this.state = DimState.PRIMITIVE;
        this.leftK?.reverse().forEach(element => {
            if (this.isElementInExistingDimension(element)) return;
            if (this.rightK.includes(element)) {
                this.handleLeftKElement(element, primitive);
            } else {
                throw new Error(`Node ${this.clonedNode} has invalid K dimension`);
            }
        });
    }

    /**
     * Check if element is already in any dimension
     * @param {string} element - The element to check
     * @returns {boolean} Whether element is in an existing dimension
     */
    isElementInExistingDimension(element) {
        // Check all dimension types
        for (const [dimType, mapping] of Object.entries(DIM_TYPE_RELATIONS)) {
            if (this.isInDimension(element, mapping.primitive, mapping.loop)) {
                if (this.acceptDimForPrimitive(dimType)) {
                    this.dimType = dimType;
                }
                else if (this.state === DimState.PRIMITIVE) {
                    const currentIndex = PRIMITIVE_DIM_ORDER.indexOf(this.dimType);
                    this.dimType = PRIMITIVE_DIM_ORDER[currentIndex + 1];
                    this.state = DimState.LOOP;
                }
                return true;
            }
        }
        if (this.acceptDimForPrimitive(DimType.KB)) {
            this.dimType = DimType.KB;
        }
        else if (this.state === DimState.PRIMITIVE) {
            const currentIndex = PRIMITIVE_DIM_ORDER.indexOf(this.dimType);
            this.dimType = PRIMITIVE_DIM_ORDER[currentIndex + 1];
            this.state = DimState.LOOP;
        }
        return false;
    }

    /**
     * Check if element is in a specific dimension
     * @param {string} element - The element to check
     * @param {string} primitive - Primitive dimension type
     * @param {string} loop - Loop dimension type
     * @returns {boolean} Whether element is in the dimension
     */
    isInDimension(element, primitive, loop) {
        return this.dimTypes.primitive[primitive]?.includes(element) ||
            this.dimTypes.loop[loop]?.includes(element);
    }

    /**
     * Handle K element from right operand
     * @param {string} element - The element to handle
     * @param {Array} primitive - Array to store primitive K elements
     */
    handleRightKElement(element, primitive) {
        if (this.acceptDimForPrimitive(DimType.KB)) {
            this.state = DimState.PRIMITIVE;
            primitive.push(element);
        }
    }

    /**
     * Handle K element from left operand
     * @param {string} element - The element to handle
     * @param {Array} primitive - Primitive K elements from right
     */
    handleLeftKElement(element, primitive) {
        const isPrimitiveK = this.acceptDimForPrimitive(DimType.KB) &&
            primitive.includes(element) &&
            primitive[0] === element;
        if (isPrimitiveK) {
            this.state = DimState.PRIMITIVE;
            this.addToPrimitive(DimType.KB, element);
            const index = primitive.indexOf(element);
            if (index > -1) {
                primitive.splice(index, 1);
            }
        } else {
            this.addToLoop(DimType.BK, element);
        }
    }

    /**
     * Handle element in initial state
     * @param {string} element - The element to handle
     * @param {Object} occurrence - Occurrence information
     * @returns {number} Processing code: 0=continue, 2=transition to loop
     */
    handleInitialState(element, occurrence) {
        // Handle CB (common batch) dimension
        if (occurrence.inAll && this.acceptDimForPrimitive(DimType.CB)) {
            this.dimType = DimType.CB;
            this.state = DimState.PRIMITIVE;
            this.addToPrimitive(DimType.CB, element);
            this.removeFromAll(element);
            return 0;
        }
        // Handle MB (left batch) dimension
        else if (occurrence.inNodeAndLeft &&
            this.acceptDimForPrimitive(DimType.MB) &&
            !this.right.includes(element)) {
            this.dimType = DimType.MB;
            this.state = DimState.PRIMITIVE;
            this.addToPrimitive(DimType.MB, element);
            this.removeFromNodeAndLeft(element);
            return 0;
        }
        // Handle NB (right batch) dimension
        else if (occurrence.inNodeAndRight &&
            this.acceptDimForPrimitive(DimType.NB) &&
            !this.left.includes(element)) {
            this.dimType = DimType.NB;
            this.state = DimState.PRIMITIVE;
            this.addToPrimitive(DimType.NB, element);
            this.removeFromNodeAndRight(element);
            return 0;
        }
        // Transition to loop state
        return 2;
    }

    /**
     * Handle element in loop state
     * @param {string} element - The element to handle
     * @returns {number} Processing code: 0=continue, 1=retry
     */
    handleLoopState(element) {
        const occurrence = this.checkOccurrence(element);

        // Handle BC (common blocking) dimension
        if (occurrence.inAll) {
            this.addToLoop(DimType.BC, element);
            this.removeFromAll(element);
            return 0;
        }
        // Handle BM (left blocking) dimension
        else if (occurrence.inNodeAndLeft && !this.right.includes(element)) {
            this.addToLoop(DimType.BM, element);
            this.removeFromNodeAndLeft(element);
            return 0;
        }
        // Special case: left index in right but not in node
        else if (occurrence.leftInRight &&
            !this.node.includes(this.left[this.left.length - 1])) {
            this.removeFromLeftAndRight(this.left[this.left.length - 1]);
            return 1;
        }
        // Special case: right index in left but not in node
        else if (occurrence.rightInLeft &&
            !this.node.includes(this.right[this.right.length - 1])) {
            this.removeFromLeftAndRight(this.right[this.right.length - 1]);
            return 1;
        }
        // Handle BN (right blocking) dimension
        else if (occurrence.inNodeAndRight && !this.left.includes(element)) {
            this.addToLoop(DimType.BN, element);
            this.removeFromNodeAndRight(element);
            return 0;
        }
        else {
            throw new Error(`Contraction ${this.clonedNode} is malformed`);
        }
    }

    /**
     * Check occurrence of element at the end of arrays
     * @param {string} element - The element to check
     * @returns {Object} Occurrence information
     */
    checkOccurrenceLast(element) {
        const inNode = this.node.at(-1) === element;
        const inLeft = this.left?.at(-1) === element || false;
        const inRight = this.right?.at(-1) === element || false;
        const leftEqualsRight = this.left.length > 0 &&
            this.right.length > 0 &&
            this.left[this.left.length - 1] === this.right[this.right.length - 1];

        return {
            inAll: inNode && inLeft && inRight,
            inNodeAndLeft: inNode && inLeft && !inRight,
            inNodeAndRight: inNode && !inLeft && inRight,
            leftEqualsRight: leftEqualsRight
        };
    }

    /**
     * Check occurrence of element anywhere in arrays
     * @param {string} element - The element to check
     * @returns {Object} Occurrence information
     */
    checkOccurrence(element) {
        const inNode = this.node.includes(element);
        const inLeft = this.left.includes(element);
        const inRight = this.right.includes(element);

        // Check if last left element is in right
        const leftInRight = this.left.length > 0 &&
            this.right.length > 0 &&
            this.right.includes(this.left[this.left.length - 1]);

        // Check if last right element is in left
        const rightInLeft = this.left.length > 0 &&
            this.right.length > 0 &&
            this.left.includes(this.right[this.right.length - 1]);

        return {
            inAll: inNode && inLeft && inRight,
            inNodeAndLeft: inNode && inLeft && !inRight,
            inNodeAndRight: inNode && !inLeft && inRight,
            leftInRight: leftInRight,
            rightInLeft: rightInLeft
        };
    }
}

/**
 * Simplified dimension classifier implementation
 */
class SimplifiedDimensionClassifier extends BaseDimensionClassifier {
    classify() {
        try {
            this.processSimpleClassification();
            return this.dimTypes;
        } catch (error) {
            return this.handleError(error);
        }
    }

    processSimpleClassification() {
        // Simplified classification logic
        // Implementation here
    }
}

/**
 * Factory function to create appropriate dimension classifier
 * @param {string} type - Type of classifier to create
 * @param {Array} node - The node indices
 * @param {Array} left - The left operand indices
 * @param {Array} right - The right operand indices
 * @returns {BaseDimensionClassifier} The created classifier
 */
export const createDimensionClassifier = (type, node, left, right) => {
    switch (type) {
        case 'standard':
            return new StandardDimensionClassifier(node, left, right);
        case 'simplified':
            return new SimplifiedDimensionClassifier(node, left, right);
        default:
            return new StandardDimensionClassifier(node, left, right);
    }
};

/**
 * Utility function to get dimension types
 * @param {Array} node - The node indices
 * @param {Array} left - The left operand indices
 * @param {Array} right - The right operand indices
 * @param {string} type - Classification algorithm type
 * @returns {Object|null} The classified dimensions or null if error
 */
export const dimensionTypes = (node, left, right, type = 'standard') => {
    const classifier = createDimensionClassifier(type, node, left, right);
    return classifier.classify();
};
