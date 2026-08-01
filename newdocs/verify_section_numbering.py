import re
from pathlib import Path

p = Path(r'C:\Users\Super\workspace\DB-Design-Kurutulmus-Meyve-Bal-ERP.md')
text = p.read_text(encoding='utf-8')

headers = re.findall(r'^## (\d+)\. ', text, re.M)
dups = {}
for h in headers:
    dups[h] = dups.get(h, 0) + 1
print('Toplam ## başlık:', len(headers))
print('Benzersiz numaralar:', sorted(set(headers), key=int))
print('Tekrarlar:', {k: v for k, v in dups.items() if v > 1} or 'yok')

# Beklenen sıra
expected = [str(i) for i in range(1, 16)] + [str(i) for i in range(16, 31)]
expected = [n for n in expected if n != '15']  # §15 yok, §16'dan §30'a
actual = list(headers)
missing = [n for n in expected if n not in actual]
extra = [n for n in actual if n not in expected]
print('Eksik numaralar:', missing or 'yok')
print('Fazla numaralar:', extra or 'yok')

# İçeride §10/§11/§12/§13/§14/§15/§16/§17/§18/§19/§20 referansları tarama (altyapı katmanı)
# Veri modeli katmanındaki §10 (KVKK) ve §11 (Gıda) iç referansları meşru
# Altyapı bölümlerinin içinde §10-§20 referansları hatalı olabilir
import re
infra_text = text.split("## 16. Altyapı: Güvenlik Notları", 1)[1] if "## 16. Altyapı" in text else ""
print("Altyapı katmanı içinde '§10'/'§11'/... yanlış referans sayısı:")
for n in ("10", "11", "12", "13", "14", "15"):
    cnt = len(re.findall(rf"§{n}\b", infra_text))
    print(f"  §{n}: {cnt}")
