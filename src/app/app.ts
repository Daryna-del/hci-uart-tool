import { Component, inject, signal } from '@angular/core';
import { parseBdAddr } from './hci/bd-addr';
import { HciService } from './hci.service';
import { SerialService } from './serial.service';

const INVALID_BD_ADDR = 'Invalid BD_ADDR: enter 12 hex digits, e.g. 11:22:33:44:55:66';

@Component({
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  protected readonly serial = inject(SerialService);
  protected readonly hci = inject(HciService);
  protected readonly bdAddr = signal('');
  protected readonly message = signal('');
  protected readonly error = signal('');

  protected connect(): Promise<void> {
    return this.run(() => this.serial.connect());
  }

  protected disconnect(): Promise<void> {
    return this.run(() => this.serial.disconnect());
  }

  protected reset(): Promise<void> {
    return this.run(async () => {
      await this.hci.reset();
      this.message.set('HCI Reset: Command Complete, status Success');
    });
  }

  protected readBdAddr(): Promise<void> {
    return this.run(async () => {
      this.bdAddr.set(await this.hci.readBdAddr());
    });
  }

  protected writeBdAddr(text: string): Promise<void> {
    return this.run(async () => {
      const address = parseBdAddr(text);
      if (!address) throw new Error(INVALID_BD_ADDR);

      await this.hci.writeBdAddr(address);
      this.bdAddr.set(await this.hci.readBdAddr()); // read back to confirm the new address
      this.message.set('BD_ADDR written');
    });
  }

  // Runs an action and shows its error message instead of letting it fail silently.
  private async run(action: () => Promise<unknown>): Promise<void> {
    this.error.set('');
    this.message.set('');
    try {
      await action();
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : String(e));
    }
  }
}
