/**
 * 字段值格式化工具
 */

import { FieldType } from '@lark-base-open/js-sdk';
import dayjs from 'dayjs';

/**
 * 根据字段类型格式化显示值
 */
export function formatFieldValue(value: any, fieldType: FieldType): string {
  if (value === null || value === undefined) {
    return '';
  }

  // 处理对象类型，避免显示 [object Object]
  if (typeof value === 'object' && !Array.isArray(value)) {
    // 尝试提取常见的显示字段
    if (value.text !== undefined && value.text !== null) return String(value.text);
    if (value.name !== undefined && value.name !== null) return String(value.name);
    if (value.en_name !== undefined && value.en_name !== null) return String(value.en_name);
    if (value.title !== undefined && value.title !== null) return String(value.title);
    if (value.label !== undefined && value.label !== null) return String(value.label);
    // 尝试获取第一个可用的字符串属性
    for (const key in value) {
      if (value.hasOwnProperty(key)) {
        const propValue = value[key];
        if (typeof propValue === 'string' && propValue.trim()) {
          return propValue;
        }
        if (typeof propValue === 'number') {
          return String(propValue);
        }
      }
    }
    // 如果是空对象，返回空字符串
    if (Object.keys(value).length === 0) return '';
    // 最后尝试JSON序列化，但只取前100个字符
    try {
      const jsonStr = JSON.stringify(value);
      if (jsonStr.length > 100) {
        return jsonStr.substring(0, 100) + '...';
      }
      return jsonStr;
    } catch {
      return '';
    }
  }

  switch (fieldType) {
    case FieldType.Text:
    case FieldType.Barcode:
    case FieldType.Email:
    case FieldType.Phone:
      // 处理数组类型的文本值（多行文本可能返回数组）
      if (Array.isArray(value)) {
        return value.map(v => {
          if (typeof v === 'object' && v !== null) {
            return v.text || v.name || v.value || '';
          }
          return String(v || '');
        }).filter(Boolean).join('\n');
      }
      return String(value || '');

    case FieldType.Url:
      // URL 字段可能返回 {link: string, text?: string} 或数组格式
      // 飞书文档链接会有 text 属性表示文档名称
      if (Array.isArray(value)) {
        return value.map(v => {
          if (typeof v === 'object' && v !== null) {
            // 优先使用 text（文档名称），其次使用 link（URL）
            return v.text || v.name || v.link || v.url || '';
          }
          return String(v || '');
        }).filter(Boolean).join('\n');
      }
      if (typeof value === 'object' && value !== null) {
        // 优先使用 text（飞书文档名称），其次使用 link
        return value.text || value.name || value.link || value.url || '';
      }
      return String(value || '');

    case FieldType.Number:
      return typeof value === 'number' ? value.toString() : String(value || '');

    case FieldType.Currency:
      return typeof value === 'number' ? `¥${value.toFixed(2)}` : String(value || '');

    case FieldType.Progress:
      return typeof value === 'number' ? `${(value * 100).toFixed(2)}%` : String(value || '');

    case FieldType.DateTime:
      if (typeof value === 'number') {
        return dayjs(value).format('YYYY-MM-DD HH:mm:ss');
      }
      if (typeof value === 'string') {
        return value;
      }
      return '';

    case FieldType.SingleSelect:
      if (typeof value === 'string') return value;
      return value?.text || value?.name || '';

    case FieldType.MultiSelect:
      if (Array.isArray(value)) {
        return value.map((v: any) => {
          if (typeof v === 'string') return v;
          return v.text || v.name || '';
        }).filter(Boolean).join(', ');
      }
      return '';

    case FieldType.Checkbox:
      return value ? '✓' : '';

    case FieldType.User:
      if (Array.isArray(value)) {
        return value.map((u: any) => {
          if (typeof u === 'string') return u;
          return u.name || u.en_name || u.id || '';
        }).filter(Boolean).join(', ');
      }
      if (typeof value === 'string') return value;
      return value?.name || value?.en_name || value?.id || '';

    case FieldType.Attachment:
      if (Array.isArray(value)) {
        const fileNames = value.map((a: any) => a.name || a.filename || '').filter(Boolean);
        if (fileNames.length > 0) {
          return fileNames.join(', ');
        }
        return `${value.length} 个附件`;
      }
      if (typeof value === 'object' && value.name) {
        return value.name;
      }
      return value ? '1 个附件' : '';

    case FieldType.SingleLink:
    case FieldType.DuplexLink:
      if (Array.isArray(value)) {
        return value.map((link: any) => {
          if (typeof link === 'string') return link;
          return link.text || link.name || link.id || '';
        }).filter(Boolean).join(', ');
      }
      if (typeof value === 'string') return value;
      if (typeof value === 'object') {
        return value.text || value.name || value.id || '';
      }
      return '';

    case FieldType.Location:
      if (typeof value === 'object') {
        return value.address || value.location || '';
      }
      return String(value || '');

    case FieldType.GroupChat:
      if (Array.isArray(value)) {
        return value.map((g: any) => g.name || g.en_name || '').filter(Boolean).join(', ');
      }
      return value?.name || value?.en_name || '';

    case FieldType.Formula:
    case FieldType.Lookup:
      // 公式和查找引用字段可能返回各种类型
      if (Array.isArray(value)) {
        return value.map(v => formatFieldValue(v, FieldType.Text)).filter(Boolean).join(', ');
      }
      if (typeof value === 'object' && value !== null) {
        // 优先尝试常见属性
        if (value.text !== undefined && value.text !== null) return String(value.text);
        if (value.name !== undefined && value.name !== null) return String(value.name);
        if (value.value !== undefined && value.value !== null) return String(value.value);
        // 尝试获取第一个字符串或数字属性
        for (const key in value) {
          if (value.hasOwnProperty(key)) {
            const propValue = value[key];
            if (typeof propValue === 'string' && propValue.trim()) {
              return propValue;
            }
            if (typeof propValue === 'number') {
              return String(propValue);
            }
          }
        }
        // 最后尝试JSON序列化
        try {
          const jsonStr = JSON.stringify(value);
          return jsonStr.length > 200 ? jsonStr.substring(0, 200) + '...' : jsonStr;
        } catch {
          return '';
        }
      }
      return String(value || '');

    default:
      // 默认处理：尝试转换为字符串
      if (Array.isArray(value)) {
        return value.map(v => {
          if (typeof v === 'object' && v !== null) {
            return v.text || v.name || v.label || '';
          }
          return String(v);
        }).filter(Boolean).join(', ');
      }
      if (typeof value === 'object' && value !== null) {
        // 优先尝试常见属性
        if (value.text !== undefined && value.text !== null) return String(value.text);
        if (value.name !== undefined && value.name !== null) return String(value.name);
        if (value.label !== undefined && value.label !== null) return String(value.label);
        // 尝试获取第一个字符串或数字属性
        for (const key in value) {
          if (value.hasOwnProperty(key)) {
            const propValue = value[key];
            if (typeof propValue === 'string' && propValue.trim()) {
              return propValue;
            }
            if (typeof propValue === 'number') {
              return String(propValue);
            }
          }
        }
        // 最后尝试JSON序列化
        try {
          const jsonStr = JSON.stringify(value);
          return jsonStr.length > 200 ? jsonStr.substring(0, 200) + '...' : jsonStr;
        } catch {
          return '';
        }
      }
      return String(value || '');
  }
}

