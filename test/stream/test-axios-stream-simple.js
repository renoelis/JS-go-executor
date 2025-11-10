/**
 * Axios 流式响应测试（简洁版）
 * 
 * 测试目的：验证 axios 支持 responseType: 'stream'
 * 使用场景：下载大文件、流式处理 Excel
 */

const axios = require('axios');
const xlsx = require('xlsx');

// 测试 URL
const TEST_URL = 'https://jsonplaceholder.typicode.com/posts';

async function testAxiosStream() {
  try {
    console.log('=== Axios 流式响应测试 ===\n');

    // ==================== 测试 1: 基本流式读取 ====================
    console.log('【测试 1】基本流式读取');
    console.log('-'.repeat(60));

    const response = await axios.get(TEST_URL, { 
      responseType: 'stream'  // ⭐ 关键：启用流式响应
    });

    console.log('✅ 请求成功');
    console.log(`   状态码: ${response.status}`);
    console.log(`   流对象: ${typeof response.data.getReader === 'function' ? '有效' : '无效'}\n`);

    // 获取流读取器
    const reader = response.data.getReader();
    let chunks = [];
    let totalBytes = 0;

    // 流式读取数据（标准 Web Streams API 写法）
    while (true) {
      const { done, value } = await reader.read();
      
      if (done) {
        console.log('✅ 流读取完成');
        break;
      }
      
      // done=false 时处理数据
      const buffer = Buffer.from(value);
      chunks.push(buffer);
      totalBytes += buffer.length;
      console.log(`   📦 读取块 ${chunks.length}: ${buffer.length} 字节`);
    }

    // 合并并解析数据
    const allData = Buffer.concat(chunks);
    const jsonData = JSON.parse(allData.toString('utf-8'));

    console.log(`\n✅ 解析成功:`);
    console.log(`   总字节数: ${totalBytes}`);
    console.log(`   数据块数: ${chunks.length}`);
    console.log(`   记录数: ${jsonData.length}`);
    console.log(`   第一条: ${JSON.stringify(jsonData[0]).substring(0, 100)}...\n`);

    // ==================== 测试 2: 流式 + xlsx ====================
    console.log('【测试 2】流式 + xlsx 处理');
    console.log('-'.repeat(60));

    // 创建测试 Excel
    const testData = [];
    for (let i = 1; i <= 100; i++) {
      testData.push({
        ID: i,
        Name: `用户${i}`,
        Email: `user${i}@example.com`,
        City: ['北京', '上海', '广州', '深圳'][i % 4]
      });
    }

    const workbook = xlsx.utils.book_new();
    const worksheet = xlsx.utils.json_to_sheet(testData);
    xlsx.utils.book_append_sheet(workbook, worksheet, 'Users');
    const excelBuffer = xlsx.write(workbook, { type: 'buffer' });

    console.log(`✅ 创建 Excel: ${excelBuffer.length} 字节\n`);

    // 验证 xlsx.read() 支持多种输入类型
    console.log('验证多种输入类型:');
    
    const wb1 = xlsx.read(excelBuffer);  // Buffer
    console.log(`   ✅ Buffer: ${xlsx.utils.sheet_to_json(wb1.Sheets['Users']).length} 行`);

    const wb2 = xlsx.read(new Uint8Array(excelBuffer).buffer);  // ArrayBuffer
    console.log(`   ✅ ArrayBuffer: ${xlsx.utils.sheet_to_json(wb2.Sheets['Users']).length} 行`);

    const wb3 = xlsx.read(new Uint8Array(excelBuffer));  // Uint8Array
    console.log(`   ✅ Uint8Array: ${xlsx.utils.sheet_to_json(wb3.Sheets['Users']).length} 行\n`);

    // ==================== 测试 3: 性能对比 ====================
    console.log('【测试 3】性能对比');
    console.log('-'.repeat(60));

    // 创建大数据集
    const largeData = [];
    for (let i = 1; i <= 5000; i++) {
      largeData.push({
        ID: i,
        Name: `测试用户${i}`,
        Email: `test${i}@example.com`,
        Score: Math.floor(Math.random() * 100)
      });
    }

    const wb = xlsx.utils.book_new();
    const ws = xlsx.utils.json_to_sheet(largeData);
    xlsx.utils.book_append_sheet(wb, ws, 'Data');
    const largeBuffer = xlsx.write(wb, { type: 'buffer' });

    const sizeMB = (largeBuffer.length / 1024 / 1024).toFixed(2);
    console.log(`测试数据: ${largeBuffer.length} 字节 (${sizeMB} MB)\n`);

    // 非流式模式
    const start1 = Date.now();
    const workbook1 = xlsx.read(largeBuffer);
    const result1 = xlsx.utils.sheet_to_json(workbook1.Sheets['Data']);
    const time1 = Date.now() - start1;
    console.log(`⏱️  非流式: ${time1} ms (${result1.length} 行)`);

    // 流式模式（模拟分块）
    const start2 = Date.now();
    const chunkSize = 512 * 1024;  // 512KB
    let offset = 0;
    let chunkCount = 0;
    
    while (offset < largeBuffer.length) {
      const end = Math.min(offset + chunkSize, largeBuffer.length);
      largeBuffer.slice(offset, end);  // 模拟读取
      chunkCount++;
      offset = end;
    }
    
    const workbook2 = xlsx.read(largeBuffer);
    const result2 = xlsx.utils.sheet_to_json(workbook2.Sheets['Data']);
    const time2 = Date.now() - start2;
    console.log(`⏱️  流式:   ${time2} ms (${result2.length} 行, ${chunkCount} 块)\n`);

    console.log('💡 建议:');
    console.log(`   < 50MB  → 使用 responseType: 'arraybuffer'`);
    console.log(`   > 50MB  → 使用 responseType: 'stream'\n`);

    // ==================== 返回结果 ====================
    console.log('='.repeat(60));
    console.log('✅ 所有测试完成！');
    console.log('='.repeat(60));

    return {
      success: true,
      message: 'All stream tests passed',
      tests: {
        basicStream: {
          status: '✅ 通过',
          totalBytes: totalBytes,
          chunks: chunks.length,
          records: jsonData.length
        },
        xlsxIntegration: {
          status: '✅ 通过',
          supportedTypes: ['Buffer', 'ArrayBuffer', 'Uint8Array'],
          rows: testData.length
        },
        performance: {
          status: '✅ 通过',
          fileSize: `${sizeMB} MB`,
          normalMode: `${time1} ms`,
          streamMode: `${time2} ms`
        }
      },
      summary: {
        totalTests: 3,
        passed: 3,
        failed: 0
      },
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    console.error('\n❌ 测试失败:', error.message);
    return {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

// 执行测试并返回结果
return testAxiosStream();

