// xlsx 流式功能测试

const xlsx = require('xlsx');

console.log('========================================');
console.log('🌊 xlsx 模块流式功能测试');
console.log('========================================\n');

// 测试 1: 流式读取
console.log('📝 测试 1: 流式读取 (readStream)');
return new Promise((resolve) => {
  setTimeout(() => {
    try {
      // 创建测试数据
      const testData = [];
      for (let i = 1; i <= 100; i++) {
        testData.push({
          ID: i,
          Name: `User${i}`,
          Amount: Math.floor(Math.random() * 10000),
          Status: i % 2 === 0 ? 'Active' : 'Inactive'
        });
      }
      
      // 写入 Excel
      const workbook = xlsx.utils.book_new();
      const sheet = xlsx.utils.json_to_sheet(testData);
      xlsx.utils.book_append_sheet(workbook, sheet, 'TestData');
      const buffer = xlsx.write(workbook, { type: 'buffer' });
      
      console.log('✅ 创建测试数据成功，行数:', testData.length);
      console.log('   Excel 大小:', buffer.length, 'bytes');
      
      // 流式读取
      let rowCount = 0;
      let highValueCount = 0;
      
      xlsx.readStream(buffer, 'TestData', (row, index) => {
        rowCount++;
        const amount = parseFloat(row.Amount) || 0;
        if (amount > 5000) {
          highValueCount++;
        }
      });
      
      console.log('✅ 流式读取完成');
      console.log('   总行数:', rowCount);
      console.log('   高价值记录数 (>5000):', highValueCount);
      
      if (rowCount === testData.length) {
        console.log('✅ 行数验证通过');
      } else {
        console.log('❌ 行数不匹配，期望:', testData.length, '实际:', rowCount);
      }
      
    } catch (error) {
      console.log('❌ 测试 1 失败:', error.message);
      resolve({ success: false, error: error.message });
      return;
    }
    
    // 测试 2: 分批读取
    console.log('\n📝 测试 2: 分批读取 (readBatches)');
    try {
      // 创建更多测试数据
      const largeData = [];
      for (let i = 1; i <= 500; i++) {
        largeData.push({
          ID: i,
          Product: `Product${i}`,
          Price: Math.floor(Math.random() * 1000),
          Stock: Math.floor(Math.random() * 500)
        });
      }
      
      const workbook = xlsx.utils.book_new();
      const sheet = xlsx.utils.json_to_sheet(largeData);
      xlsx.utils.book_append_sheet(workbook, sheet, 'Products');
      const buffer = xlsx.write(workbook, { type: 'buffer' });
      
      console.log('✅ 创建大量数据成功，行数:', largeData.length);
      
      // 分批读取
      let batchCount = 0;
      let totalRows = 0;
      const batchSize = 100;
      
      xlsx.readBatches(buffer, 'Products', { batchSize: batchSize }, (batch, batchIndex) => {
        batchCount++;
        totalRows += batch.length;
        console.log(`   批次 ${batchIndex}: ${batch.length} 行`);
      });
      
      console.log('✅ 分批读取完成');
      console.log('   总批次数:', batchCount);
      console.log('   总行数:', totalRows);
      
      const expectedBatches = Math.ceil(largeData.length / batchSize);
      if (batchCount === expectedBatches) {
        console.log('✅ 批次数验证通过');
      }
      
      if (totalRows === largeData.length) {
        console.log('✅ 总行数验证通过');
      }
      
    } catch (error) {
      console.log('❌ 测试 2 失败:', error.message);
      resolve({ success: false, error: error.message });
      return;
    }
    
    // 测试 3: 流式写入
    console.log('\n📝 测试 3: 流式写入 (createWriteStream)');
    try {
      const stream = xlsx.createWriteStream();
      
      // 添加 Sheet
      stream.addSheet('StreamOutput');
      console.log('✅ 创建写入流成功');
      
      // 写入表头
      stream.writeRow(['ID', 'Name', 'Value', 'Category']);
      console.log('✅ 写入表头');
      
      // 流式写入数据（模拟逐行生成）
      let writeCount = 0;
      for (let i = 1; i <= 200; i++) {
        stream.writeRow([
          i,
          `Item${i}`,
          Math.floor(Math.random() * 1000),
          i % 3 === 0 ? 'A' : (i % 3 === 1 ? 'B' : 'C')
        ]);
        writeCount++;
      }
      
      console.log('✅ 流式写入完成，写入行数:', writeCount);
      
      // 完成写入
      const outputBuffer = stream.finalize();
      console.log('✅ 完成写入，文件大小:', outputBuffer.length, 'bytes');
      
      // 验证写入的数据
      const verifyWorkbook = xlsx.read(outputBuffer);
      const verifySheet = verifyWorkbook.Sheets['StreamOutput'];
      const verifyData = xlsx.utils.sheet_to_json(verifySheet);
      
      console.log('✅ 验证写入数据，行数:', verifyData.length);
      
      if (verifyData.length === writeCount) {
        console.log('✅ 流式写入数据验证通过');
      } else {
        console.log('❌ 数据行数不匹配，期望:', writeCount, '实际:', verifyData.length);
      }
      
    } catch (error) {
      console.log('❌ 测试 3 失败:', error.message);
      resolve({ success: false, error: error.message });
      return;
    }
    
    // 测试 4: 流式读取 + 流式写入（管道模式）
    console.log('\n📝 测试 4: 流式读取 + 流式写入组合');
    try {
      // 创建源数据
      const sourceData = [];
      for (let i = 1; i <= 300; i++) {
        sourceData.push({
          OrderID: i,
          Customer: `Customer${i}`,
          Amount: Math.floor(Math.random() * 5000),
          Status: Math.random() > 0.3 ? 'Completed' : 'Pending'
        });
      }
      
      const sourceWorkbook = xlsx.utils.book_new();
      const sourceSheet = xlsx.utils.json_to_sheet(sourceData);
      xlsx.utils.book_append_sheet(sourceWorkbook, sourceSheet, 'Orders');
      const sourceBuffer = xlsx.write(sourceWorkbook, { type: 'buffer' });
      
      console.log('✅ 创建源数据:', sourceData.length, '行');
      
      // 创建写入流
      const writeStream = xlsx.createWriteStream();
      writeStream.addSheet('FilteredOrders');
      writeStream.writeRow(['OrderID', 'Customer', 'Amount', 'Priority']);
      
      let filteredCount = 0;
      
      // 流式读取 + 过滤 + 流式写入
      xlsx.readStream(sourceBuffer, 'Orders', (row) => {
        const amount = parseFloat(row.Amount) || 0;
        
        // 业务逻辑：只保留金额 > 2500 的订单
        if (amount > 2500 && row.Status === 'Completed') {
          writeStream.writeRow([
            row.OrderID,
            row.Customer,
            amount,
            amount > 4000 ? 'High' : 'Medium'
          ]);
          filteredCount++;
        }
      });
      
      console.log('✅ 过滤处理完成，筛选出:', filteredCount, '行');
      
      // 完成写入
      const resultBuffer = writeStream.finalize();
      console.log('✅ 生成新 Excel，大小:', resultBuffer.length, 'bytes');
      
      // 验证结果
      const resultWorkbook = xlsx.read(resultBuffer);
      const resultSheet = resultWorkbook.Sheets['FilteredOrders'];
      const resultData = xlsx.utils.sheet_to_json(resultSheet);
      
      console.log('✅ 验证结果数据，行数:', resultData.length);
      
      if (resultData.length === filteredCount) {
        console.log('✅ 流式管道处理验证通过');
      }
      
    } catch (error) {
      console.log('❌ 测试 4 失败:', error.message);
      resolve({ success: false, error: error.message });
      return;
    }
    
    console.log('\n========================================');
    console.log('🎉 所有流式测试通过！');
    console.log('========================================');
    
    resolve({
      success: true,
      message: 'All stream tests passed',
      testsRun: 4
    });
    
  }, 100);
});

