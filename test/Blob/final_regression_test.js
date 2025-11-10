/**
 * Blob/File API 最终回归测试
 * 验证所有关键修复点
 */

console.log('========================================');
console.log('  Blob/File API 最终回归测试');
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
    }
}

// ============================================
// 回归测试 1: constructor 不可枚举
// ============================================
log('\n--- 回归测试 1: constructor 不可枚举 ---');

test('Object.keys(Blob.prototype) 不含 constructor', () => {
    const keys = Object.keys(Blob.prototype);
    
    if (keys.includes('constructor')) {
        throw new Error('constructor 应该不可枚举');
    }
});

test('Object.keys(Blob.prototype) 不含方法', () => {
    const keys = Object.keys(Blob.prototype);
    const methods = ['constructor', 'arrayBuffer', 'text', 'slice', 'bytes', 'stream'];
    
    const foundMethods = methods.filter(m => keys.includes(m));
    
    if (foundMethods.length > 0) {
        throw new Error(`这些属性应该不可枚举: ${foundMethods.join(', ')}`);
    }
});

test('Blob.prototype.constructor 应该存在', () => {
    if (typeof Blob.prototype.constructor !== 'function') {
        throw new Error('constructor 应该存在');
    }
    
    if (Blob.prototype.constructor !== Blob) {
        throw new Error('constructor 应该指向 Blob');
    }
});

test('Blob.prototype.constructor 描述符正确', () => {
    const descriptor = Object.getOwnPropertyDescriptor(Blob.prototype, 'constructor');
    
    if (!descriptor) {
        throw new Error('constructor 描述符不存在');
    }
    
    if (descriptor.enumerable) {
        throw new Error('constructor 应该不可枚举');
    }
    
    if (!descriptor.writable) {
        throw new Error('constructor 应该可写');
    }
    
    if (!descriptor.configurable) {
        throw new Error('constructor 应该可配置');
    }
});

test('File.prototype.constructor 也不可枚举', () => {
    const keys = Object.keys(File.prototype);
    
    if (keys.includes('constructor')) {
        throw new Error('File.prototype.constructor 应该不可枚举');
    }
});

// ============================================
// 回归测试 2: undefined/null 转字符串
// ============================================
log('\n--- 回归测试 2: undefined/null 转字符串 ---');

test('new Blob([undefined, null, 1]).text() → "undefinednull1"', async () => {
    const blob = new Blob([undefined, null, 1]);
    const text = await blob.text();
    
    if (text !== 'undefinednull1') {
        throw new Error(`期望 "undefinednull1"，实际 "${text}"`);
    }
});

test('undefined 和 null 正确转换', async () => {
    const blob1 = new Blob([undefined]);
    const text1 = await blob1.text();
    if (text1 !== 'undefined') {
        throw new Error(`undefined 应该转为 "undefined"`);
    }
    
    const blob2 = new Blob([null]);
    const text2 = await blob2.text();
    if (text2 !== 'null') {
        throw new Error(`null 应该转为 "null"`);
    }
});

// ============================================
// 回归测试 3: endings 选项
// ============================================
log('\n--- 回归测试 3: endings 选项 ---');

test('endings: "transparent" 保持原样', async () => {
    const blob = new Blob(['a\r\nb\nc\r'], { endings: 'transparent' });
    const text = await blob.text();
    
    if (text !== 'a\r\nb\nc\r') {
        throw new Error('transparent 应该保持原样');
    }
});

test('endings: "native" 统一换行符', async () => {
    const blob = new Blob(['a\r\nb\nc\r'], { endings: 'native' });
    const text = await blob.text();
    
    // 应该统一换行符（\n 或 \r\n）
    const hasOnlyLF = !text.includes('\r');
    const hasOnlyCRLF = text.split('\n').every((line, i, arr) => {
        if (i === arr.length - 1) return true;
        const lineEnd = text.indexOf(line) + line.length;
        return text[lineEnd] === '\r';
    });
    
    if (!hasOnlyLF && !hasOnlyCRLF) {
        throw new Error('native 应该统一换行符');
    }
});

test('endings: 非法值应该默认为 "transparent"', async () => {
    const blob = new Blob(['a\r\nb'], { endings: 'invalid' });
    const text = await blob.text();
    
    // 应该保持原样（当作 transparent）
    if (text !== 'a\r\nb') {
        throw new Error('非法 endings 值应该默认为 transparent');
    }
});

