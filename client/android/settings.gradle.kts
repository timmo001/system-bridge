/**
 * The Android app's Gradle build: the app module, and Groundwork's shell,
 * synced into `shell/` (never edited here).
 */
pluginManagement {
  repositories {
    google()
    mavenCentral()
    gradlePluginPortal()
  }
}

dependencyResolutionManagement {
  repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
  repositories {
    google()
    mavenCentral()
  }
}

rootProject.name = "system-bridge"

include(":app", ":shell")
