#!/usr/bin/env python3
from __future__ import annotations

import argparse
import io
import json
import mimetypes
import os
import re
import subprocess
import sys
import tempfile
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable, Optional
from urllib.parse import urlparse

import requests
import yaml
from bs4 import BeautifulSoup, NavigableString, Tag
from markdown import Markdown
from PIL import Image

MODULE_DIR = Path(__file__).resolve().parents[1]
REPO_ROOT = Path(__file__).resolve().parents[4]
DEFAULT_CONFIG_PATH = Path(os.environ.get("WECHAT_MP_CONFIG", str(MODULE_DIR / "config.json")))
DEFAULT_JIMENG_SCRIPT = Path(
    os.environ.get(
        "WECHAT_MP_JIMENG_SCRIPT",
        str(REPO_ROOT / "modules/image-generation/jimeng-volcengine/scripts/jimeng_image.py"),
    )
)
DEFAULT_AUTHOR = "Dylan"
DEFAULT_SITE_BASE_URL = os.environ.get("WECHAT_MP_SITE_BASE_URL", "https://www.example.com")
DEFAULT_BLOG_POSTS_DIR = Path(
    os.environ.get("WECHAT_MP_BLOG_POSTS_DIR", str(REPO_ROOT / "blog/posts"))
).expanduser()
MAX_BODY_IMAGE_BYTES = 1024 * 1024
ALLOWED_TAGS = {
    "section",
    "h1",
    "h2",
    "h3",
    "p",
    "blockquote",
    "ul",
    "ol",
    "li",
    "pre",
    "code",
    "img",
    "hr",
    "strong",
    "em",
    "del",
    "a",
    "br",
}
STYLE_MAP = {
    "h1": "font-size:24px;line-height:1.45;font-weight:700;color:#111827;margin:0 0 18px 0;padding-bottom:10px;border-bottom:2px solid #0f766e;",
    "h2": "font-size:20px;line-height:1.5;font-weight:700;color:#0f172a;margin:28px 0 12px 0;padding-left:10px;border-left:4px solid #0f766e;",
    "h3": "font-size:17px;line-height:1.55;font-weight:700;color:#134e4a;margin:20px 0 8px 0;",
    "p": "margin:12px 0;line-height:1.8;font-size:15px;color:#1f2937;",
    "blockquote": "margin:16px 0;padding:12px 14px;border-left:4px solid #14b8a6;background-color:#f0fdfa;color:#0f766e;font-size:14px;line-height:1.8;",
    "ul": "margin:12px 0;padding-left:22px;color:#1f2937;",
    "ol": "margin:12px 0;padding-left:22px;color:#1f2937;",
    "li": "margin:8px 0;line-height:1.8;font-size:15px;color:#1f2937;",
    "pre": "margin:14px 0;padding:14px 16px;background-color:#0f172a;color:#e2e8f0;border-radius:8px;overflow-x:auto;line-height:1.7;font-size:13px;",
    "code": "font-size:13px;font-family:Menlo,Consolas,Monaco,monospace;",
    "img": "max-width:100%;width:100%;height:auto;border-radius:8px;",
    "hr": "border:none;border-top:1px solid #d1d5db;margin:22px 0;",
    "a": "color:#0f766e;text-decoration:underline;",
    "section": "margin:0;",
}
LABELED_URL_RE = re.compile(r"^\s*(原文|HN\s*讨论)\s*[：:]\s*(https?://[^\s<]+)\s*$")


@dataclass
class ArticleMeta:
    title: str
    author: str
    summary: str
    cover_image: Optional[str] = None
    source_url: Optional[str] = None


def derive_content_source_url(
    article_path: Path,
    site_base_url: str = DEFAULT_SITE_BASE_URL,
    blog_posts_dir: Path = DEFAULT_BLOG_POSTS_DIR,
) -> Optional[str]:
    try:
        relative = article_path.resolve().relative_to(blog_posts_dir.resolve())
    except ValueError:
        return None
    if relative.suffix.lower() != ".md":
        return None
    return f"{site_base_url.rstrip('/')}/posts/{relative.with_suffix('.html').as_posix()}"


