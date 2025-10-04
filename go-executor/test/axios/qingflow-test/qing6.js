const axios = require('axios');
const ACCESS_TOKEN = 'd866db1d-79ca-42c5-9e9c-0b1ce21135d2';

// ==================== 1. 根据邮箱获取用户ID ====================
function getUserIdByEmail(email) {
  return axios.get(`https://api.qingflow.com/user/getId?email=${encodeURIComponent(email)}`, {
    headers: { accessToken: ACCESS_TOKEN }
  })
    .then(resp => {
      if (resp.data.errCode === 0 && resp.data.result.length > 0) {
        return resp.data.result[0].userId;
      } else {
        return { error: '无法获取用户ID' };
      }
    })
    .catch(() => ({ error: '请求发生错误' }));
}

// ==================== 2. 根据 userId 获取用户部门列表 ====================
function getUserInfoById(userId) {
  return axios.get(`https://api.qingflow.com/user/${userId}`, {
    headers: { accessToken: ACCESS_TOKEN }
  })
    .then(resp => {
      if (resp.data.errCode === 0) {
        return resp.data.result.department;
      } else {
        return { error: '无法获取用户信息' };
      }
    })
    .catch(() => ({ error: '请求发生错误' }));
}

// ==================== 3. 根据部门ID获取详情 ====================
function getDepartmentDetail(deptId) {
  return axios.get(`https://api.qingflow.com/department/${deptId}`, {
    headers: { accessToken: ACCESS_TOKEN }
  })
    .then(resp => {
      if (resp.data.errCode === 0) {
        return resp.data.result;
      } else {
        return { error: '无法获取部门详情' };
      }
    })
    .catch(() => ({ error: '请求发生错误' }));
}

// ==================== 4. 构建完整的部门层级 ====================
function getFullDepartmentHierarchy(deptId) {
  let hierarchy = [];

  function loop(currentId) {
    if (!currentId) return Promise.resolve(hierarchy);

    return getDepartmentDetail(currentId).then(currentDept => {
      if (currentDept.error) return currentDept;

      hierarchy.unshift(currentDept.deptId);
      if (currentDept.parentId !== null) {
        return loop(currentDept.parentId);
      }
      return hierarchy;
    });
  }

  return loop(deptId).then(hierarchy => hierarchy.join('%'));
}

// ==================== 5. 主函数 ====================
function main(email, ids) {
  return getUserIdByEmail(email)
    .then(userId => {
      if (userId.error) return userId;
      return getUserInfoById(userId).then(departments => {
        if (departments.error) return departments;

        const tasks = departments.map(deptId => getFullDepartmentHierarchy(deptId));
        return Promise.all(tasks).then(deptHierarchies => {
          const deptHierarchyStrings = deptHierarchies.map(h => h.toString());
          const targetIds = ids.split(',');
          const hasTargetDept = deptHierarchyStrings.some(hierarchy =>
            targetIds.some(id => hierarchy.includes(id))
          );
          return { result: hasTargetDept };
        });
      });
    })
    .catch(() => ({ error: '请求发生错误' }));
}

// ==================== 示例调用 ====================
var email = "zhangziqi@exiao.tech";
var ids = "143937";

if (email == null || ids == null) {
  return { result: null };
} else {
  return main(email, ids);
}
