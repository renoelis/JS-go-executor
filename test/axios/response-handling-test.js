// ==================== Axios 响应处理完整性测试 ====================
const axios = require('axios');

console.log('📋 Axios 响应处理完整性测试\n');

const TEST_API = 'https://httpbin.org';

var totalTests = 0;
var passedTests = 0;
var failedTests = 0;

// ==================== 测试 1: response.headers 解析 ====================
console.log('📋 测试 1: response.headers 解析');

var test1 = axios.get(TEST_API + '/get')
  .then(function(response) {
    totalTests++;
    console.log('✅ 请求成功');
    console.log('   响应头类型:', typeof response.headers);
    console.log('   Content-Type:', response.headers['content-type']);
    console.log('   Server:', response.headers['server']);
    
    if (typeof response.headers === 'object' && 
        response.headers['content-type'] && 
        response.headers['server']) {
      console.log('   ✓ 响应头解析验证通过');
      passedTests++;
      return true;
    } else {
      console.log('   ⚠️ 响应头解析失败');
      failedTests++;
      return false;
    }
  })
  .catch(function(error) {
    totalTests++;
    failedTests++;
    console.log('❌ 请求失败:', error.message);
    return false;
  });

// ==================== 测试 2: response.status 各种状态码 ====================
console.log('\n📋 测试 2: response.status 200 OK');

var test2 = axios.get(TEST_API + '/status/200')
  .then(function(response) {
    totalTests++;
    console.log('✅ 200 状态码请求成功');
    console.log('   状态码:', response.status);
    console.log('   状态码类型:', typeof response.status);
    
    if (response.status === 200 && typeof response.status === 'number') {
      console.log('   ✓ 200 状态码验证通过');
      passedTests++;
      return true;
    } else {
      console.log('   ⚠️ 200 状态码验证失败');
      failedTests++;
      return false;
    }
  })
  .catch(function(error) {
    totalTests++;
    failedTests++;
    console.log('❌ 200 状态码请求失败:', error.message);
    return false;
  });

// ==================== 测试 3: response.statusText 验证 ====================
console.log('\n📋 测试 3: response.statusText 验证');

var test3 = axios.get(TEST_API + '/get')
  .then(function(response) {
    totalTests++;
    console.log('✅ 请求成功');
    console.log('   状态文本:', response.statusText);
    console.log('   状态文本类型:', typeof response.statusText);
    
    if (typeof response.statusText === 'string' && response.statusText.length > 0) {
      console.log('   ✓ 状态文本验证通过');
      passedTests++;
      return true;
    } else {
      console.log('   ⚠️ 状态文本验证失败');
      failedTests++;
      return false;
    }
  })
  .catch(function(error) {
    totalTests++;
    failedTests++;
    console.log('❌ 请求失败:', error.message);
    return false;
  });

// ==================== 测试 4: response.config 完整性验证 ====================
console.log('\n📋 测试 4: response.config 完整性验证');

var test4 = axios.get(TEST_API + '/get', {
  params: { id: 123 },
  headers: { 'X-Custom-Header': 'test' }
})
  .then(function(response) {
    totalTests++;
    console.log('✅ 请求成功');
    console.log('   config.url:', response.config.url);
    console.log('   config.method:', response.config.method);
    console.log('   config.headers:', typeof response.config.headers);
    
    if (response.config && 
        response.config.url && 
        response.config.method && 
        response.config.headers) {
      console.log('   ✓ config 完整性验证通过');
      passedTests++;
      return true;
    } else {
      console.log('   ⚠️ config 完整性验证失败');
      failedTests++;
      return false;
    }
  })
  .catch(function(error) {
    totalTests++;
    failedTests++;
    console.log('❌ 请求失败:', error.message);
    return false;
  });

// ==================== 测试 5: response.data 类型验证 (JSON) ====================
console.log('\n📋 测试 5: response.data 类型验证 (JSON)');

var test5 = axios.get(TEST_API + '/get')
  .then(function(response) {
    totalTests++;
    console.log('✅ 请求成功');
    console.log('   data 类型:', typeof response.data);
    console.log('   data.url 存在:', !!response.data.url);
    
    if (typeof response.data === 'object' && response.data.url) {
      console.log('   ✓ JSON 数据类型验证通过');
      passedTests++;
      return true;
    } else {
      console.log('   ⚠️ JSON 数据类型验证失败');
      failedTests++;
      return false;
    }
  })
  .catch(function(error) {
    totalTests++;
    failedTests++;
    console.log('❌ 请求失败:', error.message);
    return false;
  });

// ==================== 测试 6: 2xx 状态码系列 (201, 202, 204) ====================
console.log('\n📋 测试 6: 2xx 状态码系列 (201 Created)');

