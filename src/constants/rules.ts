import { Rule } from '../store/trackerStore';

// These are used ONLY as a seed if the database tracker_rules table is empty.
// Once seeded, all rule management happens through the database.
export const CODE_OF_HONOR: Rule[] = [
  // GM (These will likely be handled mostly via custom buttons, but listed here for manual fallback)
  { id: 'gm_1', name: 'GM Breathing', category: 'GM', impact_type: 'POINTS', base_value: 5, iconName: 'Sun' },
  { id: 'gm_2', name: 'Sleepy after 4:59', category: 'GM', impact_type: 'POINTS', base_value: 10, iconName: 'Moon' },
  { id: 'gm_3', name: 'Sleepy every hr', category: 'GM', impact_type: 'POINTS', base_value: 5, iconName: 'Clock' },

  // GN
  { id: 'gn_1', name: 'Before 21:00', category: 'GN', impact_type: 'POINTS', base_value: -1, iconName: 'Moon' },
  { id: 'gn_2', name: 'Before 22:00', category: 'GN', impact_type: 'POINTS', base_value: -1, iconName: 'Moon' },
  { id: 'gn_3', name: 'Before 23:00', category: 'GN', impact_type: 'POINTS', base_value: -1, iconName: 'Moon' },

  // ONCE DAILY
  { id: 'gm_4', name: 'Baby Nap', category: 'ONCE_DAILY', impact_type: 'POINTS', base_value: 5, iconName: 'Bed', free_uses_per_week: 1, daily_max: 1, description: 'After 12 PM, 1x 30 minutes free' },
  { id: 'od_1', name: 'Bussy', category: 'ONCE_DAILY', impact_type: 'POINTS', base_value: 1, iconName: 'Cat', daily_max: 1 },
  { id: 'od_2', name: 'Addy (30min GM)', category: 'ONCE_DAILY', impact_type: 'POINTS', base_value: 3, iconName: 'Phone', daily_max: 1 },
  { id: 'od_3', name: 'Drugs', category: 'ONCE_DAILY', impact_type: 'POINTS', base_value: 5, iconName: 'Pill', daily_max: 1 },
  { id: 'od_4', name: 'Fastfood', category: 'ONCE_DAILY', impact_type: 'POINTS', base_value: 5, iconName: 'Pizza', daily_max: 1 },

  // REOCCURING
  { id: 're_1', name: 'Rawdog', category: 'REOCCURING', impact_type: 'POINTS', base_value: 1, iconName: 'Smartphone' },
  { id: 're_2', name: 'Bed Goon', category: 'REOCCURING', impact_type: 'POINTS', base_value: 2, iconName: 'Bed' },
  { id: 're_3', name: 'Sex Always', category: 'REOCCURING', impact_type: 'POINTS', base_value: 3, iconName: 'Flame' },
  { id: 're_5', name: '30 Minuten Entertainment', category: 'REOCCURING', impact_type: 'POINTS', base_value: 5, iconName: 'MonitorPlay' },
  { id: 're_6', name: 'Nudebabes', category: 'REOCCURING', impact_type: 'DEBT', base_value: 10, iconName: 'Lock' },
  { id: 're_7', name: 'Jerking Off', category: 'REOCCURING', impact_type: 'DEBT', base_value: 10, iconName: 'Hand' },

  // EXERCISE
  { id: 'ex_1', name: '100 Pushups', category: 'EXERCISE', impact_type: 'POINTS', base_value: -1, iconName: 'Dumbbell', time_modifier: 'DOUBLE_BEFORE_6AM' },
  { id: 'ex_2', name: '100 Legraises', category: 'EXERCISE', impact_type: 'POINTS', base_value: -1, iconName: 'Activity', time_modifier: 'DOUBLE_BEFORE_6AM' },
  { id: 'ex_3', name: '1km Jogging', category: 'EXERCISE', impact_type: 'POINTS', base_value: -1, iconName: 'Footprints', time_modifier: 'DOUBLE_BEFORE_6AM' },
  { id: 'ex_4', name: 'Gym / Boxing (20min)', category: 'EXERCISE', impact_type: 'POINTS', base_value: -1, iconName: 'Swords', time_modifier: 'DOUBLE_BEFORE_6AM' },
  { id: 'ex_5', name: 'Seilspringen (7min)', category: 'EXERCISE', impact_type: 'POINTS', base_value: -1, iconName: 'Activity', time_modifier: 'DOUBLE_BEFORE_6AM' },
  { id: 'ex_6', name: '50 Squatjumps', category: 'EXERCISE', impact_type: 'POINTS', base_value: -1, iconName: 'Activity', time_modifier: 'DOUBLE_BEFORE_6AM' },
  { id: 'ex_7', name: '50 Pull-ups', category: 'EXERCISE', impact_type: 'POINTS', base_value: -1, iconName: 'Activity', time_modifier: 'DOUBLE_BEFORE_6AM' },
  { id: 'ex_8', name: '50 Dips', category: 'EXERCISE', impact_type: 'POINTS', base_value: -1, iconName: 'Activity', time_modifier: 'DOUBLE_BEFORE_6AM' },

  // BUSINESS
  { id: 'sa_1', name: '10€ Revenue', category: 'BUSINESS', impact_type: 'POINTS', base_value: -1, iconName: 'Banknote', requires_input: true, input_step: 10 },
  { id: 'sa_2', name: 'First Pitch / 20 CC', category: 'BUSINESS', impact_type: 'POINTS', base_value: -2, iconName: 'PhoneCall' },
  { id: 'ma_2', name: 'Social Post', category: 'BUSINESS', impact_type: 'POINTS', base_value: -2, iconName: 'Camera', daily_max: 1 },

  // RECREATIONAL
  { id: 'rec_1', name: 'Cold Shower (2min)', category: 'RECREATIONAL', impact_type: 'POINTS', base_value: -2, iconName: 'ThermometerSnowflake' },
  { id: 'rec_2', name: '30 Min Coding GProject', category: 'RECREATIONAL', impact_type: 'POINTS', base_value: -1, iconName: 'Code', daily_max: 4 },
  { id: 'rec_3', name: '30 Min Learning', category: 'RECREATIONAL', impact_type: 'POINTS', base_value: -1, iconName: 'BookOpen', daily_max: 4 },
  { id: 'rec_4', name: '30 Min Podcast', category: 'RECREATIONAL', impact_type: 'POINTS', base_value: -1, iconName: 'Headphones', daily_max: 2 },
  { id: 'rec_5', name: '5 Min Chess Win', category: 'RECREATIONAL', impact_type: 'POINTS', base_value: -1, iconName: 'Gamepad2', daily_max: 1 },
  { id: 'ma_3', name: 'Chess', category: 'RECREATIONAL', impact_type: 'POINTS', base_value: -1, iconName: 'Gamepad2', daily_max: 1 },
  { id: 'rec_6', name: '15 Min Reading', category: 'RECREATIONAL', impact_type: 'POINTS', base_value: -2, iconName: 'Book', daily_max: 4 },
  { id: 'rec_7', name: '15 Min Meditation', category: 'RECREATIONAL', impact_type: 'POINTS', base_value: -2, iconName: 'Wind', daily_max: 4 },
  { id: 'rec_8', name: 'One Page Journal', category: 'RECREATIONAL', impact_type: 'POINTS', base_value: -2, iconName: 'PenTool', daily_max: 1 },

  // ABBAUEN
  { id: 'ab_3', name: 'Schulden bezahlen (5-10)', category: 'ABBAUEN', impact_type: 'POINTS', base_value: -1, iconName: 'Banknote', requires_input: true, input_step: 1 },
];
