# test-tool.html 验证码功能集成指南

由于 `test-tool.html` 文件已被压缩，本文档提供两种方案集成验证码功能。

---

## 📋 方案选择

### 方案A：使用独立JS模块（推荐，简单快速）✅

**优点**：
- ✅ 无需修改压缩后的HTML
- ✅ 代码独立，易于维护
- ✅ 可以随时禁用

**缺点**：
- ⚠️ 需要手动添加HTML元素（Token查询区域）

### 方案B：完全重新构建HTML

**优点**：
- ✅ 完整集成所有功能
- ✅ 可以优化布局

**缺点**：
- ⚠️ 需要重新格式化压缩的HTML
- ⚠️ 工作量较大

---

## 🚀 方案A：使用独立JS模块（推荐）

### 步骤1：在HTML中引入验证码JS模块

在 `test-tool.html` 的 `</body>` 标签之前添加：

```html
{{if .VerifyCodeEnabled}}
<script>
    // 从后端传递的配置
    const verifyCodeEnabled = true;
    const hasSession = {{.HasSession}};
</script>
<script src="/flow/assets/verify-code.js"></script>
{{end}}
```

**如何找到插入位置**：

由于HTML已压缩，找到 `</body>` 标签（应该在文件末尾），在它之前插入上述代码。

### 步骤2：添加验证码UI元素

在Token查询的modal或表单区域，添加以下HTML：

```html
<!-- 在"查询 Token"按钮所在的区域添加 -->
{{if .VerifyCodeEnabled}}
<!-- 发送验证码按钮 -->
<button type="button" id="sendCodeBtn" onclick="sendVerifyCode()" 
        style="padding:10px 20px;background:#3498db;color:#fff;border:none;border-radius:8px;cursor:pointer;font-weight:600;">
    📧 发送验证码
</button>

<!-- 冷却提示 -->
<div id="cooldownHint" style="margin-top:10px;font-size:12px;color:#e74c3c;display:none;">
    请等待 <span id="cooldownSeconds">60</span> 秒后再次发送
</div>

<!-- 验证码输入区域 -->
<div id="verifyCodeSection" style="display:none;margin-top:15px;">
    <div style="display:flex;gap:10px;align-items:flex-start;">
        <div style="flex:1;">
            <input type="text" id="verifyCodeInput" placeholder="请输入6位验证码" 
                   maxlength="6" pattern="[0-9]{6}"
                   style="width:100%;padding:10px;border:1px solid #ddd;border-radius:4px;font-size:14px;">
            <div id="verifyCodeError" style="color:#e74c3c;font-size:12px;margin-top:5px;display:none;"></div>
        </div>
        <button type="button" id="verifyBtn" onclick="verifyCodeAndQuery()"
                style="padding:10px 20px;background:#27ae60;color:#fff;border:none;border-radius:4px;cursor:pointer;white-space:nowrap;font-weight:600;">
            ✅ 验证并查询
        </button>
    </div>
    <div style="margin-top:10px;font-size:12px;color:#7f8c8d;">
        验证码已发送到您的邮箱，有效期5分钟
    </div>
</div>
{{else}}
<!-- 原有的直接查询按钮 -->
<button onclick="queryToken()">查询Token</button>
{{end}}
```

### 步骤3：配置路由提供JS文件

在 `router/router.go` 中添加静态资源路由：

```go
// 在其他静态资源路由后添加
flowGroup.GET("/assets/verify-code.js", func(c *gin.Context) {
    c.Header("Content-Type", "application/javascript; charset=utf-8")
    content, err := os.ReadFile("templates/verify-code.js")
    if err != nil {
        c.String(404, "File not found")
        return
    }
    c.String(200, string(content))
})
```

### 步骤4：定义Token显示函数（可选）

如果需要自定义Token显示方式，在HTML的`<script>`标签中添加：

```javascript
// 显示Token查询结果
function displayTokenResult(tokenData) {
    // 可以复用现有的modal显示逻辑，或自定义显示
    console.log('Token信息:', tokenData);
    
    // 示例：显示在alert中
    let message = '✅ Token查询成功！\n\n';
    message += 'Access Token: ' + tokenData.access_token + '\n';
    message += 'Email: ' + tokenData.email + '\n';
    message += 'WsID: ' + tokenData.ws_id + '\n';
    if (tokenData.is_active) {
        message += '状态: ✅ 激活\n';
    } else {
        message += '状态: ❌ 未激活\n';
    }
    
    alert(message);
    
    // 或者填充到输入框
    const tokenInput = document.getElementById('accessToken');
    if (tokenInput) {
        tokenInput.value = tokenData.access_token;
    }
}
```

---

## 🛠️ 方案B：完全重新构建HTML（可选）

如果你希望完全重新构建HTML文件，可以：

### 步骤1：创建格式化脚本

创建 `scripts/beautify-html.js`：

