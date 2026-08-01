import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, parseISO } from 'date-fns'
import { tr } from 'date-fns/locale'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | Date): string {
  if (!date) return ''
  const d = typeof date === 'string' ? parseISO(date) : date
  return format(d, 'dd.MM.yyyy', { locale: tr })
}

export function formatDateTime(date: string | Date): string {
  if (!date) return ''
  const d = typeof date === 'string' ? parseISO(date) : date
  return format(d, 'dd.MM.yyyy HH:mm', { locale: tr })
}

export function formatTime(date: string | Date): string {
  if (!date) return ''
  const d = typeof date === 'string' ? parseISO(date) : date
  return format(d, 'HH:mm')
}

export function formatCurrency(amount: number): string {
  if (amount === null || amount === undefined) return ''
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

export function formatNumber(num: number, decimals: number = 2): string {
  if (num === null || num === undefined) return ''
  return new Intl.NumberFormat('tr-TR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num)
}

export function getBadgeColor(status: string): string {
  const statusColors: Record<string, string> = {
    // Stok durumları
    AKTIF: 'bg-green-100 text-green-800',
    BITTI: 'bg-gray-100 text-gray-800',
    KALITE_KONTROL: 'bg-yellow-100 text-yellow-800',
    IPTAL: 'bg-red-100 text-red-800',
    
    // Stok tipleri
    HAMMADDE: 'bg-blue-100 text-blue-800',
    MAMUL: 'bg-purple-100 text-purple-800',
    
    // Üretim durumları
    BEKLEMEDE: 'bg-yellow-100 text-yellow-800',
    ONAYLANDI: 'bg-blue-100 text-blue-800',
    TAMAMLANDI: 'bg-green-100 text-green-800',
    
    // Satış durumları
    HAZIRLANIYOR: 'bg-blue-100 text-blue-800',
    GONDERILDI: 'bg-indigo-100 text-indigo-800',
    TESLIM_EDILDI: 'bg-green-100 text-green-800',
    
    // Öncelik
    DUSUK: 'bg-gray-100 text-gray-800',
    NORMAL: 'bg-blue-100 text-blue-800',
    YUKSEK: 'bg-orange-100 text-orange-800',
    ACIL: 'bg-red-100 text-red-800',
  }
  
  return statusColors[status] || 'bg-gray-100 text-gray-800'
}

export function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    AKTIF: 'Aktif',
    BITTI: 'Bitti',
    KALITE_KONTROL: 'Kalite Kontrol',
    IPTAL: 'İptal',
    HAMMADDE: 'Hammadde',
    MAMUL: 'Mamul',
    BEKLEMEDE: 'Bekliyor',
    ONAYLANDI: 'Onaylandı',
    TAMAMLANDI: 'Tamamlandı',
    HAZIRLANIYOR: 'Hazırlanıyor',
    GONDERILDI: 'Gönderildi',
    TESLIM_EDILDI: 'Teslim Edildi',
    DUSUK: 'Düşük',
    NORMAL: 'Normal',
    YUKSEK: 'Yüksek',
    ACIL: 'Acil',
  }
  
  return labels[status] || status
}

export function getKategoriLabel(kategori: string): string {
  const labels: Record<string, string> = {
    MEYVE: 'Meyve',
    BAL: 'Bal',
    KARSIM: 'Karışım',
    KURUYEMIS: 'Kuruyemiş',
    SEBZE: 'Sebze',
    YAG: 'Yağ',
    TURSUKU: 'Turşu',
    MAMUL: 'Mamül',
    DIGER: 'Diğer',
  }
  
  return labels[kategori] || kategori
}

// Kategori prefix for stock codes
const KATEGORI_PREFIX: Record<string, string> = {
  MEYVE: 'MEY',
  BAL: 'BAL',
  KARSIM: 'KRS',
  KURUYEMIS: 'KUR',
  SEBZE: 'SEB',
  YAG: 'YAG',
  TURSUKU: 'TUR',
  MAMUL: 'MAM',
  DIGER: 'DIG',
}

