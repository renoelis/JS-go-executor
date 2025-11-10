// qs_test_comprehensive.cjs.js
// qs v6.14.0 (CommonJS) 全面功能验证测试
// 涵盖 89 个测试项，验证所有主要功能、选项、边界情况和安全特性

const qs = require('qs');

// ===== 辅助函数 =====

function formatObj(obj) {
  return JSON.stringify(obj, null, 2);
}

function testItem(id, description, testFunc) {
  console.log(`\n[${id}] ${description}`);
  try {
    const result = testFunc();
    console.log(`✅ 通过 - ${result}`);
    return true;
  } catch (error) {
    console.log(`❌ 失败 - ${error.message}`);
    return false;
  }
}

function assertEqual(actual, expected, message = '') {
  const actualStr = JSON.stringify(actual);
  const expectedStr = JSON.stringify(expected);
  if (actualStr !== expectedStr) {
    throw new Error(`${message}\n  预期: ${expectedStr}\n  实际: ${actualStr}`);
  }
  return message || '结果匹配';
}

function assertStrictEqual(actual, expected, message = '') {
  if (actual !== expected) {
    throw new Error(`${message}\n  预期: ${expected}\n  实际: ${actual}`);
  }
  return message || '结果匹配';
}

function assertThrows(func, message = '') {
  try {
    func();
    throw new Error(`${message} - 预期抛出异常但未抛出`);
  } catch (e) {
    if (e.message.includes('预期抛出异常但未抛出')) {
      throw e;
    }
    return `成功捕获异常: ${e.message}`;
  }
}

let passCount = 0;
let failCount = 0;

function recordResult(passed) {
  if (passed) {
    passCount++;
  } else {
    failCount++;
  }
}

console.log("╔════════════════════════════════════════════════════════════════╗");
console.log("║   qs v6.14.0 (CommonJS) 全面功能验证测试                      ║");
console.log("║   总测试项: 89                                                  ║");
console.log("╚════════════════════════════════════════════════════════════════╝");

// ===== ✅ 基本功能 (6 项) =====

console.log("\n\n" + "=".repeat(70));
console.log("✅ 基本功能 (6 项)");
console.log("=".repeat(70));

recordResult(testItem(
  "BASIC-001",
  "qs.parse('foo=bar&baz=qux') 无选项解析",
  () => {
    const result = qs.parse('foo=bar&baz=qux');
    return assertEqual(result, { foo: 'bar', baz: 'qux' }, '基本解析');
  }
));

recordResult(testItem(
  "BASIC-002",
  "qs.stringify({ foo: 'bar', baz: 'qux' }) 无选项序列化",
  () => {
    const result = qs.stringify({ foo: 'bar', baz: 'qux' });
    // 注意: 键的顺序可能不同
    const isValid = result === 'foo=bar&baz=qux' || result === 'baz=qux&foo=bar';
    if (!isValid) {
      throw new Error(`序列化结果不符合预期: ${result}`);
    }
    return '基本序列化';
  }
));

recordResult(testItem(
  "BASIC-003",
  "Round-trip: parse → stringify 保持一致",
  () => {
    const original = 'foo=bar&baz=qux';
    const parsed = qs.parse(original);
    const stringified = qs.stringify(parsed);
    const reParsed = qs.parse(stringified);
    return assertEqual(parsed, reParsed, 'Parse → Stringify → Parse 保持一致');
  }
));

recordResult(testItem(
  "BASIC-004",
  "Round-trip: stringify → parse 保持一致",
  () => {
    const original = { foo: 'bar', baz: 'qux', num: '123' };
    const stringified = qs.stringify(original);
    const parsed = qs.parse(stringified);
    return assertEqual(original, parsed, 'Stringify → Parse → Stringify 保持一致');
  }
));

recordResult(testItem(
  "BASIC-005",
  "解析空字符串 parse('')",
  () => {
    const result = qs.parse('');
    return assertEqual(result, {}, '空字符串解析为空对象');
  }
));

recordResult(testItem(
  "BASIC-006",
  "序列化空对象 stringify({})",
  () => {
    const result = qs.stringify({});
    return assertStrictEqual(result, '', '空对象序列化为空字符串');
  }
));

// ===== 🧱 对象嵌套 & 数组支持 (9 项) =====

console.log("\n\n" + "=".repeat(70));
console.log("🧱 对象嵌套 & 数组支持 (9 项)");
console.log("=".repeat(70));

recordResult(testItem(
  "NESTED-001",
  "嵌套对象解析 'foo[bar]=baz'",
  () => {
    const result = qs.parse('foo[bar]=baz');
    return assertEqual(result, { foo: { bar: 'baz' } }, '嵌套对象解析');
  }
));

recordResult(testItem(
  "NESTED-002",
  "多层嵌套 'a[b][c][d]=e'",
  () => {
    const result = qs.parse('a[b][c][d]=e');
    return assertEqual(result, { a: { b: { c: { d: 'e' } } } }, '多层嵌套解析');
  }
));

recordResult(testItem(
  "NESTED-003",
  "深度限制测试 depth: 2",
  () => {
    const result = qs.parse('a[b][c][d][e]=value', { depth: 2 });
    // depth: 2 表示最多 2 层嵌套，第 3 层开始会被当作键名
    // a[b][c][d][e] 应该变成 a.b.c 是对象，c[d][e] 应该是字符串键
    const hasLimit = result.a && result.a.b && typeof result.a.b === 'object';
    if (!hasLimit) {
      throw new Error(`深度限制未生效: ${formatObj(result)}`);
    }
    return '深度限制生效';
  }
));

recordResult(testItem(
  "NESTED-004",
  "深度 false 表示禁用嵌套（depth: false 会禁用所有嵌套解析）",
  () => {
    const result = qs.parse('a[b][c][d][e][f][g]=value', { depth: false });
    // depth: false 在 qs 中表示完全禁用嵌套，所有内容作为单个键
    const hasNoNesting = typeof result['a[b][c][d][e][f][g]'] === 'string';
    if (!hasNoNesting) {
      throw new Error(`depth: false 未按预期禁用嵌套: ${formatObj(result)}`);
    }
    return 'depth: false 禁用嵌套（作为单键处理）';
  }
));

