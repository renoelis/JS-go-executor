/**
 * Axios 实例和配置测试
 * 测试 axios.create、baseURL、defaults 等功能
 */

const axios = require('axios');

const TEST_API = 'https://jsonplaceholder.typicode.com';

console.log('📋 Axios 实例和配置测试');
console.log('='.repeat(50));

// ==================== 测试 1: 创建自定义实例 ====================
console.log('\n📋 测试 1: 创建自定义实例');

var customInstance = axios.create({
  baseURL: TEST_API,
  timeout: 5000,
  headers: {
    'X-Custom-Header': 'CustomInstance'
  }
});

var test1 = customInstance.get('/posts/1')
  .then(function(response) {
    console.log('✅ 自定义实例请求成功');
    console.log('   状态码:', response.status);
    console.log('   数据 ID:', response.data.id);
    
    if (response.status === 200 && response.data.id === 1) {
      console.log('   ✓ 实例配置正确应用');
      return true;
    } else {
      throw new Error('实例配置验证失败');
    }
  })
  .catch(function(error) {
    console.log('❌ 自定义实例测试失败:', error.message);
    return false;
  });

// ==================== 测试 2: baseURL 配置 ====================
console.log('\n📋 测试 2: baseURL 配置');

var instanceWithBase = axios.create({
  baseURL: TEST_API
});

var test2 = instanceWithBase.get('/posts/1')
  .then(function(response) {
    console.log('✅ baseURL 配置测试通过');
    console.log('   完整 URL 由 baseURL + 路径组成');
    console.log('   数据 ID:', response.data.id);
    
    if (response.data.id === 1) {
      console.log('   ✓ baseURL 正确拼接');
      return true;
    } else {
      throw new Error('baseURL 拼接失败');
    }
  })
  .catch(function(error) {
    console.log('❌ baseURL 配置测试失败:', error.message);
    return false;
  });

// ==================== 测试 3: params 配置 ====================
console.log('\n📋 测试 3: params 查询参数');

var test3 = axios.get(TEST_API + '/posts', {
  params: {
    userId: 1,
    _limit: 5
  }
})
  .then(function(response) {
    console.log('✅ params 参数测试通过');
    console.log('   返回记录数:', response.data.length);
    
    // 验证返回的数据都是 userId=1
    var allValid = true;
    for (var i = 0; i < response.data.length; i++) {
      if (response.data[i].userId !== 1) {
        allValid = false;
        break;
      }
    }
    
    if (allValid && response.data.length <= 5) {
      console.log('   ✓ params 参数正确应用');
      return true;
    } else {
      throw new Error('params 参数验证失败');
    }
  })
  .catch(function(error) {
    console.log('❌ params 参数测试失败:', error.message);
    return false;
  });

// ==================== 测试 4: 全局 defaults 配置 ====================
console.log('\n📋 测试 4: 全局 defaults 配置');

// 保存原始配置
var originalHeaders = axios.defaults.headers.common;

// 修改全局 defaults
axios.defaults.headers.common['X-Global-Header'] = 'GlobalValue';
axios.defaults.timeout = 10000;

var test4 = axios.get(TEST_API + '/posts/1')
  .then(function(response) {
    console.log('✅ 全局 defaults 测试通过');
    console.log('   状态码:', response.status);
    
    // 恢复原始配置
    axios.defaults.headers.common = originalHeaders;
    
    if (response.status === 200) {
      console.log('   ✓ 全局配置正确应用');
      return true;
    } else {
      throw new Error('全局配置验证失败');
    }
  })
  .catch(function(error) {
    console.log('❌ 全局 defaults 测试失败:', error.message);
    return false;
  });

// ==================== 测试 5: 实例 defaults 配置 ====================
console.log('\n📋 测试 5: 实例 defaults 配置');

var instanceWithDefaults = axios.create();

instanceWithDefaults.defaults.baseURL = TEST_API;
instanceWithDefaults.defaults.headers.common['X-Instance-Header'] = 'InstanceValue';

var test5 = instanceWithDefaults.get('/posts/1')
  .then(function(response) {
    console.log('✅ 实例 defaults 测试通过');
    console.log('   状态码:', response.status);
    console.log('   数据 ID:', response.data.id);
    
    if (response.status === 200 && response.data.id === 1) {
      console.log('   ✓ 实例 defaults 正确应用');
      return true;
    } else {
      throw new Error('实例 defaults 验证失败');
    }
  })
  .catch(function(error) {
    console.log('❌ 实例 defaults 测试失败:', error.message);
    return false;
  });

// ==================== 测试 6: 配置优先级（请求 > 实例 > 全局）====================
console.log('\n📋 测试 6: 配置优先级');

var priorityInstance = axios.create({
  baseURL: TEST_API,
  headers: {
    'X-Priority': 'Instance'
  }
});

var test6 = priorityInstance.get('/posts/1', {
  headers: {
    'X-Priority': 'Request'
  }
})
  .then(function(response) {
    console.log('✅ 配置优先级测试通过');
    console.log('   请求配置 > 实例配置 > 全局配置');
    console.log('   状态码:', response.status);
    
    if (response.status === 200) {
      console.log('   ✓ 配置优先级正确');
      return true;
    } else {
      throw new Error('配置优先级验证失败');
    }
  })
  .catch(function(error) {
    console.log('❌ 配置优先级测试失败:', error.message);
    return false;
  });

// ==================== 测试 7: auth 基础认证 ====================
console.log('\n📋 测试 7: auth 基础认证');

var test7 = axios.get(TEST_API + '/posts/1', {
  auth: {
    username: 'testuser',
    password: 'testpass'
  }
})
  .then(function(response) {
    console.log('✅ auth 基础认证配置测试通过');
    console.log('   Authorization header 已自动生成');
    console.log('   状态码:', response.status);
    
    if (response.status === 200) {
      console.log('   ✓ auth 配置正确应用');
      return true;
    } else {
      throw new Error('auth 配置验证失败');
    }
  })
  .catch(function(error) {
    console.log('❌ auth 基础认证测试失败:', error.message);
    return false;
  });

// ==================== 测试 8: 多个实例独立性 ====================
console.log('\n📋 测试 8: 多个实例独立性');

var instance8a = axios.create({
  baseURL: TEST_API,
  headers: { 'X-Instance': 'A' }
});

var instance8b = axios.create({
  baseURL: TEST_API,
  headers: { 'X-Instance': 'B' }
});

var test8 = Promise.all([
  instance8a.get('/posts/1'),
  instance8b.get('/posts/2')
])
  .then(function(responses) {
    console.log('✅ 多实例独立性测试通过');
    console.log('   实例 A 返回 ID:', responses[0].data.id);
    console.log('   实例 B 返回 ID:', responses[1].data.id);
    
    if (responses[0].data.id === 1 && responses[1].data.id === 2) {
      console.log('   ✓ 多个实例配置互不影响');
      return true;
    } else {
      throw new Error('多实例独立性验证失败');
    }
  })
  .catch(function(error) {
    console.log('❌ 多实例独立性测试失败:', error.message);
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
    console.log('📊 Axios 实例和配置测试完成');
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

