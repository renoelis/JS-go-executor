/**
 * 📊 真实场景测试：Excel 处理 + OSS 上传
 * 
 * 场景：
 * 1. 创建一个 Excel 文件（模拟业务数据）
 * 2. 将 Excel 转换为 Buffer
 * 3. 使用 FormData 上传到 Cloudflare R2（OSS）
 * 4. 返回上传后的访问 URL
 */

const axios = require('axios');
const xlsx = require('xlsx');
const dateFns = require('date-fns');

// OSS 配置（来自用户提供的 curl）
const OSS_CONFIG = {
  uploadUrl: 'https://api.renoelis.top/R2api/upload-direct',
  authorization: 'Bearer 304b99ee7a9a41a69b1adb6aee7746d2wGgcrXDvVugwh2kL8qPi',
  bucketName: 'renoelis-bucket',
  endpoint: 'https://dde39d55fbdb29f35e42ab2de3318461.r2.cloudflarestorage.com',
  accessKeyId: 'dbe49459ff0a510d1b01674c333c11fe',
  secretAccessKey: '69b6ad35a5fd32f9ca5bc8a913701db8cdca6073af3c67b83faa748138f2113e',
  customDomain: 'https://bucket.renoelis.dpdns.org'
};

console.log('========================================');
console.log('📊 真实场景测试：Excel 处理 + OSS 上传');
console.log('========================================\n');

// Step 1: 创建测试数据
console.log('📝 Step 1: 创建业务数据...');
const testData = [
  {
    '订单编号': 'ORD001',
    '客户名称': '张三',
    '订单金额': 1500.50,
    '下单日期': dateFns.format(new Date('2025-01-15'), 'yyyy-MM-dd'),
    '状态': '已完成'
  },
  {
    '订单编号': 'ORD002',
    '客户名称': '李四',
    '订单金额': 2300.00,
    '下单日期': dateFns.format(new Date('2025-01-16'), 'yyyy-MM-dd'),
    '状态': '处理中'
  },
  {
    '订单编号': 'ORD003',
    '客户名称': '王五',
    '订单金额': 800.75,
    '下单日期': dateFns.format(new Date('2025-01-17'), 'yyyy-MM-dd'),
    '状态': '已取消'
  },
  {
    '订单编号': 'ORD004',
    '客户名称': '赵六',
    '订单金额': 5600.00,
    '下单日期': dateFns.format(new Date('2025-01-18'), 'yyyy-MM-dd'),
    '状态': '已完成'
  },
  {
    '订单编号': 'ORD005',
    '客户名称': '孙七',
    '订单金额': 3200.50,
    '下单日期': dateFns.format(new Date('2025-01-19'), 'yyyy-MM-dd'),
    '状态': '已完成'
  }
];

console.log('   ✅ 已创建 ' + testData.length + ' 条订单数据\n');

// Step 2: 创建 Excel 文件
console.log('📝 Step 2: 生成 Excel 文件...');
const workbook = xlsx.utils.book_new();
const worksheet = xlsx.utils.json_to_sheet(testData);
xlsx.utils.book_append_sheet(workbook, worksheet, '订单数据');

// 写入 Buffer
const excelBuffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });
console.log('   ✅ Excel 文件已生成，大小: ' + excelBuffer.length + ' bytes\n');

// Step 3: 构造 FormData 并上传
console.log('📝 Step 3: 上传到 Cloudflare R2...');

// 生成唯一的文件名
const timestamp = Date.now();
const objectKey = 'excel-reports/orders-report-' + timestamp + '.xlsx';

console.log('   📤 上传参数:');
console.log('      - 文件大小: ' + excelBuffer.length + ' bytes');
console.log('      - 对象路径: ' + objectKey);
console.log('      - 存储桶: ' + OSS_CONFIG.bucketName);

// 使用 axios 上传（模拟 FormData）
// 注意：在我们的环境中，FormData 需要特殊处理
return new Promise(function(resolve, reject) {
  setTimeout(function() {
    // 创建 FormData
    const FormData = require('form-data');
    const formData = new FormData();
    
    // 添加文件（Buffer 作为 Blob）
    const blob = new Blob([excelBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
    formData.append('file', blob, 'orders-report.xlsx');
    
    // 添加其他字段
    formData.append('bucket_name', OSS_CONFIG.bucketName);
    formData.append('endpoint', OSS_CONFIG.endpoint);
    formData.append('access_key_id', OSS_CONFIG.accessKeyId);
    formData.append('secret_access_key', OSS_CONFIG.secretAccessKey);
    formData.append('custom_domain', OSS_CONFIG.customDomain);
    formData.append('object_key', objectKey);
    
    console.log('   📡 正在上传...\n');
    
    // 发送请求
    axios.post(OSS_CONFIG.uploadUrl, formData, {
      headers: {
        'Authorization': OSS_CONFIG.authorization,
        'Content-Type': 'multipart/form-data'
      }
    })
    .then(function(response) {
      console.log('========================================');
      console.log('✅ 上传成功！');
      console.log('========================================\n');
      
      console.log('📊 响应信息:');
      console.log('   HTTP 状态: ' + response.status);
      console.log('   响应数据: ' + JSON.stringify(response.data, null, 2));
      
      // 构造访问 URL
      const fileUrl = OSS_CONFIG.customDomain + '/' + objectKey;
      console.log('\n📎 文件访问地址:');
      console.log('   ' + fileUrl);
      
      resolve({
        success: true,
        message: 'Excel 文件已成功上传到 OSS',
        fileInfo: {
          objectKey: objectKey,
          size: excelBuffer.length,
          url: fileUrl,
          uploadTime: dateFns.format(new Date(), 'yyyy-MM-dd HH:mm:ss')
        },
        response: response.data
      });
    })
    .catch(function(error) {
      console.log('========================================');
      console.log('❌ 上传失败');
      console.log('========================================\n');
      
      console.log('错误信息:');
      if (error.response) {
        // 服务器响应了错误状态码
        console.log('   HTTP 状态: ' + error.response.status);
        console.log('   错误详情: ' + JSON.stringify(error.response.data, null, 2));
      } else if (error.request) {
        // 请求已发出但没有收到响应
        console.log('   未收到服务器响应');
        console.log('   错误详情: ' + error.message);
      } else {
        // 请求配置错误
        console.log('   请求配置错误: ' + error.message);
      }
      
      reject({
        success: false,
        error: error.message,
        details: error.response ? error.response.data : null
      });
    });
  }, 100);
});

