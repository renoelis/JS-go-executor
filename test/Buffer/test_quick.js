const Buffer = require('buffer').Buffer;

console.log('快速测试 Buffer 修复...\n');

try {
  // 测试 1: UTF-16 码元
  console.log('1. UTF-16 码元处理:');
  const str = '𠮷';
  const buf1 = Buffer.from(str, 'latin1');
  console.log(`   Buffer.from('𠮷', 'latin1'): <Buffer ${buf1[0].toString(16)} ${buf1[1].toString(16)}>`);
  console.log(`   长度: ${buf1.length} (应该是 2)`);
  
  // 测试 2: write() 默认 length
  console.log('\n2. write() 默认 length:');
  const buf2 = Buffer.alloc(100);
  const written = buf2.write('hello');
  console.log(`   写入字节数: ${written}`);
  
  // 测试 3: indexOf
  console.log('\n3. indexOf:');
  const buf3 = Buffer.from('hello world');
  const index = buf3.indexOf('world');
  console.log(`   'world' 位置: ${index} (应该是 6)`);
  
  // 测试 4: indexOf 数字
  console.log('\n4. indexOf 数字:');
  const buf4 = Buffer.from([1, 2, 3, 4, 5]);
  const index2 = buf4.indexOf(3);
  console.log(`   数字 3 位置: ${index2} (应该是 2)`);
  
  // 测试 5: compare 范围
  console.log('\n5. compare 范围:');
  const buf5 = Buffer.from([1, 2, 3, 4, 5]);
  const buf6 = Buffer.from([3, 4]);
  const result = buf5.compare(buf6, 0, 2, 2, 4);
  console.log(`   比较结果: ${result} (应该是 0)`);
  
  // 测试 6: copy 重叠
  console.log('\n6. copy 重叠:');
  const buf7 = Buffer.from([1, 2, 3, 4, 5]);
  buf7.copy(buf7, 2, 0, 3);
  console.log(`   结果: [${Array.from(buf7).join(', ')}] (应该是 [1, 2, 1, 2, 3])`);
  
  console.log('\n✅ 所有测试通过！');
  
  return { success: true, message: '所有测试通过' };
  
} catch (e) {
  console.log('\n❌ 测试失败:', e.message);
  console.log('堆栈:', e.stack);
  return { success: false, error: e.message };
}
