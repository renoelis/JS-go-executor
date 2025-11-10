/**
 * 流式响应调试测试
 * 找出为什么数据为空
 */

const axios = require('axios');

async function testStreamDebug() {
  try {
    console.log('=== 流式响应调试测试 ===\n');

    const response = await axios.get('https://jsonplaceholder.typicode.com/posts/1', { 
      responseType: 'stream'
    });

    console.log('✅ 请求成功');
    console.log(`   状态码: ${response.status}`);
    console.log(`   response.data 类型: ${typeof response.data}`);
    console.log(`   是否有 getReader: ${typeof response.data.getReader}\n`);

    const reader = response.data.getReader();
    console.log('✅ 获取 reader 成功\n');

    let chunks = [];
    let readCount = 0;

    while (true) {
      console.log(`尝试读取第 ${readCount + 1} 次...`);
      const result = await reader.read();
      
      // 🔥 修复：ArrayBuffer 的长度是 byteLength，不是 length
      const valueLength = result.value ? (result.value.byteLength || result.value.length) : null;
      console.log(`结果: done=${result.done}, value类型=${typeof result.value}, value长度=${valueLength}`);
      
      readCount++;
      
      if (result.done) {
        // 🔥 关键：done=true 时，value 可能仍有数据
        if (result.value && valueLength > 0) {
          console.log(`⚠️  done=true 但仍有 ${valueLength} 字节数据！`);
          const buffer = Buffer.from(result.value);
          chunks.push(buffer);
        }
        console.log('\n✅ 流读取完成');
        break;
      }

      if (result.value && valueLength > 0) {
        const buffer = Buffer.from(result.value);
        chunks.push(buffer);
        console.log(`   ✅ 成功读取 ${buffer.length} 字节\n`);
      } else {
        console.log(`   ⚠️  读取到空数据\n`);
      }
    }

    console.log(`总共读取 ${readCount} 次`);
    console.log(`chunks 数量: ${chunks.length}`);
    
    if (chunks.length === 0) {
      return {
        success: false,
        error: 'No data chunks received',
        debug: {
          readCount: readCount,
          chunksCount: chunks.length
        },
        timestamp: new Date().toISOString()
      };
    }

    const allData = Buffer.concat(chunks);
    console.log(`合并后总字节数: ${allData.length}\n`);

    const jsonString = allData.toString('utf-8');
    console.log(`JSON 字符串长度: ${jsonString.length}`);
    console.log(`JSON 预览: ${jsonString.substring(0, 100)}...\n`);

    const jsonData = JSON.parse(jsonString);

    return {
      success: true,
      message: 'Stream debug test passed',
      debug: {
        readCount: readCount,
        chunksCount: chunks.length,
        totalBytes: allData.length,
        jsonLength: jsonString.length
      },
      data: jsonData,
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    console.error('\n❌ 测试失败:', error.message);
    console.error('Stack:', error.stack);
    return {
      success: false,
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    };
  }
}

return testStreamDebug();

