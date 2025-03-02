import { useState, useEffect } from 'react';

/**
 * Custom hook for responsive design that handles device size detection and layout calculations
 * @returns {Object} Device dimensions and panel sizing functions
 */
const useDeviceSize = () => {
    /**
     * Calculates effective width and device type based on screen size, device pixel ratio and features
     * @returns {Object} Object containing width, height and device type flags
     */
    const getEffectiveWidth = () => {
        const effectiveWidth = window.innerWidth;
        const effectiveHeight = window.innerHeight;
        const pixelRatio = window.devicePixelRatio || 1;

        // Check for touch capability as an indicator for mobile/tablet
        const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

        // Use media queries for more accurate device detection
        const isNarrowScreen = window.matchMedia('(max-width: 480px)').matches;
        const isMediumScreen = window.matchMedia('(min-width: 481px) and (max-width: 1024px)').matches;
        const isCoarsePointer = window.matchMedia('(pointer: coarse)').matches;

        // Consider both screen size and interaction mode
        const isMobile = isNarrowScreen || (hasTouch && isCoarsePointer && effectiveWidth <= 600);
        const isTablet = isMediumScreen ||
            (hasTouch && effectiveWidth <= 1024 && !isMobile);
        const isDesktop = !isMobile && !isTablet;

        return {
            width: effectiveWidth,
            height: effectiveHeight,
            pixelRatio,
            hasTouch,
            isMobile,
            isTablet,
            isDesktop
        };
    };

    const [dimensions, setDimensions] = useState(getEffectiveWidth());

    /**
     * Effect hook to handle window resize and orientation changes
     */
    useEffect(() => {
        const handleResize = () => setDimensions(getEffectiveWidth());
        window.addEventListener('resize', handleResize);
        window.addEventListener('orientationchange', handleResize);
        return () => {
            window.removeEventListener('resize', handleResize);
            window.removeEventListener('orientationchange', handleResize);
        };
    }, []);

    /**
     * Calculates dimensions for the information panel based on current device size
     * @returns {Object} Object containing panel dimensions and styling parameters
     */
    const getInfoPanelDimensions = () => {
        const { width, height, pixelRatio, isMobile, isTablet } = dimensions;

        // Adjust for high-DPI displays by scaling relative to pixel density
        const baseWidth = 1440; // Reference width
        // Normalize scaling based on both screen size and pixel ratio
        const normalizedWidth = width / pixelRatio;
        const scaleFactor = Math.min(Math.max(normalizedWidth / (baseWidth / 1.5), 0.85), 1.1);

        if (isMobile) {
            const panelWidth = Math.min(320, width * 0.92);
            return {
                panelWidth,
                fontSize: 14 * Math.min(pixelRatio * 0.85, 1.1),
                padding: 10,
                showMiniFlow: true,
                miniFlow: {
                    width: Math.min(260, panelWidth * 0.9),
                    height: 130,
                    nodeWidth: 90,
                    nodeHeight: 28,
                    fontSize: Math.max(11, 12 / (pixelRatio * 0.9)),
                    letterSize: Math.max(13, 14 / (pixelRatio * 0.9))
                }
            };
        }

        // Desktop - apply subtle scaling that won't dramatically change proportions
        const panelWidth = Math.min(340, width * 0.7);
        return {
            panelWidth,
            fontSize: 14,
            padding: 5,
            showMiniFlow: true,
            miniFlow: {
                width: 280,
                height: 150,
                nodeWidth: 110,
                nodeHeight: 30,
                fontSize: 14,
                letterSize: 18
            }
        };
    };

    return { ...dimensions, getInfoPanelDimensions };
};

export default useDeviceSize;
