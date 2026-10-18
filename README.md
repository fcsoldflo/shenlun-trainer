# 申论全书 · 训练器

一套基于个人申论讲义笔记整理的**离线背诵 / 刷题工具**。纯静态网页，无后端，学习进度保存在浏览器 `localStorage`。

## 在线使用

https://fcsoldflo.github.io/shenlun-trainer/

## 内容

- **7 个板块**：概括归纳、对策启示、综合分析、公文写作、作文、补充题型、材料阅读
- **177 张速记卡、64 句填空、78 道测验**
- 卡片支持「上一题 / 下一题」，可回看、改评，不重复计数
- 错题本、学习记录导出 / 导入
- 配套《申论全书 · 速记手册》PDF（13 页，可打印）

## 本地使用

**方式一：多文件版（推荐开发/更新用）**

双击 `index.html`。需要保留 `assets/`、`data/` 两个目录，不能只拷 `index.html`。

**方式二：单文件版（推荐发给朋友）**

双击 `申论全书_训练器_单文件版.html`，全部 CSS/JS/数据已内嵌，单文件即可运行。

## 目录

```
index.html                     入口
assets/style.css               样式
assets/app.js                  交互逻辑
data/ch01.js ... ch07.js       七章内容数据
tools/export_book.js           导出 book.json
tools/build_handbook.py        生成速记手册 DOCX
tools/build_singlefile.py      生成单文件版
申论全书_速记手册.pdf / .docx   打印版
申论全书_训练器_单文件版.html    分享版
docs/知识点清单.md              逐页读图整理的知识点清单
```

## 更新内容

1. 修改 `data/chNN.js`
2. 重新生成单文件版：
   ```bash
   python tools/build_singlefile.py
   ```
3. 重新生成手册：
   ```bash
   node tools/export_book.js
   python tools/build_handbook.py
   ```
   再用 LibreOffice 将 DOCX 导出为 PDF。

## 在线使用

https://fcsoldflo.github.io/shenlun-trainer/

## 内容与免责声明

- 内容依据个人学习笔记整理，**仅供个人学习交流**，不构成官方教材或考试答案。
- 仓库不包含原始扫描页；口诀、测验解析、界面文案为自编助记。
- 若内容涉及版权问题，请联系删除。

