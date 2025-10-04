/**
 * Axios 真实文件上传测试
 * 上传文件到 R2 API
 */

const axios = require('axios');

console.log('📋 Axios 真实文件上传测试');
console.log('='.repeat(50));

// API 配置
const API_URL = 'https://api.renoelis.top/R2api/upload-direct';
const AUTH_TOKEN = '304b99ee7a9a41a69b1adb6aee7746d2wGgcrXDvVugwh2kL8qPi';

// 固定参数
const FIXED_PARAMS = {
  bucket_name: 'renoelis-bucket',
  endpoint: 'https://dde39d55fbdb29f35e42ab2de3318461.r2.cloudflarestorage.com',
  access_key_id: 'dbe49459ff0a510d1b01674c333c11fe',
  secret_access_key: '69b6ad35a5fd32f9ca5bc8a913701db8cdca6073af3c67b83faa748138f2113e',
  custom_domain: 'https://bucket.renoelis.dpdns.org',
  object_key: 'custom-folder/test-axios-upload.txt'
};

// 测试结果
var testResults = {
  total: 0,
  passed: 0,
  failed: 0
};

function addResult(name, passed) {
  testResults.total++;
  if (passed) {
    testResults.passed++;
    console.log('✅ ' + name);
  } else {
    testResults.failed++;
    console.log('❌ ' + name);
  }
}

// ==================== 测试 1: 小文本文件上传 ====================
console.log('\n📋 测试 1: 小文本文件上传（100 bytes）');
console.log('----------------------------------------');

var test1 = (function() {
  try {
    var fd = new FormData();
    
    // 创建一个小文本文件
    var textContent = 'This is a test file created by axios.\n';
    textContent += 'Testing file upload functionality.\n';
    textContent += 'Timestamp: ' + new Date().toISOString();
    
    var blob = new Blob([textContent], { type: 'text/plain' });
    
    // 添加文件（使用正确的字段名）
    fd.append('file', blob, 'test-axios-upload.txt');
    
    // 添加所有固定参数
    for (var key in FIXED_PARAMS) {
      if (FIXED_PARAMS.hasOwnProperty(key)) {
        fd.append(key, FIXED_PARAMS[key]);
      }
    }
    
    console.log('  文件大小:', textContent.length, 'bytes');
    console.log('  上传中...');
    
    return axios.post(API_URL, fd, {
      headers: {
        'Authorization': 'Bearer ' + AUTH_TOKEN
      },
      timeout: 30000  // 30秒超时
    })
      .then(function(response) {
        console.log('  状态码:', response.status);
        console.log('  响应数据:', JSON.stringify(response.data).substring(0, 200));
        
        if (response.status === 200 || response.status === 201) {
          addResult('小文本文件上传', true);
          return true;
        } else {
          console.log('  ⚠️ 状态码异常:', response.status);
          addResult('小文本文件上传', false);
          return false;
        }
      })
      .catch(function(error) {
        console.log('  错误:', error.message);
        if (error.response) {
          console.log('  响应状态:', error.response.status);
          console.log('  响应数据:', JSON.stringify(error.response.data).substring(0, 200));
        }
        addResult('小文本文件上传', false);
        return false;
      });
  } catch (e) {
    console.log('  创建失败:', e.message);
    addResult('小文本文件上传', false);
    return Promise.resolve(false);
  }
})();

// ==================== 测试 2: 中等大小文件（10KB）====================
console.log('\n📋 测试 2: 中等大小文件上传（10KB）');
console.log('----------------------------------------');

var test2 = (function() {
  try {
    var fd = new FormData();
    
    // 创建 10KB 的文件内容
    var content = '';
    for (var i = 0; i < 10240; i++) {
      content += String.fromCharCode(65 + (i % 26)); // A-Z 循环
    }
    
    var blob = new Blob([content], { type: 'text/plain' });
    fd.append('file', blob, 'test-10kb.txt');
    
    // 添加参数
    var params = Object.assign({}, FIXED_PARAMS);
    params.object_key = 'custom-folder/test-10kb.txt';
    
    for (var key in params) {
      if (params.hasOwnProperty(key)) {
        fd.append(key, params[key]);
      }
    }
    
    console.log('  文件大小:', (content.length / 1024).toFixed(2), 'KB');
    console.log('  上传中...');
    
    return axios.post(API_URL, fd, {
      headers: {
        'Authorization': 'Bearer ' + AUTH_TOKEN
      },
      timeout: 30000
    })
      .then(function(response) {
        console.log('  状态码:', response.status);
        
        if (response.status === 200 || response.status === 201) {
          addResult('中等文件上传（10KB）', true);
          return true;
        } else {
          addResult('中等文件上传（10KB）', false);
          return false;
        }
      })
      .catch(function(error) {
        console.log('  错误:', error.message);
        addResult('中等文件上传（10KB）', false);
        return false;
      });
  } catch (e) {
    console.log('  创建失败:', e.message);
    addResult('中等文件上传（10KB）', false);
    return Promise.resolve(false);
  }
})();

