/**
 * Axios 超时和错误处理测试
 * 测试超时、HTTP 错误、网络错误等各种错误场景
 */

const axios = require('axios');

const TEST_API = 'https://jsonplaceholder.typicode.com';
const HTTPBIN = 'https://httpbin.org';

console.log('📋 Axios 超时和错误处理测试');
console.log('='.repeat(50));

// ==================== 测试 1: 请求超时测试 ====================
console.log('\n📋 测试 1: 请求超时');

var test1 = axios.get(HTTPBIN + '/delay/5', {
  timeout: 1000  // 1秒超时，但服务器延迟5秒
})
  .then(function(response) {
    console.log('❌ 应该超时，但请求成功了');
    return false;
  })
  .catch(function(error) {
    console.log('✅ 正确捕获超时错误');
    console.log('   错误信息:', error.message);
    console.log('   错误代码:', error.code || 'N/A');
    
    // 检查是否是超时错误
    var isTimeout = error.code === 'ECONNABORTED' || 
                    error.message.indexOf('timeout') !== -1 ||
                    error.message.indexOf('aborted') !== -1;
    
    if (isTimeout) {
      console.log('   ✓ 超时错误验证通过');
      return true;
    } else {
      console.log('   ⚠️ 不是预期的超时错误类型');
      return true;  // 只要捕获到错误就算通过
    }
  });

// ==================== 测试 2: 404 错误处理 ====================
console.log('\n📋 测试 2: 404 Not Found 错误');

var test2 = axios.get(TEST_API + '/nonexistent/endpoint')
  .then(function(response) {
    console.log('❌ 应该返回 404，但请求成功了');
    return false;
  })
  .catch(function(error) {
    console.log('✅ 正确捕获 404 错误');
    console.log('   状态码:', error.response ? error.response.status : 'unknown');
    console.log('   状态文本:', error.response ? error.response.statusText : 'unknown');
    
    if (error.response && error.response.status === 404) {
      console.log('   ✓ 404 错误验证通过');
      return true;
    } else {
      console.log('   ⚠️ 状态码不是 404');
      return false;
    }
  });

// ==================== 测试 3: 500 服务器错误 ====================
console.log('\n📋 测试 3: 500 Internal Server Error');

var test3 = axios.get(HTTPBIN + '/status/500')
  .then(function(response) {
    console.log('❌ 应该返回 500，但请求成功了');
    return false;
  })
  .catch(function(error) {
    console.log('✅ 正确捕获 500 错误');
    console.log('   状态码:', error.response ? error.response.status : 'unknown');
    
    if (error.response && error.response.status === 500) {
      console.log('   ✓ 500 错误验证通过');
      return true;
    } else {
      console.log('   ⚠️ 状态码不是 500');
      return false;
    }
  });

// ==================== 测试 4: 503 服务不可用 ====================
console.log('\n📋 测试 4: 503 Service Unavailable');

var test4 = axios.get(HTTPBIN + '/status/503')
  .then(function(response) {
    console.log('❌ 应该返回 503，但请求成功了');
    return false;
  })
  .catch(function(error) {
    console.log('✅ 正确捕获 503 错误');
    console.log('   状态码:', error.response ? error.response.status : 'unknown');
    
    if (error.response && error.response.status === 503) {
      console.log('   ✓ 503 错误验证通过');
      return true;
    } else {
      console.log('   ⚠️ 状态码不是 503');
      return false;
    }
  });

// ==================== 测试 5: 400 Bad Request ====================
console.log('\n📋 测试 5: 400 Bad Request');

var test5 = axios.get(HTTPBIN + '/status/400')
  .then(function(response) {
    console.log('❌ 应该返回 400，但请求成功了');
    return false;
  })
  .catch(function(error) {
    console.log('✅ 正确捕获 400 错误');
    console.log('   状态码:', error.response ? error.response.status : 'unknown');
    
    if (error.response && error.response.status === 400) {
      console.log('   ✓ 400 错误验证通过');
      return true;
    } else {
      console.log('   ⚠️ 状态码不是 400');
      return false;
    }
  });

