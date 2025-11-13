const crypto = require('crypto');

console.log('========================================');
console.log('  Node.js crypto.randomUUID() 全面测试');
console.log('  Node.js 版本:', process.version);
console.log('========================================\n');

let testCount = 0;
let passCount = 0;
let failCount = 0;
const testResults = [];

function test(name, fn) {
  testCount++;
  const testNumber = testCount;
  try {
    console.log(`\n[测试 ${testNumber}] ${name}`);
    fn();
    passCount++;
    console.log('✅ 通过');
    testResults.push({
      number: testNumber,
      name: name,
      status: 'passed',
      error: null
    });
  } catch (e) {
    failCount++;
    console.log('❌ 失败:', e.message);
    testResults.push({
      number: testNumber,
      name: name,
      status: 'failed',
      error: e.message
    });
  }
}

// UUID v4 格式验证正则表达式
const uuidV4Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// ============ 1. 基本功能测试 ============
console.log('\n--- 1. 基本功能测试 ---');

test('1.1 无参数调用生成有效 UUID', () => {
  const uuid = crypto.randomUUID();
  if (typeof uuid !== 'string') {
    throw new Error(`应该返回字符串，实际为 ${typeof uuid}`);
  }
  if (uuid.length !== 36) {
    throw new Error(`UUID 长度应该是 36，实际为 ${uuid.length}`);
  }
  if (!uuidV4Regex.test(uuid)) {
    throw new Error(`UUID 格式不正确: ${uuid}`);
  }
});

test('1.2 返回字符串类型', () => {
  const uuid = crypto.randomUUID();
  if (typeof uuid !== 'string') {
    throw new Error(`期望 string 类型，实际为 ${typeof uuid}`);
  }
});

test('1.3 UUID 长度为 36 个字符', () => {
  const uuid = crypto.randomUUID();
  if (uuid.length !== 36) {
    throw new Error(`期望长度 36，实际为 ${uuid.length}`);
  }
});

test('1.4 符合 UUID v4 格式（正则验证）', () => {
  const uuid = crypto.randomUUID();
  if (!uuidV4Regex.test(uuid)) {
    throw new Error(`UUID 格式不符合 v4 规范: ${uuid}`);
  }
});

// ============ 2. UUID 格式验证测试 ============
console.log('\n--- 2. UUID 格式验证测试 ---');

test('2.1 版本号为 4（第 15 个字符）', () => {
  const uuid = crypto.randomUUID();
  const parts = uuid.split('-');
  const versionChar = parts[2][0];
  if (versionChar !== '4') {
    throw new Error(`版本号应该是 4，实际为 ${versionChar}`);
  }
});

test('2.2 变体位正确（第 20 个字符为 8/9/a/b）', () => {
  const uuid = crypto.randomUUID();
  const parts = uuid.split('-');
  const variantChar = parts[3][0].toLowerCase();
  if (!['8', '9', 'a', 'b'].includes(variantChar)) {
    throw new Error(`变体位应该是 8/9/a/b，实际为 ${variantChar}`);
  }
});

test('2.3 结构为 8-4-4-4-12 格式', () => {
  const uuid = crypto.randomUUID();
  const parts = uuid.split('-');
  if (parts.length !== 5) {
    throw new Error(`应该有 5 个部分，实际为 ${parts.length}`);
  }
  if (parts[0].length !== 8) {
    throw new Error(`第1部分长度应为 8，实际为 ${parts[0].length}`);
  }
  if (parts[1].length !== 4) {
    throw new Error(`第2部分长度应为 4，实际为 ${parts[1].length}`);
  }
  if (parts[2].length !== 4) {
    throw new Error(`第3部分长度应为 4，实际为 ${parts[2].length}`);
  }
  if (parts[3].length !== 4) {
    throw new Error(`第4部分长度应为 4，实际为 ${parts[3].length}`);
  }
  if (parts[4].length !== 12) {
    throw new Error(`第5部分长度应为 12，实际为 ${parts[4].length}`);
  }
});

test('2.4 仅包含十六进制字符和连字符', () => {
  const uuid = crypto.randomUUID();
  const withoutDashes = uuid.replace(/-/g, '');
  if (!/^[0-9a-f]+$/i.test(withoutDashes)) {
    throw new Error('UUID 包含非法字符');
  }
});

test('2.5 连字符位置正确', () => {
  const uuid = crypto.randomUUID();
  if (uuid[8] !== '-' || uuid[13] !== '-' || uuid[18] !== '-' || uuid[23] !== '-') {
    throw new Error(`连字符位置不正确: ${uuid}`);
  }
});

// ============ 3. UUID 唯一性测试 ============
console.log('\n--- 3. UUID 唯一性测试 ---');

test('3.1 连续生成 2 个 UUID 不相同', () => {
  const uuid1 = crypto.randomUUID();
  const uuid2 = crypto.randomUUID();
  if (uuid1 === uuid2) {
    throw new Error('连续生成的 UUID 相同');
  }
});

test('3.2 生成 1000 个 UUID 全部唯一', () => {
  const uuidSet = new Set();
  const count = 1000;
  for (let i = 0; i < count; i++) {
    uuidSet.add(crypto.randomUUID());
  }
  if (uuidSet.size !== count) {
    throw new Error(`生成了 ${count} 个 UUID，但只有 ${uuidSet.size} 个是唯一的`);
  }
});

