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

After logging in online, someone can log in on that device without internet for the next 7 days. Only a one-way hash of their password is kept, in `data.json`, which is never uploaded. Logging in online again renews the 7 days.
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
  
## 3. Notice Board
- **Set categories** You can choose from General, Anouncement and Reminders, all colour-coded to make them more distinct.
- **Synchronisation** It instantly syncs if you are online with others, and they can see them appear.

## 4. Emergencies
- **SOS / panic button:** Sends an alert as soon as possible. If there is no data connection, fall back to an SMS or phone call, which may still work without internet. Make this clear on screen.
- **Lone-worker check:** Send "Are you OK?" prompts at intervals. A missed reply raises an alert.
- **Emergency contacts:** Store contacts offline, with one-tap dialling.
