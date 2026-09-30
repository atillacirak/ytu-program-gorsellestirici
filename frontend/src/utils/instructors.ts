export const INSTRUCTOR_MAP: Record<string, string> = {
  'ACK': 'Doç. Dr. Ali Can Karaca',
  'AE': 'Arş. Grv. Alper Eğitmen',
  'AEL': 'Dr. Ahmet Elbir',
  'AÖ': 'Dr. Ayşe Öcal',
  'BA': 'Arş. Grv. Barış Akkuş',
  'BAÖ': 'Arş. Grv. Burak Ahmet Özden',
  'BD': 'Prof. Dr. Banu Diri',
  'BÖ': 'Arş. Grv. Begüm Özbay',
  'EA': 'Arş. Grv. Elif Aşıcı',
  'EG': 'Arş. Grv. Elçin Güveyi',
  'EP': 'Arş. Grv. Emre Parlak',
  'EU': 'Dr. Erkan Uslu',
  'FFO': 'Arş. Grv. Fırat Fuat Olcay',
  'FÇ': 'Dr. Furkan Çakmak',
  'G1': 'Dr. Göksel Biricik',
  'GB': 'Prof. Dr. Gökhan Bilgin',
  'HE': 'Arş. Grv. Hatice Erdirik',
  'HHB': 'Prof. Dr. Hasan Hüseyin Balık',
  'HOİ': 'Doç. Dr. Hamza Osman İlhan',
  'HTK': 'Arş. Grv. Himmet Toprak Kesgin',
  'HİT': 'Dr. H. İrem Türkmen',
  'KA': 'Arş. Grv. Kübra Adalı',
  'MAG': 'Doç. Dr. M. Amaç Güvensan',
  'MC': 'Arş. Grv. Mustafa Cebeci',
  'MEK': 'Prof. Dr. M. Elif Karslıgil',
  'MEÖ': 'Arş. Grv. Muhammed Enes Özelbaş',
  'MFA': 'Prof. Dr. M. Fatih Amasyalı',
  'MGÇ': 'Arş. Grv. Meliha Gizem Çelik',
  'MKY': 'Arş. Grv. Muzaffer Kaan Yüce',
  'MMK': 'Arş. Grv. Mustafa Mert Kara',
  'MSA': 'Prof. Dr. Mehmet Sıddık Aktaş',
  'MTG': 'Arş. Grv. Muhammet Taha Gökcan',
  'MUK': 'Dr. M. Utku Kalay',
  'NA': 'Prof. Dr. Nizamettin Aydın',
  'NY': 'Arş. Grv. Nurgül Yüzbaşıoğlu',
  'OA': 'Dr. Oğuz Altun',
  'OFK': 'Arş. Grv. Osman Furkan Karakuş',
  'OK': 'Prof. Dr. Oya Kalıpsız',
  'RB': 'Arş. Grv. Rukiye Başkara',
  'SA': 'Arş. Grv. Sercan Aygün',
  'SSK': 'Arş. Grv. Sümeyye Sena Kurtvuran',
  'SST': 'Arş. Grv. Sultan Sevgi Turgut',
  'SV': 'Prof. Dr. Songül Varlı',
  'SY': 'Prof. Dr. Sırma Yavuz',
  'YES': 'Dr. Yunus Emre Selçuk',
  'ZCT': 'Dr. Ziya Cihan Tayşi',
  'ÖMTK': 'Arş. Grv. Ömer Mutlu Türk Kaya',
  'İD': 'Arş. Grv. İdris Demir',
  'İG': 'Arş. Grv. İmran Gül',
  'ŞD': 'Arş. Grv. Şeyma Derdiyok',
};

// Reverse map for quick lookup
const REVERSE_MAP: Record<string, string> = {};
Object.entries(INSTRUCTOR_MAP).forEach(([code, fullName]) => {
  REVERSE_MAP[fullName.toLowerCase()] = code;
  // Also strip titles for lookup
  const cleanName = fullName.replace(/^(Prof\.|Doç\.|Dr\.|Arş\.\s*Grv\.|Öğr\.\s*Gör\.)\s*/gi, '').trim().toLowerCase();
  REVERSE_MAP[cleanName] = code;
});

export function getFullInstructorName(codeOrName?: string): string {
  if (!codeOrName) return '';
  const trimmed = codeOrName.trim();
  const genericTerms = ['bölüm öğretim üyeleri', 'bölüm öğretim üyesi', 'bölüm öğr. el.', 'bölüm öğr. el', 'bilinmiyor'];
  if (genericTerms.includes(trimmed.toLowerCase())) {
    return '';
  }
  if (INSTRUCTOR_MAP[trimmed]) {
    return INSTRUCTOR_MAP[trimmed];
  }
  return codeOrName;
}

export function getInstructorAbbreviation(codeOrName?: string): { short: string; full: string } {
  if (!codeOrName) return { short: '', full: '' };
  const trimmed = codeOrName.trim();
  const lower = trimmed.toLowerCase();

  const genericTerms = ['bölüm öğretim üyeleri', 'bölüm öğretim üyesi', 'bölüm öğr. el.', 'bölüm öğr. el', 'bilinmiyor', '-'];
  if (genericTerms.includes(lower)) {
    return { short: '', full: '' };
  }

  // 1. Direct code in map (e.g., "ACK" -> short: "ACK", full: "Doç. Dr. Ali Can Karaca")
  if (INSTRUCTOR_MAP[trimmed]) {
    return { short: trimmed, full: INSTRUCTOR_MAP[trimmed] };
  }

  // 2. Direct code in uppercase (e.g. "ack")
  if (INSTRUCTOR_MAP[trimmed.toUpperCase()]) {
    return { short: trimmed.toUpperCase(), full: INSTRUCTOR_MAP[trimmed.toUpperCase()] };
  }

  // 3. Full name in reverse map
  if (REVERSE_MAP[lower]) {
    const code = REVERSE_MAP[lower];
    return { short: code, full: INSTRUCTOR_MAP[code] || trimmed };
  }

  // 4. If code is already short (<= 5 chars uppercase like "XYZ")
  if (/^[A-ZÇĞİÖŞÜ0-9]{2,5}$/.test(trimmed)) {
    return { short: trimmed, full: trimmed };
  }

  // 5. Generate abbreviation from name:
  // Remove academic titles
  const clean = trimmed
    .replace(/^(Prof\.|Prof|Doç\.|Doç|Doc\.|Doc|Dr\.|Dr|Arş\.\s*Grv\.|Arş\.Grv\.|Öğr\.\s*Gör\.|Öğr\.Gör\.|Öğr\.\s*Üyesi)\s+/gi, '')
    .trim();

  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length === 1) {
    return { short: parts[0].substring(0, 10), full: trimmed };
  }
  if (parts.length >= 2) {
    const lastName = parts[parts.length - 1];
    const initials = parts.slice(0, -1).map(p => p[0].toUpperCase() + '.').join('');
    const short = `${initials} ${lastName}`;
    return { short, full: trimmed };
  }

  return { short: trimmed, full: trimmed };
}
