# NushHACK-26
This is the repository for our NushHACK 2026 submission.
# Dependencies
- Flask
- Supabase
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

---

# Recommended Features for a 24-Hour Build

For a 24-hour development period, focus on a compelling story with **3 or 4 features** rather than attempting to build everything.

| Priority | Feature | Why |
|---|---|---|
| **Core** | Checklists / inspections | The challenge brief explicitly asks for "security processes". |
| **Core** | Incident report with photo | Demonstrates offline media queuing and is highly relatable. |
| **Core** | Patrol with QR checkpoint scan | Visual, demonstrates proof of presence, and phones can scan QR codes using their cameras. |
| **Wow** | SOS with SMS fallback | Demonstrates consideration for offline emergencies. |
| **Nice** | Shift handover summary | Brings everything together into one closing screen for the demo. |
| **Skip** | Visitors, keys, lone-worker checks, maps | Mention these in a roadmap slide. |

---

# Demo Story

### Scenario: Night Patrol with Offline Synchronisation

1. **Start offline:** An officer begins a night patrol without an internet connection.
2. **Scan checkpoints:** The officer scans three QR checkpoints along the patrol route.
3. **Conduct inspection:** The officer fails a fire-exit check during the patrol.
4. **Create incident:** The failed check automatically creates an incident, and the officer attaches a photo.
5. **Reconnect:** The officer regains an internet connection.
6. **Synchronise:** All locally stored records and photos are uploaded to the database.
7. **Supervisor review:** The supervisor sees the incident report, attached photo and complete patrol trail.

**Key demonstration point:** The application remains fully functional offline, preserves important records locally, and synchronises everything once connectivity is restored.
