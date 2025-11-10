/**
 * Axios + Node.js FormData 简单测试
 */

console.log('=== Axios + FormData 简单测试 ===\n');

const axios = require('axios');
const FormData = require('form-data');

console.log('步骤1: 创建 FormData');
const form = new FormData();

form.append('field1', 'value1');
form.append('field2', 'value2');

console.log('✅ FormData 创建成功');

console.log('\n步骤2: 获取 headers');
const headers = form.getHeaders();
console.log('  headers:', JSON.stringify(headers));

console.log('\n步骤3: 获取 body');
try {
    const buffer = form.getBuffer();
    console.log('  buffer length:', buffer.length);
    console.log('  buffer type:', typeof buffer);
    console.log('✅ getBuffer 成功');
} catch (e) {
    console.log('❌ getBuffer 失败:', e.message);
}

console.log('\n步骤4: 测试 axios.post');
console.log('  注意: axios 需要 FormData 的 body 是什么类型？');
console.log('  - Node.js FormData: 需要 stream 或 buffer');
console.log('  - 浏览器 FormData: 自动处理');

// 使用 httpbin 测试
return axios.post('https://httpbin.org/post', form, {
    headers: {
        ...headers,
        'User-Agent': 'Go-Executor-Test'
    }
})
.then(res => {
    console.log('\n✅ 请求成功');
    console.log('  status:', res.status);
    console.log('  收到字段:', Object.keys(res.data.form || {}));
    return {
        success: true,
        status: res.status,
        fields: res.data.form
    };
})
.catch(err => {
    console.log('\n❌ 请求失败');
    console.log('  错误:', err.message);
    if (err.response) {
        console.log('  状态码:', err.response.status);
        console.log('  响应:', err.response.data);
    }
    return {
        success: false,
        error: err.message
    };
});