/**
 * 判断字段类型是否可编辑
 */
export function isFieldEditable(fieldType: FieldType): boolean {
  const nonEditableTypes = [
    FieldType.Formula,
    FieldType.Lookup,
    FieldType.AutoNumber,
    FieldType.CreatedTime,
    FieldType.CreatedUser,
    FieldType.ModifiedTime,
    FieldType.ModifiedUser,
  ];
  
  return !nonEditableTypes.includes(fieldType);
}

/**
 * 获取字段类型的显示名称
 */
export function getFieldTypeName(fieldType: FieldType): string {
  const typeNames: Record<number, string> = {
    [FieldType.Text]: '文本',
    [FieldType.Number]: '数字',
    [FieldType.SingleSelect]: '单选',
    [FieldType.MultiSelect]: '多选',
    [FieldType.DateTime]: '日期时间',
    [FieldType.Checkbox]: '复选框',
    [FieldType.User]: '人员',
    [FieldType.Phone]: '电话',
    [FieldType.Url]: '链接',
    [FieldType.Attachment]: '附件',
    [FieldType.Email]: '邮箱',
    [FieldType.Currency]: '货币',
    [FieldType.Progress]: '进度',
    [FieldType.Barcode]: '条形码',
    [FieldType.Formula]: '公式',
    [FieldType.Lookup]: '查找引用',
    [FieldType.AutoNumber]: '自动编号',
  };
  
  return typeNames[fieldType] || '未知';
}

