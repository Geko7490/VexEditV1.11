# VexEdit Studio - R8 / ProGuard rules for the release build type.
# The Android Gradle Plugin already applies proguard-android-optimize.txt;
# only project specific keeps belong here.

# Keep line numbers for readable crash reports, hide the original file name.
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile

# Kotlin / Compose runtime metadata used by reflection at runtime.
-keepattributes *Annotation*, InnerClasses, Signature, Exceptions
-dontwarn kotlinx.**

# Application entry points referenced from the manifest.
-keep class com.vexedit.studio.VexEditApplication { *; }
-keep class com.vexedit.studio.MainActivity { *; }

# Compose keeps its own rules through consumer files shipped in the AARs;
# the following only silences optional desktop-only references.
-dontwarn org.jetbrains.annotations.**
