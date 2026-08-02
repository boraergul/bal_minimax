"""
Extended Reports API router
Genişletilmiş Raporlama Modülü - İzlenebilirlik, Stok Analizi, Fire Analizi, Kalite Özeti
"""
from typing import List, Optional
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from pydantic import BaseModel
from decimal import Decimal

from app.core.database import get_db
from app.api.auth import get_current_user
from app.models.user import Kullanici
from app.models.stok import StokKarti, StokHareket
from app.models.urun import Urun
from app.models.tedarikci import Tedarikci
from app.models.satis import SatisKaydi, SatisKalemi
from app.models.uretim import UretimEmri
from app.models.musteri import Musteri
from app.models.kalite_kontrol import KaliteKontrol
from app.models.rapor import RaporTanimi, RaporCektirme, RaporSchedule

router = APIRouter()


# ==================== SCHEMAS ====================

class TedarikciBilgi(BaseModel):
    ad: Optional[str]
    yetkili_kisi: Optional[str]
    telefon: Optional[str]
    adres: Optional[str]


class KaynakLot(BaseModel):
    lot_no: str
    urun_ad: Optional[str]
    tedarikci_ad: Optional[str]
    uretim_tarihi: Optional[str]


class SatisKaydiBilgi(BaseModel):
    satis_no: str
    musteri_ad: Optional[str]
    tarih: str
    miktar: float


class HareketBilgi(BaseModel):
    id: str
    hareket_tipi: str
    miktar: float
    birim_fiyat: Optional[float]
    tutar: Optional[float]
    olusturma_tarihi: str
    aciklama: Optional[str]


class LotBilgi(BaseModel):
    id: str
    lot_no: str
    urun_ad: Optional[str]
    kategori: Optional[str]
    stok_tipi: str
    miktar: float
    birim: str
    birim_fiyat: float
    giris_tarihi: str
    uretim_tarihi: Optional[str]
    son_kullanma: Optional[str]
    konum: Optional[str]
    durum: str


class IzlenebilirlikResponse(BaseModel):
    lot: LotBilgi
    tedarikci: Optional[TedarikciBilgi]
    kaynak: Optional[KaynakLot]
    satis: Optional[List[SatisKaydiBilgi]]
    hareketler: List[HareketBilgi]
    tedarik_zinciri: Optional[dict] = None


class StokDegerUrun(BaseModel):
    urun_id: str
    urun_ad: str
    kategori: str
    toplam_miktar: float
    toplam_deger: float


class StokDegerKategori(BaseModel):
    kategori: str
    urun_sayisi: int
    toplam_miktar: float
    toplam_deger: float


class StokDegerResponse(BaseModel):
    urunler: List[StokDegerUrun]
    kategoriler: List[StokDegerKategori]
    genel_toplam: float


class StokYaslandirmaBucket(BaseModel):
    bucket: str  # 0-30, 31-60, 61-90, 91+
    lot_sayisi: int
    toplam_miktar: float
    toplam_deger: float


class StokYaslandirmaResponse(BaseModel):
    buckets: List[StokYaslandirmaBucket]
    toplam_lot: int
    toplam_miktar: float
    toplam_deger: float


class FireAnalizKalem(BaseModel):
    urun_id: Optional[str]
    urun_ad: Optional[str]
    uretim_tarihi: str
    giris_miktar: float
    cikis_miktar: float
    fire_miktar: float
    fire_orani: float


class FireAnalizResponse(BaseModel):
    kalemler: List[FireAnalizKalem]
    toplam_giris: float
    toplam_cikis: float
    toplam_fire: float
    genel_fire_orani: float


class KaliteOzetAy(BaseModel):
    ay: str  # YYYY-MM
    kabul: int
    ret: int
    kismen_kabul: int
    toplam: int


class KaliteOzetResponse(BaseModel):
    aylar: List[KaliteOzetAy]
    toplam_kabul: int
    toplam_ret: int
    toplam_kismen: int
    genel_kabul_orani: float


class DepoDolulukAlan(BaseModel):
    alan: str
    kapasite: float
    dolu: float
    bos: float
    doluluk_yuzde: float


class DepoDolulukBlok(BaseModel):
    blok: str
    alanlar: List[DepoDolulukAlan]
    toplam_kapasite: float
    toplam_dolu: float
    doluluk_yuzde: float


class DepoDolulukResponse(BaseModel):
    depolar: List[dict]
    genel_toplam_kapasite: float
    genel_toplam_dolu: float
    genel_doluluk_yuzde: float


# ==================== ENDPOINTS ====================