test('3.3 生成 10000 个 UUID 全部唯一', () => {
  const uuidSet = new Set();
  const count = 10000;
  for (let i = 0; i < count; i++) {
    uuidSet.add(crypto.randomUUID());
  }
  if (uuidSet.size !== count) {
    throw new Error(`生成了 ${count} 个 UUID，但只有 ${uuidSet.size} 个是唯一的`);
  }
});

// ============ 4. 选项参数测试 ============
console.log('\n--- 4. 选项参数测试 ---');

test('4.1 disableEntropyCache: false 生成有效 UUID', () => {
  const uuid = crypto.randomUUID({ disableEntropyCache: false });
  if (!uuidV4Regex.test(uuid)) {
    throw new Error(`UUID 格式不正确: ${uuid}`);
  }
});

test('4.2 disableEntropyCache: true 生成有效 UUID', () => {
  const uuid = crypto.randomUUID({ disableEntropyCache: true });
  if (!uuidV4Regex.test(uuid)) {
    throw new Error(`UUID 格式不正确: ${uuid}`);
  }
});

test('4.3 空对象参数生成有效 UUID', () => {
  const uuid = crypto.randomUUID({});
  if (!uuidV4Regex.test(uuid)) {
    throw new Error(`UUID 格式不正确: ${uuid}`);
  }
});

test('4.4 未知选项应该被忽略', () => {
  const uuid = crypto.randomUUID({ unknownOption: 'value' });
  if (!uuidV4Regex.test(uuid)) {
    throw new Error('未知选项应该被忽略并正常生成 UUID');
  }
});

test('4.5 disableEntropyCache: false 生成的 UUID 唯一', () => {
  const uuids = [];
  for (let i = 0; i < 100; i++) {
    uuids.push(crypto.randomUUID({ disableEntropyCache: false }));
  }
  const uniqueCount = new Set(uuids).size;
  if (uniqueCount !== 100) {
    throw new Error(`生成了 100 个 UUID，但只有 ${uniqueCount} 个是唯一的`);
  }
});

test('4.6 disableEntropyCache: true 生成的 UUID 唯一', () => {
  const uuids = [];
  for (let i = 0; i < 100; i++) {
    uuids.push(crypto.randomUUID({ disableEntropyCache: true }));
  }
  const uniqueCount = new Set(uuids).size;
  if (uniqueCount !== 100) {
    throw new Error(`生成了 100 个 UUID，但只有 ${uniqueCount} 个是唯一的`);
  }
});

// ============ 5. 错误处理测试 ============
console.log('\n--- 5. 错误处理测试 ---');

test('5.1 传入 null 应该抛出 TypeError', () => {
  let errorThrown = false;
  try {
    crypto.randomUUID(null);
  } catch (e) {
    errorThrown = true;
    if (!(e instanceof TypeError)) {
      throw new Error(`期望 TypeError，实际为 ${e.name}`);
    }
    if (!e.message.includes('object')) {
      throw new Error(`错误消息应该提到 object，实际为: ${e.message}`);
    }
  }
  if (!errorThrown) {
    throw new Error('传入 null 应该抛出错误');
  }
});

test('5.2 disableEntropyCache 为字符串应该抛出 TypeError', () => {
  let errorThrown = false;
  try {
    crypto.randomUUID({ disableEntropyCache: 'true' });
  } catch (e) {
    errorThrown = true;
    if (!(e instanceof TypeError)) {
      throw new Error(`期望 TypeError，实际为 ${e.name}`);
    }
    if (!e.message.includes('boolean')) {
      throw new Error(`错误消息应该提到 boolean，实际为: ${e.message}`);
    }
  }
  if (!errorThrown) {
    throw new Error('disableEntropyCache 为字符串应该抛出错误');
  }
});

test('5.3 disableEntropyCache 为数字应该抛出 TypeError', () => {
  let errorThrown = false;
  try {
    crypto.randomUUID({ disableEntropyCache: 1 });
  } catch (e) {
    errorThrown = true;
    if (!(e instanceof TypeError)) {
      throw new Error(`期望 TypeError，实际为 ${e.name}`);
    }
  }
  if (!errorThrown) {
    throw new Error('disableEntropyCache 为数字应该抛出错误');
  }
});

test('5.4 disableEntropyCache 为对象应该抛出 TypeError', () => {
  let errorThrown = false;
  try {
    crypto.randomUUID({ disableEntropyCache: {} });
  } catch (e) {
    errorThrown = true;
    if (!(e instanceof TypeError)) {
      throw new Error(`期望 TypeError，实际为 ${e.name}`);
    }
  }
  if (!errorThrown) {
    throw new Error('disableEntropyCache 为对象应该抛出错误');
  }
});

test('5.5 disableEntropyCache 为数组应该抛出 TypeError', () => {
  let errorThrown = false;
  try {
    crypto.randomUUID({ disableEntropyCache: [] });
  } catch (e) {
    errorThrown = true;
    if (!(e instanceof TypeError)) {
      throw new Error(`期望 TypeError，实际为 ${e.name}`);
    }
  }
  if (!errorThrown) {
    throw new Error('disableEntropyCache 为数组应该抛出错误');
  }
});

test('5.6 传入字符串应该抛出 TypeError', () => {
  let errorThrown = false;
  try {
    crypto.randomUUID('invalid');
  } catch (e) {
    errorThrown = true;
    if (!(e instanceof TypeError)) {
      throw new Error(`期望 TypeError，实际为 ${e.name}`);
    }
  }
  if (!errorThrown) {
    throw new Error('传入字符串应该抛出错误');
  }
});

