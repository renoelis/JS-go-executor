// buffer.atob() - Part 16: 极端性能与内存测试
// 测试极限情况下的性能和内存行为
const { atob } = require('buffer');

const tests = [];

function test(name, fn) {
  try {
    const pass = fn();
    tests.push({ name, status: pass ? '✅' : '❌' });
  } catch (e) {
    tests.push({ name, status: '❌', error: e.message, stack: e.stack });
  }
}

// === 超大数据测试 ===

test('极限：1MB base64 数据', () => {
  // 生成1MB的有效base64数据
  const pattern = 'AAAA';  // 4字符base64单元
  const repeats = Math.floor((1024 * 1024) / 4);  // 确保是4的倍数
  const largeBase64 = pattern.repeat(repeats);  // 生成有效的base64
  
  const start = Date.now();
  const result = atob(largeBase64);
  const end = Date.now();
  
  if (typeof result !== 'string') {
    throw new Error(`结果类型错误: ${typeof result}`);
  }
  
  // 性能要求：1MB数据在2秒内处理完成（放宽要求）
  if (end - start > 2000) {
    throw new Error(`性能过慢: ${end - start}ms > 2000ms`);
  }
  
  return true;
});

test('极限：2MB base64 数据', () => {
  // 生成2MB的有效base64数据
  const pattern = 'BBBB';  // 4字符base64单元
  const repeats = Math.floor((2 * 1024 * 1024) / 4);  // 确保是4的倍数
  const largeBase64 = pattern.repeat(repeats);  // 生成有效的base64
  
  const start = Date.now();
  const result = atob(largeBase64);
  const end = Date.now();
  
  if (typeof result !== 'string') {
    throw new Error(`结果类型错误: ${typeof result}`);
  }
  
  // 2MB数据，允许更长时间
  if (end - start > 5000) {
    throw new Error(`性能过慢: ${end - start}ms > 5000ms`);
  }
  
  return true;
});

// === 连续调用性能测试 ===

test('性能：连续10万次小数据调用', () => {
  const input = 'SGVsbG8=';  // "Hello"
  const iterations = 100000;
  
  const start = Date.now();
  for (let i = 0; i < iterations; i++) {
    const result = atob(input);
    if (result !== 'Hello') {
      throw new Error(`第${i}次调用结果错误: "${result}"`);
    }
  }
  const end = Date.now();
  
  // 10万次调用应在5秒内完成
  if (end - start > 5000) {
    throw new Error(`批量调用性能过慢: ${end - start}ms > 5000ms`);
  }
  
  return true;
});

test('性能：交替调用不同长度数据', () => {
  const inputs = [
    'QQ==',           // 1字节
    'QWI=',           // 2字节  
    'QWJj',           // 3字节
    'QWJjZA==',       // 4字节
    'QWJjZGVmZ2hpams=' // 11字节
  ];
  
  const iterations = 50000;
  const start = Date.now();
  
  for (let i = 0; i < iterations; i++) {
    const input = inputs[i % inputs.length];
    const result = atob(input);
    if (typeof result !== 'string') {
      throw new Error(`第${i}次调用类型错误: ${typeof result}`);
    }
  }
  
  const end = Date.now();
  
  // 5万次交替调用应在3秒内完成
  if (end - start > 3000) {
    throw new Error(`交替调用性能过慢: ${end - start}ms > 3000ms`);
  }
  
  return true;
});

// === 内存压力测试 ===

test('内存：大量临时字符串生成', () => {
  // 生成和释放大量中等大小的字符串
  const pattern = 'AAAA';  // 4字符base64单元
  const iterations = 10000;
  
  for (let i = 0; i < iterations; i++) {
    const input = pattern.repeat(400);  // 1600字节输入，4的倍数
    const result = atob(input);
    
    if (result.length === 0) {
      throw new Error(`第${i}次调用返回空结果`);
    }
    
    // 立即释放引用
    // result = null; // JS GC will handle this
  }
  
  return true;
});

test('内存：递增数据大小测试', () => {
  // 测试不同大小数据的处理稳定性
  const base = 'SGVsbG8gV29ybGQgZnJvbSBOb2RlLmpz';  // 24字节输入
  
  for (let multiplier = 1; multiplier <= 100; multiplier++) {
    const input = base.repeat(multiplier);  // 从24字节到2.4KB
    const result = atob(input);
    
    if (typeof result !== 'string') {
      throw new Error(`大小${multiplier}x时类型错误: ${typeof result}`);
    }
    
    if (result.length === 0 && input.length > 0) {
      throw new Error(`大小${multiplier}x时返回空结果`);
    }
  }
  
  return true;
});

