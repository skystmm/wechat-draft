#!/usr/bin/env node

/**
 * 微信公众号草稿工具
 * 将 Markdown 转换为微信公众号格式并提交到草稿箱
 * 支持根据文章内容自动生成封面图
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const crypto = require('crypto');

// 引入 MCP 客户端
const mcpClient = require('./mcp-client.js');

// 配置
const CONFIG_PATH = path.join(process.env.HOME || '', '.wechat-draft.json');
const TOKEN_CACHE_PATH = path.join(process.env.HOME || '', '.wechat-token.json');

// 解析命令行参数
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    file: null,
    title: null,
    author: null,
    digest: null,
    thumb: null,
    content: null,
    command: null,
    generateCover: false,
    coverStyle: 'minimalist',
    coverOutput: null
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--file':
      case '-f':
        options.file = args[++i];
        break;
      case '--title':
      case '-t':
        options.title = args[++i];
        break;
      case '--author':
      case '-a':
        options.author = args[++i];
        break;
      case '--digest':
      case '-d':
        options.digest = args[++i];
        break;
      case '--thumb':
        options.thumb = args[++i];
        break;
      case '--generate-cover':
        options.generateCover = true;
        break;
      case '--cover-style':
        options.coverStyle = args[++i];
        break;
      case '--cover-output':
        options.coverOutput = args[++i];
        break;
      case 'config':
        options.command = 'config';
        break;
      case '--appid':
        options.appid = args[++i];
        break;
      case '--secret':
        options.secret = args[++i];
        break;
      case '--gemini-key':
        options.geminiKey = args[++i];
        break;
      case '--help':
      case '-h':
        printHelp();
        process.exit(0);
      default:
        if (!args[i].startsWith('-')) {
          options.content = args[i];
        }
    }
  }

  return options;
}

function printHelp() {
  console.log(`
微信公众号草稿工具

用法:
  wechat-draft --file article.md --title "标题"
  wechat-draft --file article.md --title "标题" --generate-cover

选项:
  --file, -f     Markdown 文件路径
  --title, -t    文章标题（必填）
  --author, -a   作者名
  --digest, -d   摘要
  --thumb        封面图路径（手动指定）

封面图生成:
  --generate-cover    根据文章内容自动生成封面图
  --cover-style       图片风格（minimalist/threeD/vector/cyberpunk/ink）
  --cover-output      封面图输出路径（默认 cover.png）

配置:
  wechat-draft config --appid YOUR_ID --secret YOUR_SECRET --gemini-key YOUR_KEY

环境变量:
  WECHAT_APPID    公众号 AppID
  WECHAT_SECRET   公众号 AppSecret
  GEMINI_API_KEY  Gemini API Key（用于生成封面图）

图片风格说明:
  minimalist  - 极简扁平风格（默认）
  threeD      - 3D 等距渲染
  vector      - 现代矢量艺术
  cyberpunk   - 赛博朋克风格
  ink         - 中国水墨画风格
`);
}

// 读取配置
function loadConfig() {
  const config = {
    appid: process.env.WECHAT_APPID,
    secret: process.env.WECHAT_SECRET,
    geminiKey: process.env.GEMINI_API_KEY,
    defaultAuthor: null,
    defaultThumb: null
  };

  if (fs.existsSync(CONFIG_PATH)) {
    const fileConfig = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
    Object.assign(config, fileConfig);
  }

  if (!config.appid || !config.secret) {
    console.error('错误: 未配置 AppID 或 Secret');
    console.error('请运行: wechat-draft config --appid YOUR_ID --secret YOUR_SECRET');
    console.error('或设置环境变量: WECHAT_APPID, WECHAT_SECRET');
    process.exit(1);
  }

  return config;
}

// 保存配置
function saveConfig(options) {
  const config = {};
  if (fs.existsSync(CONFIG_PATH)) {
    Object.assign(config, JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8')));
  }
  
  if (options.appid) config.appid = options.appid;
  if (options.secret) config.secret = options.secret;
  if (options.geminiKey) config.geminiKey = options.geminiKey;
  
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
  console.log('配置已保存到:', CONFIG_PATH);
}

// HTTP 请求封装
function request(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const transport = urlObj.protocol === 'https:' ? https : http;
    
    const reqOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: options.headers || {}
    };

    const req = transport.request(reqOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve(json);
        } catch {
          resolve(data);
        }
      });
    });

    req.on('error', reject);
    
    if (options.body) {
      req.write(options.body);
    }
    req.end();
  });
}

// 获取 access_token
async function getAccessToken(config) {
  // 检查缓存
  if (fs.existsSync(TOKEN_CACHE_PATH)) {
    const cache = JSON.parse(fs.readFileSync(TOKEN_CACHE_PATH, 'utf8'));
    if (cache.expires > Date.now()) {
      return cache.token;
    }
  }

  // 请求新 token
  const url = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${config.appid}&secret=${config.secret}`;
  const result = await request(url);
  
  if (result.errcode) {
    throw new Error(`获取 access_token 失败: ${result.errmsg}`);
  }

  // 缓存 token（提前5分钟过期）
  const cache = {
    token: result.access_token,
    expires: Date.now() + (result.expires_in - 300) * 1000
  };
  fs.writeFileSync(TOKEN_CACHE_PATH, JSON.stringify(cache));

  return result.access_token;
}

// 上传图片获取 media_id
async function uploadImage(accessToken, imagePath) {
  const boundary = '----WebKitFormBoundary' + crypto.randomBytes(16).toString('hex');
  const imageData = fs.readFileSync(imagePath);
  const filename = path.basename(imagePath);
  
  const body = [
    `--${boundary}`,
    `Content-Disposition: form-data; name="media"; filename="${filename}"`,
    'Content-Type: image/png',
    '',
    imageData.toString('binary'),
    `--${boundary}--`
  ].join('\r\n');

  const url = `https://api.weixin.qq.com/cgi-bin/material/add_material?access_token=${accessToken}&type=image`;
  
  const result = await request(url, {
    method: 'POST',
    headers: {
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
      'Content-Length': Buffer.byteLength(body, 'binary')
    },
    body: body
  });

  if (result.errcode) {
    throw new Error(`上传图片失败: ${result.errmsg}`);
  }

  return result.media_id;
}

// Markdown 转微信 HTML
function markdownToWechatHtml(markdown) {
  let html = markdown;

  // 标题
  html = html.replace(/^### (.*$)/gm, '<h3 style="font-size: 18px; font-weight: bold; margin: 20px 0 10px; color: #333;">$1</h3>');
  html = html.replace(/^## (.*$)/gm, '<h2 style="font-size: 20px; font-weight: bold; margin: 25px 0 12px; color: #333;">$1</h2>');
  html = html.replace(/^# (.*$)/gm, '<h1 style="font-size: 24px; font-weight: bold; margin: 30px 0 15px; color: #333;">$1</h1>');

  // 粗体
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  
  // 斜体
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');

  // 代码块
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (match, lang, code) => {
    return `<pre style="background: #f6f6f6; padding: 15px; border-radius: 5px; overflow-x: auto; margin: 15px 0;"><code style="font-family: Consolas, Monaco, monospace; font-size: 14px; color: #333;">${escapeHtml(code.trim())}</code></pre>`;
  });

  // 行内代码
  html = html.replace(/`([^`]+)`/g, '<code style="background: #f6f6f6; padding: 2px 6px; border-radius: 3px; font-family: Consolas, Monaco, monospace; font-size: 14px;">$1</code>');

  // 引用
  html = html.replace(/^> (.*$)/gm, '<blockquote style="border-left: 4px solid #42b983; padding-left: 15px; margin: 15px 0; color: #666; font-style: italic;">$1</blockquote>');

  // 无序列表
  html = html.replace(/^- (.*$)/gm, '<li style="margin: 8px 0;">$1</li>');
  html = html.replace(/(<li.*<\/li>\n?)+/g, '<ul style="padding-left: 20px; margin: 15px 0;">$&</ul>');

  // 有序列表
  html = html.replace(/^\d+\. (.*$)/gm, '<li style="margin: 8px 0;">$1</li>');

  // 链接
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" style="color: #42b983; text-decoration: none;">$1</a>');

  // 图片
  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (match, alt, src) => {
    if (src.startsWith('http')) {
      return `<img src="${src}" alt="${alt}" style="max-width: 100%; height: auto; margin: 15px 0;" />`;
    }
    return `<img-upload-placeholder src="${src}" alt="${alt}" />`;
  });

  // 段落
  html = html.replace(/^(?!<[a-z]|$)(.*$)/gm, '<p style="margin: 15px 0; line-height: 1.8; color: #333;">$1</p>');

  // 清理空段落
  html = html.replace(/<p[^>]*>\s*<\/p>/g, '');

  return `<section style="font-size: 16px; line-height: 1.8; color: #333; max-width: 100%; word-wrap: break-word;">${html}</section>`;
}

function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// 创建草稿
async function createDraft(accessToken, article) {
  const url = `https://api.weixin.qq.com/cgi-bin/draft/add?access_token=${accessToken}`;
  
  const body = {
    articles: [{
      title: article.title,
      author: article.author || '',
      digest: article.digest || '',
      content: article.content,
      thumb_media_id: article.thumb_media_id || '',
      need_open_comment: 0,
      only_fans_can_comment: 0
    }]
  };

  const result = await request(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  if (result.errcode) {
    throw new Error(`创建草稿失败: ${result.errmsg}`);
  }

  return result.media_id;
}

// 主函数
async function main() {
  const options = parseArgs();

  // 配置命令
  if (options.command === 'config') {
    saveConfig(options);
    return;
  }

  // 检查必要参数
  if (!options.title) {
    console.error('错误: 缺少文章标题');
    console.error('请使用 --title 参数指定标题');
    process.exit(1);
  }

  // 读取 Markdown 内容
  let markdown;
  if (options.file) {
    if (!fs.existsSync(options.file)) {
      console.error('错误: 文件不存在:', options.file);
      process.exit(1);
    }
    markdown = fs.readFileSync(options.file, 'utf8');
  } else if (options.content) {
    markdown = options.content;
  } else {
    markdown = await new Promise((resolve) => {
      let data = '';
      process.stdin.setEncoding('utf8');
      process.stdin.on('data', chunk => data += chunk);
      process.stdin.on('end', () => resolve(data));
    });
  }

  if (!markdown.trim()) {
    console.error('错误: Markdown 内容为空');
    process.exit(1);
  }

  try {
    const config = loadConfig();

    console.log('正在处理...');
    console.log('标题:', options.title);

    // 转换 Markdown
    const html = markdownToWechatHtml(markdown);
    console.log('✓ Markdown 转换完成');

    // 获取 access_token
    const accessToken = await getAccessToken(config);
    console.log('✓ 已获取 access_token');

    // 处理封面图
    let thumbMediaId = null;
    let thumbPath = options.thumb || config.defaultThumb;

    // 自动生成封面图
    if (options.generateCover && config.geminiKey) {
      const outputPath = options.coverOutput || 'cover.png';
      console.log('✓ 正在生成封面图...');
      
      thumbPath = await mcpClient.generateCoverFromContent(
        markdown, 
        config.geminiKey, 
        outputPath,
        options.coverStyle
      );
      console.log('✓ 封面图生成完成:', thumbPath);
    }

    // 上传封面图
    if (thumbPath && fs.existsSync(thumbPath)) {
      thumbMediaId = await uploadImage(accessToken, thumbPath);
      console.log('✓ 封面图已上传:', thumbMediaId);
    }

    // 创建草稿
    const mediaId = await createDraft(accessToken, {
      title: options.title,
      author: options.author || config.defaultAuthor || '',
      digest: options.digest || '',
      content: html,
      thumb_media_id: thumbMediaId
    });

    console.log('\n✅ 草稿创建成功!');
    console.log('Media ID:', mediaId);
    console.log('\n请在微信公众平台编辑和发布草稿。');

  } catch (error) {
    console.error('\n❌ 错误:', error.message);
    process.exit(1);
  }
}

main();