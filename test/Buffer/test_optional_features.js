const Buffer = require('buffer').Buffer;

console.log('========================================');
console.log('  测试可选功能');
console.log('========================================\n');

const results = {};

// 1. fill 支持 Buffer
console.log('1. fill 支持 Buffer:');
try {
    const buf = Buffer.alloc(9);
    buf.fill(Buffer.from([1, 2, 3]));
    const result = Array.from(buf).join(',');
    console.log('   结果:', result);
    console.log('   预期: 1,2,3,1,2,3,1,2,3');
    results.fill_buffer = result === '1,2,3,1,2,3,1,2,3';
    console.log('   ', results.fill_buffer ? '✅' : '❌');
} catch (e) {
    console.log('   ❌ 失败:', e.message);
    results.fill_buffer = false;
}

// 2. fill 支持 Uint8Array
console.log('\n2. fill 支持 Uint8Array:');
try {
    const buf = Buffer.alloc(6);
    const arr = new Uint8Array([10, 20]);
    buf.fill(arr);
    const result = Array.from(buf).join(',');
    console.log('   结果:', result);
    console.log('   预期: 10,20,10,20,10,20');
    results.fill_uint8array = result === '10,20,10,20,10,20';
    console.log('   ', results.fill_uint8array ? '✅' : '❌');
} catch (e) {
    console.log('   ❌ 失败:', e.message);
    results.fill_uint8array = false;
}

// 3. 迭代器 Symbol.iterator
console.log('\n3. 迭代器 Symbol.iterator:');
try {
    const buf = Buffer.from([10, 20, 30]);
    const iter = buf.values();
    
    // 检查是否有 Symbol.iterator（兼容 goja 和 Node.js）
    let hasSymbolIterator = false;
    let iteratorFn = null;
    
    // 优先检查真正的 Symbol.iterator（Node.js 标准）
    if (typeof Symbol !== 'undefined' && Symbol.iterator) {
        if (typeof iter[Symbol.iterator] === 'function') {
            hasSymbolIterator = true;
            iteratorFn = iter[Symbol.iterator];
            console.log('   有 Symbol.iterator (标准):', true);
        }
    }
    
    // 如果没有，检查字符串属性（goja 兼容）
    if (!hasSymbolIterator && typeof iter['Symbol.iterator'] === 'function') {
        hasSymbolIterator = true;
        iteratorFn = iter['Symbol.iterator'];
        console.log('   有 Symbol.iterator (字符串):', true);
    }
    
    if (hasSymbolIterator && iteratorFn) {
        // 测试是否返回自身
        const self = iteratorFn.call(iter);
        results.iterator_symbol = (self === iter);
        console.log('   返回自身:', results.iterator_symbol);
    } else {
        console.log('   Symbol.iterator 不可用');
        results.iterator_symbol = 'N/A';
    }
    
    // 测试 next() 仍然可用
    const val1 = iter.next();
    results.iterator_next = val1.value === 10 && val1.done === false;
    console.log('   next() 可用:', results.iterator_next ? '✅' : '❌');
} catch (e) {
    console.log('   ❌ 失败:', e.message);
    results.iterator_symbol = false;
    results.iterator_next = false;
}

// 4. encoding 大小写（所有方法）
console.log('\n4. encoding 大小写不敏感:');
try {
    // Buffer.from
    const buf1 = Buffer.from('616263', 'HEX');
    results.from_hex_upper = buf1.toString('utf8') === 'abc';
    
    // Buffer.byteLength
    const len = Buffer.byteLength('abc', 'UTF8');
    results.bytelength_upper = len === 3;
    
    // buf.write
    const buf2 = Buffer.alloc(10);
    buf2.write('abc', 0, 'UTF8');
    results.write_upper = buf2.toString('utf8', 0, 3) === 'abc';
    
    // buf.toString
    const buf3 = Buffer.from('abc');
    results.tostring_upper = buf3.toString('UTF8') === 'abc';
    
    console.log('   Buffer.from HEX:', results.from_hex_upper ? '✅' : '❌');
    console.log('   Buffer.byteLength UTF8:', results.bytelength_upper ? '✅' : '❌');
    console.log('   buf.write UTF8:', results.write_upper ? '✅' : '❌');
    console.log('   buf.toString UTF8:', results.tostring_upper ? '✅' : '❌');
} catch (e) {
    console.log('   ❌ 失败:', e.message);
    results.from_hex_upper = false;
    results.bytelength_upper = false;
    results.write_upper = false;
    results.tostring_upper = false;
}

// 5. base64url 完整测试
console.log('\n5. base64url 完整支持:');
try {
    // 无 padding
    const buf1 = Buffer.from('YWJj', 'base64url');
    results.base64url_no_padding = buf1.toString('utf8') === 'abc';
    
    // 有 padding
    const buf2 = Buffer.from('YWJj==', 'base64url');
    results.base64url_with_padding = buf2.toString('utf8') === 'abc';
    
    // 带空格
    const buf3 = Buffer.from('Y W J j', 'base64url');
    results.base64url_with_spaces = buf3.toString('utf8') === 'abc';
    
    console.log('   无 padding:', results.base64url_no_padding ? '✅' : '❌');
    console.log('   有 padding:', results.base64url_with_padding ? '✅' : '❌');
    console.log('   带空格:', results.base64url_with_spaces ? '✅' : '❌');
} catch (e) {
    console.log('   ❌ 失败:', e.message);
    results.base64url_no_padding = false;
    results.base64url_with_padding = false;
    results.base64url_with_spaces = false;
}

console.log('\n========================================');
console.log('  测试总结');
console.log('========================================');

// 统计结果
let passed = 0;
let failed = 0;
let na = 0;

for (const key in results) {
    if (results[key] === true) {
        passed++;
    } else if (results[key] === 'N/A') {
        na++;
    } else {
        failed++;
    }
}

const total = passed + failed + na;
console.log('通过:', passed);
console.log('失败:', failed);
console.log('不适用:', na);
console.log('总计:', total);
console.log('成功率:', ((passed / (passed + failed)) * 100).toFixed(1) + '%');

if (failed === 0) {
    console.log('\n🎉 所有可选功能测试通过！');
} else {
    console.log('\n⚠️  有', failed, '个测试失败');
}

return {
    passed: passed,
    failed: failed,
    na: na,
    total: total,
    successRate: ((passed / (passed + failed)) * 100).toFixed(1) + '%',
    details: results
};