// ==================== 测试 3: JSON 数据文件 ====================
console.log('\n📋 测试 3: JSON 数据文件上传');
console.log('----------------------------------------');

var test3 = (function() {
  try {
    var fd = new FormData();
    
    // 创建 JSON 文件
    var jsonData = {
      test: 'axios upload test',
      timestamp: new Date().toISOString(),
      data: {
        numbers: [1, 2, 3, 4, 5],
        text: 'Hello World',
        nested: {
          value: true
        }
      }
    };
    
    var jsonString = JSON.stringify(jsonData, null, 2);
    var blob = new Blob([jsonString], { type: 'application/json' });
    fd.append('file', blob, 'test-data.json');
    
    // 添加参数
    var params = Object.assign({}, FIXED_PARAMS);
    params.object_key = 'custom-folder/test-data.json';
    
    for (var key in params) {
      if (params.hasOwnProperty(key)) {
        fd.append(key, params[key]);
      }
    }
    
    console.log('  文件类型: application/json');
    console.log('  文件大小:', jsonString.length, 'bytes');
    console.log('  上传中...');
    
    return axios.post(API_URL, fd, {
      headers: {
        'Authorization': 'Bearer ' + AUTH_TOKEN
      },
      timeout: 30000
    })
      .then(function(response) {
        console.log('  状态码:', response.status);
        
        if (response.status === 200 || response.status === 201) {
          addResult('JSON 文件上传', true);
          return true;
        } else {
          addResult('JSON 文件上传', false);
          return false;
        }
      })
      .catch(function(error) {
        console.log('  错误:', error.message);
        addResult('JSON 文件上传', false);
        return false;
      });
  } catch (e) {
    console.log('  创建失败:', e.message);
    addResult('JSON 文件上传', false);
    return Promise.resolve(false);
  }
})();

// ==================== 测试 4: 二进制图片数据 ====================
console.log('\n📋 测试 4: 模拟二进制图片上传');
console.log('----------------------------------------');

var test4 = (function() {
  try {
    var fd = new FormData();
    
    // 创建模拟的二进制数据（PNG 文件头）
    var pngHeader = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
    var fakeImageData = new Uint8Array(1024);
    for (var i = 0; i < fakeImageData.length; i++) {
      fakeImageData[i] = Math.floor(Math.random() * 256);
    }
    
    // 合并数据
    var combined = new Uint8Array(pngHeader.length + fakeImageData.length);
    combined.set(pngHeader, 0);
    combined.set(fakeImageData, pngHeader.length);
    
    var blob = new Blob([combined], { type: 'image/png' });
    fd.append('file', blob, 'test-image.png');
    
    // 添加参数
    var params = Object.assign({}, FIXED_PARAMS);
    params.object_key = 'custom-folder/test-image.png';
    
    for (var key in params) {
      if (params.hasOwnProperty(key)) {
        fd.append(key, params[key]);
      }
    }
    
    console.log('  文件类型: image/png');
    console.log('  文件大小:', combined.length, 'bytes');
    console.log('  上传中...');
    
    return axios.post(API_URL, fd, {
      headers: {
        'Authorization': 'Bearer ' + AUTH_TOKEN
      },
      timeout: 30000
    })
      .then(function(response) {
        console.log('  状态码:', response.status);
        
        if (response.status === 200 || response.status === 201) {
          addResult('二进制图片上传', true);
          return true;
        } else {
          addResult('二进制图片上传', false);
          return false;
        }
      })
      .catch(function(error) {
        console.log('  错误:', error.message);
        addResult('二进制图片上传', false);
        return false;
      });
  } catch (e) {
    console.log('  创建失败:', e.message);
    addResult('二进制图片上传', false);
    return Promise.resolve(false);
  }
})();

// ==================== 等待所有测试完成 ====================
console.log('\n⏳ 等待所有测试完成...\n');

return Promise.all([test1, test2, test3, test4])
  .then(function(results) {
    console.log('\n' + '='.repeat(50));
    console.log('📊 真实文件上传测试完成');
    console.log('='.repeat(50));
    console.log('总测试数:', testResults.total);
    console.log('✅ 通过:', testResults.passed);
    console.log('❌ 失败:', testResults.failed);
    console.log('通过率:', Math.round(testResults.passed / testResults.total * 100) + '%');
    console.log('='.repeat(50));
    
    return {
      total: testResults.total,
      passed: testResults.passed,
      failed: testResults.failed,
      success: testResults.failed === 0
    };
  });

