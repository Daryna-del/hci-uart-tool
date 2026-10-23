const HCI_EVENT_PACKET = 0x04;
const COMMAND_COMPLETE_EVENT = 0x0e;
const HEADER_LENGTH = 3;

export interface CommandComplete {
    numCommandPackets: number;
    opcode: number;
    status: number;
    params: Uint8Array;
}

export class HciEventParser {
    private buffer: number[] = [];

    push(chunk: Uint8Array): CommandComplete[] {
        this.buffer.push(...chunk);
        const events: CommandComplete[] = [];

        while (this.buffer.length > 0) {
            if (this.buffer[0] !== HCI_EVENT_PACKET) {
                this.buffer.shift();
                continue;
            }
            if (this.buffer.length < HEADER_LENGTH) break;

            const packetLength = HEADER_LENGTH + this.buffer[2];
            if (this.buffer.length < packetLength) break;

            const packet = this.buffer.splice(0, packetLength);
            if (packet[1] === COMMAND_COMPLETE_EVENT) {
                events.push({
                    numCommandPackets: packet[3],
                    opcode: packet[4] | (packet[5] << 8),
                    status: packet[6],
                    params: new Uint8Array(packet.slice(7)),
                });
            }
        }
        return events;
    }
}