def collapse_markdown_tables(markdown_text: str) -> str:
    lines = markdown_text.splitlines()
    output: list[str] = []
    idx = 0
    while idx < len(lines):
        if _looks_like_table_header(lines, idx):
            output.extend(_convert_table_block(lines, idx))
            idx = _skip_table_block(lines, idx)
            continue
        output.append(lines[idx])
        idx += 1
    return "\n".join(output)


def _looks_like_table_header(lines: list[str], idx: int) -> bool:
    if idx + 1 >= len(lines):
        return False
    return "|" in lines[idx] and _is_table_separator(lines[idx + 1])


def _is_table_separator(line: str) -> bool:
    stripped = line.strip()
    if not stripped or "-" not in stripped:
        return False
    simplified = stripped.replace("|", "").replace(":", "").replace("-", "").strip()
    return simplified == ""


def _split_table_row(line: str) -> list[str]:
    stripped = line.strip().strip("|")
    return [cell.strip() for cell in stripped.split("|")]


def _convert_table_block(lines: list[str], idx: int) -> list[str]:
    header = _split_table_row(lines[idx])
    rows: list[list[str]] = []
    pointer = idx + 2
    while pointer < len(lines) and "|" in lines[pointer]:
        rows.append(_split_table_row(lines[pointer]))
        pointer += 1

    rendered = ["### 表格信息"]
    for row in rows:
        parts = []
        for key, value in zip(header, row):
            if key or value:
                parts.append(f"**{key or '字段'}**：{value}")
        if parts:
            rendered.append(f"- {'；'.join(parts)}")
    if len(rendered) == 1:
        rendered.append("- 表格内容为空")
    return rendered


def _skip_table_block(lines: list[str], idx: int) -> int:
    pointer = idx + 2
    while pointer < len(lines) and "|" in lines[pointer]:
        pointer += 1
    return pointer


def parse_frontmatter_and_body(markdown_text: str) -> tuple[dict, str]:
    if not markdown_text.startswith("---\n") and not markdown_text.startswith("---\r\n"):
        return {}, markdown_text
    match = re.match(r"^---\r?\n(.*?)\r?\n---\r?\n?", markdown_text, re.DOTALL)
    if not match:
        return {}, markdown_text
    raw = match.group(1)
    body = markdown_text[match.end():]
    data = yaml.safe_load(raw) or {}
    if not isinstance(data, dict):
        data = {}
    return data, body


def extract_article_meta(markdown_text: str, article_path: Path, author_override: Optional[str], title_override: Optional[str], summary_override: Optional[str]) -> tuple[ArticleMeta, str]:
    frontmatter, body = parse_frontmatter_and_body(markdown_text)
    body = collapse_markdown_tables(body)
    title = title_override or str(frontmatter.get("title") or "").strip() or _extract_first_heading(body) or article_path.stem
    author = author_override or str(frontmatter.get("author") or "").strip() or DEFAULT_AUTHOR
    summary = summary_override or str(frontmatter.get("summary") or frontmatter.get("description") or "").strip() or _summarize_body(body)
    cover_image = None
    for key in ("coverImage", "featureImage", "cover", "image"):
        value = frontmatter.get(key)
        if value:
            cover_image = str(value).strip()
            break
    source_url = None
    for key in ("contentSourceUrl", "sourceUrl", "source_url", "linkPage"):
        value = frontmatter.get(key)
        if value:
            source_url = str(value).strip()
            break
    return ArticleMeta(
        title=title[:64],
        author=author,
        summary=summary[:120],
        cover_image=cover_image,
        source_url=source_url,
    ), body


def _extract_first_heading(body: str) -> str:
    match = re.search(r"^#\s+(.+)$", body, re.MULTILINE)
    return match.group(1).strip() if match else ""


def _summarize_body(body: str, max_len: int = 120) -> str:
    cleaned = []
    for line in body.splitlines():
        stripped = line.strip()
        if not stripped or stripped.startswith("#") or stripped.startswith("!["):
            continue
        cleaned.append(re.sub(r"\s+", " ", stripped))
        if len(" ".join(cleaned)) >= max_len:
            break
    summary = " ".join(cleaned)
    return summary[: max_len - 1] + "…" if len(summary) > max_len else summary


