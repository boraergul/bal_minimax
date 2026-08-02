"""add_rapor_tables

Revision ID: 003_add_rapor_tables
Revises: 002_add_missing_tables
Create Date: 2026-08-02
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '003_add_rapor_tables'
down_revision = '002_add_missing_tables'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ============================================================
    # TABLE: rapor_tanimlari (Report Definitions)
    # ============================================================
    op.create_table(
        'rapor_tanimlari',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('rapor_adi', sa.String(255), nullable=False),
        sa.Column('rapor_turu', sa.String(30), nullable=False, index=True),
        sa.Column('sorgu_template', sa.Text(), nullable=False),
        sa.Column('parametreler', postgresql.JSONB(astext_type=sa.Text()), default=[]),
        sa.Column('grafik_turu', sa.String(30), nullable=True),
        sa.Column('aktif', sa.Boolean(), nullable=False, default=True),
        sa.Column('rol_bazli_erisim', postgresql.JSONB(astext_type=sa.Text()), default=[]),
        sa.Column('olusturma_tarihi', sa.String(50), nullable=False),
        sa.Column('guncelleme_tarihi', sa.String(50), nullable=False),
        sa.Column('olusturan_kullanici_id', postgresql.UUID(as_uuid=True), nullable=False),
    )
    op.create_index('ix_rapor_tanimlari_id', 'rapor_tanimlari', ['id'])
    op.create_index('ix_rapor_tanimlari_turu', 'rapor_tanimlari', ['rapor_turu'])
    op.create_index('ix_rapor_tanimlari_aktif', 'rapor_tanimlari', ['aktif'])

    # ============================================================
    # TABLE: rapor_cektirmeler (Report Execution Log)
    # ============================================================
    op.create_table(
        'rapor_cektirmeler',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('rapor_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('parametre_degerleri', postgresql.JSONB(astext_type=sa.Text()), default={}),
        sa.Column('cikti_format', sa.String(20), nullable=False),
        sa.Column('cikti_url', sa.String(500), nullable=True),
        sa.Column('cikti_dosya_adi', sa.String(255), nullable=True),
        sa.Column('calisma_zamani', sa.String(50), nullable=True),
        sa.Column('calisma_suresi_sn', sa.Integer(), nullable=True),
        sa.Column('durum', sa.String(20), nullable=False, default='BEKLEMEDE'),
        sa.Column('hata_mesaji', sa.Text(), nullable=True),
        sa.Column('satir_sayisi', sa.Integer(), nullable=True),
        sa.Column('olusturma_tarihi', sa.String(50), nullable=False),
        sa.Column('guncelleme_tarihi', sa.String(50), nullable=False),
        sa.Column('olusturan_kullanici_id', postgresql.UUID(as_uuid=True), nullable=False),
    )
    op.create_index('ix_rapor_cektirmeler_id', 'rapor_cektirmeler', ['id'])
    op.create_index('ix_rapor_cektirmeler_rapor', 'rapor_cektirmeler', ['rapor_id'])
    op.create_index('ix_rapor_cektirmeler_durum', 'rapor_cektirmeler', ['durum'])

    # ============================================================
    # TABLE: rapor_schedule (Report Scheduling)
    # ============================================================
    op.create_table(
        'rapor_schedule',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('rapor_id', postgresql.UUID(as_uuid=True), nullable=False, unique=True),
        sa.Column('schedule_tipi', sa.String(20), nullable=False),
        sa.Column('schedule_time', sa.String(10), nullable=False),
        sa.Column('schedule_hafta_gun', sa.String(10), nullable=True),
        sa.Column('schedule_ay_gun', sa.Integer(), nullable=True),
        sa.Column('aktif', sa.Boolean(), nullable=False, default=True),
        sa.Column('son_calisma', sa.String(50), nullable=True),
        sa.Column('son_sonuc', sa.String(20), nullable=True),
        sa.Column('son_hata', sa.Text(), nullable=True),
        sa.Column('alicilar', postgresql.JSONB(astext_type=sa.Text()), default=[]),
        sa.Column('olusturma_tarihi', sa.String(50), nullable=False),
        sa.Column('guncelleme_tarihi', sa.String(50), nullable=False),
        sa.Column('olusturan_kullanici_id', postgresql.UUID(as_uuid=True), nullable=False),
    )
    op.create_index('ix_rapor_schedule_id', 'rapor_schedule', ['id'])
    op.create_index('ix_rapor_schedule_rapor', 'rapor_schedule', ['rapor_id'])
    op.create_index('ix_rapor_schedule_aktif', 'rapor_schedule', ['aktif'])

    # Foreign keys
    op.create_foreign_key(
        'fk_rapor_cektirmeler_rapor', 'rapor_cektirmeler', 'rapor_tanimlari',
        ['rapor_id'], ['id'], ondelete='CASCADE'
    )
    op.create_foreign_key(
        'fk_rapor_cektirmeler_olusturan', 'rapor_cektirmeler', 'kullanicilar',
        ['olusturan_kullanici_id'], ['id'], ondelete='SET NULL'
    )
    op.create_foreign_key(
        'fk_rapor_schedule_rapor', 'rapor_schedule', 'rapor_tanimlari',
        ['rapor_id'], ['id'], ondelete='CASCADE'
    )
    op.create_foreign_key(
        'fk_rapor_schedule_olusturan', 'rapor_schedule', 'kullanicilar',
        ['olusturan_kullanici_id'], ['id'], ondelete='SET NULL'
    )
    op.create_foreign_key(
        'fk_rapor_tanimlari_olusturan', 'rapor_tanimlari', 'kullanicilar',
        ['olusturan_kullanici_id'], ['id'], ondelete='SET NULL'
    )


def downgrade() -> None:
    op.drop_table('rapor_schedule')
    op.drop_table('rapor_cektirmeler')
    op.drop_table('rapor_tanimlari')