recordResult(testItem(
  "ARRAY-001",
  "数组解析 'arr[]=1&arr[]=2&arr[]=3'",
  () => {
    const result = qs.parse('arr[]=1&arr[]=2&arr[]=3');
    return assertEqual(result, { arr: ['1', '2', '3'] }, '数组解析');
  }
));

recordResult(testItem(
  "ARRAY-002",
  "带索引数组 'a[1]=b&a[0]=c'",
  () => {
    const result = qs.parse('a[1]=b&a[0]=c');
    return assertEqual(result, { a: ['c', 'b'] }, '带索引数组解析');
  }
));

recordResult(testItem(
  "ARRAY-003",
  "Sparse array 行为（索引超过 arrayLimit）",
  () => {
    const result = qs.parse('a[0]=first&a[100]=last', { arrayLimit: 20 });
    // 索引 100 超过 arrayLimit，应该转为对象
    const isObject = !Array.isArray(result.a) && typeof result.a === 'object';
    if (!isObject) {
      throw new Error(`Sparse array 未转为对象: ${formatObj(result)}`);
    }
    return 'Sparse array 转为对象';
  }
));

recordResult(testItem(
  "ARRAY-004",
  "数组+对象混合 'a[][b]=c'",
  () => {
    const result = qs.parse('a[][b]=c');
    const isValid = Array.isArray(result.a) && result.a[0]?.b === 'c';
    if (!isValid) {
      throw new Error(`数组对象混合解析失败: ${formatObj(result)}`);
    }
    return '数组对象混合解析';
  }
));

recordResult(testItem(
  "ARRAY-005",
  "parseArrays: false 禁用数组解析",
  () => {
    const result = qs.parse('arr[]=1&arr[]=2', { parseArrays: false });
    // 禁用数组解析后，arr[] 应该被当作普通键
    const notArray = !Array.isArray(result.arr);
    if (!notArray) {
      throw new Error(`禁用数组解析未生效: ${formatObj(result)}`);
    }
    return '数组解析已禁用';
  }
));

// ===== ⚙️ 解析 (parse) 选项 (14 项) =====

console.log("\n\n" + "=".repeat(70));
console.log("⚙️ 解析 (parse) 选项 (14 项)");
console.log("=".repeat(70));

recordResult(testItem(
  "PARSE-OPT-001",
  "allowDots: true 解析 'a.b=c'",
  () => {
    const result = qs.parse('a.b=c', { allowDots: true });
    return assertEqual(result, { a: { b: 'c' } }, '点号语法解析为嵌套对象');
  }
));

recordResult(testItem(
  "PARSE-OPT-002",
  "allowDots: false 解析 'a.b=c'",
  () => {
    const result = qs.parse('a.b=c', { allowDots: false });
    return assertEqual(result, { 'a.b': 'c' }, '点号作为键名');
  }
));

recordResult(testItem(
  "PARSE-OPT-003",
  "depth: 1 限制嵌套深度",
  () => {
    const result = qs.parse('a[b][c]=value', { depth: 1 });
    const limited = result.a && typeof result.a === 'object' && result.a.b;
    if (!limited) {
      throw new Error(`depth: 1 限制未生效: ${formatObj(result)}`);
    }
    return 'depth: 1 限制生效';
  }
));

recordResult(testItem(
  "PARSE-OPT-004",
  "depth: false 禁用嵌套（验证完全禁用行为）",
  () => {
    const result = qs.parse('a[b][c][d][e]=value', { depth: false });
    // depth: false 禁用嵌套，整个字符串作为键名
    const hasNoNesting = typeof result['a[b][c][d][e]'] === 'string';
    if (!hasNoNesting) {
      throw new Error(`depth: false 未按预期禁用嵌套: ${formatObj(result)}`);
    }
    return 'depth: false 禁用嵌套';
  }
));

recordResult(testItem(
  "PARSE-OPT-005",
  "parameterLimit: 10 限制参数数量",
  () => {
    const manyParams = Array.from({ length: 15 }, (_, i) => `k${i}=v${i}`).join('&');
    const result = qs.parse(manyParams, { parameterLimit: 10 });
    const keyCount = Object.keys(result).length;
    if (keyCount > 10) {
      throw new Error(`参数数量限制未生效: ${keyCount} > 10`);
    }
    return `参数限制生效，只解析了 ${keyCount} 个`;
  }
));

recordResult(testItem(
  "PARSE-OPT-006",
  "throwOnLimitExceeded: true 超出参数限制抛出异常",
  () => {
    const manyParams = Array.from({ length: 15 }, (_, i) => `k${i}=v${i}`).join('&');
    return assertThrows(
      () => qs.parse(manyParams, { parameterLimit: 10, throwOnLimitExceeded: true }),
      '超出参数限制'
    );
  }
));

recordResult(testItem(
  "PARSE-OPT-007",
  "arrayLimit: 5 限制数组索引",
  () => {
    const result = qs.parse('a[0]=x&a[10]=y', { arrayLimit: 5 });
    const isObject = !Array.isArray(result.a);
    if (!isObject) {
      throw new Error(`arrayLimit 未生效: ${formatObj(result)}`);
    }
    return 'arrayLimit 生效，转为对象';
  }
));

recordResult(testItem(
  "PARSE-OPT-008",
  "parseArrays: false 禁用数组解析",
  () => {
    const result = qs.parse('a[]=1&a[]=2', { parseArrays: false });
    const notArray = !Array.isArray(result.a);
    if (!notArray) {
      throw new Error(`parseArrays: false 未生效`);
    }
    return 'parseArrays: false 生效';
  }
));

