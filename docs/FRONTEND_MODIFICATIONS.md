# 前端页面修改说明 - templates/test-tool.html

由于test-tool.html文件较大，本文档提供详细的修改指导。

---

## 📋 修改概览

需要在 `templates/test-tool.html` 文件中添加以下功能：

1. 验证码UI组件
2. 验证码发送逻辑
3. 验证码验证逻辑
4. 双模式支持（验证码模式/直接查询模式）

---

## 🎨 1. 添加验证码UI组件

在现有的Token查询表单中添加验证码相关的HTML元素。

### 查找位置

搜索关键字：`<!-- Token查询区域` 或类似的Token输入区域

### 添加HTML代码

在邮箱输入框（email input）之后添加：

```html
<!-- 验证码输入区域（仅当启用验证码功能时显示） -->
{{if .VerifyCodeEnabled}}
<div id="verifyCodeSection" style="display: none; margin-top: 15px;">
    <div style="display: flex; gap: 10px; align-items: flex-start;">
        <div style="flex: 1;">
            <input type="text" 
                   id="verifyCodeInput" 
                   placeholder="请输入6位验证码" 
                   maxlength="6"
                   pattern="[0-9]{6}"
                   style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px;">
            <div id="verifyCodeError" style="color: #e74c3c; font-size: 12px; margin-top: 5px; display: none;"></div>
        </div>
        <button type="button" 
                id="verifyBtn" 
                onclick="verifyCodeAndQuery()"
                style="padding: 10px 20px; background-color: #27ae60; color: white; border: none; border-radius: 4px; cursor: pointer; white-space: nowrap; font-size: 14px;">
            验证并查询
        </button>
    </div>
    <div style="margin-top: 10px; font-size: 12px; color: #7f8c8d;">
        <span id="verifyCodeHint">验证码已发送到您的邮箱，有效期5分钟</span>
    </div>
</div>
{{end}}
```

### 修改现有的查询按钮

原有的查询按钮逻辑需要修改：

```html
<!-- 原来的按钮 -->
<button type="button" onclick="queryToken()">查询Token</button>

<!-- 修改为（根据是否启用验证码功能） -->
{{if .VerifyCodeEnabled}}
    <!-- 启用验证码：按钮改为"发送验证码" -->
    <button type="button" 
            id="sendCodeBtn" 
            onclick="sendVerifyCode()"
            style="padding: 10px 20px; background-color: #3498db; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 14px;">
        发送验证码
    </button>
    <div id="cooldownHint" style="margin-top: 10px; font-size: 12px; color: #e74c3c; display: none;">
        请等待 <span id="cooldownSeconds">60</span> 秒后再次发送
    </div>
{{else}}
    <!-- 未启用验证码：保持原有按钮 -->
    <button type="button" onclick="queryToken()">查询Token</button>
{{end}}
```

---

## 💻 2. 添加JavaScript代码

在 `<script>` 标签中添加以下函数（建议添加在现有的queryToken函数附近）。

### 2.1 检查Session状态（页面加载时）

在页面加载完成后添加：

```javascript
// 页面加载完成后检查Session状态
document.addEventListener('DOMContentLoaded', function() {
    {{if .HasSession}}
        console.log('✅ Session已就绪（自动续期）');
    {{else}}
        console.warn('⚠️ 未能创建Session，请刷新页面');
    {{end}}
});
```

### 2.2 发送验证码函数

```javascript
// 发送验证码
let cooldownTimer = null;

function sendVerifyCode() {
    const wsId = document.getElementById('wsIdInput').value.trim();
    const email = document.getElementById('emailInput').value.trim();
    
    // 验证输入
    if (!wsId || !email) {
        alert('请填写 ws_id 和 email');
        return;
    }
    
    // 验证邮箱格式
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        alert('邮箱格式不正确');
        return;
    }
    
    // 禁用按钮
    const sendBtn = document.getElementById('sendCodeBtn');
    sendBtn.disabled = true;
    sendBtn.textContent = '发送中...';
    
    // 发送请求
    fetch('/flow/token/request-verify-code', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        credentials: 'include', // 重要：携带Cookie
        body: JSON.stringify({
            ws_id: wsId,
            email: email
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // 显示验证码输入区域
            document.getElementById('verifyCodeSection').style.display = 'block';
            document.getElementById('verifyCodeInput').focus();
            
            // 开始60秒冷却
            startCooldown(60);
            
            alert('验证码已发送到您的邮箱，请查收');
        } else {
            alert('发送失败: ' + (data.message || '未知错误'));
            sendBtn.disabled = false;
            sendBtn.textContent = '发送验证码';
        }
    })
    .catch(error => {
        console.error('请求失败:', error);
        alert('网络错误，请稍后重试');
        sendBtn.disabled = false;
        sendBtn.textContent = '发送验证码';
    });
}

// 冷却倒计时
function startCooldown(seconds) {
    const sendBtn = document.getElementById('sendCodeBtn');
    const cooldownHint = document.getElementById('cooldownHint');
    const cooldownSecondsSpan = document.getElementById('cooldownSeconds');
    
    let remaining = seconds;
    sendBtn.disabled = true;
    cooldownHint.style.display = 'block';
    
    // 清除旧的定时器
    if (cooldownTimer) {
        clearInterval(cooldownTimer);
    }
    
    cooldownTimer = setInterval(() => {
        remaining--;
        cooldownSecondsSpan.textContent = remaining;
        
        if (remaining <= 0) {
            clearInterval(cooldownTimer);
            cooldownTimer = null;
            sendBtn.disabled = false;
            sendBtn.textContent = '发送验证码';
            cooldownHint.style.display = 'none';
        }
    }, 1000);
}
```

