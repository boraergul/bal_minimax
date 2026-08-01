"""
Reports API router
"""
from typing import Optional
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, and_

from app.core.database import get_db
from app.api.auth import get_current_user
from app.models.user import Kullanici
from app.models.stok import StokKarti, StokHareket
from app.models.urun import Urun
from app.models.tedarikci import Tedarikci
from app.models.satis import SatisKaydi, SatisKalemi
from app.models.uretim import UretimEmri

router = APIRouter()


@router.get("/stok/anlik")
async def stok_anlik_raporu(
    db: Session = Depends(get_db),
    current_user: Kullanici = Depends(get_current_user)
):
    """Current stock summary by product and category."""
    results = db.query(
        Urun.kategori,
        func.count(StokKarti.id).label("lot_sayisi"),
        func.coalesce(func.sum(StokKarti.miktar), 0).label("toplam_miktar"),
        func.coalesce(func.sum(StokKarti.miktar * StokKarti.birim_fiyat), 0).label("toplam_deger")
    ).outerjoin(
        StokKarti,
        and_(
            StokKarti.urun_id == Urun.id,
            StokKarti.durum == "AKTIF",
            StokKarti.silme_tarihi.is_(None)
        )
    ).filter(
        Urun.aktif == True,
        Urun.silme_tarihi.is_(None)
    ).group_by(
        Urun.kategori
    ).all()
    
    return {
        "data": [
            {
                "kategori": r.kategori,
                "lot_sayisi": r.lot_sayisi,
                "toplam_miktar": float(r.toplam_miktar),
                "toplam_deger": float(r.toplam_deger)
            }
            for r in results
        ]
    }


@router.get("/stok/uyari")
async def stok_uyari_raporu(
    db: Session = Depends(get_db),
    current_user: Kullanici = Depends(get_current_user)
):
    """Stock alerts - low stock and expiring soon."""
    # Low stock (below minimum)
    low_stock = db.query(
        StokKarti,
        Urun
    ).join(
        Urun, StokKarti.urun_id == Urun.id
    ).filter(
        StokKarti.durum == "AKTIF",
        StokKarti.silme_tarihi.is_(None),
        Urun.minimum_stok_seviyesi.isnot(None),
        StokKarti.miktar < Urun.minimum_stok_seviyesi
    ).limit(20).all()
    
    # Expiring soon (within 30 days)
    today = datetime.utcnow()
    expiry_threshold = (today + timedelta(days=30)).strftime("%Y-%m-%d")
    
    expiring = db.query(StokKarti, Urun).join(
        Urun, StokKarti.urun_id == Urun.id
    ).filter(
        StokKarti.durum == "AKTIF",
        StokKarti.silme_tarihi.is_(None),
        StokKarti.son_kullanma.isnot(None),
        StokKarti.son_kullanma <= expiry_threshold,
        StokKarti.son_kullanma >= today.strftime("%Y-%m-%d")
    ).order_by(StokKarti.son_kullanma.asc()).limit(20).all()
    
    return {
        "dusuk_stok": [
            {
                "lot_no": s.lot_no,
                "urun_ad": u.ad,
                "miktar": float(s.miktar),
                "minimum": float(u.minimum_stok_seviyesi),
                "konum": s.konum
            }
            for s, u in low_stock
        ],
        "son_kullanma_yaklasan": [
            {
                "lot_no": s.lot_no,
                "urun_ad": u.ad,
                "miktar": float(s.miktar),
                "son_kullanma": s.son_kullanma,
                "gun_kaldi": (datetime.strptime(s.son_kullanma, "%Y-%m-%d") - today).days if s.son_kullanma else None
            }
            for s, u in expiring
        ]
    }