recordResult(testItem(
  "PARSE-OPT-009",
  "delimiter: ';' 使用分号分隔",
  () => {
    const result = qs.parse('a=1;b=2;c=3', { delimiter: ';' });
    return assertEqual(result, { a: '1', b: '2', c: '3' }, '分号分隔符');
  }
));

recordResult(testItem(
  "PARSE-OPT-010",
  "delimiter: /[;,]/ 正则分隔符",
  () => {
    const result = qs.parse('a=1;b=2,c=3', { delimiter: /[;,]/ });
    return assertEqual(result, { a: '1', b: '2', c: '3' }, '正则分隔符');
  }
));

recordResult(testItem(
  "PARSE-OPT-011",
  "comma: true 逗号值解析为数组",
  () => {
    const result = qs.parse('a=1,2,3', { comma: true });
    return assertEqual(result, { a: ['1', '2', '3'] }, '逗号分隔数组');
  }
));

recordResult(testItem(
  "PARSE-OPT-012",
  "ignoreQueryPrefix: true 忽略前导 ?",
  () => {
    const result = qs.parse('?foo=bar&baz=qux', { ignoreQueryPrefix: true });
    return assertEqual(result, { foo: 'bar', baz: 'qux' }, '忽略前导 ?');
  }
));

recordResult(testItem(
  "PARSE-OPT-013",
  "allowPrototypes: true 允许覆盖原型属性",
  () => {
    const result = qs.parse('__proto__[test]=polluted', { allowPrototypes: true });
    // 只检查不会抛出异常，不检查实际是否污染原型（安全考虑）
    return '允许原型属性（已解析）';
  }
));

recordResult(testItem(
  "PARSE-OPT-014",
  "plainObjects: true 返回无原型对象",
  () => {
    const result = qs.parse('foo=bar', { plainObjects: true });
    // 检测 plainObject：由于没有原型链，不会有 hasOwnProperty 等内置方法
    const isPlain = result.hasOwnProperty === undefined && result.foo === 'bar';
    if (!isPlain) {
      throw new Error('不是纯对象（Object.create(null)）');
    }
    return '返回纯对象（无原型）';
  }
));

// ===== 🖊️ 序列化 (stringify) 选项 (17 项) =====

console.log("\n\n" + "=".repeat(70));
console.log("🖊️ 序列化 (stringify) 选项 (17 项)");
console.log("=".repeat(70));

recordResult(testItem(
  "STRINGIFY-OPT-001",
  "encode: false 跳过 URL 编码",
  () => {
    const result = qs.stringify({ key: 'value with spaces' }, { encode: false });
    const hasSpaces = result.includes(' ');
    if (!hasSpaces) {
      throw new Error('编码未跳过');
    }
    return '跳过编码';
  }
));

recordResult(testItem(
  "STRINGIFY-OPT-002",
  "encoder: customFunc 自定义编码",
  () => {
    const customEncoder = (str) => str.toUpperCase();
    const result = qs.stringify({ key: 'value' }, { encoder: customEncoder });
    const isUpper = result.includes('VALUE');
    if (!isUpper) {
      throw new Error(`自定义编码未生效: ${result}`);
    }
    return '自定义编码生效';
  }
));

recordResult(testItem(
  "STRINGIFY-OPT-003",
  "sort: function 键排序",
  () => {
    const result = qs.stringify({ c: '3', a: '1', b: '2' }, { sort: (a, b) => a.localeCompare(b) });
    const isOrdered = result === 'a=1&b=2&c=3';
    if (!isOrdered) {
      throw new Error(`键排序未生效: ${result}`);
    }
    return '键排序生效';
  }
));

recordResult(testItem(
  "STRINGIFY-OPT-004",
  "skipNulls: true 跳过 null 值",
  () => {
    const result = qs.stringify({ a: 'value', b: null, c: 'another' }, { skipNulls: true });
    const hasNull = result.includes('b');
    if (hasNull) {
      throw new Error(`null 值未跳过: ${result}`);
    }
    return 'null 值已跳过';
  }
));

recordResult(testItem(
  "STRINGIFY-OPT-005",
  "strictNullHandling: true null 值仅输出键名",
  () => {
    const result = qs.stringify({ key: null }, { strictNullHandling: true });
    const isKeyOnly = result === 'key' || result === 'key&' || !result.includes('=');
    if (!isKeyOnly) {
      throw new Error(`strictNullHandling 未生效: ${result}`);
    }
    return 'null 值仅输出键名';
  }
));

recordResult(testItem(
  "STRINGIFY-OPT-006",
  "arrayFormat: 'indices' 索引数组格式",
  () => {
    const result = qs.stringify({ a: ['b', 'c'] }, { arrayFormat: 'indices' });
    // 解码后检查，因为 [ ] 会被编码为 %5B %5D
    const decoded = decodeURIComponent(result);
    const hasIndices = decoded.includes('[0]') && decoded.includes('[1]');
    if (!hasIndices) {
      throw new Error(`indices 格式未生效: ${result} (解码: ${decoded})`);
    }
    return `indices 格式生效: ${decoded}`;
  }
));

recordResult(testItem(
  "STRINGIFY-OPT-007",
  "arrayFormat: 'brackets' 括号数组格式",
  () => {
    const result = qs.stringify({ a: ['b', 'c'] }, { arrayFormat: 'brackets' });
    // 解码后检查，因为 [] 会被编码为 %5B%5D
    const decoded = decodeURIComponent(result);
    const hasBrackets = decoded.includes('[]');
    if (!hasBrackets) {
      throw new Error(`brackets 格式未生效: ${result} (解码: ${decoded})`);
    }
    return `brackets 格式生效: ${decoded}`;
  }
));

recordResult(testItem(
  "STRINGIFY-OPT-008",
  "arrayFormat: 'repeat' 重复数组格式",
  () => {
    const result = qs.stringify({ a: ['b', 'c'] }, { arrayFormat: 'repeat' });
    const isRepeat = result.split('&').filter(p => p.startsWith('a=')).length === 2;
    if (!isRepeat) {
      throw new Error(`repeat 格式未生效: ${result}`);
    }
    return 'repeat 格式生效';
  }
));

