# API 文档

## 📋 目录
- [核心 Hooks](#核心-hooks)
- [工具函数](#工具函数)
- [组件 API](#组件-api)
- [类型定义](#类型定义)
- [飞书 SDK 常用 API](#飞书-sdk-常用-api)

---

## 核心 Hooks

### useTableData

读取和管理多维表格数据

```typescript
function useTableData(tableId: string): {
  records: IRecord[];
  fields: IFieldMeta[];
  loading: boolean;
  error: Error | null;
  reload: () => Promise<void>;
}
```

**参数**:
- `tableId`: 表格ID

**返回值**:
- `records`: 记录列表
- `fields`: 字段元数据列表
- `loading`: 加载状态
- `error`: 错误信息
- `reload`: 重新加载数据函数

**示例**:
```typescript
function MyComponent() {
  const { records, fields, loading } = useTableData('tblXXXXX');
  
  if (loading) return <Loading />;
  
  return (
    <div>
      {records.map(record => (
        <div key={record.recordId}>
          {/* 渲染记录 */}
        </div>
      ))}
    </div>
  );
}
```

---

### useChangeTracking

追踪字段修改

```typescript
function useChangeTracking(): {
  changes: Map<string, FieldChange>;
  trackChange: (recordId: string, fieldId: string, oldValue: any, newValue: any) => void;
  undoChange: (key: string) => void;
  clearChanges: () => void;
  getPendingChanges: () => FieldChange[];
  changeCount: number;
}
```

**返回值**:
- `changes`: 所有变更的 Map
- `trackChange`: 记录一个变更
- `undoChange`: 撤销某个变更
- `clearChanges`: 清除所有变更
- `getPendingChanges`: 获取待同步的变更
- `changeCount`: 变更数量

**FieldChange 类型**:
```typescript
interface FieldChange {
  recordId: string;
  fieldId: string;
  oldValue: any;
  newValue: any;
  timestamp: number;
  status: 'pending' | 'synced' | 'failed';
}
```

**示例**:
```typescript
function FieldEditor({ recordId, fieldId, value }) {
  const { trackChange } = useChangeTracking();
  
  const handleChange = (newValue: any) => {
    trackChange(recordId, fieldId, value, newValue);
  };
  
  return (
    <input 
      defaultValue={value} 
      onChange={(e) => handleChange(e.target.value)} 
    />
  );
}
```

---

### useDocumentSync

同步修改到多维表格

```typescript
function useDocumentSync(tableId: string): {
  syncChanges: (changes: FieldChange[]) => Promise<boolean>;
  syncing: boolean;
  syncResult: SyncResult | null;
}
```

**参数**:
- `tableId`: 目标表格ID

**返回值**:
- `syncChanges`: 执行同步函数
- `syncing`: 同步进行中状态
- `syncResult`: 同步结果

**SyncResult 类型**:
```typescript
interface SyncResult {
  success: boolean;
  count?: number;
  error?: string;
  timestamp: number;
}
```

**示例**:
```typescript
function SyncButton() {
  const { getPendingChanges } = useChangeTracking();
  const { syncChanges, syncing } = useDocumentSync('tblXXXX');
  
  const handleSync = async () => {
    const changes = getPendingChanges();
    const success = await syncChanges(changes);
    
    if (success) {
      Toast.success('同步成功！');
    } else {
      Toast.error('同步失败');
    }
  };
  
  return (
    <Button onClick={handleSync} loading={syncing}>
      同步到表格
    </Button>
  );
}
```

---

### useCommentSystem

评论系统管理

```typescript
function useCommentSystem(tableId: string): {
  comments: Map<string, Comment[]>;
  addComment: (recordId: string, fieldId: string, content: string) => Promise<void>;
  replyComment: (parentComment: Comment, content: string) => Promise<void>;
  resolveComment: (commentId: string, key: string) => void;
  getFieldComments: (recordId: string, fieldId: string) => Comment[];
}
```

**Comment 类型**:
```typescript
interface Comment {
  id: string;
  recordId: string;
  fieldId: string;
  content: string;
  author: string;
  authorId: string;
  timestamp: number;
  resolved: boolean;
  parentId?: string;
}
```

**示例**:
```typescript
function CommentPanel({ recordId, fieldId }) {
  const { getFieldComments, addComment } = useCommentSystem('tblXXXX');
  const [content, setContent] = useState('');
  
  const comments = getFieldComments(recordId, fieldId);
  
  const handleSubmit = async () => {
    await addComment(recordId, fieldId, content);
    setContent('');
  };
  
  return (
    <div>
      {comments.map(comment => (
        <CommentItem key={comment.id} comment={comment} />
      ))}
      <Input value={content} onChange={setContent} />
      <Button onClick={handleSubmit}>提交评论</Button>
    </div>
  );
}
```

---

### useFieldMeta

字段元数据管理

```typescript
function useFieldMeta(tableId: string): {
  fieldMap: Map<string, IFieldMeta>;
  getFieldType: (fieldId: string) => FieldType | null;
  isFieldEditable: (fieldId: string) => boolean;
  getFieldName: (fieldId: string) => string;
}
```

**返回值**:
- `fieldMap`: 字段 ID 到元数据的映射
- `getFieldType`: 获取字段类型
- `isFieldEditable`: 判断字段是否可编辑
- `getFieldName`: 获取字段名称

**示例**:
```typescript
function FieldRenderer({ fieldId, value }) {
  const { getFieldType, isFieldEditable } = useFieldMeta('tblXXXX');
  
  const fieldType = getFieldType(fieldId);
  const editable = isFieldEditable(fieldId);
  
  if (!editable) {
    return <div className="readonly">{formatValue(value, fieldType)}</div>;
  }
  
  return <FieldEditor type={fieldType} value={value} />;
}
```

---

## 工具函数

### formatFieldValue

格式化字段值用于显示

```typescript
function formatFieldValue(value: any, fieldType: FieldType): string
```

**参数**:
- `value`: 字段值
- `fieldType`: 字段类型

**返回**: 格式化后的字符串

**示例**:
```typescript
const displayValue = formatFieldValue(cellValue, FieldType.DateTime);
// → "2025-11-23 14:30"
```

---

### parseFieldValue

解析用户输入为字段值

```typescript
function parseFieldValue(input: string, fieldType: FieldType): any
```

**参数**:
- `input`: 用户输入的字符串
- `fieldType`: 目标字段类型

**返回**: 解析后的字段值

**示例**:
```typescript
const fieldValue = parseFieldValue("2025-11-23", FieldType.DateTime);
// → 1700697600000 (timestamp)
```

---

### saveDraft / loadDraft

草稿自动保存

```typescript
function saveDraft(key: string, data: any): void
function loadDraft(key: string): any | null
function removeDraft(key: string): void
```

**示例**:
```typescript
// 保存草稿
saveDraft('rec123:fld456', { value: 'draft content' });

// 加载草稿
const draft = loadDraft('rec123:fld456');

// 删除草稿
removeDraft('rec123:fld456');
```

---

### saveComment / loadComments

评论存储

```typescript
function saveCommentToStorage(tableId: string, comment: Comment): void
function loadCommentsFromStorage(tableId: string): Comment[]
```

**示例**:
```typescript
// 保存评论
saveCommentToStorage('tblXXXX', {
  id: 'cmt123',
  recordId: 'rec456',
  fieldId: 'fld789',
  content: '这里需要修改',
  author: '张三',
  timestamp: Date.now(),
  resolved: false
});

// 加载所有评论
const comments = loadCommentsFromStorage('tblXXXX');
```

---

### detectConflicts

检测同步冲突

```typescript
async function detectConflicts(
  tableId: string,
  changes: FieldChange[]
): Promise<ConflictInfo[]>
```

**ConflictInfo 类型**:
```typescript
interface ConflictInfo {
  recordId: string;
  fieldId: string;
  ourValue: any;      // 我们的修改
  theirValue: any;    // 他人的修改
  baseValue: any;     // 原始值
}
```

**示例**:
```typescript
const conflicts = await detectConflicts('tblXXXX', pendingChanges);

if (conflicts.length > 0) {
  // 显示冲突解决 UI
  showConflictDialog(conflicts);
}
```

---

## 组件 API

### DocumentRenderer

文档渲染器

```typescript
interface DocumentRendererProps {
  records: IRecord[];
  fields: IFieldMeta[];
  changes: Map<string, FieldChange>;
  comments: Map<string, Comment[]>;
  onFieldEdit: (recordId: string, fieldId: string, value: any) => void;
  onFieldComment: (recordId: string, fieldId: string) => void;
}

function DocumentRenderer(props: DocumentRendererProps): JSX.Element
```

**示例**:
```typescript
<DocumentRenderer
  records={records}
  fields={fields}
  changes={changes}
  comments={comments}
  onFieldEdit={handleFieldEdit}
  onFieldComment={handleFieldComment}
/>
```

---

### FieldEditor

字段编辑器

```typescript
interface FieldEditorProps {
  type: FieldType;
  value: any;
  onChange: (value: any) => void;
  onSave: () => void;
  onCancel: () => void;
  disabled?: boolean;
}

function FieldEditor(props: FieldEditorProps): JSX.Element
```

**支持的字段类型**:
- `FieldType.Text`: 文本输入框
- `FieldType.Number`: 数字输入框
- `FieldType.DateTime`: 日期时间选择器
- `FieldType.SingleSelect`: 单选下拉框
- `FieldType.MultiSelect`: 多选下拉框
- `FieldType.Checkbox`: 复选框

**示例**:
```typescript
<FieldEditor
  type={FieldType.Text}
  value={currentValue}
  onChange={setValue}
  onSave={handleSave}
  onCancel={handleCancel}
/>
```

---

### SyncPanel

同步面板

```typescript
interface SyncPanelProps {
  changes: FieldChange[];
  onSync: () => Promise<void>;
  onCancel: () => void;
  syncing: boolean;
}

function SyncPanel(props: SyncPanelProps): JSX.Element
```

**示例**:
```typescript
<SyncPanel
  changes={pendingChanges}
  onSync={handleSync}
  onCancel={handleCancel}
  syncing={syncing}
/>
```

---

### CommentPanel

评论面板

```typescript
interface CommentPanelProps {
  recordId: string;
  fieldId: string;
  comments: Comment[];
  onAddComment: (content: string) => Promise<void>;
  onResolve: (commentId: string) => void;
}

function CommentPanel(props: CommentPanelProps): JSX.Element
```

**示例**:
```typescript
<CommentPanel
  recordId="rec123"
  fieldId="fld456"
  comments={fieldComments}
  onAddComment={handleAddComment}
  onResolve={handleResolve}
/>
```

---

## 类型定义

### 核心类型

```typescript
// 记录类型（来自飞书 SDK）
interface IRecord {
  recordId: string;
  fields: Record<string, any>;
}

// 字段元数据类型（来自飞书 SDK）
interface IFieldMeta {
  id: string;
  name: string;
  type: FieldType;
  property?: any;
  description?: string;
  isMultiple?: boolean;
}

// 字段类型枚举（来自飞书 SDK）
enum FieldType {
  Text = 1,
  Number = 2,
  SingleSelect = 3,
  MultiSelect = 4,
  DateTime = 5,
  Checkbox = 7,
  User = 11,
  Phone = 13,
  Url = 15,
  Attachment = 17,
  SingleLink = 18,
  DuplexLink = 21,
  Location = 22,
  Formula = 20,
  Lookup = 23,
  CreatedTime = 1001,
  ModifiedTime = 1002,
  CreatedUser = 1003,
  ModifiedUser = 1004,
  AutoNumber = 1005,
}
```

### 应用类型

```typescript
// 字段变更
interface FieldChange {
  recordId: string;
  fieldId: string;
  oldValue: any;
  newValue: any;
  timestamp: number;
  status: 'pending' | 'synced' | 'failed';
}

// 评论
interface Comment {
  id: string;
  recordId: string;
  fieldId: string;
  content: string;
  author: string;
  authorId: string;
  timestamp: number;
  resolved: boolean;
  parentId?: string;
}

// 同步结果
interface SyncResult {
  success: boolean;
  count?: number;
  error?: string;
  timestamp: number;
}

// 冲突信息
interface ConflictInfo {
  recordId: string;
  fieldId: string;
  ourValue: any;
  theirValue: any;
  baseValue: any;
}
```

---

## 飞书 SDK 常用 API

### 基础 API

```typescript
import { bitable } from '@lark-base-open/js-sdk';

// 获取当前激活的表格
const table = await bitable.base.getActiveTable();

// 通过ID获取表格
const table = await bitable.base.getTable('tblXXXX');

// 获取表格名称
const tableName = await table.getName();

// 获取所有字段元数据
const fields = await table.getFieldMetaList();

// 获取所有记录
const recordList = await table.getRecords({
  pageSize: 5000
});

// 获取单元格值
const value = await table.getCellValue(fieldId, recordId);

// 设置单元格值
await table.setCellValue(fieldId, recordId, value);

// 批量更新记录
await table.setRecords([
  { recordId: 'rec1', fields: { fld1: 'value1' } },
  { recordId: 'rec2', fields: { fld2: 'value2' } }
]);

// 添加记录
await table.addRecord({ fields: { fld1: 'value1' } });

// 批量添加记录
await table.addRecords([
  { fields: { fld1: 'value1' } },
  { fields: { fld2: 'value2' } }
]);

// 删除记录
await table.deleteRecord(recordId);

// 批量删除记录
await table.deleteRecords([recordId1, recordId2]);
```

### 字段操作

```typescript
// 通过ID获取字段
const field = await table.getFieldById(fieldId);

// 获取字段元数据
const fieldMeta = await field.getMeta();

// 获取字段类型特定信息
const textField = await table.getField<ITextField>(fieldId);
const numberField = await table.getField<INumberField>(fieldId);

// 根据类型获取字段列表
const textFields = await table.getFieldMetaListByType<ITextFieldMeta>(
  FieldType.Text
);
```

### 事件监听

```typescript
// 监听记录添加
const unsubscribe = await bitable.base.onRecordAdd((event) => {
  console.log('新增记录:', event.data.recordId);
});

// 监听记录修改
await bitable.base.onRecordModify((event) => {
  console.log('修改记录:', event.data.recordId);
});

// 监听记录删除
await bitable.base.onRecordDelete((event) => {
  console.log('删除记录:', event.data.recordId);
});

// 监听选中状态变化
await bitable.base.onSelectionChange((event) => {
  console.log('选中变化:', event.data);
});

// 取消监听
unsubscribe();
```

### 用户信息

```typescript
// 获取当前用户信息
const userInfo = await bitable.bridge.getUserInfo();
// { name: '张三', userId: 'ou_xxx', avatarUrl: '...' }

// 获取主题
const theme = await bitable.bridge.getTheme();
// 'LIGHT' | 'DARK'

// 监听主题变化
bitable.bridge.onThemeChange((event) => {
  console.log('主题变化:', event.data.theme);
});
```

### 权限检查

```typescript
// 检查权限
const permission = await table.checkPermission({
  type: 'record',
  operation: 'create' | 'read' | 'update' | 'delete'
});

if (permission.status) {
  // 有权限，可以执行操作
}
```

---

## 错误处理

### 通用错误处理模式

```typescript
async function safeOperation<T>(
  operation: () => Promise<T>,
  errorMessage: string
): Promise<T | null> {
  try {
    return await operation();
  } catch (error: any) {
    console.error(errorMessage, error);
    Toast.error(`${errorMessage}: ${error.message}`);
    return null;
  }
}

// 使用示例
const records = await safeOperation(
  () => table.getRecords({ pageSize: 5000 }),
  '获取记录失败'
);
```

### 常见错误

```typescript
// 权限不足
Error: Permission denied

// 字段不存在
Error: Field not found

// 记录不存在
Error: Record not found

// 值类型不匹配
Error: Invalid value type
```

---

**文档版本**: v1.0  
**创建日期**: 2025-11-23  
**最后更新**: 2025-11-23

