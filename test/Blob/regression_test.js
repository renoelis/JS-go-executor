/**
 * Blob/File API 回归测试
 * 验证最终修复的 6 个关键用例
 */

console.log('========================================');
console.log('  Blob/File API 回归测试');
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
// 回归用例 1: undefined/null 转字符串
// ============================================
log('\n--- 回归用例 1: undefined/null 转字符串 ---');

test('new Blob([undefined, null, 1]).text() → "undefinednull1"', async () => {
    const blob = new Blob([undefined, null, 1]);
    const text = await blob.text();
    
    if (text !== 'undefinednull1') {
        throw new Error(`期望 "undefinednull1"，实际 "${text}"`);
    }
});

test('undefined 应该转为 "undefined"', async () => {
    const blob = new Blob([undefined]);
    const text = await blob.text();
    
    if (text !== 'undefined') {
        throw new Error(`期望 "undefined"，实际 "${text}"`);
    }
});

test('null 应该转为 "null"', async () => {
    const blob = new Blob([null]);
    const text = await blob.text();
    
    if (text !== 'null') {
        throw new Error(`期望 "null"，实际 "${text}"`);
    }
});

test('混合 undefined/null/数字/字符串', async () => {
    const blob = new Blob([undefined, ',', null, ',', 123, ',', 'test']);
    const text = await blob.text();
    
    if (text !== 'undefined,null,123,test') {
        throw new Error(`期望 "undefined,null,123,test"，实际 "${text}"`);
    }
});

// ============================================
// 回归用例 2: endings 选项
// ============================================
log('\n--- 回归用例 2: endings 选项 ---');

test('endings: "transparent" 保持原样', async () => {
    const blob = new Blob(['a\r\nb\nc\r'], { endings: 'transparent' });
    const text = await blob.text();
    
    if (text !== 'a\r\nb\nc\r') {
        throw new Error(`endings: "transparent" 应该保持原样`);
    }
});

test('endings: "native" 转换换行符', async () => {
    const blob = new Blob(['a\r\nb\nc\r'], { endings: 'native' });
    const text = await blob.text();
    
    // 在非 Windows 系统上，应该全部转为 \n
    // 在 Windows 系统上，应该全部转为 \r\n
    const hasOnlyLF = !text.includes('\r');
    const hasOnlyCRLF = text.split('\n').every((line, i, arr) => 
        i === arr.length - 1 || text.charAt(text.indexOf(line) + line.length) === '\r'
    );
    
    if (!hasOnlyLF && !hasOnlyCRLF) {
        throw new Error(`endings: "native" 应该统一换行符，实际: ${JSON.stringify(text)}`);
    }
});

// ============================================
// 回归用例 3: UTF-8 解码容错
// ============================================
log('\n--- 回归用例 3: UTF-8 解码容错 ---');

test('非法 UTF-8 应该使用 U+FFFD 替换', async () => {
    const blob = new Blob([new Uint8Array([0xff])]);
    const text = await blob.text();
    
    if (text !== '\uFFFD') {
        throw new Error(`期望 U+FFFD，实际 "${text}"`);
    }
});

test('多个非法字节应该各自替换', async () => {
    const blob = new Blob([new Uint8Array([0xff, 0xfe, 0xfd])]);
    const text = await blob.text();
    
    if (text !== '\uFFFD\uFFFD\uFFFD') {
        throw new Error(`期望 3 个 U+FFFD，实际 "${text}"`);
    }
});

test('混合合法和非法 UTF-8', async () => {
    const mixed = new Uint8Array([
        0x48, 0x65, 0x6C, 0x6C, 0x6F, // Hello
        0xFF,                          // 非法
        0xE4, 0xB8, 0xAD              // 中
    ]);
    const blob = new Blob([mixed]);
    const text = await blob.text();
    
    if (!text.startsWith('Hello') || !text.includes('\uFFFD') || !text.endsWith('中')) {
        throw new Error(`混合 UTF-8 解码错误，实际: "${text}"`);
    }
});

// ============================================
// 回归用例 4: slice 和 type
// ============================================
log('\n--- 回归用例 4: slice 和 type ---');

test('slice().type 应该是空字符串', () => {
    const blob = new Blob(['abcdef'], { type: 'text/plain' });
    const sliced = blob.slice(1, 4);
    
    if (sliced.type !== '') {
        throw new Error(`slice().type 应该是空字符串，实际 "${sliced.type}"`);
    }
});