test('5.7 传入数字应该抛出 TypeError', () => {
  let errorThrown = false;
  try {
    crypto.randomUUID(123);
  } catch (e) {
    errorThrown = true;
    if (!(e instanceof TypeError)) {
      throw new Error(`期望 TypeError，实际为 ${e.name}`);
    }
  }
  if (!errorThrown) {
    throw new Error('传入数字应该抛出错误');
  }
});

test('5.8 传入布尔值应该抛出 TypeError', () => {
  let errorThrown = false;
  try {
    crypto.randomUUID(true);
  } catch (e) {
    errorThrown = true;
    if (!(e instanceof TypeError)) {
      throw new Error(`期望 TypeError，实际为 ${e.name}`);
    }
  }
  if (!errorThrown) {
    throw new Error('传入布尔值应该抛出错误');
  }
});

test('5.9 disableEntropyCache 为 undefined 应该被忽略', () => {
  const uuid = crypto.randomUUID({ disableEntropyCache: undefined });
  if (!uuidV4Regex.test(uuid)) {
    throw new Error('disableEntropyCache 为 undefined 应该被忽略并正常生成 UUID');
  }
});

test('5.10 disableEntropyCache 为 null 应该抛出 TypeError', () => {
  let errorThrown = false;
  try {
    crypto.randomUUID({ disableEntropyCache: null });
  } catch (e) {
    errorThrown = true;
    if (!(e instanceof TypeError)) {
      throw new Error(`期望 TypeError，实际为 ${e.name}`);
    }
  }
  if (!errorThrown) {
    throw new Error('disableEntropyCache 为 null 应该抛出错误');
  }
});

// ============ 6. RFC 4122 兼容性测试 ============
console.log('\n--- 6. RFC 4122 兼容性测试 ---');

test('6.1 版本字段正确设置（第 13 位为 4）', () => {
  const uuid = crypto.randomUUID();
  const parts = uuid.split('-');
  const versionNibble = parts[2][0];
  if (versionNibble !== '4') {
    throw new Error(`版本字段应该是 4，实际为 ${versionNibble}`);
  }
});

test('6.2 变体字段正确设置（RFC 4122 variant）', () => {
  const uuid = crypto.randomUUID();
  const parts = uuid.split('-');
  const variantChar = parts[3][0];
  const variantBits = parseInt(variantChar, 16);
  // 变体位的高 2 位应该是 10 (二进制)
  const isValidVariant = (variantBits & 0b1100) === 0b1000;
  if (!isValidVariant) {
    throw new Error(`变体位不正确: ${variantChar} (${variantBits.toString(2).padStart(4, '0')})`);
  }
});

test('6.3 time_low 字段为 8 个十六进制字符', () => {
  const uuid = crypto.randomUUID();
  const parts = uuid.split('-');
  const timeLow = parts[0];
  if (timeLow.length !== 8 || !/^[0-9a-f]{8}$/i.test(timeLow)) {
    throw new Error(`time_low 字段格式不正确: ${timeLow}`);
  }
});

test('6.4 time_mid 字段为 4 个十六进制字符', () => {
  const uuid = crypto.randomUUID();
  const parts = uuid.split('-');
  const timeMid = parts[1];
  if (timeMid.length !== 4 || !/^[0-9a-f]{4}$/i.test(timeMid)) {
    throw new Error(`time_mid 字段格式不正确: ${timeMid}`);
  }
});

test('6.5 time_hi_and_version 字段为 4 个十六进制字符', () => {
  const uuid = crypto.randomUUID();
  const parts = uuid.split('-');
  const timeHi = parts[2];
  if (timeHi.length !== 4 || !/^[0-9a-f]{4}$/i.test(timeHi)) {
    throw new Error(`time_hi_and_version 字段格式不正确: ${timeHi}`);
  }
});

test('6.6 clock_seq_and_reserved 字段为 4 个十六进制字符', () => {
  const uuid = crypto.randomUUID();
  const parts = uuid.split('-');
  const clockSeq = parts[3];
  if (clockSeq.length !== 4 || !/^[0-9a-f]{4}$/i.test(clockSeq)) {
    throw new Error(`clock_seq_and_reserved 字段格式不正确: ${clockSeq}`);
  }
});

test('6.7 node 字段为 12 个十六进制字符', () => {
  const uuid = crypto.randomUUID();
  const parts = uuid.split('-');
  const node = parts[4];
  if (node.length !== 12 || !/^[0-9a-f]{12}$/i.test(node)) {
    throw new Error(`node 字段格式不正确: ${node}`);
  }
});

// ============ 7. 随机性质量测试 ============
console.log('\n--- 7. 随机性质量测试 ---');

test('7.1 所有十六进制字符都有出现', () => {
  const hexChars = new Set();
  const count = 1000;
  
  for (let i = 0; i < count; i++) {
    const uuid = crypto.randomUUID().replace(/-/g, '').toLowerCase();
    for (const char of uuid) {
      hexChars.add(char);
    }
  }
  
  // 检查是否包含所有 16 个十六进制字符
  for (let i = 0; i < 16; i++) {
    const char = i.toString(16);
    if (!hexChars.has(char)) {
      throw new Error(`十六进制字符 '${char}' 未出现`);
    }
  }
});

