// Auth Types
export interface TokenResponse {
  access_token: string
  refresh_token: string
  token_type: string
  expires_in: number
}

export interface User {
  id: string
  kullanici_adi: string
  ad: string
  soyad: string
  eposta: string
  rol: string
  aktif: boolean
}

// Stok Types
export interface Stok {
  id: string
  urun_id: string
  urun_ad: string | null
  lot_no: string
  stok_tipi: 'HAMMADDE' | 'MAMUL'
  birim: string
  miktar: number
  birim_fiyat: number
  giris_tarihi: string
  uretim_tarihi: string | null
  son_kullanma: string | null
  konum: string | null
  tedarikci_id: string | null
  tedarikci_ad: string | null
  durum: string
  kalite_notu: number | null
}

export interface StokListResponse {
  data: Stok[]
  total: number
  sayfa: number
  sayfa_boyutu: number
}

export interface StokHareket {
  id: string
  stok_id: string
  lot_no: string
  hareket_tipi: string
  miktar: number
  onceki_miktar: number
  sonraki_miktar: number
  birim_fiyat: number | null
  tutar: number | null
  referans_tipi: string | null
  aciklama: string | null
  olusturma_tarihi: string
}

export interface StokGirisRequest {
  urun_id: string
  tedarikci_id?: string
  miktar: number
  birim?: string
  birim_fiyat: number
  uretim_tarihi?: string
  son_kullanma?: string
  konum?: string
  giris_referans_no?: string
  kalite_notu?: number
}

export interface StokCikisRequest {
  urun_id: string
  miktar: number
  birim?: string
  referans_tipi?: string
  referans_id?: string
  musteri_id?: string
  fifo_zorla?: boolean
}

// Urun Types
export interface Urun {
  id: string
  ad: string
  kategori: string
  birim_toptan: string
  birim_perakende: string
  stok_kodu: string | null
  barkod: string | null
  aciklama: string | null
  gorsel_url: string | null
  agirlik: number | null
  minimum_stok_seviyesi: number | null
  maksimum_stok_seviyesi: number | null
  raf_omru_gun: number | null
  hammadde_id: string | null
  hammadde_ad: string | null
  aktif: boolean
}

export interface Hammadde {
  id: string
  ad: string
  kategori: string
  stok_kodu: string | null
}

export interface UrunListResponse {
  data: Urun[]
  total: number
  sayfa: number
  sayfa_boyutu: number
}

// Tedarikci Types
export interface Tedarikci {
  id: string
  ad: string
  vergi_no: string
  telefon: string | null
  eposta: string | null
  adres: string | null
  faks: string | null
  yetkili_kisi: string | null
  yetkili_telefon: string | null
  yetkili_eposta: string | null
  banka_adi: string | null
  banka_sube: string | null
  hesap_no: string | null
  odeme_vadesi: number | null
  tedarikci_sinifi: string | null
  not_text: string | null
  aktif: boolean
}

export interface TedarikciListResponse {
  data: Tedarikci[]
  total: number
  sayfa: number
  sayfa_boyutu: number
}

// Musteri Types
export interface Musteri {
  id: string
  ad: string
  telefon: string | null
  eposta: string | null
  adres: string | null
  vergi_no: string | null
  musteri_tipi: string | null
  musteri_sinifi: string | null
  teslimat_adresi: string | null
  il: string | null
  ilce: string | null
  odeme_vadesi: number | null
  aktif: boolean
}

export interface MusteriListResponse {
  data: Musteri[]
  total: number
  sayfa: number
  sayfa_boyutu: number
}

// Uretim Types
export interface UretimDetay {
  id: string
  mamul_urun_id: string
  mamul_urun_ad: string | null
  mamul_miktar: number
  birim: string | null
  hammadde_urun_id: string
  hammadde_urun_ad: string | null
  hammadde_lot_no: string | null
  hammadde_miktar: number
  fire_miktari: number | null
}