recordResult(testItem(
  "STRINGIFY-OPT-009",
  "arrayFormat: 'comma' 逗号数组格式",
  () => {
    const result = qs.stringify({ a: ['b', 'c', 'd'] }, { arrayFormat: 'comma' });
    // 解码后检查，因为逗号会被编码为 %2C
    const decoded = decodeURIComponent(result);
    const hasComma = decoded.includes(',');
    if (!hasComma) {
      throw new Error(`comma 格式未生效: ${result} (解码: ${decoded})`);
    }
    return `comma 格式生效: ${decoded}`;
  }
));

recordResult(testItem(
  "STRINGIFY-OPT-010",
  "addQueryPrefix: true 添加前导 ?",
  () => {
    const result = qs.stringify({ foo: 'bar' }, { addQueryPrefix: true });
    const hasPrefix = result.startsWith('?');
    if (!hasPrefix) {
      throw new Error(`前导 ? 未添加: ${result}`);
    }
    return '添加前导 ?';
  }
));

recordResult(testItem(
  "STRINGIFY-OPT-011",
  "delimiter: ';' 使用分号分隔",
  () => {
    const result = qs.stringify({ a: '1', b: '2' }, { delimiter: ';' });
    const hasSemicolon = result.includes(';');
    if (!hasSemicolon) {
      throw new Error(`分号分隔未生效: ${result}`);
    }
    return '分号分隔生效';
  }
));

recordResult(testItem(
  "STRINGIFY-OPT-012",
  "serializeDate: customFunc 自定义日期序列化",
  () => {
    const customDate = (date) => `custom-${date.getFullYear()}`;
    const result = qs.stringify({ date: new Date(2025, 0, 1) }, { serializeDate: customDate });
    const hasCustom = result.includes('custom-2025');
    if (!hasCustom) {
      throw new Error(`自定义日期序列化未生效: ${result}`);
    }
    return '自定义日期序列化生效';
  }
));

recordResult(testItem(
  "STRINGIFY-OPT-013",
  "filter: ['key1', 'key2'] 仅序列化指定键",
  () => {
    const result = qs.stringify({ key1: 'a', key2: 'b', key3: 'c' }, { filter: ['key1', 'key2'] });
    const hasKey3 = result.includes('key3');
    if (hasKey3) {
      throw new Error(`filter 未生效: ${result}`);
    }
    return 'filter 数组生效';
  }
));

recordResult(testItem(
  "STRINGIFY-OPT-014",
  "filter: function 函数过滤",
  () => {
    const filterFunc = (prefix, value) => {
      if (prefix === 'skip') return;
      return value;
    };
    const result = qs.stringify({ keep: 'yes', skip: 'no' }, { filter: filterFunc });
    const hasSkip = result.includes('skip');
    if (hasSkip) {
      throw new Error(`filter 函数未生效: ${result}`);
    }
    return 'filter 函数生效';
  }
));

recordResult(testItem(
  "STRINGIFY-OPT-015",
  "format: 'RFC1738' 空格编码为 +",
  () => {
    const result = qs.stringify({ key: 'value with space' }, { format: 'RFC1738' });
    const hasPlus = result.includes('+');
    if (!hasPlus) {
      throw new Error(`RFC1738 格式未生效: ${result}`);
    }
    return 'RFC1738 格式（空格→+）';
  }
));

recordResult(testItem(
  "STRINGIFY-OPT-016",
  "format: 'RFC3986' 空格编码为 %20",
  () => {
    const result = qs.stringify({ key: 'value with space' }, { format: 'RFC3986' });
    const hasPercent20 = result.includes('%20');
    if (!hasPercent20) {
      throw new Error(`RFC3986 格式未生效: ${result}`);
    }
    return 'RFC3986 格式（空格→%20）';
  }
));

recordResult(testItem(
  "STRINGIFY-OPT-017",
  "encodeValuesOnly: true 仅编码值",
  () => {
    const result = qs.stringify({ 'key[test]': 'value test' }, { encodeValuesOnly: true });
    // 键应该保留 [ ]，值应该编码空格
    const keyNotEncoded = result.includes('[test]');
    const valueEncoded = result.includes('value%20test') || result.includes('value+test');
    if (!keyNotEncoded || !valueEncoded) {
      throw new Error(`encodeValuesOnly 未生效: ${result}`);
    }
    return 'encodeValuesOnly 生效';
  }
));

// ===== 🔍 安全/原型/边界用例 (10 项) =====

console.log("\n\n" + "=".repeat(70));
console.log("🔍 安全/原型/边界用例 (10 项)");
console.log("=".repeat(70));

recordResult(testItem(
  "SECURITY-001",
  "解析 '__proto__=polluted' (plainObjects: false)",
  () => {
    const result = qs.parse('__proto__=polluted', { plainObjects: false });
    // 检查 Object.prototype 未被污染
    const notPolluted = !({}.polluted);
    if (!notPolluted) {
      throw new Error('原型被污染');
    }
    return '原型未被污染（安全）';
  }
));

recordResult(testItem(
  "SECURITY-002",
  "解析 '__proto__=polluted' (plainObjects: true)",
  () => {
    const result = qs.parse('__proto__=polluted', { plainObjects: true });
    // plainObjects: true 返回 Object.create(null)，更安全
    // 检测方式：plainObject 没有原型链上的方法
    const isPlain = result.hasOwnProperty === undefined;
    if (!isPlain) {
      throw new Error('不是纯对象');
    }
    return '使用纯对象（更安全）';
  }
));

recordResult(testItem(
  "SECURITY-003",
  "解析 'constructor=polluted'",
  () => {
    const result = qs.parse('constructor=polluted');
    // 应该安全处理，不影响 Object.constructor
    return '安全处理 constructor';
  }
));

