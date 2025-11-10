/**
 * Axios 流式响应 - 简单示例
 * 
 * 这个示例展示如何使用 responseType: 'stream' 下载大文件
 */

const axios = require('axios');

// 示例 URL（使用公开的测试 API）
const TEST_URL = 'https://jsonplaceholder.typicode.com/posts';

async function streamExample() {
  try {
    console.log('=== Axios 流式响应示例 ===\n');

    // 🔥 使用流式响应
    console.log('1. 发起流式请求...');
    const response = await axios.get(TEST_URL, { 
      responseType: 'stream'  // ⭐ 关键配置
    });

    console.log(`✅ 请求成功`);
    console.log(`   状态码: ${response.status}`);
    console.log(`   状态文本: ${response.statusText}\n`);

    // 获取流读取器
    console.log('2. 获取流读取器...');
    const reader = response.data.getReader();
    console.log('✅ 读取器已就绪\n');

    // 逐块读取数据
    console.log('3. 开始读取数据块...');
    let chunks = [];
    let totalBytes = 0;

    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        console.log('\n✅ 所有数据读取完成！');
        break;
      }

      // 处理这块数据
      const buffer = Buffer.from(value);
      chunks.push(buffer);
      totalBytes += buffer.length;

      console.log(`   📦 块 ${chunks.length}: ${buffer.length} 字节`);
    }

    // 合并所有数据
    console.log('\n4. 合并数据...');
    const allData = Buffer.concat(chunks);
    console.log(`✅ 合并完成: ${allData.length} 字节`);

    // 解析 JSON
    console.log('\n5. 解析数据...');
    const jsonData = JSON.parse(allData.toString('utf-8'));
    console.log(`✅ 解析成功: ${jsonData.length} 条记录`);
    console.log(`\n第一条数据:`);
    console.log(JSON.stringify(jsonData[0], null, 2));

    // 返回结果
    return {
      success: true,
      summary: {
        totalChunks: chunks.length,
        totalBytes: totalBytes,
        records: jsonData.length
      },
      firstRecord: jsonData[0],
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    console.error('\n❌ 错误:', error.message);
    return {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

// 执行函数并返回结果
return streamExample();

