#!/usr/bin/env python3
"""
Focus Sessions - Backend Server & OTP Verification Service
Serves static web files and provides REST API endpoints for sending and verifying OTP codes via Email & SMS.
"""

import http.server
import base64
import json
import mimetypes
import os
import re
import secrets
import smtplib
import ssl
import sys
import time
import urllib.parse
import urllib.request
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

try:
    import certifi
except ImportError:
    certifi = None

PORT = int(os.environ.get("PORT", 8000))
OTP_EXPIRE_SECONDS = 300  # 5 minutes expiration

# In-memory OTP storage: { contact: {"code": str, "expires_at": float, "name": str} }
otp_store = {}

def create_ssl_context():
    """Use certifi's CA bundle when macOS Python has no system CA path."""
    if certifi:
        return ssl.create_default_context(cafile=certifi.where())
    return ssl.create_default_context()

def load_env_file(env_path=".env"):
    """Load simple key=value pairs from .env file if present."""
    if os.path.exists(env_path):
        try:
            with open(env_path, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith("#") and "=" in line:
                        k, v = line.split("=", 1)
                        os.environ.setdefault(k.strip(), v.strip().strip("'\""))
        except Exception as e:
            print(f"[ENV] Notice: Could not parse .env file: {e}")

load_env_file()

def is_valid_email(contact):
    """Check if contact string is a valid email address."""
    return re.match(r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$", contact.strip()) is not None

def is_valid_phone(contact):
    """Check if contact string is a valid 10+ digit phone number."""
    digits = re.sub(r"\D", "", contact)
    return len(digits) >= 10

def send_real_email_via_smtp(recipient, otp_code, student_name="Student"):
    """Send real OTP email using SMTP credentials configured in environment variables."""
    smtp_host = os.environ.get("SMTP_HOST", "").strip()
    smtp_port = int(os.environ.get("SMTP_PORT", 587))
    smtp_user = os.environ.get("SMTP_USER", "").strip()
    smtp_pass = os.environ.get("SMTP_PASS", "").strip()
    sender = os.environ.get("SMTP_FROM", smtp_user or "no-reply@focussessions.com").strip()

    # Skip when credentials are absent or still use the sample values from .env.
    # This lets the configured Resend fallback run without a needless SMTP attempt.
    placeholder_values = ("your-", "example", "placeholder")
    if (
        not (smtp_host and smtp_user and smtp_pass)
        or smtp_user.lower().startswith(placeholder_values)
        or smtp_pass.lower().startswith(placeholder_values)
    ):
        return False, "SMTP credentials not configured"

    msg = MIMEMultipart("alternative")
    msg["Subject"] = f"🧠Your MindSet Verification Code: {otp_code}"
    msg["From"] = f"Focus Sessions <{sender}>"
    msg["To"] = recipient

    text_body = f"""Hi {student_name},

Your one-time verification code (OTP) for MindSet is: {otp_code}

This code is valid for 5 minutes. Please enter it on the website to reserve your free 15-minute micro-coaching session.

Best regards,
The MindSet Team
"""

    html_body = f"""
    <!DOCTYPE html>
    <html>
    <body style="font-family: Arial, sans-serif; background-color: #f8fafc; padding: 20px; color: #334155;">
        <div style="max-width: 480px; margin: 0 auto; background: #ffffff; padding: 30px; border-radius: 12px; border: 1px solid #e2e8f0;">
            <h2 style="color: #4f46e5; margin-top: 0;">🧠 MindSet</h2>
            <p style="font-size: 16px;">Hi <strong>{student_name}</strong>,</p>
            <p style="font-size: 15px;">Your verification code to reserve your 15-minute micro-coaching session is:</p>
            <div style="background-color: #eef2ff; border: 2px dashed #4f46e5; border-radius: 8px; padding: 16px; text-align: center; margin: 20px 0;">
                <span style="font-size: 32px; font-weight: 800; letter-spacing: 6px; color: #3730a3; font-family: monospace;">{otp_code}</span>
            </div>
            <p style="font-size: 13px; color: #64748b;">This code will expire in 5 minutes. Do not share this code with anyone.</p>
        </div>
    </body>
    </html>
    """

    msg.attach(MIMEText(text_body, "plain"))
    msg.attach(MIMEText(html_body, "html"))

    try:
        context = ssl.create_default_context()
        if smtp_port == 465:
            with smtplib.SMTP_SSL(smtp_host, smtp_port, context=context, timeout=8) as server:
                server.login(smtp_user, smtp_pass)
                server.sendmail(sender, [recipient], msg.as_string())
        else:
            with smtplib.SMTP(smtp_host, smtp_port, timeout=8) as server:
                server.starttls(context=context)
                server.login(smtp_user, smtp_pass)
                server.sendmail(sender, [recipient], msg.as_string())
        print("[SMTP SUCCESS] Email accepted by SMTP provider")
        return True, "Email sent via SMTP successfully"
    except Exception as e:
        print(f"[SMTP ERROR] Failed to send email to {recipient}: {e}")
        return False, str(e)

def send_real_email_via_resend(recipient, otp_code, student_name="Student"):
    """Send real OTP email via Resend REST API."""
    api_key = os.environ.get("RESEND_API_KEY", "").strip()
    if not api_key:
        return False, "Resend API key missing"

    sender = os.environ.get("RESEND_FROM", "onboarding@resend.dev").strip()
    url = "https://api.resend.com/emails"

    payload = {
        "from": f"Focus Sessions <{sender}>",
        "to": [recipient],
        "subject": f"🎯 Your Focus Sessions Verification Code: {otp_code}",
        "html": f"<p>Hi <strong>{student_name}</strong>,</p><p>Your verification code to reserve your Focus Session is: <b style='font-size:24px; color:#4f46e5;'>{otp_code}</b></p><p>Valid for 5 minutes.</p>"
    }

    try:
        ctx = create_ssl_context()
        req = urllib.request.Request(
            url,
            data=json.dumps(payload).encode("utf-8"),
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
                "User-Agent": "FocusSessions/1.0 (Macintosh; Intel Mac OS X)"
            },
            method="POST"
        )
        with urllib.request.urlopen(req, context=ctx, timeout=10) as resp:
            resp_body = resp.read().decode("utf-8")
            print(f"[RESEND SUCCESS] Email accepted by provider | Response: {resp_body}")
            if resp.status in (200, 201):
                return True, f"Sent real email to {recipient} via Resend API!"
            return False, f"Resend status {resp.status}"
    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8") if e.fp else ""
        print(f"[RESEND HTTP ERROR {e.code}] {err_body}")
        if "only send testing emails to your own email address" in err_body:
            return False, "Resend testing mode restriction: emails can currently only be sent to your Resend account email address. Add your domain to resend.com/domains to send to any recipient."
        return False, f"Resend API error {e.code}: {err_body}"
    except Exception as e:
        print(f"[RESEND ERROR] {e}")
        return False, str(e)

def send_real_sms_via_twilio(phone_number, otp_code):
    """Send real SMS via Twilio REST API."""
    account_sid = os.environ.get("TWILIO_ACCOUNT_SID", "").strip()
    auth_token = os.environ.get("TWILIO_AUTH_TOKEN", "").strip()
    api_key_sid = os.environ.get("TWILIO_API_KEY_SID", "").strip()
    api_key_secret = os.environ.get("TWILIO_API_KEY_SECRET", "").strip()
    twilio_number = os.environ.get("TWILIO_PHONE_NUMBER", "").strip()

    has_api_key = bool(api_key_sid and api_key_secret)
    has_auth_token = bool(auth_token)
    if not (account_sid and twilio_number and (has_api_key or has_auth_token)):
        return False, "Twilio credentials missing"

    url = f"https://api.twilio.com/2010-04-01/Accounts/{account_sid}/Messages.json"
    
    digits = re.sub(r"\D", "", phone_number)
    formatted_phone = f"+1{digits}" if len(digits) == 10 else f"+{digits}"

    payload = urllib.parse.urlencode({
        "From": twilio_number,
        "To": formatted_phone,
        "Body": f"Your Focus Sessions verification code is: {otp_code}. Valid for 5 minutes."
    }).encode("utf-8")

    # A restricted API key is preferable in deployed environments. Fall back to
    # the Account SID/Auth Token pair for existing configurations.
    auth_user = api_key_sid if has_api_key else account_sid
    auth_secret = api_key_secret if has_api_key else auth_token
    auth_string = f"{auth_user}:{auth_secret}"
    b64_auth = base64.b64encode(auth_string.encode("utf-8")).decode("utf-8")

    try:
        ctx = create_ssl_context()
        req = urllib.request.Request(
            url,
            data=payload,
            headers={
                "Authorization": f"Basic {b64_auth}",
                "Content-Type": "application/x-www-form-urlencoded",
                "User-Agent": "FocusSessions/1.0 (Macintosh; Intel Mac OS X)"
            },
            method="POST"
        )
        with urllib.request.urlopen(req, context=ctx, timeout=10) as resp:
            if resp.status in (200, 201):
                print("[TWILIO SUCCESS] SMS accepted by provider")
                return True, f"Sent real SMS text to {phone_number} via Twilio!"
            return False, f"Twilio HTTP status {resp.status}"
    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8") if e.fp else ""
        print(f"[TWILIO HTTP ERROR {e.code}] {err_body}")
        return False, f"Twilio API error {e.code}: {err_body}"
    except Exception as e:
        print(f"[TWILIO ERROR] {e}")
        return False, str(e)

def _twilio_credentials():
    """Return the account and HTTP Basic credentials for Twilio, if configured."""
    account_sid = os.environ.get("TWILIO_ACCOUNT_SID", "").strip()
    auth_token = os.environ.get("TWILIO_AUTH_TOKEN", "").strip()
    api_key_sid = os.environ.get("TWILIO_API_KEY_SID", "").strip()
    api_key_secret = os.environ.get("TWILIO_API_KEY_SECRET", "").strip()

    if not account_sid:
        return None
    if api_key_sid and api_key_secret:
        return account_sid, api_key_sid, api_key_secret
    if auth_token:
        return account_sid, account_sid, auth_token
    return None

def _format_e164_phone(phone_number):
    digits = re.sub(r"\D", "", phone_number)
    return f"+1{digits}" if len(digits) == 10 else f"+{digits}"

def send_twilio_verify_sms(phone_number):
    """Start a Twilio Verify SMS flow; Twilio generates and sends the OTP."""
    service_sid = os.environ.get("TWILIO_VERIFY_SERVICE_SID", "").strip()
    credentials = _twilio_credentials()
    if not service_sid or not credentials:
        return False, "Twilio Verify is not configured"

    _, auth_user, auth_secret = credentials
    auth_string = f"{auth_user}:{auth_secret}"
    b64_auth = base64.b64encode(auth_string.encode("utf-8")).decode("utf-8")
    payload = urllib.parse.urlencode({
        "To": _format_e164_phone(phone_number),
        "Channel": "sms"
    }).encode("utf-8")

    try:
        req = urllib.request.Request(
            f"https://verify.twilio.com/v2/Services/{service_sid}/Verifications",
            data=payload,
            headers={
                "Authorization": f"Basic {b64_auth}",
                "Content-Type": "application/x-www-form-urlencoded",
                "User-Agent": "FocusSessions/1.0"
            },
            method="POST"
        )
        with urllib.request.urlopen(req, context=create_ssl_context(), timeout=10) as resp:
            if resp.status in (200, 201):
                print("[TWILIO VERIFY SUCCESS] Verification SMS accepted by provider")
                return True, "SMS verification code sent via Twilio Verify"
            return False, f"Twilio Verify HTTP status {resp.status}"
    except urllib.error.HTTPError as e:
        print(f"[TWILIO VERIFY HTTP ERROR {e.code}] {e.read().decode('utf-8') if e.fp else ''}")
        return False, f"Twilio Verify API error {e.code}"
    except Exception as e:
        print(f"[TWILIO VERIFY ERROR] {e}")
        return False, str(e)

def check_twilio_verify_sms(phone_number, code):
    """Ask Twilio Verify to validate the OTP entered by the visitor."""
    service_sid = os.environ.get("TWILIO_VERIFY_SERVICE_SID", "").strip()
    credentials = _twilio_credentials()
    if not service_sid or not credentials:
        return False, "Twilio Verify is not configured"

    _, auth_user, auth_secret = credentials
    b64_auth = base64.b64encode(f"{auth_user}:{auth_secret}".encode("utf-8")).decode("utf-8")
    payload = urllib.parse.urlencode({"To": _format_e164_phone(phone_number), "Code": code}).encode("utf-8")

    try:
        req = urllib.request.Request(
            f"https://verify.twilio.com/v2/Services/{service_sid}/VerificationCheck",
            data=payload,
            headers={
                "Authorization": f"Basic {b64_auth}",
                "Content-Type": "application/x-www-form-urlencoded",
                "User-Agent": "FocusSessions/1.0"
            },
            method="POST"
        )
        with urllib.request.urlopen(req, context=create_ssl_context(), timeout=10) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            return data.get("status") == "approved", data.get("status", "not approved")
    except urllib.error.HTTPError as e:
        return False, f"Twilio Verify API error {e.code}"
    except Exception as e:
        print(f"[TWILIO VERIFY ERROR] {e}")
        return False, str(e)

def send_real_sms_via_carrier_gateway(phone_number, otp_code, student_name="Student"):
    """Send free real SMS via Carrier Email-to-SMS Gateway (Verizon, AT&T, T-Mobile, Sprint) using SMTP."""
    digits = re.sub(r"\D", "", phone_number)
    if len(digits) < 10:
        return False, "Invalid phone number length"

    # 10-digit phone number
    number_10 = digits[-10:]
    carrier_gateways = [
        f"{number_10}@vtext.com",          # Verizon
        f"{number_10}@txt.att.net",         # AT&T
        f"{number_10}@tmomail.net",        # T-Mobile
        f"{number_10}@messaging.sprintpcs.com" # Sprint
    ]

    sent_any = False
    notes = []
    for gateway_email in carrier_gateways:
        ok, note = send_real_email_via_smtp(gateway_email, otp_code, student_name)
        if ok:
            sent_any = True
            notes.append(note)

    if sent_any:
        return True, f"Sent SMS text via Carrier Gateway to {phone_number}!"
    return False, "Carrier gateway SMTP failed"


class RequestHandler(http.server.BaseHTTPRequestHandler):

    def _set_cors_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")

    def do_OPTIONS(self):
        self.send_response(200)
        self._set_cors_headers()
        self.end_headers()

    def do_HEAD(self):
        parsed = urllib.parse.urlparse(self.path)
        filepath = parsed.path.lstrip("/")
        if not filepath:
            filepath = "index.html"
        safe_path = os.path.abspath(filepath)
        if os.path.exists(safe_path) and os.path.isfile(safe_path):
            mime_type, _ = mimetypes.guess_type(safe_path)
            if not mime_type:
                mime_type = "text/plain"
            self.send_response(200)
            self.send_header("Content-Type", mime_type)
            self.end_headers()
        else:
            self.send_error(404, "File Not Found")

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)

        if parsed.path == "/api/config":
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self._set_cors_headers()
            self.end_headers()
            config_status = {
                "smtp_configured": bool(os.environ.get("SMTP_HOST") and os.environ.get("SMTP_USER")),
                "resend_configured": bool(os.environ.get("RESEND_API_KEY")),
                "twilio_configured": bool(
                    os.environ.get("TWILIO_ACCOUNT_SID")
                    and os.environ.get("TWILIO_PHONE_NUMBER")
                    and (
                        os.environ.get("TWILIO_AUTH_TOKEN")
                        or (
                            os.environ.get("TWILIO_API_KEY_SID")
                            and os.environ.get("TWILIO_API_KEY_SECRET")
                        )
                    )
                ),
                "emailjs_public_key": os.environ.get("EMAILJS_PUBLIC_KEY", ""),
                "emailjs_service_id": os.environ.get("EMAILJS_SERVICE_ID", ""),
                "emailjs_template_id": os.environ.get("EMAILJS_TEMPLATE_ID", "")
            }
            self.wfile.write(json.dumps(config_status).encode("utf-8"))
            return

        # Serve static web files
        filepath = parsed.path.lstrip("/")
        if not filepath:
            filepath = "index.html"

        # Prevent directory traversal
        safe_path = os.path.abspath(filepath)
        if not safe_path.startswith(os.getcwd()):
            self.send_error(403, "Forbidden")
            return

        if os.path.exists(safe_path) and os.path.isfile(safe_path):
            mime_type, _ = mimetypes.guess_type(safe_path)
            if not mime_type:
                mime_type = "text/plain"

            self.send_response(200)
            self.send_header("Content-Type", mime_type)
            self.end_headers()

            with open(safe_path, "rb") as f:
                self.wfile.write(f.read())
        else:
            self.send_error(404, "File Not Found")

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        content_length = int(self.headers.get("Content-Length", 0))
        body_data = self.rfile.read(content_length) if content_length > 0 else b"{}"

        try:
            payload = json.loads(body_data.decode("utf-8"))
        except Exception:
            payload = {}

        if parsed.path == "/api/send-otp":
            self.handle_send_otp(payload)
        elif parsed.path == "/api/verify-otp":
            self.handle_verify_otp(payload)
        else:
            self.send_error(404, "Endpoint Not Found")

    def handle_send_otp(self, payload):
        contact = payload.get("contact", "").strip()
        student_name = payload.get("name", "Student").strip() or "Student"

        if not contact:
            self._send_json({"success": False, "message": "Contact address is required."}, 400)
            return

        is_email = is_valid_email(contact)
        is_phone = is_valid_phone(contact)

        if not (is_email or is_phone):
            self._send_json({
                "success": False,
                "message": "Please enter a valid email address or 10-digit phone number."
            }, 400)
            return

        # Generate cryptographically secure 6-digit OTP code
        otp_code = f"{secrets.randbelow(900000) + 100000}"
        expires_at = time.time() + OTP_EXPIRE_SECONDS

        # Store code in memory
        otp_store[contact.lower()] = {
            "code": otp_code,
            "expires_at": expires_at,
            "name": student_name
        }

        print("\n[OTP GENERATED] Expires in 5 minutes")

        sent_real = False
        delivery_note = ""

        if is_email:
            # 1. Try SMTP
            success, note = send_real_email_via_smtp(contact, otp_code, student_name)
            if success:
                sent_real = True
                delivery_note = f"Sent real email to {contact} via SMTP!"
            else:
                # 2. Try Resend API
                success_r, note_r = send_real_email_via_resend(contact, otp_code, student_name)
                if success_r:
                    sent_real = True
                    delivery_note = f"Sent real email to {contact} via Resend API!"

        elif is_phone:
            # Prefer Twilio Verify when configured. It works with trial accounts
            # and safely generates the SMS code outside this application.
            if os.environ.get("TWILIO_VERIFY_SERVICE_SID", "").strip():
                success, note = send_twilio_verify_sms(contact)
            else:
                success, note = send_real_sms_via_twilio(contact, otp_code)
            if success:
                sent_real = True
                delivery_note = note
            else:
                # 2. Try Carrier Email-to-SMS Gateway via SMTP
                success_c, note_c = send_real_sms_via_carrier_gateway(contact, otp_code, student_name)
                if success_c:
                    sent_real = True
                    delivery_note = note_c

        if sent_real:
            self._send_json({
                "success": True,
                "mode": "real",
                # Retained for the older production client, which checks
                # result.dispatch.success before showing the real-delivery UI.
                "dispatch": {"success": True},
                "message": f"Verification code sent to {contact}.",
                "delivery_note": delivery_note
            })
        else:
            # Zero-setup demo/fallback mode: returns OTP code in payload so website displays toast
            self._send_json({
                "success": True,
                "mode": "simulated",
                "dispatch": {"success": False},
                "otp": otp_code,
                "simulated_otp": otp_code,
                "message": f"Code generated for {contact}.",
                "notice": "No live email or SMS provider is configured.",
                "delivery_note": "No SMTP / Twilio credentials configured in .env. Showing simulated code."
            })

    def handle_verify_otp(self, payload):
        contact = payload.get("contact", "").strip().lower()
        submitted_otp = payload.get("otp", "").strip()

        if not contact or not submitted_otp:
            self._send_json({"success": False, "message": "Contact and OTP code are required."}, 400)
            return

        # Twilio Verify owns the code lifecycle for SMS flows when configured.
        if is_valid_phone(contact) and os.environ.get("TWILIO_VERIFY_SERVICE_SID", "").strip():
            verified, detail = check_twilio_verify_sms(contact, submitted_otp)
            if verified:
                self._send_json({"success": True, "message": "Phone number verified successfully!"})
            else:
                self._send_json({"success": False, "message": "Incorrect, expired, or unavailable verification code."}, 400)
            return

        record = otp_store.get(contact)

        if not record:
            self._send_json({
                "success": False,
                "message": "No active verification code found for this contact. Please request a new code."
            }, 400)
            return

        if time.time() > record["expires_at"]:
            del otp_store[contact]
            self._send_json({
                "success": False,
                "message": "Verification code has expired. Please click 'Resend Code'."
            }, 400)
            return

        if record["code"] == submitted_otp:
            # Clear code after successful verification
            del otp_store[contact]
            self._send_json({
                "success": True,
                "message": "Contact verified successfully!"
            })
        else:
            self._send_json({
                "success": False,
                "message": "Incorrect verification code. Please check the code and try again."
            }, 400)

    def _send_json(self, data, status=200):
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self._set_cors_headers()
        self.end_headers()
        self.wfile.write(json.dumps(data).encode("utf-8"))

def run_server():
    server_address = ("", PORT)
    httpd = http.server.HTTPServer(server_address, RequestHandler)
    print(f"============================================================")
    print(f"🎯 Focus Sessions Server Running at http://localhost:{PORT}")
    print(f"============================================================")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down server gracefully...")
        httpd.server_close()

if __name__ == "__main__":
    run_server()
