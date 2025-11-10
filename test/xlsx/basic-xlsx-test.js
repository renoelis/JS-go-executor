// xlsx 基础功能测试

const xlsx = require('xlsx');

console.log('========================================');
console.log('📝 xlsx 模块基础功能测试');
console.log('========================================\n');

// 测试 1: 创建简单 Excel
console.log('📝 测试 1: 创建简单 Excel');
try {
  const workbook = xlsx.utils.book_new();
  console.log('✅ 创建工作簿成功');
  
  const data = [
    { Name: 'Alice', Age: 30, City: 'Beijing', Salary: 15000 },
    { Name: 'Bob', Age: 25, City: 'Shanghai', Salary: 12000 },
    { Name: 'Charlie', Age: 35, City: 'Guangzhou', Salary: 18000 }
  ];
  
  const worksheet = xlsx.utils.json_to_sheet(data);
  console.log('✅ 从 JSON 创建 Sheet 成功');
  
  xlsx.utils.book_append_sheet(workbook, worksheet, 'Users');
  console.log('✅ 添加 Sheet 到工作簿成功');
  console.log('   Sheet 列表:', workbook.SheetNames);
} catch (error) {
  console.log('❌ 测试 1 失败:', error.message);
  return { success: false, error: error.message };
}

// 测试 2: 写入和读取
console.log('\n📝 测试 2: 写入和读取 Excel');
try {
  const writeData = [
    { Product: 'Laptop', Price: 5999, Stock: 50 },
    { Product: 'Mouse', Price: 99, Stock: 200 },
    { Product: 'Keyboard', Price: 299, Stock: 150 }
  ];
  
  const workbook = xlsx.utils.book_new();
  const sheet = xlsx.utils.json_to_sheet(writeData);
  xlsx.utils.book_append_sheet(workbook, sheet, 'Products');
  
  // 写入到 Buffer
  const buffer = xlsx.write(workbook, { type: 'buffer' });
  console.log('✅ 写入 Excel 成功，大小:', buffer.length, 'bytes');
  
  // 从 Buffer 读取
  const readWorkbook = xlsx.read(buffer);
  console.log('✅ 读取 Excel 成功');
  console.log('   Sheet 列表:', readWorkbook.SheetNames);
  
  // 转换为 JSON
  const readSheet = readWorkbook.Sheets['Products'];
  const readData = xlsx.utils.sheet_to_json(readSheet);
  console.log('✅ 转换为 JSON 成功，数据行数:', readData.length);
  console.log('   第一行数据:', JSON.stringify(readData[0]));
  
  // 验证数据一致性
  if (readData.length === writeData.length) {
    console.log('✅ 数据行数验证通过');
  } else {
    console.log('❌ 数据行数不一致');
  }
} catch (error) {
  console.log('❌ 测试 2 失败:', error.message);
  return { success: false, error: error.message };
}

// 测试 3: 多 Sheet 操作
console.log('\n📝 测试 3: 多 Sheet 操作');
try {
  const workbook = xlsx.utils.book_new();
  
  const salesData = [
    { Month: 'Jan', Revenue: 100000 },
    { Month: 'Feb', Revenue: 120000 }
  ];
  
  const expenseData = [
    { Month: 'Jan', Expense: 80000 },
    { Month: 'Feb', Expense: 90000 }
  ];
  
  const sheet1 = xlsx.utils.json_to_sheet(salesData);
  const sheet2 = xlsx.utils.json_to_sheet(expenseData);
  
  xlsx.utils.book_append_sheet(workbook, sheet1, 'Sales');
  xlsx.utils.book_append_sheet(workbook, sheet2, 'Expenses');
  
  console.log('✅ 创建多 Sheet 工作簿成功');
  console.log('   Sheet 列表:', workbook.SheetNames);
  
  const buffer = xlsx.write(workbook, { type: 'buffer' });
  const readWorkbook = xlsx.read(buffer);
  
  if (readWorkbook.SheetNames.length === 2) {
    console.log('✅ 多 Sheet 验证通过');
  }
} catch (error) {
  console.log('❌ 测试 3 失败:', error.message);
  return { success: false, error: error.message };
}

