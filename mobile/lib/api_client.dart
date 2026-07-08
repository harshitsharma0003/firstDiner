import 'dart:convert';
import 'package:http/http.dart' as http;
import 'config.dart';
import 'models.dart';

class ApiException implements Exception {
  final String message;
  ApiException(this.message);
  @override
  String toString() => message;
}

/// Talks to the firstDiner backend.
///
/// PHONE AUTH:
/// The SMS verification happens on the client with the Firebase Auth SDK (see
/// lib/screens/login.dart). That yields a Firebase ID token, which we exchange
/// for an app JWT via [signInWithFirebase]. The dev OTP helpers below remain for
/// local testing against a backend with EXPOSE_OTP=true.
class ApiClient {
  String? token;
  ApiClient({this.token});

  Map<String, String> get _headers => {
        'Content-Type': 'application/json',
        if (token != null) 'Authorization': 'Bearer $token',
      };

  Future<Map<String, dynamic>> _get(String path) async {
    final res = await http.get(Uri.parse('${Config.apiBase}$path'), headers: _headers);
    return _decode(res);
  }

  Future<Map<String, dynamic>> _post(String path, Map<String, dynamic> body) async {
    final res = await http.post(Uri.parse('${Config.apiBase}$path'),
        headers: _headers, body: jsonEncode(body));
    return _decode(res);
  }

  Future<Map<String, dynamic>> _patch(String path, Map<String, dynamic> body) async {
    final res = await http.patch(Uri.parse('${Config.apiBase}$path'),
        headers: _headers, body: jsonEncode(body));
    return _decode(res);
  }

  Map<String, dynamic> _decode(http.Response res) {
    final data = jsonDecode(res.body) as Map<String, dynamic>;
    if (res.statusCode >= 400) {
      throw ApiException(data['error']?.toString() ?? 'Something went wrong.');
    }
    return data;
  }

  // ---- auth ----
  /// Exchange a Firebase ID token (from phone sign-in) for an app JWT.
  Future<String> signInWithFirebase(String idToken) async {
    final data = await _post('/auth/customer/firebase', {'idToken': idToken});
    token = data['token'];
    return token!;
  }

  /// Demo bypass: log in with a hardcoded test number + static code (no SMS).
  Future<String> testLogin(String phone, String code) async {
    final data = await _post('/auth/customer/test-verify', {'phone': phone, 'code': code});
    token = data['token'];
    return token!;
  }

  // ---- dev OTP (local testing only; backend must have EXPOSE_OTP=true) ----
  Future<String?> requestOtp(String phone) async {
    final data = await _post('/auth/customer/request-otp', {'phone': phone});
    return data['devCode']?.toString();
  }

  Future<String> verifyOtp(String phone, String code) async {
    final data = await _post('/auth/customer/verify-otp', {'phone': phone, 'code': code});
    token = data['token'];
    return token!;
  }

  // ---- discovery ----
  Future<List<Restaurant>> searchRestaurants({String q = '', String location = ''}) async {
    final query = <String, String>{};
    if (q.isNotEmpty) query['q'] = q;
    if (location.isNotEmpty) query['location'] = location;
    final uri = Uri.parse('${Config.apiBase}/restaurants').replace(queryParameters: query);
    final res = await http.get(uri, headers: _headers);
    final data = _decode(res);
    return (data['restaurants'] as List).map((r) => Restaurant.fromJson(r)).toList();
  }

  Future<DayAvailability> availability(String restaurantId, String date) async {
    final data = await _get('/restaurants/$restaurantId/availability?date=$date');
    return DayAvailability.fromJson(data);
  }

  // ---- bookings ----
  Future<Booking> book({
    required String restaurantId,
    required String date,
    required String timeSlot,
    required int partySize,
    required String bookingName,
    required String contactNumber,
  }) async {
    final data = await _post('/bookings', {
      'restaurantId': restaurantId,
      'date': date,
      'timeSlot': timeSlot,
      'partySize': partySize,
      'bookingName': bookingName,
      'contactNumber': contactNumber,
      'acceptedTerms': true,
    });
    return Booking.fromJson(data['booking']);
  }

  Future<List<Booking>> myBookings() async {
    final data = await _get('/bookings/mine');
    return (data['bookings'] as List).map((b) => Booking.fromJson(b)).toList();
  }

  Future<void> cancel(String id) async {
    await _patch('/bookings/$id/cancel', {});
  }

  // ---- notifications ----
  Future<Map<String, dynamic>> notifications() async {
    return _get('/notifications'); // { notifications: [...], unread: n }
  }

  Future<int> unreadCount() async {
    try {
      final data = await _get('/notifications');
      return (data['unread'] as int?) ?? 0;
    } catch (_) {
      return 0;
    }
  }

  Future<void> markNotificationsRead() async {
    await _post('/notifications/read', {});
  }
}
