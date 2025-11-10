// 快速验证可枚举性修复

const blob = new Blob(['hello']);

console.log('=== Blob 实例可枚举属性 ===');
const blobProps = [];
for (const key in blob) {
  blobProps.push(key);
}
console.log('实际:', blobProps);
console.log('期望: ["type", "size"]');
console.log('结果:', JSON.stringify(blobProps) === JSON.stringify(['type', 'size']) ? '✅ 通过' : '❌ 失败');

console.log('\n=== Blob.prototype 可枚举属性 ===');
const protoProps = [];
for (const key in Blob.prototype) {
  protoProps.push(key);
}
console.log('实际:', protoProps);
console.log('期望: 包含方法，不包含 constructor');
console.log('包含 slice?', protoProps.includes('slice') ? '✅' : '❌');
console.log('包含 text?', protoProps.includes('text') ? '✅' : '❌');
console.log('包含 constructor?', protoProps.includes('constructor') ? '❌ 不应该包含' : '✅ 正确');

return {
  blobInstanceProps: blobProps,
  prototypeProps: protoProps,
  instanceOk: JSON.stringify(blobProps) === JSON.stringify(['type', 'size']),
  constructorOk: !protoProps.includes('constructor'),
  allOk: JSON.stringify(blobProps) === JSON.stringify(['type', 'size']) && !protoProps.includes('constructor')
};


