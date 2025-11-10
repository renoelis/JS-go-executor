/**
 * 完整文件上传流程测试
 * 
 * 模拟真实场景：
 * 1. 从轻流（或 OSS）下载文件（流式）
 * 2. 直接转发到第三方系统（不落盘）
 * 
 * 这是用户最初的使用场景
 */

const axios = require('axios');
const FormData = require('form-data');

// 模拟输入参数
const mockInput = {
  qflowUrl: 'https://jsonplaceholder.typicode.com/posts/1',
  targetUrl: 'https://httpbin.org/post' // 用于测试的 echo 服务
};

console.log('=== 完整文件上传流程测试 ===\n');

/**
 * 上传函数 - 完全符合用户最初的代码逻辑
 */
async function upload(qflowUrl, targetUrl) {
  console.log('【步骤 1】从源地址下载文件（流式）');
  console.log('URL:', qflowUrl);
  
  // 1. 先获取轻流附件流
  const res = await axios.get(qflowUrl, { responseType: 'stream' });
  
  console.log('✅ 下载成功');
  console.log('   Status:', res.status);
  console.log('   Content-Type:', res.headers['content-type']);

  // 2. 构造 FormData
  console.log('\n【步骤 2】构造 FormData');
  const formData = new FormData();
  
  // 🔥 关键代码：直接传入 stream（和用户代码一致）
  formData.append('files', res.data);
  
  // 添加其他元数据
  formData.append('source', 'qflow');
  formData.append('timestamp', new Date().toISOString());
  
  console.log('✅ FormData 创建成功');
  console.log('   Boundary:', formData.getBoundary());

  // 3. 上传到第三方系统
  console.log('\n【步骤 3】上传到第三方系统');
  console.log('Target URL:', targetUrl);
  
  const resp = await axios.post(targetUrl, formData, {
    headers: {
      ...formData.getHeaders()
    }
  });

  console.log('✅ 上传成功');
  console.log('   Response Status:', resp.status);

  return resp.data;
}

/**
 * 主测试流程
 */
async function main() {
  try {
    // 验证参数
    if (!mockInput.qflowUrl) {
      return { error: "缺少必要的参数 qflowUrl" };
    }
    if (!mockInput.targetUrl) {
      return { error: "缺少必要的参数 targetUrl" };
    }

    console.log('配置:');
    console.log('  源地址:', mockInput.qflowUrl);
    console.log('  目标地址:', mockInput.targetUrl);
    console.log('');

    // 执行上传
    const result = await upload(mockInput.qflowUrl, mockInput.targetUrl);

    console.log('\n【步骤 4】验证上传结果');
    console.log('✅ 流程完成！');

    // httpbin.org 会返回我们发送的数据
    if (result.files) {
      console.log('   上传的文件:', Object.keys(result.files));
    }
    if (result.form) {
      console.log('   附加字段:', Object.keys(result.form));
    }

    return {
      success: true,
      message: '完整上传流程测试通过',
      uploadedBytes: result.headers ? result.headers['Content-Length'] : 'unknown',
      testUrl: mockInput.targetUrl
    };

  } catch (err) {
    console.error('\n❌ 测试失败:', err.message);
    return {
      success: false,
      error: err.message,
      qflowUrl: mockInput.qflowUrl,
      targetUrl: mockInput.targetUrl
    };
  }
}

// 执行测试
return main()
  .then(result => {
    console.log('\n\n' + '='.repeat(60));
    if (result.success) {
      console.log('✅✅✅ 所有测试通过！');
      console.log('');
      console.log('您现在可以使用这样的代码：');
      console.log(`
const axios = require('axios');
const FormData = require('form-data');

async function upload(qflowUrl, targetUrl) {
  // 1. 流式下载
  const res = await axios.get(qflowUrl, { responseType: 'stream' });
  
  // 2. 构造 FormData（直接传入 stream）
  const formData = new FormData();
  formData.append('files', res.data);
  
  // 3. 上传
  const resp = await axios.post(targetUrl, formData, {
    headers: { ...formData.getHeaders() }
  });
  
  return resp.data;
}
      `);
    } else {
      console.log('❌ 测试失败');
    }
    console.log('='.repeat(60));
    return result;
  });



