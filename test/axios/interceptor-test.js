/**
 * Axios 拦截器测试
 * 测试请求拦截器和响应拦截器功能
 */

const axios = require('axios');

const TEST_API = 'https://jsonplaceholder.typicode.com';

console.log('📋 Axios 拦截器测试');
console.log('='.repeat(50));

// ==================== 测试 1: 请求拦截器 ====================
console.log('\n📋 测试 1: 请求拦截器');

var requestInterceptorCalled = false;

// 创建 axios 实例
var instance1 = axios.create({
  baseURL: TEST_API
});

// 添加请求拦截器
instance1.interceptors.request.use(
  function(config) {
    console.log('   🔧 请求拦截器被调用');
    console.log('   → 原始 URL:', config.url);
    
    // 修改请求配置
    config.headers['X-Intercepted'] = 'true';
    config.headers['X-Request-Time'] = new Date().toISOString();
    
    requestInterceptorCalled = true;
    
    console.log('   → 添加自定义 headers');
    return config;
  },
  function(error) {
    console.log('   ❌ 请求拦截器错误:', error);
    return Promise.reject(error);
  }
);

var test1 = instance1.get('/posts/1')
  .then(function(response) {
    if (requestInterceptorCalled && response.status === 200) {
      console.log('✅ 请求拦截器测试通过');
      return true;
    } else {
      throw new Error('请求拦截器未被调用');
    }
  })
  .catch(function(error) {
    console.log('❌ 请求拦截器测试失败:', error.message);
    return false;
  });

// ==================== 测试 2: 响应拦截器 ====================
console.log('\n📋 测试 2: 响应拦截器');

var responseInterceptorCalled = false;

var instance2 = axios.create({
  baseURL: TEST_API
});

// 添加响应拦截器
instance2.interceptors.response.use(
  function(response) {
    console.log('   🔧 响应拦截器被调用');
    console.log('   → 状态码:', response.status);
    
    // 修改响应数据
    response.data = {
      intercepted: true,
      originalData: response.data,
      timestamp: new Date().toISOString()
    };
    
    responseInterceptorCalled = true;
    
    console.log('   → 响应数据已被修改');
    return response;
  },
  function(error) {
    console.log('   ❌ 响应拦截器错误:', error);
    return Promise.reject(error);
  }
);

var test2 = instance2.get('/posts/1')
  .then(function(response) {
    if (responseInterceptorCalled && 
        response.data.intercepted === true &&
        response.data.originalData.id === 1) {
      console.log('✅ 响应拦截器测试通过');
      console.log('   ✓ 响应数据已被成功修改');
      return true;
    } else {
      throw new Error('响应拦截器未正确工作');
    }
  })
  .catch(function(error) {
    console.log('❌ 响应拦截器测试失败:', error.message);
    return false;
  });

// ==================== 测试 3: 多个拦截器链 ====================
console.log('\n📋 测试 3: 多个拦截器链');

var instance3 = axios.create({
  baseURL: TEST_API
});

var interceptorOrder = [];

// 添加第一个请求拦截器
instance3.interceptors.request.use(function(config) {
  interceptorOrder.push('request-1');
  config.headers['X-Interceptor-1'] = 'true';
  return config;
});

// 添加第二个请求拦截器
instance3.interceptors.request.use(function(config) {
  interceptorOrder.push('request-2');
  config.headers['X-Interceptor-2'] = 'true';
  return config;
});

// 添加第一个响应拦截器
instance3.interceptors.response.use(function(response) {
  interceptorOrder.push('response-1');
  return response;
});

// 添加第二个响应拦截器
instance3.interceptors.response.use(function(response) {
  interceptorOrder.push('response-2');
  return response;
});

var test3 = instance3.get('/posts/1')
  .then(function(response) {
    console.log('   拦截器调用顺序:', interceptorOrder.join(' → '));
    
    // 请求拦截器应该倒序执行，响应拦截器正序执行
    var expectedOrder = ['request-2', 'request-1', 'response-1', 'response-2'];
    var orderCorrect = true;
    
    for (var i = 0; i < expectedOrder.length; i++) {
      if (interceptorOrder[i] !== expectedOrder[i]) {
        orderCorrect = false;
        break;
      }
    }
    
    if (orderCorrect && response.status === 200) {
      console.log('✅ 多个拦截器链测试通过');
      console.log('   ✓ 拦截器执行顺序正确');
      return true;
    } else {
      throw new Error('拦截器执行顺序不正确');
    }
  })
  .catch(function(error) {
    console.log('❌ 多个拦截器链测试失败:', error.message);
    return false;
  });

// ==================== 测试 4: 错误拦截器 ====================
console.log('\n📋 测试 4: 错误拦截器');

var errorInterceptorCalled = false;

var instance4 = axios.create({
  baseURL: TEST_API
});

// 添加错误响应拦截器
instance4.interceptors.response.use(
  function(response) {
    return response;
  },
  function(error) {
    console.log('   🔧 错误拦截器被调用');
    console.log('   → 错误状态码:', error.response ? error.response.status : 'unknown');
    
    errorInterceptorCalled = true;
    
    // 可以在这里统一处理错误
    error.intercepted = true;
    
    return Promise.reject(error);
  }
);

var test4 = instance4.get('/posts/99999999')
  .then(function(response) {
    console.log('❌ 应该返回错误，但请求成功了');
    return false;
  })
  .catch(function(error) {
    if (errorInterceptorCalled && error.intercepted === true) {
      console.log('✅ 错误拦截器测试通过');
      console.log('   ✓ 错误被正确拦截');
      return true;
    } else {
      console.log('❌ 错误拦截器测试失败');
      return false;
    }
  });

// ==================== 测试 5: 移除拦截器 ====================
console.log('\n📋 测试 5: 移除拦截器');

var instance5 = axios.create({
  baseURL: TEST_API
});

var removedInterceptorCalled = false;

// 添加拦截器并获取 ID
var interceptorId = instance5.interceptors.request.use(function(config) {
  removedInterceptorCalled = true;
  return config;
});

// 移除拦截器
instance5.interceptors.request.eject(interceptorId);

var test5 = instance5.get('/posts/1')
  .then(function(response) {
    if (!removedInterceptorCalled && response.status === 200) {
      console.log('✅ 移除拦截器测试通过');
      console.log('   ✓ 拦截器已被成功移除');
      return true;
    } else {
      throw new Error('拦截器未被成功移除');
    }
  })
  .catch(function(error) {
    console.log('❌ 移除拦截器测试失败:', error.message);
    return false;
  });

// ==================== 等待所有测试完成 ====================
console.log('\n⏳ 等待所有测试完成...\n');

return Promise.all([test1, test2, test3, test4, test5])
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
    console.log('📊 Axios 拦截器测试完成');
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

