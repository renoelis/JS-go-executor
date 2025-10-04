const axios = require('axios');

const headers = {   
  'accessToken': 'd866db1d-79ca-42c5-9e9c-0b1ce21135d2',
  'Content-Type': 'application/json'
};

const apiUrl = 'https://api.qingflow.com';

/** 如果使用表格字段中部门字段
const table = [
    {"部门id":"231904","部门":"test"}
];
**/

// 如果使用主字段部门字段
const depart = ["test", "test1", "test3"];
const departid = "143937,168059";

// 将 departid 字符串分割为数组
const departIds = departid.split(',');

// 组装 table 数组
const table = depart.map((name, index) => {
  return {
    "部门": name,
    "部门id": departIds[index]
  };
});

// ==================== 获取部门成员 ====================
function getdepartuser(departmentId) {
  return axios.get(apiUrl + `/department/${departmentId}/user?fetchChild=true`, { headers })
    .then(response => response.data.result.userList)
    .catch(() => []);
}

// ==================== 获取部门成员邮箱 ====================
function getEmailListForDepartments(departments) {
  const list = [];
  let chain = Promise.resolve();

  departments.forEach(department => {
    chain = chain.then(() => {
      return getdepartuser(department['部门id']).then(userList => {
        const emails = userList.map(user => user.email || '');
        emails.forEach(email => {
          list.push({
            "部门id": department['部门id'],
            "部门": department['部门'],
            "email": [email]
          });
        });
      });
    });
  });

  return chain.then(() => {
    return { list };
  });
}

// ==================== 示例调用 ====================
return getEmailListForDepartments(table);
