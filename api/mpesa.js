// api/mpesa.js - REAL Daraja, NO FAKE
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({error:'POST only'});
  
  try {
    const { phone, amount } = req.body;
    console.log('MPESA REQUEST:', phone, amount);
    
    const consumerKey = process.env.MPESA_CONSUMER_KEY;
    const consumerSecret = process.env.MPESA_CONSUMER_SECRET;
    const passkey = process.env.MPESA_PASSKEY;
    const shortcode = process.env.MPESA_SHORTCODE || '174379';
    
    // CHECK ENV
    if(!consumerKey || !consumerSecret || !passkey){
      console.error('ENV MISSING:', {hasKey:!!consumerKey, hasSecret:!!consumerSecret, hasPasskey:!!passkey});
      return res.status(500).json({error:'MPESA keys missing in Vercel Env'});
    }

    // Phone format
    let cleanPhone = phone.toString().replace(/\D/g,'');
    if(cleanPhone.startsWith('0')) cleanPhone = '254'+cleanPhone.slice(1);
    if(!cleanPhone.startsWith('254')) cleanPhone = '254'+cleanPhone;
    
    // 1. Token
    const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');
    const tokenResponse = await fetch('https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials', {
      headers: { Authorization: `Basic ${auth}` }
    });
    const tokenJson = await tokenResponse.json();
    console.log('TOKEN RESPONSE:', tokenJson);
    
    if(!tokenJson.access_token){
      return res.status(500).json({error:'Token failed', details: tokenJson});
    }

    // 2. Password
    const timestamp = new Date().toISOString().replace(/[^0-9]/g,'').slice(0,-3);
    // timestamp format: YYYYMMDDHHmmss
    const timestamp2 = new Date().toLocaleString('en-KE', {timeZone:'Africa/Nairobi', year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit', second:'2-digit', hour12:false}).replace(/[^0-9]/g,'');
    // fallback simple
    const finalTimestamp = timestamp.length===14 ? timestamp : timestamp2;
    const password = Buffer.from(`${shortcode}${passkey}${finalTimestamp}`).toString('base64');

    // 3. STK Push REAL
    const payload = {
      BusinessShortCode: shortcode,
      Password: password,
      Timestamp: finalTimestamp,
      TransactionType: 'CustomerPayBillOnline',
      Amount: parseInt(amount) || 1,
      PartyA: cleanPhone,
      PartyB: shortcode,
      PhoneNumber: cleanPhone,
      CallBackURL: 'https://stock-trader-nu.vercel.app/api/callback',
      AccountReference: 'StockTrader',
      TransactionDesc: 'Deposit'
    };
    
    console.log('STK PAYLOAD:', payload);

    const stkResponse = await fetch('https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${tokenJson.access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    
    const stkData = await stkResponse.json();
    console.log('STK RESPONSE:', stkData);
    
    // Return REAL Safaricom response, not fake
    return res.status(stkResponse.status).json(stkData);

  } catch (err) {
    console.error('MPESA CRASH:', err);
    return res.status(500).json({error: err.message, stack: err.stack});
  }
}