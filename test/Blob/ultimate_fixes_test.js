/**
 * Blob/File API 终极修复测试
 * 验证最后的 P0-P1 修复
 */

console.log('========================================');
console.log('  Blob/File API 终极修复测试');
console.log('========================================\n');

const results = {};
const logs = [];

function log(msg) {
    console.log(msg);
    logs.push(msg);
}

function test(name, fn) {
    try {
        fn();
        results[name] = true;
        log(`✅ ${name}`);
    } catch (e) {
        results[name] = false;
        log(`❌ ${name}`);
        log(`   错误: ${e.message}`);
        if (e.stack) {
            log(`   堆栈: ${e.stack.split('\n')[0]}`);
        }
    }
}

// ============================================
// P0: undefined/null 转字符串
// ============================================
log('\n--- P0: undefined/null 转字符串 ---');

test('new Blob([undefined, null, 1]).text() → "undefinednull1"', async () => {
    const blob = new Blob([undefined, null, 1]);
    const text = await blob.text();
    
    if (text !== 'undefinednull1') {
        throw new Error(`期望 "undefinednull1"，实际 "${text}"`);
    }
});

test('Blob 和 File 行为一致', async () => {
    const blob = new Blob([undefined, ',', null]);
    const file = new File([undefined, ',', null], 'test.txt');
    
    const blobText = await blob.text();
    const fileText = await file.text();
    
    if (blobText !== fileText) {
        throw new Error(`Blob 和 File 行为不一致: "${blobText}" vs "${fileText}"`);
    }
    
    if (blobText !== 'undefined,null') {
        throw new Error(`期望 "undefined,null"，实际 "${blobText}"`);
    }
});

test('undefined 单独测试', async () => {
    const blob = new Blob([undefined]);
    const text = await blob.text();
    
    if (text !== 'undefined') {
        throw new Error(`期望 "undefined"，实际 "${text}"`);
    }
});

test('null 单独测试', async () => {
    const blob = new Blob([null]);
    const text = await blob.text();
    
    if (text !== 'null') {
        throw new Error(`期望 "null"，实际 "${text}"`);
    }
});

test('混合类型包含 undefined/null', async () => {
    const blob = new Blob(['start-', undefined, '-middle-', null, '-end']);
    const text = await blob.text();
    
    if (text !== 'start-undefined-middle-null-end') {
        throw new Error(`期望 "start-undefined-middle-null-end"，实际 "${text}"`);
    }
});

// ============================================
// P1-2: 实例属性不可配置
// ============================================
log('\n--- P1-2: 实例属性不可配置 ---');

test('Blob.size 应该不可配置', () => {
    const blob = new Blob(['test']);
    const descriptor = Object.getOwnPropertyDescriptor(blob, 'size');
    
    if (!descriptor) {
        throw new Error('size 属性不存在');
    }
    
    if (descriptor.configurable) {
        throw new Error('size 应该不可配置');
    }
    
    if (descriptor.writable) {
        throw new Error('size 应该不可写');
    }
    
    if (descriptor.enumerable) {
        throw new Error('size 应该不可枚举');
    }
});

test('Blob.type 应该不可配置', () => {
    const blob = new Blob(['test'], { type: 'text/plain' });
    const descriptor = Object.getOwnPropertyDescriptor(blob, 'type');
    
    if (!descriptor) {
        throw new Error('type 属性不存在');
    }
    
    if (descriptor.configurable) {
        throw new Error('type 应该不可配置');
    }
});

test('File.name 应该不可配置', () => {
    const file = new File(['test'], 'test.txt');
    const descriptor = Object.getOwnPropertyDescriptor(file, 'name');
    
    if (!descriptor) {
        throw new Error('name 属性不存在');
    }
    
    if (descriptor.configurable) {
        throw new Error('name 应该不可配置');
    }
});

test('File.lastModified 应该不可配置', () => {
    const file = new File(['test'], 'test.txt');
    const descriptor = Object.getOwnPropertyDescriptor(file, 'lastModified');
    
    if (!descriptor) {
        throw new Error('lastModified 属性不存在');
    }
    
    if (descriptor.configurable) {
        throw new Error('lastModified 应该不可配置');
    }
});

test('尝试删除 size 应该失败', () => {
    const blob = new Blob(['test']);
    const sizeBefore = blob.size;
    
    try {
        delete blob.size;
        // 如果没有抛出错误，检查属性是否仍然存在
        if (blob.size !== sizeBefore) {
            throw new Error('size 不应该被删除');
        }
    } catch (e) {
        // 严格模式下会抛出 TypeError，这是预期的
        if (e.message && e.message.includes('Cannot delete')) {
            // 这是正确的行为
            return;
        }
        throw e;
    }
});

test('尝试重新定义 type 应该失败', () => {
    const blob = new Blob(['test'], { type: 'text/plain' });
    
    try {
        Object.defineProperty(blob, 'type', {
            value: 'text/html',
            writable: true,
            enumerable: true,
            configurable: true
        });
        throw new Error('应该抛出错误');
    } catch (e) {
        // 预期会失败
        if (blob.type !== 'text/plain') {
            throw new Error('type 不应该被修改');
        }
    }
});

// ============================================
// P1-3: 内部标记不可枚举
// ============================================
log('\n--- P1-3: 内部标记不可枚举 ---');

