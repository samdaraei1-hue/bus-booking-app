update public.travel_addons
set pricing_mode = 'per_participant'
where pricing_mode = 'per_booking';

update public.reservation_addons
set pricing_mode = 'per_participant'
where pricing_mode = 'per_booking';