export interface Uretim {
  id: string
  uretim_no: string
  tarih: string
  durum: string
  not_text: string | null
  oncelik: string
  planlanan_miktar: number | null
  gerceklesen_miktar: number | null
  planlanan_tarih: string | null
  tamamlama_tarihi: string | null
  toplam_maliyet: number | null
  detaylar: UretimDetay[]
}

export interface UretimListResponse {
  data: Uretim[]
  total: number
  sayfa: number
  sayfa_boyutu: number
}

export interface UretimCreateRequest {
  not_text?: string
  oncelik?: string
  planlanan_miktar?: number
  planlanan_tarih?: string
  detaylar: {
    mamul_urun_id: string
    mamul_miktar: number
    hammadde_urun_id: string
    hammadde_lot_no?: string
    hammadde_miktar: number
  }[]
}

// Satis Types
export interface SatisKalem {
  id: string
  urun_id: string
  urun_ad: string | null
  lot_no: string | null
  miktar: number
  birim_fiyat: number
  tutar: number
}

export interface Satis {
  id: string
  satis_no: string
  musteri_id: string
  musteri_ad: string | null
  tarih: string
  durum: string
  odeme_durumu: string | null
  toplam_tutar: number
  indirim_tutari: number | null
  not_text: string | null
  kalemler: SatisKalem[]
}

export interface SatisListResponse {
  data: Satis[]
  total: number
  sayfa: number
  sayfa_boyutu: number
}

export interface SatisCreateRequest {
  musteri_id: string
  kalemler: {
    urun_id: string
    miktar: number
    birim_fiyat: number
  }[]
  teslimat_adresi?: string
  odeme_sekli?: string
  not_text?: string
}

// Dashboard Types
export interface DashboardData {
  stok: {
    lot_sayisi: number
    toplam_deger: number
  }
  satis: {
    bugunku: number
  }
  uretim: {
    bekleyen: number
  }
  uyarilar: {
    dusuk_stok: number
  }
}

// Anlik Stok
export interface AnlikStok {
  urun_id: string
  ad: string
  kategori: string
  toplam_miktar: number
}

// ============ NEW TYPES FOR ERP MODULES ============

// Kalite Kontrol
export interface KaliteKontrol {
  id: string
  stok_id: string | null
  uretim_id: string | null
  kontrol_turu: string  // MAL_KABUL | URETIM | SEVK | RAFSURE
  kontrol_eden_id: string
  kontrol_eden_ad?: string
  kontrol_tarihi: string
  durum: string  // BEKLIYOR | KONTROL_EDILIYOR | KABUL | KISMEN_KABUL | RET
  gorsel_kontrol: boolean | null
  ambalaj_durumu: string | null  // IYI | ORTA | ZAYIF
  etiket_okunakli: boolean | null
  son_kullanma_tarihi: string | null
  laboratuvar_sonuclari: Record<string, any> | null
  ret_nedeni: string | null
  ret_kriterleri: string[] | null
  sonuc_aciklamasi: string | null
  onay_durumu: string
  onay_leyen_id: string | null
  onay_tarihi: string | null
  olusturan_kullanici_id: string
}

export interface KaliteNumune {
  id: string
  kalite_kontrol_id: string
  numune_no: string
  numune_turu: string | null
  numune_aciklamasi: string | null
  sonuc: string | null  // GECTI | KALDI | BEKLEMEDE
  sonuc_deger: string | null
  referans_deger: string | null
  birim: string | null
  rapor_url: string | null
  foto_url: string | null
  kontrol_eden_lab: string | null
  lab_rapor_no: string | null
  olusturma_tarihi: string
  olusturan_kullanici_id: string
}

// SKT
export interface SktIslem {
  id: string
  stok_id: string
  islem_turu: string  // IMHA | INDIRIM | DEVIR | IADE
  talep_durumu: string  // BEKLIYOR | ONAYLANDI | REDDEDILDI | TAMAMLANDI
  talep_eden_id: string
  talep_tarihi: string
  onay_leyen_id: string | null
  onay_tarihi: string | null
  ret_nedeni: string | null
  mevcut_miktar: number | null
  islem_miktari: number | null
  birim: string | null
  maliyet: number | null
  indirim_orani: number | null
  indirimli_fiyat: number | null
  gerekce: string | null
  not_text: string | null
  olusturma_tarihi: string
}

