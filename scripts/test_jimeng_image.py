import importlib.util
import json
import sys
import unittest
from pathlib import Path
from tempfile import TemporaryDirectory
from unittest.mock import patch


SCRIPT_PATH = Path(__file__).with_name("jimeng_image.py")
SPEC = importlib.util.spec_from_file_location("jimeng_image", SCRIPT_PATH)
if SPEC is None or SPEC.loader is None:
    raise RuntimeError("Failed to load jimeng_image.py")
jimeng_image = importlib.util.module_from_spec(SPEC)
sys.modules[SPEC.name] = jimeng_image
SPEC.loader.exec_module(jimeng_image)


class FakeResponse:
    def __init__(self, body: dict):
        self._body = json.dumps(body).encode("utf-8")

    def read(self) -> bytes:
        return self._body

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc, tb) -> bool:
        return False


class JimengImageTests(unittest.TestCase):
    def test_sign_request_uses_derived_signing_key(self) -> None:
        headers = jimeng_image.sign_request(
            method="POST",
            host="visual.volcengineapi.com",
            path="/",
            params={"Action": "CVSync2AsyncSubmitTask", "Version": "2022-08-31"},
            payload='{"req_key":"jimeng_t2i_v40","prompt":"test","size":4194304,"return_url":true,"force_single":true}',
            access_key="AKTESTEXAMPLE",
            secret_key="secret-example",
            datetime_str="20260320T020304Z",
            region="cn-north-1",
            service="cv",
        )
        self.assertEqual(headers["X-Date"], "20260320T020304Z")
        self.assertEqual(
            headers["Authorization"],
            "HMAC-SHA256 "
            "Credential=AKTESTEXAMPLE/20260320/cn-north-1/cv/request, "
            "SignedHeaders=content-type;host;x-date, "
            "Signature=23c33dede7bc548e1a5a500d9e7e46c497253d1c9edcdb1322ccc30f7d9140c8",
        )

    def test_generate_image_submits_and_polls_for_result(self) -> None:
        requests = []
        responses = [
            FakeResponse(
                {
                    "code": 10000,
                    "data": {"task_id": "7392616336519610409"},
                    "message": "Success",
                }
            ),
            FakeResponse(
                {
                    "code": 10000,
                    "data": {
                        "status": "done",
                        "image_urls": ["https://img.example.com/result.png"],
                    },
                    "message": "Success",
                }
            ),
        ]

        def fake_urlopen(request, timeout=0):
            requests.append((request, timeout))
            return responses.pop(0)

        with patch.object(
            jimeng_image,
            "load_config",
            return_value={
                "volc_engine": {
                    "access_key_id": "AKTESTEXAMPLE",
                    "secret_access_key": "secret-example",
                    "region": "cn-north-1",
                    "service": "cv",
                }
            },
        ), patch.object(jimeng_image.urllib.request, "urlopen", side_effect=fake_urlopen), patch.object(
            jimeng_image,
            "sleep",
            lambda *_args, **_kwargs: None,
        ):
            result = jimeng_image.generate_image("一只猫", 2048)

        self.assertEqual(
            result,
            {
                "url": "https://img.example.com/result.png",
                "task_id": "7392616336519610409",
            },
        )
        self.assertEqual(len(requests), 2)

        submit_request, submit_timeout = requests[0]
        self.assertEqual(submit_timeout, 60)
        self.assertIn("Action=CVSync2AsyncSubmitTask", submit_request.full_url)
        self.assertIn("Version=2022-08-31", submit_request.full_url)
        submit_body = json.loads(submit_request.data.decode("utf-8"))
        self.assertEqual(submit_body["req_key"], "jimeng_t2i_v40")
        self.assertEqual(submit_body["prompt"], "一只猫")
        self.assertEqual(submit_body["size"], 2048 * 2048)
        self.assertTrue(submit_body["force_single"])

        result_request, result_timeout = requests[1]
        self.assertEqual(result_timeout, 60)
        self.assertIn("Action=CVSync2AsyncGetResult", result_request.full_url)
        result_body = json.loads(result_request.data.decode("utf-8"))
        self.assertEqual(result_body["req_key"], "jimeng_t2i_v40")
        self.assertEqual(result_body["task_id"], "7392616336519610409")
        self.assertEqual(json.loads(result_body["req_json"]), {"return_url": True})

    def test_generate_image_supports_width_height_and_auto_download(self) -> None:
        requests = []
        responses = [
            FakeResponse(
                {
                    "code": 10000,
                    "data": {"task_id": "task-width-height"},
                    "message": "Success",
                }
            ),
            FakeResponse(
                {
                    "code": 10000,
                    "data": {
                        "status": "done",
                        "image_urls": ["https://img.example.com/wide.png"],
                    },
                    "message": "Success",
                }
            ),
        ]

        def fake_urlopen(request, timeout=0):
            requests.append((request, timeout))
            return responses.pop(0)

        def fake_urlretrieve(url, output_path):
            Path(output_path).write_bytes(b"fake-image")
            return str(output_path), None

        with TemporaryDirectory() as tmpdir, patch.object(
            jimeng_image,
            "load_config",
            return_value={
                "volc_engine": {
                    "access_key_id": "AKTESTEXAMPLE",
                    "secret_access_key": "secret-example",
                    "region": "cn-north-1",
                    "service": "cv",
                }
            },
        ), patch.object(jimeng_image.urllib.request, "urlopen", side_effect=fake_urlopen), patch.object(
            jimeng_image,
            "sleep",
            lambda *_args, **_kwargs: None,
        ), patch.object(jimeng_image.urllib.request, "urlretrieve", side_effect=fake_urlretrieve):
            result = jimeng_image.generate_image(
                "宽屏海报",
                width=2560,
                height=1440,
                auto_download=True,
                download_dir=Path(tmpdir),
            )

            self.assertIsNotNone(result)
            assert result is not None
            self.assertEqual(result["url"], "https://img.example.com/wide.png")
            self.assertTrue(result["local_path"].endswith("task-width-height.png"))
            self.assertTrue(Path(result["local_path"]).exists())

        submit_request, _ = requests[0]
        submit_body = json.loads(submit_request.data.decode("utf-8"))
        self.assertEqual(submit_body["width"], 2560)
        self.assertEqual(submit_body["height"], 1440)
        self.assertNotIn("size", submit_body)

    def test_resolve_download_path_normalizes_unknown_suffix_to_png(self) -> None:
        with TemporaryDirectory() as tmpdir:
            path = jimeng_image.resolve_download_path(
                "https://img.example.com/generated.image?foo=bar",
                "task-suffix",
                output_path=None,
                download_dir=Path(tmpdir),
            )
            self.assertEqual(path.name, "task-suffix.png")


if __name__ == "__main__":
    unittest.main()
