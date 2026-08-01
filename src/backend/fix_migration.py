"""
Fix migration by adding guncelleme_tarihi to all tables that are missing it.
"""
import re

# Read the migration file
with open('alembic/versions/001_initial_schema.py', 'r', encoding='utf-8') as f:
    content = f.read()

# Tables missing guncelleme_tarihi
tables_missing = [
    'kalite_numuneleri',
    'birim_donusumleri',
    'satis_iadeleri',
    'iade_numuneleri',
    'toplu_islemler',
    'toplu_islem_satirlari',
    'uretim_iscilik',
    'uretim_enerji',
    'depo_bloklar',
    'depo_konumlari',
    'depo_transferleri',
    'depo_transfer_detaylari',
    'nakliye_takip',
    'etiket_alanlari',
]

for table in tables_missing:
    # Pattern to find the table definition
    pattern = rf"(op\.create_table\(\s*'{table}'.*?)(\)\s*\n\s*op\.create_index)"
    match = re.search(pattern, content, re.DOTALL)
    
    if match:
        old_text = match.group(1)
        new_text = old_text + "        sa.Column('guncelleme_tarihi', sa.DateTime(), nullable=True),\n"
        content = content.replace(old_text, new_text, 1)
        print(f"Fixed {table}")
    else:
        print(f"WARNING: Could not find {table}")

# Write the fixed content back
with open('alembic/versions/001_initial_schema.py', 'w', encoding='utf-8') as f:
    f.write(content)

print("\nDone! All tables fixed.")