export interface SktLotOnerisi {
  oncelik_lot: {
    lot_no: string
    stok_id: string
    mevcut_miktar: number
    son_kullanma: string | null
    giris_tarihi: string
    durum: string
    skd_gun: number | null
  } | null
  alternatif_lotlar: {
    lot_no: string
    stok_id: string
    mevcut_miktar: number
    son_kullanma: string | null
    giris_tarihi: string
    durum: string
    skd_gun: number | null
  }[]
}

// Stok Düzeltme
export interface StokDuzeltmeTalep {
  id: string
  stok_id: string
  talep_turu: string  // SAYIM_FARKI | FIRE_ZARAR | CALISMA | BIRIM_degisikligi
  talep_durumu: string  // OLUSTURULDU | BEKLEMEDE | ONAYLANDI | REDDEDILDI | STOK_GUNCELLENDI
  onceki_miktar: number
  yeni_miktar: number
  fark_miktar: number
  birim: string | null
  kritik_duzeltme: boolean
  kritik_durum_aciklama: string | null
  talep_eden_id: string
  talep_tarihi: string
  talep_aciklamasi: string | null
  onay_leyen_id: string | null
  onay_tarihi: string | null
  ret_nedeni: string | null
  stok_guncelleme_tarihi: string | null
  olusturma_tarihi: string
  // Relations
  stok_lot_no?: string
  stok_urun_ad?: string
}

// Birim
export interface Birim {
  id: string
  ad: string
  kisa_ad: string
  birim_tipi: string  // AGIRLIK | ADET | HACIM | OZEL
  aktif: boolean
  olusturma_tarihi: string
  silme_tarihi: string | null
}

export interface BirimDonusum {
  id: string
  kaynak_birim_id: string
  hedef_birim_id: string
  kaynak_birim_ad: string
  hedef_birim_ad: string
  donusum_orani: number
  ters_oran: number | null
  aktif: boolean
  baslangic_tarihi: string | null
  bitis_tarihi: string | null
  olusturma_tarihi: string
}

// Depo
export interface Depo {
  id: string
  ad: string
  kod: string
  depo_tipi: string | null
  adres: string | null
  il: string | null
  ilce: string | null
  kapasite_m2: number | null
  doluluk_orani: number | null
  aktif: boolean
  olusturma_tarihi: string
  guncelleme_tarihi: string
  silme_tarihi: string | null
  blok_sayisi?: number
  konum_sayisi?: number
}

export interface DepoBlok {
  id: string
  depo_id: string
  ad: string
  kod: string
  blok_tipi: string | null
  kapasite_m2: number | null
  doluluk_orani: number | null
  aktif: boolean
  olusturma_tarihi: string
  silme_tarihi: string | null
}

export interface DepoKonum {
  id: string
  depo_id: string
  blok_id: string | null
  konum_kodu: string
  kat: number | null
  raf: string | null
  sutun: number | null
  doluluk_durumu: string | null
  aktif: boolean
  olusturma_tarihi: string
}

export interface DepoTransfer {
  id: string
  transfer_no: string
  tarih: string
  kaynak_depo_id: string
  hedef_depo_id: string
  kaynak_depo_ad?: string
  hedef_depo_ad?: string
  durum: string  // OLUŞTURULDU | BEKLEMEDE | ONAYLANDI | REDDEDILDI | TAMAMLANDI | IPTAL_EDILDI
  talep_eden_id: string
  talep_tarihi: string
  talep_aciklamasi: string | null
  onay_leyen_id: string | null
  onay_tarihi: string | null
  red_nedeni: string | null
  tamamlama_tarihi: string | null
  not_text: string | null
  olusturma_tarihi: string
  detaylar?: DepoTransferDetay[]
}

export interface DepoTransferDetay {
  id: string
  transfer_id: string
  stok_id: string
  urun_ad: string
  lot_no: string
  miktar: number
  birim: string
}

