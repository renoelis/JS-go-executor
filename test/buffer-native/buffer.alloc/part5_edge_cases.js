// Buffer.alloc() - Part 5: Edge Cases and Boundary Tests
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

// 极端大小边界
test('size 为 1（最小非空）', () => {
  const buf = Buffer.alloc(1);
  return buf.length === 1 && buf[0] === 0;
});

test('size 为 2（双字节边界）', () => {
  const buf = Buffer.alloc(2);
  return buf.length === 2 && buf[0] === 0 && buf[1] === 0;
});

test('size 为 4（四字节边界）', () => {
  const buf = Buffer.alloc(4);
  return buf.length === 4 && buf[3] === 0;
});

test('size 为 8（八字节边界）', () => {
  const buf = Buffer.alloc(8);
  return buf.length === 8 && buf[7] === 0;
});

test('size 为 16（十六字节边界）', () => {
  const buf = Buffer.alloc(16);
  return buf.length === 16 && buf[15] === 0;
});

test('size 为 4095（poolSize - 1）', () => {
  const buf = Buffer.alloc(4095);
  return buf.length === 4095 && buf[0] === 0 && buf[4094] === 0;
});

test('size 为 4096（poolSize）', () => {
  const buf = Buffer.alloc(4096);
  return buf.length === 4096 && buf[0] === 0 && buf[4095] === 0;
});

test('size 为 4097（poolSize + 1）', () => {
  const buf = Buffer.alloc(4097);
  return buf.length === 4097 && buf[0] === 0 && buf[4096] === 0;
});

test('size 为 8191（2 * poolSize - 1）', () => {
  const buf = Buffer.alloc(8191);
  return buf.length === 8191 && buf[0] === 0 && buf[8190] === 0;
});

test('size 为 65535（64KB - 1）', () => {
  const buf = Buffer.alloc(65535);
  return buf.length === 65535 && buf[0] === 0 && buf[65534] === 0;
});

test('size 为 65536（64KB）', () => {
  const buf = Buffer.alloc(65536);
  return buf.length === 65536 && buf[0] === 0 && buf[65535] === 0;
});

test('size 为 1048576（1MB）', () => {
  const buf = Buffer.alloc(1048576);
  return buf.length === 1048576 && buf[0] === 0 && buf[1048575] === 0;
});

test('size 为 10000000（10MB）', () => {
  const buf = Buffer.alloc(10000000);
  return buf.length === 10000000 && buf[0] === 0 && buf[9999999] === 0;
});

// fill 极端值
test('fill 为 0（最小字节值）', () => {
  const buf = Buffer.alloc(5, 0);
  return buf[0] === 0 && buf[4] === 0;
});

test('fill 为 255（最大字节值）', () => {
  const buf = Buffer.alloc(5, 255);
  return buf[0] === 255 && buf[4] === 255;
});

test('fill 为 128（中间值）', () => {
  const buf = Buffer.alloc(5, 128);
  return buf[0] === 128 && buf[4] === 128;
});

test('fill 为 127（有符号最大正值）', () => {
  const buf = Buffer.alloc(5, 127);
  return buf[0] === 127 && buf[4] === 127;
});

test('fill 为 -128（有符号最小值，转换为 128）', () => {
  const buf = Buffer.alloc(5, -128);
  return buf[0] === 128 && buf[4] === 128;
});

test('fill 为 512（应取模为 0）', () => {
  const buf = Buffer.alloc(5, 512);
  return buf[0] === 0 && buf[4] === 0;
});

test('fill 为 1000（应取模）', () => {
  const buf = Buffer.alloc(5, 1000);
  const expected = 1000 % 256;
  return buf[0] === expected && buf[4] === expected;
});

// 字符串 fill 边界
test('fill 为非常长的字符串（1000 字符）', () => {
  const longStr = 'a'.repeat(1000);
  const buf = Buffer.alloc(5000, longStr);
  return buf.length === 5000;
});

