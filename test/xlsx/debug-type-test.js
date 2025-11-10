/**
 * 调试测试：验证 json_to_sheet 对非数组输入的处理
 */

const xlsx = require('xlsx');

const results = {
  test1: null,
  test2: null,
  test3: null,
  test4: null,
  test5: null,
  test6: null
};

console.log('========================================');
console.log('🔍 调试：json_to_sheet 类型处理');
console.log('========================================\n');

// 测试 1: 字符串
console.log('测试 1: 传入字符串');
try {
  const sheet1 = xlsx.utils.json_to_sheet('not an array');
  const data1 = xlsx.utils.sheet_to_json(sheet1);
  
  results.test1 = {
    input: 'string: "not an array"',
    success: true,
    errorThrown: false,
    outputRowCount: data1.length,
    outputData: data1
  };
  
  console.log('✅ 成功（未抛出错误）');
  console.log('   数据行数: ' + data1.length);
} catch (error) {
  results.test1 = {
    input: 'string: "not an array"',
    success: false,
    errorThrown: true,
    errorMessage: error.message
  };
  console.log('❌ 抛出错误: ' + error.message);
}

console.log('\n---\n');

// 测试 2: 数字
console.log('测试 2: 传入数字');
try {
  const sheet2 = xlsx.utils.json_to_sheet(123);
  const data2 = xlsx.utils.sheet_to_json(sheet2);
  
  results.test2 = {
    input: 'number: 123',
    success: true,
    errorThrown: false,
    outputRowCount: data2.length,
    outputData: data2
  };
  
  console.log('✅ 成功（未抛出错误）');
  console.log('   数据行数: ' + data2.length);
} catch (error) {
  results.test2 = {
    input: 'number: 123',
    success: false,
    errorThrown: true,
    errorMessage: error.message
  };
  console.log('❌ 抛出错误: ' + error.message);
}

console.log('\n---\n');

// 测试 3: null
console.log('测试 3: 传入 null');
try {
  const sheet3 = xlsx.utils.json_to_sheet(null);
  const data3 = xlsx.utils.sheet_to_json(sheet3);
  
  results.test3 = {
    input: 'null',
    success: true,
    errorThrown: false,
    outputRowCount: data3.length,
    outputData: data3
  };
  
  console.log('✅ 成功（未抛出错误）');
  console.log('   数据行数: ' + data3.length);
} catch (error) {
  results.test3 = {
    input: 'null',
    success: false,
    errorThrown: true,
    errorMessage: error.message
  };
  console.log('❌ 抛出错误: ' + error.message);
}

console.log('\n---\n');

// 测试 4: undefined
console.log('测试 4: 传入 undefined');
try {
  const sheet4 = xlsx.utils.json_to_sheet(undefined);
  const data4 = xlsx.utils.sheet_to_json(sheet4);
  
  results.test4 = {
    input: 'undefined',
    success: true,
    errorThrown: false,
    outputRowCount: data4.length,
    outputData: data4
  };
  
  console.log('✅ 成功（未抛出错误）');
  console.log('   数据行数: ' + data4.length);
} catch (error) {
  results.test4 = {
    input: 'undefined',
    success: false,
    errorThrown: true,
    errorMessage: error.message
  };
  console.log('❌ 抛出错误: ' + error.message);
}

console.log('\n---\n');

// 测试 5: 空对象
console.log('测试 5: 传入空对象');
try {
  const sheet5 = xlsx.utils.json_to_sheet({});
  const data5 = xlsx.utils.sheet_to_json(sheet5);
  
  results.test5 = {
    input: 'object: {}',
    success: true,
    errorThrown: false,
    outputRowCount: data5.length,
    outputData: data5
  };
  
  console.log('✅ 成功（未抛出错误）');
  console.log('   数据行数: ' + data5.length);
} catch (error) {
  results.test5 = {
    input: 'object: {}',
    success: false,
    errorThrown: true,
    errorMessage: error.message
  };
  console.log('❌ 抛出错误: ' + error.message);
}

console.log('\n---\n');

// 测试 6: 正常数组（对比）
console.log('测试 6: 传入正常数组（对比）');
try {
  const sheet6 = xlsx.utils.json_to_sheet([{ 'Name': 'Test', 'Value': 123 }]);
  const data6 = xlsx.utils.sheet_to_json(sheet6);
  
  results.test6 = {
    input: 'array: [{ Name: "Test", Value: 123 }]',
    success: true,
    errorThrown: false,
    outputRowCount: data6.length,
    outputData: data6
  };
  
  console.log('✅ 成功');
  console.log('   数据行数: ' + data6.length);
} catch (error) {
  results.test6 = {
    input: 'array: [{ Name: "Test", Value: 123 }]',
    success: false,
    errorThrown: true,
    errorMessage: error.message
  };
  console.log('❌ 抛出错误: ' + error.message);
}

console.log('\n========================================');
console.log('🎯 总结');
console.log('========================================');

// 统计
const total = 6;
const errorThrown = Object.values(results).filter(r => r && r.errorThrown).length;
const noError = Object.values(results).filter(r => r && !r.errorThrown).length;

console.log('总测试数: ' + total);
console.log('抛出错误: ' + errorThrown);
console.log('未抛错误: ' + noError);

return {
  summary: {
    total: total,
    errorThrown: errorThrown,
    noErrorThrown: noError
  },
  details: results,
  conclusion: errorThrown === 0 ? '所有非数组输入都未抛出错误（宽松处理）' : '部分输入抛出了错误'
};

