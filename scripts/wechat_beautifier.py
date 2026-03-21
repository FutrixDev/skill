#!/usr/bin/env python3
"""
微信公众号HTML美化器
将Markdown转换为美观、符合微信规范的HTML
"""

import re
import sys
from pathlib import Path


# 配色方案
COLORS = {
    'primary': '#0f766e',
    'primary_light': '#134e4a',
    'bg_white': '#fefefe',
    'bg_dark': '#0f172a',
    'bg_gray': '#f3f4f6',
    'text_dark': '#1a1a1a',
    'text_normal': '#374151',
    'text_light': '#6b7280',
    'border_light': '#d1d5db',
}


def wrap_style(style_dict):
    """将样式字典转换为内联style字符串"""
    return ';'.join(f'{k}:{v}' for k, v in style_dict.items())


def make_p(text='', **kwargs):
    """创建段落"""
    styles = {
        'margin': '12px 0',
        'line-height': '1.8',
        'font-size': '16px',
        'color': COLORS['text_normal'],
    }
    styles.update(kwargs)
    return f'<p style="{wrap_style(styles)}">{text}</p>\n'


def make_h1(text):
    """创建一级标题"""
    styles = {
        'font-size': '24px',
        'line-height': '1.4',
        'font-weight': '700',
        'color': COLORS['text_dark'],
        'margin': '0 0 20px 0',
        'padding-bottom': '12px',
        'border-bottom': '2px solid ' + COLORS['primary'],
    }
    return f'<h1 style="{wrap_style(styles)}">{text}</h1>\n'


def make_h2(text):
    """创建二级标题"""
    styles = {
        'font-size': '20px',
        'line-height': '1.5',
        'font-weight': '700',
        'color': '#0f172a',
        'margin': '28px 0 14px 0',
        'padding-left': '12px',
        'border-left': '4px solid ' + COLORS['primary'],
    }
    return f'<h2 style="{wrap_style(styles)}">{text}</h2>\n'


def make_h3(text):
    """创建三级标题"""
    styles = {
        'font-size': '17px',
        'line-height': '1.55',
        'font-weight': '700',
        'color': COLORS['primary_light'],
        'margin': '20px 0 10px 0',
    }
    return f'<h3 style="{wrap_style(styles)}">{text}</h3>\n'


def make_code_block(code):
    """创建代码块"""
    styles = {
        'margin': '16px 0',
        'padding': '16px',
        'background': COLORS['bg_dark'],
        'color': '#e2e8f0',
        'border-radius': '8px',
        'overflow-x': 'auto',
        'line-height': '1.7',
        'font-size': '14px',
    }
    return f'<pre style="{wrap_style(styles)}"><code>{code}</code></pre>\n'


def make_blockquote(text):
    """创建引用块"""
    styles = {
        'margin': '16px 0',
        'padding': '14px 18px',
        'background': COLORS['bg_gray'],
        'border-left': '4px solid ' + COLORS['primary'],
        'font-style': 'italic',
    }
    return f'<blockquote style="{wrap_style(styles)}">{text}</blockquote>\n'


def make_hr():
    """创建分隔线"""
    border = COLORS['border_light']
    return f'<hr style="border:none;border-top:1px solid {border};margin:24px 0;"/>\n'


def make_image(url, alt=''):
    """创建图片"""
    styles = {
        'width': '100%',
        'margin': '16px 0',
        'border-radius': '4px',
    }
    return f'<img src="{url}" alt="{alt}" style="{wrap_style(styles)}" />\n'


def make_card(title, content, emoji='💡'):
    """创建卡片框"""
    title_styles = {
        'margin': '0',
        'font-weight': '600',
        'color': '#0f172a',
    }
    content_styles = {
        'margin': '8px 0 0 0',
        'color': COLORS['text_normal'],
    }
    box_styles = {
        'margin': '20px 0',
        'padding': '20px',
        'background': COLORS['bg_gray'],
        'border-radius': '8px',
        'border': '1px solid #e5e7eb',
    }
    return f'''<section style="{wrap_style(box_styles)}">
    <p style="{wrap_style(title_styles)}">{emoji} {title}</p>
    <p style="{wrap_style(content_styles)}">{content}</p>
</section>\n'''


