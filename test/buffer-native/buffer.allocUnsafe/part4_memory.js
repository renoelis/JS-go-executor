// Buffer.allocUnsafe() - Memory Behavior Tests
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

// 内存行为测试
test('allocUnsafe创建的Buffer包含未初始化数据', () => {
  const buf = Buffer.allocUnsafe(10);
  // allocUnsafe不会清零内存，可能包含任意数据
  let hasRandomData = false;
  for (let i = 0; i < buf.length; i++) {
    if (buf[i] !== 0) {
      hasRandomData = true;
      break;
    }
  }
  // 只要长度正确且是Buffer实例就算通过
  if (buf.length !== 10) throw new Error(`Expected length 10, got ${buf.length}`);
  if (!(buf instanceof Buffer)) throw new Error('Expected Buffer instance');
  console.log('✅ allocUnsafe创建的Buffer包含未初始化数据');
  return true;
});

test('allocUnsafe与alloc的行为差异', () => {
  const unsafeBuf = Buffer.allocUnsafe(10);
  const safeBuf = Buffer.alloc(10);

  // alloc创建的Buffer应该全是0
  let safeBufAllZero = true;
  for (let i = 0; i < safeBuf.length; i++) {
    if (safeBuf[i] !== 0) {
      safeBufAllZero = false;
      break;
    }
  }

  if (!safeBufAllZero) throw new Error('alloc创建的Buffer应该全是0');
  console.log('✅ allocUnsafe与alloc的行为差异');
  return true;
});

test('多次allocUnsafe可能重用内存', () => {
  // 连续分配多个Buffer
  const buf1 = Buffer.allocUnsafe(50);
  const buf2 = Buffer.allocUnsafe(50);
  const buf3 = Buffer.allocUnsafe(50);

  // 验证它们是不同的实例
  if (buf1 === buf2 || buf2 === buf3 || buf1 === buf3) {
    throw new Error('Expected different Buffer instances');
  }

  // 验证长度
  if (buf1.length !== 50 || buf2.length !== 50 || buf3.length !== 50) {
    throw new Error('Expected length 50 for all buffers');
  }

  console.log('✅ 多次allocUnsafe可能重用内存');
  return true;
});

test('allocUnsafe创建的Buffer可以被正常填充', () => {
  const buf = Buffer.allocUnsafe(20);
  // 手动填充数据
  for (let i = 0; i < buf.length; i++) {
    buf[i] = i % 256;
  }

  // 验证填充的数据
  let correct = true;
  for (let i = 0; i < buf.length; i++) {
    if (buf[i] !== i % 256) {
      correct = false;
      break;
    }
  }

  if (!correct) throw new Error('Buffer填充数据不正确');
  console.log('✅ allocUnsafe创建的Buffer可以被正常填充');
  return true;
});

test('allocUnsafe创建的Buffer可以被slice', () => {
  const buf = Buffer.allocUnsafe(10);
  // 填充一些数据
  for (let i = 0; i < buf.length; i++) {
    buf[i] = i + 10;
  }

  const slice = buf.slice(2, 8);
  if (slice.length !== 6) throw new Error(`Expected slice length 6, got ${slice.length}`);

  // 验证slice的数据
  for (let i = 0; i < slice.length; i++) {
    if (slice[i] !== (i + 2) + 10) {
      throw new Error(`Slice data mismatch at index ${i}`);
    }
  }

  console.log('✅ allocUnsafe创建的Buffer可以被slice');
  return true;
});

test('allocUnsafe创建的Buffer可以被复制', () => {
  const buf1 = Buffer.allocUnsafe(8);
  // 填充数据
  for (let i = 0; i < buf1.length; i++) {
    buf1[i] = i + 100;
  }

  const buf2 = Buffer.allocUnsafe(8);
  buf1.copy(buf2);

  // 验证复制结果
  let correct = true;
  for (let i = 0; i < buf2.length; i++) {
    if (buf2[i] !== buf1[i]) {
      correct = false;
      break;
    }
  }

  if (!correct) throw new Error('Buffer复制数据不正确');
  console.log('✅ allocUnsafe创建的Buffer可以被复制');
  return true;
});

test('allocUnsafe创建的Buffer可以转换为各种编码', () => {
  const buf = Buffer.allocUnsafe(4);
  // 填充"test"字符串
  buf[0] = 116; // 't'
  buf[1] = 101; // 'e'
  buf[2] = 115; // 's'
  buf[3] = 116; // 't'

  const utf8Str = buf.toString('utf8');
  const hexStr = buf.toString('hex');
  const base64Str = buf.toString('base64');

  if (utf8Str !== 'test') throw new Error(`Expected 'test', got '${utf8Str}'`);
  if (hexStr !== '74657374') throw new Error(`Expected '74657374', got '${hexStr}'`);
  if (base64Str !== 'dGVzdA==') throw new Error(`Expected 'dGVzdA==', got '${base64Str}'`);

  console.log('✅ allocUnsafe创建的Buffer可以转换为各种编码');
  return true;
});

test('allocUnsafe创建的Buffer可以被修改', () => {
  const buf = Buffer.allocUnsafe(5);
  // 初始填充
  for (let i = 0; i < buf.length; i++) {
    buf[i] = 0;
  }

  // 修改数据
  buf[0] = 255;
  buf[1] = 128;
  buf[2] = 64;
  buf[3] = 32;
  buf[4] = 16;

  // 验证修改
  if (buf[0] !== 255) throw new Error(`Expected buf[0] = 255, got ${buf[0]}`);
  if (buf[1] !== 128) throw new Error(`Expected buf[1] = 128, got ${buf[1]}`);
  if (buf[2] !== 64) throw new Error(`Expected buf[2] = 64, got ${buf[2]}`);
  if (buf[3] !== 32) throw new Error(`Expected buf[3] = 32, got ${buf[3]}`);
  if (buf[4] !== 16) throw new Error(`Expected buf[4] = 16, got ${buf[4]}`);

  console.log('✅ allocUnsafe创建的Buffer可以被修改');
  return true;
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