/**
 * AbortController 请求中取消测试
 * 
 * 测试目标: 验证新的异步 Fetch 实现可以在请求进行中取消
 * 
 * 关键改进:
 * 1. 使用 channel 代替 context 作为取消信号
 * 2. HTTP 请求在独立的 goroutine 中执行
 * 3. 支持通过 close(abortCh) 中断进行中的请求
 */

const controller = new AbortController();
const signal = controller.signal;

console.log('✅ 测试1: 在 500ms 后取消正在进行的请求');

// 监听 abort 事件
signal.addEventListener('abort', () => {
  console.log('✅ abort 事件已触发');
});

// 500ms 后取消请求
setTimeout(() => {
  console.log('⏱️  500ms 已到，调用 controller.abort()');
  controller.abort();
  console.log('✅ abort() 已调用，signal.aborted =', signal.aborted);
}, 500);

// 发起一个会超时的请求 (httpbin.org/delay/5 会延迟 5 秒才响应)
console.log('🚀 发起请求: GET https://httpbin.org/delay/5');

return fetch('https://httpbin.org/delay/5', { 
  signal: signal,
  timeout: 10000 // 10秒超时
})
  .then(response => {
    console.log('❌ 错误: 请求不应该成功，应该被中断');
    return { 
      error: '请求应该被 abort，但却成功了',
      status: response.status 
    };
  })
  .catch(error => {
    console.log('✅ 请求被成功取消，错误信息:', error.message || error);
    
    // 验证是 abort 错误而不是超时错误
    const errorMsg = error.message || error.toString();
    if (errorMsg.includes('abort')) {
      console.log('✅ 确认是 abort 错误');
      return { 
        success: true, 
        message: '请求成功在进行中被取消',
        aborted: signal.aborted
      };
    } else {
      console.log('⚠️  错误信息不包含 abort:', errorMsg);
      return { 
        success: false, 
        message: '错误类型不正确',
        error: errorMsg
      };
    }
  })
  .then(result => {
    console.log('\n📊 最终结果:', JSON.stringify(result, null, 2));
    return result;
  });



