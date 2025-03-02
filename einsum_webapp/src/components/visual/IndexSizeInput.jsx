import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs.jsx";
import CollapsiblePanel from '../common/CollapsiblePanel.jsx';
import { Toast } from '../common/Toast.jsx';

const IndexSizeInput = ({ indexSizes, setIndexSizes, onUpdate }) => {
  const initializeTempSizes = (sizes) => {
    const temp = {};
    Object.keys(sizes).forEach(key => {
      temp[key] = sizes[key] || 0; // Default to 0 if undefined
    });
    return temp;
  };

  const sortIndices = (indices) => {
    return indices.sort((a, b) => {
      // First check if both are numbers
      const numA = parseInt(a, 10);
      const numB = parseInt(b, 10);
      if (!isNaN(numA) && !isNaN(numB)) {
        return numA - numB;
      }

      // If either is a number, put numbers first
      if (!isNaN(numA)) return -1;
      if (!isNaN(numB)) return 1;

      // Group uppercase and lowercase
      const isUpperA = /[A-Z]/.test(a);
      const isUpperB = /[A-Z]/.test(b);

      // If they're in different groups (upper vs lower)
      if (isUpperA !== isUpperB) {
        return isUpperA ? -1 : 1;
      }

      // Within the same group, sort alphabetically
      return a.localeCompare(b);
    });
  };

  const [bulkInput, setBulkInput] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [tempIndexSizes, setTempIndexSizes] = useState(() => initializeTempSizes(indexSizes));
  const [activeTab, setActiveTab] = useState('individual');
  const [sortedIndices, setSortedIndices] = useState(() =>
    sortIndices([...Object.keys(indexSizes)])
  );

  // Add a ref to track initial render
  const isInitialMount = useRef(true);

  const checkNeedsUpdate = useCallback((current, target) => {
    const currentIndices = Object.keys(current);
    const targetIndices = Object.keys(target);

    return targetIndices.length !== currentIndices.length ||
      targetIndices.some(key => !currentIndices.includes(key));
  }, []);

  useEffect(() => {
    const newSortedIndices = sortIndices([...Object.keys(indexSizes)]);
    setSortedIndices(newSortedIndices);
  }, [indexSizes]);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    if (checkNeedsUpdate(tempIndexSizes, indexSizes)) {
      setTempIndexSizes(initializeTempSizes(indexSizes));
    }

    if (!isEditing) {
      const sortedSizes = sortedIndices.map(index => indexSizes[index]);
      setBulkInput(sortedSizes.join(', '));
    }
  }, [indexSizes, isEditing, sortedIndices, checkNeedsUpdate, tempIndexSizes]);  // Remove tempIndexSizes from dependencies

  const handleInputChange = (index, value) => {
    const numValue = parseInt(value, 10);
    setTempIndexSizes(prev => ({
      ...prev,
      [index]: isNaN(numValue) ? 0 : numValue
    }));
  };

  const handleBulkInputChange = (e) => {
    setBulkInput(e.target.value);
    setIsEditing(true);
  };

  const handleUpdateSizes = () => {
    if (activeTab === "individual") {
      const hasNegativeValues = Object.values(tempIndexSizes).some(value => value < 0);

      if (hasNegativeValues) {
        Toast.show('Index sizes cannot be negative');
        return;
      }
      setIndexSizes(tempIndexSizes);
      onUpdate(tempIndexSizes);
    } else {
      // Bulk input logic
      if (!bulkInput.trim()) {
        return;
      }

      try {
        const values = bulkInput.split(/[,\s]+/).filter(Boolean);

        if (values.length !== sortedIndices.length) {
          Toast.show(`Please provide ${sortedIndices.length} values (one for each index)`);
          return;
        }

        const newSizes = {};
        sortedIndices.forEach((index, i) => {
          const numValue = parseInt(values[i], 10);
          if (isNaN(numValue)) {
            throw new Error(`Invalid number: ${values[i]}`);
          }
          newSizes[index] = numValue;
        });

        setIndexSizes(newSizes);
        setTempIndexSizes(newSizes);
        onUpdate(newSizes);
        setIsEditing(false);
      } catch (error) {
        Toast.show(`Error parsing input: ${error.message}`);
      }
    }
  };

  return (
    <CollapsiblePanel title="Tensor Sizes">
      <Tabs defaultValue="individual" className="w-full" onValueChange={setActiveTab} >
        <TabsList className="grid w-full grid-cols-2 mb-4 bg-gray-100 p-1 rounded-lg">
          <TabsTrigger
            value="individual"
            className="data-[state=active]:bg-white data-[state=active]:shadow-md py-2 rounded-md"
          >
            Individual Inputs
          </TabsTrigger>
          <TabsTrigger
            value="bulk"
            className="data-[state=active]:bg-white data-[state=active]:shadow-md py-2 rounded-md"
          >
            Bulk Input
          </TabsTrigger>
        </TabsList>

        <TabsContent value="individual">
          <div className="grid grid-cols-2 gap-4">
            {sortedIndices.map((index) => (
              <div key={index} className="flex items-center">
                <label htmlFor={`index-${index}`} className="font-medium mr-2">{index}:</label>
                <input
                  id={`index-${index}`}
                  type="number"
                  value={tempIndexSizes[index] ?? 0} // Add fallback value
                  onChange={(e) => handleInputChange(index, e.target.value)}
                  className="w-20 p-1 border border-gray-300 rounded-md"
                />
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="bulk">
          <div className="space-y-4">
            {sortedIndices.length > 0 && (
              <>
                <div>
                  <label className="block mb-2 text-sm font-medium">
                    Enter all sizes (comma or space separated):
                  </label>
                  <input
                    type="text"
                    value={bulkInput}
                    onChange={handleBulkInputChange}
                    onFocus={() => setIsEditing(true)}
                    placeholder="e.g., 2,3,4 or 2 3 4"
                    className="w-full p-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div className="text-sm text-gray-500">
                  Current indices (sorted): {sortedIndices.join(', ')}
                </div>
              </>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {sortedIndices.length > 0 && (
        <button
          onClick={handleUpdateSizes}
          className="mt-4 px-5 py-2 bg-[#1e3a5f] text-white rounded-md w-full transition-all duration-300 shadow-md hover:shadow-lg focus:outline-none focus:ring-2 "
        >
          Update Sizes
        </button>
      )}
    </CollapsiblePanel>
  );
};

export default IndexSizeInput;