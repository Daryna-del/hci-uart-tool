import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { App } from './app';
import { HciService } from './hci.service';
import { SerialService } from './serial.service';

function createFakeHci() {
  return {
    busy: signal(false),
    log: signal<string[]>([]),
    reset: vi.fn().mockResolvedValue(undefined),
    readBdAddr: vi.fn().mockResolvedValue('20:70:6A:20:5B:E0'),
    writeBdAddr: vi.fn().mockResolvedValue(undefined),
  };
}

describe('App', () => {
  let hci: ReturnType<typeof createFakeHci>;
  let fixture: ComponentFixture<App>;
  let page: HTMLElement;

  beforeEach(async () => {
    hci = createFakeHci();
    TestBed.configureTestingModule({
      imports: [App],
      providers: [
        { provide: SerialService, useValue: { isSupported: true, connected: signal(true) } },
        { provide: HciService, useValue: hci },
      ],
    });
    fixture = TestBed.createComponent(App);
    page = fixture.nativeElement;
    await fixture.whenStable();
  });

  // Clicks a button by its label and waits until the async handler has updated the page.
  async function click(label: string): Promise<void> {
    const button = [...page.querySelectorAll('button')].find(
      (b) => b.textContent?.trim() === label,
    );
    button!.click();
    await new Promise((resolve) => setTimeout(resolve));
    await fixture.whenStable();
  }

  function typeBdAddr(text: string): void {
    page.querySelector('input')!.value = text;
  }

  it('renders the app name', () => {
    expect(page.querySelector('h1')?.textContent).toContain('HCI UART Tool');
  });

  it('shows the address returned by Read BD_ADDR', async () => {
    await click('Read BD_ADDR');

    expect(page.querySelector('.bd-addr')?.textContent).toBe('20:70:6A:20:5B:E0');
  });

  it('shows an error for an invalid BD_ADDR and sends nothing', async () => {
    typeBdAddr('12:34');

    await click('Write BD_ADDR');

    expect(page.querySelector('.error')?.textContent).toContain('Invalid BD_ADDR');
    expect(hci.writeBdAddr).not.toHaveBeenCalled();
  });

  it('writes a valid BD_ADDR and reads it back', async () => {
    hci.readBdAddr.mockResolvedValue('11:22:33:44:55:66');
    typeBdAddr('11:22:33:44:55:66');

    await click('Write BD_ADDR');

    expect(hci.writeBdAddr).toHaveBeenCalledWith(
      new Uint8Array([0x11, 0x22, 0x33, 0x44, 0x55, 0x66]),
    );
    expect(page.querySelector('.bd-addr')?.textContent).toBe('11:22:33:44:55:66');
  });

  it('shows device errors', async () => {
    hci.reset.mockRejectedValue(new Error('Device did not respond in time'));

    await click('HCI Reset');

    expect(page.querySelector('.error')?.textContent).toContain('Device did not respond in time');
  });
});
