"""Build marketing fixtures from the real prototype screens.

Only text content and existing component states are changed. Every
replacement must match the source, otherwise the build stops, so a prototype
update can't silently leave client names in website imagery.
"""
import os, pathlib, re, sys
SRC = pathlib.Path(os.environ.get('PROTO_SCREENS', '../tessaro-prototype/s'))
OUT = pathlib.Path(os.environ.get('FIXTURES_OUT', '.fixtures')); OUT.mkdir(parents=True, exist_ok=True)

PROVIDER = 'Meridian Facility Services'
SHOW = {
  # resident / requester (separate AC example, not the story event)
  'R-02-2': [],
  'R-03-4': [('MH-SR-0418', 'SR-0418'), ('Gulf Cool Services', PROVIDER)],
  'R-04-4': [],
  # technician (separate refrigeration example)
  'M-02-3': [('LT19-40772', 'SN 19-40772')],
  'M-03-3': [],
  'M-05-2': [],
  'M-03-4': [('LT-WO-2027-00142', 'WO-2611-0142'), ('25.2876 N, 55.3920 E', 'Central site · Cold room 2')],
  'M-05-4': [('LT-WO-P-0412', 'WO-P-0412')],
  # business customer portal (separate retail example)
  'PT-013': 'portal', 'PT-016': 'portal',
}
PORTAL = [
  ('Leotek Refrigeration', PROVIDER), ('Ask Leotek', 'Ask your provider'), ('Leotek', 'Meridian'),
  ('Qusais Hypermarket', 'Coastline Retail'), ('Al Qusais Industrial 2', 'Central site'),
  ('Nahda branch', 'North branch'), ('Muhaisnah branch', 'East branch'), ('Qusais', 'Central'),
  ('Tariq Nasser', 'Dana Haddad'), ('Good afternoon, Tariq', 'Good afternoon, Dana'), ('>TN<', '>DH<'),
  ('Mariam Al Hashimi', 'Omar Khalil'), ('LT-WO-2027-00', 'WO-2611-0'),
]

def clock(t): return [('<span>9:41</span>', f'<span>{t}</span>')]

STORY = {
  # Office · 14:06 — the requester sees who is coming and when
  'R-03-5': clock('14:06') + [
    ('>JM<', '>RS<'), ('Joseph M.', 'Rami S.'), ('Gulf Cool Services · AC technician', f'{PROVIDER} · HVAC'),
    ('Call me first', 'Service entrance'), ('Filter and drain kit', 'Valve actuator'), ('MH-SR-0418', 'WO-2611-0418'),
    (re.compile(r'Today 4:30\s*(–|&ndash;)\s*5:00 pm'), 'Today 3:10 – 3:40 pm')],
  # Technician · 15:12 — job detail for the same unit
  'M-02-3': clock('15:12') + [
    ('FZ-07 · LT19-40772', 'FCU-L4-07 · SN 18-22031'), ('Low-temp freezer', 'Fan coil unit'),
    ('Cold room 2 · R404A · 2019', 'Room 4.07 · ceiling void · 2018'), ('3 calls in 90 days', '1 call in 90 days'),
    ('Contain by 16:45', 'Respond by 18:03'), ('2h 33m', '2h 51m'), ('Cabinet temp', 'Supply air'),
    (re.compile(r'(−|&minus;|-)6 °C'), '21.6 °C'), (re.compile(r'target (−|&minus;|-)20 °C'), 'design 14 °C'),
    ('Labour 24/7', 'Labour · 4 h response'), ('Parts over AED 500', 'Parts under AED 1,000'), ('Quote needed', 'Covered'),
    ('wear parts excluded', 'expired 2023'),
    ('Loading bay B, ID at security. Freezer suit and gloves.', 'Service entrance, ID at security. Room booked from 16:00.')],
  # Technician · 15:14 — scan identifies the unit
  'M-02-4': clock('15:14') + [
    ('FZ-07 · matches your job', 'FCU-L4-07 · matches your job'), ('Low-temp freezer · Cold room 2', 'Fan coil unit · Room 4.07'),
    ('Found offline', 'Tag matched'), ('LT-003118', 'FCU-0407')],
  # Technician · 15:29 — evidence photo, stamped to the work order
  'M-03-4': clock('15:29') + [
    (re.compile(r'14:31 · 5 Nov 2026 · FZ-07 · LT-WO-2027-00142'), '15:29 · 18 Nov 2026 · FCU-L4-07 · WO-2611-0418'),
    ('25.2876 N, 55.3920 E', 'Harbour Point · L4'), ('Done · 3', 'Done · 2'),
    ('Upload queue · 2 waiting for signal', 'Attached to WO-2611-0418'), ('4.8 MB', '2 photos')],
  # Verify · 15:36 — technician completion, every item done
  'M-05-2': clock('15:36') + ['complete'],
  # Verify · 15:41 — the requester confirms after the evidence exists
  'R-04-4': clock('15:41') + [
    ('Fixed · 5:05 pm', 'Fixed · 3:38 pm'), ('Your AC is cooling again', 'Room 4.07 is cooling again'),
    ('What Joseph did', 'What Rami did'),
    ('Cleaned the blocked filter and drain. Reset the fan motor. Room at 22 °C after 15 minutes. No parts used.',
     'Replaced the seized valve actuator on FCU-L4-07. The valve follows its command and supply air is back to 14.1 °C.')],
}

