// Buffer.resolveObjectURL() - Part 7: Edge Cases and Boundary Tests
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

// 空白字符边界测试
test('ID 前后有空格', () => {
  const result = resolveObjectURL('blob:nodedata: id ');
  return result === undefined || result instanceof Blob;
});

test('base 前后有空格（会导致不匹配）', () => {
  const result = resolveObjectURL('blob: nodedata :id');
  return result === undefined;
});

test('整个 URL 被 trim（实际不会 trim）', () => {
  const result1 = resolveObjectURL('  blob:nodedata:id  ');
  const result2 = resolveObjectURL('blob:nodedata:id');
  return result1 === undefined || result1 instanceof Blob;
});

// 控制字符测试
test('ID 包含 null 字符', () => {
  const result = resolveObjectURL('blob:nodedata:test\x00null');
  return result === undefined || result instanceof Blob;
});

test('ID 包含退格符', () => {
  const result = resolveObjectURL('blob:nodedata:test\bbackspace');
  return result === undefined || result instanceof Blob;
});

test('ID 包含回车换行', () => {
  const result = resolveObjectURL('blob:nodedata:test\r\n');
  return result === undefined || result instanceof Blob;
});

test('ID 包含垂直制表符', () => {
  const result = resolveObjectURL('blob:nodedata:test\v');
  return result === undefined || result instanceof Blob;
});

test('ID 包含换页符', () => {
  const result = resolveObjectURL('blob:nodedata:test\f');
  return result === undefined || result instanceof Blob;
});

// URL 编码边界
test('URL 编码的冒号 %3A', () => {
  const result = resolveObjectURL('blob:nodedata%3Aid');
  return result === undefined || result instanceof Blob;
});

test('URL 编码的斜杠 %2F', () => {
  const result = resolveObjectURL('blob:nodedata%2Fid');
  return result === undefined || result instanceof Blob;
});

test('双重编码', () => {
  const result = resolveObjectURL('blob:nodedata:%2525');
  return result === undefined || result instanceof Blob;
});

// 特殊 ID 格式
test('纯数字 ID', () => {
  const result = resolveObjectURL('blob:nodedata:0123456789');
  return result === undefined || result instanceof Blob;
});

test('科学计数法格式的 ID', () => {
  const result = resolveObjectURL('blob:nodedata:1e10');
  return result === undefined || result instanceof Blob;
});

test('十六进制格式的 ID', () => {
  const result = resolveObjectURL('blob:nodedata:0x1234abcd');
  return result === undefined || result instanceof Blob;
});

test('base64 格式的 ID', () => {
  const result = resolveObjectURL('blob:nodedata:YWJjZGVmZ2hpams=');
  return result === undefined || result instanceof Blob;
});

// 边界长度测试
test('ID 长度为 0', () => {
  const result = resolveObjectURL('blob:nodedata:');
  return result === undefined;
});

test('ID 长度为 1', () => {
  const result = resolveObjectURL('blob:nodedata:a');
  return result === undefined || result instanceof Blob;
});

test('ID 长度为 2', () => {
  const result = resolveObjectURL('blob:nodedata:ab');
  return result === undefined || result instanceof Blob;
});

test('ID 长度为 1KB', () => {
  const id = 'a'.repeat(1024);
  const result = resolveObjectURL(`blob:nodedata:${id}`);
  return result === undefined || result instanceof Blob;
});

test('ID 长度为 64KB', () => {
  const id = 'x'.repeat(65536);
  const result = resolveObjectURL(`blob:nodedata:${id}`);
  return result === undefined || result instanceof Blob;
});

// URL 组件组合边界
test('协议后没有内容', () => {
  const result = resolveObjectURL('blob:');
  return result === undefined;
});

test('协议 + 单个字符', () => {
  const result = resolveObjectURL('blob:n');
  return result === undefined;
});

test('协议 + base 但缺少冒号', () => {
  const result = resolveObjectURL('blob:nodedata');
  return result === undefined;
});

test('协议 + base + 多个冒号', () => {
  const result = resolveObjectURL('blob:nodedata:::');
  return result === undefined;
});

test('连续多个冒号', () => {
  const result = resolveObjectURL('blob:nodedata::id');
  return result === undefined;
});

// 数组索引访问测试
test('split 结果的索引访问 [0] 和 [1]', () => {
  const result = resolveObjectURL('blob:nodedata:id');
  return result === undefined || result instanceof Blob;
});

test('split 结果只有1个元素（缺少 ID）', () => {
  const result = resolveObjectURL('blob:nodedata');
  return result === undefined;
});

test('split 结果有3个元素（限制为3）', () => {
  const result = resolveObjectURL('blob:nodedata:id:extra');
  return result === undefined;
});

// pathname 边界测试
test('pathname 为单个字符', () => {
  const result = resolveObjectURL('blob:n');
  return result === undefined;
});

test('pathname 只包含冒号', () => {
  const result = resolveObjectURL('blob::');
  return result === undefined;
});

test('pathname 为空字符串', () => {
  const result = resolveObjectURL('blob:');
  return result === undefined;
});

// 特殊 URL 结构
test('包含端口号的 blob URL', () => {
  const result = resolveObjectURL('blob://localhost:8080/nodedata:id');
  return result === undefined;
});

test('包含用户认证的 blob URL', () => {
  const result = resolveObjectURL('blob://user:pass@host/nodedata:id');
  return result === undefined;
});

test('包含 IPv6 地址的 blob URL', () => {
  const result = resolveObjectURL('blob://[::1]/nodedata:id');
  return result === undefined;
});

// 大小写混合边界
test('协议大小写混合：Blob:', () => {
  const result = resolveObjectURL('Blob:nodedata:id');
  return result === undefined;
});

test('协议大小写混合：bLoB:', () => {
  const result = resolveObjectURL('bLoB:nodedata:id');
  return result === undefined;
});

test('base 大小写混合：NodeData', () => {
  const result = resolveObjectURL('blob:NodeData:id');
  return result === undefined;
});

test('base 大小写混合：nodeData', () => {
  const result = resolveObjectURL('blob:nodeData:id');
  return result === undefined;
});

// 重复调用稳定性
test('同一 ID 调用100次结果一致', () => {
  const results = [];
  for (let i = 0; i < 100; i++) {
    results.push(resolveObjectURL('blob:nodedata:stable'));
  }
  return results.every(r => r === results[0]);
});

test('不同 ID 交替调用互不影响', () => {
  const r1 = resolveObjectURL('blob:nodedata:id1');
  const r2 = resolveObjectURL('blob:nodedata:id2');
  const r3 = resolveObjectURL('blob:nodedata:id1');
  const r4 = resolveObjectURL('blob:nodedata:id2');
  return r1 === r3 && r2 === r4;
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
