/**
 * The app module: System Bridge's activity, tiles, manifest and icon on the
 * shell. `GROUNDWORK_DEV_URL` points debug builds at a dev server instead of
 * the bundled pairing page, such as http://localhost:7680/ through
 * `adb reverse`.
 *
 * Release builds take their version from `APP_VERSION`, the release tag, and
 * are signed when `ANDROID_KEYSTORE_FILE`, `ANDROID_KEYSTORE_PASSWORD`,
 * `ANDROID_KEY_ALIAS` and `ANDROID_KEY_PASSWORD` are set, so the key stays out
 * of the repository. Without them the release APK is unsigned.
 */
plugins { id("com.android.application") }

val appVersion = System.getenv("APP_VERSION")?.removePrefix("v")?.ifBlank { null } ?: "0.1.0"

// Each part of major.minor.patch gets two digits, so every release's code is
// higher than the last, as Android and F-Droid need: 5.21.2 is 52102.
val appVersionCode =
  appVersion.substringBefore("-").split(".").map { it.toIntOrNull() ?: 0 }.let { (major, minor, patch) ->
    major * 10000 + minor * 100 + patch
  }.coerceAtLeast(1)

val keystore = System.getenv("ANDROID_KEYSTORE_FILE")?.ifBlank { null }

android {
  namespace = "dev.timmo.systembridge"
  compileSdk { version = release(37) { minorApiLevel = 2 } }
  buildToolsVersion = "37.0.0"

  defaultConfig {
    applicationId = "dev.timmo.systembridge"
    minSdk = 34
    targetSdk = 37
    versionCode = appVersionCode
    versionName = appVersion
    manifestPlaceholders["devUrl"] = ""
  }

  signingConfigs {
    if (keystore != null) {
      create("release") {
        storeFile = file(keystore)
        storePassword = System.getenv("ANDROID_KEYSTORE_PASSWORD")
        keyAlias = System.getenv("ANDROID_KEY_ALIAS")
        keyPassword = System.getenv("ANDROID_KEY_PASSWORD")
      }
    }
  }

  buildTypes {
    debug { manifestPlaceholders["devUrl"] = System.getenv("GROUNDWORK_DEV_URL") ?: "" }
    release {
      isMinifyEnabled = true
      proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"))
      signingConfigs.findByName("release")?.let { signingConfig = it }
    }
  }

  // F-Droid and reproducible builds can't read the encrypted dependency
  // block Google adds to APKs.
  dependenciesInfo {
    includeInApk = false
    includeInBundle = false
  }

  compileOptions {
    sourceCompatibility = JavaVersion.VERSION_17
    targetCompatibility = JavaVersion.VERSION_17
  }
}

dependencies {
  implementation(project(":shell"))
  // The shell's WebView client, which MainActivity extends for its offline page
  implementation("androidx.webkit:webkit:1.18.0")
}
