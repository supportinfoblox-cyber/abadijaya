#!/usr/bin/env python3
"""
OTRS Comprehensive History & Ticket Fetcher Bridge
Fetches tickets from registered queues:
- OP0899 - BSI DNS & DHCP Infoblox (QueueID 72)
- OP0968 - BSI - Infoblox DNS & DHCP DC2 Cibitung (QueueID 121)

Supports:
- Active / recent tickets fetch
- Historical tickets fetch (> 3 months, full queue search)
- Automatic ticket classification per user rules:
  1. IPAM
  2. Reserve IP (Fixed Address / Reserved IP)
  3. DNS Request (A Record, CNAME, TXT, PTR)
  4. DRP (Standby support / DRP)
"""

import sys
import os
import re
import json
import argparse
import time
from html import unescape
from datetime import datetime, timezone, timedelta
import urllib3
import requests

sys.path.insert(0, os.path.dirname(__file__))
from otrs_close_bridge import get_session, BASE_URL, DEFAULT_HEADERS

CACHE_FILE = os.path.join(os.path.dirname(__file__), "otrs_tickets_cache.json")

def parse_priority(raw_str):
    s = str(raw_str).lower()
    if '5' in s or 'very high' in s or 'critical' in s:
        return 'CRITICAL'
    if '4' in s or 'high' in s:
        return 'HIGH'
    if '2' in s or 'low' in s or '1' in s:
        return 'LOW'
    return 'MEDIUM'

def parse_status(raw_str):
    s = str(raw_str).lower()
    if 'tutup' in s or 'close' in s:
        return 'CLOSED'
    if 'baru' in s or 'new' in s:
        return 'NEW'
    if 'pending' in s or 'tunda' in s:
        return 'PENDING'
    if 'progress' in s or 'proses' in s:
        return 'IN PROGRESS'
    if 'selesai' in s or 'resolve' in s:
        return 'RESOLVED'
    return 'OPEN'

def classify_ticket(subject, body=""):
    # Normalize unicode non-breaking spaces (\xa0, &nbsp;) and multiple spaces
    full_text = re.sub(r'[\s\xa0\u200b\u200c\u200d\ufeff]+', ' ', (subject or "") + " " + (body or "")).strip().lower()
    
    is_drp = any(k in full_text for k in ["standby", "drp", "onsite", "drc", "pendampingan", "disaster recovery"])
    
    # Reserve IP keywords
    is_reserve_ip = any(k in full_text for k in [
        "reserve ip", "reserved ip", "reservasi ip", "fixed address", "static ip", 
        "ip static", "permohonan ip", "request ip", "reserve_ip", "permohonan reserve", 
        "reserved_ip", "reserve ip address", "ip address baru", "ip address laptop"
    ]) and not ("penambahan dns" in full_text and "reserve" not in full_text)

    # IPAM keywords - Domain: Network (per user requirement)
    is_ipam = any(k in full_text for k in [
        "ipam", "segment", "subnet", "vlan", "range ip", "pool ip", "ip pool", 
        "alokasi ip", "ip allocation", "reverse ip segment", "data segment"
    ])

    # DNS Request keywords
    is_dns = any(k in full_text for k in [
        "dns", "cname", "a record", "a-record", "arecord", "ptr", "reverse dns", 
        "mapping ip", "txt record", "mx record", "subdomain", "fkk", "load balancer", 
        "lb atm", "f5"
    ]) or ("reverse ip" in full_text and not is_ipam)

    if is_drp:
        return {
            "mainCategory": "Maintenance",
            "kriteria": "DRP",
            "subTipe": "Standby Support DRP",
            "technicalCategory": "Infrastructure",
            "reason": "Permohonan kegiatan DRP / standby engineer onsite"
        }
    elif is_reserve_ip:
        sub = "Fixed Address / Static IP" if ("fixed address" in full_text or "static" in full_text) else "Reserve IP (Static/DHCP)"
        return {
            "mainCategory": "Service Request",
            "kriteria": "Reserve IP",
            "subTipe": sub,
            "technicalCategory": "DHCP",
            "reason": "Permohonan reservasi IP / Fixed Address Infoblox"
        }
    elif is_ipam:
        sub = "Subnet & Segment Allocation" if ("segment" in full_text or "subnet" in full_text) else "IPAM Management"
        return {
            "mainCategory": "Service Request",
            "kriteria": "IPAM",
            "subTipe": sub,
            "technicalCategory": "Network", # User requirement: IPAM in Network domain
            "reason": "Permintaan manajemen IPAM & alokasi subnet Infoblox"
        }
    elif is_dns:
        dns_types = []
        if "cname" in full_text:
            dns_types.append("CNAME")
        if re.search(r'\ba\s*record\b|\ba\s*rec\b|\ba\b.*record', full_text) or "a-record" in full_text or "mapping ip" in full_text:
            dns_types.append("A Record")
        if "txt" in full_text or "text record" in full_text:
            dns_types.append("TXT")
        if "ptr" in full_text or "reverse" in full_text:
            dns_types.append("PTR (Reverse DNS)")
        if "mx" in full_text or "mail" in full_text:
            dns_types.append("MX")
        if "lb" in full_text or "load balancer" in full_text or "fkk" in full_text:
            dns_types.append("Load Balancer / VIP")
            
        if not dns_types:
            dns_types.append("A Record")
            
        sub = ", ".join(dns_types)
        return {
            "mainCategory": "Change Request",
            "kriteria": "DNS Request",
            "subTipe": sub,
            "technicalCategory": "DNS",
            "reason": f"Permintaan DNS ({sub})"
        }
    else:
        sub = "Report & Meeting" if any(k in full_text for k in ["meeting", "report", "laporan", "koordinasi"]) else "General Support"
        tech = "Network" if any(k in full_text for k in ["network", "jaringan", "koneksi"]) else "Application"
        return {
            "mainCategory": "Service Request",
            "kriteria": "Other",
            "subTipe": sub,
            "technicalCategory": tech,
            "reason": "Kategori operasional lainnya"
        }

