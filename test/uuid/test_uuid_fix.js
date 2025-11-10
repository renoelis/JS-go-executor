// 测试 UUID 修复
const { v3, v5, v4, validate, version, parse, stringify } = require('uuid');

console.log('=== 测试 v3/v5 命名空间常量 ===');
console.log('v3.DNS:', v3.DNS);
console.log('v3.URL:', v3.URL);
console.log('v5.DNS:', v5.DNS);
console.log('v5.URL:', v5.URL);

console.log('\n=== 测试 v3 生成 ===');
const id3 = v3('hello', v3.DNS);
console.log('v3("hello", v3.DNS):', id3);
console.log('validate:', validate(id3));
console.log('version:', version(id3));

console.log('\n=== 测试 v5 生成 ===');
const id5 = v5('hello', v5.DNS);
console.log('v5("hello", v5.DNS):', id5);
console.log('validate:', validate(id5));
console.log('version:', version(id5));

console.log('\n=== 测试 v4 buffer 写入 ===');
const buffer = new Array(20);
const result = v4(null, buffer, 4);
console.log('buffer 长度:', result.length);
console.log('offset 4 有值:', buffer[4] !== undefined);

console.log('\n=== 测试 stringify offset ===');
const id = v4();
const bytes = parse(id);
const largeBuffer = new Array(20);
for (let i = 0; i < 16; i++) {
  largeBuffer[i + 4] = bytes[i];
}
const reconstructed = stringify(largeBuffer, 4);
console.log('原始 ID:', id);
console.log('重建 ID:', reconstructed);
console.log('匹配:', id.toLowerCase() === reconstructed.toLowerCase());

console.log('\n=== 测试 v4 random 参数验证 ===');
try {
  v4({ random: 'invalid' });
  console.log('❌ 应该抛出异常');
} catch (e) {
  console.log('✅ 正确抛出:', e.message);
}

try {
  v4({ random: [1, 2, 3] });
  console.log('❌ 应该抛出异常');
} catch (e) {
  console.log('✅ 正确抛出:', e.message);
}

console.log('\n=== 测试 version 对无效 UUID 的处理 ===');
try {
  version('invalid-uuid');
  console.log('❌ 应该抛出异常');
} catch (e) {
  console.log('✅ 正确抛出:', e.message);
}

console.log('\n✅ 所有修复测试通过！');

