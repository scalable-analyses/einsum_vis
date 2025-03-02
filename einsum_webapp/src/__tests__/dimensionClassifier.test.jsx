import { dimensionTypes } from '../components/utils/dimensionClassifier.jsx';

describe('DimensionClassifier', () => {
    test('classifies CB dimension correctly', () => {
        const node = ['i', 'j', 'k'];
        const left = ['i', 'j', 'k'];
        const right = ['i', 'j', 'k'];

        const result = dimensionTypes(node, left, right);

        expect(result.primitive.cb).toContain('k');
        expect(result.primitive.cb).toContain('j');
        expect(result.primitive.cb).toContain('i');
    });

    test('classifies BM dimension correctly', () => {
        const node = ['i', 'j', 'k', 'l', 'm'];
        const left = ['i', 'j', 'k'];
        const right = ['l', 'm'];

        const result = dimensionTypes(node, left, right);

        expect(result.loop.bm).toContain('j');
        expect(result.loop.bm).toContain('i');
        expect(result.loop.bm).toContain('k');
    });

    test('classifies BN dimension correctly', () => {
        const node = ['i', 'j', 'k', 'l', 'm'];
        const left = ['k', 'l'];
        const right = ['i', 'j', 'm'];

        const result = dimensionTypes(node, left, right);

        expect(result.loop.bn).toContain('j');
        expect(result.loop.bn).toContain('i');
    });

    test('classifies KB dimension correctly', () => {
        const node = ['k', 'm'];
        const left = ['k', 'm', 'n'];
        const right = ['k', 'm', 'n'];

        const result = dimensionTypes(node, left, right);

        expect(result.primitive.kb).toContain('n');
    });

    test('classifies loop dimensions correctly', () => {
        const node = ['i', 'j'];
        const left = ['i', 'k'];
        const right = ['k', 'j'];

        const result = dimensionTypes(node, left, right);

        expect(result.loop.bm).toContain('i');
        expect(result.primitive.nb).toContain('j');
        expect(result.loop.bk).toContain('k');
    });

    test('handles empty arrays', () => {
        const result = dimensionTypes([], [], []);

        expect(result.primitive.cb).toHaveLength(0);
        expect(result.primitive.mb).toHaveLength(0);
        expect(result.primitive.nb).toHaveLength(0);
        expect(result.primitive.kb).toHaveLength(0);
        expect(result.loop.bc).toHaveLength(0);
        expect(result.loop.bm).toHaveLength(0);
        expect(result.loop.bn).toHaveLength(0);
        expect(result.loop.bk).toHaveLength(0);
    });

    test('complex contraction pattern', () => {
        const node = ['m', 'n', 'o'];
        const left = ['m', 'k', 'l'];
        const right = ['k', 'l', 'n', 'o'];

        const result = dimensionTypes(node, left, right);

        expect(result.loop.bm).toContain('m');
        expect(result.primitive.nb).toContain('n');
        expect(result.primitive.nb).toContain('o');
        expect(result.loop.bk).toContain('l', 'k');
    });

    test('complex contraction pattern 2', () => {
        const node = ["0", "1", "2", "3"];
        const left = ["9", "5", "6", "0", "2", "3"];
        const right = ["1", "5", "6", "9"];

        const result = dimensionTypes(node, left, right);
        expect(result.primitive.cb).toHaveLength(0);
        expect(result.primitive.mb).toEqual(["2", "3"]);
        expect(result.primitive.nb).toEqual(["1"]);
        expect(result.primitive.kb).toEqual(["9"]);
        expect(result.loop.bc).toHaveLength(0);
        expect(result.loop.bm).toEqual(["0"]);
        expect(result.loop.bn).toHaveLength(0);
        expect(result.loop.bk).toEqual(["5", "6"]);
    });

    test('complex contraction pattern 3', () => {
        const node = ["5", "1", "2", "7"];
        const left = ["6", "2", "7"];
        const right = ["5", "1", "6"];

        const result = dimensionTypes(node, left, right);
        expect(result.primitive.cb).toHaveLength(0);
        expect(result.primitive.mb).toEqual(["2", "7"]);
        expect(result.primitive.nb).toEqual(["5", "1"]);
        expect(result.primitive.kb).toEqual(["6"]);
        expect(result.loop.bc).toHaveLength(0);
        expect(result.loop.bm).toHaveLength(0);
        expect(result.loop.bn).toHaveLength(0);
        expect(result.loop.bk).toHaveLength(0);
    });
    test('complex contraction pattern 4', () => {
        const node = ["7", "6", "5", "4", "8"];
        const left = ["6", "0", "2", "4", "8"];
        const right = ["7", "5", "2", "0"];

        const result = dimensionTypes(node, left, right);
        expect(result.primitive.cb).toHaveLength(0);
        expect(result.primitive.mb).toEqual(["4", "8"]);
        expect(result.primitive.nb).toEqual(["5"]);
        expect(result.primitive.kb).toEqual(["0"]);
        expect(result.loop.bc).toHaveLength(0);
        expect(result.loop.bm).toEqual(["6"]);
        expect(result.loop.bn).toEqual(["7"]);
        expect(result.loop.bk).toEqual(["2"]);
    });

    test('complex contraction pattern 5', () => {
        const node = ["0", "1", "2", "3"];
        const left = ["4", "2", "5", "3"];
        const right = ["0", "1", "4", "5"];

        const result = dimensionTypes(node, left, right);
        expect(result.primitive.cb).toHaveLength(0);
        expect(result.primitive.mb).toEqual(["3"]);
        expect(result.primitive.nb).toEqual(["0", "1"]);
        expect(result.primitive.kb).toEqual(["5"]);
        expect(result.loop.bc).toHaveLength(0);
        expect(result.loop.bm).toEqual(["2"]);
        expect(result.loop.bn).toHaveLength(0);
        expect(result.loop.bk).toEqual(["4"]);
    });

    test('complex contraction pattern 6', () => {
        const node = ["0", "1", "2", "3"];
        const left = ["4", "5", "2", "3"];
        const right = ["1", "5", "4", "0"];

        const result = dimensionTypes(node, left, right);
        expect(result.primitive.cb).toHaveLength(0);
        expect(result.primitive.mb).toEqual(["2", "3"]);
        expect(result.primitive.nb).toEqual(["0"]);
        expect(result.primitive.kb).toHaveLength(0);
        expect(result.loop.bc).toHaveLength(0);
        expect(result.loop.bm).toHaveLength(0);
        expect(result.loop.bn).toEqual(["1"]);
        expect(result.loop.bk).toEqual(["4", "5"]);
    });
});
