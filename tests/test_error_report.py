"""本地诊断：内容脱敏、禁止外传与关于许可；保留上游脱敏覆盖。"""
import io
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

from fixtures import job_stub
from gui import app

ROOT = Path(__file__).resolve().parents[1]


class Response(io.BytesIO):
    def __enter__(self):
        return self

    def __exit__(self, *exc):
        return False


class ReportTests(unittest.TestCase):
    def setUp(self):
        self.app = app
        self.dir = tempfile.TemporaryDirectory()
        self.addCleanup(self.dir.cleanup)
        self.api = self.app.Api(self.dir.name)
        home = str(Path.home())
        self.api.last_status = {"info": {"brand": "Xiaomi", "name": "Xiaomi 17", "model": "25113PN0EC",
                                         "os": "OS3.0.40.0", "build": "BP2A", "android": "16"}}
        self.api.job = job_stub(serial="TESTSERIAL01", results=[
            {"title": "关闭营销通知", "rc": 1, "sec": 12},
            {"title": "收尾", "rc": 0, "sec": 1},
            {"title": "关闭各 App 里的广告开关", "rc": 3, "sec": 0, "skipped": True}],
            lines=["▶ 关闭营销通知", f"device 'TESTSERIAL01' 读取 {home}/AppData/x", "联系 a.b@qq.com 13900001111",
                   "adb connect 192.0.2.10:5555"])

    def test_payload_scrubs_private_values(self):
        payload = self.api.report_payload()
        text = json.dumps(payload, ensure_ascii=False)
        for secret in ("TESTSERIAL01", str(Path.home()), "a.b@qq.com", "13900001111", "192.0.2.10"):
            self.assertNotIn(secret, text)
        for mark in ("<序列号>", "<用户目录>", "<邮箱>", "<手机号>", "<IP>"):
            self.assertIn(mark, payload["log"])
        self.assertEqual([s["result"] for s in payload["steps"]], ["失败", "成功", "跳过"])
        self.assertNotIn("install_id", payload)

    def test_payload_fits_server_limits(self):
        self.api.job.lines = ["x" * 500] * 200
        self.api.job.results = [{"title": "步骤" * 30, "rc": 0, "sec": 1}] * 20
        payload = self.api.report_payload()
        self.assertLessEqual(len(payload["log"]), 20000)
        self.assertEqual(len(payload["steps"]), 12)
        self.assertTrue(all(len(s["title"]) <= 40 for s in payload["steps"]))
        self.assertLess(len(json.dumps(payload, ensure_ascii=False).encode()), 64 * 1024)

    def test_send_is_local_only_and_never_posts_diagnostics(self):
        payload = self.api.report_payload()
        with patch.object(self.app.urllib.request, "urlopen") as network:
            result = self.api.send_report(payload)
        self.assertIn("不联网发送日志", result["error"])
        network.assert_not_called()
        self.assertFalse(Path(self.dir.name, "install-id").exists())

    def test_invalid_install_id_file_is_replaced(self):
        Path(self.dir.name, "install-id").write_text("serial-or-junk")
        value = self.api._install_id()
        self.assertNotEqual(value, "serial-or-junk")
        self.assertRegex(value, r"^[0-9a-f-]{36}$")

    def test_install_id_creates_the_data_directory_it_writes_into(self):
        # 以前靠 import 期建好目录；现在只有 ensure() 会建，缺了它这里就写不进去
        missing = Path(self.dir.name, "not-created-yet")
        api = self.app.Api(str(missing))
        self.assertFalse(missing.exists())
        self.assertRegex(api._install_id(), r"^[0-9a-f-]{36}$")
        self.assertTrue(Path(missing, "install-id").exists())

    def test_repeated_send_stays_local_without_generating_identity(self):
        with patch.object(self.app.urllib.request, "urlopen") as network:
            for _ in range(5):
                self.assertIn("不联网发送日志", self.api.send_report(self.api.report_payload())["error"])
        network.assert_not_called()
        self.assertEqual(self.api.report_times, [])
        self.assertFalse(Path(self.dir.name, "install-id").exists())

    def test_invalid_payload_is_rejected_without_network(self):
        with patch.object(self.app.urllib.request, "urlopen") as network:
            self.assertIn("格式不对", self.api.send_report(None)["error"])
        network.assert_not_called()

    def test_about_keeps_upstream_attribution_and_full_mit_license(self):
        with patch.object(self.app.urllib.request, "urlopen") as network:
            info = self.api.about()
        self.assertIn("肉呆大魔王", info["upstream_author"])
        self.assertEqual(info["license"], (ROOT / "LICENSE").read_text(encoding="utf-8"))
        self.assertEqual(info["project_url"], "https://github.com/BLACKIELF/qingjing-aigoodbro")
        network.assert_not_called()


SERVER = ROOT / ".private/aac-report"      # 服务端代码只在维护者本机，不进仓库


@unittest.skipUnless((SERVER / "index.ts").exists(), "服务端代码不在仓库里")
class ServerContractTests(unittest.TestCase):
    """客户端字段上限与服务端一致。"""

    def test_limits_match_edge_function_and_schema(self):
        ts = (SERVER / "index.ts").read_text(encoding="utf-8")
        sql = (SERVER / "schema.sql").read_text(encoding="utf-8")
        for field, limit in (("client_version", 32), ("platform", 80), ("phone_brand", 40), ("phone_model", 80),
                             ("phone_system", 160), ("android", 16), ("log", 20000)):
            self.assertIn(f"{field}: {limit}", ts)
            self.assertRegex(sql, rf"{field}.*{limit}")
        self.assertIn("MAX_STEPS = 12", ts)
        self.assertIn("revoke all on aac.error_reports from public, anon, authenticated, service_role", sql)


if __name__ == "__main__":
    unittest.main()
