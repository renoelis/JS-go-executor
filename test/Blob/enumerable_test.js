// 简单测试：验证 Blob/File 方法是否可枚举（与 Node.js/浏览器一致）

console.log('=== Blob 方法可枚举性测试 ===\n');

const blob = new Blob(['hello']);

// 测试 1: for...in 枚举
console.log('1. 使用 for...in 枚举 Blob.prototype:');
const blobProtoProps = [];
for (const key in Blob.prototype) {
  blobProtoProps.push(key);
}
console.log('   可枚举属性:', blobProtoProps);

// 测试 2: 检查各个方法
const methods = ['arrayBuffer', 'text', 'slice', 'bytes', 'stream', 'constructor'];
console.log('\n2. 各方法的可枚举状态:');
methods.forEach(method => {
  const isEnumerable = blobProtoProps.includes(method);
  const exists = typeof Blob.prototype[method] === 'function' || method === 'constructor';
  console.log(`   ${method.padEnd(15)}: ${isEnumerable ? '✅ 可枚举' : '❌ 不可枚举'} ${exists ? '(存在)' : '(不存在)'}`);
});

// 测试 3: File 方法（如果存在）
if (typeof File !== 'undefined') {
  console.log('\n3. File.prototype 可枚举属性:');
  const fileProtoProps = [];
  for (const key in File.prototype) {
    fileProtoProps.push(key);
  }
  console.log('   可枚举属性:', fileProtoProps);
}

// 测试 4: 对比 Node.js 行为
console.log('\n4. 期望结果（Node.js/浏览器）:');
console.log('   所有方法和 constructor 都应该可枚举 ✅');

// 结果
const allEnumerable = methods.every(m => {
  const exists = typeof Blob.prototype[m] === 'function' || m === 'constructor';
  return !exists || blobProtoProps.includes(m);
});

console.log('\n=== 测试结果 ===');
console.log(allEnumerable ? '✅ 通过：所有方法可枚举（与 Node.js/浏览器一致）' : '❌ 失败：部分方法不可枚举');

return { 
  success: allEnumerable,
  blobProtoProps,
  methods: methods.map(m => ({
    name: m,
    enumerable: blobProtoProps.includes(m),
    exists: typeof Blob.prototype[m] === 'function' || m === 'constructor'
  }))
};


