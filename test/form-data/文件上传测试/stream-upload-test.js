/**
 * 流式上传测试 - 验证大于1MB文件的流式上传功能
 * 
 * 测试场景：
 * 1. 从远程 URL 下载文件流（不加载到内存）
 * 2. 将流直接添加到 FormData
 * 3. 使用 axios 上传（应该支持流式传输）
 * 
 * 预期结果：
 * - 大文件（>1MB）应该使用流式上传
 * - 内存占用保持稳定
 * - 上传成功
 */

const axios = require('axios');
const FormData = require('form-data');

console.log('=== 流式上传测试 ===\n');

/**
 * 测试1: 小文件上传（< 1MB） - 应该使用缓冲模式
 */
async function testSmallFile() {
  console.log('📦 测试1: 小文件上传（缓冲模式）');
  console.log('   文件大小: 500KB');
  
  try {
    const form = new FormData();
    
    // 创建 500KB 的测试数据
    const smallData = Buffer.alloc(500 * 1024, 'A');
    form.append('file', smallData, {
      filename: 'small-test.bin',
      contentType: 'application/octet-stream'
    });
    
    // 添加配置字段
    form.append('bucket_name', 'renoelis-bucket');
    form.append('endpoint', 'https://dde39d55fbdb29f35e42ab2de3318461.r2.cloudflarestorage.com');
    form.append('access_key_id', 'dbe49459ff0a510d1b01674c333c11fe');
    form.append('secret_access_key', '69b6ad35a5fd32f9ca5bc8a913701db8cdca6073af3c67b83faa748138f2113e');
    form.append('custom_domain', 'https://bucket.renoelis.dpdns.org');
    form.append('object_key', 'test/small-file-' + Date.now() + '.bin');
    
    // 发送请求
    const response = await axios.post(
      'https://api.renoelis.top/R2api/upload-direct',
      form,
      {
        headers: {
          ...form.getHeaders(),
          'Authorization': 'Bearer 304b99ee7a9a41a69b1adb6aee7746d2wGgcrXDvVugwh2kL8qPi'
        },
        maxBodyLength: Infinity,
        maxContentLength: Infinity
      }
    );
    
    console.log('   ✅ 成功！状态码:', response.status);
    console.log('   响应:', JSON.stringify(response.data, null, 2));
    return true;
  } catch (error) {
    console.log('   ❌ 失败:', error.message);
    if (error.response) {
      console.log('   状态码:', error.response.status);
      console.log('   响应:', error.response.data);
    }
    return false;
  }
}

/**
 * 测试2: 大文件上传（> 1MB） - 应该使用流式模式
 */
async function testLargeFile() {
  console.log('\n📦 测试2: 大文件上传（流式模式）');
  console.log('   文件大小: 4MB');
  console.log('   注意: 使用 stream 而不是 Buffer，才是真正的流式');
  
  try {
    const form = new FormData();
    
    // 🔥 使用流式：从远程下载大文件作为 stream
    console.log('   正在下载远程大文件流...');
    const largeFileUrl = 'https://qingliu-obs.obs.cn-north-1.myhuaweicloud.com/documents/data/invite/13569E7/27288222-7e5c-4bfd-ab52-ba564ac911b5.jpg'; // 4MB
    const fileResponse = await axios.get(largeFileUrl, { 
      responseType: 'stream'  // 🔥 关键：使用 stream
    });
    
    console.log('   ✅ 获取文件流成功');
    
    // 🔥 添加 stream（不是 Buffer）
    form.append('file', fileResponse.data, {
      filename: 'large-test.bin',
      contentType: 'application/octet-stream'
    });
    
    // 添加配置字段
    form.append('bucket_name', 'renoelis-bucket');
    form.append('endpoint', 'https://dde39d55fbdb29f35e42ab2de3318461.r2.cloudflarestorage.com');
    form.append('access_key_id', 'dbe49459ff0a510d1b01674c333c11fe');
    form.append('secret_access_key', '69b6ad35a5fd32f9ca5bc8a913701db8cdca6073af3c67b83faa748138f2113e');
    form.append('custom_domain', 'https://bucket.renoelis.dpdns.org');
    form.append('object_key', 'test/large-file-' + Date.now() + '.bin');
    
    // 发送请求
    const response = await axios.post(
      'https://api.renoelis.top/R2api/upload-direct',
      form,
      {
        headers: {
          ...form.getHeaders(),
          'Authorization': 'Bearer 304b99ee7a9a41a69b1adb6aee7746d2wGgcrXDvVugwh2kL8qPi'
        },
        maxBodyLength: Infinity,
        maxContentLength: Infinity
      }
    );
    
    console.log('   ✅ 成功！状态码:', response.status);
    console.log('   响应:', JSON.stringify(response.data, null, 2));
    return true;
  } catch (error) {
    console.log('   ❌ 失败:', error.message);
    if (error.response) {
      console.log('   状态码:', error.response.status);
      console.log('   响应:', error.response.data);
    }
    return false;
  }
}

