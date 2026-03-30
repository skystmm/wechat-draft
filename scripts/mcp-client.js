#!/usr/bin/env node

/**
 * MCP Client - 调用 Gemini API 实现封面图生成
 * 根据文章内容生成公众号头图
 */

const https = require('https');
const fs = require('fs');

// Gemini API 配置
const GEMINI_TEXT_MODEL = 'gemini-2.0-flash';
const GEMINI_IMAGE_MODEL = 'gemini-2.0-flash-exp-image-generation';

/**
 * 调用 Gemini API
 */
async function callGemini(apiKey, prompt, modelId = GEMINI_TEXT_MODEL) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${apiKey}`;
  
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
 * 调用 Gemini 图像生成 API
 */
async function callGeminiImage(apiKey, prompt) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_IMAGE_MODEL}:generateContent?key=${apiKey}`;
  
  // Gemini 支持的比例: "1:1", "3:4", "4:3", "9:16", "16:9"
  // 2.35:1 接近 21:9，但 Gemini 不支持，使用 16:9 作为近似
  const body = JSON.stringify({
    contents: [{
      parts: [{ text: prompt }]
    }],
    generationConfig: {
      responseModalities: ["IMAGE", "TEXT"],
      responseMimeType: "text/plain"
    }
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
            // 查找图片数据
            const parts = json.candidates?.[0]?.content?.parts || [];
            for (const part of parts) {
              if (part.inlineData) {
                return resolve({
                  mimeType: part.inlineData.mimeType,
                  base64: part.inlineData.data
                });
              }
            }
            // 如果没有图片，检查是否有文本拒绝
            const textPart = parts.find(p => p.text);
            if (textPart) {
              reject(new Error(`Gemini refused to generate image: ${textPart.text}`));
            } else {
              reject(new Error('No image data received from Gemini'));
            }
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
 * 根据文章内容生成视觉提示词
 * @param {string} content 文章内容
 * @param {string} apiKey Gemini API Key
 * @param {string} style 图片风格：minimalist | threeD | vector | cyberpunk | ink
 */
async function generateVisualPrompt(content, apiKey, style = 'minimalist') {
  const styleDescriptions = {
    minimalist: 'Minimalist, flat vector illustration, suitable for a professional tech blog header, vibrant colors, clean composition',
    threeD: 'Professional 3D isometric render, high detail, soft studio lighting, Octane render style, modern aesthetic',
    vector: 'Modern flat vector art, clean lines, bold geometric shapes, professional illustration',
    cyberpunk: 'Cyberpunk aesthetic, neon lighting, futuristic city vibes, high contrast, vibrant blue and pink tones',
    ink: 'Elegant Chinese ink wash painting style, traditional yet modern, minimalist brush strokes, artistic atmosphere'
  };

  const styleDesc = styleDescriptions[style] || styleDescriptions.minimalist;

  const prompt = `Based on the following article content, write a detailed visual description (prompt) for an AI image generator to create a cover image.
  
The image will be used as a WeChat Official Account (公众号) header image.
IMPORTANT requirements:
1. Aspect ratio should be approximately 2.35:1 (wide cinematic format, similar to movie posters)
2. The style MUST be: "${styleDesc}"
3. The image should NOT contain any text or words
4. Focus on visual metaphors and symbolic elements that represent the article's theme
5. Suitable for a professional tech/social media article

Return ONLY the English prompt description. Do not include markdown or quotes.

Content:
${content.substring(0, 2000)}`;

  const result = await callGemini(apiKey, prompt);
  // 清理引号
  return result.replace(/^["']|["']$/g, '').trim();
}

/**
 * 生成封面图
 * @param {string} visualPrompt 视觉提示词
 * @param {string} apiKey Gemini API Key
 * @returns {Object} { mimeType, base64 }
 */
async function generateCoverImage(visualPrompt, apiKey) {
  return await callGeminiImage(apiKey, visualPrompt);
}

/**
 * 保存图片到文件
 * @param {string} base64 Base64 编码的图片数据
 * @param {string} mimeType MIME 类型
 * @param {string} outputPath 输出路径
 */
function saveImage(base64, mimeType, outputPath) {
  const buffer = Buffer.from(base64, 'base64');
  fs.writeFileSync(outputPath, buffer);
  return outputPath;
}

/**
 * 根据文章内容生成封面图（完整流程）
 * @param {string} content 文章内容
 * @param {string} apiKey Gemini API Key
 * @param {string} outputPath 输出图片路径
 * @param {string} style 图片风格
 * @returns {string} 图片文件路径
 */
async function generateCoverFromContent(content, apiKey, outputPath, style = 'minimalist') {
  // 1. 生成视觉提示词
  console.log('  正在生成视觉提示词...');
  const visualPrompt = await generateVisualPrompt(content, apiKey, style);
  console.log('  提示词:', visualPrompt.substring(0, 100) + '...');
  
  // 2. 生成图片
  console.log('  正在生成图片...');
  const imageData = await generateCoverImage(visualPrompt, apiKey);
  
  // 3. 保存图片
  saveImage(imageData.base64, imageData.mimeType, outputPath);
  console.log('  图片已保存:', outputPath);
  
  return outputPath;
}

module.exports = {
  generateVisualPrompt,
  generateCoverImage,
  generateCoverFromContent,
  saveImage,
  callGemini
};