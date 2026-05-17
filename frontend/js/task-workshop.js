/**
 * 智能任务工坊 - AI任务分解
 */

let currentTasks = [];
let currentTaskId = null;

async function decomposeTask() {
    const input = document.getElementById('task-input');
    const task = input.value.trim();

    if (!task) {
        UI.showMessage('请输入任务描述', 'warning');
        return;
    }

    // 显示加载状态
    document.querySelector('.task-input-card').classList.add('hidden');
    document.getElementById('loading-state').classList.remove('hidden');
    document.getElementById('task-list-container').classList.add('hidden');

    try {
        // 调用API分解任务
        const response = await API.decomposeTask(task);

        if (response.success) {
            currentTasks = response.subtasks.map((task, index) => ({
                ...task,
                id: index + 1,
                completed: false
            }));

            currentTaskId = Date.now();
            renderTaskList();
            UI.showMessage('任务分解成功！', 'success');

            // 保存任务记录
            Storage.saveTask({
                id: currentTaskId,
                originalTask: task,
                tasks: currentTasks,
                createdAt: new Date().toISOString()
            });

            // 分析情绪
            analyzeTaskSentiment(task);
        } else {
            throw new Error(response.message || '任务分解失败');
        }
    } catch (error) {
        console.error('任务分解失败:', error);
        UI.showMessage('任务分解失败: ' + error.message, 'error');

        // 使用默认分解作为备选
        useFallbackDecomposition(task);
    } finally {
        document.getElementById('loading-state').classList.add('hidden');
        document.getElementById('task-list-container').classList.remove('hidden');
    }
}

function useFallbackDecomposition(task) {
    // 简单的默认分解逻辑
    const defaultTasks = [
        { id: 1, content: '理解任务目标和要求', estimatedTime: 5, encouragement: '这是第一步，你能行的！', completed: false },
        { id: 2, content: '收集相关资料和信息', estimatedTime: 10, encouragement: '资料收集很重要，继续加油！', completed: false },
        { id: 3, content: '规划完成步骤', estimatedTime: 5, encouragement: '规划清晰，完成更轻松！', completed: false },
        { id: 4, content: '开始执行第一个子任务', estimatedTime: 15, encouragement: '动手做起来，就已经成功了一半！', completed: false },
        { id: 5, content: '检查和调整', estimatedTime: 5, encouragement: '最后一步啦，坚持就是胜利！', completed: false }
    ];

    currentTasks = defaultTasks;
    currentTaskId = Date.now();
    renderTaskList();
}

function renderTaskList() {
    const container = document.getElementById('task-list');
    container.innerHTML = '';

    currentTasks.forEach((task, index) => {
        const taskElement = document.createElement('div');
        taskElement.className = `task-item ${task.completed ? 'completed' : ''}`;
        taskElement.innerHTML = `
            <div class="task-checkbox ${task.completed ? 'checked' : ''}"
                 onclick="toggleTask(${index})">
                ${task.completed ? '✓' : ''}
            </div>
            <div class="task-content">
                <div class="task-text">${task.content}</div>
                <div class="task-meta">
                    <span>⏱️ ${task.estimatedTime}分钟</span>
                </div>
                ${!task.completed ? `<div class="task-encouragement">💪 ${task.encouragement}</div>` : ''}
            </div>
        `;
        container.appendChild(taskElement);
    });

    updateStats();
}

function toggleTask(index) {
    currentTasks[index].completed = !currentTasks[index].completed;

    if (currentTasks[index].completed) {
        UI.showMessage('太棒了！任务完成！🎉', 'success');
    }

    renderTaskList();

    // 更新存储的任务
    if (currentTaskId) {
        Storage.updateTask(currentTaskId, {
            tasks: currentTasks,
            completedCount: currentTasks.filter(t => t.completed).length
        });
    }
}

function updateStats() {
    const completedCount = currentTasks.filter(t => t.completed).length;
    const totalCount = currentTasks.length;
    const completionRate = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

    document.getElementById('completed-count').textContent = completedCount;
    document.getElementById('total-count').textContent = totalCount;
    document.getElementById('completion-rate').textContent = `${completionRate}%`;
    document.getElementById('progress-fill').style.width = `${completionRate}%`;

    // 检查是否全部完成
    if (completedCount === totalCount && totalCount > 0) {
        UI.showMessage('🎉 恭喜！你已完成所有任务！', 'success', 5000);
    }
}

function clearTasks() {
    document.getElementById('task-input').value = '';
    document.querySelector('.task-input-card').classList.remove('hidden');
    document.getElementById('task-list-container').classList.add('hidden');
    currentTasks = [];
    currentTaskId = null;
}

async function analyzeTaskSentiment(text) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/analyze-emotion`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text })
        });

        if (response.ok) {
            const data = await response.json();
            Storage.saveEmotionRecord({
                taskId: currentTaskId,
                emotion: data.emotion,
                confidence: data.confidence
            });
        }
    } catch (error) {
        console.error('情感分析失败:', error);
    }
}

// 页面加载时恢复任务
document.addEventListener('DOMContentLoaded', () => {
    const savedTasks = Storage.getTasks();
    if (savedTasks.length > 0) {
        const lastTask = savedTasks[savedTasks.length - 1];
        if (lastTask.tasks && lastTask.tasks.length > 0) {
            document.getElementById('task-input').value = lastTask.originalTask || '';
            currentTasks = lastTask.tasks;
            currentTaskId = lastTask.id;
            renderTaskList();
            document.querySelector('.task-input-card').classList.add('hidden');
            document.getElementById('task-list-container').classList.remove('hidden');
        }
    }
});
