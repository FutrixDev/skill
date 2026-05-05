#!/usr/bin/env python3
from __future__ import annotations

import re
from functools import lru_cache
from pathlib import Path
from typing import Iterable

import yaml
from bs4 import BeautifulSoup, NavigableString, Tag
from markdown import Markdown

MODULE_DIR = Path(__file__).resolve().parents[1]
THEMES_DIR = MODULE_DIR / "themes"
DEFAULT_THEME = "tech-clean"

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
    "table",
    "thead",
    "tbody",
    "tr",
    "th",
    "td",
}

LABELED_URL_RE = re.compile(r"^\s*(原文|HN\s*讨论)\s*[：:]\s*(https?://[^\s<]+)\s*$")
DIRECTIVE_RE = re.compile(r"^:::\s*([a-zA-Z0-9_-]+)(?:\s+(.+?))?\s*$")
DIRECTIVE_END = re.compile(r"^:::\s*$")


@lru_cache(maxsize=None)
def load_theme(name: str = DEFAULT_THEME) -> dict:
    theme_name = (name or DEFAULT_THEME).strip() or DEFAULT_THEME
    path = THEMES_DIR / f"{theme_name}.yaml"
    if not path.exists():
        available = ", ".join(list_themes())
        raise FileNotFoundError(f"未知主题: {theme_name}。可用主题: {available}")
    with path.open("r", encoding="utf-8") as fh:
        data = yaml.safe_load(fh) or {}
    if not isinstance(data, dict):
        raise ValueError(f"主题文件格式错误: {path}")
    data.setdefault("name", theme_name)
    data.setdefault("palette", {})
    data.setdefault("layout", {})
    data.setdefault("callouts", {})
    return data


def list_themes() -> list[str]:
    return sorted(path.stem for path in THEMES_DIR.glob("*.yaml"))


def build_style_map(theme_name: str = DEFAULT_THEME) -> dict[str, str]:
    theme = load_theme(theme_name)
    palette = theme["palette"]
    layout = theme["layout"]

    body_size = layout.get("body_font_size", "15px")
    line_height = layout.get("line_height", "1.8")
    radius = layout.get("radius", "10px")

    return {
        "h1": (
            f"font-size:24px;line-height:1.45;font-weight:700;color:{palette.get('heading', '#111827')};"
            f"margin:0 0 18px 0;padding-bottom:10px;border-bottom:2px solid {palette.get('primary', '#0f766e')};"
        ),
        "h2": (
            f"font-size:20px;line-height:1.5;font-weight:700;color:{palette.get('heading', '#0f172a')};"
            f"margin:28px 0 12px 0;padding-left:10px;border-left:4px solid {palette.get('primary', '#0f766e')};"
        ),
        "h3": (
            f"font-size:17px;line-height:1.55;font-weight:700;color:{palette.get('primary_dark', palette.get('primary', '#134e4a'))};"
            "margin:20px 0 8px 0;"
        ),
        "p": f"margin:12px 0;line-height:{line_height};font-size:{body_size};color:{palette.get('text', '#1f2937')};",
        "blockquote": (
            f"margin:16px 0;padding:12px 14px;border-left:4px solid {palette.get('accent', palette.get('primary', '#14b8a6'))};"
            f"background-color:{palette.get('surface', '#f0fdfa')};color:{palette.get('primary_dark', palette.get('primary', '#0f766e'))};"
            f"font-size:{body_size};line-height:{line_height};border-radius:{radius};"
        ),
        "ul": f"margin:12px 0;padding-left:22px;color:{palette.get('text', '#1f2937')};",
        "ol": f"margin:12px 0;padding-left:22px;color:{palette.get('text', '#1f2937')};",
        "li": f"margin:8px 0;line-height:{line_height};font-size:{body_size};color:{palette.get('text', '#1f2937')};",
        "pre": (
            f"margin:14px 0;padding:14px 16px;background-color:{palette.get('code_bg', '#0f172a')};"
            f"color:{palette.get('code_text', '#e2e8f0')};border-radius:{radius};overflow-x:auto;"
            f"line-height:1.7;font-size:13px;"
        ),
        "code": f"font-size:13px;font-family:Menlo,Consolas,Monaco,monospace;color:{palette.get('code_text', '#e2e8f0')};",
        "img": "max-width:100%;width:100%;height:auto;border-radius:8px;",
        "hr": f"border:none;border-top:1px solid {palette.get('border', '#d1d5db')};margin:22px 0;",
        "a": f"color:{palette.get('primary', '#0f766e')};text-decoration:underline;",
        "section": "margin:0;",
        "table": f"width:100%;border-collapse:collapse;margin:16px 0;font-size:14px;border:1px solid {palette.get('border', '#d1d5db')};",
        "thead": "",
        "tbody": "",
        "tr": "",
        "th": (
            f"padding:10px 12px;background:{palette.get('primary', '#0f766e')};color:#ffffff;font-weight:700;"
            f"text-align:left;border:1px solid {palette.get('border', '#d1d5db')};font-size:13px;"
        ),
        "td": f"padding:9px 12px;border:1px solid {palette.get('border', '#d1d5db')};color:{palette.get('text', '#374151')};font-size:14px;",
    }


def render_markdown_to_html(markdown_body: str) -> str:
    md = Markdown(extensions=["tables", "fenced_code", "sane_lists", "nl2br"])
    return md.convert(markdown_body)


