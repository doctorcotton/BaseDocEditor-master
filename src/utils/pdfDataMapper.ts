/**
 * PDF数据映射工具
 * 将多维表格数据转换为 React-PDF 可用格式
 */

import { IRecord, IFieldMeta, FieldType, bitable } from '@lark-base-open/js-sdk';
import { formatFieldValue } from './fieldFormatter';
import { getLinkedRecords, filterRecords } from './loopAreaFilter';
import { FilterCondition } from '../types/template';

/**
 * 富文本片段接口
 */
export interface RichTextSegment {
  type: 'text' | 'link';
  text: string;
  url?: string;
}

/**
 * 解析富文本内容，提取文本和链接
 */
export function parseRichText(value: any, fieldType: FieldType): RichTextSegment[] {
  if (!value) {
    return [{ type: 'text', text: '' }];
  }

  // 如果是字符串，检查是否包含 URL
  if (typeof value === 'string') {
    return parseStringForLinks(value);
  }

  // URL 字段特殊处理
  if (fieldType === FieldType.Url) {
    if (Array.isArray(value)) {
      const segments: RichTextSegment[] = [];
      value.forEach((item, index) => {
        if (typeof item === 'object' && item !== null) {
          const text = item.text || item.name || item.link || item.url || '';
          const url = item.link || item.url || '';
          if (url) {
            segments.push({ type: 'link', text, url });
          } else {
            segments.push({ type: 'text', text });
          }
        } else {
          segments.push({ type: 'text', text: String(item || '') });
        }
        if (index < value.length - 1) {
          segments.push({ type: 'text', text: ', ' });
        }
      });
      return segments;
    }
    if (typeof value === 'object' && value !== null) {
      const text = value.text || value.name || value.link || value.url || '';
      const url = value.link || value.url || '';
      if (url) {
        return [{ type: 'link', text, url }];
      }
      return [{ type: 'text', text }];
    }
  }

  // 数组类型（可能是富文本）
  if (Array.isArray(value)) {
    const segments: RichTextSegment[] = [];
    value.forEach(item => {
      if (!item) return;
      
      // 字符串类型
      if (typeof item === 'string') {
        segments.push(...parseStringForLinks(item));
        return;
      }
      
      if (typeof item !== 'object') {
        segments.push({ type: 'text', text: String(item) });
        return;
      }
      
      // 超链接类型（type: 'url'）
      if (item.type === 'url' && item.link) {
        segments.push({
          type: 'link',
          text: item.text || item.link,
          url: item.link
        });
        return;
      }
      
      // 对象中直接包含 link 属性
      if (item.link) {
        segments.push({
          type: 'link',
          text: item.text || item.name || item.link,
          url: item.link
        });
        return;
      }
      
      // 普通文本对象
      const textContent = item.text || item.name || item.value || '';
      if (textContent) {
        segments.push(...parseStringForLinks(textContent));
      }
    });
    return segments.length > 0 ? segments : [{ type: 'text', text: formatFieldValue(value, fieldType) }];
  }

  // 默认格式化为文本
  return [{ type: 'text', text: formatFieldValue(value, fieldType) }];
}

/**
 * 解析字符串中的URL，转换为文本和链接片段
 */