def render_markdown_to_html(markdown_body: str) -> str:
    md = Markdown(extensions=["fenced_code", "sane_lists", "nl2br"])
    return md.convert(markdown_body)


def sanitize_and_style_html(html: str) -> str:
    soup = BeautifulSoup(html, "html.parser")

    for tag in list(soup.find_all(True)):
        if tag.name in {"script", "style", "iframe", "svg", "audio", "video", "canvas", "form", "input", "button", "textarea", "select"}:
            tag.decompose()
            continue
        if tag.name == "table":
            tag.unwrap()
            continue
        if tag.name not in ALLOWED_TAGS:
            tag.unwrap()
            continue

        _sanitize_attributes(tag)
        style = STYLE_MAP.get(tag.name)
        if style:
            tag["style"] = style

        if tag.name == "a":
            href = tag.get("href", "")
            if not href.startswith("http://") and not href.startswith("https://"):
                tag.unwrap()
        if tag.name == "img":
            parent = tag.parent
            if isinstance(parent, Tag) and parent.name == "p":
                parent["style"] = "margin:16px 0;text-align:center;"

    _linkify_labeled_plaintext_urls(soup)
    _flatten_wechat_lists(soup)
    return str(soup)


def _sanitize_attributes(tag: Tag) -> None:
    allowed = {"style"}
    if tag.name == "a":
        allowed.update({"href", "title"})
    elif tag.name == "img":
        allowed.update({"src", "alt"})
    elif tag.name == "ol":
        allowed.add("start")

    for attr in list(tag.attrs):
        if attr not in allowed:
            del tag.attrs[attr]


def _linkify_labeled_plaintext_urls(soup: BeautifulSoup) -> None:
    for tag in soup.find_all(["p", "li"]):
        if any(isinstance(child, Tag) for child in tag.contents):
            continue
        text = tag.get_text(strip=True)
        match = LABELED_URL_RE.match(text)
        if not match:
            continue
        label, url = match.groups()
        tag.clear()
        tag.append(NavigableString(f"{label}："))
        link = soup.new_tag("a", href=url)
        link["style"] = STYLE_MAP["a"]
        link.string = url
        tag.append(link)


def _flatten_wechat_lists(soup: BeautifulSoup) -> None:
    list_tags = list(soup.find_all(["ol", "ul"]))
    for list_tag in reversed(list_tags):
        items = list_tag.find_all("li", recursive=False)
        if not items:
            list_tag.decompose()
            continue

        flattened: list[Tag] = []
        start = 1
        if list_tag.name == "ol":
            try:
                start = int(list_tag.get("start", 1))
            except (TypeError, ValueError):
                start = 1

        for index, item in enumerate(items, start=start):
            paragraph = soup.new_tag("p")
            paragraph["style"] = "margin:10px 0;line-height:1.8;font-size:15px;color:#1f2937;"
            prefix = f"{index}. " if list_tag.name == "ol" else "• "
            paragraph.append(NavigableString(prefix))
            for child in list(item.contents):
                paragraph.append(child.extract())
            flattened.append(paragraph)

        for paragraph in reversed(flattened):
            list_tag.insert_after(paragraph)
        list_tag.decompose()


