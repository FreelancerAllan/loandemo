export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { fullName, loanAmount, phone } = req.body || {};

  if (!fullName || !loanAmount || !phone) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const CONSUMER_KEY = process.env.CONSUMER_KEY;
  const CONSUMER_SECRET = process.env.CONSUMER_SECRET;
  const PASSKEY = process.env.PASSKEY || "bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919";
  const SHORTCODE = "174379";
  const CALLBACK_URL = process.env.CALLBACK_URL || "https://your-vercel-app.vercel.app/api/callback";

  try {
    // 1. Get Access Token
    const auth = Buffer.from(`${CONSUMER_KEY}:${CONSUMER_SECRET}`).toString("base64");
    const tokenRes = await fetch(
      "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials",
      { headers: { Authorization: `Basic ${auth}` } }
    );

    if (!tokenRes.ok) {
      const err = await tokenRes.text();
      throw new Error(`Token error: ${err}`);
    }

    const { access_token } = await tokenRes.json();

    // 2. Build timestamp & password
    const now = new Date();
    const timestamp = now.getFullYear().toString() +
      String(now.getMonth() + 1).padStart(2, "0") +
      String(now.getDate()).padStart(2, "0") +
      String(now.getHours()).padStart(2, "0") +
      String(now.getMinutes()).padStart(2, "0") +
      String(now.getSeconds()).padStart(2, "0");

    const password = Buffer.from(`${SHORTCODE}${PASSKEY}${timestamp}`).toString("base64");

    // 3. STK Push payload
    const payload = {
      BusinessShortCode: SHORTCODE,
      Password: password,
      Timestamp: timestamp,
      TransactionType: "CustomerPayBillOnline",
      Amount: 1, // Fixed processing fee
      PartyA: phone,
      PartyB: SHORTCODE,
      PhoneNumber: phone,
      CallBackURL: CALLBACK_URL,
      AccountReference: `Loan-${fullName.replace(/\s+/g, "").substring(0, 10)}`,
      TransactionDesc: `Loan processing fee for ${fullName} (KES ${loanAmount})`
    };

    const stkRes = await fetch(
      "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${access_token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      }
    );

    const stkData = await stkRes.json();

    if (!stkRes.ok) {
      return res.status(stkRes.status).json(stkData);
    }

    return res.status(200).json(stkData);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message });
  }
}