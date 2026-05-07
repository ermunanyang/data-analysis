import { randomBytes, createCipheriv, createDecipheriv } from "node:crypto";
import { promisify } from "node:util";
import { scrypt as scryptCallback } from "node:crypto";

const scrypt = promisify(scryptCallback);

const ENCRYPTION_ALGORITHM = "aes-256-gcm";

export type ApiKeyType = "openai" | "anthropic" | "baidu" | "ali" | "tencent" | "doubao";

export interface AnalysisResult {
  analysisText: string;
  problemText: string;
  improvementText: string;
}

export interface CourseAnalysisData {
  courseName: string;
  courseCode: string;
  courseType: string;
  semester: string;
  className: string;
  department: string;
  major: string;
  teacherNames: string;
  selectedCount: number;
  evaluatedCount: number;
  expectedValue: number;
  targets: Array<{
    name: string;
    summary: string;
    graduationRequirement: string;
    supportStrength: string;
    overallWeight: number;
    processEvaluationRatio: number;
    resultEvaluationRatio: number;
    surveyEvaluationRatio: number;
    directWeight: number;
    indirectWeight: number;
    attainment?: number;
  }>;
  methods: Array<{
    name: string;
    category: string;
    fullScore: number;
  }>;
  averageAttainment?: number;
  targetAttainments?: Record<string, number>;
}

const OPENAI_API_BASE = "https://api.openai.com/v1/chat/completions";
const ANTHROPIC_API_BASE = "https://api.anthropic.com/v1/messages";
const BAIDU_API_BASE = "https://aip.baidubce.com/rpc/2.0/ai_custom/v1/wenxinworkshop/chat/completions";
const ALI_API_BASE = "https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation";
const TENCENT_API_BASE = "https://hunyuan.tencentcloudapi.com";
const DOUBAO_API_BASE = "https://ark.cn-beijing.volces.com/api/v3/chat/completions";

function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) {
    throw new Error("ENCRYPTION_KEY environment variable not set");
  }
  return Buffer.from(key.padEnd(32, "0").slice(0, 32), "utf-8");
}

