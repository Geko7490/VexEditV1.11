# VexEdit Studio

Android için çevrimdışı öncelikli, modüler video/ses düzenleme stüdyosu.
Offline-first, modular video & audio editor for Android.

| | |
|---|---|
| **Application ID** | `com.vexedit.studio` |
| **Version** | 1.1.0 (`versionCode` 1) |
| **minSdk / targetSdk / compileSdk** | 24 / 34 / 34 |
| **Language / UI** | Kotlin + Jetpack Compose |
| **JDK** | 17 (Temurin) |
| **Gradle** | 8.7 (via committed wrapper) |
| **Android Gradle Plugin** | 8.5.2 |
| **Kotlin** | 2.0.0 (+ Compose compiler plugin) |

---

## 1. APK'yı GitHub'dan indirme (Android Studio gerekmez)

1. Depodaki **Actions** sekmesini açın.
2. **Android CI** workflow'unu ve başarılı bir çalışmayı seçin.
3. Sayfanın altındaki **Artifacts** bölümünden indirin:
   - `vexedit-studio-debug-v<sürüm>-build<numara>` → test için debug APK
   - `vexedit-studio-release-signed-...` → imzalı release APK (secrets tanımlıysa)
   - `vexedit-studio-release-unsigned-...` → imzasız release APK (secrets yoksa)
4. ZIP'i açın ve APK'yı cihaza kurun (*Bilinmeyen kaynaklar* izni gerekir).

> Debug ve release paketleri artifact adından ayırt edilir. İmzasız bir paket
> **asla** imzalı gibi sunulmaz ve sürüm etiketiyle yayımlanmaz.

## 2. Yerelde derleme

```bash
git clone <repo-url>
cd VexEditStudio

# Debug APK
./gradlew :app:assembleDebug
# -> app/build/outputs/apk/debug/app-debug.apk

# Release APK (imzasız)
./gradlew :app:assembleRelease
# -> app/build/outputs/apk/release/app-release-unsigned.apk

# Birim testler
./gradlew :app:testDebugUnitTest
```

Gereksinimler: JDK 17 ve Android SDK (platform 34, build-tools 34.0.0).
`ANDROID_HOME` ayarlı olmalı veya `local.properties` içinde `sdk.dir`
tanımlanmalıdır. Gradle'ı ayrıca kurmanıza gerek yoktur; wrapper indirir.

**Az bellekli makineler:** R8 küçültme ~2 GB+ RAM ister. 4 GB altındaki
ortamlarda şu şekilde derleyin:

```bash
./gradlew :app:assembleRelease -Pvexedit.minifyRelease=false
```

## 3. Release imzalama

İmzalama tamamen ortam değişkenleriyle sürülür; depoda hiçbir kimlik bilgisi
bulunmaz. Şu **repository secrets** tanımlanmalıdır:

| Secret | Açıklama |
|---|---|
| `KEYSTORE_BASE64` | Keystore dosyasının base64 hâli |
| `KEYSTORE_PASSWORD` | Keystore parolası |
| `KEY_ALIAS` | Anahtar takma adı |
| `KEY_PASSWORD` | Anahtar parolası |

Keystore oluşturma ve base64'e çevirme:

```bash
keytool -genkeypair -v -keystore release.jks -alias vexedit \
  -keyalg RSA -keysize 2048 -validity 10000
base64 -w0 release.jks > release.jks.base64   # içeriği KEYSTORE_BASE64'e yapıştırın
```

Dördü de tanımlıysa CI imzalı `app-release.apk` üretir ve `apksigner verify`
ile doğrular; doğrulama başarısız olursa iş **başarısız** olur. Eksikse CI
uyarı verip imzasız `app-release-unsigned.apk` üretir.

Yerelde imzalı derleme:

```bash
KEYSTORE_FILE=$PWD/release.jks KEYSTORE_PASSWORD=... \
KEY_ALIAS=vexedit KEY_PASSWORD=... ./gradlew :app:assembleRelease
```

## 4. CI/CD (`.github/workflows/android-build.yml`)

| Job | Ne zaman | Çıktı |
|---|---|---|
| `unit-tests` | her push / PR / manuel | JUnit raporu |
| `debug-apk` | her push / PR / manuel | debug APK artifact'i |
| `release-apk` | push (PR hariç), tag, manuel | signed **veya** unsigned release APK |
| `publish-release` | yalnızca `v*` etiketi | GitHub Release (yalnızca imzalıysa) |

- Tetikleyiciler: `main`/`develop` push, bu dallara PR, `workflow_dispatch`, `v*` etiketleri.
- Gradle bağımlılık önbelleği `gradle/actions/setup-gradle@v4` ile yapılır.
- `|| true` gibi hata gizleme yoktur; her adım gerçek sonucu raporlar.
- Keystore runner'ın geçici dizinine açılır ve iş sonunda silinir.

Sürüm yayımlama:

```bash
git tag v1.1.0 && git push origin v1.1.0
```

## 5. Proje yapısı

```
app/                     Android uygulaması (Kotlin + Compose)
  build.gradle.kts       AGP yapılandırması, imzalama, bağımlılıklar
  proguard-rules.pro     R8 kuralları
  src/main/AndroidManifest.xml
  src/main/res/          ikonlar, tema, renkler, stringler
  src/test/              JVM birim testleri
gradle/wrapper/          Gradle 8.7 wrapper (JAR dâhil, commit edilir)
build.gradle.kts         kök plugin sürümleri
settings.gradle.kts      depo yönetimi + modüller
gradle.properties        AndroidX, JVM bellek ayarları
src/, index.html         Arayüz prototipi (Vite + React web önizlemesi)
```

## 6. Bilinen sınırlamalar

- `src/` altındaki web uygulaması, Android arayüzünün **etkileşimli
  prototipidir**; APK bu prototipi paketlemez.
- APK şu anda uygulama iskeletini (Compose giriş noktası) içerir; v1.1
  medya motoru (MediaCodec/OpenGL) geliştirme aşamasındadır ve
  tamamlanmış olarak sunulmaz.
- R8 küçültme yalnızca ≥4 GB RAM'li ortamlarda doğrulanmıştır.
- Google Play'e otomatik yayın kapsam dışıdır.

## 7. Lisanslar

- Uygulama kodu: MIT (`LICENSE`)
- Üçüncü taraf bağımlılıklar: `THIRD_PARTY_LICENSES.md`