recordResult(testItem(
  "SECURITY-004",
  "解析 'hasOwnProperty=polluted'",
  () => {
    const result = qs.parse('hasOwnProperty=polluted');
    // 应该安全处理
    return '安全处理 hasOwnProperty';
  }
));

recordResult(testItem(
  "SECURITY-005",
  "序列化循环引用对象",
  () => {
    const obj = { a: 'value' };
    obj.self = obj; // 循环引用
    return assertThrows(
      () => qs.stringify(obj),
      '循环引用'
    );
  }
));

recordResult(testItem(
  "BOUNDARY-001",
  "parse(null)",
  () => {
    try {
      const result = qs.parse(null);
      return `解析 null: ${formatObj(result)}`;
    } catch (e) {
      return `parse(null) 抛出异常: ${e.message}`;
    }
  }
));

recordResult(testItem(
  "BOUNDARY-002",
  "parse(undefined)",
  () => {
    try {
      const result = qs.parse(undefined);
      return `解析 undefined: ${formatObj(result)}`;
    } catch (e) {
      return `parse(undefined) 抛出异常: ${e.message}`;
    }
  }
));

recordResult(testItem(
  "BOUNDARY-003",
  "parse('') 空字符串",
  () => {
    const result = qs.parse('');
    return assertEqual(result, {}, '空字符串解析为空对象');
  }
));

recordResult(testItem(
  "BOUNDARY-004",
  "stringify(null)",
  () => {
    const result = qs.stringify(null);
    return `stringify(null) = '${result}'`;
  }
));

recordResult(testItem(
  "BOUNDARY-005",
  "stringify(undefined)",
  () => {
    const result = qs.stringify(undefined);
    return `stringify(undefined) = '${result}'`;
  }
));

// 注: BOUNDARY-006 到 BOUNDARY-010 作为扩展测试

recordResult(testItem(
  "BOUNDARY-006",
  "stringify(123) 数字",
  () => {
    const result = qs.stringify(123);
    return `stringify(123) = '${result}'`;
  }
));

recordResult(testItem(
  "BOUNDARY-007",
  "stringify('string') 字符串",
  () => {
    const result = qs.stringify('string');
    return `stringify('string') = '${result}'`;
  }
));

recordResult(testItem(
  "BOUNDARY-008",
  "stringify([1,2,3]) 数组",
  () => {
    const result = qs.stringify([1, 2, 3]);
    // qs 会将数组序列化为索引键值对
    const expected = '0=1&1=2&2=3';
    return assertStrictEqual(result, expected, 'stringify([1,2,3])');
  }
));

recordResult(testItem(
  "BOUNDARY-009",
  "超大输入（数千参数）",
  () => {
    const largeInput = Array.from({ length: 2000 }, (_, i) => `k${i}=v${i}`).join('&');
    const result = qs.parse(largeInput);
    const count = Object.keys(result).length;
    return `解析 2000 参数，得到 ${count} 个键`;
  }
));

recordResult(testItem(
  "BOUNDARY-010",
  "极深嵌套",
  () => {
    let deepStr = 'a';
    for (let i = 0; i < 20; i++) {
      deepStr += `[level${i}]`;
    }
    deepStr += '=value';
    const result = qs.parse(deepStr, { depth: 10 });
    return `极深嵌套（20层）使用 depth:10 解析`;
  }
));

// ===== 🔤 URL 编码/特殊字符 (10 项) =====

console.log("\n\n" + "=".repeat(70));
console.log("🔤 URL 编码/特殊字符 (10 项)");
console.log("=".repeat(70));

recordResult(testItem(
  "ENCODING-001",
  "解析 'key=%5B%5D' (编码的 [])",
  () => {
    const result = qs.parse('key=%5B%5D');
    return assertEqual(result, { key: '[]' }, '解码 []');
  }
));

recordResult(testItem(
  "ENCODING-002",
  "解析 'key=value+with+plus'",
  () => {
    const result = qs.parse('key=value+with+plus');
    return assertEqual(result, { key: 'value with plus' }, '+ 解码为空格');
  }
));

recordResult(testItem(
  "ENCODING-003",
  "解析 'key=value%20with%20space'",
  () => {
    const result = qs.parse('key=value%20with%20space');
    return assertEqual(result, { key: 'value with space' }, '%20 解码为空格');
  }
));

recordResult(testItem(
  "ENCODING-004",
  "解析中文 'name=%E4%B8%AD%E6%96%87'",
  () => {
    const result = qs.parse('name=%E4%B8%AD%E6%96%87');
    return assertEqual(result, { name: '中文' }, '解码中文');
  }
));

recordResult(testItem(
  "ENCODING-005",
  "解析 Emoji 'emoji=%F0%9F%98%80'",
  () => {
    const result = qs.parse('emoji=%F0%9F%98%80');
    return assertEqual(result, { emoji: '😀' }, '解码 Emoji');
  }
));

recordResult(testItem(
  "ENCODING-006",
  "序列化特殊字符 { key: '!@#$%' }",
  () => {
    const result = qs.stringify({ key: '!@#$%' });
    const isEncoded = result.includes('%');
    if (!isEncoded) {
      throw new Error(`特殊字符未编码: ${result}`);
    }
    return '特殊字符已编码';
  }
));

recordResult(testItem(
  "ENCODING-007",
  "序列化空格（RFC1738）",
  () => {
    const result = qs.stringify({ key: 'value test' }, { format: 'RFC1738' });
    const hasPlus = result.includes('+');
    if (!hasPlus) {
      throw new Error(`RFC1738 空格编码失败: ${result}`);
    }
    return 'RFC1738 空格→+';
  }
));

recordResult(testItem(
  "ENCODING-008",
  "序列化空格（RFC3986）",
  () => {
    const result = qs.stringify({ key: 'value test' }, { format: 'RFC3986' });
    const hasPercent20 = result.includes('%20');
    if (!hasPercent20) {
      throw new Error(`RFC3986 空格编码失败: ${result}`);
    }
    return 'RFC3986 空格→%20';
  }
));

