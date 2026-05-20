/**
 * 专注力星球 - 用户认证路由
 * v1.6 用户系统核心 - 安全增强版
 */

const express = require('express');
const router = express.Router();
const { User, ParentChildRelation } = require('../database/models');
const { authenticate, generateToken } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiter');
const { AppError, asyncHandler } = require('../middleware/errorHandler');
const { v4: uuidv4 } = require('uuid');

// 注册和登录使用严格的速率限制
router.use('/register', authLimiter);
router.use('/login', authLimiter);

// 输入验证函数
const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

const validatePassword = (password) => {
    // 密码至少6位
    return password && password.length >= 6;
};

const validateUsername = (username) => {
    // 用户名2-20个字符，只能包含字母、数字、下划线
    const usernameRegex = /^[a-zA-Z0-9_\u4e00-\u9fa5]{2,20}$/;
    return usernameRegex.test(username);
};

/**
 * POST /api/auth/register
 * 用户注册
 */
router.post('/register', asyncHandler(async (req, res) => {
    const { email, password, username, role, age, gender, parent_phone } = req.body;

    // 验证必填字段
    if (!username || !validateUsername(username)) {
        throw new AppError('用户名不能为空或格式不正确（2-20个字符）', 400, 'INVALID_USERNAME');
    }
    if (!email || !validateEmail(email)) {
        throw new AppError('邮箱不能为空或格式不正确', 400, 'INVALID_EMAIL');
    }
    if (!validatePassword(password)) {
        throw new AppError('密码至少需要6个字符', 400, 'INVALID_PASSWORD');
    }

    // 验证角色
    const validRoles = ['child', 'parent'];
    const userRole = role || 'child';
    if (!validRoles.includes(userRole)) {
        throw new AppError('无效的用户角色', 400, 'INVALID_ROLE');
    }

    // 验证年龄（如果是儿童用户）
    if (userRole === 'child' && age !== undefined) {
        const ageNum = parseInt(age);
        if (isNaN(ageNum) || ageNum < 3 || ageNum > 18) {
            throw new AppError('儿童年龄必须在3-18岁之间', 400, 'INVALID_AGE');
        }
    }

    // 检查邮箱是否已存在
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
        throw new AppError('该邮箱已被注册', 400, 'EMAIL_EXISTS');
    }

    // 创建用户
    const user = await User.create({
        username,
        email,
        password, // 应该在模型中hash
        role: userRole,
        age: userRole === 'child' ? age : undefined,
        gender,
        parent_phone,
        is_active: true,
        invite_code: uuidv4().substring(0, 8).toUpperCase() // 生成邀请码
    });

    // 生成token
    const token = generateToken(user.id);

    res.status(201).json({
        success: true,
        message: '注册成功',
        data: {
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role,
                inviteCode: user.invite_code
            },
            token
        }
    });
}));

/**
 * POST /api/auth/login
 * 用户登录
 */
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: '邮箱和密码不能为空'
            });
        }

        // 查找用户
        const user = await User.findOne({ where: { email } });

        if (!user) {
            return res.status(401).json({
                success: false,
                message: '邮箱或密码错误'
            });
        }

        // 验证密码
        if (!user.password) {
            return res.status(401).json({
                success: false,
                message: '该账号未设置密码，请使用其他方式登录'
            });
        }

        const isValid = await user.validatePassword(password);

        if (!isValid) {
            return res.status(401).json({
                success: false,
                message: '邮箱或密码错误'
            });
        }

        // 检查账号状态
        if (!user.is_active) {
            return res.status(403).json({
                success: false,
                message: '账号已被禁用'
            });
        }

        // 更新登录信息
        const today = new Date();
        const lastLogin = user.last_login;
        let newStreak = user.login_streak;

        if (lastLogin) {
            const lastDate = new Date(lastLogin);
            const daysDiff = Math.floor((today - lastDate) / (1000 * 60 * 60 * 24));

            if (daysDiff === 1) {
                newStreak += 1;
            } else if (daysDiff > 1) {
                newStreak = 1;
            }
        } else {
            newStreak = 1;
        }

        await user.update({
            last_login: today,
            login_streak: newStreak
        });

        // 生成令牌
        const token = generateToken(user.id);
        const userData = user.toJSON();

        // 返回兼容前端的格式
        res.json({
            success: true,
            message: '登录成功',
            user: userData,
            token,
            data: {
                user: userData,
                token,
                loginStreak: newStreak
            }
        });
    } catch (error) {
        console.error('登录错误:', error);
        res.status(500).json({
            success: false,
            message: '登录失败，请稍后重试'
        });
    }
});