export async function encryptApiKey(apiKey: string): Promise<string> {
  const key = getEncryptionKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv(ENCRYPTION_ALGORITHM, key, iv);
  let encrypted = cipher.update(apiKey, "utf-8");
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${tag.toString("hex")}:${encrypted.toString("hex")}`;
}

export async function decryptApiKey(encryptedKey: string): Promise<string> {
  const parts = encryptedKey.split(":");
  if (parts.length !== 3) {
    throw new Error("旧格式API Key，请重新设置API Key");
  }

  const [ivHex, tagHex, encryptedHex] = parts;
  if (!ivHex || !tagHex || !encryptedHex) {
    throw new Error("Invalid encrypted key format");
  }

  try {
    const key = getEncryptionKey();
    const iv = Buffer.from(ivHex, "hex");
    const tag = Buffer.from(tagHex, "hex");
    const encrypted = Buffer.from(encryptedHex, "hex");
    
    const decipher = createDecipheriv(ENCRYPTION_ALGORITHM, key, iv);
    decipher.setAuthTag(tag);
    
    let decrypted = decipher.update(encrypted);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    
    return decrypted.toString("utf-8");
  } catch {
    throw new Error("API Key解密失败，请重新设置");
  }
}

export async function verifyApiKey(apiKey: string, apiKeyType: ApiKeyType): Promise<boolean> {
  try {
    switch (apiKeyType) {
      case "openai":
        return await verifyOpenAiKey(apiKey);
      case "anthropic":
        return await verifyAnthropicKey(apiKey);
      case "baidu":
        return await verifyBaiduKey(apiKey);
      case "ali":
        return await verifyAliKey(apiKey);
      case "tencent":
        return await verifyTencentKey(apiKey);
      case "doubao":
        return await verifyDoubaoKey(apiKey);
      default:
        return false;
    }
  } catch {
    return false;
  }
}

async function verifyOpenAiKey(apiKey: string): Promise<boolean> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(OPENAI_API_BASE, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: "hi" }],
        max_tokens: 1,
      }),
      signal: controller.signal,
    });
    return response.ok || response.status === 401;
  } catch {
    return false;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function verifyAnthropicKey(apiKey: string): Promise<boolean> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(ANTHROPIC_API_BASE, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-3-sonnet-20240229",
        max_tokens: 1,
        messages: [{ role: "user", content: "hi" }],
      }),
      signal: controller.signal,
    });
    return response.ok || response.status === 401;
  } catch {
    return false;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function verifyBaiduKey(apiKey: string): Promise<boolean> {
  return true;
}

async function verifyAliKey(apiKey: string): Promise<boolean> {
  return true;
}

async function verifyTencentKey(apiKey: string): Promise<boolean> {
  return true;
}

async function verifyDoubaoKey(apiKey: string): Promise<boolean> {
  return true;
}

function buildPrompt(data: CourseAnalysisData): string {
  const targetInfo = data.targets
    .map((t, i) => {
      return `课程目标${i + 1}：${t.name}
  描述：${t.summary || "未填写"}
  支撑毕业要求：${t.graduationRequirement || "未填写"}
  支撑强度：${t.supportStrength}
  权重：${t.overallWeight}
  达成度：${t.attainment !== undefined ? t.attainment.toFixed(2) : "待计算"}`;
    })
    .join("\n\n");

  const methodInfo = data.methods
    .map((m) => `${m.name}（${m.category === "PROCESS" ? "过程性" : m.category === "RESULT" ? "结果性" : "其他"}，满分${m.fullScore}）`)
    .join(", ");

  return `
你是一位资深的课程评估专家和高等教育研究者。请根据以下课程达成度数据，撰写一份专业的《课程达成度分析报告》，该报告将直接填入标准的课程达成度分析报告文档中。

【课程基本信息】
- 课程名称：${data.courseName}
- 课程编码：${data.courseCode}
- 课程类别：${data.courseType || "未填写"}
- 开课学期：${data.semester}
- 教学班级：${data.className}
- 开课学院：${data.department || "未填写"}
- 授课专业：${data.major || "未填写"}
- 任课教师：${data.teacherNames || "未填写"}
- 选课人数：${data.selectedCount}人
- 参评人数：${data.evaluatedCount}人
- 期望达成度：${(Number(data.expectedValue) * 100).toFixed(1)}%
- 实际达成度：${data.averageAttainment !== undefined ? (data.averageAttainment * 100).toFixed(1) : "待计算"}%

【考核方式构成】
${methodInfo}

【课程目标达成情况】
${targetInfo}

请按照以下规范格式输出分析报告，该报告将直接填入《课程达成度分析报告》文档的相应章节：

（一）课程分析
【撰写要求】基于上述课程数据，客观分析各课程目标的达成情况，评估教学效果，明确指出教学中的优势领域和薄弱环节。分析应基于数据，条理清晰，论据充分。

（二）存在问题
【撰写要求】深入剖析课程教学过程中存在的主要问题与不足，问题分析应具体明确，避免空泛表述。注意结合课程目标达成数据和学生成绩分布进行有针对性的诊断。

（三）改进措施
【撰写要求】针对"存在问题"章节中识别的各项问题，逐一提出切实可行的改进措施。措施应具有可操作性、可量化性和可评估性，便于后续跟踪改进效果。
【特别说明】"改进措施"章节的内容将直接填入《课程达成度分析报告》文档末尾的"改进措施"专章，请确保内容完整、规范，符合教育教学评估的学术规范。

【输出规范】
1. 使用规范的简体中文书面语，避免口语化表达
2. 采用学术论文的写作风格，逻辑严谨，表述准确
3. 每个章节至少包含3-5个实质性要点
4. 内容应具有针对性和可操作性，避免泛泛而谈
5. 直接输出报告正文全文，不要包含任何解释性说明或格式标注
  `.trim();
}

export async function generateCourseAnalysis(
  apiKey: string,
  apiKeyType: ApiKeyType,
  courseData: CourseAnalysisData
): Promise<AnalysisResult> {
  const prompt = buildPrompt(courseData);

  let response: Response;
  let result: string;

  try {
    switch (apiKeyType) {
      case "openai": {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 60000);
        try {
          response = await fetch(OPENAI_API_BASE, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
              model: "gpt-4o-mini",
              messages: [{ role: "user", content: prompt }],
              max_tokens: 3000,
              temperature: 0.7,
            }),
            signal: controller.signal,
          });

          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`OpenAI API错误 (${response.status}): ${errorText}`);
          }

          const openAiData = await response.json();
          result = openAiData.choices[0]?.message?.content || "";
        } finally {
          clearTimeout(timeoutId);
        }
        break;
      }

      case "anthropic": {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 60000);
        try {
          response = await fetch(ANTHROPIC_API_BASE, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-api-key": apiKey,
              "anthropic-version": "2023-06-01",
            },
            body: JSON.stringify({
              model: "claude-3-sonnet-20240229",
              max_tokens: 3000,
              messages: [{ role: "user", content: prompt }],
              temperature: 0.7,
            }),
            signal: controller.signal,
          });

          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Anthropic API错误 (${response.status}): ${errorText}`);
          }

          const anthropicData = await response.json();
          result = anthropicData.content?.[0]?.text || "";
        } finally {
          clearTimeout(timeoutId);
        }
        break;
      }

      case "baidu": {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 60000);
        try {
          response = await fetch(`${BAIDU_API_BASE}?access_token=${apiKey}`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              messages: [{ role: "user", content: prompt }],
            }),
            signal: controller.signal,
          });

          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`百度文心一言 API错误 (${response.status}): ${errorText}`);
          }

          const baiduData = await response.json();
          result = baiduData.result || "";
        } finally {
          clearTimeout(timeoutId);
        }
        break;
      }

      case "ali": {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 60000);
        try {
          response = await fetch(ALI_API_BASE, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
              model: "qwen-turbo",
              input: {
                messages: [{ role: "user", content: prompt }],
              },
              parameters: {
                max_tokens: 3000,
                temperature: 0.7,
              },
            }),
            signal: controller.signal,
          });

          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`阿里云通义千问 API错误 (${response.status}): ${errorText}`);
          }

          const aliData = await response.json();
          result = aliData.output?.text || aliData.output?.choices?.[0]?.message?.content || "";
        } finally {
          clearTimeout(timeoutId);
        }
        break;
      }

      case "tencent": {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 60000);
        try {
          response = await fetch(TENCENT_API_BASE, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
              model: "hunyuan-lite",
              messages: [{ role: "user", content: prompt }],
              max_tokens: 3000,
              temperature: 0.7,
            }),
            signal: controller.signal,
          });

          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`腾讯混元 API错误 (${response.status}): ${errorText}`);
          }

          const tencentData = await response.json();
          result = tencentData.choices?.[0]?.message?.content || tencentData.result || "";
        } finally {
          clearTimeout(timeoutId);
        }
        break;
      }

      case "doubao": {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 60000);
        try {
          response = await fetch("https://api.doubao.com/v1/chat/completions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
              model: "Doubao",
              messages: [{ role: "user", content: prompt }],
              max_tokens: 3000,
              temperature: 0.7,
            }),
            signal: controller.signal,
          });

          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`字节跳动豆包 API错误 (${response.status}): ${errorText}`);
          }

          const doubaoData = await response.json();
          result = doubaoData.choices?.[0]?.message?.content || doubaoData.result || "";
        } finally {
          clearTimeout(timeoutId);
        }
        break;
      }

      default:
        throw new Error(`不支持的API类型: ${apiKeyType}`);
    }
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === "AbortError") {
        throw new Error("API请求超时，请稍后重试");
      }
      if (error.message.includes("fetch failed") || error.message.includes("Failed to fetch") || error.message.includes("ENOTFOUND") || error.message.includes("ECONNREFUSED")) {
        throw new Error(`网络连接失败，无法访问${apiKeyType}服务。请检查：1) 网络连接是否正常 2) 是否需要配置代理 3) API服务是否可用`);
      }
      if (error.message.includes("API调用失败")) {
        throw error;
      }
      throw new Error(`API调用失败: ${error.message}`);
    }
    throw new Error("API调用失败: 未知错误");
  }

  return parseAnalysisResult(result);
}

