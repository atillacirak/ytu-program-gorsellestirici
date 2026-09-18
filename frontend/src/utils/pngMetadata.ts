/**
 * PNG dosyalarına JSON ders programı verisi gömme ve okuma yardımcıları.
 * PNG spesifikasyonuna uygun tEXt chunk mekanizmasını kullanır.
 */

// CRC32 Tablosu ve Hesaplayıcısı
const crcTable: number[] = [];
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    if (c & 1) c = 0xedb88320 ^ (c >>> 1);
    else c = c >>> 1;
  }
  crcTable[n] = c;
}

function calculateCRC32(buf: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

/**
 * PNG Data URL'sine (base64) 'schedule_data' adında tEXt chunk metadata ekler
 */
export function injectMetadataToPngDataUrl(dataUrl: string, payloadObj: any): string {
  try {
    const base64Parts = dataUrl.split(',');
    const mimeStr = base64Parts[0];
    const binaryStr = atob(base64Parts[1]);
    const len = binaryStr.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }

    const keyword = 'schedule_data';
    const jsonStr = JSON.stringify(payloadObj);
    const encoder = new TextEncoder();
    const kwBytes = encoder.encode(keyword);
    const textBytes = encoder.encode(jsonStr);

    // Data = keyword + null byte (0x00) + text
    const dataLen = kwBytes.length + 1 + textBytes.length;
    const chunkData = new Uint8Array(dataLen);
    chunkData.set(kwBytes, 0);
    chunkData[kwBytes.length] = 0;
    chunkData.set(textBytes, kwBytes.length + 1);

    // Chunk Type = 'tEXt' -> [116, 69, 88, 116]
    const typeBytes = new Uint8Array([116, 69, 88, 116]);

    // CRC hesaplama için type + data birleşimi
    const crcBuf = new Uint8Array(4 + dataLen);
    crcBuf.set(typeBytes, 0);
    crcBuf.set(chunkData, 4);
    const crcVal = calculateCRC32(crcBuf);

    // Tam Chunk paketi: Length (4) + Type (4) + Data (dataLen) + CRC (4)
    const chunkTotalLen = 4 + 4 + dataLen + 4;
    const fullChunk = new Uint8Array(chunkTotalLen);
    const view = new DataView(fullChunk.buffer);
    view.setUint32(0, dataLen, false); // Big endian
    fullChunk.set(typeBytes, 4);
    fullChunk.set(chunkData, 8);
    view.setUint32(8 + dataLen, crcVal, false);

    // IHDR chunk'ından sonrasına (8 byte PNG header + 25 byte IHDR = offset 33) ekle
    const insertOffset = 33;
    const newBytes = new Uint8Array(bytes.length + chunkTotalLen);
    newBytes.set(bytes.subarray(0, insertOffset), 0);
    newBytes.set(fullChunk, insertOffset);
    newBytes.set(bytes.subarray(insertOffset), insertOffset + chunkTotalLen);

    // Yeni Data URL oluştur
    let newBinaryStr = '';
    const chunkStep = 8192;
    for (let i = 0; i < newBytes.length; i += chunkStep) {
      newBinaryStr += String.fromCharCode.apply(null, Array.from(newBytes.subarray(i, i + chunkStep)));
    }
    const newBase64 = btoa(newBinaryStr);
    return `${mimeStr},${newBase64}`;
  } catch (err) {
    console.error('PNG Metadata Injection Error:', err);
    return dataUrl;
  }
}

/**
 * Bir ArrayBuffer (PNG dosyası) içerisinden gömülü 'schedule_data' tEXt chunk'ını okur
 */
export function extractMetadataFromPngArrayBuffer(buffer: ArrayBuffer): any | null {
  try {
    const bytes = new Uint8Array(buffer);
    const view = new DataView(buffer);
    let offset = 8; // PNG Header'ı atla (8 byte)

    const decoder = new TextDecoder('utf-8');

    while (offset < bytes.length) {
      if (offset + 8 > bytes.length) break;
      const length = view.getUint32(offset, false);
      const type = decoder.decode(bytes.subarray(offset + 4, offset + 8));

      if (type === 'tEXt') {
        const chunkData = bytes.subarray(offset + 8, offset + 8 + length);
        let nullIdx = -1;
        for (let i = 0; i < chunkData.length; i++) {
          if (chunkData[i] === 0) {
            nullIdx = i;
            break;
          }
        }
        if (nullIdx !== -1) {
          const keyword = decoder.decode(chunkData.subarray(0, nullIdx));
          if (keyword === 'schedule_data' || keyword === 'ptu_schedule') {
            const jsonText = decoder.decode(chunkData.subarray(nullIdx + 1));
            return JSON.parse(jsonText);
          }
        }
      }

      if (type === 'IEND') break;
      offset += 12 + length; // 4 len + 4 type + length + 4 crc
    }
  } catch (err) {
    console.error('PNG Metadata Extraction Error:', err);
  }
  return null;
}
