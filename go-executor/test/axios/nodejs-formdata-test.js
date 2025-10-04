/**
 * Axios + Node.js form-data 模块测试
 * 测试使用 npm form-data 包进行文件上传
 */

const axios = require('axios');
const FormData = require('form-data'); // Node.js form-data 模块

console.log('📋 Axios + Node.js form-data 模块测试');
console.log('='.repeat(50));

const TEST_API = 'https://httpbin.org';

// 测试结果收集
var testResults = {
  total: 0,
  passed: 0,
  failed: 0,
  tests: []
};

function addTestResult(name, passed, details) {
  testResults.total++;
  if (passed) {
    testResults.passed++;
    console.log('  ✅ ' + name);
  } else {
    testResults.failed++;
    console.log('  ❌ ' + name);
    if (details && details.error) {
      console.log('     错误: ' + details.error);
    }
  }
  testResults.tests.push({
    name: name,
    passed: passed,
    details: details || {}
  });
}

// ==================== 测试 1: 基础文本字段 ====================
console.log('\n📋 测试 1: Node.js FormData 基础文本字段');
console.log('----------------------------------------');

var test1 = (function() {
  try {
    var fd = new FormData();
    
    // 添加文本字段
    fd.append('field1', 'value1');
    fd.append('field2', 'value2');
    fd.append('username', 'testuser');
    
    console.log('  FormData 类型:', typeof fd);
    console.log('  __isNodeFormData:', fd.__isNodeFormData);
    console.log('  __type:', fd.__type);
    
    return axios.post(TEST_API + '/post', fd)
      .then(function(response) {
        console.log('  状态码:', response.status);
        
        var hasFields = response.data.form && 
                       response.data.form.field1 === 'value1' &&
                       response.data.form.username === 'testuser';
        
        if (response.status === 200 && hasFields) {
          addTestResult('基础文本字段', true);
          return true;
        } else {
          addTestResult('基础文本字段', false);
          return false;
        }
      })
      .catch(function(error) {
        addTestResult('基础文本字段', false, { error: error.message });
        return false;
      });
  } catch (e) {
    addTestResult('基础文本字段', false, { error: e.message });
    return Promise.resolve(false);
  }
})();

// ==================== 测试 2: 单文件上传（Blob）====================
console.log('\n📋 测试 2: Node.js FormData 单文件上传');
console.log('----------------------------------------');

var test2 = (function() {
  try {
    var fd = new FormData();
    
    // 创建 Blob 作为文件
    var textContent = 'Hello, this is a test file from Node.js FormData!';
    var blob = new Blob([textContent], { type: 'text/plain' });
    
    fd.append('file', blob, 'test.txt');
    fd.append('description', 'Node.js FormData file upload');
    
    console.log('  Blob 大小:', textContent.length, 'bytes');
    
    return axios.post(TEST_API + '/post', fd)
      .then(function(response) {
        console.log('  状态码:', response.status);
        
        var hasFile = response.data.files && Object.keys(response.data.files).length > 0;
        var hasDesc = response.data.form && response.data.form.description;
        
        console.log('  文件字段:', hasFile ? '✓' : '✗');
        console.log('  描述字段:', hasDesc ? '✓' : '✗');
        
        if (response.status === 200 && hasFile && hasDesc) {
          addTestResult('单文件上传', true);
          return true;
        } else {
          addTestResult('单文件上传', false);
          return false;
        }
      })
      .catch(function(error) {
        addTestResult('单文件上传', false, { error: error.message });
        return false;
      });
  } catch (e) {
    addTestResult('单文件上传', false, { error: e.message });
    return Promise.resolve(false);
  }
})();

// ==================== 测试 3: 多文件上传 ====================
console.log('\n📋 测试 3: Node.js FormData 多文件上传');
console.log('----------------------------------------');

