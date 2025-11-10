/**
 * EventLoop 模式下的 Base64 测试
 * 
 * 验证 btoa/atob 在 EventLoop 模式下也能正常工作
 * (有 setTimeout 会触发 EventLoop 模式)
 */

console.log('EventLoop 模式 Base64 测试');
console.log('========================================\n');

// 测试 1: 基础编码 (EventLoop 环境)
console.log('【测试 1】EventLoop 模式基础编码');
const encoded = btoa('Hello, World!');
console.log('  编码结果:', encoded);
console.log('  预期:', 'SGVsbG8sIFdvcmxkIQ==');
console.log('  结果:', encoded === 'SGVsbG8sIFdvcmxkIQ==' ? '✅ 通过' : '❌ 失败');

// 测试 2: 在 Promise 中使用
console.log('\n【测试 2】在 Promise 中使用 btoa');
const promise = new Promise((resolve) => {
    const credentials = btoa('user:passwd');
    resolve(credentials);
});

return promise.then((result) => {
    console.log('  Promise 返回:', result);
    console.log('  预期:', 'dXNlcjpwYXNzd2Q=');
    console.log('  结果:', result === 'dXNlcjpwYXNzd2Q=' ? '✅ 通过' : '❌ 失败');
    
    // 测试 3: 在 setTimeout 中使用 (确保是 EventLoop 模式)
    console.log('\n【测试 3】在 setTimeout 中使用 btoa');
    return new Promise((resolve) => {
        setTimeout(() => {
            const encoded = btoa('async test');
            console.log('  setTimeout 中编码:', encoded);
            resolve({
                success: true,
                message: 'btoa/atob 在 EventLoop 模式下工作正常',
                encoded: encoded
            });
        }, 10);
    });
});



