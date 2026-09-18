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
