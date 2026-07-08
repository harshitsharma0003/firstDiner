import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
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
  bool _otpSent = false;
  bool _busy = false;
  String? _error;
  String? _verificationId; // set once Firebase has sent the SMS
  bool _demo = false; // demo bypass number: static OTP, no SMS

  // Demo bypass numbers (full E.164): skip Firebase/SMS and accept a static code.
  static const _demoNumbers = {'+919968225190'};

  // India only — the app fixes the country code to +91.
  String get _fullPhone => '+91${_phoneCtrl.text.trim()}';

  /// Step 1: validate the number and ask Firebase to send an SMS.
  Future<void> _sendCode() async {
    final digits = _phoneCtrl.text.trim();
    if (digits.length != 10) {
      setState(() => _error = 'Enter a valid 10-digit mobile number.');
      return;
    }
    if (_demoNumbers.contains(_fullPhone)) {
      setState(() { _demo = true; _otpSent = true; _busy = false; _error = null; });
      return;
    }
    setState(() { _busy = true; _error = null; });
    try {
      await FirebaseAuth.instance.verifyPhoneNumber(
        phoneNumber: _fullPhone,
        timeout: const Duration(seconds: 60),
        verificationCompleted: (cred) async => _signInWithCredential(cred),
        verificationFailed: (e) => setState(() { _busy = false; _error = e.message ?? 'Verification failed.'; }),
        codeSent: (id, _) => setState(() { _busy = false; _otpSent = true; _verificationId = id; }),
        codeAutoRetrievalTimeout: (id) => _verificationId = id,
      );
    } catch (e) {
      setState(() { _busy = false; _error = e.toString(); });
    }
  }

  /// Step 2: verify the entered 6-digit code.
  Future<void> _submitOtp(String code) async {
    setState(() { _busy = true; _error = null; });
    try {
      if (_demo) {
        final app = context.read<AppState>();
        final jwt = await app.api.testLogin(_fullPhone, code);
        await app.signIn(jwt, _fullPhone);
        _goHome();
        return;
      }
      final id = _verificationId;
      if (id == null) { setState(() => _busy = false); return; }
      final cred = PhoneAuthProvider.credential(verificationId: id, smsCode: code);
      await _signInWithCredential(cred);
    } catch (e) {
      if (mounted) setState(() { _busy = false; _error = 'That code is wrong. Please try again.'; });
    }
  }

  Future<void> _signInWithCredential(PhoneAuthCredential cred) async {
    final app = context.read<AppState>();
    try {
      final userCred = await FirebaseAuth.instance.signInWithCredential(cred);
      final idToken = await userCred.user!.getIdToken();
      final appJwt = await app.api.signInWithFirebase(idToken!);
      await app.signIn(appJwt, userCred.user!.phoneNumber ?? _fullPhone);
      _goHome();
    } catch (e) {
      if (mounted) setState(() { _busy = false; _error = e.toString(); });
    }
  }

  void _goHome() {
    if (!mounted) return;
    Navigator.of(context).pushReplacement(MaterialPageRoute(builder: (_) => const HomeScreen()));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter, end: Alignment.bottomCenter,
            colors: [Color(0xFFFFFDF9), AppColors.paper],
          ),
        ),
        child: SafeArea(
          child: Center(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(24),
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 430),
                child: Container(
                  padding: const EdgeInsets.fromLTRB(26, 30, 26, 26),
                  decoration: BoxDecoration(
                    color: AppColors.surface,
                    borderRadius: BorderRadius.circular(24),
                    border: Border.all(color: AppColors.line),
                    boxShadow: [BoxShadow(color: AppColors.ink.withOpacity(0.10), blurRadius: 44, offset: const Offset(0, 20))],
                  ),
                  child: _otpSent ? _otpView() : _phoneView(),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _header(String subtitle) => Column(
        children: [
          Image.asset('assets/icon/logo.png', height: 68),
          const SizedBox(height: 16),
          RichText(
            text: TextSpan(
              style: fraunces(fontSize: 30, fontWeight: FontWeight.w700, color: AppColors.ink, letterSpacing: -0.5),
              children: const [TextSpan(text: 'First '), TextSpan(text: 'Diner', style: TextStyle(color: AppColors.honeyDeep))],
            ),
          ),
          const SizedBox(height: 6),
          Text(subtitle, textAlign: TextAlign.center, style: const TextStyle(color: AppColors.inkSoft, fontSize: 14, height: 1.4)),
          const SizedBox(height: 26),
        ],
      );

  Widget _phoneView() {
    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _header('Sign in with your mobile number'),
        if (_error != null) _errorBox(_error!),
        const Text('Mobile number', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
        const SizedBox(height: 8),
        Row(
          children: [
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 16),
              decoration: BoxDecoration(
                color: AppColors.paper,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: AppColors.line),
              ),
              child: const Text('🇮🇳  +91', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 15)),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: TextField(
                controller: _phoneCtrl,
                keyboardType: TextInputType.number,
                autofocus: true,
                inputFormatters: [FilteringTextInputFormatter.digitsOnly, LengthLimitingTextInputFormatter(10)],
                onChanged: (_) { if (_error != null) setState(() => _error = null); },
                decoration: const InputDecoration(hintText: '98765 43210', counterText: ''),
                style: const TextStyle(fontSize: 16, letterSpacing: 0.5),
              ),
            ),
          ],
        ),
        const SizedBox(height: 22),
        SizedBox(
          width: double.infinity,
          child: ElevatedButton(
            onPressed: _busy ? null : _sendCode,
            child: Text(_busy ? 'Sending…' : 'Send code'),
          ),
        ),
      ],
    );
  }

  Widget _otpView() {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        _header('Enter the 6-digit code sent to\n+91 ${_phoneCtrl.text.trim()}'),
        if (_error != null) _errorBox(_error!),
        _OtpBoxes(enabled: !_busy, onCompleted: _submitOtp),
        const SizedBox(height: 18),
        if (_busy)
          const SizedBox(width: 22, height: 22, child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.honey))
        else
          TextButton(
            onPressed: () => setState(() { _otpSent = false; _demo = false; _verificationId = null; _error = null; }),
            child: const Text('Use a different number'),
          ),
      ],
    );
  }

  Widget _errorBox(String m) => Container(
        width: double.infinity,
        margin: const EdgeInsets.only(bottom: 18),
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(color: AppColors.clayBg, borderRadius: BorderRadius.circular(10)),
        child: Text(m, style: const TextStyle(color: AppColors.clay, fontSize: 13)),
      );
}

