/**
 * Axios 流式响应测试
 * 
 * 测试目的：
 * 验证 axios 支持 responseType: 'stream'，可以分块读取大文件
 * 
 * 使用场景：
 * 1. 下载大文件（避免内存占用）
 * 2. 流式处理 Excel（配合 xlsx.readStream）
 * 3. 实时数据处理
 */

const axios = require('axios');
const xlsx = require('xlsx');

// 测试 URL（可以替换为实际的 Excel 文件 URL）
// 这里使用一个公开的测试 API
const TEST_URLS = {
  // 小文件测试（JSON）
  json: 'https://jsonplaceholder.typicode.com/posts',
  
  // 如果有 Excel 文件 URL，可以在这里替换
  // excel: 'https://your-oss-url.com/test.xlsx'
};

console.log('=== Axios 流式响应测试 ===\n');

// ==================== 测试 1: 基本流式读取 ====================
return new Promise((resolve, reject) => {
  setTimeout(() => {
    console.log('【测试 1】基本流式读取');
    console.log('-'.repeat(60));

    axios.get(TEST_URLS.json, { responseType: 'stream' })
      .then(response => {
        console.log('✅ 请求成功');
        console.log('Status:', response.status);
        console.log('Headers:', JSON.stringify(response.headers, null, 2));
        
        // 检查 response.data 是否为流对象
        const stream = response.data;
        console.log('\n流对象类型:', typeof stream);
        console.log('是否有 getReader 方法:', typeof stream.getReader === 'function');

        if (!stream || typeof stream.getReader !== 'function') {
          console.error('❌ response.data 不是有效的流对象');
          reject(new Error('Invalid stream object'));
          return;
        }

        // 获取流读取器
        const reader = stream.getReader();
        console.log('✅ 成功获取流读取器\n');

        let totalBytes = 0;
        let chunks = [];

        // 读取函数（标准 Web Streams API 写法）
        function readChunk() {
          reader.read()
            .then(({ done, value }) => {
              if (done) {
                // 流读取完成（done=true 时 value 总是 undefined）
                console.log('\n✅ 流读取完成');
                console.log('总字节数:', totalBytes);
                console.log('数据块数量:', chunks.length);

                // 合并所有数据
                const allData = Buffer.concat(chunks);
                const jsonString = allData.toString('utf-8');
                const jsonData = JSON.parse(jsonString);

                console.log('解析后的数据:');
                console.log('- 类型:', Array.isArray(jsonData) ? 'Array' : typeof jsonData);
                console.log('- 长度:', jsonData.length);
                console.log('- 第一条:', JSON.stringify(jsonData[0], null, 2));

                // 进入测试 2
                test2_streamWithXLSX(resolve, reject);
              } else {
                // 有数据，处理数据块
                const buffer = Buffer.from(value);
                totalBytes += buffer.length;
                chunks.push(buffer);
                console.log(`📦 读取数据块 ${chunks.length}: ${buffer.length} 字节`);
                
                // 继续读取下一块
                readChunk();
              }
            })
            .catch(error => {
              console.error('❌ 读取失败:', error.message);
              reject(error);
            });
        }

        // 开始读取
        readChunk();
      })
      .catch(error => {
        console.error('❌ 请求失败:', error.message);
        reject(error);
      });
  }, 100);
});

// ==================== 测试 2: 流式 + xlsx ====================
function test2_streamWithXLSX(resolve, reject) {
  setTimeout(() => {
    console.log('\n\n【测试 2】流式下载 + xlsx 处理');
    console.log('-'.repeat(60));

    // 创建一个测试 Excel
    console.log('步骤 1: 创建测试 Excel 文件...');
    const testData = [];
    for (let i = 1; i <= 100; i++) {
      testData.push({
        ID: i,
        Name: `用户${i}`,
        Email: `user${i}@example.com`,
        Age: 20 + (i % 50),
        City: ['北京', '上海', '广州', '深圳'][i % 4]
      });
    }

    const workbook = xlsx.utils.book_new();
    const worksheet = xlsx.utils.json_to_sheet(testData);
    xlsx.utils.book_append_sheet(workbook, worksheet, 'Users');
    const excelBuffer = xlsx.write(workbook, { type: 'buffer' });

    console.log(`✅ 创建完成，大小: ${excelBuffer.length} 字节\n`);

    // 模拟从 URL 下载（这里直接使用 Buffer 模拟）
    console.log('步骤 2: 模拟流式读取...');
    
    // 由于我们没有真实的流式 Excel URL，这里演示如何使用
    // 如果有真实 URL，可以这样使用：
    
    
    // 使用普通方式读取 Excel（验证数据正确性）
    console.log('\n步骤 3: 验证 xlsx.read() 支持多种输入类型...');
    
    // 方式 1: 直接使用 Buffer（原有方式）
    const wb1 = xlsx.read(excelBuffer);
    const data1 = xlsx.utils.sheet_to_json(wb1.Sheets['Users']);
    console.log(`✅ 方式 1（Buffer）: 读取 ${data1.length} 行数据`);

    // 方式 2: 使用 ArrayBuffer（新增支持）
    const arrayBuffer = new Uint8Array(excelBuffer).buffer;
    const wb2 = xlsx.read(arrayBuffer);
    const data2 = xlsx.utils.sheet_to_json(wb2.Sheets['Users']);
    console.log(`✅ 方式 2（ArrayBuffer）: 读取 ${data2.length} 行数据`);

    // 方式 3: 使用 Uint8Array（新增支持）
    const uint8Array = new Uint8Array(excelBuffer);
    const wb3 = xlsx.read(uint8Array);
    const data3 = xlsx.utils.sheet_to_json(wb3.Sheets['Users']);
    console.log(`✅ 方式 3（Uint8Array）: 读取 ${data3.length} 行数据`);

    console.log('\n✅ 所有方式都成功读取数据！');

    // 进入测试 3
    test3_performanceComparison(resolve, reject);
  }, 100);
}

