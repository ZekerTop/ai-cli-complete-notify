const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {EventEmitter}=require('node:events');
const cp=require('node:child_process');
const originalSpawn=cp.spawn,originalExec=cp.exec;
const calls=[];
let launchError=null;
cp.spawn=(exe,args,opts)=>{
  calls.push({exe,args,opts});
  const child=new EventEmitter();child.unref=()=>{};
  process.nextTick(()=>child.emit(launchError?'error':'spawn',launchError));
  return child;
};
cp.exec=()=>({unref(){}});
const {runCli}=require('../src/cli');
test('lightweight log commands do not load the notification engine',()=>{
  assert.equal(Boolean(require.cache[require.resolve('../src/engine')]),false);
});
test.after(()=>{cp.spawn=originalSpawn;cp.exec=originalExec;});
test('open-file --text opens an existing Unicode log path as a literal Notepad argument', { skip: process.platform !== 'win32' }, async()=>{
  const file=path.join(__dirname,'日志 & # test.log');fs.writeFileSync(file,'notification log');
  try{
    calls.length=0;
    const result=await runCli(['open-file',file,'--text']);
    assert.equal(result.ok,true);
    assert.equal(calls.length,1);
    assert.equal(calls[0].exe,'notepad.exe');
    assert.deepEqual(calls[0].args,[file]);
    assert.equal(calls[0].opts.shell,false);
  }finally{fs.unlinkSync(file);}
});
test('open-file reports a missing log instead of claiming success',async()=>{
  const result=await runCli(['open-file',path.join(__dirname,'missing-notification.log'),'--text']);
  assert.equal(result.ok,false);
  assert.equal(result.exitCode,1);
});
test('open-file reports launcher failure',async()=>{
  const file=path.join(__dirname,'launcher-failure.log');fs.writeFileSync(file,'test');
  launchError=new Error('notepad launch failed');
  try{
    const result=await runCli(['open-file',file,'--text']);
    assert.equal(result.ok,false);
    assert.match(result.error,/notepad launch failed/);
  }finally{launchError=null;fs.unlinkSync(file);}
});
test('open-watch-log locates and opens the latest log in one invocation', { skip: process.platform !== 'win32' }, async()=>{
  const dir=fs.mkdtempSync(path.join(__dirname,'open-watch-log-'));
  const previous=process.env.AI_CLI_COMPLETE_NOTIFY_DATA_DIR;
  process.env.AI_CLI_COMPLETE_NOTIFY_DATA_DIR=dir;
  const logs=path.join(dir,'watch-logs');fs.mkdirSync(logs);
  const file=path.join(logs,'watch-2026-11-02.log');fs.writeFileSync(file,'test');
  try{
    calls.length=0;
    const result=await runCli(['open-watch-log']);
    assert.equal(result.ok,true);
    assert.deepEqual(calls.map(c=>[c.exe,c.args]),[['notepad.exe',[file]]]);
  }finally{
    if(previous==null)delete process.env.AI_CLI_COMPLETE_NOTIFY_DATA_DIR;else process.env.AI_CLI_COMPLETE_NOTIFY_DATA_DIR=previous;
    fs.rmSync(dir,{recursive:true,force:true});
  }
});

