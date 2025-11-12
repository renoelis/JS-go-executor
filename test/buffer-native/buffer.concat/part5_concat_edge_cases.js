// Buffer.concat() - Edge Cases and Boundary Tests
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

// 空Buffer的各种组合
test('连接仅包含空Buffer的数组', () => {
  const result = Buffer.concat([Buffer.alloc(0), Buffer.alloc(0), Buffer.alloc(0)]);
  return result.length === 0 && Buffer.isBuffer(result);
});

test('连接长度为1的Buffer', () => {
  const buf1 = Buffer.from([65]);
  const buf2 = Buffer.from([66]);
  const result = Buffer.concat([buf1, buf2]);
  return result.length === 2 && result[0] === 65 && result[1] === 66;
});

// 大Buffer测试
test('连接较大的Buffer（1MB）', () => {
  const size = 1024 * 1024;
  const buf1 = Buffer.alloc(size, 0xAA);
  const buf2 = Buffer.alloc(size, 0xBB);
  const result = Buffer.concat([buf1, buf2]);
  return result.length === size * 2 &&
         result[0] === 0xAA &&
         result[size - 1] === 0xAA &&
         result[size] === 0xBB &&
         result[size * 2 - 1] === 0xBB;
});

test('连接多个小Buffer（100个）', () => {
  const buffers = [];
  for (let i = 0; i < 100; i++) {
    buffers.push(Buffer.from([i % 256]));
  }
  const result = Buffer.concat(buffers);
  return result.length === 100 &&
         result[0] === 0 &&
         result[50] === 50 &&
         result[99] === 99;
});

// 字节值边界测试
test('连接包含0x00的Buffer', () => {
  const buf1 = Buffer.from([0, 0, 0]);
  const buf2 = Buffer.from([1, 2, 3]);
  const result = Buffer.concat([buf1, buf2]);
  return result.length === 6 &&
         result[0] === 0 && result[1] === 0 && result[2] === 0 &&
         result[3] === 1 && result[4] === 2 && result[5] === 3;
});

test('连接包含0xFF的Buffer', () => {
  const buf1 = Buffer.from([255, 255]);
  const buf2 = Buffer.from([0, 0]);
  const result = Buffer.concat([buf1, buf2]);
  return result.length === 4 &&
         result[0] === 255 && result[1] === 255 &&
         result[2] === 0 && result[3] === 0;
});

test('连接全0xFF的Buffer', () => {
  const buf1 = Buffer.alloc(10, 0xFF);
  const buf2 = Buffer.alloc(10, 0xFF);
  const result = Buffer.concat([buf1, buf2]);
  return result.length === 20 && result[0] === 255 && result[19] === 255;
});

// 编码相关边界
test('连接UTF-8多字节字符', () => {
  const buf1 = Buffer.from('你好', 'utf8');
  const buf2 = Buffer.from('世界', 'utf8');
  const result = Buffer.concat([buf1, buf2]);
  return result.toString('utf8') === '你好世界';
});

test('连接被截断的UTF-8字符（前半部分）', () => {
  const fullBuf = Buffer.from('你好', 'utf8');
  const buf1 = fullBuf.slice(0, 2); // '你' 的前2字节
  const buf2 = fullBuf.slice(2, 3); // '你' 的最后1字节
  const buf3 = fullBuf.slice(3); // '好'
  const result = Buffer.concat([buf1, buf2, buf3]);
  return result.toString('utf8') === '你好';
});

test('连接emoji字符', () => {
  const buf1 = Buffer.from('😀', 'utf8');
  const buf2 = Buffer.from('😁', 'utf8');
  const result = Buffer.concat([buf1, buf2]);
  return result.toString('utf8') === '😀😁';
});

test('连接包含null终止符的Buffer', () => {
  const buf1 = Buffer.from('test\0data');
  const buf2 = Buffer.from('more');
  const result = Buffer.concat([buf1, buf2]);
  return result.length === 13 && result[4] === 0;
});

// totalLength 边界情况
test('totalLength为最小正整数（1）截断多个Buffer', () => {
  const buf1 = Buffer.from('abcd');
  const buf2 = Buffer.from('efgh');
  const result = Buffer.concat([buf1, buf2], 1);
  return result.length === 1 && result[0] === 97; // 'a'
});

test('totalLength刚好在Buffer边界', () => {
  const buf1 = Buffer.from('hello');
  const buf2 = Buffer.from('world');
  const result = Buffer.concat([buf1, buf2], 5);
  return result.length === 5 && result.toString() === 'hello';
});

test('totalLength在两个Buffer之间（截断第二个）', () => {
  const buf1 = Buffer.from('hello');
  const buf2 = Buffer.from('world');
  const result = Buffer.concat([buf1, buf2], 8);
  return result.length === 8 && result.toString() === 'hellowor';
});

// 零拷贝验证
test('concat不是零拷贝（修改原Buffer不影响结果）', () => {
  const buf1 = Buffer.from([1, 2, 3]);
  const buf2 = Buffer.from([4, 5, 6]);
  const result = Buffer.concat([buf1, buf2]);
  const originalValue = result[0];
  buf1[0] = 99;
  return result[0] === originalValue && result[0] !== 99;
});

test('concat不是零拷贝（修改结果不影响原Buffer）', () => {
  const buf1 = Buffer.from([1, 2, 3]);
  const buf2 = Buffer.from([4, 5, 6]);
  const result = Buffer.concat([buf1, buf2]);
  result[0] = 99;
  return buf1[0] === 1 && buf1[0] !== 99;
});

// 特殊数组情况
test('数组中间有空Buffer', () => {
  const buf1 = Buffer.from('start');
  const buf2 = Buffer.alloc(0);
  const buf3 = Buffer.from('middle');
  const buf4 = Buffer.alloc(0);
  const buf5 = Buffer.from('end');
  const result = Buffer.concat([buf1, buf2, buf3, buf4, buf5]);
  return result.toString() === 'startmiddleend';
});

test('仅一个Buffer且指定totalLength小于其长度', () => {
  const buf = Buffer.from('hello');
  const result = Buffer.concat([buf], 3);
  return result.length === 3 && result.toString() === 'hel';
});

test('仅一个Buffer且指定totalLength大于其长度', () => {
  const buf = Buffer.from('hi');
  const result = Buffer.concat([buf], 5);
  return result.length === 5 &&
         result[0] === 104 && result[1] === 105 &&
         result[2] === 0 && result[3] === 0 && result[4] === 0;
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
