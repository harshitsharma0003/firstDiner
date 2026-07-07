import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../config.dart';
import '../models.dart';
import '../state/app_state.dart';
import 'restaurant_detail.dart';
import 'my_bookings.dart';
import 'splash.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});
  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  final _searchCtrl = TextEditingController();
  List<Restaurant> _restaurants = [];
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load({String query = ''}) async {
    setState(() { _loading = true; _error = null; });
    try {
      final api = context.read<AppState>().api;
      // One box searches both name and location — send the term to both filters
      // and merge, so "delhi" or "spice" both work.
      final byName = await api.searchRestaurants(q: query);
      final byLoc = query.isEmpty ? <Restaurant>[] : await api.searchRestaurants(location: query);
      final merged = {for (final r in [...byName, ...byLoc]) r.id: r}.values.toList();
      setState(() => _restaurants = merged);
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: RichText(
          text: TextSpan(
            style: fraunces(fontSize: 21, fontWeight: FontWeight.w700, color: AppColors.ink),
            children: const [TextSpan(text: 'first'), TextSpan(text: 'Diner', style: TextStyle(color: AppColors.honeyDeep))],
          ),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.receipt_long_outlined),
            tooltip: 'My bookings',
            onPressed: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const MyBookingsScreen())),
          ),
          IconButton(
            icon: const Icon(Icons.logout),
            tooltip: 'Sign out',
            onPressed: () async {
              await context.read<AppState>().signOut();
              if (!mounted) return;
              Navigator.of(context).pushAndRemoveUntil(
                  MaterialPageRoute(builder: (_) => const SplashScreen()), (_) => false);
            },
          ),
        ],
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 12),
            child: TextField(
              controller: _searchCtrl,
              textInputAction: TextInputAction.search,
              onSubmitted: (v) => _load(query: v.trim()),
              decoration: InputDecoration(
                hintText: 'Search by restaurant or location',
                prefixIcon: const Icon(Icons.search),
                suffixIcon: _searchCtrl.text.isEmpty
                    ? null
                    : IconButton(
                        icon: const Icon(Icons.clear),
                        onPressed: () { _searchCtrl.clear(); _load(); },
                      ),
              ),
            ),
          ),
          Expanded(child: _buildList()),
        ],
      ),
    );
  }

  Widget _buildList() {
    if (_loading) return const Center(child: CircularProgressIndicator(color: AppColors.honey));
    if (_error != null) return Center(child: Text(_error!, style: const TextStyle(color: AppColors.clay)));
    if (_restaurants.isEmpty) {
      return const Center(child: Text('No restaurants found. Try another search.', style: TextStyle(color: AppColors.inkSoft)));
    }
    return RefreshIndicator(
      onRefresh: () => _load(query: _searchCtrl.text.trim()),
      child: ListView.builder(
        padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
        itemCount: _restaurants.length,
        itemBuilder: (_, i) => _RestaurantCard(restaurant: _restaurants[i]),
      ),
    );
  }
}

class _RestaurantCard extends StatelessWidget {
  final Restaurant restaurant;
  const _RestaurantCard({required this.restaurant});

  @override
  Widget build(BuildContext context) {
    return InkWell(
      borderRadius: BorderRadius.circular(18),
      onTap: () => Navigator.of(context).push(
          MaterialPageRoute(builder: (_) => RestaurantDetailScreen(restaurant: restaurant))),
      child: Container(
        margin: const EdgeInsets.only(bottom: 16),
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(18),
          border: Border.all(color: AppColors.line),
          boxShadow: [
            BoxShadow(color: AppColors.ink.withOpacity(0.06), blurRadius: 24, offset: const Offset(0, 10)),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            ClipRRect(
              borderRadius: const BorderRadius.vertical(top: Radius.circular(18)),
              child: Stack(
                children: [
                  restaurant.images.isNotEmpty
                      ? Image.network(restaurant.images.first,
                          height: 150, width: double.infinity, fit: BoxFit.cover,
                          errorBuilder: (_, __, ___) => _imageFallback())
                      : _imageFallback(),
                  Positioned(
                    top: 12, left: 12,
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 11, vertical: 6),
                      decoration: BoxDecoration(
                        gradient: const LinearGradient(colors: [AppColors.honey, AppColors.honeyDeep]),
                        borderRadius: BorderRadius.circular(999),
                        boxShadow: [BoxShadow(color: AppColors.honeyDeep.withOpacity(0.45), blurRadius: 8, offset: const Offset(0, 2))],
                      ),
                      child: Text('${restaurant.discountPercent}% off food',
                          style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700, fontSize: 12)),
                    ),
                  ),
                ],
              ),
            ),
            Padding(
              padding: const EdgeInsets.all(14),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(restaurant.name, style: fraunces(fontSize: 19, fontWeight: FontWeight.w600)),
                  const SizedBox(height: 2),
                  Row(children: [
                    const Icon(Icons.place_outlined, size: 15, color: AppColors.inkSoft),
                    const SizedBox(width: 4),
                    Expanded(child: Text(
                      [restaurant.address, restaurant.city].where((s) => s.isNotEmpty).join(', '),
                      style: const TextStyle(color: AppColors.inkSoft, fontSize: 13),
                      overflow: TextOverflow.ellipsis,
                    )),
                  ]),
                  if (restaurant.description.isNotEmpty) ...[
                    const SizedBox(height: 6),
                    Text(restaurant.description, style: const TextStyle(color: AppColors.inkSoft, fontSize: 13)),
                  ],
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _imageFallback() => Container(
        height: 150, width: double.infinity, color: AppColors.plumWash,
        child: const Icon(Icons.restaurant, color: AppColors.inkSoft, size: 40),
      );
}
