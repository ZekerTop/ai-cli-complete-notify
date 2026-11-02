const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const sleep = ms => new Promise(r => setTimeout(r, ms));

test('webhook recovers when server temporarily returns HTTP 503', async t => {
  let attempts = 0;
  const server = http.createServer((req,res) => {
    req.resume();
    res.statusCode = ++attempts === 1 ? 503 : 200;
    res.end('{"code":0}');
  });
  await new Promise(r => server.listen(0,'127.0.0.1',r));
  t.after(() => server.close());
  const previous = process.env.WEBHOOK_URLS;
  delete process.env.WEBHOOK_URLS;
  t.after(() => { if(previous == null) delete process.env.WEBHOOK_URLS; else process.env.WEBHOOK_URLS = previous; });
  const { notifyWebhook } = require('../src/notifiers/webhook');
  const result = await notifyWebhook({ config: {channels:{webhook:{urls:[`http://127.0.0.1:${server.address().port}/hook`],useFeishuCard:false}}},
    title:'local regression',contentText:'temporary failure',taskInfo:'local regression' });
  assert.equal(result.ok,true,JSON.stringify(result));
  assert.equal(attempts,2);
});

test('failed completion can be sent when explicit task_complete follows fallback', async t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(),'notify-failed-completion-'));
  const saved = Object.fromEntries(['HOME','USERPROFILE','CODEX_WATCH_BACKEND','CODEX_SEED_CATCHUP_MS','CODEX_TUI_LOG_PATH'].map(k => [k,process.env[k]]));
  Object.assign(process.env,{HOME:dir,USERPROFILE:dir,CODEX_WATCH_BACKEND:'sessions',CODEX_SEED_CATCHUP_MS:'0',CODEX_TUI_LOG_PATH:path.join(dir,'missing.log')});
  const enginePath=require.resolve('../src/engine');
  const watchPath=require.resolve('../src/watch');
  const oldEngine=require.cache[enginePath], oldWatch=require.cache[watchPath];
  let attempts=0;
  require.cache[enginePath]={id:enginePath,filename:enginePath,loaded:true,exports:{sendNotifications:async () => ({results:[{channel:'webhook',ok:++attempts>1,error:'HTTP 503'}]})}};
  delete require.cache[watchPath];
  const sessionDir=path.join(dir,'.codex/sessions'); fs.mkdirSync(sessionDir,{recursive:true});
  const file=path.join(sessionDir,'session.jsonl'); fs.writeFileSync(file,'');
  const logs=[];
  const stop=require('../src/watch').startWatch({sources:['codex'],intervalMs:50,confirmAlert:{enabled:true},log:l=>logs.push(l)});
  t.after(() => {
    stop();
    for(const [k,v] of Object.entries(saved)) {if(v==null) delete process.env[k]; else process.env[k]=v;}
    if(oldEngine) require.cache[enginePath]=oldEngine; else delete require.cache[enginePath];
    if(oldWatch) require.cache[watchPath]=oldWatch; else delete require.cache[watchPath];
    fs.rmSync(dir,{recursive:true,force:true});
  });
  const append=(type,payload)=>fs.appendFileSync(file,JSON.stringify({timestamp:new Date().toISOString(),type,payload})+'\n');
  await sleep(600);
  append('event_msg',{type:'task_started',turn_id:'failed-turn'});
  append('response_item',{type:'message',role:'assistant',phase:'final_answer',content:[{type:'output_text',text:'completed'}]});
  for(let i=0;i<40 && attempts===0;i++) await sleep(100);
  assert.equal(attempts,1);
  append('event_msg',{type:'task_complete',turn_id:'failed-turn',last_agent_message:'completed'});
  await sleep(1200);
  assert.equal(attempts,2,logs.join('\n'));
});

test('watch diagnostics preserve failure reason without leaking webhook URL', () => {
  const { _summarizeResult }=require('../src/watch');
  const result=_summarizeResult({results:[{channel:'webhook',ok:false,error:'HTTP 503 https://open.feishu.cn/hook/private-token'}]});
  assert.match(result,/HTTP 503/);
  assert.doesNotMatch(result,/private-token/);
});

test('failed Codex confirmation releases its dedupe record for a later attempt', async t => {
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'notify-confirm-retry-'));
  let attempts=0;
  const server=http.createServer((req,res)=>{req.resume();res.statusCode=++attempts<=3?503:200;res.end('{"code":0}');});
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  t.after(()=>{server.close();fs.rmSync(dir,{recursive:true,force:true});});
  fs.writeFileSync(path.join(dir,'settings.json'),JSON.stringify({version:2,ui:{notificationMode:'hooks'},summary:{enabled:false},
    channels:Object.fromEntries(['webhook','telegram','desktop','sound','email','gotify'].map(c=>[c,{enabled:c==='webhook',urls:c==='webhook'?[`http://127.0.0.1:${server.address().port}/hook`]:[]}])),
    sources:{codex:{enabled:true,minDurationMinutes:0,channels:{webhook:true}}}}));
  const source=`const assert=require('node:assert/strict');const {sendNotifications}=require(${JSON.stringify(path.resolve(__dirname,'../src/engine'))});
    (async()=>{const args={source:'codex',taskInfo:'confirmation regression',outputContent:'retry same question',notifyKind:'confirm',force:true,skipSummary:true};
    assert.equal((await sendNotifications(args)).results[0].ok,false);
    assert.equal((await sendNotifications(args)).results[0].ok,true);
    assert.equal((await sendNotifications(args)).skipped,true);})().catch(e=>{console.error(e);process.exitCode=1;});`;
  const child=require('node:child_process').spawn(process.execPath,['-e',source],{env:{...process.env,AI_CLI_COMPLETE_NOTIFY_DATA_DIR:dir,WEBHOOK_URLS:'',CODEX_WEBHOOK_URLS:''},windowsHide:true,stdio:['ignore','pipe','pipe']});
  let output='';child.stdout.on('data',b=>output+=b);child.stderr.on('data',b=>output+=b);
  const code=await new Promise(r=>child.on('close',r));
  assert.equal(code,0,output);assert.equal(attempts,4);
});
