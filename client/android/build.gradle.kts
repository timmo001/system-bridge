/** The Android Gradle plugin and the Kotlin it builds with. */
buildscript {
  dependencies { classpath("org.jetbrains.kotlin:kotlin-gradle-plugin:2.4.21") }
}

plugins {
  id("com.android.application") version "9.5.1" apply false
  id("com.android.library") version "9.5.1" apply false
}
