// ==================== Axios 请求体格式测试 ====================
const axios = require('axios');

console.log('📋 Axios 请求体格式测试\n');

const TEST_API = 'https://httpbin.org';

var totalTests = 0;
var passedTests = 0;
var failedTests = 0;

// ==================== 测试 1: application/json (默认) ====================
console.log('📋 测试 1: application/json (默认)');

var test1 = axios.post(TEST_API + '/post', {
  name: 'Alice',
  age: 30,
  isActive: true,
  tags: ['developer', 'nodejs']
})
  .then(function(response) {
    totalTests++;
    console.log('✅ JSON 请求成功');
    console.log('   Content-Type:', response.data.headers['Content-Type']);
    console.log('   请求数据:', response.data.json);
    
    if (response.data.json.name === 'Alice' && 
        response.data.json.age === 30 && 
        response.data.json.isActive === true &&
        response.data.headers['Content-Type'].includes('application/json')) {
      console.log('   ✓ JSON 格式验证通过');
      passedTests++;
      return true;
    } else {
      console.log('   ⚠️ JSON 格式验证失败');
      failedTests++;
      return false;
    }
  })
  .catch(function(error) {
    totalTests++;
    failedTests++;
    console.log('❌ JSON 请求失败:', error.message);
    return false;
  });

// ==================== 测试 2: application/x-www-form-urlencoded ====================
console.log('\n📋 测试 2: application/x-www-form-urlencoded');

var test2 = axios.post(TEST_API + '/post', 'name=Bob&age=25&city=Shanghai', {
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded'
  }
})
  .then(function(response) {
    totalTests++;
    console.log('✅ Form URL Encoded 请求成功');
    console.log('   Content-Type:', response.data.headers['Content-Type']);
    console.log('   表单数据:', response.data.form);
    
    if (response.data.form.name === 'Bob' && 
        response.data.form.age === '25' && 
        response.data.form.city === 'Shanghai' &&
        response.data.headers['Content-Type'].includes('application/x-www-form-urlencoded')) {
      console.log('   ✓ Form URL Encoded 格式验证通过');
      passedTests++;
      return true;
    } else {
      console.log('   ⚠️ Form URL Encoded 格式验证失败');
      failedTests++;
      return false;
    }
  })
  .catch(function(error) {
    totalTests++;
    failedTests++;
    console.log('❌ Form URL Encoded 请求失败:', error.message);
    return false;
  });

// ==================== 测试 3: text/plain ====================
console.log('\n📋 测试 3: text/plain');

var test3 = axios.post(TEST_API + '/post', 'This is plain text content.\nWith multiple lines.', {
  headers: {
    'Content-Type': 'text/plain'
  }
})
  .then(function(response) {
    totalTests++;
    console.log('✅ Plain Text 请求成功');
    console.log('   Content-Type:', response.data.headers['Content-Type']);
    console.log('   文本数据:', response.data.data);
    
    if (response.data.data.includes('This is plain text content') &&
        response.data.headers['Content-Type'].includes('text/plain')) {
      console.log('   ✓ Plain Text 格式验证通过');
      passedTests++;
      return true;
    } else {
      console.log('   ⚠️ Plain Text 格式验证失败');
      failedTests++;
      return false;
    }
  })
  .catch(function(error) {
    totalTests++;
    failedTests++;
    console.log('❌ Plain Text 请求失败:', error.message);
    return false;
  });

// ==================== 测试 4: 自动 Content-Type 设置 (JSON) ====================
console.log('\n📋 测试 4: 自动 Content-Type 设置 (JSON)');

var test4 = axios.post(TEST_API + '/post', {
  autoDetect: true,
  message: 'Content-Type should be auto-set'
})
  .then(function(response) {
    totalTests++;
    console.log('✅ 自动检测请求成功');
    console.log('   Content-Type:', response.data.headers['Content-Type']);
    
    if (response.data.headers['Content-Type'] && 
        response.data.headers['Content-Type'].includes('application/json')) {
      console.log('   ✓ Content-Type 自动设置为 application/json');
      passedTests++;
      return true;
    } else {
      console.log('   ⚠️ Content-Type 自动设置失败');
      failedTests++;
      return false;
    }
  })
  .catch(function(error) {
    totalTests++;
    failedTests++;
    console.log('❌ 自动检测请求失败:', error.message);
    return false;
  });

