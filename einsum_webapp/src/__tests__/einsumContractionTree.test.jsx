import { Tree, Node, parseTree, reconstructNode } from '../components/utils/einsumContractionTree.jsx';

describe('Tree Operations', () => {
    let tree;

    beforeEach(() => {
        tree = new Tree();
    });

    test('creates empty tree', () => {
        expect(tree.getRoot()).toBeNull();
    });

    test('parses simple tree string', () => {
        tree = new Tree('[i,j]->[j]');
        expect(tree.getRoot()).not.toBeNull();
        expect(tree.getRoot().value).toEqual(['j']);
    });

    test('handles index size updates', () => {
        tree = new Tree('[i,j]->[j]');
        tree.updateIndexSizes({ 'i': 3, 'j': 4 });
        expect(tree.indexSizes).toEqual({ 'i': 3, 'j': 4 });
        expect(tree.root.sizes).toEqual([4]); // root node has [j] so size should be [4]
    });

    test('converts tree to string', () => {
        tree = new Tree('[i,j]->[j]');
        expect(tree.treeToString()).toBe('[i,j]->[j]');
    });

    test('swaps children correctly', () => {
        tree = new Tree('[[i,j]->[j]],[[k,l]->[l]]->[j,l]');
        const rootId = tree.getRoot().id;
        tree.swapChildren(rootId);
        expect(tree.treeToString()).toBe('[[k,l]->[l]],[[i,j]->[j]]->[j,l]');
    });

    test('clones tree correctly', () => {
        tree = new Tree('[i,j]->[j]');
        const clonedTree = tree.clone();
        expect(clonedTree.treeToString()).toBe(tree.treeToString());
        expect(clonedTree.root).not.toBe(tree.root); // Should be different object references
    });
});

describe('Node Operations', () => {
    test('creates leaf node', () => {
        const node = new Node(['i', 'j']);
        expect(node.isLeaf()).toBe(true);
        expect(node.value).toEqual(['i', 'j']);
        expect(node.string).toBe('ij');
    });

    test('reconstructs node from object', () => {
        const originalNode = new Node(['i', 'j']);
        const nodeData = {
            id: originalNode.id,
            value: ['i', 'j'],
            left: null,
            right: null,
            string: 'ij',
            sizes: [2, 3],
            deleteAble: false
        };

        const reconstructedNode = reconstructNode(nodeData);
        expect(reconstructedNode.value).toEqual(originalNode.value);
        expect(reconstructedNode.string).toBe(originalNode.string);
    });
});

describe('Tree Error Handling', () => {
    test('handles invalid tree string', () => {
        const tree = new Tree('[i,j->j]'); // Missing brackets
        expect(tree.getRoot()).toBeNull();
    });

    test('handles empty string', () => {
        const tree = new Tree('');
        expect(tree.getRoot()).toBeNull();
    });

    test('validates node removal', () => {
        const tree = new Tree('[[i,j]->[j,i]],[[k,l]->[l,k]]->[j,l]');
        const rootId = tree.getRoot().id;
        expect(tree.removePermutationNode(rootId)).toBe(false); // Should not remove non-deleteable node
    });
});

describe('Tree Permutation Operations', () => {
    test('adds permutation node', () => {
        const tree = new Tree('[i,j]->[j]');
        const nodeId = tree.getRoot().id;
        expect(tree.addPermutationNode(nodeId)).toBe(true);
        expect(tree.getRoot().deleteAble).toBe(true);
    });

    test('creates subtree expression', () => {
        const tree = new Tree('[[i,j]->[j,i]],[[k,l]->[l,k]]->[j,l]');
        const leftNodeId = tree.getRoot().left.id;
        const leftLeftNodeId = tree.getRoot().left.left.id;
        const expression = tree.createSubtreeExpression([leftNodeId, leftLeftNodeId]);
        expect(expression).toBe('[i,j]->[j,i]');
    });
});
