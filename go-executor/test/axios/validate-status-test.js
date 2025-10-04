// ==================== Axios validateStatus 自定义测试 ====================
const axios = require('axios');

console.log('📋 Axios validateStatus 自定义测试\n');

const TEST_API = 'https://httpbin.org';

var totalTests = 0;
var passedTests = 0;
var failedTests = 0;

// ==================== 测试 1: 默认 validateStatus (2xx 成功) ====================
console.log('📋 测试 1: 默认 validateStatus (2xx 成功)');

var test1 = axios.get(TEST_API + '/status/200')
  .then(function(response) {
    totalTests++;
    console.log('✅ 200 状态码不抛错');
    console.log('   状态码:', response.status);
    passedTests++;
    return true;
  })
  .catch(function(error) {
    totalTests++;
    failedTests++;
    console.log('❌ 200 状态码意外抛错:', error.message);
    return false;
  });

// ==================== 测试 2: 默认 validateStatus (4xx 失败) ====================
console.log('\n📋 测试 2: 默认 validateStatus (4xx 失败)');

var test2 = axios.get(TEST_API + '/status/404')
  .then(function(response) {
    totalTests++;
    failedTests++;
    console.log('❌ 404 状态码应该抛错但没有');
    return false;
  })
  .catch(function(error) {
    totalTests++;
    console.log('✅ 404 状态码正确抛错');
    console.log('   错误信息:', error.message);
    console.log('   状态码:', error.response ? error.response.status : 'N/A');
    
    if (error.response && error.response.status === 404) {
      console.log('   ✓ 默认 validateStatus 验证通过');
      passedTests++;
      return true;
    } else {
      console.log('   ⚠️ 错误对象不正确');
      failedTests++;
      return false;
    }
  });

// ==================== 测试 3: 自定义 validateStatus (接受所有状态码) ====================
console.log('\n📋 测试 3: 自定义 validateStatus (接受所有状态码)');

var test3 = axios.get(TEST_API + '/status/404', {
  validateStatus: function(status) {
    return true;  // 接受所有状态码
  }
})
  .then(function(response) {
    totalTests++;
    console.log('✅ 404 状态码不抛错（自定义验证）');
    console.log('   状态码:', response.status);
    
    if (response.status === 404) {
      console.log('   ✓ 自定义 validateStatus 验证通过');
      passedTests++;
      return true;
    } else {
      console.log('   ⚠️ 状态码不匹配');
      failedTests++;
      return false;
    }
  })
  .catch(function(error) {
    totalTests++;
    failedTests++;
    console.log('❌ 404 状态码意外抛错:', error.message);
    return false;
  });

// ==================== 测试 4: 自定义 validateStatus (只接受 404) ====================
console.log('\n📋 测试 4: 自定义 validateStatus (只接受 404)');

var test4 = axios.get(TEST_API + '/status/404', {
  validateStatus: function(status) {
    return status === 404;  // 只接受 404
  }
})
  .then(function(response) {
    totalTests++;
    console.log('✅ 404 被当作成功（自定义验证）');
    console.log('   状态码:', response.status);
    
    if (response.status === 404) {
      console.log('   ✓ 自定义 404 验证通过');
      passedTests++;
      return true;
    } else {
      console.log('   ⚠️ 状态码不匹配');
      failedTests++;
      return false;
    }
  })
  .catch(function(error) {
    totalTests++;
    failedTests++;
    console.log('❌ 404 状态码意外抛错:', error.message);
    return false;
  });

// ==================== 测试 5: 自定义 validateStatus (拒绝 200) ====================
console.log('\n📋 测试 5: 自定义 validateStatus (拒绝 200)');

