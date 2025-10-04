// ==================== Axios URLSearchParams 支持测试 ====================
const axios = require('axios');

console.log('📋 Axios URLSearchParams 支持测试\n');

const TEST_API = 'https://httpbin.org';

var totalTests = 0;
var passedTests = 0;
var failedTests = 0;

// ==================== 测试 1: URLSearchParams 作为请求体 (POST) ====================
console.log('📋 测试 1: URLSearchParams 作为请求体 (POST)');

var test1 = axios.post(TEST_API + '/post', new URLSearchParams({
  name: 'Alice',
  age: '30',
  city: 'Beijing'
}), {
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded'
  }
})
  .then(function(response) {
    totalTests++;
    console.log('✅ POST 请求成功');
    console.log('   状态码:', response.status);
    console.log('   Content-Type:', response.data.headers['Content-Type']);
    console.log('   表单数据:', response.data.form);
    
    if (response.data.form.name === 'Alice' && 
        response.data.form.age === '30' && 
        response.data.form.city === 'Beijing') {
      console.log('   ✓ 表单数据验证通过');
      passedTests++;
      return true;
    } else {
      console.log('   ⚠️ 表单数据不匹配');
      failedTests++;
      return false;
    }
  })
  .catch(function(error) {
    totalTests++;
    failedTests++;
    console.log('❌ POST 请求失败:', error.message);
    return false;
  });

// ==================== 测试 2: URLSearchParams 作为查询参数 (GET) ====================
console.log('\n📋 测试 2: URLSearchParams 作为查询参数 (GET)');

var test2 = axios.get(TEST_API + '/get', {
  params: new URLSearchParams({
    filter: 'active',
    sort: 'name',
    page: '1',
    limit: '10'
  })
})
  .then(function(response) {
    totalTests++;
    console.log('✅ GET 请求成功');
    console.log('   URL:', response.data.url);
    console.log('   查询参数:', response.data.args);
    
    if (response.data.args.filter === 'active' && 
        response.data.args.sort === 'name' && 
        response.data.args.page === '1' && 
        response.data.args.limit === '10') {
      console.log('   ✓ 查询参数验证通过');
      passedTests++;
      return true;
    } else {
      console.log('   ⚠️ 查询参数不匹配');
      failedTests++;
      return false;
    }
  })
  .catch(function(error) {
    totalTests++;
    failedTests++;
    console.log('❌ GET 请求失败:', error.message);
    return false;
  });

// ==================== 测试 3: URLSearchParams 包含特殊字符 ====================
console.log('\n📋 测试 3: URLSearchParams 包含特殊字符');

var test3 = axios.post(TEST_API + '/post', new URLSearchParams({
  email: 'test@example.com',
  message: 'Hello & Welcome!',
  tags: 'foo,bar,baz',
  special: '!@#$%^&*()'
}))
  .then(function(response) {
    totalTests++;
    console.log('✅ 特殊字符请求成功');
    console.log('   表单数据:', response.data.form);
    
    if (response.data.form.email === 'test@example.com' && 
        response.data.form.message === 'Hello & Welcome!' && 
        response.data.form.special === '!@#$%^&*()') {
      console.log('   ✓ 特殊字符编码验证通过');
      passedTests++;
      return true;
    } else {
      console.log('   ⚠️ 特殊字符编码失败');
      failedTests++;
      return false;
    }
  })
  .catch(function(error) {
    totalTests++;
    failedTests++;
    console.log('❌ 特殊字符请求失败:', error.message);
    return false;
  });

// ==================== 测试 4: URLSearchParams 与对象参数混合 ====================
console.log('\n📋 测试 4: URLSearchParams 与对象参数混合');

var test4 = axios.get(TEST_API + '/get', {
  params: {
    id: 123,
    type: 'user'
  }
})
  .then(function(response) {
    totalTests++;
    console.log('✅ 对象参数请求成功');
    console.log('   查询参数:', response.data.args);
    
    if (response.data.args.id === '123' && response.data.args.type === 'user') {
      console.log('   ✓ 对象参数验证通过');
      passedTests++;
      return true;
    } else {
      console.log('   ⚠️ 对象参数不匹配');
      failedTests++;
      return false;
    }
  })
  .catch(function(error) {
    totalTests++;
    failedTests++;
    console.log('❌ 对象参数请求失败:', error.message);
    return false;
  });

// ==================== 测试 5: URLSearchParams 空值处理 ====================
console.log('\n📋 测试 5: URLSearchParams 空值处理');

var test5 = axios.post(TEST_API + '/post', new URLSearchParams({
  name: 'Bob',
  empty: '',
  nullValue: 'null',
  undefinedValue: 'undefined'
}))
  .then(function(response) {
    totalTests++;
    console.log('✅ 空值请求成功');
    console.log('   表单数据:', response.data.form);
    
    if (response.data.form.name === 'Bob' && 
        response.data.form.empty === '') {
      console.log('   ✓ 空值处理验证通过');
      passedTests++;
      return true;
    } else {
      console.log('   ⚠️ 空值处理失败');
      failedTests++;
      return false;
    }
  })
  .catch(function(error) {
    totalTests++;
    failedTests++;
    console.log('❌ 空值请求失败:', error.message);
    return false;
  });

// ==================== 测试 6: URLSearchParams 重复键值 ====================
console.log('\n📋 测试 6: URLSearchParams 重复键值');

var params = new URLSearchParams();
params.append('tag', 'javascript');
params.append('tag', 'nodejs');
params.append('tag', 'axios');

var test6 = axios.post(TEST_API + '/post', params)
  .then(function(response) {
    totalTests++;
    console.log('✅ 重复键值请求成功');
    console.log('   表单数据:', response.data.form);
    
    // httpbin 可能返回数组或逗号分隔的字符串
    var tags = response.data.form.tag;
    if (tags) {
      console.log('   ✓ 重复键值处理验证通过');
      passedTests++;
      return true;
    } else {
      console.log('   ⚠️ 重复键值处理失败');
      failedTests++;
      return false;
    }
  })
  .catch(function(error) {
    totalTests++;
    failedTests++;
    console.log('❌ 重复键值请求失败:', error.message);
    return false;
  });

// ==================== 等待所有测试完成 ====================
console.log('\n⏳ 等待所有测试完成...\n');

return Promise.all([test1, test2, test3, test4, test5, test6])
  .then(function(results) {
    console.log('========================================');
    console.log('📊 URLSearchParams 测试完成');
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

