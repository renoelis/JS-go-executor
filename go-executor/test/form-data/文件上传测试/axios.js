const axios = require("axios");
const FormData = require("form-data");

/**
 * 从远程URL下载并上传到R2
 * @param {string} fileUrl - 远程文件URL
 * @param {string} fileName - 上传到R2的文件名
 * @returns {Promise<object>} - 返回上传结果或错误
 */
function uploadFileToR2(fileUrl, fileName) {
  // Step1: 下载文件
  return axios.get(fileUrl, { responseType: "arraybuffer" })
    .then(function (response) {
      if (!response || !response.data) {
        return { error: "文件下载失败，未获取到内容" };
      }

      // Step2: 构造 FormData
      const form = new FormData();
      form.append("file", Buffer.from(response.data), {
        filename: fileName,
        contentType: response.headers["content-type"] || "application/octet-stream",
      });
      form.append("bucket_name", "renoelis-bucket");
      form.append("endpoint", "https://dde39d55fbdb29f35e42ab2de3318461.r2.cloudflarestorage.com");
      form.append("access_key_id", "dbe49459ff0a510d1b01674c333c11fe");
      form.append("secret_access_key", "69b6ad35a5fd32f9ca5bc8a913701db8cdca6073af3c67b83faa748138f2113e");
      form.append("custom_domain", "https://bucket.renoelis.dpdns.org");
      form.append("object_key", "custom-folder/" + fileName);

      // Step3: 上传文件
      return axios.post("https://api.renoelis.top/R2api/upload-direct", form, {
        headers: {
          Authorization: "Bearer 304b99ee7a9a41a69b1adb6aee7746d2wGgcrXDvVugwh2kL8qPi",
          ...form.getHeaders(),
        },
        maxBodyLength: Infinity,
      });
    })
    .then(function (uploadRes) {
      if (!uploadRes || !uploadRes.data) {
        return { error: "上传失败，R2未返回数据" };
      }
      return { data: uploadRes.data };
    })
    .catch(function (err) {
      return { error: "内容处理发生错误", detail: err.message };
    });
}

// ==== 调用入口 ====
const testImageUrl = "https://qingliu-obs.obs.cn-north-1.myhuaweicloud.com/documents/data/invite/13569E7/27288222-7e5c-4bfd-ab52-ba564ac911b5.jpg";
const fileName = "filename.jpg";

return uploadFileToR2(testImageUrl, fileName)
  .then(function (result) {
    console.log(result);
    return result;
  });
