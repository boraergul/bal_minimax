# ÜRETİM ORTAMI HAZIRLIĞI GAP ANALİZ RAPORU
## Kurutulmuş Meyve ve Bal Yönetim Sistemi (ERP)

**Versiyon:** 1.0  
**Tarih:** 2026-07-29  
**Hazırlayan:** Hermes Agent  
**Durum:** TASLAK — Üretim Öncesi Kritik İnceleme Gerekli

---

## YÖNETİCİ ÖZETİ

Üç temel doküman incelenmiştir: (1) SRS, (2) Veritabanı Tasarım Dokümanı, (3) Sistem Mimarisi Dokümanı. Dokümanlar güçlü bir konseptsel temel sunmakta birlikte, **üretim ortamına geçiş için düzeltilmesi gereken kritik boşluklar** tespit edilmiştir.

**Genel Değerlendirme:**

| Kategori | Olgunluk | Risk Seviyesi |
|----------|----------|---------------|
| Fonksiyonel Tamamlık | ⭐⭐⭐ (Orta-Yüksek) | ⚠️ Orta |
| Performans & Ölçeklenebilirlik | ⭐⭐ (Düşük-Orta) | 🔴 Yüksek |
| Güvenlik | ⭐⭐ (Düşük-Orta) | 🔴 Yüksek |
| Operasyon & Bakım | ⭐⭐ (Düşük-Orta) | 🔴 Yüksek |
| Uyumluluk & Hukuk | ⭐ (Düşük) | 🔴 Yüksek |
| SDLC & DevOps | ⭐⭐ (Orta) | ⚠️ Orta |

---

## 1. FONKSİYONEL EKSİKLİKLER VE BOŞLUKLAR

### 1.1 Kritik Eksiklikler (Derhal Giderilmeli)

#### 1.1.1 Satış Sürecinde FIFO Entegrasyonu Belirsizliği
- **Durum:** SRS'de satış FIFO ile lot seçimi tanımlanmış olsa da, DB tasarımında `satis_kalemleri` tablosunda satış anında hangi lotun seçildiği bilgisi mevcuttur. Ancak **sistem, otomatik FIFO lot seçimi yapmadan önce kullanıcıya lot seçimi yaptırabilir** — bu, FIFO ihlaline yol açar.
- **Boşluk:** `/api/v1/stok/fifo-tavsiye/{urun_id}` endpoint'i var ama satış kaydı oluşturulurken bu zorunlu değil.
- **Risk:** FIFO ihlali: izlenebilirlik zinciri bozulur, mevzuat ihlali (gıda güvenliği).
- **Öneri:** Satış API'si, FIFO önerisini **zorunlu olarak** kullanmalı veya manuel seçim ayrı bir onay akışı gerektirmeli.

#### 1.1.2 Kalite Kontrol Süreci Tanımsız
- **Durum:** `stok_karti` tablosunda `kalite_kontrol_edildi` ve `kalite_notu` alanları var. SRS'de kalite kontrol adımları tanımlı. Ancak:
  - Kalite kontrol **süreci tanımlanmamış** (nasıl bir UI akışı var?)
  - Kalite kontrol **reddetme kriterleri** belirsiz
  - Kalite kontrol **onay/reddetme API endpoint'i** yok
  - "RET" durumu (`stok_karti.durum`) nasıl tetikleniyor?
- **Boşluk:** Kalite kontrol bir **onay iş akışı (workflow)** değil, sadece metadata.
- **Öneri:** Kalite kontrol için ayrı bir API endpoint ve onay/reddetme akışı tasarlanmalı.

#### 1.1.3 Üretim Maliyet Hesaplama Eksikliği
- **Durum:** `uretim_emri` tablosunda `toplam_maliyet` alanı var. Ama bu alan **nasıl doldurulacak**? Sistem tasarımında maliyet hesaplama formülü, fire maliyeti dahil, yok.
- **Boşluk:** Hammadde maliyeti + işçilik + enerji + fire = üretim maliyeti formülü yok.
- **Öneri:** Maliyet muhasebesi modülü veya en azından basit birim maliyet hesaplama formülü dokümante edilmeli.

#### 1.1.4 Stok Düzeltme Onay Süreci Yetersiz
- **Durum:** SRS'de kritik düzeltmeler (+/- %10 üzeri) için yönetici onayı var. DB'de `DUZELTME` hareket tipi var. Ancak:
  - Hangi kullanıcı onaylayacak? (rol bazlı değil, spesifik kullanıcı bazlı mı?)
  - Onay/reddetme API endpoint'i yok
  - Onay zinciri (approval chain) tanımlanmamış
- **Öneri:** Stok düzeltme için bir onay iş akışı (workflow) tasarlanmalı.

### 1.2 Orta Düzey Eksiklikler

#### 1.2.1 Toplu İşlem (Batch) Altyapısı Eksikliği
- **Durum:** SRS'de toplu stok girişi, toplu etiket basma gibi özellikler tanımlı. Ancak:
  - Toplu işlemler için API endpoint'leri yok
  - Excel/CSV import/export mekanizması belirsiz
  - `toplu_islemler` veya `import_log` tablosu yok
- **Boşluk:** Büyük miktarda veri girişi yapılacakse nasıl yapılacak?

