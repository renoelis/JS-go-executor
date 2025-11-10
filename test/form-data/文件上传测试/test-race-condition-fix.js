/**
 * 测试竞态条件修复
 * 验证大文件（>1MB）流式上传时，所有字段都能正确传递
 */

const axios = require('axios');
const FormData = require('form-data');

console.log('=== 测试竞态条件修复 ===\n');

const CONFIG = {
  uploadUrl: 'https://api.renoelis.top/R2api/upload-direct',
  bearerToken: 'Bearer 304b99ee7a9a41a69b1adb6aee7746d2wGgcrXDvVugwh2kL8qPi',
  r2Config: {
    bucket_name: 'renoelis-bucket',
    endpoint: 'https://dde39d55fbdb29f35e42ab2de3318461.r2.cloudflarestorage.com',
    access_key_id: 'dbe49459ff0a510d1b01674c333c11fe',
    secret_access_key: '69b6ad35a5fd32f9ca5bc8a913701db8cdca6073af3c67b83faa748138f2113e',
    custom_domain: 'https://bucket.renoelis.dpdns.org',
  },
};

async function testUpload() {
  try {
    // 创建 2MB 文件（触发流式模式）
    console.log('1. 创建 2MB 测试文件...');
    const fileSize = 1 * 1024 * 1024;
    const fileData = Buffer.alloc(fileSize);
    for (let i = 0; i < fileSize; i++) {
      fileData[i] = i % 256;
    }
    console.log('   ✅ 文件创建完成:', fileSize, 'bytes');

    // 创建 FormData
    console.log('\n2. 创建 FormData...');
    const formData = new FormData();
    
    const filename = 'race-test-' + Date.now() + '.bin';
    const objectKey = 'test-race/' + filename;
    
    // 🔥 关键：先添加普通字段，后添加文件
    // 这样可以确保字段不会在流式处理时丢失
    console.log('   添加配置字段...');
    formData.append('bucket_name', CONFIG.r2Config.bucket_name);
    formData.append('endpoint', CONFIG.r2Config.endpoint);
    formData.append('access_key_id', CONFIG.r2Config.access_key_id);
    formData.append('secret_access_key', CONFIG.r2Config.secret_access_key);
    formData.append('custom_domain', CONFIG.r2Config.custom_domain);
    formData.append('object_key', objectKey);
    formData.append('file_size', fileSize.toString());
    
    console.log('   添加文件...');
    formData.append('file', fileData, {
      filename: filename,
      contentType: 'application/octet-stream'
    });
    
    console.log('   ✅ FormData 创建完成');

    // 检查 FormData 大小
    const totalSize = formData.getLengthSync();
    console.log('   FormData 总大小:', totalSize, 'bytes');
    console.log('   预期使用模式:', totalSize >= 1024 * 1024 ? '流式模式' : '缓冲模式');

    // 发送请求
    console.log('\n3. 发送上传请求...');
    const response = await axios.post(
      CONFIG.uploadUrl,
      formData,
      {
        headers: {
          ...formData.getHeaders(),
          'Authorization': CONFIG.bearerToken
        },
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
      }
    );

    console.log('\n✅ 上传成功！');
    console.log('   状态码:', response.status);
    console.log('   响应数据:', JSON.stringify(response.data, null, 2));

    return {
      success: true,
      status: response.status,
      data: response.data,
      fileSize: fileSize,
      totalSize: totalSize
    };

  } catch (error) {
    console.log('\n❌ 上传失败！');
    console.log('   错误:', error.message);

    const result = {
      success: false,
      error: error.message
    };

    if (error.response) {
      console.log('   状态码:', error.response.status);
      console.log('   响应数据:', JSON.stringify(error.response.data, null, 2));
      
      result.status = error.response.status;
      result.responseData = error.response.data;
      
      // 🔥 如果还是报 bucket_name 必填，说明修复不完整
      if (error.response.data && error.response.data.message && 
          error.response.data.message.includes('bucket_name')) {
        console.log('\n⚠️  警告：bucket_name 参数仍然丢失！');
        console.log('   这表明竞态条件修复可能不完整');
      }
    }

    return result;
  }
}

// 运行测试
return testUpload();
