#!/usr/bin/env python3
"""
微信公众号 HTML 预览器
将 Markdown 转换为带主题的微信兼容 HTML 片段。
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
if str(SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPT_DIR))

from wechat_renderer import DEFAULT_THEME, list_themes, render_markdown_document


def _strip_frontmatter(content: str) -> str:
    match = re.match(r"^---\r?\n(.*?)\r?\n---\r?\n?", content, re.DOTALL)
    return content[match.end():] if match else content


def convert_file(input_file: str, output_file: str | None = None, theme_name: str = DEFAULT_THEME) -> str:
    path = Path(input_file).expanduser().resolve()
    content = _strip_frontmatter(path.read_text(encoding="utf-8"))
    html = render_markdown_document(content, theme_name=theme_name)

    if output_file:
        target = Path(output_file).expanduser().resolve()
        target.write_text(html, encoding="utf-8")
        print(f"✅ 已保存到: {target}")
    else:
        print(html)
    return html


if __name__ == '__main__':
    if len(sys.argv) < 2:
        print('用法: python wechat_beautifier.py <输入.md> [输出.html] [主题]')
        print('可用主题: ' + ', '.join(list_themes()))
        sys.exit(1)

    input_file = sys.argv[1]
    output_file = sys.argv[2] if len(sys.argv) > 2 else None
    theme_name = sys.argv[3] if len(sys.argv) > 3 else DEFAULT_THEME
    convert_file(input_file, output_file, theme_name)
