#!/usr/bin/env python3
"""
OTRS Live Authentication Bridge
Validates user credentials against https://icare.lt-integra.com/otrs/index.pl
Extracts agent display name, email, and session cookie.
"""

import sys
import json
import re
import argparse
import urllib3
import requests

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

BASE_URL = "https://icare.lt-integra.com/otrs/index.pl"
DEFAULT_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Referer": BASE_URL,
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
}

def extract_user_profile(html_text, username):
    """Extract real agent display name and corporate email from OTRS HTML."""
    name = None
    clean_user = str(username).strip().lower()

    try:
        # Pattern 1: LogoutButton title: "logout (Anda telah masuk sebagai Ismail Akbar)"
        m = re.search(r'title=["\']logout\s*\(([^)]+)\)["\']', html_text, re.IGNORECASE)
        if m:
            raw = m.group(1).strip()
            extracted = re.sub(r'^(?:Anda telah masuk sebagai|You are logged in as|Signed in as)\s*', '', raw, flags=re.IGNORECASE).strip()
            if len(extracted) > 1:
                name = extracted

        # Pattern 2: span inside user navigation bar
        if not name:
            m2 = re.search(r'<div[^>]*class=["\'][^"\']*User[^"\']*["\'][^>]*>.*?<span>(.*?)</span>', html_text, re.DOTALL | re.IGNORECASE)
            if m2:
                clean = re.sub(r'<[^>]+>', '', m2.group(1)).strip()
                if len(clean) > 2:
                    name = clean
    except Exception:
        pass

    if not name:
        if clean_user == 'ismailak':
            name = 'Ismail Akbar'
        else:
            parts = username.replace('.', ' ').replace('_', ' ').split()
            name = ' '.join(p.capitalize() for p in parts)

    email = f"{clean_user}@lt-integra.com"
    return name, email

def authenticate(username, password):
    if not username or not password:
        return {"success": False, "error": "Username dan password harus diisi."}

    s = requests.Session()
    s.verify = False

    payload = {
        "Action": "Login",
        "RequestedURL": "",
        "Lang": "en",
        "TimeZoneOffset": "-420",
        "User": str(username).strip(),
        "Password": str(password),
    }

    try:
        r = s.post(BASE_URL, data=payload, headers=DEFAULT_HEADERS, timeout=14, allow_redirects=True)
    except requests.exceptions.Timeout:
        return {"success": False, "error": "Timeout saat menghubungi server iCare OTRS.", "offlineFallback": True}
    except Exception as e:
        return {"success": False, "error": f"Gagal menghubungi server iCare: {str(e)}", "offlineFallback": True}

    # Check for session cookie
    session_id = None
    for c in s.cookies:
        if c.name == "OTRSAgentInterface":
            session_id = c.value
            break

    # Determine success or failure
    is_failed = (
        not session_id or
        "Login failed" in r.text or
        "Login gagal" in r.text or
        "<title>Login - iCare</title>" in r.text or
        ("Login - iCare" in r.text and "TampilanAntrian" not in r.text and "Dashboard" not in r.text)
    )

    if is_failed:
        # Check if session per user limit reached
        if "Session per user limit reached" in r.text or "limit reached" in r.text:
            return {
                "success": False,
                "error": "Batas sesi aktif akun iCare Anda telah tercapai di portal OTRS. Silakan logout dari sesi browser lain.",
                "limitReached": True
            }
        return {"success": False, "error": "Username atau password iCare salah."}

    # Successful login
    display_name, extracted_email = extract_user_profile(r.text, username)
    clean_user = str(username).strip().lower()
    email = extracted_email or f"{clean_user}@lt-integra.com"

    return {
        "success": True,
        "message": "Autentikasi iCare OTRS berhasil.",
        "user": {
            "id": f"usr-otrs-{clean_user}",
            "username": clean_user,
            "name": display_name or clean_user,
            "email": email,
            "role": "admin" if clean_user == "ismailak" else "engineer",
            "isActive": True,
            "source": "OTRS_LIVE",
        },
        "sessionId": session_id,
    }

def main():
    parser = argparse.ArgumentParser(description="OTRS Live Auth Bridge")
    parser.add_argument("--json-stdin", action="store_true", help="Read credentials JSON from stdin")
    parser.add_argument("--user", help="Username")
    parser.add_argument("--password", help="Password")

    args = parser.parse_args()

    if args.json_stdin:
        try:
            raw = sys.stdin.read()
            data = json.loads(raw)
            username = data.get("username") or data.get("user")
            password = data.get("password") or data.get("pass")
        except Exception as e:
            print(json.dumps({"success": False, "error": f"Invalid JSON stdin: {str(e)}"}))
            sys.exit(1)
    else:
        username = args.user
        password = args.password

    res = authenticate(username, password)
    print(json.dumps(res, indent=2))
    sys.exit(0 if res.get("success") else 1)

if __name__ == "__main__":
    main()
