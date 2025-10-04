// 全局依赖导入
const axios = require('axios');
const xlsx = require('xlsx');
const dateFns = require('date-fns');

// 提取函数便于使用
const format = dateFns.format;
const parse = dateFns.parse;
const isValid = dateFns.isValid;

function getAllExcelData(qflowUrl) {
  // 下载 Excel 文件为 arraybuffer
  return axios.get(qflowUrl, { responseType: 'arraybuffer' })
    .then(function (response) {
      // 转换为 Buffer（这是必须的）
      const buffer = Buffer.from(response.data);
      
      // 使用xlsx解析文件
      const workbook = xlsx.read(buffer);
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];

      // 将工作表转换为二维数组
      const rawData = xlsx.utils.sheet_to_json(worksheet, { header: 1 });

      const headers = rawData[0]; // 表头
      const rows = rawData.slice(1); // 数据行

      // 转换为对象数组
      const jsonData = rows.map(function (row) {
        const obj = {};
        headers.forEach(function (header, index) {
          const value = row[index];
          if (header === "制单日期") {
            try {
              if (typeof value === 'number') {
                // Excel日期数值转JS日期
                const excelDate = new Date((value - 25569) * 86400 * 1000);
                obj[header] = format(excelDate, 'yyyy-MM-dd');
              } else if (typeof value === 'string') {
                const parsedDate = parse(value, 'yyyy-MM-dd', new Date());
                obj[header] = isValid(parsedDate) ? format(parsedDate, 'yyyy-MM-dd') : value;
              } else {
                obj[header] = value;
              }
            } catch (err) {
              obj[header] = value;
            }
          } else {
            obj[header] = value;
          }
        });
        return obj;
      });

      return jsonData;
    })
    .catch(function (error) {
      console.log('错误详情:', error.message);
      return { error: '请求发生错误: ' + error.message };
    });
}

// 示例调用
const qflowUrl = "https://qingliu-obs.obs.cn-north-1.myhuaweicloud.com/documents/data/invite/13569E7/6b7509f5-42de-45e0-b322-1b5316198861.xlsx";

function main(url) {
  return getAllExcelData(url)
    .then(function (result) {
      return { data: result };
    });
}

// 运行主程序
return main(qflowUrl);