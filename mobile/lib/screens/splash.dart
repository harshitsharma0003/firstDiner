import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../config.dart';
import '../state/app_state.dart';
import 'login.dart';
import 'home.dart';

class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});
  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen> {
  @override
  void initState() {
    super.initState();
    _boot();
  }

  Future<void> _boot() async {
    final app = context.read<AppState>();
    await app.load();
    // Brief splash so the banner is seen, then route by auth state.
    await Future.delayed(const Duration(milliseconds: 1400));
    if (!mounted) return;
    Navigator.of(context).pushReplacement(MaterialPageRoute(
      builder: (_) => app.isLoggedIn ? const HomeScreen() : const LoginScreen(),
    ));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [AppColors.ink, Color(0xFF463450)],
          ),
        ),
        child: SafeArea(
          child: Padding(
            padding: const EdgeInsets.all(28),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Spacer(),
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(24),
                    boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.28), blurRadius: 28, offset: const Offset(0, 10))],
                  ),
                  child: Image.asset('assets/icon/logo.png', height: 76),
                ),
                const SizedBox(height: 26),
                RichText(
                  text: TextSpan(
                    style: fraunces(fontSize: 42, fontWeight: FontWeight.w700, color: Colors.white, letterSpacing: -0.5),
                    children: const [
                      TextSpan(text: 'First '),
                      TextSpan(text: 'Diner', style: TextStyle(color: AppColors.honey)),
                    ],
                  ),
                ),
                const SizedBox(height: 28),
                // Promotional banner — generic, professional.
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 20),
                  decoration: BoxDecoration(
                    color: Colors.white.withOpacity(0.08),
                    borderRadius: BorderRadius.circular(18),
                    border: Border.all(color: Colors.white.withOpacity(0.12)),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('FAMILY OUTINGS, FOR LESS',
                          style: TextStyle(color: AppColors.honey, fontSize: 12, fontWeight: FontWeight.w700, letterSpacing: 1.5)),
                      const SizedBox(height: 8),
                      Text('Up to 60% off the food.\nEvery weeknight.',
                          style: fraunces(color: Colors.white, fontSize: 24, fontWeight: FontWeight.w600, height: 1.2)),
                      const SizedBox(height: 8),
                      Text('Book a table, enjoy one drink, save on the rest.',
                          style: TextStyle(color: Colors.white.withOpacity(0.7), fontSize: 14)),
                    ],
                  ),
                ),
                const Spacer(),
                const Center(
                  child: SizedBox(
                    width: 22, height: 22,
                    child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.honey),
                  ),
                ),
                const SizedBox(height: 30),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
