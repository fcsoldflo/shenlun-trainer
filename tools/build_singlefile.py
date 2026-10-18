# -*- coding: utf-8 -*-
"""把多文件训练器打包成单文件 HTML，便于微信/QQ 直接发送。"""
import os
import re

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
src = os.path.join(BASE, "index.html")
with open(src, "r", encoding="utf-8") as f:
    html = f.read()

# 内联 CSS
css_path = os.path.join(BASE, "assets", "style.css")
with open(css_path, "r", encoding="utf-8") as f:
    css = f.read()
html = html.replace(
    '<link rel="stylesheet" href="assets/style.css">',
    "<style>\n" + css + "\n</style>"
)

# 内联所有 script（保持顺序）
def inline_script(m):
    path = m.group(1)
    full = os.path.join(BASE, path.replace("/", os.sep))
    with open(full, "r", encoding="utf-8") as f:
        code = f.read()
    return "<script>\n" + code + "\n</script>"

html = re.sub(r'<script src="([^"]+)"></script>', inline_script, html)

out = os.path.join(BASE, "申论全书_训练器_单文件版.html")
with open(out, "w", encoding="utf-8") as f:
    f.write(html)

print("saved:", out)
print("size KB:", round(os.path.getsize(out) / 1024, 1))
print("external refs left:", len(re.findall(r'(?:src|href)="(?!data:|#)[^"]+"', html)))
