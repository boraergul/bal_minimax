"""initial schema

Revision ID: 001_initial
Revises:
Create Date: 2026-07-31
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
from alembic.runtime.migration import MigrationContext
from alembic import context

# revision identifiers, used by Alembic.
revision = '001_initial'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ============================================================
    # TABLE 1: roller
    # ============================================================
    op.create_table(
        'roller',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('ad', sa.String(50), nullable=False, unique=True),
        sa.Column('aciklama', sa.Text(), nullable=True),
        sa.Column('yetkiler', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('olusturma_tarihi', sa.DateTime(), nullable=True),
        sa.Column('guncelleme_tarihi', sa.DateTime(), nullable=True),
    )
    op.create_index('ix_roller_id', 'roller', ['id'])
    op.create_index('ix_roller_ad', 'roller', ['ad'], unique=True)

    # ============================================================
    # TABLE 2: birimler
    # ============================================================
    op.create_table(
        'birimler',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('ad', sa.String(100), nullable=False),
        sa.Column('kisa_ad', sa.String(20), nullable=True),
        sa.Column('birim_tipi', sa.String(20), nullable=True),
        sa.Column('aktif', sa.Boolean(), nullable=True),
        sa.Column('olusturma_tarihi', sa.String(50), nullable=True),
        sa.Column('silme_tarihi', sa.String(50), nullable=True),
    )
    op.create_index('ix_birimler_id', 'birimler', ['id'])

    # ============================================================
    # TABLE 3: kullanicilar
    # ============================================================
    op.create_table(
        'kullanicilar',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('kullanici_adi', sa.String(100), nullable=False, unique=True),
        sa.Column('sifre_hash', sa.String(255), nullable=True),
        sa.Column('ad', sa.String(100), nullable=True),
        sa.Column('soyad', sa.String(100), nullable=True),
        sa.Column('eposta', sa.String(255), nullable=True, unique=True),
        sa.Column('rol_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('aktif', sa.Boolean(), nullable=True),
        sa.Column('telefon', sa.String(20), nullable=True),
        sa.Column('son_giris', sa.String(50), nullable=True),
        sa.Column('giris_sayisi', sa.String(20), nullable=True),
        sa.Column('iki_factor_aktivate', sa.Boolean(), nullable=True),
        sa.Column('avatar_url', sa.String(500), nullable=True),
        sa.Column('adres', sa.Text(), nullable=True),
        sa.Column('dogum_tarihi', sa.String(20), nullable=True),
        sa.Column('bolum', sa.String(100), nullable=True),
        sa.Column('unvan', sa.String(100), nullable=True),
        sa.Column('olusturma_tarihi', sa.DateTime(), nullable=True),
        sa.Column('guncelleme_tarihi', sa.DateTime(), nullable=True),
        sa.Column('silme_tarihi', sa.DateTime(), nullable=True),
        sa.Column('olusturan_kullanici_id', postgresql.UUID(as_uuid=True), nullable=True),
    )
    op.create_index('ix_kullanicilar_id', 'kullanicilar', ['id'])
    op.create_index('ix_kullanicilar_kullanici_adi', 'kullanicilar', ['kullanici_adi'], unique=True)
    op.create_index('ix_kullanicilar_eposta', 'kullanicilar', ['eposta'], unique=True)
    op.create_index('ix_kullanicilar_rol_id', 'kullanicilar', ['rol_id'])

    op.create_foreign_key(
        'fk_kullanicilar_rol_id',
        'kullanicilar', 'roller',
        ['rol_id'], ['id'],
        ondelete='SET NULL'
    )
    op.create_foreign_key(
        'fk_kullanicilar_olusturan',
        'kullanicilar', 'kullanicilar',
        ['olusturan_kullanici_id'], ['id'],
        ondelete='SET NULL'
    )

    # ============================================================
    # TABLE 4: urunler
    # ============================================================
    op.create_table(
        'urunler',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('ad', sa.String(255), nullable=False),
        sa.Column('kategori', sa.String(20), nullable=True),
        sa.Column('birim_toptan', sa.String(10), nullable=True),
        sa.Column('birim_perakende', sa.String(10), nullable=True),
        sa.Column('aktif', sa.Boolean(), nullable=True),
        sa.Column('stok_kodu', sa.String(50), nullable=True),
        sa.Column('barkod', sa.String(50), nullable=True),
        sa.Column('aciklama', sa.Text(), nullable=True),
        sa.Column('gorsel_url', sa.String(500), nullable=True),
        sa.Column('agirlik', sa.Numeric(10, 3), nullable=True),
        sa.Column('hacim', sa.Numeric(10, 3), nullable=True),
        sa.Column('minimum_stok_seviyesi', sa.Numeric(15, 3), nullable=True),
        sa.Column('maksimum_stok_seviyesi', sa.Numeric(15, 3), nullable=True),
        sa.Column('raf_omru_gun', sa.Integer(), nullable=True),
        sa.Column('hammadde_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('varsayilan_ozellikler', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('olusturan_kullanici_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('olusturma_tarihi', sa.DateTime(), nullable=True),
        sa.Column('guncelleme_tarihi', sa.DateTime(), nullable=True),
        sa.Column('silme_tarihi', sa.DateTime(), nullable=True),
    )
    op.create_index('ix_urunler_id', 'urunler', ['id'])
    op.create_index('ix_urunler_ad', 'urunler', ['ad'])
    op.create_index('ix_urunler_kategori', 'urunler', ['kategori'])
    op.create_index('ix_urunler_hammadde_id', 'urunler', ['hammadde_id'])
    op.create_index('ix_urunler_olusturan', 'urunler', ['olusturan_kullanici_id'])
    op.create_index('ix_urunler_stok_kodu', 'urunler', ['stok_kodu'], unique=True, postgresql_where=sa.text('stok_kodu IS NOT NULL'))
    op.create_index('ix_urunler_barkod', 'urunler', ['barkod'], unique=True, postgresql_where=sa.text('barkod IS NOT NULL'))

    op.create_foreign_key(
        'fk_urunler_hammadde',
        'urunler', 'urunler',
        ['hammadde_id'], ['id'],
        ondelete='SET NULL'
    )
    op.create_foreign_key(
        'fk_urunler_olusturan',
        'urunler', 'kullanicilar',
        ['olusturan_kullanici_id'], ['id'],
        ondelete='SET NULL'
    )

    # ============================================================
    # TABLE 5: urun_ozellikleri
    # ============================================================
    op.create_table(
        'urun_ozellikleri',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('urun_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('kategori', sa.String(20), nullable=True),
        sa.Column('alan_adi', sa.String(50), nullable=False),
        sa.Column('goruntu_adi', sa.String(100), nullable=True),
        sa.Column('tip', sa.String(20), nullable=True),
        sa.Column('zorunlu', sa.Boolean(), nullable=True),
        sa.Column('etikette_goster', sa.Boolean(), nullable=True),
        sa.Column('etikette_zorunlu', sa.Boolean(), nullable=True),
        sa.Column('siralama', sa.Integer(), nullable=True),
        sa.Column('varsayilan_deger', sa.String(255), nullable=True),
        sa.Column('enum_degerleri', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('olusturma_tarihi', sa.DateTime(), nullable=True),
        sa.Column('guncelleme_tarihi', sa.DateTime(), nullable=True),
        sa.Column('silme_tarihi', sa.DateTime(), nullable=True),
    )
    op.create_index('ix_urun_ozellikleri_id', 'urun_ozellikleri', ['id'])
    op.create_index('ix_urun_ozellikleri_urun_id', 'urun_ozellikleri', ['urun_id'])
    op.create_index('ix_urun_ozellikleri_kategori', 'urun_ozellikleri', ['kategori'])

    op.create_foreign_key(
        'fk_urun_ozellikleri_urun',
        'urun_ozellikleri', 'urunler',
        ['urun_id'], ['id'],
        ondelete='CASCADE'
    )

    # ============================================================
    # TABLE 6: tedarikciler
    # ============================================================
    op.create_table(
        'tedarikciler',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('ad', sa.String(255), nullable=False),
        sa.Column('vergi_no', sa.String(20), nullable=True),
        sa.Column('telefon', sa.String(20), nullable=True),
        sa.Column('eposta', sa.String(255), nullable=True),
        sa.Column('adres', sa.Text(), nullable=True),
        sa.Column('aktif', sa.Boolean(), nullable=True),
        sa.Column('olusturma_tarihi', sa.DateTime(), nullable=True),
        sa.Column('guncelleme_tarihi', sa.DateTime(), nullable=True),
        sa.Column('silme_tarihi', sa.DateTime(), nullable=True),
        sa.Column('olusturan_kullanici_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('faks', sa.String(20), nullable=True),
        sa.Column('yetkili_kisi', sa.String(255), nullable=True),
        sa.Column('yetkili_telefon', sa.String(20), nullable=True),
        sa.Column('yetkili_eposta', sa.String(255), nullable=True),
        sa.Column('banka_adi', sa.String(100), nullable=True),
        sa.Column('banka_sube', sa.String(100), nullable=True),
        sa.Column('hesap_no', sa.String(50), nullable=True),
        sa.Column('odeme_vadesi', sa.Integer(), nullable=True),
        sa.Column('tedarikci_sinifi', sa.String(1), nullable=True),
        sa.Column('not_text', sa.Text(), nullable=True),
    )
    op.create_index('ix_tedarikciler_id', 'tedarikciler', ['id'])
    op.create_index('ix_tedarikciler_ad', 'tedarikciler', ['ad'])
    op.create_index('ix_tedarikciler_vergi_no', 'tedarikciler', ['vergi_no'])
    op.create_index('ix_tedarikciler_olusturan', 'tedarikciler', ['olusturan_kullanici_id'])

    op.create_foreign_key(
        'fk_tedarikciler_olusturan',
        'tedarikciler', 'kullanicilar',
        ['olusturan_kullanici_id'], ['id'],
        ondelete='SET NULL'
    )

    # ============================================================
    # TABLE 7: tedarikci_urunleri
    # ============================================================
    op.create_table(
        'tedarikci_urunleri',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('tedarikci_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('urun_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('varsayilan_fiyat', sa.Numeric(15, 4), nullable=True),
        sa.Column('minimum_siparis_miktari', sa.Numeric(15, 3), nullable=True),
        sa.Column('teslimat_suresi', sa.Integer(), nullable=True),
        sa.Column('aktif', sa.Boolean(), nullable=True),
        sa.Column('olusturma_tarihi', sa.DateTime(), nullable=True),
        sa.Column('guncelleme_tarihi', sa.DateTime(), nullable=True),
    )
    op.create_index('ix_tedarikci_urunleri_id', 'tedarikci_urunleri', ['id'])
    op.create_index('ix_tedarikci_urunleri_tedarikci', 'tedarikci_urunleri', ['tedarikci_id'])
    op.create_index('ix_tedarikci_urunleri_urun', 'tedarikci_urunleri', ['urun_id'])

    op.create_foreign_key(
        'fk_tedarikci_urunleri_tedarikci',
        'tedarikci_urunleri', 'tedarikciler',
        ['tedarikci_id'], ['id'],
        ondelete='CASCADE'
    )
    op.create_foreign_key(
        'fk_tedarikci_urunleri_urun',
        'tedarikci_urunleri', 'urunler',
        ['urun_id'], ['id'],
        ondelete='CASCADE'
    )

    # ============================================================
    # TABLE 8: tedarikci_degerlendirmeleri
    # ============================================================
    op.create_table(
        'tedarikci_degerlendirmeleri',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('tedarikci_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('degerlendirme_tarihi', sa.String(20), nullable=True),
        sa.Column('fiyat_puani', sa.Numeric(3, 2), nullable=True),
        sa.Column('hizmet_puani', sa.Numeric(3, 2), nullable=True),
        sa.Column('genel_puan', sa.Numeric(3, 2), nullable=True),
        sa.Column('sertifikalar', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('resmi_dosyalar', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('olusturma_tarihi', sa.DateTime(), nullable=True),
        sa.Column('olusturan_kullanici_id', postgresql.UUID(as_uuid=True), nullable=True),
    )
    op.create_index('ix_tedarikci_degerlendirmeleri_id', 'tedarikci_degerlendirmeleri', ['id'])
    op.create_index('ix_tedarikci_degerlendirmeleri_tedarikci', 'tedarikci_degerlendirmeleri', ['tedarikci_id'])

    op.create_foreign_key(
        'fk_tedarikci_degerlendirmeleri_tedarikci',
        'tedarikci_degerlendirmeleri', 'tedarikciler',
        ['tedarikci_id'], ['id'],
        ondelete='CASCADE'
    )
    op.create_foreign_key(
        'fk_tedarikci_degerlendirmeleri_olusturan',
        'tedarikci_degerlendirmeleri', 'kullanicilar',
        ['olusturan_kullanici_id'], ['id'],
        ondelete='SET NULL'
    )

    # ============================================================
    # TABLE 9: tedarikci_fiyat_gecmisi
    # ============================================================
    op.create_table(
        'tedarikci_fiyat_gecmisi',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('tedarikci_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('urun_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('fiyat', sa.Numeric(15, 4), nullable=True),
        sa.Column('baslangic_tarihi', sa.String(20), nullable=True),
        sa.Column('bitis_tarihi', sa.String(20), nullable=True),
        sa.Column('olusturma_tarihi', sa.DateTime(), nullable=True),
    )
    op.create_index('ix_tedarikci_fiyat_gecmisi_id', 'tedarikci_fiyat_gecmisi', ['id'])
    op.create_index('ix_tedarikci_fiyat_gecmisi_tedarikci', 'tedarikci_fiyat_gecmisi', ['tedarikci_id'])
    op.create_index('ix_tedarikci_fiyat_gecmisi_urun', 'tedarikci_fiyat_gecmisi', ['urun_id'])

    op.create_foreign_key(
        'fk_tedarikci_fiyat_gecmisi_tedarikci',
        'tedarikci_fiyat_gecmisi', 'tedarikciler',
        ['tedarikci_id'], ['id'],
        ondelete='CASCADE'
    )
    op.create_foreign_key(
        'fk_tedarikci_fiyat_gecmisi_urun',
        'tedarikci_fiyat_gecmisi', 'urunler',
        ['urun_id'], ['id'],
        ondelete='CASCADE'
    )

    # ============================================================
    # TABLE 10: musteriler
    # ============================================================
    op.create_table(
        'musteriler',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('ad', sa.String(255), nullable=False),
        sa.Column('telefon', sa.String(20), nullable=True),
        sa.Column('eposta', sa.String(255), nullable=True),
        sa.Column('adres', sa.Text(), nullable=True),
        sa.Column('vergi_no', sa.String(20), nullable=True),
        sa.Column('not_text', sa.Text(), nullable=True),
        sa.Column('aktif', sa.Boolean(), nullable=True),
        sa.Column('olusturma_tarihi', sa.DateTime(), nullable=True),
        sa.Column('guncelleme_tarihi', sa.DateTime(), nullable=True),
        sa.Column('silme_tarihi', sa.DateTime(), nullable=True),
        sa.Column('olusturan_kullanici_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('musteri_tipi', sa.String(20), nullable=True),
        sa.Column('tc_kimlik', sa.String(11), nullable=True),
        sa.Column('faks', sa.String(20), nullable=True),
        sa.Column('teslimat_adresi', sa.Text(), nullable=True),
        sa.Column('il', sa.String(50), nullable=True),
        sa.Column('ilce', sa.String(50), nullable=True),
        sa.Column('posta_kodu', sa.String(10), nullable=True),
        sa.Column('musteri_sinifi', sa.String(1), nullable=True),
        sa.Column('satis_temsilcisi_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('dogum_tarihi', sa.String(20), nullable=True),
        sa.Column('cinsiyet', sa.String(1), nullable=True),
        sa.Column('odeme_vadesi', sa.Integer(), nullable=True),
        sa.Column('kredi_limiti', sa.Numeric(15, 4), nullable=True),
    )
    op.create_index('ix_musteriler_id', 'musteriler', ['id'])
    op.create_index('ix_musteriler_ad', 'musteriler', ['ad'])
    op.create_index('ix_musteriler_telefon', 'musteriler', ['telefon'])
    op.create_index('ix_musteriler_eposta', 'musteriler', ['eposta'])
    op.create_index('ix_musteriler_olusturan', 'musteriler', ['olusturan_kullanici_id'])
    op.create_index('ix_musteriler_satis_temsilcisi', 'musteriler', ['satis_temsilcisi_id'])

    op.create_foreign_key(
        'fk_musteriler_olusturan',
        'musteriler', 'kullanicilar',
        ['olusturan_kullanici_id'], ['id'],
        ondelete='SET NULL'
    )
    op.create_foreign_key(
        'fk_musteriler_satis_temsilcisi',
        'musteriler', 'kullanicilar',
        ['satis_temsilcisi_id'], ['id'],
        ondelete='SET NULL'
    )

    # ============================================================
    # TABLE 11: stok_kartlari
    # ============================================================
    op.create_table(
        'stok_kartlari',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('urun_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('lot_no', sa.String(50), nullable=True, unique=True),
        sa.Column('tedarikci_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('kaynak_stok_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('stok_tipi', sa.String(20), nullable=True),
        sa.Column('birim', sa.String(20), nullable=True),
        sa.Column('uretim_tarihi', sa.String(20), nullable=True),
        sa.Column('son_kullanma', sa.String(20), nullable=True),
        sa.Column('giris_tarihi', sa.String(50), nullable=True),
        sa.Column('miktar', sa.Numeric(15, 3), nullable=True),
        sa.Column('birim_fiyat', sa.Numeric(15, 4), nullable=True),
        sa.Column('konum', sa.String(100), nullable=True),
        sa.Column('depo', sa.String(50), nullable=True),
        sa.Column('raf', sa.String(50), nullable=True),
        sa.Column('blok', sa.String(50), nullable=True),
        sa.Column('durum', sa.String(20), nullable=True),
        sa.Column('kalite_notu', sa.Numeric(3, 2), nullable=True),
        sa.Column('kalite_kontrol_tarihi', sa.String(50), nullable=True),
        sa.Column('kalite_kontrol_edildi', sa.Boolean(), nullable=True),
        sa.Column('agirlik_birim', sa.String(20), nullable=True),
        sa.Column('brut_miktar', sa.Numeric(15, 3), nullable=True),
        sa.Column('net_miktar', sa.Numeric(15, 3), nullable=True),
        sa.Column('palet_no', sa.String(50), nullable=True),
        sa.Column('giris_referans_no', sa.String(100), nullable=True),
        sa.Column('musteri_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('satis_hareket_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('olusturan_kullanici_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('olusturma_tarihi', sa.DateTime(), nullable=True),
        sa.Column('guncelleme_tarihi', sa.DateTime(), nullable=True),
        sa.Column('silme_tarihi', sa.String(50), nullable=True),
    )
    op.create_index('ix_stok_kartlari_id', 'stok_kartlari', ['id'])
    op.create_index('ix_stok_kartlari_lot_no', 'stok_kartlari', ['lot_no'])
    op.create_index('ix_stok_kartlari_urun_id', 'stok_kartlari', ['urun_id'])
    op.create_index('ix_stok_kartlari_durum', 'stok_kartlari', ['durum'])
    op.create_index('ix_stok_kartlari_son_kullanma', 'stok_kartlari', ['son_kullanma'])
    op.create_index('ix_stok_kartlari_tedarikci', 'stok_kartlari', ['tedarikci_id'])
    op.create_index('ix_stok_kartlari_musteri', 'stok_kartlari', ['musteri_id'])

    op.create_foreign_key(
        'fk_stok_kartlari_urun',
        'stok_kartlari', 'urunler',
        ['urun_id'], ['id'],
        ondelete='RESTRICT'
    )
    op.create_foreign_key(
        'fk_stok_kartlari_tedarikci',
        'stok_kartlari', 'tedarikciler',
        ['tedarikci_id'], ['id'],
        ondelete='SET NULL'
    )
    op.create_foreign_key(
        'fk_stok_kartlari_kaynak',
        'stok_kartlari', 'stok_kartlari',
        ['kaynak_stok_id'], ['id'],
        ondelete='SET NULL'
    )
    op.create_foreign_key(
        'fk_stok_kartlari_musteri',
        'stok_kartlari', 'musteriler',
        ['musteri_id'], ['id'],
        ondelete='SET NULL'
    )
    op.create_foreign_key(
        'fk_stok_kartlari_olusturan',
        'stok_kartlari', 'kullanicilar',
        ['olusturan_kullanici_id'], ['id'],
        ondelete='SET NULL'
    )

    # ============================================================
    # TABLE 12: stok_hareketleri
    # ============================================================
    op.create_table(
        'stok_hareketleri',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('stok_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('hareket_tipi', sa.String(30), nullable=False),
        sa.Column('miktar', sa.Numeric(15, 3), nullable=True),
        sa.Column('birim_fiyat', sa.Numeric(15, 4), nullable=True),
        sa.Column('tutar', sa.Numeric(15, 4), nullable=True),
        sa.Column('onceki_miktar', sa.Numeric(15, 3), nullable=True),
        sa.Column('sonraki_miktar', sa.Numeric(15, 3), nullable=True),
        sa.Column('referans_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('referans_tipi', sa.String(30), nullable=True),
        sa.Column('aciklama', sa.Text(), nullable=True),
        sa.Column('karsi_stok_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('fifo_ihlal_edildi', sa.Boolean(), nullable=True),
        sa.Column('fifo_ihlal_nedeni', sa.Text(), nullable=True),
        sa.Column('lot_no', sa.String(50), nullable=True),
        sa.Column('musteri_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('tedarikci_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('olusturan_kullanici_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('olusturma_tarihi', sa.DateTime(), nullable=True),
        sa.Column('guncelleme_tarihi', sa.DateTime(), nullable=True),
    )
    op.create_index('ix_stok_hareketleri_id', 'stok_hareketleri', ['id'])
    op.create_index('ix_stok_hareketleri_stok_id', 'stok_hareketleri', ['stok_id'])
    op.create_index('ix_stok_hareketleri_tarih', 'stok_hareketleri', ['olusturma_tarihi'])
    op.create_index('ix_stok_hareketleri_hareket_tipi', 'stok_hareketleri', ['hareket_tipi'])
    op.create_index('ix_stok_hareketleri_musteri', 'stok_hareketleri', ['musteri_id'])
    op.create_index('ix_stok_hareketleri_tedarikci', 'stok_hareketleri', ['tedarikci_id'])

    op.create_foreign_key(
        'fk_stok_hareketleri_stok',
        'stok_hareketleri', 'stok_kartlari',
        ['stok_id'], ['id'],
        ondelete='CASCADE'
    )
    op.create_foreign_key(
        'fk_stok_hareketleri_karsi_stok',
        'stok_hareketleri', 'stok_kartlari',
        ['karsi_stok_id'], ['id'],
        ondelete='SET NULL'
    )
    op.create_foreign_key(
        'fk_stok_hareketleri_musteri',
        'stok_hareketleri', 'musteriler',
        ['musteri_id'], ['id'],
        ondelete='SET NULL'
    )
    op.create_foreign_key(
        'fk_stok_hareketleri_tedarikci',
        'stok_hareketleri', 'tedarikciler',
        ['tedarikci_id'], ['id'],
        ondelete='SET NULL'
    )
    op.create_foreign_key(
        'fk_stok_hareketleri_olusturan',
        'stok_hareketleri', 'kullanicilar',
        ['olusturan_kullanici_id'], ['id'],
        ondelete='SET NULL'
    )

    # ============================================================
    # TABLE 13: lot_ozellikleri
    # ============================================================
    op.create_table(
        'lot_ozellikleri',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('stok_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('ozellik_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('deger', sa.String(255), nullable=True),
        sa.Column('birim', sa.String(20), nullable=True),
        sa.Column('olusturma_tarihi', sa.DateTime(), nullable=True),
        sa.Column('guncelleme_tarihi', sa.DateTime(), nullable=True),
    )
    op.create_index('ix_lot_ozellikleri_id', 'lot_ozellikleri', ['id'])
    op.create_index('ix_lot_ozellikleri_stok', 'lot_ozellikleri', ['stok_id'])
    op.create_index('ix_lot_ozellikleri_ozellik', 'lot_ozellikleri', ['ozellik_id'])

    op.create_foreign_key(
        'fk_lot_ozellikleri_stok',
        'lot_ozellikleri', 'stok_kartlari',
        ['stok_id'], ['id'],
        ondelete='CASCADE'
    )
    op.create_foreign_key(
        'fk_lot_ozellikleri_ozellik',
        'lot_ozellikleri', 'urun_ozellikleri',
        ['ozellik_id'], ['id'],
        ondelete='CASCADE'
    )

    # ============================================================
    # TABLE 14: lot_fotograflari
    # ============================================================
    op.create_table(
        'lot_fotograflari',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('stok_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('foto_url', sa.String(500), nullable=True),
        sa.Column('thumbnail_url', sa.String(500), nullable=True),
        sa.Column('foto_tarihi', sa.String(50), nullable=True),
        sa.Column('not_text', sa.Text(), nullable=True),
        sa.Column('olusturan_kullanici_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('olusturma_tarihi', sa.DateTime(), nullable=True),
        sa.Column('guncelleme_tarihi', sa.DateTime(), nullable=True),
    )
    op.create_index('ix_lot_fotograflari_id', 'lot_fotograflari', ['id'])
    op.create_index('ix_lot_fotograflari_stok', 'lot_fotograflari', ['stok_id'])

    op.create_foreign_key(
        'fk_lot_fotograflari_stok',
        'lot_fotograflari', 'stok_kartlari',
        ['stok_id'], ['id'],
        ondelete='CASCADE'
    )
    op.create_foreign_key(
        'fk_lot_fotograflari_olusturan',
        'lot_fotograflari', 'kullanicilar',
        ['olusturan_kullanici_id'], ['id'],
        ondelete='SET NULL'
    )

    # ============================================================
    # TABLE 15: uretim_emirleri
    # ============================================================
    op.create_table(
        'uretim_emirleri',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('uretim_no', sa.String(50), nullable=False, unique=True),
        sa.Column('tarih', sa.String(50), nullable=True),
        sa.Column('durum', sa.String(20), nullable=True),
        sa.Column('not_text', sa.Text(), nullable=True),
        sa.Column('oncelik', sa.String(10), nullable=True),
        sa.Column('planlanan_miktar', sa.Numeric(15, 3), nullable=True),
        sa.Column('gerceklesen_miktar', sa.Numeric(15, 3), nullable=True),
        sa.Column('planlanan_tarih', sa.String(20), nullable=True),
        sa.Column('planlanan_baslama', sa.String(50), nullable=True),
        sa.Column('gerceklesen_baslama', sa.String(50), nullable=True),
        sa.Column('tamamlama_tarihi', sa.String(50), nullable=True),
        sa.Column('son_tarih', sa.String(20), nullable=True),
        sa.Column('kalite_kontrol_onayi', sa.Boolean(), nullable=True),
        sa.Column('kalite_kontrol_tarihi', sa.String(50), nullable=True),
        sa.Column('kalite_kontrol_eden_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('toplam_maliyet', sa.Numeric(15, 4), nullable=True),
        sa.Column('fire_orani_planlanan', sa.Numeric(5, 4), nullable=True),
        sa.Column('fire_orani_gercek', sa.Numeric(5, 4), nullable=True),
        sa.Column('musteri_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('siparis_no', sa.String(50), nullable=True),
        sa.Column('olusturan_kullanici_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('silme_tarihi', sa.String(50), nullable=True),
        sa.Column('olusturma_tarihi', sa.DateTime(), nullable=True),
        sa.Column('guncelleme_tarihi', sa.DateTime(), nullable=True),
    )
    op.create_index('ix_uretim_emirleri_id', 'uretim_emirleri', ['id'])
    op.create_index('ix_uretim_emirleri_uretim_no', 'uretim_emirleri', ['uretim_no'], unique=True)
    op.create_index('ix_uretim_emirleri_durum', 'uretim_emirleri', ['durum'])
    op.create_index('ix_uretim_emirleri_tarih', 'uretim_emirleri', ['tarih'])
    op.create_index('ix_uretim_emirleri_musteri', 'uretim_emirleri', ['musteri_id'])

    op.create_foreign_key(
        'fk_uretim_emirleri_musteri',
        'uretim_emirleri', 'musteriler',
        ['musteri_id'], ['id'],
        ondelete='SET NULL'
    )
    op.create_foreign_key(
        'fk_uretim_emirleri_kalite_kontrol_eden',
        'uretim_emirleri', 'kullanicilar',
        ['kalite_kontrol_eden_id'], ['id'],
        ondelete='SET NULL'
    )
    op.create_foreign_key(
        'fk_uretim_emirleri_olusturan',
        'uretim_emirleri', 'kullanicilar',
        ['olusturan_kullanici_id'], ['id'],
        ondelete='SET NULL'
    )

    # ============================================================
    # TABLE 16: uretim_detaylari
    # ============================================================
    op.create_table(
        'uretim_detaylari',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('uretim_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('mamul_urun_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('mamul_miktar', sa.Numeric(15, 3), nullable=True),
        sa.Column('hammadde_urun_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('hammadde_lot_no', sa.String(50), nullable=True),
        sa.Column('hammadde_miktar', sa.Numeric(15, 3), nullable=True),
        sa.Column('fire_miktari', sa.Numeric(15, 3), nullable=True),
        sa.Column('olusturma_tarihi', sa.DateTime(), nullable=True),
        sa.Column('guncelleme_tarihi', sa.DateTime(), nullable=True),
    )
    op.create_index('ix_uretim_detaylari_id', 'uretim_detaylari', ['id'])
    op.create_index('ix_uretim_detaylari_uretim', 'uretim_detaylari', ['uretim_id'])
    op.create_index('ix_uretim_detaylari_mamul', 'uretim_detaylari', ['mamul_urun_id'])
    op.create_index('ix_uretim_detaylari_hammadde', 'uretim_detaylari', ['hammadde_urun_id'])

    op.create_foreign_key(
        'fk_uretim_detaylari_uretim',
        'uretim_detaylari', 'uretim_emirleri',
        ['uretim_id'], ['id'],
        ondelete='CASCADE'
    )
    op.create_foreign_key(
        'fk_uretim_detaylari_mamul',
        'uretim_detaylari', 'urunler',
        ['mamul_urun_id'], ['id'],
        ondelete='RESTRICT'
    )
    op.create_foreign_key(
        'fk_uretim_detaylari_hammadde',
        'uretim_detaylari', 'urunler',
        ['hammadde_urun_id'], ['id'],
        ondelete='RESTRICT'
    )

    # ============================================================
    # TABLE 17: satis_kayitlari
    # ============================================================
    op.create_table(
        'satis_kayitlari',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('satis_no', sa.String(50), nullable=False, unique=True),
        sa.Column('musteri_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('tarih', sa.String(50), nullable=True),
        sa.Column('durum', sa.String(20), nullable=True),
        sa.Column('toplam_tutar', sa.Numeric(15, 4), nullable=True),
        sa.Column('indirim_tutari', sa.Numeric(15, 4), nullable=True),
        sa.Column('not_text', sa.Text(), nullable=True),
        sa.Column('teslimat_adresi', sa.Text(), nullable=True),
        sa.Column('kargo_bilgileri', sa.String(255), nullable=True),
        sa.Column('satis_tipi', sa.String(20), nullable=True),
        sa.Column('odeme_sekli', sa.String(20), nullable=True),
        sa.Column('odeme_durumu', sa.String(20), nullable=True),
        sa.Column('vade_tarihi', sa.String(20), nullable=True),
        sa.Column('fatura_kesildi', sa.Boolean(), nullable=True),
        sa.Column('fatura_no', sa.String(50), nullable=True),
        sa.Column('fatura_tarihi', sa.String(20), nullable=True),
        sa.Column('iade_tarihi', sa.String(50), nullable=True),
        sa.Column('iade_nedeni', sa.Text(), nullable=True),
        sa.Column('teslimat_tarihi', sa.String(20), nullable=True),
        sa.Column('teslim_tarihi', sa.String(20), nullable=True),
        sa.Column('teslim_eden_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('teslim_alan', sa.String(255), nullable=True),
        sa.Column('olusturan_kullanici_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('silme_tarihi', sa.String(50), nullable=True),
        sa.Column('olusturma_tarihi', sa.DateTime(), nullable=True),
        sa.Column('guncelleme_tarihi', sa.DateTime(), nullable=True),
    )
    op.create_index('ix_satis_kayitlari_id', 'satis_kayitlari', ['id'])
    op.create_index('ix_satis_kayitlari_satis_no', 'satis_kayitlari', ['satis_no'], unique=True)
    op.create_index('ix_satis_kayitlari_musteri', 'satis_kayitlari', ['musteri_id'])
    op.create_index('ix_satis_kayitlari_tarih', 'satis_kayitlari', ['tarih'])
    op.create_index('ix_satis_kayitlari_durum', 'satis_kayitlari', ['durum'])

    op.create_foreign_key(
        'fk_satis_kayitlari_musteri',
        'satis_kayitlari', 'musteriler',
        ['musteri_id'], ['id'],
        ondelete='RESTRICT'
    )
    op.create_foreign_key(
        'fk_satis_kayitlari_teslim_eden',
        'satis_kayitlari', 'kullanicilar',
        ['teslim_eden_id'], ['id'],
        ondelete='SET NULL'
    )
    op.create_foreign_key(
        'fk_satis_kayitlari_olusturan',
        'satis_kayitlari', 'kullanicilar',
        ['olusturan_kullanici_id'], ['id'],
        ondelete='SET NULL'
    )

    # ============================================================
    # TABLE 18: satis_kalemleri
    # ============================================================
    op.create_table(
        'satis_kalemleri',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('satis_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('urun_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('stok_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('miktar', sa.Numeric(15, 3), nullable=True),
        sa.Column('birim_fiyat', sa.Numeric(15, 4), nullable=True),
        sa.Column('tutar', sa.Numeric(15, 4), nullable=True),
        sa.Column('birim', sa.String(20), nullable=True),
        sa.Column('lot_no', sa.String(50), nullable=True),
        sa.Column('olusturma_tarihi', sa.DateTime(), nullable=True),
        sa.Column('guncelleme_tarihi', sa.DateTime(), nullable=True),
    )
    op.create_index('ix_satis_kalemleri_id', 'satis_kalemleri', ['id'])
    op.create_index('ix_satis_kalemleri_satis', 'satis_kalemleri', ['satis_id'])
    op.create_index('ix_satis_kalemleri_urun', 'satis_kalemleri', ['urun_id'])
    op.create_index('ix_satis_kalemleri_stok', 'satis_kalemleri', ['stok_id'])

    op.create_foreign_key(
        'fk_satis_kalemleri_satis',
        'satis_kalemleri', 'satis_kayitlari',
        ['satis_id'], ['id'],
        ondelete='CASCADE'
    )
    op.create_foreign_key(
        'fk_satis_kalemleri_urun',
        'satis_kalemleri', 'urunler',
        ['urun_id'], ['id'],
        ondelete='RESTRICT'
    )
    op.create_foreign_key(
        'fk_satis_kalemleri_stok',
        'satis_kalemleri', 'stok_kartlari',
        ['stok_id'], ['id'],
        ondelete='SET NULL'
    )

    # ============================================================
    # TABLE 19: kalite_kontroller
    # ============================================================
    op.create_table(
        'kalite_kontroller',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('stok_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('uretim_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('kontrol_turu', sa.String(30), nullable=True),
        sa.Column('kontrol_eden_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('kontrol_tarihi', sa.String(50), nullable=True),
        sa.Column('durum', sa.String(30), nullable=True),
        sa.Column('gorsel_kontrol', sa.Boolean(), nullable=True),
        sa.Column('ambalaj_durumu', sa.String(20), nullable=True),
        sa.Column('etiket_okunakli', sa.Boolean(), nullable=True),
        sa.Column('son_kullanma_tarihi', sa.String(20), nullable=True),
        sa.Column('laboratuvar_sonuclari', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('ret_nedeni', sa.Text(), nullable=True),
        sa.Column('ret_kriterleri', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('sonuc_aciklamasi', sa.Text(), nullable=True),
        sa.Column('onay_durumu', sa.String(30), nullable=True),
        sa.Column('onay_leyen_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('onay_tarihi', sa.String(50), nullable=True),
        sa.Column('olusturan_kullanici_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('olusturma_tarihi', sa.DateTime(), nullable=True),
        sa.Column('guncelleme_tarihi', sa.DateTime(), nullable=True),
    )
    op.create_index('ix_kalite_kontroller_id', 'kalite_kontroller', ['id'])
    op.create_index('ix_kalite_kontroller_stok', 'kalite_kontroller', ['stok_id'])
    op.create_index('ix_kalite_kontroller_uretim', 'kalite_kontroller', ['uretim_id'])
    op.create_index('ix_kalite_kontroller_kontrol_eden', 'kalite_kontroller', ['kontrol_eden_id'])
    op.create_index('ix_kalite_kontroller_tarih', 'kalite_kontroller', ['kontrol_tarihi'])

    op.create_foreign_key(
        'fk_kalite_kontroller_stok',
        'kalite_kontroller', 'stok_kartlari',
        ['stok_id'], ['id'],
        ondelete='CASCADE'
    )
    op.create_foreign_key(
        'fk_kalite_kontroller_uretim',
        'kalite_kontroller', 'uretim_emirleri',
        ['uretim_id'], ['id'],
        ondelete='CASCADE'
    )
    op.create_foreign_key(
        'fk_kalite_kontroller_kontrol_eden',
        'kalite_kontroller', 'kullanicilar',
        ['kontrol_eden_id'], ['id'],
        ondelete='SET NULL'
    )
    op.create_foreign_key(
        'fk_kalite_kontroller_onay_leyen',
        'kalite_kontroller', 'kullanicilar',
        ['onay_leyen_id'], ['id'],
        ondelete='SET NULL'
    )
    op.create_foreign_key(
        'fk_kalite_kontroller_olusturan',
        'kalite_kontroller', 'kullanicilar',
        ['olusturan_kullanici_id'], ['id'],
        ondelete='SET NULL'
    )

    # ============================================================
    # TABLE 20: kalite_numuneleri
    # ============================================================
    op.create_table(
        'kalite_numuneleri',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('kalite_kontrol_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('numune_no', sa.String(50), nullable=True),
        sa.Column('numune_turu', sa.String(50), nullable=True),
        sa.Column('numune_aciklamasi', sa.Text(), nullable=True),
        sa.Column('sonuc', sa.String(30), nullable=True),
        sa.Column('sonuc_deger', sa.String(100), nullable=True),
        sa.Column('referans_deger', sa.String(100), nullable=True),
        sa.Column('birim', sa.String(20), nullable=True),
        sa.Column('rapor_url', sa.String(500), nullable=True),
        sa.Column('foto_url', sa.String(500), nullable=True),
        sa.Column('kontrol_eden_lab', sa.String(255), nullable=True),
        sa.Column('lab_rapor_no', sa.String(100), nullable=True),
        sa.Column('olusturma_tarihi', sa.String(50), nullable=True),
        sa.Column('olusturan_kullanici_id', postgresql.UUID(as_uuid=True), nullable=True),
            sa.Column('guncelleme_tarihi', sa.DateTime(), nullable=True),
)
    op.create_index('ix_kalite_numuneleri_id', 'kalite_numuneleri', ['id'])
    op.create_index('ix_kalite_numuneleri_kalite_kontrol', 'kalite_numuneleri', ['kalite_kontrol_id'])

    op.create_foreign_key(
        'fk_kalite_numuneleri_kalite_kontrol',
        'kalite_numuneleri', 'kalite_kontroller',
        ['kalite_kontrol_id'], ['id'],
        ondelete='CASCADE'
    )
    op.create_foreign_key(
        'fk_kalite_numuneleri_olusturan',
        'kalite_numuneleri', 'kullanicilar',
        ['olusturan_kullanici_id'], ['id'],
        ondelete='SET NULL'
    )

    # ============================================================
    # TABLE 21: skt_islemler
    # ============================================================
    op.create_table(
        'skt_islemler',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('stok_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('islem_turu', sa.String(30), nullable=True),
        sa.Column('talep_durumu', sa.String(30), nullable=True),
        sa.Column('talep_eden_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('talep_tarihi', sa.String(50), nullable=True),
        sa.Column('onay_leyen_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('onay_tarihi', sa.String(50), nullable=True),
        sa.Column('ret_nedeni', sa.Text(), nullable=True),
        sa.Column('mevcut_miktar', sa.Numeric(15, 3), nullable=True),
        sa.Column('islem_miktari', sa.Numeric(15, 3), nullable=True),
        sa.Column('birim', sa.String(20), nullable=True),
        sa.Column('maliyet', sa.Numeric(15, 4), nullable=True),
        sa.Column('indirim_orani', sa.Numeric(5, 2), nullable=True),
        sa.Column('indirimli_fiyat', sa.Numeric(15, 4), nullable=True),
        sa.Column('devir_tarihi', sa.String(20), nullable=True),
        sa.Column('devir_alana', sa.String(255), nullable=True),
        sa.Column('imha_tarihi', sa.String(50), nullable=True),
        sa.Column('imha_yontemi', sa.String(100), nullable=True),
        sa.Column('imha_tutanagi_url', sa.String(500), nullable=True),
        sa.Column('not_text', sa.Text(), nullable=True),
        sa.Column('gerekce', sa.Text(), nullable=True),
        sa.Column('olusturma_tarihi', sa.String(50), nullable=True),
    )
    op.create_index('ix_skt_islemler_id', 'skt_islemler', ['id'])
    op.create_index('ix_skt_islemler_stok', 'skt_islemler', ['stok_id'])
    op.create_index('ix_skt_islemler_talep_eden', 'skt_islemler', ['talep_eden_id'])
    op.create_index('ix_skt_islemler_tarih', 'skt_islemler', ['talep_tarihi'])

    op.create_foreign_key(
        'fk_skt_islemler_stok',
        'skt_islemler', 'stok_kartlari',
        ['stok_id'], ['id'],
        ondelete='CASCADE'
    )
    op.create_foreign_key(
        'fk_skt_islemler_talep_eden',
        'skt_islemler', 'kullanicilar',
        ['talep_eden_id'], ['id'],
        ondelete='RESTRICT'
    )
    op.create_foreign_key(
        'fk_skt_islemler_onay_leyen',
        'skt_islemler', 'kullanicilar',
        ['onay_leyen_id'], ['id'],
        ondelete='SET NULL'
    )

    # ============================================================
    # TABLE 22: stok_duzeltme_talepleri
    # ============================================================
    op.create_table(
        'stok_duzeltme_talepleri',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('stok_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('talep_turu', sa.String(30), nullable=True),
        sa.Column('talep_durumu', sa.String(30), nullable=True),
        sa.Column('onceki_miktar', sa.Numeric(15, 3), nullable=True),
        sa.Column('yeni_miktar', sa.Numeric(15, 3), nullable=True),
        sa.Column('fark_miktar', sa.Numeric(15, 3), nullable=True),
        sa.Column('birim', sa.String(20), nullable=True),
        sa.Column('kritik_duzeltme', sa.Boolean(), nullable=True),
        sa.Column('kritik_durum_aciklama', sa.Text(), nullable=True),
        sa.Column('talep_eden_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('talep_tarihi', sa.String(50), nullable=True),
        sa.Column('talep_aciklamasi', sa.Text(), nullable=True),
        sa.Column('onay_leyen_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('onay_tarihi', sa.String(50), nullable=True),
        sa.Column('ret_nedeni', sa.Text(), nullable=True),
        sa.Column('stok_guncelleme_tarihi', sa.String(50), nullable=True),
        sa.Column('olusturma_tarihi', sa.String(50), nullable=True),
    )
    op.create_index('ix_stok_duzeltme_talepleri_id', 'stok_duzeltme_talepleri', ['id'])
    op.create_index('ix_stok_duzeltme_talepleri_stok', 'stok_duzeltme_talepleri', ['stok_id'])
    op.create_index('ix_stok_duzeltme_talepleri_talep_eden', 'stok_duzeltme_talepleri', ['talep_eden_id'])
    op.create_index('ix_stok_duzeltme_talepleri_tarih', 'stok_duzeltme_talepleri', ['talep_tarihi'])

    op.create_foreign_key(
        'fk_stok_duzeltme_talepleri_stok',
        'stok_duzeltme_talepleri', 'stok_kartlari',
        ['stok_id'], ['id'],
        ondelete='CASCADE'
    )
    op.create_foreign_key(
        'fk_stok_duzeltme_talepleri_talep_eden',
        'stok_duzeltme_talepleri', 'kullanicilar',
        ['talep_eden_id'], ['id'],
        ondelete='RESTRICT'
    )
    op.create_foreign_key(
        'fk_stok_duzeltme_talepleri_onay_leyen',
        'stok_duzeltme_talepleri', 'kullanicilar',
        ['onay_leyen_id'], ['id'],
        ondelete='SET NULL'
    )

    # ============================================================
    # TABLE 23: birim_donusumleri
    # ============================================================
    op.create_table(
        'birim_donusumleri',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('kaynak_birim_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('hedef_birim_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('donusum_orani', sa.Numeric(20, 10), nullable=True),
        sa.Column('ters_oran', sa.Numeric(20, 10), nullable=True),
        sa.Column('aktif', sa.Boolean(), nullable=True),
        sa.Column('baslangic_tarihi', sa.String(20), nullable=True),
        sa.Column('bitis_tarihi', sa.String(20), nullable=True),
        sa.Column('olusturma_tarihi', sa.String(50), nullable=True),
        sa.Column('silme_tarihi', sa.String(50), nullable=True),
            sa.Column('guncelleme_tarihi', sa.DateTime(), nullable=True),
)
    op.create_index('ix_birim_donusumleri_id', 'birim_donusumleri', ['id'])
    op.create_index('ix_birim_donusumleri_kaynak', 'birim_donusumleri', ['kaynak_birim_id'])
    op.create_index('ix_birim_donusumleri_hedef', 'birim_donusumleri', ['hedef_birim_id'])

    op.create_foreign_key(
        'fk_birim_donusumleri_kaynak',
        'birim_donusumleri', 'birimler',
        ['kaynak_birim_id'], ['id'],
        ondelete='RESTRICT'
    )
    op.create_foreign_key(
        'fk_birim_donusumleri_hedef',
        'birim_donusumleri', 'birimler',
        ['hedef_birim_id'], ['id'],
        ondelete='RESTRICT'
    )

    # ============================================================
    # TABLE 24: satis_iadeleri
    # ============================================================
    op.create_table(
        'satis_iadeleri',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('satis_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('musteri_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('iade_no', sa.String(50), nullable=False, unique=True),
        sa.Column('iade_tarihi', sa.String(50), nullable=True),
        sa.Column('iade_durumu', sa.String(30), nullable=True),
        sa.Column('iade_nedeni', sa.String(30), nullable=True),
        sa.Column('toplam_miktar', sa.Numeric(15, 3), nullable=True),
        sa.Column('toplam_tutar', sa.Numeric(15, 4), nullable=True),
        sa.Column('fire_miktari', sa.Numeric(15, 3), nullable=True),
        sa.Column('fire_orani', sa.Numeric(5, 4), nullable=True),
        sa.Column('fire_nedeni', sa.Text(), nullable=True),
        sa.Column('kalite_kontrol_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('kalite_kontrol_sonucu', sa.String(30), nullable=True),
        sa.Column('stok_giris_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('stok_giris_tarihi', sa.String(50), nullable=True),
        sa.Column('musteri_aciklamasi', sa.Text(), nullable=True),
        sa.Column('yetkili_aciklama', sa.Text(), nullable=True),
        sa.Column('olusturma_tarihi', sa.String(50), nullable=True),
        sa.Column('olusturan_kullanici_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('silme_tarihi', sa.String(50), nullable=True),
            sa.Column('guncelleme_tarihi', sa.DateTime(), nullable=True),
)
    op.create_index('ix_satis_iadeleri_id', 'satis_iadeleri', ['id'])
    op.create_index('ix_satis_iadeleri_iade_no', 'satis_iadeleri', ['iade_no'], unique=True)
    op.create_index('ix_satis_iadeleri_satis', 'satis_iadeleri', ['satis_id'])
    op.create_index('ix_satis_iadeleri_musteri', 'satis_iadeleri', ['musteri_id'])
    op.create_index('ix_satis_iadeleri_tarih', 'satis_iadeleri', ['iade_tarihi'])

    op.create_foreign_key(
        'fk_satis_iadeleri_satis',
        'satis_iadeleri', 'satis_kayitlari',
        ['satis_id'], ['id'],
        ondelete='RESTRICT'
    )
    op.create_foreign_key(
        'fk_satis_iadeleri_musteri',
        'satis_iadeleri', 'musteriler',
        ['musteri_id'], ['id'],
        ondelete='RESTRICT'
    )
    op.create_foreign_key(
        'fk_satis_iadeleri_kalite_kontrol',
        'satis_iadeleri', 'kalite_kontroller',
        ['kalite_kontrol_id'], ['id'],
        ondelete='SET NULL'
    )
    op.create_foreign_key(
        'fk_satis_iadeleri_stok_giris',
        'satis_iadeleri', 'stok_kartlari',
        ['stok_giris_id'], ['id'],
        ondelete='SET NULL'
    )
    op.create_foreign_key(
        'fk_satis_iadeleri_olusturan',
        'satis_iadeleri', 'kullanicilar',
        ['olusturan_kullanici_id'], ['id'],
        ondelete='SET NULL'
    )

    # ============================================================
    # TABLE 25: iade_numuneleri
    # ============================================================
    op.create_table(
        'iade_numuneleri',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('iade_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('numune_no', sa.String(50), nullable=True),
        sa.Column('numune_turu', sa.String(50), nullable=True),
        sa.Column('numune_aciklamasi', sa.Text(), nullable=True),
        sa.Column('sonuc', sa.String(30), nullable=True),
        sa.Column('sonuc_aciklamasi', sa.Text(), nullable=True),
        sa.Column('foto_url', sa.String(500), nullable=True),
        sa.Column('olusturma_tarihi', sa.String(50), nullable=True),
        sa.Column('olusturan_kullanici_id', postgresql.UUID(as_uuid=True), nullable=True),
            sa.Column('guncelleme_tarihi', sa.DateTime(), nullable=True),
)
    op.create_index('ix_iade_numuneleri_id', 'iade_numuneleri', ['id'])
    op.create_index('ix_iade_numuneleri_iade', 'iade_numuneleri', ['iade_id'])

    op.create_foreign_key(
        'fk_iade_numuneleri_iade',
        'iade_numuneleri', 'satis_iadeleri',
        ['iade_id'], ['id'],
        ondelete='CASCADE'
    )
    op.create_foreign_key(
        'fk_iade_numuneleri_olusturan',
        'iade_numuneleri', 'kullanicilar',
        ['olusturan_kullanici_id'], ['id'],
        ondelete='SET NULL'
    )

    # ============================================================
    # TABLE 26: toplu_islemler
    # ============================================================
    op.create_table(
        'toplu_islemler',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('islem_turu', sa.String(50), nullable=True),
        sa.Column('islem_no', sa.String(50), nullable=False, unique=True),
        sa.Column('durum', sa.String(30), nullable=True),
        sa.Column('dosya_adi', sa.String(255), nullable=True),
        sa.Column('dosya_url', sa.String(500), nullable=True),
        sa.Column('satir_sayisi', sa.Integer(), nullable=True),
        sa.Column('basarili_satir', sa.Integer(), nullable=True),
        sa.Column('basarisiz_satir', sa.Integer(), nullable=True),
        sa.Column('islenen_satir', sa.Integer(), nullable=True),
        sa.Column('validasyon_hatalari', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('validasyon_tarihi', sa.String(50), nullable=True),
        sa.Column('islem_baslangic', sa.String(50), nullable=True),
        sa.Column('islem_bitis', sa.String(50), nullable=True),
        sa.Column('onay_durumu', sa.String(30), nullable=True),
        sa.Column('onay_leyen_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('onay_tarihi', sa.String(50), nullable=True),
        sa.Column('ret_nedeni', sa.Text(), nullable=True),
        sa.Column('sonuc_dosya_url', sa.String(500), nullable=True),
        sa.Column('not_text', sa.Text(), nullable=True),
        sa.Column('olusturma_tarihi', sa.String(50), nullable=True),
        sa.Column('olusturan_kullanici_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('silme_tarihi', sa.String(50), nullable=True),
            sa.Column('guncelleme_tarihi', sa.DateTime(), nullable=True),
)
    op.create_index('ix_toplu_islemler_id', 'toplu_islemler', ['id'])
    op.create_index('ix_toplu_islemler_islem_no', 'toplu_islemler', ['islem_no'], unique=True)
    op.create_index('ix_toplu_islemler_tarih', 'toplu_islemler', ['olusturma_tarihi'])
    op.create_index('ix_toplu_islemler_durum', 'toplu_islemler', ['durum'])

    op.create_foreign_key(
        'fk_toplu_islemler_onay_leyen',
        'toplu_islemler', 'kullanicilar',
        ['onay_leyen_id'], ['id'],
        ondelete='SET NULL'
    )
    op.create_foreign_key(
        'fk_toplu_islemler_olusturan',
        'toplu_islemler', 'kullanicilar',
        ['olusturan_kullanici_id'], ['id'],
        ondelete='SET NULL'
    )

    # ============================================================
    # TABLE 27: toplu_islem_satirlari
    # ============================================================
    op.create_table(
        'toplu_islem_satirlari',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('toplu_islem_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('satir_no', sa.Integer(), nullable=True),
        sa.Column('satir_verisi', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('durum', sa.String(30), nullable=True),
        sa.Column('islenen_veri', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('olusturulan_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('hata_mesaji', sa.Text(), nullable=True),
        sa.Column('olusturma_tarihi', sa.String(50), nullable=True),
            sa.Column('guncelleme_tarihi', sa.DateTime(), nullable=True),
)
    op.create_index('ix_toplu_islem_satirlari_id', 'toplu_islem_satirlari', ['id'])
    op.create_index('ix_toplu_islem_satirlari_toplu_islem', 'toplu_islem_satirlari', ['toplu_islem_id'])

    op.create_foreign_key(
        'fk_toplu_islem_satirlari_toplu_islem',
        'toplu_islem_satirlari', 'toplu_islemler',
        ['toplu_islem_id'], ['id'],
        ondelete='CASCADE'
    )

    # ============================================================
    # TABLE 28: uretim_iscilik
    # ============================================================
    op.create_table(
        'uretim_iscilik',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('uretim_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('personel_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('personel_ad', sa.String(255), nullable=True),
        sa.Column('baslangic_saat', sa.String(50), nullable=True),
        sa.Column('bitis_saat', sa.String(50), nullable=True),
        sa.Column('toplam_sure_saat', sa.Numeric(10, 2), nullable=True),
        sa.Column('birim_ucret', sa.Numeric(15, 4), nullable=True),
        sa.Column('toplam_tutar', sa.Numeric(15, 4), nullable=True),
        sa.Column('is_tipi', sa.String(50), nullable=True),
        sa.Column('not_text', sa.Text(), nullable=True),
        sa.Column('olusturma_tarihi', sa.String(50), nullable=True),
        sa.Column('olusturan_kullanici_id', postgresql.UUID(as_uuid=True), nullable=True),
            sa.Column('guncelleme_tarihi', sa.DateTime(), nullable=True),
)
    op.create_index('ix_uretim_iscilik_id', 'uretim_iscilik', ['id'])
    op.create_index('ix_uretim_iscilik_uretim', 'uretim_iscilik', ['uretim_id'])
    op.create_index('ix_uretim_iscilik_personel', 'uretim_iscilik', ['personel_id'])

    op.create_foreign_key(
        'fk_uretim_iscilik_uretim',
        'uretim_iscilik', 'uretim_emirleri',
        ['uretim_id'], ['id'],
        ondelete='CASCADE'
    )
    op.create_foreign_key(
        'fk_uretim_iscilik_personel',
        'uretim_iscilik', 'kullanicilar',
        ['personel_id'], ['id'],
        ondelete='SET NULL'
    )
    op.create_foreign_key(
        'fk_uretim_iscilik_olusturan',
        'uretim_iscilik', 'kullanicilar',
        ['olusturan_kullanici_id'], ['id'],
        ondelete='SET NULL'
    )

    # ============================================================
    # TABLE 29: uretim_enerji
    # ============================================================
    op.create_table(
        'uretim_enerji',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('uretim_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('enerji_tipi', sa.String(30), nullable=True),
        sa.Column('birim', sa.String(20), nullable=True),
        sa.Column('tuketim_miktari', sa.Numeric(15, 4), nullable=True),
        sa.Column('birim_fiyat', sa.Numeric(15, 4), nullable=True),
        sa.Column('toplam_tutar', sa.Numeric(15, 4), nullable=True),
        sa.Column('tarih', sa.String(20), nullable=True),
        sa.Column('donem', sa.String(20), nullable=True),
        sa.Column('not_text', sa.Text(), nullable=True),
        sa.Column('olusturma_tarihi', sa.String(50), nullable=True),
        sa.Column('olusturan_kullanici_id', postgresql.UUID(as_uuid=True), nullable=True),
            sa.Column('guncelleme_tarihi', sa.DateTime(), nullable=True),
)
    op.create_index('ix_uretim_enerji_id', 'uretim_enerji', ['id'])
    op.create_index('ix_uretim_enerji_uretim', 'uretim_enerji', ['uretim_id'])

    op.create_foreign_key(
        'fk_uretim_enerji_uretim',
        'uretim_enerji', 'uretim_emirleri',
        ['uretim_id'], ['id'],
        ondelete='CASCADE'
    )
    op.create_foreign_key(
        'fk_uretim_enerji_olusturan',
        'uretim_enerji', 'kullanicilar',
        ['olusturan_kullanici_id'], ['id'],
        ondelete='SET NULL'
    )

    # ============================================================
    # TABLE 30: uretim_bakim
    # ============================================================
    op.create_table(
        'uretim_bakim',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('uretim_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('bakim_tipi', sa.String(50), nullable=True),
        sa.Column('bakim_aciklamasi', sa.Text(), nullable=True),
        sa.Column('tutar', sa.Numeric(15, 4), nullable=True),
        sa.Column('tarih', sa.String(20), nullable=True),
        sa.Column('donem', sa.String(20), nullable=True),
        sa.Column('not_text', sa.Text(), nullable=True),
        sa.Column('olusturma_tarihi', sa.String(50), nullable=True),
        sa.Column('olusturan_kullanici_id', postgresql.UUID(as_uuid=True), nullable=True),
    )
    op.create_index('ix_uretim_bakim_id', 'uretim_bakim', ['id'])
    op.create_index('ix_uretim_bakim_uretim', 'uretim_bakim', ['uretim_id'])

    op.create_foreign_key(
        'fk_uretim_bakim_uretim',
        'uretim_bakim', 'uretim_emirleri',
        ['uretim_id'], ['id'],
        ondelete='SET NULL'
    )
    op.create_foreign_key(
        'fk_uretim_bakim_olusturan',
        'uretim_bakim', 'kullanicilar',
        ['olusturan_kullanici_id'], ['id'],
        ondelete='SET NULL'
    )

    # ============================================================
    # TABLE 31: uretim_genel_gider
    # ============================================================
    op.create_table(
        'uretim_genel_gider',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('uretim_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('gider_turu', sa.String(50), nullable=True),
        sa.Column('gider_aciklamasi', sa.Text(), nullable=True),
        sa.Column('tutar', sa.Numeric(15, 4), nullable=True),
        sa.Column('dagitim_tipi', sa.String(30), nullable=True),
        sa.Column('dagitim_orani', sa.Numeric(10, 6), nullable=True),
        sa.Column('dagitilan_tutar', sa.Numeric(15, 4), nullable=True),
        sa.Column('donem', sa.String(20), nullable=True),
        sa.Column('not_text', sa.Text(), nullable=True),
        sa.Column('olusturma_tarihi', sa.String(50), nullable=True),
        sa.Column('olusturan_kullanici_id', postgresql.UUID(as_uuid=True), nullable=True),
    )
    op.create_index('ix_uretim_genel_gider_id', 'uretim_genel_gider', ['id'])
    op.create_index('ix_uretim_genel_gider_uretim', 'uretim_genel_gider', ['uretim_id'])

    op.create_foreign_key(
        'fk_uretim_genel_gider_uretim',
        'uretim_genel_gider', 'uretim_emirleri',
        ['uretim_id'], ['id'],
        ondelete='SET NULL'
    )
    op.create_foreign_key(
        'fk_uretim_genel_gider_olusturan',
        'uretim_genel_gider', 'kullanicilar',
        ['olusturan_kullanici_id'], ['id'],
        ondelete='SET NULL'
    )

    # ============================================================
    # TABLE 32: depolar
    # ============================================================
    op.create_table(
        'depolar',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('ad', sa.String(100), nullable=False),
        sa.Column('kod', sa.String(20), nullable=False, unique=True),
        sa.Column('depo_tipi', sa.String(30), nullable=True),
        sa.Column('adres', sa.Text(), nullable=True),
        sa.Column('il', sa.String(50), nullable=True),
        sa.Column('ilce', sa.String(50), nullable=True),
        sa.Column('kapasite_m2', sa.Numeric(15, 2), nullable=True),
        sa.Column('doluluk_orani', sa.Numeric(5, 2), nullable=True),
        sa.Column('aktif', sa.Boolean(), nullable=True),
        sa.Column('olusturma_tarihi', sa.String(50), nullable=True),
        sa.Column('guncelleme_tarihi', sa.String(50), nullable=True),
        sa.Column('silme_tarihi', sa.String(50), nullable=True),
        sa.Column('olusturan_kullanici_id', postgresql.UUID(as_uuid=True), nullable=True),
    )
    op.create_index('ix_depolar_id', 'depolar', ['id'])
    op.create_index('ix_depolar_kod', 'depolar', ['kod'], unique=True)
    op.create_index('ix_depolar_ad', 'depolar', ['ad'])

    op.create_foreign_key(
        'fk_depolar_olusturan',
        'depolar', 'kullanicilar',
        ['olusturan_kullanici_id'], ['id'],
        ondelete='SET NULL'
    )

    # ============================================================
    # TABLE 33: depo_bloklar
    # ============================================================
    op.create_table(
        'depo_bloklar',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('depo_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('ad', sa.String(100), nullable=True),
        sa.Column('kod', sa.String(20), nullable=True),
        sa.Column('blok_tipi', sa.String(30), nullable=True),
        sa.Column('kapasite_m2', sa.Numeric(15, 2), nullable=True),
        sa.Column('doluluk_orani', sa.Numeric(5, 2), nullable=True),
        sa.Column('aktif', sa.Boolean(), nullable=True),
        sa.Column('olusturma_tarihi', sa.String(50), nullable=True),
        sa.Column('silme_tarihi', sa.String(50), nullable=True),
            sa.Column('guncelleme_tarihi', sa.DateTime(), nullable=True),
)
    op.create_index('ix_depo_bloklar_id', 'depo_bloklar', ['id'])
    op.create_index('ix_depo_bloklar_depo', 'depo_bloklar', ['depo_id'])

    op.create_foreign_key(
        'fk_depo_bloklar_depo',
        'depo_bloklar', 'depolar',
        ['depo_id'], ['id'],
        ondelete='CASCADE'
    )

    # ============================================================
    # TABLE 34: depo_konumlari
    # ============================================================
    op.create_table(
        'depo_konumlari',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('depo_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('blok_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('konum_kodu', sa.String(50), nullable=False, unique=True),
        sa.Column('kat', sa.Integer(), nullable=True),
        sa.Column('raf', sa.String(20), nullable=True),
        sa.Column('sutun', sa.Integer(), nullable=True),
        sa.Column('doluluk_durumu', sa.String(20), nullable=True),
        sa.Column('mevcut_stok_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('aktif', sa.Boolean(), nullable=True),
        sa.Column('olusturma_tarihi', sa.String(50), nullable=True),
        sa.Column('silme_tarihi', sa.String(50), nullable=True),
            sa.Column('guncelleme_tarihi', sa.DateTime(), nullable=True),
)
    op.create_index('ix_depo_konumlari_id', 'depo_konumlari', ['id'])
    op.create_index('ix_depo_konumlari_kod', 'depo_konumlari', ['konum_kodu'], unique=True)
    op.create_index('ix_depo_konumlari_depo', 'depo_konumlari', ['depo_id'])
    op.create_index('ix_depo_konumlari_blok', 'depo_konumlari', ['blok_id'])

    op.create_foreign_key(
        'fk_depo_konumlari_depo',
        'depo_konumlari', 'depolar',
        ['depo_id'], ['id'],
        ondelete='CASCADE'
    )
    op.create_foreign_key(
        'fk_depo_konumlari_blok',
        'depo_konumlari', 'depo_bloklar',
        ['blok_id'], ['id'],
        ondelete='SET NULL'
    )
    op.create_foreign_key(
        'fk_depo_konumlari_stok',
        'depo_konumlari', 'stok_kartlari',
        ['mevcut_stok_id'], ['id'],
        ondelete='SET NULL'
    )

    # ============================================================
    # TABLE 35: depo_transferleri
    # ============================================================
    op.create_table(
        'depo_transferleri',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('transfer_no', sa.String(50), nullable=False, unique=True),
        sa.Column('tarih', sa.String(50), nullable=True),
        sa.Column('kaynak_depo_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('hedef_depo_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('durum', sa.String(30), nullable=True),
        sa.Column('talep_eden_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('talep_tarihi', sa.String(50), nullable=True),
        sa.Column('talep_aciklamasi', sa.Text(), nullable=True),
        sa.Column('onay_leyen_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('onay_tarihi', sa.String(50), nullable=True),
        sa.Column('red_nedeni', sa.Text(), nullable=True),
        sa.Column('tamamlama_tarihi', sa.String(50), nullable=True),
        sa.Column('not_text', sa.Text(), nullable=True),
        sa.Column('olusturma_tarihi', sa.String(50), nullable=True),
        sa.Column('olusturan_kullanici_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('silme_tarihi', sa.String(50), nullable=True),
            sa.Column('guncelleme_tarihi', sa.DateTime(), nullable=True),
)
    op.create_index('ix_depo_transferleri_id', 'depo_transferleri', ['id'])
    op.create_index('ix_depo_transferleri_transfer_no', 'depo_transferleri', ['transfer_no'], unique=True)
    op.create_index('ix_depo_transferleri_kaynak', 'depo_transferleri', ['kaynak_depo_id'])
    op.create_index('ix_depo_transferleri_hedef', 'depo_transferleri', ['hedef_depo_id'])
    op.create_index('ix_depo_transferleri_talep_eden', 'depo_transferleri', ['talep_eden_id'])

    op.create_foreign_key(
        'fk_depo_transferleri_kaynak_depo',
        'depo_transferleri', 'depolar',
        ['kaynak_depo_id'], ['id'],
        ondelete='RESTRICT'
    )
    op.create_foreign_key(
        'fk_depo_transferleri_hedef_depo',
        'depo_transferleri', 'depolar',
        ['hedef_depo_id'], ['id'],
        ondelete='RESTRICT'
    )
    op.create_foreign_key(
        'fk_depo_transferleri_talep_eden',
        'depo_transferleri', 'kullanicilar',
        ['talep_eden_id'], ['id'],
        ondelete='RESTRICT'
    )
    op.create_foreign_key(
        'fk_depo_transferleri_onay_leyen',
        'depo_transferleri', 'kullanicilar',
        ['onay_leyen_id'], ['id'],
        ondelete='SET NULL'
    )
    op.create_foreign_key(
        'fk_depo_transferleri_olusturan',
        'depo_transferleri', 'kullanicilar',
        ['olusturan_kullanici_id'], ['id'],
        ondelete='SET NULL'
    )

    # ============================================================
    # TABLE 36: depo_transfer_detaylari
    # ============================================================
    op.create_table(
        'depo_transfer_detaylari',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('transfer_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('stok_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('miktar', sa.Numeric(15, 3), nullable=True),
        sa.Column('birim', sa.String(20), nullable=True),
        sa.Column('kaynak_konum', sa.String(50), nullable=True),
        sa.Column('hedef_konum', sa.String(50), nullable=True),
        sa.Column('durum', sa.String(30), nullable=True),
        sa.Column('olusturma_tarihi', sa.String(50), nullable=True),
            sa.Column('guncelleme_tarihi', sa.DateTime(), nullable=True),
)
    op.create_index('ix_depo_transfer_detaylari_id', 'depo_transfer_detaylari', ['id'])
    op.create_index('ix_depo_transfer_detaylari_transfer', 'depo_transfer_detaylari', ['transfer_id'])
    op.create_index('ix_depo_transfer_detaylari_stok', 'depo_transfer_detaylari', ['stok_id'])

    op.create_foreign_key(
        'fk_depo_transfer_detaylari_transfer',
        'depo_transfer_detaylari', 'depo_transferleri',
        ['transfer_id'], ['id'],
        ondelete='CASCADE'
    )
    op.create_foreign_key(
        'fk_depo_transfer_detaylari_stok',
        'depo_transfer_detaylari', 'stok_kartlari',
        ['stok_id'], ['id'],
        ondelete='RESTRICT'
    )

    # ============================================================
    # TABLE 37: nakliye_takip
    # ============================================================
    op.create_table(
        'nakliye_takip',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('transfer_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('firma_adi', sa.String(255), nullable=True),
        sa.Column('sofor_ad', sa.String(255), nullable=True),
        sa.Column('telefon', sa.String(20), nullable=True),
        sa.Column('plaka', sa.String(20), nullable=True),
        sa.Column('cikis_tarihi', sa.String(50), nullable=True),
        sa.Column('varis_tarihi', sa.String(50), nullable=True),
        sa.Column('durum', sa.String(30), nullable=True),
        sa.Column('irsaliye_no', sa.String(50), nullable=True),
        sa.Column('teslimat_tutunagi_url', sa.String(500), nullable=True),
        sa.Column('not_text', sa.Text(), nullable=True),
        sa.Column('olusturma_tarihi', sa.String(50), nullable=True),
        sa.Column('olusturan_kullanici_id', postgresql.UUID(as_uuid=True), nullable=True),
            sa.Column('guncelleme_tarihi', sa.DateTime(), nullable=True),
)
    op.create_index('ix_nakliye_takip_id', 'nakliye_takip', ['id'])
    op.create_index('ix_nakliye_takip_transfer', 'nakliye_takip', ['transfer_id'])

    op.create_foreign_key(
        'fk_nakliye_takip_transfer',
        'nakliye_takip', 'depo_transferleri',
        ['transfer_id'], ['id'],
        ondelete='CASCADE'
    )
    op.create_foreign_key(
        'fk_nakliye_takip_olusturan',
        'nakliye_takip', 'kullanicilar',
        ['olusturan_kullanici_id'], ['id'],
        ondelete='SET NULL'
    )

    # ============================================================
    # TABLE 38: bildirimler
    # ============================================================
    op.create_table(
        'bildirimler',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('bildirim_tipi', sa.String(50), nullable=True),
        sa.Column('baslik', sa.String(255), nullable=True),
        sa.Column('icerik', sa.Text(), nullable=True),
        sa.Column('oncelik', sa.String(20), nullable=True),
        sa.Column('durum', sa.String(20), nullable=True),
        sa.Column('gonderen_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('gonderen_ad', sa.String(255), nullable=True),
        sa.Column('alici_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('referans_tip', sa.String(50), nullable=True),
        sa.Column('referans_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('kanallar', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('gonderim_durumu', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('gorulme_tarihi', sa.String(50), nullable=True),
        sa.Column('okunma_tarihi', sa.String(50), nullable=True),
        sa.Column('action_url', sa.String(500), nullable=True),
        sa.Column('action_label', sa.String(100), nullable=True),
        sa.Column('olusturma_tarihi', sa.String(50), nullable=True),
        sa.Column('gonderim_tarihi', sa.String(50), nullable=True),
    )
    op.create_index('ix_bildirimler_id', 'bildirimler', ['id'])
    op.create_index('ix_bildirimler_alici', 'bildirimler', ['alici_id'])
    op.create_index('ix_bildirimler_tip', 'bildirimler', ['bildirim_tipi'])
    op.create_index('ix_bildirimler_durum', 'bildirimler', ['durum'])
    op.create_index('ix_bildirimler_tarih', 'bildirimler', ['olusturma_tarihi'])

    op.create_foreign_key(
        'fk_bildirimler_alici',
        'bildirimler', 'kullanicilar',
        ['alici_id'], ['id'],
        ondelete='CASCADE'
    )
    op.create_foreign_key(
        'fk_bildirimler_gonderen',
        'bildirimler', 'kullanicilar',
        ['gonderen_id'], ['id'],
        ondelete='SET NULL'
    )

    # ============================================================
    # TABLE 39: bildirim_sablonlari
    # ============================================================
    op.create_table(
        'bildirim_sablonlari',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('sablon_adi', sa.String(100), nullable=False, unique=True),
        sa.Column('bildirim_tipi', sa.String(50), nullable=True),
        sa.Column('varsayilan_baslik', sa.String(255), nullable=True),
        sa.Column('varsayilan_icerik', sa.Text(), nullable=True),
        sa.Column('kanallar', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('email_sablon_html', sa.Text(), nullable=True),
        sa.Column('email_subject', sa.String(255), nullable=True),
        sa.Column('sms_sablon', sa.String(500), nullable=True),
        sa.Column('degiskenler', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('aktif', sa.Boolean(), nullable=True),
        sa.Column('olusturma_tarihi', sa.String(50), nullable=True),
        sa.Column('guncelleme_tarihi', sa.String(50), nullable=True),
        sa.Column('olusturan_kullanici_id', postgresql.UUID(as_uuid=True), nullable=True),
    )
    op.create_index('ix_bildirim_sablonlari_id', 'bildirim_sablonlari', ['id'])
    op.create_index('ix_bildirim_sablonlari_sablon_adi', 'bildirim_sablonlari', ['sablon_adi'], unique=True)

    op.create_foreign_key(
        'fk_bildirim_sablonlari_olusturan',
        'bildirim_sablonlari', 'kullanicilar',
        ['olusturan_kullanici_id'], ['id'],
        ondelete='SET NULL'
    )

    # ============================================================
    # TABLE 40: bildirim_gonderimleri
    # ============================================================
    op.create_table(
        'bildirim_gonderimleri',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('bildirim_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('kanal', sa.String(20), nullable=True),
        sa.Column('durum', sa.String(30), nullable=True),
        sa.Column('gonderim_tarihi', sa.String(50), nullable=True),
        sa.Column('teslim_tarihi', sa.String(50), nullable=True),
        sa.Column('hata_kodu', sa.String(20), nullable=True),
        sa.Column('hata_mesaji', sa.Text(), nullable=True),
        sa.Column('email_adresi', sa.String(255), nullable=True),
        sa.Column('email_message_id', sa.String(255), nullable=True),
        sa.Column('telefon', sa.String(20), nullable=True),
        sa.Column('sms_message_id', sa.String(100), nullable=True),
        sa.Column('olusturma_tarihi', sa.String(50), nullable=True),
    )
    op.create_index('ix_bildirim_gonderimleri_id', 'bildirim_gonderimleri', ['id'])
    op.create_index('ix_bildirim_gonderimleri_bildirim', 'bildirim_gonderimleri', ['bildirim_id'])

    op.create_foreign_key(
        'fk_bildirim_gonderimleri_bildirim',
        'bildirim_gonderimleri', 'bildirimler',
        ['bildirim_id'], ['id'],
        ondelete='CASCADE'
    )

    # ============================================================
    # TABLE 41: bildirim_kullanicari
    # ============================================================
    op.create_table(
        'bildirim_kullanicari',
        sa.Column('kullanici_id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('in_app_aktif', sa.Boolean(), nullable=True),
        sa.Column('email_aktif', sa.Boolean(), nullable=True),
        sa.Column('sms_aktif', sa.Boolean(), nullable=True),
        sa.Column('tercihler', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('sessiz_mod_baslangic', sa.String(10), nullable=True),
        sa.Column('sessiz_mod_bitis', sa.String(10), nullable=True),
        sa.Column('guncelleme_tarihi', sa.String(50), nullable=True),
    )
    op.create_index('ix_bildirim_kullanicari_kullanici', 'bildirim_kullanicari', ['kullanici_id'])

    op.create_foreign_key(
        'fk_bildirim_kullanicari_kullanici',
        'bildirim_kullanicari', 'kullanicilar',
        ['kullanici_id'], ['id'],
        ondelete='CASCADE'
    )

    # ============================================================
    # TABLE 42: etiket_sablonleri
    # ============================================================
    op.create_table(
        'etiket_sablonleri',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('ad', sa.String(100), nullable=False),
        sa.Column('sablon_tipi', sa.String(30), nullable=True),
        sa.Column('kullanim_yeri', sa.String(30), nullable=True),
        sa.Column('genislik_mm', sa.Numeric(10, 2), nullable=True),
        sa.Column('yukseklik_mm', sa.Numeric(10, 2), nullable=True),
        sa.Column('cikti_format', sa.String(10), nullable=True),
        sa.Column('template_data', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('zpl_sablon', sa.Text(), nullable=True),
        sa.Column('alanlar', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('aktif', sa.Boolean(), nullable=True),
        sa.Column('varsayilan', sa.Boolean(), nullable=True),
        sa.Column('olusturma_tarihi', sa.String(50), nullable=True),
        sa.Column('guncelleme_tarihi', sa.String(50), nullable=True),
        sa.Column('silme_tarihi', sa.String(50), nullable=True),
        sa.Column('olusturan_kullanici_id', postgresql.UUID(as_uuid=True), nullable=True),
    )
    op.create_index('ix_etiket_sablonleri_id', 'etiket_sablonleri', ['id'])
    op.create_index('ix_etiket_sablonleri_ad', 'etiket_sablonleri', ['ad'])

    op.create_foreign_key(
        'fk_etiket_sablonleri_olusturan',
        'etiket_sablonleri', 'kullanicilar',
        ['olusturan_kullanici_id'], ['id'],
        ondelete='SET NULL'
    )

    # ============================================================
    # TABLE 43: etiket_alanlari
    # ============================================================
    op.create_table(
        'etiket_alanlari',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('sablon_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('alan_adi', sa.String(50), nullable=False),
        sa.Column('goruntu_ad', sa.String(100), nullable=True),
        sa.Column('x_mm', sa.Numeric(10, 2), nullable=True),
        sa.Column('y_mm', sa.Numeric(10, 2), nullable=True),
        sa.Column('genislik_mm', sa.Numeric(10, 2), nullable=True),
        sa.Column('yukseklik_mm', sa.Numeric(10, 2), nullable=True),
        sa.Column('font_adi', sa.String(50), nullable=True),
        sa.Column('font_boyutu', sa.Integer(), nullable=True),
        sa.Column('font_rengi', sa.String(20), nullable=True),
        sa.Column('deger_kaynagi', sa.String(50), nullable=True),
        sa.Column('bicim', sa.String(100), nullable=True),
        sa.Column('barcode_tipi', sa.String(20), nullable=True),
        sa.Column('barcode_genislik', sa.Integer(), nullable=True),
        sa.Column('barcode_yukseklik', sa.Integer(), nullable=True),
        sa.Column('siralama', sa.Integer(), nullable=True),
        sa.Column('aktif', sa.Boolean(), nullable=True),
        sa.Column('olusturma_tarihi', sa.String(50), nullable=True),
            sa.Column('guncelleme_tarihi', sa.DateTime(), nullable=True),
)
    op.create_index('ix_etiket_alanlari_id', 'etiket_alanlari', ['id'])
    op.create_index('ix_etiket_alanlari_sablon', 'etiket_alanlari', ['sablon_id'])

    op.create_foreign_key(
        'fk_etiket_alanlari_sablon',
        'etiket_alanlari', 'etiket_sablonleri',
        ['sablon_id'], ['id'],
        ondelete='CASCADE'
    )

    # ============================================================
    # Additional Indexes (partial unique indexes)
    # ============================================================
    # Note: Some unique indexes were already created above with the table definitions
    # This section is for any additional indexes that weren't included above


def downgrade() -> None:
    # Drop tables in reverse order of creation (respecting FK dependencies)
    
    # ============================================================
    # Drop TABLE 43: etiket_alanlari
    # ============================================================
    op.drop_table('etiket_alanlari')

    # ============================================================
    # Drop TABLE 42: etiket_sablonleri
    # ============================================================
    op.drop_table('etiket_sablonleri')

    # ============================================================
    # Drop TABLE 41: bildirim_kullanicari
    # ============================================================
    op.drop_table('bildirim_kullanicari')

    # ============================================================
    # Drop TABLE 40: bildirim_gonderimleri
    # ============================================================
    op.drop_table('bildirim_gonderimleri')

    # ============================================================
    # Drop TABLE 39: bildirim_sablonlari
    # ============================================================
    op.drop_table('bildirim_sablonlari')

    # ============================================================
    # Drop TABLE 38: bildirimler
    # ============================================================
    op.drop_table('bildirimler')

    # ============================================================
    # Drop TABLE 37: nakliye_takip
    # ============================================================
    op.drop_table('nakliye_takip')

    # ============================================================
    # Drop TABLE 36: depo_transfer_detaylari
    # ============================================================
    op.drop_table('depo_transfer_detaylari')

    # ============================================================
    # Drop TABLE 35: depo_transferleri
    # ============================================================
    op.drop_table('depo_transferleri')

    # ============================================================
    # Drop TABLE 34: depo_konumlari
    # ============================================================
    op.drop_table('depo_konumlari')

    # ============================================================
    # Drop TABLE 33: depo_bloklar
    # ============================================================
    op.drop_table('depo_bloklar')

    # ============================================================
    # Drop TABLE 32: depolar
    # ============================================================
    op.drop_table('depolar')

    # ============================================================
    # Drop TABLE 31: uretim_genel_gider
    # ============================================================
    op.drop_table('uretim_genel_gider')

    # ============================================================
    # Drop TABLE 30: uretim_bakim
    # ============================================================
    op.drop_table('uretim_bakim')

    # ============================================================
    # Drop TABLE 29: uretim_enerji
    # ============================================================
    op.drop_table('uretim_enerji')

    # ============================================================
    # Drop TABLE 28: uretim_iscilik
    # ============================================================
    op.drop_table('uretim_iscilik')

    # ============================================================
    # Drop TABLE 27: toplu_islem_satirlari
    # ============================================================
    op.drop_table('toplu_islem_satirlari')

    # ============================================================
    # Drop TABLE 26: toplu_islemler
    # ============================================================
    op.drop_table('toplu_islemler')

    # ============================================================
    # Drop TABLE 25: iade_numuneleri
    # ============================================================
    op.drop_table('iade_numuneleri')

    # ============================================================
    # Drop TABLE 24: satis_iadeleri
    # ============================================================
    op.drop_table('satis_iadeleri')

    # ============================================================
    # Drop TABLE 23: birim_donusumleri
    # ============================================================
    op.drop_table('birim_donusumleri')

    # ============================================================
    # Drop TABLE 22: stok_duzeltme_talepleri
    # ============================================================
    op.drop_table('stok_duzeltme_talepleri')

    # ============================================================
    # Drop TABLE 21: skt_islemler
    # ============================================================
    op.drop_table('skt_islemler')

    # ============================================================
    # Drop TABLE 20: kalite_numuneleri
    # ============================================================
    op.drop_table('kalite_numuneleri')

    # ============================================================
    # Drop TABLE 19: kalite_kontroller
    # ============================================================
    op.drop_table('kalite_kontroller')

    # ============================================================
    # Drop TABLE 18: satis_kalemleri
    # ============================================================
    op.drop_table('satis_kalemleri')

    # ============================================================
    # Drop TABLE 17: satis_kayitlari
    # ============================================================
    op.drop_table('satis_kayitlari')

    # ============================================================
    # Drop TABLE 16: uretim_detaylari
    # ============================================================
    op.drop_table('uretim_detaylari')

    # ============================================================
    # Drop TABLE 15: uretim_emirleri
    # ============================================================
    op.drop_table('uretim_emirleri')

    # ============================================================
    # Drop TABLE 14: lot_fotograflari
    # ============================================================
    op.drop_table('lot_fotograflari')

    # ============================================================
    # Drop TABLE 13: lot_ozellikleri
    # ============================================================
    op.drop_table('lot_ozellikleri')

    # ============================================================
    # Drop TABLE 12: stok_hareketleri
    # ============================================================
    op.drop_table('stok_hareketleri')

    # ============================================================
    # Drop TABLE 11: stok_kartlari
    # ============================================================
    op.drop_table('stok_kartlari')

    # ============================================================
    # Drop TABLE 10: musteriler
    # ============================================================
    op.drop_table('musteriler')

    # ============================================================
    # Drop TABLE 9: tedarikci_fiyat_gecmisi
    # ============================================================
    op.drop_table('tedarikci_fiyat_gecmisi')

    # ============================================================
    # Drop TABLE 8: tedarikci_degerlendirmeleri
    # ============================================================
    op.drop_table('tedarikci_degerlendirmeleri')

    # ============================================================
    # Drop TABLE 7: tedarikci_urunleri
    # ============================================================
    op.drop_table('tedarikci_urunleri')

    # ============================================================
    # Drop TABLE 6: tedarikciler
    # ============================================================
    op.drop_table('tedarikciler')

    # ============================================================
    # Drop TABLE 5: urun_ozellikleri
    # ============================================================
    op.drop_table('urun_ozellikleri')

    # ============================================================
    # Drop TABLE 4: urunler
    # ============================================================
    op.drop_table('urunler')

    # ============================================================
    # Drop TABLE 3: kullanicilar
    # ============================================================
    op.drop_table('kullanicilar')

    # ============================================================
    # Drop TABLE 2: birimler
    # ============================================================
    op.drop_table('birimler')

    # ============================================================
    # Drop TABLE 1: roller
    # ============================================================
    op.drop_table('roller')
