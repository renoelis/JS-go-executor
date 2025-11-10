const { Buffer } = require('buffer');

const tests = [];

function test(name, fn) {
  try {
    const pass = !!fn();
    tests.push({ name, status: pass ? '✅' : '❌' });
  } catch (e) {
    tests.push({
      name,
      status: '❌',
      error: e.message,
      stack: e.stack
    });
  }
}

// ============ slice 与不同源类型的 Buffer 交互 ============

test('源类型：从 ArrayBuffer 创建的 Buffer 再 slice', () => {
  const ab = new ArrayBuffer(10);
  const buf = Buffer.from(ab);
  buf[0] = 65; // 'A'
  const sliced = buf.slice(0, 5);
  return sliced.length === 5 && sliced[0] === 65;
});

test('源类型：从 ArrayBuffer 创建带 offset 的 Buffer 再 slice', () => {
  const ab = new ArrayBuffer(20);
  const view = new Uint8Array(ab);
  view[5] = 99;
  const buf = Buffer.from(ab, 5, 10);
  const sliced = buf.slice(0, 5);
  return sliced[0] === 99;
});

test('源类型：从 Uint8Array 创建的 Buffer 再 slice', () => {
  const uint8 = new Uint8Array([1, 2, 3, 4, 5]);
  const buf = Buffer.from(uint8);
  const sliced = buf.slice(1, 4);
  return sliced.length === 3 && sliced[0] === 2;
});

test('源类型：从 Uint16Array 创建的 Buffer 再 slice', () => {
  const uint16 = new Uint16Array([256, 512]);
  const buf = Buffer.from(uint16.buffer);
  const sliced = buf.slice(0, 4);
  return sliced.length === 4;
});

test('源类型：从另一个 Buffer 创建再 slice', () => {
  const buf1 = Buffer.from('hello');
  const buf2 = Buffer.from(buf1);
  const sliced = buf2.slice(0, 3);
  // buf2 是拷贝，修改 sliced 不影响 buf1
  sliced[0] = 0x48;
  return buf1[0] === 0x68 && buf2[0] === 0x48;
});

// ============ slice 与写入方法的交互 ============

test('写入交互：slice 后使用 fill', () => {
  const buf = Buffer.alloc(10);
  const sliced = buf.slice(2, 7);
  sliced.fill(0xff);
  return buf[2] === 0xff && buf[6] === 0xff && buf[0] === 0 && buf[7] === 0;
});

test('写入交互：slice 后使用 write', () => {
  const buf = Buffer.alloc(10);
  const sliced = buf.slice(2, 8);
  sliced.write('hello');
  return buf.toString('utf8', 2, 7) === 'hello';
});

test('写入交互：slice 后使用 writeInt8', () => {
  const buf = Buffer.alloc(10);
  const sliced = buf.slice(3, 8);
  sliced.writeInt8(-1, 0);
  return buf[3] === 0xff;
});

test('写入交互：slice 后使用 writeUInt32LE', () => {
  const buf = Buffer.alloc(10);
  const sliced = buf.slice(2, 8);
  sliced.writeUInt32LE(0x12345678, 0);
  return buf[2] === 0x78 && buf[5] === 0x12;
});

test('写入交互：slice 后使用 copy', () => {
  const buf1 = Buffer.from('hello world');
  const buf2 = Buffer.alloc(5);
  const sliced = buf1.slice(6, 11);
  sliced.copy(buf2);
  return buf2.toString() === 'world';
});

test('写入交互：向 slice 中 copy 数据', () => {
  const buf1 = Buffer.from('hello');
  const buf2 = Buffer.alloc(10);
  const sliced = buf2.slice(2, 7);
  buf1.copy(sliced);
  return buf2.toString('utf8', 2, 7) === 'hello';
});

// ============ slice 与 Buffer.concat 交互 ============

test('concat 交互：concat 包含 slice 的数组', () => {
  const buf1 = Buffer.from('hello');
  const buf2 = Buffer.from(' world');
  const sliced1 = buf1.slice(0, 5);
  const sliced2 = buf2.slice(0, 6);
  const result = Buffer.concat([sliced1, sliced2]);
  return result.toString() === 'hello world';
});

