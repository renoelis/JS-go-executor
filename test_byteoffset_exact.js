// 完全匹配原始测试用例
const { Buffer } = require('buffer');

console.log('=== 精确复现原始测试用例 ===');
const ab = new ArrayBuffer(10);
console.log('1. 创建 ArrayBuffer(10)');

const view1 = new Uint8Array(ab, 0, 3);
const view2 = new Uint8Array(ab, 5, 3);
console.log('2. 创建 view1 (offset=0, length=3)');
console.log('3. 创建 view2 (offset=5, length=3)');

view1.set([1, 2, 3]);
view2.set([4, 5, 6]);
console.log('4. view1.set([1, 2, 3])');
console.log('5. view2.set([4, 5, 6])');

console.log('\n=== 查看 ArrayBuffer 内容 ===');
const fullView = new Uint8Array(ab);
console.log('完整 ArrayBuffer:', Array.from(fullView));
console.log('view1:', Array.from(view1));
console.log('view2:', Array.from(view2));

console.log('\n=== Buffer.from 转换 ===');
const buf1 = Buffer.from(view1);
const buf2 = Buffer.from(view2);
console.log('Buffer.from(view1):', Array.from(buf1), 'length:', buf1.length);
console.log('Buffer.from(view2):', Array.from(buf2), 'length:', buf2.length);

console.log('\n=== Buffer.concat ===');
const result = Buffer.concat([buf1, buf2]);
console.log('result:', Array.from(result));
console.log('result.length:', result.length);

console.log('\n=== 验证 ===');
const checks = {
  'length === 6': result.length === 6,
  'result[0] === 1': result[0] === 1,
  'result[1] === 2': result[1] === 2,
  'result[2] === 3': result[2] === 3,
  'result[3] === 4': result[3] === 4,
  'result[4] === 5': result[4] === 5,
  'result[5] === 6': result[5] === 6,
};

for (const [check, pass] of Object.entries(checks)) {
  console.log(`  ${check}: ${pass ? '✅' : '❌'}`);
}

const allPass = Object.values(checks).every(v => v);
console.log('\n最终结果:', allPass ? '✅ PASS' : '❌ FAIL');

const testResult = {
  success: allPass,
  data: allPass ? '✅ PASS' : '❌ FAIL',
  details: checks
};
return testResult;
