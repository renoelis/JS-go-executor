/**
 * 测试 axios 上传 Node.js FormData
 * 验证 multipart/form-data 正确发送
 */

const axios = require('axios');
const FormData = require('form-data');

console.log('=== axios + FormData 上传测试 ===\n');

// 创建 FormData
const form = new FormData();

// 添加文本字段
form.append('username', 'testuser');
form.append('email', 'test@example.com');

// 添加文件（Buffer）
const fileContent = Buffer.from('Hello, this is test file content!');
form.append('file', fileContent, {
  filename: 'test.txt',
  contentType: 'text/plain'
});

console.log('📦 FormData 创建成功');
console.log('- 类型标识:', form.__isNodeFormData);
console.log('- Boundary:', form.getBoundary());

// 使用 axios 发送
console.log('\n🚀 发送 POST 请求到 httpbin.org...\n');

return axios.post('https://httpbin.org/post', form)
  .then(function(response) {
    console.log('✅ 请求成功！\n');
    
    const data = response.data;
    
    // 验证结果
    console.log('📊 响应数据分析:');
    console.log('- Status:', response.status);
    console.log('- Content-Type:', data.headers['Content-Type']);
    
    // 检查 form 字段
    console.log('\n📝 Form 字段:');
    console.log('- username:', data.form.username);
    console.log('- email:', data.form.email);
    
    // 检查 files 字段
    console.log('\n📎 Files 字段:');
    if (data.files && data.files.file) {
      console.log('- file:', data.files.file.substring(0, 50) + '...');
    } else {
      console.log('- file: (未找到)');
    }
    
    // 验证测试
    const tests = {
      'Content-Type 包含 multipart/form-data': data.headers['Content-Type']?.includes('multipart/form-data'),
      'username 字段正确': data.form.username === 'testuser',
      'email 字段正确': data.form.email === 'test@example.com',
      'file 字段存在': !!data.files?.file,
      'file 内容正确': data.files?.file?.includes('Hello, this is test file content')
    };
    
    console.log('\n🧪 测试结果:');
    let allPassed = true;
    for (const [test, passed] of Object.entries(tests)) {
      console.log(`${passed ? '✅' : '❌'} ${test}`);
      if (!passed) allPassed = false;
    }
    
    console.log('\n' + (allPassed ? '🎉 所有测试通过！' : '❌ 部分测试失败'));
    
    return {
      success: allPassed,
      status: response.status,
      contentType: data.headers['Content-Type'],
      formFields: data.form,
      files: data.files ? Object.keys(data.files) : []
    };
  })
  .catch(function(error) {
    console.log('❌ 请求失败:', error.message);
    return {
      success: false,
      error: error.message
    };
  });

