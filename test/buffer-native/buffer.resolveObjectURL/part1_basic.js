// Buffer.resolveObjectURL() - Part 1: Basic Tests
const { Buffer, resolveObjectURL, Blob } = require('buffer');

const tests = [];

function test(name, fn) {
  try {
    const pass = fn();
    tests.push({ name, status: pass ? '✅' : '❌' });
  } catch (e) {
    tests.push({ name, status: '❌', error: e.message, stack: e.stack });
  }
}

// 基本存在性测试
test('resolveObjectURL 函数存在', () => {
  return typeof resolveObjectURL === 'function';
});

test('resolveObjectURL 是函数类型', () => {
  return typeof resolveObjectURL === 'function';
});

test('resolveObjectURL 接受1个参数', () => {
  return resolveObjectURL.length === 1;
});

test('resolveObjectURL 有正确的 name 属性', () => {
  return resolveObjectURL.name === 'resolveObjectURL';
});

// 基本返回值测试
test('不存在的 ID 返回 undefined', () => {
  const result = resolveObjectURL('blob:nodedata:nonexistent');
  return result === undefined;
});

test('无效的 URL 格式返回 undefined', () => {
  const result = resolveObjectURL('invalid-url');
  return result === undefined;
});

test('空字符串返回 undefined', () => {
  const result = resolveObjectURL('');
  return result === undefined;
});

test('返回值是 undefined 或 Blob 实例', () => {
  const result = resolveObjectURL('blob:nodedata:test');
  return result === undefined || (typeof Blob === 'function' && result instanceof Blob);
});

// URL 格式测试
test('正确格式的 URL：blob:nodedata:id', () => {
  const result = resolveObjectURL('blob:nodedata:someid');
  return result === undefined || result instanceof Blob;
});

test('缺少 blob: 前缀', () => {
  const result = resolveObjectURL('nodedata:someid');
  return result === undefined;
});

test('错误的协议前缀：http:', () => {
  const result = resolveObjectURL('http://example.com/nodedata:id');
  return result === undefined;
});

test('错误的协议前缀：file:', () => {
  const result = resolveObjectURL('file:nodedata:id');
  return result === undefined;
});

test('包含查询参数的 URL', () => {
  const result = resolveObjectURL('blob:nodedata:id?query=value');
  return result === undefined;
});

test('包含 hash 的 URL', () => {
  const result = resolveObjectURL('blob:nodedata:id#hash');
  return result === undefined;
});

// 基本路径格式测试
test('路径只有一部分', () => {
  const result = resolveObjectURL('blob:nodedata');
  return result === undefined;
});

test('路径有三部分（多余的冒号）', () => {
  const result = resolveObjectURL('blob:nodedata:id:extra');
  return result === undefined;
});

test('错误的 base 名称：notnode', () => {
  const result = resolveObjectURL('blob:notnode:id');
  return result === undefined;
});

test('错误的 base 名称：data', () => {
  const result = resolveObjectURL('blob:data:id');
  return result === undefined;
});

test('大小写敏感：NodeData', () => {
  const result = resolveObjectURL('blob:NodeData:id');
  return result === undefined;
});

test('大小写敏感：NODEDATA', () => {
  const result = resolveObjectURL('blob:NODEDATA:id');
  return result === undefined;
});

// ID 格式测试
test('数字 ID', () => {
  const result = resolveObjectURL('blob:nodedata:123');
  return result === undefined || result instanceof Blob;
});

test('UUID 格式的 ID', () => {
  const result = resolveObjectURL('blob:nodedata:550e8400-e29b-41d4-a716-446655440000');
  return result === undefined || result instanceof Blob;
});

test('包含特殊字符的 ID', () => {
  const result = resolveObjectURL('blob:nodedata:id-with-dashes');
  return result === undefined || result instanceof Blob;
});

test('包含下划线的 ID', () => {
  const result = resolveObjectURL('blob:nodedata:id_with_underscores');
  return result === undefined || result instanceof Blob;
});

test('空的 ID 部分', () => {
  const result = resolveObjectURL('blob:nodedata:');
  return result === undefined;
});

test('非常长的 ID', () => {
  const longId = 'a'.repeat(1000);
  const result = resolveObjectURL(`blob:nodedata:${longId}`);
  return result === undefined || result instanceof Blob;
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