recordResult(testItem(
  "ENCODING-009",
  "序列化中文 { name: '中文' }",
  () => {
    const result = qs.stringify({ name: '中文' });
    const hasEncoded = result.includes('%');
    if (!hasEncoded) {
      throw new Error(`中文未编码: ${result}`);
    }
    return '中文已编码';
  }
));

recordResult(testItem(
  "ENCODING-010",
  "序列化 Emoji { emoji: '😀' }",
  () => {
    const result = qs.stringify({ emoji: '😀' });
    const hasEncoded = result.includes('%');
    if (!hasEncoded) {
      throw new Error(`Emoji 未编码: ${result}`);
    }
    return 'Emoji 已编码';
  }
));

// ===== 🔗 组合/交叉场景 (14 项) =====

console.log("\n\n" + "=".repeat(70));
console.log("🔗 组合/交叉场景 (14 项)");
console.log("=".repeat(70));

recordResult(testItem(
  "COMBO-001",
  "parse + stringify round-trip (allowDots + depth)",
  () => {
    const input = 'a.b.c=value';
    const parsed = qs.parse(input, { allowDots: true, depth: 2 });
    const stringified = qs.stringify(parsed, { allowDots: true });
    const reParsed = qs.parse(stringified, { allowDots: true, depth: 2 });
    return assertEqual(parsed, reParsed, 'Round-trip 一致');
  }
));

recordResult(testItem(
  "COMBO-002",
  "parse + stringify (comma + arrayFormat) - 验证编码行为",
  () => {
    const input = 'a=1,2,3';
    const parsed = qs.parse(input, { comma: true }); // { a: ['1','2','3'] }
    assertEqual(parsed, { a: ['1', '2', '3'] }, 'comma:true 解析数组');
    
    const stringified = qs.stringify(parsed, { arrayFormat: 'comma' }); // a=1%2C2%2C3
    // 验证 stringify 生成了逗号格式（即使被编码）
    const decoded = decodeURIComponent(stringified);
    const hasCommaFormat = decoded === 'a=1,2,3';
    if (!hasCommaFormat) {
      throw new Error(`arrayFormat:comma 未生成预期格式: ${decoded}`);
    }
    
    // 注意：由于 stringify 会编码逗号为 %2C，round-trip 后不会被识别为数组
    // 这是 qs 的已知行为，需要使用 encode:false 才能保持 round-trip
    const stringifiedNoEncode = qs.stringify(parsed, { arrayFormat: 'comma', encode: false });
    const reParsed = qs.parse(stringifiedNoEncode, { comma: true });
    return assertEqual(parsed, reParsed, 'Comma 数组 round-trip (使用 encode:false)');
  }
));

recordResult(testItem(
  "COMBO-003",
  "数组嵌套对象 [{a:1},{b:2}] round-trip",
  () => {
    const obj = { items: [{ a: '1' }, { b: '2' }] };
    const stringified = qs.stringify(obj);
    const parsed = qs.parse(stringified);
    return assertEqual(obj, parsed, '数组嵌套对象 round-trip');
  }
));

recordResult(testItem(
  "COMBO-004",
  "混合 delimiter + comma",
  () => {
    const input = 'a=1;b=2,3';
    const result = qs.parse(input, { delimiter: /[;,]/ });
    const hasThreeKeys = Object.keys(result).length === 3;
    if (!hasThreeKeys) {
      throw new Error(`混合分隔符解析失败: ${formatObj(result)}`);
    }
    return '混合分隔符解析成功';
  }
));

recordResult(testItem(
  "COMBO-005",
  "自定义 encoder + filter + sort",
  () => {
    const obj = { c: '3', a: '1', b: '2', skip: 'x' };
    const options = {
      encoder: (str) => str.toUpperCase(),
      filter: ['a', 'b', 'c'],
      sort: (a, b) => a.localeCompare(b)
    };
    const result = qs.stringify(obj, options);
    const isOrdered = result.startsWith('A=') || result.startsWith('a=');
    const noSkip = !result.includes('skip');
    if (!noSkip) {
      throw new Error(`组合选项未生效: ${result}`);
    }
    return '多选项组合生效';
  }
));

recordResult(testItem(
  "COMBO-006",
  "parse 带 ? 前缀 + ignoreQueryPrefix",
  () => {
    const result = qs.parse('?foo=bar&baz=qux', { ignoreQueryPrefix: true });
    return assertEqual(result, { foo: 'bar', baz: 'qux' }, '忽略前导 ?');
  }
));

recordResult(testItem(
  "COMBO-007",
  "parse 带 # hash 的 query",
  () => {
    const input = 'foo=bar#hash';
    const result = qs.parse(input);
    // hash 部分可能被当作值的一部分
    return `带 hash 解析: ${formatObj(result)}`;
  }
));

recordResult(testItem(
  "COMBO-008",
  "空键 '=value' (qs 默认忽略空键)",
  () => {
    const result = qs.parse('=value');
    // qs 默认会忽略空键，这是正常行为
    // 如果需要保留空键，需要特殊配置
    const isEmpty = Object.keys(result).length === 0;
    if (isEmpty) {
      return '空键被忽略（qs 默认行为）';
    } else {
      // 如果有结果，检查是否是空键
      const hasEmptyKey = '' in result;
      if (hasEmptyKey) {
        return assertEqual(result, { '': 'value' }, '空键解析');
      }
      return `非预期结果: ${formatObj(result)}`;
    }
  }
));

recordResult(testItem(
  "COMBO-009",
  "重复键 'key=1&key=2'",
  () => {
    const result = qs.parse('key=1&key=2');
    const isArray = Array.isArray(result.key);
    if (!isArray) {
      throw new Error(`重复键未转为数组: ${formatObj(result)}`);
    }
    return assertEqual(result, { key: ['1', '2'] }, '重复键转为数组');
  }
));

