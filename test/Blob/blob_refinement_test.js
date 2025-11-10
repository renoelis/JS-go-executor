/**
 * Blob/File API 精细化修复验证测试
 * 测试所有 8 个优先级修复项
 */

console.log('========================================');
console.log('  Blob/File API 精细化修复验证测试');
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
// 优先级 1: 元素多但字节少不应误判
// ============================================
log('\n--- 优先级 1: 元素个数检查 ---');

test('1000个元素每个1字节应该成功', () => {
    const parts = new Array(1000).fill("a");
    const blob = new Blob(parts);
    if (blob.size !== 1000) {
        throw new Error(`期望 size=1000，实际 ${blob.size}`);
    }
});

test('10000个元素每个1字节应该成功', () => {
    const parts = new Array(10000).fill("x");
    const blob = new Blob(parts);
    if (blob.size !== 10000) {
        throw new Error(`期望 size=10000，实际 ${blob.size}`);
    }
});

// ============================================
// 优先级 2: endings 平台差异
// ============================================
log('\n--- 优先级 2: endings 选项 ---');

test('endings: "transparent" 保持原样', () => {
    const blob = new Blob(["a\nb"], {endings: "transparent"});
    if (blob.size !== 3) {
        throw new Error(`期望 size=3，实际 ${blob.size}`);
    }
});

test('endings: "native" 转换换行符', () => {
    const blob = new Blob(["a\nb"], {endings: "native"});
    // Windows: 4 字节 (a\r\nb), Unix: 3 字节 (a\nb)
    if (blob.size !== 4 && blob.size !== 3) {
        throw new Error(`期望 size=4(Windows)或3(Unix)，实际 ${blob.size}`);
    }
});

test('endings: "native" 处理多个换行符', () => {
    const blob = new Blob(["line1\nline2\nline3"], {endings: "native"});
    // Windows: 17 字节, Unix: 17 字节（但换行符不同）
    if (blob.size < 17) {
        throw new Error(`size 应该 >= 17，实际 ${blob.size}`);
    }
});

// ============================================
// 优先级 3: 非数组 parts 抛出 TypeError
// ============================================
log('\n--- 优先级 3: 非数组 parts 检查 ---');

test('传入数字应该抛出 TypeError', () => {
    try {
        new Blob(123);
        throw new Error('应该抛出 TypeError');
    } catch (e) {
        // 兼容 Goja 和 Node.js 的错误消息格式
        const isGojaError = e.message.includes('cannot be converted to a sequence');
        const isNodeError = e.message.includes('must be a sequence');
        if (!isGojaError && !isNodeError) {
            throw new Error(`错误消息不正确: ${e.message}`);
        }
    }
});

test('传入对象（无 length）应该抛出 TypeError', () => {
    try {
        new Blob({a: 1, b: 2});
        throw new Error('应该抛出 TypeError');
    } catch (e) {
        // 兼容 Goja 和 Node.js 的错误消息格式
        const isGojaError = e.message.includes('cannot be converted to a sequence');
        const isNodeError = e.message.includes('must be a sequence');
        if (!isGojaError && !isNodeError) {
            throw new Error(`错误消息不正确: ${e.message}`);
        }
    }
});

test('传入 array-like 对象应该成功', () => {
    const arrayLike = {0: "a", 1: "b", length: 2};
    const blob = new Blob([arrayLike]);
    // arrayLike 会被 toString() 转为 "[object Object]"
    if (blob.size === 0) {
        throw new Error('应该有数据');
    }
});

test('File 构造函数也应该检查 parts', () => {
    try {
        new File(123, "test.txt");
        throw new Error('应该抛出 TypeError');
    } catch (e) {
        // 兼容 Goja 和 Node.js 的错误消息格式
        const isGojaError = e.message.includes('cannot be converted to a sequence');
        const isNodeError = e.message.includes('must be a sequence');
        if (!isGojaError && !isNodeError) {
            throw new Error(`错误消息不正确: ${e.message}`);
        }
    }
});

// ============================================
// 优先级 4: 方法在原型上
// ============================================
log('\n--- 优先级 4: 原型方法存在性 ---');

test('Blob.prototype.arrayBuffer 应该存在', () => {
    if (typeof Blob.prototype.arrayBuffer !== 'function') {
        throw new Error('arrayBuffer 不在原型上');
    }
});

test('Blob.prototype.text 应该存在', () => {
    if (typeof Blob.prototype.text !== 'function') {
        throw new Error('text 不在原型上');
    }
});

