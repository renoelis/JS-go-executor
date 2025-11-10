const qs = require('qs');

// ============================================================================
// qs.formats 完整综合验证测试（无死角覆盖）
// 测试 qs v6.14.0 的 formats API 所有功能
// ============================================================================

try {
  const results = [];
  
  // ============================================================================
  // 第一部分：formats 对象结构与常量验证
  // ============================================================================
  
  // 1.1 formats 对象存在性与类型
  results.push({
    name: '1.1 formats 对象存在且为 object',
    pass: typeof qs.formats === 'object' && qs.formats !== null,
    expected: 'object (not null)',
    actual: typeof qs.formats + (qs.formats === null ? ' (null)' : '')
  });
  
  // 1.2 formats 是否可枚举
  const formatKeys = Object.keys(qs.formats);
  results.push({
    name: '1.2 formats 对象的可枚举属性',
    pass: formatKeys.length >= 4,
    expected: '至少包含 4 个属性',
    actual: `${formatKeys.length} 个: [${formatKeys.join(', ')}]`
  });
  
  // 1.3 formats.RFC1738 常量
  results.push({
    name: '1.3 formats.RFC1738 常量值',
    pass: qs.formats.RFC1738 === 'RFC1738',
    expected: 'RFC1738',
    actual: qs.formats.RFC1738
  });
  
  // 1.4 formats.RFC3986 常量
  results.push({
    name: '1.4 formats.RFC3986 常量值',
    pass: qs.formats.RFC3986 === 'RFC3986',
    expected: 'RFC3986',
    actual: qs.formats.RFC3986
  });
  
  // 1.5 formats.default 默认值
  results.push({
    name: '1.5 formats.default 默认值为 RFC3986',
    pass: qs.formats.default === 'RFC3986',
    expected: 'RFC3986',
    actual: qs.formats.default
  });
  
  // 1.6 formats.formatters 对象存在
  results.push({
    name: '1.6 formats.formatters 对象存在',
    pass: typeof qs.formats.formatters === 'object' && qs.formats.formatters !== null,
    expected: 'object (not null)',
    actual: typeof qs.formats.formatters
  });
  
  // 1.7 formatters.RFC1738 函数存在
  results.push({
    name: '1.7 formatters.RFC1738 是函数',
    pass: typeof qs.formats.formatters.RFC1738 === 'function',
    expected: 'function',
    actual: typeof qs.formats.formatters.RFC1738
  });
  
  // 1.8 formatters.RFC3986 函数存在
  results.push({
    name: '1.8 formatters.RFC3986 是函数',
    pass: typeof qs.formats.formatters.RFC3986 === 'function',
    expected: 'function',
    actual: typeof qs.formats.formatters.RFC3986
  });
  
  // ============================================================================
  // 第二部分：RFC1738 formatter 详细功能测试
  // ============================================================================
  
  // 2.1 RFC1738: %20 转换为 +
  const rfc1738_basic = qs.formats.formatters.RFC1738('hello%20world');
  results.push({
    name: '2.1 RFC1738: %20 转换为 +',
    pass: rfc1738_basic === 'hello+world',
    expected: 'hello+world',
    actual: rfc1738_basic
  });
  
  // 2.2 RFC1738: 多个 %20
  const rfc1738_multiple = qs.formats.formatters.RFC1738('a%20b%20c%20d');
  results.push({
    name: '2.2 RFC1738: 多个 %20 转换',
    pass: rfc1738_multiple === 'a+b+c+d',
    expected: 'a+b+c+d',
    actual: rfc1738_multiple
  });
  
  // 2.3 RFC1738: 连续 %20
  const rfc1738_consecutive = qs.formats.formatters.RFC1738('a%20%20%20b');
  results.push({
    name: '2.3 RFC1738: 连续 %20',
    pass: rfc1738_consecutive === 'a+++b',
    expected: 'a+++b',
    actual: rfc1738_consecutive
  });
  
  // 2.4 RFC1738: 只有 %20
  const rfc1738_only = qs.formats.formatters.RFC1738('%20');
  results.push({
    name: '2.4 RFC1738: 只有 %20',
    pass: rfc1738_only === '+',
    expected: '+',
    actual: rfc1738_only
  });
  
  // 2.5 RFC1738: 不含 %20
  const rfc1738_no_space = qs.formats.formatters.RFC1738('hello');
  results.push({
    name: '2.5 RFC1738: 不含 %20 保持不变',
    pass: rfc1738_no_space === 'hello',
    expected: 'hello',
    actual: rfc1738_no_space
  });
  
  // 2.6 RFC1738: 空字符串
  const rfc1738_empty = qs.formats.formatters.RFC1738('');
  results.push({
    name: '2.6 RFC1738: 空字符串',
    pass: rfc1738_empty === '',
    expected: '',
    actual: rfc1738_empty
  });
  
  // 2.7 RFC1738: 其他编码字符不变
  const rfc1738_other = qs.formats.formatters.RFC1738('a%2Bb%3Dc%26d');
  results.push({
    name: '2.7 RFC1738: 其他编码字符不变',
    pass: rfc1738_other === 'a%2Bb%3Dc%26d',
    expected: 'a%2Bb%3Dc%26d',
    actual: rfc1738_other
  });
  
  // 2.8 RFC1738: 混合编码
  const rfc1738_mixed = qs.formats.formatters.RFC1738('a%20b%2Bc%20d');
  results.push({
    name: '2.8 RFC1738: 混合编码',
    pass: rfc1738_mixed === 'a+b%2Bc+d',
    expected: 'a+b%2Bc+d',
    actual: rfc1738_mixed
  });
  
  // 2.9 RFC1738: %2520（双重编码）不转换
  const rfc1738_double = qs.formats.formatters.RFC1738('%2520');
  results.push({
    name: '2.9 RFC1738: %2520 双重编码不转换',
    pass: rfc1738_double === '%2520',
    expected: '%2520',
    actual: rfc1738_double
  });
  
  // 2.10 RFC1738: 大小写敏感（%20 vs %2B）
  const rfc1738_case = qs.formats.formatters.RFC1738('%20%2B%2b');
  results.push({
    name: '2.10 RFC1738: 大小写敏感性',
    pass: rfc1738_case === '+%2B%2b',
    expected: '+%2B%2b',
    actual: rfc1738_case
  });
  
  // 2.11 RFC1738: 原始空格不转换（只转换 %20）
  const rfc1738_raw_space = qs.formats.formatters.RFC1738('hello world');
  results.push({
    name: '2.11 RFC1738: 原始空格不转换',
    pass: rfc1738_raw_space === 'hello world',
    expected: 'hello world',
    actual: rfc1738_raw_space
  });
  
  // 2.12 RFC1738: 混合原始空格和 %20
  const rfc1738_mixed_space = qs.formats.formatters.RFC1738('hello world%20test');
  results.push({
    name: '2.12 RFC1738: 混合原始空格和 %20',
    pass: rfc1738_mixed_space === 'hello world+test',
    expected: 'hello world+test',
    actual: rfc1738_mixed_space
  });
  
  // ============================================================================
  // 第三部分：RFC3986 formatter 详细功能测试
  // ============================================================================
  
  // 3.1 RFC3986: %20 保持不变
  const rfc3986_basic = qs.formats.formatters.RFC3986('hello%20world');
  results.push({
    name: '3.1 RFC3986: %20 保持不变',
    pass: rfc3986_basic === 'hello%20world',
    expected: 'hello%20world',
    actual: rfc3986_basic
  });
  
  // 3.2 RFC3986: 多个 %20
  const rfc3986_multiple = qs.formats.formatters.RFC3986('a%20b%20c%20d');
  results.push({
    name: '3.2 RFC3986: 多个 %20 保持',
    pass: rfc3986_multiple === 'a%20b%20c%20d',
    expected: 'a%20b%20c%20d',
    actual: rfc3986_multiple
  });
  
  // 3.3 RFC3986: 不含 %20
  const rfc3986_no_space = qs.formats.formatters.RFC3986('hello');
  results.push({
    name: '3.3 RFC3986: 不含 %20',
    pass: rfc3986_no_space === 'hello',
    expected: 'hello',
    actual: rfc3986_no_space
  });
  
  // 3.4 RFC3986: 空字符串
  const rfc3986_empty = qs.formats.formatters.RFC3986('');
  results.push({
    name: '3.4 RFC3986: 空字符串',
    pass: rfc3986_empty === '',
    expected: '',
    actual: rfc3986_empty
  });
  
  // 3.5 RFC3986: 其他编码字符不变
  const rfc3986_other = qs.formats.formatters.RFC3986('a%2Bb%3Dc');
  results.push({
    name: '3.5 RFC3986: 其他编码字符不变',
    pass: rfc3986_other === 'a%2Bb%3Dc',
    expected: 'a%2Bb%3Dc',
    actual: rfc3986_other
  });
  
  // 3.6 RFC3986: 保持 + 号
  const rfc3986_plus = qs.formats.formatters.RFC3986('a+b+c');
  results.push({
    name: '3.6 RFC3986: 保持 + 号',
    pass: rfc3986_plus === 'a+b+c',
    expected: 'a+b+c',
    actual: rfc3986_plus
  });
  
  // 3.7 RFC3986: 原始空格保持
  const rfc3986_raw_space = qs.formats.formatters.RFC3986('hello world');
  results.push({
    name: '3.7 RFC3986: 原始空格保持',
    pass: rfc3986_raw_space === 'hello world',
    expected: 'hello world',
    actual: rfc3986_raw_space
  });
  
  // ============================================================================
  // 第四部分：formatter 边界值与类型转换测试
  // ============================================================================
  
  // 4.1 RFC1738: 数字
  const rfc1738_number = qs.formats.formatters.RFC1738(123);
  results.push({
    name: '4.1 RFC1738: 数字类型',
    pass: rfc1738_number === '123',
    expected: '123',
    actual: rfc1738_number
  });
  
  // 4.2 RFC1738: 数字 0
  const rfc1738_zero = qs.formats.formatters.RFC1738(0);
  results.push({
    name: '4.2 RFC1738: 数字 0',
    pass: rfc1738_zero === '0',
    expected: '0',
    actual: rfc1738_zero
  });
  
  // 4.3 RFC1738: 布尔值 true
  const rfc1738_true = qs.formats.formatters.RFC1738(true);
  results.push({
    name: '4.3 RFC1738: 布尔值 true',
    pass: rfc1738_true === 'true',
    expected: 'true',
    actual: rfc1738_true
  });
  
  // 4.4 RFC1738: 布尔值 false
  const rfc1738_false = qs.formats.formatters.RFC1738(false);
  results.push({
    name: '4.4 RFC1738: 布尔值 false',
    pass: rfc1738_false === 'false',
    expected: 'false',
    actual: rfc1738_false
  });
  
  // 4.5 RFC1738: 对象
  const rfc1738_obj = qs.formats.formatters.RFC1738({ a: 1 });
  results.push({
    name: '4.5 RFC1738: 对象转字符串',
    pass: rfc1738_obj === '[object Object]',
    expected: '[object Object]',
    actual: rfc1738_obj
  });
  
  // 4.6 RFC1738: 数组
  const rfc1738_arr = qs.formats.formatters.RFC1738([1, 2, 3]);
  results.push({
    name: '4.6 RFC1738: 数组转字符串',
    pass: rfc1738_arr === '1,2,3',
    expected: '1,2,3',
    actual: rfc1738_arr
  });
  
  // 4.7 RFC1738: undefined（应抛出错误）
  try {
    const rfc1738_undef = qs.formats.formatters.RFC1738(undefined);
    results.push({
      name: '4.7 RFC1738: undefined 应抛出错误',
      pass: false,
      expected: 'Error',
      actual: rfc1738_undef
    });
  } catch (e) {
    results.push({
      name: '4.7 RFC1738: undefined 应抛出错误',
      pass: true,
      expected: 'Error thrown',
      actual: `Error: ${e.message.substring(0, 50)}`
    });
  }
  
  // 4.8 RFC1738: null（应抛出错误）
  try {
    const rfc1738_null = qs.formats.formatters.RFC1738(null);
    results.push({
      name: '4.8 RFC1738: null 应抛出错误',
      pass: false,
      expected: 'Error',
      actual: rfc1738_null
    });
  } catch (e) {
    results.push({
      name: '4.8 RFC1738: null 应抛出错误',
      pass: true,
      expected: 'Error thrown',
      actual: `Error: ${e.message.substring(0, 50)}`
    });
  }
  
  // 4.9 RFC3986: undefined
  const rfc3986_undef = qs.formats.formatters.RFC3986(undefined);
  results.push({
    name: '4.9 RFC3986: undefined 转字符串',
    pass: rfc3986_undef === 'undefined',
    expected: 'undefined',
    actual: rfc3986_undef
  });
  
  // 4.10 RFC3986: null（identity 函数）
  const rfc3986_null = qs.formats.formatters.RFC3986(null);
  results.push({
    name: '4.10 RFC3986: null 转字符串',
    pass: rfc3986_null === 'null',
    expected: 'null',
    actual: rfc3986_null
  });
  
  // ============================================================================
  // 第五部分：stringify 中的 format 选项测试
  // ============================================================================
  
  // 5.1 默认格式（不指定 format）
  const default_fmt = qs.stringify({ a: 'hello world' });
  results.push({
    name: '5.1 stringify 默认格式（RFC3986）',
    pass: default_fmt === 'a=hello%20world',
    expected: 'a=hello%20world',
    actual: default_fmt
  });
  
  // 5.2 显式指定 RFC3986
  const explicit_3986 = qs.stringify({ a: 'hello world' }, { format: 'RFC3986' });
  results.push({
    name: '5.2 stringify 显式指定 RFC3986',
    pass: explicit_3986 === 'a=hello%20world',
    expected: 'a=hello%20world',
    actual: explicit_3986
  });
  
  // 5.3 使用 formats.RFC3986 常量
  const const_3986 = qs.stringify({ a: 'hello world' }, { format: qs.formats.RFC3986 });
  results.push({
    name: '5.3 stringify 使用 formats.RFC3986 常量',
    pass: const_3986 === 'a=hello%20world',
    expected: 'a=hello%20world',
    actual: const_3986
  });
  
  // 5.4 使用 formats.default 常量
  const const_default = qs.stringify({ a: 'hello world' }, { format: qs.formats.default });
  results.push({
    name: '5.4 stringify 使用 formats.default 常量',
    pass: const_default === 'a=hello%20world',
    expected: 'a=hello%20world',
    actual: const_default
  });
  
  // 5.5 RFC1738 格式
  const rfc1738_fmt = qs.stringify({ a: 'hello world' }, { format: 'RFC1738' });
  results.push({
    name: '5.5 stringify RFC1738 格式',
    pass: rfc1738_fmt === 'a=hello+world',
    expected: 'a=hello+world',
    actual: rfc1738_fmt
  });
  
  // 5.6 使用 formats.RFC1738 常量
  const const_1738 = qs.stringify({ a: 'hello world' }, { format: qs.formats.RFC1738 });
  results.push({
    name: '5.6 stringify 使用 formats.RFC1738 常量',
    pass: const_1738 === 'a=hello+world',
    expected: 'a=hello+world',
    actual: const_1738
  });
  
  // 5.7 无效的 format 值（应抛出错误）
  try {
    const invalid_fmt = qs.stringify({ a: 'hello' }, { format: 'INVALID' });
    results.push({
      name: '5.7 stringify 无效 format 应抛出错误',
      pass: false,
      expected: 'Error',
      actual: invalid_fmt
    });
  } catch (e) {
    results.push({
      name: '5.7 stringify 无效 format 应抛出错误',
      pass: e.message.includes('Unknown format'),
      expected: 'Error: Unknown format',
      actual: e.message
    });
  }
  
  // ============================================================================
  // 第六部分：format 与其他选项的交互测试
  // ============================================================================
  
  // 6.1 RFC1738 + 多个键值对
  const multi_keys = qs.stringify({ a: 'hello world', b: 'foo bar' }, { format: 'RFC1738' });
  results.push({
    name: '6.1 RFC1738 + 多个键值对',
    pass: multi_keys === 'a=hello+world&b=foo+bar',
    expected: 'a=hello+world&b=foo+bar',
    actual: multi_keys
  });
  
  // 6.2 RFC1738 + 嵌套对象
  const nested = qs.stringify({ a: { b: 'hello world' } }, { format: 'RFC1738' });
  results.push({
    name: '6.2 RFC1738 + 嵌套对象',
    pass: nested === 'a%5Bb%5D=hello+world',
    expected: 'a%5Bb%5D=hello+world',
    actual: nested
  });
  
  // 6.3 RFC1738 + allowDots
  const allow_dots = qs.stringify({ a: { b: 'hello world' } }, { format: 'RFC1738', allowDots: true });
  results.push({
    name: '6.3 RFC1738 + allowDots',
    pass: allow_dots === 'a.b=hello+world',
    expected: 'a.b=hello+world',
    actual: allow_dots
  });
  
  // 6.4 RFC3986 + allowDots
  const allow_dots_3986 = qs.stringify({ a: { b: 'hello world' } }, { format: 'RFC3986', allowDots: true });
  results.push({
    name: '6.4 RFC3986 + allowDots',
    pass: allow_dots_3986 === 'a.b=hello%20world',
    expected: 'a.b=hello%20world',
    actual: allow_dots_3986
  });
  
  // 6.5 RFC1738 + 数组（默认 indices）
  const arr_indices = qs.stringify({ a: ['hello world', 'foo bar'] }, { format: 'RFC1738' });
  results.push({
    name: '6.5 RFC1738 + 数组（indices）',
    pass: arr_indices === 'a%5B0%5D=hello+world&a%5B1%5D=foo+bar',
    expected: 'a%5B0%5D=hello+world&a%5B1%5D=foo+bar',
    actual: arr_indices
  });
  
  // 6.6 RFC1738 + arrayFormat: brackets
  const arr_brackets = qs.stringify({ a: ['hello world'] }, { format: 'RFC1738', arrayFormat: 'brackets' });
  results.push({
    name: '6.6 RFC1738 + arrayFormat: brackets',
    pass: arr_brackets === 'a%5B%5D=hello+world',
    expected: 'a%5B%5D=hello+world',
    actual: arr_brackets
  });
  
  // 6.7 RFC1738 + arrayFormat: repeat
  const arr_repeat = qs.stringify({ a: ['hello world', 'foo bar'] }, { format: 'RFC1738', arrayFormat: 'repeat' });
  results.push({
    name: '6.7 RFC1738 + arrayFormat: repeat',
    pass: arr_repeat === 'a=hello+world&a=foo+bar',
    expected: 'a=hello+world&a=foo+bar',
    actual: arr_repeat
  });
  
  // 6.8 RFC1738 + arrayFormat: comma
  const arr_comma = qs.stringify({ a: ['hello world', 'foo bar'] }, { format: 'RFC1738', arrayFormat: 'comma' });
  results.push({
    name: '6.8 RFC1738 + arrayFormat: comma',
    pass: arr_comma === 'a=hello+world%2Cfoo+bar',
    expected: 'a=hello+world%2Cfoo+bar',
    actual: arr_comma
  });
  
  // 6.9 RFC1738 + encode: false
  const no_encode = qs.stringify({ a: 'hello world' }, { format: 'RFC1738', encode: false });
  results.push({
    name: '6.9 RFC1738 + encode: false',
    pass: no_encode === 'a=hello world',
    expected: 'a=hello world',
    actual: no_encode
  });
  
  // 6.10 RFC3986 + encode: false
  const no_encode_3986 = qs.stringify({ a: 'hello world' }, { format: 'RFC3986', encode: false });
  results.push({
    name: '6.10 RFC3986 + encode: false',
    pass: no_encode_3986 === 'a=hello world',
    expected: 'a=hello world',
    actual: no_encode_3986
  });
  
  // 6.11 RFC1738 + skipNulls
  const skip_nulls = qs.stringify({ a: 'hello world', b: null }, { format: 'RFC1738', skipNulls: true });
  results.push({
    name: '6.11 RFC1738 + skipNulls',
    pass: skip_nulls === 'a=hello+world',
    expected: 'a=hello+world',
    actual: skip_nulls
  });
  
  // 6.12 RFC1738 + strictNullHandling
  const strict_null = qs.stringify({ a: 'hello world', b: null }, { format: 'RFC1738', strictNullHandling: true });
  results.push({
    name: '6.12 RFC1738 + strictNullHandling',
    pass: strict_null === 'a=hello+world&b',
    expected: 'a=hello+world&b',
    actual: strict_null
  });
  
  // 6.13 RFC1738 + addQueryPrefix
  const add_prefix = qs.stringify({ a: 'hello world' }, { format: 'RFC1738', addQueryPrefix: true });
  results.push({
    name: '6.13 RFC1738 + addQueryPrefix',
    pass: add_prefix === '?a=hello+world',
    expected: '?a=hello+world',
    actual: add_prefix
  });
  
  // 6.14 RFC3986 + addQueryPrefix
  const add_prefix_3986 = qs.stringify({ a: 'hello world' }, { format: 'RFC3986', addQueryPrefix: true });
  results.push({
    name: '6.14 RFC3986 + addQueryPrefix',
    pass: add_prefix_3986 === '?a=hello%20world',
    expected: '?a=hello%20world',
    actual: add_prefix_3986
  });
  
  // 6.15 RFC1738 + charsetSentinel (UTF-8)
  const charset_utf8 = qs.stringify({ a: 'hello world' }, { format: 'RFC1738', charsetSentinel: true });
  results.push({
    name: '6.15 RFC1738 + charsetSentinel (UTF-8)',
    pass: charset_utf8 === 'utf8=%E2%9C%93&a=hello+world',
    expected: 'utf8=%E2%9C%93&a=hello+world',
    actual: charset_utf8
  });
  
  // 6.16 RFC3986 + charsetSentinel (UTF-8)
  const charset_utf8_3986 = qs.stringify({ a: 'hello world' }, { format: 'RFC3986', charsetSentinel: true });
  results.push({
    name: '6.16 RFC3986 + charsetSentinel (UTF-8)',
    pass: charset_utf8_3986 === 'utf8=%E2%9C%93&a=hello%20world',
    expected: 'utf8=%E2%9C%93&a=hello%20world',
    actual: charset_utf8_3986
  });
  
  // 6.17 RFC1738 + charsetSentinel (ISO-8859-1)
  const charset_iso = qs.stringify({ a: 'hello world' }, { format: 'RFC1738', charsetSentinel: true, charset: 'iso-8859-1' });
  results.push({
    name: '6.17 RFC1738 + charsetSentinel (ISO-8859-1)',
    pass: charset_iso === 'utf8=%26%2310003%3B&a=hello+world',
    expected: 'utf8=%26%2310003%3B&a=hello+world',
    actual: charset_iso
  });
  
  // 6.18 RFC1738 + sort
  const sorted = qs.stringify({ z: 'world', a: 'hello' }, { format: 'RFC1738', sort: (a, b) => a.localeCompare(b) });
  results.push({
    name: '6.18 RFC1738 + sort',
    pass: sorted === 'a=hello&z=world',
    expected: 'a=hello&z=world',
    actual: sorted
  });
  
  // 6.19 RFC1738 + filter (数组)
  const filter_arr = qs.stringify({ a: 'hello world', b: 'foo', c: 'bar' }, { format: 'RFC1738', filter: ['a', 'c'] });
  results.push({
    name: '6.19 RFC1738 + filter (数组)',
    pass: filter_arr === 'a=hello+world&c=bar',
    expected: 'a=hello+world&c=bar',
    actual: filter_arr
  });
  
  // 6.20 RFC1738 + filter (函数)
  const filter_func = qs.stringify({ a: 'hello world', b: 'foo' }, { 
    format: 'RFC1738',
    filter: function(prefix, value) {
      if (prefix === 'b') return undefined;
      return value;
    }
  });
  results.push({
    name: '6.20 RFC1738 + filter (函数)',
    pass: filter_func === 'a=hello+world',
    expected: 'a=hello+world',
    actual: filter_func
  });
  
  // 6.21 RFC1738 + 自定义 encoder
  const custom_encoder = qs.stringify({ a: 'hello world' }, { 
    format: 'RFC1738',
    encoder: function(str) {
      return str.toUpperCase();
    }
  });
  results.push({
    name: '6.21 RFC1738 + 自定义 encoder',
    pass: custom_encoder === 'A=HELLO WORLD',
    expected: 'A=HELLO WORLD',
    actual: custom_encoder
  });
  
  // ============================================================================
  // 第七部分：复杂数据结构与边界测试
  // ============================================================================
  
  // 7.1 空对象
  const empty_obj = qs.stringify({}, { format: 'RFC1738' });
  results.push({
    name: '7.1 空对象',
    pass: empty_obj === '',
    expected: '',
    actual: empty_obj
  });
  
  // 7.2 值为空字符串
  const empty_val = qs.stringify({ a: '' }, { format: 'RFC1738' });
  results.push({
    name: '7.2 值为空字符串',
    pass: empty_val === 'a=',
    expected: 'a=',
    actual: empty_val
  });
  
  // 7.3 键为空字符串
  const empty_key = qs.stringify({ '': 'value' }, { format: 'RFC1738' });
  results.push({
    name: '7.3 键为空字符串',
    pass: empty_key === '=value',
    expected: '=value',
    actual: empty_key
  });
  
  // 7.4 数字 0
  const zero_val = qs.stringify({ a: 0 }, { format: 'RFC1738' });
  results.push({
    name: '7.4 数字 0',
    pass: zero_val === 'a=0',
    expected: 'a=0',
    actual: zero_val
  });
  
  // 7.5 布尔值 false
  const false_val = qs.stringify({ a: false }, { format: 'RFC1738' });
  results.push({
    name: '7.5 布尔值 false',
    pass: false_val === 'a=false',
    expected: 'a=false',
    actual: false_val
  });
  
  // 7.6 空数组
  const empty_arr = qs.stringify({ a: [] }, { format: 'RFC1738' });
  results.push({
    name: '7.6 空数组',
    pass: empty_arr === '',
    expected: '',
    actual: empty_arr
  });
  
  // 7.7 特殊字符（非空格）
  const special_chars = qs.stringify({ a: 'a+b=c&d' }, { format: 'RFC1738' });
  results.push({
    name: '7.7 特殊字符编码',
    pass: special_chars === 'a=a%2Bb%3Dc%26d',
    expected: 'a=a%2Bb%3Dc%26d',
    actual: special_chars
  });
  
  // 7.8 Unicode 字符
  const unicode_chars = qs.stringify({ a: '你好 世界' }, { format: 'RFC1738' });
  results.push({
    name: '7.8 Unicode 字符',
    pass: unicode_chars === 'a=%E4%BD%A0%E5%A5%BD+%E4%B8%96%E7%95%8C',
    expected: 'a=%E4%BD%A0%E5%A5%BD+%E4%B8%96%E7%95%8C',
    actual: unicode_chars
  });
  
  // 7.9 Emoji
  const emoji = qs.stringify({ msg: 'Hello 😀 World' }, { format: 'RFC3986' });
  results.push({
    name: '7.9 Emoji 字符',
    pass: emoji === 'msg=Hello%20%F0%9F%98%80%20World',
    expected: 'msg=Hello%20%F0%9F%98%80%20World',
    actual: emoji
  });
  
  // 7.10 URL 字符串
  const url_chars = qs.stringify({ url: 'https://example.com/path?query=value' }, { format: 'RFC1738' });
  results.push({
    name: '7.10 URL 特殊字符',
    pass: url_chars === 'url=https%3A%2F%2Fexample.com%2Fpath%3Fquery%3Dvalue',
    expected: 'url=https%3A%2F%2Fexample.com%2Fpath%3Fquery%3Dvalue',
    actual: url_chars
  });
  
  // 7.11 深层嵌套对象
  const deep_nested = qs.stringify({
    a: { b: { c: 'hello world' } }
  }, { format: 'RFC1738' });
  results.push({
    name: '7.11 深层嵌套对象',
    pass: deep_nested === 'a%5Bb%5D%5Bc%5D=hello+world',
    expected: 'a%5Bb%5D%5Bc%5D=hello+world',
    actual: deep_nested
  });
  
  // 7.12 深层嵌套 + allowDots
  const deep_dots = qs.stringify({
    a: { b: { c: 'hello world' } }
  }, { format: 'RFC1738', allowDots: true });
  results.push({
    name: '7.12 深层嵌套 + allowDots',
    pass: deep_dots === 'a.b.c=hello+world',
    expected: 'a.b.c=hello+world',
    actual: deep_dots
  });
  
  // 7.13 数组嵌套对象
  const arr_nested_obj = qs.stringify({
    users: [
      { name: 'John Doe' },
      { name: 'Jane Smith' }
    ]
  }, { format: 'RFC1738' });
  results.push({
    name: '7.13 数组嵌套对象',
    pass: arr_nested_obj === 'users%5B0%5D%5Bname%5D=John+Doe&users%5B1%5D%5Bname%5D=Jane+Smith',
    expected: 'users%5B0%5D%5Bname%5D=John+Doe&users%5B1%5D%5Bname%5D=Jane+Smith',
    actual: arr_nested_obj
  });
  
  // 7.14 复杂综合场景
  const complex = qs.stringify({
    user: {
      name: 'John Doe',
      address: {
        city: 'New York',
        street: 'Main St'
      }
    }
  }, { format: 'RFC1738' });
  results.push({
    name: '7.14 复杂综合场景',
    pass: complex === 'user%5Bname%5D=John+Doe&user%5Baddress%5D%5Bcity%5D=New+York&user%5Baddress%5D%5Bstreet%5D=Main+St',
    expected: 'user%5Bname%5D=John+Doe&user%5Baddress%5D%5Bcity%5D=New+York&user%5Baddress%5D%5Bstreet%5D=Main+St',
    actual: complex
  });
  
  // 7.15 RFC3986 复杂场景
  const complex_3986 = qs.stringify({
    user: {
      name: 'John Doe',
      address: {
        city: 'New York'
      }
    }
  }, { format: 'RFC3986' });
  results.push({
    name: '7.15 RFC3986 复杂场景',
    pass: complex_3986 === 'user%5Bname%5D=John%20Doe&user%5Baddress%5D%5Bcity%5D=New%20York',
    expected: 'user%5Bname%5D=John%20Doe&user%5Baddress%5D%5Bcity%5D=New%20York',
    actual: complex_3986
  });
  
  // ============================================================================
  // 第八部分：多选项组合测试
  // ============================================================================
  
  // 8.1 RFC1738 + 多选项组合
  const multi_opts = qs.stringify({ 
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
    name: '8.1 RFC1738 + 多选项组合',
    pass: multi_opts === 'a=hello+world&a=foo+bar&b.c=test+value',
    expected: 'a=hello+world&a=foo+bar&b.c=test+value',
    actual: multi_opts
  });
  
  // 8.2 RFC3986 + charsetSentinel + addQueryPrefix
  const sentinel_prefix = qs.stringify({ a: 'hello world' }, { 
    format: 'RFC3986', 
    charsetSentinel: true, 
    addQueryPrefix: true 
  });
  results.push({
    name: '8.2 RFC3986 + charsetSentinel + addQueryPrefix',
    pass: sentinel_prefix === '?utf8=%E2%9C%93&a=hello%20world',
    expected: '?utf8=%E2%9C%93&a=hello%20world',
    actual: sentinel_prefix
  });
  
  // ============================================================================
  // 第九部分：formatter 实际应用场景测试
  // ============================================================================
  
  // 9.1 手动格式化预编码字符串
  const pre_encoded = 'name=John%20Doe&city=New%20York';
  const manual_fmt = pre_encoded.split('&').map(pair => {
    const [key, value] = pair.split('=');
    return key + '=' + qs.formats.formatters.RFC1738(value);
  }).join('&');
  results.push({
    name: '9.1 手动格式化预编码字符串',
    pass: manual_fmt === 'name=John+Doe&city=New+York',
    expected: 'name=John+Doe&city=New+York',
    actual: manual_fmt
  });
  
  // 9.2 动态选择 format
  const dynamic_select = (useRFC1738) => {
    return qs.stringify({ a: 'hello world' }, { 
      format: useRFC1738 ? qs.formats.RFC1738 : qs.formats.RFC3986 
    });
  };
  const dynamic_1738 = dynamic_select(true);
  const dynamic_3986 = dynamic_select(false);
  results.push({
    name: '9.2 动态选择 format (RFC1738)',
    pass: dynamic_1738 === 'a=hello+world',
    expected: 'a=hello+world',
    actual: dynamic_1738
  });
  results.push({
    name: '9.3 动态选择 format (RFC3986)',
    pass: dynamic_3986 === 'a=hello%20world',
    expected: 'a=hello%20world',
    actual: dynamic_3986
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

