const test=require('node:test');
const assert=require('node:assert/strict');
const https=require('node:https');
const {EventEmitter}=require('node:events');
test('Feishu card does not treat local screenshots as uploaded image keys',async t=>{
  const original=https.request;
  const saved=process.env.WEBHOOK_URLS; delete process.env.WEBHOOK_URLS;
  t.after(()=>{https.request=original;if(saved==null)delete process.env.WEBHOOK_URLS;else process.env.WEBHOOK_URLS=saved;});
  let posted;
  https.request=(_opts,callback)=>{
    const req=new EventEmitter();let body='';
    req.write=b=>body+=b;
    req.setTimeout=()=>{};
    req.end=()=>{
      posted=JSON.parse(body);
      const invalid=/!\[[^\]]*\]\((?!img_)[^)]+\)/.test(JSON.stringify(posted.card));
      const res=new EventEmitter();res.statusCode=200;callback(res);
      res.emit('data',JSON.stringify(invalid?{code:11246,msg:'card contains invalid image keys'}:{code:0}));
      res.emit('end');
    };
    return req;
  };
  const {notifyWebhook}=require('../src/notifiers/webhook');
  const result=await notifyWebhook({config:{channels:{webhook:{urls:['https://open.feishu.cn/hook/test'],useFeishuCard:true}}},
    sourceLabel:'Codex',projectName:'test',taskInfo:'完成',outputContent:'布局完成\n![新版工作台](C:/Users/test/live-tasks.png)\n![已上传图片](img_v3_valid-key)'});
  assert.equal(result.ok,true,result.error);
  assert.match(JSON.stringify(posted.card),/布局完成/);
  assert.match(JSON.stringify(posted.card),/新版工作台/);
  assert.match(JSON.stringify(posted.card),/!\[已上传图片\]\(img_v3_valid-key\)/);
});

