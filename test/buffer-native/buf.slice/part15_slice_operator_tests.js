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

// ============ 第二次深度查缺：错误边界和极端情况 ============

// slice 后立即再次 slice 的所有组合
test('双重 slice：slice(0, 5).slice(0, 3)', () => {
  const buf = Buffer.from('hello world');
  const result = buf.slice(0, 5).slice(0, 3);
  return result.toString() === 'hel';
});

test('双重 slice：slice(0, 5).slice(1, 4)', () => {
  const buf = Buffer.from('hello world');
  const result = buf.slice(0, 5).slice(1, 4);
  return result.toString() === 'ell';
});

test('双重 slice：slice(0, 5).slice(2)', () => {
  const buf = Buffer.from('hello world');
  const result = buf.slice(0, 5).slice(2);
  return result.toString() === 'llo';
});

test('双重 slice：slice(5).slice(0, 5)', () => {
  const buf = Buffer.from('hello world');
  const result = buf.slice(6).slice(0, 5);
  return result.toString() === 'world';
});

test('双重 slice：slice(-5).slice(-3)', () => {
  const buf = Buffer.from('hello world');
  const result = buf.slice(-5).slice(-3);
  return result.toString() === 'rld';
});

// ============ slice 与不同 this 上下文 ============

test('this 上下文：bind 不同的 this', () => {
  const buf = Buffer.from('hello');
  const otherBuf = Buffer.from('world');
  const boundSlice = buf.slice.bind(otherBuf);
  const sliced = boundSlice(0, 3);
  return sliced.toString() === 'wor';
});

test('this 上下文：apply 调用 slice', () => {
  const buf = Buffer.from('hello');
  const otherBuf = Buffer.from('world');
  const sliced = buf.slice.apply(otherBuf, [0, 3]);
  return sliced.toString() === 'wor';
});

test('this 上下文：call 调用 slice', () => {
  const buf = Buffer.from('hello');
  const otherBuf = Buffer.from('world');
  const sliced = buf.slice.call(otherBuf, 1, 4);
  return sliced.toString() === 'orl';
});

// ============ slice 与 Uint8Array 方法的对比 ============

test('方法对比：slice vs subarray 结果对比', () => {
  const buf = Buffer.from('hello world');
  const sliced = buf.slice(0, 5);
  const subarrayed = buf.subarray(0, 5);

  // 修改 sliced
  sliced[0] = 0x48; // 'H'

  // subarray 应该也被影响
  return subarrayed[0] === 0x48;
});

test('方法对比：slice 与 Uint8Array.prototype.slice 的差异', () => {
  const buf = Buffer.from('hello');

  // Buffer.prototype.slice 返回视图
  const bufSliced = buf.slice(0, 3);

  // Uint8Array.prototype.slice 返回拷贝
  const uint8Sliced = Uint8Array.prototype.slice.call(buf, 0, 3);

  buf[0] = 0x48; // 'H'

  return bufSliced[0] === 0x48 && uint8Sliced[0] === 0x68;
});

// ============ slice 后调用 toString 的所有参数组合 ============

test('toString 完整测试：所有编码 + start + end 组合', () => {
  const buf = Buffer.from('hello world');
  const sliced = buf.slice(0, 11);

  const tests = [
    sliced.toString('utf8', 0, 5) === 'hello',
    sliced.toString('hex', 0, 5) === '68656c6c6f',
    sliced.toString('base64', 0, 5) === 'aGVsbG8=',
    sliced.toString('latin1', 6, 11) === 'world',
    sliced.toString('ascii', 0, 11) === 'hello world'
  ];

  return tests.every(t => t === true);
});

// ============ slice 与 buffer.inspect ============

test('inspect：slice 后调用 inspect', () => {
  const buf = Buffer.from('hello');
  const sliced = buf.slice(0, 3);
  const inspected = sliced.inspect();
  return typeof inspected === 'string';
});

test('inspect：util.inspect 对 slice', () => {
  const util = require('util');
  const buf = Buffer.from('hello');
  const sliced = buf.slice(0, 3);
  const inspected = util.inspect(sliced);
  return typeof inspected === 'string';
});

// ============ slice 与数组解构 ============

test('数组解构：解构 slice 的前几个元素', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sliced = buf.slice(0, 3);
  const [a, b, c] = sliced;
  return a === 1 && b === 2 && c === 3;
});

test('数组解构：使用 rest 操作符', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sliced = buf.slice(0, 5);
  const [first, ...rest] = sliced;
  return first === 1 && rest.length === 4;
});

test('数组解构：解构空 slice', () => {
  const buf = Buffer.from('hello');
  const sliced = buf.slice(2, 2);
  const [a] = sliced;
  return a === undefined;
});

// ============ slice 与展开运算符 ============

test('展开运算符：展开 slice 到数组', () => {
  const buf = Buffer.from([1, 2, 3]);
  const sliced = buf.slice(0, 3);
  const arr = [...sliced];
  return Array.isArray(arr) && arr.length === 3 && arr[0] === 1;
});

test('展开运算符：展开 slice 到函数参数', () => {
  const buf = Buffer.from([1, 2, 3]);
  const sliced = buf.slice(0, 3);
  const sum = (a, b, c) => a + b + c;
  return sum(...sliced) === 6;
});

test('展开运算符：展开空 slice', () => {
  const buf = Buffer.from('hello');
  const sliced = buf.slice(2, 2);
  const arr = [...sliced];
  return arr.length === 0;
});

// ============ slice 与 Array.from ============

