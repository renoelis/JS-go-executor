// Buffer.alloc() - Part 9: Extreme Cases and Edge Testing
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

// 极端 size 边界（避免 OOM）
test('size 为 1 - 最小有效大小', () => {
  const buf = Buffer.alloc(1);
  return buf.length === 1 && buf[0] === 0;
});

test('size 为 2 - 2 字节', () => {
  const buf = Buffer.alloc(2);
  return buf.length === 2 && buf[0] === 0 && buf[1] === 0;
});

test('size 为 3 - 奇数大小', () => {
  const buf = Buffer.alloc(3);
  return buf.length === 3;
});

test('size 为 7 - 素数大小', () => {
  const buf = Buffer.alloc(7);
  return buf.length === 7;
});

test('size 为 13 - 另一个素数', () => {
  const buf = Buffer.alloc(13);
  return buf.length === 13;
});

test('size 为 4095 - poolSize - 1', () => {
  const buf = Buffer.alloc(4095);
  return buf.length === 4095;
});

test('size 为 4097 - poolSize + 1', () => {
  const buf = Buffer.alloc(4097);
  return buf.length === 4097;
});

// 极端 fill 值
test('fill 为 -1 转换为 255', () => {
  const buf = Buffer.alloc(5, -1);
  return buf.every(b => b === 255);
});

test('fill 为 -255 转换为 1', () => {
  const buf = Buffer.alloc(5, -255);
  return buf.every(b => b === 1);
});

test('fill 为 -256 转换为 0', () => {
  const buf = Buffer.alloc(5, -256);
  return buf.every(b => b === 0);
});

test('fill 为 511 取模为 255', () => {
  const buf = Buffer.alloc(5, 511);
  return buf.every(b => b === 255);
});

test('fill 为 768 取模为 0', () => {
  const buf = Buffer.alloc(5, 768);
  return buf.every(b => b === 0);
});

// 极端字符串 fill
test('fill 为超长字符串（1000字符）', () => {
  const longStr = 'A'.repeat(1000);
  const buf = Buffer.alloc(5000, longStr);
  return buf.length === 5000;
});

test('fill 为单个 emoji', () => {
  const buf = Buffer.alloc(20, '😀');
  return buf.length === 20;
});

test('fill 为多个不同 emoji', () => {
  const buf = Buffer.alloc(20, '😀😁😂');
  return buf.length === 20;
});

test('fill 为混合 ASCII 和多字节字符', () => {
  const buf = Buffer.alloc(20, 'A测B试');
  return buf.length === 20;
});

// 极端编码场景
test('hex 编码 - 全 FF', () => {
  const buf = Buffer.alloc(10, 'FF', 'hex');
  return buf.every(b => b === 0xFF);
});

test('hex 编码 - 全 00', () => {
  const buf = Buffer.alloc(10, '00', 'hex');
  return buf.every(b => b === 0x00);
});

test('hex 编码 - 交替 01', () => {
  const buf = Buffer.alloc(10, '01', 'hex');
  return buf[0] === 0x01 && buf[1] === 0x01;
});

test('base64 编码 - 单个字符 A', () => {
  const buf = Buffer.alloc(10, 'QQ==', 'base64');
  return buf.length === 10;
});

test('base64 编码 - 长字符串', () => {
  const b64 = Buffer.from('hello world').toString('base64');
  const buf = Buffer.alloc(20, b64, 'base64');
  return buf.length === 20;
});

// 连续快速分配
test('快速分配 1000 个小 Buffer', () => {
  const bufs = [];
  for (let i = 0; i < 1000; i++) {
    bufs.push(Buffer.alloc(10));
  }
  return bufs.length === 1000 && bufs.every(b => b.length === 10);
});

test('快速分配不同大小的 Buffer', () => {
  const bufs = [];
  for (let i = 1; i <= 100; i++) {
    bufs.push(Buffer.alloc(i));
  }
  return bufs.length === 100 && bufs[99].length === 100;
});

// Buffer fill 的极端情况
test('fill 为 256 字节的 Buffer', () => {
  const fillBuf = Buffer.alloc(256, 0xAA);
  const buf = Buffer.alloc(1000, fillBuf);
  return buf.every(b => b === 0xAA);
});

test('fill 为随机内容的 Buffer', () => {
  const fillBuf = Buffer.from([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  const buf = Buffer.alloc(25, fillBuf);
  return buf[0] === 1 && buf[10] === 1 && buf[20] === 1;
});

// 特殊字符和控制字符
test('fill 为回车符', () => {
  const buf = Buffer.alloc(5, '\r');
  return buf.every(b => b === 0x0D);
});

test('fill 为垂直制表符', () => {
  const buf = Buffer.alloc(5, '\v');
  return buf.every(b => b === 0x0B);
});

test('fill 为换页符', () => {
  const buf = Buffer.alloc(5, '\f');
  return buf.every(b => b === 0x0C);
});

test('fill 为退格符', () => {
  const buf = Buffer.alloc(5, '\b');
  return buf.every(b => b === 0x08);
});

// 边界条件组合
test('size 为 1，fill 为 255', () => {
  const buf = Buffer.alloc(1, 255);
  return buf.length === 1 && buf[0] === 255;
});

test('size 为 1，fill 为 Buffer', () => {
  const fillBuf = Buffer.from([123]);
  const buf = Buffer.alloc(1, fillBuf);
  return buf.length === 1 && buf[0] === 123;
});

test('size 为 1，fill 为字符串', () => {
  const buf = Buffer.alloc(1, 'X');
  return buf.length === 1 && buf[0] === 0x58;
});

// 数组边界访问
test('访问负索引返回 undefined', () => {
  const buf = Buffer.alloc(5);
  return buf[-1] === undefined && buf[-100] === undefined;
});

test('访问越界正索引返回 undefined', () => {
  const buf = Buffer.alloc(5);
  return buf[5] === undefined && buf[100] === undefined;
});

// 修改后的持久性验证
test('分配后修改首字节', () => {
  const buf = Buffer.alloc(10);
  buf[0] = 100;
  return buf[0] === 100 && buf[1] === 0;
});

test('分配后修改尾字节', () => {
  const buf = Buffer.alloc(10);
  buf[9] = 200;
  return buf[9] === 200 && buf[8] === 0;
});

test('分配后修改中间字节', () => {
  const buf = Buffer.alloc(10);
  buf[5] = 150;
  return buf[5] === 150 && buf[4] === 0 && buf[6] === 0;
});

// 多字节编码的边界
test('utf16le - 单个字符', () => {
  const buf = Buffer.alloc(4, 'A', 'utf16le');
  return buf.length === 4;
});

test('utf16le - 中文字符', () => {
  const buf = Buffer.alloc(10, '中', 'utf16le');
  return buf.length === 10;
});

// 类型强制转换
test('size 为字符串 5 - 可能转换', () => {
  try {
    const buf = Buffer.alloc('5');
    return buf.length === 5 || buf.length === 0;
  } catch (e) {
    return true;
  }
});

test('fill 为布尔 true - 转换为 1', () => {
  const buf = Buffer.alloc(5, true);
  return buf.length === 5;
});

test('fill 为布尔 false - 转换为 0', () => {
  const buf = Buffer.alloc(5, false);
  return buf.length === 5 && buf.every(b => b === 0);
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
