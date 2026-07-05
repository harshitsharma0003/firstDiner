class Restaurant {
  final String id;
  final String name;
  final String description;
  final String city;
  final String address;
  final List<String> images;
  final int discountPercent;
  final List<String> timeSlots;

  Restaurant({
    required this.id,
    required this.name,
    required this.description,
    required this.city,
    required this.address,
    required this.images,
    required this.discountPercent,
    required this.timeSlots,
  });

  factory Restaurant.fromJson(Map<String, dynamic> j) {
    final loc = (j['location'] ?? {}) as Map<String, dynamic>;
    return Restaurant(
      id: j['id'],
      name: j['name'] ?? '',
      description: j['description'] ?? '',
      city: loc['city'] ?? '',
      address: loc['address'] ?? '',
      images: List<String>.from(j['images'] ?? const []),
      discountPercent: (j['discountPercent'] ?? 50) as int,
      timeSlots: List<String>.from(j['timeSlots'] ?? const []),
    );
  }
}

class SlotAvailability {
  final String timeSlot;
  final int remaining;
  final String status; // available | full
  SlotAvailability({required this.timeSlot, required this.remaining, required this.status});

  factory SlotAvailability.fromJson(Map<String, dynamic> j) => SlotAvailability(
        timeSlot: j['timeSlot'],
        remaining: j['remaining'] ?? 0,
        status: j['status'] ?? 'full',
      );
  bool get isAvailable => status == 'available';
}

class DayAvailability {
  final bool dayActive;
  final List<SlotAvailability> slots;
  final int discountPercent;
  DayAvailability({required this.dayActive, required this.slots, required this.discountPercent});

  factory DayAvailability.fromJson(Map<String, dynamic> j) => DayAvailability(
        dayActive: j['dayActive'] ?? false,
        discountPercent: j['discountPercent'] ?? 50,
        slots: (j['slots'] as List? ?? [])
            .map((s) => SlotAvailability.fromJson(s as Map<String, dynamic>))
            .toList(),
      );
}

class Booking {
  final String id;
  final String restaurantName;
  final String date;
  final String timeSlot;
  final int partySize;
  final String status;
  final int discountApplied;

  Booking({
    required this.id,
    required this.restaurantName,
    required this.date,
    required this.timeSlot,
    required this.partySize,
    required this.status,
    required this.discountApplied,
  });

  factory Booking.fromJson(Map<String, dynamic> j) => Booking(
        id: j['id'],
        restaurantName: j['restaurantName'] ?? 'Restaurant',
        date: j['date'] ?? '',
        timeSlot: j['timeSlot'] ?? '',
        partySize: j['partySize'] ?? 1,
        status: j['status'] ?? 'confirmed',
        discountApplied: j['discountApplied'] ?? 50,
      );
}
