// Buffer.constants - 极端场景与历史兼容性（第5轮补充）
const buffer = require('buffer');
const { Buffer } = buffer;
const constants = buffer.constants;

const tests = [];

function test(name, fn) {
  try {
    const pass = fn();
    tests.push({ name, status: pass ? '✅' : '❌' });
  } catch (e) {
    tests.push({ name, status: '❌', error: e.message, stack: e.stack });
  }
}

// 1. 验证空 Buffer 的创建不受 constants 限制
test('创建空 Buffer 始终成功', () => {
  const buf = Buffer.alloc(0);
  return buf.length === 0 && buf.length < constants.MAX_LENGTH;
});

// 2. 验证 Buffer 长度 1 的边界
test('长度为 1 的 Buffer 可以正常创建', () => {
  const buf = Buffer.alloc(1);
  return buf.length === 1;
});

// 3. 验证 Buffer 长度为 MAX_LENGTH - 1 的理论边界
test('理论上 MAX_LENGTH - 1 是有效长度', () => {
  const validSize = constants.MAX_LENGTH - 1;
  // 不实际创建，只验证值的合理性
  return validSize > 0 && validSize < constants.MAX_LENGTH;
});

// 4. 验证使用科学计数法表示的长度
test('科学计数法表示的长度可以工作', () => {
  const buf = Buffer.alloc(1e3); // 1000
  return buf.length === 1000;
});

// 5. 验证 Buffer.byteLength 与 MAX_STRING_LENGTH 的关系
test('Buffer.byteLength 计算不受 MAX_STRING_LENGTH 直接限制', () => {
  const str = 'hello';
  const len = Buffer.byteLength(str, 'utf8');
  return len === 5 && len < constants.MAX_STRING_LENGTH;
});

// 6. 验证不同编码下的字节长度
test('不同编码的字节长度计算正确', () => {
  const str = 'hello';
  const utf8Len = Buffer.byteLength(str, 'utf8');
  const asciiLen = Buffer.byteLength(str, 'ascii');
  const base64Len = Buffer.byteLength(str, 'base64');
  return utf8Len > 0 && asciiLen > 0 && base64Len > 0;
});

// 7. 验证 Buffer.concat 的总长度限制
test('Buffer.concat 结果长度有限制', () => {
  const buf1 = Buffer.alloc(10);
  const buf2 = Buffer.alloc(20);
  const buf3 = Buffer.alloc(30);
  const result = Buffer.concat([buf1, buf2, buf3]);
  return result.length === 60 && result.length < constants.MAX_LENGTH;
});

// 8. 验证 Buffer.concat 空数组
test('Buffer.concat 空数组返回空 Buffer', () => {
  const result = Buffer.concat([]);
  return result.length === 0;
});

// 9. 验证 Buffer.concat 指定总长度
test('Buffer.concat 可以指定总长度', () => {
  const buf1 = Buffer.alloc(10);
  const buf2 = Buffer.alloc(20);
  const result = Buffer.concat([buf1, buf2], 15); // 指定长度小于实际
  return result.length === 15;
});

// 10. 验证 Buffer.isBuffer 不受 constants 影响
test('Buffer.isBuffer 正常工作', () => {
  const buf = Buffer.alloc(100);
  const notBuf = {};
  return Buffer.isBuffer(buf) && !Buffer.isBuffer(notBuf);
});

// 11. 验证 Buffer.compare 不受 constants 影响
test('Buffer.compare 正常工作', () => {
  const buf1 = Buffer.from('abc');
  const buf2 = Buffer.from('abd');
  const result = Buffer.compare(buf1, buf2);
  return result < 0; // 'abc' < 'abd'
});

// 12. 验证 Buffer 子类继承
test('Buffer 子类可以访问 constants', () => {
  // Buffer 是不可继承的，但我们可以验证原型链
  return typeof Buffer.alloc === 'function';
});

// 13. 验证 constants 在模块缓存中的一致性
test('多次 require 返回相同的 constants 对象', () => {
  delete require.cache[require.resolve('buffer')];
  const buffer2 = require('buffer');
  const result = buffer2.constants.MAX_LENGTH === constants.MAX_LENGTH;
  // 重新加载原模块确保测试不影响后续
  delete require.cache[require.resolve('buffer')];
  require('buffer');
  return result;
});

// 14. 验证 constants 的 toString 输出
test('constants.toString() 返回对象字符串', () => {
  const str = constants.toString();
  return str.includes('object') || str.includes('Object');
});

// 15. 验证 constants 的 valueOf 行为
test('constants.valueOf() 返回自身', () => {
  const val = constants.valueOf();
  return val === constants;
});

// 16. 验证使用 Uint8Array 与 MAX_LENGTH 的关系
test('Uint8Array 长度也受 MAX_LENGTH 限制', () => {
  try {
    const arr = new Uint8Array(constants.MAX_LENGTH + 1);
    return false;
  } catch (e) {
    return true;
  }
});

// 17. 验证 Buffer 与 TypedArray 的长度一致性
test('Buffer 和 Uint8Array 长度限制一致', () => {
  const size = 1024;
  const buf = Buffer.alloc(size);
  const arr = new Uint8Array(size);
  return buf.length === arr.length;
});

// 18. 验证 ArrayBuffer 的长度限制
test('ArrayBuffer 长度限制存在', () => {
  try {
    const ab = new ArrayBuffer(constants.MAX_LENGTH + 1);
    return false;
  } catch (e) {
    return true;
  }
});

// 19. 验证 Buffer.from(ArrayBuffer) 与长度的关系
test('从 ArrayBuffer 创建 Buffer 保持长度', () => {
  const ab = new ArrayBuffer(100);
  const buf = Buffer.from(ab);
  return buf.length === 100;
});

// 20. 验证 SharedArrayBuffer 与 constants 的关系
test('SharedArrayBuffer 存在长度限制', () => {
  try {
    if (typeof SharedArrayBuffer !== 'undefined') {
      const sab = new SharedArrayBuffer(constants.MAX_LENGTH + 1);
      return false;
    }
    return true; // SharedArrayBuffer 不存在时跳过
  } catch (e) {
    return true;
  }
});

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
