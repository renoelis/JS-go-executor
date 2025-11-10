/**
 * 调试 Pinyin 实例创建
 */

const { Pinyin } = require('pinyin');

console.log('=== Pinyin 实例调试 ===\n');

console.log('1. Pinyin 类型:', typeof Pinyin);
console.log('2. Pinyin 是函数:', typeof Pinyin === 'function' ? '✅' : '❌');

try {
    const instance = new Pinyin();
    console.log('\n3. 实例创建成功: ✅');
    console.log('4. 实例类型:', typeof instance);
    console.log('5. 实例是对象:', typeof instance === 'object' ? '✅' : '❌');
    console.log('6. instance instanceof Object:', instance instanceof Object ? '✅' : '❌');
    console.log('7. instance instanceof Pinyin:', instance instanceof Pinyin ? '✅' : '❌');
    console.log('8. 实例值:', instance);
    console.log('9. 实例键:', Object.keys(instance));
    
    console.log('\n10. 方法检查:');
    console.log('   - segment 存在:', typeof instance.segment === 'function' ? '✅' : '❌');
    console.log('   - pinyin 存在:', typeof instance.pinyin === 'function' ? '✅' : '❌');
    console.log('   - compare 存在:', typeof instance.compare === 'function' ? '✅' : '❌');
    console.log('   - compact 存在:', typeof instance.compact === 'function' ? '✅' : '❌');
    
    console.log('\n11. 测试 segment 方法:');
    const result = instance.segment('我喜欢你');
    console.log('   结果:', JSON.stringify(result));
    console.log('   成功:', Array.isArray(result) ? '✅' : '❌');
    
} catch (error) {
    console.log('\n3. 实例创建失败: ❌');
    console.log('   错误:', error.message);
    console.log('   堆栈:', error.stack);
}

console.log('\n=== 调试完成 ===');
