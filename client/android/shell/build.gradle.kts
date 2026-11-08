/**
 * The Android shell: a WebView activity, the bridge to its view and the
 * defaults `mobile.config` turns on. Apps include this module as the sync
 * copies it and extend it from their own module, never by editing it.
 */
plugins { id("com.android.library") }

android {
  namespace = "dev.timmo.groundwork.shell"
  compileSdk { version = release(37) { minorApiLevel = 2 } }
  buildToolsVersion = "37.0.0"

  defaultConfig {
    minSdk = 34
    consumerProguardFiles("consumer-rules.pro")
  }

  compileOptions {
    sourceCompatibility = JavaVersion.VERSION_17
    targetCompatibility = JavaVersion.VERSION_17
  }

  lint { warningsAsErrors = false }
}

dependencies {
  api("androidx.activity:activity:1.13.0")
  implementation("androidx.core:core:1.19.1")
  implementation("androidx.webkit:webkit:1.18.0")
  implementation("androidx.camera:camera-camera2:1.6.2")
  implementation("androidx.camera:camera-lifecycle:1.6.2")
  implementation("androidx.camera:camera-view:1.6.2")
  implementation("io.github.zxing-cpp:android:3.1.1")
  implementation("org.unifiedpush.android:connector:3.3.5")
  implementation("org.unifiedpush.android:embedded-fcm-distributor:3.1.0")
}