@router.get("/satis/ozet")
async def satis_ozet_raporu(
    baslangic: Optional[str] = None,
    bitis: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: Kullanici = Depends(get_current_user)
):
    """Sales summary report."""
    query = db.query(SatisKaydi).filter(
        SatisKaydi.silme_tarihi.is_(None),
        SatisKaydi.durum == "TAMAMLANDI"
    )
    
    if baslangic:
        query = query.filter(SatisKaydi.tarih >= baslangic)
    if bitis:
        query = query.filter(SatisKaydi.tarih <= bitis)
    
    kayitlar = query.all()
    
    toplam_satis = len(kayitlar)
    toplam_tutar = sum(float(k.toplam_tutar) for k in kayitlar)
    iptal_sayisi = db.query(SatisKaydi).filter(
        SatisKaydi.silme_tarihi.is_(None),
        SatisKaydi.durum == "IPTAL"
    ).count()
    
    return {
        "toplam_satis": toplam_satis,
        "toplam_tutar": toplam_tutar,
        "iptal_sayisi": iptal_sayisi,
        "baslangic": baslangic,
        "bitis": bitis
    }


@router.get("/uretim/ozet")
async def uretim_ozet_raporu(
    baslangic: Optional[str] = None,
    bitis: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: Kullanici = Depends(get_current_user)
):
    """Production summary report."""
    query = db.query(UretimEmri).filter(
        UretimEmri.silme_tarihi.is_(None)
    )
    
    if baslangic:
        query = query.filter(UretimEmri.tarih >= baslangic)
    if bitis:
        query = query.filter(UretimEmri.tarih <= bitis)
    
    emirler = query.all()
    
    tamamlanan = [e for e in emirler if e.durum == "TAMAMLANDI"]
    toplam_maliyet = sum(float(e.toplam_maliyet or 0) for e in tamamlanan)
    
    return {
        "toplam_emir": len(emirler),
        "tamamlanan": len(tamamlanan),
        "bekleyen": len([e for e in emirler if e.durum == "BEKLEMEDE"]),
        "iptal": len([e for e in emirler if e.durum == "IPTAL"]),
        "toplam_maliyet": toplam_maliyet
    }


@router.get("/izlenebilirlik/lot/{lot_no}")
async def lot_izlenebilirlik(
    lot_no: str,
    db: Session = Depends(get_db),
    current_user: Kullanici = Depends(get_current_user)
):
    """Traceability report for a lot."""
    from app.models.musteri import Musteri
    
    # Find lot
    stok = db.query(StokKarti).filter(
        StokKarti.lot_no == lot_no,
        StokKarti.silme_tarihi.is_(None)
    ).first()
    
    if not stok:
        return {"error": "Lot bulunamadı"}
    
    urun = db.query(Urun).filter(Urun.id == stok.urun_id).first()
    
    # Get supplier info (for raw materials)
    tedarikci = None
    if stok.tedarikci_id:
        ted = db.query(Tedarikci).filter(Tedarikci.id == stok.tedarikci_id).first()
        if ted:
            tedarikci = {
                "ad": ted.ad,
                "yetkili_kisi": ted.yetkili_kisi,
                "telefon": ted.telefon,
                "adres": ted.adres
            }
    
    # Get source lot if production output
    kaynak = None
    if stok.kaynak_stok_id:
        kaynak_stok = db.query(StokKarti).filter(
            StokKarti.id == stok.kaynak_stok_id
        ).first()
        if kaynak_stok:
            kaynak_ted = db.query(Tedarikci).filter(
                Tedarikci.id == kaynak_stok.tedarikci_id
            ).first()
            kaynak_urun = db.query(Urun).filter(Urun.id == kaynak_stok.urun_id).first()
            kaynak = {
                "lot_no": kaynak_stok.lot_no,
                "urun_ad": kaynak_urun.ad if kaynak_urun else None,
                "tedarikci_ad": kaynak_ted.ad if kaynak_ted else None,
                "uretim_tarihi": kaynak_stok.uretim_tarihi
            }
    
    # Get sales for finished goods
    satis_listesi = []
    if stok.stok_tipi == "MAMUL":
        # Find sales that might include this lot via stok_hareketleri
        hareketler = db.query(StokHareket).filter(
            StokHareket.lot_no == lot_no,
            StokHareket.hareket_tipi == "SATIS_CIKIS"
        ).all()
        
        for h in hareketler:
            if h.referans_id:
                satis = db.query(SatisKaydi).filter(
                    SatisKaydi.id == h.referans_id
                ).first()
                if satis:
                    musteri = db.query(Musteri).filter(Musteri.id == satis.musteri_id).first()
                    satis_listesi.append({
                        "satis_no": satis.satis_no,
                        "musteri_ad": musteri.ad if musteri else None,
                        "tarih": satis.tarih,
                        "miktar": abs(float(h.miktar))
                    })
    
    # Get stock movements
    hareketler = db.query(StokHareket).filter(
        StokHareket.lot_no == lot_no
    ).order_by(StokHareket.olusturma_tarihi.desc()).all()
    
    hareket_listesi = [
        {
            "id": str(h.id),
            "hareket_tipi": h.hareket_tipi,
            "miktar": float(h.miktar),
            "birim_fiyat": float(h.birim_fiyat) if h.birim_fiyat else None,
            "tutar": float(h.tutar) if h.tutar else None,
            "olusturma_tarihi": str(h.olusturma_tarihi),
            "aciklama": h.aciklama
        }
        for h in hareketler
    ]
    
    return {
        "lot": {
            "id": str(stok.id),
            "lot_no": stok.lot_no,
            "urun_ad": urun.ad if urun else None,
            "kategori": urun.kategori if urun else None,
            "stok_tipi": stok.stok_tipi,
            "miktar": float(stok.miktar),
            "birim": stok.birim,
            "birim_fiyat": float(stok.birim_fiyat),
            "giris_tarihi": stok.giris_tarihi,
            "uretim_tarihi": stok.uretim_tarihi,
            "son_kullanma": stok.son_kullanma,
            "konum": stok.konum,
            "durum": stok.durum
        },
        "tedarikci": tedarikci,
        "kaynak": kaynak,
        "satis": satis_listesi if satis_listesi else None,
        "hareketler": hareket_listesi
    }


