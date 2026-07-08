import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import '../config.dart';
import '../state/app_state.dart';

class NotificationsScreen extends StatefulWidget {
  const NotificationsScreen({super.key});
  @override
  State<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends State<NotificationsScreen> {
  List<dynamic> _items = [];
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
      final api = context.read<AppState>().api;
      final data = await api.notifications();
      setState(() => _items = (data['notifications'] as List?) ?? []);
      await api.markNotificationsRead(); // opening the screen clears the badge
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  String _timeAgo(int? ms) {
    if (ms == null) return '';
    final d = DateTime.fromMillisecondsSinceEpoch(ms);
    final diff = DateTime.now().difference(d);
    if (diff.inMinutes < 1) return 'just now';
    if (diff.inMinutes < 60) return '${diff.inMinutes}m ago';
    if (diff.inHours < 24) return '${diff.inHours}h ago';
    return DateFormat('d MMM').format(d);
  }

  IconData _iconFor(String? type) {
    switch (type) {
      case 'new_booking':
        return Icons.event_available;
      case 'booking_confirmed':
        return Icons.check_circle_outline;
      default:
        return Icons.notifications_none;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Notifications')),
      body: _loading
          ? const Center(child: CircularProgressIndicator(color: AppColors.honey))
          : _error != null
              ? Center(child: Text(_error!, style: const TextStyle(color: AppColors.clay)))
              : _items.isEmpty
                  ? _empty()
                  : RefreshIndicator(
                      onRefresh: _load,
                      child: ListView.separated(
                        padding: const EdgeInsets.all(16),
                        itemCount: _items.length,
                        separatorBuilder: (_, __) => const SizedBox(height: 10),
                        itemBuilder: (_, i) => _tile(_items[i] as Map<String, dynamic>),
                      ),
                    ),
    );
  }

  Widget _tile(Map<String, dynamic> n) {
    final read = n['read'] == true;
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: read ? AppColors.surface : AppColors.honey.withOpacity(0.05),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: read ? AppColors.line : AppColors.honey.withOpacity(0.35)),
        boxShadow: [BoxShadow(color: AppColors.ink.withOpacity(0.05), blurRadius: 14, offset: const Offset(0, 5))],
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 42,
            height: 42,
            decoration: BoxDecoration(color: AppColors.honey.withOpacity(0.12), borderRadius: BorderRadius.circular(12)),
            child: Icon(_iconFor(n['type'] as String?), color: AppColors.honeyDeep, size: 22),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(children: [
                  Expanded(child: Text(n['title']?.toString() ?? '', style: fraunces(fontSize: 16, fontWeight: FontWeight.w600, color: AppColors.ink))),
                  if (!read) Container(width: 8, height: 8, decoration: const BoxDecoration(color: AppColors.honey, shape: BoxShape.circle)),
                ]),
                const SizedBox(height: 3),
                Text(n['body']?.toString() ?? '', style: const TextStyle(color: AppColors.inkSoft, fontSize: 13, height: 1.35)),
                const SizedBox(height: 4),
                Text(_timeAgo((n['createdAt'] as num?)?.toInt()), style: const TextStyle(color: AppColors.inkSoft, fontSize: 11)),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _empty() => Center(
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          Icon(Icons.notifications_none, size: 46, color: AppColors.inkSoft.withOpacity(0.5)),
          const SizedBox(height: 12),
          const Text('No notifications yet', style: TextStyle(color: AppColors.inkSoft)),
        ]),
      );
}
