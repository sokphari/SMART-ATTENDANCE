package com.rupp.teacher.core.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable

private val LightColorScheme = lightColorScheme(
    primary = Primary,
    onPrimary = CardBackground,
    primaryContainer = PrimaryLight,
    onPrimaryContainer = PrimaryDark,

    secondary = Info,
    onSecondary = CardBackground,

    background = AppBackground,
    onBackground = TextPrimary,

    surface = CardBackground,
    onSurface = TextPrimary,

    surfaceVariant = BorderColor,
    onSurfaceVariant = TextSecondary,

    error = Error,
    onError = CardBackground,

    outline = BorderColor
)

private val DarkColorScheme = darkColorScheme(
    primary = Primary,
    onPrimary = CardBackground,
    primaryContainer = PrimaryDark,
    onPrimaryContainer = CardBackground,

    secondary = Info,
    onSecondary = CardBackground,

    background = DarkBackground,
    onBackground = DarkTextPrimary,

    surface = DarkSurface,
    onSurface = DarkTextPrimary,

    surfaceVariant = DarkBackground,
    onSurfaceVariant = DarkTextSecondary,

    error = Error,
    onError = CardBackground,

    outline = TextSecondary
)

@Composable
fun SmartAttendanceTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit
) {
    val colorScheme = if (darkTheme) {
        DarkColorScheme
    } else {
        LightColorScheme
    }

    MaterialTheme(
        colorScheme = colorScheme,
        typography = AppTypography,
        content = content
    )
}
