/**
 * FormData EventLoop 模式测试
 * 测试在异步环境下 FormData 是否正常工作
 */

console.log('=== FormData EventLoop 模式测试 ===\n');

// 测试1: 同步创建 FormData
console.log('测试1: 同步创建浏览器 FormData');
try {
    var fd1 = new FormData();
    console.log('✅ 同步创建成功');
    fd1.append('test', 'value');
    console.log('✅ append 成功');
} catch (e) {
    console.log('❌ 同步创建失败: ' + e.message);
}

// 测试2: Promise 环境下创建 FormData
console.log('\n测试2: Promise 环境下创建 FormData');

return new Promise(function(resolve, reject) {
    try {
        console.log('  在 Promise 中创建 FormData...');
        var fd2 = new FormData();
        console.log('  ✅ Promise 中创建成功');
        
        fd2.append('field', 'value');
        console.log('  ✅ Promise 中 append 成功');
        
        resolve({ success: true, message: 'EventLoop 模式下 FormData 正常' });
    } catch (e) {
        console.log('  ❌ Promise 中失败: ' + e.message);
        console.log('  Stack: ' + e.stack);
        reject({ success: false, error: e.message });
    }
});