from urllib.parse import unquote

WIB = timezone(timedelta(hours=7))

def is_time_string(s):
    """Detects if a string represents an elapsed time/age (e.g. '7 h 12 j', '38 m', '10 h 7 j')."""
    if not s:
        return True
    s = s.strip()
    if re.match(r'^\d+\s*[hjdms]\b', s, re.IGNORECASE):
        return True
    if re.search(r'^\d+\s*(?:j|h|d|m|jam|hari|menit)', s, re.IGNORECASE):
        return True
    if re.search(r'\d+\s*[hjdm]\s+\d+\s*[hjdm]', s, re.IGNORECASE):
        return True
    return False

def clean_engineer_name(raw_owner, raw_sender="", customer_email=""):
    """
    Cleans raw owner / sender string from OTRS to ensure it is a valid engineer name.
    Strictly avoids assigning age strings ('7 h 12 j', '38 m') as engineer name.
    """
    if is_time_string(raw_owner):
        raw_owner = ''
    if is_time_string(raw_sender):
        raw_sender = ''

    def sanitize(val):
        if not val:
            return ''
        v = unescape(val).strip()
        v = v.split('/')[0].strip()
        v = re.sub(r'\(.*?\)', '', v).strip()
        v = re.sub(r'<.*?>', '', v).strip()
        v = re.sub(r'["\']', '', v).strip()
        v = re.sub(r'\s+', ' ', v).strip()
        return v

    owner_name = sanitize(raw_owner)
    sender_name = sanitize(raw_sender)

    # 1. If owner is a real person and not Admin OTRS
    if owner_name and 'admin otrs' not in owner_name.lower() and not is_time_string(owner_name):
        return owner_name

    # 2. If sender is not customer and not Admin OTRS
    if sender_name and not is_time_string(sender_name):
        is_customer = False
        if customer_email and 'bankbsi' in customer_email.lower():
            if sender_name.lower() in customer_email.lower() or 'excellenta' in sender_name.lower():
                is_customer = True
        if not is_customer and 'admin otrs' not in sender_name.lower():
            return sender_name

    # 3. Default to primary Infoblox engineer
    return 'Ismail Akbar'

def parse_icare_datetime(date_str, tnum=""):
    """
    Parses 'DD/MM/YYYY HH:MM:SS' or 'DD/MM/YYYY HH:MM' from iCare OTRS into ISO timestamp with +07:00 (WIB).
    """
    if date_str:
        m = re.search(r'(\d{1,2})/(\d{1,2})/(\d{4})\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?', date_str)
        if m:
            day, month, year, hour, minute, sec = m.groups()
            sec = sec or '00'
            try:
                dt = datetime(int(year), int(month), int(day), int(hour), int(minute), int(sec), tzinfo=WIB)
                return dt.isoformat()
            except Exception:
                pass

    # Fallback to ticket number YYYYMMDD
    if tnum and len(tnum) >= 8 and tnum[:8].isdigit():
        try:
            y, m, d = int(tnum[:4]), int(tnum[4:6]), int(tnum[6:8])
            dt = datetime(y, m, d, 9, 0, 0, tzinfo=WIB)
            return dt.isoformat()
        except Exception:
            pass

    return datetime.now(WIB).isoformat()