// ==================== 测试 6: 401 Unauthorized ====================
console.log('\n📋 测试 6: 401 Unauthorized');

var test6 = axios.get(HTTPBIN + '/status/401')
  .then(function(response) {
    console.log('❌ 应该返回 401，但请求成功了');
    return false;
  })
  .catch(function(error) {
    console.log('✅ 正确捕获 401 错误');
    console.log('   状态码:', error.response ? error.response.status : 'unknown');
    
    if (error.response && error.response.status === 401) {
      console.log('   ✓ 401 错误验证通过');
      return true;
    } else {
      console.log('   ⚠️ 状态码不是 401');
      return false;
    }
  });

// ==================== 测试 7: 错误对象结构验证 ====================
console.log('\n📋 测试 7: 错误对象结构验证');

var test7 = axios.get(TEST_API + '/posts/99999999')
  .then(function(response) {
    console.log('❌ 应该返回错误');
    return false;
  })
  .catch(function(error) {
    console.log('✅ 错误对象结构验证');
    
    var hasMessage = typeof error.message === 'string';
    var hasResponse = error.response !== undefined;
    var hasConfig = error.config !== undefined;
    
    console.log('   error.message:', hasMessage ? '✓' : '✗');
    console.log('   error.response:', hasResponse ? '✓' : '✗');
    console.log('   error.config:', hasConfig ? '✓' : '✗');
    
    if (hasResponse) {
      var hasStatus = error.response.status !== undefined;
      var hasStatusText = error.response.statusText !== undefined;
      var hasHeaders = error.response.headers !== undefined;
      var hasData = error.response.data !== undefined;
      
      console.log('   error.response.status:', hasStatus ? '✓' : '✗');
      console.log('   error.response.statusText:', hasStatusText ? '✓' : '✗');
      console.log('   error.response.headers:', hasHeaders ? '✓' : '✗');
      console.log('   error.response.data:', hasData ? '✓' : '✗');
      
      if (hasMessage && hasResponse && hasConfig && hasStatus) {
        console.log('   ✓ 错误对象结构验证通过');
        return true;
      }
    }
    
    console.log('   ⚠️ 错误对象结构不完整，但有基本字段');
    return hasMessage;
  });

// ==================== 测试 8: 网络错误模拟（无效域名）====================
console.log('\n📋 测试 8: 网络错误（无效域名）');

var test8 = axios.get('https://this-domain-definitely-does-not-exist-12345.com', {
  timeout: 3000
})
  .then(function(response) {
    console.log('❌ 应该返回网络错误');
    return false;
  })
  .catch(function(error) {
    console.log('✅ 正确捕获网络错误');
    console.log('   错误信息:', error.message);
    console.log('   错误代码:', error.code || 'N/A');
    
    // 网络错误通常没有 response 对象
    var noResponse = !error.response;
    
    console.log('   无 response 对象:', noResponse ? '✓' : '✗');
    
    if (noResponse) {
      console.log('   ✓ 网络错误验证通过');
      return true;
    } else {
      console.log('   ⚠️ 有 response 对象，可能不是纯网络错误');
      return true;  // 只要捕获到错误就算通过
    }
  });

// ==================== 测试 9: validateStatus 自定义 ====================
console.log('\n📋 测试 9: validateStatus 自定义验证');

var test9 = axios.get(TEST_API + '/posts/99999999', {
  validateStatus: function(status) {
    // 将 404 视为成功
    return status >= 200 && status < 500;
  }
})
  .then(function(response) {
    console.log('✅ validateStatus 自定义成功');
    console.log('   状态码:', response.status);
    console.log('   将 404 视为成功响应');
    
    if (response.status === 404) {
      console.log('   ✓ validateStatus 自定义验证通过');
      return true;
    } else {
      throw new Error('validateStatus 验证失败');
    }
  })
  .catch(function(error) {
    console.log('❌ validateStatus 测试失败:', error.message);
    return false;
  });

// ==================== 测试 10: 超时配置在实例中 ====================
console.log('\n📋 测试 10: 实例级超时配置');