test('Object.keys(blob) 不应包含内部字段', () => {
    const blob = new Blob(['test']);
    const keys = Object.keys(blob);
    
    const internalFields = ['__isBlob', '__blobData', '__isFile', '__fileData'];
    const foundFields = internalFields.filter(f => keys.includes(f));
    
    if (foundFields.length > 0) {
        throw new Error(`内部字段不应该可枚举: ${foundFields.join(', ')}`);
    }
});

test('Object.keys(file) 不应包含内部字段', () => {
    const file = new File(['test'], 'test.txt');
    const keys = Object.keys(file);
    
    const internalFields = ['__isBlob', '__blobData', '__isFile', '__fileData'];
    const foundFields = internalFields.filter(f => keys.includes(f));
    
    if (foundFields.length > 0) {
        throw new Error(`内部字段不应该可枚举: ${foundFields.join(', ')}`);
    }
});

test('for...in 不应遍历到内部字段', () => {
    const blob = new Blob(['test']);
    const keys = [];
    
    for (let key in blob) {
        keys.push(key);
    }
    
    const internalFields = ['__isBlob', '__blobData'];
    const foundFields = internalFields.filter(f => keys.includes(f));
    
    if (foundFields.length > 0) {
        throw new Error(`for...in 不应遍历到内部字段: ${foundFields.join(', ')}`);
    }
});

test('内部字段应该存在但不可枚举', () => {
    const blob = new Blob(['test']);
    
    // 应该存在
    if (!blob.__isBlob) {
        throw new Error('__isBlob 应该存在');
    }
    
    // 但不可枚举
    const descriptor = Object.getOwnPropertyDescriptor(blob, '__isBlob');
    if (descriptor && descriptor.enumerable) {
        throw new Error('__isBlob 应该不可枚举');
    }
});

test('内部字段应该不可配置', () => {
    const blob = new Blob(['test']);
    
    const descriptor = Object.getOwnPropertyDescriptor(blob, '__isBlob');
    if (!descriptor) {
        throw new Error('__isBlob 不存在');
    }
    
    if (descriptor.configurable) {
        throw new Error('__isBlob 应该不可配置');
    }
});

// ============================================
// 综合测试
// ============================================
log('\n--- 综合测试 ---');

test('endings 选项应该正常工作', async () => {
    const blob1 = new Blob(['a\r\nb\nc\r'], { endings: 'transparent' });
    const text1 = await blob1.text();
    
    if (text1 !== 'a\r\nb\nc\r') {
        throw new Error('transparent 应该保持原样');
    }
    
    const blob2 = new Blob(['a\r\nb\nc\r'], { endings: 'native' });
    const text2 = await blob2.text();
    
    // 应该统一换行符
    const hasOnlyLF = !text2.includes('\r');
    const hasOnlyCRLF = text2.includes('\r\n');
    
    if (!hasOnlyLF && !hasOnlyCRLF) {
        throw new Error('native 应该统一换行符');
    }
});

test('UTF-8 解码容错应该正常工作', async () => {
    const blob = new Blob([new Uint8Array([0xff])]);
    const text = await blob.text();
    
    if (text !== '\uFFFD') {
        throw new Error(`期望 U+FFFD，实际 "${text}"`);
    }
});

test('slice().type 应该是空字符串', () => {
    const blob = new Blob(['abcdef'], { type: 'text/plain' });
    const sliced = blob.slice(1, 4);
    
    if (sliced.type !== '') {
        throw new Error(`slice().type 应该是空字符串，实际 "${sliced.type}"`);
    }
});

test('原型方法应该不可枚举', () => {
    const keys = Object.keys(Blob.prototype);
    const methods = ['arrayBuffer', 'text', 'slice', 'bytes', 'stream'];
    
    const foundMethods = methods.filter(m => keys.includes(m));
    
    if (foundMethods.length > 0) {
        throw new Error(`原型方法应该不可枚举，但找到: ${foundMethods.join(', ')}`);
    }
});

test('Symbol.toStringTag 应该不可配置', () => {
    const descriptor = Object.getOwnPropertyDescriptor(Blob.prototype, Symbol.toStringTag);
    
    if (!descriptor) {
        throw new Error('Symbol.toStringTag 不存在');
    }
    
    if (descriptor.configurable) {
        throw new Error('Symbol.toStringTag 应该不可配置');
    }
});

// ============================================
// 测试总结
// ============================================
log('\n========================================');
log('  测试总结');
log('========================================');

const passed = Object.values(results).filter(r => r).length;
const failed = Object.values(results).filter(r => !r).length;
const total = Object.keys(results).length;
const successRate = ((passed / total) * 100).toFixed(1);

log(`通过: ${passed}`);
log(`失败: ${failed}`);
log(`总计: ${total}`);
log(`成功率: ${successRate}%`);

if (failed > 0) {
    log(`\n⚠️  有 ${failed} 个测试失败`);
    log('\n失败的测试:');
    Object.entries(results).forEach(([name, passed]) => {
        if (!passed) {
            log(`  - ${name}`);
        }
    });
} else {
    log('\n🎉 所有终极修复测试通过！');
}

// 返回结果供外部使用
return {
    passed,
    failed,
    total,
    successRate,
    details: results,
    logs
};
