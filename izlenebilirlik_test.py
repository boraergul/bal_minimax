import requests
import json
from datetime import datetime, timedelta

BASE = "http://localhost:8000/api/v1"

def pp(msg):
    print(f"\n{'='*50}\n{msg}\n{'='*50}")

# Login
pp("1. GIRIS YAPILIYOR")
login = requests.post(f"{BASE}/auth/login", data={"username": "admin", "password": "admin123"})
token = login.json()["access_token"]
headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
print(f"Token alindi: {token[:30]}...")

# Get products
prods = requests.get(f"{BASE}/urunler/?sayfa=1&sayfa_boyutu=50", headers=headers).json()
print("\n=== Tum Urunler ===")
for p in prods["data"]:
    print(f"  {p['ad']} - {p['kategori']} - ID: {p['id']}")

# Find raw material (MEYVE category, not MAMUL)
incir = next((p for p in prods["data"] if "Incir" in p["ad"] and p["kategori"] == "MEYVE"), None)
print(f"\nHammadde (Incir): {incir['ad']} - ID: {incir['id']}")

# Find or create MAMUL product
mamul = next((p for p in prods["data"] if p["kategori"] == "MAMUL"), None)
if not mamul:
    pp("2. MAMUL URUN OLUSTURMA")
    mamul_data = {
        "ad": "Kuru Incir Paketi 500g",
        "kategori": "MAMUL",
        "birim_toptan": "adet",
        "birim_perakende": "paket",
        "raf_omru_gun": 365
    }
    r = requests.post(f"{BASE}/urunler", headers=headers, json=mamul_data)
    mamul = r.json()
    print(f"Mamul olusturuldu: {mamul['ad']} - ID: {mamul['id']}")
else:
    print(f"Mevcut mamul kullaniliyor: {mamul['ad']} - ID: {mamul['id']}")

mamul_id = mamul["id"]
incir_id = incir["id"]

# Check existing stock lots
pp("3. MEVCUT STOK LOTLARI")
stok = requests.get(f"{BASE}/stok/?sayfa=1&sayfa_boyutu=50", headers=headers).json()
for s in stok["data"]:
    print(f"  {s['lot_no']} - {s['urun_ad']} - {s['stok_tipi']} - {s['miktar']} {s['birim']}")

# Find or create raw material stock lot
hammadde_lot = next((s for s in stok["data"] if "Incir" in s.get("urun_ad", "") and s["stok_tipi"] == "HAMMADDE"), None)
if hammadde_lot:
    lot_no = hammadde_lot["lot_no"]
    print(f"\nMevcut ham madde lotu: {lot_no} - Miktar: {hammadde_lot['miktar']} {hammadde_lot['birim']}")
else:
    # Create new raw material entry
    pp("3. YENI HAMMADDE GIRISI")
    giris_data = {
        "urun_id": incir_id,
        "tedarikci_id": None,
        "miktar": 100,
        "birim": "kg",
        "birim_fiyat": 250.00,
        "son_kullanma": (datetime.now() + timedelta(days=730)).strftime("%Y-%m-%d"),
        "konum": "Depo A - Raf 3"
    }
    r = requests.post(f"{BASE}/stok/giris", headers=headers, json=giris_data)
    hammadde_lot = r.json()
    lot_no = hammadde_lot["lot_no"]
    print(f"Yeni ham madde girisi: {lot_no} - Miktar: {hammadde_lot['miktar']} kg")

# Create production order
pp("4. URETIM EMRI OLUSTURMA")
print(f"Mamul ID: {mamul_id}")
print(f"Hammadde ID: {incir_id}")
print(f"Hammadde Lot: {lot_no}")

detay_data = [{
    "mamul_urun_id": mamul_id,
    "mamul_miktar": 50,  # 50 adet 500g paket
    "hammadde_urun_id": incir_id,
    "hammadde_lot_no": lot_no,
    "hammadde_miktar": 25  # 25kg incir kullanilacak
}]
emir_data = {
    "not_text": "Izlenebilirlik test",
    "oncelik": "NORMAL",
    "detaylar": detay_data
}
print(f"\nEmir data: {json.dumps(emir_data, indent=2)}")

r = requests.post(f"{BASE}/uretim", headers=headers, json=emir_data)
print(f"Status: {r.status_code}")
print(f"Response: {r.text[:500]}")

if r.status_code != 200:
    print(f"HATA: {r.text}")
else:
    emir = r.json()
    print(f"\nUretim emri olusturuldu: {emir['uretim_no']} - ID: {emir['id']}")
    emir_id = emir["id"]
    
    # Complete the production
    pp("5. URETIMI TAMAMLAMA")
    r = requests.post(f"{BASE}/uretim/{emir_id}/tamamla?gerceklesen_miktar=50", headers=headers)
    print(f"Status: {r.status_code}")
    
    if r.status_code != 200:
        print(f"HATA: {r.text}")
    else:
        result = r.json()
        print(f"Uretim tamamlandi!")
        print(f"  Mamul Lot No: {result.get('mamul_lot_no')}")
        print(f"  Miktar: {result.get('miktar')} adet")
        print(f"  Maliyet: {result.get('toplam_maliyet')} TL")
        if result.get("kaynak_lot"):
            print(f"  Kaynak Lot: {result['kaynak_lot']['lot_no']}")
            print(f"  Kaynak Urun: {result['kaynak_lot']['urun_ad']}")
            print(f"  Tedarikci: {result['kaynak_lot']['tedarikci_ad']}")

        mamul_lot_no = result.get("mamul_lot_no")

        # Check traceability
        pp("6. IZLENEBILIRLIK KONTROL")
        if mamul_lot_no:
            r = requests.get(f"{BASE}/raporlar/izlenebilirlik/lot/{mamul_lot_no}", headers=headers)
            trace = r.json()
            
            print(f"\n--- Mamul Lot: {trace['lot']['lot_no']} ---")
            print(f"  Urun: {trace['lot']['urun_ad']}")
            print(f"  Miktar: {trace['lot']['miktar']} {trace['lot']['birim']}")
            
            if trace.get("kaynak"):
                print(f"\n--- Kaynak Hammadde ---")
                print(f"  Lot No: {trace['kaynak']['lot_no']}")
                print(f"  Urun: {trace['kaynak']['urun_ad']}")
                print(f"  Tedarikci: {trace['kaynak']['tedarikci_ad']}")
            
            # Also check traceability from raw material perspective
            pp("7. HAMMADDE IZLENEBILIRLIK (TERS YON)")
            r2 = requests.get(f"{BASE}/raporlar/izlenebilirlik/lot/{lot_no}", headers=headers)
            trace2 = r2.json()
            
            print(f"\n--- Hammadde Lot: {trace2['lot']['lot_no']} ---")
            print(f"  Urun: {trace2['lot']['urun_ad']}")
            print(f"  Miktar: {trace2['lot']['miktar']} {trace2['lot']['birim']}")
            
            if trace2.get("hareketler"):
                print(f"\n--- Stok Hareketleri ---")
                for h in trace2["hareketler"]:
                    print(f"  {h['hareket_tipi']}: {h['miktar']}")

        print("\n\n" + "="*50)
        print("IZLENEBILIRLIK SENARYOSU TAMAMLANDI!")
        print("="*50)
        print(f"Browser'da ac: http://localhost:5173/izlenebilirlik")
        print(f"Test icin lot numarasi: {mamul_lot_no}")
