import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../api_client.dart';

/// Holds the logged-in session and the shared API client.
class AppState extends ChangeNotifier {
  final ApiClient api = ApiClient();
  String? phone;
  bool ready = false;

  bool get isLoggedIn => api.token != null;

  /// Restore a saved token on app launch.
  Future<void> load() async {
    final prefs = await SharedPreferences.getInstance();
    api.token = prefs.getString('token');
    phone = prefs.getString('phone');
    ready = true;
    notifyListeners();
  }

  Future<void> signIn(String token, String phoneNumber) async {
    api.token = token;
    phone = phoneNumber;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('token', token);
    await prefs.setString('phone', phoneNumber);
    notifyListeners();
  }

  Future<void> signOut() async {
    api.token = null;
    phone = null;
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('token');
    await prefs.remove('phone');
    notifyListeners();
  }
}
