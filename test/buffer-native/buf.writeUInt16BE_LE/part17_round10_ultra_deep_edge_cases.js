const { Buffer } = require('buffer');

// 🔥 超深度边界测试：buf.writeUInt16BE/LE 终极查缺补漏
// 基于 Node.js v25.0.0 官方文档和实际行为深度验证

function test(name, fn) {
  try {
    const result = fn();
    if (result) {
      return { name, status: '✅' };
    } else {
      return { name, status: '❌' };
    }
  } catch (error) {
    return { name, status: '❌', error: error.message };
  }
}

const tests = [
  // 🎯 官方文档遗漏点：别名方法测试
  test('writeUint16BE: 小写别名方法存在性', () => {
    const buf = Buffer.allocUnsafe(4);
    return typeof buf.writeUint16BE === 'function';
  }),

  test('writeUint16LE: 小写别名方法存在性', () => {
    const buf = Buffer.allocUnsafe(4);
    return typeof buf.writeUint16LE === 'function';
  }),

  test('writeUint16BE: 小写别名功能一致性', () => {
    const buf1 = Buffer.allocUnsafe(4);
    const buf2 = Buffer.allocUnsafe(4);
    buf1.writeUInt16BE(0xABCD, 0);
    buf2.writeUint16BE(0xABCD, 0);
    return buf1.equals(buf2);
  }),

  test('writeUint16LE: 小写别名功能一致性', () => {
    const buf1 = Buffer.allocUnsafe(4);
    const buf2 = Buffer.allocUnsafe(4);
    buf1.writeUInt16LE(0xABCD, 0);
    buf2.writeUint16LE(0xABCD, 0);
    return buf1.equals(buf2);
  }),

  // 🎯 极端 offset 边界：浮点数严格检查
  test('writeUInt16BE: offset 为浮点数 1.9 抛错', () => {
    const buf = Buffer.allocUnsafe(4);
    try {
      buf.writeUInt16BE(0x1234, 1.9);
      return false;
    } catch (e) {
      return e && e.name === 'RangeError';
    }
  }),

  test('writeUInt16LE: offset 为浮点数 1.1 抛错', () => {
    const buf = Buffer.allocUnsafe(4);
    try {
      buf.writeUInt16LE(0x1234, 1.1);
      return false;
    } catch (e) {
      return e && e.name === 'RangeError';
    }
  }),

  test('writeUInt16BE: offset 为 -0（等同于 0）', () => {
    const buf = Buffer.allocUnsafe(4);
    buf.writeUInt16BE(0x5678, -0);
    return buf[0] === 0x56 && buf[1] === 0x78;
  }),

  test('writeUInt16LE: offset 为 +0（等同于 0）', () => {
    const buf = Buffer.allocUnsafe(4);
    buf.writeUInt16LE(0x5678, +0);
    return buf[0] === 0x78 && buf[1] === 0x56;
  }),

  // 🎯 value 参数极端边界：科学计数法
  test('writeUInt16BE: value 为科学计数法 1e3（1000）', () => {
    const buf = Buffer.allocUnsafe(4);
    buf.writeUInt16BE(1e3, 0);
    return buf[0] === 0x03 && buf[1] === 0xE8; // 1000 = 0x03E8
  }),

  test('writeUInt16LE: value 为科学计数法 2e4（20000）', () => {
    const buf = Buffer.allocUnsafe(4);
    buf.writeUInt16LE(2e4, 0);
    return buf[0] === 0x20 && buf[1] === 0x4E; // 20000 = 0x4E20
  }),

  test('writeUInt16BE: value 为十六进制字符串 "0x1234"', () => {
    const buf = Buffer.allocUnsafe(4);
    buf.writeUInt16BE("0x1234", 0);
    return buf[0] === 0x12 && buf[1] === 0x34;
  }),

  test('writeUInt16LE: value 为八进制字符串 "0o777"', () => {
    const buf = Buffer.allocUnsafe(4);
    buf.writeUInt16LE("0o777", 0); // 511 = 0x01FF
    return buf[0] === 0xFF && buf[1] === 0x01;
  }),

  test('writeUInt16BE: value 为二进制字符串 "0b1111111111111111"', () => {
    const buf = Buffer.allocUnsafe(4);
    buf.writeUInt16BE("0b1111111111111111", 0); // 65535 = 0xFFFF
    return buf[0] === 0xFF && buf[1] === 0xFF;
  }),

  // 🎯 返回值验证：offset + 字节数
  test('writeUInt16BE: 返回值为 offset + 2', () => {
    const buf = Buffer.allocUnsafe(10);
    const result = buf.writeUInt16BE(0x1234, 3);
    return result === 5; // 3 + 2
  }),

  test('writeUInt16LE: 返回值为 offset + 2', () => {
    const buf = Buffer.allocUnsafe(10);
    const result = buf.writeUInt16LE(0x1234, 7);
    return result === 9; // 7 + 2
  }),

  test('writeUInt16BE: 返回值类型为 number', () => {
    const buf = Buffer.allocUnsafe(4);
    const result = buf.writeUInt16BE(0x1234, 0);
    return typeof result === 'number';
  }),

  // 🎯 Buffer 子类行为
  test('writeUInt16BE: Buffer 子类继承行为', () => {
    class MyBuffer extends Buffer {
      constructor(size) {
        super(Buffer.allocUnsafe(size));
      }
    }
    const buf = new MyBuffer(4);
    buf.writeUInt16BE(0xABCD, 0);
    return buf[0] === 0xAB && buf[1] === 0xCD;
  }),

  test('writeUInt16LE: Buffer 子类继承行为', () => {
    class MyBuffer extends Buffer {
      constructor(size) {
        super(Buffer.allocUnsafe(size));
      }
    }
    const buf = new MyBuffer(4);
    buf.writeUInt16LE(0xABCD, 0);
    return buf[0] === 0xCD && buf[1] === 0xAB;
  }),

  // 🎯 特殊 this 绑定：类数组对象
  test('writeUInt16BE: 类数组对象 this 绑定', () => {
    const arrayLike = {
      0: 0,
      1: 0,
      2: 0,
      3: 0,
      length: 4
    };
    Buffer.prototype.writeUInt16BE.call(arrayLike, 0x1234, 0);
    return arrayLike[0] === 18 && arrayLike[1] === 4660; // 0x12 和 0x1234
  }),

  test('writeUInt16LE: 类数组对象 this 绑定', () => {
    const arrayLike = {
      0: 0,
      1: 0,
      2: 0,
      3: 0,
      length: 4
    };
    Buffer.prototype.writeUInt16LE.call(arrayLike, 0xABCD, 0);
    return arrayLike[0] === 43981 && arrayLike[1] === 171; // 0xABCD 和 0xAB
  }),

  // 🎯 内存对齐边界：奇数 offset
  test('writeUInt16BE: 奇数 offset 内存对齐', () => {
    const buf = Buffer.allocUnsafe(10);
    buf.fill(0);
    buf.writeUInt16BE(0xDEAD, 1);
    buf.writeUInt16BE(0xBEEF, 3);
    buf.writeUInt16BE(0xCAFE, 5);
    return buf[1] === 0xDE && buf[2] === 0xAD && 
           buf[3] === 0xBE && buf[4] === 0xEF &&
           buf[5] === 0xCA && buf[6] === 0xFE;
  }),

  test('writeUInt16LE: 奇数 offset 内存对齐', () => {
    const buf = Buffer.allocUnsafe(10);
    buf.fill(0);
    buf.writeUInt16LE(0xDEAD, 1);
    buf.writeUInt16LE(0xBEEF, 3);
    buf.writeUInt16LE(0xCAFE, 5);
    return buf[1] === 0xAD && buf[2] === 0xDE && 
           buf[3] === 0xEF && buf[4] === 0xBE &&
           buf[5] === 0xFE && buf[6] === 0xCA;
  }),

  // 🎯 错误边界：超大 offset 数值
  test('writeUInt16BE: offset 为 Number.MAX_SAFE_INTEGER 抛错', () => {
    const buf = Buffer.allocUnsafe(4);
    try {
      buf.writeUInt16BE(0x1234, Number.MAX_SAFE_INTEGER);
      return false;
    } catch (e) {
      return e && e.name === 'RangeError';
    }
  }),

  test('writeUInt16LE: offset 为 Number.MIN_SAFE_INTEGER 抛错', () => {
    const buf = Buffer.allocUnsafe(4);
    try {
      buf.writeUInt16LE(0x1234, Number.MIN_SAFE_INTEGER);
      return false;
    } catch (e) {
      return e && e.name === 'RangeError';
    }
  }),

  // 🎯 value 超范围严格检查
  test('writeUInt16BE: value 超过 65535 抛错', () => {
    const buf = Buffer.allocUnsafe(4);
    try {
      buf.writeUInt16BE(0x123456, 0);
      return false;
    } catch (e) {
      return e && e.name === 'RangeError';
    }
  }),

  test('writeUInt16LE: value 负数抛错', () => {
    const buf = Buffer.allocUnsafe(4);
    try {
      buf.writeUInt16LE(-1, 0);
      return false;
    } catch (e) {
      return e && e.name === 'RangeError';
    }
  }),

  test('writeUInt16BE: value 负数抛错', () => {
    const buf = Buffer.allocUnsafe(4);
    try {
      buf.writeUInt16BE(-32768, 0);
      return false;
    } catch (e) {
      return e && e.name === 'RangeError';
    }
  }),

  // 🎯 特殊数值边界：极小浮点数
  test('writeUInt16BE: value 为极小浮点数 Number.EPSILON', () => {
    const buf = Buffer.allocUnsafe(4);
    buf.writeUInt16BE(Number.EPSILON, 0); // 截断为 0
    return buf[0] === 0x00 && buf[1] === 0x00;
  }),

  test('writeUInt16LE: value 为 Number.MIN_VALUE', () => {
    const buf = Buffer.allocUnsafe(4);
    buf.writeUInt16LE(Number.MIN_VALUE, 0); // 截断为 0
    return buf[0] === 0x00 && buf[1] === 0x00;
  }),

  // 🎯 ArrayBuffer 视图兼容性
  test('writeUInt16BE: ArrayBuffer 视图 this 绑定', () => {
    const arrayBuffer = new ArrayBuffer(8);
    const uint8Array = new Uint8Array(arrayBuffer);
    Buffer.prototype.writeUInt16BE.call(uint8Array, 0x1234, 0);
    return uint8Array[0] === 0x12 && uint8Array[1] === 0x34;
  }),

  test('writeUInt16LE: DataView this 绑定', () => {
    const arrayBuffer = new ArrayBuffer(8);
    const dataView = new DataView(arrayBuffer);
    try {
      Buffer.prototype.writeUInt16LE.call(dataView, 0x1234, 0);
      return false; // DataView 没有 length 属性，应该抛错
    } catch (e) {
      return e && e.name === 'RangeError';
    }
  }),

  // 🎯 链式调用兼容性
  test('writeUInt16BE: 链式调用返回值可用', () => {
    const buf = Buffer.allocUnsafe(8);
    const offset = buf.writeUInt16BE(0x1234, 0);
    buf.writeUInt16BE(0x5678, offset);
    return buf[0] === 0x12 && buf[1] === 0x34 && 
           buf[2] === 0x56 && buf[3] === 0x78;
  }),

  test('writeUInt16LE: 链式调用返回值可用', () => {
    const buf = Buffer.allocUnsafe(8);
    const offset = buf.writeUInt16LE(0x1234, 0);
    buf.writeUInt16LE(0x5678, offset);
    return buf[0] === 0x34 && buf[1] === 0x12 && 
           buf[2] === 0x78 && buf[3] === 0x56;
  }),

  // 🎯 Symbol.toPrimitive 行为
  test('writeUInt16BE: value 对象有 Symbol.toPrimitive', () => {
    const buf = Buffer.allocUnsafe(4);
    const obj = {
      [Symbol.toPrimitive](hint) {
        return hint === 'number' ? 0x1234 : '0x1234';
      }
    };
    buf.writeUInt16BE(obj, 0);
    return buf[0] === 0x12 && buf[1] === 0x34;
  }),

  test('writeUInt16LE: offset 对象有 Symbol.toPrimitive', () => {
    const buf = Buffer.allocUnsafe(4);
    const offsetObj = {
      [Symbol.toPrimitive](hint) {
        return hint === 'number' ? 1 : '1';
      }
    };
    try {
      buf.writeUInt16LE(0x5678, offsetObj);
      return buf[1] === 0x78 && buf[2] === 0x56;
    } catch (e) {
      // Node.js 可能对 offset 类型检查更严格
      return e && e.name === 'TypeError';
    }
  }),

  // 🎯 冻结/密封 Buffer 行为
  test('writeUInt16BE: 冻结 Buffer 抛错', () => {
    const buf = Buffer.allocUnsafe(4);
    try {
      Object.freeze(buf);
      buf.writeUInt16BE(0x1234, 0);
      return false;
    } catch (e) {
      return e && e.name === 'TypeError';
    }
  }),

  test('writeUInt16LE: 密封 Buffer 抛错', () => {
    const buf = Buffer.allocUnsafe(4);
    try {
      Object.seal(buf);
      buf.writeUInt16LE(0x1234, 0);
      return false;
    } catch (e) {
      return e && e.name === 'TypeError';
    }
  }),

  // 🎯 原型链污染防护
  test('writeUInt16BE: 原型链污染不影响', () => {
    const buf = Buffer.allocUnsafe(4);
    Buffer.prototype.writeUInt16BE = null; // 污染原型
    try {
      buf.writeUInt16BE(0x1234, 0);
      return false; // 应该抛错
    } catch (e) {
      // 恢复原型
      delete Buffer.prototype.writeUInt16BE;
      return e && e.name === 'TypeError';
    }
  }),

  test('writeUInt16LE: 方法描述符可枚举', () => {
    const descriptor = Object.getOwnPropertyDescriptor(Buffer.prototype, 'writeUInt16LE');
    return descriptor && descriptor.enumerable === true;
  })
];

// 运行所有测试
const results = tests;
const passed = results.filter(r => r.status === '✅').length;
const failed = results.filter(r => r.status === '❌').length;

const summary = {
  total: results.length,
  passed: passed,
  failed: failed,
  success_rate: ((passed / results.length) * 100).toFixed(2) + '%',
  tests: results
};

console.log(JSON.stringify(summary, null, 2));
return summary;
