/**
 * Axios 并发请求测试
 * 测试 axios.all、axios.spread、Promise.all 等并发控制功能
 */

const axios = require('axios');

const TEST_API = 'https://jsonplaceholder.typicode.com';

console.log('📋 Axios 并发请求测试');
console.log('='.repeat(50));

// ==================== 测试 1: axios.all() 基础测试 ====================
console.log('\n📋 测试 1: axios.all() 基础测试');

var test1 = axios.all([
  axios.get(TEST_API + '/posts/1'),
  axios.get(TEST_API + '/posts/2'),
  axios.get(TEST_API + '/posts/3')
])
  .then(function(responses) {
    console.log('✅ axios.all() 请求成功');
    console.log('   返回响应数:', responses.length);
    
    var allSuccess = true;
    for (var i = 0; i < responses.length; i++) {
      if (responses[i].status !== 200) {
        allSuccess = false;
        break;
      }
      console.log('   响应 ' + (i + 1) + ' ID:', responses[i].data.id);
    }
    
    if (allSuccess && responses.length === 3) {
      console.log('   ✓ axios.all() 验证通过');
      return true;
    } else {
      throw new Error('axios.all() 验证失败');
    }
  })
  .catch(function(error) {
    console.log('❌ axios.all() 测试失败:', error.message);
    return false;
  });

// ==================== 测试 2: axios.spread() 展开响应 ====================
console.log('\n📋 测试 2: axios.spread() 展开响应');

var test2 = axios.all([
  axios.get(TEST_API + '/users/1'),
  axios.get(TEST_API + '/posts/1'),
  axios.get(TEST_API + '/comments/1')
])
  .then(axios.spread(function(userRes, postRes, commentRes) {
    console.log('✅ axios.spread() 展开成功');
    console.log('   用户数据 ID:', userRes.data.id);
    console.log('   文章数据 ID:', postRes.data.id);
    console.log('   评论数据 ID:', commentRes.data.id);
    
    if (userRes.status === 200 && 
        postRes.status === 200 && 
        commentRes.status === 200 &&
        userRes.data.id === 1 &&
        postRes.data.id === 1 &&
        commentRes.data.id === 1) {
      console.log('   ✓ axios.spread() 验证通过');
      return true;
    } else {
      throw new Error('axios.spread() 验证失败');
    }
  }))
  .catch(function(error) {
    console.log('❌ axios.spread() 测试失败:', error.message);
    return false;
  });

// ==================== 测试 3: Promise.all() 与 axios 结合 ====================
console.log('\n📋 测试 3: Promise.all() 与 axios 结合');

var test3 = Promise.all([
  axios.get(TEST_API + '/posts/1'),
  axios.get(TEST_API + '/posts/2'),
  axios.post(TEST_API + '/posts', { title: 'Test', body: 'Body', userId: 1 })
])
  .then(function(results) {
    console.log('✅ Promise.all() 请求成功');
    console.log('   GET 1 状态:', results[0].status);
    console.log('   GET 2 状态:', results[1].status);
    console.log('   POST 状态:', results[2].status);
    
    if (results[0].status === 200 && 
        results[1].status === 200 && 
        results[2].status === 201) {
      console.log('   ✓ Promise.all() 验证通过');
      return true;
    } else {
      throw new Error('Promise.all() 验证失败');
    }
  })
  .catch(function(error) {
    console.log('❌ Promise.all() 测试失败:', error.message);
    return false;
  });

// ==================== 测试 4: 大量并发请求 (10个) ====================
console.log('\n📋 测试 4: 大量并发请求 (10个)');

var test4 = (function() {
  var requests = [];
  for (var i = 1; i <= 10; i++) {
    requests.push(axios.get(TEST_API + '/posts/' + i));
  }
  
  var startTime = Date.now();
  
  return axios.all(requests)
    .then(function(responses) {
      var duration = Date.now() - startTime;
      
      console.log('✅ 10个并发请求完成');
      console.log('   耗时:', duration, 'ms');
      console.log('   平均:', (duration / 10).toFixed(0), 'ms/请求');
      
      var allSuccess = true;
      for (var i = 0; i < responses.length; i++) {
        if (responses[i].status !== 200 || responses[i].data.id !== (i + 1)) {
          allSuccess = false;
          break;
        }
      }
      
      if (allSuccess && responses.length === 10) {
        console.log('   ✓ 大量并发请求验证通过');
        return true;
      } else {
        throw new Error('大量并发请求验证失败');
      }
    })
    .catch(function(error) {
      console.log('❌ 大量并发请求失败:', error.message);
      return false;
    });
})();

