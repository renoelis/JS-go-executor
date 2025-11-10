const Buffer = require('buffer').Buffer;

console.log('========================================');
console.log('  Buffer 优化验证测试');
console.log('========================================\n');

const results = {};

// 1. Buffer.from 性能优化（ArrayBuffer）
console.log('1. Buffer.from 性能优化:');
try {
    // 测试各种编码都能正常工作
    const buf1 = Buffer.from('hello', 'utf8');
    results.from_utf8 = buf1.toString() === 'hello';
    
    const buf2 = Buffer.from('616263', 'hex');
    results.from_hex = buf2.toString() === 'abc';
    
    const buf3 = Buffer.from('aGVsbG8=', 'base64');
    results.from_base64 = buf3.toString() === 'hello';
    
    const buf4 = Buffer.from('test', 'utf16le');
    results.from_utf16le = buf4.length === 8;  // 4 字符 * 2 字节
    
    console.log('   UTF-8:', results.from_utf8 ? '✅' : '❌');
    console.log('   Hex:', results.from_hex ? '✅' : '❌');
    console.log('   Base64:', results.from_base64 ? '✅' : '❌');
    console.log('   UTF-16LE:', results.from_utf16le ? '✅' : '❌');
} catch (e) {
    console.log('   ❌ 失败:', e.message);
    results.from_utf8 = false;
    results.from_hex = false;
    results.from_base64 = false;
    results.from_utf16le = false;
}

// 2. Buffer.isBuffer 更严格的判断
console.log('\n2. Buffer.isBuffer 严格判断:');
try {
    // 真正的 Buffer
    const buf = Buffer.from([1, 2, 3]);
    results.isBuffer_buffer = Buffer.isBuffer(buf) === true;
    
    // 普通数组
    const arr = [1, 2, 3];
    results.isBuffer_array = Buffer.isBuffer(arr) === false;
    
    // 普通对象
    const obj = { length: 3 };
    results.isBuffer_object = Buffer.isBuffer(obj) === false;
    
    // 字符串
    const str = 'hello';
    results.isBuffer_string = Buffer.isBuffer(str) === false;
    
    // null/undefined
    results.isBuffer_null = Buffer.isBuffer(null) === false;
    results.isBuffer_undefined = Buffer.isBuffer(undefined) === false;
    
    console.log('   Buffer:', results.isBuffer_buffer ? '✅' : '❌');
    console.log('   Array:', results.isBuffer_array ? '✅' : '❌');
    console.log('   Object:', results.isBuffer_object ? '✅' : '❌');
    console.log('   String:', results.isBuffer_string ? '✅' : '❌');
    console.log('   null:', results.isBuffer_null ? '✅' : '❌');
    console.log('   undefined:', results.isBuffer_undefined ? '✅' : '❌');
} catch (e) {
    console.log('   ❌ 失败:', e.message);
    results.isBuffer_buffer = false;
    results.isBuffer_array = false;
    results.isBuffer_object = false;
    results.isBuffer_string = false;
    results.isBuffer_null = false;
    results.isBuffer_undefined = false;
}

// 3. 共享视图性能
console.log('\n3. 共享视图性能:');
try {
    const original = Buffer.from([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    
    // slice 应该返回共享视图
    const slice = original.slice(2, 8);
    slice[0] = 99;
    results.slice_shared = original[2] === 99;
    
    // subarray 应该返回共享视图
    const sub = original.subarray(4, 7);
    sub[0] = 88;
    results.subarray_shared = original[4] === 88;
    
    console.log('   slice 共享:', results.slice_shared ? '✅' : '❌');
    console.log('   subarray 共享:', results.subarray_shared ? '✅' : '❌');
} catch (e) {
    console.log('   ❌ 失败:', e.message);
    results.slice_shared = false;
    results.subarray_shared = false;
}

// 4. 大小写不敏感优化
console.log('\n4. 编码大小写不敏感:');
try {
    // 各种大小写组合
    const encodings = [
        ['UTF8', 'utf8'],
        ['Utf8', 'utf8'],
        ['HEX', 'hex'],
        ['Hex', 'hex'],
        ['BASE64', 'base64'],
        ['Base64', 'base64'],
        ['BASE64URL', 'base64url'],
        ['Base64Url', 'base64url']
    ];
    
    let allPassed = true;
    for (const [upper, lower] of encodings) {
        const isValid = Buffer.isEncoding(upper);
        if (!isValid) {
            allPassed = false;
            console.log('   ❌', upper, '不被识别');
        }
    }
    
    results.encoding_case_insensitive = allPassed;
    console.log('   所有编码大小写:', results.encoding_case_insensitive ? '✅' : '❌');
} catch (e) {
    console.log('   ❌ 失败:', e.message);
    results.encoding_case_insensitive = false;
}

// 5. 宽松解码优化
console.log('\n5. 宽松解码:');
try {
    // base64 宽松
    const b64_1 = Buffer.from('Y W J j', 'base64');
    results.base64_spaces = b64_1.toString() === 'abc';
    
    const b64_2 = Buffer.from('YWJj==', 'base64');
    results.base64_padding = b64_2.toString() === 'abc';
    
    // base64url 宽松
    const b64url_1 = Buffer.from('Y W J j', 'base64url');
    results.base64url_spaces = b64url_1.toString() === 'abc';
    
    const b64url_2 = Buffer.from('YWJj==', 'base64url');
    results.base64url_padding = b64url_2.toString() === 'abc';
    
    console.log('   base64 空格:', results.base64_spaces ? '✅' : '❌');
    console.log('   base64 padding:', results.base64_padding ? '✅' : '❌');
    console.log('   base64url 空格:', results.base64url_spaces ? '✅' : '❌');
    console.log('   base64url padding:', results.base64url_padding ? '✅' : '❌');
} catch (e) {
    console.log('   ❌ 失败:', e.message);
    results.base64_spaces = false;
    results.base64_padding = false;
    results.base64url_spaces = false;
    results.base64url_padding = false;
}

// 6. allocUnsafe 行为
console.log('\n6. allocUnsafe 行为:');
try {
    const buf = Buffer.allocUnsafe(10);
    
    // 检查是否零初始化
    let allZero = true;
    for (let i = 0; i < buf.length; i++) {
        if (buf[i] !== 0) {
            allZero = false;
            break;
        }
    }
    
    results.allocUnsafe_zeroed = allZero;
    console.log('   零初始化:', results.allocUnsafe_zeroed ? '✅' : '❌');
    console.log('   注意: 这与 Node.js 不同（TypedArray 规范限制）');
} catch (e) {
    console.log('   ❌ 失败:', e.message);
    results.allocUnsafe_zeroed = false;
}

console.log('\n========================================');
console.log('  测试总结');
console.log('========================================');

// 统计结果
let passed = 0;
let failed = 0;

for (const key in results) {
    if (results[key] === true) {
        passed++;
    } else {
        failed++;
    }
}

const total = passed + failed;
console.log('通过:', passed);
console.log('失败:', failed);
console.log('总计:', total);
console.log('成功率:', ((passed / total) * 100).toFixed(1) + '%');

if (failed === 0) {
    console.log('\n🎉 所有优化验证通过！');
} else {
    console.log('\n⚠️  有', failed, '个测试失败');
    console.log('\n失败的测试:');
    for (const key in results) {
        if (!results[key]) {
            console.log('  -', key);
        }
    }
}

return {
    passed: passed,
    failed: failed,
    total: total,
    successRate: ((passed / total) * 100).toFixed(1) + '%',
    details: results
};
