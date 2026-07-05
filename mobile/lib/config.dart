import 'package:flutter/material.dart';

class Config {
  // Point this at your backend.
  //  - Android emulator reaches your host machine at 10.0.2.2
  //  - iOS simulator / web can use localhost
  //  - A real device needs your machine's LAN IP (e.g. http://192.168.1.20:4000)
  static const String apiBase = String.fromEnvironment(
    'API_BASE',
    defaultValue: 'http://10.0.2.2:4000/api',
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
  return base.copyWith(
    scaffoldBackgroundColor: AppColors.paper,
    colorScheme: base.colorScheme.copyWith(
      primary: AppColors.honey,
      secondary: AppColors.sage,
      surface: AppColors.surface,
    ),
    textTheme: base.textTheme.apply(bodyColor: AppColors.ink, displayColor: AppColors.ink),
    appBarTheme: const AppBarTheme(
      backgroundColor: AppColors.surface,
      foregroundColor: AppColors.ink,
      elevation: 0,
      surfaceTintColor: Colors.transparent,
    ),
    elevatedButtonTheme: ElevatedButtonThemeData(
      style: ElevatedButton.styleFrom(
        backgroundColor: AppColors.honey,
        foregroundColor: Colors.white,
        elevation: 0,
        padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 20),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
        textStyle: const TextStyle(fontWeight: FontWeight.w600, fontSize: 15),
      ),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: AppColors.surface,
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(10),
        borderSide: const BorderSide(color: AppColors.line),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(10),
        borderSide: const BorderSide(color: AppColors.line),
      ),
    ),
  );
}
