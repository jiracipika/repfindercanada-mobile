# Capacitor: plugin registration, bridge method dispatch and permission
# states are reflection-based. With minifyEnabled true, R8 renamed them
# (crash: NullPointerException in obfuscated com.getcapacitor.D
# .getPermissionStates -> GeolocationPlugin.checkPermissions), so keep
# the bridge and all plugins intact.
-keep class com.getcapacitor.** { *; }
-keep class com.capacitorjs.plugins.** { *; }
-keep @com.getcapacitor.CapacitorPlugin class * { *; }
-keepclassmembers class * extends com.getcapacitor.Plugin {
    public *;
}
-keepattributes RuntimeVisibleAnnotations,RuntimeVisibleParameterAnnotations
-dontwarn com.getcapacitor.**
-dontwarn com.capacitorjs.plugins.**

# Keep line numbers so release stack traces stay readable.
-keepattributes SourceFile,LineNumberTable
