import requests

BASE = 'http://localhost:8000/api/v1'

# Login
login = requests.post(f'{BASE}/auth/login', data={'username': 'admin', 'password': 'admin123'})
token = login.json()['access_token']
headers = {'Authorization': f'Bearer {token}'}

# Test hammaddeler endpoint
r = requests.get(f'{BASE}/urunler/hammaddeler/liste', headers=headers)
print('=== Hammaddeler ===')
for h in r.json():
    print(f"  {h['id'][:8]}... - {h['ad']} ({h['kategori']})")

# Test urunler list
r = requests.get(f'{BASE}/urunler/?sayfa=1&sayfa_boyutu=10', headers=headers)
print('\n=== Urunler (ilk 10) ===')
for u in r.json()['data']:
    hm = u.get('hammadde_ad') or '-'
    print(f"  {u['ad']} | {u['kategori']} | HamMadde: {hm}")

print('\nTest basarili!')