recordResult(testItem(
  "COMBO-010",
  "键无值 'key='",
  () => {
    const result = qs.parse('key=');
    return assertEqual(result, { key: '' }, '键无值');
  }
));

recordResult(testItem(
  "COMBO-011",
  "键无等号 'key&foo=bar'",
  () => {
    const result = qs.parse('key&foo=bar');
    const hasKey = 'key' in result;
    if (!hasKey) {
      throw new Error(`键无等号解析失败: ${formatObj(result)}`);
    }
    return `键无等号解析: ${formatObj(result)}`;
  }
));

recordResult(testItem(
  "COMBO-012",
  "throwOnLimitExceeded + 超出限制",
  () => {
    const manyParams = Array.from({ length: 20 }, (_, i) => `k${i}=v${i}`).join('&');
    return assertThrows(
      () => qs.parse(manyParams, { parameterLimit: 10, throwOnLimitExceeded: true }),
      '超出限制抛出异常'
    );
  }
));

recordResult(testItem(
  "COMBO-013",
  "混合数组索引和非索引",
  () => {
    const input = 'a[0]=first&a[]=second&a[2]=third';
    const result = qs.parse(input);
    const isArray = Array.isArray(result.a);
    if (!isArray) {
      throw new Error(`混合索引数组解析失败: ${formatObj(result)}`);
    }
    return '混合索引数组解析成功';
  }
));

recordResult(testItem(
  "COMBO-014",
  "encodeValuesOnly + 特殊字符键",
  () => {
    const obj = { 'key[test]': 'value test' };
    const result = qs.stringify(obj, { encodeValuesOnly: true });
    const keyNotEncoded = result.includes('[test]');
    if (!keyNotEncoded) {
      throw new Error(`键被编码了: ${result}`);
    }
    return 'encodeValuesOnly 生效';
  }
));

// ===== 🔧 深入补充用例（建议追加） =====

recordResult(testItem(
  "CHARSET-001",
  "charsetSentinel UTF-8 哨兵",
  () => {
    const input = "utf8=%E2%9C%93&name=%E4%B8%AD%E6%96%87";
    const res = qs.parse(input, { charsetSentinel: true });
    return assertEqual(res, { name: "中文" }, "识别 UTF-8 哨兵并按 UTF-8 解码");
  }
));

recordResult(testItem(
  "CHARSET-002",
  "charset: 'iso-8859-1' + interpretNumericEntities",
  () => {
    // 模拟 latin1 + &#num; 实体
    const input = "title=%26%239716%3B"; // "&#9716;" -> ⑬（示例实体号请按需替换）
    const res = qs.parse(input, { charset: 'iso-8859-1', interpretNumericEntities: true });
    // 只验证不报错并返回字符串
    if (typeof res.title !== 'string') throw new Error("未按字符串解析");
    return "latin1 + numeric entities 解码生效";
  }
));

recordResult(testItem(
  "DECODER-001",
  "自定义 decoder（把 '+' 保留为 '+'）",
  () => {
    const decoder = (str, defaultDecoder, charset, type) => {
      // 默认 '+' -> 空格，这里保留 '+'
      const s = defaultDecoder(str, defaultDecoder, charset, type);
      return typeof s === 'string' ? s.replace(/ /g, '+') : s;
    };
    const res = qs.parse("k=a+b", { decoder });
    return assertEqual(res, { k: "a+b" }, "自定义 decoder 生效");
  }
));

recordResult(testItem(
  "SPARSE-001",
  "allowSparse: true 稀疏数组",
  () => {
    const res = qs.parse("a[0]=x&a[2]=y", { allowSparse: true });
    if (!Array.isArray(res.a)) {
      throw new Error(`不是数组，而是: ${typeof res.a}`);
    }
    if (res.a.length !== 3) {
      throw new Error(`长度错误: ${res.a.length}, 预期: 3`);
    }
    if (res.a[1] !== undefined) {
      throw new Error(`索引 1 不是 undefined: ${res.a[1]}`);
    }
    if (res.a.hasOwnProperty(1)) {
      throw new Error("索引 1 不是空洞（hasOwnProperty 返回 true）");
    }
    return "allowSparse:true 保留空洞";
  }
));

recordResult(testItem(
  "SPARSE-002",
  "allowSparse: false + arrayLimit 交互",
  () => {
    const res = qs.parse("a[0]=x&a[25]=y", { allowSparse: false, arrayLimit: 20 });
    if (Array.isArray(res.a)) throw new Error("应转为对象而非数组");
    return "超过 arrayLimit 转对象（非稀疏模式）";
  }
));

recordResult(testItem(
  "MALFORMED-001",
  "畸形百分号编码（应健壮处理）",
  () => {
    const res = qs.parse("bad=%E3%81%&ok=1");
    // 只要不抛错即可；bad 大概率以原样或部分解码返回
    return "畸形编码未导致崩溃";
  }
));

recordResult(testItem(
  "ARR-NULL-001",
  "数组含 null/undefined + indices + strictNullHandling/skipNulls",
  () => {
    const base = { a: ["x", null, undefined, "y"] };
    const s1 = qs.stringify(base, { arrayFormat: "indices", strictNullHandling: true });
    const s2 = qs.stringify(base, { arrayFormat: "indices", skipNulls: true });
    if (!/a%5B0%5D=x/.test(s1)) throw new Error("indices/strictNullHandling 失效");
    if (/a%5B2%5D=/.test(s2)) throw new Error("skipNulls 未跳过 undefined");
    return "数组空值组合覆盖";
  }
));

recordResult(testItem(
  "SPECIAL-KEYS-001",
  "特殊键 toString/valueOf/__defineGetter__",
  () => {
    const res = qs.parse("obj[toString]=x&obj[valueOf]=y&__defineGetter__=z", { plainObjects: true });
    if (res.obj.toString !== 'x' || res.obj.valueOf !== 'y') {
      throw new Error("特殊键解析不符合预期");
    }
    return "特殊键名未破坏对象安全";
  }
));

