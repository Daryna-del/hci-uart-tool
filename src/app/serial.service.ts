import { Injectable, signal } from '@angular/core';

export const BAUD_RATE = 115200;
const FLOW_CONTROL: FlowControlType = 'hardware';

@Injectable({ providedIn: 'root' })
export class SerialService {
    readonly isSupported = 'serial' in navigator;
    readonly connected = signal(false);

    private port: SerialPort | null = null;
    private reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
    private keepReading = false;
    private readLoopDone = Promise.resolve();
    private onData: (chunk: Uint8Array) => void = () => { };

    setDataListener(listener: (chunk: Uint8Array) => void): void {
        this.onData = listener;
    }

    async connect(): Promise<void> {
        const port = await navigator.serial.requestPort();
        await port.open({ baudRate: BAUD_RATE, flowControl: FLOW_CONTROL });

        this.port = port;
        this.keepReading = true;
        this.connected.set(true);
        this.readLoopDone = this.readLoop(port);
    }

    async write(bytes: Uint8Array): Promise<void> {
        if (!this.port?.writable) throw new Error('Port is not open');

        const writer = this.port.writable.getWriter();
        try {
            await writer.write(bytes);
        } finally {
            writer.releaseLock();
        }
    }

    async disconnect(): Promise<void> {
        this.keepReading = false;
        await this.reader?.cancel();
        await this.readLoopDone;
    }

    private async readLoop(port: SerialPort): Promise<void> {
        while (this.keepReading && port.readable) {
            const reader = port.readable.getReader();
            this.reader = reader;
            try {
                while (true) {
                    const { value, done } = await reader.read();
                    if (done) break;
                    this.onData(value);
                }
            } catch {
            } finally {
                reader.releaseLock();
            }
        }

        await port.close().catch(() => undefined);
        this.port = null;
        this.reader = null;
        this.connected.set(false);
    }
}
