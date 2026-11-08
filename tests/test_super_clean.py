import unittest
from unittest.mock import patch

from gui.app import Api


class SuperCleanTests(unittest.TestCase):
    def test_selects_only_verified_options_and_preserves_backup(self):
        api = Api("/unused")
        status = {
            "info": {"model": "phone"}, "steps": ["浏览器"], "recipe_ok": True,
            "quickapps": [{"keep": True}, {"closed": False}],
            "ads": [{"pkg": "example.ads"}, {"pkg": "example.suspended", "suspended": True}],
        }
        allowed = {"pkg": "example.app", "id": "offer", "checked": True}
        ambiguous = {"pkg": "example.app", "id": "other", "checked": False}
        for reference in (False, True):
            with (
                self.subTest(reference=reference),
                patch.object(api, "status", return_value=dict(status, recipe_ref=reference)),
                patch.object(api, "chan_scan", return_value={"chans": [allowed, ambiguous]}),
                patch.object(api.dispatcher, "start", return_value={"ok": True}) as start,
            ):
                self.assertEqual(api.super_clean("phone"), {"ok": True})
                serial, plan, _ = start.call_args.args
                self.assertEqual(serial, "phone")
                self.assertEqual(plan["steps"], [] if reference else ["浏览器"])
                self.assertTrue(plan["backup"])
                self.assertTrue(plan["quickapp"])
                self.assertEqual(plan["channels"], [allowed])
                self.assertEqual(plan["ads"], ["example.ads"])

    def test_locked_or_scan_error_does_not_start_cleaning(self):
        api = Api("/unused")
        for locked in (True, False):
            with (
                self.subTest(locked=locked),
                patch.object(api, "status", return_value={"info": {"model": "phone"}, "locked": locked}),
                patch.object(api, "chan_scan", return_value={"error": "scan failed"}) as scan,
                patch.object(api.dispatcher, "start") as start,
            ):
                self.assertIn("error", api.super_clean("phone"))
                start.assert_not_called()
                if locked:
                    scan.assert_not_called()
