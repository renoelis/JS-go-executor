/**
 * btoa 兼容性测试
 */

const axios = require('axios');

console.log('[TEST] btoa 兼容性检查测试');
console.log('='.repeat(50));

// 测试 1: 正常使用 Basic Auth（btoa 可用）
console.log('\n[TEST 1] 正常 Basic Auth 测试');

return axios.get('https://httpbin.org/basic-auth/user/pass', {
  auth: {
    username: 'user',
    password: 'pass'
  }
})
  .then(function(response) {
    console.log('[SUCCESS] Basic Auth 工作正常');
    console.log('[STATUS]', response.status);
    return {
      success: true,
      message: 'btoa 可用且 Basic Auth 工作正常',
      status: response.status
    };
  })
  .catch(function(error) {
    if (error.message.indexOf('btoa') !== -1) {
      console.log('[ERROR] btoa 不可用:', error.message);
      return {
        success: false,
        error: 'btoa_not_available',
        message: error.message
      };
    } else {
      console.log('[ERROR] 其他错误:', error.message);
      return {
        success: false,
        error: 'other_error',
        message: error.message
      };
    }
  });
