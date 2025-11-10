/**
 * 诊断测试：排查 "Request canceled" 的真实原因
 */

const axios = require('axios');
const FormData = require('form-data');

console.log('=== Stream Upload Cancel 诊断测试 ===\n');

/**
 * 测试1: 直接上传 Buffer（非流式）- 作为对照组
 */
async function testBufferUpload() {
  console.log('【测试1】Buffer 上传（对照组）');
  
  try {
    const form = new FormData();
    
    // 创建 500KB Buffer
    const buffer = Buffer.alloc(500 * 1024, 'A');
    console.log('  Buffer 大小:', buffer.length, '字节');
    
    form.append('file', buffer, {
      filename: 'test-buffer.bin',
      contentType: 'application/octet-stream'
    });
    
    // 添加必要字段
    form.append('bucket_name', 'renoelis-bucket');
    form.append('endpoint', 'https://dde39d55fbdb29f35e42ab2de3318461.r2.cloudflarestorage.com');
    form.append('access_key_id', 'dbe49459ff0a510d1b01674c333c11fe');
    form.append('secret_access_key', '69b6ad35a5fd32f9ca5bc8a913701db8cdca6073af3c67b83faa748138f2113e');
    form.append('custom_domain', 'https://bucket.renoelis.dpdns.org');
    form.append('object_key', 'test/debug-buffer-' + Date.now() + '.bin');
    
    console.log('  开始上传...');
    const startTime = Date.now();
    
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
    
    const elapsed = Date.now() - startTime;
    console.log('  ✅ 成功！耗时:', elapsed + 'ms');
    console.log('  响应:', response.status, response.statusText);
    return true;
  } catch (error) {
    console.log('  ❌ 失败:', error.message);
    if (error.response) {
      console.log('  状态码:', error.response.status);
      console.log('  响应:', error.response.data);
    }
    return false;
  }
}

/**
 * 测试2: 下载小文件 stream，立即上传
 */
async function testSmallStreamQuick() {
  console.log('\n【测试2】小文件 Stream 上传（立即上传）');
  
  try {
    // Step 1: 下载小文件流
    console.log('  Step 1: 下载文件流（50KB）...');
    const downloadStart = Date.now();
    const fileUrl = 'https://httpbin.org/bytes/51200'; // 50KB
    const fileResponse = await axios.get(fileUrl, { 
      responseType: 'stream',
      timeout: 10000
    });
    const downloadTime = Date.now() - downloadStart;
    console.log('  ✅ 下载完成，耗时:', downloadTime + 'ms');
    
    // Step 2: 立即创建 FormData
    console.log('  Step 2: 创建 FormData...');
    const form = new FormData();
    form.append('file', fileResponse.data, {
      filename: 'test-stream-small.bin',
      contentType: 'application/octet-stream'
    });
    
    form.append('bucket_name', 'renoelis-bucket');
    form.append('endpoint', 'https://dde39d55fbdb29f35e42ab2de3318461.r2.cloudflarestorage.com');
    form.append('access_key_id', 'dbe49459ff0a510d1b01674c333c11fe');
    form.append('secret_access_key', '69b6ad35a5fd32f9ca5bc8a913701db8cdca6073af3c67b83faa748138f2113e');
    form.append('custom_domain', 'https://bucket.renoelis.dpdns.org');
    form.append('object_key', 'test/debug-stream-small-' + Date.now() + '.bin');
    
    // Step 3: 立即上传
    console.log('  Step 3: 开始上传...');
    const uploadStart = Date.now();
    
    const response = await axios.post(
      'https://api.renoelis.top/R2api/upload-direct',
      form,
      {
        headers: {
          ...form.getHeaders(),
          'Authorization': 'Bearer 304b99ee7a9a41a69b1adb6aee7746d2wGgcrXDvVugwh2kL8qPi'
        },
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
        timeout: 30000
      }
    );
    
    const uploadTime = Date.now() - uploadStart;
    console.log('  ✅ 上传成功！耗时:', uploadTime + 'ms');
    console.log('  总耗时:', (Date.now() - downloadStart) + 'ms');
    console.log('  响应:', response.status, response.statusText);
    return true;
  } catch (error) {
    console.log('  ❌ 失败:', error.message);
    if (error.response) {
      console.log('  状态码:', error.response.status);
      console.log('  响应:', error.response.data);
    }
    return false;
  }
}

/**
 * 测试3: 下载文件 stream，延迟5秒后上传
 */
