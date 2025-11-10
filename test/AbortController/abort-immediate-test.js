/**
 * AbortController 立即取消测试
 * 测试在请求发起前就取消的情况
 */

console.log('========================================');
console.log('AbortController 立即取消测试');
console.log('========================================\n');

// 测试 1: 请求前就已经取消
console.log('【测试 1】请求前取消');
console.log('说明: 创建 AbortController 后立即 abort，然后尝试 fetch');

var controller1 = new AbortController();
controller1.abort(); // 立即取消

console.log('  Signal.aborted:', controller1.signal.aborted);

return fetch('https://httpbin.org/delay/3', {
    signal: controller1.signal
})
.then(function(response) {
    console.log('❌ 测试失败：请求不应该成功');
    console.log('   Status:', response.status);
    return { success: false, reason: 'Request should have been aborted' };
})
.catch(function(error) {
    console.log('✅ 测试通过：请求被正确中止');
    console.log('   错误信息:', String(error));
    return { success: true, error: String(error) };
})
.then(function(result) {
    console.log('\n========================================');
    console.log('测试完成');
    console.log('========================================');
    return result;
});

