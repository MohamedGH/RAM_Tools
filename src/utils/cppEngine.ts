// Emulation of bytes-tools.cpp and ram-tools.cpp in TypeScript

export class CppByteTools {
  /**
   * unsigned short get_short( char arr[], int index )
   * return ((arr[index+1] << 8) & 0xff00) | ((arr[index]) & 0x00ff);
   */
  static get_short(arr: Uint8Array | number[], index: number): number {
    const b0 = arr[index] ?? 0;
    const b1 = arr[index + 1] ?? 0;
    const short_value = ((b1 << 8) & 0xff00) | (b0 & 0x00ff);
    return short_value >>> 0;
  }

  /**
   * unsigned short get_swaped_short( char arr[], int index )
   * return ((arr[index] << 8) & 0xff00) | ((arr[index+1]) & 0x00ff);
   */
  static get_swaped_short(arr: Uint8Array | number[], index: number): number {
    const b0 = arr[index] ?? 0;
    const b1 = arr[index + 1] ?? 0;
    const short_value = ((b0 << 8) & 0xff00) | (b1 & 0x00ff);
    return short_value >>> 0;
  }

  /**
   * short swapShort( short short_value )
   * return ((short_value << 8) & 0xff00) | ((short_value >> 8) & 0x00ff);
   */
  static swapShort(short_value: number): number {
    // 16-bit signed integer
    const val = (short_value << 16) >> 16;
    const swapped = ((val << 8) & 0xff00) | ((val >> 8) & 0x00ff);
    // return as signed 16-bit
    return (swapped << 16) >> 16;
  }

  /**
   * int get_int( char arr[], int index )
   * Little-endian 32-bit int assembly
   */
  static get_int(arr: Uint8Array | number[], index: number): number {
    const b0 = (arr[index] ?? 0) & 0xff;
    const b1 = (arr[index + 1] ?? 0) & 0xff;
    const b2 = (arr[index + 2] ?? 0) & 0xff;
    const b3 = (arr[index + 3] ?? 0) & 0xff;

    const int_value =
      ((b3 << 24) & 0xff000000) |
      ((b2 << 16) & 0x00ff0000) |
      ((b1 << 8) & 0x0000ff00) |
      (b0 & 0x000000ff);

    return int_value | 0; // 32-bit signed int
  }

  /**
   * float get_float( char arr[], int index )
   * Big-endian union extraction: ((arr[index]<<24)&0xff000000) | ...
   */
  static get_float(arr: Uint8Array | number[], index: number): number {
    const b0 = (arr[index] ?? 0) & 0xff;
    const b1 = (arr[index + 1] ?? 0) & 0xff;
    const b2 = (arr[index + 2] ?? 0) & 0xff;
    const b3 = (arr[index + 3] ?? 0) & 0xff;

    const four_bytes =
      ((b0 << 24) & 0xff000000) |
      ((b1 << 16) & 0x00ff0000) |
      ((b2 << 8) & 0x0000ff00) |
      (b3 & 0x000000ff);

    const buffer = new ArrayBuffer(4);
    const intView = new Int32Array(buffer);
    const floatView = new Float32Array(buffer);
    intView[0] = four_bytes;
    return floatView[0];
  }

  /**
   * float swapFloat( float float_value )
   * Uses union to invert 4 bytes
   */
  static swapFloat(float_value: number): number {
    const buf1 = new ArrayBuffer(4);
    const fView1 = new Float32Array(buf1);
    const u8View1 = new Uint8Array(buf1);
    fView1[0] = float_value;

    const inverted_four_bytes =
      ((u8View1[0] << 24) & 0xff000000) |
      ((u8View1[1] << 16) & 0x00ff0000) |
      ((u8View1[2] << 8) & 0x0000ff00) |
      (u8View1[3] & 0x000000ff);

    const buf2 = new ArrayBuffer(4);
    const iView2 = new Int32Array(buf2);
    const fView2 = new Float32Array(buf2);
    iView2[0] = inverted_four_bytes;
    return fView2[0];
  }

  static analyzeFloat(floatVal: number) {
    const buf = new ArrayBuffer(4);
    const fView = new Float32Array(buf);
    const u32View = new Uint32Array(buf);
    fView[0] = floatVal;
    const bits = u32View[0];

    const sign = (bits >>> 31) & 1;
    const exponentRaw = (bits >>> 23) & 0xff;
    const mantissaRaw = bits & 0x7fffff;
    const exponentUnbiased = exponentRaw === 0 ? -126 : exponentRaw - 127;
    const mantissaFraction = mantissaRaw / Math.pow(2, 23);

    const hex = '0x' + bits.toString(16).toUpperCase().padStart(8, '0');
    const binaryString = bits.toString(2).padStart(32, '0');

    return {
      sign,
      exponentRaw,
      exponentUnbiased,
      mantissaRaw,
      mantissaFraction,
      floatValue: fView[0],
      hex,
      binaryString,
    };
  }
}

export class CppRamTools {
  /**
   * Emulation of Search_ram pattern matching with wildcard 0xFF
   */
  static searchRam(
    ramBuffer: Uint8Array,
    pattern: number[],
    startAddress: number,
    endAddress: number,
    length: number,
    decallage: number
  ): { foundAddress: number | null; scannedCount: number; matchOffset: number | null } {
    const len = length;
    const lenMoinsUn = len - 1;
    let address = startAddress;
    let scannedCount = 0;

    const effectiveEnd = Math.min(endAddress, ramBuffer.length);

    while (address < effectiveEnd) {
      const chunkEnd = Math.min(address + 10240, effectiveEnd);
      const chunkSize = chunkEnd - address;

      if (chunkSize < len) break;

      for (let base = 0; base <= chunkSize - len; base++) {
        scannedCount++;

        for (let i = 0; i < len; i++) {
          const byteAt = ramBuffer[address + base + i];
          const patternByte = pattern[i];

          if (byteAt === patternByte || patternByte === 0xff) {
            if (i === lenMoinsUn) {
              const result = address + base + decallage;
              return { foundAddress: result, scannedCount, matchOffset: address + base };
            }
          } else {
            break;
          }
        }
      }

      address += Math.max(1, chunkSize - len);
    }

    return { foundAddress: null, scannedCount, matchOffset: null };
  }
}
