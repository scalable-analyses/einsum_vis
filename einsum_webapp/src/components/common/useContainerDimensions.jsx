import { useState, useEffect } from 'react';

export const useContainerDimensions = (ref) => {
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

    useEffect(() => {
        const getDimensions = () => ({
            width: ref.current.offsetWidth,
            height: ref.current.offsetHeight
        });

        const handleResize = () => {
            setDimensions(getDimensions());
        };

        if (ref.current) {
            setDimensions(getDimensions());
        }

        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
        };
    }, [ref]);

    return dimensions;
};
