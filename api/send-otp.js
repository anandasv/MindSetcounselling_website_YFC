// Vercel Serverless Function: POST /api/send-otp
const crypto = require('crypto');

const OTP_SECRET = process.env.OTP_SECRET || 'mindset_otp_secure_secret_key_2026';
const OTP_EXPIRE_MS = 5 * 60 * 1000; // 5 minutes

function generateOtp() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

function createToken(contact, otp, expiresAt) {
    const data = `${contact.toLowerCase().trim()}:${otp}:${expiresAt}`;
    const hmac = crypto.createHmac('sha256', OTP_SECRET).update(data).digest('hex');
    return `${hmac}.${expiresAt}`;
}

module.exports = async function handler(req, res) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, message: 'Method Not Allowed' });
    }

    try {
        const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
        const contact = (body.contact || '').trim();
        const studentName = (body.name || 'Student').trim() || 'Student';
        const role = (body.role || 'A Student').trim();
        const parentName = (body.parentName || '').trim();

        if (!contact) {
            return res.status(400).json({ success: false, message: 'Contact address is required.' });
        }

        const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact);
        const digits = contact.replace(/\D/g, '');
        const isPhone = digits.length >= 10;

        if (!isEmail && !isPhone) {
            return res.status(400).json({
                success: false,
                message: 'Please enter a valid email address or 10-digit mobile number.'
            });
        }

        const otp = generateOtp();
        const expiresAt = Date.now() + OTP_EXPIRE_MS;
        const token = createToken(contact, otp, expiresAt);

        console.log(`[OTP] Generated for ${contact}: ${otp}`);

        let sentReal = false;
        let deliveryNote = '';

        const resendApiKey = (process.env.RESEND_API_KEY || '').trim();
        const resendFrom = (process.env.RESEND_FROM || 'onboarding@resend.dev').trim();

        const twilioSid = (process.env.TWILIO_ACCOUNT_SID || '').trim();
        const twilioAuth = (process.env.TWILIO_AUTH_TOKEN || '').trim();
        const twilioPhone = (process.env.TWILIO_PHONE_NUMBER || '').trim();

        // 1. If Email & Resend is configured
        if (isEmail && resendApiKey) {
            try {
                const response = await fetch('https://api.resend.com/emails', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${resendApiKey}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        from: `MindSet <${resendFrom}>`,
                        to: [contact],
                        subject: `🧠 Your MindSet Verification Code: ${otp}`,
                        html: `
                        <div style="font-family: Arial, sans-serif; background-color: #0d0d12; color: #f1f5f9; padding: 30px; border-radius: 12px; border: 1px solid #d4af37; max-width: 500px; margin: 0 auto;">
                            <h2 style="color: #f5d77f; margin-top: 0;">🧠 MindSet Micro-Coaching</h2>
                            <p style="font-size: 15px; color: #cbd5e1;">Hi <strong>${studentName}</strong>${parentName ? ` (Parent: ${parentName})` : ''},</p>
                            <p style="font-size: 14px; color: #cbd5e1;">Your 6-digit verification code to confirm your MindSet session is:</p>
                            <div style="background: #161622; border: 2px dashed #d4af37; border-radius: 8px; padding: 18px; text-align: center; margin: 20px 0;">
                                <span style="font-size: 34px; font-weight: 800; letter-spacing: 6px; color: #ffd700; font-family: monospace;">${otp}</span>
                            </div>
                            <p style="font-size: 12px; color: #94a3b8;">This code is valid for 5 minutes. Do not share this code with anyone.</p>
                            <hr style="border: none; border-top: 1px solid rgba(212, 175, 55, 0.2); margin: 20px 0;">
                            <p style="font-size: 11px; color: #94a3b8; text-align: center;">MindSet Inc. • 15-Minute Micro-Coaching for Students</p>
                        </div>
                        `
                    })
                });

                if (response.ok) {
                    sentReal = true;
                    deliveryNote = `Sent real verification email to ${contact} via Resend!`;
                } else {
                    const errData = await response.json().catch(() => ({}));
                    console.warn('[Resend Warning]', errData);
                    if (errData && errData.message && errData.message.includes('only send testing emails')) {
                        deliveryNote = `Resend test account restricted to account email. Showing test code below.`;
                    }
                }
            } catch (err) {
                console.error('[Resend Error]', err);
            }
        }

        // 2. If SMS & Twilio is configured
        if (isPhone && twilioSid && twilioAuth && twilioPhone) {
            try {
                const formattedPhone = digits.length === 10 ? `+91${digits}` : `+${digits}`;
                const b64 = Buffer.from(`${twilioSid}:${twilioAuth}`).toString('base64');
                const params = new URLSearchParams({
                    From: twilioPhone,
                    To: formattedPhone,
                    Body: `Your MindSet verification code is: ${otp}. Valid for 5 minutes.`
                });

                const twilioResp = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Basic ${b64}`,
                        'Content-Type': 'application/x-www-form-urlencoded'
                    },
                    body: params.toString()
                });

                if (twilioResp.ok) {
                    sentReal = true;
                    deliveryNote = `Sent real SMS to ${contact} via Twilio!`;
                } else {
                    const errText = await twilioResp.text().catch(() => '');
                    console.warn('[Twilio Warning]', errText);
                }
            } catch (err) {
                console.error('[Twilio Error]', err);
            }
        }

        if (sentReal) {
            return res.status(200).json({
                success: true,
                mode: 'real',
                token: token,
                message: `Verification code sent to ${contact}.`,
                delivery_note: deliveryNote
            });
        } else {
            return res.status(200).json({
                success: true,
                mode: 'simulated',
                otp: otp,
                token: token,
                message: `Code generated for ${contact}.`,
                delivery_note: deliveryNote || 'No live email/SMS API keys detected in Vercel environment variables. Showing code for instant test.'
            });
        }
    } catch (err) {
        console.error('[Handler Error]', err);
        return res.status(500).json({ success: false, message: 'Server error generating verification code.' });
    }
};