var test3 = (function() {
  try {
    var fd = new FormData();
    
    // 创建多个文件
    var file1 = new Blob(['File 1 content'], { type: 'text/plain' });
    var file2 = new Blob(['File 2 content'], { type: 'text/plain' });
    var file3 = new Blob(['File 3 content'], { type: 'text/plain' });
    
    fd.append('file1', file1, 'file1.txt');
    fd.append('file2', file2, 'file2.txt');
    fd.append('file3', file3, 'file3.txt');
    
    console.log('  上传文件数: 3');
    
    return axios.post(TEST_API + '/post', fd)
      .then(function(response) {
        console.log('  状态码:', response.status);
        
        var fileCount = response.data.files ? Object.keys(response.data.files).length : 0;
        console.log('  服务器接收文件数:', fileCount);
        
        if (response.status === 200 && fileCount === 3) {
          addTestResult('多文件上传', true);
          return true;
        } else {
          addTestResult('多文件上传', false, { expected: 3, actual: fileCount });
          return false;
        }
      })
      .catch(function(error) {
        addTestResult('多文件上传', false, { error: error.message });
        return false;
      });
  } catch (e) {
    addTestResult('多文件上传', false, { error: e.message });
    return Promise.resolve(false);
  }
})();

// ==================== 测试 4: 混合数据（文件+字段）====================
console.log('\n📋 测试 4: Node.js FormData 混合数据');
console.log('----------------------------------------');

var test4 = (function() {
  try {
    var fd = new FormData();
    
    // 文件
    var avatar = new Blob(['avatar image data'], { type: 'image/png' });
    fd.append('avatar', avatar, 'avatar.png');
    
    // 文本字段
    fd.append('username', 'john_doe');
    fd.append('email', 'john@example.com');
    fd.append('age', '30');
    
    console.log('  文件: 1');
    console.log('  字段: 3');
    
    return axios.post(TEST_API + '/post', fd)
      .then(function(response) {
        console.log('  状态码:', response.status);
        
        var hasFile = response.data.files && response.data.files.avatar;
        var hasUsername = response.data.form && response.data.form.username === 'john_doe';
        var hasEmail = response.data.form && response.data.form.email === 'john@example.com';
        
        console.log('  文件字段:', hasFile ? '✓' : '✗');
        console.log('  用户名:', hasUsername ? '✓' : '✗');
        console.log('  邮箱:', hasEmail ? '✓' : '✗');
        
        if (response.status === 200 && hasFile && hasUsername && hasEmail) {
          addTestResult('混合数据上传', true);
          return true;
        } else {
          addTestResult('混合数据上传', false);
          return false;
        }
      })
      .catch(function(error) {
        addTestResult('混合数据上传', false, { error: error.message });
        return false;
      });
  } catch (e) {
    addTestResult('混合数据上传', false, { error: e.message });
    return Promise.resolve(false);
  }
})();

// ==================== 测试 5: 大文件上传（500KB）====================
console.log('\n📋 测试 5: Node.js FormData 大文件上传');
console.log('----------------------------------------');

var test5 = (function() {
  try {
    var fd = new FormData();
    
    // 创建 500KB 的文件
    var largeContent = '';
    for (var i = 0; i < 512 * 1024; i++) {
      largeContent += 'x';
    }
    
    var largeBlob = new Blob([largeContent], { type: 'application/octet-stream' });
    fd.append('largefile', largeBlob, 'large.bin');
    fd.append('size', largeContent.length.toString());
    
    console.log('  文件大小:', (largeContent.length / 1024).toFixed(2), 'KB');
    
    return axios.post(TEST_API + '/post', fd, {
      timeout: 30000 // 30秒超时
    })
      .then(function(response) {
        console.log('  状态码:', response.status);
        
        var hasFile = response.data.files && response.data.files.largefile;
        
        if (response.status === 200 && hasFile) {
          addTestResult('大文件上传（500KB）', true);
          return true;
        } else {
          addTestResult('大文件上传（500KB）', false);
          return false;
        }
      })
      .catch(function(error) {
        addTestResult('大文件上传（500KB）', false, { error: error.message });
        return false;
      });
  } catch (e) {
    addTestResult('大文件上传（500KB）', false, { error: e.message });
    return Promise.resolve(false);
  }
})();

// ==================== 测试 6: 使用 axios 实例 ====================
console.log('\n📋 测试 6: 使用 axios 实例上传');
console.log('----------------------------------------');