test('7.2 字符分布相对均匀（简单检查）', () => {
  const charCounts = {};
  const count = 1000;
  
  // 初始化计数器
  for (let i = 0; i < 16; i++) {
    charCounts[i.toString(16)] = 0;
  }
  
  // 统计字符出现次数（排除固定位置）
  for (let i = 0; i < count; i++) {
    const uuid = crypto.randomUUID().toLowerCase();
    for (let j = 0; j < uuid.length; j++) {
      const char = uuid[j];
      // 跳过连字符、版本位（索引14）和变体位的高位（索引19）
      if (char !== '-' && j !== 14 && j !== 19) {
        if (charCounts[char] !== undefined) {
          charCounts[char]++;
        }
      }
    }
  }
  
  // 检查每个字符至少出现了一定次数
  const minExpected = count * 30 * 0.03; // 至少应该占 3%
  for (const char in charCounts) {
    if (charCounts[char] < minExpected) {
      throw new Error(`字符 '${char}' 出现次数过少: ${charCounts[char]} (最少期望 ${minExpected.toFixed(0)})`);
    }
  }
});

test('7.3 生成的 UUID 不包含明显模式', () => {
  const uuids = [];
  for (let i = 0; i < 10; i++) {
    uuids.push(crypto.randomUUID());
  }
  
  // 检查是否有连续相同的模式
  for (let i = 1; i < uuids.length; i++) {
    // 检查前 8 个字符是否相同（time_low 字段）
    if (uuids[i].substring(0, 8) === uuids[i-1].substring(0, 8)) {
      throw new Error('检测到明显的重复模式');
    }
  }
});

// ============ 8. 性能测试 ============
console.log('\n--- 8. 性能测试 ---');

test('8.1 连续调用 100 次性能正常', () => {
  const startTime = Date.now();
  for (let i = 0; i < 100; i++) {
    crypto.randomUUID();
  }
  const duration = Date.now() - startTime;
  // 100 次调用应该在 100ms 内完成
  if (duration > 100) {
    throw new Error(`100 次调用耗时 ${duration}ms，超过预期`);
  }
});

test('8.2 连续调用 1000 次性能正常', () => {
  const startTime = Date.now();
  for (let i = 0; i < 1000; i++) {
    crypto.randomUUID();
  }
  const duration = Date.now() - startTime;
  // 1000 次调用应该在 1000ms 内完成
  if (duration > 1000) {
    throw new Error(`1000 次调用耗时 ${duration}ms，超过预期`);
  }
});

test('8.3 启用缓存模式性能', () => {
  const startTime = Date.now();
  for (let i = 0; i < 100; i++) {
    crypto.randomUUID({ disableEntropyCache: false });
  }
  const duration = Date.now() - startTime;
  if (duration > 100) {
    throw new Error(`启用缓存模式 100 次调用耗时 ${duration}ms`);
  }
});

test('8.4 禁用缓存模式性能', () => {
  const startTime = Date.now();
  for (let i = 0; i < 100; i++) {
    crypto.randomUUID({ disableEntropyCache: true });
  }
  const duration = Date.now() - startTime;
  if (duration > 100) {
    throw new Error(`禁用缓存模式 100 次调用耗时 ${duration}ms`);
  }
});

// ============ 9. 边界情况测试 ============
console.log('\n--- 9. 边界情况测试 ---');

test('9.1 快速连续调用产生不同结果', () => {
  const uuid1 = crypto.randomUUID();
  const uuid2 = crypto.randomUUID();
  const uuid3 = crypto.randomUUID();
  
  if (uuid1 === uuid2 || uuid2 === uuid3 || uuid1 === uuid3) {
    throw new Error('快速连续调用产生了相同的 UUID');
  }
});

test('9.2 在循环中调用全部有效', () => {
  for (let i = 0; i < 50; i++) {
    const uuid = crypto.randomUUID();
    if (!uuidV4Regex.test(uuid)) {
      throw new Error(`第 ${i + 1} 次调用生成了无效的 UUID: ${uuid}`);
    }
  }
});

test('9.3 两种缓存模式可以混合使用', () => {
  const uuids = [];
  for (let i = 0; i < 10; i++) {
    uuids.push(crypto.randomUUID({ disableEntropyCache: i % 2 === 0 }));
  }
  
  // 验证所有 UUID 有效且唯一
  const allValid = uuids.every(uuid => uuidV4Regex.test(uuid));
  const allUnique = new Set(uuids).size === uuids.length;
  
  if (!allValid) {
    throw new Error('混合使用两种模式产生了无效的 UUID');
  }
  if (!allUnique) {
    throw new Error('混合使用两种模式产生了重复的 UUID');
  }
});

test('9.4 options 对象可以包含其他属性', () => {
  const uuid = crypto.randomUUID({
    disableEntropyCache: false,
    customProp1: 'value',
    customProp2: 123
  });
  if (!uuidV4Regex.test(uuid)) {
    throw new Error('包含其他属性的 options 对象应该正常工作');
  }
});

// ============ 10. 大小写测试 ============
console.log('\n--- 10. 大小写测试 ---');

test('10.1 UUID 使用小写字母', () => {
  const uuid = crypto.randomUUID();
  const withoutDashes = uuid.replace(/-/g, '');
  // 检查是否全部是小写
  if (withoutDashes !== withoutDashes.toLowerCase()) {
    throw new Error('UUID 应该使用小写字母');
  }
});

test('10.2 UUID 不包含大写字母', () => {
  const uuid = crypto.randomUUID();
  if (/[A-Z]/.test(uuid)) {
    throw new Error(`UUID 不应该包含大写字母: ${uuid}`);
  }
});

