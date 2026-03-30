#!/usr/bin/env node

/**
 * MCP Client - 调用 Gemini API 实现内容润色
 * 模拟 wechat_editor MCP 服务器的功能
 */

const https = require('https');

// Gemini API 配置
const GEMINI_MODEL = 'gemini-2.0-flash';

/**
 * 调用 Gemini API
 */
async function callGemini(apiKey, prompt) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;
  
  const body = JSON.stringify({
    contents: [{
      parts: [{ text: prompt }]
    }]
  });

  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    
    const reqOptions = {
      hostname: urlObj.hostname,
      port: 443,
      path: urlObj.pathname + urlObj.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
      }
    };

    const req = https.request(reqOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.error) {
            reject(new Error(json.error.message));
          } else {
            const text = json.candidates?.[0]?.content?.parts?.[0]?.text || '';
            resolve(text);
          }
        } catch (err) {
          reject(err);
        }
      });
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

/**
 * 润色内容 - 适合公众号风格
 */
async function polishContent(content, apiKey, personalPrompt = null) {
  const personalHabit = personalPrompt 
    ? `\n\n用户的写作习惯/要求:\n${personalPrompt}` 
    : '';

  const prompt = `你是一位专业的微信公众号编辑。请润色以下 Markdown 内容，使其更具吸引力、流畅和专业。

关键要求（减少"AI 感"）：
1. 使用自然、人性化的表达。避免 AI 输出常见的过于结构化或重复的句式（如"总之"、"此外"、"值得注意的是"）。
2. 使用对话式但专业的语气。想象你是资深作家在与朋友或忠实读者交流。
3. 句子长度和结构要多样化，创造更好的节奏感。
4. 使用生动、具体的词汇，而非通用形容词。
5. 如果原文有特定个性，保留并强化它，而不是抹平成通用风格。
6. 避免过度使用列表，除非确实必要。
${personalHabit}

保持 Markdown 格式。不要用 markdown 代码块包裹输出（如 \`\`\`markdown），直接返回原始 markdown 内容。

内容：
${content}`;

  return await callGemini(apiKey, prompt);
}

/**
 * 总结内容 - 生成摘要（≤50字）
 */
async function summarizeContent(content, apiKey) {
  const prompt = `将以下内容总结为简短的摘要。
严格要求：摘要不得超过 50 字。
此摘要将用于微信公众号的"摘要"字段，应具有吸引力和专业性。
仅返回文本，不要 markdown 格式。

内容：
${content}`;

  return await callGemini(apiKey, prompt);
}

/**
 * 扩展内容
 */
async function expandContent(content, apiKey) {
  const prompt = `以下是一个草稿。请扩展关键点，添加更多相关细节、示例或表情符号，使其成为完整的微信公众号文章段落。保持 Markdown 格式。

内容：
${content}`;

  return await callGemini(apiKey, prompt);
}

module.exports = {
  polishContent,
  summarizeContent,
  expandContent,
  callGemini
};