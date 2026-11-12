const test = require('node:test');
const assert = require('node:assert/strict');
const {openPage} = require('./page');
const flush = () => new Promise(resolve => setTimeout(resolve, 0));
const available = {state:'available', version:'0.4.2', source:'github', busy:false, can_download:true};

test('in-app update downloads from GitHub and installs after verification', async () => {
  const calls = [];
  const p = await openPage({api:{
    check_update: () => ({status: "available", version: "0.4.2", url: "https://github.com/BLACKIELF/qingjing-aigoodbro/releases/latest"}),
    start_update_check: () => available,
    update_state: () => available,
    download_update: source => {calls.push(['download',source]); return {...available,state:'ready',can_install:true,message:'校验通过'};},
    install_update: () => {calls.push(['install']); return {...available,state:'error',can_install:true,error:'正在执行去广告，请稍后'};},
  }});
  try {
    assert.match(p.document.querySelector('#newver').textContent, /0.4.2/);
    p.document.querySelector('#newver').click(); await flush();
    const selector = p.document.querySelector('#update-source');
    assert.equal(selector.value, 'github');
    selector.value = 'github'; selector.dispatchEvent(new p.window.Event('change'));
    [...p.document.querySelectorAll('#modal button')].find(b=>b.textContent==='下载更新').click(); await flush();
    assert.deepEqual(calls,[['download','github']]);
    assert.match(p.document.querySelector('#modal').textContent,/校验通过/);
    [...p.document.querySelectorAll('#modal button')].find(b=>b.textContent==='安装并重启').click(); await flush();
    assert.deepEqual(calls,[['download','github'],['install']]);
    assert.match(p.document.querySelector('[role=alert]').textContent,/正在执行/);
  } finally {p.close();}
});

test('download progress and cancel are inside the app; late polling does not replace another modal', async () => {
  let cancel = 0;
  const state = {...available,state:'downloading',busy:true,can_download:false,can_cancel:true,size:200,received:100};
  const p = await openPage({api:{check_update:()=>state,update_state:()=>state,
    cancel_update:()=>{cancel++;return {...available,message:'已取消下载'};}}});
  try {
    p.window.openUpdates(); await flush();
    assert.equal(p.document.querySelector('progress').value,50);
    assert.equal(p.document.querySelector('#update-source').disabled,true);
    [...p.document.querySelectorAll('#modal button')].find(b=>b.textContent==='取消下载').click();await flush();
    assert.equal(cancel,1);
    p.window.modal('<h3>another modal</h3>');
    await p.window.updateAction('update_state');
    assert.match(p.document.querySelector('#modal').textContent,/another modal/);
  } finally {p.close();}
});

test('Mac 显示手动安装入口而不提供自动替换', async () => {
  const p = await openPage({api:{env:()=>({version:'1.0.5',adb:false,os:'Darwin'}),
    update_state:()=>({...available,can_install:true})}});
  try {
    p.window.openUpdates(); await flush();
    assert.match(p.document.querySelector('#modal').textContent,/手动安装/);
    assert.doesNotMatch(p.document.querySelector('#modal').textContent,/安装并重启|下载更新/);
    assert.match(p.document.querySelector('#modal').textContent,/打开下载页/);
  } finally {p.close();}
});
