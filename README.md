# NushHACK-26
This is the repository for our NushHACK 2026 submission.
# Dependencies
- Flask
- Supabase
- dotenv
You can install them by typing
```
pip instal [dependency]
```
in command prompt/powershell
# Accounts
People can't sign up themselves. Admins grant accounts and other admins from the Accounts tab, where they can also see every account's rank, see members' login emails and set new passwords for members.

To create the first admin, or make an existing account an admin, run this from the `NUSHack` folder:
```
python -m flask --app app create-admin
```
# How it works
1. Check whether the application is online.
2. If online:
   - Sync changes from the JSON file to the database.
   - Update both the JSON file and database together.
3. If offline:
   - Temporarily store changes in the JSON file.
   - Data will be resynced when online


# Functionality for Officer

## 1. Patrols
- **Ad-hoc observations:** Record observations at any checkpoint, such as "door ajar" or "light faulty".
- **Offline notes:** The route, checkpoints and schedule are downloaded at the start of the shift.

## 2. Inspections and Checklists
- **Fire safety walks:** Check exits, extinguishers, emergency lighting and fire doors.
- **Equipment checks:** Inspect CCTV, alarms, barrier gates and panic buttons.
- **Opening and closing routines:** Lock-up and unlock checklists for buildings.
- **PASS / FAIL / N/A:** Record the result for each step, with a required photo and note when marked FAIL.
- **Automatic follow-up:** A FAIL automatically creates a follow-up (maintenance ticket or incident).

## 3. Incident Reporting (not yet)
- **Quick report:** Select an incident type (trespass, theft, injury, fire, suspicious person or package, vandalism, medical), severity and location. Include photos, voice notes and a short description.
- **Incident-specific templates:** Templates with required fields depending on the incident type (e.g. injury reports require the person's details, first aid given and whether an ambulance was called).
- **Witness and involved-person details:** Record details, including an ID scan.
- **Live timeline:** Add updates to the same incident as it develops.
- **Offline reporting:** Fully usable offline, with photos and voice notes uploaded when the connection returns.

## 4. Emergencies
- **SOS / panic button:** Sends an alert as soon as possible. If there is no data connection, fall back to an SMS or phone call, which may still work without internet. Make this clear on screen.
- **Lone-worker check:** Send "Are you OK?" prompts at intervals. A missed reply raises an alert.
- **Offline emergency procedures:** Store evacuation, bomb threat, fire and medical procedures offline, with step-by-step checklists.
- **Emergency contacts:** Store contacts offline, with one-tap dialling.
- **Muster / headcount:** Track personnel during evacuations.

## 5. Access Control and Visitors (not yet)
- **Visitor registration:** Record name, ID, host, purpose, vehicle and time in and out.
- **Pre-registered visitor list:** Download the visitor list for offline check-in.
- **Watchlist / banned persons:** Store records offline so a match can be flagged at the gate.
- **Contractor permits:** Check that a work permit is valid before allowing a contractor in.
- **Vehicle log:** Record licence plate, time in and out, and parking bay.

## 6. Keys and Assets (not yet)
- **Key log:** Record who took which key and when it was returned.
- **Equipment checkout:** Track radios, torches and body cameras.
- **Lost and found:** Maintain a log with photos.

## 7. Shift Handover (not yet)
- **Daily Occurrence Book (DOB):** Maintain a running log of everything that happens during the shift, commonly used by security companies in Singapore.
- **Handover summary:** Summarise open incidents, unfinished checks, keys still out and notes for the next officer.
- **Clock in / out:** Record attendance with location.
- **Post orders:** Store site-specific instructions offline.

## 8. Officer Support (not yet)
- **Sync status:** Display sync status everywhere:
  - `Saved on device`
  - `Pending upload`
  - `Synced`
- **My tasks today:** Display assigned patrols and checklists with due times.
- **Supervisor messages / broadcasts:** Display messages once they have synced.
- **Offline maps / floor plans:** Display maps with checkpoints marked.
