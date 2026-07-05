import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import '../config.dart';
import '../models.dart';
import '../state/app_state.dart';

class BookingScreen extends StatefulWidget {
  final Restaurant restaurant;
  final String date;
  final String timeSlot;
  final int discountPercent;
  const BookingScreen({
    super.key,
    required this.restaurant,
    required this.date,
    required this.timeSlot,
    required this.discountPercent,
  });
  @override
  State<BookingScreen> createState() => _BookingScreenState();
}

class _BookingScreenState extends State<BookingScreen> {
  final _nameCtrl = TextEditingController();
  final _phoneCtrl = TextEditingController();
  int _partySize = 2;
  bool _accepted = false;
  bool _busy = false;
  String? _error;

  bool get _canBook =>
      _nameCtrl.text.trim().isNotEmpty && _phoneCtrl.text.trim().isNotEmpty && _accepted && !_busy;

  Future<void> _confirm() async {
    setState(() { _busy = true; _error = null; });
    try {
      await context.read<AppState>().api.book(
            restaurantId: widget.restaurant.id,
            date: widget.date,
            timeSlot: widget.timeSlot,
            partySize: _partySize,
            bookingName: _nameCtrl.text.trim(),
            contactNumber: _phoneCtrl.text.trim(),
          );
      if (!mounted) return;
      _showSuccess();
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      setState(() => _busy = false);
    }
  }

  void _showSuccess() {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (_) => AlertDialog(
        backgroundColor: AppColors.surface,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const CircleAvatar(radius: 28, backgroundColor: AppColors.sageBg,
                child: Icon(Icons.check, color: AppColors.sage, size: 30)),
            const SizedBox(height: 16),
            const Text('Table booked', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w700)),
            const SizedBox(height: 6),
            Text(
              '${widget.restaurant.name} · ${DateFormat('d MMM').format(DateTime.parse(widget.date))} at ${widget.timeSlot}\nfor $_partySize ${_partySize == 1 ? 'guest' : 'guests'}',
              textAlign: TextAlign.center,
              style: const TextStyle(color: AppColors.inkSoft),
            ),
          ],
        ),
        actions: [
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: () {
                Navigator.of(context).pop(); // close dialog
                Navigator.of(context).pop(); // back to restaurant detail
              },
              child: const Text('Done'),
            ),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final dateLabel = DateFormat('EEE, d MMM yyyy').format(DateTime.parse(widget.date));
    return Scaffold(
      appBar: AppBar(title: const Text('Confirm booking')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Summary
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: AppColors.surface,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: AppColors.line),
            ),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(widget.restaurant.name, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
              const SizedBox(height: 6),
              _summaryRow(Icons.calendar_today_outlined, dateLabel),
              _summaryRow(Icons.schedule, '${widget.timeSlot} · 1 hour'),
              _summaryRow(Icons.local_offer_outlined, '${widget.discountPercent}% off food'),
            ]),
          ),
          const SizedBox(height: 20),

          if (_error != null)
            Container(
              width: double.infinity,
              margin: const EdgeInsets.only(bottom: 16),
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(color: AppColors.clayBg, borderRadius: BorderRadius.circular(8)),
              child: Text(_error!, style: const TextStyle(color: AppColors.clay)),
            ),

          const Text('How many guests?', style: TextStyle(fontWeight: FontWeight.w700)),
          const SizedBox(height: 4),
          const Text('Up to 4 per booking.', style: TextStyle(color: AppColors.inkSoft, fontSize: 13)),
          const SizedBox(height: 10),
          Row(
            children: List.generate(4, (i) {
              final n = i + 1;
              final selected = _partySize == n;
              return Expanded(
                child: GestureDetector(
                  onTap: () => setState(() => _partySize = n),
                  child: Container(
                    margin: EdgeInsets.only(right: i < 3 ? 8 : 0),
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    decoration: BoxDecoration(
                      color: selected ? AppColors.ink : AppColors.surface,
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: selected ? AppColors.ink : AppColors.line),
                    ),
                    child: Text('$n', textAlign: TextAlign.center,
                        style: TextStyle(fontWeight: FontWeight.w700, fontSize: 16,
                            color: selected ? Colors.white : AppColors.ink)),
                  ),
                ),
              );
            }),
          ),
          const SizedBox(height: 20),

          const Text('Booking name', style: TextStyle(fontWeight: FontWeight.w700)),
          const SizedBox(height: 8),
          TextField(controller: _nameCtrl, onChanged: (_) => setState(() {}),
              decoration: const InputDecoration(hintText: 'Name for the reservation')),
          const SizedBox(height: 16),
          const Text('Contact number', style: TextStyle(fontWeight: FontWeight.w700)),
          const SizedBox(height: 8),
          TextField(controller: _phoneCtrl, keyboardType: TextInputType.phone, onChanged: (_) => setState(() {}),
              decoration: const InputDecoration(hintText: 'Mobile number')),
          const SizedBox(height: 20),

          // Terms
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(color: AppColors.plumWash, borderRadius: BorderRadius.circular(12)),
            child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Checkbox(
                value: _accepted,
                activeColor: AppColors.honey,
                onChanged: (v) => setState(() => _accepted = v ?? false),
              ),
              Expanded(
                child: Padding(
                  padding: const EdgeInsets.only(top: 12),
                  child: Text(
                    'I agree that each guest orders one drink at full price. With that, all food is ${widget.discountPercent}% off. Bookings are for up to 4 guests and subject to availability.',
                    style: const TextStyle(fontSize: 13, color: AppColors.ink, height: 1.4),
                  ),
                ),
              ),
            ]),
          ),
          const SizedBox(height: 20),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: _canBook ? _confirm : null,
              child: Text(_busy ? 'Booking…' : 'Confirm booking'),
            ),
          ),
        ],
      ),
    );
  }

  Widget _summaryRow(IconData icon, String text) => Padding(
        padding: const EdgeInsets.only(top: 6),
        child: Row(children: [
          Icon(icon, size: 16, color: AppColors.inkSoft),
          const SizedBox(width: 8),
          Text(text, style: const TextStyle(color: AppColors.ink)),
        ]),
      );
}