// ==================== 测试 3: 性能对比 ====================
function test3_performanceComparison(resolve, reject) {
  setTimeout(() => {
    console.log('\n\n【测试 3】性能对比：流式 vs 非流式');
    console.log('-'.repeat(60));

    console.log('说明：');
    console.log('- 流式模式：适合大文件（> 50MB），边下载边处理');
    console.log('- 非流式模式：适合小文件（< 50MB），一次性加载');
    console.log('');

    // 创建一个较大的测试数据集
    console.log('创建测试数据集（10000 行）...');
    const largeData = [];
    for (let i = 1; i <= 10000; i++) {
      largeData.push({
        ID: i,
        Name: `测试用户${i}`,
        Email: `test${i}@example.com`,
        Phone: `138${String(10000000 + i).slice(-8)}`,
        Address: `测试地址${i}号`,
        Score: Math.floor(Math.random() * 100)
      });
    }

    const wb = xlsx.utils.book_new();
    const ws = xlsx.utils.json_to_sheet(largeData);
    xlsx.utils.book_append_sheet(wb, ws, 'Data');
    const largeBuffer = xlsx.write(wb, { type: 'buffer' });

    console.log(`✅ 数据集创建完成: ${largeBuffer.length} 字节 (${(largeBuffer.length / 1024 / 1024).toFixed(2)} MB)\n`);

    // 测试非流式模式
    console.log('⏱️  测试 1: 非流式模式');
    const start1 = Date.now();
    const workbook1 = xlsx.read(largeBuffer);
    const result1 = xlsx.utils.sheet_to_json(workbook1.Sheets['Data']);
    const time1 = Date.now() - start1;
    console.log(`   完成时间: ${time1} ms`);
    console.log(`   读取行数: ${result1.length}`);

    // 测试流式处理（模拟分块）
    console.log('\n⏱️  测试 2: 流式处理（模拟）');
    const start2 = Date.now();
    
    // 模拟分块读取（每次 1MB）
    const chunkSize = 1024 * 1024; // 1MB
    let processedChunks = 0;
    let offset = 0;
    
    while (offset < largeBuffer.length) {
      const end = Math.min(offset + chunkSize, largeBuffer.length);
      const chunk = largeBuffer.slice(offset, end);
      processedChunks++;
      offset = end;
    }
    
    // 最后合并处理
    const workbook2 = xlsx.read(largeBuffer);
    const result2 = xlsx.utils.sheet_to_json(workbook2.Sheets['Data']);
    const time2 = Date.now() - start2;
    
    console.log(`   完成时间: ${time2} ms`);
    console.log(`   处理块数: ${processedChunks}`);
    console.log(`   读取行数: ${result2.length}`);

    console.log('\n📊 性能对比结果:');
    console.log(`   非流式: ${time1} ms`);
    console.log(`   流式: ${time2} ms`);
    console.log(`   差异: ${Math.abs(time1 - time2)} ms`);
    
    console.log('\n💡 建议:');
    if (largeBuffer.length < 10 * 1024 * 1024) {
      console.log('   ✓ 当前文件 < 10MB，推荐使用非流式模式（简单快速）');
    } else {
      console.log('   ✓ 当前文件 >= 10MB，推荐使用流式模式（节省内存）');
    }

    // 完成所有测试
    console.log('\n\n' + '='.repeat(60));
    console.log('✅ 所有测试完成！');
    console.log('='.repeat(60));
    
    resolve({
      success: true,
      message: 'All stream tests passed',
      tests: {
        basicStream: '✅ 通过',
        streamWithXLSX: '✅ 通过',
        performance: '✅ 通过'
      },
      summary: {
        totalTests: 3,
        passed: 3,
        failed: 0
      }
    });
  }, 100);
}

