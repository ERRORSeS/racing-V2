# Continuous race calendar

Managed careers now check the current and next month when loading or advancing. If the initial schedule has expired, future meeting cards are restored immediately without waiting for another month-end. Publication logs no longer suppress cards missing from the fixture list; deterministic fixture IDs prevent duplicate races and preserve existing bookings and archives. Recovered schedules are saved by the background loader.

Age filters now include open-age races that overlap the selected group. For example, an ages 2–12 G1 appears under both Ages 2–4 and Ages 3+. A filter with no remaining races advises selecting another month or broader filters. Ordinary meetings still run on days 4, 11, 18 and 25 in the displayed 30-day month; the final days can have no remaining local meeting until the next month.

Tests cover stalled-save recovery, stale publication logs, booking and result preservation, idempotency, year boundaries, all-country current/next coverage and age filters. A browser smoke test loads a day-75 career with only the original two-month calendar, checks both views and confirms the repair survives reload. Competitive race-performance formulas and completed results are unchanged.

## Year 2, month 8 follow-up

Recovery no longer depends on generation-log metadata, which older/imported saves may lack. The default Races period is Upcoming. If Current has no remaining matching races, show the next scheduled matching cards and explain the change. Show all upcoming races clears age/type/country/month filters. Repair race calendar republishes missing current/next-month cards and resets those filters; existing fixture IDs and completed results remain preserved. The screen also reports the total scheduled future races across all filters.

Additional regressions reproduce day 570 (Year 2, Month 8, Day 1) with missing and legacy logs, and day 597 (Year 2, Month 8, Day 28) after the month's final meeting. The browser smoke script accepts a day argument and verifies recovery, both month views, filter reset, manual repair and persistence with absent logs.
