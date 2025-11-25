# 增加权限

该接口用于根据 filetoken 给用户增加文档的权限。

## 请求

基本 | 
---|---
HTTP URL | https://open.feishu.cn/open-apis/drive/permission/member/create
HTTP Method | POST
权限要求<br>**调用该 API 所需的权限。开启其中任意一项权限即可调用**<br>开启任一权限即可 | 查看、评论、编辑和管理云空间中所有文件<br>上传、下载文件到云空间<br>查看、评论、编辑和管理文档<br>查看、评论、编辑和管理表格

### 请求头

名称 | 类型 | 必填 | 描述
---|---|---|---
Authorization | string | 是 | `user_access_token` 或 `tenant_access_token`<br>**值格式**："Bearer `access_token`"<br>**示例值**："Bearer u-7f1bcd13fc57d46bac21793a18e560"<br>[了解更多：获取与使用access_token](https://open.feishu.cn/document/ukTMukTMukTM/uMTNz4yM1MjLzUzM)
Content-Type | string | 是 | **固定值**："application/json; charset=utf-8"

使用 `tenant_access_token` 前，请确保该应用是文档的协作者或所有者，否则会报无权限错误。目前有以下方式可使应用有权限：<br>

1. 使用 `tenant_access_token` 创建文档，此时文档的所有者为应用；<br>
2. 如果是使用 `user_access_token` 创建的文档，需要使用 `user_access_token` 调用本接口，把应用加为协作者。<br>

<br>

### 请求体
|参数|类型|必须|说明|
|--|-----|--|----|
|token|string|是|文件的 token，获取方式见 [对接前说明](https://open.feishu.cn/document/ukTMukTMukTM/uczNzUjL3czM14yN3MTN)的第 4 项|
|type|string|是|文档类型  "doc" 、"sheet" 、 "bitable" or "file"|
|members||是|用户|
|&ensp;∟member_type|string|是|用户类型，可选 **email 、openid、openchat、userid**|
|&ensp;∟member_id|string|是|用户类型下的值|
|&ensp;∟perm|string|是|需要增加的权限，权限值："view"，"edit"|
|notify_lark|bool|否|添加权限后是否飞书/lark通知对方<br>true 通知 or false 不通知|
### 请求体示例
```json
{
	"token": "doccnBKgoMyY5OMbUG6FioTXuBe",
	"type": "doc",
	"members": [
		{
			"member_type": "openid",
			"member_id": "string",
			"perm": "view"
		}
	]
}
```

## 响应

### 响应体
|参数|说明|
|--|--|
|is_all_success|是否全部成功|
|fail_members|添加权限失败的用户信息|
|&ensp;∟member_type|用户类型|
|&ensp;∟member_id|用户类型下的值|
|&ensp;∟perm|需要增加的权限|

### 响应体示例  
```json
{
    "code": 0,
    "data": {
        "is_all_success": false,
        "fail_members": [
            {
                "member_type": "openid",
                "member_id": "string",
                "perm": "view"
            }
        ]
    },
    "msg": "Success"
}
```

### 错误码

具体可参考：[服务端错误码说明](https://open.feishu.cn/document/ukTMukTMukTM/ugjM14COyUjL4ITN)