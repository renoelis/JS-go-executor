// Buffer.isEncoding - part16: Node.js v25.0.0 特定行为与历史兼容性
const { Buffer } = require('buffer');

const tests = [];

function test(name, fn) {
  try {
    const pass = fn();
    tests.push({ name, status: pass ? '✅' : '❌' });
  } catch (e) {
    tests.push({ name, status: '❌', error: e.message, stack: e.stack });
  }
}

// Node.js v25.0.0 支持的所有编码（官方文档）
test('Node v25: utf8 编码', () => {
  return Buffer.isEncoding('utf8') === true;
});

test('Node v25: utf-8 编码（带连字符）', () => {
  return Buffer.isEncoding('utf-8') === true;
});

test('Node v25: utf16le 编码', () => {
  return Buffer.isEncoding('utf16le') === true;
});

test('Node v25: ucs2 编码（utf16le 别名）', () => {
  return Buffer.isEncoding('ucs2') === true;
});

test('Node v25: ucs-2 编码（utf16le 别名带连字符）', () => {
  return Buffer.isEncoding('ucs-2') === true;
});

test('Node v25: base64 编码', () => {
  return Buffer.isEncoding('base64') === true;
});

test('Node v25: base64url 编码', () => {
  return Buffer.isEncoding('base64url') === true;
});

test('Node v25: latin1 编码', () => {
  return Buffer.isEncoding('latin1') === true;
});

test('Node v25: binary 编码（latin1 别名）', () => {
  return Buffer.isEncoding('binary') === true;
});

test('Node v25: hex 编码', () => {
  return Buffer.isEncoding('hex') === true;
});

test('Node v25: ascii 编码', () => {
  return Buffer.isEncoding('ascii') === true;
});

// 确认不支持的编码
test('Node v25 不支持: utf32', () => {
  return Buffer.isEncoding('utf32') === false;
});

test('Node v25 不支持: utf16（缺少 le）', () => {
  return Buffer.isEncoding('utf16') === false;
});

test('Node v25 不支持: utf16be', () => {
  return Buffer.isEncoding('utf16be') === false;
});

test('Node v25 不支持: iso-8859-1', () => {
  return Buffer.isEncoding('iso-8859-1') === false;
});

test('Node v25 不支持: windows-1252', () => {
  return Buffer.isEncoding('windows-1252') === false;
});

// 历史兼容性：binary 作为 latin1 的别名
test('历史兼容性: binary 和 latin1 行为一致', () => {
  const binaryResult = Buffer.isEncoding('binary');
  const latin1Result = Buffer.isEncoding('latin1');
  return binaryResult === latin1Result && binaryResult === true;
});

// 历史兼容性：ucs2 作为 utf16le 的别名
test('历史兼容性: ucs2 和 utf16le 行为一致', () => {
  const ucs2Result = Buffer.isEncoding('ucs2');
  const utf16leResult = Buffer.isEncoding('utf16le');
  return ucs2Result === utf16leResult && ucs2Result === true;
});

test('历史兼容性: ucs-2 带连字符也是 utf16le 别名', () => {
  const ucs2Result = Buffer.isEncoding('ucs-2');
  const utf16leResult = Buffer.isEncoding('utf16le');
  return ucs2Result === utf16leResult && ucs2Result === true;
});

// 大小写不敏感性确认（Node.js 特性）
test('大小写不敏感: UTF8 === utf8', () => {
  return Buffer.isEncoding('UTF8') === Buffer.isEncoding('utf8');
});

test('大小写不敏感: HEX === hex', () => {
  return Buffer.isEncoding('HEX') === Buffer.isEncoding('hex');
});

test('大小写不敏感: BASE64 === base64', () => {
  return Buffer.isEncoding('BASE64') === Buffer.isEncoding('base64');
});

test('大小写不敏感: ASCII === ascii', () => {
  return Buffer.isEncoding('ASCII') === Buffer.isEncoding('ascii');
});

test('大小写不敏感: LATIN1 === latin1', () => {
  return Buffer.isEncoding('LATIN1') === Buffer.isEncoding('latin1');
});