var test6 = (function() {
  try {
    var instance = axios.create({
      baseURL: TEST_API,
      timeout: 10000
    });
    
    var fd = new FormData();
    fd.append('file', new Blob(['Instance test'], { type: 'text/plain' }), 'instance.txt');
    fd.append('source', 'axios-instance-with-nodejs-formdata');
    
    return instance.post('/post', fd)
      .then(function(response) {
        console.log('  状态码:', response.status);
        
        var hasFile = response.data.files && Object.keys(response.data.files).length > 0;
        var hasSource = response.data.form && response.data.form.source;
        
        if (response.status === 200 && hasFile && hasSource) {
          addTestResult('axios 实例上传', true);
          return true;
        } else {
          addTestResult('axios 实例上传', false);
          return false;
        }
      })
      .catch(function(error) {
        addTestResult('axios 实例上传', false, { error: error.message });
        return false;
      });
  } catch (e) {
    addTestResult('axios 实例上传', false, { error: e.message });
    return Promise.resolve(false);
  }
})();

// ==================== 测试 7: 真实 R2 API 上传 ====================
console.log('\n📋 测试 7: 真实 R2 API 上传（Node.js FormData）');
console.log('----------------------------------------');

var test7 = (function() {
  try {
    var fd = new FormData();
    
    // 创建测试文件
    var testContent = 'Test file uploaded using axios + Node.js form-data\n';
    testContent += 'Timestamp: ' + new Date().toISOString() + '\n';
    testContent += 'This is a test of the Node.js form-data module integration.';
    
    var blob = new Blob([testContent], { type: 'text/plain' });
    fd.append('file', blob, 'nodejs-formdata-test.txt');
    
    // R2 API 参数
    fd.append('bucket_name', 'renoelis-bucket');
    fd.append('endpoint', 'https://dde39d55fbdb29f35e42ab2de3318461.r2.cloudflarestorage.com');
    fd.append('access_key_id', 'dbe49459ff0a510d1b01674c333c11fe');
    fd.append('secret_access_key', '69b6ad35a5fd32f9ca5bc8a913701db8cdca6073af3c67b83faa748138f2113e');
    fd.append('custom_domain', 'https://bucket.renoelis.dpdns.org');
    fd.append('object_key', 'custom-folder/nodejs-formdata-test.txt');
    
    console.log('  文件大小:', testContent.length, 'bytes');
    console.log('  目标: R2 Storage');
    
    return axios.post('https://api.renoelis.top/R2api/upload-direct', fd, {
      headers: {
        'Authorization': 'Bearer 304b99ee7a9a41a69b1adb6aee7746d2wGgcrXDvVugwh2kL8qPi'
      },
      timeout: 30000
    })
      .then(function(response) {
        console.log('  状态码:', response.status);
        console.log('  响应:', JSON.stringify(response.data).substring(0, 100));
        
        if (response.status === 200 || response.status === 201) {
          addTestResult('R2 API 上传', true);
          return true;
        } else {
          addTestResult('R2 API 上传', false);
          return false;
        }
      })
      .catch(function(error) {
        console.log('  错误:', error.message);
        addTestResult('R2 API 上传', false, { error: error.message });
        return false;
      });
  } catch (e) {
    addTestResult('R2 API 上传', false, { error: e.message });
    return Promise.resolve(false);
  }
})();

// ==================== 等待所有测试完成 ====================
console.log('\n⏳ 等待所有测试完成...\n');

return Promise.allSettled([test1, test2, test3, test4, test5, test6, test7])
  .then(function(results) {
    console.log('\n' + '='.repeat(50));
    console.log('📊 Node.js FormData 测试完成');
    console.log('='.repeat(50));
    console.log('总测试数:', testResults.total);
    console.log('✅ 通过:', testResults.passed, '(' + Math.round(testResults.passed / testResults.total * 100) + '%)');
    console.log('❌ 失败:', testResults.failed);
    console.log('='.repeat(50));
    
    if (testResults.failed > 0) {
      console.log('\n失败的测试:');
      testResults.tests.forEach(function(test) {
        if (!test.passed) {
          console.log('  ❌', test.name);
          if (test.details.error) {
            console.log('     ', test.details.error);
          }
        }
      });
      console.log('');
    }
    
    return {
      total: testResults.total,
      passed: testResults.passed,
      failed: testResults.failed,
      tests: testResults.tests,
      success: testResults.failed === 0
    };
  });