var test5 = axios.get(TEST_API + '/status/200', {
  validateStatus: function(status) {
    return status !== 200;  // 拒绝 200
  }
})
  .then(function(response) {
    totalTests++;
    failedTests++;
    console.log('❌ 200 状态码应该抛错但没有');
    return false;
  })
  .catch(function(error) {
    totalTests++;
    console.log('✅ 200 状态码正确抛错（自定义验证）');
    console.log('   错误信息:', error.message);
    
    if (error.response && error.response.status === 200) {
      console.log('   ✓ 自定义拒绝 200 验证通过');
      passedTests++;
      return true;
    } else {
      console.log('   ⚠️ 错误对象不正确');
      failedTests++;
      return false;
    }
  });

// ==================== 测试 6: 自定义 validateStatus (范围验证) ====================
console.log('\n📋 测试 6: 自定义 validateStatus (100-399 成功)');

var test6 = axios.get(TEST_API + '/status/304', {
  validateStatus: function(status) {
    return status >= 100 && status < 400;  // 100-399 都算成功
  }
})
  .then(function(response) {
    totalTests++;
    console.log('✅ 304 状态码不抛错（范围验证）');
    console.log('   状态码:', response.status);
    
    if (response.status === 304) {
      console.log('   ✓ 范围验证通过');
      passedTests++;
      return true;
    } else {
      console.log('   ⚠️ 状态码不匹配');
      failedTests++;
      return false;
    }
  })
  .catch(function(error) {
    totalTests++;
    failedTests++;
    console.log('❌ 304 状态码意外抛错:', error.message);
    return false;
  });

// ==================== 测试 7: validateStatus = false (禁用验证) ====================
console.log('\n📋 测试 7: validateStatus = false (禁用验证)');

var test7 = axios.get(TEST_API + '/status/500', {
  validateStatus: false  // 禁用状态码验证
})
  .then(function(response) {
    totalTests++;
    console.log('✅ 500 状态码不抛错（验证已禁用）');
    console.log('   状态码:', response.status);
    
    if (response.status === 500) {
      console.log('   ✓ 禁用验证通过');
      passedTests++;
      return true;
    } else {
      console.log('   ⚠️ 状态码不匹配');
      failedTests++;
      return false;
    }
  })
  .catch(function(error) {
    totalTests++;
    failedTests++;
    console.log('❌ 500 状态码意外抛错:', error.message);
    return false;
  });

// ==================== 测试 8: validateStatus 与拦截器结合 ====================
console.log('\n📋 测试 8: validateStatus 与拦截器结合');

var instance = axios.create();
var interceptorCalled = false;

instance.interceptors.response.use(
  function(response) {
    interceptorCalled = true;
    console.log('   响应拦截器被调用');
    return response;
  },
  function(error) {
    interceptorCalled = true;
    console.log('   错误拦截器被调用');
    return Promise.reject(error);
  }
);

var test8 = instance.get(TEST_API + '/status/404', {
  validateStatus: function(status) {
    return true;  // 接受所有状态码
  }
})
  .then(function(response) {
    totalTests++;
    console.log('✅ 404 状态码不抛错（拦截器+自定义验证）');
    console.log('   状态码:', response.status);
    console.log('   拦截器调用:', interceptorCalled);
    
    if (response.status === 404 && interceptorCalled) {
      console.log('   ✓ validateStatus 与拦截器结合验证通过');
      passedTests++;
      return true;
    } else {
      console.log('   ⚠️ 验证失败');
      failedTests++;
      return false;
    }
  })
  .catch(function(error) {
    totalTests++;
    failedTests++;
    console.log('❌ 404 状态码意外抛错:', error.message);
    return false;
  });

// ==================== 等待所有测试完成 ====================
console.log('\n⏳ 等待所有测试完成...\n');

return Promise.all([test1, test2, test3, test4, test5, test6, test7, test8])
  .then(function(results) {
    console.log('========================================');
    console.log('📊 validateStatus 测试完成');
    console.log('✅ 通过:', passedTests + '/' + totalTests);
    console.log('❌ 失败:', failedTests + '/' + totalTests);
    console.log('========================================');
    
    return {
      total: totalTests,
      passed: passedTests,
      failed: failedTests,
      tests: results.map(function(passed, index) {
        return {
          name: '测试 ' + (index + 1),
          passed: passed
        };
      })
    };
  });

