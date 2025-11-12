// 调试 byteOffset 问题
const { Buffer } = require('buffer');

console.log('=== 测试 1: 基本 TypedArray ===');
const ab = new ArrayBuffer(10);
const u8 = new Uint8Array(ab);
for (let i = 0; i < 10; i++) {
  u8[i] = i;
}
console.log('ArrayBuffer content:', Array.from(u8));

console.log('\n=== 测试 2: 带 offset 的 view ===');
const view1 = new Uint8Array(ab, 0, 3);
const view2 = new Uint8Array(ab, 5, 3);
console.log('view1 (offset=0, length=3):', Array.from(view1));
console.log('view2 (offset=5, length=3):', Array.from(view2));

console.log('\n=== 测试 3: Buffer.from(view) ===');
const buf1 = Buffer.from(view1);
const buf2 = Buffer.from(view2);
console.log('Buffer.from(view1):', Array.from(buf1));
console.log('Buffer.from(view1) length:', buf1.length);
console.log('Buffer.from(view2):', Array.from(buf2));
console.log('Buffer.from(view2) length:', buf2.length);

console.log('\n=== 测试 4: Buffer.concat ===');
const result = Buffer.concat([buf1, buf2]);
console.log('Buffer.concat result:', Array.from(result));
console.log('Buffer.concat result length:', result.length);

console.log('\n=== 测试 5: 验证结果 ===');
const expected = [0, 1, 2, 5, 6, 7];
const actual = Array.from(result);
const passed = result.length === 6 &&
               actual[0] === expected[0] &&
               actual[1] === expected[1] &&
               actual[2] === expected[2] &&
               actual[3] === expected[3] &&
               actual[4] === expected[4] &&
               actual[5] === expected[5];

console.log('Expected:', expected);
console.log('Actual:  ', actual);
console.log('Test:', passed ? '✅ PASS' : '❌ FAIL');

if (!passed) {
  console.log('\n错误详情:');
  console.log('- buf1 是否正确:', buf1.length === 3 && buf1[0] === 0 && buf1[1] === 1 && buf1[2] === 2);
  console.log('- buf2 是否正确:', buf2.length === 3 && buf2[0] === 5 && buf2[1] === 6 && buf2[2] === 7);
  console.log('- concat 长度:', result.length, '(expected 6)');
}
