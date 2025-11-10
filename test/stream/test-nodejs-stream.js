/**
 * Node.js Stream API 测试
 * 
 * 测试目标：
 * 验证 axios stream 支持 Node.js 风格的事件API（.on('data'), .on('end')）
 * 
 * 这是真实 Node.js 的标准用法
 */

const axios = require('axios');

console.log('=== Node.js Stream API 测试 ===\n');

async function testNodeStreamAPI() {
  try {
    console.log('【测试 1】基本事件监听（data + end）');
    console.log('-'.repeat(60));

    // 1. 获取流式响应
    const url = 'https://jsonplaceholder.typicode.com/posts/1';
    console.log(`请求 URL: ${url}\n`);
    
    const response = await axios.get(url, { responseType: 'stream' });
    
    console.log('✅ 获取流式响应成功');
    console.log('   Status:', response.status);
    console.log('   Stream 对象类型:', typeof response.data);
    console.log('   是否有 .on 方法:', typeof response.data.on === 'function');
    console.log('   是否有 .getReader 方法:', typeof response.data.getReader === 'function');
    console.log('   ✨ 两种 API 共存！\n');

    // 2. 使用 Node.js 风格的事件API
    const stream = response.data;
    let chunks = [];
    let totalBytes = 0;

    return new Promise((resolve, reject) => {
      // 监听 'data' 事件（Node.js 标准）
      stream.on('data', (chunk) => {
        console.log(`📦 收到数据块: ${chunk.length} 字节`);
        chunks.push(chunk);
        totalBytes += chunk.length;
      });

      // 监听 'end' 事件（Node.js 标准）
      stream.on('end', () => {
        console.log('\n✅ 流读取完成');
        console.log('   总字节数:', totalBytes);
        console.log('   数据块数量:', chunks.length);

        // 合并并解析数据
        const allData = Buffer.concat(chunks);
        const jsonString = allData.toString('utf-8');
        const jsonData = JSON.parse(jsonString);

        console.log('\n解析后的数据:');
        console.log('   类型:', typeof jsonData);
        console.log('   标题:', jsonData.title);
        console.log('   ID:', jsonData.id);

        resolve({
          success: true,
          test: 'Node.js Stream API',
          status: '✅ 通过',
          totalBytes: totalBytes,
          chunks: chunks.length,
          data: jsonData
        });
      });

      // 监听 'error' 事件（Node.js 标准）
      stream.on('error', (error) => {
        console.error('❌ 流读取错误:', error.message);
        reject(error);
      });
    });

  } catch (error) {
    console.error('\n❌ 测试失败:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

async function testOnceMethod() {
  try {
    console.log('\n\n【测试 2】once() 方法（一次性监听）');
    console.log('-'.repeat(60));

    const response = await axios.get('https://jsonplaceholder.typicode.com/posts/2', { 
      responseType: 'stream' 
    });

    let dataCount = 0;
    let onceDataCount = 0;

    return new Promise((resolve, reject) => {
      // 普通监听（可能触发多次）
      response.data.on('data', (chunk) => {
        dataCount++;
      });

      // 一次性监听（只触发一次）
      response.data.once('data', (chunk) => {
        onceDataCount++;
        console.log('✅ once("data") 被触发，chunk 大小:', chunk.length);
      });

      response.data.on('end', () => {
        console.log(`\n验证结果:`);
        console.log(`   on("data") 触发次数: ${dataCount}`);
        console.log(`   once("data") 触发次数: ${onceDataCount}`);
        console.log(`   ${onceDataCount === 1 ? '✅ 正确（只触发一次）' : '❌ 错误'}`);

        resolve({
          success: onceDataCount === 1,
          test: 'once() method',
          status: onceDataCount === 1 ? '✅ 通过' : '❌ 失败',
          dataCount: dataCount,
          onceDataCount: onceDataCount
        });
      });

      response.data.on('error', reject);
    });

  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

// 主测试流程
async function main() {
  const results = [];

  // 测试 1
  const result1 = await testNodeStreamAPI();
  results.push(result1);

  // 测试 2
  const result2 = await testOnceMethod();
  results.push(result2);

  // 汇总结果
  const allPassed = results.every(r => r.success);

  console.log('\n\n' + '='.repeat(60));
  console.log('📊 测试汇总');
  console.log('='.repeat(60));
  results.forEach((r, i) => {
    console.log(`   测试 ${i + 1}: ${r.test} - ${r.status}`);
  });
  console.log('');
  console.log(allPassed ? '✅ 所有测试通过！' : '❌ 部分测试失败');
  console.log('='.repeat(60));

  if (allPassed) {
    console.log('\n💡 现在支持两种 API 风格：\n');
    console.log('1️⃣ Node.js Stream API（事件风格）:');
    console.log(`
    const res = await axios.get(url, { responseType: 'stream' });
    res.data.on('data', chunk => { ... });
    res.data.on('end', () => { ... });
    `);
    console.log('2️⃣ Web Streams API（Promise 风格）:');
    console.log(`
    const res = await axios.get(url, { responseType: 'stream' });
    const reader = res.data.getReader();
    const { done, value } = await reader.read();
    `);
  }

  return {
    success: allPassed,
    message: allPassed ? 'All tests passed' : 'Some tests failed',
    summary: {
      total: results.length,
      passed: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length
    },
    results: results
  };
}

// 执行测试
return main();



