// 验证所有 Buffer 方法的 length 属性
const { Buffer } = require('buffer');

const results = {
  success: true,
  methods: [],
  summary: {
    total: 0,
    correct: 0,
    incorrect: 0
  }
};

function checkMethod(name, expectedLength) {
  const method = Buffer.prototype[name];
  if (!method) {
    results.methods.push({
      name,
      expected: expectedLength,
      actual: 'undefined',
      status: '❌',
      issue: 'Method not found'
    });
    results.summary.incorrect++;
    return;
  }

  const actualLength = method.length;
  const isCorrect = actualLength === expectedLength;
  
  results.methods.push({
    name,
    expected: expectedLength,
    actual: actualLength,
    status: isCorrect ? '✅' : '❌',
    issue: isCorrect ? null : `Expected ${expectedLength}, got ${actualLength}`
  });

  if (isCorrect) {
    results.summary.correct++;
  } else {
    results.summary.incorrect++;
    results.success = false;
  }
  
  results.summary.total++;
}

console.log('========================================');
console.log('Buffer 方法 length 属性验证');
console.log('Node.js 版本:', process.version);
console.log('========================================\n');

// 1. write_methods.go (17 个方法)
console.log('📋 write_methods.go (17 个方法)');
checkMethod('write', 4);          // buf.write(string[, offset[, length]][, encoding])
checkMethod('toString', 3);       // buf.toString([encoding[, start[, end]]])
checkMethod('slice', 2);          // buf.slice([start[, end]])
checkMethod('indexOf', 3);        // buf.indexOf(value[, byteOffset][, encoding])
checkMethod('copy', 4);           // buf.copy(target[, targetStart[, sourceStart[, sourceEnd]]])
checkMethod('compare', 5);        // buf.compare(target[, targetStart[, targetEnd[, sourceStart[, sourceEnd]]]])
checkMethod('equals', 1);         // buf.equals(otherBuffer)
checkMethod('fill', 4);           // buf.fill(value[, offset[, end]][, encoding])
checkMethod('toJSON', 0);         // buf.toJSON()
checkMethod('includes', 3);       // buf.includes(value[, byteOffset][, encoding])
checkMethod('lastIndexOf', 3);    // buf.lastIndexOf(value[, byteOffset][, encoding])
checkMethod('swap16', 0);
checkMethod('swap32', 0);
checkMethod('swap64', 0);
checkMethod('reverse', 0);
checkMethod('subarray', 2);
checkMethod('set', 1);

// 2. iterator_methods.go (2 个方法)
console.log('\n📋 iterator_methods.go (2 个方法)');
checkMethod('entries', 0);
checkMethod('values', 0);

// 3. bigint_methods.go (12 个方法 - 读写各6个)
console.log('\n📋 bigint_methods.go (读方法 6 个)');
checkMethod('readBigInt64BE', 0);
checkMethod('readBigInt64LE', 0);
checkMethod('readBigUInt64BE', 0);
checkMethod('readBigUInt64LE', 0);

console.log('\n📋 bigint_methods.go (写方法 6 个)');
checkMethod('writeBigInt64BE', 1);
checkMethod('writeBigInt64LE', 1);
checkMethod('writeBigUInt64BE', 1);
checkMethod('writeBigUInt64LE', 1);

// 4. variable_length.go (8 个方法 - 读写各4个)
console.log('\n📋 variable_length.go (读方法 4 个)');
checkMethod('readIntBE', 2);
checkMethod('readIntLE', 2);
checkMethod('readUIntBE', 2);
checkMethod('readUIntLE', 2);

console.log('\n📋 variable_length.go (写方法 4 个)');
checkMethod('writeIntBE', 3);
checkMethod('writeIntLE', 3);
checkMethod('writeUIntBE', 3);
checkMethod('writeUIntLE', 3);

// 5. 其他常用方法
console.log('\n📋 其他常用方法');
checkMethod('keys', 0);
checkMethod('filter', 1);
checkMethod('map', 1);
checkMethod('forEach', 1);
checkMethod('every', 1);
checkMethod('some', 1);
checkMethod('find', 1);
checkMethod('findIndex', 1);
checkMethod('reduce', 1);
checkMethod('reduceRight', 1);
checkMethod('sort', 1);
checkMethod('copyWithin', 2);

// 输出结果
console.log('\n========================================');
console.log('验证结果汇总');
console.log('========================================');
console.log(`总方法数: ${results.summary.total}`);
console.log(`正确: ${results.summary.correct}`);
console.log(`错误: ${results.summary.incorrect}`);
console.log(`成功率: ${((results.summary.correct / results.summary.total) * 100).toFixed(2)}%`);

if (results.summary.incorrect > 0) {
  console.log('\n❌ 发现错误的方法:');
  results.methods
    .filter(m => m.status === '❌')
    .forEach(m => {
      console.log(`  - ${m.name}: ${m.issue}`);
    });
}

console.log('\n========================================');
console.log('详细列表');
console.log('========================================');
results.methods.forEach(m => {
  console.log(`${m.status} ${m.name.padEnd(25)} expected: ${m.expected}, actual: ${m.actual}`);
});

// 返回结果
return results;
