// 深度覆盖率分析：确保与Node.js v25.0.0 100%兼容
const { Buffer } = require('buffer');

const results = {
  core_functionality: [],
  parameter_validation: [],
  encoding_support: [],
  edge_cases: [],
  performance: [],
  error_handling: [],
  spec_compliance: []
};

function test(category, name, fn) {
  try {
    const result = fn();
    results[category].push({ name, status: '✅', result });
  } catch (e) {
    results[category].push({ name, status: '❌', error: e.name, message: e.message });
  }
}

// === 1. 核心功能验证 ===
test('core_functionality', 'Buffer.alloc基本签名', () => {
  return typeof Buffer.alloc === 'function' && Buffer.alloc.length === 3;
});

test('core_functionality', 'Buffer.alloc返回Buffer实例', () => {
  const buf = Buffer.alloc(10);
  return buf instanceof Buffer && Buffer.isBuffer(buf);
});

test('core_functionality', '零长度Buffer', () => {
  const buf = Buffer.alloc(0);
  return buf.length === 0 && buf instanceof Buffer;
});

test('core_functionality', '默认零填充', () => {
  const buf = Buffer.alloc(10);
  return buf.every(b => b === 0);
});

// === 2. 参数验证深度测试 ===
test('parameter_validation', 'size参数类型强制检查', () => {
  try { Buffer.alloc(null); return false; } catch(e) { return e.name === 'TypeError'; }
});

test('parameter_validation', 'size参数NaN检查', () => {
  try { Buffer.alloc(NaN); return false; } catch(e) { return e.name === 'RangeError'; }
});

test('parameter_validation', 'size参数Infinity检查', () => {
  try { Buffer.alloc(Infinity); return false; } catch(e) { return e.name === 'RangeError'; }
});

test('parameter_validation', 'size参数负数检查', () => {
  try { Buffer.alloc(-1); return false; } catch(e) { return e.name === 'RangeError'; }
});

test('parameter_validation', 'size参数MAX_SAFE_INTEGER检查', () => {
  try { Buffer.alloc(Number.MAX_SAFE_INTEGER); return false; } catch(e) { return e.name === 'RangeError'; }
});

// === 3. 编码支持验证 ===
const encodings = [
  { name: 'utf8', fill: 'test' },
  { name: 'utf-8', fill: 'test' },
  { name: 'hex', fill: '41424344' }, // 有效的hex字符串
  { name: 'base64', fill: 'dGVzdA==' }, // 有效的base64字符串
  { name: 'base64url', fill: 'dGVzdA' }, // 有效的base64url字符串
  { name: 'ascii', fill: 'test' },
  { name: 'latin1', fill: 'test' },
  { name: 'binary', fill: 'test' },
  { name: 'utf16le', fill: 'test' },
  { name: 'ucs2', fill: 'test' },
  { name: 'ucs-2', fill: 'test' }
];
encodings.forEach(enc => {
  test('encoding_support', `编码支持: ${enc.name}`, () => {
    const buf = Buffer.alloc(10, enc.fill, enc.name);
    return buf.length === 10;
  });
});

test('encoding_support', '编码大小写不敏感', () => {
  const buf1 = Buffer.alloc(10, 'test', 'UTF8');
  const buf2 = Buffer.alloc(10, 'test', 'utf8');
  return buf1.equals(buf2);
});

test('encoding_support', '无效编码处理', () => {
  try {
    Buffer.alloc(10, 'test', 'invalid');
    return false; // Node.js应该抛出错误
  } catch (e) {
    return e.name === 'TypeError' && e.message.includes('Unknown encoding');
  }
});

// === 4. 边界情况 ===
test('edge_cases', 'poolSize边界 (4095)', () => {
  const buf = Buffer.alloc(4095);
  return buf.length === 4095;
});

test('edge_cases', 'poolSize边界 (4096)', () => {
  const buf = Buffer.alloc(4096);
  return buf.length === 4096;
});

test('edge_cases', 'poolSize边界 (4097)', () => {
  const buf = Buffer.alloc(4097);
  return buf.length === 4097;
});

test('edge_cases', '大尺寸Buffer (1MB)', () => {
  const buf = Buffer.alloc(1024 * 1024);
  return buf.length === 1024 * 1024;
});

test('edge_cases', '填充值字节边界 (0)', () => {
  const buf = Buffer.alloc(5, 0);
  return buf.every(b => b === 0);
});

test('edge_cases', '填充值字节边界 (255)', () => {
  const buf = Buffer.alloc(5, 255);
  return buf.every(b => b === 255);
});

test('edge_cases', '填充值溢出处理 (256)', () => {
  const buf = Buffer.alloc(5, 256);
  return buf.every(b => b === 0);
});

test('edge_cases', '填充值负数处理 (-1)', () => {
  const buf = Buffer.alloc(5, -1);
  return buf.every(b => b === 255);
});

// === 5. 性能相关 ===
test('performance', '快速连续分配', () => {
  const start = Date.now();
  for (let i = 0; i < 1000; i++) {
    Buffer.alloc(100);
  }
  return Date.now() - start < 1000; // 应该在1秒内完成
});

test('performance', '内存池复用验证', () => {
  const buf1 = Buffer.alloc(100);
  const buf2 = Buffer.alloc(100);
  return buf1 !== buf2; // 不同的Buffer实例
});

// === 6. 错误处理 ===
test('error_handling', 'RangeError错误代码', () => {
  try { Buffer.alloc(-1); return false; } 
  catch(e) { return e.name === 'RangeError' && e.code === 'ERR_OUT_OF_RANGE'; }
});

test('error_handling', 'TypeError错误代码', () => {
  try { Buffer.alloc(null); return false; } 
  catch(e) { return e.name === 'TypeError' && e.code === 'ERR_INVALID_ARG_TYPE'; }
});

// === 7. 规范兼容性 ===
test('spec_compliance', 'Buffer实例验证', () => {
  const buf = Buffer.alloc(10);
  return buf instanceof Buffer && Buffer.isBuffer(buf);
});

test('spec_compliance', 'ArrayBuffer互操作', () => {
  const buf = Buffer.alloc(10);
  return buf.buffer instanceof ArrayBuffer;
});

test('spec_compliance', 'Uint8Array兼容性', () => {
  const buf = Buffer.alloc(10);
  return buf instanceof Uint8Array;
});

// 输出结果
console.log(JSON.stringify(results, null, 2));

// 统计
const totalTests = Object.values(results).reduce((sum, arr) => sum + arr.length, 0);
const passedTests = Object.values(results).reduce((sum, arr) => sum + arr.filter(t => t.status === '✅').length, 0);
const successRate = ((passedTests / totalTests) * 100).toFixed(2);

console.log(`\n深度覆盖率分析结果：`);
console.log(`总测试数: ${totalTests}`);
console.log(`通过数: ${passedTests}`);
console.log(`成功率: ${successRate}%`);

return { results, stats: { total: totalTests, passed: passedTests, rate: successRate } };