// Bildirim
export interface Bildirim {
  id: string
  bildirim_tipi: string
  baslik: string
  icerik: string
  oncelik: string  // DUSUK | NORMAL | YUKSEK | KRITIK
  durum: string  // GORULMEMIŞ | GORULDU | OKUNDU
  gonderen_id: string | null
  gonderen_ad: string | null
  alici_id: string
  referans_tip: string | null
  referans_id: string | null
  kanallar: string[]
  gorulme_tarihi: string | null
  okunma_tarihi: string | null
  action_url: string | null
  action_label: string | null
  olusturma_tarihi: string
  gonderim_tarihi: string | null
}

export interface BildirimSablon {
  id: string
  sablon_adi: string
  bildirim_tipi: string
  varsayilan_baslik: string
  varsayilan_icerik: string
  kanallar: string[]
  email_sablon_html: string | null
  email_subject: string | null
  sms_sablon: string | null
  degiskenler: string[]
  aktif: boolean
  olusturma_tarihi: string
  guncelleme_tarihi: string
  olusturan_kullanici_id: string
}

// Toplu İşlem
export interface TopluIslem {
  id: string
  islem_turu: string  // STOK_GIRISI | URETIM_EMRI | MUSKAYIT | TEDARIKCI_KAYIT | STOK_DUZELTME | ETIKET_BASKI | SATIS_IRAC
  islem_no: string
  durum: string  // BEKLEMEDE | VALIDATING | ISLENIYOR | TAMAMLANDI | HATALAR_VAR | IPTAL_EDILDI
  dosya_adi: string | null
  dosya_url: string | null
  satir_sayisi: number | null
  basarili_satir: number
  basarisiz_satir: number
  islenen_satir: number
  onay_durumu: string
  onay_leyen_id: string | null
  onay_tarihi: string | null
  ret_nedeni: string | null
  sonuc_dosya_url: string | null
  not_text: string | null
  olusturma_tarihi: string
}

// Maliyet
export interface MaliyetOzet {
  uretim_id: string
  uretim_no: string
  toplam_hammadde: number
  toplam_iscilik: number
  toplam_enerji: number
  toplam_bakim: number
  toplam_genel_gider: number
  toplam_maliyet: number
  birim_maliyet_kg: number | null
}

// İade
export interface SatisIade {
  id: string
  satis_id: string
  musteri_id: string
  musteri_ad?: string
  iade_no: string
  iade_tarihi: string
  iade_durumu: string  // OLUŞTURULDU | KALITE_KONTROL | STOK_GIRISI | TAMAMLANDI | RET
  iade_nedeni: string  // KALITE_SORUNU | YANLIS_URUN | MIKTAR_FARKI | MUSERI_ISTEK | DIGER
  toplam_miktar: number
  toplam_tutar: number | null
  fire_miktari: number | null
  fire_orani: number | null
  fire_nedeni: string | null
  olusturma_tarihi: string
}

// Özellik
export interface UrunOzellik {
  id: string
  urun_id: string | null
  kategori: string
  alan_adi: string
  goruntu_adi: string
  tip: string  // METIN | SAYI | ENUM | BOOLEAN | TARIH
  zorunlu: boolean
  etikette_goster: boolean
  etikette_zorunlu: boolean
  siralama: number
  varsayilan_deger: string | null
  enum_degerleri: string[]
  aktif: boolean
  olusturma_tarihi: string
  silme_tarihi: string | null
}

export interface LotOzellik {
  id: string
  stok_id: string
  ozellik_id: string
  deger: string
  birim: string | null
  olusturma_tarihi: string
  // Relations
  ozellik?: UrunOzellik
}

// Rapor
export interface StokDegerRaporu {
  urun_id: string
  urun_ad: string
  kategori: string
  toplam_miktar: number
  toplam_deger: number
}

export interface StokYaslandirma {
  bucket: string  // 0-30 | 31-60 | 61-90 | 91+
  lot_sayisi: number
  toplam_miktar: number
}

export interface FireAnaliz {
  uretim_id: string
  uretim_no: string
  urun_ad: string
  planlanan_fire: number
  gerceklesen_fire: number
  fire_orani: number
}
