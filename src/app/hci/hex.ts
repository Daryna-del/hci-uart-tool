// [0x01, 0x03, 0x0c] -> "01 03 0C"
export function toHex(bytes: Uint8Array, separator = ' '): string {
  return [...bytes].map((byte) => byte.toString(16).toUpperCase().padStart(2, '0')).join(separator);
}
