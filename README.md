# 微信公众号草稿 Skill - 支持矩阵号

将 Markdown 文章一键转换为微信公众号格式，支持多账号（矩阵号）、自动生成封面图并提交到公众号草稿箱。

## 功能特性

- **矩阵号支持**：多账号配置，轻松管理多个公众号
- **Markdown → 微信公众号格式**：自动转换样式，生成内联 HTML
- **自动生成封面图**：根据文章标题和内容智能生成封面
- **多图像模型支持**：Gemini、OpenAI DALL-E、百炼、SiliconFlow
- **图片自动上传**：上传到微信并获取 media_id
- **一键提交草稿箱**：直接添加到公众号后台草稿箱

## 安装

### 1. 克隆到 OpenClaw skills 目录

```bash
cd ~/.openclaw/skills
git clone https://github.com/skystmm/wechat-draft.git
```

### 2. 安装依赖

```bash
cd wechat-draft
npm install
```

### 3. 配置微信公众号 API

**单账号模式：**

```bash
node scripts/wechat-draft.js config --appid YOUR_APPID --secret YOUR_SECRET
```

**矩阵号模式（多账号）：**

```bash
# 配置主账号
node scripts/wechat-draft.js config --account main --appid wx主号ID --secret 主号Secret --account-name "主账号"

# 配置技术号
node scripts/wechat-draft.js config --account tech --appid wx技术号ID --secret 技术号Secret --account-name "技术团队号"

# 配置新闻号
node scripts/wechat-draft.js config --account news --appid wx新闻号ID --secret 新闻号Secret --account-name "新闻资讯号"
```

### 4. 配置图像生成（可选）

在 `~/.wechat-draft.json` 中添加：

```json
{
  "imageGeneration": {
    "provider": "gemini",
    "apiKey": "YOUR_API_KEY"
  }
}
```

## 使用方法

### 基础用法

```bash
# 使用默认账号
node scripts/wechat-draft.js --file article.md --title "文章标题" --thumb cover.png

# 使用指定账号（矩阵号）
node scripts/wechat-draft.js --file article.md --title "文章标题" --account tech

# 自动生成封面图
node scripts/wechat-draft.js --file article.md --title "文章标题" --generate-cover

# 查看已配置账号
node scripts/wechat-draft.js list
```

### 完整参数

| 参数 | 简写 | 说明 |
|------|------|------|
| `--file` | `-f` | Markdown 文件路径（必填） |
| `--title` | `-t` | 文章标题（必填） |
| `--author` | `-a` | 作者名 |
| `--digest` | `-d` | 文章摘要 |
| `--thumb` | | 封面图路径（手动指定） |
| `--account` | | 矩阵号账号名称（选择账号） |
| `--generate-cover` | | 自动生成封面图 |
| `--cover-style` | | 封面图风格 |
| `--cover-output` | | 封面图输出路径（默认 cover.png） |

### 矩阵号配置示例

在 `~/.wechat-draft.json` 中：

```json
{
  "accounts": {
    "main": {
      "appid": "wxabc123...",
      "secret": "主号Secret",
      "name": "主账号",
      "defaultAuthor": "编辑部"
    },
    "tech": {
      "appid": "wxdef456...",
      "secret": "技术号Secret",
      "name": "技术团队",
      "defaultAuthor": "技术团队"
    },
    "news": {
      "appid": "wxghi789...",
      "secret": "新闻号Secret",
      "name": "新闻资讯"
    }
  },
  "defaultAccount": "main",
  "imageGeneration": {
    "provider": "gemini",
    "apiKey": "AIza..."
  }
}
```

### 支持的封面图风格

| 风格 | 说明 |
|------|------|
| `minimalist` | 极简扁平风格（默认） |
| `threeD` | 3D 等距渲染 |
| `vector` | 现代矢量艺术 |
| `cyberpunk` | 赛博朋克风格 |
| `ink` | 中国水墨画风格 |

## 图像生成配置

### 支持的提供者

| 提供者 | provider 值 | 默认模型 |
|--------|-------------|----------|
| Google Gemini | `gemini` | gemini-2.0-flash-exp-image-generation |
| OpenAI DALL-E | `openai` | dall-e-3 |
| 百炼（阿里云） | `bailian` | wanx-v1 |
| SiliconFlow | `siliconflow` | FLUX.1-schnell |

### 配置示例

```json
{
  "imageGeneration": {
    "provider": "gemini",
    "apiKey": "AIza..."
  }
}
```

自定义端点（用于代理或私有部署）：

```json
{
  "imageGeneration": {
    "provider": "gemini",
    "apiKey": "...",
    "endpoint": "https://your-proxy.com/v1beta"
  }
}
```

## 注意事项

1. **公众号类型**：需要已认证的服务号或订阅号才能使用草稿 API
2. **IP 白名单**：需将服务器 IP 添加到公众号后台
3. **封面图要求**：建议尺寸 900×383，不超过 2MB
4. **图像生成**：未配置时跳过，不影响草稿创建
5. **矩阵号 Token 缓存**：每个账号的 access_token 独立缓存，避免冲突

## 项目结构

```
wechat-draft/
├── SKILL.md           # Agent skill 定义
├── README.md          # 本文档
├── scripts/
│   ├── wechat-draft.js   # 主脚本
│   └── mcp-client.js     # 图像生成客户端
├── references/        # 参考资料
└── assets/            # 资源文件
```

## License

MIT