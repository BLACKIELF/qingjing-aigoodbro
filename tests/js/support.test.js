/* All low-frequency support entries use one bundled QR without posting messages. */
const test = require('node:test');
const assert = require('node:assert/strict');
const { openPage } = require('./page.js');

function supportButton(page, scope){
  return [...page.document.querySelectorAll(scope+' button')].find(b=>b.textContent.trim()==='企业微信客服');
}
function assertQr(page){
  const box=page.document.querySelector('#modalbox');
  assert.equal(box.querySelector('h3').textContent,'企业微信客服');
  assert.match(box.textContent,/微信扫一扫，联系 AiGoodBro 企业客服/);
  const images=box.querySelectorAll('img');
  assert.equal(images.length,1);
  assert.equal(images[0].getAttribute('src'),'img/wechat-contact.png');
  assert.equal(images[0].style.height,'auto');
  assert.equal(images[0].style.objectFit,'');
}

for(const entry of ['侧栏','关于','反馈']){
 test(entry+'客服入口打开相同本地二维码，且不打开网址或发送内容',async()=>{
  const opened=[],sent=[];
  const page=await openPage({api:{
   about:()=>({name:'清静 · AiGoodBro',version:'1.0.0',build:'1108v1',author:'AiGoodBro',upstream_author:'上游作者',upstream_url:'https://example.com',project_url:'https://example.com',license:'MIT'}),
   diagnostics:()=> '本地诊断',
   open_url:url=>opened.push(url),
   send_report:payload=>sent.push(payload),
  }});
  try{
   if(entry==='关于')await page.window.openAbout();
   if(entry==='反馈')await page.window.openFeedback();
   const scope=entry==='侧栏'?'.side-foot':'#modalbox';
   const button=supportButton(page,scope);
   assert.ok(button);
   button.click();
   assertQr(page);
   assert.deepEqual(opened,[]);
   assert.deepEqual(sent,[]);
  }finally{page.close();}
 });
}