// ============ 11. 返回值特性测试 ============
console.log('\n--- 11. 返回值特性测试 ---');

test('11.1 返回值是原始字符串类型', () => {
  const uuid = crypto.randomUUID();
  if (typeof uuid !== 'string') {
    throw new Error(`期望 string 类型，实际为 ${typeof uuid}`);
  }
  if (typeof uuid === 'object') {
    throw new Error('返回值不应该是对象包装类型');
  }
});

test('11.2 每次调用返回新的字符串实例', () => {
  const uuid1 = crypto.randomUUID();
  const uuid2 = crypto.randomUUID();
  // 虽然值不同，但确保它们是独立的字符串
  if (uuid1 === uuid2) {
    throw new Error('不应该返回相同的 UUID');
  }
});

test('11.3 返回值不包含前导或尾随空格', () => {
  const uuid = crypto.randomUUID();
  if (uuid !== uuid.trim()) {
    throw new Error(`UUID 包含空格: "${uuid}"`);
  }
  if (uuid.length !== uuid.trim().length) {
    throw new Error('UUID 长度与 trim 后不一致');
  }
});

// ============ 12. 额外的参数错误处理测试 ============
console.log('\n--- 12. 额外的参数错误处理测试 ---');

test('12.1 disableEntropyCache 为 Symbol 应该抛出 TypeError', () => {
  let errorThrown = false;
  try {
    crypto.randomUUID({ disableEntropyCache: Symbol('test') });
  } catch (e) {
    errorThrown = true;
    if (!(e instanceof TypeError)) {
      throw new Error(`期望 TypeError，实际为 ${e.name}`);
    }
  }
  if (!errorThrown) {
    throw new Error('disableEntropyCache 为 Symbol 应该抛出错误');
  }
});

test('12.2 disableEntropyCache 为函数应该抛出 TypeError', () => {
  let errorThrown = false;
  try {
    crypto.randomUUID({ disableEntropyCache: function() {} });
  } catch (e) {
    errorThrown = true;
    if (!(e instanceof TypeError)) {
      throw new Error(`期望 TypeError，实际为 ${e.name}`);
  }
  }
  if (!errorThrown) {
    throw new Error('disableEntropyCache 为函数应该抛出错误');
  }
});

test('12.3 传入 undefined 等同于无参数', () => {
  const uuid1 = crypto.randomUUID(undefined);
  const uuid2 = crypto.randomUUID();
  // 两者都应该能正常生成 UUID
  if (!uuidV4Regex.test(uuid1) || !uuidV4Regex.test(uuid2)) {
    throw new Error('传入 undefined 应该等同于无参数');
  }
});

test('12.4 传入数组应该抛出 TypeError', () => {
  let errorThrown = false;
  try {
    crypto.randomUUID([]);
  } catch (e) {
    errorThrown = true;
    if (!(e instanceof TypeError)) {
      throw new Error(`期望 TypeError，实际为 ${e.name}`);
    }
  }
  if (!errorThrown) {
    throw new Error('传入数组应该抛出错误');
  }
});

// ============ 13. UUID 版本和变体位的详细验证 ============
console.log('\n--- 13. UUID 版本和变体位的详细验证 ---');

test('13.1 版本位字节的高 4 位必须是 0100 (二进制)', () => {
  for (let i = 0; i < 10; i++) {
    const uuid = crypto.randomUUID();
    const parts = uuid.split('-');
    const versionNibble = parseInt(parts[2][0], 16);
    // 版本 4: 高 4 位必须是 0100
    if (versionNibble !== 4) {
      throw new Error(`版本位不正确: ${versionNibble} (应该是 4)`);
    }
  }
});

test('13.2 变体位字节的高 2 位必须是 10 (二进制)', () => {
  for (let i = 0; i < 10; i++) {
    const uuid = crypto.randomUUID();
    const parts = uuid.split('-');
    const variantNibble = parseInt(parts[3][0], 16);
    // RFC 4122 变体: 高 2 位必须是 10 (二进制)
    // 这意味着十六进制值必须是 8, 9, a, b
    const isValid = (variantNibble >= 8 && variantNibble <= 11);
    if (!isValid) {
      throw new Error(`变体位不正确: ${parts[3][0]} (${variantNibble})`);
    }
  }
});

test('13.3 版本位以外的位应该是随机的', () => {
  const uuids = [];
  for (let i = 0; i < 100; i++) {
    uuids.push(crypto.randomUUID());
  }

  // 检查版本字段的低 12 位是否有变化
  const versionFields = uuids.map(uuid => uuid.split('-')[2].substring(1));
  const uniqueVersionFields = new Set(versionFields);

  // 应该有很多不同的值 (至少 90% 是唯一的)
  if (uniqueVersionFields.size < 90) {
    throw new Error(`版本字段的随机位变化太少: ${uniqueVersionFields.size}/100`);
  }
});

test('13.4 变体位以外的位应该是随机的', () => {
  const uuids = [];
  for (let i = 0; i < 100; i++) {
    uuids.push(crypto.randomUUID());
  }

  // 检查变体字段的低 6 位是否有变化
  const variantFields = uuids.map(uuid => {
    const parts = uuid.split('-');
    return parts[3].substring(1) + parts[4];
  });
  const uniqueVariantFields = new Set(variantFields);

  // 应该全部唯一
  if (uniqueVariantFields.size < 99) {
    throw new Error(`变体字段的随机位变化太少: ${uniqueVariantFields.size}/100`);
  }
});

