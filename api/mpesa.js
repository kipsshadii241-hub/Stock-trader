// REAL MPESA Daraja STK Push - Vercel Serverless
export default async function handler(req,res){
 if(req.method!=='POST') return res.status(405).json({error:'Method not allowed'});
 const {amount,phone}=req.body;
 if(!amount||!phone) return res.status(400).json({error:'Missing amount/phone'});
 // Check if env vars are set
 const key=process.env.MPESA_CONSUMER_KEY;
 const secret=process.env.MPESA_CONSUMER_SECRET;
 const passkey=process.env.MPESA_PASSKEY;
 const shortcode=process.env.MPESA_SHORTCODE||'174379'; // test shortcode
 if(!key||!secret||!passkey){
   return res.json({success:false,fallback:true,error:'MPESA API not configured - set env vars in Vercel'});
 }
 try{
   // 1. Get token
   const auth=Buffer.from(`${key}:${secret}`).toString('base64');
   const tokenRes=await fetch('https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials',{headers:{Authorization:`Basic ${auth}`}});
   const tokenData=await tokenRes.json();
   const token=tokenData.access_token;
   // 2. STK Push
   const timestamp=new Date().toISOString().replace(/[^0-9]/g,'').slice(0,14);
   const password=Buffer.from(shortcode+passkey+timestamp).toString('base64');
   let cleanPhone=phone.replace(/\D/g,''); if(cleanPhone.startsWith('0')) cleanPhone='254'+cleanPhone.slice(1); if(cleanPhone.startsWith('+')) cleanPhone=cleanPhone.slice(1);
   const stkRes=await fetch('https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest',{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({BusinessShortCode:shortcode,Password:password,Timestamp:timestamp,TransactionType:'CustomerPayBillOnline',Amount:Math.round(amount*129.7),PartyA:cleanPhone,PartyB:shortcode,PhoneNumber:cleanPhone,CallBackURL:'https://rqptrade.com/api/callback',AccountReference:'RQPtrade',TransactionDesc:'Deposit'})});
   const stkData=await stkRes.json();
   if(stkData.ResponseCode=='0') return res.json({success:true,msg:'STK sent',data:stkData});
   else return res.json({success:false,error:stkData.errorMessage||'STK failed',data:stkData});
 }catch(e){return res.status(500).json({success:false,error:e.message})}
}