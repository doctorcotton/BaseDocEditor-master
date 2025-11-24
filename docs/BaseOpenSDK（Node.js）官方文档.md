https://feishu.feishu.cn/sync/TutsdK77Zs4IdwbfLiyccDpUnKg

安装
npm
npm i -S @lark-base-open/node-sdk
yarn 
yarn add @lark-base-open/node-sdk

如何使用
提供 ECMAScript，CommonJS 2个版本，支持原生 Javascript 和 Typescript 的使用，示例均以 Typescript 为例。
ECMAScript
import { BaseClient } from '@lark-base-open/node-sdk';
CommonJS
const { BaseClient } = require('@lark-base-open/node-sdk');

API 调用
SDK 提供了语义化的调用方式，只需要提供相关参数创建 client 实例，接着使用其上的语义化方法client.[业务域].[资源].[方法]即可完成 API 调用，调用过程及调用结果均有完备的类型进行提示。例如列出 Base 数据表记录：
import { BaseClient } from '@lark-base-open/node-sdk';

// 新建 BaseClient，填上需要操作的 Base 文档对应的 appToken 和 personalBaseToken
const client = new BaseClient({
  appToken: 'xxx',
  personalBaseToken: 'xxx'
});

// 列出数据表记录
const res = await client.base.appTableRecord.list({
  // 路径参数。我们会自动为你填充 app_token（appToken）参数，你无需手动添加
  path: {
    table_id: 'tblxxxxxx'
  },
  // 查询参数
  params: {
    page_size: 10,
  },
});
接口对应的 Http 参数说明：
接口参数名
描述
path
Http 请求路径参数
params
Http 请求查询参数
data
Http 请求体

BaseClient构造参数：
参数
描述
类型
必须
默认
appToken
Base 文档的唯一标识，从 Base 网页的路径参数获取 /base/:app_token
string

是
-
personalBaseToken
Base 文档授权码。从 Base 网页端 获取（如下图）
string
是
-
domain
应用的域，分为飞书、Lark
Domain
否
Domain.Feishu
httpInstance
SDK 发送请求的 http 实例。SDK 内部默认使用axios.create()构造出一个 defaultHttpInstance来进行 http调用。
HttpInstance
否
defaultHttpInstance
loggerLevel
日志级别
LoggerLevel
否
info
logger
-
Logger
否
-
[图片]

分页
针对返回值以分页形式呈现的接口，对其提供了迭代器方式的封装（方法名后缀为WithIterator），提高易用性，消弭了根据 page_toke n来反复获取数据的繁琐操作，如获取数据表记录列表：
// 每次处理20条数据
for await (const data of await client.base.appTableRecord.listWithIterator({
  params: {
    page_size: 20,
  },
  path: {
    table_id: TABLEID
  }
})) {
  console.log(data.items);
}
当然也可以使用无迭代器封装的版本，这时候需要自己每次根据返回的 page_token 来手动进行分页调用。

附件上传
和调用普通 API 的方式一样，按类型提示传递参数即可，内部封装了对文件上传的处理。
const filePath = path.resolve(__dirname, 'file.jpeg')

const data = await client.drive.media.uploadAll({
  data: {
    file_name: 'file.png', // 文件名
    parent_type: 'bitable_image', // 附件为图片传 'bitable_image'，为文件传 'bitable_file'
    parent_node: client.appToken, // 填写 appToken
    size: fs.statSync(filePath).size, // 文件大小
    file: fs.createReadStream(filePath), // 文件流
  }
})
const fileToken = data.file_token;
上传附件后添加到新建记录的附件字段
await client.base.appTableRecord.create({
  path: {
    table_id: TABLEID
  },
  data: {
    fields: {
      ['附件']: [{
        "file_token": fileToken // 👆🏻前面接口返回的 fileToken
      }]
    }
  }
})

附件下载
对返回的二进制流进行了封装，消弭了对流本身的处理，只需调用 writeFile方法即可将数据写入文件，如：
const response = await client.drive.media.download({
  path: { file_token: 'xxx' },
  // 如果 Base 开启了高级权限，则需要填写 extra 参数，否则不用传。
  params: { extra: JSON.stringify({
    "bitablePerm": {
      "tableId": 'tblxxx', // 附件所在数据表Id
      "attachments": {
        "fldxxxxxxx": { // 附件字段 Id
            "recxxxxxxx": [ // 附件所在记录Id
              "xxx" // 附件 file_token
            ]
        }
      }
    }
  }) }  
})
// 保存到本地 file.png 文件
await response.writeFile(path.resolve(__dirname, 'file.png'));

普通调用
可以使用 client 上的 request 方法手动调用业务接口，我们同样帮你处理好了鉴权逻辑：
import { BaseClient } from '@lark-base-open/node-sdk';

const client = new BaseClient({
  appToken: 'xxx',
  personalBaseToken: 'xxx'
});

// request 接口
const res = await client.request({
  method: 'POST',
  url: 'xxx',
  data: {},
  params: {},
});
https://feishu.feishu.cn/sync/HmqHdmIXbswu4xbNd9gc7oqDnUe
示例
一、批量查找替换多行文本
import { BaseClient } from '@lark-base-open/node-sdk';