/**
 * 测试3: 远程文件流式上传 - 真实场景
 */
async function testRemoteFileStream() {
  console.log('\n📦 测试3: 远程文件流式上传（真实场景）');
  
  try {
    // Step 1: 下载远程文件为 Stream
    console.log('   Step 1: 下载远程文件流...');
    const fileUrl = 'https://qingliu-obs.obs.cn-north-1.myhuaweicloud.com/documents/data/invite/13569E7/27288222-7e5c-4bfd-ab52-ba564ac911b5.jpg';
    const fileResponse = await axios.get(fileUrl, { responseType: 'stream' });
    console.log('   ✅ 文件流获取成功');
    
    // Step 2: 创建 FormData 并添加流
    console.log('   Step 2: 创建 FormData 并添加流...');
    const form = new FormData();
    form.append('file', fileResponse.data, 'upload.jpg');
    
    // 添加配置字段
    form.append('bucket_name', 'renoelis-bucket');
    form.append('endpoint', 'https://dde39d55fbdb29f35e42ab2de3318461.r2.cloudflarestorage.com');
    form.append('access_key_id', 'dbe49459ff0a510d1b01674c333c11fe');
    form.append('secret_access_key', '69b6ad35a5fd32f9ca5bc8a913701db8cdca6073af3c67b83faa748138f2113e');
    form.append('custom_domain', 'https://bucket.renoelis.dpdns.org');
    form.append('object_key', 'test/stream-upload-' + Date.now() + '.jpg');
    console.log('   ✅ FormData 创建完成');
    
    // Step 3: 发送上传请求
    console.log('   Step 3: 发送上传请求...');
    const response = await axios.post(
      'https://api.renoelis.top/R2api/upload-direct',
      form,
      {
        headers: {
          ...form.getHeaders(),
          'Authorization': 'Bearer 304b99ee7a9a41a69b1adb6aee7746d2wGgcrXDvVugwh2kL8qPi'
        },
        maxBodyLength: Infinity,
        maxContentLength: Infinity
      }
    );
    
    console.log('   ✅ 上传成功！状态码:', response.status);
    console.log('   响应:', JSON.stringify(response.data, null, 2));
    return true;
  } catch (error) {
    console.log('   ❌ 失败:', error.message);
    if (error.response) {
      console.log('   状态码:', error.response.status);
      console.log('   响应数据:', error.response.data);
    }
    return false;
  }
}

// 执行所有测试
async function runAllTests() {
  const results = {
    smallFile: false,
    largeFile: false,
    remoteStream: false
  };
  
  results.smallFile = await testSmallFile();
  results.largeFile = await testLargeFile();
  results.remoteStream = await testRemoteFileStream();
  
  // 汇总结果
  console.log('\n' + '='.repeat(50));
  console.log('测试结果汇总:');
  console.log('  小文件上传:', results.smallFile ? '✅ 通过' : '❌ 失败');
  console.log('  大文件上传:', results.largeFile ? '✅ 通过' : '❌ 失败');
  console.log('  远程流上传:', results.remoteStream ? '✅ 通过' : '❌ 失败');
  console.log('='.repeat(50));
  
  const allPassed = results.smallFile && results.largeFile && results.remoteStream;
  return {
    success: allPassed,
    results: results
  };
}

// 运行测试
return runAllTests();
