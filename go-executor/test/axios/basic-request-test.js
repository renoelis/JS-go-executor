/**
 * Axios 基础请求测试
 * 测试所有 HTTP 方法和基本功能
 */

const axios = require('axios');

// 测试 API 地址（使用公共测试 API）
const TEST_API = 'https://jsonplaceholder.typicode.com';

// ==================== 测试 1: GET 请求 ====================
console.log('📋 测试 1: GET 请求');

const test1 = axios.get(TEST_API + '/posts/1')
  .then(function(response) {
    console.log('✅ GET 请求成功');
    console.log('   状态码:', response.status);
    console.log('   数据:', JSON.stringify(response.data).substring(0, 100) + '...');
    
    if (response.status === 200 && response.data.id === 1) {
      console.log('   ✓ 数据验证通过');
      return true;
    } else {
      throw new Error('数据验证失败');
    }
  })
  .catch(function(error) {
    console.log('❌ GET 请求失败:', error.message);
    return false;
  });

// ==================== 测试 2: POST 请求 ====================
console.log('\n📋 测试 2: POST 请求（自动 JSON 序列化）');

const test2 = axios.post(TEST_API + '/posts', {
  title: 'Axios Test',
  body: 'This is a test post from axios',
  userId: 1
})
  .then(function(response) {
    console.log('✅ POST 请求成功');
    console.log('   状态码:', response.status);
    console.log('   返回数据:', JSON.stringify(response.data).substring(0, 150) + '...');
    
    if (response.status === 201 && response.data.title === 'Axios Test') {
      console.log('   ✓ POST 数据验证通过');
      return true;
    } else {
      throw new Error('POST 数据验证失败');
    }
  })
  .catch(function(error) {
    console.log('❌ POST 请求失败:', error.message);
    return false;
  });

// ==================== 测试 3: PUT 请求 ====================
console.log('\n📋 测试 3: PUT 请求');

const test3 = axios.put(TEST_API + '/posts/1', {
  id: 1,
  title: 'Updated Title',
  body: 'Updated body content',
  userId: 1
})
  .then(function(response) {
    console.log('✅ PUT 请求成功');
    console.log('   状态码:', response.status);
    console.log('   更新后数据:', JSON.stringify(response.data).substring(0, 100) + '...');
    
    if (response.status === 200 && response.data.title === 'Updated Title') {
      console.log('   ✓ PUT 数据验证通过');
      return true;
    } else {
      throw new Error('PUT 数据验证失败');
    }
  })
  .catch(function(error) {
    console.log('❌ PUT 请求失败:', error.message);
    return false;
  });

// ==================== 测试 4: DELETE 请求 ====================
console.log('\n📋 测试 4: DELETE 请求');

const test4 = axios.delete(TEST_API + '/posts/1')
  .then(function(response) {
    console.log('✅ DELETE 请求成功');
    console.log('   状态码:', response.status);
    
    if (response.status === 200) {
      console.log('   ✓ DELETE 验证通过');
      return true;
    } else {
      throw new Error('DELETE 验证失败');
    }
  })
  .catch(function(error) {
    console.log('❌ DELETE 请求失败:', error.message);
    return false;
  });

// ==================== 测试 5: 自定义配置 ====================
console.log('\n📋 测试 5: 自定义配置（headers, params）');

const test5 = axios({
  method: 'get',
  url: TEST_API + '/posts',
  params: {
    userId: 1
  },
  headers: {
    'X-Custom-Header': 'CustomValue'
  }
})
  .then(function(response) {
    console.log('✅ 自定义配置请求成功');
    console.log('   状态码:', response.status);
    console.log('   返回记录数:', response.data.length);
    
    if (response.status === 200 && response.data.length > 0) {
      console.log('   ✓ 自定义配置验证通过');
      return true;
    } else {
      throw new Error('自定义配置验证失败');
    }
  })
  .catch(function(error) {
    console.log('❌ 自定义配置请求失败:', error.message);
    return false;
  });

// ==================== 测试 6: HTTP 错误处理 (404) ====================
console.log('\n📋 测试 6: HTTP 错误处理（404）');

const test6 = axios.get(TEST_API + '/posts/99999999')
  .then(function(response) {
    console.log('❌ 应该返回 404 错误，但请求成功了');
    return false;
  })
  .catch(function(error) {
    if (error.response && error.response.status === 404) {
      console.log('✅ HTTP 404 错误正确捕获');
      console.log('   ✓ 错误处理验证通过');
      return true;
    } else {
      console.log('❌ 错误处理异常:', error.message);
      return false;
    }
  });

// ==================== 等待所有测试完成 ====================
console.log('\n⏳ 等待所有测试完成...\n');

return Promise.all([test1, test2, test3, test4, test5, test6])
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
    console.log('📊 Axios 基础请求测试完成');
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