def sanitize_and_style_html(html: str, theme_name: str = DEFAULT_THEME) -> str:
    style_map = build_style_map(theme_name)
    theme = load_theme(theme_name)
    palette = theme["palette"]
    soup = BeautifulSoup(html, "html.parser")

    for tag in list(soup.find_all(True)):
        if tag.name in {"script", "style", "iframe", "svg", "audio", "video", "canvas", "form", "input", "button", "textarea", "select"}:
            tag.decompose()
            continue
        if tag.name not in ALLOWED_TAGS:
            tag.unwrap()
            continue

        _sanitize_attributes(tag)
        style = style_map.get(tag.name)
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

    _linkify_labeled_plaintext_urls(soup, style_map)
    _flatten_wechat_lists(soup, style_map)
    _style_tables(soup, palette, style_map)
    return str(soup)


def render_markdown_document(markdown_body: str, theme_name: str = DEFAULT_THEME) -> str:
    blocks = split_markdown_blocks(markdown_body)
    rendered_parts: list[str] = []
    for block in blocks:
        kind = block["type"]
        if kind == "markdown":
            text = block["content"].strip()
            if not text:
                continue
            rendered_parts.append(sanitize_and_style_html(render_markdown_to_html(text), theme_name))
        elif kind == "directive":
            rendered_parts.append(
                render_directive_block(
                    block["name"],
                    block["content"],
                    theme_name=theme_name,
                    title=block.get("title"),
                )
            )
    return "\n".join(part for part in rendered_parts if part.strip())


def split_markdown_blocks(markdown_body: str) -> list[dict]:
    lines = markdown_body.splitlines()
    blocks: list[dict] = []
    normal_lines: list[str] = []
    i = 0
    while i < len(lines):
        match = DIRECTIVE_RE.match(lines[i].strip())
        if match:
            if normal_lines:
                blocks.append({"type": "markdown", "content": "\n".join(normal_lines).strip("\n")})
                normal_lines = []
            name = match.group(1).lower()
            title = (match.group(2) or "").strip() or None
            i += 1
            content_lines: list[str] = []
            while i < len(lines) and not DIRECTIVE_END.match(lines[i].strip()):
                content_lines.append(lines[i])
                i += 1
            blocks.append(
                {
                    "type": "directive",
                    "name": name,
                    "title": title,
                    "content": "\n".join(content_lines).strip("\n"),
                }
            )
            while i < len(lines) and DIRECTIVE_END.match(lines[i].strip()):
                i += 1
            continue
        normal_lines.append(lines[i])
        i += 1
    if normal_lines:
        blocks.append({"type": "markdown", "content": "\n".join(normal_lines).strip("\n")})
    return blocks


def render_directive_block(name: str, content: str, theme_name: str = DEFAULT_THEME, title: str | None = None) -> str:
    theme = load_theme(theme_name)
    palette = theme["palette"]
    layout = theme["layout"]
    callouts = theme.get("callouts", {})
    config = callouts.get(name, {})
    label = title or config.get("label") or name.replace("-", " ").title()
    emoji = config.get("emoji", "🧩")
    bg = config.get("background", palette.get("surface_alt", "#f8fafc"))
    border = config.get("border_color", palette.get("primary", "#0f766e"))
    title_color = config.get("title_color", palette.get("primary_dark", palette.get("primary", "#134e4a")))
    radius = layout.get("radius", "10px")

    inner_html = sanitize_and_style_html(render_markdown_to_html(content), theme_name) if content.strip() else ""
    inner_soup = BeautifulSoup(inner_html, "html.parser")
    outer = BeautifulSoup("", "html.parser")

    section = outer.new_tag("section")
    section["style"] = (
        f"margin:18px 0;padding:16px 16px 2px 16px;background:{bg};"
        f"border:1px solid {border};border-radius:{radius};"
    )

    title_tag = outer.new_tag("p")
    title_tag["style"] = f"margin:0 0 10px 0;font-size:15px;line-height:1.6;font-weight:700;color:{title_color};"
    title_tag.string = f"{emoji} {label}"
    section.append(title_tag)

    for child in list(inner_soup.contents):
        section.append(child.extract())

    return str(section)


def _sanitize_attributes(tag: Tag) -> None:
    allowed = {"style"}
    if tag.name == "a":
        allowed.update({"href", "title"})
    elif tag.name == "img":
        allowed.update({"src", "alt"})
    elif tag.name == "ol":
        allowed.add("start")
    elif tag.name in {"table", "tr", "th", "td"}:
        allowed.update({"width", "colspan", "rowspan", "height"})

    for attr in list(tag.attrs):
        if attr not in allowed:
            del tag.attrs[attr]


def _linkify_labeled_plaintext_urls(soup: BeautifulSoup, style_map: dict[str, str]) -> None:
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
        link["style"] = style_map["a"]
        link.string = url
        tag.append(link)


def _flatten_wechat_lists(soup: BeautifulSoup, style_map: dict[str, str]) -> None:
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
            paragraph["style"] = style_map["p"]
            prefix = f"{index}. " if list_tag.name == "ol" else "• "
            paragraph.append(NavigableString(prefix))
            for child in list(item.contents):
                paragraph.append(child.extract())
            flattened.append(paragraph)

        for paragraph in reversed(flattened):
            list_tag.insert_after(paragraph)
        list_tag.decompose()


def _style_tables(soup: BeautifulSoup, palette: dict, style_map: dict[str, str]) -> None:
    for table in soup.find_all("table"):
        table["style"] = style_map["table"]
        for row_index, row in enumerate(table.find_all("tr")):
            cells = row.find_all("td")
            if not cells:
                continue
            background = "#ffffff" if row_index % 2 == 1 else palette.get("surface_alt", "#f8fafc")
            for cell in cells:
                cell["style"] = style_map["td"] + f"background:{background};"


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