def flatten_list(items, ordered=False):
    """将列表展平为段落格式"""
    result = ''
    for i, item in enumerate(items, 1):
        prefix = f'<strong>{i}.</strong>' if ordered else '•'
        result += make_p(f'{prefix} {item}')
    return result


def convert_inline(text):
    """转换行内格式（加粗、斜体、链接）"""
    # 加粗 **text**
    text = re.sub(r'\*\*(.+?)\*\*', r'<strong>\1</strong>', text)
    # 斜体 *text*
    text = re.sub(r'\*(.+?)\*', r'<em>\1</em>', text)
    # 链接 [text](url)
    text = re.sub(r'\[([^\]]+)\]\(([^)]+)\)', r'<a href="\2" style="color:#0f766e;text-decoration:underline;">\1</a>', text)
    return text


def markdown_to_wechat_html(markdown_text):
    """将Markdown转换为微信美化HTML"""
    lines = markdown_text.strip().split('\n')
    result = []
    in_code_block = False
    code_content = []
    in_list = False
    list_items = []

    for line in lines:
        line = line.strip()

        # 跳过frontmatter
        if line.startswith('---'):
            continue

        # 代码块
        if line.startswith('```'):
            if not in_code_block:
                in_code_block = True
                code_content = []
            else:
                in_code_block = False
                result.append(make_code_block(''.join(code_content)))
            continue

        if in_code_block:
            code_content.append(line)
            continue

        # 标题
        if line.startswith('# '):
            result.append(make_h1(line[2:].strip()))
        elif line.startswith('## '):
            result.append(make_h2(line[3:].strip()))
        elif line.startswith('### '):
            result.append(make_h3(line[4:].strip()))
        # 分隔线
        elif line == '---':
            result.append(make_hr())
        # 图片
        elif line.startswith('!['):
            match = re.search(r'!\[([^\]]*)\]\(([^)]+)\)', line)
            if match:
                result.append(make_image(match.group(2), match.group(1)))
        # 无序列表
        elif line.startswith('- ') or line.startswith('* '):
            list_items.append(line[2:].strip())
            in_list = True
        # 有序列表
        elif re.match(r'^\d+\.\s', line):
            list_items.append(re.sub(r'^\d+\.\s', '', line))
            in_list = True
        else:
            # 输出列表
            if in_list and list_items:
                result.append(flatten_list(list_items))
                list_items = []
                in_list = False
            if line:
                result.append(make_p(convert_inline(line)))
            else:
                result.append(make_p())

    return ''.join(result)


def add_header(title, author='Dylan'):
    """添加文章头部"""
    header = '''
<section style="text-align:center;padding:20px 0;margin-bottom:24px;">
    <h1 style="font-size:24px;line-height:1.4;font-weight:700;color:#1a1a1a;margin:0 0 16px 0;">{title}</h1>
    <p style="color:#999;font-size:13px;margin:0;">作者：{author}</p>
</section>
'''.format(title=title, author=author)
    return header


def add_footer():
    """添加文章底部"""
    border = COLORS['border_light']
    footer = f'''
<section style="text-align:center;padding:24px 0;margin-top:32px;border-top:1px solid {border};">
    <p style="color:#666;font-size:14px;margin:0 0 8px 0;">如果文章有帮助，欢迎转发在看</p>
    <p style="color:#999;font-size:12px;margin:0;">@Dylan</p>
</section>
'''
    return footer


def convert_file(input_file, output_file=None):
    """转换文件"""
    with open(input_file, 'r', encoding='utf-8') as f:
        content = f.read()

    # 提取标题
    title = '公众号文章'
    for line in content.split('\n'):
        if line.startswith('# '):
            title = line[2:].strip()
            break

    # 转换内容
    html_body = markdown_to_wechat_html(content)

    # 组装完整HTML
    full_html = add_header(title) + html_body + add_footer()

    if output_file:
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write(full_html)
        print(f'✅ 已保存到: {output_file}')
    else:
        print(full_html)


if __name__ == '__main__':
    if len(sys.argv) < 2:
        print('用法: python wechat_beautifier.py <输入.md> [输出.html]')
        sys.exit(1)

    input_file = sys.argv[1]
    output_file = sys.argv[2] if len(sys.argv) > 2 else None
    convert_file(input_file, output_file)
