# Installation guide
1. Download the zip from GitHub and extract the files
2. Sign up to supabase at www.supabase.com
3. Get your secret API key and project url
4. Copy NUSHack/.env.example to NUSHack/.env, then replace the values in NUSHack/.env. Never put real keys in .env.example, because it's public. Generate the flask key by typing
```
python -c "import secrets; print(secrets.token_hex(32))"
```
5. Optional: to text the SOS number automatically when an SOS is sent, create a Twilio account and fill in the TWILIO settings in NUSHack/.env. Without them, the SOS screen's Call and Send SMS buttons still work.
6. Run app.py and you're all set! :)
