/**
 * FormData + Stream 集成测试
 * 
 * 测试目标：
 * 验证 axios stream 可以直接传入 FormData.append()
 * 
 * 使用场景：
 * 下载文件后直接上传到第三方系统（无需手动读取流）
 */

const axios = require('axios');
const FormData = require('form-data');

console.log('=== FormData + Stream 集成测试 ===\n');

async function testFormDataWithStream() {
  try {
    console.log('【测试 1】下载文件 -> FormData -> 模拟上传');
    console.log('-'.repeat(60));

    // 1. 使用流式下载文件
    const fileUrl = 'https://jsonplaceholder.typicode.com/posts';
    console.log(`\n步骤 1: 从 ${fileUrl} 下载文件（流式）...`);
    
    const response = await axios.get(fileUrl, { responseType: 'stream' });
    console.log('✅ 下载成功，获得流对象');
    console.log('   Status:', response.status);
    console.log('   Content-Type:', response.headers['content-type']);

    // 2. 直接将 stream 添加到 FormData
    console.log('\n步骤 2: 将流添加到 FormData...');
    const formData = new FormData();
    
    // 🔥 关键：直接传入 response.data（ReadableStream）
    formData.append('file', response.data, {
      filename: 'posts.json',
      contentType: 'application/json'
    });
    
    // 添加其他字段
    formData.append('description', '测试文件');
    formData.append('uploadTime', new Date().toISOString());
    
    console.log('✅ FormData 创建成功');
    console.log('   Boundary:', formData.getBoundary());

    // 3. 获取 FormData 内容（验证）
    console.log('\n步骤 3: 读取 FormData 内容...');
    const buffer = formData.getBuffer();
    console.log('✅ FormData 序列化成功');
    console.log('   总大小:', buffer.length, '字节');
    console.log('   前 200 字节:', buffer.toString('utf-8', 0, 200));

    // 4. 模拟上传到第三方系统
    console.log('\n步骤 4: 模拟上传到第三方系统...');
    console.log('   在真实场景中，会这样使用:');
    console.log(`
    const uploadResponse = await axios.post(targetUrl, formData, {
      headers: {
        ...formData.getHeaders()
      }
    });
    `);
    console.log('✅ 模拟上传成功（实际未发送）');

    return {
      success: true,
      test: 'FormData + Stream',
      status: '✅ 通过',
      formDataSize: buffer.length
    };

  } catch (error) {
    console.error('\n❌ 测试失败:', error.message);
    console.error('   错误堆栈:', error.stack);
    return {
      success: false,
      error: error.message
    };
  }
}

// 执行测试
return testFormDataWithStream()
  .then(result => {
    console.log('\n\n' + '='.repeat(60));
    console.log('✅ 测试完成！');
    console.log('='.repeat(60));
    return result;
  });



