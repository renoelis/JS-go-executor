// qs.stringify() 批次2: 核心选项测试
// 版本: qs v6.14.0
// 用例数: 约 50 个

const qs = require('qs');

async function main() {
  try {
    const detail = [];
    let total = 0, pass = 0;

    function t(name, got, expect) {
      total++;
      const ok = got === expect;
      detail.push({ case: name, expect, got, pass: ok });
      console.log(`${ok ? '✅' : '❌'} ${name}`);
      if (ok) pass++;
      return ok;
    }

    console.log('📦 批次2: 核心选项测试\n');

    // allowDots 选项
    console.log('allowDots 选项测试:');
    t('stringify with allowDots=true', 
      qs.stringify({ a: { b: 'c' } }, { allowDots: true }), 
      'a.b=c');
    t('stringify 2-level with allowDots', 
      qs.stringify({ a: { b: { c: 'd' } } }, { allowDots: true }), 
      'a.b.c=d');
    t('stringify mixed keys with allowDots', 
      qs.stringify({ a: { b: '1', c: '2' } }, { allowDots: true }), 
      'a.b=1&a.c=2');
    t('stringify array with allowDots', 
      qs.stringify({ a: ['b', 'c'] }, { allowDots: true }), 
      'a%5B0%5D=b&a%5B1%5D=c');
    t('stringify allowDots with encode=false', 
      qs.stringify({ a: { b: 'c' } }, { allowDots: true, encode: false }), 
      'a.b=c');

    // skipNulls 选项
    console.log('\nskipNulls 选项测试:');
    t('stringify with skipNulls=false (default)', 
      qs.stringify({ a: null, b: 'c' }), 
      'a=&b=c');
    t('stringify with skipNulls=true', 
      qs.stringify({ a: null, b: 'c' }, { skipNulls: true }), 
      'b=c');
    t('stringify all null with skipNulls', 
      qs.stringify({ a: null, b: null }, { skipNulls: true }), 
      '');
    t('stringify nested null with skipNulls', 
      qs.stringify({ a: { b: null, c: 'd' } }, { skipNulls: true }), 
      'a%5Bc%5D=d');
    t('stringify array with null skipNulls', 
      qs.stringify({ a: [null, 'b', null] }, { skipNulls: true }), 
      'a%5B1%5D=b');

    // strictNullHandling 选项
    console.log('\nstrictNullHandling 选项测试:');
    t('stringify with strictNullHandling=false (default)', 
      qs.stringify({ a: null }), 
      'a=');
    t('stringify with strictNullHandling=true', 
      qs.stringify({ a: null }, { strictNullHandling: true }), 
      'a');
    t('stringify nested null with strictNullHandling', 
      qs.stringify({ a: { b: null } }, { strictNullHandling: true }), 
      'a%5Bb%5D');
    t('stringify mixed values with strictNullHandling', 
      qs.stringify({ a: null, b: 'c' }, { strictNullHandling: true }), 
      'a&b=c');

    // addQueryPrefix 选项
    console.log('\naddQueryPrefix 选项测试:');
    t('stringify with addQueryPrefix=false (default)', 
      qs.stringify({ a: 'b' }), 
      'a=b');
    t('stringify with addQueryPrefix=true', 
      qs.stringify({ a: 'b' }, { addQueryPrefix: true }), 
      '?a=b');
    t('stringify empty with addQueryPrefix', 
      qs.stringify({}, { addQueryPrefix: true }), 
      '');
    t('stringify nested with addQueryPrefix', 
      qs.stringify({ a: { b: 'c' } }, { addQueryPrefix: true }), 
      '?a%5Bb%5D=c');

    // encodeValuesOnly 选项
    console.log('\nencodeValuesOnly 选项测试:');
    t('stringify with encodeValuesOnly=false (default)', 
      qs.stringify({ 'a b': 'c d' }), 
      'a%20b=c%20d');
    t('stringify with encodeValuesOnly=true', 
      qs.stringify({ 'a b': 'c d' }, { encodeValuesOnly: true }), 
      'a b=c%20d');
    t('stringify nested with encodeValuesOnly', 
      qs.stringify({ 'a': { 'b c': 'd e' } }, { encodeValuesOnly: true }), 
      'a[b c]=d%20e');
    t('stringify special chars with encodeValuesOnly', 
      qs.stringify({ 'a&b': 'c&d' }, { encodeValuesOnly: true }), 
      'a&b=c%26d');

    // delimiter 选项
    console.log('\ndelimiter 选项测试:');
    t('stringify with delimiter=& (default)', 
      qs.stringify({ a: 'b', c: 'd' }), 
      'a=b&c=d');
    t('stringify with delimiter=;', 
      qs.stringify({ a: 'b', c: 'd' }, { delimiter: ';' }), 
      'a=b;c=d');
    t('stringify with delimiter=|', 
      qs.stringify({ a: 'b', c: 'd' }, { delimiter: '|' }), 
      'a=b|c=d');
    t('stringify array with custom delimiter', 
      qs.stringify({ a: ['b', 'c'] }, { delimiter: ';', arrayFormat: 'repeat' }), 
      'a=b;a=c');

    // format 选项 (RFC1738 vs RFC3986)
    console.log('\nformat 选项测试:');
    t('stringify space with format=RFC3986 (default)', 
      qs.stringify({ a: 'b c' }), 
      'a=b%20c');
    t('stringify space with format=RFC1738', 
      qs.stringify({ a: 'b c' }, { format: 'RFC1738' }), 
      'a=b+c');
    t('stringify special chars with RFC1738', 
      qs.stringify({ a: 'hello world!' }, { format: 'RFC1738' }), 
      'a=hello+world%21');
    t('stringify mixed with RFC1738', 
      qs.stringify({ a: 'b c', d: 'e f' }, { format: 'RFC1738' }), 
      'a=b+c&d=e+f');

    // charsetSentinel 选项
    console.log('\ncharsetSentinel 选项测试:');
    t('stringify with charsetSentinel=false (default)', 
      qs.stringify({ a: 'b' }), 
      'a=b');
    t('stringify with charsetSentinel=true (utf-8)', 
      qs.stringify({ a: 'b' }, { charsetSentinel: true }), 
      'utf8=%E2%9C%93&a=b');
    t('stringify with charsetSentinel and charset=iso-8859-1', 
      qs.stringify({ a: 'b' }, { charsetSentinel: true, charset: 'iso-8859-1' }), 
      'utf8=%26%2310003%3B&a=b');
    t('stringify empty with charsetSentinel', 
      qs.stringify({}, { charsetSentinel: true }), 
      '');

    // indices 选项 (已废弃，但仍支持)
    console.log('\nindices 选项测试 (已废弃):');
    t('stringify with indices=true (default)', 
      qs.stringify({ a: ['b', 'c'] }, { indices: true }), 
      'a%5B0%5D=b&a%5B1%5D=c');
    t('stringify with indices=false', 
      qs.stringify({ a: ['b', 'c'] }, { indices: false }), 
      'a=b&a=c');

    // allowEmptyArrays 选项
    console.log('\nallowEmptyArrays 选项测试:');
    t('stringify empty array with allowEmptyArrays=false (default)', 
      qs.stringify({ a: [] }), 
      '');
    t('stringify empty array with allowEmptyArrays=true', 
      qs.stringify({ a: [] }, { allowEmptyArrays: true }), 
      'a[]');
    t('stringify nested empty array with allowEmptyArrays', 
      qs.stringify({ a: { b: [] } }, { allowEmptyArrays: true }), 
      'a[b][]');
    t('stringify mixed empty array with allowEmptyArrays', 
      qs.stringify({ a: [], b: 'c' }, { allowEmptyArrays: true }), 
      'a[]&b=c');

    // 汇总
    const summary = { total, pass, fail: total - pass };
    const testResults = {
      success: summary.fail === 0,
      summary,
      detail
    };

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('批次2测试汇总:', JSON.stringify(summary, null, 2));
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

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

