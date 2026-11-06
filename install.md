# Installation guide
1. Download the zip from GitHub and extract the files
2. Sign up to supabase at www.supabase.com
3. Get your secret API key and project url
4. Replace the keys in .env file and generate the flask key by typing
```
python -c "import secrets; print(secrets.token_hex(32))"
```
5. Run app.py and you're all set! :)