// ============ 14. 压力和稳定性测试 ============
console.log('\n--- 14. 压力和稳定性测试 ---');

test('14.1 连续生成 50000 个 UUID 全部唯一', () => {
  const uuidSet = new Set();
  const count = 50000;

  for (let i = 0; i < count; i++) {
    uuidSet.add(crypto.randomUUID());
  }

  if (uuidSet.size !== count) {
    throw new Error(`生成了 ${count} 个 UUID，但只有 ${uuidSet.size} 个是唯一的`);
  }
});

test('14.2 批量生成 UUID 格式全部正确', () => {
  const count = 1000;
  for (let i = 0; i < count; i++) {
    const uuid = crypto.randomUUID();
    if (!uuidV4Regex.test(uuid)) {
      throw new Error(`第 ${i + 1} 个 UUID 格式不正确: ${uuid}`);
    }
  }
});

test('14.3 交替使用两种缓存模式不影响正确性', () => {
  const uuids = [];
  for (let i = 0; i < 200; i++) {
    const useCache = i % 2 === 0;
    uuids.push(crypto.randomUUID({ disableEntropyCache: !useCache }));
  }

  // 验证全部有效
  const allValid = uuids.every(uuid => uuidV4Regex.test(uuid));
  if (!allValid) {
    throw new Error('交替使用缓存模式产生了无效的 UUID');
  }

  // 验证全部唯一
  if (new Set(uuids).size !== uuids.length) {
    throw new Error('交替使用缓存模式产生了重复的 UUID');
  }
});

// ============ 15. 空值和边界参数测试 ============
console.log('\n--- 15. 空值和边界参数测试 ---');

test('15.1 空对象和 undefined 行为一致', () => {
  const uuid1 = crypto.randomUUID({});
  const uuid2 = crypto.randomUUID(undefined);
  const uuid3 = crypto.randomUUID();

  // 所有三种方式都应该生成有效的 UUID
  if (!uuidV4Regex.test(uuid1) || !uuidV4Regex.test(uuid2) || !uuidV4Regex.test(uuid3)) {
    throw new Error('不同的参数方式应该都能生成有效的 UUID');
  }
});

test('15.2 多个无效选项同时存在时报错', () => {
  let errorThrown = false;
  try {
    crypto.randomUUID({
      disableEntropyCache: 'invalid',
      anotherProp: 123
    });
  } catch (e) {
    errorThrown = true;
    if (!(e instanceof TypeError)) {
      throw new Error(`期望 TypeError，实际为 ${e.name}`);
    }
  }
  if (!errorThrown) {
    throw new Error('多个无效选项应该抛出错误');
  }
});

test('15.3 只传入无关属性的对象应该成功', () => {
  const uuid = crypto.randomUUID({
    customProp1: 'value1',
    customProp2: 123,
    customProp3: true
  });
  if (!uuidV4Regex.test(uuid)) {
    throw new Error('只包含无关属性的对象应该被忽略');
  }
});

// ============ 16. 特殊字符和编码测试 ============
console.log('\n--- 16. 特殊字符和编码测试 ---');

test('16.1 UUID 只包含 ASCII 字符', () => {
  const uuid = crypto.randomUUID();
  // ASCII 范围: 0-127
  for (let i = 0; i < uuid.length; i++) {
    const code = uuid.charCodeAt(i);
    if (code > 127) {
      throw new Error(`UUID 包含非 ASCII 字符: ${uuid[i]} (code: ${code})`);
    }
  }
});

test('16.2 UUID 可以安全地用作对象键', () => {
  const obj = {};
  const uuid1 = crypto.randomUUID();
  const uuid2 = crypto.randomUUID();

  obj[uuid1] = 'value1';
  obj[uuid2] = 'value2';

  if (obj[uuid1] !== 'value1' || obj[uuid2] !== 'value2') {
    throw new Error('UUID 作为对象键时行为异常');
  }
  if (Object.keys(obj).length !== 2) {
    throw new Error('UUID 作为对象键时数量异常');
  }
});

test('16.3 UUID 可以安全地用于 JSON 序列化', () => {
  const uuid = crypto.randomUUID();
  const obj = { id: uuid };
  const json = JSON.stringify(obj);
  const parsed = JSON.parse(json);

  if (parsed.id !== uuid) {
    throw new Error('UUID 在 JSON 序列化后发生变化');
  }
});

test('16.4 UUID 字符串长度始终为 36', () => {
  for (let i = 0; i < 100; i++) {
    const uuid = crypto.randomUUID();
    if (uuid.length !== 36) {
      throw new Error(`UUID 长度不正确: ${uuid.length} (期望 36)`);
    }
  }
});

// ============ 17. 多余参数和特殊参数测试 ============
console.log('\n--- 17. 多余参数和特殊参数测试 ---');

test('17.1 传入两个参数时忽略第二个参数', () => {
  const uuid = crypto.randomUUID({}, 'extra');
  if (!uuidV4Regex.test(uuid)) {
    throw new Error('应该忽略多余参数并正常生成 UUID');
  }
});

test('17.2 传入三个参数时忽略后续参数', () => {
  const uuid = crypto.randomUUID({}, 'extra1', 'extra2');
  if (!uuidV4Regex.test(uuid)) {
    throw new Error('应该忽略多余参数并正常生成 UUID');
  }
});

