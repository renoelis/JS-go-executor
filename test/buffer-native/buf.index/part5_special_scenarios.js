// buf[index] - Part 5: Special Scenarios & Memory Tests
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

// 内存共享测试
test('slice 后原 Buffer 索引修改影响 slice', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const slice = buf.slice(1, 4);
  buf[2] = 99;
  return slice[1] === 99;
});

test('slice 后 slice 索引修改影响原 Buffer', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const slice = buf.slice(1, 4);
  slice[1] = 88;
  return buf[2] === 88;
});

test('subarray 后原 Buffer 索引修改影响 subarray', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sub = buf.subarray(1, 4);
  buf[2] = 77;
  return sub[1] === 77;
});

test('subarray 后 subarray 索引修改影响原 Buffer', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sub = buf.subarray(1, 4);
  sub[1] = 66;
  return buf[2] === 66;
});

// Buffer.from 不同来源测试
test('Buffer.from(Buffer) 索引独立', () => {
  const buf1 = Buffer.from([1, 2, 3]);
  const buf2 = Buffer.from(buf1);
  buf1[1] = 99;
  return buf2[1] === 2;
});

test('Buffer.from(ArrayBuffer) 索引共享', () => {
  const ab = new ArrayBuffer(3);
  const view = new Uint8Array(ab);
  view[0] = 1;
  view[1] = 2;
  view[2] = 3;
  const buf = Buffer.from(ab);
  buf[1] = 99;
  return view[1] === 99;
});

test('Buffer.from(Uint8Array) 索引独立', () => {
  const arr = new Uint8Array([1, 2, 3]);
  const buf = Buffer.from(arr);
  arr[1] = 99;
  return buf[1] === 2;
});

// 多次修改测试
test('同一索引多次修改', () => {
  const buf = Buffer.alloc(1);
  buf[0] = 10;
  buf[0] = 20;
  buf[0] = 30;
  buf[0] = 40;
  buf[0] = 50;
  return buf[0] === 50;
});

test('交替修改不同索引', () => {
  const buf = Buffer.alloc(3);
  buf[0] = 1;
  buf[1] = 2;
  buf[0] = 10;
  buf[2] = 3;
  buf[1] = 20;
  return buf[0] === 10 && buf[1] === 20 && buf[2] === 3;
});

// 循环引用测试
test('读取后立即写入', () => {
  const buf = Buffer.from([10, 20, 30]);
  buf[1] = buf[0] + buf[2];
  return buf[1] === 40;
});

test('自增操作', () => {
  const buf = Buffer.from([10]);
  buf[0] = buf[0] + 1;
  return buf[0] === 11;
});

test('交换两个索引的值', () => {
  const buf = Buffer.from([10, 20]);
  const temp = buf[0];
  buf[0] = buf[1];
  buf[1] = temp;
  return buf[0] === 20 && buf[1] === 10;
});

// 不同编码创建的 Buffer 索引访问
test('utf8 编码 Buffer 索引访问', () => {
  const buf = Buffer.from('ABC', 'utf8');
  return buf[0] === 0x41 && buf[1] === 0x42 && buf[2] === 0x43;
});

test('hex 编码 Buffer 索引访问', () => {
  const buf = Buffer.from('414243', 'hex');
  return buf[0] === 0x41 && buf[1] === 0x42 && buf[2] === 0x43;
});

test('base64 编码 Buffer 索引访问', () => {
  const buf = Buffer.from('QUJD', 'base64');
  return buf[0] === 0x41 && buf[1] === 0x42 && buf[2] === 0x43;
});

test('latin1 编码 Buffer 索引访问', () => {
  const buf = Buffer.from('ABC', 'latin1');
  return buf[0] === 0x41 && buf[1] === 0x42 && buf[2] === 0x43;
});

// 特殊长度 Buffer
test('长度为 1 的 Buffer 边界', () => {
  const buf = Buffer.alloc(1);
  buf[0] = 255;
  return buf[0] === 255 && buf[1] === undefined;
});

test('长度为 2 的 Buffer 边界', () => {
  const buf = Buffer.alloc(2);
  buf[0] = 100;
  buf[1] = 200;
  return buf[0] === 100 && buf[1] === 200 && buf[2] === undefined;
});

// 填充后的索引访问
test('fill 后索引访问', () => {
  const buf = Buffer.alloc(5);
  buf.fill(99);
  return buf[0] === 99 && buf[2] === 99 && buf[4] === 99;
});

test('fill 部分后索引访问', () => {
  const buf = Buffer.alloc(5);
  buf.fill(99, 1, 4);
  return buf[0] === 0 && buf[1] === 99 && buf[3] === 99 && buf[4] === 0;
});

// 写入后读取验证
test('写入所有可能字节值', () => {
  const buf = Buffer.alloc(256);
  for (let i = 0; i < 256; i++) {
    buf[i] = i;
  }
  let allMatch = true;
  for (let i = 0; i < 256; i++) {
    if (buf[i] !== i) {
      allMatch = false;
      break;
    }
  }
  return allMatch;
});

test('写入所有可能字节值（倒序）', () => {
  const buf = Buffer.alloc(256);
  for (let i = 0; i < 256; i++) {
    buf[i] = 255 - i;
  }
  let allMatch = true;
  for (let i = 0; i < 256; i++) {
    if (buf[i] !== 255 - i) {
      allMatch = false;
      break;
    }
  }
  return allMatch;
});

// 复制操作后的索引访问
test('copy 后源 Buffer 索引修改不影响目标', () => {
  const src = Buffer.from([1, 2, 3]);
  const dst = Buffer.alloc(3);
  src.copy(dst);
  src[1] = 99;
  return dst[1] === 2;
});

test('copy 后目标 Buffer 索引修改不影响源', () => {
  const src = Buffer.from([1, 2, 3]);
  const dst = Buffer.alloc(3);
  src.copy(dst);
  dst[1] = 99;
  return src[1] === 2;
});

// 连续分配测试
test('连续分配多个 Buffer 索引独立', () => {
  const buf1 = Buffer.alloc(3);
  const buf2 = Buffer.alloc(3);
  const buf3 = Buffer.alloc(3);
  buf1[0] = 1;
  buf2[0] = 2;
  buf3[0] = 3;
  return buf1[0] === 1 && buf2[0] === 2 && buf3[0] === 3;
});

// 索引访问性能相关
test('快速连续读取', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  let sum = 0;
  for (let i = 0; i < 1000; i++) {
    sum += buf[i % 5];
  }
  return sum === 3000;
});

test('快速连续写入', () => {
  const buf = Buffer.alloc(5);
  for (let i = 0; i < 1000; i++) {
    buf[i % 5] = i % 256;
  }
  return buf[0] === 227 && buf[1] === 228 && buf[2] === 229 && 
         buf[3] === 230 && buf[4] === 231;
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
