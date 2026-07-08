import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import '../config.dart';
import '../models.dart';
import '../state/app_state.dart';
import 'booking.dart';

class RestaurantDetailScreen extends StatefulWidget {
  final Restaurant restaurant;
  const RestaurantDetailScreen({super.key, required this.restaurant});
  @override
  State<RestaurantDetailScreen> createState() => _RestaurantDetailScreenState();
}

class _RestaurantDetailScreenState extends State<RestaurantDetailScreen> {
  DateTime _date = DateTime.now();
  DayAvailability? _availability;
  bool _loading = true;
  String? _error;

  String get _dateStr => DateFormat('yyyy-MM-dd').format(_date);

  @override
  void initState() {
    super.initState();
    _loadAvailability();
  }

  Future<void> _loadAvailability() async {
    setState(() { _loading = true; _error = null; });
    try {
      final a = await context.read<AppState>().api.availability(widget.restaurant.id, _dateStr);
      setState(() => _availability = a);
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      setState(() => _loading = false);
    }
  }

  Future<void> _pickDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _date,
      firstDate: DateTime.now(),
      lastDate: DateTime.now().add(const Duration(days: 60)),
    );
    if (picked != null) {
      setState(() => _date = picked);
      _loadAvailability();
    }
  }

  @override
  Widget build(BuildContext context) {
    final r = widget.restaurant;
    return Scaffold(
      appBar: AppBar(title: Text(r.name)),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          if (r.images.isNotEmpty)
            ClipRRect(
              borderRadius: BorderRadius.circular(16),
              child: Image.network(r.images.first, height: 180, width: double.infinity, fit: BoxFit.cover,
                  errorBuilder: (_, __, ___) => const SizedBox.shrink()),
            ),
          const SizedBox(height: 16),
          Align(
            alignment: Alignment.centerLeft,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 13, vertical: 7),
              decoration: BoxDecoration(
                gradient: const LinearGradient(colors: [AppColors.honey, AppColors.honeyDeep]),
                borderRadius: BorderRadius.circular(999),
                boxShadow: [BoxShadow(color: AppColors.honeyDeep.withOpacity(0.4), blurRadius: 8, offset: const Offset(0, 2))],
              ),
              child: Text('${r.discountPercent}% off all food',
                  style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700, fontSize: 13)),
            ),
          ),
          const SizedBox(height: 14),
          Text(r.name, style: fraunces(fontSize: 26, fontWeight: FontWeight.w600)),
          const SizedBox(height: 4),
          Text([r.address, r.city].where((s) => s.isNotEmpty).join(', '),
              style: const TextStyle(color: AppColors.inkSoft)),
          if (r.description.isNotEmpty) ...[
            const SizedBox(height: 10),
            Text(r.description, style: const TextStyle(color: AppColors.inkSoft, height: 1.4)),
          ],
          const Divider(height: 36, color: AppColors.line),

          // Date selector
          Text('Pick a date', style: fraunces(fontWeight: FontWeight.w600, fontSize: 18)),
          const SizedBox(height: 10),
          InkWell(
            onTap: _pickDate,
            borderRadius: BorderRadius.circular(10),
            child: Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: AppColors.surface,
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: AppColors.line),
              ),
              child: Row(children: [
                const Icon(Icons.calendar_today_outlined, size: 18, color: AppColors.honeyDeep),
                const SizedBox(width: 10),
                Text(DateFormat('EEEE, d MMMM yyyy').format(_date),
                    style: const TextStyle(fontWeight: FontWeight.w600)),
                const Spacer(),
                const Icon(Icons.expand_more),
              ]),
            ),
          ),
          const SizedBox(height: 20),

          Text('Available times', style: fraunces(fontWeight: FontWeight.w600, fontSize: 18)),
          const SizedBox(height: 4),
          const Text('Each booking holds one table for 1 hour, up to 4 guests.',
              style: TextStyle(color: AppColors.inkSoft, fontSize: 13)),
          const SizedBox(height: 14),
          _buildSlots(),
        ],
      ),
    );
  }

  Widget _buildSlots() {
    if (_loading) return const Padding(padding: EdgeInsets.all(24), child: Center(child: CircularProgressIndicator(color: AppColors.honey)));
    if (_error != null) return Text(_error!, style: const TextStyle(color: AppColors.clay));

    final a = _availability!;
    // Whole day off -> the "No tables available" state you specified.
    if (!a.dayActive) return _emptyState('No tables available', 'The offer isn’t running on this day. Try another date.');
    if (a.slots.isEmpty) return _emptyState('No times set', 'This restaurant hasn’t opened any slots for this day.');

    return Wrap(
      spacing: 10,
      runSpacing: 10,
      children: a.slots.map((slot) {
        final available = slot.isAvailable;
        return GestureDetector(
          onTap: available ? () => _goToBooking(slot) : null,
          child: Container(
            width: 104,
            padding: const EdgeInsets.symmetric(vertical: 14),
            decoration: BoxDecoration(
              color: available ? AppColors.sageBg : AppColors.clayBg,
              borderRadius: BorderRadius.circular(12),
              boxShadow: available ? [BoxShadow(color: AppColors.sage.withOpacity(0.15), blurRadius: 10, offset: const Offset(0, 4))] : null,
            ),
            child: Column(children: [
              Text(slot.timeSlot, style: fraunces(fontSize: 18, fontWeight: FontWeight.w600, color: AppColors.ink)),
              const SizedBox(height: 2),
              Text(
                available ? '${slot.remaining} table${slot.remaining == 1 ? '' : 's'} left' : 'Tables not available',
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 11.5,
                  fontWeight: FontWeight.w600,
                  color: available ? AppColors.sage : AppColors.clay,
                ),
              ),
            ]),
          ),
        );
      }).toList(),
    );
  }

  void _goToBooking(SlotAvailability slot) {
    Navigator.of(context).push(MaterialPageRoute(
      builder: (_) => BookingScreen(
        restaurant: widget.restaurant,
        date: _dateStr,
        timeSlot: slot.timeSlot,
        discountPercent: _availability!.discountPercent,
      ),
    )).then((_) => _loadAvailability()); // refresh counts after returning
  }

  Widget _emptyState(String title, String body) => Container(
        width: double.infinity,
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(color: AppColors.clayBg, borderRadius: BorderRadius.circular(14)),
        child: Column(children: [
          const Icon(Icons.event_busy, color: AppColors.clay, size: 32),
          const SizedBox(height: 8),
          Text(title, style: const TextStyle(fontWeight: FontWeight.w700, color: AppColors.clay, fontSize: 16)),
          const SizedBox(height: 4),
          Text(body, textAlign: TextAlign.center, style: const TextStyle(color: AppColors.clay, fontSize: 13)),
        ]),
      );
}
