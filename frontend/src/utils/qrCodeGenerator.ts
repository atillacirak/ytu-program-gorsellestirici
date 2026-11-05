/**
 * Saf TypeScript ISO/IEC 18004 QR Kod Matris Üreticisi (Sıfır Harici Bağımlılık).
 * Davet bağlantılarını (80 karaktere kadar URL) anında keskin SVG matrisine dönüştürür.
 */

// Versiyon 1..6 (ECC Level L) parametreleri: [toplamKodKelimesi, ecKodKelimesiSayısı, hizalamaMerkezleri]
const VERSION_PARAMS: Record<
  number,
  { totalCodewords: number; ecCodewords: number; align: number[] }
> = {
  1: { totalCodewords: 26, ecCodewords: 7, align: [] },
  2: { totalCodewords: 44, ecCodewords: 10, align: [6, 18] },
  3: { totalCodewords: 70, ecCodewords: 15, align: [6, 22] },
  4: { totalCodewords: 100, ecCodewords: 20, align: [6, 26] },
  5: { totalCodewords: 134, ecCodewords: 26, align: [6, 30] },
  6: { totalCodewords: 172, ecCodewords: 36, align: [6, 34] }, // 2 blok * 18 ec
};

function gfMul(x: number, y: number, exp: number[], log: number[]): number {
  if (x === 0 || y === 0) return 0;
  return exp[(log[x] + log[y]) % 255];
}

function computeReedSolomon(data: number[], ecLen: number): number[] {
  const exp = new Array(512).fill(0);
  const log = new Array(256).fill(0);
  let v = 1;
  for (let i = 0; i < 255; i++) {
    exp[i] = v;
    log[v] = i;
    v <<= 1;
    if (v & 0x100) v ^= 0x11d;
  }
  for (let i = 255; i < 512; i++) {
    exp[i] = exp[i - 255];
  }

  let gen = [1];
  for (let i = 0; i < ecLen; i++) {
    const next = new Array(gen.length + 1).fill(0);
    const factor = exp[i];
    for (let j = 0; j < gen.length; j++) {
      next[j] ^= gen[j];
      next[j + 1] ^= gfMul(gen[j], factor, exp, log);
    }
    gen = next;
  }

  const msg = [...data, ...new Array(ecLen).fill(0)];
  for (let i = 0; i < data.length; i++) {
    const coef = msg[i];
    if (coef !== 0) {
      for (let j = 0; j < gen.length; j++) {
        msg[i + j] ^= gfMul(gen[j], coef, exp, log);
      }
    }
  }
  return msg.slice(data.length);
}