#### 1.2.2 Bildirim Sistemi Detaysız
- **Durum:** Bildirim türleri ve kanalları tanımlı. Ancak:
  - E-posta/SMS hangi SMTP/SMS gateway ile entegre olacak? (Sadece "SMTP / SendGrid" yazıyor)
  - Bildirim template'leri sistemde nasıl yönetilecek?
  - Kullanıcı başına bildirim tercihleri nasıl saklanacak? (`kullanicilar.bildirim_tercihleri` JSONB alanı var ama kullanımı dokümante değil)
  - Webhook yapılandırması yok

#### 1.2.3 Ürün Özellik Sistemi Tamamlanmamış
- **Durum:** `urun_ozellikleri` ve `lot_ozellikleri` tabloları var. Ancak:
  - Özellik tanımları için CRUD API endpoint'leri eksik
  - Etiket alanları ile özellikler arasında köprü var ama etiket alanı tanımı ile özellik sistemi **entegrasyonu** belirsiz
  - Kategori bazlı varsayılan özellikler nasıl oluşturulacak?

#### 1.2.4 Depo Yönetimi Yetersiz
- **Durum:** `stok_karti` tablosunda `depo`, `raf`, `blok`, `palet_no` alanları var. Ancak:
  - Depo/konum yönetimi için ayrı bir modül yok
  - Depo kapasitesi, doluluk oranı takibi yok
  - Depolar arası transfer (SRS'de "transfer" var ama detay yok) tam olarak nasıl çalışacak?
  - Konum validasyonu yok (olmayan rafa koyma engeli)

#### 1.2.5 Son Kullanma Yönetimi Yüzeysel
- **Durum:** `son_kullanma` tarihi ve son kullanma uyarısı var. Ancak:
  - Son kullanma tarihi **geçmiş lotların otomatik işlemi** yok (imha, indirimli satış, vb.)
  - "Son kullanma yaklaşan" uyarısı için eşik **sistem ayarı** olarak tanımlı ama dinamik değil (ürün bazlı değil)
  - FEFO (First Expired First Out) ile FIFO arasındaki öncelik belirsiz

### 1.3 Küçük Eksiklikler

| Eksiklik | Açıklama | Öncelik |
|----------|----------|----------|
| Barkod tarama desteği | Mobil uygulama yok, el terminali yok. Sadece manuel giriş. | Düşük |
| Çoklu dil desteği | SRS'de sadece Türkçe. Gelecekte İngilizce olabilir mi? | Düşük |
| Birim dönüşüm tutarlılığı | Toptan/perakende birim dönüşüm oranları tanımlı değil. | Orta |
| Şablon kopyalama | Etiket şablonları arasında kopyalama özelliği yok. | Düşük |

---

## 2. PERFORMANS, ÖLÇEKLENEBİLİRLİK VE KULLANILABİLİRLİK BOŞLUKLARI

### 2.1 Kritik Performans Boşlukları

#### 2.1.1 Veritabanı Partitioning Stratejisi Belirsiz
- **Durum:** `stok_hareketleri` tablosu için aylık partitioning önerilmiş (Sistem Mimarisi Bölüm 11.3). Ancak:
  - PostgreSQL partition'ları **uygulanmamış** (sadece öneri)
  - Hangi tablolar partition edilecek? (`stok_hareketleri`, `audit_log`, `satis_kaydi`?)
  - Partition yönetimi (yeni ay ekleme, eski arşivleme) dokümante değil
  - Partition prune için uygulama sorguları optimize edilmeli
- **Risk:** 1 yıl içinde `stok_hareketleri` milyonlarca satıra ulaşacak. Sorgu performansı düşecek.
- **Öneri:** Partitioning strategisi uygulanmalı ve SQL sorguları partition-aware olmalı.

#### 2.1.2 Bağlantı Havuzu Boyutlandırması Belirsiz
- **Durum:** PgBouncer kullanılacağı belirtilmiş. Ancak:
  - **Pool size** (default, max, min) belirtilmemiş
  - **Pool mode** (transaction, session) seçilmemiş
  - Uygulama başına kaç bağlantı gerekeceği hesaplanmamış
  - Kubernetes'de çalışan 3+ API pod + worker'ların her biri için bağlantı ihtiyacı hesaplanmamış
- **Risk:** Bağlantı sınırına ulaşma, "too many connections" hataları.

#### 2.1.3 Önbellek (Cache) Stratejisi Belirsiz
- **Durum:** Redis kullanılacağı belirtilmiş. Ancak:
  - **Cache key yapısı** tanımlanmamış
  - **TTL (Time To Live)** değerleri yok
  - **Cache invalidation** stratejisi yok
  - Hangi veriler cache'lenecek? (Ürün listesi? Stok bilgisi? Her ikisi de? Hiçbiri mi?)
  - Sık değişen veri (stok miktarları) cache'lenirse FIFO bozulabilir
- **Risk:** Stale data, FIFO ihlalleri, gereksiz memory kullanımı.

#### 2.1.4 Büyük Rapor Sorguları İçin Timeout ve Sayfa Stratejisi Yok
- **Durum:** Raporlar için "1 yıllık veri ile < 5 saniye" hedefi var. Ancak:
  - **Sayfa başına kayıt limiti** (pagination) belirtilmemiş
  - **Query timeout** ayarı yok
  - **Async rapor oluşturma** (arka planda) seçeneği yok
  - Büyük raporlar için **progres gösterimi** yok
- **Risk:** Rapor talepleri veritabanını kitler.

### 2.2 Ölçeklenebilirlik Boşlukları

#### 2.2.1 Kubernetes Deployment Detaysız
- **Durum:** Kubernetes manifest'leri (api-deployment.yaml) verilmiş. Ancak:
  - **Namespace** yapısı belirsiz (prod, staging aynı cluster'da mı?)
  - **Ingress** yapılandırması yok
  - **Service** tanımları eksik
  - **ConfigMap** ve **Secret** manifest'leri yok
  - **HPA** (Horizontal Pod Autoscaler) sadece API için tanımlı, worker için yok
  - **PodDisruptionBudget** yok
  - **ResourceQuota** ve **LimitRange** yok
  - **StorageClass** tanımlanmamış (MinIO PVC için)
- **Öneri:** Eksik Kubernetes manifest'leri tamamlanmalı.

#### 2.2.2 MinIO / S3 Yapılandırması Eksik
- **Durum:** MinIO kullanılacağı belirtilmiş. Ancak:
  - **Bucket yapısı** (ayrı bucket mı, prefix mi?) belirsiz
  - **Lifecycle policy** (eski dosyalar nasıl silinecek?) yok
  - **CORS** ayarları yok
  - **Multipart upload** threshold'u belirsiz (büyük dosyalar için)
  - **Backup**'tan MinIO nasıl çıkacak? (cross-region replication?)

#### 2.2.3 Read Replica Yönlendirmesi Belirsiz
- **Durum:** "Raporlama → replica" yazıyor. Ancak:
  - **Hangi sorgular** replica'ya gidecek?
  - **Uygulama katmanında** replica yönlendirmesi nasıl yapılacak? (SQLAlchemy multi-engine? Router middleware?)
  - **Write-after-read** sorunu nasıl çözülecek? (Önce replica'ya yaz, sonra primary'yi oku)
- **Boşluk:** Raporlama ve normal operasyonlar aynı DB instance'ını paylaşmaya devam edecek.

### 2.3 Kullanılabilirlik Boşlukları

#### 2.3.1 Health Check Detayları Yetersiz
- **Durum:** `/health`, `/health/live`, `/health/ready` endpoint'leri tanımlı. Ancak:
  - Liveness probe: DB bağlantısı kontrol ediyor mu? Redis?
  - Readiness probe: **tüm dependency'leri** kontrol ediyor mu? (DB + Redis + MinIO)
  - Health check timeout'ları Kubernetes manifest'inde yok
  - `/metrics` endpoint'i Prometheus formatında mı?

#### 2.3.2 Graceful Shutdown Süreci Belirsiz
- **Durum:** Kubernetes manifest'inde `terminationGracePeriodSeconds` yok.
- **Boşluk:** Pod shutdown olurken:
  - In-flight request'ler tamamlanacak mı?
  - Celery worker'lar görevlerini tamamlayacak mı?
  - Redis session'ları başka pod'a taşınacak mı?

---

## 3. GÜVENLİK BOŞLUKLARI

### 3.1 Kritik Güvenlik Boşlukları

#### 3.1.1 Şifreleme Anahtarları Yönetimi Belirsiz
- **Durum:** `SECRET_KEY` ve `ALGORITHM=HS256` tanımlı. Ancak:
  - **Secret Key rotasyonu** dokümante değil
  - **Eski token'lar** geçersiz kılınacak mı? (Redis'te revocation list mi, versioned key mi?)
  - **HS256** kullanımı: Production'da **asimetrik anahtar** (RS256) önerilir
  - JWT secret'ı Kubernetes Secret'ta mı tutulacak? Vault entegrasyonu nasıl?
- **Risk:** Secret sızdırılırsa tüm token'lar伪造 edilebilir.

#### 3.1.2 İki Faktörlü Doğrulama (MFA) Uygulanmamış
- **Durum:** `kullanicilar` tablosunda `iki_factor_aktivate` ve `iki_factor_secret` alanları var. Ancak:
  - MFA **oluşturma/aktive etme API'leri** dokümante değil
  - TOTP üretimi (QR code) nasıl yapılacak?
  - Yedek kodlar (backup codes) sistemi yok
  - MFA zorunluluğu hangi roller için geçerli? (Sadece ADMIN mi?)
- **Boşluk:** MFA altyapısı yarım.

#### 3.1.3 Erişim Kontrolü Belirsizlikleri
- **Durum:** RBAC yetki matrisi var. Ancak:
  - **Satır bazlı erişim kontrolü (RLS)** yok (Kullanıcı X, sadece kendi oluşturduğu kayıtları görebilir mi?)
  - **Kullanıcı → Depo** ilişkisi: Kullanıcı sadece kendi deposundaki stokları görebilir mi? (`kullanicilar.varsayilan_depo_id` kullanılmıyor)
  - **API endpoint bazlı** yetki kontrolü detaylı değil (sadece modül ön eki verilmiş)
  - **Kritik işlemler için ek yetki** (break-glass) mekanizması yok

#### 3.1.4 Audit Log'ta Kullanıcı Kimliği Sorunu
- **Durum:** `audit_log` tablosunda `kullanici_id` zorunlu. Ancak:
  - **Sistem işlemleri** (trigger, scheduler) için kullanıcı ID'si ne olacak?
  - Celery worker'lar audit log'a kim olarak yazacak?
  - **Read işlemleri** audit log'a kaydedilmiyor — bu bir güvenlik açığı olabilir
- **Boşluk:** Audit log'ta NULL kullanıcı ID'si için standby kullanıcı ("SYSTEM") yok.

#### 3.1.5 CSRF Koruması Belirsiz
- **Durum:** "SameSite cookies, CSRF tokens" yazıyor. Ancak:
  - **Backend'de CSRF token doğrulaması** nasıl yapılacak?
  - **Oturum açan kullanıcıya özel CSRF token** üretiliyor mu?
  - `Access-Control-Allow-Credentials` CORS ayarı nedir?
- **Boşluk:** CSRF koruması sadece bir not, uygulama detayı yok.

### 3.2 Orta Düzey Güvenlik Boşlukları

#### 3.2.1 Hassas Veri Maskeleme Eksik
- **Durum:** `eposta`, `telefon`, `vergi_no` gibi alanlar "hassas" olarak tanımlanmış. Ancak:
  - **Data masking** (müşteri vergi numarası → ***567) uygulanmıyor
  - **Log'larda** hassas veriler maskeleniyor mu?
  - **Export** işlemlerinde hassas veriler nasıl korunacak?
- **Boşluk:** Müşteri ve tedarikçi verileri export edildiğinde açık görünür.

#### 3.2.2 API İmzalama (Request Signing) Yok
- **Durum:** Sadece JWT + HTTPS var. Ancak:
  - **3. taraf entegrasyonları** için request signing (HMAC) yok
  - Webhook'lar için payload imzası doğrulaması yok
- **Boşluk:** 3. taraf sistemler token çalınırsa sisteme erişebilir.

#### 3.2.3 Penetrasyon Testi Planı Yok
- **Durum:** "Yıllık penetrasyon testi" yazıyor. Ancak:
  - **OWASP Top 10** için spesifik test senaryoları yok
  - **API güvenlik testleri** (REST API fuzzing) yok
  - **Social engineering** testleri yok
- **Öneri:** Üretim öncesi kapsamlı penetrasyon testi yapılmalı.

#### 3.2.4 Güvenlik Başlıkları Uygulanmamış
- **Durum:** Sistem Mimarisi'nde güvenlik başlıkları (HSTS, CSP, vb.) var. Ancak:
  - **Nginx konfigürasyonunda** bu başlıklar var mı?
  - **Content-Security-Policy** (CSP) policy'si ne?
  - **HTTP Public Key Pinning (HPKP)** kaldırıldı — doğru
  - **Subresource Integrity (SII)** CDN kaynakları için uygulanmış mı?
- **Boşluk:** Güvenlik başlıkları sadece kod olarak var, Nginx konfigürasyonunda doğrulanmalı.

### 3.3 Küçük Güvenlik Boşlukları

| Boşluk | Açıklama | Öncelik |
|--------|----------|----------|
| Rate limit bypass | `X-Forwarded-For` spoofing'e karşı önlem belirsiz | Orta |
| Password reset | Token üretimi, süresi, tek kullanımlık mı? | Orta |
| Concurrent session | Aynı kullanıcı iki cihazda — ikisini de sonlandırma seçeneği? | Düşük |
| Backup encryption key | Yedekler AES-256 ile şifreli. Anahtar yönetimi? | Yüksek |

---

## 4. OPERASYON VE BAKIM BOŞLUKLARI

### 4.1 Kritik Operasyon Boşlukları

#### 4.1.1 Veritabanı Migration Yönetimi Belirsiz
- **Durum:** Alembic kullanılacağı belirtilmiş. Ancak:
  - **Migration script'leri** repo'da nerede? (herhangi bir `migrations/` klasörü dokümante edilmemiş)
  - **Production'da migration** nasıl çalıştırılacak? (Kubernetes Job olarak mı, manual mı?)
  - **Rollback** stratejisi? (önceki migration'a dönme)
  - **Zero-downtime migration** stratejisi? (örn: yeni kolon ekleme, eski kolonu silme — iki adımda)
  - **Seed data** yönetimi? (varsayılan roller, sistem ayarları)
- **Risk:** Migration hatası → veritabanı çökmesi → sistem durması.

#### 4.1.2 Environment Variable Yönetimi Dağınık
- **Durum:** `.env` değişkenleri Sistem Mimarisi'nde listelenmiş. Ancak:
  - ** staging ve production** için ayrı `.env` dosyaları yok
  - **Vault** ile nasıl entegre olacak? (sadece "HashiCorp Vault / Docker Secrets" yazıyor)
  - **Secret rotation** (veritabanı şifresi değiştiğinde) prosedürü yok
  - **ConfigMap vs Secret** ayrımı Kubernetes'de yapılmamış
- **Boşluk:** Production'da secret'lar nasıl yönetilecek? (硬编码? ortam değişkeni mi?)

#### 4.1.3 Log aggregation Altyapısı Tamamlanmamış
- **Durum:** ELK Stack (Elasticsearch, Logstash, Kibana) belirtilmiş. Ancak:
  - **Fluentd/Fluent Bit** konfigürasyonu yok
  - **Log retention** politikası belirsiz (SRS'de 1 yıl var ama uygulama nasıl?)
  - **Log index** yapısı (index per service? index per date?) belirsiz
  - **Elasticsearch** itself nasıl deploy edilecek? (Kubernetes StatefulSet mi, hosting mi?)
  - **Kibana** erişim kontrolü nasıl?
- **Risk:** Sistem hatası olduğunda log'lara ulaşılamaz.

#### 4.1.4 Yedekleme Doğrulama Prosedürü Olmadan Yedekleme Yapılıyor
- **Durum:** Yedekleme stratejisi detaylı. Ancak:
  - **Otomatik restore testi** yok
  - **Backup verification** (checksum kontrolü) yok
  - **Backup retention enforcement** (eskileri otomatik silme) nasıl yapılacak?
  - **Point-in-time recovery** gerçekten test edildi mi?
- **Boşluk:** "Yedek var" ama "geri dönülebilir mi" bilinmiyor.

### 4.2 Orta Düzey Operasyon Boşlukları

#### 4.2.1amon Monitoring Dashboard'ları Paylaşılmamış
- **Durum:** Sistem Mimarisi Bölüm 8.5'te dashboard tanımları var. Ancak:
  - **Grafana dashboard JSON/yml** dosyaları repo'da yok
  - **Alert kuralları** (Alertmanager) detayları yok (sadece metrik isimleri var)
  - **Notification channel** (e-posta, Slack, PagerDuty) yapılandırması yok
  - **SLA/SLO** hedefleri tanımlanmış ama **SLO error budget** hesabı yok
- **Öneri:** Grafana dashboard'ları kod olarak repo'da tutulmalı.

#### 4.2.2 Kubernetes Kaynak (Resource) Limitleri Belirsiz
- **Durum:** CPU/RAM istekleri ve limitleri kısmen var. Ancak:
  - **LimitRange** tanımlanmamış
  - **ResourceQuota** tanımlanmamış
  - **Pod** başına kaynak request/limit tutarlılığı kontrol edilmiyor
  - **Vertical Pod Autoscaler (VPA)** önerilmiş ama uygulanmamış

#### 4.2.3 Depoyu İzleme (Depo Durumu, Kapasite) Yok
- **Durum:** Depo konumu (depo, raf, blok) takılıyor. Ancak:
  - **Depo doluluk oranı** takibi yok
  - **Kapasite uyarısı** (depo dolduğunda) yok
  - **Fiziksel envanter sayımı** (cycle count) desteği yok
  - Depo konumu rastgele mi atanıyor, bir sistem var mı?

### 4.3 Bakım Boşlukları

#### 4.3.1 Sürüm Geçiş (Release) Prosedürü Belirsiz
- **Durum:** Blue-green ve canary deployment stratejileri var. Ancak:
  - **Hangi strateji** production'da kullanılacak? (karar verilmemiş)
  - **Database migration** sırasında eski ve yeni versiyon aynı anda çalışabilir mi?
  - **Feature flag** sistemi yok (yeni özellikleri açma/kapama)
  - **Rollback** prosedürü adım adım yazılmamış
  - **Hotfix** prosedürü (critical bugfix için) yok

#### 4.3.2 Büyük Veri Tasarrufu (Archiving) Uygulanmamış
- **Durum:** SRS'de 2 yıldan eski verilerin arşivlenmesi var. Ancak:
  - **Arşivleme tablo** yapısı yok
  - **Arşivleme job'ı** (ne zaman, kim tetikleyecek) yok
  - **Arşive erişim** (sadece okuma, kim yetkili) belirsiz
  - **Partition'lar arası arşivleme** nasıl yapılacak?

---

## 5. UYUMLULUK VE HUKUKİ BOŞLUKLAR

### 5.1 Kritik Uyumluluk Boşlukları

#### 5.1.1 KVKK (Kişisel Verilerin Korunması Kanunu) Uyumu Yetersiz
- **Durum:** Türkiye KVKK kapsamında bu sistem çalışacak. Ancak:
  - **Kişisel veri envanteri** çıkarılmamış (hangi tablolarda kişisel veri var?)
  - **Veri sahibi başvuru** ( erasure, rectification) süreci yok
  - **Veri işleme envanteri** (Raporlama) yok
  - **Veri yedekleme** KVKK uyumu (yedekler de kişisel veri içerir) nasıl korunuyor?
  - **Veri sorumlusu** (şirket) tanımı ve bildirimi yok
  - **Veri işleyen** (cloud provider, hosting) sözleşmesi gereksinimleri belirsiz
- **Risk:** KVKK ihlali → para cezası, itibar kaybı.

#### 5.1.2 Gıda Güvenliği ve İzlenebilirlik Mevzuatı Belirsizliği
- **Durum:** Sistemin temel amacı gıda izlenebilirliği. Ancak:
  - **Gıda kodeksi** gereksinimleri ( Türk Gıda Kodeksi Yönetmeliği) dokümante edilmemiş
  - **İzlenebilirlik kaydı** tutma süresi mevzuatta belirlenen sürelere uygun mu?
  - **Lot bazlı izlenebilirlik** dışında, **zincir izlenebilirliği** (supply chain traceability) tam mı?
  - **Gıda zehirlenmesi/hastalığı** durumunda lot geri çağırma (recall) prosedürü yok
- **Risk:** Gıda güvenliği ihlali → ürün recall, yasal yaptırım.

#### 5.1.3 Yetkilendirilmiş Kuruluş ve Sertifikasyon Eksikliği
- **Durum:** Tedarikçi sertifikaları (ISO, organik) saklanabilir. Ancak:
  - **Sistem'in kendisi** için herhangi bir sertifikasyon gerekli mi? (SaaS modeli mi, on-premise mi?)
  - **ISO 27001** (bilgi güvenliği) gerekli mi?
  - **ISO 22000** (gıda güvenliği) gerekli mi?
  - Eğer cloud'da çalışacaksa **SOC 2** raporu gerekli mi?
- **Boşluk:** Müşteri/kullanıcı güvenlik gereksinimi olarak ne sunulacak?

### 5.2 Orta Düzey Uyumluluk Boşlukları

#### 5.2.1 Finansal Kapsam Sınırı — KAPATILDI
- **Karar:** Faturalama, ödeme takibi, vergi beyannamesi, mali defter ve amortisman muhasebesi bu sistemin kapsamı dışındadır; bunlar harici muhasebe sisteminin sorumluluğundadır.
- **ERP sorumluluğu:** Satış, lot izlenebilirliği, stok hareketi ve operasyonel üretim/stok maliyeti kayıtlarını tutar; mali belge veya vergi kaydı üretmez.
- **Kapanış ölçütü:** SRS kapsamı, DB-Design fiziksel şeması ve satış/iade çözümü aynı sınırı kullanır.

#### 5.2.2 Denetim İzleri Yetersiz
- **Durum:** Audit log tablosu var. Ancak:
  - **Mali denetim** için log'lar yeterli mi? (kim, ne zaman, neyi, hangi değerle değiştirdi)
  - **Dış denetim** (yeminli mali müşavir) erişimi nasıl sağlanacak?
  - **Log'ların imzalanması** (tamponluk) yok — log değiştirilemez mi?
- **Boşluk:** Denetim sırasında log'ların değiştirilemediğini kanıtlama mekanizması yok.

#### 5.2.3 Saklama Süreleri Uyumsuzluğu
- **Durum:** SRS'de veri saklama süreleri tanımlı (satış kayıtları 10 yıl, denetim logları 5 yıl). Ancak:
  - **Ticari defterler** (VUK) için 10 yıl saklama zorunluluğu tam olarak karşılanıyor mu?
  - **Sigorta** için gerekli belgeler (yangın, sel, hırsızlık) saklama süresi?
  - **Saklama süresi dolan veriler** fiziksel olarak siliniyor mu? (veri imha sertifikası)
- **Boşluk:** Yasal saklama süresi dolan verilerin imha prosedürü yok.

---

## 6. SDLC VE DEVOPS BOŞLUKLARI

### 6.1 Kritik SDLC Boşlukları

#### 6.1.1 Kod Reposu ve Branching Strategy Belirsiz
- **Durum:** "GitHub Actions" kullanılacağı belirtilmiş. Ancak:
  - **Repo yapısı** (monorepo mı, ayrı repo mu?) belirsiz
  - **Branching modeli** (Gitflow, trunk-based) seçilmemiş
  - **Release tagging** stratejisi yok
  - **Hotfix** akışı nasıl?
  - **Dependabot** veya benzeri dependency update mekanizması var mı?
- **Boşluk:** Kod tabanı büyüdükçe yönetim zorlaşacak.

#### 6.1.2 Test Ortamı Yönetimi Yetersiz
- **Durum:** 4 ortam tanımlı (local, CI, dev, staging, production). Ancak:
  - **Staging** veritabanı ne kadar canlıya benziyor? (veri boyutu, çeşitliliği)
  - **Test verisi** nasıl oluşturulacak? (seed script, anonymized prod data?)
  - **Smoke test** suite'i var mı? (sadece `/health` kontrolü yetmez)
  - **Performance test** suite'i yok (k6, Locust)
  - **Load test** hedefleri var ama uygulaması yok
- **Risk:** Staging geçiş → production'da beklenmeyen hata.

#### 6.1.3 CI/CD Pipeline Detaysız
- **Durum:** GitHub Actions workflow'ları verilmiş. Ancak:
  - **Docker image** registry'si (GitHub Container Registry) credential'ları nasıl yönetilecek?
  - **Multi-arch image** build (amd64, arm64) gerekli mi?
  - **Image tag** stratejisi: `latest` mi, `git-sha` mi?
  - **Staging deployment** otomatik mi, manuel mi? (otomatiğe izin var ama onay kapısı belirsiz)
  - **Production deployment** onay süreci (approval) nasıl işleyecek? (sadece "Manuel onay" yazıyor)
- **Boşluk:** Pipeline çalışıyor ama production'a kim, ne zaman deploy edecek belirsiz.

#### 6.1.4 Infrastructure as Code (IaC) Tamamlanmamış
- **Durum:** Sistem Mimarisi'nde "Terraform veya Ansible kullanılır" denilmiş. Ancak:
  - **Hiçbir Terraform veya Ansible dosyası** dokümante edilmemiş
  - Kubernetes manifest'leri (api-deployment.yaml) var ama **tam cluster** manifest'i yok
  - **Database schema** (DDL) var ama **database provisioning** (tablespace, extension, user) yok
  - **Networking** (VPC, subnet, firewall rules) dokümante değil
- **Boşluk:** Üretim ortamı tamamen elle yönetiliyor — bu ölçeklenmeyi imkansız kılar.

### 6.2 Orta Düzey SDLC Boşlukları

#### 6.2.1 Kod Kalitesi Standartları Belirsiz
- **Durum:** "Ruff, Black, ESLint, Prettier" araçları var. Ancak:
  - **Lint kuralları** hangileri aktif? (.eslintrc, ruff.toml içeriği yok)
  - **Code coverage** %80 hedefi var. Ama **coverage report** nasıl görüntülenecek? (Codecov mı, GitHub dashboard mı?)
  - **Sonarqube** kullanılıyor mu? (kod kalite dashboard)
  - **Dependency size** kontrolü var mı? (leviathanlarge dependencies)
- **Boşluk:** Kod kalitesi standartları takibi yapılmıyor.

#### 6.2.2 API Dokümantasyonu Yönetimi Yetersiz
- **Durum:** OpenAPI/Swagger otomatik üretilecek. Ancak:
  - **OpenAPI specification** dosyası repo'da mı? (her commit ile güncellenecek mi?)
  - **Postman/Insomnia** collection'ı var mı?
  - **API changelog** (breaking changes) yönetimi yok
  - **3. taraf API consumer** dokümantasyonu nasıl sunulacak?
- **Öneri:** OpenAPI spec'i CI'da valide edilmeli ve published edilmeli.

#### 6.2.3 Dependency Güvenliği Belirsiz
- **Durum:** "Dependabot" ve "Trivy" var. Ancak:
  - **Dependabot** nasıl yapılandırılmış? (hangi ecosystem'ler, hangi schedule)
  - **Trivy** CI'da her commit'te çalışıyor mu? (sadece "Container tarama" yazıyor)
  - **SAST** (Static Application Security Testing) aracı var mı? (Bandit, Semgrep)
  - **DAST** (Dynamic Application Security Testing) var mı? (OWASP ZAP)
  - **Supply chain security** (SBOM, signprümlar) yok
- **Boşluk:** Bilinmeyen vulnerability'lar production'da kalacak.

### 6.3 Küçük SDLC Boşlukları

| Boşluk | Açıklama | Öncelik |
|--------|----------|----------|
| Atomic deployment | Deploy sırasında hata olursa otomatik rollback var mı? | Orta |
| Database migration ordering | Migration'lar sıralı mı çalışacak? (Flyway ile) | Orta |
| Feature flag system | Yeni özellikler açık/kapalı nasıl yapılacak? | Düşük |
| Contract testing | Backend-frontend API contract'ı nasıl test ediliyor? | Düşük |

---

## 7. VERİTABANI TASARIMI ÖZGÜ BOŞLUKLAR

### 7.1 Veri Bütünlüğü Sorunları

#### 7.1.1 Stok Karti Tablosunda Kullanılmayan/Silinen Alanlar
- **Durum:** `stok_karti` tablosunda `faks`, `yetkili_kisi`, `yetkili_telefon`, `yetkili_eposta`, `banka_adi`, `banka_sube`, `hesap_no`, `odeme_vadesi`, `tedarikci_sinifi`, `not` alanları — **bu alanlar tedarikçi tablosuna aittir, stok_karti'nde neden var?**
- **Boşluk:** Veri modelleme hatası veya gereksiz alanlar. Bu alanlar `stok_karti` DDL'inde tanımlı ama tedarikçi FK'sı üzerinden zaten erişilebilir.

#### 7.1.2 Aynı Sorun: Çok Sayıda Tabloda Tekrar Eden Alanlar
- `musteriler`, `tedarikciler`, `stok_karti`, `satis_kaydi`, `uretim_emri` tablolarının hepsinde `stok_kodu`, `barkod`, `aciklama`, `gorsel_url`, `agirlik`, `hacim`, `minimum_stok_seviyesi`, `maksimum_stok_seviyesi`, `raf_omru_gun` alanları var. **Bu alanlar gereksiz yere çoğaltılmış.**
- `satis_kaydi` tablosunda `stok_kodu`, `barkod`, `aciklama` vb. alanlar var — satış kaydında ürün bilgisi neden tekrarlansın?
- **Boşluk:** Veritabanı normalizasyonu 3NF değil. UPDATE anomaly riski.

#### 7.1.3 Eksik Foreign Key Constraint'leri
- `satis_kalemleri` → `stok_karti` FK var ama `satis_kalemleri` → `urunler` FK **sadece `urun_id` üzerinden dolaylı** — doğrudan referans yok.
- `uretim_detay` → `stok_karti` FK'sı var ama `hammadde_stok_id` üzerinden kontrol yok — lot numarası string olarak da saklanıyor.
- **Boşluk:** Veri bütünlüğü constraint'lerle değil, uygulama mantığı ile sağlanmaya çalışılıyor.

### 7.2 Veritabanı Tasarım Tutarsızlıkları

#### 7.2.1 Enum Tanımları Tutarsız
- SRS Enum'lar: `BIREYSEL`, `KURUMSAL` (musteri_tipi)
- DB Enum'lar: `'BIREYSEL','KURUMSAL'` (VARCHAR)
- Sistem Mimarisi: `'BIREYSEL','KURUMSAL'`
- **Boşluk:** Veritabanında gerçek enum tipi yok, VARCHAR kullanılmış. Bu, veri tutarlılığı riski yaratır.

#### 7.2.2 Zaman Damgaları (Timestamp) Tutarsızlığı
- Bazı tablolarda `TIMESTAMP`, bazılarında `TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP`
- Bazı tablolarda `DATE`, bazılarında `TIMESTAMP` (üretim tarihi, son kullanma)
- **Boşluk:** Zaman tipi seçimi standart değil — raporlama ve karşılaştırma sırasında sorun çıkabilir.

### 7.3 Partitioning ve Büyük Tablo Stratejisi Eksikliği
- **Boşluk:** `stok_hareketleri` (en büyük tablo) için partition uygulanmamış. Sistem Mimarisi'nde öneri var ama DB Tasarımı'nda yok.
- **Boşluk:** `audit_log` tablosu için partitioning düşünülmemiş (en çok yazılan tablo).
- **Boşluk:** Partition index'leri (partition key üzerinde) ayrı tanımlanmamış.

---

## 8. SİSTEM MİMARİSİ ÖZGÜ BOŞLUKLAR

### 8.1 Monolitik Mimari Kararı — Gelecek Soru İşareti
- **Durum:** "Modüler Monolit" seçilmiş. Bu, ERP için doğru olabilir. Ancak:
  - **Modüler sınırlar** (bounded context) tanımlanmamış — hangi modül ne iş yapar?
  - **Modüller arası iletişim** nasıl? (doğrudan DB mi, event bus mı?)
  - **Deploy bağımsızlığı** yok (tek container'da tüm modüller)
- **Boşluk:** Sistem büyüdüğünde mikroservis geçişi nasıl yapılacak? (bu karar şimdilik doğru ama geçiş stratejisi olmalı)

### 8.2 Celery Worker Yönetimi Yetersiz
- **Durum:** Celery worker'lar tanımlı. Ancak:
  - **Task tanımları** (hangi task hangi queue?) yok
  - **Queue yapısı** (priority queue, slow queue) yok
  - **Retry policy** (kaç kez, ne interval ile) belirsiz
  - **Dead letter queue** (DLQ) yapılandırması yok
  - **Flower** (Celery monitoring) kullanılıyor mu?
- **Boşluk:** Worker hatası durumunda görev kaybı riski.

### 8.3 APScheduler Tek Instance Kısıtlaması
- **Durum:** "APScheduler — Tek instance" yazıyor. Ancak:
  - **Scheduler'ın tek instance olması** Kubernetes'de nasıl sağlanacak? (Pod singleton, leader lock?)
  - **Failover** senaryosu? (scheduler pod ölürse görevler çalışmaz)
  - **Distributed lock** için Redis kullanılacağı belirtilmiş — ama uygulama yok
- **Boşluk:** Yüksek kullanılabilirlik için scheduler tek nokta hatası (SPOF).

---

## 9. ÖNEMLİ TESPİTLER VE ÖNERİLER

### 9.1 Acil Eylem Planı (Üretim Öncesi Giderilmesi Gerekenler)

| # | Eylem | Öncelik | İlgili Boşluk |
|---|-------|---------|---------------|
| 1 | Veritabanı partition'larını uygula (`stok_hareketleri`, `audit_log`) | 🔴 Kritik | 2.1.1, 7.3 |
| 2 | Migration script'lerini yaz ve CI' a ekle | 🔴 Kritik | 4.1.1 |
| 3 | MFA TOTP API'lerini uygula | 🔴 Kritik | 3.1.2 |
| 4 | FIFO otomatik lot seçimini zorunlu kıl (satış API) | 🔴 Kritik | 1.1.1 |
| 5 | Kalite kontrol onay/reddetme workflow'u tasarla ve uygula | 🔴 Kritik | 1.1.2 |
| 6 | KVKK uyumluluk değerlendirmesi yap | 🔴 Kritik | 5.1.1 |
| 7 | Kubernetes manifest'lerini tamamla (Ingress, ConfigMap, Secret, Service) | 🔴 Kritik | 2.2.1 |
| 8 | Secret rotation ve Vault entegrasyonu uygula | 🔴 Kritik | 3.1.1, 4.1.2 |
| 9 | Log aggregation altyapısını kur (Elasticsearch + Fluentd) | 🔴 Kritik | 4.1.3 |
| 10 | Otomatik backup restore testi uygula | 🔴 Kritik | 4.1.4 |

### 9.2 Orta Vadeli İyileştirmeler (Üretim Sonrası 3 Ay İçinde)

| # | Eylem | Öncelik |
|---|-------|---------|
| 1 | Cache stratejisi dokümante et ve uygula |
| 2 | Read replica yönlendirmesini uygula (raporlama) |
| 3 | Feature flag sistemi kur |
| 4 | IaC (Terraform) ile Kubernetes cluster'ı tanımla |
| 5 | Penetrasyon testi yaptır |
| 6 | Depo yönetimi modülünü tasarla ve uygula |
| 7 | Üretim maliyeti hesaplama modülünü tamamla |
| 8 | Veritabanı tasarım normalizasyon hatalarını düzelt |
| 9 | API contract testing (Pact/Postman) uygula |
| 10 | SLO/SLA ve error budget hesaplaması yap |

### 9.3 Doküman Tutarsızlıkları Özeti

| Sorun | SRS | DB Tasarım | Sistem Mimarisi |
|-------|-----|------------|-----------------|
| `urunler.kategori` enum | KuruYemiş, Sebze, KuruBakliyat, Yağ, Turşu | KURUYEMIS, SEBZE, KURU_BAKLIYAT, YAG, TURSU | — |
| `stok_karti` tablosunda tedarikçi alanları | Ayrı tablo | Aynı tabloda (yanlış) | — |
| MFA | P2 (gelecek aşama) | Alan var ama uygulama yok | TOTP desteği var |
| Kubernetes | "gelecek" | — | Hemen uygulanacak |

---

## 10. SONUÇ

Bu üç doküman birlikte değerlendirildiğinde, **sistemin konseptsel tasarımı güçlü ve kapsamlıdır.** Ancak, **üretim ortamına geçiş için ciddi boşluklar mevcuttur:**

1. **Veritabanı tarafı:** Partitioning, migration yönetimi, normalizasyon hataları
2. **Güvenlik tarafı:** MFA yarım, RBAC belirsiz, KVKK uyumsuzluğu
3. **Operasyon tarafı:** Log yönetimi eksik, IaC yok, yedekleme doğrulaması yok
4. **SDLC tarafı:** Altyapı kod olarak tanımlanmamış, test ortamları yetersiz

**Minimum üretimlilik için:** Bu rapordaki 10 acil eylem **mutlaka** giderilmeden production'a geçilmemeli.

---

**Rapor Bilgisi:**
- Toplam boşluk sayısı: ~60+
- Kritik (üretim öncesi giderilmeli): ~20
- Orta (3 ay içinde giderilmeli): ~25
- Düşük (gelecek sprint'lerde): ~15
