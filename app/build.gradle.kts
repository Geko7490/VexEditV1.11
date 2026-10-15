plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("org.jetbrains.kotlin.plugin.compose")
}

/*
 * Release signing is driven entirely by environment variables so that no
 * credential ever lives in the repository. CI decodes KEYSTORE_BASE64 into a
 * file and exports KEYSTORE_FILE. When any value is missing we simply do not
 * create a signing config: the release build then produces an *unsigned* APK
 * and the workflow reports it as unsigned instead of pretending otherwise.
 */
val keystoreFilePath: String? = System.getenv("KEYSTORE_FILE")
val keystorePassword: String? = System.getenv("KEYSTORE_PASSWORD")
val keystoreAlias: String? = System.getenv("KEY_ALIAS")
val keystoreKeyPassword: String? = System.getenv("KEY_PASSWORD")

val hasReleaseSigning: Boolean =
    !keystoreFilePath.isNullOrBlank() &&
        file(keystoreFilePath).exists() &&
        !keystorePassword.isNullOrBlank() &&
        !keystoreAlias.isNullOrBlank() &&
        !keystoreKeyPassword.isNullOrBlank()

/*
 * R8 is enabled for release by default. It can be switched off with
 *   ./gradlew :app:assembleRelease -Pvexedit.minifyRelease=false
 * which is required on machines with <4 GB RAM (R8 is memory hungry) and is
 * useful when diagnosing shrinking issues. CI keeps the default (true).
 */
val minifyRelease: Boolean =
    (project.findProperty("vexedit.minifyRelease") as String?)?.toBooleanStrictOrNull() ?: true

android {
    namespace = "com.vexedit.studio"
    compileSdk = 34

    defaultConfig {
        applicationId = "com.vexedit.studio"
        minSdk = 24
        targetSdk = 34
        versionCode = 1
        versionName = "1.1.0"
        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
    }

    signingConfigs {
        if (hasReleaseSigning) {
            create("release") {
                storeFile = file(keystoreFilePath!!)
                storePassword = keystorePassword
                keyAlias = keystoreAlias
                keyPassword = keystoreKeyPassword
                enableV1Signing = true
                enableV2Signing = true
                enableV3Signing = true
            }
        }
    }

    buildTypes {
        getByName("debug") {
            isMinifyEnabled = false
            // Debug keeps the default debug keystore so the APK is installable.
        }
        getByName("release") {
            isMinifyEnabled = minifyRelease
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
            signingConfig = if (hasReleaseSigning) {
                signingConfigs.getByName("release")
            } else {
                null
            }
        }
    }

    buildFeatures {
        compose = true
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
    }

    packaging {
        resources {
            excludes += "/META-INF/{AL2.0,LGPL2.1}"
        }
    }
}

dependencies {
    val composeBom = platform("androidx.compose:compose-bom:2024.06.00")
    implementation(composeBom)
    implementation("androidx.core:core-ktx:1.13.1")
    implementation("androidx.lifecycle:lifecycle-runtime-ktx:2.8.3")
    implementation("androidx.activity:activity-compose:1.9.0")
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.ui:ui-graphics")
    implementation("androidx.compose.ui:ui-tooling-preview")
    implementation("androidx.compose.material3:material3")
    implementation("androidx.navigation:navigation-compose:2.7.7")
    implementation("androidx.datastore:datastore-preferences:1.1.1")
    implementation("androidx.work:work-runtime-ktx:2.9.0")

    testImplementation("junit:junit:4.13.2")
    testImplementation("org.jetbrains.kotlinx:kotlinx-coroutines-test:1.8.1")
    androidTestImplementation("androidx.test.ext:junit:1.2.0")
    androidTestImplementation("androidx.test.espresso:espresso-core:3.6.0")
    androidTestImplementation(composeBom)
    androidTestImplementation("androidx.compose.ui:ui-test-junit4")
    debugImplementation("androidx.compose.ui:ui-tooling")
    debugImplementation("androidx.compose.ui:ui-test-manifest")
}

/** Used by CI to name artifacts/releases without fragile log parsing. */
tasks.register("printVersionName") {
    val versionName = android.defaultConfig.versionName
    doLast { println(versionName) }
}

/** Reports whether this build is configured to produce a signed release APK. */
tasks.register("printSigningStatus") {
    val signed = hasReleaseSigning
    doLast { println(if (signed) "signed" else "unsigned") }
}
