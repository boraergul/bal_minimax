"""Bağımsız SQL/DDL ve enum bütünlük denetimi. Rapor subagent'ınca listelenen
runtime/migration kırıcıların kalan açıklarını yakalar."""
from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent
DOCS = {p.name: p for p in ROOT.glob("*.md") if p.name != "CAPRAZ-DOKUMAN-CELISKI-RAPORU.md"}


def text(name: str) -> str:
    return DOCS[name].read_text(encoding="utf-8")


issues: list[str] = []


def fail(msg: str) -> None:
    issues.append(msg)


def grep_lines(name: str, pattern: str, *, flags: int = 0):
    return [
        (i + 1, line)
        for i, line in enumerate(text(name).splitlines())
        if re.search(pattern, line, flags)
    ]


# 1) Tablo içi UNIQUE (...) WHERE ... → PostgreSQL'de geçersiz
for name in DOCS:
    for line_no, line in grep_lines(name, r"^\s*CONSTRAINT \w+ UNIQUE\s*\([^)]+\)\s*WHERE\s+", flags=re.I):
        fail(f"{name}:{line_no}: tablo içi partial UNIQUE → {line.strip()}")

# 2) CONSTRAINT adı + CHECK ifadesi başında CHECK eksik
# Yakalar: `CONSTRAINT foo kontrol_tarihi <= NOW()` (CHECK yok)
for name in DOCS:
    for line_no, line in grep_lines(name, r"^\s*CONSTRAINT\s+\w+\s+[^C\s][^,]*$"):
        if "CHECK" in line.upper():
            continue
        if line.upper().lstrip().startswith("CONSTRAINT ") and not re.search(r"\b(CHECK|UNIQUE|PRIMARY KEY|FOREIGN KEY|EXCLUDE)\b", line.upper()):
            fail(f"{name}:{line_no}: eksik CHECK/UNIQUE/PK/FK/EXCLUDE → {line.strip()}")

# 3) sistem_ayarlari INSERT eksik veri_tipi/kategori
for name in DOCS:
    lines = text(name).splitlines()
    for line_no, line in enumerate(lines, 1):
        # Yalnız VALUES içeren INSERT satırı (kolon listesi değil)
        if not re.search(r"INSERT INTO sistem_ayarlari\b.*VALUES\b", line, re.I):
            continue
        # En yakın ';' bul
        block_end = line_no
        for j in range(line_no, min(line_no + 30, len(lines))):
            if lines[j].rstrip().endswith(";"):
                block_end = j + 1
                break
        else:
            block_end = min(line_no + 30, len(lines))
        block = "\n".join(lines[line_no - 1:block_end])
        if "veri_tipi" not in block or "kategori" not in block:
            fail(f"{name}:{line_no}: sistem_ayarlari INSERT eksik kolon → {block[:200]}")

# 4) INSERT INTO x ( SELECT ... → parantez-SELECT kalıbı syntax error
for name in DOCS:
    for line_no, line in grep_lines(name, r"INSERT INTO \w+\s*\(\s*$"):
        lines = text(name).splitlines()
        next_nonblank = next((j for j in range(line_no + 1, len(lines)) if lines[j].strip()), None)
        if next_nonblank is not None and lines[next_nonblank].lstrip().upper().startswith("SELECT"):
            fail(f"{name}:{line_no}: INSERT INTO x ( SELECT ... syntax error → {lines[line_no].strip()}")

# 5) Olmayan kolon: stok_hareketleri.duzeltme_miktar
for name in DOCS:
    for line_no, line in grep_lines(name, r"\b(stok_hareketleri|sh)\.duzeltme_miktar\b"):
        fail(f"{name}:{line_no}: stok_hareketleri.duzeltme_miktar referansı → {line.strip()}")

# 6) Mükerrer kalite modeli: kontrol_id PK kalite tablosunda
for name in DOCS:
    for line_no, line in grep_lines(name, r"CREATE TABLE kalite_kontrol"):
        # PK satırını bul
        lines = text(name).splitlines()
        for j in range(line_no, min(line_no + 8, len(lines))):
            if re.search(r"PRIMARY KEY", lines[j]) and "kontrol_id" in lines[j]:
                fail(f"{name}:{j+1}: kalite_kontrol PK kontrol_id; kanonik kalite_id olmalı")
                break

