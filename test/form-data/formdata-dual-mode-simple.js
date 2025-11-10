/**
 * FormData 双模式简单测试（无网络依赖）
 * 测试基础 API 功能
 */

console.log("=== FormData 双模式简单测试 ===\n");

var passCount = 0;
var failCount = 0;

function test(name, fn) {
    try {
        console.log('🧪 ' + name);
        fn();
        passCount++;
        console.log('✅ 通过\n');
    } catch (error) {
        failCount++;
        console.error('❌ 失败: ' + error.message + '\n');
    }
}

// ==================== 浏览器 FormData 测试 ====================
test("浏览器 FormData 基础功能", function() {
    var formData = new FormData();
    formData.append('name', 'John');
    formData.append('age', '30');

    if (formData.__isFormData !== true) {
        throw new Error("__isFormData 应该为 true");
    }
    if (formData.__isNodeFormData !== false) {
        throw new Error("__isNodeFormData 应该为 false");
    }
    if (formData.__type !== 'web-formdata') {
        throw new Error("__type 应该为 'web-formdata'");
    }
    if (typeof formData.getHeaders === 'function') {
        throw new Error("浏览器 FormData 不应该有 getHeaders()");
    }

    console.log("  标识正确，方法正确");
});

// ==================== Node.js FormData 测试 ====================
test("Node.js FormData 基础功能", function() {
    var FormData = require('form-data');
    var form = new FormData();

    if (form.__isNodeFormData !== true) {
        throw new Error("__isNodeFormData 应该为 true");
    }
    if (form.__isFormData !== false) {
        throw new Error("__isFormData 应该为 false");
    }
    if (form.__type !== 'nodejs-formdata') {
        throw new Error("__type 应该为 'nodejs-formdata'");
    }

    console.log("  标识正确");
});

test("Node.js FormData append() 方法", function() {
    var FormData = require('form-data');
    var form = new FormData();

    form.append('username', 'alice');
    form.append('email', 'alice@example.com');
    form.append('age', 25);

    console.log("  成功添加 3 个字段");
});

test("Node.js FormData getHeaders() 方法", function() {
    var FormData = require('form-data');
    var form = new FormData();
    form.append('test', 'value');

    var headers = form.getHeaders();
    
    if (!headers || typeof headers !== 'object') {
        throw new Error("getHeaders() 应该返回对象");
    }
    if (!headers['content-type']) {
        throw new Error("headers 缺少 content-type");
    }
    if (!headers['content-type'].includes('multipart/form-data')) {
        throw new Error("content-type 应该包含 'multipart/form-data'");
    }
    if (!headers['content-type'].includes('boundary=')) {
        throw new Error("content-type 应该包含 boundary");
    }

    console.log("  headers: " + JSON.stringify(headers));
});

test("Node.js FormData getBoundary() 方法", function() {
    var FormData = require('form-data');
    var form = new FormData();

    var boundary = form.getBoundary();
    
    if (!boundary || typeof boundary !== 'string') {
        throw new Error("getBoundary() 应该返回字符串");
    }
    if (boundary.length === 0) {
        throw new Error("boundary 不应为空");
    }

    console.log("  boundary: " + boundary);
});

test("Node.js FormData setBoundary() 方法", function() {
    var FormData = require('form-data');
    var form = new FormData();

    var customBoundary = '----TestBoundary123';
    form.setBoundary(customBoundary);

    var boundary = form.getBoundary();
    if (boundary !== customBoundary) {
        throw new Error('boundary 不匹配: 期望 ' + customBoundary + ', 实际 ' + boundary);
    }

    var headers = form.getHeaders();
    if (!headers['content-type'].includes(customBoundary)) {
        throw new Error("headers 中的 boundary 未更新");
    }

    console.log("  自定义 boundary 设置成功");
});