@router.get("/izlenebilirlik/lot/{lot_no}", response_model=IzlenebilirlikResponse)
async def lot_izlenebilirlik_kanonik(
    lot_no: str,
    db: Session = Depends(get_db),
    current_user: Kullanici = Depends(get_current_user)
):
    """
    Lot izlenebilirlik raporu (KANONIK)
    Tam tedarik zinciri: TEDARIKCI → HAMMADDE LOT → URETIM → MAMUL LOT → SATIS
    """
    # Find lot
    stok = db.query(StokKarti).filter(
        StokKarti.lot_no == lot_no,
        StokKarti.silme_tarihi.is_(None)
    ).first()
    
    if not stok:
        return {"error": "Lot bulunamadı"}
    
    urun = db.query(Urun).filter(Urun.id == stok.urun_id).first()
    
    # Get supplier info
    tedarikci = None
    if stok.tedarikci_id:
        ted = db.query(Tedarikci).filter(Tedarikci.id == stok.tedarikci_id).first()
        if ted:
            tedarikci = TedarikciBilgi(
                ad=ted.ad,
                yetkili_kisi=ted.yetkili_kisi,
                telefon=ted.telefon,
                adres=ted.adres
            )
    
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
            kaynak = KaynakLot(
                lot_no=kaynak_stok.lot_no,
                urun_ad=kaynak_urun.ad if kaynak_urun else None,
                tedarikci_ad=kaynak_ted.ad if kaynak_ted else None,
                uretim_tarihi=kaynak_stok.uretim_tarihi
            )
    
    # Get sales for finished goods
    satis_listesi = []
    if stok.stok_tipi == "MAMUL":
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
                    satis_listesi.append(SatisKaydiBilgi(
                        satis_no=satis.satis_no,
                        musteri_ad=musteri.ad if musteri else None,
                        tarih=satis.tarih,
                        miktar=abs(float(h.miktar))
                    ))
    
    # Get stock movements
    hareketler = db.query(StokHareket).filter(
        StokHareket.lot_no == lot_no
    ).order_by(StokHareket.olusturma_tarihi.desc()).all()
    
    hareket_listesi = [
        HareketBilgi(
            id=str(h.id),
            hareket_tipi=h.hareket_tipi,
            miktar=float(h.miktar),
            birim_fiyat=float(h.birim_fiyat) if h.birim_fiyat else None,
            tutar=float(h.tutar) if h.tutar else None,
            olusturma_tarihi=str(h.olusturma_tarihi),
            aciklama=h.aciklama
        )
        for h in hareketler
    ]
    
    return IzlenebilirlikResponse(
        lot=LotBilgi(
            id=str(stok.id),
            lot_no=stok.lot_no,
            urun_ad=urun.ad if urun else None,
            kategori=urun.kategori if urun else None,
            stok_tipi=stok.stok_tipi,
            miktar=float(stok.miktar),
            birim=stok.birim,
            birim_fiyat=float(stok.birim_fiyat),
            giris_tarihi=stok.giris_tarihi,
            uretim_tarihi=stok.uretim_tarihi,
            son_kullanma=stok.son_kullanma,
            konum=stok.konum,
            durum=stok.durum
        ),
        tedarikci=tedarikci,
        kaynak=kaynak,
        satis=satis_listesi if satis_listesi else None,
        hareketler=hareket_listesi
    )


