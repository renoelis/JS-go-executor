// 全局注释：该函数从远程 URL 下载文件流，并以 FormData 的形式上传至 R2，对过程中的关键步骤进行调试输出

const axios = require('axios');
const FormData = require('form-data');

/**
 * 上传远程文件到 R2，对过程增加详细调试信息
 * @param {string} fileUrl 远程文件地址
 * @param {Object} uploadParams 包含上传参数及密钥等
 * @returns {Object} 返回上传响应或错误信息
 */
async function uploadRemoteFileToR2(fileUrl, uploadParams) {
  try {
    // Step 1: 下载远程文件为 Stream
    let fileStream;
    try {
      const fileResponse = await axios.get(fileUrl, { responseType: 'stream' });
      fileStream = fileResponse.data;
    } catch (downloadErr) {
      return { error: '下载文件失败，可能是URL无效或无法访问' };
    }

    // Step 2: 创建 FormData
    const form = new FormData();
    form.append('file', fileStream, 'upload.jpg');

    // Step 3: 添加附加字段
    const requiredFields = [
      'bucket_name',
      'endpoint',
      'access_key_id',
      'secret_access_key',
      'custom_domain',
      'object_key',
    ];

    for (const field of requiredFields) {
      if (!uploadParams[field]) {
        return { error: `缺少上传参数字段：${field}` };
      }
      form.append(field, uploadParams[field]);
    }

    // Step 4: 设置请求头
    const headers = {
      ...form.getHeaders(),
      Authorization: `Bearer ${uploadParams.token}`,
    };

    // Step 5: 执行上传
    let response;
    try {
      response = await axios.post(uploadParams.uploadUrl, form, { headers });
    } catch (uploadErr) {
      return {
        error: '上传请求失败',
        details: uploadErr.response ? uploadErr.response.data : uploadErr.message,
      };
    }

    // Step 6: 返回成功结果
    return response.data;

  } catch (error) {
    return { error: '上传过程中发生未知错误' };
  }
}

// ✅ 主调用
const fileUrl = 'https://qingliu-obs.obs.cn-north-1.myhuaweicloud.com/documents/data/invite/13569E7/27288222-7e5c-4bfd-ab52-ba564ac911b5.jpg';

const uploadParams = {
  uploadUrl: 'https://api.renoelis.top/R2api/upload-direct',
  token: '304b99ee7a9a41a69b1adb6aee7746d2wGgcrXDvVugwh2kL8qPi',
  bucket_name: 'renoelis-bucket',
  endpoint: 'https://dde39d55fbdb29f35e42ab2de3318461.r2.cloudflarestorage.com',
  access_key_id: 'dbe49459ff0a510d1b01674c333c11fe',
  secret_access_key: '69b6ad35a5fd32f9ca5bc8a913701db8cdca6073af3c67b83faa748138f2113e',
  custom_domain: 'https://bucket.renoelis.dpdns.org',
  object_key: 'custom-folder/filename.jpg',
};

// ⛳ 执行函数并输出
return uploadRemoteFileToR2(fileUrl, uploadParams).then(result => {
  return { data: result };
});