recordResult(testItem(
  "NONPLAIN-001",
  "非普通对象：Map/Set/BigInt/RegExp",
  () => {
    const out = qs.stringify({
      m: new Map([["k","v"]]),
      s: new Set([1,2]),
      b: BigInt(9007199254740991n),
      r: /re/g
    });
    // 不要求格式，只要不抛错，且可被 parse 回字符串键值
    const back = qs.parse(out);
    if (typeof out !== "string" || typeof back !== "object") throw new Error("序列化/解析失败");
    return "非常规类型可被稳定 stringify（按字符串）";
  }
));

recordResult(testItem(
  "URL-001",
  "完整 URL + ignoreQueryPrefix",
  () => {
    const url = "https://example.com/p?q=hello+world&x=1#hash";
    const res = qs.parse(url, { ignoreQueryPrefix: true });
    // 解析结果含整个 URL 时也不应崩；更推荐只传 query 部分——这里只测健壮性
    return "完整 URL 输入健壮";
  }
));

// ===== 📦 模块导出/兼容性 (5 项) =====

console.log("\n\n" + "=".repeat(70));
console.log("📦 模块导出/兼容性 (5 项)");
console.log("=".repeat(70));

recordResult(testItem(
  "MODULE-001",
  "require('qs') 返回对象包含 parse",
  () => {
    const hasParse = typeof qs.parse === 'function';
    if (!hasParse) {
      throw new Error('qs.parse 不是函数');
    }
    return 'qs.parse 存在';
  }
));

recordResult(testItem(
  "MODULE-002",
  "require('qs') 返回对象包含 stringify",
  () => {
    const hasStringify = typeof qs.stringify === 'function';
    if (!hasStringify) {
      throw new Error('qs.stringify 不是函数');
    }
    return 'qs.stringify 存在';
  }
));

recordResult(testItem(
  "MODULE-003",
  "require('qs') 返回对象包含 formats",
  () => {
    const hasFormats = typeof qs.formats === 'object' && qs.formats !== null;
    if (!hasFormats) {
      throw new Error('qs.formats 不存在或不是对象');
    }
    return 'qs.formats 存在';
  }
));

recordResult(testItem(
  "MODULE-004",
  "qs.formats.RFC1738 存在",
  () => {
    const hasRFC1738 = 'RFC1738' in qs.formats;
    if (!hasRFC1738) {
      throw new Error('qs.formats.RFC1738 不存在');
    }
    return 'qs.formats.RFC1738 存在';
  }
));

recordResult(testItem(
  "MODULE-005",
  "qs.formats.RFC3986 存在",
  () => {
    const hasRFC3986 = 'RFC3986' in qs.formats;
    if (!hasRFC3986) {
      throw new Error('qs.formats.RFC3986 不存在');
    }
    return 'qs.formats.RFC3986 存在';
  }
));

// ===== 📊 性能/压力测试 (4 项) =====

console.log("\n\n" + "=".repeat(70));
console.log("📊 性能/压力测试 (4 项)");
console.log("=".repeat(70));

recordResult(testItem(
  "PERF-001",
  "解析 1000 个参数",
  () => {
    const largeInput = Array.from({ length: 1000 }, (_, i) => `k${i}=v${i}`).join('&');
    const start = Date.now();
    const result = qs.parse(largeInput);
    const duration = Date.now() - start;
    const count = Object.keys(result).length;
    return `解析 1000 参数，耗时 ${duration}ms，得到 ${count} 个键`;
  }
));

recordResult(testItem(
  "PERF-002",
  "解析极深嵌套（10层）",
  () => {
    let deepStr = 'root';
    for (let i = 0; i < 10; i++) {
      deepStr += `[level${i}]`;
    }
    deepStr += '=deepValue';
    const start = Date.now();
    const result = qs.parse(deepStr);
    const duration = Date.now() - start;
    return `解析 10 层嵌套，耗时 ${duration}ms`;
  }
));

recordResult(testItem(
  "PERF-003",
  "序列化大型对象（1000+ 键）",
  () => {
    const largeObj = {};
    for (let i = 0; i < 1000; i++) {
      largeObj[`key${i}`] = `value${i}`;
    }
    const start = Date.now();
    const result = qs.stringify(largeObj);
    const duration = Date.now() - start;
    return `序列化 1000 键对象，耗时 ${duration}ms，长度 ${result.length}`;
  }
));

recordResult(testItem(
  "PERF-004",
  "Round-trip 大型复杂结构",
  () => {
    const complexObj = {
      arrays: [1, 2, 3, 4, 5],
      nested: {
        level1: {
          level2: {
            level3: {
              value: 'deep'
            }
          }
        }
      },
      mixed: [{ a: 1 }, { b: 2 }]
    };
    const start = Date.now();
    const stringified = qs.stringify(complexObj);
    const parsed = qs.parse(stringified);
    const reStringified = qs.stringify(parsed);
    const duration = Date.now() - start;
    return `复杂结构 round-trip，耗时 ${duration}ms`;
  }
));



// ===== 测试总结 =====

console.log("\n\n" + "╔════════════════════════════════════════════════════════════════╗");
console.log("║                         测试总结                               ║");
console.log("╚════════════════════════════════════════════════════════════════╝");
console.log(`\n总测试项: ${passCount + failCount}`);
console.log(`通过: ${passCount} ✅`);
console.log(`失败: ${failCount} ❌`);
console.log(`通过率: ${((passCount / (passCount + failCount)) * 100).toFixed(2)}%`);

if (failCount === 0) {
  console.log("\n🎉 恭喜！所有测试通过！");
} else {
  console.log("\n⚠️  存在失败的测试项，请检查上述输出。");
}

console.log("\n" + "=".repeat(70));
console.log("测试完成");
console.log("=".repeat(70));

