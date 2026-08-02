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
        sa.Column('baslangic_tarihi', sa.String(50), nullable=True),
        sa.Column('bitis_tarihi', sa.String(50), nullable=True),
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
        sa.Column('stok_id', postgresql.UUID(as_uuid=True), nullable=True),
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
        ondelete='SET NULL'
    )
    op.create_foreign_key(
        'fk_uretim_lot_kalite',
        'uretim_lot', 'kalite_kontroller',
        ['kalite_kontrol_id'], ['id'],
        ondelete='SET NULL'
    )


def downgrade() -> None:
    op.drop_table('uretim_lot')
    op.drop_table('urun_donusum')
