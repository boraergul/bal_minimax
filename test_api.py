import requests
import json

BASE = "http://localhost:8000/api/v1"

# Login
login = requests.post(f"{BASE}/auth/login", data={"username": "admin", "password": "admin123"})
token = login.json()["access_token"]
headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

print("=== Login OK ===")

# Check existing products
prods = requests.get(f"{BASE}/urunler/?sayfa=1&sayfa_boyutu=50", headers=headers).json()
print("\n=== Mevcut Urunler ===")
for p in prods["data"]:
    print(f"  {p['ad']} - {p['kategori']}")

# Try to create mamul product
mamul_data = {
    "ad": "Kuru Incir Paket 500g",
    "kategori": "MAMUL",
    "birim_toptan": "adet",
    "birim_perakende": "paket"
}

r = requests.post(f"{BASE}/urunler", headers=headers, json=mamul_data)
print(f"\n=== Mamul Create Status: {r.status_code} ===")
if r.status_code == 200:
    mamul = r.json()
    print(f"Mamul ID: {mamul['id']}")
    mamul_id = mamul['id']
else:
    print(f"Error: {r.text}")
    # Use existing BAL product as test
    bal_prods = [p for p in prods["data"] if p["kategori"] == "BAL"]
    if bal_prods:
        mamul_id = bal_prods[0]["id"]
        print(f"Kullanilacak mevcut urun: {bal_prods[0]['ad']} (ID: {mamul_id})")
    else:
        mamul_id = None
        print("No suitable product found")

print(f"\nMAMUL_ID={mamul_id}")