/**
 * 规范化字段值，确保符合多维表格 API 的要求
 * @param value 原始值
 * @param fieldType 字段类型
 * @param fieldMeta 字段元数据（用于选项类型）
 */
export function normalizeFieldValue(value: any, fieldType: FieldType, fieldMeta?: any): any {
  if (value === null || value === undefined) {
    return null;
  }

  switch (fieldType) {
    case FieldType.Text:
    case FieldType.Barcode:
    case FieldType.Email:
    case FieldType.Phone:
    case FieldType.Url:
      // 文本类型：直接返回字符串
      return String(value || '');

    case FieldType.Number:
    case FieldType.Currency:
    case FieldType.Progress:
      // 数字类型：返回数字
      return typeof value === 'number' ? value : parseFloat(String(value)) || 0;

    case FieldType.DateTime:
      // 日期时间类型：返回时间戳（毫秒）
      if (typeof value === 'number') {
        return value;
      }
      if (value instanceof Date) {
        return value.getTime();
      }
      if (typeof value === 'string') {
        const timestamp = Date.parse(value);
        return isNaN(timestamp) ? null : timestamp;
      }
      return null;

    case FieldType.SingleSelect:
      // 单选类型：需要返回选项对象或选项ID
      if (typeof value === 'string') {
        // 如果是字符串，尝试从选项中查找
        const options = (fieldMeta?.property as any)?.options || [];
        const option = options.find((opt: any) => opt.id === value || opt.name === value);
        return option || value;
      }
      if (value && typeof value === 'object') {
        // 如果已经是对象，确保有 id 和 name
        if (value.id) {
          return value;
        }
        // 如果没有 id，尝试从选项中查找
        const options = (fieldMeta?.property as any)?.options || [];
        const option = options.find((opt: any) => opt.name === value.name || opt.text === value.text);
        return option || value;
      }
      return value;

    case FieldType.MultiSelect:
      // 多选类型：需要返回选项对象数组
      if (!Array.isArray(value)) {
        return [];
      }
      const options = (fieldMeta?.property as any)?.options || [];
      return value.map((v: any) => {
        if (typeof v === 'string') {
          // 如果是字符串，尝试从选项中查找
          const option = options.find((opt: any) => opt.id === v || opt.name === v);
          return option || v;
        }
        if (v && typeof v === 'object') {
          // 如果已经是对象，确保有 id
          if (v.id) {
            return v;
          }
          // 如果没有 id，尝试从选项中查找
          const option = options.find((opt: any) => opt.name === v.name || opt.text === v.text);
          return option || v;
        }
        return v;
      }).filter(Boolean);

    case FieldType.Checkbox:
      // 复选框类型：返回布尔值
      return !!value;

    default:
      // 其他类型：直接返回原值
      return value;
  }
}

