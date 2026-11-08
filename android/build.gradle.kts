plugins {
    id("com.android.application") version "9.5.1" apply false
    id("org.jetbrains.kotlin.plugin.compose") version "2.3.21" apply false
    id("com.chaquo.python") version "17.2.0" apply false
}
// 构建目录放在源码树之外，避免同步冲突与将产物提交进仓库。
val appBuildDir = System.getenv("QINGJING_ANDROID_BUILD_DIR")
    ?: java.io.File(System.getProperty("user.home"), ".cache/qingjing-aigoodbro-android/app").path
layout.buildDirectory.set(file(appBuildDir).resolveSibling("root"))
