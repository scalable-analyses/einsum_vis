import React from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../ui/tooltip.jsx";
import CollapsiblePanel from '../common/CollapsiblePanel.jsx';

/**
 * Maximum length for displayed expressions before truncation
 */
const maxLength = 200;

/**
 * Truncates a string expression if it exceeds the specified maximum length
 * @param {string} expression - The expression to truncate
 * @param {number} maxLength - Maximum length before truncation
 * @returns {string} Truncated expression with ellipsis if necessary
 */
const truncateExpression = (expression, maxLength = 200) => {
  if (expression.length <= maxLength) return expression;
  return `${expression.substring(0, maxLength)}...`;
};

/**
 * HistoryPanel component displays a collapsible list of historical expressions
 * with truncation and tooltip support
 * @param {Object} props - Component props
 * @param {Array} props.history - Array of historical expressions
 * @param {Function} props.onSelectTree - Callback function when an expression is selected
 * @param {Function} props.onClear - Callback function to clear the history
 * @returns {React.Component} HistoryPanel component
 */
const HistoryPanel = ({ history, onSelectTree, onClear }) => {
  return (
    <CollapsiblePanel
      title="History"
      headerContent={
        history.length > 0 && (
          <div
            onClick={(e) => {
              e.stopPropagation();
              onClear();
            }}
            className="px-2 py-1 text-sm text-red-600 hover:text-red-800 hover:bg-red-100 rounded-md transition-colors ml-auto cursor-pointer"
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClear();
              }
            }}
          >
            Clear
          </div>
        )
      }
    >
      <ul className="space-y-2">
        {history.map((item, index) => (
          <TooltipProvider key={index}>
            <Tooltip>
              <TooltipTrigger asChild>
                <li
                  className="cursor-pointer hover:bg-gray-100 p-2 rounded truncate"
                  onClick={() => onSelectTree(item)}
                >
                  {truncateExpression(item.expression, maxLength)}
                </li>
              </TooltipTrigger>
              {item.expression.length > maxLength && (
                <TooltipContent>
                  <p className="max-w-xs break-words">{item.expression}</p>
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        ))}
      </ul>
    </CollapsiblePanel>
  );
};

export default HistoryPanel;