// === 错误处理性能测试 ===

test('性能：大量错误处理', () => {
  // 测试错误处理路径的性能
  const invalidInputs = [
    'SGVs!bG8=',     // 包含!
    'SGVs@bG8=',     // 包含@
    'SGVs#bG8=',     // 包含#
    'SGVs$bG8=',     // 包含$
    'SGVs%bG8=',     // 包含%
  ];
  
  const iterations = 10000;
  let errorCount = 0;
  
  const start = Date.now();
  
  for (let i = 0; i < iterations; i++) {
    const input = invalidInputs[i % invalidInputs.length];
    try {
      atob(input);
      throw new Error(`第${i}次调用应该失败但成功了`);
    } catch (e) {
      errorCount++;
      if (!e.message.includes('Invalid') && !e.message.includes('invalid')) {
        throw new Error(`第${i}次错误类型不正确: ${e.message}`);
      }
    }
  }
  
  const end = Date.now();
  
  if (errorCount !== iterations) {
    throw new Error(`错误计数不匹配: ${errorCount} vs ${iterations}`);
  }
  
  // 错误处理也应该快速
  if (end - start > 2000) {
    throw new Error(`错误处理性能过慢: ${end - start}ms > 2000ms`);
  }
  
  return true;
});

// === 边界性能测试 ===

test('性能：最小有效输入重复调用', () => {
  // 最小4字符输入
  const input = 'QWJj';  // "Abc"
  const iterations = 200000;
  
  const start = Date.now();
  for (let i = 0; i < iterations; i++) {
    const result = atob(input);
    if (result !== 'Abc') {
      throw new Error(`第${i}次调用结果错误`);
    }
  }
  const end = Date.now();
  
  // 20万次最小输入调用
  if (end - start > 3000) {
    throw new Error(`最小输入性能过慢: ${end - start}ms > 3000ms`);
  }
  
  return true;
});

test('性能：空字符串重复调用', () => {
  const iterations = 500000;
  
  const start = Date.now();
  for (let i = 0; i < iterations; i++) {
    const result = atob('');
    if (result !== '') {
      throw new Error(`第${i}次空字符串调用结果错误: "${result}"`);
    }
  }
  const end = Date.now();
  
  // 50万次空字符串调用应该很快
  if (end - start > 1000) {
    throw new Error(`空字符串性能过慢: ${end - start}ms > 1000ms`);
  }
  
  return true;
});

// === 并发稳定性测试 ===

test('稳定性：模拟高频调用场景', () => {
  // 模拟Web应用中的高频解码场景
  const testData = [
    { input: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9', desc: 'JWT header' },
    { input: 'SGVsbG8gV29ybGQ=', desc: 'Simple text' },
    { input: 'UG93ZXJlZCBieSBOb2RlLmpz', desc: 'Longer text' },
    { input: 'MTIzNDU2Nzg5MA==', desc: 'Numbers' },
    { input: 'Zm9vYmFy', desc: 'Short text' }
  ];
  
  const iterations = 20000;
  
  for (let i = 0; i < iterations; i++) {
    const testItem = testData[i % testData.length];
    const result = atob(testItem.input);
    
    if (typeof result !== 'string') {
      throw new Error(`${testItem.desc}在第${i}次调用时类型错误`);
    }
    
    if (result.length === 0 && testItem.input.length > 0) {
      throw new Error(`${testItem.desc}在第${i}次调用时返回空结果`);
    }
  }
  
  return true;
});

// === 输出和总结 ===

const passed = tests.filter(t => t.status === '✅').length;
const failed = tests.filter(t => t.status === '❌').length;

try {
  const result = {
    success: failed === 0,
    summary: {
      total: tests.length,
      passed: passed,
      failed: failed,
      successRate: ((passed / tests.length) * 100).toFixed(2) + '%'
    },
    tests: tests
  };
  console.log(JSON.stringify(result, null, 2));
  return result;
} catch (error) {
  const errorResult = {
    success: false,
    error: error.message,
    stack: error.stack
  };
  console.log(JSON.stringify(errorResult, null, 2));
  return errorResult;
}
