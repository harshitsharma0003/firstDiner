import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import '../config.dart';
import '../models.dart';
import '../state/app_state.dart';

class MyBookingsScreen extends StatefulWidget {
  const MyBookingsScreen({super.key});
  @override
  State<MyBookingsScreen> createState() => _MyBookingsScreenState();
}

class _MyBookingsScreenState extends State<MyBookingsScreen> {
  List<Booking> _bookings = [];
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() { _loading = true; _error = null; });
    try {
      final b = await context.read<AppState>().api.myBookings();
      setState(() => _bookings = b);
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      setState(() => _loading = false);
    }
  }

  Future<void> _cancel(Booking b) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('Cancel this booking?'),
        content: Text('${b.restaurantName} on ${b.date} at ${b.timeSlot}.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Keep it')),
          TextButton(onPressed: () => Navigator.pop(context, true),
              child: const Text('Cancel booking', style: TextStyle(color: AppColors.clay))),
        ],
      ),
    );
    if (confirm == true) {
      try {
        await context.read<AppState>().api.cancel(b.id);
        _load();
      } catch (e) {
        setState(() => _error = e.toString());
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('My bookings')),
      body: _loading
          ? const Center(child: CircularProgressIndicator(color: AppColors.honey))
          : _error != null
              ? Center(child: Text(_error!, style: const TextStyle(color: AppColors.clay)))
              : _bookings.isEmpty
                  ? const Center(child: Text('No bookings yet.', style: TextStyle(color: AppColors.inkSoft)))
                  : RefreshIndicator(
                      onRefresh: _load,
                      child: ListView.builder(
                        padding: const EdgeInsets.all(16),
                        itemCount: _bookings.length,
                        itemBuilder: (_, i) => _bookingTile(_bookings[i]),
                      ),
                    ),
    );
  }

  Widget _bookingTile(Booking b) {
    final cancelled = b.status == 'cancelled';
    final dateLabel = DateFormat('EEE, d MMM').format(DateTime.parse(b.date));
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(14),
        border: Border(left: BorderSide(color: cancelled ? AppColors.clay : AppColors.honey, width: 4)),
        boxShadow: const [BoxShadow(color: Color(0x0A2A2230), blurRadius: 12, offset: Offset(0, 4))],
      ),
      child: Row(
        children: [
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(b.timeSlot, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w700)),
              Text(dateLabel, style: const TextStyle(color: AppColors.inkSoft, fontSize: 12)),
            ],
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(b.restaurantName, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
                const SizedBox(height: 2),
                Text('${b.partySize} ${b.partySize == 1 ? 'guest' : 'guests'} · ${b.discountApplied}% off',
                    style: const TextStyle(color: AppColors.inkSoft, fontSize: 13)),
                if (cancelled)
                  const Padding(
                    padding: EdgeInsets.only(top: 4),
                    child: Text('Cancelled', style: TextStyle(color: AppColors.clay, fontWeight: FontWeight.w700, fontSize: 12)),
                  ),
              ],
            ),
          ),
          if (!cancelled)
            TextButton(onPressed: () => _cancel(b), child: const Text('Cancel', style: TextStyle(color: AppColors.clay))),
        ],
      ),
    );
  }
}
