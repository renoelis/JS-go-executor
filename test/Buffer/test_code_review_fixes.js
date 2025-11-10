const Buffer = require('buffer').Buffer;

console.log('========================================');
console.log('  代码审查修复验证测试（第2轮）');
console.log('========================================\n');

const results = {};

// ===== 第2轮修复测试 =====

// 1. write() 参数类型判定
console.log('【第2轮】1. write() 参数类型判定:');
try {
    const buf = Buffer.alloc(10);
    
    // write('abc', '10') - '10' 是字符串，应该当作 encoding，不是 offset
    // Node.js 会抛出错误（未知编码）
    try {
        buf.write('abc', '10');
        results.write_string_param = false;  // 应该抛出错误
        console.log('   ❌ 应该抛出错误（未知编码），但没有');
    } catch (err) {
        // 预期抛出错误
        results.write_string_param = true;
        console.log('   ✅ 正确抛出错误:', err.message.substring(0, 50));
    }
} catch (e) {
    console.log('   ❌ 失败:', e.message);
    results.write_string_param = false;
}

// 2. writeInt8 范围校验
console.log('\n【第2轮】2. writeInt8 范围校验:');
try {
    const buf = Buffer.alloc(10);
    
    // 超出范围 [-128, 127]
    try {
        buf.writeInt8(200, 0);  // 超出上界
        results.writeInt8_range = false;  // 应该抛出错误
        console.log('   ❌ 应该抛出 RangeError，但没有');
    } catch (err) {
        results.writeInt8_range = err.message.includes('范围') || err.message.includes('range');
        console.log('   ✅ 正确抛出 RangeError:', err.message.substring(0, 50));
    }
} catch (e) {
    console.log('   ❌ 失败:', e.message);
    results.writeInt8_range = false;
}

// 3. writeUInt8 范围校验
console.log('\n【第2轮】3. writeUInt8 范围校验:');
try {
    const buf = Buffer.alloc(10);
    
    // 超出范围 [0, 255]
    try {
        buf.writeUInt8(300, 0);  // 超出上界
        results.writeUInt8_range = false;  // 应该抛出错误
        console.log('   ❌ 应该抛出 RangeError，但没有');
    } catch (err) {
        results.writeUInt8_range = err.message.includes('范围') || err.message.includes('range');
        console.log('   ✅ 正确抛出 RangeError:', err.message.substring(0, 50));
    }
} catch (e) {
    console.log('   ❌ 失败:', e.message);
    results.writeUInt8_range = false;
}

// 4. fill() 编码一致性（已在之前测试中验证，这里再次确认）
console.log('\n【第2轮】4. fill() 编码一致性:');
try {
    const buf = Buffer.alloc(6);
    buf.fill('YWJj', 0, 3, 'Base64Url');  // 大小写混合
    
    const result = buf.toString('utf8', 0, 3);
    results.fill_encoding = result === 'abc';
    console.log('   结果:', result, '- 预期: abc');
    console.log('   测试:', results.fill_encoding ? '✅' : '❌');
} catch (e) {
    console.log('   ❌ 失败:', e.message);
    results.fill_encoding = false;
}

// ===== 第1轮修复测试（保留） =====

console.log('\n========================================');
console.log('  第1轮修复测试（保留）');
console.log('========================================\n');

// 1. byteLength base64url 宽松解码
console.log('1. byteLength base64url 宽松解码:');
try {
    // 注意：Node.js 的 byteLength 不支持带空格，只有 from/write 支持
    // 我们的实现更宽松，但为了兼容性测试，使用不带空格的
    const len1 = Buffer.byteLength('YWJj', 'base64url');
    results.byteLength_no_padding = len1 === 3;
    console.log('   无 padding:', len1, '- 预期: 3', results.byteLength_no_padding ? '✅' : '❌');
    
    const len2 = Buffer.byteLength('YWJj==', 'base64url');
    results.byteLength_padding = len2 === 3;
    console.log('   带 padding:', len2, '- 预期: 3', results.byteLength_padding ? '✅' : '❌');
} catch (e) {
    console.log('   ❌ 失败:', e.message);
    results.byteLength_no_padding = false;
    results.byteLength_padding = false;
}

// 2. Buffer.from base64url 宽松
console.log('\n2. Buffer.from base64url 宽松:');
try {
    const buf = Buffer.from('YWJj==', 'base64url');
    results.from_base64url = buf.toString() === 'abc';
    console.log('   结果:', buf.toString(), '- 预期: abc', results.from_base64url ? '✅' : '❌');
} catch (e) {
    console.log('   ❌ 失败:', e.message);
    results.from_base64url = false;
}

