"""
Seed data for initial database setup
"""
import uuid
from datetime import datetime, timedelta

from app.core.database import SessionLocal, engine, Base
from app.core.security import get_password_hash
from app.models import *


def generate_lot_no(prefix):
    """Generate unique lot number."""
    return f"{prefix}-{datetime.now().strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}"


def seed_database():
    """Seed the database with initial data."""
    # Create tables
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    
    try:
        # Check if already seeded
        existing_roles = db.query(Rol).first()
        if existing_roles:
            print("Database already seeded. Skipping...")
            return
        
        # Create roles
        admin_role = Rol(
            ad="ADMIN",
            aciklama="Sistem yoneticisi",
            yetkiler=["*"]
        )
        depo_role = Rol(
            ad="DEPO_SORUMLUSU",
            aciklama="Depo sorumlusu",
            yetkiler=["stok:read", "stok:write", "uretim:read", "uretim:write", "urun:read"]
        )
        satis_role = Rol(
            ad="SATIS_SORUMLUSU",
            aciklama="Satis sorumlusu",
            yetkiler=["satis:read", "satis:write", "musteri:read", "musteri:write", "urun:read", "stok:read"]
        )
        
        db.add_all([admin_role, depo_role, satis_role])
        db.flush()
        
        # Create users
        admin_user = Kullanici(
            kullanici_adi="admin",
            sifre_hash=get_password_hash("admin123"),
            ad="Sistem",
            soyad="Yoneticisi",
            eposta="admin@bal.com",
            rol_id=admin_role.id,
            aktif=True,
            telefon="05551234567"
        )
        depo_user = Kullanici(
            kullanici_adi="depo",
            sifre_hash=get_password_hash("depo123"),
            ad="Ali",
            soyad="Depo",
            eposta="depo@bal.com",
            rol_id=depo_role.id,
            aktif=True,
            telefon="05552345678"
        )
        satis_user = Kullanici(
            kullanici_adi="satis",
            sifre_hash=get_password_hash("satis123"),
            ad="Ayse",
            soyad="Satis",
            eposta="satis@bal.com",
            rol_id=satis_role.id,
            aktif=True,
            telefon="05553456789"
        )
        
        db.add_all([admin_user, depo_user, satis_user])
        db.flush()
        
        # Create products
        kayisi = Urun(
            ad="Kurutulmus Kayisi",
            kategori="MEYVE",
            birim_toptan="kg",
            birim_perakende="paket",
            stok_kodu="KM-KRS-001",
            barkod="8691234567890",
            aciklama="Dogal kurutulmus kayisi",
            raf_omru_gun=365,
            aktif=True,
            olusturan_kullanici_id=admin_user.id
        )
        uzum = Urun(
            ad="Kurutulmus Uzum",
            kategori="MEYVE",
            birim_toptan="kg",
            birim_perakende="paket",
            stok_kodu="UZ-KRS-001",
            barkod="8691234567891",
            aciklama="Dogal kurutulmus uzum",
            raf_omru_gun=365,
            aktif=True,
            olusturan_kullanici_id=admin_user.id
        )
        incir = Urun(
            ad="Kurutulmus Incir",
            kategori="MEYVE",
            birim_toptan="kg",
            birim_perakende="paket",
            stok_kodu="IN-KRS-001",
            barkod="8691234567895",
            aciklama="Dogal kurutulmus incir",
            raf_omru_gun=365,
            aktif=True,
            olusturan_kullanici_id=admin_user.id
        )
        cicik_bal = Urun(
            ad="Cicek Bali",
            kategori="BAL",
            birim_toptan="kg",
            birim_perakende="paket",
            stok_kodu="BAL-CIC-001",
            barkod="8691234567892",
            aciklama="Dogal cicek bali",
            raf_omru_gun=730,
            aktif=True,
            olusturan_kullanici_id=admin_user.id
        )
        kekik_bal = Urun(
            ad="Kekik Bali",
            kategori="BAL",
            birim_toptan="kg",
            birim_perakende="paket",
            stok_kodu="BAL-KEK-001",
            barkod="8691234567893",
            aciklama="Dogal kekik bali",
            raf_omru_gun=730,
            aktif=True,
            olusturan_kullanici_id=admin_user.id
        )
        
        db.add_all([kayisi, uzum, incir, cicik_bal, kekik_bal])
        db.flush()
        
        # Create suppliers
        tedarikci1 = Tedarikci(
            ad="Malatya Kayisi Tesisi",
            vergi_no="1234567890",
            telefon="04262123456",
            eposta="malatya@kayisi.com",
            adres="Malatya Turkiye",
            yetkili_kisi="Mehmet Yilmaz",
            aktif=True,
            olusturan_kullanici_id=admin_user.id
        )
        tedarikci2 = Tedarikci(
            ad="Ege Kuru Uzum Ltd",
            vergi_no="0987654321",
            telefon="02364567890",
            eposta="ege@uzum.com",
            adres="Izmir Turkiye",
            yetkili_kisi="Ayse Kaya",
            aktif=True,
            olusturan_kullanici_id=admin_user.id
        )
        tedarikci3 = Tedarikci(
            ad="Dogu Anadolu Aricilik",
            vergi_no="5678901234",
            telefon="04421234567",
            eposta="dogu@aricilik.com",
            adres="Erzurum Turkiye",
            yetkili_kisi="Hasan Demir",
            aktif=True,
            olusturan_kullanici_id=admin_user.id
        )
        
        db.add_all([tedarikci1, tedarikci2, tedarikci3])
        db.flush()
        
        # Create customers
        musteri1 = Musteri(
            ad="Super Market Zinciri",
            telefon="02125551234",
            eposta="ali@süpermarket.com",
            adres="Istanbul Turkiye",
            vergi_no="1112223334",
            musteri_tipi="KURUMSAL",
            aktif=True,
            olusturan_kullanici_id=admin_user.id
        )
        musteri2 = Musteri(
            ad="Organik Gida Dukkani",
            telefon="03124567890",
            eposta="zeynep@organik.com",
            adres="Ankara Turkiye",
            vergi_no="4445556667",
            musteri_tipi="BIREYSEL",
            aktif=True,
            olusturan_kullanici_id=admin_user.id
        )
        musteri3 = Musteri(
            ad="Ihracat Trading AS",
            telefon="02125559876",
            eposta="kemal@trading.com",
            adres="Istanbul Turkiye",
            vergi_no="7778889990",
            musteri_tipi="KURUMSAL",
            aktif=True,
            olusturan_kullanici_id=admin_user.id
        )
        
        db.add_all([musteri1, musteri2, musteri3])
        db.flush()
        
        now = datetime.utcnow()
        
        # Create stock cards
        stok_kayisi_1 = StokKarti(
            urun_id=kayisi.id,
            lot_no=generate_lot_no("KAY"),
            stok_tipi="HAMMADDE",
            birim="kg",
            miktar=500,
            birim_fiyat=85.00,
            giris_tarihi=now.isoformat(),
            konum="DEPO-A-001",
            durum="AKTIF",
            tedarikci_id=tedarikci1.id,
            olusturan_kullanici_id=admin_user.id
        )
        stok_uzum_1 = StokKarti(
            urun_id=uzum.id,
            lot_no=generate_lot_no("UZM"),
            stok_tipi="HAMMADDE",
            birim="kg",
            miktar=400,
            birim_fiyat=65.00,
            giris_tarihi=now.isoformat(),
            konum="DEPO-B-001",
            durum="AKTIF",
            tedarikci_id=tedarikci2.id,
            olusturan_kullanici_id=admin_user.id
        )
        stok_cicik_1 = StokKarti(
            urun_id=cicik_bal.id,
            lot_no=generate_lot_no("BAL"),
            stok_tipi="MAMUL",
            birim="kg",
            miktar=140,
            birim_fiyat=180.00,
            giris_tarihi=now.isoformat(),
            konum="DEPO-C-001",
            durum="AKTIF",
            olusturan_kullanici_id=admin_user.id
        )
        stok_kekik_1 = StokKarti(
            urun_id=kekik_bal.id,
            lot_no=generate_lot_no("BAL"),
            stok_tipi="MAMUL",
            birim="kg",
            miktar=95,
            birim_fiyat=220.00,
            giris_tarihi=now.isoformat(),
            konum="DEPO-C-002",
            durum="AKTIF",
            olusturan_kullanici_id=depo_user.id
        )
        
        db.add_all([stok_kayisi_1, stok_uzum_1, stok_cicik_1, stok_kekik_1])
        db.flush()
        
        # Create stock movements
        hareketler = [
            StokHareket(
                stok_id=stok_kayisi_1.id,
                hareket_tipi="GIRIS",
                miktar=500,
                birim_fiyat=85.00,
                tutar=42500.00,
                onceki_miktar=0,
                sonraki_miktar=500,
                lot_no=stok_kayisi_1.lot_no,
                tedarikci_id=tedarikci1.id,
                aciklama="Malatya kayisi",
                olusturan_kullanici_id=admin_user.id
            ),
            StokHareket(
                stok_id=stok_uzum_1.id,
                hareket_tipi="GIRIS",
                miktar=400,
                birim_fiyat=65.00,
                tutar=26000.00,
                onceki_miktar=0,
                sonraki_miktar=400,
                lot_no=stok_uzum_1.lot_no,
                tedarikci_id=tedarikci2.id,
                aciklama="Ege uzumu",
                olusturan_kullanici_id=admin_user.id
            ),
            StokHareket(
                stok_id=stok_cicik_1.id,
                hareket_tipi="URETIM_GIRIS",
                miktar=140,
                birim_fiyat=180.00,
                tutar=25200.00,
                onceki_miktar=0,
                sonraki_miktar=140,
                lot_no=stok_cicik_1.lot_no,
                aciklama="Yeni sezon cicek bali",
                olusturan_kullanici_id=admin_user.id
            ),
            StokHareket(
                stok_id=stok_kekik_1.id,
                hareket_tipi="URETIM_GIRIS",
                miktar=95,
                birim_fiyat=220.00,
                tutar=20900.00,
                onceki_miktar=0,
                sonraki_miktar=95,
                lot_no=stok_kekik_1.lot_no,
                aciklama="Yuksek kalite kekik bali",
                olusturan_kullanici_id=depo_user.id
            ),
        ]
        
        db.add_all(hareketler)
        db.flush()
        
        # Create production orders
        uretim_tarih = (now - timedelta(days=10)).strftime('%Y-%m-%d')
        uretim_emri1 = UretimEmri(
            uretim_no=f"URET-{now.strftime('%Y%m%d')}-001",
            tarih=now.isoformat(),
            durum="TAMAMLANDI",
            not_text="Premium kalite",
            oncelik="NORMAL",
            planlanan_miktar=100,
            gerceklesen_miktar=98,
            planlanan_tarih=uretim_tarih,
            tamamlama_tarihi=now.isoformat(),
            olusturan_kullanici_id=admin_user.id
        )
        uretim_emri2 = UretimEmri(
            uretim_no=f"URET-{now.strftime('%Y%m%d')}-002",
            tarih=now.isoformat(),
            durum="ONAYLANDI",
            not_text="Yeni sezon bali",
            oncelik="ACIL",
            planlanan_miktar=50,
            planlanan_tarih=uretim_tarih,
            olusturan_kullanici_id=admin_user.id
        )
        
        db.add_all([uretim_emri1, uretim_emri2])
        db.flush()
        
        # Create sales
        satis_tarih = (now - timedelta(days=5)).strftime('%Y-%m-%d')
        satis1 = SatisKaydi(
            satis_no=f"SAT-{now.strftime('%Y%m%d')}-001",
            musteri_id=musteri1.id,
            tarih=now.isoformat(),
            durum="TAMAMLANDI",
            toplam_tutar=12750.00,
            not_text="Super market",
            odeme_durumu="ODENDI",
            olusturan_kullanici_id=satis_user.id
        )
        satis2 = SatisKaydi(
            satis_no=f"SAT-{now.strftime('%Y%m%d')}-002",
            musteri_id=musteri2.id,
            tarih=now.isoformat(),
            durum="TAMAMLANDI",
            toplam_tutar=4500.00,
            not_text="Organik gida",
            odeme_durumu="ODENDI",
            olusturan_kullanici_id=satis_user.id
        )
        
        db.add_all([satis1, satis2])
        db.flush()
        
        # Create sales items
        db.add(SatisKalemi(
            satis_id=satis1.id,
            urun_id=kayisi.id,
            miktar=100,
            birim_fiyat=100.00,
            tutar=10000.00
        ))
        db.add(SatisKalemi(
            satis_id=satis1.id,
            urun_id=cicik_bal.id,
            miktar=15,
            birim_fiyat=200.00,
            tutar=3000.00
        ))
        db.add(SatisKalemi(
            satis_id=satis2.id,
            urun_id=uzum.id,
            miktar=50,
            birim_fiyat=80.00,
            tutar=4000.00
        ))
        
        db.commit()
        print("Database seeded successfully!")
        print("Admin: admin / admin123")
        print("Depo: depo / depo123")
        print("Satis: satis / satis123")
        
    except Exception as e:
        db.rollback()
        print(f"Error: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed_database()
