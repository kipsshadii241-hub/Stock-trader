export default function handler(req,res){
  res.json({
    hasKey: !!process.env.MPESA_CONSUMER_KEY,
    keyLen: process.env.MPESA_CONSUMER_KEY?.length || 0,
    keyStart: process.env.MPESA_CONSUMER_KEY?.substring(0,5) || 'MISSING',
    hasSecret: !!process.env.MPESA_CONSUMER_SECRET,
    secretLen: process.env.MPESA_CONSUMER_SECRET?.length || 0,
    hasPasskey: !!process.env.MPESA_PASSKEY,
    shortcode: process.env.MPESA_SHORTCODE || 'MISSING',
    allEnv: Object.keys(process.env).filter(k=>k.includes('MPESA'))
  });
}