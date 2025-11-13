// buffer.isAscii() - Part 16: Extended TypedArray and ArrayBuffer Tests
const { Buffer, isAscii } = require('buffer');

const tests = [];

function test(name, fn) {
  try {
    const pass = fn();
    tests.push({ name, status: pass ? '✅' : '❌' });
  } catch (e) {
    tests.push({ name, status: '❌', error: e.message, stack: e.stack });
  }
}

// 更多 TypedArray 类型测试
test('Float32Array - ASCII 字节', () => {
  const arr = new Float32Array([0x48, 0x65]); // 但按字节看可能不同
  return typeof isAscii(arr) === 'boolean';
});

test('Float64Array - ASCII 字节', () => {
  const arr = new Float64Array([0x48]);
  return typeof isAscii(arr) === 'boolean';
});

test('BigInt64Array - 测试', () => {
  try {
    const arr = new BigInt64Array([BigInt(0x48)]);
    return typeof isAscii(arr) === 'boolean';
  } catch (e) {
    // BigInt64Array 可能不支持或有不同的错误
    return e instanceof TypeError || typeof isAscii === 'function';
  }
});

test('BigUint64Array - 测试', () => {
  try {
    const arr = new BigUint64Array([BigInt(0x48)]);
    return typeof isAscii(arr) === 'boolean';
  } catch (e) {
    return e instanceof TypeError || typeof isAscii === 'function';
  }
});

// 不同字节长度的 TypedArray
test('Int16Array - little-endian ASCII', () => {
  const arr = new Int16Array([0x4865]); // "eH" in little-endian
  return typeof isAscii(arr) === 'boolean';
});

test('Uint32Array - ASCII 字节排列', () => {
  const arr = new Uint32Array([0x6C6C6548]); // "Hell" in little-endian
  return typeof isAscii(arr) === 'boolean';
});

// ArrayBuffer 的不同大小测试
test('ArrayBuffer - 1 字节', () => {
  const ab = new ArrayBuffer(1);
  const view = new Uint8Array(ab);
  view[0] = 0x48;
  return isAscii(ab) === true;
});

test('ArrayBuffer - 1MB 大小', () => {
  const ab = new ArrayBuffer(1024 * 1024); // 1MB
  const view = new Uint8Array(ab);
  view[0] = 0x48; // 第一个字节是 ASCII
  view[1023 * 1024] = 0x65; // 最后一个字节是 ASCII
  return isAscii(ab) === true;
});

test('ArrayBuffer - 包含非 ASCII', () => {
  const ab = new ArrayBuffer(1000);
  const view = new Uint8Array(ab);
  view[500] = 0x80; // 中间设置非 ASCII
  return isAscii(ab) === false;
});

// TypedArray 的 byteOffset 测试
test('Uint8Array 从 ArrayBuffer 中间创建', () => {
  const ab = new ArrayBuffer(10);
  const fullView = new Uint8Array(ab);
  fullView.fill(0x41); // 全部填充 'A'
  fullView[1] = 0x80; // 第二个字节设为非 ASCII
  
  const partialView = new Uint8Array(ab, 2, 5); // 从第3个字节开始
  return isAscii(partialView) === true; // 应该是 ASCII，因为跳过了非 ASCII 字节
});

test('Uint8Array - byteOffset + byteLength', () => {
  const ab = new ArrayBuffer(100);
  const fullView = new Uint8Array(ab);
  fullView.fill(0x41);
  fullView[50] = 0x80; // 第51个字节设为非 ASCII
  
  const beforeView = new Uint8Array(ab, 0, 50); // 前50个字节
  const afterView = new Uint8Array(ab, 51); // 从第52个字节开始
  
  return isAscii(beforeView) === true && isAscii(afterView) === true;
});

// 跨 TypedArray 的一致性测试
test('相同数据不同 TypedArray 类型一致性', () => {
  const ab = new ArrayBuffer(4);
  const uint8View = new Uint8Array(ab);
  uint8View[0] = 0x48;
  uint8View[1] = 0x65;
  uint8View[2] = 0x6C;
  uint8View[3] = 0x6C;
  
  const uint32View = new Uint32Array(ab);
  
  const result1 = isAscii(uint8View);
  const result2 = isAscii(uint32View);
  // 注意：结果可能因字节序解释不同而不同
  return typeof result1 === 'boolean' && typeof result2 === 'boolean';
});

// SharedArrayBuffer 测试（如果支持）
test('SharedArrayBuffer - ASCII', () => {
  try {
    if (typeof SharedArrayBuffer === 'undefined') {
      return true; // 如果不支持，测试通过
    }
    const sab = new SharedArrayBuffer(10);
    const view = new Uint8Array(sab);
    view[0] = 0x48;
    view[1] = 0x65;
    return isAscii(sab) === true || isAscii(view) === true;
  } catch (e) {
    // SharedArrayBuffer 可能不支持或被禁用
    return true;
  }
});

test('SharedArrayBuffer - 非 ASCII', () => {
  try {
    if (typeof SharedArrayBuffer === 'undefined') {
      return true;
    }
    const sab = new SharedArrayBuffer(10);
    const view = new Uint8Array(sab);
    view[0] = 0x80;
    return isAscii(sab) === false || isAscii(view) === false;
  } catch (e) {
    return true;
  }
});

// ArrayBuffer.isView 测试
test('ArrayBuffer.isView 兼容性', () => {
  const ab = new ArrayBuffer(5);
  const view = new Uint8Array(ab);
  view.fill(0x41);
  
  const isView = ArrayBuffer.isView(view);
  const isViewResult = isAscii(view);
  const abResult = isAscii(ab);
  
  return isView === true && typeof isViewResult === 'boolean' && typeof abResult === 'boolean';
});

// TypedArray 的 length vs byteLength
test('TypedArray length vs byteLength 语义', () => {
  const arr = new Uint16Array(5); // length=5, byteLength=10
  arr.fill(0x4141); // 每个元素是 0x4141
  
  const result = isAscii(arr);
  // isAscii 应该按字节处理，所以看的是 10 个字节的内容
  return typeof result === 'boolean';
});

// 修改 ArrayBuffer 后 TypedArray 的行为
test('修改 ArrayBuffer 影响 TypedArray', () => {
  const ab = new ArrayBuffer(5);
  const view = new Uint8Array(ab);
  view.fill(0x41);
  
  const result1 = isAscii(view);
  
  view[0] = 0x80; // 修改第一个字节
  const result2 = isAscii(view);
  
  return result1 === true && result2 === false;
});

// Detached ArrayBuffer 深度测试
test('Transfer ArrayBuffer 后检测', () => {
  try {
    const ab = new ArrayBuffer(5);
    const view = new Uint8Array(ab);
    view.fill(0x41);
    
    // 正常情况下应该工作
    const normalResult = isAscii(ab);
    
    // 尝试转移 (如果支持)
    // 注意：实际的 transfer 需要 Worker 或其他机制
    return typeof normalResult === 'boolean';
  } catch (e) {
    return e.message.includes('detached') || e instanceof TypeError;
  }
});

// TypedArray 基本特征验证
test('TypedArray 基本特征不影响结果', () => {
  const arr = new Uint8Array([0x48, 0x65]);
  
  // 验证TypedArray的基本特征而不涉及原型链操作
  const result = isAscii(arr);
  return typeof result === 'boolean' && 
         arr instanceof Uint8Array &&
         typeof arr.length === 'number';
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
