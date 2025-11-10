/**
 * AbortController 简单测试
 */

console.log('========================================');
console.log('测试：请求前 abort');
console.log('========================================');

var controller = new AbortController();
console.log('1. 创建 AbortController');
console.log('   signal.aborted:', controller.signal.aborted);

controller.abort();
console.log('2. 调用 abort()');
console.log('   signal.aborted:', controller.signal.aborted);

console.log('3. 发起 fetch 请求...');

return fetch('https://httpbin.org/delay/3', {
    signal: controller.signal
})
.then(function(response) {
    console.log('❌ 失败：请求不应该成功');
    console.log('   Status:', response.status);
    return { test: 'abort-before-fetch', passed: false };
})
.catch(function(error) {
    var errorMsg = String(error);
    console.log('✅ 成功：请求被中止');
    console.log('   错误:', errorMsg);
    
    var isAbortError = errorMsg.indexOf('abort') !== -1;
    return { 
        test: 'abort-before-fetch', 
        passed: isAbortError,
        error: errorMsg
    };
});



