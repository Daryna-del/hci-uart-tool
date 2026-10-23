import { toHex } from '../hex';

describe('toHex', () => {
    it('formats bytes as space-separated uppercase hex', () => {
        expect(toHex(new Uint8Array([0x01, 0x03, 0x0c, 0x00]))).toBe('01 03 0C 00');
    });

    it('uses the given separator', () => {
        expect(toHex(new Uint8Array([0xe0, 0x05]), ':')).toBe('E0:05');
    });
});