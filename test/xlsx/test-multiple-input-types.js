/**
 * xlsx 模块多类型输入测试
 * 
 * 测试目的：
 * 验证 xlsx.read() 支持多种输入类型：
 * 1. Node.js Buffer（原有支持）
 * 2. ArrayBuffer（新增支持）
 * 3. Uint8Array/TypedArray（新增支持）
 * 
 * 这样用户就可以直接使用 axios/fetch 的响应数据，无需 Buffer.from() 转换
 */

const xlsx = require('xlsx');
const axios = require('axios');

// 测试数据：创建一个简单的 Excel
const testData = [
  { Name: 'Alice', Age: 30, City: 'Beijing' },
  { Name: 'Bob', Age: 25, City: 'Shanghai' },
  { Name: 'Charlie', Age: 35, City: 'Guangzhou' }
];

// 创建测试 Excel
const createTestExcel = () => {
  const workbook = xlsx.utils.book_new();
  const worksheet = xlsx.utils.json_to_sheet(testData);
  xlsx.utils.book_append_sheet(workbook, worksheet, 'TestSheet');
  return xlsx.write(workbook, { type: 'buffer' });
};

// 辅助函数：验证读取的数据是否正确
const validateData = (data, testName) => {
  if (!Array.isArray(data)) {
    throw new Error(`${testName}: 返回的数据不是数组`);
  }
  
  if (data.length !== 3) {
    throw new Error(`${testName}: 数据行数不正确，期望 3，实际 ${data.length}`);
  }
  
  // 验证第一行数据
  if (data[0].Name !== 'Alice' || data[0].Age !== 30 || data[0].City !== 'Beijing') {
    throw new Error(`${testName}: 数据内容不正确`);
  }
  
  console.log(`✅ ${testName}: 通过`);
};

// 运行所有测试
console.log('=== xlsx 多类型输入测试 ===\n');

try {
  // 获取测试 Excel 的 Buffer
  const excelBuffer = createTestExcel();
  console.log(`📊 创建测试 Excel: ${excelBuffer.length} 字节\n`);
  
  // ========================================
  // 测试 1: Node.js Buffer（原有支持）
  // ========================================
  console.log('【测试 1】使用 Node.js Buffer');
  const workbook1 = xlsx.read(excelBuffer);
  try {
    const data1 = xlsx.utils.sheet_to_json(workbook1.Sheets['TestSheet']);
    validateData(data1, '测试 1');
  } finally {
    workbook1.close();
  }
  
  // ========================================
  // 测试 2: ArrayBuffer（新增支持）
  // ========================================
  console.log('【测试 2】使用 ArrayBuffer（模拟 axios responseType: "arraybuffer"）');
  
  // 模拟 axios 返回的 ArrayBuffer
  // 注意：在 Node.js 环境中，我们需要手动创建 ArrayBuffer
  const arrayBuffer = new ArrayBuffer(excelBuffer.length);
  const uint8View = new Uint8Array(arrayBuffer);
  for (let i = 0; i < excelBuffer.length; i++) {
    uint8View[i] = excelBuffer[i];
  }
  
  const workbook2 = xlsx.read(arrayBuffer);
  try {
    const data2 = xlsx.utils.sheet_to_json(workbook2.Sheets['TestSheet']);
    validateData(data2, '测试 2');
  } finally {
    workbook2.close();
  }
  
  // ========================================
  // 测试 3: Uint8Array（新增支持）
  // ========================================
  console.log('【测试 3】使用 Uint8Array');
  
  const uint8Array = new Uint8Array(excelBuffer.length);
  for (let i = 0; i < excelBuffer.length; i++) {
    uint8Array[i] = excelBuffer[i];
  }
  
  const workbook3 = xlsx.read(uint8Array);
  try {
    const data3 = xlsx.utils.sheet_to_json(workbook3.Sheets['TestSheet']);
    validateData(data3, '测试 3');
  } finally {
    workbook3.close();
  }
  
  // ========================================
  // 测试 4: 直接使用（无需 Buffer.from 转换）
  // ========================================
  console.log('【测试 4】验证向后兼容性：Buffer.from() 转换仍然有效');
  
  const convertedBuffer = Buffer.from(uint8Array);
  const workbook4 = xlsx.read(convertedBuffer);
  try {
    const data4 = xlsx.utils.sheet_to_json(workbook4.Sheets['TestSheet']);
    validateData(data4, '测试 4');
  } finally {
    workbook4.close();
  }
  
  // ========================================
  // 测试总结
  // ========================================
  console.log('\n=== 测试总结 ===');
  console.log('✅ 所有测试通过！');
  console.log('');
  console.log('📝 测试结论：');
  console.log('1. ✅ Buffer 输入：支持（原有功能）');
  console.log('2. ✅ ArrayBuffer 输入：支持（新增功能）');
  console.log('3. ✅ Uint8Array 输入：支持（新增功能）');
  console.log('4. ✅ 向后兼容性：Buffer.from() 转换仍然有效');
  console.log('');
  console.log('💡 使用建议：');
  console.log('- 推荐直接使用 axios/fetch 的响应数据');
  console.log('- 无需手动 Buffer.from() 转换');
  console.log('- 代码更简洁，性能更好');
  console.log('');
  console.log('🎯 实际应用示例：');
  console.log('  // ❌ 旧写法（仍然有效）');
  console.log('  const buffer = Buffer.from(response.data);');
  console.log('  const workbook = xlsx.read(buffer);');
  console.log('');
  console.log('  // ✅ 新写法（推荐）');
  console.log('  const workbook = xlsx.read(response.data);');
  
  return {
    success: true,
    testsRun: 4,
    testsPassed: 4,
    message: '所有测试通过'
  };
  
} catch (error) {
  console.error('\n❌ 测试失败:', error.message);
  console.error('错误堆栈:', error.stack);
  
  return {
    success: false,
    error: error.message,
    stack: error.stack
  };
}



