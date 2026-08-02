"""add_missing_tables

Revision ID: 002_add_missing_tables
Revises: 001_initial
Create Date: 2026-08-15
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '002_add_missing_tables'
down_revision = '001_initial'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ============================================================
    # TABLE: urun_donusum (Product-to-Product Conversion)
    # ============================================================
    op.create_table(
        'urun_donusum',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('kaynak_urun_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('hedef_urun_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('donusum_orani', sa.Numeric(20, 10), nullable=False),
        sa.Column('aktif', sa.Boolean(), nullable=False, default=True),
        sa.Column('olusturma_tarihi', sa.DateTime(), nullable=False),
        sa.Column('guncelleme_tarihi', sa.DateTime(), nullable=False),
        sa.Column('olusturan_kullanici_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('baslangic_tarihi', sa.String(20), nullable=True),
        sa.Column('bitis_tarihi', sa.String(20), nullable=True),
    )
    op.create_index('ix_urun_donusum_id', 'urun_donusum', ['id'])
    op.create_index('ix_urun_donusum_kaynak', 'urun_donusum', ['kaynak_urun_id'])
    op.create_index('ix_urun_donusum_hedef', 'urun_donusum', ['hedef_urun_id'])
    op.create_index('ix_urun_donusum_aktif', 'urun_donusum', ['aktif'])

    op.create_foreign_key(
        'fk_urun_donusum_kaynak_urun',
        'urun_donusum', 'urunler',
        ['kaynak_urun_id'], ['id'],
        ondelete='CASCADE'
    )
    op.create_foreign_key(
        'fk_urun_donusum_hedef_urun',
        'urun_donusum', 'urunler',
        ['hedef_urun_id'], ['id'],
        ondelete='CASCADE'
    )
    op.create_foreign_key(
        'fk_urun_donusum_olusturan',
        'urun_donusum', 'kullanicilar',
        ['olusturan_kullanici_id'], ['id'],
        ondelete='SET NULL'
    )

    # ============================================================
    # TABLE: uretim_lot (Production Lot Output)
    # ============================================================
    op.create_table(
        'uretim_lot',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('uretim_emri_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('stok_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('lot_no', sa.String(50), nullable=False),
        sa.Column('uretim_tarihi', sa.String(50), nullable=False),
        sa.Column('olusturma_tarihi', sa.DateTime(), nullable=False),
        sa.Column('guncelleme_tarihi', sa.DateTime(), nullable=False),
        sa.Column('kaynak_lot_bilgisi', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('kalite_kontrol_id', postgresql.UUID(as_uuid=True), nullable=True),
    )
    op.create_index('ix_uretim_lot_id', 'uretim_lot', ['id'])
    op.create_index('ix_uretim_lot_uretim_emri', 'uretim_lot', ['uretim_emri_id'])
    op.create_index('ix_uretim_lot_stok', 'uretim_lot', ['stok_id'])
    op.create_index('ix_uretim_lot_lot_no', 'uretim_lot', ['lot_no'])
    op.create_index('ix_uretim_lot_kalite', 'uretim_lot', ['kalite_kontrol_id'])

    op.create_foreign_key(
        'fk_uretim_lot_uretim_emri',
        'uretim_lot', 'uretim_emirleri',
        ['uretim_emri_id'], ['id'],
        ondelete='CASCADE'
    )
    op.create_foreign_key(
        'fk_uretim_lot_stok',
        'uretim_lot', 'stok_kartlari',
        ['stok_id'], ['id'],
        ondelete='CASCADE'
    )
    op.create_foreign_key(
        'fk_uretim_lot_kalite',
        'uretim_lot', 'kalite_kontroller',
        ['kalite_kontrol_id'], ['id'],
        ondelete='SET NULL'
    )

    # ============================================================
    # TABLE: gida_izlenebilirlik_log (Food Traceability Log)
    # ============================================================
    op.create_table(
        'gida_izlenebilirlik_log',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('lot_no', sa.String(50), nullable=False),
        sa.Column('hareket_tipi', sa.String(30), nullable=False),
        sa.Column('urun_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('stok_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('miktar', sa.Numeric(15, 3), nullable=True),
        sa.Column('birim', sa.String(20), nullable=True),
        sa.Column('kaynak_lot_no', sa.String(50), nullable=True),
        sa.Column('hedef_lot_no', sa.String(50), nullable=True),
        sa.Column('tedarikci_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('uretim_emri_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('satis_kaydi_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('aciklama', sa.Text(), nullable=True),
        sa.Column('olusturma_tarihi', sa.DateTime(), nullable=False),
        sa.Column('guncelleme_tarihi', sa.DateTime(), nullable=False),
        sa.Column('olusturan_kullanici_id', postgresql.UUID(as_uuid=True), nullable=False),
    )
    op.create_index('ix_gida_izlenebilirlik_log_id', 'gida_izlenebilirlik_log', ['id'])
    op.create_index('ix_gida_izlenebilirlik_log_lot_no', 'gida_izlenebilirlik_log', ['lot_no'])
    op.create_index('ix_gida_izlenebilirlik_log_hareket_tipi', 'gida_izlenebilirlik_log', ['hareket_tipi'])
    op.create_index('ix_gida_izlenebilirlik_log_urun', 'gida_izlenebilirlik_log', ['urun_id'])
    op.create_index('ix_gida_izlenebilirlik_log_stok', 'gida_izlenebilirlik_log', ['stok_id'])
    op.create_index('ix_gida_izlenebilirlik_log_tedarikci', 'gida_izlenebilirlik_log', ['tedarikci_id'])
    op.create_index('ix_gida_izlenebilirlik_log_uretim', 'gida_izlenebilirlik_log', ['uretim_emri_id'])
    op.create_index('ix_gida_izlenebilirlik_log_satis', 'gida_izlenebilirlik_log', ['satis_kaydi_id'])

    op.create_foreign_key(
        'fk_gida_izlenebilirlik_log_urun',
        'gida_izlenebilirlik_log', 'urunler',
        ['urun_id'], ['id'],
        ondelete='SET NULL'
    )
    op.create_foreign_key(
        'fk_gida_izlenebilirlik_log_stok',
        'gida_izlenebilirlik_log', 'stok_kartlari',
        ['stok_id'], ['id'],
        ondelete='SET NULL'
    )
    op.create_foreign_key(
        'fk_gida_izlenebilirlik_log_tedarikci',
        'gida_izlenebilirlik_log', 'tedarikciler',
        ['tedarikci_id'], ['id'],
        ondelete='SET NULL'
    )
    op.create_foreign_key(
        'fk_gida_izlenebilirlik_log_uretim',
        'gida_izlenebilirlik_log', 'uretim_emirleri',
        ['uretim_emri_id'], ['id'],
        ondelete='SET NULL'
    )
    op.create_foreign_key(
        'fk_gida_izlenebilirlik_log_satis',
        'gida_izlenebilirlik_log', 'satis_kayitlari',
        ['satis_kaydi_id'], ['id'],
        ondelete='SET NULL'
    )
    op.create_foreign_key(
        'fk_gida_izlenebilirlik_log_olusturan',
        'gida_izlenebilirlik_log', 'kullanicilar',
        ['olusturan_kullanici_id'], ['id'],
        ondelete='SET NULL'
    )

    # ============================================================
    # TABLE: ozellik_tanimlari (Attribute Definitions)
    # ============================================================
    op.create_table(
        'ozellik_tanimlari',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('kategori', sa.String(20), nullable=True),
        sa.Column('alan_adi', sa.String(50), nullable=False),
        sa.Column('goruntu_ad', sa.String(100), nullable=True),
        sa.Column('tip', sa.String(20), nullable=False),
        sa.Column('zorunlu', sa.Boolean(), nullable=False, default=False),
        sa.Column('etikette_goster', sa.Boolean(), nullable=False, default=False),
        sa.Column('etikette_zorunlu', sa.Boolean(), nullable=False, default=False),
        sa.Column('siralama', sa.Integer(), nullable=True, default=0),
        sa.Column('varsayilan_deger', sa.String(255), nullable=True),
        sa.Column('enum_degerleri', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('birim', sa.String(20), nullable=True),
        sa.Column('min_deger', sa.Numeric(10, 4), nullable=True),
        sa.Column('max_deger', sa.Numeric(10, 4), nullable=True),
        sa.Column('aktif', sa.Boolean(), nullable=False, default=True),
        sa.Column('olusturma_tarihi', sa.DateTime(), nullable=False),
        sa.Column('guncelleme_tarihi', sa.DateTime(), nullable=False),
        sa.Column('olusturan_kullanici_id', postgresql.UUID(as_uuid=True), nullable=False),
    )
    op.create_index('ix_ozellik_tanimlari_id', 'ozellik_tanimlari', ['id'])
    op.create_index('ix_ozellik_tanimlari_kategori', 'ozellik_tanimlari', ['kategori'])
    op.create_index('ix_ozellik_tanimlari_alan_adi', 'ozellik_tanimlari', ['alan_adi'])
    op.create_index('ix_ozellik_tanimlari_aktif', 'ozellik_tanimlari', ['aktif'])

    op.create_foreign_key(
        'fk_ozellik_tanimlari_olusturan',
        'ozellik_tanimlari', 'kullanicilar',
        ['olusturan_kullanici_id'], ['id'],
        ondelete='SET NULL'
    )

    # ============================================================
    # TABLE: rapor_tanimlari (Report Templates)
    # ============================================================
    op.create_table(
        'rapor_tanimlari',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('ad', sa.String(100), nullable=False),
        sa.Column('rapor_tipi', sa.String(50), nullable=False),
        sa.Column('kategori', sa.String(30), nullable=True),
        sa.Column('tablo_yapisi', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('sorgu_tanimi', sa.Text(), nullable=True),
        sa.Column('varsayilan_parametreler', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('grafik_tipi', sa.String(30), nullable=True),
        sa.Column('aktif', sa.Boolean(), nullable=False, default=True),
        sa.Column('varsayilan', sa.Boolean(), nullable=False, default=False),
        sa.Column('olusturma_tarihi', sa.DateTime(), nullable=False),
        sa.Column('guncelleme_tarihi', sa.DateTime(), nullable=False),
        sa.Column('olusturan_kullanici_id', postgresql.UUID(as_uuid=True), nullable=False),
    )
    op.create_index('ix_rapor_tanimlari_id', 'rapor_tanimlari', ['id'])
    op.create_index('ix_rapor_tanimlari_ad', 'rapor_tanimlari', ['ad'])
    op.create_index('ix_rapor_tanimlari_rapor_tipi', 'rapor_tanimlari', ['rapor_tipi'])
    op.create_index('ix_rapor_tanimlari_aktif', 'rapor_tanimlari', ['aktif'])

    op.create_foreign_key(
        'fk_rapor_tanimlari_olusturan',
        'rapor_tanimlari', 'kullanicilar',
        ['olusturan_kullanici_id'], ['id'],
        ondelete='SET NULL'
    )

    # ============================================================
    # TABLE: rapor_cektirme (Report Execution Log)
    # ============================================================
    op.create_table(
        'rapor_cektirme',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('rapor_tanim_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('parametreler', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('sonuc_dosya_yolu', sa.String(500), nullable=True),
        sa.Column('cikti_format', sa.String(20), nullable=False),
        sa.Column('durum', sa.String(20), nullable=False, default='HAZIRLANIYOR'),
        sa.Column('calisma_suresi_sn', sa.Integer(), nullable=True),
        sa.Column('hata_mesaji', sa.Text(), nullable=True),
        sa.Column('olusturma_tarihi', sa.DateTime(), nullable=False),
        sa.Column('guncelleme_tarihi', sa.DateTime(), nullable=False),
        sa.Column('olusturan_kullanici_id', postgresql.UUID(as_uuid=True), nullable=False),
    )
    op.create_index('ix_rapor_cektirme_id', 'rapor_cektirme', ['id'])
    op.create_index('ix_rapor_cektirme_rapor_tanim', 'rapor_cektirme', ['rapor_tanim_id'])
    op.create_index('ix_rapor_cektirme_durum', 'rapor_cektirme', ['durum'])
    op.create_index('ix_rapor_cektirme_olusturma', 'rapor_cektirme', ['olusturma_tarihi'])

    op.create_foreign_key(
        'fk_rapor_cektirme_rapor_tanim',
        'rapor_cektirme', 'rapor_tanimlari',
        ['rapor_tanim_id'], ['id'],
        ondelete='CASCADE'
    )
    op.create_foreign_key(
        'fk_rapor_cektirme_olusturan',
        'rapor_cektirme', 'kullanicilar',
        ['olusturan_kullanici_id'], ['id'],
        ondelete='SET NULL'
    )

    # ============================================================
    # TABLE: rapor_schedule (Scheduled Reports)
    # ============================================================
    op.create_table(
        'rapor_schedule',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('rapor_tanim_id', postgresql.UUID(as_uuid=True), nullable=False, unique=True),
        sa.Column('schedule_tipi', sa.String(20), nullable=False),
        sa.Column('schedule_cron', sa.String(50), nullable=True),
        sa.Column('sonraki_calisma', sa.DateTime(), nullable=True),
        sa.Column('son_calisma', sa.DateTime(), nullable=True),
        sa.Column('aktif', sa.Boolean(), nullable=False, default=True),
        sa.Column('alici_listesi', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('olusturma_tarihi', sa.DateTime(), nullable=False),
        sa.Column('guncelleme_tarihi', sa.DateTime(), nullable=False),
        sa.Column('olusturan_kullanici_id', postgresql.UUID(as_uuid=True), nullable=False),
    )
    op.create_index('ix_rapor_schedule_id', 'rapor_schedule', ['id'])
    op.create_index('ix_rapor_schedule_rapor_tanim', 'rapor_schedule', ['rapor_tanim_id'])
    op.create_index('ix_rapor_schedule_sonraki', 'rapor_schedule', ['sonraki_calisma'])
    op.create_index('ix_rapor_schedule_aktif', 'rapor_schedule', ['aktif'])

    op.create_foreign_key(
        'fk_rapor_schedule_rapor_tanim',
        'rapor_schedule', 'rapor_tanimlari',
        ['rapor_tanim_id'], ['id'],
        ondelete='CASCADE'
    )
    op.create_foreign_key(
        'fk_rapor_schedule_olusturan',
        'rapor_schedule', 'kullanicilar',
        ['olusturan_kullanici_id'], ['id'],
        ondelete='SET NULL'
    )


def downgrade() -> None:
    # Drop tables in reverse order (respecting FK dependencies)
    op.drop_table('rapor_schedule')
    op.drop_table('rapor_cektirme')
    op.drop_table('rapor_tanimlari')
    op.drop_table('ozellik_tanimlari')
    op.drop_table('gida_izlenebilirlik_log')
    op.drop_table('uretim_lot')
    op.drop_table('urun_donusum')
