/**
 * 测试 Node.js FormData 是否支持 forEach
 */

console.log('=== Node.js FormData forEach 测试 ===\n');

const FormData = require('form-data');
const form = new FormData();

form.append('name', 'John');
form.append('email', 'john@test.com');
form.append('age', '30');

console.log('步骤 1: 检查 forEach 方法是否存在');
console.log('  typeof form.forEach:', typeof form.forEach);

if (typeof form.forEach === 'function') {
    console.log('  ✅ forEach 方法存在\n');
    
    console.log('步骤 2: 尝试调用 forEach');
    try {
        let count = 0;
        form.forEach(function(value, key) {
            count++;
            console.log('  [' + count + '] ' + key + ':', value);
        });
        console.log('  ✅ forEach 调用成功，共 ' + count + ' 个字段\n');
    } catch (e) {
        console.log('  ❌ forEach 调用失败:', e.message, '\n');
    }
} else {
    console.log('  ❌ forEach 方法不存在\n');
    
    console.log('Node.js FormData (form-data 模块) 标准方法:');
    console.log('  - append(name, value, [options])');
    console.log('  - getHeaders()');
    console.log('  - getBoundary()');
    console.log('  - setBoundary(boundary)');
    console.log('  - getLength(callback)');
    console.log('  - getBuffer()');
    console.log('  - submit(url, callback)');
    console.log('');
    console.log('⚠️  Node.js FormData 不支持 forEach!');
    console.log('');
    console.log('如果需要遍历,可以:');
    console.log('  1. 使用 Web API FormData (全局 FormData)');
    console.log('  2. 自己维护字段列表');
}

return {
    hasForEach: typeof form.forEach === 'function',
    type: 'nodejs-formdata',
    message: typeof form.forEach === 'function' 
        ? 'Node.js FormData 支持 forEach' 
        : 'Node.js FormData 不支持 forEach'
};

