export default async function handler(req,res){
 if(req.method!=='POST') return res.status(405).json({error:'POST only'});
 const {amount,phone}=req.body;
 if(!amount||!phone) return res.status(400).json({error:'amount/phone missing'});
 const key=process.env.MPESA_CONSUMER_KEY;
 const secret=process.env.MPESA_CONSUMER_SECRET;
 const passkey=process.env.MPESA_PASSKEY;
 const shortcode=process.env.MPESA_SHORTCODE||'174379';
 if(!key||!secret||!passkey){
   return res.json({success:false,fallback:true,error:'API not configured'});
 }
 try{
   const auth=Buffer.from(`${key}:${secret}`).toString('base64');
   const tRes=await fetch('https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials',{headers:{Authorization:`Basic ${auth}`}});
   const tData=await tRes.json();
   const token=tData.access_token;
   const timestamp=new Date().toISOString().replace(/[^0-9]/g,'').slice(0,14);
   const password=Buffer.from(shortcode+passkey+timestamp).toString('base64');
   let clean=phone.replace(/\D/g,''); if(clean.startsWith('0')) clean='254'+clean.slice(1);
   const sRes=await fetch('https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest',{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({BusinessShortCode:shortcode,Password:password,Timestamp:timestamp,TransactionType:'CustomerPayBillOnline',Amount:Math.round(amount*129.7),PartyA:clean,PartyB:shortcode,PhoneNumber:clean,CallBackURL:'https://rader-nu.vercel.app/api/callback',AccountReference:'RQPtrade',TransactionDesc:'Deposit'})});
   const sData=await sRes.json();
   if(sData.ResponseCode=='0') return res.json({success:true});
   else return res.json({success:false,error:sData.errorMessage});
 }catch(e){return res.json({success:false,error:e.message})}
}