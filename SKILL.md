---
name: wechat-draft
description: 将 Markdown 转换为微信公众号格式并提交到草稿箱。支持 MCP 润色（调用 wechat_editor）、图片上传、样式转换、草稿管理。触发词：微信草稿、公众号文章、markdown转微信、wechat draft、公众号润色。
---

# 微信公众号草稿 Skill

将 Markdown 文章转换为微信公众号格式，支持 MCP 润色后提交到公众号草稿箱。

## 功能

- **MCP 润色**：调用 wechat_editor MCP 服务润色内容
- **自动摘要**：生成适合公众号的摘要
- Markdown → 微信公众号 HTML（样式内联）
- 图片自动上传获取 media_id
- 支持封面图设置
- 调用微信草稿 API 提交

## 使用方式

### 基础用法

```bash
# 直接转换（不润色）
wechat-draft --file article.md --title "文章标题"

# 使用 MCP 润色
wechat-draft --file article.md --title "标题" --polish

# 使用 MCP 润色 + 自定义提示词
wechat-draft --file article.md --title "标题" --polish --prompt "使用幽默风格"

# 自动生成摘要
wechat-draft --file article.md --title "标题" --polish --auto-summary

# 指定封面图
wechat-draft --file article.md --title "标题" --thumb cover.jpg
```

### 参数说明

| 参数 | 说明 |
|------|------|
| `--file, -f` | Markdown 文件路径 |
| `--title, -t` | 文章标题（必填） |
| `--author, -a` | 作者名 |
| `--digest, -d` | 摘要（手动指定） |
| `--thumb` | 封面图路径 |
| `--polish` | 使用 MCP 润色内容 |
| `--prompt` | 润色时的自定义提示词 |
| `--auto-summary` | 使用 MCP 自动生成摘要 |
| `--expand` | 使用 MCP 扩展内容 |

## MCP 配置

需要配置 `wechat_editor` MCP 服务器：

```json
{
  "mcpServers": {
    "wechat-editor": {
      "command": "npx",
      "args": ["tsx", "/path/to/wechat_editor/mcpServer.ts"],
      "env": {
        "API_KEY": "YOUR_GEMINI_API_KEY"
      }
    }
  }
}
```

或在 skill 中配置 Gemini API Key：

```bash
wechat-draft config --appid YOUR_APPID --secret YOUR_SECRET --gemini-key YOUR_GEMINI_KEY
```

## 流程说明

### 不使用 MCP（默认）

```
Markdown 文件
    ↓
Markdown → HTML 转换（样式内联）
    ↓
图片上传（如有）
    ↓
调用微信草稿 API
    ↓
草稿箱
```

### 使用 MCP 润色

```
Markdown 文件
    ↓
调用 MCP polish_content（Gemini 润色）
    ↓
润色后的 Markdown
    ↓
调用 MCP summarize_content（生成摘要）
    ↓
Markdown → HTML 转换
    ↓
调用微信草稿 API
    ↓
草稿箱
```

## MCP 工具说明

本 Skill 可调用以下 MCP 工具：

| 工具 | 功能 | 参数 |
|------|------|------|
| `polish_content` | 润色 Markdown 内容 | content, personalPrompt |
| `summarize_content` | 生成摘要（≤50字） | content |
| `expand_content` | 扩展内容 | content |

## 注意事项

1. **公众号类型**：需要已认证的服务号或订阅号
2. **IP 白名单**：需将服务器 IP 添加到公众号后台
3. **图片格式**：支持 jpg、png、gif，大小不超过 2MB
4. **MCP 依赖**：使用润色功能需要配置 wechat_editor MCP 或 Gemini API Key

## 脚本位置

- 主脚本：`scripts/wechat-draft.js`
- MCP 调用：`scripts/mcp-client.js`