test('17.3 options 对象被冻结时正常工作', () => {
  const options = Object.freeze({ disableEntropyCache: false });
  const uuid = crypto.randomUUID(options);
  if (!uuidV4Regex.test(uuid)) {
    throw new Error('冻结的 options 对象应该正常工作');
  }
});

test('17.4 options 对象被密封时正常工作', () => {
  const options = Object.seal({ disableEntropyCache: true });
  const uuid = crypto.randomUUID(options);
  if (!uuidV4Regex.test(uuid)) {
    throw new Error('密封的 options 对象应该正常工作');
  }
});

test('17.5 options 使用 getter 属性', () => {
  const options = {
    get disableEntropyCache() {
      return false;
    }
  };
  const uuid = crypto.randomUUID(options);
  if (!uuidV4Regex.test(uuid)) {
    throw new Error('使用 getter 的 options 应该正常工作');
  }
});

// ============ 18. 返回值的字符串特性测试 ============
console.log('\n--- 18. 返回值的字符串特性测试 ---');

test('18.1 返回值是原始字符串（非 String 对象）', () => {
  const uuid = crypto.randomUUID();
  if (uuid instanceof String) {
    throw new Error('返回值不应该是 String 对象包装类型');
  }
  if (Object.prototype.toString.call(uuid) !== '[object String]') {
    throw new Error('返回值类型标签不正确');
  }
});

test('18.2 返回值的 constructor 是 String', () => {
  const uuid = crypto.randomUUID();
  if (uuid.constructor !== String) {
    throw new Error(`constructor 应该是 String，实际为 ${uuid.constructor.name}`);
  }
});

test('18.3 返回值可以使用字符串方法', () => {
  const uuid = crypto.randomUUID();
  
  // 测试常用字符串方法
  const upper = uuid.toUpperCase();
  const lower = uuid.toLowerCase();
  const parts = uuid.split('-');
  const substr = uuid.substring(0, 8);
  
  if (typeof upper !== 'string' || upper.length !== 36) {
    throw new Error('toUpperCase() 方法异常');
  }
  if (typeof lower !== 'string' || lower.length !== 36) {
    throw new Error('toLowerCase() 方法异常');
  }
  if (!Array.isArray(parts) || parts.length !== 5) {
    throw new Error('split() 方法异常');
  }
  if (typeof substr !== 'string' || substr.length !== 8) {
    throw new Error('substring() 方法异常');
  }
});

test('18.4 返回值可以进行字符串拼接', () => {
  const uuid = crypto.randomUUID();
  const prefixed = 'id-' + uuid;
  const suffixed = uuid + '-suffix';
  const templated = `uuid:${uuid}`;
  
  if (!prefixed.startsWith('id-')) {
    throw new Error('字符串拼接异常（前缀）');
  }
  if (!suffixed.endsWith('-suffix')) {
    throw new Error('字符串拼接异常（后缀）');
  }
  if (!templated.startsWith('uuid:')) {
    throw new Error('模板字符串拼接异常');
  }
});

test('18.5 返回值可以进行比较操作', () => {
  const uuid1 = crypto.randomUUID();
  const uuid2 = crypto.randomUUID();
  const uuid1Copy = uuid1.toString();
  
  // 相等性比较
  if (uuid1 !== uuid1Copy) {
    throw new Error('相同 UUID 的比较应该相等');
  }
  if (uuid1 === uuid2) {
    throw new Error('不同 UUID 的比较应该不相等');
  }
  
  // 字符串比较
  const comparison = uuid1 < uuid2 || uuid1 > uuid2 || uuid1 === uuid2;
  if (!comparison) {
    throw new Error('UUID 字符串比较异常');
  }
});

// ============ 19. 并发和异步场景测试 ============
console.log('\n--- 19. 并发和异步场景测试 ---');

test('19.1 在 Promise 中调用正常', () => {
  return new Promise((resolve, reject) => {
    try {
      const uuid = crypto.randomUUID();
      if (!uuidV4Regex.test(uuid)) {
        reject(new Error('Promise 中生成的 UUID 格式不正确'));
      } else {
        resolve();
      }
    } catch (e) {
      reject(e);
    }
  });
});

test('19.2 在 setTimeout 中调用正常', () => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      try {
        const uuid = crypto.randomUUID();
        if (!uuidV4Regex.test(uuid)) {
          reject(new Error('setTimeout 中生成的 UUID 格式不正确'));
        } else {
          resolve();
        }
      } catch (e) {
        reject(e);
      }
    }, 0);
  });
});

test('19.3 在 setImmediate 中调用正常', () => {
  if (typeof setImmediate === 'undefined') {
    // 跳过不支持 setImmediate 的环境
    return;
  }
  return new Promise((resolve, reject) => {
    setImmediate(() => {
      try {
        const uuid = crypto.randomUUID();
        if (!uuidV4Regex.test(uuid)) {
          reject(new Error('setImmediate 中生成的 UUID 格式不正确'));
        } else {
          resolve();
        }
      } catch (e) {
        reject(e);
      }
    });
  });
});

// ============ 20. 错误消息详细验证 ============
console.log('\n--- 20. 错误消息详细验证 ---');

test('20.1 null 参数的错误消息包含"object"', () => {
  let errorThrown = false;
  let errorMessage = '';
  try {
    crypto.randomUUID(null);
  } catch (e) {
    errorThrown = true;
    errorMessage = e.message.toLowerCase();
    if (!errorMessage.includes('object') && !errorMessage.includes('null')) {
      throw new Error(`错误消息应该提到 object 或 null，实际为: ${e.message}`);
    }
  }
  if (!errorThrown) {
    throw new Error('应该抛出错误');
  }
});