test('Blob.prototype.slice 应该存在', () => {
    if (typeof Blob.prototype.slice !== 'function') {
        throw new Error('slice 不在原型上');
    }
});

test('Blob.prototype.bytes 应该存在', () => {
    if (typeof Blob.prototype.bytes !== 'function') {
        throw new Error('bytes 不在原型上');
    }
});

test('Blob.prototype.stream 应该存在', () => {
    if (typeof Blob.prototype.stream !== 'function') {
        throw new Error('stream 不在原型上');
    }
});

test('File.prototype 继承 Blob.prototype', () => {
    if (typeof File.prototype.arrayBuffer !== 'function') {
        throw new Error('File 没有继承 Blob 的方法');
    }
});

test('实例上不应该有方法（应该在原型上）', () => {
    const blob = new Blob(['test']);
    if (blob.hasOwnProperty('arrayBuffer')) {
        throw new Error('arrayBuffer 不应该在实例上');
    }
    if (blob.hasOwnProperty('text')) {
        throw new Error('text 不应该在实例上');
    }
});

// ============================================
// 优先级 5: arrayBuffer() 返回拷贝
// ============================================
log('\n--- 优先级 5: Blob 不可变性 ---');

test('arrayBuffer() 应该返回拷贝', async () => {
    const blob = new Blob(["test"]);
    const ab1 = await blob.arrayBuffer();
    const view1 = new Uint8Array(ab1);
    const original = view1[0];
    
    // 修改返回的 ArrayBuffer
    view1[0] = 88;
    
    // 再次获取，应该不受影响
    const ab2 = await blob.arrayBuffer();
    const view2 = new Uint8Array(ab2);
    
    if (view2[0] !== original) {
        throw new Error(`Blob 被修改了！期望 ${original}，实际 ${view2[0]}`);
    }
});

test('bytes() 应该返回拷贝', async () => {
    const blob = new Blob(["test"]);
    const bytes1 = await blob.bytes();
    const original = bytes1[0];
    
    // 修改返回的数据
    bytes1[0] = 88;
    
    // 再次获取，应该不受影响
    const bytes2 = await blob.bytes();
    
    if (bytes2[0] !== original) {
        throw new Error(`Blob 被修改了！期望 ${original}，实际 ${bytes2[0]}`);
    }
});

test('text() 应该不受 arrayBuffer() 修改影响', async () => {
    const blob = new Blob(["test"]);
    const ab = await blob.arrayBuffer();
    new Uint8Array(ab)[0] = 88;  // 修改
    
    const text = await blob.text();
    if (text !== "test") {
        throw new Error(`text 被影响了！期望 "test"，实际 "${text}"`);
    }
});

// ============================================
// 优先级 6: Symbol.toStringTag 在原型上
// ============================================
log('\n--- 优先级 6: Symbol.toStringTag ---');

test('Blob 应该有正确的 toStringTag', () => {
    const blob = new Blob(['test']);
    const tag = Object.prototype.toString.call(blob);
    if (tag !== '[object Blob]') {
        throw new Error(`期望 '[object Blob]'，实际 '${tag}'`);
    }
});

test('File 应该有正确的 toStringTag', () => {
    const file = new File(['test'], 'test.txt');
    const tag = Object.prototype.toString.call(file);
    if (tag !== '[object File]') {
        throw new Error(`期望 '[object File]'，实际 '${tag}'`);
    }
});

test('toStringTag 应该在原型上而非实例上', () => {
    const blob = new Blob(['test']);
    if (blob.hasOwnProperty(Symbol.toStringTag)) {
        throw new Error('toStringTag 不应该在实例上');
    }
});

// ============================================
// 优先级 7: stream() 占位符
// ============================================
log('\n--- 优先级 7: stream() 方法 ---');

test('stream() 应该存在', () => {
    const blob = new Blob(['test']);
    // Goja: 抛出错误（未实现）
    // Node.js: 返回 ReadableStream（已实现）
    try {
        const result = blob.stream();
        // Node.js 环境：应该返回 ReadableStream
        if (typeof result !== 'object') {
            throw new Error('stream() 应该返回对象');
        }
    } catch (e) {
        // Goja 环境：应该抛出 Streams API 错误
        if (!e.message.includes('Streams API')) {
            throw new Error(`Goja 环境错误消息不正确: ${e.message}`);
        }
    }
});

