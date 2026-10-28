// Vercel Serverless Function: GET /api/config
module.exports = async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const resendApiKey = (process.env.RESEND_API_KEY || '').trim();
    const twilioSid = (process.env.TWILIO_ACCOUNT_SID || '').trim();

    return res.status(200).json({
        resend_configured: Boolean(resendApiKey),
        twilio_configured: Boolean(twilioSid),
        service: 'MindSet Vercel Serverless OTP'
    });
};
