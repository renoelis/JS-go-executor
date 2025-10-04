/**
 * 📊 XLSX 模块综合测试 - 真实场景全覆盖
 * 
 * 测试场景：
 * 1. 从 URL 下载 Excel 并读取（基础读取）
 * 2. 从 URL 下载 Excel 并流式读取（大文件优化）
 * 3. 创建新 Excel 并写入到 OSS（直接写入）
 * 4. 从 URL 下载、修改数据、再写入 OSS（下载→修改→上传）
 * 5. 流式写入大量数据到 OSS（流式写入）
 */

const axios = require('axios');
const xlsx = require('xlsx');
const dateFns = require('date-fns');

// 配置
const SOURCE_EXCEL_URL = 'https://qingliu-obs.obs.cn-north-1.myhuaweicloud.com/documents/data/invite/13569E7/6b7509f5-42de-45e0-b322-1b5316198861.xlsx';

const OSS_CONFIG = {
  uploadUrl: 'https://api.renoelis.top/R2api/upload-direct',
  authorization: 'Bearer 304b99ee7a9a41a69b1adb6aee7746d2wGgcrXDvVugwh2kL8qPi',
  bucketName: 'renoelis-bucket',
  endpoint: 'https://dde39d55fbdb29f35e42ab2de3318461.r2.cloudflarestorage.com',
  accessKeyId: 'dbe49459ff0a510d1b01674c333c11fe',
  secretAccessKey: '69b6ad35a5fd32f9ca5bc8a913701db8cdca6073af3c67b83faa748138f2113e',
  customDomain: 'https://bucket.renoelis.dpdns.org'
};

console.log('========================================');
console.log('📊 XLSX 模块综合测试 - 真实场景全覆盖');
console.log('========================================\n');

// 辅助函数：上传到 OSS
function uploadToOSS(buffer, objectKey) {
  const FormData = require('form-data');
  const formData = new FormData();
  
  const filename = objectKey.split('/').pop();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });
  
  formData.append('file', blob, filename);
  formData.append('bucket_name', OSS_CONFIG.bucketName);
  formData.append('endpoint', OSS_CONFIG.endpoint);
  formData.append('access_key_id', OSS_CONFIG.accessKeyId);
  formData.append('secret_access_key', OSS_CONFIG.secretAccessKey);
  formData.append('custom_domain', OSS_CONFIG.customDomain);
  formData.append('object_key', objectKey);
  
  return axios.post(OSS_CONFIG.uploadUrl, formData, {
    headers: { 'Authorization': OSS_CONFIG.authorization },
    timeout: 30000
  });
}

// 测试结果收集
const testResults = {
  test1: null,
  test2: null,
  test3: null,
  test4: null,
  test5: null
};