test('大小写不敏感: BINARY === binary', () => {
  return Buffer.isEncoding('BINARY') === Buffer.isEncoding('binary');
});

test('大小写不敏感: UTF16LE === utf16le', () => {
  return Buffer.isEncoding('UTF16LE') === Buffer.isEncoding('utf16le');
});

test('大小写不敏感: UCS2 === ucs2', () => {
  return Buffer.isEncoding('UCS2') === Buffer.isEncoding('ucs2');
});

test('大小写不敏感: BASE64URL === base64url', () => {
  return Buffer.isEncoding('BASE64URL') === Buffer.isEncoding('base64url');
});

// 连字符变体
test('连字符变体: utf-8 和 utf8 行为一致', () => {
  return Buffer.isEncoding('utf-8') === Buffer.isEncoding('utf8');
});

test('连字符变体: ucs-2 和 ucs2 行为一致', () => {
  return Buffer.isEncoding('ucs-2') === Buffer.isEncoding('ucs2');
});

test('连字符变体: UTF-8 大写带连字符', () => {
  return Buffer.isEncoding('UTF-8') === true;
});

test('连字符变体: UCS-2 大写带连字符', () => {
  return Buffer.isEncoding('UCS-2') === true;
});

// base64url 作为相对较新的编码（确认支持）
test('较新编码: base64url 应被支持', () => {
  return Buffer.isEncoding('base64url') === true;
});

test('较新编码: BASE64URL 大写形式应被支持', () => {
  return Buffer.isEncoding('BASE64URL') === true;
});

test('较新编码: Base64Url 混合大小写应被支持', () => {
  return Buffer.isEncoding('Base64Url') === true;
});

// 确认不存在的编码别名
test('不存在的别名: utf-16（带连字符）应返回 false', () => {
  return Buffer.isEncoding('utf-16') === false;
});

test('不存在的别名: utf-32（带连字符）应返回 false', () => {
  return Buffer.isEncoding('utf-32') === false;
});

test('不存在的别名: base-64（带连字符）应返回 false', () => {
  return Buffer.isEncoding('base-64') === false;
});

// 确认编码名称的精确性要求
test('编码名称精确性: utf 8（带空格）应返回 false', () => {
  return Buffer.isEncoding('utf 8') === false;
});

test('编码名称精确性: utf_8（带下划线）应返回 false', () => {
  return Buffer.isEncoding('utf_8') === false;
});

test('编码名称精确性: utf.8（带点号）应返回 false', () => {
  return Buffer.isEncoding('utf.8') === false;
});

// 与 Buffer 其他方法的一致性验证
test('一致性验证: isEncoding 与 Buffer.from 行为一致（utf8）', () => {
  const isValidByIsEncoding = Buffer.isEncoding('utf8');
  let isValidByFrom = true;
  try {
    Buffer.from('test', 'utf8');
  } catch (e) {
    isValidByFrom = false;
  }
  return isValidByIsEncoding === isValidByFrom;
});

test('一致性验证: isEncoding 与 Buffer.from 行为一致（hex）', () => {
  const isValidByIsEncoding = Buffer.isEncoding('hex');
  let isValidByFrom = true;
  try {
    Buffer.from('test', 'hex');
  } catch (e) {
    isValidByFrom = false;
  }
  return isValidByIsEncoding === isValidByFrom;
});

// 空值和边界情况的 Node.js 行为
test('Node.js 行为: 空字符串应返回 false', () => {
  return Buffer.isEncoding('') === false;
});

test('Node.js 行为: undefined 应返回 false', () => {
  return Buffer.isEncoding(undefined) === false;
});

test('Node.js 行为: null 应返回 false', () => {
  return Buffer.isEncoding(null) === false;
});

test('Node.js 行为: 数字应返回 false', () => {
  return Buffer.isEncoding(123) === false;
});

test('Node.js 行为: 对象应返回 false', () => {
  return Buffer.isEncoding({}) === false;
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