// Turkish character replacements for ASCII codes
const TURKISH_CHARS: Record<string, string> = {
  'ç': 'C', 'Ç': 'C',
  'ş': 'S', 'Ş': 'S',
  'ğ': 'G', 'Ğ': 'G',
  'ı': 'I', 'İ': 'I',
  'ö': 'O', 'Ö': 'O',
  'ü': 'U', 'Ü': 'U',
}

// Common product name abbreviations
const NAME_ABBR: Record<string, string> = {
  'cicek': 'CIC', 'cicek bali': 'CIC',
  'kekik': 'KEK', 'kekik bali': 'KEK',
  'bal': 'BAL',
  'kayisi': 'KAY', 'kurutulmus kayisi': 'KAY',
  'uzum': 'UZM', 'kurutulmus uzum': 'UZM',
  'incir': 'INC', 'kurutulmus incir': 'INC',
  'fistik': 'FST', 'Antep fistigi': 'FST',
  'ceviz': 'CEV',
  'badem': 'BAD',
  'findik': 'FIN',
  'zeytin': 'ZEY', 'zeytinyagi': 'ZEY',
  'zaitun': 'ZAI', 'zaitunyagi': 'ZAI',
  'elma': 'ELM',
  'armut': 'ARM',
  'erik': 'ERK',
  'kiraz': 'KIR',
  'visne': 'VIS',
  'seftali': 'SEF',
  'kaysi': 'KAY',
  'incir': 'INC',
  'uzum': 'UZM',
  'kuru': 'KUR',  // prefix for dried products
}

/**
 * Generate a stock code based on product name, category, and unit
 * Format: {KATEGORI_PREFIX}-{NAME_ABBR}-{UNIT_CODE}
 * Example: BAL-CIC-500G, MEYVE-KAY-1KG
 */
export function generateStokKodu(
  urunAdi: string,
  kategori: string,
  birim: string,
  unitSize?: string
): string {
  if (!urunAdi) return ''
  
  const name = urunAdi.toLowerCase().trim()
  
  // Get category prefix
  const catPrefix = KATEGORI_PREFIX[kategori] || kategori.substring(0, 3).toUpperCase()
  
  // Find product abbreviation
  let nameAbbr = ''
  
  // First try exact match
  if (NAME_ABBR[name]) {
    nameAbbr = NAME_ABBR[name]
  } else {
    // Try to find matching key
    for (const [key, value] of Object.entries(NAME_ABBR)) {
      if (name.includes(key)) {
        nameAbbr = value
        break
      }
    }
    
    // If no match, use first 3 letters of product name
    if (!nameAbbr) {
      // Remove Turkish characters and get first 3
      let cleanName = name
      for (const [turkish, ascii] of Object.entries(TURKISH_CHARS)) {
        cleanName = cleanName.replace(new RegExp(turkish, 'g'), ascii)
      }
      // Remove spaces and get first 3
      nameAbbr = cleanName.replace(/\s+/g, '').substring(0, 3).toUpperCase()
    }
  }
  
  // Format unit code
  let unitCode = ''
  if (unitSize) {
    // Use the provided unit size (e.g., "500G", "1KG", "100ML")
    unitCode = unitSize.toUpperCase().replace(/\s+/g, '')
  } else {
    // Convert birim to standard format
    unitCode = birim.toUpperCase()
  }
  
  return `${catPrefix}-${nameAbbr}-${unitCode}`
}

/**
 * Parse a stock code to get its components
 */
export function parseStokKodu(kod: string): {
  kategori: string
  isim: string
  birim: string
} | null {
  if (!kod) return null
  
  const parts = kod.split('-')
  if (parts.length !== 3) return null
  
  // Reverse lookup for kategori
  const catPrefix = parts[0]
  let kategori = ''
  for (const [key, value] of Object.entries(KATEGORI_PREFIX)) {
    if (value === catPrefix) {
      kategori = key
      break
    }
  }
  
  return {
    kategori,
    isim: parts[1],
    birim: parts[2],
  }
}