test('endings: 空字符串应该默认为 "transparent"', async () => {
    const blob = new Blob(['a\r\nb'], { endings: '' });
    const text = await blob.text();
    
    if (text !== 'a\r\nb') {
        throw new Error('空 endings 值应该默认为 transparent');
    }
});

// ============================================
// 回归测试 4: slice().type
// ============================================
log('\n--- 回归测试 4: slice().type ---');

test('new File(["x"], "A.txt").slice().type === ""', () => {
    const file = new File(['x'], 'A.txt', { type: 'text/plain' });
    const sliced = file.slice();
    
    if (sliced.type !== '') {
        throw new Error(`slice().type 应该是空字符串，实际 "${sliced.type}"`);
    }
});

test('Blob.slice() 默认 type 为空', () => {
    const blob = new Blob(['test'], { type: 'text/html' });
    const sliced = blob.slice(0, 2);
    
    if (sliced.type !== '') {
        throw new Error(`slice().type 应该是空字符串，实际 "${sliced.type}"`);
    }
});

test('slice() 可以指定 type', () => {
    const blob = new Blob(['test']);
    const sliced = blob.slice(0, 2, 'text/plain');
    
    if (sliced.type !== 'text/plain') {
        throw new Error(`指定的 type 应该生效`);
    }
});

// ============================================
// 回归测试 5: UTF-8 解码容错
// ============================================
log('\n--- 回归测试 5: UTF-8 解码容错 ---');

test('new Blob([new Uint8Array([0xff])]).text() → "\\uFFFD"', async () => {
    const blob = new Blob([new Uint8Array([0xff])]);
    const text = await blob.text();
    
    if (text !== '\uFFFD') {
        throw new Error(`期望 U+FFFD，实际 "${text}"`);
    }
});

test('多个非法字节各自替换', async () => {
    const blob = new Blob([new Uint8Array([0xff, 0xfe, 0xfd])]);
    const text = await blob.text();
    
    if (text !== '\uFFFD\uFFFD\uFFFD') {
        throw new Error('每个非法字节应该独立替换');
    }
});

// ============================================
// 回归测试 6: lastModified 边界
// ============================================
log('\n--- 回归测试 6: lastModified 边界 ---');

test('lastModified 负值应该 clamp 到 0', () => {
    const file = new File(['test'], 'test.txt', { lastModified: -1000 });
    
    if (file.lastModified !== 0) {
        throw new Error(`负值应该 clamp 到 0，实际 ${file.lastModified}`);
    }
});

test('lastModified 正值应该保留', () => {
    const file = new File(['test'], 'test.txt', { lastModified: 1234567890 });
    
    if (file.lastModified !== 1234567890) {
        throw new Error('正值应该保留');
    }
});

test('lastModified 默认值应该是当前时间', () => {
    const before = Date.now();
    const file = new File(['test'], 'test.txt');
    const after = Date.now();
    
    if (file.lastModified < before || file.lastModified > after) {
        throw new Error('默认值应该是当前时间');
    }
});

// ============================================
// 综合测试
// ============================================
log('\n--- 综合测试 ---');

test('所有原型属性都不可枚举', () => {
    const blobKeys = Object.keys(Blob.prototype);
    const fileKeys = Object.keys(File.prototype);
    
    if (blobKeys.length > 0) {
        throw new Error(`Blob.prototype 不应该有可枚举属性，但有: ${blobKeys.join(', ')}`);
    }
    
    if (fileKeys.length > 0) {
        throw new Error(`File.prototype 不应该有可枚举属性，但有: ${fileKeys.join(', ')}`);
    }
});

test('实例属性不可配置', () => {
    const blob = new Blob(['test'], { type: 'text/plain' });
    
    const sizeDesc = Object.getOwnPropertyDescriptor(blob, 'size');
    if (sizeDesc && sizeDesc.configurable) {
        throw new Error('size 应该不可配置');
    }
    
    const typeDesc = Object.getOwnPropertyDescriptor(blob, 'type');
    if (typeDesc && typeDesc.configurable) {
        throw new Error('type 应该不可配置');
    }
});

test('内部字段不可枚举', () => {
    const blob = new Blob(['test']);
    const keys = Object.keys(blob);
    
    const internalFields = ['__isBlob', '__blobData'];
    const foundFields = internalFields.filter(f => keys.includes(f));
    
    if (foundFields.length > 0) {
        throw new Error(`内部字段不应该可枚举: ${foundFields.join(', ')}`);
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
    log('\n🎉 所有最终回归测试通过！');
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