test('concat 交互：concat 后再 slice', () => {
  const buf1 = Buffer.from('hello');
  const buf2 = Buffer.from(' world');
  const concatenated = Buffer.concat([buf1, buf2]);
  const sliced = concatenated.slice(0, 5);
  return sliced.toString() === 'hello';
});

test('concat 交互：修改原 slice 不影响 concat 结果', () => {
  const buf = Buffer.from('hello');
  const sliced = buf.slice(0, 5);
  const concatenated = Buffer.concat([sliced]);
  sliced[0] = 0x48; // 'H'
  // concat 创建新 buffer，应该不受影响
  return concatenated[0] === 0x68; // 'h'
});

// ============ slice 的极端嵌套 ============

test('极端嵌套：50 层 slice 嵌套', () => {
  let buf = Buffer.from('hello world');
  for (let i = 0; i < 50; i++) {
    buf = buf.slice(0, buf.length);
  }
  buf[0] = 0x48; // 'H'
  return buf.toString() === 'Hello world';
});

test('极端嵌套：深层嵌套后的内存共享', () => {
  const original = Buffer.from([1, 2, 3, 4, 5]);
  let current = original;
  for (let i = 0; i < 100; i++) {
    current = current.slice(0, current.length);
  }
  current[0] = 99;
  return original[0] === 99;
});

test('极端嵌套：深层嵌套的不同范围', () => {
  let buf = Buffer.from('hello world');
  buf = buf.slice(0, 10);
  buf = buf.slice(1, 9);
  buf = buf.slice(1, 7);
  buf = buf.slice(1, 5);
  return buf.toString() === 'lo w';
});

// ============ slice 与内存对齐 ============

test('内存对齐：slice 非 8 字节对齐的起始位置', () => {
  const buf = Buffer.alloc(20);
  buf[7] = 88;
  const sliced = buf.slice(7, 15);
  return sliced[0] === 88 && sliced.length === 8;
});

test('内存对齐：slice 奇数长度', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5, 6, 7]);
  const sliced = buf.slice(1, 6);
  return sliced.length === 5;
});