function parseAnalysisResult(result: string): AnalysisResult {
  const normalized = result.trim();

  const patterns = {
    analysis: [
      /(?:（一）\s*课程分析|一[.、]\s*课程分析)([\s\S]*?)(?=二[.、]\s*存在问题|（二）\s*存在问题)/,
      /(?:（一）|（一）\s*)([\s\S]*?)(?=（二）|（二）\s*存在问题)/,
    ],
    problem: [
      /(?:（二）\s*存在问题|二[.、]\s*存在问题)([\s\S]*?)(?=三[.、]\s*改进措施|（三）\s*改进措施)/,
      /(?:（二）|（二）\s*)([\s\S]*?)(?=（三）|（三）\s*改进措施)/,
    ],
    improvement: [
      /(?:（三）\s*改进措施|三[.、]\s*改进措施)([\s\S]*?)$/,
      /(?:（三）|（三）\s*)([\s\S]*?)$/,
    ],
  };

  let analysisText = "";
  let problemText = "";
  let improvementText = "";

  for (const pattern of patterns.analysis) {
    const match = normalized.match(pattern);
    if (match && match[1]) {
      analysisText = match[1].trim();
      break;
    }
  }

  for (const pattern of patterns.problem) {
    const match = normalized.match(pattern);
    if (match && match[1]) {
      problemText = match[1].trim();
      break;
    }
  }

  for (const pattern of patterns.improvement) {
    const match = normalized.match(pattern);
    if (match && match[1]) {
      improvementText = match[1].trim();
      break;
    }
  }

  if (!improvementText && analysisText) {
    const sections = normalized.split(/(?:（[一二三四]）|^[一二三四][.、])/m);
    if (sections.length > 1) {
      improvementText = sections[sections.length - 1].trim();
    }
  }

  return {
    analysisText,
    problemText,
    improvementText,
  };
}