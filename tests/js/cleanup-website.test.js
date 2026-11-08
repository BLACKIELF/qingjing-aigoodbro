/* User-authorized completion redirect: only accepted cleanup rounds can open the website. */
const test = require('node:test');
const assert = require('node:assert/strict');
const { openPage, pollResult } = require('./page.js');

const cleaned = {kind:'channels', title:'关闭营销通知', rc:0, sec:1, tail:['拨了 2 个'], skipped:false, stopped:false};
const success = () => pollResult({results:[cleaned]});

function prepareChoice(page){
  page.window.eval(`S.status = {info:{model:'TEST'}}; S.serial = 'TEST'; S.chans = [];
    document.querySelector('#main').innerHTML = '<input id="c-qa" type="checkbox" checked>';`);
}
async function acceptedRun(page){
  prepareChoice(page);
  await page.window.go();
  page.window.eval('clearInterval(pollJob); pollJob = null');
}

function fixture(extra = {}){
  const opened=[];
  return {opened, make:()=>openPage({api:{start:()=>({ok:true}),poll:success,open_url:url=>opened.push(url),...extra}})};
}

test('成功完成一次实际清理后只打开一次；重复结果或重进执行页不重复打开',async()=>{
  const f=fixture(); const page=await f.make();
  try{
    assert.deepEqual(f.opened,[]);
    await acceptedRun(page);
    await page.window.tick();
    assert.deepEqual(f.opened,['https://aigoodbro.com']);
    page.window.showDone(success());
    page.window.showRun(); page.window.eval('clearInterval(pollJob); pollJob = null');
    page.window.showDone(success());
    assert.deepEqual(f.opened,['https://aigoodbro.com']);
  }finally{page.close();}
});

test('未发起清理时展示完成页或只读结果不打开',async()=>{
  const f=fixture(); const page=await f.make();
  try{page.window.showDone(success());assert.deepEqual(f.opened,[]);}finally{page.close();}
});

test('启动被拒绝不打开，也不留下可被完成页触发的标志',async()=>{
  const f=fixture({start:()=>({error:'已有任务在运行'})}); const page=await f.make();
  try{
    prepareChoice(page); await page.window.go();
    page.window.showDone(success());
    assert.deepEqual(f.opened,[]);
  }finally{page.close();}
});

test('失败、停止、全部跳过和只有备份收尾时均不打开',async()=>{
  const cases=[
    pollResult({results:[{...cleaned,rc:1}]}),
    pollResult({cancel:true,results:[cleaned]}),
    pollResult({results:[{...cleaned,stopped:true}]}),
    pollResult({results:[{...cleaned,skipped:true}]}),
    pollResult({results:[{...cleaned,kind:'backup'},{...cleaned,kind:'finish'}]}),
    pollResult({results:[cleaned,{...cleaned,kind:'finish',rc:1}]}),
  ];
  for(const result of cases){
    const f=fixture(); const page=await f.make();
    try{
      await acceptedRun(page); page.window.showDone(result);
      page.window.showDone(success()); // 已失败/停止的轮次不能靠重画成功页重新触发。
      assert.deepEqual(f.opened,[]);
    }finally{page.close();}
  }
});

test('新一轮清理被接受后，可以再打开一次',async()=>{
  const f=fixture(); const page=await f.make();
  try{
    await acceptedRun(page); await page.window.tick();
    await acceptedRun(page); await page.window.tick();
    assert.deepEqual(f.opened,['https://aigoodbro.com','https://aigoodbro.com']);
  }finally{page.close();}
});

test('重试被接受且全部成功后打开；失败结果本身不打开',async()=>{
  const f=fixture({retry:()=>({ok:true})}); const page=await f.make();
  try{
    await acceptedRun(page);
    page.window.showDone(pollResult({results:[{...cleaned,rc:1}],retry:1}));
    assert.deepEqual(f.opened,[]);
    await page.window.retryRun(); page.window.eval('clearInterval(pollJob); pollJob = null');
    await page.window.tick();
    assert.deepEqual(f.opened,['https://aigoodbro.com']);
  }finally{page.close();}
});

test('还原操作不打开网站',async()=>{
  const f=fixture({restore:()=> '已还原'}); const page=await f.make();
  try{
    page.window.eval("S.serial='TEST'");page.window.openRestore();await page.window.restore('channels');
    assert.deepEqual(f.opened,[]);
  }finally{page.close();}
});