test('slice() 内容应该正确', async () => {
    const blob = new Blob(['abcdef']);
    const sliced = blob.slice(1, 4);
    const text = await sliced.text();
    
    if (text !== 'bcd') {
        throw new Error(`期望 "bcd"，实际 "${text}"`);
    }
});

test('slice() 可以指定 contentType', () => {
    const blob = new Blob(['abcdef']);
    const sliced = blob.slice(1, 4, 'text/html');
    
    if (sliced.type !== 'text/html') {
        throw new Error(`期望 type="text/html"，实际 "${sliced.type}"`);
    }
});

// ============================================
// 回归用例 5: 原型方法不可枚举
// ============================================
log('\n--- 回归用例 5: 原型方法不可枚举 ---');

test('Object.keys(Blob.prototype) 不应包含方法', () => {
    const keys = Object.keys(Blob.prototype);
    const methods = ['arrayBuffer', 'text', 'slice', 'bytes', 'stream'];
    
    const foundMethods = methods.filter(m => keys.includes(m));
    
    if (foundMethods.length > 0) {
        throw new Error(`原型方法应该不可枚举，但找到: ${foundMethods.join(', ')}`);
    }
});

test('Blob.prototype 方法应该存在但不可枚举', () => {
    const methods = ['arrayBuffer', 'text', 'slice', 'bytes', 'stream'];
    
    for (const method of methods) {
        if (typeof Blob.prototype[method] !== 'function') {
            throw new Error(`${method} 应该存在`);
        }
        
        const descriptor = Object.getOwnPropertyDescriptor(Blob.prototype, method);
        if (descriptor && descriptor.enumerable) {
            throw new Error(`${method} 应该不可枚举`);
        }
    }
});

test('File.prototype 继承的方法也不可枚举', () => {
    const keys = Object.keys(File.prototype);
    const inheritedMethods = ['arrayBuffer', 'text', 'slice', 'bytes', 'stream'];
    
    const foundMethods = inheritedMethods.filter(m => keys.includes(m));
    
    if (foundMethods.length > 0) {
        throw new Error(`继承的方法应该不可枚举，但找到: ${foundMethods.join(', ')}`);
    }
});

// ============================================
// 回归用例 6: Symbol.toStringTag
// ============================================
log('\n--- 回归用例 6: Symbol.toStringTag ---');

test('Object.prototype.toString.call(new Blob([])) → "[object Blob]"', () => {
    const blob = new Blob([]);
    const str = Object.prototype.toString.call(blob);
    
    if (str !== '[object Blob]') {
        throw new Error(`期望 "[object Blob]"，实际 "${str}"`);
    }
});

test('Object.prototype.toString.call(new File([], "a")) → "[object File]"', () => {
    const file = new File([], 'test.txt');
    const str = Object.prototype.toString.call(file);
    
    if (str !== '[object File]') {
        throw new Error(`期望 "[object File]"，实际 "${str}"`);
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
    
    if (descriptor.enumerable) {
        throw new Error('Symbol.toStringTag 应该不可枚举');
    }
    
    if (descriptor.writable) {
        throw new Error('Symbol.toStringTag 应该不可写');
    }
});

test('File 的 Symbol.toStringTag 也应该不可配置', () => {
    const descriptor = Object.getOwnPropertyDescriptor(File.prototype, Symbol.toStringTag);
    
    if (!descriptor) {
        throw new Error('File Symbol.toStringTag 不存在');
    }
    
    if (descriptor.configurable) {
        throw new Error('File Symbol.toStringTag 应该不可配置');
    }
});

// ============================================
// 额外测试
// ============================================
log('\n--- 额外测试 ---');

test('bytes() 应该返回 Uint8Array 或 ArrayBuffer', async () => {
    const blob = new Blob(['test']);
    const bytes = await blob.bytes();
    
    const isValid = bytes instanceof Uint8Array || bytes instanceof ArrayBuffer;
    if (!isValid) {
        throw new Error(`bytes() 应该返回 Uint8Array 或 ArrayBuffer`);
    }
});

test('File 继承 Blob 的所有方法', async () => {
    const file = new File(['test'], 'test.txt');
    
    // 测试继承的方法
    if (typeof file.arrayBuffer !== 'function') {
        throw new Error('File 应该继承 arrayBuffer');
    }
    
    if (typeof file.text !== 'function') {
        throw new Error('File 应该继承 text');
    }
    
    if (typeof file.slice !== 'function') {
        throw new Error('File 应该继承 slice');
    }
    
    // 测试方法可用
    const text = await file.text();
    if (text !== 'test') {
        throw new Error('File.text() 应该正常工作');
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
    log('\n🎉 所有回归测试通过！');
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
