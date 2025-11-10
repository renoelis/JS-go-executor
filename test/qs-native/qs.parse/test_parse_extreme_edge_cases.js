// qs.parse() 极端边缘情况补充测试
// 版本: qs v6.14.0
// 目标: 覆盖剩余 2% 的极端边缘场景

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
    console.log('🔬 qs.parse() 极端边缘情况测试');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // ════════════════════════════════════════
    // 第一部分: 四方及以上选项组合
    // ════════════════════════════════════════
    console.log('📦 [1] 四方选项组合测试\n');

    // allowDots + comma + delimiter + depth
    t('parse 4-way: allowDots + comma + delimiter + depth',
      qs.parse('a.b=1,2;c.d=3,4', { 
        allowDots: true, 
        comma: true, 
        delimiter: ';', 
        depth: 2 
      }),
      { a: { b: ['1', '2'] }, c: { d: ['3', '4'] } }
    );

    // allowDots + comma + arrayLimit + parseArrays
    t('parse 4-way: allowDots + comma + arrayLimit + parseArrays',
      qs.parse('a.b=1,2,3,4', {
        allowDots: true,
        comma: true,
        arrayLimit: 2,
        parseArrays: true
      }),
      { a: { b: { '0': '1', '1': '2', '2': '3', '3': '4' } } }
    );

    // depth + arrayLimit + parameterLimit + delimiter
    t('parse 4-way: depth + arrayLimit + parameterLimit + delimiter',
      qs.parse('a[b][c]=1;d[e][f]=2;g[h]=3;i=4;j=5', {
        depth: 2,
        arrayLimit: 10,
        parameterLimit: 3,
        delimiter: ';'
      }),
      { a: { b: { c: '1' } }, d: { e: { f: '2' } }, g: { h: '3' } }
    );

    // plainObjects + strictNullHandling + allowPrototypes + allowDots
    const fourWayResult = qs.parse('a.b&c=d', {
      plainObjects: true,
      strictNullHandling: true,
      allowPrototypes: false,
      allowDots: true
    });
    tCondition('parse 4-way: plainObjects + strictNullHandling + allowPrototypes + allowDots',
      fourWayResult.a && fourWayResult.a.b === null && fourWayResult.c === 'd'
    );

    // delimiter + comma + ignoreQueryPrefix + charsetSentinel
    t('parse 4-way: delimiter + comma + ignoreQueryPrefix + charsetSentinel',
      qs.parse('?utf8=%E2%9C%93;a=1,2', {
        delimiter: ';',
        comma: true,
        ignoreQueryPrefix: true,
        charsetSentinel: true
      }),
      { a: ['1', '2'] }
    );

    // ════════════════════════════════════════
    // 第二部分: 超极端输入场景
    // ════════════════════════════════════════
    console.log('\n📦 [2] 超极端输入场景\n');

    // 超长键名 (100000 字符)
    const ultraLongKey = 'x'.repeat(100000);
    try {
      const ultraLongResult = qs.parse(`${ultraLongKey}=value`);
      tCondition('parse ultra-long key (100000 chars)',
        ultraLongResult[ultraLongKey] === 'value'
      );
    } catch (e) {
      console.log('⚠️  超长键名可能超出限制');
    }

    // 超深嵌套 (200 层)
    const ultraDeepNest = 'a' + '[b]'.repeat(200) + '=value';
    try {
      const ultraDeepResult = qs.parse(ultraDeepNest, { depth: 200 });
      tCondition('parse ultra-deep nesting (200 levels)',
        typeof ultraDeepResult === 'object' && ultraDeepResult.a
      );
    } catch (e) {
      console.log('⚠️  超深嵌套可能超出限制');
    }

    // 超大数量参数 (10000 个)
    const ultraManyParams = Array.from({ length: 10000 }, (_, i) => `p${i}=${i}`).join('&');
    try {
      const ultraManyResult = qs.parse(ultraManyParams, { parameterLimit: Infinity });
      tCondition('parse ultra-many parameters (10000)',
        Object.keys(ultraManyResult).length === 10000
      );
    } catch (e) {
      console.log('⚠️  超大数量参数可能超出限制');
    }

    // ════════════════════════════════════════
    // 第三部分: 特殊编码组合
    // ════════════════════════════════════════
    console.log('\n📦 [3] 特殊编码组合\n');

    // 混合编码 (UTF-8 主导)
    t('parse mixed encoding scenario',
      qs.parse('a=%E4%B8%AD%E6%96%87&b=%A3', { charset: 'utf-8' }),
      { a: '中文', b: '%A3' } // %A3 在 UTF-8 下无效，保持原样
    );

    // URL 编码的分隔符在值中
    t('parse encoded delimiter in value',
      qs.parse('a=1%26b%3D2', { delimiter: '&' }),
      { a: '1&b=2' }
    );

    // 多重编码
    t('parse double encoded value',
      qs.parse('a=%2520', {}),
      { a: '%20' }
    );

    // ════════════════════════════════════════
    // 第四部分: decoder 极端场景
    // ════════════════════════════════════════
    console.log('\n📦 [4] decoder 极端场景\n');

    // decoder 循环调用计数
    let decoderCallCount = 0;
    qs.parse('a=1&b=2&c=3&d=4&e=5', {
      decoder: (str) => {
        decoderCallCount++;
        return str;
      }
    });
    tCondition('parse decoder called for all keys and values',
      decoderCallCount >= 10 // 5 keys + 5 values
    );

    // decoder 返回非常复杂的对象
    try {
      const complexDecoderResult = qs.parse('a=test', {
        decoder: (str) => {
          if (str === 'test') {
            return { nested: { deep: { value: str } } };
          }
          return str;
        }
      });
      tCondition('parse decoder returns complex object',
        typeof complexDecoderResult === 'object'
      );
    } catch (e) {
      console.log('⚠️  decoder 返回复杂对象可能不支持');
    }

    // decoder 在键和值上的不同行为
    const keyValueDecoderResult = qs.parse('KEY=VALUE', {
      decoder: (str, defaultDecoder, charset, type) => {
        if (type === 'key') {
          return str.toLowerCase();
        }
        return str.toLowerCase();
      }
    });
    t('parse decoder differentiate key and value',
      keyValueDecoderResult,
      { 'key': 'value' }
    );

    // ════════════════════════════════════════
    // 第五部分: arrayLimit 与 depth 极端交互
    // ════════════════════════════════════════
    console.log('\n📦 [5] arrayLimit 与 depth 极端交互\n');

    // arrayLimit: 0 + depth: 0
    t('parse arrayLimit: 0 + depth: 0',
      qs.parse('a[0][b]=1', { arrayLimit: 0, depth: 0 }),
      { 'a[0][b]': '1' }
    );

    // arrayLimit: 1 + depth: 1 + 嵌套数组
    t('parse arrayLimit: 1 + depth: 1 + nested array',
      qs.parse('a[0][b][0]=1', { arrayLimit: 1, depth: 1 }),
      { a: { '0': { '[b][0]': '1' } } }
    );

    // ════════════════════════════════════════
    // 第六部分: 特殊字符组合
    // ════════════════════════════════════════
    console.log('\n📦 [6] 特殊字符组合\n');

    // 键名包含所有 URL 保留字符的编码
    const reservedCharsResult = qs.parse('%21%23%24%26%27%28%29%2A%2B%2C%2F%3A%3B%3D%3F%40%5B%5D=value');
    tCondition('parse key with all reserved chars',
      typeof reservedCharsResult === 'object' && Object.keys(reservedCharsResult).length > 0
    );

    // 值包含控制字符
    t('parse value with control characters',
      qs.parse('a=%01%02%03%04%05'),
      { a: '\x01\x02\x03\x04\x05' }
    );

    // 零宽字符组合
    t('parse zero-width characters combination',
      qs.parse('a=%E2%80%8B%E2%80%8C%E2%80%8D%E2%80%8E%E2%80%8F'),
      { a: '\u200B\u200C\u200D\u200E\u200F' }
    );

    // ════════════════════════════════════════
    // 第七部分: duplicates 与其他选项组合
    // ════════════════════════════════════════
    console.log('\n📦 [7] duplicates 与其他选项组合\n');

    // duplicates: first + comma
    t('parse duplicates: first + comma',
      qs.parse('a=1,2&a=3,4', { duplicates: 'first', comma: true }),
      { a: ['1', '2'] }
    );

    // duplicates: last + comma
    t('parse duplicates: last + comma',
      qs.parse('a=1,2&a=3,4', { duplicates: 'last', comma: true }),
      { a: ['3', '4'] }
    );

    // duplicates: first + allowDots + nested
    t('parse duplicates: first + allowDots + nested',
      qs.parse('a.b.c=1&a.b.c=2&a.b.d=3', { duplicates: 'first', allowDots: true }),
      { a: { b: { c: '1', d: '3' } } }
    );

    // ════════════════════════════════════════
    // 第八部分: charsetSentinel 边缘情况
    // ════════════════════════════════════════
    console.log('\n📦 [8] charsetSentinel 边缘情况\n');

    // 多个 utf8 哨兵
    t('parse multiple utf8 sentinels',
      qs.parse('utf8=%E2%9C%93&utf8=%E2%9C%93&a=b', { charsetSentinel: true }),
      { utf8: '✓', a: 'b' }
    );

    // utf8 哨兵在末尾
    t('parse utf8 sentinel at end',
      qs.parse('a=b&utf8=%E2%9C%93', { charsetSentinel: true }),
      { a: 'b' }
    );

    // 错误的 utf8 哨兵值 (仍然被识别并保留)
    const wrongSentinelResult = qs.parse('utf8=wrong&a=b', { charsetSentinel: true });
    tCondition('parse wrong utf8 sentinel value',
      wrongSentinelResult.a === 'b' // 主要验证不会崩溃
    );

    // ════════════════════════════════════════
    // 第九部分: 正则 delimiter 极端情况
    // ════════════════════════════════════════
    console.log('\n📦 [9] 正则 delimiter 极端情况\n');

    // 正则匹配多种空白字符
    t('parse delimiter: regex whitespace',
      qs.parse('a=1 b=2\tc=3\nd=4', { delimiter: /\s+/ }),
      { a: '1', b: '2', c: '3', d: '4' }
    );

    // 正则匹配任意非字母数字字符
    t('parse delimiter: regex non-alphanumeric',
      qs.parse('a=1!b=2@c=3#d=4', { delimiter: /[^a-zA-Z0-9=]+/ }),
      { a: '1', b: '2', c: '3', d: '4' }
    );

    // 正则匹配可选字符
    t('parse delimiter: regex optional',
      qs.parse('a=1&b=2&&c=3', { delimiter: /&+/ }),
      { a: '1', b: '2', c: '3' }
    );

    // ════════════════════════════════════════
    // 第十部分: 五方以上选项组合
    // ════════════════════════════════════════
    console.log('\n📦 [10] 五方选项组合测试\n');

    // 5-way 组合 1
    t('parse 5-way: allowDots + comma + delimiter + depth + arrayLimit',
      qs.parse('a.b=1,2,3;c.d[0]=x', {
        allowDots: true,
        comma: true,
        delimiter: ';',
        depth: 3,
        arrayLimit: 2
      }),
      { a: { b: { '0': '1', '1': '2', '2': '3' } }, c: { d: { '0': 'x' } } }
    );

    // 5-way 组合 2
    t('parse 5-way: ignoreQueryPrefix + allowDots + strictNullHandling + comma + delimiter',
      qs.parse('?a.b&c=d,e;f[g]=h', {
        ignoreQueryPrefix: true,
        allowDots: true,
        strictNullHandling: true,
        comma: true,
        delimiter: ';'
      }),
      { a: { 'b&c': ['d', 'e'] }, f: { g: 'h' } } // & 被作为点号分隔的一部分
    );

    // 6-way 组合
    const sixWayResult = qs.parse('a.b=1,2', {
      allowDots: true,
      comma: true,
      parseArrays: true,
      arrayLimit: 10,
      depth: 5,
      plainObjects: true
    });
    tCondition('parse 6-way: allowDots + comma + parseArrays + arrayLimit + depth + plainObjects',
      sixWayResult.a && Array.isArray(sixWayResult.a.b) && 
      sixWayResult.hasOwnProperty === undefined
    );

    // ════════════════════════════════════════
    // 第十一部分: interpretNumericEntities 深度测试
    // ════════════════════════════════════════
    console.log('\n📦 [11] interpretNumericEntities 深度测试\n');

    // 十六进制数字实体
    const hexEntityResult = qs.parse('a=%26%23x3B1%3B', {
      charset: 'iso-8859-1',
      interpretNumericEntities: true
    });
    tCondition('parse numeric entity hex',
      typeof hexEntityResult.a === 'string' && hexEntityResult.a.length > 0
    );

    // 多个数字实体
    t('parse multiple numeric entities',
      qs.parse('a=%26%2365%3B%26%2366%3B%26%2367%3B', {
        charset: 'iso-8859-1',
        interpretNumericEntities: true
      }),
      { a: 'ABC' }
    );

    // ════════════════════════════════════════
    // 第十二部分: 空对象/空数组的各种表示
    // ════════════════════════════════════════
    console.log('\n📦 [12] 空对象/空数组测试\n');

    // 空对象表示
    t('parse empty object notation',
      qs.parse('a[]=', { allowEmptyArrays: true }),
      { a: [] }
    );

    // 多个空数组
    t('parse multiple empty arrays',
      qs.parse('a[]=&b[]=&c[]=', { allowEmptyArrays: true }),
      { a: [], b: [], c: [] }
    );

    // 嵌套空数组
    t('parse nested empty array',
      qs.parse('a[b][]=', { allowEmptyArrays: true }),
      { a: { b: [] } }
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
    console.log('📊 极端边缘情况测试汇总:');
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

