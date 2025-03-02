import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import NodeIndicesPanel from './NodeIndicesPanel.jsx';
import useDeviceSize from '../utils/useDeviceSize.jsx';

// Track active tooltip panel globally
let activeNodeIndicesPanel = null;

/**
 * Custom tensor node component that displays indices and handles interactions
 */
const TensorNode = React.memo(({
    id,
    indices,
    html,
    position,
    size,
    onIndicesChange,
    isDragging
}) => {
    const [showTooltip, setShowTooltip] = useState(false);
    const nodeRef = useRef(null);
    const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
    const timeoutRef = useRef(null);
    const isTouchActiveRef = useRef(false);

    const clearTimeoutSafely = () => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        }
    };

    useEffect(() => {
        return () => clearTimeoutSafely();
    }, []);

    useEffect(() => {
        if (showTooltip && nodeRef.current && !isDragging) {
            const rect = nodeRef.current.getBoundingClientRect();
            setTooltipPosition({
                x: rect.left + rect.width / 2,
                y: rect.top
            });
        }
    }, [showTooltip, isDragging]);

    useEffect(() => {
        if (isDragging) {
            clearTimeoutSafely();
            setShowTooltip(false);
        }
    }, [isDragging]);

    const handleSwapIndices = (newIndices) => {
        if (indices) {
            onIndicesChange?.(id, newIndices);
        }
    };

    const handleInteractionStart = () => {
        if (isDragging) return;
        clearTimeoutSafely();
        setShowTooltip(true);
    };

    const handleInteractionEnd = () => {
        clearTimeoutSafely();
        timeoutRef.current = setTimeout(() => {
            setShowTooltip(false);
        }, 100);
    };

    const handleTouchStart = (e) => {
        if (isDragging) return;
        if (e.touches.length > 1) return;

        // Reset global state tracking when a new touch starts
        if (activeNodeIndicesPanel && activeNodeIndicesPanel !== id) {
            // Force close the previous tooltip first
            activeNodeIndicesPanel = null;
        }

        isTouchActiveRef.current = true;
        activeNodeIndicesPanel = id;
        clearTimeoutSafely();
        setShowTooltip(true);

        e.preventDefault();
        e.stopPropagation();
    };

    const handleTouchEnd = (e) => {
        if (!isTouchActiveRef.current) return;

        // Add a small delay before resetting to handle panel transitions
        setTimeout(() => {
            isTouchActiveRef.current = false;
        }, 50);

        e.preventDefault();
        e.stopPropagation();
    };

    const handleTouchCancel = () => {
        isTouchActiveRef.current = false;
        activeNodeIndicesPanel = null;
        clearTimeoutSafely();
        setShowTooltip(false);
    };

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (activeNodeIndicesPanel === id) {
                activeNodeIndicesPanel = null;
            }
        };
    }, [id]);

    // Force reset state when indices change
    useEffect(() => {
        return () => {
            // When component unmounts or indices change, reset state
            if (activeNodeIndicesPanel === id) {
                activeNodeIndicesPanel = null;
            }
        };
    }, [id, indices]);

    return (
        <div
            ref={nodeRef}
            className="absolute bg-white rounded-md border border-gray-200 flex items-center justify-center"
            style={{
                left: position.x,
                top: position.y,
                width: size.width,
                height: size.height,
                transform: 'translate(-50%, -50%)',
                fontSize: size.fontSize,
                zIndex: 5
            }}
            onMouseEnter={() => !isTouchActiveRef.current && handleInteractionStart()}
            onMouseLeave={() => !isTouchActiveRef.current && handleInteractionEnd()}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            onTouchCancel={handleTouchCancel}
        >
            <div
                className="w-full h-full flex items-center justify-center p-1"
                dangerouslySetInnerHTML={{ __html: html }}
            />

            {showTooltip && indices && indices.length > 0 && createPortal(
                <NodeIndicesPanel
                    indices={indices}
                    onSwapIndices={handleSwapIndices}
                    position={tooltipPosition}
                    onMouseEnter={handleInteractionStart}
                    onMouseLeave={handleInteractionEnd}
                />,
                document.body
            )}
        </div>
    );
});

