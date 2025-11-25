# PDF 导出模块

基于 @react-pdf/renderer 实现的 PDF 文本导出功能，支持中文、图片、超链接。

## 功能特性

- ✅ 真正的文本 PDF（非图片截图）
- ✅ 支持中文显示（使用 Noto Sans SC 字体）
- ✅ 支持富文本超链接
- ✅ 支持图片渲染
- ✅ 支持复杂表格布局
- ✅ 支持循环区域（关联记录列表）
- ✅ 保留所有模板元素类型

## 文件结构

```
src/
├── components/PdfExport/
│   ├── PdfDocument.tsx          # 主入口组件
│   ├── PdfTextElement.tsx       # 文本元素
│   ├── PdfFieldElement.tsx      # 字段元素
│   ├── PdfTableElement.tsx      # 表格元素
│   ├── PdfLoopArea.tsx          # 循环区域
│   ├── PdfImageElement.tsx      # 图片元素
│   ├── PdfLinkElement.tsx       # 链接元素
│   ├── PdfRichText.tsx          # 富文本组件
│   ├── pdfStyles.ts             # PDF 样式配置
│   └── README.md                # 本文件
├── utils/
│   ├── pdfDataMapper.ts         # 数据映射工具
│   └── pdfFonts.ts              # 字体注册
└── public/fonts/
    ├── NotoSansSC-Regular.otf   # 中文常规字体
    └── NotoSansSC-Bold.otf      # 中文粗体字体
```

## 使用方法

在 `TemplatePage.tsx` 中：

```tsx
import { pdf } from '@react-pdf/renderer';
import { PdfDocument } from '../PdfExport/PdfDocument';

const blob = await pdf(
  <PdfDocument 
    template={selectedTemplate}
    record={record}
    fields={fields}
    table={table}
    printTimestamp={now}
  />
).toBlob();

// 下载或上传
```

## 样式配置

PDF 样式在 `pdfStyles.ts` 中定义：

- **页面尺寸**: A4 (595 x 842 pt)
- **边距**: 上下 17mm，左右 12mm
- **字体**: Noto Sans SC
- **表格**: 带边框，表头居中，内容左对齐
- **超链接**: 蓝色下划线

## 支持的元素类型

### 1. 文本元素 (text)
固定文本，支持自定义字体大小、颜色、对齐方式。

### 2. 字段元素 (field)
显示多维表格字段值，支持：
- 富文本内容
- 超链接提取
- 特殊字段处理（标题、致敏物质等）

### 3. 表格元素 (table)
支持三种数据源：
- `static`: 使用配置的静态行
- `dynamic`: 使用当前记录字段
- `loop`: 使用循环记录列表

### 4. 循环区域 (loop)
渲染关联记录列表，支持：
- 筛选条件
- 嵌套表格
- 递归渲染模板元素

### 5. 图片元素 (image)
从附件字段加载图片，支持：
- 单个或多个图片
- URL 或 base64
- 自动缩放

### 6. 链接元素 (link)
渲染超链接，支持：
- 单个链接
- 链接列表
- 自定义显示文本

## 数据映射

`pdfDataMapper.ts` 提供以下工具函数：

### parseRichText()
解析富文本内容，提取文本和链接：

```typescript
const segments = parseRichText(value, fieldType);
// [{ type: 'text', text: '...' }, { type: 'link', text: '...', url: '...' }]
```

### getLoopRecords()
获取循环区域的关联记录：

```typescript
const { records, fields, linkedTable } = await getLoopRecords(
  table, record, fieldId, filter
);
```

### getImageUrls()
从附件字段提取图片 URL：

```typescript
const urls = await getImageUrls(value);
```

## 已知限制

1. **图片跨域问题**: 飞书附件需要临时下载链接，可能存在跨域限制
2. **字体文件大小**: Noto Sans SC 字体文件较大（~16MB），可能影响加载速度
3. **复杂布局**: React-PDF 不支持绝对定位，复杂布局可能与预览有差异
4. **分页控制**: PDF 自动分页，不能像图片方式那样精确控制分页位置

## 调试技巧

1. **字体加载失败**: 检查 `/fonts/` 目录是否有字体文件
2. **中文显示为方框**: 确保 `pdfFonts.ts` 已被正确导入
3. **链接无法点击**: 检查 URL 格式是否正确（需要 http:// 或 https://）
4. **表格样式错误**: 检查列宽计算和边框样式配置
5. **循环数据为空**: 检查关联字段ID和筛选条件是否正确

## 性能优化

1. **预加载循环数据**: `PdfDocument` 组件会预先加载所有循环区域数据
2. **懒加载图片**: 图片使用 URL 引用，不会全部加载到内存
3. **样式复用**: 使用 `StyleSheet.create` 创建可复用样式

## 未来改进

- [ ] 支持自定义字体
- [ ] 支持更多字段类型（附件、人员等）
- [ ] 优化大数据量场景
- [ ] 添加进度提示
- [ ] 支持页眉页脚
- [ ] 支持水印

