// 极端边界测试
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

// 大 Buffer 测试
test('BE: 大 Buffer (10000 字节)', () => {
  const buf = Buffer.alloc(10000);
  buf.writeUInt16BE(0x1234, 0);
  buf.writeUInt16BE(0x5678, 9998);
  return buf.readUInt16BE(0) === 0x1234 && buf.readUInt16BE(9998) === 0x5678;
});

test('LE: 大 Buffer (10000 字节)', () => {
  const buf = Buffer.alloc(10000);
  buf.writeUInt16LE(0x1234, 0);
  buf.writeUInt16LE(0x5678, 9998);
  return buf.readUInt16LE(0) === 0x1234 && buf.readUInt16LE(9998) === 0x5678;
});

// 极值 offset
test('BE: 极大 offset', () => {
  const buf = Buffer.alloc(100000);
  buf.writeUInt16BE(0xABCD, 99998);
  return buf.readUInt16BE(99998) === 0xABCD;
});

test('LE: 极大 offset', () => {
  const buf = Buffer.alloc(100000);
  buf.writeUInt16LE(0xABCD, 99998);
  return buf.readUInt16LE(99998) === 0xABCD;
});

// 特殊位模式
test('BE: 所有位为 1', () => {
  const buf = Buffer.from([0xFF, 0xFF]);
  return buf.readUInt16BE(0) === 0xFFFF;
});

test('LE: 所有位为 1', () => {
  const buf = Buffer.from([0xFF, 0xFF]);
  return buf.readUInt16LE(0) === 0xFFFF;
});

test('BE: 交替位 0xAAAA', () => {
  const buf = Buffer.from([0xAA, 0xAA]);
  return buf.readUInt16BE(0) === 0xAAAA;
});

test('LE: 交替位 0xAAAA', () => {
  const buf = Buffer.from([0xAA, 0xAA]);
  return buf.readUInt16LE(0) === 0xAAAA;
});

test('BE: 交替位 0x5555', () => {
  const buf = Buffer.from([0x55, 0x55]);
  return buf.readUInt16BE(0) === 0x5555;
});

test('LE: 交替位 0x5555', () => {
  const buf = Buffer.from([0x55, 0x55]);
  return buf.readUInt16LE(0) === 0x5555;
});

// 连续读取所有可能的 offset
test('BE: 连续读取所有 offset', () => {
  const buf = Buffer.from([0x12, 0x34, 0x56, 0x78, 0x9A]);
  const values = [];
  for (let i = 0; i < buf.length - 1; i++) {
    values.push(buf.readUInt16BE(i));
  }
  return values.length === 4 && 
         values[0] === 0x1234 && 
         values[1] === 0x3456 && 
         values[2] === 0x5678 && 
         values[3] === 0x789A;
});

test('LE: 连续读取所有 offset', () => {
  const buf = Buffer.from([0x12, 0x34, 0x56, 0x78, 0x9A]);
  const values = [];
  for (let i = 0; i < buf.length - 1; i++) {
    values.push(buf.readUInt16LE(i));
  }
  return values.length === 4 && 
         values[0] === 0x3412 && 
         values[1] === 0x5634 && 
         values[2] === 0x7856 && 
         values[3] === 0x9A78;
});

// 修改 Buffer 后读取
test('BE: 修改后读取变化', () => {
  const buf = Buffer.from([0x12, 0x34]);
  const before = buf.readUInt16BE(0);
  buf[0] = 0xAB;
  const after = buf.readUInt16BE(0);
  return before === 0x1234 && after === 0xAB34;
});

test('LE: 修改后读取变化', () => {
  const buf = Buffer.from([0x12, 0x34]);
  const before = buf.readUInt16LE(0);
  buf[0] = 0xAB;
  const after = buf.readUInt16LE(0);
  return before === 0x3412 && after === 0x34AB;
});

// subarray 独立性
test('BE: subarray 修改不影响原 Buffer', () => {
  const buf = Buffer.from([0x12, 0x34, 0x56, 0x78]);
  const sub = buf.subarray(0, 2);
  const original = buf.readUInt16BE(0);
  sub[0] = 0xFF;
  const modified = buf.readUInt16BE(0);
  return original === 0x1234 && modified === 0xFF34;
});

test('LE: subarray 修改不影响原 Buffer', () => {
  const buf = Buffer.from([0x12, 0x34, 0x56, 0x78]);
  const sub = buf.subarray(0, 2);
  const original = buf.readUInt16LE(0);
  sub[0] = 0xFF;
  const modified = buf.readUInt16LE(0);
  return original === 0x3412 && modified === 0x34FF;
});

