update public.reservation_items ri
set status = rg.status
from public.reservation_groups rg
where ri.reservation_group_id = rg.id
  and rg.status in ('cancelled', 'expired')
  and ri.status <> rg.status;

delete from public.seat_locks sl
using public.reservation_groups rg, public.reservation_items ri
where ri.reservation_group_id = rg.id
  and rg.status in ('cancelled', 'expired')
  and sl.travel_id = rg.travel_id
  and sl.layout_seat_id = ri.layout_seat_id
  and sl.lock_type = 'temporary_hold';