test('20.2 字符串参数的错误消息包含类型信息', () => {
  let errorThrown = false;
  let errorMessage = '';
  try {
    crypto.randomUUID('string');
  } catch (e) {
    errorThrown = true;
    errorMessage = e.message.toLowerCase();
    if (!errorMessage.includes('object') && !errorMessage.includes('type') && !errorMessage.includes('string')) {
      throw new Error(`错误消息应该包含类型信息，实际为: ${e.message}`);
    }
  }
  if (!errorThrown) {
    throw new Error('应该抛出错误');
  }
});

test('20.3 无效 disableEntropyCache 的错误消息包含"boolean"', () => {
  let errorThrown = false;
  let errorMessage = '';
  try {
    crypto.randomUUID({ disableEntropyCache: 'invalid' });
  } catch (e) {
    errorThrown = true;
    errorMessage = e.message.toLowerCase();
    if (!errorMessage.includes('boolean')) {
      throw new Error(`错误消息应该提到 boolean，实际为: ${e.message}`);
    }
  }
  if (!errorThrown) {
    throw new Error('应该抛出错误');
  }
});

// ============ 21. 边界值和特殊场景 ============
console.log('\n--- 21. 边界值和特殊场景 ---');

test('21.1 连续调用无间隔产生唯一 UUID', () => {
  const uuids = [];
  for (let i = 0; i < 10; i++) {
    uuids.push(crypto.randomUUID());
  }
  if (new Set(uuids).size !== uuids.length) {
    throw new Error('连续无间隔调用产生了重复的 UUID');
  }
});

test('21.2 返回的 UUID 不会被缓存或复用', () => {
  const uuid1 = crypto.randomUUID();
  const uuid2 = crypto.randomUUID();
  const uuid3 = crypto.randomUUID();
  
  // 确保每次都是新的值
  if (uuid1 === uuid2 || uuid2 === uuid3 || uuid1 === uuid3) {
    throw new Error('UUID 被错误地缓存或复用');
  }
});

test('21.3 在对象中存储大量 UUID', () => {
  const map = new Map();
  const count = 1000;
  
  for (let i = 0; i < count; i++) {
    const uuid = crypto.randomUUID();
    map.set(uuid, i);
  }
  
  if (map.size !== count) {
    throw new Error(`Map 应该有 ${count} 个条目，实际为 ${map.size}`);
  }
});

test('21.4 UUID 可以用作 Set 成员', () => {
  const set = new Set();
  const count = 100;
  
  for (let i = 0; i < count; i++) {
    set.add(crypto.randomUUID());
  }
  
  if (set.size !== count) {
    throw new Error(`Set 应该有 ${count} 个成员，实际为 ${set.size}`);
  }
});

test('21.5 UUID 每个部分都有随机性', () => {
  const parts = { 0: new Set(), 1: new Set(), 2: new Set(), 3: new Set(), 4: new Set() };
  
  for (let i = 0; i < 100; i++) {
    const uuid = crypto.randomUUID();
    const uuidParts = uuid.split('-');
    for (let j = 0; j < 5; j++) {
      parts[j].add(uuidParts[j]);
    }
  }
  
  // 每个部分应该有很高的唯一性（除了版本和变体位所在的部分）
  if (parts[0].size < 90) {
    throw new Error(`第1部分唯一性不足: ${parts[0].size}/100`);
  }
  if (parts[1].size < 90) {
    throw new Error(`第2部分唯一性不足: ${parts[1].size}/100`);
  }
  // 第3部分包含版本位，唯一性会低一些
  if (parts[2].size < 80) {
    throw new Error(`第3部分唯一性不足: ${parts[2].size}/100`);
  }
  // 第4部分包含变体位，唯一性会低一些
  if (parts[3].size < 80) {
    throw new Error(`第4部分唯一性不足: ${parts[3].size}/100`);
  }
  if (parts[4].size < 99) {
    throw new Error(`第5部分唯一性不足: ${parts[4].size}/100`);
  }
});

// ============ 测试总结 ============
console.log('\n========================================');
console.log('测试总结:');
console.log(`  总计: ${testCount} 个测试`);
console.log(`  通过: ${passCount} 个 ✅`);
console.log(`  失败: ${failCount} 个 ❌`);
console.log(`  通过率: ${((passCount / testCount) * 100).toFixed(2)}%`);
console.log('========================================');

if (failCount > 0) {
  console.log('\n失败的测试详情:');
  testResults.filter(t => t.status === 'failed').forEach(t => {
    console.log(`  ❌ [${t.number}] ${t.name}`);
    console.log(`      错误: ${t.error}`);
  });
}

// 打印通过的测试（供参考）
if (passCount > 0 && failCount === 0) {
  console.log('\n所有测试通过! 🎉');
}

// 返回测试结果（用于自动化测试）
const rs = {
  total: testCount,
  passed: passCount,
  failed: failCount,
  passRate: ((passCount / testCount) * 100).toFixed(2) + '%',
  results: {
    passed: testResults.filter(t => t.status === 'passed').map(t => `[${t.number}] ${t.name}`),
    failed: testResults.filter(t => t.status === 'failed').map(t => ({
      test: `[${t.number}] ${t.name}`,
      error: t.error
    }))
  }
};

console.log(JSON.stringify(rs, null, 2));

return rs;
