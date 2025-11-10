const qs = require('qs');

// ============================================================================
// qs.formats 补充边界测试（查缺补漏）
// ============================================================================

try {
  const results = [];
  
  // ============================================================================
  // 1. formatter 函数的额外边界测试
  // ============================================================================
  
  // 1.1 RFC1738: 空格和 %20 混合
  const mixed_spaces = qs.formats.formatters.RFC1738('hello world%20test');
  results.push({
    name: '1.1 RFC1738: 空格和 %20 混合',
    pass: mixed_spaces === 'hello world+test',
    expected: 'hello world+test',
    actual: mixed_spaces
  });
  
  // 1.2 RFC1738: %2520（双重编码的空格）
  const double_encoded = qs.formats.formatters.RFC1738('%2520');
  results.push({
    name: '1.2 RFC1738: %2520（双重编码的空格）',
    pass: double_encoded === '%2520',
    expected: '%2520',
    actual: double_encoded
  });
  
  // 1.3 RFC1738: 只有 %20
  const only_encoded_space = qs.formats.formatters.RFC1738('%20');
  results.push({
    name: '1.3 RFC1738: 只有 %20',
    pass: only_encoded_space === '+',
    expected: '+',
    actual: only_encoded_space
  });
  
  // 1.4 RFC1738: 大小写敏感性
  const case_sensitive = qs.formats.formatters.RFC1738('%20%2B');
  results.push({
    name: '1.4 RFC1738: 大小写敏感性',
    pass: case_sensitive === '+%2B',
    expected: '+%2B',
    actual: case_sensitive
  });
  
  // 1.5 RFC3986: 保持 + 号
  const keep_plus = qs.formats.formatters.RFC3986('a+b');
  results.push({
    name: '1.5 RFC3986: 保持 + 号',
    pass: keep_plus === 'a+b',
    expected: 'a+b',
    actual: keep_plus
  });
  
  // 1.6 RFC3986: 数字字符串
  const number_string = qs.formats.formatters.RFC3986('12345');
  results.push({
    name: '1.6 RFC3986: 数字字符串',
    pass: number_string === '12345',
    expected: '12345',
    actual: number_string
  });
  
  // 1.7 RFC1738: 布尔值 true
  const bool_true = qs.formats.formatters.RFC1738(true);
  results.push({
    name: '1.7 RFC1738: 布尔值 true',
    pass: bool_true === 'true',
    expected: 'true',
    actual: bool_true
  });
  
  // 1.8 RFC1738: 布尔值 false
  const bool_false = qs.formats.formatters.RFC1738(false);
  results.push({
    name: '1.8 RFC1738: 布尔值 false',
    pass: bool_false === 'false',
    expected: 'false',
    actual: bool_false
  });
  
  // 1.9 RFC1738: 数组（转为字符串）
  const array_value = qs.formats.formatters.RFC1738([1, 2, 3]);
  results.push({
    name: '1.9 RFC1738: 数组',
    pass: array_value === '1,2,3',
    expected: '1,2,3',
    actual: array_value
  });
  
  // ============================================================================
  // 2. stringify 中的 format 复杂交互测试
  // ============================================================================
  
  // 2.1 RFC1738 + skipNulls
  const skip_nulls = qs.stringify({ a: 'hello world', b: null }, { format: 'RFC1738', skipNulls: true });
  results.push({
    name: '2.1 RFC1738 + skipNulls',
    pass: skip_nulls === 'a=hello+world',
    expected: 'a=hello+world',
    actual: skip_nulls
  });
  
  // 2.2 RFC1738 + strictNullHandling
  const strict_null = qs.stringify({ a: 'hello world', b: null }, { format: 'RFC1738', strictNullHandling: true });
  results.push({
    name: '2.2 RFC1738 + strictNullHandling',
    pass: strict_null === 'a=hello+world&b',
    expected: 'a=hello+world&b',
    actual: strict_null
  });
  
  // 2.3 RFC1738 + addQueryPrefix
  const add_prefix = qs.stringify({ a: 'hello world' }, { format: 'RFC1738', addQueryPrefix: true });
  results.push({
    name: '2.3 RFC1738 + addQueryPrefix',
    pass: add_prefix === '?a=hello+world',
    expected: '?a=hello+world',
    actual: add_prefix
  });
  
  // 2.4 RFC1738 + charsetSentinel (UTF-8)
  const charset_sentinel = qs.stringify({ a: 'hello world' }, { format: 'RFC1738', charsetSentinel: true });
  results.push({
    name: '2.4 RFC1738 + charsetSentinel (UTF-8)',
    pass: charset_sentinel === 'utf8=%E2%9C%93&a=hello+world',
    expected: 'utf8=%E2%9C%93&a=hello+world',
    actual: charset_sentinel
  });
  
  // 2.5 RFC1738 + charsetSentinel (ISO-8859-1)
  const charset_iso = qs.stringify({ a: 'hello world' }, { format: 'RFC1738', charsetSentinel: true, charset: 'iso-8859-1' });
  results.push({
    name: '2.5 RFC1738 + charsetSentinel (ISO-8859-1)',
    pass: charset_iso === 'utf8=%26%2310003%3B&a=hello+world',
    expected: 'utf8=%26%2310003%3B&a=hello+world',
    actual: charset_iso
  });
  
  // 2.6 RFC3986 + charsetSentinel + addQueryPrefix
  const sentinel_and_prefix = qs.stringify({ a: 'hello world' }, { 
    format: 'RFC3986', 
    charsetSentinel: true, 
    addQueryPrefix: true 
  });
  results.push({
    name: '2.6 RFC3986 + charsetSentinel + addQueryPrefix',
    pass: sentinel_and_prefix === '?utf8=%E2%9C%93&a=hello%20world',
    expected: '?utf8=%E2%9C%93&a=hello%20world',
    actual: sentinel_and_prefix
  });
  
  // 2.7 RFC1738 + sort
  const sorted = qs.stringify({ z: 'world', a: 'hello' }, { format: 'RFC1738', sort: (a, b) => a.localeCompare(b) });
  results.push({
    name: '2.7 RFC1738 + sort',
    pass: sorted === 'a=hello&z=world',
    expected: 'a=hello&z=world',
    actual: sorted
  });
  
  // 2.8 RFC1738 + filter（数组形式）
  const filter_array = qs.stringify({ a: 'hello world', b: 'foo', c: 'bar' }, { 
    format: 'RFC1738', 
    filter: ['a', 'c'] 
  });
  results.push({
    name: '2.8 RFC1738 + filter（数组形式）',
    pass: filter_array === 'a=hello+world&c=bar',
    expected: 'a=hello+world&c=bar',
    actual: filter_array
  });
  
  // 2.9 RFC1738 + filter（函数形式）
  const filter_func = qs.stringify({ a: 'hello world', b: 'foo' }, { 
    format: 'RFC1738',
    filter: function(prefix, value) {
      if (prefix === 'b') return undefined;
      return value;
    }
  });
  results.push({
    name: '2.9 RFC1738 + filter（函数形式）',
    pass: filter_func === 'a=hello+world',
    expected: 'a=hello+world',
    actual: filter_func
  });
  
  // ============================================================================
  // 3. format 与深度嵌套测试
  // ============================================================================
  
  // 3.1 RFC1738: 深层嵌套
  const deep_nested = qs.stringify({
    a: {
      b: {
        c: 'hello world'
      }
    }
  }, { format: 'RFC1738' });
  results.push({
    name: '3.1 RFC1738: 深层嵌套',
    pass: deep_nested === 'a%5Bb%5D%5Bc%5D=hello+world',
    expected: 'a%5Bb%5D%5Bc%5D=hello+world',
    actual: deep_nested
  });
  
  // 3.2 RFC1738 + allowDots: 深层嵌套
  const deep_dots = qs.stringify({
    a: {
      b: {
        c: 'hello world'
      }
    }
  }, { format: 'RFC1738', allowDots: true });
  results.push({
    name: '3.2 RFC1738 + allowDots: 深层嵌套',
    pass: deep_dots === 'a.b.c=hello+world',
    expected: 'a.b.c=hello+world',
    actual: deep_dots
  });
  
  // 3.3 RFC1738: 数组嵌套对象
  const array_nested = qs.stringify({
    users: [
      { name: 'John Doe' },
      { name: 'Jane Smith' }
    ]
  }, { format: 'RFC1738' });
  results.push({
    name: '3.3 RFC1738: 数组嵌套对象',
    pass: array_nested === 'users%5B0%5D%5Bname%5D=John+Doe&users%5B1%5D%5Bname%5D=Jane+Smith',
    expected: 'users%5B0%5D%5Bname%5D=John+Doe&users%5B1%5D%5Bname%5D=Jane+Smith',
    actual: array_nested
  });
  
  // ============================================================================
  // 4. 特殊值测试
  // ============================================================================
  
  // 4.1 RFC1738: 数字 0
  const zero = qs.stringify({ a: 0 }, { format: 'RFC1738' });
  results.push({
    name: '4.1 RFC1738: 数字 0',
    pass: zero === 'a=0',
    expected: 'a=0',
    actual: zero
  });
  
  // 4.2 RFC1738: 布尔值 false
  const false_bool = qs.stringify({ a: false }, { format: 'RFC1738' });
  results.push({
    name: '4.2 RFC1738: 布尔值 false',
    pass: false_bool === 'a=false',
    expected: 'a=false',
    actual: false_bool
  });
  
  // 4.3 RFC1738: 空数组
  const empty_array = qs.stringify({ a: [] }, { format: 'RFC1738' });
  results.push({
    name: '4.3 RFC1738: 空数组',
    pass: empty_array === '',
    expected: '',
    actual: empty_array
  });
  
  // 4.4 RFC1738: 包含特殊 URL 字符
  const special_chars = qs.stringify({ url: 'https://example.com/path?query=value' }, { format: 'RFC1738' });
  results.push({
    name: '4.4 RFC1738: 包含特殊 URL 字符',
    pass: special_chars === 'url=https%3A%2F%2Fexample.com%2Fpath%3Fquery%3Dvalue',
    expected: 'url=https%3A%2F%2Fexample.com%2Fpath%3Fquery%3Dvalue',
    actual: special_chars
  });
  
  // 4.5 RFC3986: 包含 emoji
  const emoji = qs.stringify({ msg: 'Hello 😀 World' }, { format: 'RFC3986' });
  results.push({
    name: '4.5 RFC3986: 包含 emoji',
    pass: emoji === 'msg=Hello%20%F0%9F%98%80%20World',
    expected: 'msg=Hello%20%F0%9F%98%80%20World',
    actual: emoji
  });
  
  // ============================================================================
  // 5. formats 常量的使用场景
  // ============================================================================
  
  // 5.1 使用 qs.formats.default
  const use_default = qs.stringify({ a: 'hello world' }, { format: qs.formats.default });
  results.push({
    name: '5.1 使用 qs.formats.default',
    pass: use_default === 'a=hello%20world',
    expected: 'a=hello%20world',
    actual: use_default
  });
  
  // 5.2 动态选择 format
  const dynamic_format = (useRFC1738) => {
    return qs.stringify({ a: 'hello world' }, { 
      format: useRFC1738 ? qs.formats.RFC1738 : qs.formats.RFC3986 
    });
  };
  const dynamic_result_1738 = dynamic_format(true);
  const dynamic_result_3986 = dynamic_format(false);
  results.push({
    name: '5.2 动态选择 format (RFC1738)',
    pass: dynamic_result_1738 === 'a=hello+world',
    expected: 'a=hello+world',
    actual: dynamic_result_1738
  });
  results.push({
    name: '5.3 动态选择 format (RFC3986)',
    pass: dynamic_result_3986 === 'a=hello%20world',
    expected: 'a=hello%20world',
    actual: dynamic_result_3986
  });
  
  // ============================================================================
  // 6. formatter 函数在实际场景中的使用
  // ============================================================================
  
  // 6.1 手动格式化预编码的查询字符串
  const pre_encoded = 'name=John%20Doe&city=New%20York';
  const manual_format_1738 = pre_encoded.split('&').map(pair => {
    const [key, value] = pair.split('=');
    return key + '=' + qs.formats.formatters.RFC1738(value);
  }).join('&');
  results.push({
    name: '6.1 手动格式化（RFC1738）',
    pass: manual_format_1738 === 'name=John+Doe&city=New+York',
    expected: 'name=John+Doe&city=New+York',
    actual: manual_format_1738
  });
  
  // 6.2 格式化单个值
  const single_value = qs.formats.formatters.RFC1738('test%20value');
  results.push({
    name: '6.2 格式化单个值',
    pass: single_value === 'test+value',
    expected: 'test+value',
    actual: single_value
  });
  
  // ============================================================================
  // 7. 边界值组合测试
  // ============================================================================
  
  // 7.1 RFC1738: 所有 options 组合
  const all_options = qs.stringify({ 
    a: ['hello world', 'foo bar'],
    b: { c: 'test value' }
  }, { 
    format: 'RFC1738',
    arrayFormat: 'repeat',
    allowDots: true,
    encode: true,
    skipNulls: true
  });
  results.push({
    name: '7.1 RFC1738: 多选项组合',
    pass: all_options === 'a=hello+world&a=foo+bar&b.c=test+value',
    expected: 'a=hello+world&a=foo+bar&b.c=test+value',
    actual: all_options
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

