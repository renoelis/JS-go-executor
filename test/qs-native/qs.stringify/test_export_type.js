// 测试 Export 类型
const qs = require('qs');

// 创建一个简单的包装来测试
const testObj = {
  regular: 123,
  bigInt: BigInt(456),
  buffer: Buffer.from('test')
};

// 测试 qs.stringify
console.log('=== Test Results ===');
console.log('Regular int:', qs.stringify({ x: 123 }));
console.log('BigInt:', qs.stringify({ x: BigInt(456) }));
console.log('Buffer:', qs.stringify({ x: Buffer.from('test') }));
console.log('Mixed:', qs.stringify(testObj));

// 检查类型
console.log('\n=== Type Check ===');
console.log('typeof 123:', typeof 123);
console.log('typeof BigInt(456):', typeof BigInt(456));
console.log('typeof Buffer:', typeof Buffer.from('test'));

return {
  regular: qs.stringify({ x: 123 }),
  bigInt: qs.stringify({ x: BigInt(456) }),
  buffer: qs.stringify({ x: Buffer.from('test') }),
  mixed: qs.stringify(testObj)
};



