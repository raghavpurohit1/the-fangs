typedef Json = Map<String, dynamic>;

Json asMap(dynamic value) => value is Map
    ? {
        for (final entry in value.entries)
          if (entry.key is String) entry.key as String: entry.value,
      }
    : <String, dynamic>{};

List<Json> asList(dynamic value) => value is List
    ? value.whereType<Map>().map(asMap).toList(growable: false)
    : <Json>[];

String stringValue(dynamic value, [String fallback = '']) =>
    value is String ? value : fallback;

const careerStages = <String>[
  'Exploring tech',
  'Student or recent graduate',
  'Building skills',
  'Seeking first tech role',
  'Early career professional',
  'Career transition',
  'Returning to work',
  'Mid-career professional',
  'Technical specialist',
  'Growing as a leader',
  'Senior leader or executive',
  'Entrepreneur or founder',
];

const careerStageOptions = <String, String>{
  'Exploring tech': 'Exploring tech',
  'Student or recent graduate': 'Student or recent graduate',
  'Building skills': 'Building skills',
  'Seeking first tech role': 'Seeking first tech role',
  'Early career professional': 'Early career professional',
  'Career transition': 'Career transition',
  'Returning to work': 'Returning to work',
  'Mid-career professional': 'Mid-career professional',
  'Technical specialist': 'Technical specialist',
  'Growing as a leader': 'Growing as a leader',
  'Senior leader or executive': 'Senior leader or executive',
  'Entrepreneur or founder': 'Entrepreneur or founder',
};

String membershipPrice(Map<String, dynamic>? plan) {
  if (plan == null ||
      plan['billingPeriod'] == null ||
      plan['billingPeriod'] == 'free')
    return 'Free';
  final price = (plan['priceAmount'] as num? ?? 0).toStringAsFixed(2);
  final period = plan['billingPeriod'] == 'monthly'
      ? ' / month'
      : plan['billingPeriod'] == 'yearly'
      ? ' / year'
      : ' one-time';
  return '${plan['currency'] ?? 'USD'} $price$period';
}
