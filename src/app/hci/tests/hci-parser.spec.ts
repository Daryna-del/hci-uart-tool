import { HciEventParser } from '../hci-parser';

const bytes = (...values: number[]) => new Uint8Array(values);

describe('HciEventParser', () => {
    it('parses the Reset response from the task log', () => {
        const events = new HciEventParser().push(bytes(0x04, 0x0e, 0x04, 0x01, 0x03, 0x0c, 0x00));

        expect(events).toEqual([{ numCommandPackets: 1, opcode: 0x0c03, status: 0x00, params: bytes() }]);
    });

    it('parses the Read BD_ADDR response from the task log', () => {
        const events = new HciEventParser().push(
            bytes(0x04, 0x0e, 0x0a, 0x01, 0x09, 0x10, 0x00, 0xe0, 0x5b, 0x20, 0x6a, 0x70, 0x20),
        );

        expect(events).toEqual([
            { numCommandPackets: 1, opcode: 0x1009, status: 0x00, params: bytes(0xe0, 0x5b, 0x20, 0x6a, 0x70, 0x20) },
        ]);
    });

    it('waits for the rest of a packet split across chunks', () => {
        const parser = new HciEventParser();

        expect(parser.push(bytes(0x04, 0x0e))).toEqual([]);
        expect(parser.push(bytes(0x04, 0x01, 0x03, 0x0c, 0x00))).toEqual([
            { numCommandPackets: 1, opcode: 0x0c03, status: 0x00, params: bytes() },
        ]);
    });

    it('parses two packets that arrive in one chunk', () => {
        const events = new HciEventParser().push(
            bytes(0x04, 0x0e, 0x04, 0x01, 0x03, 0x0c, 0x00, 0x04, 0x0e, 0x04, 0x01, 0x01, 0xfc, 0x00),
        );

        expect(events.map((e) => e.opcode)).toEqual([0x0c03, 0xfc01]);
    });

    it('skips garbage before a packet', () => {
        const events = new HciEventParser().push(bytes(0xff, 0x00, 0x04, 0x0e, 0x04, 0x01, 0x03, 0x0c, 0x00));

        expect(events).toEqual([{ numCommandPackets: 1, opcode: 0x0c03, status: 0x00, params: bytes() }]);
    });

    it('ignores events other than Command Complete', () => {
        const commandStatus = bytes(0x04, 0x0f, 0x04, 0x00, 0x01, 0x03, 0x0c);

        expect(new HciEventParser().push(commandStatus)).toEqual([]);
    });

    it('passes a non-zero status through', () => {
        const [event] = new HciEventParser().push(bytes(0x04, 0x0e, 0x04, 0x01, 0x03, 0x0c, 0x12));

        expect(event.status).toBe(0x12);
    });
});