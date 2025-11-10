const Buffer = require('buffer').Buffer;

console.log('=== 详细的 copy 测试 ===\n');

// 测试 1: copy_boundary
console.log('【测试 1: copy_boundary】');
const a1 = Buffer.from([1, 2, 3, 4, 5, 6]);
console.log('初始 a:', [...a1]);

const s1 = a1.subarray(1, 5);
console.log('s = a.subarray(1, 5):', [...s1]);
console.log('s 引用的是 a 的索引 1-4');

console.log('\n复制前 s 的值:');
for (let i = 0; i < s1.length; i++) {
    console.log(`  s[${i}] = a[${i+1}] = ${s1[i]}`);
}

console.log('\n调用 s.copy(a, 2, 0, 10):');
console.log('  - 从 s[0..3] 复制到 a[2..5]');
console.log('  - 这会覆盖 a[2], a[3], a[4], a[5]');
console.log('  - 但 s 引用的是 a[1..4]，所以 a[2], a[3], a[4] 的修改会影响 s[1], s[2], s[3]');

const copied1 = s1.copy(a1, 2, 0, 10);
console.log('\n复制后:');
console.log('  复制字节数:', copied1);
console.log('  结果 a:', [...a1]);
console.log('  错误预期: [1, 2, 2, 3, 4, 6] ❌');
console.log('  正确预期: [1, 2, 2, 3, 4, 5] ✅');
console.log('  测试:', JSON.stringify([...a1]) === JSON.stringify([1, 2, 2, 3, 4, 5]) ? '✅ 通过' : '❌ 失败');

// 测试 2: copy_negative（Node.js v22 严格模式）
console.log('\n\n【测试 2: copy_negative - 负数参数验证】');
const buf1 = Buffer.from([1, 2, 3, 4, 5]);
const buf2 = Buffer.alloc(5);
console.log('buf1:', [...buf1]);
console.log('buf2:', [...buf2]);

console.log('\n调用 buf1.copy(buf2, 0, -5, 3):');
console.log('  - Node.js v22: 负数参数应该抛出 RangeError');
console.log('  - 不再自动夹取到 0');

let test2_passed = false;
let test2_error = null;
try {
    const copied2 = buf1.copy(buf2, 0, -5, 3);
    console.log('\n❌ 没有抛出错误！');
    console.log('  复制字节数:', copied2);
    console.log('  结果 buf2:', [...buf2]);
    console.log('  这是错误的行为（应该抛出 RangeError）');
    test2_passed = false;
} catch (err) {
    test2_error = err.message;
    const isRangeError = err.message.includes('out of range') || err.message.includes('ERR_OUT_OF_RANGE');
    test2_passed = isRangeError;
    console.log('\n✅ 正确抛出错误！');
    console.log('  错误类型:', typeof err === 'object' ? 'Error' : typeof err);
    console.log('  错误消息:', err.message);
    console.log('  测试:', isRangeError ? '✅' : '❌');
}

// 返回详细结果
return {
    test1_copy_boundary: {
        result: [...a1],
        wrong_expected: [1, 2, 2, 3, 4, 6],
        correct_expected: [1, 2, 2, 3, 4, 5],
        copied_bytes: copied1,
        passed: JSON.stringify([...a1]) === JSON.stringify([1, 2, 2, 3, 4, 5]),
        note: '我们的结果是正确的，原测试预期有误'
    },
    test2_copy_negative: {
        error_thrown: test2_error !== null,
        error_message: test2_error,
        passed: test2_passed,
        note: 'Node.js v22 严格模式：负数参数抛出 RangeError'
    },
    summary: {
        test1_status: JSON.stringify([...a1]) === JSON.stringify([1, 2, 2, 3, 4, 5]) ? 'PASS' : 'FAIL',
        test2_status: test2_passed ? 'PASS' : 'FAIL',
        overall: (JSON.stringify([...a1]) === JSON.stringify([1, 2, 2, 3, 4, 5]) && test2_passed) ? '✅ 全部通过' : '⚠️ 有测试失败',
        note: 'Node.js v22 兼容性测试'
    }
};
