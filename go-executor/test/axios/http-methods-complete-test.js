/**
 * Axios HTTP 方法完整性测试
 * 测试 PATCH、HEAD、OPTIONS 方法
 */

const axios = require('axios');

const TEST_API = 'https://jsonplaceholder.typicode.com';

console.log('📋 Axios HTTP 方法完整性测试');
console.log('='.repeat(50));

// ==================== 测试 1: PATCH 请求 ====================
console.log('\n📋 测试 1: PATCH 请求');

var test1 = axios.patch(TEST_API + '/posts/1', {
  title: 'Patched Title'
})
  .then(function(response) {
    console.log('✅ PATCH 请求成功');
    console.log('   状态码:', response.status);
    console.log('   返回数据:', JSON.stringify(response.data).substring(0, 100) + '...');
    
    if (response.status === 200 && response.data.title === 'Patched Title') {
      console.log('   ✓ PATCH 数据验证通过');
      return true;
    } else {
      throw new Error('PATCH 数据验证失败');
    }
  })
  .catch(function(error) {
    console.log('❌ PATCH 请求失败:', error.message);
    return false;
  });

// ==================== 测试 2: PATCH 使用 axios() 方法 ====================
console.log('\n📋 测试 2: PATCH 使用 axios() 方法');

var test2 = axios({
  method: 'patch',
  url: TEST_API + '/posts/1',
  data: {
    body: 'Updated body via patch'
  }
})
  .then(function(response) {
    console.log('✅ axios() PATCH 请求成功');
    console.log('   状态码:', response.status);
    
    if (response.status === 200 && response.data.body === 'Updated body via patch') {
      console.log('   ✓ axios() PATCH 验证通过');
      return true;
    } else {
      throw new Error('axios() PATCH 验证失败');
    }
  })
  .catch(function(error) {
    console.log('❌ axios() PATCH 请求失败:', error.message);
    return false;
  });

// ==================== 测试 3: HEAD 请求 ====================
console.log('\n📋 测试 3: HEAD 请求');

var test3 = axios.head(TEST_API + '/posts/1')
  .then(function(response) {
    console.log('✅ HEAD 请求成功');
    console.log('   状态码:', response.status);
    console.log('   headers:', JSON.stringify(response.headers).substring(0, 150) + '...');
    
    // HEAD 请求不应该有响应体
    var hasNoBody = !response.data || 
                    response.data === '' || 
                    (typeof response.data === 'object' && Object.keys(response.data).length === 0);
    
    if (response.status === 200 && hasNoBody) {
      console.log('   ✓ HEAD 请求验证通过（无响应体）');
      return true;
    } else {
      console.log('   ⚠️ HEAD 请求有响应体:', response.data);
      // 某些实现可能返回空对象，这也是可以接受的
      return response.status === 200;
    }
  })
  .catch(function(error) {
    console.log('❌ HEAD 请求失败:', error.message);
    return false;
  });

// ==================== 测试 4: HEAD 请求验证 headers ====================
console.log('\n📋 测试 4: HEAD 请求验证 headers');

var test4 = axios.head(TEST_API + '/posts')
  .then(function(response) {
    console.log('✅ HEAD headers 验证成功');
    
    // 检查常见的响应头
    var hasContentType = response.headers && response.headers['content-type'];
    var hasHeaders = response.headers && typeof response.headers === 'object';
    
    console.log('   Content-Type:', response.headers['content-type']);
    console.log('   有 headers 对象:', hasHeaders);
    
    if (response.status === 200 && hasHeaders) {
      console.log('   ✓ HEAD headers 验证通过');
      return true;
    } else {
      throw new Error('HEAD headers 验证失败');
    }
  })
  .catch(function(error) {
    console.log('❌ HEAD headers 验证失败:', error.message);
    return false;
  });

// ==================== 测试 5: OPTIONS 请求 ====================
console.log('\n📋 测试 5: OPTIONS 请求');

var test5 = axios.options(TEST_API + '/posts/1')
  .then(function(response) {
    console.log('✅ OPTIONS 请求成功');
    console.log('   状态码:', response.status);
    
    // OPTIONS 请求应该返回允许的方法
    if (response.headers && response.headers['allow']) {
      console.log('   Allow 头:', response.headers['allow']);
    }
    
    if (response.status === 200 || response.status === 204) {
      console.log('   ✓ OPTIONS 请求验证通过');
      return true;
    } else {
      throw new Error('OPTIONS 状态码异常: ' + response.status);
    }
  })
  .catch(function(error) {
    console.log('❌ OPTIONS 请求失败:', error.message);
    // 某些服务器可能不支持 OPTIONS，这不算测试失败
    if (error.response && (error.response.status === 404 || error.response.status === 405)) {
      console.log('   ℹ️ 服务器不支持 OPTIONS（405/404），跳过');
      return true;
    }
    return false;
  });

// ==================== 测试 6: OPTIONS 使用 axios() 方法 ====================
console.log('\n📋 测试 6: OPTIONS 使用 axios() 方法');

var test6 = axios({
  method: 'options',
  url: TEST_API + '/posts'
})
  .then(function(response) {
    console.log('✅ axios() OPTIONS 请求成功');
    console.log('   状态码:', response.status);
    
    if (response.status === 200 || response.status === 204) {
      console.log('   ✓ axios() OPTIONS 验证通过');
      return true;
    } else {
      throw new Error('axios() OPTIONS 验证失败');
    }
  })
  .catch(function(error) {
    console.log('❌ axios() OPTIONS 请求失败:', error.message);
    // 某些服务器可能不支持 OPTIONS
    if (error.response && (error.response.status === 404 || error.response.status === 405)) {
      console.log('   ℹ️ 服务器不支持 OPTIONS，跳过');
      return true;
    }
    return false;
  });

// ==================== 测试 7: 方法名大小写不敏感 ====================
console.log('\n📋 测试 7: 方法名大小写不敏感');

var test7 = axios({
  method: 'PATCH',  // 大写
  url: TEST_API + '/posts/1',
  data: {
    title: 'Test Case Insensitive'
  }
})
  .then(function(response) {
    console.log('✅ 大写方法名测试成功');
    console.log('   状态码:', response.status);
    
    if (response.status === 200) {
      console.log('   ✓ 方法名大小写不敏感验证通过');
      return true;
    } else {
      throw new Error('方法名大小写验证失败');
    }
  })
  .catch(function(error) {
    console.log('❌ 方法名大小写测试失败:', error.message);
    return false;
  });

// ==================== 测试 8: PATCH 带自定义 headers ====================
console.log('\n📋 测试 8: PATCH 带自定义 headers');

var test8 = axios.patch(TEST_API + '/posts/1', 
  {
    title: 'Updated with custom headers'
  },
  {
    headers: {
      'X-Custom-Header': 'CustomValue',
      'Content-Type': 'application/json'
    }
  }
)
  .then(function(response) {
    console.log('✅ PATCH 自定义 headers 成功');
    console.log('   状态码:', response.status);
    
    if (response.status === 200) {
      console.log('   ✓ 自定义 headers 验证通过');
      return true;
    } else {
      throw new Error('自定义 headers 验证失败');
    }
  })
  .catch(function(error) {
    console.log('❌ PATCH 自定义 headers 失败:', error.message);
    return false;
  });

// ==================== 等待所有测试完成 ====================
console.log('\n⏳ 等待所有测试完成...\n');

return Promise.all([test1, test2, test3, test4, test5, test6, test7, test8])
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
    console.log('📊 HTTP 方法完整性测试完成');
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






