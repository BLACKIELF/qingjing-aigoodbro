const test = require("node:test");
const assert = require("node:assert/strict");
const { openPage } = require("./page.js");

const settle = () => new Promise(resolve => setImmediate(resolve));
const phone = serial => ({ serial, name: "手机 " + serial, state: "device" });

test("默认打开一键清静，确认前不执行清理", async () => {
  const runs = [];
  let scans = 0;
  const page = await openPage({ api: {
    env: () => ({ version: "test", adb: true }),
    devices: () => { scans++; return { list: [phone("A")] }; },
    super_clean: serial => { runs.push(serial); return { error: "测试暂停" }; },
  } });
  try {
    const buttons = [...page.document.querySelectorAll("#main button")];
    assert.deepEqual(buttons.map(button => button.textContent), ["一键清静"]);
    assert.equal(page.document.querySelector("#more").open, false);
    assert.equal(scans, 0);
    buttons[0].click();
    await settle();
    const box = page.document.querySelector("#modalbox");
    assert.match(box.textContent, /开始一键清静/);
    assert.match(box.textContent, /手机 A/);
    assert.deepEqual(runs, []);
    [...box.querySelectorAll("button")].find(button => button.textContent === "开始清理").click();
    await settle();
    assert.deepEqual(runs, ["A"]);
  } finally { page.close(); }
});

test("连接多台手机时先明确选定目标", async () => {
  const page = await openPage({ api: {
    env: () => ({ version: "test", adb: true }),
    devices: () => ({ list: [phone("A"), phone("B")] }),
  } });
  try {
    page.document.querySelector("#quick-clean").click();
    await settle();
    assert.equal(page.document.querySelector("#modal").classList.contains("show"), false);
    const devices = [...page.document.querySelectorAll("[data-device]")];
    assert.equal(devices.length, 2);
    devices[1].click();
    assert.match(page.document.querySelector("#modalbox").textContent, /手机 B/);
  } finally { page.close(); }
});

test("启动静默检查更新，手动按钮复用未完成请求并提供下载入口", async () => {
  const opened = [];
  let checks = 0;
  let finish;
  const request = new Promise(resolve => { finish = resolve; });
  const page = await openPage({ api: {
    check_update: () => { checks++; return request; },
    open_url: url => opened.push(url),
  } });
  try {
    assert.ok(page.document.querySelector("#quick-clean"));
    assert.equal(checks, 1);
    page.document.querySelector("#more").open = true;
    const button = page.document.querySelector("#check-update");
    button.click();
    assert.equal(button.disabled, true);
    const url = "https://github.com/BLACKIELF/qingjing-aigoodbro/releases/latest";
    finish({ status: "available", version: "2.0.0", url });
    await settle();
    assert.equal(checks, 1);
    assert.equal(button.disabled, false);
    assert.match(page.document.querySelector("#update-status").textContent, /2\.0\.0/);
    const download = page.document.querySelector("#newver");
    assert.equal(download.classList.contains("hide"), false);
    assert.deepEqual(opened, []);
    download.click();
    assert.match(page.document.querySelector("#modalbox").textContent, /检查更新/);
    [...page.document.querySelectorAll("#modalbox button")].find(b => b.textContent === "打开下载页").click();
    assert.deepEqual(opened, [url]);
  } finally { page.close(); }
});