// ==================== 测试 5: 空请求体 ====================
console.log('\n📋 测试 5: 空请求体');

var test5 = axios.post(TEST_API + '/post')
  .then(function(response) {
    totalTests++;
    console.log('✅ 空请求体请求成功');
    console.log('   状态码:', response.status);
    console.log('   请求数据:', response.data.data || response.data.json || '(empty)');
    
    console.log('   ✓ 空请求体处理验证通过');
    passedTests++;
    return true;
  })
  .catch(function(error) {
    totalTests++;
    failedTests++;
    console.log('❌ 空请求体请求失败:', error.message);
    return false;
  });

// ==================== 测试 6: 复杂 JSON 结构 ====================
console.log('\n📋 测试 6: 复杂 JSON 结构');

var complexData = {
  user: {
    name: 'Charlie',
    profile: {
      age: 35,
      address: {
        city: 'Shenzhen',
        country: 'China'
      }
    }
  },
  permissions: ['read', 'write', 'delete'],
  metadata: {
    createdAt: '2025-10-03T14:00:00Z',
    isVerified: true
  }
};

var test6 = axios.post(TEST_API + '/post', complexData)
  .then(function(response) {
    totalTests++;
    console.log('✅ 复杂 JSON 请求成功');
    console.log('   嵌套数据验证:', response.data.json.user.profile.address.city);
    
    if (response.data.json.user.name === 'Charlie' && 
        response.data.json.user.profile.address.city === 'Shenzhen' &&
        response.data.json.permissions.length === 3 &&
        response.data.json.metadata.isVerified === true) {
      console.log('   ✓ 复杂 JSON 结构验证通过');
      passedTests++;
      return true;
    } else {
      console.log('   ⚠️ 复杂 JSON 结构验证失败');
      failedTests++;
      return false;
    }
  })
  .catch(function(error) {
    totalTests++;
    failedTests++;
    console.log('❌ 复杂 JSON 请求失败:', error.message);
    return false;
  });

// ==================== 测试 7: application/xml (自定义) ====================
console.log('\n📋 测试 7: application/xml (自定义)');

var xmlData = '<?xml version="1.0" encoding="UTF-8"?><root><name>David</name><age>40</age></root>';

var test7 = axios.post(TEST_API + '/post', xmlData, {
  headers: {
    'Content-Type': 'application/xml'
  }
})
  .then(function(response) {
    totalTests++;
    console.log('✅ XML 请求成功');
    console.log('   Content-Type:', response.data.headers['Content-Type']);
    console.log('   XML 数据长度:', response.data.data.length);
    
    if (response.data.data.includes('<name>David</name>') &&
        response.data.headers['Content-Type'].includes('application/xml')) {
      console.log('   ✓ XML 格式验证通过');
      passedTests++;
      return true;
    } else {
      console.log('   ⚠️ XML 格式验证失败');
      failedTests++;
      return false;
    }
  })
  .catch(function(error) {
    totalTests++;
    failedTests++;
    console.log('❌ XML 请求失败:', error.message);
    return false;
  });

// ==================== 测试 8: 覆盖默认 Content-Type ====================
console.log('\n📋 测试 8: 覆盖默认 Content-Type');

var test8 = axios.post(TEST_API + '/post', {
  data: 'test'
}, {
  headers: {
    'Content-Type': 'application/custom-type'
  }
})
  .then(function(response) {
    totalTests++;
    console.log('✅ 自定义 Content-Type 请求成功');
    console.log('   Content-Type:', response.data.headers['Content-Type']);
    
    if (response.data.headers['Content-Type'] && 
        response.data.headers['Content-Type'].includes('application/custom-type')) {
      console.log('   ✓ Content-Type 覆盖验证通过');
      passedTests++;
      return true;
    } else {
      console.log('   ⚠️ Content-Type 覆盖失败');
      failedTests++;
      return false;
    }
  })
  .catch(function(error) {
    totalTests++;
    failedTests++;
    console.log('❌ 自定义 Content-Type 请求失败:', error.message);
    return false;
  });

// ==================== 等待所有测试完成 ====================
console.log('\n⏳ 等待所有测试完成...\n');

return Promise.all([test1, test2, test3, test4, test5, test6, test7, test8])
  .then(function(results) {
    console.log('========================================');
    console.log('📊 请求体格式测试完成');
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