// 新建 BaseClient，填写需要操作的 appToken 和 personalBaseToken
const client = new BaseClient({
  appToken: 'xxx',
  personalBaseToken: 'xxx'
});

const TABLEID = 'xxx';

interface IRecord {
  record_id: string;
  fields: Record<string, any>
}

// 查找替换
async function searchAndReplace(from: string, to: string) {
  // 获取当前表的字段信息
  const res = await client.base.appTableField.list({
    params: {
      page_size: 100,
    },
    path: {
      table_id: TABLEID,
    }
  });
  const fields = res?.data?.items || [];
  // 文本列
  const textFieldNames = fields.filter(field => field.ui_type === 'Text').map(field => field.field_name);

  // 遍历记录
  for await (const data of await client.base.appTableRecord.listWithIterator({ params: { page_size: 50 }, path: { table_id: TABLEID } })) {
    const records = data?.items || [];
    const newRecords: IRecord[] = [];
    for (const record of records) {
      const { record_id, fields } = record || {};
      const entries = Object.entries<string>(fields);
      const newFields: Record<string, string> = {};
      for (const [key, value] of entries) {
        // 替换多行文本字段值
        if ((textFieldNames.includes(key)) && value) {
          const newValue = value.replace(new RegExp(from, 'g'), to);
          // 把需要替换的字段加入 newFields
          newValue !== value && (newFields[key] = newValue);
        }
      }
      // 需要替换的记录加入 newRecords
      Object.keys(newFields).length && newRecords.push({
        record_id,
        fields: newFields,
      })
    }

    // 批量更新记录
    await client.base.appTableRecord.batchUpdate({
      path: {
        table_id: TABLEID,
      },
      data: {
        records: newRecords
      }
    })
  }
  console.log('success')
}

searchAndReplace('abc', '23333333');

console.log('start')

二、将链接字段对应的文件传到附件字段
import { BaseClient } from '@lark-base-open/node-sdk';
import axios from 'axios';
import { Readable } from 'stream';
import path from 'path'

// 新建 BaseClient，填入 appToken 和 personalBaseToken
const client = new BaseClient({
  appToken: 'xxx',
  personalBaseToken: 'xxx'
});

const TABLEID = 'xxx';
const LINK_FIELD_NAME = '链接'
const ATTACHMENT_FIELD_NAME = '附件'

async function downloadLinkAndUploadToAttachment() {
  // Step 1. 遍历记录
  const recordsIterator = client.base.appTableRecord.listWithIterator({
    path: { table_id: TABLEID },
    params: { page_size: 50 },
  });
  const updatedRecords = [];
  for await (const recordBatch of await recordsIterator) {
    for (const record of recordBatch.items) {
      // Step 2. 拿到链接字段值
      const imageUrl = record.fields[LINK_FIELD_NAME]?.link;
      if (imageUrl) {
        // Step 3 : 下载图片
        const imageResponse = await axios.get(imageUrl, { responseType: 'arraybuffer' });
        const imageBuffer = Buffer.from(imageResponse.data, 'binary');
        // Step 4: 上传图片获取 file_token
        const uploadedImage = await client.drive.media.uploadAll({
          data: {
            file_name: 'image.png',
            parent_type: 'bitable_image',
            parent_node: client.appToken,
            size: imageBuffer.length,
            file: Readable.from(imageBuffer),
          },
        });
        const fileToken = uploadedImage.file_token;
        // Step 5: 更新到对应记录的附件字段
        updatedRecords.push({
          record_id: record.record_id,
          fields: {
            [ATTACHMENT_FIELD_NAME]: [{ file_token: fileToken }],
          },
        });
      }
    }
  }
  // Step 6: 批量更新记录
  const batchUpdateResponse = await client.base.appTableRecord.batchUpdate({
    path: { table_id: TABLEID },
    data: { records: updatedRecords },
  });
}

在 Replit 上使用服务端 SDK
我们提供了一个 Replit 模板，它使用 express.js 框架搭建了一个简单的服务器，监听了指定路径，当我们在 Base 上运行这个脚本，就会触发脚本函数的调用。
import express from 'express'
import { searchAndReplace } from './playground/search_and_replace'

const app = express()
const port = 3000

// http trigger
app.get('/search_and_replace', async (req, res) => {
  await searchAndReplace('abc', '23333333');
  res.send('success!!!')
});

app.get('/', async (req, res) => {
  res.send('hello world')
});

app.listen(port, () => {
  // Code.....
  console.log('Listening on port: ' + port)
})
上述代码监听/search_and_replace接口路径，并执我们的示例一中定义的函数，实现操作 Base 数据

方式一：在 Base Script 使用 Replit 链接触发脚本调用
1. 在 Replit 上 Fork 官方模板
2. 通过 Replit Secret 添加环境变量 APP_TOKEN、PERSONAL_BASE_TOKEN
3. 点击 Run 起 Replit 服务
4. 拷贝 replit 项目域名 + 接口路径，填入 Base Script，保存后点击运行即可触发服务端脚本
暂时无法在飞书文档外展示此内容

方式二：Replit 服务端直接运行脚本
如果你的项目无需手动触发，可以直接在 Replit 控制台运行脚本
npx vite-node ./playground/search_and_replace