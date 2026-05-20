/**
 * 双任务训练游戏
 * 同时训练数学计算和图形识别能力
 */

const gameDual = {
    // 游戏配置
    config: {
        1: { questions: 5, time: 30 },
        2: { questions: 10, time: 60 },
        3: { questions: 15, time: 90 }
    },
    
    // 游戏状态
    state: {
        level: 2,
        sessionId: null,
        isPlaying: false,
        currentTask: 'math',
        timeLeft: 60,
        timerInterval: null,
        
        // 统计数据
        totalQuestions: 0,
        mathQuestions: 0,
        shapeQuestions: 0,
        correctCount: 0,
        mathCorrect: 0,
        shapeCorrect: 0,
        currentStreak: 0,
        bestStreak: 0,
        
        // 当前任务数据
        currentMath: null,
        currentShape: null,
        awaitingAnswer: false
    },
    
    // 初始化
    init() {
        this.setupEventListeners();
        this.loadSession();
    },
    
    // 设置事件监听
    setupEventListeners() {
        document.querySelectorAll('.diff-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.diff-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.state.level = parseInt(btn.dataset.level);
            });
        });
        
        // 键盘快捷键
        document.addEventListener('keydown', (e) => {
            if (!this.state.isPlaying) return;
            
            if (this.state.currentTask === 'math') {
                if (e.key === 'ArrowLeft') {
                    this.answerMath(true);
                } else if (e.key === 'ArrowRight') {
                    this.answerMath(false);
                }
            } else {
                if (e.key === 'ArrowLeft' || e.key === 'y' || e.key === 'Y') {
                    this.answerShape('yes');
                } else if (e.key === 'ArrowRight' || e.key === 'n' || e.key === 'N') {
                    this.answerShape('no');
                }
            }
        });
    },
    
    // 加载游戏会话
    async loadSession() {
        try {
            const sessionId = localStorage.getItem('currentSessionId');
            if (sessionId) {
                this.state.sessionId = sessionId;
                document.getElementById('sessionStatus').textContent = '📱 会话已连接';
                document.getElementById('sessionStatus').classList.add('connected');
            }
        } catch (error) {
            console.log('离线模式');
        }
    },
    
    // 开始游戏
    async startGame() {
        const config = this.config[this.state.level];
        
        // 重置状态
        this.state.isPlaying = true;
        this.state.timeLeft = config.time;
        this.state.totalQuestions = 0;
        this.state.mathQuestions = 0;
        this.state.shapeQuestions = 0;
        this.state.correctCount = 0;
        this.state.mathCorrect = 0;
        this.state.shapeCorrect = 0;
        this.state.currentStreak = 0;
        this.state.bestStreak = 0;
        this.state.currentTask = 'math';
        
        // 更新UI
        this.showScreen('gameScreen');
        this.updateDisplay();
        
        // 开始计时器
        this.startTimer();
        
        // 开始第一个任务
        this.showNextTask();
    },
    
    // 显示屏幕
    showScreen(screenId) {
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        document.getElementById(screenId).classList.add('active');
    },
    
    // 开始计时器
    startTimer() {
        if (this.state.timerInterval) {
            clearInterval(this.state.timerInterval);
        }
        
        this.state.timerInterval = setInterval(() => {
            this.state.timeLeft--;
            this.updateDisplay();
            
            if (this.state.timeLeft <= 0) {
                this.endGame();
            }
        }, 1000);
    },
    
    // 更新显示
    updateDisplay() {
        document.getElementById('timeLeft').textContent = this.state.timeLeft;
        document.getElementById('correctCount').textContent = this.state.correctCount;
        document.getElementById('streakCount').textContent = this.state.currentStreak;
        
        const config = this.config[this.state.level];
        const progress = ((config.time - this.state.timeLeft) / config.time) * 100;
        document.getElementById('progressFill').style.width = `${progress}%`;
        
        if (this.state.totalQuestions > 0) {
            const accuracy = Math.round((this.state.correctCount / this.state.totalQuestions) * 100);
            document.getElementById('accuracyRate').textContent = `${accuracy}%`;
        }
    },
    
    // 显示下一个任务
    showNextTask() {
        if (!this.state.isPlaying) return;
        
        // 交替显示任务
        if (this.state.currentTask === 'math') {
            this.showMathTask();
            this.state.currentTask = 'shape';
        } else {
            this.showShapeTask();
            this.state.currentTask = 'math';
        }
    },
    
    // 生成数学问题
    generateMathProblem() {
        const operators = ['+', '-', '×'];
        const operator = operators[Math.floor(Math.random() * operators.length)];
        
        let num1, num2, correctAnswer;
        
        if (operator === '+') {
            num1 = Math.floor(Math.random() * 50) + 10;
            num2 = Math.floor(Math.random() * 50) + 10;
            correctAnswer = num1 + num2;
        } else if (operator === '-') {
            num1 = Math.floor(Math.random() * 50) + 30;
            num2 = Math.floor(Math.random() * 30) + 1;
            correctAnswer = num1 - num2;
        } else {
            num1 = Math.floor(Math.random() * 9) + 2;
            num2 = Math.floor(Math.random() * 9) + 2;
            correctAnswer = num1 * num2;
        }
        
        // 随机决定是否显示正确答案
        const showCorrect = Math.random() > 0.5;
        let displayAnswer;
        if (showCorrect) {
            displayAnswer = correctAnswer;
        } else {
            displayAnswer = correctAnswer + (Math.floor(Math.random() * 10) - 5);
            if (displayAnswer === correctAnswer) {
                displayAnswer = correctAnswer + (Math.random() > 0.5 ? 1 : -1);
            }
        }
        
        return {
            num1,
            num2,
            operator,
            correctAnswer,
            displayAnswer,
            isCorrect: showCorrect
        };
    },
    
    // 显示数学任务
    showMathTask() {
        const problem = this.generateMathProblem();
        this.state.currentMath = problem;
        this.state.mathQuestions++;
        this.state.totalQuestions++;
        
        document.getElementById('num1').textContent = problem.num1;
        document.getElementById('operator').textContent = problem.operator;
        document.getElementById('num2').textContent = problem.num2;
        document.getElementById('result').textContent = problem.displayAnswer;
        
        const resultEl = document.getElementById('result');
        resultEl.className = problem.isCorrect ? 'correct-result' : 'wrong-result';
        
        document.querySelector('.task-math').classList.add('active');
        document.querySelector('.task-shape').classList.remove('active');
        
        this.state.awaitingAnswer = true;
        this.updateDisplay();
    },
    
    // 回答数学问题
    answerMath(userSaysCorrect) {
        if (!this.state.awaitingAnswer || this.state.currentTask !== 'shape') return;
        
        this.state.awaitingAnswer = false;
        
        const isCorrect = userSaysCorrect === this.state.currentMath.isCorrect;
        this.processAnswer(isCorrect, 'math');
        
        setTimeout(() => {
            this.showNextTask();
        }, 300);
    },
    
    // 图形配置
    shapes: [
        { shape: '○', name: '圆形', type: 'circle' },
        { shape: '□', name: '正方形', type: 'square' },
        { shape: '△', name: '三角形', type: 'triangle' },
        { shape: '◇', name: '菱形', type: 'diamond' },
        { shape: '☆', name: '星形', type: 'star' }
    ],
    
    colors: ['红色', '蓝色', '绿色', '黄色', '紫色'],
    colorEmoji: { '红色': '🔴', '蓝色': '🔵', '绿色': '🟢', '黄色': '🟡', '紫色': '🟣' },
    
    // 生成图形问题
    generateShapeQuestion() {
        const shape = this.shapes[Math.floor(Math.random() * this.shapes.length)];
        const color = this.colors[Math.floor(Math.random() * this.colors.length)];
        
        // 随机决定问题类型
        const questionType = Math.random() > 0.5 ? 'shape' : 'color';
        
        let question, answer;
        
        if (questionType === 'shape') {
            question = '是圆形吗？';
            answer = shape.type === 'circle';
        } else {
            question = `是${this.colorEmoji[color]} ${color}吗？`;
            answer = Math.random() > 0.7; // 30%概率颜色与问题匹配
        }
        
        return {
            shape: shape.shape,
            color,
            questionType,
            question,
            answer,
            displayQuestion: questionType === 'shape' ? '是圆形吗？' : `是${this.colorEmoji[color]} ${color}吗？`
        };
    },
    
    // 显示图形任务
    showShapeTask() {
        const question = this.generateShapeQuestion();
        this.state.currentShape = question;
        this.state.shapeQuestions++;
        this.state.totalQuestions++;
        
        document.getElementById('currentShape').textContent = question.shape;
        document.getElementById('shapeQuestion').textContent = question.displayQuestion;
        
        document.querySelector('.task-shape').classList.add('active');
        document.querySelector('.task-math').classList.remove('active');
        
        this.state.awaitingAnswer = true;
        this.updateDisplay();
    },
    
    // 回答图形问题
    answerShape(userAnswer) {
        if (!this.state.awaitingAnswer || this.state.currentTask !== 'math') return;
        
        this.state.awaitingAnswer = false;
        
        const isCorrect = (userAnswer === 'yes') === this.state.currentShape.answer;
        this.processAnswer(isCorrect, 'shape');
        
        setTimeout(() => {
            this.showNextTask();
        }, 300);
    },
    
    // 处理答案
    processAnswer(isCorrect, taskType) {
        if (isCorrect) {
            this.state.correctCount++;
            this.state.currentStreak++;
            if (this.state.currentStreak > this.state.bestStreak) {
                this.state.bestStreak = this.state.currentStreak;
            }
            
            if (taskType === 'math') {
                this.state.mathCorrect++;
            } else {
                this.state.shapeCorrect++;
            }
            
            // 显示正确反馈
            this.showFeedback(true);
        } else {
            this.state.currentStreak = 0;
            this.showFeedback(false);
        }
        
        this.updateDisplay();
    },
    
    // 显示反馈
    showFeedback(isCorrect) {
        const taskArea = document.querySelector(`.task-${this.state.currentTask === 'math' ? 'shape' : 'math'}`);
        
        if (isCorrect) {
            taskArea.classList.add('streak-flash');
            setTimeout(() => taskArea.classList.remove('streak-flash'), 500);
        } else {
            taskArea.classList.add('wrong-flash');
            setTimeout(() => taskArea.classList.remove('wrong-flash'), 500);
        }
    },
    
    // 结束游戏
    async endGame() {
        this.state.isPlaying = false;
        
        if (this.state.timerInterval) {
            clearInterval(this.state.timerInterval);
            this.state.timerInterval = null;
        }
        
        // 计算最终结果
        const mathAccuracy = this.state.mathQuestions > 0 
            ? Math.round((this.state.mathCorrect / this.state.mathQuestions) * 100) 
            : 0;
        const shapeAccuracy = this.state.shapeQuestions > 0 
            ? Math.round((this.state.shapeCorrect / this.state.shapeQuestions) * 100) 
            : 0;
        const overallAccuracy = this.state.totalQuestions > 0 
            ? Math.round((this.state.correctCount / this.state.totalQuestions) * 100) 
            : 0;
        
        // 综合得分 (考虑两个任务的表现)
        const combinedScore = Math.round((mathAccuracy + shapeAccuracy) / 2);
        
        // 更新结果显示
        document.getElementById('finalScore').textContent = combinedScore;
        document.getElementById('finalAccuracy').textContent = `${overallAccuracy}%`;
        document.getElementById('finalStreak').textContent = this.state.bestStreak;
        document.getElementById('mathScore').textContent = `${mathAccuracy}%`;
        document.getElementById('shapeScore').textContent = `${shapeAccuracy}%`;
        
        document.getElementById('mathDetail').textContent = 
            `${this.state.mathCorrect}/${this.state.mathQuestions} 正确`;
        document.getElementById('shapeDetail').textContent = 
            `${this.state.shapeCorrect}/${this.state.shapeQuestions} 正确`;
        
        // 根据表现显示反馈
        const feedback = this.getFeedback(combinedScore, this.state.bestStreak);
        document.getElementById('resultFeedback').textContent = feedback.message;
        document.getElementById('resultIcon').textContent = feedback.icon;
        document.getElementById('resultTitle').textContent = feedback.title;
        
        // 上传游戏记录
        if (this.state.sessionId) {
            await this.uploadGameRecord(combinedScore, overallAccuracy);
        }
        
        // 显示结果屏幕
        this.showScreen('resultScreen');
    },
    
    // 获取反馈
    getFeedback(score, streak) {
        if (score >= 90 && streak >= 5) {
            return {
                icon: '🏆',
                title: '完美表现！',
                message: '太厉害了！你的认知资源分配能力达到了专业水平！'
            };
        } else if (score >= 80) {
            return {
                icon: '🌟',
                title: '优秀！',
                message: '做得很好！你能很好地同时处理多个任务！'
            };
        } else if (score >= 70) {
            return {
                icon: '👍',
                title: '不错！',
                message: '继续保持，你的注意力分配能力在稳步提升！'
            };
        } else if (score >= 60) {
            return {
                icon: '💪',
                title: '继续加油！',
                message: '有进步的空间，多练习会让你的表现越来越好！'
            };
        } else {
            return {
                icon: '🎯',
                title: '训练完成！',
                message: '认知训练需要持续练习，坚持下去你会看到进步！'
            };
        }
    },
    
    // 上传游戏记录
    async uploadGameRecord(score, accuracy) {
        try {
            const record = {
                gameType: 'dual',
                sessionId: this.state.sessionId,
                score,
                accuracy,
                duration: this.config[this.state.level].time - this.state.timeLeft,
                level: this.state.level,
                details: {
                    mathCorrect: this.state.mathCorrect,
                    mathTotal: this.state.mathQuestions,
                    shapeCorrect: this.state.shapeCorrect,
                    shapeTotal: this.state.shapeQuestions,
                    bestStreak: this.state.bestStreak
                }
            };
            
            await api.game.saveRecord(this.state.sessionId, 'dual', record);
        } catch (error) {
            console.log('游戏记录保存失败:', error);
        }
    },
    
    // 重试游戏
    retryGame() {
        this.showScreen('startScreen');
    },
    
    // 返回
    goBack() {
        if (this.state.isPlaying) {
            if (confirm('确定要退出训练吗？当前进度将不会保存。')) {
                this.state.isPlaying = false;
                if (this.state.timerInterval) {
                    clearInterval(this.state.timerInterval);
                }
                window.location.href = 'index.html';
            }
        } else {
            window.location.href = 'index.html';
        }
    },
    
    // 显示帮助
    showHelp() {
        document.getElementById('helpModal').classList.add('active');
    },
    
    // 关闭帮助
    closeHelp() {
        document.getElementById('helpModal').classList.remove('active');
    }
};

// 初始化游戏
document.addEventListener('DOMContentLoaded', () => {
    gameDual.init();
});
