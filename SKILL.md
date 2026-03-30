---
name: wechat-draft
description: 将 Markdown 转换为微信公众号格式并提交到草稿箱。支持图片上传、样式转换、草稿管理。触发词：微信草稿、公众号文章、markdown转微信、wechat draft。
---

# 微信公众号草稿 Skill

将 Markdown 文章转换为微信公众号格式，并提交到公众号草稿箱。

## 功能

- Markdown → 微信公众号 HTML（样式内联）
- 图片自动上传获取 media_id
- 支持封面图设置
- 调用微信草稿 API 提交

## 使用方式

```bash
# 基础用法
wechat-draft --file article.md --title "文章标题"

# 从标准输入
cat article.md | wechat-draft --title "文章标题"

# 指定封面图
wechat-draft --file article.md --title "标题" --thumb cover.jpg

# 设置作者
wechat-draft --file article.md --title "标题" --author "作者名"

# 指定摘要
wechat-draft --file article.md --title "标题" --digest "文章摘要"
```

## 配置

首次使用需要配置微信公众号 AppID 和 AppSecret：

```bash
# 设置配置文件路径（默认 ~/.wechat-draft.json）
wechat-draft config --appid YOUR_APPID --secret YOUR_SECRET

# 或使用环境变量
export WECHAT_APPID="your_appid"
export WECHAT_SECRET="your_secret"
```

配置文件格式（`~/.wechat-draft.json`）：

```json
{
  "appid": "wx1234567890",
  "secret": "your_app_secret",
  "defaultAuthor": "作者名",
  "defaultThumb": "path/to/default/cover.jpg"
}
```

## API 参考

详细 API 文档见 [references/wechat-api.md](references/wechat-api.md)。

## 样式说明

微信公众号要求样式内联，本 Skill 内置了常用样式转换：

- 标题（h1-h6）→ 微信标题样式
- 代码块 → 微信代码块样式（支持语法高亮）
- 引用 → 微信引用样式
- 列表 → 微信列表样式
- 图片 → 自动上传并替换

## 注意事项

1. **公众号类型**：需要已认证的服务号或订阅号
2. **IP 白名单**：需将服务器 IP 添加到公众号后台
3. **图片格式**：支持 jpg、png、gif，大小不超过 2MB
4. **access_token**：自动缓存，2小时有效期

## 脚本位置

核心脚本：`scripts/wechat-draft.js`