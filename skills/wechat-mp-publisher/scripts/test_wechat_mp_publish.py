import importlib.util
import sys
import tempfile
import unittest
from pathlib import Path

from PIL import Image

MODULE_PATH = Path(__file__).with_name("wechat_mp_publish.py")
SPEC = importlib.util.spec_from_file_location("wechat_mp_publish", MODULE_PATH)
MODULE = importlib.util.module_from_spec(SPEC)
sys.modules[SPEC.name] = MODULE
assert SPEC.loader is not None
SPEC.loader.exec_module(MODULE)


class TableCollapseTests(unittest.TestCase):
    def test_collapse_markdown_table_to_bullets(self):
        source = """# Title

| Name | Value |
| --- | --- |
| Alpha | One |
| Beta | Two |
"""
        collapsed = MODULE.collapse_markdown_tables(source)
        self.assertIn("### 表格信息", collapsed)
        self.assertIn("- **Name**：Alpha；**Value**：One", collapsed)
        self.assertNotIn("| Name | Value |", collapsed)


class HtmlSanitizeTests(unittest.TestCase):
    def test_rendered_html_is_wechat_friendly(self):
        markdown = """# Title

<script>alert(1)</script>

[safe](https://example.com)

[unsafe](javascript:alert(1))

```python
print("hi")
```
"""
        html = MODULE.render_markdown_to_html(markdown)
        sanitized = MODULE.sanitize_and_style_html(html)
        self.assertIn("font-size:24px", sanitized)
        self.assertNotIn("<script", sanitized)
        self.assertNotIn("javascript:alert", sanitized)
        self.assertIn("<pre", sanitized)

    def test_labeled_plaintext_urls_become_hyperlinks(self):
        markdown = """原文：https://example.com/post

HN 讨论：https://news.ycombinator.com/item?id=123
"""
        html = MODULE.render_markdown_to_html(markdown)
        sanitized = MODULE.sanitize_and_style_html(html)
        self.assertIn('href="https://example.com/post"', sanitized)
        self.assertIn('href="https://news.ycombinator.com/item?id=123"', sanitized)
        self.assertIn("原文：", sanitized)
        self.assertIn("HN 讨论：", sanitized)


class BodyImageRewriteTests(unittest.TestCase):
    def test_rewrite_body_images_replaces_src_and_adds_caption(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            base = Path(tmpdir)
            image_path = base / "story.png"
            image_path.write_bytes(b"fake")

            publisher = object.__new__(MODULE.WeChatMpPublisher)
            publisher.resolve_image_source = lambda src, article_dir: image_path
            publisher.upload_body_image = lambda path: "https://mmbiz.qpic.cn/test.png"

            html, count = MODULE.WeChatMpPublisher.rewrite_body_images(
                publisher,
                '<p><img src="story.png" alt="配图说明" /></p>',
                base,
            )
            self.assertEqual(count, 1)
            self.assertIn("https://mmbiz.qpic.cn/test.png", html)
            self.assertIn("配图说明", html)


class ConfigCompatibilityTests(unittest.TestCase):
    def test_supports_nested_wechat_config(self):
        publisher = object.__new__(MODULE.WeChatMpPublisher)
        publisher.config = {
            "wechat": {
                "appid": "wx123",
                "secret": "sec456",
                "author": "Dylan",
            }
        }
        self.assertEqual(publisher.appid, "wx123")
        self.assertEqual(publisher.secret, "sec456")
        self.assertEqual(publisher.default_author, "Dylan")


class ImagePreparationTests(unittest.TestCase):
    def test_prepare_image_for_wechat_transcodes_png_for_body_upload(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            base = Path(tmpdir)
            source = base / "story.png"
            Image.new("RGBA", (64, 64), (10, 20, 30, 255)).save(source, format="PNG")

            publisher = object.__new__(MODULE.WeChatMpPublisher)
            publisher.tmpdir = base

            prepared = MODULE.WeChatMpPublisher.prepare_image_for_wechat(
                publisher,
                source,
                max_bytes=1024 * 1024,
                prefer_jpeg=True,
            )
            self.assertEqual(prepared.suffix.lower(), ".jpg")
            self.assertTrue(prepared.exists())


class DraftSourceUrlTests(unittest.TestCase):
    def test_derive_content_source_url_for_blog_post(self):
        article_path = Path("/home/openclaw/blog/posts/2026-03-20-hackernews-top50.md")
        self.assertEqual(
            MODULE.derive_content_source_url(article_path),
            "https://www.dylanslife.com/posts/2026-03-20-hackernews-top50.html",
        )

    def test_extract_article_meta_auto_derives_blog_source_url(self):
        article_path = Path("/home/openclaw/blog/posts/2026-03-20-hackernews-top50.md")
        meta, _body = MODULE.extract_article_meta(
            "# Title\n\nBody\n",
            article_path,
            None,
            None,
            None,
        )
        self.assertEqual(
            meta.source_url,
            "https://www.dylanslife.com/posts/2026-03-20-hackernews-top50.html",
        )

    def test_create_draft_uses_content_source_url(self):
        captured = {}

        class DummyResponse:
            def json(self):
                return {"media_id": "draft123"}

        publisher = object.__new__(MODULE.WeChatMpPublisher)
        publisher.access_token = "token123"
        publisher.get_access_token = lambda: "token123"

        class DummySession:
            def post(self, url, data=None, headers=None, timeout=None):
                captured["url"] = url
                captured["data"] = data
                captured["headers"] = headers
                captured["timeout"] = timeout
                return DummyResponse()

        publisher.session = DummySession()
        meta = MODULE.ArticleMeta(
            title="Test Title",
            author="Dylan",
            summary="Summary",
            source_url="https://www.dylanslife.com/posts/2026-03-20-hackernews-top50.html",
        )
        media_id = MODULE.WeChatMpPublisher.create_draft(
            publisher,
            meta,
            "<p>Hello</p>",
            "thumb123",
        )
        payload = MODULE.json.loads(captured["data"].decode("utf-8"))
        self.assertEqual(media_id, "draft123")
        self.assertEqual(
            payload["articles"][0]["content_source_url"],
            "https://www.dylanslife.com/posts/2026-03-20-hackernews-top50.html",
        )


if __name__ == "__main__":
    unittest.main()