test('File.stream() 也应该存在', () => {
    const file = new File(['test'], 'test.txt');
    // Goja: 抛出错误（未实现）
    // Node.js: 返回 ReadableStream（已实现）
    try {
        const result = file.stream();
        // Node.js 环境：应该返回 ReadableStream
        if (typeof result !== 'object') {
            throw new Error('stream() 应该返回对象');
        }
    } catch (e) {
        // Goja 环境：应该抛出 Streams API 错误
        if (!e.message.includes('Streams API')) {
            throw new Error(`Goja 环境错误消息不正确: ${e.message}`);
        }
    }
});

// ============================================
// 优先级 8: bytes() 是扩展 API
// ============================================
log('\n--- 优先级 8: bytes() 方法 ---');

test('bytes() 应该正常工作', async () => {
    const blob = new Blob([new Uint8Array([65, 66, 67])]);
    const bytes = await blob.bytes();
    
    // 应该是 Uint8Array 或 ArrayBuffer
    const isUint8Array = bytes instanceof Uint8Array;
    const isArrayBuffer = bytes instanceof ArrayBuffer;
    
    if (!isUint8Array && !isArrayBuffer) {
        throw new Error(`期望 Uint8Array 或 ArrayBuffer，实际 ${typeof bytes}`);
    }
    
    if (isUint8Array && bytes.length !== 3) {
        throw new Error(`期望长度 3，实际 ${bytes.length}`);
    }
});

// ============================================
// 综合测试
// ============================================
log('\n--- 综合测试 ---');

test('File 继承自 Blob', () => {
    const file = new File(['test'], 'test.txt');
    if (!(file instanceof File)) {
        throw new Error('不是 File 实例');
    }
    if (!(file instanceof Blob)) {
        throw new Error('不是 Blob 实例');
    }
});

test('原型链正确（通过 instanceof 验证）', () => {
    const file = new File(['test'], 'test.txt');
    // 通过 instanceof 验证继承关系
    if (!(file instanceof File)) {
        throw new Error('不是 File 实例');
    }
    if (!(file instanceof Blob)) {
        throw new Error('File 没有继承 Blob（instanceof 失败）');
    }
});

test('所有方法都可以正常调用', async () => {
    const blob = new Blob(['test']);
    
    // arrayBuffer()
    const ab = await blob.arrayBuffer();
    if (!(ab instanceof ArrayBuffer)) {
        throw new Error('arrayBuffer() 返回类型错误');
    }
    
    // text()
    const text = await blob.text();
    if (text !== 'test') {
        throw new Error('text() 返回内容错误');
    }
    
    // slice()
    const sliced = blob.slice(0, 2);
    if (!(sliced instanceof Blob)) {
        throw new Error('slice() 返回类型错误');
    }
    if (sliced.size !== 2) {
        throw new Error('slice() 大小错误');
    }
    
    // bytes()
    const bytes = await blob.bytes();
    if (!bytes) {
        throw new Error('bytes() 返回为空');
    }
});

test('File 的所有方法都可以正常调用', async () => {
    const file = new File(['content'], 'test.txt', {
        type: 'text/plain',
        lastModified: 1234567890000
    });
    
    // 属性
    if (file.name !== 'test.txt') throw new Error('name 错误');
    if (file.type !== 'text/plain') throw new Error('type 错误');
    if (file.size !== 7) throw new Error('size 错误');
    if (file.lastModified !== 1234567890000) throw new Error('lastModified 错误');
    
    // 方法（继承自 Blob）
    const text = await file.text();
    if (text !== 'content') throw new Error('text() 错误');
    
    const ab = await file.arrayBuffer();
    if (!(ab instanceof ArrayBuffer)) throw new Error('arrayBuffer() 错误');
});

// ============================================
// 边界情况测试
// ============================================
log('\n--- 边界情况 ---');

test('空 Blob 应该正常工作', async () => {
    const blob = new Blob([]);
    if (blob.size !== 0) throw new Error('空 Blob size 应该是 0');
    
    const text = await blob.text();
    if (text !== '') throw new Error('空 Blob text 应该是空字符串');
});

test('大量小元素应该正常工作', () => {
    const parts = new Array(50000).fill("a");
    const blob = new Blob(parts);
    if (blob.size !== 50000) {
        throw new Error(`期望 size=50000，实际 ${blob.size}`);
    }
});

test('混合类型 parts 应该正常工作', () => {
    const parts = [
        "string",
        new Uint8Array([65, 66]),
        new Blob(["blob"]),
        {toString: () => "object"}
    ];
    const blob = new Blob(parts);
    if (blob.size === 0) {
        throw new Error('混合类型 Blob 不应该为空');
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
    log('\n🎉 所有精细化修复测试通过！');
}

// 返回结果供外部使用
return{
    passed,
    failed,
    total,
    successRate,
    details: results,
    logs
};
