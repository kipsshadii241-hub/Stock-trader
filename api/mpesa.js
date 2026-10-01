export default async function handler(req,res){
 if(req.method!=='POST') return res.status(405).json({error:'POST only'});
 try{
   const {amount,phone}=req.body;
   const key=process.env.MPESA_CONSUMER_KEY||"nbpojFf5GzOAXw4Ff4Fv4Fv4Fv4Fv4Fv";
   const secret=process.env.MPESA_CONSUMER_SECRET||"nDPUoWjV8VqV8WqV8WqV8WqV8Wq";
   const passkey="bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919";
   const shortcode="174379";
   const auth=Buffer.from(`${key}:${secret}`).toString('base64');
   const tRes=await fetch('https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials',{headers:{Authorization:`Basic ${auth}`}});
   const tData=await tRes.json();
   const token=tData.access_token;
   if(!token) return res.json({success:false,error:'Token failed - check keys'});
   const timestamp=new Date().toISOString().replace(/[^0-9]/g,'').slice(0,14);
   const password=Buffer.from(shortcode+passkey+timestamp).toString('base64');
   let clean=phone.replace(/\D/g,''); if(clean.startsWith('0')) clean='254'+clean.slice(1);
   const stkRes=await fetch('https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest',{
     method:'POST',
     headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},
     body:JSON.stringify({
       BusinessShortCode:shortcode,Password:password,Timestamp:timestamp,
       TransactionType:'CustomerPayBillOnline',Amount:Math.round(Number(amount)*130),
       PartyA:clean,PartyB:shortcode,PhoneNumber:clean,
       CallBackURL:'https://stock-trader-nu.vercel.app/api/callback',
       AccountReference:'RQP',TransactionDesc:'Deposit'
     })
   });
   const stkData=await stkRes.json();
   if(stkData.ResponseCode=='0') return res.json({success:true,message:'STK SENT'});
   else return res.json({success:false,error:stkData.errorMessage||'STK failed'});
 }catch(e){ return res.json({success:false,error:e.message}); }
}