/**
 * GET /api/auth/me
 * 获取当前用户信息
 */
router.get('/me', authenticate, async (req, res) => {
    try {
        const user = req.user.toJSON();
        
        // 将 invite_code 映射为 inviteCode
        if (user.invite_code) {
            user.inviteCode = user.invite_code;
            delete user.invite_code;
        }

        // 如果是儿童用户，获取关联的家长信息
        if (user.role === 'child') {
            const parentRelation = await ParentChildRelation.findOne({
                where: { child_id: user.id, is_active: true }
            });

            if (parentRelation) {
                const parent = await User.findByPk(parentRelation.parent_id, {
                    attributes: ['id', 'username', 'parent_phone']
                });
                user.parentAccount = parent;
            }
        }

        // 如果是家长用户，获取关联的儿童列表
        if (user.role === 'parent') {
            const childrenRelations = await ParentChildRelation.findAll({
                where: { parent_id: user.id, is_active: true },
                include: [{
                    model: User,
                    as: 'child',
                    attributes: ['id', 'username', 'age', 'avatar', 'daily_training_limit', 'login_streak', 'invite_code']
                }]
            });

            user.children = childrenRelations.map(r => {
                const child = r.child.toJSON();
                if (child.invite_code) {
                    child.inviteCode = child.invite_code;
                    delete child.invite_code;
                }
                return child;
            });
        }

        res.json({
            success: true,
            data: { user }
        });
    } catch (error) {
        console.error('获取用户信息错误:', error);
        res.status(500).json({
            success: false,
            message: '获取用户信息失败'
        });
    }
});

/**
 * PUT /api/auth/profile
 * 更新用户资料
 */
router.put('/profile', authenticate, async (req, res) => {
    try {
        const { username, age, gender, avatar } = req.body;
        const user = req.user;

        await user.update({
            ...(username && { username }),
            ...(age && { age }),
            ...(gender && { gender }),
            ...(avatar && { avatar })
        });

        res.json({
            success: true,
            message: '资料更新成功',
            data: { user: user.toJSON() }
        });
    } catch (error) {
        console.error('更新资料错误:', error);
        res.status(500).json({
            success: false,
            message: '更新资料失败'
        });
    }
});

/**
 * POST /api/auth/bind-parent
 * 绑定家长账号（儿童发起）
 */
router.post('/bind-parent', authenticate, async (req, res) => {
    try {
        const { parent_phone } = req.body;
        const child = req.user;

        if (child.role !== 'child') {
            return res.status(400).json({
                success: false,
                message: '只有儿童账号才能绑定家长'
            });
        }

        if (!parent_phone) {
            return res.status(400).json({
                success: false,
                message: '请提供家长手机号'
            });
        }

        // 查找家长账号
        let parent = await User.findOne({
            where: { parent_phone, role: 'parent' }
        });

        // 如果家长不存在，创建家长账号
        if (!parent) {
            parent = await User.create({
                username: `家长_${parent_phone.slice(-4)}`,
                role: 'parent',
                parent_phone
            });
        }

        // 创建关联关系
        const existingRelation = await ParentChildRelation.findOne({
            where: { child_id: child.id, parent_id: parent.id, is_active: true }
        });

        if (existingRelation) {
            return res.status(400).json({
                success: false,
                message: '该家长已绑定'
            });
        }

        await ParentChildRelation.create({
            parent_id: parent.id,
            child_id: child.id
        });

        // 更新儿童的家长手机号
        await child.update({ parent_phone });

        res.json({
            success: true,
            message: '绑定成功',
            data: {
                parent: {
                    id: parent.id,
                    username: parent.username,
                    parent_phone: parent.parent_phone
                }
            }
        });
    } catch (error) {
        console.error('绑定家长错误:', error);
        res.status(500).json({
            success: false,
            message: '绑定失败，请稍后重试'
        });
    }
});

