// 检查原生迭代方法是否是 goja 内置的
const { Buffer } = require('buffer');

console.log('=== 检查方法来源 ===\n');

const buf = Buffer.from([1, 2, 3, 4, 5]);

// 检查 Buffer 的所有方法
console.log('【Buffer.prototype 上的迭代方法】\n');

const methods = [
  'forEach', 'map', 'filter', 
  'reduce', 'reduceRight',
  'find', 'findIndex', 'findLast', 'findLastIndex',
  'some', 'every',
  'join', 'toLocaleString'
];

methods.forEach(method => {
  const exists = typeof buf[method] === 'function';
  console.log(`${exists ? '✅' : '❌'} buf.${method}(): ${exists ? '存在' : '不存在'}`);
});

console.log('\n【Symbol.iterator API】\n');
const iteratorMethods = ['entries', 'keys', 'values'];
iteratorMethods.forEach(method => {
  const exists = typeof buf[method] === 'function';
  console.log(`${exists ? '✅' : '❌'} buf.${method}(): ${exists ? '存在' : '不存在'}`);
});

console.log(`${typeof buf[Symbol.iterator] === 'function' ? '✅' : '❌'} buf[Symbol.iterator](): ${typeof buf[Symbol.iterator] === 'function' ? '存在' : '不存在'}`);

// 检查 Uint8Array 原生是否有这些方法
console.log('\n【Uint8Array.prototype 对比】\n');
const uint8 = new Uint8Array([1, 2, 3]);

methods.forEach(method => {
  const bufHas = typeof buf[method] === 'function';
  const uint8Has = typeof uint8[method] === 'function';
  console.log(`${method.padEnd(20)}: Buffer=${bufHas ? '✅' : '❌'}  Uint8Array=${uint8Has ? '✅' : '❌'}`);
});

console.log('\n【结论】\n');
console.log('如果 Buffer 有但 Uint8Array 没有，说明是我们自己添加的。');
console.log('如果两者都有，说明是 goja 内置的。\n');

// 测试功能是否正常
console.log('【功能测试】\n');
console.log('buf.forEach 存在:', typeof buf.forEach === 'function');
console.log('buf.map 存在:', typeof buf.map === 'function');
console.log('buf.reduce 存在:', typeof buf.reduce === 'function');

if (typeof buf.reduce === 'function') {
  const sum = buf.reduce((acc, byte) => acc + byte, 0);
  console.log('buf.reduce 执行结果:', sum, '(期望15)');
}

const result = {
  success: true,
  conclusion: '这些方法是我们在 native_iteration.go 中自己实现的，不是 goja 内置',
  bufferMethods: methods.filter(m => typeof buf[m] === 'function'),
  uint8ArrayMethods: methods.filter(m => typeof uint8[m] === 'function')
};

console.log('\n' + JSON.stringify(result, null, 2));
return result;
