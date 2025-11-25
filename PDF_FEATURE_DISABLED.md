# PDF 功能暂时禁用说明

## 修改说明

根据需求，PDF 导出功能在本版本中暂时禁用，但代码完整保留以供后续使用。

## 修改内容

### 隐藏的功能

在 `src/components/TemplatePage/TemplatePage.tsx` 中：

- **第 741-749 行**：注释掉了 PDF 导出按钮
  - 原按钮位于顶部工具栏的"刷新画布"按钮之前
  - 按钮图标：`<IconDownload />`
  - 功能：打开 PDF 导出设置对话框

### 保留的代码

以下代码仍然完整保留，未做删除：

1. **PDF 导出逻辑**（第 609-697 行）
   - `handleExportPdf` 函数
   - 支持下载 PDF 到本地
   - 支持上传 PDF 到附件字段

2. **PDF 导出 Modal**（第 925-954 行）
   - 导出设置对话框
   - 附件字段选择器

3. **状态管理**
   - `showExportModal`：控制 Modal 显示
   - `pdfAttachmentFieldId`：选择的附件字段
   - `exportingPdf`：导出中状态
   - `lastPrintTimestamp`：最后打印时间

4. **相关依赖**
   - `@react-pdf/renderer` 包
   - PDF 组件（`src/components/PdfExport/`）
   - PDF 工具函数（`src/utils/pdf*.ts`）

## 如何重新启用

如果后续版本需要启用 PDF 导出功能，只需：

1. 打开 `src/components/TemplatePage/TemplatePage.tsx`
2. 找到第 741-749 行的注释
3. 取消注释即可

```typescript
// 取消注释这段代码即可恢复 PDF 导出功能
<Tooltip content="导出 / 上传 PDF">
  <Button
    icon={<IconDownload />}
    type="tertiary"
    onClick={() => setShowExportModal(true)}
  />
</Tooltip>
```

## 用户界面变化

- **修改前**：顶部工具栏显示"导出/上传 PDF"按钮（下载图标）
- **修改后**：该按钮被隐藏，用户看不到 PDF 相关功能

## 其他功能不受影响

以下功能正常工作：
- ✅ 刷新画布
- ✅ 撤销/重做
- ✅ 模板编辑
- ✅ 字段编辑
- ✅ 评论功能
- ✅ 数据同步

## 注意事项

1. PDF 相关的 npm 包仍在 `package.json` 中，未删除
2. PDF 相关的源代码文件仍然存在
3. 如果需要完全移除 PDF 功能（减小打包体积），需要：
   - 删除 `src/components/PdfExport/` 目录
   - 删除 `src/utils/pdf*.ts` 文件
   - 从 `package.json` 中移除 `@react-pdf/renderer` 相关包
   - 删除 `public/fonts/` 下的字体文件
   - 从 `TemplatePage.tsx` 中移除所有 PDF 相关代码

## 修改日期

2025-11-25

## 相关文件

- `src/components/TemplatePage/TemplatePage.tsx`（已修改）