/**
 * POST /api/auth/bind-child
 * 绑定儿童账号（家长发起）
 */
router.post('/bind-child', authenticate, async (req, res) => {
    try {
        const { child_id } = req.body;
        const parent = req.user;

        if (parent.role !== 'parent') {
            return res.status(400).json({
                success: false,
                message: '只有家长账号才能绑定儿童'
            });
        }

        if (!child_id) {
            return res.status(400).json({
                success: false,
                message: '请提供儿童账号ID'
            });
        }

        // 查找儿童账号
        const child = await User.findOne({
            where: { id: child_id, role: 'child' }
        });

        if (!child) {
            return res.status(404).json({
                success: false,
                message: '未找到该儿童账号'
            });
        }

        // 创建关联关系
        const existingRelation = await ParentChildRelation.findOne({
            where: { child_id: child.id, parent_id: parent.id, is_active: true }
        });

        if (existingRelation) {
            return res.status(400).json({
                success: false,
                message: '该儿童已绑定'
            });
        }

        await ParentChildRelation.create({
            parent_id: parent.id,
            child_id: child.id
        });

        res.json({
            success: true,
            message: '绑定成功',
            data: {
                child: {
                    id: child.id,
                    username: child.username,
                    age: child.age
                }
            }
        });
    } catch (error) {
        console.error('绑定儿童错误:', error);
        res.status(500).json({
            success: false,
            message: '绑定失败，请稍后重试'
        });
    }
});

/**
 * PUT /api/auth/child-settings
 * 家长设置儿童账号参数
 */
router.put('/child-settings/:childId', authenticate, async (req, res) => {
    try {
        const { childId } = req.params;
        const { daily_training_limit, is_active } = req.body;
        const parent = req.user;

        if (parent.role !== 'parent') {
            return res.status(403).json({
                success: false,
                message: '需要家长权限'
            });
        }

        // 验证亲子关系
        const relation = await ParentChildRelation.findOne({
            where: { child_id: childId, parent_id: parent.id, is_active: true }
        });

        if (!relation) {
            return res.status(403).json({
                success: false,
                message: '未找到该儿童的关联关系'
            });
        }

        const child = await User.findByPk(childId);

        await child.update({
            ...(daily_training_limit !== undefined && { daily_training_limit }),
            ...(is_active !== undefined && { is_active })
        });

        res.json({
            success: true,
            message: '设置更新成功',
            data: { child: child.toJSON() }
        });
    } catch (error) {
        console.error('设置儿童参数错误:', error);
        res.status(500).json({
            success: false,
            message: '设置失败'
        });
    }
});

/**
 * POST /api/auth/bind-by-code
 * 通过邀请码绑定儿童账号（家长发起）
 */
router.post('/bind-by-code', authenticate, async (req, res) => {
    try {
        const { invite_code } = req.body;
        const parent = req.user;

        if (parent.role !== 'parent') {
            return res.status(400).json({
                success: false,
                message: '只有家长账号才能绑定儿童'
            });
        }

        if (!invite_code) {
            return res.status(400).json({
                success: false,
                message: '请提供邀请码'
            });
        }

        const child = await User.findOne({
            where: { invite_code: invite_code, role: 'child' }
        });

        if (!child) {
            return res.status(404).json({
                success: false,
                message: '邀请码无效或该用户不是儿童账号'
            });
        }

        const existingRelation = await ParentChildRelation.findOne({
            where: { child_id: child.id, parent_id: parent.id, is_active: true }
        });

        if (existingRelation) {
            return res.status(400).json({
                success: false,
                message: '该儿童已绑定'
            });
        }

        await ParentChildRelation.create({
            parent_id: parent.id,
            child_id: child.id
        });

        res.json({
            success: true,
            message: '绑定成功',
            data: {
                child: {
                    id: child.id,
                    username: child.username,
                    age: child.age
                }
            }
        });
    } catch (error) {
        console.error('通过邀请码绑定儿童错误:', error);
        res.status(500).json({
            success: false,
            message: '绑定失败，请稍后重试'
        });
    }
});

module.exports = router;
