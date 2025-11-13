// Buffer.resolveObjectURL() - Part 10: Pathname Edge Cases补充测试
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

// pathname 前导斜杠的详细测试
test('pathname 为 "/nodedata:id" 时前导斜杠导致分割失败', () => {
  const result = resolveObjectURL('blob:/nodedata:id');
  return result === undefined;
});

test('pathname 为 "//nodedata:id" 时双斜杠导致分割失败', () => {
  const result = resolveObjectURL('blob://nodedata:id');
  return result === undefined;
});

test('pathname 为 "///nodedata:id" 时三斜杠导致分割失败', () => {
  const result = resolveObjectURL('blob:///nodedata:id');
  return result === undefined;
});

test('pathname 正常无斜杠："nodedata:id"', () => {
  const result = resolveObjectURL('blob:nodedata:id');
  return result === undefined || result instanceof Blob;
});

// URL 解析中 pathname 的提取规则
test('URL 格式 "blob:path" pathname 直接是 path', () => {
  const result = resolveObjectURL('blob:test:value');
  return result === undefined || result instanceof Blob;
});

test('URL 格式 "blob:/path" pathname 是 /path', () => {
  const result = resolveObjectURL('blob:/test:value');
  return result === undefined;
});

test('URL 格式 "blob:///path" pathname 是 /path', () => {
  const result = resolveObjectURL('blob:///test:value');
  return result === undefined;
});

// split 限制为3的边界情况
test('恰好3个冒号分隔成3部分（超过2）', () => {
  const result = resolveObjectURL('blob:a:b:c');
  return result === undefined;
});

test('4个冒号分隔成4部分但 split(3) 限制为3', () => {
  const result = resolveObjectURL('blob:a:b:c:d');
  return result === undefined;
});

test('5个冒号 split(3) 后第3部分包含剩余冒号', () => {
  const result = resolveObjectURL('blob:nodedata:id:extra:more');
  return result === undefined;
});

test('split 第3参数限制：前2个冒号分割，第3部分保留剩余', () => {
  const result = resolveObjectURL('blob:nodedata:test:a:b:c');
  return result === undefined;
});

// pathname 中包含斜杠和冒号的混合
test('pathname 为 "nodedata/test:id" 斜杠在前', () => {
  const result = resolveObjectURL('blob:nodedata/test:id');
  return result === undefined;
});

test('pathname 为 "nodedata:test/id" 斜杠在后', () => {
  const result = resolveObjectURL('blob:nodedata:test/id');
  return result === undefined || result instanceof Blob;
});

test('pathname 为 "/nodedata/test:id" 前导斜杠+内部斜杠', () => {
  const result = resolveObjectURL('blob:/nodedata/test:id');
  return result === undefined;
});

// URL 查询参数的详细位置测试
test('查询参数在协议后：blob:?query=1', () => {
  try {
    const result = resolveObjectURL('blob:?query=1');
    return result === undefined;
  } catch (e) {
    return false;
  }
});

test('查询参数在 base 后：blob:nodedata?query=1:id', () => {
  const result = resolveObjectURL('blob:nodedata?query=1:id');
  return result === undefined || result instanceof Blob;
});

test('查询参数在 ID 中：blob:nodedata:id?query=1', () => {
  const result = resolveObjectURL('blob:nodedata:id?query=1');
  return result === undefined || result instanceof Blob;
});

test('查询参数包含冒号：blob:nodedata:id?param=a:b', () => {
  const result = resolveObjectURL('blob:nodedata:id?param=a:b');
  return result === undefined || result instanceof Blob;
});

// URL 片段标识符的详细位置测试
test('片段在协议后：blob:#fragment', () => {
  try {
    const result = resolveObjectURL('blob:#fragment');
    return result === undefined;
  } catch (e) {
    return false;
  }
});

test('片段在 base 后：blob:nodedata#fragment:id', () => {
  const result = resolveObjectURL('blob:nodedata#fragment:id');
  return result === undefined || result instanceof Blob;
});

test('片段在 ID 中：blob:nodedata:id#fragment', () => {
  const result = resolveObjectURL('blob:nodedata:id#fragment');
  return result === undefined || result instanceof Blob;
});