@router.get("/stok/deger", response_model=StokDegerResponse)
async def stok_deger_raporu(
    db: Session = Depends(get_db),
    current_user: Kullanici = Depends(get_current_user)
):
    """
    Stok değeri raporu
    Hesaplama: sum(stok.miktar * stok.birim_fiyat) by urun, by kategori
    """
    # By product
    urun_results = db.query(
        Urun.id,
        Urun.ad,
        Urun.kategori,
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
        Urun.id, Urun.ad, Urun.kategori
    ).all()
    
    urun_list = [
        StokDegerUrun(
            urun_id=str(r.id),
            urun_ad=r.ad,
            kategori=r.kategori,
            toplam_miktar=float(r.toplam_miktar),
            toplam_deger=float(r.toplam_deger)
        )
        for r in urun_results
    ]
    
    # By category
    kategori_results = db.query(
        Urun.kategori,
        func.count(func.distinct(Urun.id)).label("urun_sayisi"),
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
    
    kategori_list = [
        StokDegerKategori(
            kategori=r.kategori,
            urun_sayisi=r.urun_sayisi,
            toplam_miktar=float(r.toplam_miktar),
            toplam_deger=float(r.toplam_deger)
        )
        for r in kategori_results
    ]
    
    genel_toplam = sum(float(r.toplam_deger) for r in urun_results)
    
    return StokDegerResponse(
        urunler=urun_list,
        kategoriler=kategori_list,
        genel_toplam=genel_toplam
    )


@router.get("/stok/yaslandirma", response_model=StokYaslandirmaResponse)
async def stok_yaslandirma_raporu(
    db: Session = Depends(get_db),
    current_user: Kullanici = Depends(get_current_user)
):
    """
    Stok yaşlandırma raporu
    Gruplama: SKT buckets - 0-30, 31-60, 61-90, 91+ days
    """
    today = datetime.utcnow()
    
    # Get all active stocks with SKT
    stoklar = db.query(StokKarti).filter(
        StokKarti.durum == "AKTIF",
        StokKarti.silme_tarihi.is_(None),
        StokKarti.son_kullanma.isnot(None)
    ).all()
    
    # Initialize buckets
    buckets = {
        "0-30": {"lot_sayisi": 0, "toplam_miktar": 0, "toplam_deger": 0},
        "31-60": {"lot_sayisi": 0, "toplam_miktar": 0, "toplam_deger": 0},
        "61-90": {"lot_sayisi": 0, "toplam_miktar": 0, "toplam_deger": 0},
        "91+": {"lot_sayisi": 0, "toplam_miktar": 0, "toplam_deger": 0}
    }
    
    for stok in stoklar:
        try:
            skt_date = datetime.strptime(stok.son_kullanma, "%Y-%m-%d")
            days_until_expiry = (skt_date - today).days
            
            if days_until_expiry <= 30:
                bucket = "0-30"
            elif days_until_expiry <= 60:
                bucket = "31-60"
            elif days_until_expiry <= 90:
                bucket = "61-90"
            else:
                bucket = "91+"
            
            buckets[bucket]["lot_sayisi"] += 1
            buckets[bucket]["toplam_miktar"] += float(stok.miktar)
            buckets[bucket]["toplam_deger"] += float(stok.miktar) * float(stok.birim_fiyat)
        except:
            # Invalid date format, skip
            continue
    
    bucket_list = [
        StokYaslandirmaBucket(
            bucket=name,
            lot_sayisi=data["lot_sayisi"],
            toplam_miktar=data["toplam_miktar"],
            toplam_deger=data["toplam_deger"]
        )
        for name, data in buckets.items()
    ]
    
    toplam_lot = sum(b["lot_sayisi"] for b in buckets.values())
    toplam_miktar = sum(b["toplam_miktar"] for b in buckets.values())
    toplam_deger = sum(b["toplam_deger"] for b in buckets.values())
    
    return StokYaslandirmaResponse(
        buckets=bucket_list,
        toplam_lot=toplam_lot,
        toplam_miktar=toplam_miktar,
        toplam_deger=toplam_deger
    )


@router.get("/fire-analiz", response_model=FireAnalizResponse)
async def fire_analiz_raporu(
    baslangic_tarih: Optional[str] = Query(None, description="YYYY-MM-DD"),
    bitis_tarih: Optional[str] = Query(None, description="YYYY-MM-DD"),
    urun_id: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: Kullanici = Depends(get_current_user)
):
    """
    Fire oranı analizi (üretim bazlı)
    Query: baslangic_tarih, bitis_tarih, urun_id
    """
    query = db.query(StokKarti).filter(
        StokKarti.stok_tipi == "MAMUL",
        StokKarti.silme_tarihi.is_(None)
    )
    
    if baslangic_tarih:
        query = query.filter(StokKarti.giris_tarihi >= baslangic_tarih)
    if bitis_tarih:
        query = query.filter(StokKarti.giris_tarihi <= bitis_tarih)
    if urun_id:
        query = query.filter(StokKarti.urun_id == urun_id)
    
    mamul_stoklar = query.all()
    
    kalemler = []
    toplam_giris = 0
    toplam_cikis = 0
    toplam_fire = 0
    
    for stok in mamul_stoklar:
        urun = db.query(Urun).filter(Urun.id == stok.urun_id).first()
        
        # Find source lot(s) for this production
        kaynak_miktar = 0
        if stok.kaynak_stok_id:
            kaynak_stok = db.query(StokKarti).filter(
                StokKarti.id == stok.kaynak_stok_id
            ).first()
            if kaynak_stok:
                kaynak_miktar = float(kaynak_stok.miktar)
        
        giris_miktar = float(stok.miktar) + kaynak_miktar * 0.1  # Estimate input
        cikis_miktar = float(stok.miktar)
        fire_miktar = giris_miktar - cikis_miktar
        fire_orani = (fire_miktar / giris_miktar * 100) if giris_miktar > 0 else 0
        
        toplam_giris += giris_miktar
        toplam_cikis += cikis_miktar
        toplam_fire += fire_miktar
        
        kalemler.append(FireAnalizKalem(
            urun_id=str(stok.urun_id),
            urun_ad=urun.ad if urun else None,
            uretim_tarihi=stok.uretim_tarihi or stok.giris_tarihi,
            giris_miktar=giris_miktar,
            cikis_miktar=cikis_miktar,
            fire_miktar=fire_miktar,
            fire_orani=round(fire_orani, 2)
        ))
    
    genel_fire_orani = (toplam_fire / toplam_giris * 100) if toplam_giris > 0 else 0
    
    return FireAnalizResponse(
        kalemler=kalemler,
        toplam_giris=toplam_giris,
        toplam_cikis=toplam_cikis,
        toplam_fire=toplam_fire,
        genel_fire_orani=round(genel_fire_orani, 2)
    )


@router.get("/kalite/ozet", response_model=KaliteOzetResponse)
async def kalite_ozet_raporu(
    baslangic_tarih: Optional[str] = Query(None, description="YYYY-MM-DD"),
    bitis_tarih: Optional[str] = Query(None, description="YYYY-MM-DD"),
    db: Session = Depends(get_db),
    current_user: Kullanici = Depends(get_current_user)
):
    """
    Kalite kontrol özeti
    Query: baslangic_tarih, bitis_tarih
    Returns: KABUL/RET/KISMEN_KABUL counts by month
    """
    query = db.query(KaliteKontrol)
    
    if baslangic_tarih:
        query = query.filter(KaliteKontrol.kontrol_tarihi >= baslangic_tarih)
    if bitis_tarih:
        query = query.filter(KaliteKontrol.kontrol_tarihi <= bitis_tarih)
    
    kontroller = query.all()
    
    # Group by month
    aylik_veri = {}
    for k in kontroller:
        if k.kontrol_tarihi:
            ay = k.kontrol_tarihi[:7]  # YYYY-MM
            if ay not in aylik_veri:
                aylik_veri[ay] = {"kabul": 0, "ret": 0, "kismen_kabul": 0}
            
            sonuc = (k.sonuc or "").upper()
            if "KABUL" in sonuc and "KISMEN" not in sonuc:
                aylik_veri[ay]["kabul"] += 1
            elif "RET" in sonuc:
                aylik_veri[ay]["ret"] += 1
            elif "KISMEN" in sonuc:
                aylik_veri[ay]["kismen_kabul"] += 1
    
    aylar = []
    toplam_kabul = 0
    toplam_ret = 0
    toplam_kismen = 0
    
    for ay, data in sorted(aylik_veri.items()):
        toplam = data["kabul"] + data["ret"] + data["kismen_kabul"]
        aylar.append(KaliteOzetAy(
            ay=ay,
            kabul=data["kabul"],
            ret=data["ret"],
            kismen_kabul=data["kismen_kabul"],
            toplam=toplam
        ))
        toplam_kabul += data["kabul"]
        toplam_ret += data["ret"]
        toplam_kismen += data["kismen_kabul"]
    
    genel_toplam = toplam_kabul + toplam_ret + toplam_kismen
    genel_kabul_orani = (toplam_kabul / genel_toplam * 100) if genel_toplam > 0 else 0
    
    return KaliteOzetResponse(
        aylar=aylar,
        toplam_kabul=toplam_kabul,
        toplam_ret=toplam_ret,
        toplam_kismen=toplam_kismen,
        genel_kabul_orani=round(genel_kabul_orani, 2)
    )


@router.get("/depo/doluluk", response_model=DepoDolulukResponse)
async def depo_doluluk_raporu(
    db: Session = Depends(get_db),
    current_user: Kullanici = Depends(get_current_user)
):
    """
    Depo doluluk raporu
    Returns: per-depo, per-blok doluluk
    """
    # Get all active stocks with location info
    stoklar = db.query(StokKarti).filter(
        StokKarti.durum == "AKTIF",
        StokKarti.silme_tarihi.is_(None)
    ).all()
    
    # Group by depo and blok
    depo_veri = {}
    for stok in stoklar:
        depo = stok.depo or "GENEL"
        blok = stok.blok or "ANA"
        
        if depo not in depo_veri:
            depo_veri[depo] = {
                "bloklar": {},
                "toplam_kapasite": 0,
                "toplam_dolu": 0
            }
        
        if blok not in depo_veri[depo]["bloklar"]:
            depo_veri[depo]["bloklar"][blok] = {
                "alanlar": {},
                "toplam_kapasite": 1000,  # Default capacity
                "toplam_dolu": 0
            }
        
        depo_veri[depo]["bloklar"][blok]["toplam_dolu"] += float(stok.miktar)
        depo_veri[depo]["toplam_dolu"] += float(stok.miktar)
    
    depolar = []
    genel_toplam_kapasite = 0
    genel_toplam_dolu = 0
    
    for depo_ad, depo_data in sorted(depo_veri.items()):
        bloklar_list = []
        for blok_ad, blok_data in sorted(depo_data["bloklar"].items()):
            doluluk_yuzde = (blok_data["toplam_dolu"] / blok_data["toplam_kapasite"] * 100) if blok_data["toplam_kapasite"] > 0 else 0
            bloklar_list.append(DepoDolulukBlok(
                blok=blok_ad,
                alanlar=[],
                toplam_kapasite=blok_data["toplam_kapasite"],
                toplam_dolu=blok_data["toplam_dolu"],
                doluluk_yuzde=round(doluluk_yuzde, 2)
            ))
        
        genel_toplam_kapasite += depo_data["toplam_kapasite"]
        genel_toplam_dolu += depo_data["toplam_dolu"]
        
        depo_doluluk_yuzde = (depo_data["toplam_dolu"] / depo_data["toplam_kapasite"] * 100) if depo_data["toplam_kapasite"] > 0 else 0
        
        depolar.append({
            "depo": depo_ad,
            "bloklar": [
                {
                    "blok": b.blok,
                    "toplam_kapasite": b.toplam_kapasite,
                    "toplam_dolu": b.toplam_dolu,
                    "doluluk_yuzde": b.doluluk_yuzde
                }
                for b in bloklar_list
            ],
            "toplam_kapasite": depo_data["toplam_kapasite"],
            "toplam_dolu": depo_data["toplam_dolu"],
            "doluluk_yuzde": round(depo_doluluk_yuzde, 2)
        })
    
    genel_doluluk_yuzde = (genel_toplam_dolu / genel_toplam_kapasite * 100) if genel_toplam_kapasite > 0 else 0
    
    return DepoDolulukResponse(
        depolar=depolar,
        genel_toplam_kapasite=genel_toplam_kapasite,
        genel_toplam_dolu=genel_toplam_dolu,
        genel_doluluk_yuzde=round(genel_doluluk_yuzde, 2)
    )


# ==================== RAPOR TANIMI CRUD ====================

class RaporTanimiCreate(BaseModel):
    rapor_adi: str
    rapor_turu: str
    sorgu_template: str
    parametreler: Optional[List[dict]] = []
    grafik_turu: Optional[str] = None
    aktif: bool = True
    rol_bazli_erisim: Optional[List[str]] = []


class RaporTanimiUpdate(BaseModel):
    rapor_adi: Optional[str] = None
    rapor_turu: Optional[str] = None
    sorgu_template: Optional[str] = None
    parametreler: Optional[List[dict]] = None
    grafik_turu: Optional[str] = None
    aktif: Optional[bool] = None
    rol_bazli_erisim: Optional[List[str]] = None


class RaporTanimiResponse(BaseModel):
    id: str
    rapor_adi: str
    rapor_turu: str
    sorgu_template: str
    parametreler: List[dict]
    grafik_turu: Optional[str]
    aktif: bool
    rol_bazli_erisim: List[str]
    olusturma_tarihi: str
    guncelleme_tarihi: str
    olusturan_kullanici_id: str

    class Config:
        from_attributes = True


@router.get("/tanimlar", response_model=List[RaporTanimiResponse])
async def list_rapor_tanimlari(
    kategori: Optional[str] = Query(None),
    rapor_turu: Optional[str] = Query(None),
    aktif: Optional[bool] = Query(None),
    db: Session = Depends(get_db),
    current_user: Kullanici = Depends(get_current_user),
):
    """List all report definitions."""
    query = db.query(RaporTanimi)
    if kategori:
        query = query.filter(RaporTanimi.rapor_turu == kategori)
    if rapor_turu:
        query = query.filter(RaporTanimi.rapor_turu == rapor_turu)
    if aktif is not None:
        query = query.filter(RaporTanimi.aktif == aktif)
    tanimlar = query.order_by(RaporTanimi.rapor_adi).all()
    return [
        RaporTanimiResponse(
            id=str(t.id),
            rapor_adi=t.rapor_adi,
            rapor_turu=t.rapor_turu,
            sorgu_template=t.sorgu_template,
            parametreler=t.parametreler or [],
            grafik_turu=t.grafik_turu,
            aktif=t.aktif,
            rol_bazli_erisim=t.rol_bazli_erisim or [],
            olusturma_tarihi=t.olusturma_tarihi,
            guncelleme_tarihi=t.guncelleme_tarihi,
            olusturan_kullanici_id=str(t.olusturan_kullanici_id),
        )
        for t in tanimlar
    ]


@router.post("/tanimlar", response_model=RaporTanimiResponse)
async def create_rapor_tanimi(
    data: RaporTanimiCreate,
    db: Session = Depends(get_db),
    current_user: Kullanici = Depends(get_current_user),
):
    """Create a new report definition."""
    now = datetime.now().isoformat()
    tanim = RaporTanimi(
        rapor_adi=data.rapor_adi,
        rapor_turu=data.rapor_turu,
        sorgu_template=data.sorgu_template,
        parametreler=data.parametreler,
        grafik_turu=data.grafik_turu,
        aktif=data.aktif,
        rol_bazli_erisim=data.rol_bazli_erisim,
        olusturma_tarihi=now,
        guncelleme_tarihi=now,
        olusturan_kullanici_id=current_user.id,
    )
    db.add(tanim)
    db.commit()
    db.refresh(tanim)
    return RaporTanimiResponse(
        id=str(tanim.id),
        rapor_adi=tanim.rapor_adi,
        rapor_turu=tanim.rapor_turu,
        sorgu_template=tanim.sorgu_template,
        parametreler=tanim.parametreler or [],
        grafik_turu=tanim.grafik_turu,
        aktif=tanim.aktif,
        rol_bazli_erisim=tanim.rol_bazli_erisim or [],
        olusturma_tarihi=tanim.olusturma_tarihi,
        guncelleme_tarihi=tanim.guncelleme_tarihi,
        olusturan_kullanici_id=str(tanim.olusturan_kullanici_id),
    )


@router.put("/tanimlar/{tanim_id}", response_model=RaporTanimiResponse)
async def update_rapor_tanimi(
    tanim_id: str,
    data: RaporTanimiUpdate,
    db: Session = Depends(get_db),
    current_user: Kullanici = Depends(get_current_user),
):
    """Update a report definition."""
    tanim = db.query(RaporTanimi).filter(RaporTanimi.id == tanim_id).first()
    if not tanim:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Rapor tanımı bulunamadı")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(tanim, field, value)
    tanim.guncelleme_tarihi = datetime.now().isoformat()
    db.commit()
    db.refresh(tanim)
    return RaporTanimiResponse(
        id=str(tanim.id),
        rapor_adi=tanim.rapor_adi,
        rapor_turu=tanim.rapor_turu,
        sorgu_template=tanim.sorgu_template,
        parametreler=tanim.parametreler or [],
        grafik_turu=tanim.grafik_turu,
        aktif=tanim.aktif,
        rol_bazli_erisim=tanim.rol_bazli_erisim or [],
        olusturma_tarihi=tanim.olusturma_tarihi,
        guncelleme_tarihi=tanim.guncelleme_tarihi,
        olusturan_kullanici_id=str(tanim.olusturan_kullanici_id),
    )


@router.delete("/tanimlar/{tanim_id}")
async def delete_rapor_tanimi(
    tanim_id: str,
    db: Session = Depends(get_db),
    current_user: Kullanici = Depends(get_current_user),
):
    """Delete a report definition."""
    tanim = db.query(RaporTanimi).filter(RaporTanimi.id == tanim_id).first()
    if not tanim:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Rapor tanımı bulunamadı")
    db.delete(tanim)
    db.commit()
    return {"message": "Rapor tanımı silindi"}


@router.post("/tanimlar/{tanim_id}/kopyala", response_model=RaporTanimiResponse)
async def kopyala_rapor_tanimi(
    tanim_id: str,
    yeni_ad: str,
    db: Session = Depends(get_db),
    current_user: Kullanici = Depends(get_current_user),
):
    """Copy a report definition with a new name."""
    original = db.query(RaporTanimi).filter(RaporTanimi.id == tanim_id).first()
    if not original:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Rapor tanımı bulunamadı")
    now = datetime.now().isoformat()
    yeni = RaporTanimi(
        rapor_adi=yeni_ad,
        rapor_turu=original.rapor_turu,
        sorgu_template=original.sorgu_template,
        parametreler=original.parametreler,
        grafik_turu=original.grafik_turu,
        aktif=original.aktif,
        rol_bazli_erisim=original.rol_bazli_erisim,
        olusturma_tarihi=now,
        guncelleme_tarihi=now,
        olusturan_kullanici_id=current_user.id,
    )
    db.add(yeni)
    db.commit()
    db.refresh(yeni)
    return RaporTanimiResponse(
        id=str(yeni.id),
        rapor_adi=yeni.rapor_adi,
        rapor_turu=yeni.rapor_turu,
        sorgu_template=yeni.sorgu_template,
        parametreler=yeni.parametreler or [],
        grafik_turu=yeni.grafik_turu,
        aktif=yeni.aktif,
        rol_bazli_erisim=yeni.rol_bazli_erisim or [],
        olusturma_tarihi=yeni.olusturma_tarihi,
        guncelleme_tarihi=yeni.guncelleme_tarihi,
        olusturan_kullanici_id=str(yeni.olusturan_kullanici_id),
    )


# ==================== RAPOR ÇALIŞTIRMA & SONUÇ ====================

class RaporCalistirRequest(BaseModel):
    tanim_id: str
    parametreler: Optional[dict] = {}


class RaporSonucResponse(BaseModel):
    sonuc_id: str
    tanim_id: str
    durum: str
    baslangic_zamani: str
    bitis_zamani: Optional[str] = None
    toplam_satir: Optional[int] = None
    dosya_url: Optional[str] = None
    data: Optional[List[dict]] = None


@router.post("/calistir", response_model=RaporSonucResponse)
async def calistir_rapor(
    data: RaporCalistirRequest,
    db: Session = Depends(get_db),
    current_user: Kullanici = Depends(get_current_user),
):
    """Execute a report definition (simulated — no actual SQL execution)."""
    tanim = db.query(RaporTanimi).filter(RaporTanimi.id == data.tanim_id).first()
    if not tanim:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Rapor tanımı bulunamadı")

    now = datetime.now().isoformat()
    cektirme = RaporCektirme(
        rapor_id=tanim.id,
        parametre_degerleri=data.parametreler or {},
        cikti_format="HTML",
        calisma_zamani=now,
        durum="TAMAMLANDI",
        satir_sayisi=0,
        olusturma_tarihi=now,
        olusturan_kullanici_id=current_user.id,
    )
    db.add(cektirme)
    db.commit()
    db.refresh(cektirme)

    return RaporSonucResponse(
        sonuc_id=str(cektirme.id),
        tanim_id=str(tanim.id),
        durum="hazir",
        baslangic_zamani=cektirme.calisma_zamani,
        bitis_zamani=now,
        toplam_satir=cektirme.satir_sayisi,
        data=[],
    )


@router.get("/sonuc/{sonuc_id}", response_model=RaporSonucResponse)
async def get_rapor_sonuc(
    sonuc_id: str,
    db: Session = Depends(get_db),
    current_user: Kullanici = Depends(get_current_user),
):
    """Get report execution result."""
    cektirme = db.query(RaporCektirme).filter(RaporCektirme.id == sonuc_id).first()
    if not cektirme:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Rapor sonucu bulunamadı")
    durum_map = {"TAMAMLANDI": "hazir", "CALISIYOR": "hazirlaniyor", "HATA": "hata", "BEKLEMEDE": "hazirlaniyor"}
    return RaporSonucResponse(
        sonuc_id=str(cektirme.id),
        tanim_id=str(cektirme.rapor_id),
        durum=durum_map.get(cektirme.durum, "hazir"),
        baslangic_zamani=cektirme.calisma_zamani or "",
        bitis_zamani=cektirme.calisma_zamani,
        toplam_satir=cektirme.satir_sayisi,
        dosya_url=cektirme.cikti_url,
        data=None,
    )


# ==================== RAPOR ÇEKTİRME GEÇMİŞİ ====================

class RaporCektirmeResponse(BaseModel):
    id: str
    rapor_id: str
    rapor_adi: str
    cektirme_zamani: str
    cektiren_kullanici: str
    parametreler: dict
    durum: str
    cikti_format: Optional[str] = None
    cikti_url: Optional[str] = None

    class Config:
        from_attributes = True


@router.get("/cektirmeler", response_model=List[RaporCektirmeResponse])
async def list_rapor_cektirmeler(
    sayfa: int = Query(1, ge=1),
    sayfa_boyutu: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: Kullanici = Depends(get_current_user),
):
    """List report execution history."""
    offset = (sayfa - 1) * sayfa_boyutu
    cektirmeler = (
        db.query(RaporCektirme)
        .order_by(RaporCektirme.olusturma_tarihi.desc())
        .offset(offset)
        .limit(sayfa_boyutu)
        .all()
    )
    results = []
    for c in cektirmeler:
        tanim = db.query(RaporTanimi).filter(RaporTanimi.id == c.rapor_id).first()
        kullanici = db.query(Kullanici).filter(Kullanici.id == c.olusturan_kullanici_id).first()
        results.append(RaporCektirmeResponse(
            id=str(c.id),
            rapor_id=str(c.rapor_id),
            rapor_adi=tanim.rapor_adi if tanim else "Bilinmeyen",
            cektirme_zamani=c.olusturma_tarihi,
            cektiren_kullanici=kullanici.ad + " " + kullanici.soyad if kullanici else "Bilinmeyen",
            parametreler=c.parametre_degerleri or {},
            durum="basarili" if c.durum == "TAMAMLANDI" else "basarisiz",
            cikti_format=c.cikti_format,
            cikti_url=c.cikti_url,
        ))
    return results


# ==================== RAPORLAMA ZAMANLAMA ====================

class RaporScheduleCreate(BaseModel):
    rapor_id: str
    schedule_tipi: str
    schedule_time: str
    schedule_hafta_gun: Optional[str] = None
    schedule_ay_gun: Optional[int] = None
    aktif: bool = True
    alicilar: Optional[List[dict]] = []


class RaporScheduleUpdate(BaseModel):
    schedule_tipi: Optional[str] = None
    schedule_time: Optional[str] = None
    schedule_hafta_gun: Optional[str] = None
    schedule_ay_gun: Optional[int] = None
    aktif: Optional[bool] = None
    alicilar: Optional[List[dict]] = None


class RaporScheduleResponse(BaseModel):
    id: str
    rapor_id: str
    rapor_adi: str
    schedule_tipi: str
    schedule_time: str
    schedule_hafta_gun: Optional[str]
    schedule_ay_gun: Optional[int]
    aktif: bool
    son_calisma: Optional[str]
    son_sonuc: Optional[str]
    alicilar: List[dict]

    class Config:
        from_attributes = True


@router.get("/schedule", response_model=List[RaporScheduleResponse])
async def list_rapor_schedule(
    db: Session = Depends(get_db),
    current_user: Kullanici = Depends(get_current_user),
):
    """List all report schedules."""
    schedules = db.query(RaporSchedule).all()
    results = []
    for s in schedules:
        tanim = db.query(RaporTanimi).filter(RaporTanimi.id == s.rapor_id).first()
        results.append(RaporScheduleResponse(
            id=str(s.id),
            rapor_id=str(s.rapor_id),
            rapor_adi=tanim.rapor_adi if tanim else "Bilinmeyen",
            schedule_tipi=s.schedule_tipi,
            schedule_time=s.schedule_time,
            schedule_hafta_gun=s.schedule_hafta_gun,
            schedule_ay_gun=s.schedule_ay_gun,
            aktif=s.aktif,
            son_calisma=s.son_calisma,
            son_sonuc=s.son_sonuc,
            alicilar=s.alicilar or [],
        ))
    return results


@router.post("/schedule", response_model=RaporScheduleResponse)
async def create_rapor_schedule(
    data: RaporScheduleCreate,
    db: Session = Depends(get_db),
    current_user: Kullanici = Depends(get_current_user),
):
    """Create a report schedule."""
    now = datetime.now().isoformat()
    schedule = RaporSchedule(
        rapor_id=data.rapor_id,
        schedule_tipi=data.schedule_tipi,
        schedule_time=data.schedule_time,
        schedule_hafta_gun=data.schedule_hafta_gun,
        schedule_ay_gun=data.schedule_ay_gun,
        aktif=data.aktif,
        alicilar=data.alicilar,
        olusturma_tarihi=now,
        guncelleme_tarihi=now,
        olusturan_kullanici_id=current_user.id,
    )
    db.add(schedule)
    db.commit()
    db.refresh(schedule)
    tanim = db.query(RaporTanimi).filter(RaporTanimi.id == schedule.rapor_id).first()
    return RaporScheduleResponse(
        id=str(schedule.id),
        rapor_id=str(schedule.rapor_id),
        rapor_adi=tanim.rapor_adi if tanim else "Bilinmeyen",
        schedule_tipi=schedule.schedule_tipi,
        schedule_time=schedule.schedule_time,
        schedule_hafta_gun=schedule.schedule_hafta_gun,
        schedule_ay_gun=schedule.schedule_ay_gun,
        aktif=schedule.aktif,
        son_calisma=schedule.son_calisma,
        son_sonuc=schedule.son_sonuc,
        alicilar=schedule.alicilar or [],
    )


@router.put("/schedule/{schedule_id}", response_model=RaporScheduleResponse)
async def update_rapor_schedule(
    schedule_id: str,
    data: RaporScheduleUpdate,
    db: Session = Depends(get_db),
    current_user: Kullanici = Depends(get_current_user),
):
    """Update a report schedule."""
    schedule = db.query(RaporSchedule).filter(RaporSchedule.id == schedule_id).first()
    if not schedule:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Zamanlama bulunamadı")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(schedule, field, value)
    schedule.guncelleme_tarihi = datetime.now().isoformat()
    db.commit()
    db.refresh(schedule)
    tanim = db.query(RaporTanimi).filter(RaporTanimi.id == schedule.rapor_id).first()
    return RaporScheduleResponse(
        id=str(schedule.id),
        rapor_id=str(schedule.rapor_id),
        rapor_adi=tanim.rapor_adi if tanim else "Bilinmeyen",
        schedule_tipi=schedule.schedule_tipi,
        schedule_time=schedule.schedule_time,
        schedule_hafta_gun=schedule.schedule_hafta_gun,
        schedule_ay_gun=schedule.schedule_ay_gun,
        aktif=schedule.aktif,
        son_calisma=schedule.son_calisma,
        son_sonuc=schedule.son_sonuc,
        alicilar=schedule.alicilar or [],
    )


@router.delete("/schedule/{schedule_id}")
async def delete_rapor_schedule(
    schedule_id: str,
    db: Session = Depends(get_db),
    current_user: Kullanici = Depends(get_current_user),
):
    """Delete a report schedule."""
    schedule = db.query(RaporSchedule).filter(RaporSchedule.id == schedule_id).first()
    if not schedule:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Zamanlama bulunamadı")
    db.delete(schedule)
    db.commit()
    return {"message": "Zamanlama silindi"}


@router.patch("/schedule/{schedule_id}/toggle", response_model=RaporScheduleResponse)
async def toggle_rapor_schedule(
    schedule_id: str,
    aktif: bool,
    db: Session = Depends(get_db),
    current_user: Kullanici = Depends(get_current_user),
):
    """Toggle schedule active/inactive."""
    schedule = db.query(RaporSchedule).filter(RaporSchedule.id == schedule_id).first()
    if not schedule:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Zamanlama bulunamadı")
    schedule.aktif = aktif
    schedule.guncelleme_tarihi = datetime.now().isoformat()
    db.commit()
    db.refresh(schedule)
    tanim = db.query(RaporTanimi).filter(RaporTanimi.id == schedule.rapor_id).first()
    return RaporScheduleResponse(
        id=str(schedule.id),
        rapor_id=str(schedule.rapor_id),
        rapor_adi=tanim.rapor_adi if tanim else "Bilinmeyen",
        schedule_tipi=schedule.schedule_tipi,
        schedule_time=schedule.schedule_time,
        schedule_hafta_gun=schedule.schedule_hafta_gun,
        schedule_ay_gun=schedule.schedule_ay_gun,
        aktif=schedule.aktif,
        son_calisma=schedule.son_calisma,
        son_sonuc=schedule.son_sonuc,
        alicilar=schedule.alicilar or [],
    )
