insert into public.categories (slug, label, icon_name, sort_order) values
    ('icons', 'Icons', 'Star', 0),
    ('rooms', 'Rooms', 'BedDouble', 1),
    ('amazing-pools', 'Amazing pools', 'Waves', 2),
    ('amazing-views', 'Amazing views', 'Mountain', 3),
    ('cabins', 'Cabins', 'Home', 4),
    ('omg', 'OMG!', 'Rocket', 5),
    ('beachfront', 'Beachfront', 'Umbrella', 6),
    ('farms', 'Farms', 'Tractor', 7),
    ('tiny-homes', 'Tiny homes', 'Minimize', 8),
    ('luxe', 'Luxe', 'Gem', 9),
    ('castles', 'Castles', 'Castle', 10),
    ('camping', 'Camping', 'Tent', 11)
on conflict (slug) do update
set
    label = excluded.label,
    icon_name = excluded.icon_name,
    sort_order = excluded.sort_order;

insert into public.amenities (slug, label, icon_name, sort_order) values
    ('wifi', 'Wifi', 'Wifi', 0),
    ('pool', 'Pool', 'Waves', 1),
    ('kitchen', 'Kitchen', 'Utensils', 2),
    ('air-conditioning', 'AC', 'Snowflake', 3),
    ('heater', 'Heater', 'SunSnow', 4),
    ('gym', 'Gym', 'Dumbbell', 5),
    ('elevator', 'Elevator', 'ArrowUpDown', 6),
    ('private-beach', 'Private Beach', 'Umbrella', 7),
    ('breakfast', 'Breakfast', 'Coffee', 8),
    ('butler', 'Butler', 'ConciergeBell', 9),
    ('parking', 'Parking', 'Car', 10),
    ('hot-tub', 'Hot tub', 'Bath', 11),
    ('bbq', 'BBQ', 'Flame', 12),
    ('tv', 'TV', 'Tv', 13),
    ('washer', 'Washer', 'Container', 14),
    ('dryer', 'Dryer', 'Wind', 15),
    ('pet-friendly', 'Pet friendly', 'Dog', 16),
    ('workspace', 'Workspace', 'Briefcase', 17),
    ('balcony', 'Balcony', 'Building', 18),
    ('garden', 'Garden', 'Flower2', 19),
    ('beach-access', 'Beach access', 'Sun', 20),
    ('fireplace', 'Fireplace', 'FlameKindling', 21)
on conflict (slug) do update
set
    label = excluded.label,
    icon_name = excluded.icon_name,
    sort_order = excluded.sort_order;