def apply(s, reps, key, strict=True):
    for a, z in reps:
        if isinstance(a, re.Pattern):
            s, n = a.subn(z, s)
        else:
            n = s.count(a); s = s.replace(a, z)
        if n == 0 and strict: sys.exit(f'{key}: no match for {a!r}')
    return s

CHECK = '<span style="width:28px;height:28px;border-radius:10px;display:flex;align-items:center;justify-content:center;flex:0 0 auto;background:linear-gradient(135deg,#21805A,#1A6B47);color:#fff"><svg aria-hidden="true" fill="none" height="15" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2.6" viewbox="0 0 24 24" width="15"><path d="m5 12.5 4.5 4.5L19 7.5"></path></svg></span>'
def complete(s, key):
    # Same components, completed state: last item checked, outcome "Fully fixed", sign-off enabled.
    s = apply(s, [
        (re.compile(r'<span style="[^"]*rgba\(214,74,46,\.14\)[^"]*">!</span><span style="flex:1;font-size:13.5px;font-weight:600">After photo of coil</span><span class="chip"[^>]*>Add</span>'),
         CHECK + '<span style="flex:1;font-size:13.5px;font-weight:500">After photo of actuator</span>'),
        ('Parts and refrigerant log', 'Parts log · actuator from van'),
        ('5/6', '6/6'), ('1 item left</', 'All items done</'), ('Fix it here, then get sign-off', 'Ready for sign-off'),
        (re.compile(r'border:2px solid #3FB07E;background:rgba\(214,240,228,\.7\)"><span style="width:22px;height:22px;border-radius:50%;flex:0 0 auto;border:7px solid #1F7A51"></span><span style="flex:1;font-size:15px;font-weight:600">Contained · follow-up visit'),
         '"><span style="width:22px;height:22px;border-radius:50%;flex:0 0 auto;border:2px solid #C9D6CF"></span><span style="flex:1;font-size:15px;font-weight:600">Contained · follow-up visit'),
        (re.compile(r'border-radius:20px;"><span style="width:22px;height:22px;border-radius:50%;flex:0 0 auto;border:2px solid #C9D6CF"></span><span style="flex:1;font-size:15px;font-weight:600">Fully fixed'),
         'border-radius:20px;border:2px solid #3FB07E;background:rgba(214,240,228,.7)"><span style="width:22px;height:22px;border-radius:50%;flex:0 0 auto;border:7px solid #1F7A51"></span><span style="flex:1;font-size:15px;font-weight:600">Fully fixed'),
        (';background:linear-gradient(135deg,#B9CEC3,#9DB5A8);box-shadow:none">Get sign-off · All items done', '">Get customer sign-off'),
    ], key)
    return s

BANNED = re.compile(r'leotek|qusais|gulf cool|al noor|marina|barsha|jumeirah|bayside|LT-WO|LT19|MH-SR|tariq|mariam', re.I)
for group, table in (('show', SHOW), ('story', STORY)):
    for key, reps in table.items():
        s = (SRC / f'{key}.html').read_text()
        if reps == 'portal': s = apply(s, PORTAL, key, strict=False)
        if isinstance(reps, list):
            if 'complete' in reps:
                s = apply(s, [r for r in reps if r != 'complete' and not isinstance(r, str)], key); s = complete(s, key)
            else: s = apply(s, reps, key)
        text = re.sub(r'<style>.*?</style>|<[^>]+>', ' ', s, flags=re.S)
        m = BANNED.search(text)
        if m: sys.exit(f'{key} ({group}): leftover name {m.group(0)!r}')
        (OUT / f'{key}{"" if group == "show" else "-story"}.html').write_text(s)
        print('ok', group, key)