def parse_ticket_medium_block(tid, blk, default_qcode="OP0899", default_qname="OP0899 - BSI DNS & DHCP Infoblox"):
    """Parses a single ticket block from OTRS View=Medium."""
    # Ticket number
    tnum_m = re.search(r'Ticket#(\d{10,20})', blk)
    tnum = tnum_m.group(1) if tnum_m else tid

    # Subject
    subj_m = re.search(r'<label>Subyek</label><div title="([^"]+)">', blk)
    if not subj_m:
        subj_m = re.search(r'Ticket#\d+\s*(?:&ndash;|-)\s*([^<]+)</a>', blk)
    subj = unescape(subj_m.group(1).strip()) if subj_m else ""

    # Created date in WIB (GMT+7)
    created_m = re.search(r'<label>Dibuat</label>\s*(\d{1,2}/\d{1,2}/\d{4}\s+\d{1,2}:\d{1,2}(?::\d{1,2})?)', blk)
    created_raw = created_m.group(1) if created_m else ""
    created_iso = parse_icare_datetime(created_raw, tnum)

    # State / Status
    state_m = re.search(r'<label>Kondisi</label><div title="([^"]+)">', blk)
    state = state_m.group(1).strip() if state_m else "open"
    status = parse_status(state)

    # Owner / Responsible
    owner_m = re.search(r'<label>Pemilik\s*/\s*Tanggung Jawab</label><div title="([^"]+)">', blk)
    owner_raw = owner_m.group(1).strip() if owner_m else ""

    # Sender
    sender_m = re.search(r'<label>Pengirim</label><div title="([^"]+)">', blk)
    sender_raw = sender_m.group(1).strip() if sender_m else ""

    # Customer Email
    cust_m = re.search(r'CustomerID=([^"&]+)', blk)
    cust_email = unquote(cust_m.group(1).strip()) if cust_m else "customer@bankbsi.co.id"

    # Clean engineer / assignee name
    engineer_name = clean_engineer_name(owner_raw, sender_raw, cust_email)

    # Priority
    prio_m = re.search(r'PriorityID-(\d+)', blk)
    prio_val = prio_m.group(1) if prio_m else "3"

    # Queue
    qname_m = re.search(r'<label>Antri</label><div title="([^"]+)">', blk)
    qname = qname_m.group(1).strip() if qname_m else default_qname
    qcode = "OP0968" if "OP0968" in qname or "Cibitung" in qname else ("OP0899" if "OP0899" in qname else default_qcode)

    cls = classify_ticket(subj)

    due_dt = datetime.fromisoformat(created_iso) + timedelta(hours=24)

    return {
        "id": f"tkt-otrs-{tid}",
        "ticketNumber": tnum,
        "externalId": f"OTRS-{tnum}",
        "subject": subj,
        "description": subj,
        "mainCategory": cls["mainCategory"],
        "technicalCategory": cls["technicalCategory"],
        "kriteria": cls["kriteria"],
        "subTipe": cls["subTipe"],
        "priority": parse_priority(prio_val),
        "status": status,
        "requester": cust_email.split('@')[0].replace('.', ' ').title() if '@' in cust_email else "BSI Operations",
        "requesterName": cust_email.split('@')[0].replace('.', ' ').title() if '@' in cust_email else "BSI Operations",
        "requesterEmail": cust_email,
        "assignmentGroup": "Infoblox Operations",
        "assigneeId": "usr-ismailak",
        "assigneeName": engineer_name,
        "assigneeRole": "admin",
        "department": "DNS & DHCP Infoblox Engineering",
        "createdAt": created_iso,
        "updatedAt": created_iso,
        "dueAt": due_dt.isoformat(),
        "closedAt": created_iso if status == "CLOSED" else None,
        "resolutionNote": "Tiket telah terselesaikan pada Infoblox dan tercatat di OTRS." if status == "CLOSED" else None,
        "slaHours": 24,
        "slaStatus": "SAFE",
        "tags": [qcode, cls["kriteria"]],
        "queueCode": qcode,
        "queueName": qname,
        "otrsUrl": f"{BASE_URL}?Action=AgentTicketZoom;TicketID={tid}",
        "lastSyncAt": datetime.now(timezone.utc).isoformat(),
    }

def fetch_active_queues(session):
    """Fetches currently active tickets from Queue 72 and Queue 121 in View=Medium."""
    queues = [
        ("72", "OP0899", "OP0899 - BSI DNS & DHCP Infoblox"),
        ("121", "OP0968", "OP0968 - BSI - Infoblox DNS & DHCP DC2 Cibitung"),
    ]
    all_tickets = []
    
    for qid, qcode, qname in queues:
        url = f"{BASE_URL}?Action=AgentTicketQueue;QueueID={qid};View=Medium;Filter=All"
        try:
            r = session.get(url, headers=DEFAULT_HEADERS, timeout=15)
            parts = re.split(r'<li id="TicketID_(\d+)"', r.text)
            for i in range(1, len(parts), 2):
                tid = parts[i]
                blk = parts[i+1]
                ticket = parse_ticket_medium_block(tid, blk, default_qcode=qcode, default_qname=qname)
                all_tickets.append(ticket)
        except Exception as e:
            sys.stderr.write(f"Error fetching queue {qid}: {str(e)}\n")
            
    return all_tickets

