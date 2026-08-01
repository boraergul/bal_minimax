from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent
REPORT = ROOT / "CAPRAZ-DOKUMAN-CELISKI-RAPORU.md"
DOCS = sorted(p for p in ROOT.glob("*.md") if p != REPORT)

failures: list[str] = []


def text(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def forbid(pattern: str, files: list[Path] | None = None, flags: int = 0, note: str = "") -> None:
    rx = re.compile(pattern, flags)
    for p in files or DOCS:
        for line_no, line in enumerate(text(p).splitlines(), 1):
            if rx.search(line):
                failures.append(f"FORBID {p.name}:{line_no}: {line.strip()}" + (f" [{note}]" if note else ""))


def require(pattern: str, path: Path, flags: int = 0, note: str = "") -> None:
    if not re.search(pattern, text(path), flags):
        failures.append(f"REQUIRE {path.name}: /{pattern}/" + (f" [{note}]" if note else ""))


# 1) Kanonik tablo/alan/enum adları: rapordaki eski ve hatalı token'lar kaynak belgelerde kalmamalı.
forbid(r"\bstok_kartlari\b")
forbid(r"\buretim_emirleri\b")
forbid(r"\bsatis_kayitlari\b")
forbid(r"\bsatilan_kayitlari\b")
forbid(r"\bsatilan_kalemleri\b")
forbid(r"\btedarikci_degerlendirmeleri\b")
forbid(r"\bkalite_kontrol_kayitlari\b")
forbid(r"\blot_izlenebilirlik\b")
forbid(r"\bSON_KULLANIM_GECTI\b")
forbid(r"SON_KULLANIM_IŞLEM_GECICI")
forbid(r"\bSKT_uYARI_GUN\b")
forbid(r"\bson_kullanma_uyari_gun\b")
forbid(r"\bSTOK_GUNCLLENDI\b")
forbid(r"\bRETTEDI\b")
forbid(r"\bRETTI\b")
forbid(r"\bAKTİF\b")
forbid(r"\bİPTAL\b")

# 2) Raporun belirlediği SQL-kırıcı kalıplar.
db = ROOT / "DB-Design-Kurutulmus-Meyve-Bal-ERP.md"
arch = ROOT / "SYSTEM-ARCH-Kurutulmus-Meyve-Bal-ERP.md"
srs = ROOT / "SRS-Kurutulmus-Meyve-Bal-ERP.md"
fefo = ROOT / "SON-KULLANMA-FEFO-COZUMU.md"
quality = ROOT / "KALITE-KONTROL-COZUMU.md"
index = ROOT / "INDEX-DOKUMANLARI.md"
returns = ROOT / "SATIS-IADE-COZUMU.md"
adjust = ROOT / "STOK-DUZELTME-ONAY-COZUMU.md"
cost = ROOT / "URETIM-MALIYET-COZUMU.md"

forbid(r"REFERENCES\s+stok_kartlari\s*\(", [db], re.I)
forbid(r"ON\s+stok_kartlari\s*\(", [arch], re.I)
forbid(r"WHERE\s+aktif\s*=\s*true", [arch], re.I)
forbid(r"\bayar_key\b", [fefo], re.I)
forbid(r"\bayar_anahtari\b", [adjust], re.I)

# 3) Kapsam sınırı: faturalama/ödeme/vergi alanı kurulmamalı. "kapsam dışı" açıklaması serbesttir.
scope_tokens = re.compile(r"\bfatura(?:lama|lar|nın|nın|sı|si|ya|yı|dan|den|daki|deki)?\b|\be[- ]?fatura\w*\b|\bGIB\b|\bGİB\b|\bKDV\b", re.I)
allowed_scope = re.compile(r"kapsam\s*dış|kapsamı\s*dış|üretilmez|tutulmaz|sorumluluğundadır|harici muhasebe|haricinde|mali belge|değildir|yok", re.I)
for p in DOCS:
    for line_no, line in enumerate(text(p).splitlines(), 1):
        if scope_tokens.search(line) and not allowed_scope.search(line):
            failures.append(f"SCOPE {p.name}:{line_no}: {line.strip()}")
forbid(r"\bfatura_(?:no|tarihi|kesildi|id)\b")
forbid(r"\bfatura_kesme_kurallari\b")
forbid(r"\bkdv_hareket\b")

# 4) Kanonik kararların pozitif varlık kontrolleri.
require(r"SON_KULLANIM_GECDI", fefo)
require(r"SON_KULLANIM_ISLEM_GECICI", fefo)
require(r"SKT_UYARI_GUN", fefo)
require(r"gida_izlenebilirlik_log", db)
require(r"GET\s*\|\s*`?/api/v1/raporlar/izlenebilirlik/lot/\{lot_no\}", arch)
require(r"Depo Yönetimi \(`/api/v1/depo`\).*?/transferler", arch, re.S)
require(r"SKT Kontrol \(`/api/v1/stok/skt`\).*?/lot-onerisi", arch, re.S)
require(r"BEKLIYOR.*KONTROL_EDILIYOR.*KABUL.*KISMEN_KABUL.*RET", db, re.S)
require(r"BEKLIYOR.*KONTROL_EDILIYOR.*KABUL.*KISMEN_KABUL.*RET", quality, re.S)
require(r"SON_KULLANIM_CIKIS", db)
require(r"maker-checker|Maker-checker", adjust)
require(r"idempotent", cost, re.I)
require(r"faturalama.*kapsam dış|kapsam dış.*faturalama", srs, re.I | re.S)
require(r"faturalama.*kapsam dış|kapsam dış.*faturalama", returns, re.I | re.S)
require(r"etiket_sablon", index)
forbid(r"\bbarkod_yazici\b", [index])

# 5) Raporda kanıtlanan eski endpoint aileleri kalmamalı.
forbid(r"(?:GET|POST|PUT|PATCH|DELETE)\s+/(?!api/v1/)(?:lot|izlenebilirlik|urunler?|uretim|raporlar?|stok|depo)/", flags=re.I)
forbid(r"/api/v1/depo/transfer(?!ler)", flags=re.I)
forbid(r"/api/v1/stok/(?:lot-onerisi|skt-raporu|skt-islem|skt-esik)\b", [fefo], re.I)

# 6) Raporda yetki bulgusu olan FEFO belgesinde kapanmamış "Açık nokta" olmamalı.
forbid(r"Açık nokta|Review Gerekli", [fefo], re.I)

if failures:
    print(f"FAIL: {len(failures)} açık tutarsızlık")
    for item in failures:
        print(item)
    raise SystemExit(1)

print(f"PASS: {len(DOCS)} kaynak doküman tarandı; tanımlı çapraz-doküman kontrollerinde açık bulgu yok.")
