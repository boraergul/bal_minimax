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
from app.models.ozellik import OzellikTanimi
from app.models.rapor import RaporTanimi, RaporCektirme, RaporSchedule
from app.models.izlenebilirlik import GidaIzlenebilirlikLog

# New model imports (002_add_missing_tables migration)
from app.models.urun_donusum import UrunDonusum
from app.models.uretim_lot import UretimLot
from app.models.gida_izlenebilirlik_log import GidaIzlenebilirlikLog as GidaIzlenebilirlikLogNew
from app.models.ozellik_tanimlari import OzellikTanim
from app.models.rapor_tanimlari import RaporTanim
from app.models.rapor_cektirme import RaporCektirme as RaporCektirmeNew
from app.models.rapor_schedule import RaporSchedule as RaporScheduleNew

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
    # Existing models
    "OzellikTanimi",
    "RaporTanimi",
    "RaporCektirme",
    "RaporSchedule",
    "GidaIzlenebilirlikLog",
    # New models from 002_add_missing_tables
    "UrunDonusum",
    "UretimLot",
    "GidaIzlenebilirlikLogNew",
    "OzellikTanim",
    "RaporTanim",
    "RaporCektirmeNew",
    "RaporScheduleNew",
]
