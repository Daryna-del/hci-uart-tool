import { toHex } from './hex';

const BD_ADDR_HEX = /^[0-9a-f]{12}$/i;

export function parseBdAddr(text: string): Uint8Array | null {
  const hex = text.trim().replace(/[:-]/g, '');
  if (!BD_ADDR_HEX.test(hex)) return null;

  return Uint8Array.from(hex.match(/../g)!, (pair) => parseInt(pair, 16));
}

export function formatBdAddr(bytesFromDevice: Uint8Array): string {
  return toHex(bytesFromDevice.slice().reverse(), ':');
}
