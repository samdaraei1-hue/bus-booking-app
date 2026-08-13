update public.translations
set value = case key
  when 'eyebrow' then 'به‌روزرسانی رزرو'
  when 'status_summary' then 'وضعیت رزرو'
  when 'reservation_label' then 'کد رزرو'
  when 'travel_label' then 'عنوان'
  when 'route_label' then 'مسیر / محل'
  when 'departure_label' then 'زمان شروع'
  when 'seats_label' then 'صندلی‌ها'
  when 'payment_instructions_label' then 'راهنمای پرداخت'
  when 'footer' then 'اگر این تغییر را انتظار نداشتید، لطفاً با پشتیبانی تماس بگیرید.'
  when 'subject.group_status' then 'به‌روزرسانی رزرو {travelName}'
  when 'subject.seat_status' then 'به‌روزرسانی صندلی‌های {travelName}'
  when 'subject.awaiting_payment' then 'رزرو آماده پرداخت است: {travelName}'
  when 'subject.paid' then 'پرداخت رزرو {travelName} تایید شد'
  when 'title.group_status' then 'وضعیت رزرو شما تغییر کرده است'
  when 'title.seat_status' then 'انتخاب صندلی‌های شما به‌روزرسانی شد'
  when 'title.awaiting_payment' then 'رزرو شما آماده پرداخت است'
  when 'title.paid' then 'پرداخت شما تایید شد'
  when 'intro.group_status' then 'وضعیت رزرو شما در سیستم به‌روزرسانی شد.'
  when 'intro.seat_status' then 'وضعیت یک یا چند صندلی در رزرو شما به‌روزرسانی شد.'
  when 'intro.awaiting_payment' then 'مشخصات مسافران ثبت شد و رزرو شما اکنون آماده پرداخت است.'
  when 'intro.paid' then 'رزرو شما اکنون تایید شده و صندلی‌هایتان قطعی شده‌اند.'
  when 'status.held' then 'نگه داشته شده'
  when 'status.awaiting_payment' then 'در انتظار پرداخت'
  when 'status.paid' then 'پرداخت شده'
  when 'status.cancelled' then 'لغو شده'
  when 'status.expired' then 'منقضی شده'
  else value
end
where namespace = 'email'
  and lang = 'fa'
  and key in (
    'eyebrow',
    'status_summary',
    'reservation_label',
    'travel_label',
    'route_label',
    'departure_label',
    'seats_label',
    'payment_instructions_label',
    'footer',
    'subject.group_status',
    'subject.seat_status',
    'subject.awaiting_payment',
    'subject.paid',
    'title.group_status',
    'title.seat_status',
    'title.awaiting_payment',
    'title.paid',
    'intro.group_status',
    'intro.seat_status',
    'intro.awaiting_payment',
    'intro.paid',
    'status.held',
    'status.awaiting_payment',
    'status.paid',
    'status.cancelled',
    'status.expired'
  );

update public.translations
set value = case key
  when 'footer' then 'Wenn du diese Änderung nicht erwartet hast, kontaktiere bitte den Support.'
  when 'subject.group_status' then 'Reservierungs-Update für {travelName}'
  when 'subject.seat_status' then 'Sitz-Update für {travelName}'
  when 'subject.awaiting_payment' then 'Reservierung zur Zahlung bereit: {travelName}'
  when 'subject.paid' then 'Zahlung bestätigt für {travelName}'
  when 'title.group_status' then 'Der Status deiner Reservierung hat sich geändert'
  when 'title.seat_status' then 'Deine Sitzplatzwahl wurde aktualisiert'
  when 'title.awaiting_payment' then 'Deine Reservierung ist zahlungsbereit'
  when 'title.paid' then 'Deine Zahlung wurde bestätigt'
  when 'intro.group_status' then 'Der Status deiner Reservierung wurde im System aktualisiert.'
  when 'intro.seat_status' then 'Der Status eines oder mehrerer Sitze in deiner Reservierung wurde aktualisiert.'
  when 'intro.awaiting_payment' then 'Die Teilnehmerdaten wurden gespeichert und deine Reservierung ist jetzt zahlungsbereit.'
  when 'intro.paid' then 'Deine Reservierung ist jetzt bestätigt und deine Sitze sind gesichert.'
  when 'status.held' then 'Reserviert'
  when 'status.awaiting_payment' then 'Warten auf Zahlung'
  when 'status.paid' then 'Bezahlt'
  when 'status.cancelled' then 'Storniert'
  when 'status.expired' then 'Abgelaufen'
  else value
end
where namespace = 'email'
  and lang = 'de'
  and key in (
    'footer',
    'subject.group_status',
    'subject.seat_status',
    'subject.awaiting_payment',
    'subject.paid',
    'title.group_status',
    'title.seat_status',
    'title.awaiting_payment',
    'title.paid',
    'intro.group_status',
    'intro.seat_status',
    'intro.awaiting_payment',
    'intro.paid',
    'status.held',
    'status.awaiting_payment',
    'status.paid',
    'status.cancelled',
    'status.expired'
  );

