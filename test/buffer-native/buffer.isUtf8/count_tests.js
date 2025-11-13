// 统计buffer.isUtf8测试总数
const fs = require('fs');
const path = require('path');

const testFiles = [
  'part1_basic.js',
  'part2_edge_cases.js', 
  'part3_typed_arrays.js',
  'part4_offset_length.js',
  'part5_invalid_sequences.js',
  'part6_continuation_bytes.js',
  'part7_overlong_encoding.js',
  'part8_unicode_ranges.js',
  'part9_mixed_scenarios.js',
  'part10_subarray_views.js',
  'part11_buffer_methods.js',
  'part12_special_unicode.js',
  'part13_parameter_coercion.js',
  'part14_extreme_cases.js',
  'part15_additional_edge_cases.js',
  'part16_function_properties.js',
  'part17_deep_boundary_cases.js',
  'part18_final_gap_analysis.js'
];

let totalTests = 0;
let totalFiles = 0;

console.log('Buffer.isUtf8 API 测试统计');
console.log('============================');

for (const file of testFiles) {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    try {
      // 通过正则表达式统计test函数调用次数
      const content = fs.readFileSync(filePath, 'utf8');
      const testCalls = content.match(/^test\(/gm);
      const testCount = testCalls ? testCalls.length : 0;
      
      console.log(`${file}: ${testCount} 个测试`);
      totalTests += testCount;
      totalFiles++;
    } catch (error) {
      console.log(`${file}: 无法读取`);
    }
  } else {
    console.log(`${file}: 文件不存在`);
  }
}

console.log('============================');
console.log(`总文件数: ${totalFiles}`);
console.log(`总测试数: ${totalTests}`);
console.log('============================');