test('Array.from：从 slice 创建数组', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sliced = buf.slice(1, 4);
  const arr = Array.from(sliced);
  return Array.isArray(arr) && arr.length === 3 && arr[0] === 2;
});

test('Array.from：带映射函数', () => {
  const buf = Buffer.from([1, 2, 3]);
  const sliced = buf.slice(0, 3);
  const arr = Array.from(sliced, x => x * 2);
  return arr[0] === 2 && arr[1] === 4 && arr[2] === 6;
});

// ============ slice 与 slice 方法本身的属性 ============

test('方法属性：slice.name', () => {
  return Buffer.prototype.slice.name === 'slice';
});

test('方法属性：slice.length（参数个数）', () => {
  return Buffer.prototype.slice.length === 2;
});

// ============ slice 后的 propertyIsEnumerable ============

test('propertyIsEnumerable：检查索引属性', () => {
  const buf = Buffer.from([1, 2, 3]);
  const sliced = buf.slice(0, 3);
  return sliced.propertyIsEnumerable('0') && sliced.propertyIsEnumerable('1');
});

test('propertyIsEnumerable：检查 length 属性', () => {
  const buf = Buffer.from([1, 2, 3]);
  const sliced = buf.slice(0, 3);
  return !sliced.propertyIsEnumerable('length');
});

// ============ slice 与 delete 操作符 ============

test('delete 操作符：尝试删除 slice 的索引', () => {
  const buf = Buffer.from([1, 2, 3]);
  const sliced = buf.slice(0, 3);
  const result = delete sliced[0];
  // TypedArray 的索引不能被删除
  return sliced[0] === 1;
});

test('delete 操作符：尝试删除 slice 的 length', () => {
  const buf = Buffer.from([1, 2, 3]);
  const sliced = buf.slice(0, 3);
  const result = delete sliced.length;
  // length 属性不能被删除
  return sliced.length === 3;
});

// ============ slice 与类型检查 ============

test('类型检查：typeof slice', () => {
  const buf = Buffer.from('hello');
  const sliced = buf.slice(0, 3);
  return typeof sliced === 'object';
});

test('类型检查：Buffer.isBuffer', () => {
  const buf = Buffer.from('hello');
  const sliced = buf.slice(0, 3);
  return Buffer.isBuffer(sliced);
});

test('类型检查：Object.prototype.toString.call', () => {
  const buf = Buffer.from('hello');
  const sliced = buf.slice(0, 3);
  return Object.prototype.toString.call(sliced) === '[object Uint8Array]';
});

// ============ slice 后的严格相等比较 ============

test('严格相等：slice 与原 buffer 不相等', () => {
  const buf = Buffer.from('hello');
  const sliced = buf.slice(0, 5);
  return sliced !== buf;
});

test('严格相等：两次 slice 不相等', () => {
  const buf = Buffer.from('hello');
  const sliced1 = buf.slice(0, 3);
  const sliced2 = buf.slice(0, 3);
  return sliced1 !== sliced2;
});

test('严格相等：slice 自身相等', () => {
  const buf = Buffer.from('hello');
  const sliced = buf.slice(0, 3);
  return sliced === sliced;
});

// ============ slice 与 in 操作符 ============

test('in 操作符：检查索引是否存在', () => {
  const buf = Buffer.from([1, 2, 3]);
  const sliced = buf.slice(0, 3);
  return (0 in sliced) && (1 in sliced) && (2 in sliced);
});

test('in 操作符：检查超出范围的索引', () => {
  const buf = Buffer.from([1, 2, 3]);
  const sliced = buf.slice(0, 3);
  return !(3 in sliced) && !(10 in sliced);
});

test('in 操作符：检查方法是否存在', () => {
  const buf = Buffer.from('hello');
  const sliced = buf.slice(0, 3);
  return 'slice' in sliced && 'toString' in sliced;
});

// ============ slice 与条件判断 ============

test('条件判断：slice 作为布尔值（truthy）', () => {
  const buf = Buffer.from('hello');
  const sliced = buf.slice(0, 3);
  return !!sliced === true;
});

test('条件判断：空 slice 作为布尔值（仍然 truthy）', () => {
  const buf = Buffer.from('hello');
  const sliced = buf.slice(2, 2);
  return !!sliced === true;
});

// ============ slice 与模板字符串 ============

test('模板字符串：slice 在模板字符串中', () => {
  const buf = Buffer.from([1, 2, 3]);
  const sliced = buf.slice(0, 3);
  const str = `Buffer: ${sliced}`;
  // Buffer 在模板字符串中会被转换为字符串
  return typeof str === 'string' && str.length > 0;
});

// ============ slice 与加法运算符 ============

test('加法运算符：slice + 字符串', () => {
  const buf = Buffer.from([1, 2, 3]);
  const sliced = buf.slice(0, 3);
  const result = sliced + '';
  return typeof result === 'string';
});

test('加法运算符：slice + 数字', () => {
  const buf = Buffer.from([1, 2, 3]);
  const sliced = buf.slice(0, 3);
  const result = sliced + 0;
  return typeof result === 'string' || typeof result === 'number';
});

// ============ slice 后调用 slice 的极端嵌套 ============

test('极端嵌套：连续 20 次 slice(0)', () => {
  let current = Buffer.from('hello world');
  for (let i = 0; i < 20; i++) {
    current = current.slice(0);
  }
  return current.toString() === 'hello world';
});

test('极端嵌套：连续 20 次 slice(1)', () => {
  let current = Buffer.from('abcdefghijklmnopqrstuvwxyz');
  for (let i = 0; i < 20; i++) {
    current = current.slice(1);
  }
  return current.length === 6;
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
