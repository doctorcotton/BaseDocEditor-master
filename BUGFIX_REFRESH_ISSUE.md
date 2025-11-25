# 修复：标准变更记录表数据不刷新问题

## 问题描述

用户反馈：在"附表一：标准变更记录"中，当在多维表格中修改了字段内容后，画布上没有更新显示，但多维表格中的数据确实已经更新了。

## 问题根因

问题出在 `LoopTableRenderer` 和 `LoopAreaRenderer` 组件中：

1. **`LoopAreaRenderer`** 组件在 `useEffect` 中加载关联记录数据，但依赖项中没有包含 `refreshKey`，导致当 `refreshKey` 变化时不会重新加载数据。

2. **`LoopTableRenderer`** 组件同样在 `useEffect` 中加载字段值，依赖项中也没有包含 `refreshKey`。

3. **`TemplateRenderer`** 在渲染 `LoopAreaRenderer` 时没有传递 `refreshKey` 属性。

当用户在多维表格中修改"标准变更记录"表的数据后：
- `TemplatePage` 会通过 `setRefreshKey(prev => prev + 1)` 触发刷新
- 但 `LoopAreaRenderer` 和 `LoopTableRenderer` 没有监听 `refreshKey` 的变化
- 导致它们不会重新加载数据，画布显示的仍是旧数据

## 修复方案

### 1. 修改 `LoopAreaRenderer.tsx`

- 在 `LoopAreaRendererProps` 接口中添加 `refreshKey?: number` 属性
- 在组件的 props 解构中添加 `refreshKey`
- 在 `useEffect` 的依赖项数组中添加 `refreshKey`
- 在渲染 `LoopTableRenderer` 时传递 `refreshKey` 属性

```typescript
// 添加 refreshKey 到接口定义
interface LoopAreaRendererProps {
  // ... 其他属性
  refreshKey?: number; // 用于触发数据刷新
}

// 添加到 props 解构
export const LoopAreaRenderer: React.FC<LoopAreaRendererProps> = ({
  // ... 其他 props
  refreshKey
}) => {
  // ...
  
  // 添加到 useEffect 依赖项
  useEffect(() => {
    loadLinkedRecords();
  }, [fieldId, record.recordId, refreshKey]);
  
  // 传递给 LoopTableRenderer
  <LoopTableRenderer
    // ... 其他 props
    refreshKey={refreshKey}
  />
};
```

### 2. 修改 `LoopTableRenderer.tsx`

- 在 `LoopTableRendererProps` 接口中添加 `refreshKey?: number` 属性
- 在组件的 props 解构中添加 `refreshKey`
- 在加载字段值的 `useEffect` 依赖项数组中添加 `refreshKey`

```typescript
// 添加 refreshKey 到接口定义
interface LoopTableRendererProps {
  // ... 其他属性
  refreshKey?: number; // 用于触发数据刷新
}

// 添加到 props 解构
export const LoopTableRenderer: React.FC<LoopTableRendererProps> = ({
  // ... 其他 props
  refreshKey
}) => {
  // ...
  
  // 添加到 useEffect 依赖项
  useEffect(() => {
    // ... 加载字段值的逻辑
    loadFieldValues();
  }, [table, records, columns, columnConfig, fields, refreshKey]);
};
```

### 3. 修改 `TemplateRenderer.tsx`

- 在渲染 `LoopAreaRenderer` 时传递 `refreshKey` 属性

```typescript
return (
  <LoopAreaRenderer
    // ... 其他 props
    refreshKey={refreshKey}
  />
);
```

## 修复效果

修复后，当用户在多维表格中修改"标准变更记录"表的数据后：

1. `TemplatePage` 调用 `setRefreshKey(prev => prev + 1)` 触发刷新
2. `TemplateRenderer` 接收到新的 `refreshKey` 并传递给 `LoopAreaRenderer`
3. `LoopAreaRenderer` 的 `useEffect` 检测到 `refreshKey` 变化，重新调用 `loadLinkedRecords()` 加载最新数据
4. `LoopTableRenderer` 接收到新的 `refreshKey`，其 `useEffect` 重新加载字段值
5. 画布上显示最新的数据

## 测试建议

1. 打开项目，选择一个包含"标准变更记录"的记录
2. 在多维表格中修改"标准变更记录"表的某个字段（如"变更内容"）
3. 返回画布页面，点击"刷新画布"按钮（或触发任何导致 `refreshKey` 增加的操作）
4. 验证画布上的"附表一：标准变更记录"表格中显示的是最新数据

## 相关文件

- `src/components/TemplateRenderer/LoopAreaRenderer.tsx`
- `src/components/TemplateRenderer/LoopTableRenderer.tsx`
- `src/components/TemplateRenderer/TemplateRenderer.tsx`
- `src/components/TemplatePage/TemplatePage.tsx` (已有 refreshKey 逻辑)

## 修复日期

2025-11-25