class WeChatMpPublisher:
    def __init__(self, config_path: Path):
        self.config_path = config_path
        self.config = self._load_config(config_path)
        self.access_token: Optional[str] = None
        self.session = requests.Session()
        self.tmpdir_obj = tempfile.TemporaryDirectory(prefix="wechat-mp-publisher-")
        self.tmpdir = Path(self.tmpdir_obj.name)

    def _load_config(self, path: Path) -> dict:
        with path.open("r", encoding="utf-8") as fh:
            return json.load(fh)

    def _wechat_config(self) -> dict:
        nested = self.config.get("wechat")
        if isinstance(nested, dict):
            return nested
        return self.config

    @property
    def appid(self) -> str:
        config = self._wechat_config()
        value = config.get("WECHAT_APPID") or config.get("appid")
        if not value:
            raise KeyError("WECHAT_APPID/appid")
        return value

    @property
    def secret(self) -> str:
        config = self._wechat_config()
        value = config.get("WECHAT_SECRET") or config.get("secret")
        if not value:
            raise KeyError("WECHAT_SECRET/secret")
        return value

    @property
    def default_author(self) -> str:
        config = self._wechat_config()
        return config.get("WECHAT_AUTHOR") or config.get("author") or DEFAULT_AUTHOR

    @property
    def site_base_url(self) -> str:
        value = (
            os.environ.get("WECHAT_MP_SITE_BASE_URL")
            or self.config.get("site_base_url")
            or DEFAULT_SITE_BASE_URL
        )
        return str(value).rstrip("/")

    @property
    def blog_posts_dir(self) -> Path:
        value = (
            os.environ.get("WECHAT_MP_BLOG_POSTS_DIR")
            or self.config.get("blog_posts_dir")
            or str(DEFAULT_BLOG_POSTS_DIR)
        )
        return Path(str(value)).expanduser().resolve()

    def infer_content_source_url(self, article_path: Path) -> Optional[str]:
        return derive_content_source_url(
            article_path,
            site_base_url=self.site_base_url,
            blog_posts_dir=self.blog_posts_dir,
        )

    def get_access_token(self) -> str:
        if self.access_token:
            return self.access_token
        response = self.session.get(
            "https://api.weixin.qq.com/cgi-bin/token",
            params={"grant_type": "client_credential", "appid": self.appid, "secret": self.secret},
            timeout=30,
        )
        data = response.json()
        if "access_token" not in data:
            raise RuntimeError(f"access_token 获取失败: {data}")
        self.access_token = data["access_token"]
        return self.access_token

    def upload_cover_image(self, image_path: Path) -> str:
        token = self.get_access_token()
        prepared = self.prepare_image_for_wechat(image_path, max_bytes=2 * 1024 * 1024)
        try:
            with prepared.open("rb") as fh:
                response = self.session.post(
                    f"https://api.weixin.qq.com/cgi-bin/material/add_material?access_token={token}&type=image",
                    files={"media": fh},
                    timeout=180,
                )
            data = response.json()
        except Exception:
            data = self._upload_file_via_curl(
                f"https://api.weixin.qq.com/cgi-bin/material/add_material?access_token={token}&type=image",
                prepared,
                max_time=180,
                retries=1,
            )
        if "media_id" not in data:
            raise RuntimeError(f"封面上传失败: {data}")
        return data["media_id"]

    def upload_body_image(self, image_path: Path) -> str:
        token = self.get_access_token()
        prepared = self.prepare_image_for_wechat(image_path, max_bytes=MAX_BODY_IMAGE_BYTES, prefer_jpeg=True)
        data = self._upload_file_via_curl(
            f"https://api.weixin.qq.com/cgi-bin/media/uploadimg?access_token={token}",
            prepared,
        )
        if "url" not in data:
            raise RuntimeError(f"正文图片上传失败: {data}")
        return data["url"]

    def _upload_file_via_curl(self, url: str, image_path: Path, max_time: int = 90, retries: int = 2) -> dict:
        command = [
            "curl",
            "-sS",
            "--http1.1",
            "--max-time",
            str(max_time),
            "--retry",
            str(retries),
            "--retry-all-errors",
            "--retry-delay",
            "1",
            "-F",
            f"media=@{image_path}",
            url,
        ]
        result = subprocess.run(command, capture_output=True, text=True)
        if result.returncode != 0:
            raise RuntimeError(f"curl 上传失败: {result.stderr.strip() or result.stdout.strip()}")
        try:
            return json.loads(result.stdout)
        except json.JSONDecodeError as exc:
            raise RuntimeError(f"微信上传返回非 JSON: {result.stdout}") from exc

    def prepare_image_for_wechat(self, image_path: Path, max_bytes: int, prefer_jpeg: bool = False) -> Path:
        suffix = image_path.suffix.lower()
        if suffix in {".jpg", ".jpeg"} and image_path.stat().st_size <= max_bytes:
            return image_path
        if not prefer_jpeg and suffix == ".png" and image_path.stat().st_size <= max_bytes:
            return image_path

        with Image.open(image_path) as img:
            rgb = img.convert("RGB")
            candidate = self.tmpdir / f"{image_path.stem}-wechat.jpg"
            for max_side, quality in ((1600, 88), (1400, 82), (1200, 76), (1000, 70), (800, 64)):
                resized = rgb.copy()
                resized.thumbnail((max_side, max_side))
                resized.save(candidate, format="JPEG", quality=quality, optimize=True)
                if candidate.stat().st_size <= max_bytes:
                    return candidate
        raise RuntimeError(f"图片压缩后仍超出限制: {image_path}")

    def resolve_image_source(self, src: str, article_dir: Path) -> Path:
        if src.startswith("http://") or src.startswith("https://"):
            return self.download_remote_image(src)
        path = Path(src)
        if not path.is_absolute():
            path = (article_dir / src).resolve()
        if not path.exists():
            raise FileNotFoundError(f"图片不存在: {path}")
        return path

    def download_remote_image(self, url: str) -> Path:
        response = self.session.get(url, timeout=60)
        response.raise_for_status()
        parsed = urlparse(url)
        suffix = Path(parsed.path).suffix.lower()
        if suffix not in {".jpg", ".jpeg", ".png"}:
            mime = response.headers.get("content-type", "")
            guessed = mimetypes.guess_extension(mime.split(";")[0].strip()) or ".png"
            suffix = guessed if guessed in {".jpg", ".jpeg", ".png"} else ".png"
        target = self.tmpdir / f"download-{abs(hash(url))}{suffix}"
        target.write_bytes(response.content)
        return target

    def rewrite_body_images(self, html: str, article_dir: Path, upload: bool = True) -> tuple[str, int]:
        soup = BeautifulSoup(html, "html.parser")
        rewritten = 0
        for img in list(soup.find_all("img")):
            src = (img.get("src") or "").strip()
            if not src:
                img.decompose()
                continue
            img["style"] = STYLE_MAP["img"]
            if upload:
                local_path = self.resolve_image_source(src, article_dir)
                uploaded_url = self.upload_body_image(local_path)
                img["src"] = uploaded_url
                rewritten += 1
            alt_text = (img.get("alt") or "").strip()
            if alt_text:
                caption = soup.new_tag("p")
                caption["style"] = "margin:6px 0 16px 0;text-align:center;font-size:13px;line-height:1.6;color:#6b7280;"
                caption.string = alt_text
                img.insert_after(caption)
        return str(soup), rewritten

    def create_draft(self, meta: ArticleMeta, html_content: str, thumb_media_id: Optional[str]) -> str:
        token = self.get_access_token()
        payload = {
            "articles": [
                {
                    "title": meta.title,
                    "author": meta.author,
                    "digest": meta.summary,
                    "content": html_content,
                    "content_source_url": meta.source_url or "",
                    "thumb_media_id": thumb_media_id,
                    "show_cover_pic": 1 if thumb_media_id else 0,
                    "need_open_comment": 0,
                    "only_fans_can_comment": 0,
                }
            ]
        }
        response = self.session.post(
            f"https://api.weixin.qq.com/cgi-bin/draft/add?access_token={token}",
            data=json.dumps(payload, ensure_ascii=False).encode("utf-8"),
            headers={"Content-Type": "application/json; charset=utf-8"},
            timeout=60,
        )
        data = response.json()
        if "media_id" not in data:
            raise RuntimeError(f"草稿创建失败: {data}")
        return data["media_id"]

    def maybe_generate_cover(self, prompt: Optional[str], width: Optional[int], height: Optional[int], download_dir: Path) -> Optional[Path]:
        if not prompt:
            return None
        cmd = [sys.executable, str(DEFAULT_JIMENG_SCRIPT), "--prompt", prompt, "--download-dir", str(download_dir)]
        if width and height:
            cmd.extend(["--width", str(width), "--height", str(height)])
        result = subprocess.run(cmd, capture_output=True, text=True, check=True)
        for line in result.stdout.splitlines():
            if line.startswith("✅ 已保存到: "):
                return Path(line.replace("✅ 已保存到: ", "").strip())
        raise RuntimeError(f"即梦封面生成成功但未返回文件路径:\n{result.stdout}")


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Publish Markdown articles to WeChat Official Account drafts.")
    parser.add_argument("--article", required=True, help="Markdown article path")
    parser.add_argument("--config", default=str(DEFAULT_CONFIG_PATH), help="WeChat config.json path")
    parser.add_argument("--author", help="Override author")
    parser.add_argument("--title", help="Override title")
    parser.add_argument("--summary", help="Override summary")
    parser.add_argument("--source-url", help="Set the article's WeChat 阅读原文 URL")
    parser.add_argument("--cover-image", help="Explicit cover image file")
    parser.add_argument("--jimeng-cover-prompt", help="Generate the cover via Jimeng before publishing")
    parser.add_argument("--jimeng-width", type=int, help="Jimeng cover width")
    parser.add_argument("--jimeng-height", type=int, help="Jimeng cover height")
    parser.add_argument("--download-dir", default="", help="Jimeng image output directory")
    parser.add_argument("--html-out", help="Write rendered WeChat HTML to a file")
    parser.add_argument("--dry-run", action="store_true", help="Render HTML and process images metadata, but do not publish the draft")
    return parser


