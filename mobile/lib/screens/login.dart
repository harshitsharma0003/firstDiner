import 'package:flutter/material.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:provider/provider.dart';
import '../config.dart';
import '../state/app_state.dart';
import 'home.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});
  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _phoneCtrl = TextEditingController();
  final _codeCtrl = TextEditingController();
  bool _otpSent = false;
  bool _busy = false;
  String? _error;
  String? _verificationId; // set once Firebase has sent the SMS
  bool _demo = false; // demo bypass number: static OTP, no SMS

  // Demo bypass numbers: skip Firebase/SMS and accept a static code.
  static const _demoNumbers = {'+919968225190'};

  /// Step 1: ask Firebase to send an SMS to the entered number.
  Future<void> _sendCode() async {
    // Demo bypass: reveal the OTP field without sending any SMS.
    if (_demoNumbers.contains(_phoneCtrl.text.trim())) {
      setState(() { _demo = true; _otpSent = true; _busy = false; _error = null; });
      return;
    }
    setState(() { _busy = true; _error = null; });
    try {
      await FirebaseAuth.instance.verifyPhoneNumber(
        phoneNumber: _phoneCtrl.text.trim(),
        timeout: const Duration(seconds: 60),
        // Android may auto-retrieve the code and sign in without manual entry.
        verificationCompleted: (PhoneAuthCredential cred) async {
          await _signInWithCredential(cred);
        },
        verificationFailed: (FirebaseAuthException e) {
          setState(() { _busy = false; _error = e.message ?? 'Verification failed.'; });
        },
        codeSent: (String verificationId, int? resendToken) {
          setState(() { _busy = false; _otpSent = true; _verificationId = verificationId; });
        },
        codeAutoRetrievalTimeout: (String verificationId) {
          _verificationId = verificationId;
        },
      );
    } catch (e) {
      setState(() { _busy = false; _error = e.toString(); });
    }
  }

  /// Step 2: combine the entered code with the verificationId and sign in.
  Future<void> _verify() async {
    // Demo bypass: accept the static code via the backend test endpoint.
    if (_demo) {
      setState(() { _busy = true; _error = null; });
      try {
        final app = context.read<AppState>();
        final jwt = await app.api.testLogin(_phoneCtrl.text.trim(), _codeCtrl.text.trim());
        await app.signIn(jwt, _phoneCtrl.text.trim());
        if (!mounted) return;
        Navigator.of(context).pushReplacement(MaterialPageRoute(builder: (_) => const HomeScreen()));
      } catch (e) {
        if (mounted) setState(() { _error = e.toString(); });
      } finally {
        if (mounted) setState(() { _busy = false; });
      }
      return;
    }
    final id = _verificationId;
    if (id == null) return;
    setState(() { _busy = true; _error = null; });
    try {
      final cred = PhoneAuthProvider.credential(verificationId: id, smsCode: _codeCtrl.text.trim());
      await _signInWithCredential(cred);
    } catch (e) {
      setState(() { _busy = false; _error = e.toString(); });
    }
  }

  /// Firebase sign-in -> ID token -> exchange for our app JWT -> enter the app.
  Future<void> _signInWithCredential(PhoneAuthCredential cred) async {
    final app = context.read<AppState>();
    try {
      final userCred = await FirebaseAuth.instance.signInWithCredential(cred);
      final idToken = await userCred.user!.getIdToken();
      final appJwt = await app.api.signInWithFirebase(idToken!);
      await app.signIn(appJwt, userCred.user!.phoneNumber ?? _phoneCtrl.text.trim());
      if (!mounted) return;
      Navigator.of(context).pushReplacement(MaterialPageRoute(builder: (_) => const HomeScreen()));
    } catch (e) {
      if (mounted) setState(() { _busy = false; _error = e.toString(); });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(28),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const SizedBox(height: 24),
              RichText(
                text: TextSpan(
                  style: fraunces(fontSize: 32, fontWeight: FontWeight.w700, color: AppColors.ink, letterSpacing: -0.5),
                  children: const [TextSpan(text: 'first'), TextSpan(text: 'Diner', style: TextStyle(color: AppColors.honeyDeep))],
                ),
              ),
              const SizedBox(height: 6),
              const Text('Sign in with your mobile number', style: TextStyle(color: AppColors.inkSoft, fontSize: 15)),
              const SizedBox(height: 32),

              if (_error != null) _ErrorBox(_error!),

              if (!_otpSent) ...[
                const Text('Mobile number', style: TextStyle(fontWeight: FontWeight.w600)),
                const SizedBox(height: 8),
                TextField(
                  controller: _phoneCtrl,
                  keyboardType: TextInputType.phone,
                  decoration: const InputDecoration(hintText: '+91 99999 00001'),
                ),
                const SizedBox(height: 20),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(onPressed: _busy ? null : _sendCode,
                      child: Text(_busy ? 'Sending…' : 'Send code')),
                ),
              ] else ...[
                Text('Enter the 6-digit code sent to ${_phoneCtrl.text}',
                    style: const TextStyle(fontWeight: FontWeight.w600)),
                const SizedBox(height: 8),
                TextField(
                  controller: _codeCtrl,
                  keyboardType: TextInputType.number,
                  decoration: const InputDecoration(hintText: '123456'),
                ),
                const SizedBox(height: 20),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(onPressed: _busy ? null : _verify,
                      child: Text(_busy ? 'Verifying…' : 'Verify & continue')),
                ),
                TextButton(onPressed: () => setState(() { _otpSent = false; _demo = false; _verificationId = null; }), child: const Text('Use a different number')),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

class _ErrorBox extends StatelessWidget {
  final String message;
  const _ErrorBox(this.message);
  @override
  Widget build(BuildContext context) => Container(
        width: double.infinity,
        margin: const EdgeInsets.only(bottom: 16),
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(color: AppColors.clayBg, borderRadius: BorderRadius.circular(8)),
        child: Text(message, style: const TextStyle(color: AppColors.clay)),
      );
}
