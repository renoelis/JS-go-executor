// Buffer.concat() - Advanced Edge Cases and Special Scenarios
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

// 特殊的totalLength场景
test('totalLength刚好等于第一个Buffer长度', () => {
  const buf1 = Buffer.from('hello');
  const buf2 = Buffer.from('world');
  const buf3 = Buffer.from('test');
  const result = Buffer.concat([buf1, buf2, buf3], 5);
  return result.length === 5 && result.toString() === 'hello';
});

test('totalLength仅包含第一个Buffer的一部分', () => {
  const buf1 = Buffer.from('hello');
  const buf2 = Buffer.from('world');
  const result = Buffer.concat([buf1, buf2], 3);
  return result.length === 3 && result.toString() === 'hel';
});

test('totalLength跨越所有Buffer后还有剩余', () => {
  const buf1 = Buffer.from([1, 2]);
  const buf2 = Buffer.from([3, 4]);
  const result = Buffer.concat([buf1, buf2], 6);
  return result.length === 6 &&
         result[0] === 1 && result[1] === 2 &&
         result[2] === 3 && result[3] === 4 &&
         result[4] === 0 && result[5] === 0;
});

// 大量Buffer连接
test('连接1000个小Buffer', () => {
  const buffers = [];
  for (let i = 0; i < 1000; i++) {
    buffers.push(Buffer.from([i % 256]));
  }
  const result = Buffer.concat(buffers);
  return result.length === 1000 &&
         result[0] === 0 &&
         result[500] === (500 % 256) &&
         result[999] === (999 % 256);
});

test('连接大量Buffer后指定小的totalLength', () => {
  const buffers = [];
  for (let i = 0; i < 100; i++) {
    buffers.push(Buffer.from('test'));
  }
  const result = Buffer.concat(buffers, 10);
  return result.length === 10 && result.toString() === 'testtestte';
});

// 字节序敏感测试
test('连接包含不同字节序的Buffer（BE）', () => {
  const buf1 = Buffer.alloc(4);
  const buf2 = Buffer.alloc(4);
  buf1.writeUInt32BE(0x12345678, 0);
  buf2.writeUInt32BE(0xABCDEF00, 0);
  const result = Buffer.concat([buf1, buf2]);
  return result.readUInt32BE(0) === 0x12345678 &&
         result.readUInt32BE(4) === 0xABCDEF00;
});

test('连接包含不同字节序的Buffer（LE）', () => {
  const buf1 = Buffer.alloc(4);
  const buf2 = Buffer.alloc(4);
  buf1.writeUInt32LE(0x12345678, 0);
  buf2.writeUInt32LE(0xABCDEF00, 0);
  const result = Buffer.concat([buf1, buf2]);
  return result.readUInt32LE(0) === 0x12345678 &&
         result.readUInt32LE(4) === 0xABCDEF00;
});

test('连接混合BE和LE字节序', () => {
  const buf1 = Buffer.alloc(4);
  const buf2 = Buffer.alloc(4);
  buf1.writeUInt16BE(0x1234, 0);
  buf2.writeUInt16LE(0x5678, 0);
  const result = Buffer.concat([buf1, buf2]);
  return result.length === 8 &&
         result.readUInt16BE(0) === 0x1234 &&
         result.readUInt16LE(4) === 0x5678;
});

// Buffer与Uint8Array的深度测试
test('连接来自不同ArrayBuffer的Uint8Array', () => {
  const ab1 = new ArrayBuffer(4);
  const ab2 = new ArrayBuffer(4);
  const arr1 = new Uint8Array(ab1);
  const arr2 = new Uint8Array(ab2);
  arr1[0] = 1;
  arr2[0] = 2;
  const result = Buffer.concat([arr1, arr2]);
  return result.length === 8 && result[0] === 1 && result[4] === 2;
});

test('连接Uint8Array的子数组（slice）', () => {
  const arr = new Uint8Array([1, 2, 3, 4, 5]);
  const sub1 = arr.subarray(0, 2);
  const sub2 = arr.subarray(3, 5);
  const result = Buffer.concat([sub1, sub2]);
  return result.length === 4 &&
         result[0] === 1 && result[1] === 2 &&
         result[2] === 4 && result[3] === 5;
});

test('修改Uint8Array后concat不受影响', () => {
  const arr = new Uint8Array([1, 2, 3]);
  const buf = Buffer.from([4, 5, 6]);
  const result = Buffer.concat([arr, buf]);
  arr[0] = 99;
  return result[0] === 1;
});

// 编码特殊情况
test('连接包含控制字符的Buffer', () => {
  const buf1 = Buffer.from('\x00\x01\x02\x03', 'binary');
  const buf2 = Buffer.from('\x1F\x7F\xFF', 'binary');
  const result = Buffer.concat([buf1, buf2]);
  return result.length === 7 &&
         result[0] === 0 && result[3] === 3 &&
         result[4] === 31 && result[6] === 255;
});

test('连接包含换行符和特殊空白的Buffer', () => {
  const buf1 = Buffer.from('line1\nline2\r\n', 'utf8');
  const buf2 = Buffer.from('line3\t\tline4', 'utf8');
  const result = Buffer.concat([buf1, buf2]);
  return result.toString('utf8') === 'line1\nline2\r\nline3\t\tline4';
});

// totalLength精确边界
test('totalLength等于第二个Buffer结束位置', () => {
  const buf1 = Buffer.from([1, 2, 3]);
  const buf2 = Buffer.from([4, 5]);
  const buf3 = Buffer.from([6, 7, 8]);
  const result = Buffer.concat([buf1, buf2, buf3], 5);
  return result.length === 5 &&
         result[0] === 1 && result[4] === 5;
});

test('totalLength正好在多字节UTF-8字符中间', () => {
  const buf1 = Buffer.from('你好世界', 'utf8'); // 12 bytes
  const buf2 = Buffer.from('测试', 'utf8'); // 6 bytes
  const result = Buffer.concat([buf1, buf2], 13);
  // 截断可能导致不完整的UTF-8字符
  return result.length === 13;
});

// 空Buffer的各种位置
test('第一个元素是空Buffer', () => {
  const buf1 = Buffer.alloc(0);
  const buf2 = Buffer.from('data');
  const result = Buffer.concat([buf1, buf2]);
  return result.toString() === 'data';
});

test('最后一个元素是空Buffer', () => {
  const buf1 = Buffer.from('data');
  const buf2 = Buffer.alloc(0);
  const result = Buffer.concat([buf1, buf2]);
  return result.toString() === 'data';
});

test('仅中间元素是空Buffer', () => {
  const buf1 = Buffer.from('start');
  const buf2 = Buffer.alloc(0);
  const buf3 = Buffer.alloc(0);
  const buf4 = Buffer.from('end');
  const result = Buffer.concat([buf1, buf2, buf3, buf4]);
  return result.toString() === 'startend' && result.length === 8;
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