// 3. write 大小写 & base64url
console.log('\n3. write 大小写 & base64url:');
try {
    const b = Buffer.alloc(3);
    const written = b.write('YWJj', 'Base64Url');
    results.write_case = written === 3;
    console.log('   写入字节数:', written, '- 预期: 3', results.write_case ? '✅' : '❌');
    
    results.write_result = b.toString() === 'abc';
    console.log('   结果:', b.toString(), '- 预期: abc', results.write_result ? '✅' : '❌');
} catch (e) {
    console.log('   ❌ 失败:', e.message);
    results.write_case = false;
    results.write_result = false;
}

// 4. write base64url 宽松（带 padding）
console.log('\n4. write base64url 宽松:');
try {
    const b = Buffer.alloc(3);
    b.write('YWJj==', 'base64url');
    results.write_base64url_padding = b.toString() === 'abc';
    console.log('   结果:', b.toString(), '- 预期: abc', results.write_base64url_padding ? '✅' : '❌');
} catch (e) {
    console.log('   ❌ 失败:', e.message);
    results.write_base64url_padding = false;
}

// 5. lastIndexOf 大小写
console.log('\n5. lastIndexOf 大小写:');
try {
    const s = Buffer.from('A𠮷B', 'utf16le');
    const idx = s.lastIndexOf('𠮷', 'UTF16LE');
    results.lastIndexOf_case = idx === 2;
    console.log('   索引:', idx, '- 预期: 2', results.lastIndexOf_case ? '✅' : '❌');
} catch (e) {
    console.log('   ❌ 失败:', e.message);
    results.lastIndexOf_case = false;
}

// 6. toString 大小写
console.log('\n6. toString 大小写:');
try {
    const buf = Buffer.from('616263', 'hex');
    const str = buf.toString('Utf8');
    results.toString_case = str === 'abc';
    console.log('   结果:', str, '- 预期: abc', results.toString_case ? '✅' : '❌');
} catch (e) {
    console.log('   ❌ 失败:', e.message);
    results.toString_case = false;
}

// 7. includes 传递 encoding
console.log('\n7. includes 传递 encoding:');
try {
    const h = Buffer.from('616263', 'hex');
    const found = h.includes('62', 0, 'hex');
    results.includes_encoding = found === true;
    console.log('   结果:', found, '- 预期: true', results.includes_encoding ? '✅' : '❌');
} catch (e) {
    console.log('   ❌ 失败:', e.message);
    results.includes_encoding = false;
}

// 8. 综合测试：多种大小写组合
console.log('\n8. 综合大小写测试:');
try {
    // Buffer.from
    const b1 = Buffer.from('test', 'UTF8');
    results.from_utf8_upper = b1.toString() === 'test';
    
    // Buffer.byteLength - 使用有效的十六进制字符串
    const len = Buffer.byteLength('74657374', 'HEX');  // 'test' 的十六进制
    results.byteLength_hex_upper = len === 4;
    
    // write
    const b2 = Buffer.alloc(4);
    b2.write('test', 'ASCII');
    results.write_ascii_upper = b2.toString() === 'test';
    
    // toString
    const b3 = Buffer.from([0x61, 0x62, 0x63]);
    results.toString_hex_upper = b3.toString('HEX') === '616263';
    
    // indexOf
    const b4 = Buffer.from('hello');
    results.indexOf_utf8_upper = b4.indexOf('ll', 0, 'UTF8') === 2;
    
    console.log('   Buffer.from UTF8:', results.from_utf8_upper ? '✅' : '❌');
    console.log('   Buffer.byteLength HEX:', results.byteLength_hex_upper ? '✅' : '❌');
    console.log('   write ASCII:', results.write_ascii_upper ? '✅' : '❌');
    console.log('   toString HEX:', results.toString_hex_upper ? '✅' : '❌');
    console.log('   indexOf UTF8:', results.indexOf_utf8_upper ? '✅' : '❌');
} catch (e) {
    console.log('   ❌ 失败:', e.message);
    results.from_utf8_upper = false;
    results.byteLength_hex_upper = false;
    results.write_ascii_upper = false;
    results.toString_hex_upper = false;
    results.indexOf_utf8_upper = false;
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
    console.log('\n🎉 所有代码审查修复验证通过！');
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
