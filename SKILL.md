---
name: wechat-draft
description: 将 Markdown 转换为微信公众号格式并提交到草稿箱。支持自动生成封面图（调用 Gemini API）、图片上传、样式转换。触发词：微信草稿、公众号文章、markdown转微信、wechat draft、公众号封面图。
---

# 微信公众号草稿 Skill

将 Markdown 文章转换为微信公众号格式，支持自动生成封面图并提交到公众号草稿箱。

## 功能

- **自动生成封面图**：根据文章内容调用 Gemini API 生成公众号头图
- **多种图片风格**：极简、3D、矢量、赛博朋克、水墨画
- Markdown → 微信公众号 HTML（样式内联）
- 图片自动上传获取 media_id
- 调用微信草稿 API 提交

## 使用方式

### 基础用法

```bash
# 基础转换（手动指定封面图）
wechat-draft --file article.md --title "文章标题" --thumb cover.png

# 自动生成封面图
wechat-draft --file article.md --title "标题" --generate-cover

# 指定封面图风格
wechat-draft --file article.md --title "标题" --generate-cover --cover-style cyberpunk

# 指定封面图输出路径
wechat-draft --file article.md --title "标题" --generate-cover --cover-output my-cover.png
```

### 参数说明

| 参数 | 说明 |
|------|------|
| `--file, -f` | Markdown 文件路径 |
| `--title, -t` | 文章标题（必填） |
| `--author, -a` | 作者名 |
| `--digest, -d` | 摘要 |
| `--thumb` | 封面图路径（手动指定） |

**封面图生成参数**

| 参数 | 说明 |
|------|------|
| `--generate-cover` | 根据文章内容自动生成封面图 |
| `--cover-style` | 图片风格（见下表） |
| `--cover-output` | 封面图输出路径（默认 cover.png） |

**图片风格**

| 风格 | 说明 |
|------|------|
| `minimalist` | 极简扁平风格（默认） |
| `threeD` | 3D 等距渲染 |
| `vector` | 现代矢量艺术 |
| `cyberpunk` | 赛博朋克风格 |
| `ink` | 中国水墨画风格 |

## 配置

需要配置微信公众号凭证和 Gemini API Key：

```bash
wechat-draft config --appid YOUR_APPID --secret YOUR_SECRET --gemini-key YOUR_GEMINI_KEY
```

或使用环境变量：

```bash
export WECHAT_APPID="your_appid"
export WECHAT_SECRET="your_secret"
export GEMINI_API_KEY="your_gemini_key"
```

## 流程说明

```
Markdown 文件
    ↓
1. 提取文章内容
    ↓
2. 调用 Gemini API 生成视觉提示词
    ↓
3. 调用 Gemini 图像生成 API
    ↓
4. 保存封面图（PNG）
    ↓
5. 上传封面图到微信素材库
    ↓
6. Markdown → HTML 转换
    ↓
7. 调用微信草稿 API
    ↓
草稿箱
```

## 封面图比例

封面图比例约为 **2.35:1**（宽幅电影海报风格），适合公众号文章头图。

由于 Gemini API 支持的比例限制，实际输出为 **16:9**，接近目标比例。

## 注意事项

1. **公众号类型**：需要已认证的服务号或订阅号
2. **IP 白名单**：需将服务器 IP 添加到公众号后台
3. **Gemini API**：生成封面图需要有效的 Gemini API Key
4. **图片大小**：不超过 2MB

## 脚本位置

- 主脚本：`scripts/wechat-draft.js`
- MCP 客户端：`scripts/mcp-client.js`