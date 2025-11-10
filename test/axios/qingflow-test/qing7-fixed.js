const axios = require('axios');

const headers = {   
  'accessToken':  'd866db1d-79ca-42c5-9e9c-0b1ce21135d2',
  'Content-Type': 'application/json'
};

const apiUrl = 'https://api.qingflow.com';

/**如果使用表格字段中部门字段
const table = [
    {"部门id":"231904","部门":"test"}
];
**/
//如果使用主字段部门字段
const depart = input.depart;
const departid = input.departid;

// 将departid字符串分割为数组
const departIds = departid.split(',');

// 使用map函数将depart数组和departIds数组合并为所需的对象数组
const table = depart.map(function(name, index) {
    return {
        "部门": name,
        "部门id": departIds[index]
    };
});


async function getdepartuser(departmentId) {
  try {
    const response = await axios.get(apiUrl + '/department/' + departmentId + '/user?fetchChild=true', { 
      headers: headers
    });
    
    // 添加防御性检查
    if (!response || !response.data) {
      console.log('警告：部门 ' + departmentId + ' 响应数据为空');
      return [];
    }
    
    if (!response.data.result) {
      console.log('警告：部门 ' + departmentId + ' result 为空，完整响应：' + JSON.stringify(response.data));
      return [];
    }
    
    if (!response.data.result.userList) {
      console.log('警告：部门 ' + departmentId + ' userList 为空');
      return [];
    }
    
    return response.data.result.userList;
  } catch (error) {
    console.log('错误：获取部门 ' + departmentId + ' 用户失败：' + error.message);
    return [];
  }
}

async function getEmailListForDepartments(departments) {
  const list = [];

  for (let i = 0; i < departments.length; i++) {
    const department = departments[i];
    const userList = await getdepartuser(department['部门id']);
    const emails = userList.map(function(user) { 
      return user.email; 
    });

    // 对于每个部门，添加包含部门信息和邮箱列表的新对象
    for (let j = 0; j < emails.length; j++) {
      const email = emails[j];
      list.push({ 
        "部门id": department['部门id'], 
        "部门": department['部门'], 
        "email": [email] 
      });
    }
  }

  return list;
}

return getEmailListForDepartments(table).then(function(list) {
  return list;
});

