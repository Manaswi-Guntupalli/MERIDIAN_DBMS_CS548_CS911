import {beforeEach,afterEach,describe,it,expect,vi} from 'vitest';
const mocks=vi.hoisted(()=>({log:vi.fn(),devices:vi.fn(),remove:vi.fn(),multicast:vi.fn()}));
vi.mock('../src/services/trustLedger.js',()=>({logAI:mocks.log}));
vi.mock('../src/lib/prisma.js',()=>({prisma:{pushDevice:{findMany:mocks.devices,deleteMany:mocks.remove}}}));
vi.mock('firebase-admin/app',()=>({getApps:()=>[{name:'meridian-push'}],initializeApp:vi.fn(),cert:vi.fn()}));
vi.mock('firebase-admin/messaging',()=>({getMessaging:()=>({sendEachForMulticast:mocks.multicast})}));
import {sendSms,sendEmail,sendPush,channelStatus} from '../src/services/presence/channels.js';
const message={schoolId:'test-school',to:'+919999999999',title:'Attendance',body:'Synthetic test message'};
beforeEach(()=>{vi.clearAllMocks();for(const key of ['TWILIO_ACCOUNT_SID','TWILIO_AUTH_TOKEN','TWILIO_FROM_NUMBER','TWILIO_MESSAGING_SERVICE_SID','SENDGRID_API_KEY','SENDGRID_FROM_EMAIL','FIREBASE_SERVICE_ACCOUNT_PATH'])vi.stubEnv(key,'');});
afterEach(()=>{vi.unstubAllEnvs();vi.unstubAllGlobals();});
const twilio=()=>{vi.stubEnv('TWILIO_ACCOUNT_SID','AC-test');vi.stubEnv('TWILIO_AUTH_TOKEN','test-key');vi.stubEnv('TWILIO_FROM_NUMBER','+18888888888');};
describe('Configured notification adapters (no real provider requests)',()=>{
  it('shows missing providers as disabled without making a network request',async()=>{
    const fetch=vi.fn();vi.stubGlobal('fetch',fetch);
    expect(channelStatus().sms.configured).toBe(false);
    for(const send of [sendSms,sendEmail,sendPush]) expect((await send(message)).status).toBe('DISABLED');
    expect(fetch).not.toHaveBeenCalled();
  });
  it('encodes Twilio SMS and distinguishes provider acceptance from final delivery',async()=>{
    twilio();const fetch=vi.fn().mockResolvedValue(new Response('',{status:201}));vi.stubGlobal('fetch',fetch);
    expect(await sendSms(message)).toEqual({status:'ACCEPTED',accepted:1});
    const [url,init]=fetch.mock.calls[0];expect(url).toBe('https://api.twilio.com/2010-04-01/Accounts/AC-test/Messages.json');
    expect(init.body.get('To')).toBe(message.to);expect(init.body.get('Body')).toContain(message.body);
    expect(JSON.stringify(mocks.log.mock.calls)).not.toContain(message.to);
    expect(JSON.stringify(mocks.log.mock.calls)).not.toContain('test-key');
  });
  it('rejects malformed SMS numbers without sending and handles rejected requests',async()=>{
    twilio();const fetch=vi.fn().mockResolvedValue(new Response('',{status:403}));vi.stubGlobal('fetch',fetch);
    expect((await sendSms({...message,to:'9999'})).status).toBe('FAILED');expect(fetch).not.toHaveBeenCalled();
    expect((await sendSms(message)).status).toBe('FAILED');
  });
  it('handles provider connection failures without claiming success',async()=>{
    twilio();vi.stubGlobal('fetch',vi.fn().mockRejectedValue(new Error('timeout')));
    expect((await sendSms(message)).status).toBe('FAILED');
  });
  it('sends the SendGrid v3 plain-text payload with a verified sender',async()=>{
    vi.stubEnv('SENDGRID_API_KEY','SG-test');vi.stubEnv('SENDGRID_FROM_EMAIL','school@example.test');
    const fetch=vi.fn().mockResolvedValue(new Response('',{status:202}));vi.stubGlobal('fetch',fetch);
    expect((await sendEmail({...message,to:'parent@example.test'})).status).toBe('ACCEPTED');
    const [url,init]=fetch.mock.calls[0];expect(url).toBe('https://api.sendgrid.com/v3/mail/send');
    expect(JSON.parse(init.body)).toMatchObject({from:{email:'school@example.test'},content:[{type:'text/plain',value:message.body}]});
  });
  it('Firebase filters revoked registrations and removes only unregistered devices',async()=>{
    vi.stubEnv('FIREBASE_SERVICE_ACCOUNT_PATH','mocked-private-file');
    mocks.devices.mockResolvedValue([{id:'valid',token:'device-1',tokenVersion:1,user:{tokenVersion:1}},{id:'old',token:'revoked',tokenVersion:0,user:{tokenVersion:1}},{id:'expired',token:'device-2',tokenVersion:1,user:{tokenVersion:1}}]);
    mocks.multicast.mockResolvedValue({successCount:1,responses:[{success:true},{success:false,error:{code:'messaging/registration-token-not-registered'}}]});
    expect(await sendPush({...message,to:'parent-id',notificationId:'notice-1'})).toEqual({status:'FAILED',accepted:1});
    expect(mocks.multicast.mock.calls[0][0]).toMatchObject({tokens:['device-1','device-2'],data:{notificationId:'notice-1'}});
    expect(mocks.remove).toHaveBeenCalledWith({where:{id:{in:['expired']}}});
    expect(mocks.devices.mock.calls[0][0].where).toMatchObject({schoolId:'test-school',userId:'parent-id',user:{active:true,mustChangePassword:false}});
  });
  it('does not contact Firebase if all device registrations are revoked',async()=>{
    vi.stubEnv('FIREBASE_SERVICE_ACCOUNT_PATH','mocked-private-file');mocks.devices.mockResolvedValue([{tokenVersion:0,user:{tokenVersion:1}}]);
    expect((await sendPush({...message,to:'user-id'})).status).toBe('NO_DEVICES');expect(mocks.multicast).not.toHaveBeenCalled();
  });
});
