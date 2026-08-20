-- Penalty Tiers
INSERT INTO g_penalty_tiers (min_diff, max_diff, penalty_amount) VALUES
(1, 9, 5.00),
(10, 19, 10.00),
(20, 9999, 15.00);

-- System Rules (GM)
INSERT INTO g_rules (name, category, system_id, config) VALUES
('GM', 'MANDATORY', 'sys_gm', '{"max_penalty": 25}');

-- GN Rules
INSERT INTO g_rules (name, category, system_id, points) VALUES
('GN vor 21:00', 'ONCE_DAILY', 'sys_gn_21', -3),
('GN vor 22:00', 'ONCE_DAILY', 'sys_gn_22', -2),
('GN vor 23:00', 'ONCE_DAILY', 'sys_gn_23', -1);

-- Reoccurring Sünden
INSERT INTO g_rules (name, category, points, cap_type, cap_value) VALUES
('Rawdog', 'REOCCURRING', 1, 'NONE', null),
('Bed Goon', 'REOCCURRING', 2, 'NONE', null),
('Sex', 'REOCCURRING', 3, 'NONE', null),
('Entertainment', 'REOCCURRING', 5, 'NONE', null), -- 1 free movie pro woche fehlt hier im seed (als extra check)
('Nap', 'REOCCURRING', 5, 'NONE', null);

-- MONEY (Kein Punktwert, direkt auf Schulden)
INSERT INTO g_rules (name, category, points, money_value) VALUES
('Nudebabes.com', 'MONEY', 0, 10.00),
('Jerking off', 'MONEY', 0, 10.00);

-- ONCE DAILY Sünden
INSERT INTO g_rules (name, category, points) VALUES
('Bussy', 'ONCE_DAILY', 1),
('Addy', 'ONCE_DAILY', 3),
('Drugs', 'ONCE_DAILY', 5),
('Fastfood', 'ONCE_DAILY', 5);

-- Mandatory 
INSERT INTO g_rules (name, category, system_id, config) VALUES
('M1 - Exercise Minimum', 'MANDATORY', 'sys_m1', '{"min_points": 3, "penalty": 3, "exercise_system_ids": ["sys_ex_pushups", "sys_ex_situps", "sys_ex_run"]}'),
('M2 - Social Post', 'MANDATORY', 'sys_m2_social', '{"penalty": 2}'),
('M3 - Chess', 'MANDATORY', 'sys_m3_chess', '{"penalty": 1}');

-- Exercise (Punkte sind hier negativ, weil Leistung)
INSERT INTO g_rules (name, category, system_id, points, is_exercise, unit_size) VALUES
('Pushups', 'EXERCISE', 'sys_ex_pushups', -1, true, '100'),
('Situps/Legraises', 'EXERCISE', 'sys_ex_situps', -1, true, '100'),
('Jogging', 'EXERCISE', 'sys_ex_run', -1, true, '1'),
('Gym/Boxing/BB', 'EXERCISE', 'sys_ex_gym', -1, true, '20'),
('Seilspringen', 'EXERCISE', 'sys_ex_rope', -1, true, '7'),
('Squatjumps', 'EXERCISE', 'sys_ex_squat', -1, true, '50'),
('Pull-ups', 'EXERCISE', 'sys_ex_pull', -1, true, '50'),
('Dips', 'EXERCISE', 'sys_ex_dips', -1, true, '50');

-- Recreational
INSERT INTO g_rules (name, category, points, cap_type, cap_value, unit_size) VALUES
('Cold Shower', 'RECREATIONAL', -2, 'DAILY', -2, '2'),
('Coding G Project', 'RECREATIONAL', -1, 'DAILY', -4, '30'),
('Learning', 'RECREATIONAL', -1, 'DAILY', -4, '30'),
('Podcast', 'RECREATIONAL', -1, 'DAILY', -2, '30'),
('Reading', 'RECREATIONAL', -2, 'DAILY', -8, '15'),
('Meditation', 'RECREATIONAL', -2, 'DAILY', -8, '15'),
('Journal', 'RECREATIONAL', -2, 'DAILY', -2, '1');

-- Sales
INSERT INTO g_rules (name, category, system_id, points, unit_size) VALUES
('Sales Revenue', 'SALES', 'sys_sales_revenue', -1, '10'),
('Pitch / 20 Calls', 'SALES', 'sys_sales_pitch', -2, '1');

-- Debt Reduction
INSERT INTO g_rules (name, category, system_id, points, money_value, unit_size) VALUES
('500 Pushups', 'DEBT_REDUCTION', 'sys_debt_pushups', -5, -5.00, '500'),
('10km Laufen', 'DEBT_REDUCTION', 'sys_debt_run', -10, -10.00, '10'),
('Total Dept Zahlung 5', 'DEBT_REDUCTION', 'sys_debt_pay_5', -5, -5.00, '1'),
('Total Dept Zahlung 10', 'DEBT_REDUCTION', 'sys_debt_pay_10', -10, -10.00, '1');