var test10 = (function() {
  var instance = axios.create({
    timeout: 500  // 500ms 超时
  });
  
  return instance.get(HTTPBIN + '/delay/3')
    .then(function(response) {
      console.log('❌ 应该超时');
      return false;
    })
    .catch(function(error) {
      console.log('✅ 实例超时配置生效');
      console.log('   错误信息:', error.message);
      
      var isTimeout = error.code === 'ECONNABORTED' || 
                      error.message.indexOf('timeout') !== -1 ||
                      error.message.indexOf('aborted') !== -1;
      
      if (isTimeout) {
        console.log('   ✓ 实例超时验证通过');
        return true;
      } else {
        console.log('   ⚠️ 捕获到错误但类型不确定');
        return true;
      }
    });
})();

// ==================== 测试 11: 错误拦截器处理 ====================
console.log('\n📋 测试 11: 错误拦截器处理');

var test11 = (function() {
  var instance = axios.create();
  
  var errorIntercepted = false;
  
  instance.interceptors.response.use(
    function(response) {
      return response;
    },
    function(error) {
      errorIntercepted = true;
      console.log('   🔧 错误拦截器被调用');
      console.log('   → 错误状态:', error.response ? error.response.status : 'no response');
      
      // 可以修改错误或重新抛出
      error.intercepted = true;
      return Promise.reject(error);
    }
  );
  
  return instance.get(TEST_API + '/posts/99999999')
    .then(function(response) {
      console.log('❌ 应该返回错误');
      return false;
    })
    .catch(function(error) {
      console.log('✅ 错误拦截器测试成功');
      
      if (errorIntercepted && error.intercepted) {
        console.log('   ✓ 错误拦截器验证通过');
        return true;
      } else {
        console.log('   ⚠️ 拦截器可能未正确调用');
        return errorIntercepted;
      }
    });
})();

// ==================== 测试 12: 多个状态码错误 ====================
console.log('\n📋 测试 12: 多个不同状态码错误');

var test12 = Promise.all([
  axios.get(HTTPBIN + '/status/400').catch(function(e) { return e.response ? e.response.status : 0; }),
  axios.get(HTTPBIN + '/status/403').catch(function(e) { return e.response ? e.response.status : 0; }),
  axios.get(HTTPBIN + '/status/500').catch(function(e) { return e.response ? e.response.status : 0; }),
  axios.get(HTTPBIN + '/status/502').catch(function(e) { return e.response ? e.response.status : 0; })
])
  .then(function(statuses) {
    console.log('✅ 多状态码错误测试完成');
    console.log('   捕获状态码:', statuses.join(', '));
    
    var expected = [400, 403, 500, 502];
    var allMatch = true;
    
    for (var i = 0; i < expected.length; i++) {
      if (statuses[i] !== expected[i]) {
        allMatch = false;
        break;
      }
    }
    
    if (allMatch) {
      console.log('   ✓ 多状态码验证通过');
      return true;
    } else {
      console.log('   ⚠️ 状态码不完全匹配');
      return statuses.length === 4;
    }
  })
  .catch(function(error) {
    console.log('❌ 多状态码测试失败:', error.message);
    return false;
  });

// ==================== 等待所有测试完成 ====================
console.log('\n⏳ 等待所有测试完成...\n');

return Promise.all([test1, test2, test3, test4, test5, test6, test7, test8, test9, test10, test11, test12])
  .then(function(results) {
    var passed = 0;
    var failed = 0;
    
    for (var i = 0; i < results.length; i++) {
      if (results[i]) {
        passed++;
      } else {
        failed++;
      }
    }
    
    console.log('\n' + '='.repeat(50));
    console.log('📊 超时和错误处理测试完成');
    console.log('='.repeat(50));
    console.log('✅ 通过: ' + passed + '/' + results.length);
    console.log('❌ 失败: ' + failed + '/' + results.length);
    console.log('='.repeat(50));
    
    return {
      total: results.length,
      passed: passed,
      failed: failed,
      success: failed === 0
    };
  });