# 7) skt_islem.islem_turu enum: INDRIM/INDRIMLI tutarsızlığı
for name in DOCS:
    for line_no, line in grep_lines(name, r"CHECK \(islem_turu IN \('IMHA', 'INDRIM'"):
        fail(f"{name}:{line_no}: skt_islem_turu INDRIM; kanonik INDIRIMLI_SATIS")

# 8) skt_islem_turu vs sözlük sözlük: DB-Design'da INDIRIM yazıyorsa
db = text("DB-Design-Kurutulmus-Meyve-Bal-ERP.md")
if "islem_turu` | INDIRIM" in db or "skt_islem.islem_turu` | INDIRIM" in db:
    fail("DB-Design: skt_islem.islem_turu sözlük INDIRIM; kanonik INDIRIMLI_SATIS")

# 9) urunler.kategori: TURŞU vs TURSU
for name in DOCS:
    for line_no, line in grep_lines(name, r"kategori.*TURŞU"):
        fail(f"{name}:{line_no}: urunler.kategori TURŞU; kanonik TURSU → {line.strip()}")

# 10) talep_durum: RETTEDİ (eski) REDDEDILDI olmalı
for name in DOCS:
    for line_no, line in grep_lines(name, r"CHECK \(durum IN \('OLUSTURULDU', 'BEKLEMEDE_ONAY', 'ONAYLANDI', 'RETTEDI'"):
        fail(f"{name}:{line_no}: talep_durum RETTEDİ → {line.strip()}")

# 11) kontrol_turu enum: MAL_KABUL vs GIRIS_KONTROL
for name in DOCS:
    for line_no, line in grep_lines(name, r"MAL_KABUL\s*\|\s*URETIM\s*\|\s*SEVK\s*\|\s*IADE"):
        fail(f"{name}:{line_no}: kontrol_turu enum MAL_KABUL seti; kanonik kontrol_tipi → {line.strip()[:80]}")

# 12) SON-KULLANMA-FEFO eski endpoint path
fefo = text("SON-KULLANMA-FEFO-COZUMU.md")
for bad in ("/api/v1/satis/satis-cikis", "/api/v1/stok/lot-onerisi", "/api/v1/stok/skt-raporu",
            "/api/v1/stok/skt-islem", "/api/v1/stok/skt-esik"):
    for line_no, line in enumerate(fefo.splitlines(), 1):
        if bad in line:
            fail(f"SON-KULLANMA-FEFO-COZUMU.md:{line_no}: eski endpoint {bad}")

# 13) Kalite kontrol state makinesi: KONTROL_EDILIYOR zorunlu olmalı
quality = text("KALITE-KONTROL-COZUMU.md")
if "BEKLIYOR | KONTROL_EDILIYOR" not in quality:
    fail("KALITE-KONTROL-COZUMU.md: state machine KONTROL_EDILIYOR yok")

# 14) kontrol_tarihi CHECK syntax (CHECK anahtar kelimesi zorunlu)
for name in DOCS:
    for line_no, line in grep_lines(name, r"^\s*CONSTRAINT\s+kontrol_tarihi_\w+\s+kontrol_tarihi"):
        fail(f"{name}:{line_no}: CHECK anahtar kelimesi eksik → {line.strip()}")

# 15) YONETICI_OYASI hala var mı?
for name in DOCS:
    for line_no, line in grep_lines(name, r"YONETICI_OYASI"):
        fail(f"{name}:{line_no}: YONETICI_OYASI typo → {line.strip()}")

# 16) ONARSLANDI hala var mı?
for name in DOCS:
    for line_no, line in grep_lines(name, r"ONARSLANDI"):
        fail(f"{name}:{line_no}: ONARSLANDI typo → {line.strip()}")

if issues:
    print(f"FAIL: {len(issues)} açık")
    for i in issues:
        print(i)
    raise SystemExit(1)

print("PASS: SQL/DDL ve enum runtime bütünlük denetimi temiz.")
