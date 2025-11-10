const { Buffer } = require('buffer');

const tests = [];

// 定义要测试的方法及其期望的 length 值
const methodsToTest = {
  // write_methods.go
  'write': 1,
  'toString': 0,
  'slice': 0,
  'indexOf': 1,
  'copy': 1,
  'compare': 1,
  'equals': 1,
  'fill': 1,
  'toJSON': 0,
  'includes': 1,
  'lastIndexOf': 1,
  'swap16': 0,
  'swap32': 0,
  'swap64': 0,
  'reverse': 0,
  'subarray': 0,
  'set': 1,
  
  // iterator_methods.go
  'entries': 0,
  'values': 0,
  
  // bigint_methods.go
  'writeBigInt64BE': 1,
  'writeBigInt64LE': 1,
  'writeBigUInt64BE': 1,
  'writeBigUInt64LE': 1,
  
  // variable_length.go
  'writeIntBE': 3,
  'writeIntLE': 3,
  'writeUIntBE': 3,
  'writeUIntLE': 3,
};

// 测试每个方法
for (const [methodName, expectedLength] of Object.entries(methodsToTest)) {
  try {
    const method = Buffer.prototype[methodName];
    
    if (typeof method !== 'function') {
      tests.push({
        name: `${methodName} - 存在性检查`,
        status: '❌',
        error: `${methodName} 不是一个函数或不存在`,
      });
      continue;
    }
    
    // 检查 name 属性
    const actualName = method.name;
    const nameCorrect = actualName === methodName;
    
    if (!nameCorrect) {
      tests.push({
        name: `${methodName} - name 属性`,
        status: '❌',
        error: `期望 name='${methodName}', 实际 name='${actualName}'`,
      });
    } else {
      tests.push({
        name: `${methodName} - name 属性`,
        status: '✅',
      });
    }
    
    // 检查 length 属性
    const actualLength = method.length;
    const lengthCorrect = actualLength === expectedLength;
    
    if (!lengthCorrect) {
      tests.push({
        name: `${methodName} - length 属性`,
        status: '❌',
        error: `期望 length=${expectedLength}, 实际 length=${actualLength}`,
      });
    } else {
      tests.push({
        name: `${methodName} - length 属性`,
        status: '✅',
      });
    }
    
  } catch (error) {
    tests.push({
      name: `${methodName} - 测试失败`,
      status: '❌',
      error: error.message,
      stack: error.stack,
    });
  }
}

// 统计结果
const passed = tests.filter(t => t.status === '✅').length;
const failed = tests.filter(t => t.status === '❌').length;

const result = {
  success: failed === 0,
  summary: `共 ${tests.length} 个测试，✅ 通过 ${passed} 个，❌ 失败 ${failed} 个`,
  tests: tests,
};

console.log(JSON.stringify(result, null, 2));
return result;