async function testStreamWithDelay() {
  console.log('\n【测试3】Stream 下载后延迟上传（测试空闲超时）');
  
  try {
    // Step 1: 下载文件流
    console.log('  Step 1: 下载文件流（50KB）...');
    const fileUrl = 'https://httpbin.org/bytes/51200';
    const fileResponse = await axios.get(fileUrl, { 
      responseType: 'stream',
      timeout: 10000
    });
    console.log('  ✅ 文件流获取成功');
    
    // Step 2: 延迟 5 秒
    console.log('  Step 2: 等待 5 秒...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    console.log('  ✅ 等待完成');
    
    // Step 3: 创建 FormData
    console.log('  Step 3: 创建 FormData...');
    const form = new FormData();
    form.append('file', fileResponse.data, {
      filename: 'test-stream-delay.bin',
      contentType: 'application/octet-stream'
    });
    
    form.append('bucket_name', 'renoelis-bucket');
    form.append('endpoint', 'https://dde39d55fbdb29f35e42ab2de3318461.r2.cloudflarestorage.com');
    form.append('access_key_id', 'dbe49459ff0a510d1b01674c333c11fe');
    form.append('secret_access_key', '69b6ad35a5fd32f9ca5bc8a913701db8cdca6073af3c67b83faa748138f2113e');
    form.append('custom_domain', 'https://bucket.renoelis.dpdns.org');
    form.append('object_key', 'test/debug-stream-delay-' + Date.now() + '.bin');
    
    // Step 4: 上传
    console.log('  Step 4: 开始上传...');
    const response = await axios.post(
      'https://api.renoelis.top/R2api/upload-direct',
      form,
      {
        headers: {
          ...form.getHeaders(),
          'Authorization': 'Bearer 304b99ee7a9a41a69b1adb6aee7746d2wGgcrXDvVugwh2kL8qPi'
        },
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
        timeout: 30000
      }
    );
    
    console.log('  ✅ 上传成功！');
    console.log('  响应:', response.status, response.statusText);
    return true;
  } catch (error) {
    console.log('  ❌ 失败:', error.message);
    console.log('  错误类型:', error.code || 'unknown');
    if (error.response) {
      console.log('  状态码:', error.response.status);
      console.log('  响应:', error.response.data);
    }
    return false;
  }
}

/**
 * 测试4: 真实场景 - 华为云图片上传
 */
async function testRealScenario() {
  console.log('\n【测试4】真实场景 - 华为云图片上传');
  
  try {
    // Step 1: 下载
    console.log('  Step 1: 下载华为云图片...');
    const downloadStart = Date.now();
    const fileUrl = 'https://qingliu-obs.obs.cn-north-1.myhuaweicloud.com/documents/data/invite/13569E7/27288222-7e5c-4bfd-ab52-ba564ac911b5.jpg';
    const fileResponse = await axios.get(fileUrl, { 
      responseType: 'stream',
      timeout: 15000 // 增加超时时间
    });
    const downloadTime = Date.now() - downloadStart;
    console.log('  ✅ 下载完成，耗时:', downloadTime + 'ms');
    console.log('  Content-Length:', fileResponse.headers['content-length']);
    console.log('  Content-Type:', fileResponse.headers['content-type']);
    
    // Step 2: 创建 FormData
    console.log('  Step 2: 创建 FormData...');
    const form = new FormData();
    form.append('file', fileResponse.data, 'upload.jpg');
    
    form.append('bucket_name', 'renoelis-bucket');
    form.append('endpoint', 'https://dde39d55fbdb29f35e42ab2de3318461.r2.cloudflarestorage.com');
    form.append('access_key_id', 'dbe49459ff0a510d1b01674c333c11fe');
    form.append('secret_access_key', '69b6ad35a5fd32f9ca5bc8a913701db8cdca6073af3c67b83faa748138f2113e');
    form.append('custom_domain', 'https://bucket.renoelis.dpdns.org');
    form.append('object_key', 'test/real-scenario-' + Date.now() + '.jpg');
    console.log('  ✅ FormData 创建完成');
    
    // Step 3: 上传
    console.log('  Step 3: 开始上传...');
    const uploadStart = Date.now();
    
    const response = await axios.post(
      'https://api.renoelis.top/R2api/upload-direct',
      form,
      {
        headers: {
          ...form.getHeaders(),
          'Authorization': 'Bearer 304b99ee7a9a41a69b1adb6aee7746d2wGgcrXDvVugwh2kL8qPi'
        },
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
        timeout: 60000 // 60秒超时
      }
    );
    
    const uploadTime = Date.now() - uploadStart;
    const totalTime = Date.now() - downloadStart;
    
    console.log('  ✅ 上传成功！');
    console.log('  上传耗时:', uploadTime + 'ms');
    console.log('  总耗时:', totalTime + 'ms');
    console.log('  响应:', response.status, response.statusText);
    return true;
  } catch (error) {
    console.log('  ❌ 失败:', error.message);
    console.log('  错误代码:', error.code || 'unknown');
    if (error.response) {
      console.log('  HTTP 状态:', error.response.status);
      console.log('  响应数据:', error.response.data);
    }
    return false;
  }
}

// 执行所有测试
async function runDiagnostics() {
  console.log('开始诊断测试...\n');
  
  const results = {
    buffer: await testBufferUpload(),
    smallStreamQuick: await testSmallStreamQuick(),
    streamWithDelay: await testStreamWithDelay(),
    realScenario: await testRealScenario()
  };
  
  console.log('\n' + '='.repeat(60));
  console.log('诊断结果汇总:');
  console.log('  Buffer 上传（对照）:', results.buffer ? '✅' : '❌');
  console.log('  小文件立即上传:', results.smallStreamQuick ? '✅' : '❌');
  console.log('  延迟5秒后上传:', results.streamWithDelay ? '✅' : '❌');
  console.log('  真实场景（华为云）:', results.realScenario ? '✅' : '❌');
  console.log('='.repeat(60));
  
  // 分析
  console.log('\n诊断分析:');
  if (results.buffer && !results.smallStreamQuick) {
    console.log('  💡 Stream 本身有问题（Buffer 可以但 Stream 不行）');
  } else if (results.smallStreamQuick && !results.streamWithDelay) {
    console.log('  💡 延迟后空闲超时触发（立即上传可以但延迟失败）');
  } else if (results.smallStreamQuick && !results.realScenario) {
    console.log('  💡 真实场景有特殊问题（小文件可以但华为云失败）');
  } else if (!results.buffer && !results.smallStreamQuick) {
    console.log('  💡 上传服务本身有问题（所有测试都失败）');
  }
  
  return results;
}

// 运行
return runDiagnostics();