/// Six single-digit boxes with auto-advance, backspace, paste/SMS-autofill.
class _OtpBoxes extends StatefulWidget {
  final bool enabled;
  final void Function(String code) onCompleted;
  const _OtpBoxes({required this.enabled, required this.onCompleted});
  @override
  State<_OtpBoxes> createState() => _OtpBoxesState();
}

class _OtpBoxesState extends State<_OtpBoxes> {
  final List<TextEditingController> _c = List.generate(6, (_) => TextEditingController());
  final List<FocusNode> _f = List.generate(6, (_) => FocusNode());

  @override
  void dispose() {
    for (final c in _c) { c.dispose(); }
    for (final f in _f) { f.dispose(); }
    super.dispose();
  }

  String get _code => _c.map((c) => c.text).join();

  void _fill(String digits) {
    for (int k = 0; k < 6; k++) {
      _c[k].text = k < digits.length ? digits[k] : '';
    }
    final next = digits.length.clamp(0, 5);
    _f[next].requestFocus();
    setState(() {});
    if (digits.length >= 6) { _f[5].unfocus(); widget.onCompleted(_code); }
  }

  void _onChanged(int i, String v) {
    // Paste or SMS autofill: a box receives multiple digits — distribute them.
    if (v.length > 1) {
      final digits = v.replaceAll(RegExp(r'\D'), '');
      _fill(digits.length > 6 ? digits.substring(0, 6) : digits);
      return;
    }
    if (v.isNotEmpty && i < 5) _f[i + 1].requestFocus();
    if (_code.length == 6) { _f[i].unfocus(); widget.onCompleted(_code); }
    setState(() {});
  }

  @override
  Widget build(BuildContext context) {
    return AutofillGroup(
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: List.generate(6, (i) {
          final filled = _c[i].text.isNotEmpty;
          return SizedBox(
            width: 46,
            height: 58,
            child: TextField(
              controller: _c[i],
              focusNode: _f[i],
              enabled: widget.enabled,
              autofocus: i == 0,
              textAlign: TextAlign.center,
              keyboardType: TextInputType.number,
              textInputAction: i == 5 ? TextInputAction.done : TextInputAction.next,
              autofillHints: i == 0 ? const [AutofillHints.oneTimeCode] : null,
              inputFormatters: [FilteringTextInputFormatter.digitsOnly],
              style: fraunces(fontSize: 22, fontWeight: FontWeight.w600, color: AppColors.ink),
              decoration: InputDecoration(
                counterText: '',
                contentPadding: EdgeInsets.zero,
                filled: true,
                fillColor: filled ? AppColors.honey.withOpacity(0.08) : AppColors.paper,
                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: BorderSide(color: filled ? AppColors.honey : AppColors.line),
                ),
                focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: const BorderSide(color: AppColors.honey, width: 2),
                ),
              ),
              onChanged: (v) => _onChanged(i, v),
            ),
          );
        }),
      ),
    );
  }
}