test('内存对齐：slice 单字节对齐', () => {
  const buf = Buffer.from([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  for (let i = 0; i < 10; i++) {
    const sliced = buf.slice(i, i + 1);
    if (sliced[0] !== i) return false;
  }
  return true;
});

// ============ slice 后的属性描述符测试 ============

test('属性描述符：slice 返回的索引属性可写', () => {
  const buf = Buffer.from([1, 2, 3]);
  const sliced = buf.slice(0, 3);
  const desc = Object.getOwnPropertyDescriptor(sliced, '0');
  return desc && desc.writable === true;
});

test('属性描述符：slice 返回的索引属性可枚举', () => {
  const buf = Buffer.from([1, 2, 3]);
  const sliced = buf.slice(0, 3);
  const desc = Object.getOwnPropertyDescriptor(sliced, '0');
  return desc && desc.enumerable === true;
});

test('属性描述符：slice 返回的索引属性可配置', () => {
  const buf = Buffer.from([1, 2, 3]);
  const sliced = buf.slice(0, 3);
  const desc = Object.getOwnPropertyDescriptor(sliced, '0');
  return desc && desc.configurable === true;
});

test('属性描述符：slice 的 length 属性不可写', () => {
  const buf = Buffer.from([1, 2, 3]);
  const sliced = buf.slice(0, 2);
  const oldLength = sliced.length;
  try {
    sliced.length = 10;
  } catch (e) {
    // 在严格模式可能抛错
  }
  // TypedArray 的 length 是只读的
  return sliced.length === oldLength;
});

// ============ slice 与比较操作 ============

test('比较操作：使用 equals 比较 slice', () => {
  const buf1 = Buffer.from('hello');
  const sliced = buf1.slice(0, 5);
  const buf2 = Buffer.from('hello');
  return sliced.equals(buf2);
});

test('比较操作：使用 compare 比较 slice', () => {
  const buf1 = Buffer.from('abc');
  const sliced = buf1.slice(0, 3);
  const buf2 = Buffer.from('abd');
  return sliced.compare(buf2) < 0;
});

test('比较操作：slice 后与自身比较', () => {
  const buf = Buffer.from('hello');
  const sliced = buf.slice(0, 5);
  return sliced.equals(buf);
});

test('比较操作：不同 slice 的同一范围比较', () => {
  const buf = Buffer.from('hello world');
  const slice1 = buf.slice(0, 5);
  const slice2 = buf.slice(0, 5);
  return slice1.equals(slice2);
});

// ============ slice 与索引访问的边界情况 ============

test('索引访问：访问负索引', () => {
  const buf = Buffer.from([1, 2, 3]);
  const sliced = buf.slice(0, 3);
  return sliced[-1] === undefined;
});

test('索引访问：访问 length 索引', () => {
  const buf = Buffer.from([1, 2, 3]);
  const sliced = buf.slice(0, 3);
  return sliced[3] === undefined;
});

test('索引访问：访问远超 length 的索引', () => {
  const buf = Buffer.from([1, 2, 3]);
  const sliced = buf.slice(0, 3);
  return sliced[1000] === undefined;
});

test('索引访问：使用浮点数索引', () => {
  const buf = Buffer.from([1, 2, 3]);
  const sliced = buf.slice(0, 3);
  // JavaScript 会自动转换为整数索引
  return sliced[1.5] === undefined && sliced[1] === 2;
});

// ============ slice 与 JSON 序列化 ============

test('JSON 序列化：slice 的 JSON.stringify', () => {
  const buf = Buffer.from([1, 2, 3]);
  const sliced = buf.slice(0, 3);
  const json = JSON.stringify(sliced);
  const parsed = JSON.parse(json);
  return parsed.type === 'Buffer' && Array.isArray(parsed.data) && parsed.data[0] === 1;
});

test('JSON 序列化：空 slice 的 JSON.stringify', () => {
  const buf = Buffer.from([1, 2, 3]);
  const sliced = buf.slice(2, 2);
  const json = JSON.stringify(sliced);
  const parsed = JSON.parse(json);
  return parsed.type === 'Buffer' && parsed.data.length === 0;
});

test('JSON 序列化：slice 后修改再序列化', () => {
  const buf = Buffer.from([1, 2, 3]);
  const sliced = buf.slice(0, 3);
  sliced[0] = 99;
  const json = JSON.stringify(sliced);
  const parsed = JSON.parse(json);
  return parsed.data[0] === 99;
});

// ============ slice 与 toString 的各种编码 ============

test('toString 编码：slice 后 toString("hex")', () => {
  const buf = Buffer.from([0x12, 0x34, 0x56, 0x78]);
  const sliced = buf.slice(1, 3);
  return sliced.toString('hex') === '3456';
});

test('toString 编码：slice 后 toString("base64")', () => {
  const buf = Buffer.from('hello');
  const sliced = buf.slice(0, 5);
  const base64 = sliced.toString('base64');
  return Buffer.from(base64, 'base64').toString() === 'hello';
});

test('toString 编码：slice 后 toString("binary")', () => {
  const buf = Buffer.from([0xff, 0xfe, 0xfd]);
  const sliced = buf.slice(0, 3);
  const binary = sliced.toString('binary');
  return binary.length === 3;
});

test('toString 编码：slice 后 toString("ascii")', () => {
  const buf = Buffer.from('ABC');
  const sliced = buf.slice(0, 3);
  return sliced.toString('ascii') === 'ABC';
});

// ============ slice 与迭代器 ============

test('迭代器：slice 使用 for...of 遍历', () => {
  const buf = Buffer.from([1, 2, 3]);
  const sliced = buf.slice(0, 3);
  const values = [];
  for (const byte of sliced) {
    values.push(byte);
  }
  return values.length === 3 && values[0] === 1 && values[2] === 3;
});

test('迭代器：空 slice 使用 for...of', () => {
  const buf = Buffer.from([1, 2, 3]);
  const sliced = buf.slice(2, 2);
  let count = 0;
  for (const byte of sliced) {
    count++;
  }
  return count === 0;
});

test('迭代器：slice 的 entries 方法', () => {
  const buf = Buffer.from([1, 2, 3]);
  const sliced = buf.slice(0, 2);
  const entries = Array.from(sliced.entries());
  return entries.length === 2 && entries[0][0] === 0 && entries[0][1] === 1;
});

test('迭代器：slice 的 keys 方法', () => {
  const buf = Buffer.from([1, 2, 3]);
  const sliced = buf.slice(0, 2);
  const keys = Array.from(sliced.keys());
  return keys.length === 2 && keys[0] === 0 && keys[1] === 1;
});

test('迭代器：slice 的 values 方法', () => {
  const buf = Buffer.from([1, 2, 3]);
  const sliced = buf.slice(0, 2);
  const values = Array.from(sliced.values());
  return values.length === 2 && values[0] === 1 && values[1] === 2;
});

// ============ slice 与 indexOf/lastIndexOf ============

test('indexOf：在 slice 中查找单字节', () => {
  const buf = Buffer.from('hello world');
  const sliced = buf.slice(6, 11);
  return sliced.indexOf('o') === 1;
});

test('indexOf：在 slice 中查找不存在的值', () => {
  const buf = Buffer.from('hello');
  const sliced = buf.slice(0, 5);
  return sliced.indexOf('z') === -1;
});

test('lastIndexOf：在 slice 中查找', () => {
  const buf = Buffer.from('hello');
  const sliced = buf.slice(0, 5);
  return sliced.lastIndexOf('l') === 3;
});

test('includes：在 slice 中检查', () => {
  const buf = Buffer.from('hello world');
  const sliced = buf.slice(0, 5);
  return sliced.includes('ell') === true;
});

// ============ slice 与极端索引值 ============

test('极端值：使用 Number.MAX_SAFE_INTEGER 作为 end', () => {
  const buf = Buffer.from([1, 2, 3]);
  const sliced = buf.slice(0, Number.MAX_SAFE_INTEGER);
  return sliced.length === 3;
});

test('极端值：使用 Number.MIN_SAFE_INTEGER 作为 start', () => {
  const buf = Buffer.from([1, 2, 3]);
  const sliced = buf.slice(Number.MIN_SAFE_INTEGER, 2);
  return sliced.length === 2 && sliced[0] === 1;
});

test('极端值：使用 2^32 作为索引', () => {
  const buf = Buffer.from([1, 2, 3]);
  const sliced = buf.slice(0, Math.pow(2, 32));
  return sliced.length === 3;
});

test('极端值：使用 -2^32 作为索引', () => {
  const buf = Buffer.from([1, 2, 3]);
  const sliced = buf.slice(-Math.pow(2, 32), 2);
  return sliced.length === 2;
});

// ============ slice 后的数组方法 ============

test('数组方法：slice 后使用 every', () => {
  const buf = Buffer.from([1, 2, 3]);
  const sliced = buf.slice(0, 3);
  return sliced.every(byte => byte > 0);
});

test('数组方法：slice 后使用 some', () => {
  const buf = Buffer.from([1, 2, 3]);
  const sliced = buf.slice(0, 3);
  return sliced.some(byte => byte === 2);
});

test('数组方法：slice 后使用 filter', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sliced = buf.slice(0, 5);
  const filtered = sliced.filter(byte => byte > 2);
  return filtered.length === 3;
});

test('数组方法：slice 后使用 map', () => {
  const buf = Buffer.from([1, 2, 3]);
  const sliced = buf.slice(0, 3);
  const mapped = sliced.map(byte => byte * 2);
  return mapped.length === 3 && mapped[0] === 2;
});

test('数组方法：slice 后使用 reduce', () => {
  const buf = Buffer.from([1, 2, 3]);
  const sliced = buf.slice(0, 3);
  const sum = sliced.reduce((acc, byte) => acc + byte, 0);
  return sum === 6;
});

test('数组方法：slice 后使用 find', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sliced = buf.slice(0, 5);
  const found = sliced.find(byte => byte > 3);
  return found === 4;
});

test('数组方法：slice 后使用 findIndex', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sliced = buf.slice(0, 5);
  const index = sliced.findIndex(byte => byte > 3);
  return index === 3;
});

try {
  let passed = 0;
  for (let i = 0; i < tests.length; i++) {
    if (tests[i].status === '✅') passed++;
  }
  const total = tests.length;
  const failed = total - passed;

  const result = {
    success: failed === 0,
    summary: {
      total,
      passed,
      failed,
      successRate: total ? (passed * 100 / total).toFixed(2) + '%' : '0.00%'
    },
    tests
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