test("Node.js FormData getLengthSync() 方法", function() {
    var FormData = require('form-data');
    var form = new FormData();
    
    form.append('field1', 'value1');
    form.append('field2', 'value2');

    var length = form.getLengthSync();
    
    if (typeof length !== 'number') {
        throw new Error("getLengthSync() 应该返回数字");
    }
    if (length <= 0) {
        throw new Error("length 应该大于 0");
    }

    console.log("  length: " + length + " bytes");
});

test("Node.js FormData getBuffer() 方法", function() {
    var FormData = require('form-data');
    var form = new FormData();
    
    form.append('test', 'hello');

    var buffer = form.getBuffer();
    
    if (!buffer) {
        throw new Error("getBuffer() 应该返回 Buffer");
    }
    if (typeof buffer.length !== 'number') {
        throw new Error("Buffer 应该有 length 属性");
    }
    if (buffer.length === 0) {
        throw new Error("Buffer 不应为空");
    }

  
    console.log("  Buffer 大小: " + buffer.length + " bytes");
});

test("Node.js FormData 添加 Buffer", function() {
    var FormData = require('form-data');
    var form = new FormData();

    var fileContent = Buffer.from('Test file content', 'utf8');
    form.append('file', fileContent, 'test.txt');

    var length = form.getLengthSync();
    if (length <= fileContent.length) {
        throw new Error("FormData 长度应该大于单个字段");
    }

    console.log("  成功添加 Buffer");
    console.log("  FormData 总大小: " + length + " bytes");
});

test("Node.js FormData 内容验证", function() {
    var FormData = require('form-data');
    var form = new FormData();

    form.append('username', 'testuser');
    form.append('password', 'testpass');

    var buffer = form.getBuffer();
    var content = buffer.toString('utf8');

    if (!content.includes('username')) {
        throw new Error("Buffer 应该包含字段名 'username'");
    }
    if (!content.includes('testuser')) {
        throw new Error("Buffer 应该包含字段值 'testuser'");
    }
    if (!content.includes('password')) {
        throw new Error("Buffer 应该包含字段名 'password'");
    }

    var boundary = form.getBoundary();
    if (!content.includes(boundary)) {
        throw new Error("Buffer 应该包含 boundary");
    }

    console.log("  Buffer 内容验证通过");
});

test("两种 FormData 互不干扰", function() {
    // 创建浏览器版
    var browserFormData = new FormData();
    browserFormData.append('browser', 'data');

    // 创建 Node.js 版
    var FormDataClass = require('form-data');
    var nodeFormData = new FormDataClass();
    nodeFormData.append('nodejs', 'data');

    // 验证类型
    if (browserFormData.__isFormData !== true) {
        throw new Error("浏览器版标识错误");
    }
    if (nodeFormData.__isNodeFormData !== true) {
        throw new Error("Node.js 版标识错误");
    }

    // 验证方法
    if (typeof browserFormData.getHeaders === 'function') {
        throw new Error("浏览器版不应有 getHeaders()");
    }
    if (typeof nodeFormData.getHeaders !== 'function') {
        throw new Error("Node.js 版应该有 getHeaders()");
    }

    console.log("  两种 FormData 正确隔离");
});

test("Node.js FormData 边界唯一性", function() {
    var FormData = require('form-data');
    var form1 = new FormData();
    var form2 = new FormData();

    var boundary1 = form1.getBoundary();
    var boundary2 = form2.getBoundary();

    if (boundary1 === boundary2) {
        throw new Error("不同实例的 boundary 应该不同");
    }

    console.log("  boundary1: " + boundary1);
    console.log("  boundary2: " + boundary2);
});

// ==================== 总结 ====================
console.log("\n" + "=".repeat(60));
console.log('测试完成: ' + passCount + ' 通过, ' + failCount + ' 失败');
console.log("=".repeat(60));

if (failCount === 0) {
    console.log("✅ 所有测试通过!");
    return { success: true, passed: passCount, failed: failCount };
} else {
    console.error("❌ 有测试失败");
    return { success: false, passed: passCount, failed: failCount };
}