```javascript
#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const beautify = require('js-beautify').html;

const INPUT_FILE = path.join(__dirname, '../templates/test-tool.html');
const OUTPUT_FILE = path.join(__dirname, '../templates/test-tool.source.html');

console.log('📝 格式化 HTML 文件...');

const htmlContent = fs.readFileSync(INPUT_FILE, 'utf-8');

const beautifiedHTML = beautify(htmlContent, {
    indent_size: 2,
    indent_char: ' ',
    max_preserve_newlines: 2,
    preserve_newlines: true,
    keep_array_indentation: false,
    break_chained_methods: false,
    indent_scripts: 'keep',
    brace_style: 'collapse',
    space_before_conditional: true,
    unescape_strings: false,
    jslint_happy: false,
    end_with_newline: true,
    wrap_line_length: 0,
    indent_inner_html: false,
    comma_first: false,
    e4x: false,
    indent_empty_lines: false
});

fs.writeFileSync(OUTPUT_FILE, beautifiedHTML);

console.log('✅ 格式化完成！输出文件:', OUTPUT_FILE);
console.log('📝 现在可以编辑 test-tool.source.html，完成后运行压缩脚本');
```

### 步骤2：安装依赖并运行

```bash
npm install --save-dev js-beautify
node scripts/beautify-html.js
```

### 步骤3：修改源文件

编辑 `templates/test-tool.source.html`，添加验证码功能（参考 `docs/FRONTEND_MODIFICATIONS.md`）

### 步骤4：重新压缩

修改 `scripts/minify-html.js`，将输入文件改为 `test-tool.source.html`：

```javascript
const INPUT_FILE = path.join(__dirname, '../templates/test-tool.source.html');
const OUTPUT_FILE = path.join(__dirname, '../templates/test-tool.html');
```

然后运行：

```bash
node scripts/minify-html.js
```

---

## 🎯 推荐流程（方案A）

1. ✅ 在 `router/router.go` 添加 `/flow/assets/verify-code.js` 路由
2. ✅ 在压缩的 `test-tool.html` 中找到 `</body>` 标签，在之前添加JS引用
3. ✅ 在Token查询modal/区域添加验证码UI元素
4. ✅ 可选：添加 `displayTokenResult` 函数自定义显示
5. ✅ 重启服务测试

---

## 📝 快速修改指导（针对压缩HTML）

由于HTML已压缩成一行，修改时：

### 1. 找到插入点

使用文本编辑器的搜索功能（Ctrl+F / Cmd+F）：

- 搜索 `</body>` - 在此之前插入JS引用
- 搜索 `查询 Token` 或 `showTokenQuery` - 在此附近添加验证码按钮

### 2. 插入代码

**提示**：插入时不需要换行，直接在搜索到的位置插入压缩后的代码即可。

**示例 - JS引用（压缩版）**：

```html
{{if .VerifyCodeEnabled}}<script>const verifyCodeEnabled=true;const hasSession={{.HasSession}};</script><script src="/flow/assets/verify-code.js"></script>{{end}}
```

**示例 - 验证码按钮（压缩版）**：

```html
{{if .VerifyCodeEnabled}}<button id="sendCodeBtn" onclick="sendVerifyCode()" style="padding:10px 20px;background:#3498db;color:#fff;border:none;border-radius:8px;cursor:pointer;font-weight:600">📧 发送验证码</button><div id="cooldownHint" style="margin-top:10px;font-size:12px;color:#e74c3c;display:none">请等待 <span id="cooldownSeconds">60</span> 秒后再次发送</div><div id="verifyCodeSection" style="display:none;margin-top:15px"><div style="display:flex;gap:10px"><div style="flex:1"><input type="text" id="verifyCodeInput" placeholder="请输入6位验证码" maxlength="6" pattern="[0-9]{6}" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:4px"><div id="verifyCodeError" style="color:#e74c3c;font-size:12px;margin-top:5px;display:none"></div></div><button id="verifyBtn" onclick="verifyCodeAndQuery()" style="padding:10px 20px;background:#27ae60;color:#fff;border:none;border-radius:4px;cursor:pointer;white-space:nowrap;font-weight:600">✅ 验证并查询</button></div></div>{{else}}<button onclick="queryToken()">查询Token</button>{{end}}
```

---

## ✅ 验证清单

修改完成后，检查以下内容：

- [ ] `/flow/assets/verify-code.js` 路由已配置
- [ ] `verifyCodeEnabled` 和 `hasSession` 变量已定义
- [ ] `verify-code.js` 已引入
- [ ] 验证码UI元素已添加
- [ ] `displayTokenResult` 函数已定义（可选）
- [ ] 重启服务
- [ ] 访问测试工具页面，F12检查是否有JS错误
- [ ] 测试发送验证码功能
- [ ] 测试验证码验证功能

---

## 🐛 常见问题

### Q1: 点击按钮没有反应？
**A**: 检查浏览器控制台是否有JS错误，确认 `verify-code.js` 已正确加载

### Q2: 提示"Session无效"？
**A**: 检查后端Session服务是否启用（`PAGE_SESSION_ENABLED=true`）

### Q3: 找不到HTML插入位置？
**A**: 使用VS Code等编辑器的格式化功能临时格式化HTML，修改后再压缩

### Q4: 想恢复原始HTML？
**A**: 从Git历史恢复，或联系我获取未压缩的源文件

---

**文档版本**: v1.0  
**最后更新**: 2025-11-05  
**相关文档**: `docs/FRONTEND_MODIFICATIONS.md`、`templates/verify-code.js`







