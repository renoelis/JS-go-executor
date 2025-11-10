/**
 * 流式响应简单测试
 * 测试 while(true) + break 是否能通过安全检查
 */

const axios = require('axios');

async function testStream() {
  try {
    console.log('=== 流式响应简单测试 ===\n');

    // 测试 1: 检查是否支持 stream responseType
    console.log('测试 1: 检查 axios 是否支持 stream...');
    const response = await axios.get('https://jsonplaceholder.typicode.com/posts/1', { 
      responseType: 'stream' 
    });

    console.log('✅ 请求成功');
    console.log(`   状态码: ${response.status}`);
    console.log(`   response.data 类型: ${typeof response.data}`);
    console.log(`   是否有 getReader: ${typeof response.data.getReader}`);

    // 测试 2: 检查是否是流对象
    if (typeof response.data.getReader === 'function') {
      console.log('\n✅ response.data 是流对象！');
      console.log('正在测试流式读取...\n');

      const reader = response.data.getReader();
      let chunks = [];
      let count = 0;

      // 这里测试 while(true) + break 是否能通过安全检查
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          console.log('✅ 流读取完成！');
          break;
        }

        const buffer = Buffer.from(value);
        chunks.push(buffer);
        count++;
        console.log(`   块 ${count}: ${buffer.length} 字节`);
      }

      const allData = Buffer.concat(chunks);
      const jsonData = JSON.parse(allData.toString('utf-8'));

      return {
        success: true,
        message: 'Stream test passed!',
        stream: {
          isSupported: true,
          chunks: count,
          totalBytes: allData.length
        },
        data: jsonData,
        timestamp: new Date().toISOString()
      };

    } else {
      console.log('\n⚠️  response.data 不是流对象');
      console.log('可能是流式功能还未完全实现');
      
      return {
        success: true,
        message: 'Stream not yet supported, but code passed security check',
        stream: {
          isSupported: false,
          reason: 'getReader not available'
        },
        data: response.data,
        timestamp: new Date().toISOString()
      };
    }

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
return testStream();



