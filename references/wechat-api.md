# 微信公众号草稿 API 参考

## 前置条件

1. **公众号类型**：已认证的服务号或订阅号
2. **获取凭证**：AppID 和 AppSecret（公众号后台 → 开发 → 基本配置）
3. **IP 白名单**：将服务器 IP 添加到白名单

## API 端点

### 1. 获取 access_token

```
GET https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=APPID&secret=APPSECRET
```

**响应：**
```json
{
  "access_token": "ACCESS_TOKEN",
  "expires_in": 7200
}
```

**注意：**
- 有效期 2 小时
- 建议缓存并提前 5 分钟刷新
- 每日调用次数有限制

### 2. 新增草稿

```
POST https://api.weixin.qq.com/cgi-bin/draft/add?access_token=ACCESS_TOKEN
```

**请求体：**
```json
{
  "articles": [
    {
      "title": "标题",
      "author": "作者",
      "digest": "摘要",
      "content": "正文HTML",
      "thumb_media_id": "封面图素材ID",
      "need_open_comment": 0,
      "only_fans_can_comment": 0
    }
  ]
}
```

**响应：**
```json
{
  "media_id": "MEDIA_ID"
}
```

### 3. 上传图文消息内的图片

```
POST https://api.weixin.qq.com/cgi-bin/media/uploadimg?access_token=ACCESS_TOKEN
```

**请求：** multipart/form-data
- `media`: 图片文件

**响应：**
```json
{
  "url": "http://mmbiz.qpic.cn/..."
}
```

### 4. 新增永久素材（封面图）

```
POST https://api.weixin.qq.com/cgi-bin/material/add_material?access_token=ACCESS_TOKEN&type=image
```

**请求：** multipart/form-data
- `media`: 图片文件

**响应：**
```json
{
  "media_id": "MEDIA_ID",
  "url": "URL"
}
```

### 5. 获取草稿列表

```
POST https://api.weixin.qq.com/cgi-bin/draft/batchget?access_token=ACCESS_TOKEN
```

**请求体：**
```json
{
  "offset": 0,
  "count": 20,
  "no_content": 0
}
```

### 6. 修改草稿

```
POST https://api.weixin.qq.com/cgi-bin/draft/update?access_token=ACCESS_TOKEN
```

### 7. 删除草稿

```
POST https://api.weixin.qq.com/cgi-bin/draft/delete?access_token=ACCESS_TOKEN
```

**请求体：**
```json
{
  "media_id": "MEDIA_ID"
}
```

### 8. 发布草稿

```
POST https://api.weixin.qq.com/cgi-bin/freepublish/submit?access_token=ACCESS_TOKEN
```

**请求体：**
```json
{
  "media_id": "MEDIA_ID"
}
```

**响应：**
```json
{
  "publish_status": 0,
  "msg_data_id": "MSG_DATA_ID"
}
```

## 错误码

| 错误码 | 说明 |
|--------|------|
| 40001 | AppSecret 错误或不属于该公众号 |
| 40002 | 请确保 grant_type 字段值为 client_credential |
| 40003 | 不合法的 OpenID |
| 40004 | 不合法的媒体文件类型 |
| 40005 | 不合法的文件类型 |
| 40006 | 不合法的文件大小 |
| 40007 | 不合法的媒体文件 id |
| 40008 | 不合法的消息类型 |
| 40009 | 不合法的图片文件大小 |
| 40010 | 不合法的语音文件大小 |
| 40011 | 不合法的视频文件大小 |
| 40012 | 不合法的缩略图文件大小 |
| 45001 | 图片大小超限 |
| 45002 | 消息内容超限 |
| 45003 | 标题字段超限 |
| 45004 | 描述字段超限 |
| 45005 | 链接字段超限 |
| 45006 | 图片链接字段超限 |
| 45007 | 语音播放时间超限 |
| 45008 | 图文消息超过限制 |
| 45009 | 接口调用超过限制 |
| 46001 | 不存在媒体数据 |
| 46002 | 不存在的菜单版本 |
| 46003 | 不存在的菜单数据 |
| 46004 | 不存在的用户 |

## 图片要求

| 类型 | 格式 | 大小限制 |
|------|------|----------|
| 封面图 | jpg/png | 2MB |
| 内容图 | jpg/png/gif | 2MB |

## 微信公众号样式规范

微信公众号要求所有样式必须内联，不支持：
- 外部 CSS 文件
- `<style>` 标签
- `<script>` 标签
- 部分 HTML 标签（如 `<iframe>`）

推荐样式：
```html
<p style="margin: 15px 0; line-height: 1.8; color: #333;">正文</p>
<h1 style="font-size: 24px; font-weight: bold; margin: 30px 0 15px;">标题</h1>
<blockquote style="border-left: 4px solid #42b983; padding-left: 15px; margin: 15px 0;">引用</blockquote>
<pre style="background: #f6f6f6; padding: 15px; border-radius: 5px;"><code>代码</code></pre>
```