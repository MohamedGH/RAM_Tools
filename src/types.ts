export interface ByteResult {
  hex: string;
  bin: string;
  signedVal: number;
  unsignedVal: number;
}

export interface FloatAnalysis {
  sign: number;
  exponentRaw: number;
  exponentUnbiased: number;
  mantissaRaw: number;
  mantissaFraction: number;
  floatValue: number;
  hex: string;
  binaryString: string;
}

export interface MemoryRegion {
  baseAddress: string;
  baseAddressNum: number;
  regionSize: string;
  regionSizeNum: number;
  protect: string;
  state: string;
  type: string;
  matchesCriteria: boolean;
  notes: string;
}

export interface PatternSearchResult {
  foundAddress: string | null;
  foundIndex: number | null;
  scannedBytesCount: number;
  matchesFound: number;
  durationMs: number;
}

export interface ThreadContext {
  threadId: number;
  dr0: string;
  dr1: string;
  dr2: string;
  dr3: string;
  dr6: string;
  dr7: string;
  status: 'Running' | 'Paused' | 'Breakpoint Hit';
}