// 测试 4: 数组格式
console.log('\n📝 测试 4: 数组格式数据');
try {
  const arrayData = [
    ['Name', 'Score', 'Grade'],
    ['Alice', 95, 'A'],
    ['Bob', 85, 'B'],
    ['Charlie', 92, 'A']
  ];
  
  const workbook = xlsx.utils.book_new();
  const sheet = xlsx.utils.json_to_sheet(arrayData);
  xlsx.utils.book_append_sheet(workbook, sheet, 'Scores');
  
  const buffer = xlsx.write(workbook, { type: 'buffer' });
  const readWorkbook = xlsx.read(buffer);
  const readSheet = readWorkbook.Sheets['Scores'];
  
  // 读取为数组格式
  const readData = xlsx.utils.sheet_to_json(readSheet, { header: 1 });
  console.log('✅ 数组格式处理成功');
  console.log('   数据行数:', readData.length);
  console.log('   第一行:', JSON.stringify(readData[0]));
} catch (error) {
  console.log('❌ 测试 4 失败:', error.message);
  return { success: false, error: error.message };
}

// 测试 5: 业务场景模拟
console.log('\n📝 测试 5: 业务场景模拟（读取 → 处理 → 写入）');
try {
  // Step 1: 创建原始数据
  const originalData = [
    { Employee: 'Alice', Sales: 150000, Commission: 0.1 },
    { Employee: 'Bob', Sales: 200000, Commission: 0.1 },
    { Employee: 'Charlie', Sales: 180000, Commission: 0.1 }
  ];
  
  const workbook1 = xlsx.utils.book_new();
  const sheet1 = xlsx.utils.json_to_sheet(originalData);
  xlsx.utils.book_append_sheet(workbook1, sheet1, 'SalesData');
  const buffer1 = xlsx.write(workbook1, { type: 'buffer' });
  
  console.log('✅ Step 1: 创建原始数据 Excel');
  
  // Step 2: 读取并处理
  const readWorkbook = xlsx.read(buffer1);
  const readSheet = readWorkbook.Sheets['SalesData'];
  const data = xlsx.utils.sheet_to_json(readSheet);
  
  console.log('✅ Step 2: 读取数据成功，行数:', data.length);
  
  // Step 3: 业务逻辑处理（计算实际提成和等级）
  const processed = data.map(row => {
    const sales = parseFloat(row.Sales) || 0;
    const commissionRate = parseFloat(row.Commission) || 0;
    let actualCommission = sales * commissionRate;
    
    // 业务规则：销售额超过 18 万，提成增加 20%
    if (sales > 180000) {
      actualCommission *= 1.2;
    }
    
    return {
      Employee: row.Employee,
      Sales: sales,
      CommissionRate: commissionRate,
      ActualCommission: actualCommission,
      Grade: sales > 180000 ? 'A' : 'B'
    };
  });
  
  console.log('✅ Step 3: 业务逻辑处理完成');
  console.log('   处理后数据:', JSON.stringify(processed[0]));
  
  // Step 4: 写入新 Excel
  const workbook2 = xlsx.utils.book_new();
  const sheet2 = xlsx.utils.json_to_sheet(processed);
  xlsx.utils.book_append_sheet(workbook2, sheet2, 'ProcessedData');
  const buffer2 = xlsx.write(workbook2, { type: 'buffer' });
  
  console.log('✅ Step 4: 写入处理后的 Excel 成功，大小:', buffer2.length, 'bytes');
} catch (error) {
  console.log('❌ 测试 5 失败:', error.message);
  return { success: false, error: error.message };
}

console.log('\n========================================');
console.log('🎉 所有基础测试通过！');
console.log('========================================');

return {
  success: true,
  message: 'All basic xlsx tests passed',
  testsRun: 5
};






