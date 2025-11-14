// 诊断 Buffer.isEncoding 不稳定的问题
const { Buffer } = require('buffer');

const results = [];

// 测试 Buffer.isEncoding 是否存在
console.log('1. Buffer.isEncoding 类型:', typeof Buffer.isEncoding);
results.push({ test: 'isEncoding存在', result: typeof Buffer.isEncoding === 'function' });

// 测试基本编码
const encodings = ['utf8', 'utf-8', 'hex', 'base64', 'ascii', 'latin1', 'binary', 'ucs2', 'utf16le'];

for (const enc of encodings) {
    const result = Buffer.isEncoding(enc);
    console.log(`2. Buffer.isEncoding('${enc}'):`, result, `(期望: true)`);
    results.push({ test: `isEncoding('${enc}')`, result: result === true, actual: result, expected: true });
}

// 测试无效编码
const invalidEncodings = ['invalid', '', 'xyz'];
for (const enc of invalidEncodings) {
    const result = Buffer.isEncoding(enc);
    console.log(`3. Buffer.isEncoding('${enc}'):`, result, `(期望: false)`);
    results.push({ test: `isEncoding('${enc}')`, result: result === false, actual: result, expected: false });
}

// 测试特殊值
const specialValues = [
    { value: undefined, name: 'undefined' },
    { value: null, name: 'null' }
];

for (const { value, name } of specialValues) {
    const result = Buffer.isEncoding(value);
    console.log(`4. Buffer.isEncoding(${name}):`, result, `(期望: false)`);
    results.push({ test: `isEncoding(${name})`, result: result === false, actual: result, expected: false });
}

// 测试大小写
const caseTests = ['UTF8', 'Utf8', 'HEX', 'Hex'];
for (const enc of caseTests) {
    const result = Buffer.isEncoding(enc);
    console.log(`5. Buffer.isEncoding('${enc}'):`, result, `(期望: true)`);
    results.push({ test: `isEncoding('${enc}')`, result: result === true, actual: result, expected: true });
}

// 统计
const passed = results.filter(r => r.result).length;
const failed = results.filter(r => !r.result).length;

console.log('\n=== 结果 ===');
console.log(`通过: ${passed}/${results.length}`);
console.log(`失败: ${failed}/${results.length}`);

if (failed > 0) {
    console.log('\n失败的测试:');
    results.filter(r => !r.result).forEach(r => {
        console.log(`  - ${r.test}: 期望 ${r.expected}, 实际 ${r.actual}`);
    });
}

return {
    success: failed === 0,
    passed: passed,
    failed: failed,
    total: results.length,
    details: results
};
