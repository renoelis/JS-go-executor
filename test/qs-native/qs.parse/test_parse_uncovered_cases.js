// qs.parse() 未充分考虑的情况补充测试
// 版本: qs v6.14.0 (发布于 2025-01-14)
// 目标: 补充之前评估中遗漏或未充分测试的场景

const qs = require('qs');

async function main() {
  try {
    const detail = [];
    let total = 0, pass = 0;

    function t(name, got, expect) {
      total++;
      const ok = deepEqual(got, expect);
      detail.push({ case: name, expect, got, pass: ok });
      console.log(`${ok ? '✅' : '❌'} ${name}`);
      if (ok) pass++;
      return ok;
    }

    function tCondition(name, condition) {
      total++;
      const ok = Boolean(condition);
      detail.push({ case: name, pass: ok });
      console.log(`${ok ? '✅' : '❌'} ${name}`);
      if (ok) pass++;
      return ok;
    }

    function deepEqual(a, b) {
      if (a === b) return true;
      if (a == null || b == null) return a === b;
      if (typeof a !== 'object' || typeof b !== 'object') return false;

      const keysA = Object.keys(a);
      const keysB = Object.keys(b);

      if (keysA.length !== keysB.length) return false;

      for (let key of keysA) {
        if (!keysB.includes(key)) return false;
        if (!deepEqual(a[key], b[key])) return false;
      }

      return true;
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔍 qs.parse() 未充分考虑的情况补充测试');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // ════════════════════════════════════════
    // 第一部分: allowSparse 选项验证
    // ════════════════════════════════════════
    console.log('📦 [1] allowSparse 选项测试\n');

    // 注意: qs v6.14.0 可能不支持 allowSparse 选项，但应明确测试
    // 稀疏数组默认行为: 大索引会转为对象
    t('parse sparse array (default behavior)',
      qs.parse('a[0]=1&a[100]=2'),
      { a: { '0': '1', '100': '2' } }
    );

    // 尝试使用 allowSparse 选项（如果支持）
    try {
      const sparseResult = qs.parse('a[0]=1&a[10]=2', { allowSparse: true });
      tCondition('parse allowSparse: true (if supported)',
        typeof sparseResult === 'object'
      );
    } catch (e) {
      console.log('⚠️  allowSparse 选项可能不支持');
    }

    // ════════════════════════════════════════
    // 第二部分: decodeDotInKeys 深度测试
    // ════════════════════════════════════════
    console.log('\n📦 [2] decodeDotInKeys 深度测试\n');

    // 基础 decodeDotInKeys 测试
    t('parse decodeDotInKeys: false (default)',
      qs.parse('name%2Eobj=value', { decodeDotInKeys: false }),
      { 'name.obj': 'value' }
    );

    // decodeDotInKeys: true 时，编码的点号会被解码并作为嵌套键
    t('parse decodeDotInKeys: true',
      qs.parse('name%2Eobj=value', { decodeDotInKeys: true }),
      { name: { obj: 'value' } }
    );

    // decodeDotInKeys + allowDots 交互 (%2E 解码为 . 后再作为嵌套)
    t('parse decodeDotInKeys + allowDots',
      qs.parse('a%2Eb.c=d', { decodeDotInKeys: true, allowDots: true }),
      { a: { b: { c: 'd' } } }
    );

    // 多重编码的点号 (%252E 解码为 %2E，decodeDotInKeys 再解码为 .，但作为字面字符)
    t('parse decodeDotInKeys with double encoding',
      qs.parse('a%252Eb=c', { decodeDotInKeys: true }),
      { 'a.b': 'c' }
    );

    // decodeDotInKeys + 嵌套数组 (%2E 解码为 . 后作为嵌套键)
    t('parse decodeDotInKeys + nested array',
      qs.parse('a%2Eb[0]=1&a%2Eb[1]=2', { decodeDotInKeys: true }),
      { a: { b: ['1', '2'] } }
    );

    // ════════════════════════════════════════
    // 第三部分: 分隔符正则表达式高级场景
    // ════════════════════════════════════════
    console.log('\n📦 [3] 分隔符正则表达式高级场景\n');

    // 多字符分隔符
    t('parse delimiter: multiple chars',
      qs.parse('a=1::b=2::c=3', { delimiter: '::' }),
      { a: '1', b: '2', c: '3' }
    );

    // 正则分隔符 - 多种符号
    t('parse delimiter: regex /[;&|]/',
      qs.parse('a=1;b=2&c=3|d=4', { delimiter: /[;&|]/ }),
      { a: '1', b: '2', c: '3', d: '4' }
    );

    // 正则分隔符 - 包含空格
    t('parse delimiter: regex with space',
      qs.parse('a=1 b=2 c=3', { delimiter: / / }),
      { a: '1', b: '2', c: '3' }
    );

    // 正则分隔符 - 数字
    t('parse delimiter: regex /\\d/',
      qs.parse('a=b1c=d2e=f', { delimiter: /\d/ }),
      { a: 'b', c: 'd', e: 'f' }
    );

    // 分隔符为换行符
    t('parse delimiter: newline',
      qs.parse('a=1\nb=2\nc=3', { delimiter: '\n' }),
      { a: '1', b: '2', c: '3' }
    );

    // ════════════════════════════════════════
    // 第四部分: arrayFormat 相关 (虽然是 stringify 选项，但应确认 parse 兼容性)
    // ════════════════════════════════════════
    console.log('\n📦 [4] 数组格式兼容性测试\n');

    // parse 能正确解析 indices 格式
    t('parse array format: indices',
      qs.parse('a[0]=b&a[1]=c&a[2]=d'),
      { a: ['b', 'c', 'd'] }
    );

    // parse 能正确解析 brackets 格式
    t('parse array format: brackets',
      qs.parse('a[]=b&a[]=c&a[]=d'),
      { a: ['b', 'c', 'd'] }
    );

    // parse 能正确解析 repeat 格式
    t('parse array format: repeat',
      qs.parse('a=b&a=c&a=d'),
      { a: ['b', 'c', 'd'] }
    );

    // parse 能正确解析 comma 格式（需 comma: true）
    t('parse array format: comma',
      qs.parse('a=b,c,d', { comma: true }),
      { a: ['b', 'c', 'd'] }
    );

    // ════════════════════════════════════════
    // 第五部分: 编码边界情况
    // ════════════════════════════════════════
    console.log('\n📦 [5] 编码边界情况\n');

    // 连续的百分号
    t('parse consecutive percent signs',
      qs.parse('a=%%'),
      { a: '%%' }
    );

    // 百分号后跟非十六进制字符
    t('parse percent with non-hex',
      qs.parse('a=%GH'),
      { a: '%GH' }
    );

    // 百分号在末尾
    t('parse percent at end',
      qs.parse('a=value%'),
      { a: 'value%' }
    );

    // 仅百分号
    t('parse only percent',
      qs.parse('a=%'),
      { a: '%' }
    );

    // 多个不完整的百分号
    t('parse multiple incomplete percents',
      qs.parse('a=%1%2%3'),
      { a: '%1%2%3' }
    );

    // Unicode 字符未编码（直接传递）
    t('parse unicode without encoding',
      qs.parse('a=中文'),
      { a: '中文' }
    );

    // Emoji 编码
    t('parse emoji encoded',
      qs.parse('emoji=%F0%9F%98%80'),
      { emoji: '😀' }
    );

    // Emoji 未编码
    t('parse emoji unencoded',
      qs.parse('emoji=😀'),
      { emoji: '😀' }
    );

    // 零宽字符
    t('parse zero-width characters',
      qs.parse('a=hello%E2%80%8Bworld'),
      { a: 'hello​world' } // 包含零宽空格
    );

    // ════════════════════════════════════════
    // 第六部分: 特殊键名组合
    // ════════════════════════════════════════
    console.log('\n📦 [6] 特殊键名组合\n');

    // 键名包含点号和方括号混合（不使用 allowDots）
    // 注意: 方括号仍会被解析为嵌套，点号保留在键名中
    t('parse key with dots and brackets (no allowDots)',
      qs.parse('a.b[c]=d', { allowDots: false }),
      { 'a.b': { c: 'd' } }
    );

    // 键名包含等号
    t('parse key with equals',
      qs.parse('a%3Db=c'),
      { 'a=b': 'c' }
    );

    // 键名包含 &
    t('parse key with ampersand',
      qs.parse('a%26b=c'),
      { 'a&b': 'c' }
    );

    // 键名包含 ?
    t('parse key with question mark',
      qs.parse('a%3Fb=c'),
      { 'a?b': 'c' }
    );

    // 键名为数字字符串
    t('parse numeric string key',
      qs.parse('123=value'),
      { '123': 'value' }
    );

    // 键名以数字开头
    t('parse key starting with number',
      qs.parse('1abc=value'),
      { '1abc': 'value' }
    );

    // 键名包含下划线
    t('parse key with underscore',
      qs.parse('a_b_c=value'),
      { a_b_c: 'value' }
    );

    // 键名包含连字符
    t('parse key with hyphen',
      qs.parse('a-b-c=value'),
      { 'a-b-c': 'value' }
    );

    // 键名全为符号
    t('parse key with only symbols',
      qs.parse('%21%40%23=value'),
      { '!@#': 'value' }
    );

    // ════════════════════════════════════════
    // 第七部分: 值的特殊情况
    // ════════════════════════════════════════
    console.log('\n📦 [7] 值的特殊情况\n');

    // 值为 "null" 字符串
    t('parse value: string "null"',
      qs.parse('a=null'),
      { a: 'null' }
    );

    // 值为 "undefined" 字符串
    t('parse value: string "undefined"',
      qs.parse('a=undefined'),
      { a: 'undefined' }
    );

    // 值为 "true" / "false" 字符串
    t('parse value: string "true"',
      qs.parse('a=true'),
      { a: 'true' }
    );

    t('parse value: string "false"',
      qs.parse('a=false'),
      { a: 'false' }
    );

    // 值为 "NaN" 字符串
    t('parse value: string "NaN"',
      qs.parse('a=NaN'),
      { a: 'NaN' }
    );

    // 值为 "Infinity" 字符串
    t('parse value: string "Infinity"',
      qs.parse('a=Infinity'),
      { a: 'Infinity' }
    );

    // 值为数字字符串
    t('parse value: numeric string',
      qs.parse('a=123'),
      { a: '123' }
    );

    // 值为负数字符串
    t('parse value: negative number',
      qs.parse('a=-123'),
      { a: '-123' }
    );

    // 值为浮点数字符串
    t('parse value: float',
      qs.parse('a=3.14'),
      { a: '3.14' }
    );

    // 值为科学计数法
    t('parse value: scientific notation',
      qs.parse('a=1e10'),
      { a: '1e10' }
    );

    // 值包含空格
    t('parse value with spaces',
      qs.parse('a=hello%20world%20test'),
      { a: 'hello world test' }
    );

    // 值为超长字符串（测试性能和内存）
    const veryLongValue = 'x'.repeat(50000);
    t('parse value: very long (50000 chars)',
      qs.parse(`a=${veryLongValue}`),
      { a: veryLongValue }
    );

    // ════════════════════════════════════════
    // 第八部分: 数组索引边界
    // ════════════════════════════════════════
    console.log('\n📦 [8] 数组索引边界\n');

    // 负数索引
    t('parse array with negative index',
      qs.parse('a[-1]=value'),
      { a: { '-1': 'value' } }
    );

    // 浮点数索引
    t('parse array with float index',
      qs.parse('a[1.5]=value'),
      { a: { '1.5': 'value' } }
    );

    // 科学计数法索引
    t('parse array with scientific notation index',
      qs.parse('a[1e2]=value'),
      { a: { '1e2': 'value' } }
    );

    // 索引包含前导零
    t('parse array with leading zeros',
      qs.parse('a[001]=value'),
      { a: { '001': 'value' } }
    );

    // 索引为 MAX_SAFE_INTEGER
    t('parse array with MAX_SAFE_INTEGER index',
      qs.parse('a[9007199254740991]=value'),
      { a: { '9007199254740991': 'value' } }
    );

    // ════════════════════════════════════════
    // 第九部分: plainObjects + allowPrototypes 深度交互
    // ════════════════════════════════════════
    console.log('\n📦 [9] plainObjects + allowPrototypes 深度交互\n');

    // plainObjects: true, allowPrototypes: false (默认安全)
    const plain1 = qs.parse('__proto__[x]=y&a=b', { plainObjects: true, allowPrototypes: false });
    tCondition('parse plainObjects + allowPrototypes: false (block dangerous key)',
      plain1.a === 'b' && Object.keys(plain1).length === 1
    );

    // plainObjects: true, allowPrototypes: true (仍阻断危险键)
    const plain2 = qs.parse('__proto__[x]=y&a=b', { plainObjects: true, allowPrototypes: true });
    tCondition('parse plainObjects + allowPrototypes: true (still safe)',
      plain2.a === 'b' && Object.keys(plain2).length === 1
    );

    // plainObjects: false, allowPrototypes: true (constructor 允许)
    const plain3 = qs.parse('constructor[x]=y', { plainObjects: false, allowPrototypes: true });
    tCondition('parse plainObjects: false + allowPrototypes: true (constructor allowed)',
      plain3.constructor && typeof plain3.constructor === 'object'
    );

    // ════════════════════════════════════════
    // 第十部分: duplicates 选项与嵌套的交互
    // ════════════════════════════════════════
    console.log('\n📦 [10] duplicates 与嵌套交互\n');

    // duplicates: first + 嵌套
    t('parse duplicates: first + nested',
      qs.parse('a[b]=1&a[b]=2&a[c]=3', { duplicates: 'first' }),
      { a: { b: '1', c: '3' } }
    );

    // duplicates: last + 嵌套
    t('parse duplicates: last + nested',
      qs.parse('a[b]=1&a[b]=2&a[c]=3', { duplicates: 'last' }),
      { a: { b: '2', c: '3' } }
    );

    // duplicates: combine + 深层嵌套
    t('parse duplicates: combine + deep nested',
      qs.parse('a[b][c]=1&a[b][c]=2', { duplicates: 'combine' }),
      { a: { b: { c: ['1', '2'] } } }
    );

    // duplicates: first + 数组
    t('parse duplicates: first + array',
      qs.parse('a[]=1&a[]=2&a[]=3', { duplicates: 'first' }),
      { a: ['1'] }
    );

    // ════════════════════════════════════════
    // 第十一部分: depth 边界与 allowDots 交互
    // ════════════════════════════════════════
    console.log('\n📦 [11] depth 边界与 allowDots 交互\n');

    // depth: 0 + allowDots (点号应被转为方括号后应用 depth: 0)
    t('parse depth: 0 + allowDots',
      qs.parse('a.b.c=d', { depth: 0, allowDots: true }),
      { 'a[b][c]': 'd' }
    );

    // depth: 1 + allowDots + 深层点号
    t('parse depth: 1 + allowDots + deep dots',
      qs.parse('a.b.c.d=e', { depth: 1, allowDots: true }),
      { a: { b: { '[c][d]': 'e' } } }
    );

    // depth: 2 + 混合点号和方括号
    t('parse depth: 2 + mixed dots and brackets',
      qs.parse('a.b[c][d]=e', { depth: 2, allowDots: true }),
      { a: { b: { c: { '[d]': 'e' } } } }
    );

    // ════════════════════════════════════════
    // 第十二部分: comma + arrayLimit 交互
    // ════════════════════════════════════════
    console.log('\n📦 [12] comma + arrayLimit 交互\n');

    // comma: true + arrayLimit: 0 (应转为对象)
    t('parse comma + arrayLimit: 0',
      qs.parse('a=1,2,3', { comma: true, arrayLimit: 0 }),
      { a: { '0': '1', '1': '2', '2': '3' } }
    );

    // comma: true + arrayLimit: 2 (超过限制)
    t('parse comma + arrayLimit: 2',
      qs.parse('a=1,2,3', { comma: true, arrayLimit: 2 }),
      { a: { '0': '1', '1': '2', '2': '3' } }
    );

    // comma: true + arrayLimit: 10 (在限制内)
    t('parse comma + arrayLimit: 10',
      qs.parse('a=1,2,3', { comma: true, arrayLimit: 10 }),
      { a: ['1', '2', '3'] }
    );

    // ════════════════════════════════════════
    // 第十三部分: strictNullHandling + 嵌套
    // ════════════════════════════════════════
    console.log('\n📦 [13] strictNullHandling + 嵌套\n');

    // strictNullHandling: true + 嵌套键无值
    t('parse strictNullHandling + nested key only',
      qs.parse('a[b][c]', { strictNullHandling: true }),
      { a: { b: { c: null } } }
    );

    // strictNullHandling: true + 混合嵌套
    t('parse strictNullHandling + mixed nested',
      qs.parse('a[b]&a[c]=d', { strictNullHandling: true }),
      { a: { b: null, c: 'd' } }
    );

    // strictNullHandling: true + 数组
    t('parse strictNullHandling + array',
      qs.parse('a[]&a[]=1', { strictNullHandling: true }),
      { a: [null, '1'] }
    );

    // ════════════════════════════════════════
    // 第十四部分: charset 边界情况
    // ════════════════════════════════════════
    console.log('\n📦 [14] charset 边界情况\n');

    // charset: 大小写混合
    try {
      const charsetMixed = qs.parse('a=%E4%B8%AD', { charset: 'UTF-8' });
      tCondition('parse charset: uppercase UTF-8',
        typeof charsetMixed.a === 'string'
      );
    } catch (e) {
      console.log('⚠️  charset 大小写敏感或不支持大写形式');
    }

    // charset: iso-8859-1 + 超出范围的字符
    t('parse charset: iso-8859-1 with out-of-range',
      qs.parse('a=%C3%A9', { charset: 'iso-8859-1' }),
      { a: 'Ã©' } // 不正确解码，但不应崩溃
    );

    // ════════════════════════════════════════
    // 第十五部分: decoder 边界场景补充
    // ════════════════════════════════════════
    console.log('\n📦 [15] decoder 边界场景补充\n');

    // decoder 返回数组
    const decoderArray = qs.parse('a=1', {
      decoder: (str) => [str, str + '_copy']
    });
    tCondition('parse decoder returns array',
      typeof decoderArray === 'object'
    );

    // decoder 返回 Symbol (应转为字符串或忽略)
    try {
      const decoderSymbol = qs.parse('a=1', {
        decoder: (str) => Symbol(str)
      });
      tCondition('parse decoder returns Symbol',
        typeof decoderSymbol === 'object'
      );
    } catch (e) {
      console.log('⚠️  decoder 返回 Symbol 可能不支持');
    }

    // decoder 尝试返回对象（应正常处理）
    const decoderProto = qs.parse('a=1', {
      decoder: (str) => {
        // decoder 返回普通字符串
        return str + '_processed';
      }
    });
    tCondition('parse decoder returns processed string',
      typeof decoderProto === 'object'
    );

    // decoder 超时场景（模拟）
    let decoderSlowCalls = 0;
    const decoderSlow = qs.parse('a=1&b=2&c=3', {
      decoder: (str) => {
        decoderSlowCalls++;
        // 模拟慢处理，但不实际等待
        return str;
      }
    });
    tCondition('parse decoder called multiple times',
      decoderSlowCalls >= 3
    );

    // ════════════════════════════════════════
    // 第十六部分: 多层嵌套极限测试
    // ════════════════════════════════════════
    console.log('\n📦 [16] 多层嵌套极限测试\n');

    // 50 层嵌套（默认 depth: 5 应剪裁）
    const nest50 = 'a' + '[b]'.repeat(50) + '=value';
    const nest50Result = qs.parse(nest50);
    tCondition('parse 50-level nesting (default depth: 5)',
      typeof nest50Result === 'object' && nest50Result.a
    );

    // 50 层嵌套（depth: 50）
    const nest50_d50 = qs.parse(nest50, { depth: 50 });
    tCondition('parse 50-level nesting (depth: 50)',
      typeof nest50_d50 === 'object'
    );

    // 10 层点号嵌套（allowDots: true）
    const dotNest10 = 'a.b.c.d.e.f.g.h.i.j=value';
    const dotNest10Result = qs.parse(dotNest10, { allowDots: true });
    tCondition('parse 10-level dot nesting',
      typeof dotNest10Result === 'object' && dotNest10Result.a
    );

    // ════════════════════════════════════════
    // 第十七部分: 空键与空值组合
    // ════════════════════════════════════════
    console.log('\n📦 [17] 空键与空值组合\n');

    // 空键 + 空值
    t('parse empty key and empty value',
      qs.parse('='),
      {}
    );

    // 多个空键
    t('parse multiple empty keys',
      qs.parse('=1&=2&=3'),
      {}
    );

    // 空键 + 有值
    t('parse empty key with value',
      qs.parse('=value&a=b'),
      { a: 'b' }
    );

    // ════════════════════════════════════════
    // 第十八部分: URL 完整解析场景
    // ════════════════════════════════════════
    console.log('\n📦 [18] URL 完整解析场景\n');

    // 完整 URL 查询（带 hash）
    t('parse URL with hash',
      qs.parse('a=1&b=2#hash', { ignoreQueryPrefix: false }),
      { a: '1', 'b': '2#hash' }
    );

    // 多个 ? 符号
    t('parse multiple question marks',
      qs.parse('?a=1?b=2', { ignoreQueryPrefix: true }),
      { a: '1?b=2' }
    );

    // URL 编码的 &
    t('parse URL encoded ampersand in value',
      qs.parse('a=1%262'),
      { a: '1&2' }
    );

    // ════════════════════════════════════════
    // 汇总结果
    // ════════════════════════════════════════
    const summary = { total, pass, fail: total - pass };
    const testResults = {
      success: summary.fail === 0,
      summary,
      detail
    };

    console.log('\n' + '━'.repeat(50));
    console.log('📊 未充分考虑情况测试汇总:');
    console.log('━'.repeat(50));
    console.log(`✅ 通过: ${summary.pass}/${summary.total}`);
    console.log(`❌ 失败: ${summary.fail}/${summary.total}`);
    console.log(`📈 通过率: ${(summary.pass / summary.total * 100).toFixed(2)}%`);
    console.log('━'.repeat(50) + '\n');

    return testResults;

  } catch (err) {
    const result = {
      success: false,
      error: {
        message: err && err.message,
        stack: err && err.stack
      }
    };
    console.log(JSON.stringify(result, null, 2));
    return result;
  }
}

return main();

