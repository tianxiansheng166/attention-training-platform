/**
 * 任务分解服务
 * 调用LLM将复杂任务分解为小步骤
 */

const axios = require('axios');

// DeepSeek API配置
const API_URL = 'https://api.deepseek.com/chat/completions';

/**
 * 分解任务为小步骤
 * @param {string} task - 用户输入的任务描述
 * @returns {Promise<{subtasks: Array, estimatedTime: string}>}
 */
async function decomposeTask(task) {
    // 检查API配置
    if (!process.env.DEEPSEEK_API_KEY) {
        throw new Error('DeepSeek API密钥未配置');
    }

    const systemPrompt = `你是一个任务分解专家，专门帮助用户将复杂的任务分解为简单、可管理的小步骤。

请遵循以下原则：
1. 每个子任务应该在5-15分钟内完成
2. 使用正向、鼓励性的语言
3. 任务分解遵循"小步子"原则，降低心理负担
4. 考虑任务的逻辑顺序
5. 添加适当的休息建议（每3-4个任务后）

请将任务分解为5-10个子任务，并为每个子任务提供：
- 简短、清晰的任务描述
- 预估时间（分钟）
- 一句鼓励的话`;

    try {
        const response = await axios.post(API_URL, {
            model: 'deepseek-chat',
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: `请分解以下任务：${task}` }
            ],
            temperature: 0.7,
            max_tokens: 2000
        }, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`
            },
            timeout: 30000
        });

        const content = response.data.choices[0].message.content;
        const subtasks = parseSubtasks(content);
        const estimatedTime = calculateEstimatedTime(subtasks);

        return {
            subtasks,
            estimatedTime
        };

    } catch (error) {
        console.error('DeepSeek API调用失败:', error.message);

        // 如果是API错误，返回友好提示
        if (error.response?.status === 401) {
            throw new Error('API密钥无效，请检查配置');
        } else if (error.response?.status === 429) {
            throw new Error('API调用频率超限，请稍后重试');
        }

        throw new Error('任务分解服务暂时不可用，请稍后重试');
    }
}

/**
 * 解析AI返回的任务列表
 * @param {string} content - AI返回的内容
 * @returns {Array}
 */
function parseSubtasks(content) {
    // 简单的解析逻辑，可以根据实际返回格式调整
    const tasks = [];
    const lines = content.split('\n');

    let currentTask = null;

    for (const line of lines) {
        // 匹配各种任务列表格式
        const numberedMatch = line.match(/^\d+[.、)）]\s*(.+)/);
        const bulletMatch = line.match(/^[•·\-\*]\s*(.+)/);
        const bracketMatch = line.match(/^\[(.+)\]/);

        if (numberedMatch || bulletMatch) {
            const taskText = (numberedMatch || bulletMatch)[1].trim();

            // 提取时间和鼓励语
            const timeMatch = taskText.match(/\((\d+)\s*分钟?\)/);
            const time = timeMatch ? parseInt(timeMatch[1]) : 10;

            const taskContent = taskText.replace(/\(\d+\s*分钟?\)/g, '').trim();

            tasks.push({
                id: tasks.length + 1,
                content: taskContent,
                estimatedTime: time,
                encouragement: generateEncouragement(taskContent),
                completed: false
            });
        }
    }

    // 如果没有匹配到格式化的列表，尝试其他方式
    if (tasks.length === 0) {
        // 按段落分割
        const paragraphs = content.split(/\n\n+/);
        for (let i = 0; i < Math.min(paragraphs.length, 8); i++) {
            const paragraph = paragraphs[i].trim();
            if (paragraph && paragraph.length > 5 && paragraph.length < 200) {
                tasks.push({
                    id: i + 1,
                    content: paragraph,
                    estimatedTime: 10,
                    encouragement: generateEncouragement(paragraph),
                    completed: false
                });
            }
        }
    }

    return tasks;
}

/**
 * 生成鼓励语
 * @param {string} task - 任务内容
 * @returns {string}
 */
function generateEncouragement(task) {
    const encouragements = [
        '加油，你可以的！',
        '这一步很简单，马上就能完成！',
        '完成了这一小步，距离成功又近了一步！',
        '相信自己，你一定能做到！',
        '专注当下，一步步来！',
        '做得很棒，继续保持！',
        '这个任务对你来说轻而易举！',
        '每一次进步都是成长，继续加油！'
    ];

    return encouragements[Math.floor(Math.random() * encouragements.length)];
}

/**
 * 计算预估时间
 * @param {Array} tasks - 任务列表
 * @returns {string}
 */
function calculateEstimatedTime(tasks) {
    const totalMinutes = tasks.reduce((sum, task) => sum + task.estimatedTime, 0);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    if (hours > 0) {
        return `${hours}小时${minutes}分钟`;
    }
    return `${minutes}分钟`;
}

module.exports = {
    decomposeTask
};
