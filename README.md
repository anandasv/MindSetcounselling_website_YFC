# 🎯 Focus Sessions — Real OTP Verification & Startup Landing Page

A high-converting, student-first micro-coaching landing page with a complete 3-step booking flow, real OTP (One-Time Password) email and SMS verification, interactive 15-minute Solo Sprint timer with synthesized Web Audio ambience, and Google Calendar integration.

---

## ⚡ Features

1. **Real OTP Verification System**:
   - Sends real 6-digit verification codes to student email addresses (via SMTP or Resend API) and mobile numbers (via Twilio SMS).
   - Smart contact auto-detection (`📧 EMAIL` vs `📱 SMS`).
   - 6-digit segmented OTP input with auto-advance, backspace navigation, and full 6-digit paste support.
   - 45-second resend countdown timer.
   - Smart fallback/demo mode for local testing without SMTP keys.

2. **3-Step Booking Flow**:
   - **Step 1**: Student details, preferred day/time chip selection, topic selection, and focus goal notes.
   - **Step 2**: 6-Digit OTP contact verification.
   - **Step 3**: Booking confirmation receipt, celebratory canvas confetti animation, and one-click Google Calendar invite builder.

3. **15-Minute Solo Sprint Focus Tool**:
   - Solo focus timer with Start, Pause, and Reset controls.
   - Web Audio API synthesized background soundscapes: **Soft Rain 🌧️**, **White Noise 🌊**, and **Lo-Fi Cafe ☕**.

---

## 🚀 How to Run Locally

No npm or external installations required! Runs out-of-the-box with standard Python 3.

```bash
# 1. Start the backend server
python3 server.py

# 2. Open in your browser
http://localhost:8000
```

---

## 📧 How to Configure Real Email & SMS Credentials

To send live emails or SMS text messages to real addresses, copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

### Gmail Setup Example:
1. Enable 2-Step Verification on your Google Account.
2. Generate an App Password at `https://myaccount.google.com/apppasswords`.
3. Fill in `.env`:
   ```ini
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your-email@gmail.com
   SMTP_PASS=your-16-character-app-password
   ```

### Twilio SMS Setup Example:
1. Get your Twilio Account SID, Auth Token, and Phone Number from the Twilio Console.
2. Fill in `.env`:
   ```ini
   TWILIO_ACCOUNT_SID=AC...
   TWILIO_AUTH_TOKEN=...
   TWILIO_PHONE_NUMBER=+1555...
   ```

Restart `python3 server.py` after editing `.env` to apply your credentials!