function parseStringForLinks(text: string): RichTextSegment[] {
  if (!text) return [{ type: 'text', text: '' }];
  
  const urlRegex = /(https?:\/\/[^\s<>"{}|\\^`\[\]]+)/g;
  const parts = text.split(urlRegex);
  
  if (parts.length === 1) {
    return [{ type: 'text', text }];
  }
  
  const segments: RichTextSegment[] = [];
  parts.forEach(part => {
    if (!part) return;
    if (urlRegex.test(part)) {
      segments.push({ type: 'link', text: part, url: part });
    } else {
      segments.push({ type: 'text', text: part });
    }
  });
  
  return segments;
}

/**
 * 获取字段的显示值（文本格式）
 */
export async function getFieldDisplayValue(
  record: IRecord,
  fieldId: string,
  fields: IFieldMeta[],
  table: any
): Promise<string> {
  const field = fields.find(f => f.id === fieldId);
  if (!field) return '';
  
  let value = record.fields?.[fieldId];
  if (value === undefined && table) {
    try {
      value = await table.getCellValue(fieldId, record.recordId);
    } catch (error) {
      console.warn('[pdfDataMapper] 获取字段值失败', { fieldId, error });
    }
  }
  
  return formatFieldValue(value, field.type);
}

/**
 * 获取关联记录列表（用于循环区域）
 */
export async function getLoopRecords(
  table: any,
  record: IRecord,
  fieldId: string,
  filter?: FilterCondition
): Promise<{ records: IRecord[]; fields: IFieldMeta[]; linkedTable: any }> {
  try {
    // 获取关联记录
    const records = await getLinkedRecords(table, record.recordId, fieldId);
    
    // 获取关联表的字段和表实例
    let linkedFields: IFieldMeta[] = [];
    let linkedTable: any = null;
    
    if (table) {
      try {
        const field = await table.getFieldById(fieldId);
        const fieldMeta = await field.getMeta();
        const linkedTableId = fieldMeta.property?.tableId;
        
        if (linkedTableId) {
          linkedTable = await bitable.base.getTable(linkedTableId);
          linkedFields = await linkedTable.getFieldMetaList();
        }
      } catch (error) {
        console.error('[pdfDataMapper] 获取关联表字段失败:', error);
      }
    }
    
    // 应用筛选条件
    let filteredRecords = records;
    if (filter && filter.fieldId && linkedFields.length > 0) {
      filteredRecords = filterRecords(records, filter, linkedFields);
    }
    
    return {
      records: filteredRecords,
      fields: linkedFields,
      linkedTable
    };
  } catch (error) {
    console.error('[pdfDataMapper] 获取循环记录失败:', error);
    return { records: [], fields: [], linkedTable: null };
  }
}

/**
 * 从附件字段提取图片URL
 */
export function getImageUrls(value: any): string[] {
  if (!value) return [];
  
  const urls: string[] = [];
  
  if (Array.isArray(value)) {
    for (const item of value) {
      if (typeof item === 'object' && item !== null) {
        // 飞书附件对象可能包含 url, tmpUrl 等字段
        const url = item.url || item.tmpUrl || item.link;
        if (url && typeof url === 'string') {
          urls.push(url);
        }
      } else if (typeof item === 'string' && (item.startsWith('http://') || item.startsWith('https://'))) {
        urls.push(item);
      }
    }
  } else if (typeof value === 'object' && value !== null) {
    const url = value.url || value.tmpUrl || value.link;
    if (url && typeof url === 'string') {
      urls.push(url);
    }
  } else if (typeof value === 'string' && (value.startsWith('http://') || value.startsWith('https://'))) {
    urls.push(value);
  }
  
  return urls;
}

/**
 * 提取可编辑的文本值（用于特定字段的值提取）
 */
export function extractEditableText(value: any, fieldType: FieldType): string {
  if (value === null || value === undefined) {
    return '';
  }
  
  // URL 字段特殊处理：优先显示文档名称
  if (fieldType === FieldType.Url) {
    if (Array.isArray(value)) {
      return value.map(v => {
        if (typeof v === 'object' && v !== null) {
          return v.text || v.name || v.link || v.url || '';
        }
        return String(v || '');
      }).join('');
    }
    if (typeof value === 'object' && value !== null) {
      return value.text || value.name || value.link || value.url || '';
    }
    return String(value || '');
  }
  
  // 文本类型
  if (fieldType === FieldType.Text || 
      fieldType === FieldType.Email || 
      fieldType === FieldType.Phone ||
      fieldType === FieldType.Barcode) {
    if (Array.isArray(value)) {
      return value.map(v => {
        if (typeof v === 'object' && v !== null) {
          return v.text || v.name || v.value || '';
        }
        return String(v || '');
      }).join('');
    }
    if (typeof value === 'object' && value !== null) {
      return value.text || value.name || value.value || '';
    }
    return String(value || '');
  }
  
  // 数字类型
  if (fieldType === FieldType.Number || 
      fieldType === FieldType.Currency || 
      fieldType === FieldType.Progress) {
    if (typeof value === 'number') {
      return String(value);
    }
    if (Array.isArray(value) && value.length > 0) {
      const first = value[0];
      if (typeof first === 'object' && first !== null) {
        return String(first.text || first.value || first.name || '');
      }
      return String(first || '');
    }
    return String(value || '');
  }
  
  // 单选类型
  if (fieldType === FieldType.SingleSelect) {
    if (typeof value === 'string') return value;
    if (value && typeof value === 'object') {
      return value.text || value.name || '';
    }
    return '';
  }
  
  // 多选类型
  if (fieldType === FieldType.MultiSelect) {
    if (Array.isArray(value)) {
      return value.map((v: any) => {
        if (typeof v === 'string') return v;
        return v.text || v.name || '';
      }).filter(Boolean).join(', ');
    }
    return '';
  }
  
  // 其他类型使用 formatFieldValue
  return formatFieldValue(value, fieldType);
}

