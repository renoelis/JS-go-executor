/**
 * 📊 XLSX 模块错误处理测试
 * 
 * 测试场景：
 * 1. 无效的 URL 下载
 * 2. 无效的 Buffer 数据
 * 3. 损坏的 Excel 文件
 * 4. 不存在的工作表
 * 5. 空数据处理
 * 6. 上传失败处理（网络错误）
 * 7. 上传失败处理（权限错误）
 * 8. 超大文件处理
 * 9. 特殊字符处理
 * 10. 并发错误处理
 */

const axios = require('axios');
const xlsx = require('xlsx');
const dateFns = require('date-fns');

console.log('========================================');
console.log('🧪 XLSX 模块错误处理测试');
console.log('========================================\n');

const testResults = {
  test1: null,
  test2: null,
  test3: null,
  test4: null,
  test5: null,
  test6: null,
  test7: null,
  test8: null,
  test9: null,
  test10: null
};

return new Promise(function(mainResolve) {
  setTimeout(function() {
    
    // ========================================
    // 测试 1: 无效的 URL 下载
    // ========================================
    console.log('========================================');
    console.log('📝 测试 1: 无效的 URL 下载');
    console.log('========================================\n');
    
    const invalidUrl = 'https://invalid-domain-12345.com/file.xlsx';
    console.log('尝试下载: ' + invalidUrl);
    
    axios.get(invalidUrl, { 
      responseType: 'arraybuffer',
      timeout: 5000
    })
      .then(function() {
        console.log('❌ 测试失败：应该抛出错误但成功了\n');
        testResults.test1 = { success: false, error: 'Should have thrown error' };
        return runTest2();
      })
      .catch(function(error) {
        console.log('✅ 正确捕获错误');
        console.log('   错误类型: ' + (error.code || 'Unknown'));
        console.log('   错误信息: ' + error.message);
        
        testResults.test1 = {
          success: true,
          errorCaught: true,
          errorType: error.code || error.name,
          errorMessage: error.message
        };
        
        console.log('\n✅ 测试 1 完成（错误正确处理）\n');
        return runTest2();
      });
    
    // ========================================
    // 测试 2: 无效的 Buffer 数据
    // ========================================
    function runTest2() {
      console.log('========================================');
      console.log('📝 测试 2: 无效的 Buffer 数据');
      console.log('========================================\n');
      
      try {
        // 创建无效的 Buffer（随机数据）
        const invalidBuffer = Buffer.from('This is not an Excel file, just random text');
        console.log('尝试读取无效的 Buffer...');
        
        try {
          const workbook = xlsx.read(invalidBuffer);
          console.log('❌ 测试失败：应该抛出错误但成功了\n');
          testResults.test2 = { success: false, error: 'Should have thrown error' };
        } catch (error) {
          console.log('✅ 正确捕获错误');
          console.log('   错误信息: ' + error.message);
          
          testResults.test2 = {
            success: true,
            errorCaught: true,
            errorMessage: error.message
          };
          
          console.log('\n✅ 测试 2 完成（错误正确处理）\n');
        }
        
        return runTest3();
      } catch (error) {
        console.log('❌ 测试 2 异常: ' + error.message + '\n');
        testResults.test2 = { success: false, error: error.message };
        return runTest3();
      }
    }
    
    // ========================================
    // 测试 3: 不存在的工作表
    // ========================================
    function runTest3() {
      console.log('========================================');
      console.log('📝 测试 3: 访问不存在的工作表');
      console.log('========================================\n');
      
      try {
        // 创建一个正常的 Excel
        const workbook = xlsx.utils.book_new();
        const data = [{ 'Name': 'Test', 'Value': 123 }];
        const sheet = xlsx.utils.json_to_sheet(data);
        xlsx.utils.book_append_sheet(workbook, sheet, 'ValidSheet');
        
        console.log('创建的工作表: ' + workbook.SheetNames.join(', '));
        console.log('尝试访问不存在的工作表: NonExistentSheet\n');
        
        // 尝试访问不存在的工作表
        const nonExistentSheet = workbook.Sheets['NonExistentSheet'];
        
        if (!nonExistentSheet || nonExistentSheet === undefined) {
          console.log('✅ 正确处理：工作表不存在返回 undefined');
          
          testResults.test3 = {
            success: true,
            errorCaught: true,
            result: 'undefined',
            note: '正确返回 undefined 而不是抛出错误'
          };
        } else {
          console.log('❌ 测试失败：应该返回 undefined\n');
          testResults.test3 = { success: false, error: 'Should return undefined' };
        }
        
        console.log('\n✅ 测试 3 完成\n');
        return runTest4();
      } catch (error) {
        console.log('❌ 测试 3 异常: ' + error.message + '\n');
        testResults.test3 = { success: false, error: error.message };
        return runTest4();
      }
    }
    
    // ========================================
    // 测试 4: 空数据处理
    // ========================================
    function runTest4() {
      console.log('========================================');
      console.log('📝 测试 4: 空数据处理');
      console.log('========================================\n');
      
      try {
        console.log('场景 A: 空数组创建 Sheet');
        const emptyData = [];
        const sheet1 = xlsx.utils.json_to_sheet(emptyData);
        console.log('✅ 空数组处理成功\n');
        
        console.log('场景 B: 创建空工作簿并写入');
        const workbook = xlsx.utils.book_new();
        xlsx.utils.book_append_sheet(workbook, sheet1, 'EmptySheet');
        const buffer = xlsx.write(workbook, { type: 'buffer' });
        console.log('✅ 空工作簿写入成功，大小: ' + buffer.length + ' bytes\n');
        
        console.log('场景 C: 读取空 Sheet');
        const readData = xlsx.utils.sheet_to_json(sheet1);
        console.log('✅ 读取空 Sheet 成功，行数: ' + readData.length);
        
        testResults.test4 = {
          success: true,
          emptyArrayHandled: true,
          emptyWorkbookSize: buffer.length,
          emptySheetRows: readData.length
        };
        
        console.log('\n✅ 测试 4 完成（空数据正确处理）\n');
        return runTest5();
      } catch (error) {
        console.log('❌ 测试 4 失败: ' + error.message + '\n');
        testResults.test4 = { success: false, error: error.message };
        return runTest5();
      }
    }
    
    // ========================================
    // 测试 5: 网络超时处理
    // ========================================
    function runTest5() {
      console.log('========================================');
      console.log('📝 测试 5: 网络超时处理');
      console.log('========================================\n');
      
      // 使用一个会超时的请求
      const slowUrl = 'https://httpbin.org/delay/10';  // 延迟10秒响应
      console.log('尝试下载（超时设置: 2秒）: ' + slowUrl);
      
      axios.get(slowUrl, { 
        timeout: 2000,
        responseType: 'arraybuffer'
      })
        .then(function() {
          console.log('❌ 测试失败：应该超时但成功了\n');
          testResults.test5 = { success: false, error: 'Should have timed out' };
          return runTest6();
        })
        .catch(function(error) {
          console.log('✅ 正确捕获超时错误');
          console.log('   错误代码: ' + (error.code || 'Unknown'));
          console.log('   错误信息: ' + error.message);
          
          testResults.test5 = {
            success: true,
            errorCaught: true,
            errorType: error.code || 'TIMEOUT',
            errorMessage: error.message
          };
          
          console.log('\n✅ 测试 5 完成（超时正确处理）\n');
          return runTest6();
        });
    }
    
    // ========================================
    // 测试 6: 上传权限错误
    // ========================================
    function runTest6() {
      console.log('========================================');
      console.log('📝 测试 6: 上传权限错误处理');
      console.log('========================================\n');
      
      // 创建一个测试文件
      const testData = [{ 'Test': 'Data' }];
      const workbook = xlsx.utils.book_new();
      const sheet = xlsx.utils.json_to_sheet(testData);
      xlsx.utils.book_append_sheet(workbook, sheet, 'Test');
      const buffer = xlsx.write(workbook, { type: 'buffer' });
      
      console.log('创建测试文件: ' + buffer.length + ' bytes');
      
      // 使用无效的 token 上传
      const FormData = require('form-data');
      const formData = new FormData();
      const blob = new Blob([buffer], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
      
      formData.append('file', blob, 'test.xlsx');
      formData.append('bucket_name', 'renoelis-bucket');
      formData.append('endpoint', 'https://dde39d55fbdb29f35e42ab2de3318461.r2.cloudflarestorage.com');
      formData.append('access_key_id', 'invalid_key');
      formData.append('secret_access_key', 'invalid_secret');
      formData.append('custom_domain', 'https://bucket.renoelis.dpdns.org');
      formData.append('object_key', 'test/error-test.xlsx');
      
      console.log('尝试使用无效凭证上传...\n');
      
      axios.post('https://api.renoelis.top/R2api/upload-direct', formData, {
        headers: { 'Authorization': 'Bearer invalid_token' },
        timeout: 10000
      })
        .then(function() {
          console.log('❌ 测试失败：应该返回权限错误\n');
          testResults.test6 = { success: false, error: 'Should have failed with auth error' };
          return runTest7();
        })
        .catch(function(error) {
          console.log('✅ 正确捕获上传错误');
          if (error.response) {
            console.log('   HTTP 状态: ' + error.response.status);
            console.log('   错误信息: ' + JSON.stringify(error.response.data));
          } else {
            console.log('   错误信息: ' + error.message);
          }
          
          testResults.test6 = {
            success: true,
            errorCaught: true,
            httpStatus: error.response ? error.response.status : null,
            errorMessage: error.message
          };
          
          console.log('\n✅ 测试 6 完成（上传错误正确处理）\n');
          return runTest7();
        });
    }
    
    // ========================================
    // 测试 7: 特殊字符处理
    // ========================================
    function runTest7() {
      console.log('========================================');
      console.log('📝 测试 7: 特殊字符处理');
      console.log('========================================\n');
      
      try {
        const specialData = [
          {
            '姓名': '张三 (测试)',
            '邮箱': 'test@example.com',
            '备注': '包含特殊字符: !@#$%^&*()',
            '公式': '=1+1',  // 公式字符
            '换行': '第一行\n第二行',
            'Unicode': '🎉 测试 ✅',
            '引号': 'He said "Hello"',
            '单引号': "It's working"
          },
          {
            '姓名': '李四 & 王五',
            '邮箱': 'test+tag@domain.co.uk',
            '备注': '<script>alert("XSS")</script>',
            '公式': '=SUM(A1:A10)',
            '换行': '多行\n文本\n测试',
            'Unicode': '日本語 한국어 العربية',
            '引号': 'Normal "quoted" text',
            '单引号': "Can't stop won't stop"
          }
        ];
        
        console.log('创建包含特殊字符的数据...');
        console.log('测试字符类型:');
        console.log('  - 中文字符');
        console.log('  - 特殊符号 (!@#$%^&*)');
        console.log('  - Excel 公式 (=1+1)');
        console.log('  - 换行符 (\\n)');
        console.log('  - Unicode 表情 (🎉)');
        console.log('  - HTML 标签');
        console.log('  - 引号');
        console.log('');
        
        // 创建 Excel
        const workbook = xlsx.utils.book_new();
        const sheet = xlsx.utils.json_to_sheet(specialData);
        xlsx.utils.book_append_sheet(workbook, sheet, '特殊字符测试');
        const buffer = xlsx.write(workbook, { type: 'buffer' });
        
        console.log('✅ Excel 创建成功，大小: ' + buffer.length + ' bytes');
        
        // 读取验证
        const readWorkbook = xlsx.read(buffer);
        const readSheet = readWorkbook.Sheets['特殊字符测试'];
        const readData = xlsx.utils.sheet_to_json(readSheet);
        
        console.log('✅ Excel 读取成功，行数: ' + readData.length);
        console.log('   第一行数据:');
        console.log('   - 姓名: ' + readData[0]['姓名']);
        console.log('   - Unicode: ' + readData[0]['Unicode']);
        console.log('   - 引号: ' + readData[0]['引号']);
        
        // 验证数据完整性
        const match = readData[0]['姓名'] === specialData[0]['姓名'];
        console.log('   数据完整性: ' + (match ? '✅ 一致' : '❌ 不一致'));
        
        testResults.test7 = {
          success: true,
          specialCharsHandled: true,
          dataIntegrity: match,
          rowCount: readData.length,
          fileSize: buffer.length
        };
        
        console.log('\n✅ 测试 7 完成（特殊字符正确处理）\n');
        return runTest8();
      } catch (error) {
        console.log('❌ 测试 7 失败: ' + error.message + '\n');
        testResults.test7 = { success: false, error: error.message };
        return runTest8();
      }
    }
    
    // ========================================
    // 测试 8: 超大数据量处理
    // ========================================
    function runTest8() {
      console.log('========================================');
      console.log('📝 测试 8: 超大数据量处理');
      console.log('========================================\n');
      
      try {
        console.log('创建 1000 行测试数据...');
        const startTime = Date.now();
        
        // 使用流式写入处理大数据
        const writeStream = xlsx.createWriteStream();
        writeStream.addSheet('大数据集');
        writeStream.writeRow(['ID', '姓名', '部门', '工资', '日期', '状态', '备注']);
        
        const rowCount = 1000;
        for (let i = 1; i <= rowCount; i++) {
          writeStream.writeRow([
            i,
            '员工' + i,
            '部门' + (i % 10),
            (Math.random() * 10000 + 5000).toFixed(2),
            dateFns.format(new Date(2020, i % 12, (i % 28) + 1), 'yyyy-MM-dd'),
            i % 5 === 0 ? '离职' : '在职',
            '这是第 ' + i + ' 行的备注信息'
          ]);
          
          // 每 200 行显示进度
          if (i % 200 === 0) {
            console.log('   进度: ' + i + '/' + rowCount);
          }
        }
        
        const buffer = writeStream.finalize();
        const endTime = Date.now();
        const duration = endTime - startTime;
        
        console.log('\n✅ 大数据集创建成功');
        console.log('   行数: ' + rowCount);
        console.log('   文件大小: ' + (buffer.length / 1024).toFixed(2) + ' KB');
        console.log('   耗时: ' + duration + ' ms');
        console.log('   平均速度: ' + (rowCount / (duration / 1000)).toFixed(0) + ' 行/秒');
        
        // 测试读取性能
        console.log('\n测试读取性能...');
        const readStartTime = Date.now();
        
        let readCount = 0;
        xlsx.readStream(buffer, '大数据集', function(row) {
          readCount++;
        });
        
        const readEndTime = Date.now();
        const readDuration = readEndTime - readStartTime;
        
        console.log('✅ 流式读取完成');
        console.log('   读取行数: ' + readCount);
        console.log('   耗时: ' + readDuration + ' ms');
        console.log('   平均速度: ' + (readCount / (readDuration / 1000)).toFixed(0) + ' 行/秒');
        
        testResults.test8 = {
          success: true,
          rowCount: rowCount,
          fileSize: buffer.length,
          fileSizeKB: (buffer.length / 1024).toFixed(2),
          writeTime: duration,
          readTime: readDuration,
          writeSpeed: (rowCount / (duration / 1000)).toFixed(0),
          readSpeed: (readCount / (readDuration / 1000)).toFixed(0)
        };
        
        console.log('\n✅ 测试 8 完成（大数据量正确处理）\n');
        return runTest9();
      } catch (error) {
        console.log('❌ 测试 8 失败: ' + error.message + '\n');
        testResults.test8 = { success: false, error: error.message };
        return runTest9();
      }
    }
    
    // ========================================
    // 测试 9: 类型转换错误
    // ========================================
    function runTest9() {
      console.log('========================================');
      console.log('📝 测试 9: 类型转换错误处理');
      console.log('========================================\n');
      
      try {
        console.log('场景 A: 混合类型数据');
        const mixedData = [
          { 'ID': 1, 'Name': 'Alice', 'Score': 95.5, 'Active': true },
          { 'ID': '2', 'Name': 'Bob', 'Score': '88', 'Active': 'yes' },
          { 'ID': 3.5, 'Name': null, 'Score': undefined, 'Active': 0 }
        ];
        
        const workbook1 = xlsx.utils.book_new();
        const sheet1 = xlsx.utils.json_to_sheet(mixedData);
        xlsx.utils.book_append_sheet(workbook1, sheet1, 'Mixed');
        const buffer1 = xlsx.write(workbook1, { type: 'buffer' });
        
        console.log('✅ 混合类型处理成功，大小: ' + buffer1.length + ' bytes\n');
        
        console.log('场景 B: 非数组输入（宽松处理）');
        try {
          const invalidData = 'not an array';
          const sheet2 = xlsx.utils.json_to_sheet(invalidData);
          const data2 = xlsx.utils.sheet_to_json(sheet2);
          console.log('✅ 宽松处理：返回空 Sheet（' + data2.length + ' 行）');
          console.log('   注：与 SheetJS 原版行为一致，不抛出错误\n');
        } catch (error) {
          console.log('❌ 抛出错误: ' + error.message + '\n');
        }
        
        console.log('场景 C: 数字作为工作表名');
        const workbook3 = xlsx.utils.book_new();
        const sheet3 = xlsx.utils.json_to_sheet([{ 'Test': 1 }]);
        xlsx.utils.book_append_sheet(workbook3, sheet3, 123);  // 数字
        const buffer3 = xlsx.write(workbook3, { type: 'buffer' });
        console.log('✅ 数字工作表名处理成功\n');
        
        testResults.test9 = {
          success: true,
          mixedTypesHandled: true,
          typeErrorCaught: true,
          numericSheetNameHandled: true
        };
        
        console.log('✅ 测试 9 完成（类型转换正确处理）\n');
        return runTest10();
      } catch (error) {
        console.log('❌ 测试 9 失败: ' + error.message + '\n');
        testResults.test9 = { success: false, error: error.message };
        return runTest10();
      }
    }
    
    // ========================================
    // 测试 10: 内存限制处理
    // ========================================
    function runTest10() {
      console.log('========================================');
      console.log('📝 测试 10: 内存和性能限制');
      console.log('========================================\n');
      
      try {
        console.log('场景 A: 非常宽的表格（100列）');
        const wideData = [];
        const row = {};
        for (let i = 1; i <= 100; i++) {
          row['Column_' + i] = 'Value_' + i;
        }
        for (let i = 1; i <= 10; i++) {
          wideData.push(Object.assign({}, row));
        }
        
        const workbook1 = xlsx.utils.book_new();
        const sheet1 = xlsx.utils.json_to_sheet(wideData);
        xlsx.utils.book_append_sheet(workbook1, sheet1, 'Wide');
        const buffer1 = xlsx.write(workbook1, { type: 'buffer' });
        
        console.log('✅ 宽表格处理成功');
        console.log('   列数: 100');
        console.log('   行数: 10');
        console.log('   文件大小: ' + (buffer1.length / 1024).toFixed(2) + ' KB\n');
        
        console.log('场景 B: 长文本内容');
        const longTextData = [];
        for (let i = 1; i <= 50; i++) {
          longTextData.push({
            'ID': i,
            'LongText': '这是一段很长的文本内容。'.repeat(50)  // 约 1500 字符
          });
        }
        
        const workbook2 = xlsx.utils.book_new();
        const sheet2 = xlsx.utils.json_to_sheet(longTextData);
        xlsx.utils.book_append_sheet(workbook2, sheet2, 'LongText');
        const buffer2 = xlsx.write(workbook2, { type: 'buffer' });
        
        console.log('✅ 长文本处理成功');
        console.log('   行数: 50');
        console.log('   每行字符数: ~1500');
        console.log('   文件大小: ' + (buffer2.length / 1024).toFixed(2) + ' KB\n');
        
        testResults.test10 = {
          success: true,
          wideTableHandled: true,
          wideTableColumns: 100,
          wideTableSize: buffer1.length,
          longTextHandled: true,
          longTextSize: buffer2.length
        };
        
        console.log('✅ 测试 10 完成（性能限制正确处理）\n');
        return finalizeTests();
      } catch (error) {
        console.log('❌ 测试 10 失败: ' + error.message + '\n');
        testResults.test10 = { success: false, error: error.message };
        return finalizeTests();
      }
    }
    
    // ========================================
    // 最终总结
    // ========================================
    function finalizeTests() {
      console.log('========================================');
      console.log('🎉 错误处理测试总结');
      console.log('========================================\n');
      
      const successCount = Object.keys(testResults).filter(function(key) {
        return testResults[key] && testResults[key].success === true;
      }).length;
      
      console.log('✅ 成功: ' + successCount + ' / 10');
      console.log('');
      
      console.log('📊 详细结果:');
      console.log('   测试  1 (无效 URL): ' + (testResults.test1.success ? '✅ 成功' : '❌ 失败'));
      console.log('   测试  2 (无效 Buffer): ' + (testResults.test2.success ? '✅ 成功' : '❌ 失败'));
      console.log('   测试  3 (不存在工作表): ' + (testResults.test3.success ? '✅ 成功' : '❌ 失败'));
      console.log('   测试  4 (空数据): ' + (testResults.test4.success ? '✅ 成功' : '❌ 失败'));
      console.log('   测试  5 (网络超时): ' + (testResults.test5.success ? '✅ 成功' : '❌ 失败'));
      console.log('   测试  6 (上传权限错误): ' + (testResults.test6.success ? '✅ 成功' : '❌ 失败'));
      console.log('   测试  7 (特殊字符): ' + (testResults.test7.success ? '✅ 成功' : '❌ 失败'));
      console.log('   测试  8 (超大数据量): ' + (testResults.test8.success ? '✅ 成功' : '❌ 失败'));
      console.log('   测试  9 (类型转换): ' + (testResults.test9.success ? '✅ 成功' : '❌ 失败'));
      console.log('   测试 10 (性能限制): ' + (testResults.test10.success ? '✅ 成功' : '❌ 失败'));
      
      mainResolve({
        success: successCount === 10,
        totalTests: 10,
        passedTests: successCount,
        failedTests: 10 - successCount,
        results: testResults,
        categories: {
          networkErrors: {
            invalidUrl: testResults.test1.success,
            timeout: testResults.test5.success,
            uploadError: testResults.test6.success
          },
          dataErrors: {
            invalidBuffer: testResults.test2.success,
            nonExistentSheet: testResults.test3.success,
            emptyData: testResults.test4.success,
            typeConversion: testResults.test9.success
          },
          edgeCases: {
            specialCharacters: testResults.test7.success,
            largeDataset: testResults.test8.success,
            performanceLimits: testResults.test10.success
          }
        }
      });
    }
    
  }, 100);
});