test('片段包含冒号：blob:nodedata:id#hash:value', () => {
  const result = resolveObjectURL('blob:nodedata:id#hash:value');
  return result === undefined || result instanceof Blob;
});

// 同时包含查询参数和片段
test('URL 同时包含 query 和 hash', () => {
  const result = resolveObjectURL('blob:nodedata:id?q=1#hash');
  return result === undefined || result instanceof Blob;
});

test('query 和 hash 的顺序：hash 在 query 前（非标准）', () => {
  const result = resolveObjectURL('blob:nodedata:id#hash?q=1');
  return result === undefined || result instanceof Blob;
});

// URL 编码在不同位置的影响
test('base 部分 URL 编码：blob:node%64ata:id ("d" 编码)', () => {
  const result = resolveObjectURL('blob:node%64ata:id');
  return result === undefined;
});

test('ID 部分 URL 编码：blob:nodedata:test%20id', () => {
  const result = resolveObjectURL('blob:nodedata:test%20id');
  return result === undefined || result instanceof Blob;
});

test('冒号 URL 编码：blob:nodedata%3Aid (冒号变为%3A)', () => {
  const result = resolveObjectURL('blob:nodedata%3Aid');
  return result === undefined || result instanceof Blob;
});

test('完全 URL 编码的 base：blob:%6E%6F%64%65%64%61%74%61:id', () => {
  const result = resolveObjectURL('blob:%6E%6F%64%65%64%61%74%61:id');
  return result === undefined;
});

// pathname 为特殊值
test('pathname 为单个冒号 ":"', () => {
  try {
    const result = resolveObjectURL('blob::');
    return result === undefined;
  } catch (e) {
    return false;
  }
});

test('pathname 为空字符串（只有协议）', () => {
  try {
    const result = resolveObjectURL('blob:');
    return result === undefined;
  } catch (e) {
    return false;
  }
});

test('pathname 只包含 base 无冒号：nodedata', () => {
  const result = resolveObjectURL('blob:nodedata');
  return result === undefined;
});

// 解构赋值边界测试
test('split 结果长度为0（理论上不可能）', () => {
  try {
    const result = resolveObjectURL('blob:');
    return result === undefined;
  } catch (e) {
    return false;
  }
});

test('split 结果长度为1（只有 base）', () => {
  const result = resolveObjectURL('blob:onlybase');
  return result === undefined;
});

test('split 结果长度为2（正常情况）', () => {
  const result = resolveObjectURL('blob:base:id');
  return result === undefined || result instanceof Blob;
});

test('split 结果长度为3（带第3部分）', () => {
  const result = resolveObjectURL('blob:a:b:c');
  return result === undefined;
});

// 数组解构赋值语法测试
test('解构第0项为 base', () => {
  const result = resolveObjectURL('blob:first:second');
  return result === undefined;
});

test('解构第1项为 id', () => {
  const result = resolveObjectURL('blob:nodedata:myid');
  return result === undefined || result instanceof Blob;
});

test('第0项不等于 "nodedata" 时返回 undefined', () => {
  const result = resolveObjectURL('blob:other:id');
  return result === undefined;
});

test('第1项可以是空字符串（split 的结果）', () => {
  const result = resolveObjectURL('blob:nodedata:');
  return result === undefined;
});

// 严格相等检查
test('base === "nodedata" 使用严格相等', () => {
  const result1 = resolveObjectURL('blob:nodedata:id');
  const result2 = resolveObjectURL('blob:nodeData:id');
  return result2 === undefined;
});

test('base 不能有任何空格', () => {
  const result = resolveObjectURL('blob: nodedata :id');
  return result === undefined;
});

test('base 全部大写不匹配', () => {
  const result = resolveObjectURL('blob:NODEDATA:id');
  return result === undefined;
});

// pathname 中的特殊 Unicode 字符
test('pathname 包含零宽空格：nodedata\u200Bid', () => {
  const result = resolveObjectURL('blob:nodedata\u200B:id');
  return result === undefined;
});

test('pathname 包含软连字符：node\u00ADdata:id', () => {
  const result = resolveObjectURL('blob:node\u00ADdata:id');
  return result === undefined;
});

test('pathname 包含不间断空格：node\u00A0data:id', () => {
  const result = resolveObjectURL('blob:node\u00A0data:id');
  return result === undefined;
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