return new Promise(function(mainResolve) {
  setTimeout(function() {
    
    // ========================================
    // 测试 1: 从 URL 下载 Excel 并读取（基础读取）
    // ========================================
    console.log('========================================');
    console.log('📝 测试 1: 从 URL 下载并读取 Excel');
    console.log('========================================\n');
    
    axios.get(SOURCE_EXCEL_URL, { responseType: 'arraybuffer' })
      .then(function(response) {
        console.log('✅ 下载成功，文件大小: ' + response.data.byteLength + ' bytes\n');
        
        // 转换为 Buffer
        const buffer = Buffer.from(response.data);
        
        // 读取 Excel
        const workbook = xlsx.read(buffer);
        console.log('✅ Excel 读取成功');
        console.log('   工作表列表: ' + workbook.SheetNames.join(', '));
        
        // 读取第一个工作表
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const data = xlsx.utils.sheet_to_json(worksheet);
        
        console.log('   第一个工作表: ' + firstSheetName);
        console.log('   数据行数: ' + data.length);
        
        if (data.length > 0) {
          console.log('   列名: ' + Object.keys(data[0]).join(', '));
          console.log('   前 3 行数据:');
          data.slice(0, 3).forEach(function(row, index) {
            console.log('      ' + (index + 1) + ': ' + JSON.stringify(row));
          });
        }
        
        testResults.test1 = {
          success: true,
          sheetCount: workbook.SheetNames.length,
          rowCount: data.length,
          columns: data.length > 0 ? Object.keys(data[0]) : []
        };
        
        console.log('\n✅ 测试 1 完成\n');
        
        // 继续测试 2
        return runTest2(buffer);
      })
      .catch(function(error) {
        console.log('❌ 测试 1 失败: ' + error.message + '\n');
        testResults.test1 = { success: false, error: error.message };
        return runTest2(null);
      });
    
    // ========================================
    // 测试 2: 流式读取（大文件优化）
    // ========================================
    function runTest2(sourceBuffer) {
      console.log('========================================');
      console.log('📝 测试 2: 流式读取 Excel（逐行处理）');
      console.log('========================================\n');
      
      if (!sourceBuffer) {
        console.log('⚠️ 跳过测试 2（源文件下载失败）\n');
        testResults.test2 = { success: false, error: 'Source file unavailable' };
        return runTest3();
      }
      
      return new Promise(function(resolve) {
        try {
          // 先创建一个测试 Excel（用于流式读取演示）
          const testWorkbook = xlsx.utils.book_new();
          const testData = [];
          for (let i = 1; i <= 50; i++) {
            testData.push({
              '序号': i,
              '产品名称': '产品' + i,
              '价格': (Math.random() * 1000 + 100).toFixed(2),
              '库存': Math.floor(Math.random() * 500) + 50,
              '更新时间': dateFns.format(new Date(), 'yyyy-MM-dd HH:mm:ss')
            });
          }
          const testSheet = xlsx.utils.json_to_sheet(testData);
          xlsx.utils.book_append_sheet(testWorkbook, testSheet, '产品列表');
          const testBuffer = xlsx.write(testWorkbook, { type: 'buffer' });
          
          console.log('✅ 创建测试数据: 50 行');
          console.log('   开始流式读取...\n');
          
          let processedCount = 0;
          let totalPrice = 0;
          
          // 流式读取（逐行回调）
          xlsx.readStream(testBuffer, '产品列表', function(row, index) {
            if (index === 0) {
              console.log('   表头: ' + Object.keys(row).join(', '));
            }
            
            processedCount++;
            const price = parseFloat(row['价格']) || 0;
            totalPrice += price;
            
            // 只显示前 5 行
            if (index <= 5) {
              console.log('   行 ' + index + ': ' + row['产品名称'] + ' - ¥' + price.toFixed(2));
            }
          });
          
          console.log('   ...');
          console.log('\n✅ 流式读取完成');
          console.log('   处理行数: ' + processedCount);
          console.log('   总价值: ¥' + totalPrice.toFixed(2));
          console.log('   平均价格: ¥' + (totalPrice / processedCount).toFixed(2));
          
          testResults.test2 = {
            success: true,
            rowsProcessed: processedCount,
            totalValue: totalPrice.toFixed(2),
            avgValue: (totalPrice / processedCount).toFixed(2)
          };
          
          console.log('\n✅ 测试 2 完成\n');
          resolve();
        } catch (error) {
          console.log('❌ 测试 2 失败: ' + error.message + '\n');
          testResults.test2 = { success: false, error: error.message };
          resolve();
        }
      }).then(function() {
        return runTest3();
      });
    }
    
    // ========================================
    // 测试 3: 创建新 Excel 并直接写入 OSS
    // ========================================
    function runTest3() {
      console.log('========================================');
      console.log('📝 测试 3: 创建新 Excel 并直接写入 OSS');
      console.log('========================================\n');
      
      // 创建新数据
      const newData = [];
      for (let i = 1; i <= 15; i++) {
        newData.push({
          '订单号': 'ORD' + String(Date.now() + i).slice(-8),
          '客户': '客户' + i,
          '金额': (Math.random() * 5000 + 500).toFixed(2),
          '状态': i % 3 === 0 ? '已完成' : (i % 3 === 1 ? '处理中' : '待付款'),
          '创建时间': dateFns.format(new Date(), 'yyyy-MM-dd HH:mm:ss')
        });
      }
      
      console.log('✅ 创建新数据: ' + newData.length + ' 条订单');
      
      // 创建 Excel
      const workbook = xlsx.utils.book_new();
      const worksheet = xlsx.utils.json_to_sheet(newData);
      xlsx.utils.book_append_sheet(workbook, worksheet, '订单列表');
      const buffer = xlsx.write(workbook, { type: 'buffer' });
      
      console.log('✅ Excel 生成成功，大小: ' + buffer.length + ' bytes');
      
      // 上传到 OSS
      const timestamp = Date.now();
      const objectKey = 'xlsx-test/test3-new-orders-' + timestamp + '.xlsx';
      
      console.log('📤 上传到 OSS: ' + objectKey + '\n');
      
      return uploadToOSS(buffer, objectKey)
        .then(function(response) {
          const fileUrl = OSS_CONFIG.customDomain + '/' + objectKey;
          console.log('✅ 上传成功！');
          console.log('   文件地址: ' + fileUrl);
          console.log('   服务器响应: ' + JSON.stringify(response.data));
          
          testResults.test3 = {
            success: true,
            url: fileUrl,
            size: buffer.length,
            orderCount: newData.length
          };
          
          console.log('\n✅ 测试 3 完成\n');
          return runTest4();
        })
        .catch(function(error) {
          console.log('❌ 上传失败: ' + error.message);
          testResults.test3 = { success: false, error: error.message };
          console.log('\n⚠️ 测试 3 部分完成（文件生成成功，上传失败）\n');
          return runTest4();
        });
    }
    
    // ========================================
    // 测试 4: 下载 → 修改 → 上传（完整业务流程）
    // ========================================
    function runTest4() {
      console.log('========================================');
      console.log('📝 测试 4: 下载 → 修改数据 → 上传到 OSS');
      console.log('========================================\n');
      
      return axios.get(SOURCE_EXCEL_URL, { responseType: 'arraybuffer' })
        .then(function(response) {
          console.log('✅ 下载原始文件成功');
          
          // 读取 Excel
          const buffer = Buffer.from(response.data);
          const workbook = xlsx.read(buffer);
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const originalData = xlsx.utils.sheet_to_json(worksheet);
          
          console.log('✅ 读取数据: ' + originalData.length + ' 行');
          console.log('   原始列: ' + Object.keys(originalData[0] || {}).join(', '));
          
          // 修改数据：添加新列和新行
          const modifiedData = originalData.map(function(row, index) {
            return Object.assign({}, row, {
              '序号': index + 1,
              '处理状态': '已处理',
              '处理时间': dateFns.format(new Date(), 'yyyy-MM-dd HH:mm:ss')
            });
          });
          
          // 添加 3 条新数据
          for (let i = 1; i <= 3; i++) {
            const newRow = {
              '序号': originalData.length + i,
              '备注': '新增数据 ' + i,
              '处理状态': '新增',
              '处理时间': dateFns.format(new Date(), 'yyyy-MM-dd HH:mm:ss')
            };
            modifiedData.push(newRow);
          }
          
          console.log('✅ 数据修改完成');
          console.log('   - 添加了 3 列: 序号, 处理状态, 处理时间');
          console.log('   - 添加了 3 行新数据');
          console.log('   - 总行数: ' + modifiedData.length);
          
          // 创建新 Excel
          const newWorkbook = xlsx.utils.book_new();
          const newWorksheet = xlsx.utils.json_to_sheet(modifiedData);
          xlsx.utils.book_append_sheet(newWorkbook, newWorksheet, '处理后数据');
          
          // 添加汇总表
          const summary = [{
            '项目': '原始数据行数',
            '数值': originalData.length
          }, {
            '项目': '新增数据行数',
            '数值': 3
          }, {
            '项目': '总行数',
            '数值': modifiedData.length
          }, {
            '项目': '处理时间',
            '数值': dateFns.format(new Date(), 'yyyy-MM-dd HH:mm:ss')
          }];
          const summarySheet = xlsx.utils.json_to_sheet(summary);
          xlsx.utils.book_append_sheet(newWorkbook, summarySheet, '处理汇总');
          
          const newBuffer = xlsx.write(newWorkbook, { type: 'buffer' });
          
          console.log('✅ 新 Excel 生成成功');
          console.log('   工作表: ' + newWorkbook.SheetNames.join(', '));
          console.log('   文件大小: ' + newBuffer.length + ' bytes');
          
          // 上传到 OSS
          const timestamp = Date.now();
          const objectKey = 'xlsx-test/test4-modified-' + timestamp + '.xlsx';
          
          console.log('📤 上传到 OSS: ' + objectKey + '\n');
          
          return uploadToOSS(newBuffer, objectKey)
            .then(function(uploadResponse) {
              const fileUrl = OSS_CONFIG.customDomain + '/' + objectKey;
              console.log('✅ 上传成功！');
              console.log('   文件地址: ' + fileUrl);
              
              testResults.test4 = {
                success: true,
                url: fileUrl,
                originalRows: originalData.length,
                modifiedRows: modifiedData.length,
                addedRows: 3,
                size: newBuffer.length
              };
              
              console.log('\n✅ 测试 4 完成\n');
              return runTest5();
            });
        })
        .catch(function(error) {
          console.log('❌ 测试 4 失败: ' + error.message);
          testResults.test4 = { success: false, error: error.message };
          console.log('\n⚠️ 测试 4 失败\n');
          return runTest5();
        });
    }
    
    // ========================================
    // 测试 5: 流式写入大量数据
    // ========================================
    function runTest5() {
      console.log('========================================');
      console.log('📝 测试 5: 流式写入大量数据到 OSS');
      console.log('========================================\n');
      
      try {
        // 创建流式写入器
        const writeStream = xlsx.createWriteStream();
        
        console.log('✅ 创建写入流');
        
        // 添加工作表
        writeStream.addSheet('大数据集');
        
        // 写入表头
        writeStream.writeRow(['ID', '姓名', '部门', '工资', '入职日期', '状态']);
        console.log('✅ 写入表头');
        
        // 流式写入 100 行数据
        const rowCount = 100;
        console.log('📝 开始流式写入 ' + rowCount + ' 行数据...\n');
        
        for (let i = 1; i <= rowCount; i++) {
          writeStream.writeRow([
            'EMP' + String(i).padStart(4, '0'),
            '员工' + i,
            ['技术部', '市场部', '财务部', '人事部'][i % 4],
            (Math.random() * 10000 + 5000).toFixed(2),
            dateFns.format(new Date(2020 + (i % 5), i % 12, (i % 28) + 1), 'yyyy-MM-dd'),
            i % 10 === 0 ? '离职' : '在职'
          ]);
          
          // 每 20 行显示一次进度
          if (i % 20 === 0) {
            console.log('   已写入: ' + i + ' 行');
          }
        }
        
        console.log('\n✅ 数据写入完成');
        
        // 完成写入并获取 Buffer
        const buffer = writeStream.finalize();
        
        console.log('✅ 流式写入完成，文件大小: ' + buffer.length + ' bytes');
        console.log('   平均每行: ' + (buffer.length / rowCount).toFixed(2) + ' bytes');
        
        // 上传到 OSS
        const timestamp = Date.now();
        const objectKey = 'xlsx-test/test5-streaming-' + timestamp + '.xlsx';
        
        console.log('📤 上传到 OSS: ' + objectKey + '\n');
        
        return uploadToOSS(buffer, objectKey)
          .then(function(response) {
            const fileUrl = OSS_CONFIG.customDomain + '/' + objectKey;
            console.log('✅ 上传成功！');
            console.log('   文件地址: ' + fileUrl);
            
            testResults.test5 = {
              success: true,
              url: fileUrl,
              rowCount: rowCount,
              size: buffer.length,
              avgRowSize: (buffer.length / rowCount).toFixed(2)
            };
            
            console.log('\n✅ 测试 5 完成\n');
            return finalizeTests();
          })
          .catch(function(error) {
            console.log('❌ 上传失败: ' + error.message);
            testResults.test5 = {
              success: false,
              error: error.message,
              note: '文件生成成功但上传失败'
            };
            console.log('\n⚠️ 测试 5 部分完成\n');
            return finalizeTests();
          });
      } catch (error) {
        console.log('❌ 测试 5 失败: ' + error.message);
        testResults.test5 = { success: false, error: error.message };
        console.log('\n⚠️ 测试 5 失败\n');
        return finalizeTests();
      }
    }
    
    // ========================================
    // 最终总结
    // ========================================
    function finalizeTests() {
      console.log('========================================');
      console.log('🎉 测试总结');
      console.log('========================================\n');
      
      const successCount = Object.keys(testResults).filter(function(key) {
        return testResults[key] && testResults[key].success === true;
      }).length;
      
      console.log('✅ 成功: ' + successCount + ' / 5');
      console.log('');
      
      console.log('📊 详细结果:');
      console.log('   测试 1 (下载并读取): ' + (testResults.test1.success ? '✅ 成功' : '❌ 失败'));
      console.log('   测试 2 (流式读取): ' + (testResults.test2.success ? '✅ 成功' : '❌ 失败'));
      console.log('   测试 3 (直接写入): ' + (testResults.test3.success ? '✅ 成功' : '❌ 失败'));
      console.log('   测试 4 (下载修改上传): ' + (testResults.test4.success ? '✅ 成功' : '❌ 失败'));
      console.log('   测试 5 (流式写入): ' + (testResults.test5.success ? '✅ 成功' : '❌ 失败'));
      
      mainResolve({
        success: successCount === 5,
        totalTests: 5,
        passedTests: successCount,
        failedTests: 5 - successCount,
        results: testResults,
        summary: {
          test1: testResults.test1.success ? '读取了 ' + testResults.test1.rowCount + ' 行数据' : '失败',
          test2: testResults.test2.success ? '流式处理了 ' + testResults.test2.rowsProcessed + ' 行' : '失败',
          test3: testResults.test3.success ? '上传了 ' + testResults.test3.orderCount + ' 条订单' : '失败',
          test4: testResults.test4.success ? '修改并上传了 ' + testResults.test4.modifiedRows + ' 行数据' : '失败',
          test5: testResults.test5.success ? '流式写入了 ' + testResults.test5.rowCount + ' 行数据' : '失败'
        }
      });
    }
    
  }, 100);
});

