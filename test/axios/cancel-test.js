/**
 * Axios 请求取消测试
 * 测试 CancelToken 功能（基于 AbortController）
 */

const axios = require('axios');

const TEST_API = 'https://jsonplaceholder.typicode.com';

console.log('📋 Axios 请求取消测试');
console.log('='.repeat(50));

// ==================== 测试 1: 基础取消功能 ====================
console.log('\n📋 测试 1: 基础取消功能（CancelToken.source）');

var CancelToken = axios.CancelToken;
var source1 = CancelToken.source();

var test1Promise = axios.get(TEST_API + '/posts', {
  cancelToken: source1.token
})
  .then(function(response) {
    console.log('❌ 请求应该被取消，但成功返回了');
    return false;
  })
  .catch(function(error) {
    if (axios.isCancel(error)) {
      console.log('✅ 请求成功取消');
      console.log('   取消原因:', error.message);
      return true;
    } else {
      console.log('❌ 请求未被取消，而是发生了其他错误:', error.message);
      return false;
    }
  });

// 立即取消请求
source1.cancel('用户主动取消请求');

var test1 = test1Promise;

// ==================== 测试 2: 使用 executor 函数取消 ====================
console.log('\n📋 测试 2: 使用 executor 函数取消');

var cancel2;

var test2Promise = axios.get(TEST_API + '/posts', {
  cancelToken: new CancelToken(function executor(c) {
    cancel2 = c;
  })
})
  .then(function(response) {
    console.log('❌ 请求应该被取消，但成功返回了');
    return false;
  })
  .catch(function(error) {
    if (axios.isCancel(error)) {
      console.log('✅ executor 方式取消成功');
      console.log('   取消原因:', error.message);
      return true;
    } else {
      console.log('❌ executor 方式取消失败:', error.message);
      return false;
    }
  });

// 使用 cancel 函数取消
cancel2('通过 executor 取消');

var test2 = test2Promise;

// ==================== 测试 3: 延迟取消 ====================
console.log('\n📋 测试 3: 延迟取消（模拟超时）');

var source3 = CancelToken.source();

var test3 = new Promise(function(resolve) {
  // 设置延迟取消（100ms 后取消）
  setTimeout(function() {
    source3.cancel('请求超时');
  }, 100);

  axios.get(TEST_API + '/posts', {
    cancelToken: source3.token
  })
    .then(function(response) {
      console.log('❌ 请求应该被取消，但成功返回了');
      resolve(false);
    })
    .catch(function(error) {
      if (axios.isCancel(error)) {
        console.log('✅ 延迟取消成功');
        console.log('   取消原因:', error.message);
        resolve(true);
      } else {
        console.log('❌ 延迟取消失败:', error.message);
        resolve(false);
      }
    });
});

// ==================== 测试 4: 多个请求共享 CancelToken ====================
console.log('\n📋 测试 4: 多个请求共享同一个 CancelToken');

var source4 = CancelToken.source();

var request4a = axios.get(TEST_API + '/posts/1', {
  cancelToken: source4.token
});

var request4b = axios.get(TEST_API + '/posts/2', {
  cancelToken: source4.token
});

var request4c = axios.get(TEST_API + '/posts/3', {
  cancelToken: source4.token
});

// 取消所有请求
source4.cancel('批量取消所有请求');

var test4 = Promise.all([
  request4a.catch(function(e) { return axios.isCancel(e); }),
  request4b.catch(function(e) { return axios.isCancel(e); }),
  request4c.catch(function(e) { return axios.isCancel(e); })
])
  .then(function(results) {
    var allCancelled = results[0] && results[1] && results[2];
    
    if (allCancelled) {
      console.log('✅ 批量取消成功');
      console.log('   ✓ 所有 3 个请求都被取消');
      return true;
    } else {
      console.log('❌ 批量取消失败');
      return false;
    }
  });

// ==================== 测试 5: 已取消的 token 重复使用 ====================
console.log('\n📋 测试 5: 已取消的 token 不能重复使用');

var source5 = CancelToken.source();
source5.cancel('第一次取消');

var test5 = axios.get(TEST_API + '/posts/1', {
  cancelToken: source5.token
})
  .then(function(response) {
    console.log('❌ 使用已取消的 token，请求不应该成功');
    return false;
  })
  .catch(function(error) {
    if (axios.isCancel(error)) {
      console.log('✅ 已取消的 token 正确阻止了新请求');
      console.log('   ✓ token 状态正确维护');
      return true;
    } else {
      console.log('❌ 已取消 token 测试失败:', error.message);
      return false;
    }
  });

// ==================== 测试 6: 正常完成的请求不受影响 ====================
console.log('\n📋 测试 6: 正常完成的请求不受影响');

var source6 = CancelToken.source();

var test6 = axios.get(TEST_API + '/posts/1', {
  cancelToken: source6.token
})
  .then(function(response) {
    console.log('✅ 正常请求完成，未被取消');
    console.log('   状态码:', response.status);
    
    // 请求完成后尝试取消（应该无效）
    source6.cancel('请求已完成');
    
    return true;
  })
  .catch(function(error) {
    if (axios.isCancel(error)) {
      console.log('❌ 正常请求被错误取消');
      return false;
    } else {
      console.log('❌ 请求失败:', error.message);
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
    console.log('📊 Axios 请求取消测试完成');
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

