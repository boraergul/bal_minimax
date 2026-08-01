# Models package
from app.models.user import Kullanici, Rol
from app.models.urun import Urun, UrunOzellik
from app.models.tedarikci import Tedarikci, TedarikciUrun, TedarikciDegerlendirme, TedarikciFiyatGecmisi
from app.models.musteri import Musteri
from app.models.stok import StokKarti, StokHareket, LotOzellik, LotFotograf
from app.models.uretim import UretimEmri, UretimDetay
from app.models.satis import SatisKaydi, SatisKalemi
from app.models.kalite_kontrol import KaliteKontrol, KaliteNumune
from app.models.skt import SktIslem
from app.models.stok_duzeltme import StokDuzeltmeTalep
from app.models.birim import Birim, BirimDonusum
from app.models.iade import SatisIade, IadeNumune
from app.models.toplu_islem import TopluIslem, TopluIslemSatir
from app.models.maliyet import UretimIscilik, UretimEnerji, UretimBakim, UretimGenelGider
from app.models.depo import Depo, DepoBlok, DepoKonum, DepoTransfer, DepoTransferDetay, NakliyeTakip
from app.models.bildirim import Bildirim, BildirimSablon, BildirimGonderim, BildirimKullaniciTercih
from app.models.etiket import EtiketSablon, EtiketAlan

__all__ = [
    # Existing
    "Kullanici",
    "Rol",
    "Urun",
    "UrunOzellik",
    "Tedarikci",
    "TedarikciUrun",
    "TedarikciDegerlendirme",
    "TedarikciFiyatGecmisi",
    "Musteri",
    "StokKarti",
    "StokHareket",
    "LotOzellik",
    "LotFotograf",
    "UretimEmri",
    "UretimDetay",
    "SatisKaydi",
    "SatisKalemi",
    # New
    "KaliteKontrol",
    "KaliteNumune",
    "SktIslem",
    "StokDuzeltmeTalep",
    "Birim",
    "BirimDonusum",
    "SatisIade",
    "IadeNumune",
    "TopluIslem",
    "TopluIslemSatir",
    "UretimIscilik",
    "UretimEnerji",
    "UretimBakim",
    "UretimGenelGider",
    "Depo",
    "DepoBlok",
    "DepoKonum",
    "DepoTransfer",
    "DepoTransferDetay",
    "NakliyeTakip",
    "Bildirim",
    "BildirimSablon",
    "BildirimGonderim",
    "BildirimKullaniciTercih",
    "EtiketSablon",
    "EtiketAlan",
]
