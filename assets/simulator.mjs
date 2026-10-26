/** Deterministic, synthetic two-agent refund workflow; no real LLM, API or payment connection. */
export function simulate({ mode = 'concurrent', atomic = false, payment = 100, request = 100 } = {}) {
 payment=Number(payment);request=Number(request);
 if(!Number.isFinite(payment)||!Number.isFinite(request)||payment<=0||request<=0||payment>100000||request>100000)throw new Error('Payment and refund amounts must be positive numbers under $100,000.');
 if(!['concurrent','sequential'].includes(mode))throw new Error('Invalid execution mode.');
 const cents=n=>Math.round((n+Number.EPSILON)*100), captured=cents(payment), amount=cents(request);
 if(captured<1||amount<1||Math.abs(captured/100-payment)>1e-9||Math.abs(amount/100-request)>1e-9)throw new Error('Amounts must be at least $0.01 and use no more than two decimal places.');
 const dollars=n=>'$'+(n/100).toFixed(2);let refunded=0,blocked=0;const events=[];
 function trace(actor,action,description,kind='neutral'){events.push({id:events.length+1,actor,action,description,kind,state:{captured:captured/100,refunded:refunded/100,remaining:(captured-refunded)/100},breached:refunded>captured});}
 trace('System','Initialize synthetic payment','Captured payment: '+dollars(captured)+'. Two agents may issue refunds against this shared state.');
 function read(agent){let available=captured-refunded;trace(agent,'Read payment ledger','Observed refundable balance: '+dollars(available)+'.');return available;}
 function commit(agent,snapshot){
   if(amount>snapshot){blocked++;trace(agent,'Reject refund request',dollars(amount)+' exceeds the observed balance '+dollars(snapshot)+'.','blocked');return;}
   trace(agent,'Authorize refund',dollars(amount)+' appears valid against the agent observed balance '+dollars(snapshot)+'.','allowed');
   if(atomic&&refunded+amount>captured){blocked++;trace('Ledger','Reject at atomic boundary','Atomic balance limit blocked '+agent+' refund; remaining balance '+dollars(captured-refunded)+'.','blocked');return;}
   refunded+=amount;
   trace('Ledger','Commit '+agent+' refund','Committed '+dollars(amount)+' from '+agent+'. Ledger total is now '+dollars(refunded)+'.',refunded>captured?'breach':'committed');
 }
 if(mode==='concurrent'){
   trace('Scheduler','Inject concurrent execution','Both agents read the same state before either commits, creating a read/modify/write race.','fault');
   const a=read('Agent A'),b=read('Agent B');commit('Agent A',a);commit('Agent B',b);
 }else{
   trace('Scheduler','Run serialized execution','Agent B reads the ledger after the first refund finishes.');
   commit('Agent A',read('Agent A'));commit('Agent B',read('Agent B'));
 }
 const breached=refunded>captured;
 trace('Invariant checker',breached?'BUSINESS INVARIANT FAILED':'Business invariant preserved',breached?'Total refunds '+dollars(refunded)+' exceed captured payment '+dollars(captured)+' by '+dollars(refunded-captured)+'.':'Total refunds '+dollars(refunded)+' do not exceed captured payment '+dollars(captured)+'.',breached?'breach':'safe');
 return {input:{mode,atomic,payment,request},events,breached,captured:captured/100,refunded:refunded/100,excess:Math.max(0,(refunded-captured)/100),blocked,passed:!breached,rootCause:breached?'Both agents authorized against the same pre-commit balance. The ledger accepted both requests without an atomic refund limit.':atomic&&mode==='concurrent'?'The atomic ledger constraint rejected the second request when available balance was exhausted.':'The refund total stayed within captured amount for this execution order.'};
}
