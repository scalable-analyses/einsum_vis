import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { act } from 'react';
import '@testing-library/jest-dom';
import IndexSizeInput from '../components/visual/IndexSizeInput.jsx';

describe('IndexSizeInput', () => {
    const mockSetIndexSizes = jest.fn();
    const mockOnUpdate = jest.fn();
    const initialSizes = { 'i': 2, 'j': 3 };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders tab buttons correctly', () => {
        render(
            <IndexSizeInput
                indexSizes={initialSizes}
                setIndexSizes={mockSetIndexSizes}
                onUpdate={mockOnUpdate}
            />
        );

        expect(screen.getByText(/individual inputs/i)).toBeInTheDocument();
        expect(screen.getByText(/bulk input/i)).toBeInTheDocument();
    });

    test('validates negative input values', async () => {
        render(
            <IndexSizeInput
                indexSizes={initialSizes}
                setIndexSizes={mockSetIndexSizes}
                onUpdate={mockOnUpdate}
            />
        );

        const iInput = screen.getByRole('spinbutton', { name: /i:/i });

        // Change the value to negative
        await act(async () => {
            fireEvent.change(iInput, { target: { value: '-1' } });
        });

        // Verify the negative value is set in the temporary state
        expect(iInput).toHaveValue(-1);

        // Try to update with negative value
        const updateButton = screen.getByRole('button', { name: /update sizes/i });
        await act(async () => {
            fireEvent.click(updateButton);
        });

        // Add validation message check if your component shows one
        expect(mockSetIndexSizes).not.toHaveBeenCalled();
        expect(mockOnUpdate).not.toHaveBeenCalled();
    });

    test('handles size input changes', async () => {
        const { rerender } = render(
            <IndexSizeInput
                indexSizes={initialSizes}
                setIndexSizes={mockSetIndexSizes}
                onUpdate={mockOnUpdate}
            />
        );

        const iInput = screen.getByRole('spinbutton', { name: /i:/i });

        await act(async () => {
            fireEvent.change(iInput, { target: { value: '4' } });
        });

        rerender(
            <IndexSizeInput
                indexSizes={{ ...initialSizes, i: 4 }}
                setIndexSizes={mockSetIndexSizes}
                onUpdate={mockOnUpdate}
            />
        );

        expect(iInput).toHaveValue(4);

        const updateButton = screen.getByRole('button', { name: /update sizes/i });

        await act(async () => {
            fireEvent.click(updateButton);
        });

        expect(mockSetIndexSizes).toHaveBeenCalledWith({
            i: 4,
            j: 3
        });
    });
});