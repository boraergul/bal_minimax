import requests

BASE = 'http://localhost:8000/api/v1'

# Login
login = requests.post(f'{BASE}/auth/login', data={'username': 'admin', 'password': 'admin123'})
token = login.json()['access_token']
headers = {'Authorization': f'Bearer {token}'}

# Get hammaddeler
r = requests.get(f'{BASE}/urunler/hammaddeler/liste', headers=headers)
hammaddeler = r.json()
incir = next((h for h in hammaddeler if 'Incir' in h['ad'] and 'kg' not in h['ad']), None)
print(f"Secilen ham madde: {incir['ad']} ({incir['kategori']})")

# Create MAMUL product
mamul_data = {
    "ad": "Incir Paketi 1kg",
    "kategori": "MAMUL",
    "birim_toptan": "adet",
    "birim_perakende": "paket",
    "hammadde_id": incir['id'],
    "raf_omru_gun": 365
}

r = requests.post(f'{BASE}/urunler', headers=headers, json=mamul_data)
if r.status_code == 200:
    mamul = r.json()
    print(f"\n=== Yeni Mamul Olusturuldu ===")
    print(f"ID: {mamul['id']}")
    print(f"Ad: {mamul['ad']}")
    print(f"Kategori: {mamul['kategori']}")
    print(f"Ham Madde: {mamul.get('hammadde_ad', 'Yok')}")
    print(f"Stok Kodu: {mamul.get('stok_kodu', 'Yok')}")
    
    # Test: Generate stock code
    from lib_utils import generateStokKodu
    kod = generateStokKodu(incir['ad'], incir['kategori'], 'adet', '1KG')
    print(f"\n=== Beklenen Stok Kodu ===")
    print(f"  {kod}")
else:
    print(f"Hata: {r.status_code} - {r.text}")