/**
 * Main component that renders a simple tree visualization of tensor operations
 */
const SimpleTensorTree = ({ node, left, right, dimTypes, onIndicesChange, isDragging }) => {
    const { getInfoPanelDimensions } = useDeviceSize();
    const dimensions = getInfoPanelDimensions();
    const miniFlow = dimensions.miniFlow;

    /**
     * Determines the dimension type of a given letter based on dimTypes configuration
     */
    const determineDimensionType = useCallback((letter) => {
        if (!dimTypes) return 'O';

        const inC = (dimTypes.primitive?.cb || []).includes(letter) || (dimTypes.loop?.bc || []).includes(letter);
        const inM = (dimTypes.primitive?.mb || []).includes(letter) || (dimTypes.loop?.bm || []).includes(letter);
        const inN = (dimTypes.primitive?.nb || []).includes(letter) || (dimTypes.loop?.bn || []).includes(letter);
        const inK = (dimTypes.primitive?.kb || []).includes(letter) || (dimTypes.loop?.bk || []).includes(letter);

        if (inC) return 'C';
        if (inM) return 'M';
        if (inN) return 'N';
        if (inK) return 'K';
        return 'O';
    }, [dimTypes]);

    /**
     * Returns the color code for a given dimension type
     */
    const getLetterColor = useCallback((dimensionType) => {
        switch (dimensionType) {
            case 'C': return '#62c8d3';
            case 'M': return '#007191';
            case 'N': return '#d31f11';
            case 'K': return '#f47a00';
            default: return '#999';
        }
    }, []);

    /**
     * Creates a colored HTML label for node display
     */
    const createColoredLabel = useCallback((nodeType) => {
        let text;
        if (nodeType === 'root') {
            text = node;
        } else if (nodeType === 'left') {
            text = left;
        } else if (nodeType === 'right') {
            text = right;
        }

        if (!Array.isArray(text) || text.length === 0) {
            return {
                html: '-',
                fullText: '-',
                indices: []
            };
        }

        const fullText = text.join('');
        const truncateThreshold = miniFlow.nodeWidth < 100 ? 8 : 12;
        const shouldTruncate = fullText.length > truncateThreshold;

        const createColoredHtml = (letters) => {
            return letters
                .map((letter) => {
                    const dimensionType = determineDimensionType(letter);
                    const color = getLetterColor(dimensionType);
                    return `<span style="color: ${color};">${letter}</span>`;
                })
                .join(',');
        };

        const truncatedHtml = shouldTruncate ?
            '...' + createColoredHtml(text.slice(-3)) :
            createColoredHtml(text);

        return {
            html: truncatedHtml,
            fullText: fullText,
            indices: text
        };
    }, [miniFlow, node, left, right, determineDimensionType, getLetterColor]);

    // Calculate positions for the tree nodes
    const nodeData = useMemo(() => {
        const centerX = miniFlow.width / 2;
        // Reduce the vertical spacing to make better use of the container
        const rootY = miniFlow.height * 0.2;
        const childrenY = miniFlow.height * 0.75;

        // Calculate horizontal spacing based on whether there are one or two children
        const hasRightChild = right !== undefined && right.length > 0;
        const leftX = hasRightChild ? centerX - miniFlow.width * 0.25 : centerX;
        const rightX = centerX + miniFlow.width * 0.25;

        // Node size
        const nodeSize = {
            width: miniFlow.nodeWidth,
            height: miniFlow.nodeHeight,
            fontSize: miniFlow.fontSize
        };

        const rootNodeData = createColoredLabel('root');
        const leftNodeData = createColoredLabel('left');
        const rightNodeData = hasRightChild ? createColoredLabel('right') : null;

        return {
            root: {
                position: { x: centerX, y: rootY },
                size: nodeSize,
                ...rootNodeData
            },
            left: {
                position: { x: leftX, y: childrenY },
                size: nodeSize,
                ...leftNodeData
            },
            right: hasRightChild ? {
                position: { x: rightX, y: childrenY },
                size: nodeSize,
                ...rightNodeData
            } : null,
            hasRightChild
        };
    }, [miniFlow, createColoredLabel, right]);

    // SVG paths for connecting the nodes
    const connectionPaths = useMemo(() => {
        const { root, left, right, hasRightChild } = nodeData;

        // Calculate midpoint for vertical lines
        const midY = (root.position.y + left.position.y) / 2;
        const cornerRadius = 5; // Radius for rounded corners

        // Create path with rounded corners using arc commands
        const rootToLeftPath = `
            M${root.position.x},${root.position.y + root.size.height / 2}
            L${root.position.x},${midY - cornerRadius}
            Q${root.position.x},${midY} ${root.position.x + Math.sign(left.position.x - root.position.x) * cornerRadius},${midY}
            L${left.position.x - Math.sign(left.position.x - root.position.x) * cornerRadius},${midY}
            Q${left.position.x},${midY} ${left.position.x},${midY + cornerRadius}
            L${left.position.x},${left.position.y - left.size.height / 2}
        `;

        // Path from root to right child with rounded corners, if it exists
        const rootToRightPath = hasRightChild ? `
            M${root.position.x},${root.position.y + root.size.height / 2}
            L${root.position.x},${midY - cornerRadius}
            Q${root.position.x},${midY} ${root.position.x + Math.sign(right.position.x - root.position.x) * cornerRadius},${midY}
            L${right.position.x - Math.sign(right.position.x - root.position.x) * cornerRadius},${midY}
            Q${right.position.x},${midY} ${right.position.x},${midY + cornerRadius}
            L${right.position.x},${right.position.y - right.size.height / 2}
        ` : null;

        return {
            rootToLeftPath,
            rootToRightPath
        };
    }, [nodeData]);

    return (
        <div
            className="relative w-full h-full"
            style={{
                width: `${miniFlow.width}px`,
                height: `${Math.min(miniFlow.height, miniFlow.width * 1)}px`,
                padding: 0,
                margin: 0,
                overflow: 'hidden'
            }}
        >
            {/* SVG layer for connections */}
            <svg
                width="100%"
                height="100%"
                style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    zIndex: 1,
                    overflow: 'visible',
                    display: 'block' // Prevents any white space
                }}
                preserveAspectRatio="xMidYMid meet"
                viewBox={`0 0 ${miniFlow.width} ${Math.min(miniFlow.height, miniFlow.width * 0.8)}`}
            >
                <path
                    d={connectionPaths.rootToLeftPath}
                    fill="none"
                    stroke="#999"
                    strokeWidth="1.5"
                    strokeLinejoin="round"
                />
                {connectionPaths.rootToRightPath && (
                    <path
                        d={connectionPaths.rootToRightPath}
                        fill="none"
                        stroke="#999"
                        strokeWidth="1.5"
                        strokeLinejoin="round"
                    />
                )}
            </svg>

            {/* Node layer */}
            <div className="absolute top-0 left-0 w-full h-full">
                <TensorNode
                    id="root"
                    position={nodeData.root.position}
                    size={nodeData.root.size}
                    html={nodeData.root.html}
                    indices={nodeData.root.indices}
                    onIndicesChange={onIndicesChange}
                    isDragging={isDragging}
                />
                <TensorNode
                    id="left"
                    position={nodeData.left.position}
                    size={nodeData.left.size}
                    html={nodeData.left.html}
                    indices={nodeData.left.indices}
                    onIndicesChange={onIndicesChange}
                    isDragging={isDragging}
                />
                {nodeData.right && (
                    <TensorNode
                        id="right"
                        position={nodeData.right.position}
                        size={nodeData.right.size}
                        html={nodeData.right.html}
                        indices={nodeData.right.indices}
                        onIndicesChange={onIndicesChange}
                        isDragging={isDragging}
                    />
                )}
            </div>
        </div>
    );
};

export default SimpleTensorTree;