// ==================== 测试 5: 混合请求类型并发 ====================
console.log('\n📋 测试 5: 混合请求类型并发');

var test5 = axios.all([
  axios.get(TEST_API + '/posts/1'),
  axios.post(TEST_API + '/posts', { title: 'New', body: 'Content', userId: 1 }),
  axios.put(TEST_API + '/posts/1', { id: 1, title: 'Updated', body: 'Updated', userId: 1 }),
  axios.delete(TEST_API + '/posts/1')
])
  .then(function(responses) {
    console.log('✅ 混合请求类型并发成功');
    console.log('   GET 状态:', responses[0].status);
    console.log('   POST 状态:', responses[1].status);
    console.log('   PUT 状态:', responses[2].status);
    console.log('   DELETE 状态:', responses[3].status);
    
    if (responses[0].status === 200 &&
        responses[1].status === 201 &&
        responses[2].status === 200 &&
        responses[3].status === 200) {
      console.log('   ✓ 混合请求验证通过');
      return true;
    } else {
      throw new Error('混合请求验证失败');
    }
  })
  .catch(function(error) {
    console.log('❌ 混合请求类型并发失败:', error.message);
    return false;
  });

// ==================== 测试 6: 并发中的错误处理 ====================
console.log('\n📋 测试 6: 并发中的错误处理');

var test6 = axios.all([
  axios.get(TEST_API + '/posts/1'),
  axios.get(TEST_API + '/posts/99999999'),  // 这个会 404
  axios.get(TEST_API + '/posts/3')
])
  .then(function(responses) {
    console.log('❌ 应该捕获错误，但全部成功了');
    return false;
  })
  .catch(function(error) {
    console.log('✅ 正确捕获了并发中的错误');
    console.log('   错误状态码:', error.response ? error.response.status : 'unknown');
    
    if (error.response && error.response.status === 404) {
      console.log('   ✓ 错误处理验证通过');
      return true;
    } else {
      console.log('   ⚠️ 错误类型不符，但捕获到错误');
      return true;  // 只要捕获到错误就算通过
    }
  });

// ==================== 测试 7: 使用实例进行并发请求 ====================
console.log('\n📋 测试 7: 使用 axios 实例进行并发请求');

var test7 = (function() {
  var instance = axios.create({
    baseURL: TEST_API,
    timeout: 5000,
    headers: {
      'X-Instance-Test': 'true'
    }
  });
  
  return instance.all([
    instance.get('/posts/1'),
    instance.get('/posts/2'),
    instance.get('/posts/3')
  ])
    .then(instance.spread(function(res1, res2, res3) {
      console.log('✅ 实例并发请求成功');
      console.log('   响应 1 ID:', res1.data.id);
      console.log('   响应 2 ID:', res2.data.id);
      console.log('   响应 3 ID:', res3.data.id);
      
      if (res1.status === 200 && res2.status === 200 && res3.status === 200) {
        console.log('   ✓ 实例并发验证通过');
        return true;
      } else {
        throw new Error('实例并发验证失败');
      }
    }))
    .catch(function(error) {
      console.log('❌ 实例并发请求失败:', error.message);
      return false;
    });
})();

// ==================== 测试 8: 并发请求性能测试 (50个) ====================
console.log('\n📋 测试 8: 并发请求性能测试 (50个)');

var test8 = (function() {
  var requests = [];
  
  // 创建 50 个请求（使用取模确保 ID 在合理范围）
  for (var i = 1; i <= 50; i++) {
    var postId = ((i - 1) % 100) + 1;  // 1-100 循环
    requests.push(axios.get(TEST_API + '/posts/' + postId));
  }
  
  var startTime = Date.now();
  
  return Promise.all(requests)
    .then(function(responses) {
      var duration = Date.now() - startTime;
      
      console.log('✅ 50个并发请求完成');
      console.log('   总耗时:', duration, 'ms');
      console.log('   平均:', (duration / 50).toFixed(0), 'ms/请求');
      console.log('   成功数:', responses.length);
      
      var allSuccess = true;
      for (var i = 0; i < responses.length; i++) {
        if (responses[i].status !== 200) {
          allSuccess = false;
          break;
        }
      }
      
      if (allSuccess && responses.length === 50) {
        console.log('   ✓ 性能测试验证通过');
        return true;
      } else {
        throw new Error('性能测试验证失败');
      }
    })
    .catch(function(error) {
      console.log('❌ 性能测试失败:', error.message);
      return false;
    });
})();

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
    console.log('📊 并发请求测试完成');
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






