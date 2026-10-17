import { readFileSync } from 'node:fs';
import { logAI } from '../trustLedger.js';
import { prisma } from '../../lib/prisma.js';

export interface ChannelMessage { schoolId: string; to: string; title: string; body: string; notificationId?: string; critical?: boolean }
export type DeliveryResult = { status: 'ACCEPTED' | 'DISABLED' | 'FAILED' | 'NO_DEVICES'; accepted: number };
export function channelStatus() {
  return {
    sms: {provider:'Twilio',configured:!!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && (process.env.TWILIO_FROM_NUMBER || process.env.TWILIO_MESSAGING_SERVICE_SID))},
    email: {provider:'SendGrid',configured:!!(process.env.SENDGRID_API_KEY && process.env.SENDGRID_FROM_EMAIL)},
    push: {provider:'Firebase',configured:!!process.env.FIREBASE_SERVICE_ACCOUNT_PATH},
  };
}
async function record(channel:string,msg:ChannelMessage,result:DeliveryResult,code?:string) {
  // Never put credentials, phone numbers, device tokens or message bodies in the ledger.
  await logAI({schoolId:msg.schoolId,engine:'PRESENCE',action:`${channel} notification: ${result.status.toLowerCase()}`,
    reason:result.status==='ACCEPTED'?'Provider accepted the request; final delivery is not confirmed.':code ?? result.status,
    output:{status:result.status,accepted:result.accepted,notificationId:msg.notificationId},reversible:false});
  return result;
}
const timeout = () => AbortSignal.timeout(10_000);

export async function sendSms(msg:ChannelMessage):Promise<DeliveryResult> {
  if (!channelStatus().sms.configured) return record('SMS',msg,{status:'DISABLED',accepted:0},'Twilio credentials and sender are missing.');
  if (!/^\+[1-9]\d{7,14}$/.test(msg.to)) return record('SMS',msg,{status:'FAILED',accepted:0},'Recipient must use E.164 format, for example +91 followed by the number.');
  try {
    const sid=process.env.TWILIO_ACCOUNT_SID!;
    const body=new URLSearchParams({To:msg.to,Body:`${msg.title}\n${msg.body}`});
    if(process.env.TWILIO_MESSAGING_SERVICE_SID) body.set('MessagingServiceSid',process.env.TWILIO_MESSAGING_SERVICE_SID);
    else body.set('From',process.env.TWILIO_FROM_NUMBER!);
    const res=await fetch(`https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(sid)}/Messages.json`,{method:'POST',headers:{Authorization:'Basic '+Buffer.from(`${sid}:${process.env.TWILIO_AUTH_TOKEN}`).toString('base64'),'Content-Type':'application/x-www-form-urlencoded'},body,signal:timeout()});
    return record('SMS',msg,{status:res.ok?'ACCEPTED':'FAILED',accepted:res.ok?1:0},res.ok?undefined:`Twilio HTTP ${res.status}`);
  } catch { return record('SMS',msg,{status:'FAILED',accepted:0},'Twilio request failed or timed out.'); }
}

export async function sendEmail(msg:ChannelMessage):Promise<DeliveryResult> {
  if (!channelStatus().email.configured) return record('Email',msg,{status:'DISABLED',accepted:0},'SendGrid key and verified sender are missing.');
  try {
    const res=await fetch('https://api.sendgrid.com/v3/mail/send',{method:'POST',headers:{Authorization:'Bearer '+process.env.SENDGRID_API_KEY,'Content-Type':'application/json'},body:JSON.stringify({personalizations:[{to:[{email:msg.to}]}],from:{email:process.env.SENDGRID_FROM_EMAIL},subject:msg.title,content:[{type:'text/plain',value:msg.body}]}),signal:timeout()});
    return record('Email',msg,{status:res.ok?'ACCEPTED':'FAILED',accepted:res.ok?1:0},res.ok?undefined:`SendGrid HTTP ${res.status}`);
  } catch { return record('Email',msg,{status:'FAILED',accepted:0},'SendGrid request failed or timed out.'); }
}

export async function sendPush(msg:ChannelMessage):Promise<DeliveryResult> {
  if (!channelStatus().push.configured) return {status:'DISABLED',accepted:0};
  // Revocation/withdrawal/version changes also stop remote push. Old devices must
  // register again using a fresh authenticated session, even while the app is closed.
  const devices=await prisma.pushDevice.findMany({where:{schoolId:msg.schoolId,...(msg.to==='*'?{}:{userId:msg.to}),user:{active:true,mustChangePassword:false}},include:{user:{select:{tokenVersion:true}}}});
  const valid=devices.filter(d=>d.tokenVersion===d.user.tokenVersion);
  if (!valid.length) return {status:'NO_DEVICES',accepted:0};
  try {
    const {getApps,initializeApp,cert}=await import('firebase-admin/app');
    const {getMessaging}=await import('firebase-admin/messaging');
    const app=getApps().find(a=>a.name==='meridian-push') ?? initializeApp({credential:cert(JSON.parse(readFileSync(process.env.FIREBASE_SERVICE_ACCOUNT_PATH!,'utf8')))},'meridian-push');
    let accepted=0;
    for(let i=0;i<valid.length;i+=500) {
      const batch=valid.slice(i,i+500);
      const result=await getMessaging(app).sendEachForMulticast({tokens:batch.map(d=>d.token),notification:{title:msg.title,body:msg.body},data:{notificationId:msg.notificationId??'',severity:msg.critical?'CRITICAL':'INFO'},android:{priority:msg.critical?'high':'normal',notification:{channelId:'meridian_alerts'}},apns:{payload:{aps:{sound:'default'}}}});
      accepted+=result.successCount;
      const invalid=result.responses.flatMap((r,index)=>['messaging/registration-token-not-registered','messaging/invalid-registration-token'].includes(r.error?.code??'')?[batch[index].id]:[]);
      if(invalid.length) await prisma.pushDevice.deleteMany({where:{id:{in:invalid}}});
    }
    return record('Push',msg,{status:accepted===valid.length?'ACCEPTED':'FAILED',accepted},'One or more Firebase requests failed.');
  } catch { return record('Push',msg,{status:'FAILED',accepted:0},'Firebase configuration or request failed.'); }
}