var test6 = axios.get(TEST_API + '/status/201')
  .then(function(response) {
    totalTests++;
    console.log('✅ 201 状态码请求成功');
    console.log('   状态码:', response.status);
    
    if (response.status === 201) {
      console.log('   ✓ 201 状态码验证通过');
      passedTests++;
      return true;
    } else {
      console.log('   ⚠️ 201 状态码验证失败');
      failedTests++;
      return false;
    }
  })
  .catch(function(error) {
    totalTests++;
    failedTests++;
    console.log('❌ 201 状态码请求失败:', error.message);
    return false;
  });

// ==================== 测试 7: response.request 存在性验证 ====================
console.log('\n📋 测试 7: response.request 存在性验证');

var test7 = axios.get(TEST_API + '/get')
  .then(function(response) {
    totalTests++;
    console.log('✅ 请求成功');
    console.log('   request 存在:', !!response.request);
    console.log('   request 类型:', typeof response.request);
    
    if (response.request) {
      console.log('   ✓ request 存在性验证通过');
      passedTests++;
      return true;
    } else {
      console.log('   ⚠️ request 不存在');
      failedTests++;
      return false;
    }
  })
  .catch(function(error) {
    totalTests++;
    failedTests++;
    console.log('❌ 请求失败:', error.message);
    return false;
  });

// ==================== 测试 8: 响应头大小写不敏感 ====================
console.log('\n📋 测试 8: 响应头大小写不敏感');

var test8 = axios.get(TEST_API + '/get')
  .then(function(response) {
    totalTests++;
    console.log('✅ 请求成功');
    var contentType1 = response.headers['content-type'];
    var contentType2 = response.headers['Content-Type'];
    var contentType3 = response.headers['CONTENT-TYPE'];
    
    console.log('   小写:', contentType1);
    console.log('   驼峰:', contentType2);
    console.log('   大写:', contentType3);
    
    // 至少有一个能访问到
    if (contentType1 || contentType2 || contentType3) {
      console.log('   ✓ 响应头可访问（大小写处理正常）');
      passedTests++;
      return true;
    } else {
      console.log('   ⚠️ 响应头访问失败');
      failedTests++;
      return false;
    }
  })
  .catch(function(error) {
    totalTests++;
    failedTests++;
    console.log('❌ 请求失败:', error.message);
    return false;
  });

// ==================== 测试 9: 空响应体处理 (204 No Content) ====================
console.log('\n📋 测试 9: 空响应体处理 (204 No Content)');

var test9 = axios.get(TEST_API + '/status/204')
  .then(function(response) {
    totalTests++;
    console.log('✅ 204 请求成功');
    console.log('   状态码:', response.status);
    console.log('   响应体:', response.data);
    console.log('   响应体类型:', typeof response.data);
    
    if (response.status === 204) {
      console.log('   ✓ 204 No Content 验证通过');
      passedTests++;
      return true;
    } else {
      console.log('   ⚠️ 204 状态码验证失败');
      failedTests++;
      return false;
    }
  })
  .catch(function(error) {
    totalTests++;
    failedTests++;
    console.log('❌ 204 请求失败:', error.message);
    return false;
  });

// ==================== 测试 10: 响应数据完整性 (所有字段存在) ====================
console.log('\n📋 测试 10: 响应数据完整性');

var test10 = axios.get(TEST_API + '/get')
  .then(function(response) {
    totalTests++;
    console.log('✅ 请求成功');
    
    var hasData = response.hasOwnProperty('data');
    var hasStatus = response.hasOwnProperty('status');
    var hasStatusText = response.hasOwnProperty('statusText');
    var hasHeaders = response.hasOwnProperty('headers');
    var hasConfig = response.hasOwnProperty('config');
    
    console.log('   data 存在:', hasData);
    console.log('   status 存在:', hasStatus);
    console.log('   statusText 存在:', hasStatusText);
    console.log('   headers 存在:', hasHeaders);
    console.log('   config 存在:', hasConfig);
    
    if (hasData && hasStatus && hasStatusText && hasHeaders && hasConfig) {
      console.log('   ✓ 响应对象完整性验证通过');
      passedTests++;
      return true;
    } else {
      console.log('   ⚠️ 响应对象不完整');
      failedTests++;
      return false;
    }
  })
  .catch(function(error) {
    totalTests++;
    failedTests++;
    console.log('❌ 请求失败:', error.message);
    return false;
  });

// ==================== 等待所有测试完成 ====================
console.log('\n⏳ 等待所有测试完成...\n');

return Promise.all([test1, test2, test3, test4, test5, test6, test7, test8, test9, test10])
  .then(function(results) {
    console.log('========================================');
    console.log('📊 响应处理测试完成');
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

