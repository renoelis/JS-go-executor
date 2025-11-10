const qs = require('qs');

// ============================================================================
// qs.formats 完整验证测试（无死角覆盖）
// 测试 qs v6.14.0 的 formats 常量和 formatters 函数
// ============================================================================

try {
  const results = [];
  
  // ============================================================================
  // 1. formats 对象结构测试
  // ============================================================================
  
  // 1.1 formats 对象存在性
  results.push({
    name: '1.1 formats 对象存在',
    pass: typeof qs.formats === 'object' && qs.formats !== null,
    expected: 'object',
    actual: typeof qs.formats
  });
  
  // 1.2 formats.RFC1738 常量
  results.push({
    name: '1.2 formats.RFC1738 常量值',
    pass: qs.formats.RFC1738 === 'RFC1738',
    expected: 'RFC1738',
    actual: qs.formats.RFC1738
  });
  
  // 1.3 formats.RFC3986 常量
  results.push({
    name: '1.3 formats.RFC3986 常量值',
    pass: qs.formats.RFC3986 === 'RFC3986',
    expected: 'RFC3986',
    actual: qs.formats.RFC3986
  });
  
  // 1.4 formats.default 默认值
  results.push({
    name: '1.4 formats.default 默认值',
    pass: qs.formats.default === 'RFC3986',
    expected: 'RFC3986',
    actual: qs.formats.default
  });
  
  // ============================================================================
  // 2. formats.formatters 对象测试
  // ============================================================================
  
  // 2.1 formatters 对象存在性
  results.push({
    name: '2.1 formatters 对象存在',
    pass: typeof qs.formats.formatters === 'object' && qs.formats.formatters !== null,
    expected: 'object',
    actual: typeof qs.formats.formatters
  });
  
  // 2.2 formatters.RFC1738 函数存在
  results.push({
    name: '2.2 formatters.RFC1738 是函数',
    pass: typeof qs.formats.formatters.RFC1738 === 'function',
    expected: 'function',
    actual: typeof qs.formats.formatters.RFC1738
  });
  
  // 2.3 formatters.RFC3986 函数存在
  results.push({
    name: '2.3 formatters.RFC3986 是函数',
    pass: typeof qs.formats.formatters.RFC3986 === 'function',
    expected: 'function',
    actual: typeof qs.formats.formatters.RFC3986
  });
  
  // ============================================================================
  // 3. RFC1738 formatter 功能测试
  // ============================================================================
  
  // 3.1 RFC1738: %20 转换为 +
  const rfc1738_space = qs.formats.formatters.RFC1738('hello%20world');
  results.push({
    name: '3.1 RFC1738: %20 转换为 +',
    pass: rfc1738_space === 'hello+world',
    expected: 'hello+world',
    actual: rfc1738_space
  });
  
  // 3.2 RFC1738: 多个 %20
  const rfc1738_multiple = qs.formats.formatters.RFC1738('a%20b%20c%20d');
  results.push({
    name: '3.2 RFC1738: 多个 %20',
    pass: rfc1738_multiple === 'a+b+c+d',
    expected: 'a+b+c+d',
    actual: rfc1738_multiple
  });
  
  // 3.3 RFC1738: 不含 %20
  const rfc1738_no_space = qs.formats.formatters.RFC1738('hello');
  results.push({
    name: '3.3 RFC1738: 不含 %20',
    pass: rfc1738_no_space === 'hello',
    expected: 'hello',
    actual: rfc1738_no_space
  });
  
  // 3.4 RFC1738: 空字符串
  const rfc1738_empty = qs.formats.formatters.RFC1738('');
  results.push({
    name: '3.4 RFC1738: 空字符串',
    pass: rfc1738_empty === '',
    expected: '',
    actual: rfc1738_empty
  });
  
  // 3.5 RFC1738: 其他编码字符不变
  const rfc1738_other = qs.formats.formatters.RFC1738('a%2Bb%3Dc');
  results.push({
    name: '3.5 RFC1738: 其他编码字符不变',
    pass: rfc1738_other === 'a%2Bb%3Dc',
    expected: 'a%2Bb%3Dc',
    actual: rfc1738_other
  });
  
  // 3.6 RFC1738: 混合编码
  const rfc1738_mixed = qs.formats.formatters.RFC1738('a%20b%2Bc%20d');
  results.push({
    name: '3.6 RFC1738: 混合编码',
    pass: rfc1738_mixed === 'a+b%2Bc+d',
    expected: 'a+b%2Bc+d',
    actual: rfc1738_mixed
  });
  
  // 3.7 RFC1738: 连续 %20
  const rfc1738_consecutive = qs.formats.formatters.RFC1738('a%20%20b');
  results.push({
    name: '3.7 RFC1738: 连续 %20',
    pass: rfc1738_consecutive === 'a++b',
    expected: 'a++b',
    actual: rfc1738_consecutive
  });
  
  // 3.8 RFC1738: 特殊字符不受影响
  const rfc1738_special = qs.formats.formatters.RFC1738('a%20@#$%^&*()');
  results.push({
    name: '3.8 RFC1738: 特殊字符不受影响',
    pass: rfc1738_special === 'a+@#$%^&*()',
    expected: 'a+@#$%^&*()',
    actual: rfc1738_special
  });
  
  // ============================================================================
  // 4. RFC3986 formatter 功能测试
  // ============================================================================
  
  // 4.1 RFC3986: %20 保持不变
  const rfc3986_space = qs.formats.formatters.RFC3986('hello%20world');
  results.push({
    name: '4.1 RFC3986: %20 保持不变',
    pass: rfc3986_space === 'hello%20world',
    expected: 'hello%20world',
    actual: rfc3986_space
  });
  
  // 4.2 RFC3986: 多个 %20
  const rfc3986_multiple = qs.formats.formatters.RFC3986('a%20b%20c%20d');
  results.push({
    name: '4.2 RFC3986: 多个 %20',
    pass: rfc3986_multiple === 'a%20b%20c%20d',
    expected: 'a%20b%20c%20d',
    actual: rfc3986_multiple
  });
  
  // 4.3 RFC3986: 不含 %20
  const rfc3986_no_space = qs.formats.formatters.RFC3986('hello');
  results.push({
    name: '4.3 RFC3986: 不含 %20',
    pass: rfc3986_no_space === 'hello',
    expected: 'hello',
    actual: rfc3986_no_space
  });
  
  // 4.4 RFC3986: 空字符串
  const rfc3986_empty = qs.formats.formatters.RFC3986('');
  results.push({
    name: '4.4 RFC3986: 空字符串',
    pass: rfc3986_empty === '',
    expected: '',
    actual: rfc3986_empty
  });
  
  // 4.5 RFC3986: 其他编码字符不变
  const rfc3986_other = qs.formats.formatters.RFC3986('a%2Bb%3Dc');
  results.push({
    name: '4.5 RFC3986: 其他编码字符不变',
    pass: rfc3986_other === 'a%2Bb%3Dc',
    expected: 'a%2Bb%3Dc',
    actual: rfc3986_other
  });
  
  // 4.6 RFC3986: 混合编码
  const rfc3986_mixed = qs.formats.formatters.RFC3986('a%20b%2Bc%20d');
  results.push({
    name: '4.6 RFC3986: 混合编码',
    pass: rfc3986_mixed === 'a%20b%2Bc%20d',
    expected: 'a%20b%2Bc%20d',
    actual: rfc3986_mixed
  });
  
  // ============================================================================
  // 5. stringify 中的 format 选项测试（默认行为）
  // ============================================================================
  
  // 5.1 默认格式（RFC3986）：空格编码为 %20
  const default_format = qs.stringify({ a: 'hello world' });
  results.push({
    name: '5.1 默认格式（RFC3986）：空格编码为 %20',
    pass: default_format === 'a=hello%20world',
    expected: 'a=hello%20world',
    actual: default_format
  });
  
  // 5.2 显式指定 RFC3986 格式
  const explicit_rfc3986 = qs.stringify({ a: 'hello world' }, { format: 'RFC3986' });
  results.push({
    name: '5.2 显式指定 RFC3986 格式',
    pass: explicit_rfc3986 === 'a=hello%20world',
    expected: 'a=hello%20world',
    actual: explicit_rfc3986
  });
  
  // 5.3 使用 formats.RFC3986 常量
  const format_constant_3986 = qs.stringify({ a: 'hello world' }, { format: qs.formats.RFC3986 });
  results.push({
    name: '5.3 使用 formats.RFC3986 常量',
    pass: format_constant_3986 === 'a=hello%20world',
    expected: 'a=hello%20world',
    actual: format_constant_3986
  });
  
  // ============================================================================
  // 6. stringify 中的 format 选项测试（RFC1738）
  // ============================================================================
  
  // 6.1 RFC1738 格式：空格编码为 +
  const rfc1738_format = qs.stringify({ a: 'hello world' }, { format: 'RFC1738' });
  results.push({
    name: '6.1 RFC1738 格式：空格编码为 +',
    pass: rfc1738_format === 'a=hello+world',
    expected: 'a=hello+world',
    actual: rfc1738_format
  });
  
  // 6.2 使用 formats.RFC1738 常量
  const format_constant_1738 = qs.stringify({ a: 'hello world' }, { format: qs.formats.RFC1738 });
  results.push({
    name: '6.2 使用 formats.RFC1738 常量',
    pass: format_constant_1738 === 'a=hello+world',
    expected: 'a=hello+world',
    actual: format_constant_1738
  });
  
  // 6.3 RFC1738：多个键值对
  const rfc1738_multiple_keys = qs.stringify({ a: 'hello world', b: 'foo bar' }, { format: 'RFC1738' });
  results.push({
    name: '6.3 RFC1738：多个键值对',
    pass: rfc1738_multiple_keys === 'a=hello+world&b=foo+bar',
    expected: 'a=hello+world&b=foo+bar',
    actual: rfc1738_multiple_keys
  });
  
  // 6.4 RFC1738：嵌套对象
  const rfc1738_nested = qs.stringify({ a: { b: 'hello world' } }, { format: 'RFC1738' });
  results.push({
    name: '6.4 RFC1738：嵌套对象',
    pass: rfc1738_nested === 'a%5Bb%5D=hello+world',
    expected: 'a%5Bb%5D=hello+world',
    actual: rfc1738_nested
  });
  
  // 6.5 RFC1738：数组
  const rfc1738_array = qs.stringify({ a: ['hello world', 'foo bar'] }, { format: 'RFC1738' });
  results.push({
    name: '6.5 RFC1738：数组',
    pass: rfc1738_array === 'a%5B0%5D=hello+world&a%5B1%5D=foo+bar',
    expected: 'a%5B0%5D=hello+world&a%5B1%5D=foo+bar',
    actual: rfc1738_array
  });
  
  // ============================================================================
  // 7. format 与其他选项的交互测试
  // ============================================================================
  
  // 7.1 RFC1738 + allowDots
  const rfc1738_allowDots = qs.stringify({ a: { b: 'hello world' } }, { format: 'RFC1738', allowDots: true });
  results.push({
    name: '7.1 RFC1738 + allowDots',
    pass: rfc1738_allowDots === 'a.b=hello+world',
    expected: 'a.b=hello+world',
    actual: rfc1738_allowDots
  });
  
  // 7.2 RFC3986 + allowDots
  const rfc3986_allowDots = qs.stringify({ a: { b: 'hello world' } }, { format: 'RFC3986', allowDots: true });
  results.push({
    name: '7.2 RFC3986 + allowDots',
    pass: rfc3986_allowDots === 'a.b=hello%20world',
    expected: 'a.b=hello%20world',
    actual: rfc3986_allowDots
  });
  
  // 7.3 RFC1738 + arrayFormat: brackets
  const rfc1738_brackets = qs.stringify({ a: ['hello world'] }, { format: 'RFC1738', arrayFormat: 'brackets' });
  results.push({
    name: '7.3 RFC1738 + arrayFormat: brackets',
    pass: rfc1738_brackets === 'a%5B%5D=hello+world',
    expected: 'a%5B%5D=hello+world',
    actual: rfc1738_brackets
  });
  
  // 7.4 RFC1738 + arrayFormat: repeat
  const rfc1738_repeat = qs.stringify({ a: ['hello world', 'foo bar'] }, { format: 'RFC1738', arrayFormat: 'repeat' });
  results.push({
    name: '7.4 RFC1738 + arrayFormat: repeat',
    pass: rfc1738_repeat === 'a=hello+world&a=foo+bar',
    expected: 'a=hello+world&a=foo+bar',
    actual: rfc1738_repeat
  });
  
  // 7.5 RFC1738 + arrayFormat: comma
  const rfc1738_comma = qs.stringify({ a: ['hello world', 'foo bar'] }, { format: 'RFC1738', arrayFormat: 'comma' });
  results.push({
    name: '7.5 RFC1738 + arrayFormat: comma',
    pass: rfc1738_comma === 'a=hello+world%2Cfoo+bar',
    expected: 'a=hello+world%2Cfoo+bar',
    actual: rfc1738_comma
  });
  
  // 7.6 RFC1738 + encode: false
  const rfc1738_no_encode = qs.stringify({ a: 'hello world' }, { format: 'RFC1738', encode: false });
  results.push({
    name: '7.6 RFC1738 + encode: false',
    pass: rfc1738_no_encode === 'a=hello world',
    expected: 'a=hello world',
    actual: rfc1738_no_encode
  });
  
  // 7.7 RFC3986 + encode: false
  const rfc3986_no_encode = qs.stringify({ a: 'hello world' }, { format: 'RFC3986', encode: false });
  results.push({
    name: '7.7 RFC3986 + encode: false',
    pass: rfc3986_no_encode === 'a=hello world',
    expected: 'a=hello world',
    actual: rfc3986_no_encode
  });
  
  // ============================================================================
  // 8. format 边界和特殊情况测试
  // ============================================================================
  
  // 8.1 空对象
  const format_empty_obj = qs.stringify({}, { format: 'RFC1738' });
  results.push({
    name: '8.1 format: 空对象',
    pass: format_empty_obj === '',
    expected: '',
    actual: format_empty_obj
  });
  
  // 8.2 值为空字符串
  const format_empty_value = qs.stringify({ a: '' }, { format: 'RFC1738' });
  results.push({
    name: '8.2 format: 值为空字符串',
    pass: format_empty_value === 'a=',
    expected: 'a=',
    actual: format_empty_value
  });
  
  // 8.3 键为空字符串
  const format_empty_key = qs.stringify({ '': 'value' }, { format: 'RFC1738' });
  results.push({
    name: '8.3 format: 键为空字符串',
    pass: format_empty_key === '=value',
    expected: '=value',
    actual: format_empty_key
  });
  
  // 8.4 特殊字符（非空格）
  const format_special = qs.stringify({ a: 'a+b=c&d' }, { format: 'RFC1738' });
  results.push({
    name: '8.4 format: 特殊字符（非空格）',
    pass: format_special === 'a=a%2Bb%3Dc%26d',
    expected: 'a=a%2Bb%3Dc%26d',
    actual: format_special
  });
  
  // 8.5 Unicode 字符
  const format_unicode = qs.stringify({ a: '你好 世界' }, { format: 'RFC1738' });
  results.push({
    name: '8.5 format: Unicode 字符',
    pass: format_unicode === 'a=%E4%BD%A0%E5%A5%BD+%E4%B8%96%E7%95%8C',
    expected: 'a=%E4%BD%A0%E5%A5%BD+%E4%B8%96%E7%95%8C',
    actual: format_unicode
  });
  
  // 8.6 无效的 format 值（应抛出错误）
  let format_invalid_result;
  try {
    format_invalid_result = qs.stringify({ a: 'hello world' }, { format: 'INVALID' });
    results.push({
      name: '8.6 format: 无效值应抛出错误',
      pass: false,
      expected: 'Error',
      actual: format_invalid_result
    });
  } catch (e) {
    results.push({
      name: '8.6 format: 无效值应抛出错误',
      pass: e.message.includes('Unknown format'),
      expected: 'Error: Unknown format',
      actual: e.message
    });
  }
  
  // ============================================================================
  // 9. formatter 函数的边界测试
  // ============================================================================
  
  // 9.1 RFC1738 formatter: 没有参数（应抛出错误）
  let formatter_no_arg;
  try {
    formatter_no_arg = qs.formats.formatters.RFC1738();
    results.push({
      name: '9.1 RFC1738 formatter: 没有参数',
      pass: false,
      expected: 'Error',
      actual: formatter_no_arg
    });
  } catch (e) {
    results.push({
      name: '9.1 RFC1738 formatter: 没有参数',
      pass: true,
      expected: 'Error (undefined not allowed)',
      actual: 'Error: ' + e.message
    });
  }
  
  // 9.2 RFC3986 formatter: 没有参数
  let formatter_no_arg_3986;
  try {
    formatter_no_arg_3986 = qs.formats.formatters.RFC3986();
    results.push({
      name: '9.2 RFC3986 formatter: 没有参数',
      pass: formatter_no_arg_3986 === 'undefined',
      expected: 'undefined',
      actual: formatter_no_arg_3986
    });
  } catch (e) {
    results.push({
      name: '9.2 RFC3986 formatter: 没有参数',
      pass: false,
      expected: 'undefined',
      actual: 'Error: ' + e.message
    });
  }
  
  // 9.3 RFC1738 formatter: null（应抛出错误）
  try {
    const formatter_null = qs.formats.formatters.RFC1738(null);
    results.push({
      name: '9.3 RFC1738 formatter: null',
      pass: false,
      expected: 'Error',
      actual: formatter_null
    });
  } catch (e) {
    results.push({
      name: '9.3 RFC1738 formatter: null',
      pass: true,
      expected: 'Error (null not allowed)',
      actual: 'Error: ' + e.message
    });
  }
  
  // 9.4 RFC1738 formatter: 数字
  const formatter_number = qs.formats.formatters.RFC1738(123);
  results.push({
    name: '9.4 RFC1738 formatter: 数字',
    pass: formatter_number === '123',
    expected: '123',
    actual: formatter_number
  });
  
  // 9.5 RFC1738 formatter: 对象（转为字符串）
  const formatter_object = qs.formats.formatters.RFC1738({ a: 1 });
  results.push({
    name: '9.5 RFC1738 formatter: 对象',
    pass: formatter_object === '[object Object]',
    expected: '[object Object]',
    actual: formatter_object
  });
  
  // ============================================================================
  // 10. formats 对象的不可变性测试
  // ============================================================================
  
  // 10.1 尝试修改 formats.RFC1738
  const original_rfc1738 = qs.formats.RFC1738;
  try {
    qs.formats.RFC1738 = 'modified';
    results.push({
      name: '10.1 formats.RFC1738 可修改性',
      pass: true,
      expected: 'can modify (or throws)',
      actual: qs.formats.RFC1738
    });
  } catch (e) {
    results.push({
      name: '10.1 formats.RFC1738 可修改性',
      pass: true,
      expected: 'throws or succeeds',
      actual: 'Error: ' + e.message
    });
  }
  // 恢复原值
  qs.formats.RFC1738 = original_rfc1738;
  
  // ============================================================================
  // 11. 复杂场景综合测试
  // ============================================================================
  
  // 11.1 RFC1738: 复杂嵌套对象
  const complex_nested = qs.stringify({
    user: {
      name: 'John Doe',
      address: {
        city: 'New York',
        street: 'Main St'
      }
    }
  }, { format: 'RFC1738' });
  results.push({
    name: '11.1 RFC1738: 复杂嵌套对象',
    pass: complex_nested === 'user%5Bname%5D=John+Doe&user%5Baddress%5D%5Bcity%5D=New+York&user%5Baddress%5D%5Bstreet%5D=Main+St',
    expected: 'user%5Bname%5D=John+Doe&user%5Baddress%5D%5Bcity%5D=New+York&user%5Baddress%5D%5Bstreet%5D=Main+St',
    actual: complex_nested
  });
  
  // 11.2 RFC3986: 复杂嵌套对象
  const complex_nested_3986 = qs.stringify({
    user: {
      name: 'John Doe',
      address: {
        city: 'New York',
        street: 'Main St'
      }
    }
  }, { format: 'RFC3986' });
  results.push({
    name: '11.2 RFC3986: 复杂嵌套对象',
    pass: complex_nested_3986 === 'user%5Bname%5D=John%20Doe&user%5Baddress%5D%5Bcity%5D=New%20York&user%5Baddress%5D%5Bstreet%5D=Main%20St',
    expected: 'user%5Bname%5D=John%20Doe&user%5Baddress%5D%5Bcity%5D=New%20York&user%5Baddress%5D%5Bstreet%5D=Main%20St',
    actual: complex_nested_3986
  });
  
  // 11.3 RFC1738 + 自定义 encoder
  const custom_encoder = qs.stringify(
    { a: 'hello world' },
    {
      format: 'RFC1738',
      encoder: function(str) {
        return str.toUpperCase();
      }
    }
  );
  results.push({
    name: '11.3 RFC1738 + 自定义 encoder',
    pass: custom_encoder === 'A=HELLO WORLD',
    expected: 'A=HELLO WORLD',
    actual: custom_encoder
  });
  
  // ============================================================================
  // 汇总结果
  // ============================================================================
  
  const passed = results.filter(r => r.pass).length;
  const failed = results.filter(r => !r.pass).length;
  const total = results.length;
  
  const summary = {
    total: total,
    passed: passed,
    failed: failed,
    successRate: ((passed / total) * 100).toFixed(2) + '%'
  };
  
  const failedTests = results.filter(r => !r.pass).map(r => ({
    name: r.name,
    expected: r.expected,
    actual: r.actual
  }));
  
  const testResults = {
    success: failed === 0,
    summary: summary,
    results: results.map(r => ({
      name: r.name,
      result: r.pass ? '✅' : '❌',
      expected: r.expected,
      actual: r.actual
    })),
    failedTests: failedTests
  };
  
  console.log(JSON.stringify(testResults, null, 2));
  return testResults;
  
} catch (error) {
  const testResults = {
    success: false,
    error: error.message,
    stack: error.stack
  };
  console.log(JSON.stringify(testResults, null, 2));
  return testResults;
}