export function generateQrMatrix(text: string): boolean[][] {
  const bytes = Array.from(new TextEncoder().encode(text));

  // Uygun versiyonu seç (1..6)
  let version = 4;
  for (let v = 1; v <= 6; v++) {
    const p = VERSION_PARAMS[v];
    const dataCap = p.totalCodewords - p.ecCodewords - 2;
    if (bytes.length <= dataCap) {
      version = v;
      break;
    }
  }

  const params = VERSION_PARAMS[version];
  const dataCodewordsCount = params.totalCodewords - params.ecCodewords;

  // Bit dizisini oluştur (Byte mode = 0100)
  const bits: number[] = [];
  const pushBits = (val: number, len: number) => {
    for (let i = len - 1; i >= 0; i--) {
      bits.push((val >> i) & 1);
    }
  };

  pushBits(0b0100, 4);
  pushBits(bytes.length, 8);
  for (const b of bytes) {
    pushBits(b, 8);
  }

  const maxBits = dataCodewordsCount * 8;
  const termLen = Math.min(4, maxBits - bits.length);
  pushBits(0, termLen);
  while (bits.length % 8 !== 0) {
    bits.push(0);
  }

  const dataBytes: number[] = [];
  for (let i = 0; i < bits.length; i += 8) {
    let b = 0;
    for (let j = 0; j < 8; j++) {
      b = (b << 1) | bits[i + j];
    }
    dataBytes.push(b);
  }

  let padToggle = true;
  while (dataBytes.length < dataCodewordsCount) {
    dataBytes.push(padToggle ? 0xec : 0x11);
    padToggle = !padToggle;
  }

  let finalCodewords: number[] = [];
  if (version === 6) {
    // Version 6-L: 2 blok (her biri 68 veri + 18 EC)
    const b1 = dataBytes.slice(0, 68);
    const b2 = dataBytes.slice(68, 136);
    const ec1 = computeReedSolomon(b1, 18);
    const ec2 = computeReedSolomon(b2, 18);
    for (let i = 0; i < 68; i++) {
      finalCodewords.push(b1[i], b2[i]);
    }
    for (let i = 0; i < 18; i++) {
      finalCodewords.push(ec1[i], ec2[i]);
    }
  } else {
    const ec = computeReedSolomon(dataBytes, params.ecCodewords);
    finalCodewords = [...dataBytes, ...ec];
  }

  const size = version * 4 + 17;
  const modules: boolean[][] = Array.from({ length: size }, () =>
    new Array(size).fill(false)
  );
  const isFunction: boolean[][] = Array.from({ length: size }, () =>
    new Array(size).fill(false)
  );

  const setFunctionModule = (r: number, c: number, dark: boolean) => {
    if (r >= 0 && r < size && c >= 0 && c < size) {
      modules[r][c] = dark;
      isFunction[r][c] = true;
    }
  };

  // Finder desenleri (3 köşe)
  const drawFinder = (row: number, col: number) => {
    for (let dr = -1; dr <= 7; dr++) {
      for (let dc = -1; dc <= 7; dc++) {
        const r = row + dr;
        const c = col + dc;
        if (r < 0 || r >= size || c < 0 || c >= size) continue;
        const inOuter =
          dr >= 0 && dr <= 6 && dc >= 0 && dc <= 6 && (dr === 0 || dr === 6 || dc === 0 || dc === 6);
        const inInner = dr >= 2 && dr <= 4 && dc >= 2 && dc <= 4;
        setFunctionModule(r, c, inOuter || inInner);
      }
    }
  };

  drawFinder(0, 0);
  drawFinder(0, size - 7);
  drawFinder(size - 7, 0);

  // Zamanlama çizgileri
  for (let i = 8; i < size - 8; i++) {
    setFunctionModule(6, i, i % 2 === 0);
    setFunctionModule(i, 6, i % 2 === 0);
  }

  // Hizalama desenleri
  const align = params.align;
  for (const ar of align) {
    for (const ac of align) {
      if (
        (ar === 6 && ac === 6) ||
        (ar === 6 && ac === size - 7) ||
        (ar === size - 7 && ac === 6)
      ) {
        continue;
      }
      for (let dr = -2; dr <= 2; dr++) {
        for (let dc = -2; dc <= 2; dc++) {
          const dark =
            Math.abs(dr) === 2 || Math.abs(dc) === 2 || (dr === 0 && dc === 0);
          setFunctionModule(ar + dr, ac + dc, dark);
        }
      }
    }
  }

  // Dark module & Format bilgi alanlarını rezerve et
  setFunctionModule(4 * version + 9, 8, true);
  for (let i = 0; i <= 8; i++) {
    if (!isFunction[8][i]) setFunctionModule(8, i, false);
    if (!isFunction[i][8]) setFunctionModule(i, 8, false);
  }
  for (let i = 0; i < 8; i++) {
    if (!isFunction[8][size - 1 - i]) setFunctionModule(8, size - 1 - i, false);
    if (!isFunction[size - 1 - i][8]) setFunctionModule(size - 1 - i, 8, false);
  }

  // Veri bitlerini zikzak yerleştir
  const allBits: number[] = [];
  for (const cw of finalCodewords) {
    for (let i = 7; i >= 0; i--) {
      allBits.push((cw >> i) & 1);
    }
  }

  let bitIdx = 0;
  let upward = true;
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    for (let vert = 0; vert < size; vert++) {
      const r = upward ? size - 1 - vert : vert;
      for (let j = 0; j < 2; j++) {
        const c = right - j;
        if (!isFunction[r][c]) {
          const bit = bitIdx < allBits.length ? allBits[bitIdx++] === 1 : false;
          // Mask 0: (r + c) % 2 === 0
          const masked = (r + c) % 2 === 0 ? !bit : bit;
          modules[r][c] = masked;
        }
      }
    }
    upward = !upward;
  }

  // Format bilgisi: ECC Level L (01) + Mask 0 (000) -> 01000 -> BCH & XOR mask = 0x77c4 (30660)
  const formatBits = 0x77c4;
  const getFmtBit = (i: number) => ((formatBits >> i) & 1) === 1;

  for (let i = 0; i <= 5; i++) setFunctionModule(8, i, getFmtBit(i));
  setFunctionModule(8, 7, getFmtBit(6));
  setFunctionModule(8, 8, getFmtBit(7));
  setFunctionModule(7, 8, getFmtBit(8));
  for (let i = 9; i < 15; i++) setFunctionModule(14 - i, 8, getFmtBit(i));

  for (let i = 0; i < 8; i++) setFunctionModule(8, size - 1 - i, getFmtBit(i));
  for (let i = 8; i < 15; i++) setFunctionModule(size - 15 + i, 8, getFmtBit(i));

  return modules;
}