test('fill 为单字节字符', () => {
  const buf = Buffer.alloc(10, 'x');
  return buf.every(byte => byte === 0x78);
});

test('fill 为多字节 UTF-8 序列重复', () => {
  const buf = Buffer.alloc(20, '测试');
  return buf.length === 20;
});

test('fill 为控制字符 \\n', () => {
  const buf = Buffer.alloc(5, '\n');
  return buf[0] === 0x0A && buf[4] === 0x0A;
});

test('fill 为控制字符 \\t', () => {
  const buf = Buffer.alloc(5, '\t');
  return buf[0] === 0x09 && buf[4] === 0x09;
});

test('fill 为 null 字符 \\0', () => {
  const buf = Buffer.alloc(5, '\0');
  return buf[0] === 0 && buf[4] === 0;
});

// Buffer fill 边界
test('fill 为长度为 1 的 Buffer', () => {
  const fillBuf = Buffer.from([0xAA]);
  const buf = Buffer.alloc(10, fillBuf);
  return buf.every(byte => byte === 0xAA);
});

test('fill 为长度与目标相同的 Buffer', () => {
  const fillBuf = Buffer.from([1, 2, 3, 4, 5]);
  const buf = Buffer.alloc(5, fillBuf);
  return buf[0] === 1 && buf[4] === 5;
});

test('fill 为长度大于目标的 Buffer', () => {
  const fillBuf = Buffer.from([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  const buf = Buffer.alloc(3, fillBuf);
  return buf[0] === 1 && buf[1] === 2 && buf[2] === 3;
});

test('fill 为 Uint8Array（长度为 3）', () => {
  const fillArr = new Uint8Array([0xAA, 0xBB, 0xCC]);
  const buf = Buffer.alloc(9, fillArr);
  return buf[0] === 0xAA && buf[1] === 0xBB && buf[2] === 0xCC &&
         buf[3] === 0xAA && buf[4] === 0xBB && buf[5] === 0xCC;
});

// 编码边界
test('utf8 编码 - 不完整的多字节序列', () => {
  const buf = Buffer.alloc(5, '测', 'utf8');
  return buf.length === 5;
});

test('hex 编码 - 奇数长度字符串', () => {
  const buf = Buffer.alloc(10, '123', 'hex');
  return buf.length === 10;
});

test('base64 编码 - 无效填充', () => {
  const buf = Buffer.alloc(10, 'YWJj==', 'base64');
  return buf.length === 10;
});

// 连续分配测试
test('连续分配 100 个小 Buffer', () => {
  const bufs = [];
  for (let i = 0; i < 100; i++) {
    bufs.push(Buffer.alloc(10, i % 256));
  }
  return bufs.length === 100 && bufs.every(b => b.length === 10);
});

test('连续分配不同大小的 Buffer', () => {
  const sizes = [1, 10, 100, 1000, 10000];
  const bufs = sizes.map(size => Buffer.alloc(size));
  return bufs.every((buf, i) => buf.length === sizes[i]);
});

// 特殊编码字符
test('latin1 编码 - 扩展 ASCII 全范围', () => {
  const buf = Buffer.alloc(10, '\xFF', 'latin1');
  return buf[0] === 0xFF && buf[9] === 0xFF;
});

test('utf16le 编码 - BMP 字符', () => {
  const buf = Buffer.alloc(10, 'A', 'utf16le');
  return buf.length === 10;
});

// 数值 fill 的浮点边界
test('fill 为 0.5（应向下取整为 0）', () => {
  const buf = Buffer.alloc(5, 0.5);
  return buf[0] === 0 && buf[4] === 0;
});

test('fill 为 255.9（应向下取整为 255）', () => {
  const buf = Buffer.alloc(5, 255.9);
  return buf[0] === 255 && buf[4] === 255;
});

test('fill 为 -0.5（应处理）', () => {
  const buf = Buffer.alloc(5, -0.5);
  return buf.length === 5;
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
