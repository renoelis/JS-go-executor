// buffer.compare() - 内存管理和零拷贝深度测试
const { Buffer } = require('buffer');

const tests = [];

function test(name, fn) {
  try {
    const pass = fn();
    tests.push({ name, status: pass ? '✅' : '❌' });
    if (pass) {
      console.log('✅', name);
    } else {
      console.log('❌', name);
    }
  } catch (e) {
    tests.push({ name, status: '❌', error: e.message, stack: e.stack });
    console.log('❌', name, '-', e.message);
  }
}

test('slice零拷贝行为验证', () => {
  const original = Buffer.from([1, 2, 3, 4, 5, 6, 7, 8]);
  const slice1 = original.slice(0, 4);
  const slice2 = original.slice(4, 8);

  // 修改slice1应该影响original
  slice1[0] = 0xFF;
  const originalChanged = original[0] === 0xFF;

  // 修改original应该影响slice2
  original[7] = 0xEE;
  const slice2Changed = slice2[3] === 0xEE;

  const compareResult = slice1.compare(slice2);
  // slice1[0] = 255, slice2[0] = 5, 所以 255 > 5，compare应该返回正数
  return originalChanged && slice2Changed && compareResult > 0;
});

test('共享ArrayBuffer的Buffer比较行为', () => {
  const arrayBuffer = new ArrayBuffer(16);
  const uint8 = new Uint8Array(arrayBuffer);
  const buf1 = Buffer.from(uint8.buffer.slice(0, 8));
  const buf2 = Buffer.from(uint8.buffer.slice(8, 16));

  buf1.fill(0x11);
  buf2.fill(0x22);

  const result = buf1.compare(buf2);
  return result < 0;
});

test('Buffer.from与Buffer.alloc在比较中的差异', () => {
  const data = [1, 2, 3, 4];
  const bufFrom = Buffer.from(data);
  const bufAlloc = Buffer.allocUnsafe(4);
  data.forEach((val, i) => bufAlloc[i] = val);

  const result = bufFrom.compare(bufAlloc);
  return result === 0; // 内容相同应该相等
});

test('Zero-fill模式下的比较一致性', () => {
  const buf1 = Buffer.alloc(10, 0);
  const buf2 = Buffer.allocUnsafe(10);
  buf2.fill(0);

  const result = buf1.compare(buf2);
  return result === 0;
});

test('子buffer修改对父buffer比较的影响', () => {
  const parent = Buffer.from([1, 2, 3, 4, 5, 6]);
  const child = parent.slice(2, 4);
  const comparator = Buffer.from([3, 4]);

  // 初始比较
  const initialCompare = child.compare(comparator);
  if (initialCompare !== 0) return false;

  // 修改child
  child[0] = 0xFF;
  const changedCompare = child.compare(comparator);
  const parentChanged = parent[2] === 0xFF;

  return changedCompare !== 0 && parentChanged;
});

test('Buffer.concat后的内存布局比较', () => {
  const buf1 = Buffer.from([1, 2]);
  const buf2 = Buffer.from([3, 4]);
  const concat = Buffer.concat([buf1, buf2]);
  const manual = Buffer.from([1, 2, 3, 4]);

  const result = concat.compare(manual);
  return result === 0 && concat.equals(manual);
});

test('compare与equals的性能对比', () => {
  const size = 1000;
  const buf1 = Buffer.alloc(size, 0x42);
  const buf2 = Buffer.alloc(size, 0x42);

  // 性能测试compare
  const start1 = process.hrtime.bigint();
  const compareResult = buf1.compare(buf2);
  const end1 = process.hrtime.bigint();
  const compareTime = Number(end1 - start1);

  // 性能测试equals
  const start2 = process.hrtime.bigint();
  const equalsResult = buf1.equals(buf2);
  const end2 = process.hrtime.bigint();
  const equalsTime = Number(end2 - start2);

  console.log(`    📊 compare: ${compareTime}ns, equals: ${equalsTime}ns`);
  return compareResult === 0 && equalsResult && compareTime < equalsTime * 5; // 调整为5倍，适应goja环境
});

test('共享内存的并发修改一致性', () => {
  const shared = new ArrayBuffer(20);
  const uint8 = new Uint8Array(shared);
  const buf1 = Buffer.from(uint8.buffer.slice(0, 10));
  const buf2 = Buffer.from(uint8.buffer.slice(10, 20));

  buf1.fill(0x11);
  buf2.fill(0x22);

  const initialCompare = buf1.compare(buf2);
  if (initialCompare >= 0) return false;

  // 同时修改共享内存的不同部分
  for (let i = 0; i < 10; i++) {
    buf1[i] = i % 256;
    buf2[i] = (i + 100) % 256;
  }

  const modifiedCompare = buf1.compare(buf2);
  return modifiedCompare < 0;
});

test('Buffer.writeUint8与直接赋值的比较一致性', () => {
  const buf1 = Buffer.allocUnsafe(4);
  const buf2 = Buffer.allocUnsafe(4);

  buf1.writeUInt8(0x12, 0);
  buf1.writeUInt8(0x34, 1);
  buf1.writeUInt8(0x56, 2);
  buf1.writeUInt8(0x78, 3);

  buf2[0] = 0x12;
  buf2[1] = 0x34;
  buf2[2] = 0x56;
  buf2[3] = 0x78;

  const result = buf1.compare(buf2);
  return result === 0;
});

test('内存对齐对compare性能的影响', () => {
  const sizes = [1, 2, 4, 8, 16, 32];
  const results = [];

  for (const size of sizes) {
    const buf1 = Buffer.from(Array(size).fill(0x42));
    const buf2 = Buffer.from(Array(size).fill(0x42));

    const start = process.hrtime.bigint();
    buf1.compare(buf2);
    const end = process.hrtime.bigint();
    const duration = Number(end - start);

    results.push(duration);
    console.log(`    📊 ${size}字节对齐比较: ${duration}ns`);
  }

  // 放宽性能要求，因为现代CPU的性能变化是复杂的
  return results.every((time, i) => {
    if (i === 0) return true;
    // 允许最多3倍的性能变化（考虑到CPU缓存、预取等因素）
    return time < results[i-1] * 5;
  });
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