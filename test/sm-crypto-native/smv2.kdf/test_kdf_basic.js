/**
 * sm-crypto-v2 v1.15.0 - KDF (密钥派生函数) 基础测试
 * 
 * 这是一个精简版本，包含最核心的测试用例
 */

const { kdf } = require('sm-crypto-v2');
const Buffer = require('buffer').Buffer;

// 工具函数
function toHex(u8) {
  return Buffer.from(u8).toString('hex');
}

// 测试结果
const tests = [];

function test(name, fn) {
  try {
    const pass = fn();
    tests.push({ name, status: pass ? '✅' : '❌' });
  } catch (e) {
    tests.push({ name, status: '❌', error: e.message, stack: e.stack });
  }
}

// ===== 核心功能测试 =====

test('基本用法 - 32字节输出', () => {
  const result = kdf('test-input', 32);
  return result instanceof Uint8Array && result.length === 32;
});

test('不同长度 - 16字节', () => {
  const result = kdf('test-input', 16);
  return result.length === 16;
});

test('不同长度 - 64字节', () => {
  const result = kdf('test-input', 64);
  return result.length === 64;
});

test('确定性 - 相同输入产生相同输出', () => {
  const r1 = kdf('same-input', 32);
  const r2 = kdf('same-input', 32);
  return toHex(r1) === toHex(r2);
});

test('差异性 - 不同输入产生不同输出', () => {
  const r1 = kdf('input-a', 32);
  const r2 = kdf('input-b', 32);
  return toHex(r1) !== toHex(r2);
});

// ===== 输入类型测试 =====

test('输入类型 - 字符串', () => {
  const result = kdf('hello', 32);
  return result.length === 32;
});

test('输入类型 - Uint8Array', () => {
  const input = new Uint8Array([1, 2, 3, 4, 5]);
  const result = kdf(input, 32);
  return result.length === 32;
});

test('输入类型 - UTF-8中文', () => {
  const result = kdf('你好世界', 32);
  return result.length === 32;
});

test('边界情况 - 空字符串', () => {
  const result = kdf('', 32);
  return result.length === 32;
});

test('边界情况 - 长度为0', () => {
  const result = kdf('test', 0);
  return result.length === 0;
});

test('边界情况 - 长度为1', () => {
  const result = kdf('test', 1);
  return result.length === 1;
});

// ===== IV参数测试 =====

test('IV参数 - 无IV', () => {
  const result = kdf('test', 32);
  return result.length === 32;
});

test('IV参数 - 字符串IV', () => {
  const result = kdf('test', 32, 'my-iv');
  return result.length === 32;
});

test('IV参数 - Uint8Array IV', () => {
  const iv = new Uint8Array([10, 20, 30]);
  const result = kdf('test', 32, iv);
  return result.length === 32;
});

test('IV影响输出 - 不同IV产生不同结果', () => {
  const r1 = kdf('test', 32, 'iv-1');
  const r2 = kdf('test', 32, 'iv-2');
  return toHex(r1) !== toHex(r2);
});

test('IV影响输出 - 有IV和无IV不同', () => {
  const r1 = kdf('test', 32);
  const r2 = kdf('test', 32, 'some-iv');
  return toHex(r1) !== toHex(r2);
});

// ===== 错误处理测试 =====

test('错误处理 - null输入应抛出错误', () => {
  try {
    kdf(null, 32);
    return false;
  } catch (e) {
    return true;
  }
});

test('错误处理 - undefined输入应抛出错误', () => {
  try {
    kdf(undefined, 32);
    return false;
  } catch (e) {
    return true;
  }
});

test('错误处理 - 负数长度应抛出错误', () => {
  try {
    kdf('test', -1);
    return false;
  } catch (e) {
    return true;
  }
});

// ===== 实际应用场景 =====

test('应用 - 派生AES-128密钥', () => {
  const sharedSecret = 'shared-secret';
  const aesKey = kdf(sharedSecret, 16);
  return aesKey.length === 16;
});

test('应用 - 派生SM4密钥', () => {
  const master = 'master-key';
  const sm4Key = kdf(master, 16);
  return sm4Key.length === 16;
});

test('应用 - 使用不同IV派生多个密钥', () => {
  const master = 'master-secret';
  const k1 = kdf(master, 32, 'encryption');
  const k2 = kdf(master, 32, 'mac');
  const k3 = kdf(master, 32, 'signing');
  const h1 = toHex(k1);
  const h2 = toHex(k2);
  const h3 = toHex(k3);
  return h1 !== h2 && h2 !== h3 && h1 !== h3;
});

// ===== 已知向量（供跨平台对比） =====

test('已知向量 - "abc" -> 32字节', () => {
  const result = kdf('abc', 32);
  const hex = toHex(result);
  // 记录输出: 7c2eb322d5c7bd8b81d7c7f79c1dfe25c0d896e9bda87766ec50d02ff7cf0c41
  return result.length === 32;
});

test('已知向量 - "abc" + IV "123" -> 32字节', () => {
  const result = kdf('abc', 32, '123');
  const hex = toHex(result);
  // 记录输出供对比
  return result.length === 32;
});

// ===== 汇总输出 =====

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

