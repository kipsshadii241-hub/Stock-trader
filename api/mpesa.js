export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({error:'POST only'});
  const { phone, amount } = req.body;
  console.log('REQUEST:', phone, amount);

  try {
    const consumerKey = process.env.MPESA_CONSUMER_KEY?.trim();
    const consumerSecret = process.env.MPESA_CONSUMER_SECRET?.trim();
    const passkey = process.env.MPESA_PASSKEY?.trim();
    const shortcode = (process.env.MPESA_SHORTCODE || '174379').trim();

    console.log('ENV CHECK:', { hasKey: !!consumerKey, hasSecret: !!consumerSecret, hasPasskey: !!passkey, shortcode });

    if(!consumerKey || !consumerSecret || !passkey){
      return res.status(500).json({error: 'Keys missing in Vercel Env'});
    }

    let cleanPhone = phone.toString().replace(/\D/g,'');
    if(cleanPhone.startsWith('0')) cleanPhone = '254' + cleanPhone.slice(1);
    if(cleanPhone.length === 9) cleanPhone = '254' + cleanPhone;

    const isSandbox = shortcode === '174379';
    const baseUrl = isSandbox ? 'https://sandbox.safaricom.co.ke' : 'https://api.safaricom.co.ke';
    console.log('Using URL:', baseUrl, 'Sandbox?', isSandbox);

    // 1. TOKEN - read as text first
    const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');
    const tokenRes = await fetch(`${baseUrl}/oauth/v1/generate?grant_type=client_credentials`, {
      headers: { Authorization: `Basic ${auth}` }
    });
    
    const tokenText = await tokenRes.text();
    console.log('TOKEN RAW:', tokenText);
    
    if(!tokenRes.ok){
      return res.status(500).json({ error: 'Token Failed', status: tokenRes.status, raw: tokenText });
    }
    
    let tokenJson;
    try { tokenJson = JSON.parse(tokenText); } 
    catch(e){ return res.status(500).json({ error: 'Token not JSON', raw: tokenText }); }
    
    if(!tokenJson.access_token){
      return res.status(500).json({ error: 'No access_token', details: tokenJson });
    }

    // 2. STK - correct timestamp
    const now = new Date();
    const timestamp = now.getFullYear().toString() + 
      String(now.getMonth()+1).padStart(2,'0') + 
      String(now.getDate()).padStart(2,'0') + 
      String(now.getHours()).padStart(2,'0') + 
      String(now.getMinutes()).padStart(2,'0') + 
      String(now.getSeconds()).padStart(2,'0');

    const password = Buffer.from(`${shortcode}${passkey}${timestamp}`).toString('base64');

    const payload = {
      BusinessShortCode: shortcode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: 'CustomerPayBillOnline',
      Amount: parseInt(amount) || 1,
      PartyA: cleanPhone,
      PartyB: shortcode,
      PhoneNumber: cleanPhone,
      CallBackURL: 'https://stock-trader-nu.vercel.app/api/callback',
      AccountReference: 'RQP',
      TransactionDesc: 'Deposit'
    };

    console.log('STK Payload:', payload);

    const stkRes = await fetch(`${baseUrl}/mpesa/stkpush/v1/processrequest`, {
      method: 'POST',
      headers: { 
        Authorization: `Bearer ${tokenJson.access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const stkText = await stkRes.text();
    console.log('STK RAW:', stkText);
    
    let stkData;
    try { stkData = JSON.parse(stkText); }
    catch(e){ stkData = { raw: stkText }; }

    return res.status(stkRes.status).json(stkData);

  } catch(err){
    console.error('CRASH:', err);
    return res.status(500).json({ error: err.message, stack: err.stack });
  }
}