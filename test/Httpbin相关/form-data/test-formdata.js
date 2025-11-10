/**
 * 全面测试 Node.js form-data 包的所有能力
 * 测试域名: https://httpbin.qingflow.dpdns.org
 * 
 * 安装依赖: npm install axios form-data
 * 
 * 注意: 此测试脚本不使用 fs 和 path 模块,适用于沙箱环境
 *       所有文件上传测试使用 Buffer 代替文件流
 */

const axios = require('axios');
const FormData = require('form-data');

const BASE_URL = 'https://httpbin.qingflow.dpdns.org';

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  blue: '\x1b[34m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

let passed = 0;
let failed = 0;

async function test(name, fn) {
  try {
    await fn();
    log(`✓ ${name}`, 'green');
    passed++;
  } catch (error) {
    log(`✗ ${name}`, 'red');
    log(`  错误: ${error.message}`, 'red');
    failed++;
  }
}

console.log('\n╔════════════════════════════════════════════════════════╗');
log('║       Node.js form-data 包完整功能测试                 ║', 'cyan');
log('║       测试域名: https://httpbin.qingflow.dpdns.org     ║', 'cyan');
console.log('╚════════════════════════════════════════════════════════╝\n');

(async () => {
  // ============ 1. 基础字段测试 ============
  log('━━━ 测试 1: 基础表单字段 ━━━', 'cyan');
  
  await test('添加简单字符串字段', async () => {
    const form = new FormData();
    form.append('name', 'John Doe');
    form.append('email', 'john@example.com');
    form.append('age', '30');
    
    const res = await axios.post(`${BASE_URL}/post`, form, {
      headers: form.getHeaders()
    });
    
    if (res.data.form.name !== 'John Doe') throw new Error('name 字段错误');
    if (res.data.form.email !== 'john@example.com') throw new Error('email 字段错误');
    if (res.data.form.age !== '30') throw new Error('age 字段错误');
  });

  await test('添加数字和布尔值', async () => {
    const form = new FormData();
    // form-data 只接受字符串、Buffer 或 Uint8Array,需要手动转换
    form.append('count', String(123));
    form.append('price', String(99.99));
    form.append('active', String(true));
    form.append('inactive', String(false));
    
    const res = await axios.post(`${BASE_URL}/post`, form, {
      headers: form.getHeaders()
    });
    
    // 验证转换后的字符串
    if (res.data.form.count !== '123') throw new Error('count 字段错误');
    if (res.data.form.price !== '99.99') throw new Error('price 字段错误');
    if (res.data.form.active !== 'true') throw new Error('active 字段错误');
  });

  await test('添加特殊字符和中文', async () => {
    const form = new FormData();
    form.append('chinese', '你好世界');
    form.append('emoji', '🎉🚀✨');
    form.append('special', 'a&b=c d+e');
    
    const res = await axios.post(`${BASE_URL}/post`, form, {
      headers: form.getHeaders()
    });
    
    if (res.data.form.chinese !== '你好世界') throw new Error('中文字段错误');
    if (res.data.form.emoji !== '🎉🚀✨') throw new Error('emoji 字段错误');
    if (res.data.form.special !== 'a&b=c d+e') throw new Error('特殊字符错误');
  });

  // ============ 2. 文件上传测试 ============
  log('\n━━━ 测试 2: 文件上传 ━━━', 'cyan');

  await test('上传 Buffer 作为文件', async () => {
    const form = new FormData();
    const buffer = Buffer.from('This is file content from buffer');
    form.append('file', buffer, {
      filename: 'test.txt',
      contentType: 'text/plain'
    });
    
    const res = await axios.post(`${BASE_URL}/upload`, form, {
      headers: form.getHeaders()
    });
    
    if (!res.data.files || !res.data.files.file) throw new Error('文件未上传');
    if (!res.data.files.file.includes('buffer')) throw new Error('文件内容错误');
  });

  await test('上传字符串作为文件', async () => {
    const form = new FormData();
    form.append('file', 'Plain text content', {
      filename: 'plain.txt',
      contentType: 'text/plain'
    });
    
    const res = await axios.post(`${BASE_URL}/upload`, form, {
      headers: form.getHeaders()
    });
    
    if (!res.data.files || !res.data.files.file) throw new Error('文件未上传');
  });

  await test('上传大 Buffer 模拟 Stream', async () => {
    const form = new FormData();
    // 创建一个较大的 Buffer 模拟文件内容
    const largeBuffer = Buffer.from('Large file content '.repeat(100));
    
    form.append('file', largeBuffer, {
      filename: 'large-file.txt',
      contentType: 'text/plain'
    });
    
    const res = await axios.post(`${BASE_URL}/upload`, form, {
      headers: form.getHeaders()
    });
    
    if (!res.data.files || !res.data.files.file) throw new Error('大 Buffer 文件未上传');
  });

  await test('上传多个文件', async () => {
    const form = new FormData();
    form.append('file1', Buffer.from('File 1 content'), {
      filename: 'file1.txt'
    });
    form.append('file2', Buffer.from('File 2 content'), {
      filename: 'file2.txt'
    });
    form.append('file3', Buffer.from('File 3 content'), {
      filename: 'file3.txt'
    });
    
    const res = await axios.post(`${BASE_URL}/upload`, form, {
      headers: form.getHeaders()
    });
    
    if (!res.data.files) throw new Error('文件未上传');
    const fileCount = Object.keys(res.data.files).length;
    if (fileCount !== 3) throw new Error(`期望3个文件,得到${fileCount}个`);
  });

  await test('混合文件和表单字段', async () => {
    const form = new FormData();
    form.append('description', 'Test upload with metadata');
    form.append('category', 'documents');
    form.append('file', Buffer.from('Document content'), {
      filename: 'document.txt',
      contentType: 'text/plain'
    });
    
    const res = await axios.post(`${BASE_URL}/upload`, form, {
      headers: form.getHeaders()
    });
    
    if (res.data.form.description !== 'Test upload with metadata') throw new Error('表单字段错误');
    if (!res.data.files || !res.data.files.file) throw new Error('文件未上传');
  });

  // ============ 3. 高级选项测试 ============
  log('\n━━━ 测试 3: 高级选项 ━━━', 'cyan');

  await test('自定义 Content-Type', async () => {
    const form = new FormData();
    form.append('json_file', JSON.stringify({ key: 'value' }), {
      filename: 'data.json',
      contentType: 'application/json'
    });
    
    const res = await axios.post(`${BASE_URL}/upload`, form, {
      headers: form.getHeaders()
    });
    
    if (!res.data.files || !res.data.files.json_file) throw new Error('JSON 文件未上传');
  });

  await test('自定义文件名', async () => {
    const form = new FormData();
    form.append('file', Buffer.from('content'), {
      filename: '中文文件名.txt',
      contentType: 'text/plain'
    });
    
    const res = await axios.post(`${BASE_URL}/upload`, form, {
      headers: form.getHeaders()
    });
    
    if (!res.data.files || !res.data.files.file) throw new Error('中文文件名上传失败');
  });

  await test('获取 Content-Type 头', async () => {
    const form = new FormData();
    form.append('field', 'value');
    
    const headers = form.getHeaders();
    if (!headers['content-type']) throw new Error('未获取到 Content-Type');
    if (!headers['content-type'].includes('multipart/form-data')) {
      throw new Error('Content-Type 不正确');
    }
    if (!headers['content-type'].includes('boundary=')) {
      throw new Error('Content-Type 缺少 boundary');
    }
  });

  await test('获取 Content-Length (同步)', async () => {
    const form = new FormData();
    form.append('field1', 'value1');
    form.append('field2', 'value2');
    
    const length = form.getLengthSync();
    if (typeof length !== 'number') throw new Error('Content-Length 类型错误');
    if (length <= 0) throw new Error('Content-Length 应该大于0');
  });

  await test('获取 Content-Length (异步)', async () => {
    const form = new FormData();
    form.append('field1', 'value1');
    form.append('field2', 'value2');
    
    const length = await new Promise((resolve, reject) => {
      form.getLength((err, length) => {
        if (err) reject(err);
        else resolve(length);
      });
    });
    
    if (typeof length !== 'number') throw new Error('Content-Length 类型错误');
    if (length <= 0) throw new Error('Content-Length 应该大于0');
  });

  // ============ 4. 边界情况测试 ============
  log('\n━━━ 测试 4: 边界情况 ━━━', 'cyan');

  await test('空表单', async () => {
    const form = new FormData();
    
    const res = await axios.post(`${BASE_URL}/post`, form, {
      headers: form.getHeaders()
    });
    
    // 空表单应该成功发送
    if (res.status !== 200) throw new Error('空表单发送失败');
  });

  await test('大量字段', async () => {
    const form = new FormData();
    for (let i = 0; i < 100; i++) {
      form.append(`field${i}`, `value${i}`);
    }
    
    const res = await axios.post(`${BASE_URL}/post`, form, {
      headers: form.getHeaders()
    });
    
    const fieldCount = Object.keys(res.data.form).length;
    if (fieldCount !== 100) throw new Error(`期望100个字段,得到${fieldCount}个`);
  });

  await test('重复字段名', async () => {
    const form = new FormData();
    form.append('tags', 'tag1');
    form.append('tags', 'tag2');
    form.append('tags', 'tag3');
    
    const res = await axios.post(`${BASE_URL}/post`, form, {
      headers: form.getHeaders()
    });
    
    // 注意: httpbin 可能只返回最后一个值,或者数组
    if (!res.data.form.tags) throw new Error('重复字段未处理');
  });

  await test('空字符串值', async () => {
    const form = new FormData();
    form.append('empty', '');
    form.append('space', ' ');
    form.append('normal', 'value');
    
    const res = await axios.post(`${BASE_URL}/post`, form, {
      headers: form.getHeaders()
    });
    
    if (res.data.form.empty !== '') throw new Error('空字符串处理错误');
    if (res.data.form.space !== ' ') throw new Error('空格处理错误');
  });

  await test('大文件 (10KB)', async () => {
    const form = new FormData();
    const largeContent = Buffer.alloc(10 * 1024, 'x'); // 10KB
    form.append('large_file', largeContent, {
      filename: 'large.txt',
      contentType: 'text/plain'
    });
    
    const res = await axios.post(`${BASE_URL}/upload`, form, {
      headers: form.getHeaders()
    });
    
    if (!res.data.files || !res.data.files.large_file) throw new Error('大文件上传失败');
  });

  // ============ 5. 实际应用场景测试 ============
  log('\n━━━ 测试 5: 实际应用场景 ━━━', 'cyan');

  await test('用户注册表单', async () => {
    const form = new FormData();
    form.append('username', 'testuser');
    form.append('email', 'test@example.com');
    form.append('password', 'secret123');
    form.append('age', '25');
    form.append('terms', 'true');
    
    const res = await axios.post(`${BASE_URL}/post`, form, {
      headers: form.getHeaders()
    });
    
    if (res.data.form.username !== 'testuser') throw new Error('用户名错误');
    if (res.data.form.email !== 'test@example.com') throw new Error('邮箱错误');
  });

  await test('文件上传 + 元数据', async () => {
    const form = new FormData();
    form.append('title', 'My Document');
    form.append('description', 'Important document');
    form.append('tags', 'work,important');
    form.append('file', Buffer.from('Document content here'), {
      filename: 'document.pdf',
      contentType: 'application/pdf'
    });
    
    const res = await axios.post(`${BASE_URL}/upload`, form, {
      headers: form.getHeaders()
    });
    
    if (res.data.form.title !== 'My Document') throw new Error('标题错误');
    if (!res.data.files || !res.data.files.file) throw new Error('文件未上传');
  });

  await test('多文件上传 (图片库)', async () => {
    const form = new FormData();
    form.append('album', 'Vacation 2024');
    
    // 模拟上传3张图片
    for (let i = 1; i <= 3; i++) {
      form.append(`photo${i}`, Buffer.from(`Image ${i} data`), {
        filename: `photo${i}.jpg`,
        contentType: 'image/jpeg'
      });
    }
    
    const res = await axios.post(`${BASE_URL}/upload`, form, {
      headers: form.getHeaders()
    });
    
    if (res.data.form.album !== 'Vacation 2024') throw new Error('相册名错误');
    const fileCount = Object.keys(res.data.files || {}).length;
    if (fileCount !== 3) throw new Error(`期望3张图片,得到${fileCount}张`);
  });

  await test('API 数据提交 (JSON + 文件)', async () => {
    const form = new FormData();
    const metadata = {
      user_id: 123,
      timestamp: Date.now(),
      action: 'upload'
    };
    form.append('metadata', JSON.stringify(metadata));
    form.append('data_file', Buffer.from('CSV data here'), {
      filename: 'data.csv',
      contentType: 'text/csv'
    });
    
    const res = await axios.post(`${BASE_URL}/upload`, form, {
      headers: form.getHeaders()
    });
    
    const parsedMetadata = JSON.parse(res.data.form.metadata);
    if (parsedMetadata.user_id !== 123) throw new Error('元数据解析错误');
    if (!res.data.files || !res.data.files.data_file) throw new Error('数据文件未上传');
  });

  // ============ 6. form-data 特有方法测试 ============
  log('\n━━━ 测试 6: form-data 特有方法 ━━━', 'cyan');

  await test('hasKnownLength() 方法', async () => {
    const form = new FormData();
    form.append('field', 'value');
    
    const hasLength = form.hasKnownLength();
    if (typeof hasLength !== 'boolean') throw new Error('hasKnownLength 返回类型错误');
  });

  await test('getBoundary() 方法', async () => {
    const form = new FormData();
    form.append('field', 'value');
    
    const boundary = form.getBoundary();
    if (typeof boundary !== 'string') throw new Error('boundary 类型错误');
    if (boundary.length === 0) throw new Error('boundary 为空');
  });

  await test('getBuffer() 方法', async () => {
    const form = new FormData();
    form.append('field1', 'value1');
    form.append('field2', 'value2');
    
    const buffer = form.getBuffer();
    if (!Buffer.isBuffer(buffer)) throw new Error('getBuffer 未返回 Buffer');
    if (buffer.length === 0) throw new Error('Buffer 为空');
  });

  // ============ 测试结果汇总 ============
  console.log('\n╔════════════════════════════════════════════════════════╗');
  log('║                    测试结果汇总                         ║', 'cyan');
  console.log('╚════════════════════════════════════════════════════════╝\n');

  log(`总测试数: ${passed + failed}`, 'blue');
  log(`✓ 通过: ${passed}`, 'green');
  log(`✗ 失败: ${failed}`, failed > 0 ? 'red' : 'green');
  log(`📊 成功率: ${((passed / (passed + failed)) * 100).toFixed(2)}%\n`, 'cyan');

  if (failed === 0) {
    log('🎉 所有 form-data 功能测试通过!', 'green');
  } else {
    log('⚠️  部分测试失败,请检查上述错误信息', 'yellow');
  }

  console.log('\n╔════════════════════════════════════════════════════════╗');
  log('║              form-data 包功能覆盖总结                   ║', 'cyan');
  console.log('╚════════════════════════════════════════════════════════╝\n');

  log('✅ 测试覆盖的功能:', 'cyan');
  log('  1. 基础字段 - 字符串、数字、布尔值、特殊字符', 'reset');
  log('  2. 文件上传 - Buffer、Stream、字符串、多文件', 'reset');
  log('  3. 高级选项 - Content-Type、文件名、Headers', 'reset');
  log('  4. 边界情况 - 空表单、大量字段、重复字段、大文件', 'reset');
  log('  5. 实际场景 - 注册表单、文件+元数据、多文件上传', 'reset');
  log('  6. 特有方法 - getBoundary、getBuffer、hasKnownLength', 'reset');
  console.log('');

})().catch(error => {
  log(`\n测试运行失败: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
});