def fetch_historical_tickets(session, max_tickets=250):
    """
    Performs comprehensive AgentTicketSearch across Queue 72 and 121 using View=Medium.
    Paginates through search results to retrieve historical tickets (> 3 months) with exact WIB times.
    """
    sys.stderr.write("Initiating OTRS Search for OP0899 & OP0968 (View=Medium)...\n")
    
    # 1. Fetch search dialog token
    r_form = session.get(f"{BASE_URL}?Action=AgentTicketSearch;Subaction=AJAX", headers=DEFAULT_HEADERS, timeout=15)
    token_m = re.search(r'name="ChallengeToken"\s*value="([^"]+)"', r_form.text)
    if not token_m:
        sys.stderr.write("Failed to get ChallengeToken from search dialog, falling back to active queues.\n")
        return fetch_active_queues(session)
        
    token = token_m.group(1)
    
    # 2. Execute initial search
    payload = [
        ('Action', 'AgentTicketSearch'),
        ('Subaction', 'Search'),
        ('ChallengeToken', token),
        ('QueueIDs', '72'),
        ('QueueIDs', '121'),
        ('ResultForm', 'Normal'),
    ]
    
    res = session.post(BASE_URL, data=payload, headers=DEFAULT_HEADERS, timeout=20)
    if res.status_code != 200:
        sys.stderr.write(f"Search POST failed with status {res.status_code}\n")
        return fetch_active_queues(session)
        
    all_tickets = []
    seen_ids = set()
    
    start_hit = 1
    page_num = 1
    
    while len(all_tickets) < max_tickets:
        page_url = f"{BASE_URL}?Action=AgentTicketSearch;Filter=;View=Medium;SortBy=Created;OrderBy=Down;Profile=last-search;TakeLastSearch=1;Subaction=Search;StartWindow=0;StartHit={start_hit}"
        try:
            res = session.get(page_url, headers=DEFAULT_HEADERS, timeout=18)
        except Exception as e:
            sys.stderr.write(f"Error fetching page {page_num}: {e}\n")
            break
            
        parts = re.split(r'<li id="TicketID_(\d+)"', res.text)
        num_found_on_page = (len(parts) - 1) // 2
        if num_found_on_page == 0:
            sys.stderr.write(f"No more tickets found at page {page_num}.\n")
            break
            
        sys.stderr.write(f"Page {page_num}: retrieved {num_found_on_page} tickets (total accumulated: {len(all_tickets)})\n")
        
        for i in range(1, len(parts), 2):
            tid = parts[i]
            blk = parts[i+1]
            if tid in seen_ids:
                continue
            seen_ids.add(tid)
            
            ticket = parse_ticket_medium_block(tid, blk)
            all_tickets.append(ticket)
            
            if len(all_tickets) >= max_tickets:
                break
                
        start_hit += num_found_on_page
        page_num += 1
        time.sleep(0.4) # Gentle rate limit
        
    return all_tickets

def main():
    parser = argparse.ArgumentParser(description="OTRS Ticket History Fetcher")
    parser.add_argument("--mode", choices=["all", "active", "historical"], default="historical", help="Sync mode")
    parser.add_argument("--limit", type=int, default=200, help="Max tickets to fetch")
    parser.add_argument("--save-cache", action="store_true", help="Save result to cache file")
    args = parser.parse_args()
    
    session, sess_id = get_session()
    if not sess_id:
        sys.stderr.write("Failed to establish OTRS session\n")
        print(json.dumps({"success": False, "error": "Failed to establish OTRS session"}))
        sys.exit(1)
        
    if args.mode == "active":
        tickets = fetch_active_queues(session)
    else:
        tickets = fetch_historical_tickets(session, max_tickets=args.limit)
        
    # Criteria summary breakdown
    breakdown = {}
    for t in tickets:
        k = t.get("kriteria", "Other")
        breakdown[k] = breakdown.get(k, 0) + 1
        
    result = {
        "success": True,
        "mode": args.mode,
        "totalFetched": len(tickets),
        "breakdown": breakdown,
        "tickets": tickets,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
    
    if args.save_cache or len(tickets) > 0:
        try:
            with open(CACHE_FILE, "w", encoding="utf-8") as f:
                json.dump(result, f, indent=2)
        except Exception as e:
            sys.stderr.write(f"Cache write error: {e}\n")
            
    print(json.dumps(result))

if __name__ == "__main__":
    main()
