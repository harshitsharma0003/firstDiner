import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

/// Fraunces display face — headings, the wordmark, prices. Matches the web console.
TextStyle fraunces({
  double? fontSize,
  FontWeight fontWeight = FontWeight.w600,
  Color? color,
  double? letterSpacing,
  double? height,
}) =>
    GoogleFonts.fraunces(
      fontSize: fontSize,
      fontWeight: fontWeight,
      color: color,
      letterSpacing: letterSpacing,
      height: height,
    );

class Config {
  // Production backend: the firstDiner API deployed as a Cloud Function on
  // firstdiner-473d4f (backend/src/functionsMain.js), so the app works without
  // any local server. Override for local dev against `npm start` in backend/:
  //   flutter run --dart-define=API_BASE=http://10.0.2.2:4000/api        (Android emulator)
  //   flutter run --dart-define=API_BASE=http://localhost:4000/api       (iOS simulator / web)
  //   flutter run --dart-define=API_BASE=http://<mac-lan-ip>:4000/api    (real device)
  static const String apiBase = String.fromEnvironment(
    'API_BASE',
    defaultValue: 'https://asia-south1-firstdiner-473d4f.cloudfunctions.net/api/api',
  );
}

// "Evening service" palette, matched to the web console.
class AppColors {
  static const paper = Color(0xFFFAF6F0);
  static const surface = Color(0xFFFFFFFF);
  static const ink = Color(0xFF2A2230);
  static const inkSoft = Color(0xFF6B6270);
  static const line = Color(0xFFECE4DA);
  static const honey = Color(0xFFC9852F);
  static const honeyDeep = Color(0xFFA96D22);
  static const sage = Color(0xFF4F7A5F);
  static const sageBg = Color(0xFFEAF1EB);
  static const clay = Color(0xFFB04A3A);
  static const clayBg = Color(0xFFF6E8E4);
  static const plumWash = Color(0xFFF1EBF0);
}

ThemeData buildTheme() {
  final base = ThemeData(useMaterial3: true, brightness: Brightness.light);
  final textTheme = GoogleFonts.interTextTheme(base.textTheme)
      .apply(bodyColor: AppColors.ink, displayColor: AppColors.ink);
  return base.copyWith(
    scaffoldBackgroundColor: AppColors.paper,
    colorScheme: base.colorScheme.copyWith(
      primary: AppColors.honey,
      secondary: AppColors.sage,
      surface: AppColors.surface,
      onPrimary: Colors.white,
    ),
    textTheme: textTheme,
    appBarTheme: AppBarTheme(
      backgroundColor: AppColors.surface,
      foregroundColor: AppColors.ink,
      elevation: 0,
      scrolledUnderElevation: 0.5,
      surfaceTintColor: Colors.transparent,
      shape: const Border(bottom: BorderSide(color: AppColors.line)),
      titleTextStyle: fraunces(fontSize: 20, fontWeight: FontWeight.w700, color: AppColors.ink),
    ),
    elevatedButtonTheme: ElevatedButtonThemeData(
      style: ElevatedButton.styleFrom(
        backgroundColor: AppColors.honey,
        foregroundColor: Colors.white,
        elevation: 0,
        shadowColor: Colors.transparent,
        padding: const EdgeInsets.symmetric(vertical: 15, horizontal: 20),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        textStyle: GoogleFonts.inter(fontWeight: FontWeight.w600, fontSize: 15),
      ),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: AppColors.surface,
      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
      hintStyle: const TextStyle(color: AppColors.inkSoft),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: AppColors.line),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: AppColors.line),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: AppColors.honey, width: 2),
      ),
    ),
  );
}
