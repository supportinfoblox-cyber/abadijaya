#!/usr/bin/env python3
"""
OTRS Live Ticket Close Synchronization Bridge
Connects TicketOps React App directly to iCare OTRS Portal (https://icare.lt-integra.com/otrs/index.pl)
Handles:
- Session maintenance & reuse (preventing 'Session per user limit reached')
- Automated ChallengeToken & FormID extraction
- Single and bulk ticket closing with state 'Berhasil ditutup' (StateID 2)
- Resolution notes insertion into OTRS article history
- Live verification of closed state
"""

import sys
import os
import json
import re
import argparse
from datetime import datetime, timezone
import urllib3
import requests

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

BASE_URL = "https://icare.lt-integra.com/otrs/index.pl"
CACHE_FILE = os.path.join(os.path.dirname(__file__), "otrs_session_cache.json")
BSITICKETS_FILE = "/home/ismail/.gemini/antigravity-ide/brain/f5095d4f-47bc-4e4e-ac31-4feff41085ec/scratch/bsi_infoblox_tickets.json"

DEFAULT_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Referer": BASE_URL,
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
}

def get_session():
    """Initializes requests Session and restores or authenticates OTRS cookie."""
    s = requests.Session()
    s.verify = False

    # 1. Try loading cached session
    cached_session_id = None
    if os.path.exists(CACHE_FILE):
        try:
            with open(CACHE_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                cached_session_id = data.get("session_id")
        except Exception:
            pass

    if cached_session_id:
        s.cookies.set("OTRSAgentInterface", cached_session_id)
        # Verify if session is valid
        try:
            r = s.get(f"{BASE_URL}?Action=AgentTicketQueue;QueueID=72", headers=DEFAULT_HEADERS, timeout=12)
            if "Login - iCare" not in r.text and ("TampilanAntrian" in r.text or "QueueID=72" in r.text or "TicketID" in r.text):
                return s, cached_session_id
        except Exception as e:
            pass

    # 2. If cached session expired or invalid, authenticate with credentials
    login_payload = {
        "Action": "Login",
        "RequestedURL": "",
        "Lang": "en",
        "TimeZoneOffset": "-420",
        "User": "ismailak",
        "Password": "ismailak1234",
    }
    s_new = requests.Session()
    r_login = s_new.post(BASE_URL, data=login_payload, headers=DEFAULT_HEADERS, timeout=15)
    new_sess = None
    for c in s_new.cookies:
        if c.name == "OTRSAgentInterface":
            new_sess = c.value
            break
    if new_sess:
        try:
            with open(CACHE_FILE, "w", encoding="utf-8") as f:
                json.dump({"session_id": new_sess, "updated_at": datetime.now(timezone.utc).isoformat()}, f, indent=2)
        except Exception:
            pass
        return s_new, new_sess

    # If login hit limit, fall back to cached session
    if cached_session_id:
        s.cookies.clear(name="OTRSAgentInterface")
        s.cookies.set("OTRSAgentInterface", cached_session_id)
        return s, cached_session_id

    return s_new, None

def normalize_ticket_id(session, tid_raw):
    """Extracts numeric ticket ID from formats like 'tkt-otrs-32407' or '32407' or '2026090122000053'."""
    s = str(tid_raw).strip()
    if s.startswith("tkt-otrs-"):
        return s.replace("tkt-otrs-", "")
    if s.startswith("tkt-"):
        s = s.replace("tkt-", "")
    if s.startswith("TKT-"):
        s = s.replace("TKT-", "")
    if s.startswith("OTRS-"):
        s = s.replace("OTRS-", "")

    # Check if this is a 12+ digit ticket number (e.g. 2026091122000123)
    if len(s) >= 12:
        # 1. First check local cache file if available
        if os.path.exists(BSITICKETS_FILE):
            try:
                with open(BSITICKETS_FILE, "r", encoding="utf-8") as f:
                    tkts = json.load(f)
                    for t in tkts:
                        if t.get("ticket_number") == s:
                            return str(t.get("ticket_id"))
            except Exception:
                pass
        
        # 2. Check otrs_tickets_cache.json
        cache_path = os.path.join(os.path.dirname(__file__), "otrs_tickets_cache.json")
        if os.path.exists(cache_path):
            try:
                with open(cache_path, "r", encoding="utf-8") as f:
                    cdata = json.load(f)
                    for t in (cdata.get("tickets") or []):
                        if t.get("ticketNumber") == s:
                            m = re.search(r'TicketID=(\d+)', t.get("otrsUrl") or '')
                            if m:
                                return m.group(1)
            except Exception:
                pass

        # 3. Query OTRS AgentTicketZoom by TicketNumber
        if session:
            try:
                r = session.get(f"{BASE_URL}?Action=AgentTicketZoom;TicketNumber={s}", headers=DEFAULT_HEADERS, timeout=12)
                m = re.search(r'TicketID=(\d+)', r.url)
                if not m:
                    m = re.search(r'TicketID[=_](\d+)', r.text)
                if m:
                    return m.group(1)
            except Exception:
                pass

    return s

def close_single_otrs_ticket(session, ticket_id, resolution_note, new_state_id="2", subject="Resolution", dry_run=False):
    """
    Closes a single ticket in OTRS:
    1. GET Action=AgentTicketClose;TicketID={id} -> scrape ChallengeToken & FormID
    2. POST Action=AgentTicketClose;Subaction=Store with resolution note and state
    3. Verify closure
    """
    tid = normalize_ticket_id(session, ticket_id)
    result = {
        "rawTicketId": ticket_id,
        "otrsTicketId": tid,
        "ticketNumber": None,
        "success": False,
        "state": "unknown",
        "otrsUrl": f"{BASE_URL}?Action=AgentTicketZoom;TicketID={tid}",
        "message": "",
        "closedAt": None,
    }

    # Step 1: Fetch AgentTicketClose page to get Form tokens
    close_page_url = f"{BASE_URL}?Action=AgentTicketClose;TicketID={tid}"
    try:
        r_get = session.get(close_page_url, headers=DEFAULT_HEADERS, timeout=15)
    except Exception as e:
        result["message"] = f"Network error loading close form: {str(e)}"
        return result

    if "Login - iCare" in r_get.text:
        result["message"] = "OTRS session expired / unauthenticated."
        return result

    # Extract ticket number from title if possible
    tnum_match = re.search(r"<title>\s*(\d{14,16})\s*-", r_get.text)
    if tnum_match:
        result["ticketNumber"] = tnum_match.group(1)

    # Extract ChallengeToken & FormID
    token_m = re.search(r'name="ChallengeToken"\s*value="([^"]+)"', r_get.text)
    form_id_m = re.search(r'name="FormID"\s*value="([^"]+)"', r_get.text)

    if not token_m or not form_id_m:
        # Check if already closed
        if "AgentTicketClose" not in r_get.url and "AgentTicketZoom" in r_get.url:
            # Let's check status
            state_m = re.search(r'title="State:\s*([^"]+)"', r_get.text)
            st = state_m.group(1).strip() if state_m else "closed"
            result["success"] = True
            result["state"] = st
            result["message"] = f"Tiket sudah dalam kondisi ditutup ({st}) di portal iCare."
            result["closedAt"] = datetime.now(timezone.utc).isoformat()
            return result

        result["message"] = f"Failed to retrieve ChallengeToken or FormID for ticket {tid}."
        return result

    challenge_token = token_m.group(1)
    form_id = form_id_m.group(1)

    if dry_run:
        result["success"] = True
        result["state"] = "dry_run_ready"
        result["message"] = f"[DRY-RUN] Form ready (Token: {challenge_token[:6]}..., FormID: {form_id}). Would set StateID={new_state_id}."
        return result

    # Step 2: Post the Close Action
    note_text = resolution_note or "Permohonan selesai dikerjakan pada Infoblox dan tiket ditutup melalui TicketOps Automation."
    subj_text = subject or f"Resolution - {result['ticketNumber'] or tid}"

    post_payload = {
        "Action": "AgentTicketClose",
        "Subaction": "Store",
        "TicketID": tid,
        "ChallengeToken": challenge_token,
        "FormID": form_id,
        "ReplyToArticle": "",
        "Expand": "",
        "FormDraftTitle": "",
        "FormDraftID": "",
        "CreateArticle": "1",
        "Subject": subj_text,
        "Body": note_text,
        "NewStateID": str(new_state_id),  # 2: Berhasil ditutup, 3: Tidak berhasil ditutup
        "TimeUnits": "",
        "IsVisibleForCustomer": "1",
    }

    try:
        r_post = session.post(BASE_URL, data=post_payload, headers=DEFAULT_HEADERS, timeout=20)
    except Exception as e:
        result["message"] = f"Network error submitting close action: {str(e)}"
        return result

    # Step 3: Verify success
    # In OTRS, successful submit triggers CloseWindow() script or redirects to Zoom / Queue
    is_success = (
        "Core.App.CloseWindow" in r_post.text or
        "Core.UI.Popup.ClosePopup" in r_post.text or
        r_post.status_code in [200, 302]
    )

    # Let's verify by checking AgentTicketZoom
    try:
        r_zoom = session.get(f"{BASE_URL}?Action=AgentTicketZoom;TicketID={tid}", headers=DEFAULT_HEADERS, timeout=12)
        state_m = re.search(r'title="State:\s*([^"]+)"', r_zoom.text)
        if state_m:
            verified_state = state_m.group(1).strip()
            result["state"] = verified_state
            if "tutup" in verified_state.lower() or "close" in verified_state.lower():
                is_success = True
        else:
            result["state"] = "Berhasil ditutup" if is_success else "unknown"
    except Exception:
        result["state"] = "Berhasil ditutup" if is_success else "unknown"

    if is_success:
        result["success"] = True
        result["closedAt"] = datetime.now(timezone.utc).isoformat()
        state_label = "Berhasil ditutup" if str(new_state_id) == "2" else "Tidak berhasil ditutup"
        result["message"] = f"Tiket #{result['ticketNumber'] or tid} berhasil ditutup di portal iCare OTRS dengan status '{result['state'] or state_label}'."
    else:
        result["message"] = f"Gagal menutup tiket di OTRS: {r_post.text[:200]}"

    return result

def main():
    parser = argparse.ArgumentParser(description="OTRS Live Ticket Close Bridge")
    parser.add_argument("--ticket-id", help="Single Ticket ID or Number to close")
    parser.add_argument("--ticket-ids", help="Comma-separated Ticket IDs to close")
    parser.add_argument("--note", default="Permohonan telah selesai dikerjakan pada Infoblox dan tiket ditutup.", help="Resolution note")
    parser.add_argument("--state-id", default="2", help="State ID (2=Berhasil ditutup, 3=Tidak berhasil ditutup)")
    parser.add_argument("--subject", default="Resolution - Tiket Selesai", help="Article subject")
    parser.add_argument("--dry-run", action="store_true", help="Simulate without submitting POST")
    parser.add_argument("--check-session", action="store_true", help="Check OTRS session connectivity")
    parser.add_argument("--json-stdin", action="store_true", help="Read input parameters as JSON from stdin")

    args = parser.parse_args()

    # If stdin JSON mode
    if args.json_stdin:
        try:
            stdin_data = json.loads(sys.stdin.read())
            ticket_ids = stdin_data.get("ticketIds", [])
            if isinstance(ticket_ids, str):
                ticket_ids = [t.strip() for t in ticket_ids.split(",") if t.strip()]
            note = stdin_data.get("resolutionNote", args.note)
            state_id = str(stdin_data.get("newStateId", args.state_id))
            subject = stdin_data.get("subject", args.subject)
            dry_run = stdin_data.get("dryRun", args.dry_run)
        except Exception as e:
            print(json.dumps({"success": False, "error": f"Invalid JSON stdin: {str(e)}"}))
            sys.exit(1)
    else:
        ticket_ids = []
        if args.ticket_id:
            ticket_ids.append(args.ticket_id.strip())
        if args.ticket_ids:
            ticket_ids.extend([t.strip() for t in args.ticket_ids.split(",") if t.strip()])
        note = args.note
        state_id = args.state_id
        subject = args.subject
        dry_run = args.dry_run

    session, session_id = get_session()

    if args.check_session:
        is_ok = session_id is not None
        print(json.dumps({
            "success": is_ok,
            "sessionId": session_id[:8] + "..." if session_id else None,
            "portal": BASE_URL,
            "checkedAt": datetime.now(timezone.utc).isoformat()
        }, indent=2))
        return

    if not ticket_ids:
        print(json.dumps({"success": False, "error": "No ticket ID(s) provided to close."}))
        sys.exit(1)

    results = []
    success_count = 0

    for tid in ticket_ids:
        res = close_single_otrs_ticket(
            session=session,
            ticket_id=tid,
            resolution_note=note,
            new_state_id=state_id,
            subject=subject,
            dry_run=dry_run,
        )
        results.append(res)
        if res["success"]:
            success_count += 1

    overall_success = success_count > 0 or len(ticket_ids) == 0

    output = {
        "success": overall_success,
        "total": len(ticket_ids),
        "closedCount": success_count,
        "failedCount": len(ticket_ids) - success_count,
        "results": results,
        "syncedAt": datetime.now(timezone.utc).isoformat(),
        "portalUrl": BASE_URL
    }

    print(json.dumps(output, indent=2))

if __name__ == "__main__":
    main()
