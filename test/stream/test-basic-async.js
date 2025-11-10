/**
 * 基础异步测试 - 验证 async/await 是否正常工作
 */

const axios = require('axios');

async function testBasicAsync() {
  try {
    console.log('=== 基础异步测试 ===\n');

    // 测试 1: 简单的 Promise
    console.log('测试 1: 简单 Promise...');
    const result1 = await new Promise((resolve) => {
      setTimeout(() => resolve('✅ Promise 工作正常'), 10);
    });
    console.log(result1);

    // 测试 2: axios 普通请求（非流式）
    console.log('\n测试 2: axios 普通请求...');
    const response = await axios.get('https://jsonplaceholder.typicode.com/posts/1');
    console.log('✅ axios 请求成功');
    console.log(`   状态码: ${response.status}`);
    console.log(`   数据: ${JSON.stringify(response.data).substring(0, 100)}...`);

    // 返回结果
    console.log('\n✅ 所有测试通过！');
    return {
      success: true,
      message: 'Basic async tests passed',
      tests: {
        promise: '✅',
        axios: '✅'
      },
      data: response.data,
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    return {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

// 执行测试
return testBasicAsync();



