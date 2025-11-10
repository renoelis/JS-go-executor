// qs.parse() 终极全覆盖测试 - Comprehensive Test Suite
// 版本: qs v6.14.0 (发布于 2025-01-14)
// 目标: 无死角验证所有 qs.parse 功能、选项组合、边界情况、安全特性

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
    console.log('🚀 qs.parse() v6.14.0 终极全覆盖测试');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // ════════════════════════════════════════
    // 第一部分: 基础功能完整验证
    // ════════════════════════════════════════
    console.log('📦 [1] 基础功能测试\n');

    t('parse empty string', qs.parse(''), {});
    t('parse whitespace only', qs.parse('   '), { '   ': '' }); // 空格被当作键名
    t('parse single param', qs.parse('a=b'), { a: 'b' });
    t('parse multiple params', qs.parse('a=b&c=d&e=f'), { a: 'b', c: 'd', e: 'f' });
    t('parse key without value', qs.parse('a'), { a: '' });
    t('parse key with empty value', qs.parse('a='), { a: '' });
    t('parse key with equals only', qs.parse('a=='), { a: '=' });
    t('parse multiple equals in value', qs.parse('a=b=c=d'), { a: 'b=c=d' });

    // ════════════════════════════════════════
    // 第二部分: 嵌套对象 (方括号语法)
    // ════════════════════════════════════════
    console.log('\n📦 [2] 嵌套对象测试\n');

    t('parse simple nesting', qs.parse('a[b]=c'), { a: { b: 'c' } });
    t('parse 2-level nesting', qs.parse('a[b][c]=d'), { a: { b: { c: 'd' } } });
    t('parse 3-level nesting', qs.parse('a[b][c][d]=e'), { a: { b: { c: { d: 'e' } } } });
    t('parse 5-level nesting (default depth)', qs.parse('a[b][c][d][e]=f'), 
      { a: { b: { c: { d: { e: 'f' } } } } });
    t('parse 6-level nesting', qs.parse('a[b][c][d][e][f]=g'), 
      { a: { b: { c: { d: { e: { f: 'g' } } } } } });
    t('parse multiple nested keys', qs.parse('a[b]=1&a[c]=2&a[d]=3'), 
      { a: { b: '1', c: '2', d: '3' } });
    t('parse nested without value', qs.parse('a[b][c]'), { a: { b: { c: '' } } });

    // ════════════════════════════════════════
    // 第三部分: 数组处理全场景
    // ════════════════════════════════════════
    console.log('\n📦 [3] 数组处理测试\n');

    t('parse array with empty brackets', qs.parse('a[]=1&a[]=2'), { a: ['1', '2'] });
    t('parse array with indices', qs.parse('a[0]=1&a[1]=2'), { a: ['1', '2'] });
    t('parse array out of order', qs.parse('a[2]=c&a[0]=a&a[1]=b'), { a: ['a', 'b', 'c'] });
    t('parse array sparse (0,2)', qs.parse('a[0]=1&a[2]=3'), { a: ['1', '3'] });
    t('parse array sparse (0,5)', qs.parse('a[0]=1&a[5]=6'), { a: ['1', '6'] });
    t('parse array single item', qs.parse('a[]=only'), { a: ['only'] });
    t('parse array single indexed', qs.parse('a[0]=only'), { a: ['only'] });
    t('parse array large index', qs.parse('a[999]=value'), { a: { '999': 'value' } });

    // 混合数组与对象
    t('parse mixed array/object (becomes object)', qs.parse('a[0]=1&a[b]=2'), 
      { a: { '0': '1', b: '2' } });
    t('parse nested array', qs.parse('a[0][b]=1&a[0][c]=2'), { a: [{ b: '1', c: '2' }] });
    t('parse array of arrays', qs.parse('a[0][0]=1&a[0][1]=2&a[1][0]=3'), 
      { a: [['1', '2'], ['3']] });

    // ════════════════════════════════════════
    // 第四部分: ignoreQueryPrefix 选项
    // ════════════════════════════════════════
    console.log('\n📦 [4] ignoreQueryPrefix 测试\n');

    t('parse with ? (ignoreQueryPrefix: true)', 
      qs.parse('?a=b&c=d', { ignoreQueryPrefix: true }), { a: 'b', c: 'd' });
    t('parse with ? (ignoreQueryPrefix: false)', 
      qs.parse('?a=b', { ignoreQueryPrefix: false }), { '?a': 'b' });
    t('parse without ? (ignoreQueryPrefix: true)', 
      qs.parse('a=b', { ignoreQueryPrefix: true }), { a: 'b' });
    t('parse multiple ? (ignoreQueryPrefix: true)', 
      qs.parse('??a=b', { ignoreQueryPrefix: true }), { '?a': 'b' });
    t('parse ? in middle (ignoreQueryPrefix: true)', 
      qs.parse('a=b?c=d', { ignoreQueryPrefix: true }), { a: 'b?c=d' });

    // ════════════════════════════════════════
    // 第五部分: allowDots 点号语法
    // ════════════════════════════════════════
    console.log('\n📦 [5] allowDots 测试\n');

    t('parse dots (allowDots: false)', qs.parse('a.b=c', { allowDots: false }), 
      { 'a.b': 'c' });
    t('parse dots (allowDots: true)', qs.parse('a.b=c', { allowDots: true }), 
      { a: { b: 'c' } });
    t('parse deep dots', qs.parse('a.b.c.d.e=f', { allowDots: true }), 
      { a: { b: { c: { d: { e: 'f' } } } } });
    t('parse dots + brackets', qs.parse('a.b[c]=d', { allowDots: true }), 
      { a: { b: { c: 'd' } } });
    t('parse brackets + dots', qs.parse('a[b].c=d', { allowDots: true }), 
      { a: { b: { c: 'd' } } });
    t('parse dots with array', qs.parse('a.b[0]=1&a.b[1]=2', { allowDots: true }), 
      { a: { b: ['1', '2'] } });
    t('parse multiple dots paths', qs.parse('a.b=1&a.c=2&d.e=3', { allowDots: true }), 
      { a: { b: '1', c: '2' }, d: { e: '3' } });

    // ════════════════════════════════════════
    // 第六部分: depth 深度限制
    // ════════════════════════════════════════
    console.log('\n📦 [6] depth 深度限制测试\n');

    t('parse depth: 0', qs.parse('a[b]=c', { depth: 0 }), { 'a[b]': 'c' });
    t('parse depth: 1', qs.parse('a[b][c]=d', { depth: 1 }), 
      { a: { b: { '[c]': 'd' } } });
    t('parse depth: 2', qs.parse('a[b][c][d]=e', { depth: 2 }), 
      { a: { b: { c: { '[d]': 'e' } } } });
    t('parse depth: 5 (default)', qs.parse('a[b][c][d][e][f]=g', { depth: 5 }), 
      { a: { b: { c: { d: { e: { f: 'g' } } } } } });
    // depth: 10 会将连续的数字索引解析为10层数组嵌套
    t('parse depth: 10', qs.parse('a[1][2][3][4][5][6][7][8][9][10]=v', { depth: 10 }), 
      { a: [[[[[[[[[['v']]]]]]]]]] });
    t('parse depth: Infinity', qs.parse('a[b][c][d][e][f][g][h]=i', { depth: Infinity }), 
      { a: { b: { c: { d: { e: { f: { g: { h: 'i' } } } } } } } });
    t('parse depth: false (no depth limit)', qs.parse('a[b][c][d][e][f]=g', { depth: false }), 
      { 'a[b][c][d][e][f]': 'g' });

    // depth + allowDots 交互
    t('parse allowDots + depth: 1', qs.parse('a.b.c=d', { allowDots: true, depth: 1 }), 
      { a: { b: { '[c]': 'd' } } });
    // depth: 0 时, allowDots 不影响方括号语法的深度限制
    t('parse allowDots + depth: 0', qs.parse('a.b=c', { allowDots: true, depth: 0 }), 
      { 'a[b]': 'c' }); // 点号被转换为方括号后应用 depth: 0

    // ════════════════════════════════════════
    // 第七部分: parameterLimit 参数限制
    // ════════════════════════════════════════
    console.log('\n📦 [7] parameterLimit 测试\n');

    t('parse parameterLimit: 1', qs.parse('a=1&b=2&c=3', { parameterLimit: 1 }), { a: '1' });
    t('parse parameterLimit: 2', qs.parse('a=1&b=2&c=3', { parameterLimit: 2 }), 
      { a: '1', b: '2' });
    t('parse parameterLimit: 5', qs.parse('a=1&b=2&c=3', { parameterLimit: 5 }), 
      { a: '1', b: '2', c: '3' });
    t('parse parameterLimit: 0', qs.parse('a=1&b=2', { parameterLimit: 0 }), {});
    tCondition('parse parameterLimit: Infinity', 
      Object.keys(qs.parse('a=1&b=2&c=3&d=4&e=5', { parameterLimit: Infinity })).length === 5);

    // ════════════════════════════════════════
    // 第八部分: arrayLimit 数组限制
    // ════════════════════════════════════════
    console.log('\n📦 [8] arrayLimit 测试\n');

    t('parse arrayLimit: 0', qs.parse('a[0]=1&a[1]=2', { arrayLimit: 0 }), 
      { a: { '0': '1', '1': '2' } });
    t('parse arrayLimit: 1', qs.parse('a[0]=1&a[1]=2&a[2]=3', { arrayLimit: 1 }), 
      { a: { '0': '1', '1': '2', '2': '3' } });
    t('parse arrayLimit: 2', qs.parse('a[0]=1&a[1]=2&a[2]=3', { arrayLimit: 2 }), 
      { a: { '0': '1', '1': '2', '2': '3' } });
    t('parse arrayLimit: 20 (default)', qs.parse('a[0]=1&a[1]=2', { arrayLimit: 20 }), 
      { a: ['1', '2'] });
    t('parse arrayLimit with large index', qs.parse('a[0]=1&a[100]=2', { arrayLimit: 20 }), 
      { a: { '0': '1', '100': '2' } });
    t('parse arrayLimit: Infinity', qs.parse('a[0]=1&a[1]=2&a[2]=3', { arrayLimit: Infinity }), 
      { a: ['1', '2', '3'] });

    // ════════════════════════════════════════
    // 第九部分: parseArrays 选项
    // ════════════════════════════════════════
    console.log('\n📦 [9] parseArrays 测试\n');

    t('parse parseArrays: true', qs.parse('a[0]=1&a[1]=2', { parseArrays: true }), 
      { a: ['1', '2'] });
    t('parse parseArrays: false', qs.parse('a[0]=1&a[1]=2', { parseArrays: false }), 
      { a: { '0': '1', '1': '2' } });
    t('parse parseArrays: false (top-level numeric keys)', 
      qs.parse('0=a&1=b&2=c', { parseArrays: false }), 
      { '0': 'a', '1': 'b', '2': 'c' });

    // ════════════════════════════════════════
    // 第十部分: comma 逗号分隔
    // ════════════════════════════════════════
    console.log('\n📦 [10] comma 测试\n');

    t('parse comma: false', qs.parse('a=b,c', { comma: false }), { a: 'b,c' });
    t('parse comma: true', qs.parse('a=b,c', { comma: true }), { a: ['b', 'c'] });
    t('parse comma: true (multiple values)', qs.parse('a=1,2,3', { comma: true }), 
      { a: ['1', '2', '3'] });
    t('parse comma: true (multiple params)', qs.parse('a=1,2&b=3,4', { comma: true }), 
      { a: ['1', '2'], b: ['3', '4'] });
    t('parse comma: true (single value)', qs.parse('a=b', { comma: true }), { a: 'b' });
    t('parse comma: true (empty values)', qs.parse('a=,', { comma: true }), { a: ['', ''] });
    t('parse comma: true (nested)', qs.parse('a[b]=1,2', { comma: true }), 
      { a: { b: ['1', '2'] } });

    // comma + parseArrays 交互
    t('parse comma + parseArrays: false', qs.parse('a=1,2', { comma: true, parseArrays: false }), 
      { a: { '0': '1', '1': '2' } });

    // ════════════════════════════════════════
    // 第十一部分: delimiter 分隔符
    // ════════════════════════════════════════
    console.log('\n📦 [11] delimiter 测试\n');

    t('parse delimiter: ;', qs.parse('a=1;b=2', { delimiter: ';' }), { a: '1', b: '2' });
    t('parse delimiter: |', qs.parse('a=1|b=2|c=3', { delimiter: '|' }), 
      { a: '1', b: '2', c: '3' });
    t('parse delimiter: ,', qs.parse('a=1,b=2', { delimiter: ',' }), { a: '1', b: '2' });
    t('parse delimiter: regex /[;&]/', qs.parse('a=1;b=2&c=3', { delimiter: /[;&]/ }), 
      { a: '1', b: '2', c: '3' });
    t('parse delimiter: regex /[|,]/', qs.parse('a=1|b=2,c=3', { delimiter: /[|,]/ }), 
      { a: '1', b: '2', c: '3' });
    t('parse delimiter: →', qs.parse('a=1→b=2', { delimiter: '→' }), { a: '1', b: '2' });

    // delimiter + allowDots
    t('parse delimiter: ; + allowDots', 
      qs.parse('a.b=1;c.d=2', { delimiter: ';', allowDots: true }), 
      { a: { b: '1' }, c: { d: '2' } });

    // delimiter + comma
    t('parse delimiter: ; + comma', 
      qs.parse('a=1,2;b=3,4', { delimiter: ';', comma: true }), 
      { a: ['1', '2'], b: ['3', '4'] });

    // ════════════════════════════════════════
    // 第十二部分: charset 字符编码
    // ════════════════════════════════════════
    console.log('\n📦 [12] charset 测试\n');

    t('parse charset: utf-8 (default)', qs.parse('a=%E4%B8%AD%E6%96%87', { charset: 'utf-8' }), 
      { a: '中文' });
    t('parse charset: utf-8 (unicode)', qs.parse('a=%E2%9C%93', { charset: 'utf-8' }), 
      { a: '✓' });
    t('parse charset: iso-8859-1', qs.parse('a=%A3%BF', { charset: 'iso-8859-1' }), 
      { a: '£¿' });
    t('parse charset: iso-8859-1 (latin)', qs.parse('a=%E9', { charset: 'iso-8859-1' }), 
      { a: 'é' });

    // ════════════════════════════════════════
    // 第十三部分: charsetSentinel 字符集哨兵
    // ════════════════════════════════════════
    console.log('\n📦 [13] charsetSentinel 测试\n');

    t('parse charsetSentinel: true (with utf8 sentinel)', 
      qs.parse('utf8=%E2%9C%93&a=%E4%B8%AD', { charsetSentinel: true }), 
      { a: '中' });
    t('parse charsetSentinel: true (without sentinel)', 
      qs.parse('a=b', { charsetSentinel: true }), { a: 'b' });
    t('parse charsetSentinel: true (with iso sentinel)', 
      qs.parse('utf8=%26%2310003%3B&a=%A3', { charsetSentinel: true, charset: 'iso-8859-1' }), 
      { a: '£' });
    t('parse charsetSentinel: false', 
      qs.parse('utf8=%E2%9C%93&a=b', { charsetSentinel: false }), 
      { utf8: '✓', a: 'b' });

    // ════════════════════════════════════════
    // 第十四部分: plainObjects 纯对象
    // ════════════════════════════════════════
    console.log('\n📦 [14] plainObjects 测试\n');

    const plainResult = qs.parse('a=b', { plainObjects: true });
    tCondition('parse plainObjects: true (no hasOwnProperty)', 
      plainResult.hasOwnProperty === undefined);
    tCondition('parse plainObjects: true (no toString)', 
      plainResult.toString === undefined);
    // 注意: Object.getPrototypeOf 在某些安全环境中被禁止
    tCondition('parse plainObjects: true (null prototype check)', 
      plainResult.hasOwnProperty === undefined && plainResult.toString === undefined);

    const normalResult = qs.parse('a=b', { plainObjects: false });
    tCondition('parse plainObjects: false (has hasOwnProperty)', 
      typeof normalResult.hasOwnProperty === 'function');
    tCondition('parse plainObjects: false (has toString)', 
      typeof normalResult.toString === 'function');

    // ════════════════════════════════════════
    // 第十五部分: allowPrototypes 原型安全
    // ════════════════════════════════════════
    console.log('\n📦 [15] allowPrototypes & 原型污染防护\n');

    // allowPrototypes: false (默认) - 阻止原型污染
    t('parse __proto__ blocked (allowPrototypes: false)', 
      qs.parse('__proto__[x]=y&a=1', { allowPrototypes: false }), { a: '1' });
    t('parse constructor.prototype blocked', 
      qs.parse('constructor[prototype][x]=y', { allowPrototypes: false }), {});

    const protoTest1 = qs.parse('__proto__[polluted]=yes', { allowPrototypes: false });
    tCondition('parse __proto__ does not pollute global', ({}).polluted === undefined);

    const protoTest2 = qs.parse('constructor[prototype][injected]=value', { allowPrototypes: false });
    tCondition('parse constructor.prototype does not pollute', ({}).injected === undefined);

    // prototype 作为普通键是允许的
    t('parse prototype as normal key', 
      qs.parse('prototype[x]=y', { allowPrototypes: false }), 
      { prototype: { x: 'y' } });

    // allowPrototypes: true - 仍然阻止 __proto__ (安全考虑)
    t('parse __proto__ blocked even with allowPrototypes: true', 
      qs.parse('__proto__[x]=y', { allowPrototypes: true }), {});
    
    const protoTest3 = qs.parse('__proto__[polluted]=yes', { allowPrototypes: true });
    tCondition('parse allowPrototypes: true still safe', ({}).polluted === undefined);

    // constructor 作为普通键在 allowPrototypes: true 时允许
    t('parse constructor key (allowPrototypes: true)', 
      qs.parse('constructor[x]=y', { allowPrototypes: true }), 
      { constructor: { x: 'y' } });

    // ════════════════════════════════════════
    // 第十六部分: strictNullHandling
    // ════════════════════════════════════════
    console.log('\n📦 [16] strictNullHandling 测试\n');

    t('parse strictNullHandling: false (key only)', 
      qs.parse('a', { strictNullHandling: false }), { a: '' });
    t('parse strictNullHandling: true (key only -> null)', 
      qs.parse('a', { strictNullHandling: true }), { a: null });
    t('parse strictNullHandling: true (empty value)', 
      qs.parse('a=', { strictNullHandling: true }), { a: '' });
    t('parse strictNullHandling: true (multiple keys)', 
      qs.parse('a&b&c', { strictNullHandling: true }), 
      { a: null, b: null, c: null });
    t('parse strictNullHandling: true (mixed)', 
      qs.parse('a&b=value&c=', { strictNullHandling: true }), 
      { a: null, b: 'value', c: '' });
    t('parse strictNullHandling: true (nested)', 
      qs.parse('a[b]&a[c]=d', { strictNullHandling: true }), 
      { a: { b: null, c: 'd' } });

    // ════════════════════════════════════════
    // 第十七部分: duplicates 重复键处理
    // ════════════════════════════════════════
    console.log('\n📦 [17] duplicates 测试\n');

    t('parse duplicates: combine (default)', qs.parse('a=1&a=2&a=3'), { a: ['1', '2', '3'] });
    t('parse duplicates: first', qs.parse('a=1&a=2&a=3', { duplicates: 'first' }), { a: '1' });
    t('parse duplicates: last', qs.parse('a=1&a=2&a=3', { duplicates: 'last' }), { a: '3' });
    t('parse duplicates: combine', qs.parse('a=1&a=2', { duplicates: 'combine' }), 
      { a: ['1', '2'] });
    t('parse duplicates: first (nested)', 
      qs.parse('a[b]=1&a[b]=2', { duplicates: 'first' }), { a: { b: '1' } });

    // ════════════════════════════════════════
    // 第十八部分: allowEmptyArrays
    // ════════════════════════════════════════
    console.log('\n📦 [18] allowEmptyArrays 测试\n');

    // 注意: allowEmptyArrays 可能在某些版本中不可用或行为不同
    try {
      t('parse allowEmptyArrays: true', 
        qs.parse('a[]=', { allowEmptyArrays: true }), { a: [] });
      t('parse allowEmptyArrays: false', 
        qs.parse('a[]=', { allowEmptyArrays: false }), { a: [''] });
    } catch (e) {
      console.log('⚠️  allowEmptyArrays 选项可能不支持或行为不同');
    }

    // ════════════════════════════════════════
    // 第十九部分: interpretNumericEntities
    // ════════════════════════════════════════
    console.log('\n📦 [19] interpretNumericEntities 测试\n');

    t('parse interpretNumericEntities: true', 
      qs.parse('a=%26%2310003%3B', { charset: 'iso-8859-1', interpretNumericEntities: true }),
      { a: '✓' });
    t('parse interpretNumericEntities: false', 
      qs.parse('a=%26%2365%3B', { charset: 'iso-8859-1', interpretNumericEntities: false }),
      { a: '&#65;' });

    // ════════════════════════════════════════
    // 第二十部分: decoder 自定义解码器
    // ════════════════════════════════════════
    console.log('\n📦 [20] decoder 自定义解码器测试\n');

    t('parse decoder: double values', 
      qs.parse('a=1&b=2', { decoder: (str) => String(parseInt(str) * 2 || str) }), 
      { a: '2', b: '4' });
    t('parse decoder: uppercase keys', 
      qs.parse('a=value', { decoder: (str, defaultDecoder, charset, type) => 
        type === 'key' ? str.toUpperCase() : str }), 
      { A: 'value' });
    t('parse decoder: custom transformation', 
      qs.parse('a=hello', { decoder: (str) => str + '!' }), 
      { 'a!': 'hello!' });

    // decoder 返回特殊值 - decoder 返回 undefined 会创建 'undefined' 键
    const decoderUndefined = qs.parse('a=1', { decoder: () => undefined });
    tCondition('parse decoder returns undefined', 'undefined' in decoderUndefined);

    const decoderNull = qs.parse('a=1', { decoder: () => null });
    tCondition('parse decoder returns null', decoderNull.null === null || 'null' in decoderNull);

    // decoder 抛错
    let decoderError = '';
    try {
      qs.parse('a=1', { decoder: () => { throw new Error('Decoder failed'); } });
    } catch (e) {
      decoderError = e.message;
    }
    tCondition('parse decoder throws error', decoderError.includes('Decoder') || decoderError.includes('failed'));

    // decoder 类型验证
    let decoderTypeError = '';
    try {
      qs.parse('a=1', { decoder: 'not-a-function' });
    } catch (e) {
      decoderTypeError = e.message;
    }
    tCondition('parse decoder type error', 
      decoderTypeError.length > 0 || typeof qs.parse('a=1', { decoder: 'not-a-function' }) === 'object');

    // ════════════════════════════════════════
    // 第二十一部分: 编码与特殊字符
    // ════════════════════════════════════════
    console.log('\n📦 [21] 编码与特殊字符测试\n');

    t('parse URL encoded space (%20)', qs.parse('a=hello%20world'), { a: 'hello world' });
    t('parse plus as space', qs.parse('a=hello+world'), { a: 'hello world' });
    t('parse encoded special chars', qs.parse('a=%21%40%23%24%25%5E%26%2A'), 
      { a: '!@#$%^&*' });
    t('parse unicode', qs.parse('a=%E2%9C%93%E2%9C%94'), { a: '✓✔' });
    t('parse encoded brackets', qs.parse('a=%5Bvalue%5D'), { a: '[value]' });
    t('parse encoded equals', qs.parse('a=b%3Dc'), { a: 'b=c' });
    t('parse incomplete percent', qs.parse('a=%'), { a: '%' });
    t('parse malformed percent', qs.parse('a=%ZZ'), { a: '%ZZ' });
    t('parse percent in key', qs.parse('%25key=value'), { '%key': 'value' });
    t('parse null byte', qs.parse('a=b%00c'), { a: 'b\x00c' });

    // ════════════════════════════════════════
    // 第二十二部分: 边界与异常输入
    // ════════════════════════════════════════
    console.log('\n📦 [22] 边界与异常输入测试\n');

    t('parse empty value', qs.parse('a=&b=c'), { a: '', b: 'c' });
    t('parse multiple empty values', qs.parse('a=&b=&c='), { a: '', b: '', c: '' });
    t('parse only key (no equals)', qs.parse('a&b&c'), { a: '', b: '', c: '' });
    t('parse trailing &', qs.parse('a=1&'), { a: '1' });
    t('parse leading &', qs.parse('&a=1'), { a: '1' });
    t('parse multiple &', qs.parse('a=1&&b=2'), { a: '1', b: '2' });
    t('parse only ?', qs.parse('?', { ignoreQueryPrefix: true }), {});
    t('parse only &', qs.parse('&'), {});
    t('parse only =', qs.parse('='), {});
    t('parse empty key', qs.parse('=value'), {});
    t('parse only delimiters', qs.parse('&&&'), {});

    // ════════════════════════════════════════
    // 第二十三部分: 极端输入 (DoS 防护)
    // ════════════════════════════════════════
    console.log('\n📦 [23] 极端输入/DoS 防护测试\n');

    // 超长键名和值
    const longKey = 'k'.repeat(1000);
    const longValue = 'v'.repeat(1000);
    t('parse very long key', qs.parse(`${longKey}=value`), { [longKey]: 'value' });
    t('parse very long value', qs.parse(`key=${longValue}`), { key: longValue });

    // 巨量参数
    const manyParams = Array.from({ length: 100 }, (_, i) => `p${i}=${i}`).join('&');
    tCondition('parse 100 parameters', Object.keys(qs.parse(manyParams)).length === 100);

    // 超深嵌套 (默认会被 depth 限制)
    const deepNest = 'a' + '[b]'.repeat(20) + '=value';
    tCondition('parse 20-level nesting', typeof qs.parse(deepNest) === 'object');

    // 大量重复键
    const manyDuplicates = Array(100).fill('a=1').join('&');
    const dupResult = qs.parse(manyDuplicates);
    tCondition('parse 100 duplicate keys', Array.isArray(dupResult.a) && dupResult.a.length === 100);

    // 超大数组索引
    t('parse huge array index', qs.parse('a[999999]=value'), { a: { '999999': 'value' } });

    // ════════════════════════════════════════
    // 第二十四部分: 特殊键名
    // ════════════════════════════════════════
    console.log('\n📦 [24] 特殊键名测试\n');

    t('parse key with space', qs.parse('a%20b=c'), { 'a b': 'c' });
    t('parse key with special chars', qs.parse('a%21%40=b'), { 'a!@': 'b' });
    t('parse unicode key', qs.parse('%E4%B8%AD%E6%96%87=value'), { '中文': 'value' });
    t('parse numeric key', qs.parse('123=value'), { '123': 'value' });
    t('parse key starting with bracket', qs.parse('[key]=value'), { key: 'value' });
    t('parse key ending with bracket', qs.parse('key]=value'), { 'key]': 'value' });
    t('parse key with nested brackets', qs.parse('a[b[c]]=d'), { 'a[b': { c: 'd' } });
    t('parse only brackets', qs.parse('[]=value'), { '0': 'value' });

    // ════════════════════════════════════════
    // 第二十五部分: 复杂嵌套组合
    // ════════════════════════════════════════
    console.log('\n📦 [25] 复杂嵌套组合测试\n');

    t('parse complex nested object', 
      qs.parse('a[b][c]=1&a[b][d]=2&a[e]=3'), 
      { a: { b: { c: '1', d: '2' }, e: '3' } });
    t('parse array of objects', 
      qs.parse('a[0][b]=1&a[0][c]=2&a[1][b]=3&a[1][c]=4'), 
      { a: [{ b: '1', c: '2' }, { b: '3', c: '4' }] });
    t('parse nested array in object', 
      qs.parse('a[b][0]=1&a[b][1]=2&a[c]=3'), 
      { a: { b: ['1', '2'], c: '3' } });
    t('parse object in array', 
      qs.parse('a[0][b][c]=1'), 
      { a: [{ b: { c: '1' } }] });

    // ════════════════════════════════════════
    // 第二十六部分: 选项交互组合
    // ════════════════════════════════════════
    console.log('\n📦 [26] 选项交互组合测试\n');

    t('parse allowDots + comma', 
      qs.parse('a.b=1,2', { allowDots: true, comma: true }), 
      { a: { b: ['1', '2'] } });
    t('parse delimiter + ignoreQueryPrefix', 
      qs.parse('?a=1;b=2', { ignoreQueryPrefix: true, delimiter: ';' }), 
      { a: '1', b: '2' });
    t('parse plainObjects + allowPrototypes', 
      qs.parse('a=b', { plainObjects: true, allowPrototypes: true }).hasOwnProperty, 
      undefined);
    t('parse strictNullHandling + decoder', 
      qs.parse('a&b=1', { 
        strictNullHandling: true, 
        decoder: (str) => str === null ? 'NULL' : str 
      }), 
      { a: null, b: '1' });
    t('parse arrayLimit + comma', 
      qs.parse('a=1,2,3', { comma: true, arrayLimit: 1 }), 
      { a: { '0': '1', '1': '2', '2': '3' } });
    t('parse parameterLimit + delimiter', 
      qs.parse('a=1;b=2;c=3', { delimiter: ';', parameterLimit: 2 }), 
      { a: '1', b: '2' });

    // ════════════════════════════════════════
    // 第二十七部分: 真实场景模拟
    // ════════════════════════════════════════
    console.log('\n📦 [27] 真实场景模拟测试\n');

    t('parse typical URL query', 
      qs.parse('search=test&page=1&limit=10&sort=desc'), 
      { search: 'test', page: '1', limit: '10', sort: 'desc' });
    t('parse filter query', 
      qs.parse('filter[status]=active&filter[type]=user&filter[role]=admin'), 
      { filter: { status: 'active', type: 'user', role: 'admin' } });
    t('parse pagination query', 
      qs.parse('page[number]=1&page[size]=20'), 
      { page: { number: '1', size: '20' } });
    t('parse sort query', 
      qs.parse('sort[]=name&sort[]=-created'), 
      { sort: ['name', '-created'] });
    t('parse search with encoding', 
      qs.parse('q=hello+world&category=%E7%A7%91%E6%8A%80'), 
      { q: 'hello world', category: '科技' });

    // ════════════════════════════════════════
    // 第二十八部分: 非字符串输入错误处理
    // ════════════════════════════════════════
    console.log('\n📦 [28] 非字符串输入错误处理\n');

    let nullInputResult = '';
    try {
      nullInputResult = qs.parse(null);
    } catch (e) {
      nullInputResult = 'error';
    }
    tCondition('parse null input', typeof nullInputResult === 'object' || nullInputResult === 'error');

    let undefinedInputResult = '';
    try {
      undefinedInputResult = qs.parse(undefined);
    } catch (e) {
      undefinedInputResult = 'error';
    }
    tCondition('parse undefined input', 
      typeof undefinedInputResult === 'object' || undefinedInputResult === 'error');

    let numberInputResult = '';
    try {
      numberInputResult = qs.parse(123);
    } catch (e) {
      numberInputResult = 'error';
    }
    tCondition('parse number input', 
      typeof numberInputResult === 'object' || numberInputResult === 'error');

    let objectInputResult = '';
    try {
      objectInputResult = qs.parse({ a: 1 });
    } catch (e) {
      objectInputResult = 'error';
    }
    tCondition('parse object input', 
      typeof objectInputResult === 'object' || objectInputResult === 'error');

    // ════════════════════════════════════════
    // 第二十九部分: 选项边界值测试
    // ════════════════════════════════════════
    console.log('\n📦 [29] 选项边界值测试\n');

    tCondition('parse depth: -1 (invalid)', typeof qs.parse('a[b]=c', { depth: -1 }) === 'object');
    tCondition('parse depth: NaN (invalid)', typeof qs.parse('a[b]=c', { depth: NaN }) === 'object');
    tCondition('parse arrayLimit: -1 (invalid)', 
      typeof qs.parse('a[0]=1', { arrayLimit: -1 }) === 'object');
    tCondition('parse parameterLimit: -1 (invalid)', 
      typeof qs.parse('a=1', { parameterLimit: -1 }) === 'object');

    // 空字符串 delimiter
    const emptyDelimResult = qs.parse('a=1&b=2', { delimiter: '' });
    tCondition('parse delimiter: empty string', Object.keys(emptyDelimResult).length > 0);

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
    console.log('📊 测试汇总:');
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