@router.get("/dashboard")
async def dashboard(
    db: Session = Depends(get_db),
    current_user: Kullanici = Depends(get_current_user)
):
    """Dashboard summary data."""
    # Stock summary
    stok_count = db.query(func.count(StokKarti.id)).filter(
        StokKarti.durum == "AKTIF",
        StokKarti.silme_tarihi.is_(None)
    ).scalar() or 0
    
    stok_deger = db.query(func.coalesce(func.sum(
        StokKarti.miktar * StokKarti.birim_fiyat
    ), 0)).filter(
        StokKarti.durum == "AKTIF",
        StokKarti.silme_tarihi.is_(None)
    ).scalar() or 0
    
    # Today's sales
    today = datetime.utcnow().strftime("%Y-%m-%d")
    today_satis = db.query(func.count(SatisKaydi.id)).filter(
        SatisKaydi.silme_tarihi.is_(None),
        SatisKaydi.tarih.like(f"{today}%")
    ).scalar() or 0
    
    # Active production orders
    uretim_bekleyen = db.query(func.count(UretimEmri.id)).filter(
        UretimEmri.silme_tarihi.is_(None),
        UretimEmri.durum.in_(["BEKLEMEDE", "ONAYLANDI"])
    ).scalar() or 0
    
    # Low stock count
    dusuk_stok = db.query(func.count(StokKarti.id)).join(
        Urun, StokKarti.urun_id == Urun.id
    ).filter(
        StokKarti.durum == "AKTIF",
        StokKarti.silme_tarihi.is_(None),
        Urun.minimum_stok_seviyesi.isnot(None),
        StokKarti.miktar < Urun.minimum_stok_seviyesi
    ).scalar() or 0
    
    return {
        "stok": {
            "lot_sayisi": stok_count,
            "toplam_deger": float(stok_deger)
        },
        "satis": {
            "bugunku": today_satis
        },
        "uretim": {
            "bekleyen": uretim_bekleyen
        },
        "uyarilar": {
            "dusuk_stok": dusuk_stok
        }
    }
