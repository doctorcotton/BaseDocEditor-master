# Bug 修复：字体加载错误

## 问题描述
```
Error: Could not resolve font for Noto Sans SC, fontWeight 400, fontStyle italic
```

## 根本原因

### 1. fontWeight 类型错误
React-PDF 要求 `fontWeight` 必须是**数字**类型，而不是字符串。

**错误写法**：
```typescript
Font.register({
  family: 'Noto Sans SC',
  fonts: [
    { src: '/fonts/NotoSansSC-Regular.otf', fontWeight: 'normal' },  // ❌ 字符串
    { src: '/fonts/NotoSansSC-Bold.otf', fontWeight: 'bold' },      // ❌ 字符串
  ]
});
```

**正确写法**：
```typescript
Font.register({
  family: 'Noto Sans SC',
  fonts: [
    { src: '/fonts/NotoSansSC-Regular.otf', fontWeight: 400 },  // ✅ 数字
    { src: '/fonts/NotoSansSC-Bold.otf', fontWeight: 700 },     // ✅ 数字
  ]
});
```

### 2. 缺少 italic 字体
代码中使用了 `fontStyle: 'italic'`，但没有注册斜体字体文件。

## 解决方案

### 修复 1: 更新字体注册 (`src/utils/pdfFonts.ts`)
```typescript
Font.register({
  family: 'Noto Sans SC',
  fonts: [
    { 
      src: '/fonts/NotoSansSC-Regular.otf', 
      fontWeight: 400  // normal
    },
    { 
      src: '/fonts/NotoSansSC-Bold.otf', 
      fontWeight: 700  // bold
    },
  ]
});
```

### 修复 2: 更新样式文件 (`src/components/PdfExport/pdfStyles.ts`)
将所有 `fontWeight: 'bold'` 改为 `fontWeight: 700`：

```typescript
// 字段标签
fieldLabel: {
  fontWeight: 700,  // 原来是 'bold'
  // ...
},

// 标题
title: {
  fontWeight: 700,  // 原来是 'bold'
  // ...
},

// 表头
tableHeaderCell: {
  fontWeight: 700,  // 原来是 'bold'
  // ...
},
```

### 修复 3: 移除斜体样式
因为没有斜体字体文件，暂时注释掉：

```typescript
emptyValue: {
  color: '#999',
  // fontStyle: 'italic',  // 暂时移除，字体不支持
},
```

### 修复 4: 处理动态 fontWeight (`src/components/PdfExport/PdfTextElement.tsx`)
将字符串类型的 fontWeight 转换为数字：

```typescript
const fontWeightMap: Record<string, number> = {
  'normal': 400,
  'bold': 700,
};

const fontWeight = typeof config.fontWeight === 'string' 
  ? fontWeightMap[config.fontWeight] || 400
  : config.fontWeight || 400;
```

## fontWeight 对照表

| 字符串    | 数字  | CSS 等价 |
|-----------|-------|----------|
| 'normal'  | 400   | normal   |
| 'bold'    | 700   | bold     |
| -         | 100   | lighter  |
| -         | 300   | light    |
| -         | 500   | medium   |
| -         | 600   | semibold |
| -         | 800   | bolder   |
| -         | 900   | black    |

## 如果需要支持斜体

需要下载并注册斜体字体：

```bash
# 下载斜体字体
curl -o public/fonts/NotoSansSC-Italic.otf \
  "https://github.com/notofonts/noto-cjk/raw/main/Sans/OTF/.../NotoSansCJKsc-Italic.otf"
```

然后注册：

```typescript
Font.register({
  family: 'Noto Sans SC',
  fonts: [
    { src: '/fonts/NotoSansSC-Regular.otf', fontWeight: 400 },
    { src: '/fonts/NotoSansSC-Bold.otf', fontWeight: 700 },
    { src: '/fonts/NotoSansSC-Italic.otf', fontWeight: 400, fontStyle: 'italic' },  // 新增
  ]
});
```

## 相关文件
- `src/utils/pdfFonts.ts` - 字体注册（fontWeight 改为数字）
- `src/components/PdfExport/pdfStyles.ts` - 样式配置（fontWeight 改为数字，移除 italic）
- `src/components/PdfExport/PdfTextElement.tsx` - 动态样式处理（字符串转数字）

## 测试验证
现在导出 PDF 应该不会再报字体错误了。

