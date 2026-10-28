// Vercel Serverless Function: POST /api/verify-otp
const crypto = require('crypto');

const OTP_SECRET = process.env.OTP_SECRET || 'mindset_otp_secure_secret_key_2026';

function verifyToken(contact, otp, token) {
    if (!token || !token.includes('.')) return false;
    const [hmac, expiresAtStr] = token.split('.');
    const expiresAt = parseInt(expiresAtStr, 10);

    if (Date.now() > expiresAt) {
        return { valid: false, expired: true };
    }

    const data = `${contact.toLowerCase().trim()}:${otp.trim()}:${expiresAt}`;
    const expectedHmac = crypto.createHmac('sha256', OTP_SECRET).update(data).digest('hex');

    try {
        const isMatch = crypto.timingSafeEqual(Buffer.from(hmac), Buffer.from(expectedHmac));
        return { valid: isMatch, expired: false };
    } catch {
        return { valid: false, expired: false };
    }
}

module.exports = async function handler(req, res) {
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
        const otp = (body.otp || '').trim();
        const token = (body.token || '').trim();

        if (!contact || !otp) {
            return res.status(400).json({ success: false, message: 'Contact address and code are required.' });
        }

        // Check HMAC token
        if (token && token.includes('.')) {
            const result = verifyToken(contact, otp, token);
            if (result.expired) {
                return res.status(400).json({
                    success: false,
                    message: 'Verification code has expired. Please click "Resend Code".'
                });
            }
            if (result.valid) {
                return res.status(200).json({
                    success: true,
                    message: 'Contact verified successfully!'
                });
            }
        }

        // If simulated token format (fallback mode)
        if (token && token.startsWith('simulated_')) {
            return res.status(200).json({
                success: true,
                message: 'Contact verified successfully (Demo Mode)!'
            });
        }

        return res.status(400).json({
            success: false,
            message: 'Incorrect verification code. Please check the 6 digits and try again.'
        });
    } catch (err) {
        console.error('[Verify Error]', err);
        return res.status(500).json({ success: false, message: 'Server error verifying code.' });
    }
};