def main() -> int:
    args = build_parser().parse_args()
    article_path = Path(args.article).expanduser().resolve()
    if not article_path.exists():
        print(f"❌ Markdown 文件不存在: {article_path}", file=sys.stderr)
        return 1
    config_path = Path(args.config).expanduser().resolve()
    if not config_path.exists():
        print(f"❌ 配置文件不存在: {config_path}", file=sys.stderr)
        return 1
    if bool(args.jimeng_width) != bool(args.jimeng_height):
        print("❌ --jimeng-width 和 --jimeng-height 必须一起提供", file=sys.stderr)
        return 1

    markdown_text = article_path.read_text(encoding="utf-8")
    publisher = WeChatMpPublisher(config_path)
    meta, body = extract_article_meta(markdown_text, article_path, args.author, args.title, args.summary)
    if not meta.author:
        meta.author = publisher.default_author
    if args.source_url:
        meta.source_url = args.source_url.strip()
    elif not meta.source_url:
        meta.source_url = publisher.infer_content_source_url(article_path)

    rendered_html = sanitize_and_style_html(render_markdown_to_html(body))
    rewritten_html, image_count = publisher.rewrite_body_images(rendered_html, article_path.parent, upload=not args.dry_run)

    cover_path = None
    if args.cover_image:
        cover_path = publisher.resolve_image_source(args.cover_image, article_path.parent)
    elif args.jimeng_cover_prompt:
        download_dir = Path(args.download_dir).expanduser().resolve() if args.download_dir else publisher.tmpdir / "jimeng"
        download_dir.mkdir(parents=True, exist_ok=True)
        cover_path = publisher.maybe_generate_cover(args.jimeng_cover_prompt, args.jimeng_width, args.jimeng_height, download_dir)
    elif meta.cover_image:
        cover_path = publisher.resolve_image_source(meta.cover_image, article_path.parent)

    if args.html_out:
        html_out = Path(args.html_out).expanduser().resolve()
        html_out.write_text(rewritten_html, encoding="utf-8")

    print(f"🧾 标题: {meta.title}")
    print(f"✍️ 作者: {meta.author}")
    print(f"🖼️ 正文图片已处理: {image_count}")
    if cover_path:
        print(f"🖼️ 封面来源: {cover_path}")

    if args.dry_run:
        print("✅ Dry run 完成，未发布草稿")
        return 0

    thumb_media_id = publisher.upload_cover_image(cover_path) if cover_path else None
    media_id = publisher.create_draft(meta, rewritten_html, thumb_media_id)
    print(f"✅ 草稿创建成功，media_id: {media_id}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
