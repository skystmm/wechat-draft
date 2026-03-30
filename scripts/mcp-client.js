#!/usr/bin/env node

/**
 * MCP Client - 多模型图像生成
 * 支持 Gemini、OpenAI DALL-E、百炼、自定义 API
 */

const https = require('https');
const fs = require('fs');

/**
 * 图像生成提供者配置
 */
const PROVIDERS = {
  gemini: {
    name: 'Google Gemini',
    defaultModel: 'gemini-2.0-flash-exp-image-generation',
    apiEndpoint: 'https://generativelanguage.googleapis.com/v1beta'
  },
  openai: {
    name: 'OpenAI DALL-E',
    defaultModel: 'dall-e-3',
    apiEndpoint: 'https://api.openai.com/v1'
  },
  bailian: {
    name: '百炼',
    defaultModel: 'wanx-v1',
    apiEndpoint: 'https://dashscope.aliyuncs.com/api/v1'
  },
  siliconflow: {
    name: 'SiliconFlow',
    defaultModel: 'FLUX.1-schnell',
    apiEndpoint: 'https://api.siliconflow.cn/v1'
  }
};

/**
 * 调用 Gemini API（文本生成）
 */
async function callGemini(apiKey, prompt, modelId = 'gemini-2.0-flash', endpoint = PROVIDERS.gemini.apiEndpoint) {
  const url = `${endpoint}/models/${modelId}:generateContent?key=${apiKey}`;
  
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
 * 调用 Gemini 图像生成
 */
async function callGeminiImage(apiKey, prompt, modelId = PROVIDERS.gemini.defaultModel, endpoint = PROVIDERS.gemini.apiEndpoint) {
  const url = `${endpoint}/models/${modelId}:generateContent?key=${apiKey}`;
  
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
            const parts = json.candidates?.[0]?.content?.parts || [];
            for (const part of parts) {
              if (part.inlineData) {
                return resolve({
                  mimeType: part.inlineData.mimeType,
                  base64: part.inlineData.data
                });
              }
            }
            const textPart = parts.find(p => p.text);
            if (textPart) {
              reject(new Error(`Gemini refused: ${textPart.text}`));
            } else {
              reject(new Error('No image data'));
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
 * 调用 OpenAI DALL-E
 */
async function callOpenAI(apiKey, prompt, modelId = PROVIDERS.openai.defaultModel) {
  const url = `${PROVIDERS.openai.apiEndpoint}/images/generations`;
  
  const body = JSON.stringify({
    model: modelId,
    prompt: prompt,
    n: 1,
    size: '1792x1024',  // 接近 2.35:1
    response_format: 'b64_json'
  });

  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    
    const reqOptions = {
      hostname: urlObj.hostname,
      port: 443,
      path: urlObj.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
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
            const b64 = json.data?.[0]?.b64_json;
            if (b64) {
              resolve({
                mimeType: 'image/png',
                base64: b64
              });
            } else {
              reject(new Error('No image data'));
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
 * 调用百炼（阿里云 DashScope）
 */
async function callBailian(apiKey, prompt, modelId = PROVIDERS.bailian.defaultModel) {
  const url = `${PROVIDERS.bailian.apiEndpoint}/services/aigc/text2image/image-synthesis`;
  
  const body = JSON.stringify({
    model: modelId,
    input: {
      prompt: prompt
    },
    parameters: {
      style: '<auto>',
      size: '1920*768'  // 约 2.5:1
    }
  });

  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    
    const reqOptions = {
      hostname: urlObj.hostname,
      port: 443,
      path: urlObj.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'X-DashScope-Async': 'enable',  // 异步模式
        'Content-Length': Buffer.byteLength(body)
      }
    };

    const req = https.request(reqOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.code) {
            reject(new Error(json.message));
          } else {
            // 百炼返回任务 ID，需要轮询获取结果
            const taskId = json.output?.task_id;
            if (taskId) {
              pollBailianResult(apiKey, taskId).then(resolve).catch(reject);
            } else {
              reject(new Error('No task ID'));
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
 * 轮询百炼结果
 */
async function pollBailianResult(apiKey, taskId, maxAttempts = 30) {
  const url = `${PROVIDERS.bailian.apiEndpoint}/tasks/${taskId}`;
  
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise(r => setTimeout(r, 2000));  // 等待 2 秒
    
    const result = await new Promise((resolve, reject) => {
      const urlObj = new URL(url);
      
      https.request({
        hostname: urlObj.hostname,
        port: 443,
        path: urlObj.pathname,
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`
        }
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch {
            reject(new Error('Parse error'));
          }
        });
      }).on('error', reject).end();
    });
    
    if (result.output?.task_status === 'SUCCEEDED') {
      const imageUrl = result.output?.results?.[0]?.url;
      if (imageUrl) {
        // 下载图片并转换为 base64
        const imageBuffer = await downloadImage(imageUrl);
        return {
          mimeType: 'image/png',
          base64: imageBuffer.toString('base64')
        };
      }
    } else if (result.output?.task_status === 'FAILED') {
      throw new Error(result.output?.message || 'Task failed');
    }
  }
  
  throw new Error('Timeout waiting for image');
}

/**
 * 下载图片
 */
async function downloadImage(url) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    https.request({
      hostname: urlObj.hostname,
      port: 443,
      path: urlObj.pathname + urlObj.search,
      method: 'GET'
    }, (res) => {
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => resolve(Buffer.concat(chunks)));
    }).on('error', reject).end();
  });
}

/**
 * 调用 SiliconFlow
 */
async function callSiliconFlow(apiKey, prompt, modelId = PROVIDERS.siliconflow.defaultModel) {
  const url = `${PROVIDERS.siliconflow.apiEndpoint}/images/generations`;
  
  const body = JSON.stringify({
    model: modelId,
    prompt: prompt,
    image_size: '1792x1024',
    num_inference_steps: 20
  });

  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    
    const reqOptions = {
      hostname: urlObj.hostname,
      port: 443,
      path: urlObj.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
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
            const b64 = json.images?.[0];
            if (b64) {
              resolve({
                mimeType: 'image/png',
                base64: b64
              });
            } else {
              reject(new Error('No image data'));
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
 * 生成视觉提示词
 */
async function generateVisualPrompt(content, config) {
  const styleDescriptions = {
    minimalist: 'Minimalist, flat vector illustration, vibrant colors, clean composition',
    threeD: 'Professional 3D isometric render, high detail, soft studio lighting',
    vector: 'Modern flat vector art, clean lines, bold geometric shapes',
    cyberpunk: 'Cyberpunk aesthetic, neon lighting, futuristic city, high contrast',
    ink: 'Chinese ink wash painting style, minimalist brush strokes, artistic atmosphere'
  };

  const styleDesc = styleDescriptions[config.style] || styleDescriptions.minimalist;
  
  const prompt = `Based on the following article content, write a visual description for an AI image generator to create a cover image.

Requirements:
1. Aspect ratio approximately 2.35:1 (wide cinematic format)
2. Style: "${styleDesc}"
3. NO text or words in the image
4. Visual metaphors and symbolic elements
5. Suitable for a professional article header

Return ONLY the English prompt. No markdown or quotes.

Content:
${content.substring(0, 2000)}`;

  // 使用配置的提供者生成提示词
  if (config.provider === 'gemini' || !config.provider) {
    return await callGemini(config.apiKey, prompt, 'gemini-2.0-flash', config.endpoint || PROVIDERS.gemini.apiEndpoint);
  }
  
  // 其他提供者暂时用 Gemini 生成提示词（需要单独配置）
  // 或直接使用原始提示词
  return prompt;
}

/**
 * 根据提供者调用图像生成 API
 */
async function generateImage(visualPrompt, config) {
  const provider = config.provider || 'gemini';
  const apiKey = config.apiKey;
  const model = config.model || PROVIDERS[provider]?.defaultModel;
  
  switch (provider) {
    case 'gemini':
      return await callGeminiImage(apiKey, visualPrompt, model, config.endpoint);
    
    case 'openai':
      return await callOpenAI(apiKey, visualPrompt, model);
    
    case 'bailian':
      return await callBailian(apiKey, visualPrompt, model);
    
    case 'siliconflow':
      return await callSiliconFlow(apiKey, visualPrompt, model);
    
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}

/**
 * 保存图片
 */
function saveImage(base64, mimeType, outputPath) {
  const buffer = Buffer.from(base64, 'base64');
  fs.writeFileSync(outputPath, buffer);
  return outputPath;
}

/**
 * 完整流程：生成封面图
 */
async function generateCoverFromContent(content, imageConfig, outputPath) {
  console.log('  正在生成视觉提示词...');
  const visualPrompt = await generateVisualPrompt(content, imageConfig);
  console.log('  提示词:', visualPrompt.substring(0, 100) + '...');
  
  console.log(`  正在生成图片 (${imageConfig.provider || 'gemini'})...`);
  const imageData = await generateImage(visualPrompt, imageConfig);
  
  saveImage(imageData.base64, imageData.mimeType, outputPath);
  console.log('  图片已保存:', outputPath);
  
  return outputPath;
}

module.exports = {
  generateVisualPrompt,
  generateImage,
  generateCoverFromContent,
  saveImage,
  PROVIDERS
};