// 共享 ArrayBuffer
test('BE: 共享 ArrayBuffer 场景', () => {
  const ab = new ArrayBuffer(4);
  const buf1 = Buffer.from(ab);
  const buf2 = Buffer.from(ab);
  buf1.writeUInt16BE(0x1234, 0);
  return buf2.readUInt16BE(0) === 0x1234;
});

test('LE: 共享 ArrayBuffer 场景', () => {
  const ab = new ArrayBuffer(4);
  const buf1 = Buffer.from(ab);
  const buf2 = Buffer.from(ab);
  buf1.writeUInt16LE(0x1234, 0);
  return buf2.readUInt16LE(0) === 0x1234;
});

// 混合读取方法
test('BE: 混合使用 readUInt8 和 readUInt16BE', () => {
  const buf = Buffer.from([0x12, 0x34, 0x56]);
  const b1 = buf.readUInt8(0);
  const w1 = buf.readUInt16BE(0);
  const b2 = buf.readUInt8(1);
  return b1 === 0x12 && w1 === 0x1234 && b2 === 0x34;
});

test('LE: 混合使用 readUInt8 和 readUInt16LE', () => {
  const buf = Buffer.from([0x12, 0x34, 0x56]);
  const b1 = buf.readUInt8(0);
  const w1 = buf.readUInt16LE(0);
  const b2 = buf.readUInt8(1);
  return b1 === 0x12 && w1 === 0x3412 && b2 === 0x34;
});

// 2 的幂次值
test('BE: 2的幂次值序列', () => {
  const buf = Buffer.alloc(16);
  const powers = [1, 2, 4, 8, 16, 32, 64, 128, 256, 512, 1024, 2048, 4096, 8192, 16384, 32768];
  let allMatch = true;
  for (let i = 0; i < 8; i++) {
    buf.writeUInt16BE(powers[i * 2], i * 2);
    if (buf.readUInt16BE(i * 2) !== powers[i * 2]) {
      allMatch = false;
    }
  }
  return allMatch;
});

test('LE: 2的幂次值序列', () => {
  const buf = Buffer.alloc(16);
  const powers = [1, 2, 4, 8, 16, 32, 64, 128, 256, 512, 1024, 2048, 4096, 8192, 16384, 32768];
  let allMatch = true;
  for (let i = 0; i < 8; i++) {
    buf.writeUInt16LE(powers[i * 2], i * 2);
    if (buf.readUInt16LE(i * 2) !== powers[i * 2]) {
      allMatch = false;
    }
  }
  return allMatch;
});

// 格雷码序列
test('BE: 格雷码序列', () => {
  const gray = [0, 1, 3, 2, 6, 7, 5, 4];
  const buf = Buffer.alloc(16);
  for (let i = 0; i < gray.length; i++) {
    buf.writeUInt16BE(gray[i], i * 2);
  }
  let allMatch = true;
  for (let i = 0; i < gray.length; i++) {
    if (buf.readUInt16BE(i * 2) !== gray[i]) {
      allMatch = false;
    }
  }
  return allMatch;
});

test('LE: 格雷码序列', () => {
  const gray = [0, 1, 3, 2, 6, 7, 5, 4];
  const buf = Buffer.alloc(16);
  for (let i = 0; i < gray.length; i++) {
    buf.writeUInt16LE(gray[i], i * 2);
  }
  let allMatch = true;
  for (let i = 0; i < gray.length; i++) {
    if (buf.readUInt16LE(i * 2) !== gray[i]) {
      allMatch = false;
    }
  }
  return allMatch;
});

// 斐波那契数列
test('BE: 斐波那契数列', () => {
  const fib = [0, 1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610];
  const buf = Buffer.alloc(32);
  for (let i = 0; i < fib.length; i++) {
    buf.writeUInt16BE(fib[i], i * 2);
  }
  let allMatch = true;
  for (let i = 0; i < fib.length; i++) {
    if (buf.readUInt16BE(i * 2) !== fib[i]) {
      allMatch = false;
    }
  }
  return allMatch;
});

test('LE: 斐波那契数列', () => {
  const fib = [0, 1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610];
  const buf = Buffer.alloc(32);
  for (let i = 0; i < fib.length; i++) {
    buf.writeUInt16LE(fib[i], i * 2);
  }
  let allMatch = true;
  for (let i = 0; i < fib.length; i++) {
    if (buf.readUInt16LE(i * 2) !== fib[i]) {
      allMatch = false;
    }
  }
  return allMatch;
});

const passed = tests.filter(t => t.status === '✅').length;
const failed = tests.filter(t => t.status === '❌').length;
const result = {
  success: failed === 0,
  summary: { total: tests.length, passed, failed, successRate: ((passed / tests.length) * 100).toFixed(2) + '%' },
  tests
};
console.log(JSON.stringify(result, null, 2));
return result;
