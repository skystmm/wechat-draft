---
name: wechat-draft
description: 将 Markdown 转换为微信公众号格式并提交到草稿箱。支持自动生成封面图（多种模型可选）、图片上传、样式转换。触发词：微信草稿、公众号文章、markdown转微信、wechat draft、公众号封面图。
---

# 微信公众号草稿 Skill

将 Markdown 文章转换为微信公众号格式，支持自动生成封面图并提交到公众号草稿箱。

## 功能

- **自动生成封面图**：支持多种图像生成模型
- **多模型支持**：Gemini、OpenAI DALL-E、百炼、SiliconFlow
- **可配置**：自由选择模型、API 端点
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
| `--cover-style` | 图片风格 |
| `--cover-output` | 封面图输出路径（默认 cover.png） |

## 配置

### 公众号 API 配置（必填）

```bash
wechat-draft config --appid YOUR_APPID --secret YOUR_SECRET
```

### 图像生成配置（可选）

在 `~/.wechat-draft.json` 中添加：

```json
{
  "appid": "wx...",
  "secret": "...",
  "imageGeneration": {
    "provider": "gemini",
    "apiKey": "YOUR_API_KEY",
    "model": "可选",
    "endpoint": "可选"
  }
}
```

**支持的提供者：**

| 提供者 | 说明 | 默认模型 |
|--------|------|----------|
| `gemini` | Google Gemini | gemini-2.0-flash-exp-image-generation |
| `openai` | OpenAI DALL-E | dall-e-3 |
| `bailian` | 百炼（阿里云） | wanx-v1 |
| `siliconflow` | SiliconFlow | FLUX.1-schnell |

**配置示例：**

```json
// Gemini
{
  "imageGeneration": {
    "provider": "gemini",
    "apiKey": "AIza..."
  }
}

// OpenAI
{
  "imageGeneration": {
    "provider": "openai",
    "apiKey": "sk-..."
  }
}

// 百炼
{
  "imageGeneration": {
    "provider": "bailian",
    "apiKey": "sk-..."
  }
}

// 自定义端点
{
  "imageGeneration": {
    "provider": "gemini",
    "apiKey": "...",
    "endpoint": "https://your-proxy.com/v1beta"
  }
}
```

## 图片风格

| 风格 | 说明 |
|------|------|
| `minimalist` | 极简扁平风格（默认） |
| `threeD` | 3D 等距渲染 |
| `vector` | 现代矢量艺术 |
| `cyberpunk` | 赛博朋克风格 |
| `ink` | 中国水墨画风格 |

## 注意事项

1. **公众号类型**：需要已认证的服务号或订阅号
2. **IP 白名单**：需将服务器 IP 添加到公众号后台
3. **图像生成**：未配置时跳过，不影响草稿创建
4. **图片大小**：不超过 2MB

## 脚本位置

- 主脚本：`scripts/wechat-draft.js`
- 图像生成：`scripts/mcp-client.js`