### 2.3 验证验证码并查询Token函数

```javascript
// 验证验证码并查询Token
function verifyCodeAndQuery() {
    const wsId = document.getElementById('wsIdInput').value.trim();
    const email = document.getElementById('emailInput').value.trim();
    const code = document.getElementById('verifyCodeInput').value.trim();
    const errorDiv = document.getElementById('verifyCodeError');
    
    // 清除之前的错误信息
    errorDiv.style.display = 'none';
    errorDiv.textContent = '';
    
    // 验证输入
    if (!code) {
        errorDiv.textContent = '请输入验证码';
        errorDiv.style.display = 'block';
        return;
    }
    
    if (!/^[0-9]{6}$/.test(code)) {
        errorDiv.textContent = '验证码格式不正确（应为6位数字）';
        errorDiv.style.display = 'block';
        return;
    }
    
    // 禁用按钮
    const verifyBtn = document.getElementById('verifyBtn');
    verifyBtn.disabled = true;
    verifyBtn.textContent = '验证中...';
    
    // 发送验证请求
    fetch('/flow/token/verify-and-query', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        credentials: 'include', // 重要：携带Cookie
        body: JSON.stringify({
            ws_id: wsId,
            email: email,
            code: code
        })
    })
    .then(response => response.json())
    .then(data => {
        verifyBtn.disabled = false;
        verifyBtn.textContent = '验证并查询';
        
        if (data.success) {
            // 显示Token信息（复用现有的displayTokenInfo函数）
            displayTokenInfo(data.data);
            
            // 清空验证码输入
            document.getElementById('verifyCodeInput').value = '';
            
            // 隐藏验证码区域
            document.getElementById('verifyCodeSection').style.display = 'none';
        } else {
            // 显示错误信息
            errorDiv.textContent = data.message || '验证失败';
            errorDiv.style.display = 'block';
            
            // 如果是Session过期错误，提示刷新页面
            if (data.message && data.message.includes('Session')) {
                setTimeout(() => {
                    if (confirm('Session已过期，是否刷新页面？')) {
                        window.location.reload();
                    }
                }, 1000);
            }
        }
    })
    .catch(error => {
        console.error('请求失败:', error);
        errorDiv.textContent = '网络错误，请稍后重试';
        errorDiv.style.display = 'block';
        verifyBtn.disabled = false;
        verifyBtn.textContent = '验证并查询';
    });
}
```

### 2.4 支持Enter键提交

为验证码输入框添加回车键支持：

```javascript
// 验证码输入框支持Enter键
document.getElementById('verifyCodeInput').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        verifyCodeAndQuery();
    }
});
```

---

## 🎨 3. CSS样式建议（可选）

为了更好的用户体验，可以添加以下样式：

```css
/* 验证码输入框聚焦样式 */
#verifyCodeInput:focus {
    outline: none;
    border-color: #3498db;
    box-shadow: 0 0 5px rgba(52, 152, 219, 0.5);
}

/* 按钮禁用样式 */
button:disabled {
    opacity: 0.6;
    cursor: not-allowed !important;
}

/* 按钮悬停效果 */
#sendCodeBtn:hover:not(:disabled) {
    background-color: #2980b9;
}

#verifyBtn:hover:not(:disabled) {
    background-color: #229954;
}

/* 验证码区域动画 */
#verifyCodeSection {
    animation: slideDown 0.3s ease-out;
}

@keyframes slideDown {
    from {
        opacity: 0;
        transform: translateY(-10px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}
```

---

## 🔄 4. 兼容原有查询功能

确保原有的`queryToken()`函数继续工作（当`VerifyCodeEnabled=false`时）：

```javascript
// 原有的queryToken函数保持不变
function queryToken() {
    // ... 现有代码保持不变
}
```

---

## ✅ 5. 测试检查清单

修改完成后，测试以下场景：

### 验证码功能启用时（TOKEN_VERIFY_ENABLED=true）

- [ ] 页面加载后控制台显示 "✅ Session已就绪"
- [ ] 浏览器Cookie中存在 `flow_page_session`
- [ ] 点击"发送验证码"按钮后：
  - [ ] 显示验证码输入框
  - [ ] 按钮禁用60秒
  - [ ] 收到邮件验证码
- [ ] 输入验证码后：
  - [ ] 正确验证码：显示Token信息
  - [ ] 错误验证码：显示错误提示
  - [ ] Enter键可提交
- [ ] 刷新页面后Session保持有效

### 验证码功能关闭时（TOKEN_VERIFY_ENABLED=false）

- [ ] 显示原有的"查询Token"按钮
- [ ] 点击按钮直接查询Token（无需验证码）
- [ ] 功能与之前完全一致

---

## 📝 完整示例代码片段

如果需要完整的代码片段参考，可以查看 `docs/初步思路.md` 中的"前端实现要点"章节。

---

## 🚨 注意事项

1. **所有fetch请求必须带 `credentials: 'include'`**，否则Cookie不会发送
2. **Session过期提示**：当收到Session相关错误时，提示用户刷新页面
3. **错误处理**：妥善处理网络错误和服务端错误
4. **用户体验**：验证码输入框自动聚焦，支持Enter键提交

---

**文档版本**: v1.0  
**最后更新**: 2025-11-05  
**相关文档**: `docs/初步思路.md`、`docs/TOKEN_VERIFY_CONFIG.md`








