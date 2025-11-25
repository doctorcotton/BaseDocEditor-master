# Bug 修复：PDF 只显示"加载中..."

## 问题描述
用户导出 PDF 时，只看到"加载中..."三个字，没有实际文档内容。

## 根本原因
React-PDF 的 `pdf()` 函数是**同步渲染**的，不支持在组件内部使用 `useState` 和 `useEffect` 进行异步数据加载。

原代码在 `PdfDocument` 组件内部尝试异步加载循环区域数据：

```tsx
// ❌ 错误做法
const [loading, setLoading] = useState(true);

useEffect(() => {
  loadAllLoopData().then(() => setLoading(false));
}, []);

if (loading) {
  return <Document><Page><Text>加载中...</Text></Page></Document>;
}
```

问题是 `pdf().toBlob()` 会立即渲染组件，此时 `loading` 仍然是 `true`，所以只渲染了"加载中..."状态，然后就结束了。

## 解决方案

### 1. 创建预加载工具 (`src/utils/pdfLoader.ts`)
在调用 `pdf()` **之前**完成所有数据加载：

```typescript
export async function preloadLoopData(
  template: Template,
  record: IRecord,
  table: any
): Promise<Map<string, LoopDataCache>> {
  const cache = new Map();
  
  for (const element of template.elements) {
    if (element.type === 'loop') {
      const loopData = await getLoopRecords(table, record, fieldId, filter);
      cache.set(element.id, loopData);
    }
  }
  
  return cache;
}
```

### 2. 简化 `PdfDocument` 组件
移除异步逻辑，改为接收预加载的数据：

```tsx
interface PdfDocumentProps {
  template: Template;
  record: IRecord;
  fields: IFieldMeta[];
  table: any;
  printTimestamp?: string;
  loopDataCache?: Map<string, LoopDataCache>; // 👈 预加载的数据
}

export const PdfDocument: React.FC<PdfDocumentProps> = ({
  loopDataCache = new Map()  // 👈 使用预加载的数据
}) => {
  // 直接渲染，无需 useState/useEffect
  return (
    <Document>
      <Page>
        {template.elements.map(element => renderElement(element))}
      </Page>
    </Document>
  );
};
```

### 3. 更新导出逻辑 (`TemplatePage.tsx`)
先预加载数据，再生成 PDF：

```tsx
const handleExportPdf = async () => {
  // ✅ 正确做法：先预加载
  const loopDataCache = await preloadLoopData(selectedTemplate, record, table);
  
  // 然后生成 PDF（同步渲染）
  const blob = await pdf(
    <PdfDocument 
      template={selectedTemplate}
      record={record}
      fields={fields}
      table={table}
      loopDataCache={loopDataCache}  // 👈 传入预加载的数据
    />
  ).toBlob();
};
```

## 关键改进

1. **数据预加载**：所有异步操作在 `pdf()` 调用之前完成
2. **同步渲染**：`PdfDocument` 组件变为纯函数组件，无副作用
3. **日志追踪**：添加详细的 console.log 便于调试

## 测试验证

运行后应该看到以下日志：

```
[TemplatePage] 开始预加载循环数据...
[pdfLoader] 开始预加载循环数据...
[pdfLoader] 加载循环区域 loop-1, fieldId: fldXXX
[pdfLoader] 循环区域 loop-1 加载成功，记录数: 5
[pdfLoader] 预加载完成，共 1 个循环区域
[TemplatePage] 循环数据预加载完成
[TemplatePage] 开始生成 PDF...
[TemplatePage] PDF 生成成功
```

## 影响范围
- ✅ 修复了 PDF 只显示"加载中..."的问题
- ✅ 现在可以正常导出包含循环区域的完整文档
- ✅ 无需修改其他组件（PdfLoopArea、PdfTableElement 等）
- ✅ 保持向后兼容（无循环区域的模板仍然正常工作）

## 相关文件
- `src/components/PdfExport/PdfDocument.tsx` - 简化为同步组件
- `src/utils/pdfLoader.ts` - 新增预加载工具
- `src/components/TemplatePage/TemplatePage.tsx` - 更新导出逻辑

