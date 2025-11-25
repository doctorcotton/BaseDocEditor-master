/**
 * 循环区域筛选逻辑
 */

import { IRecord, IFieldMeta, FieldType, bitable } from '@lark-base-open/js-sdk';
import { FilterCondition } from '../types/template';

/**
 * 根据筛选条件过滤记录
 */
export function filterRecords(
  records: IRecord[],
  filter: FilterCondition,
  fields: IFieldMeta[]
): IRecord[] {
  if (!filter) {
    return records;
  }
  
  // 查找筛选字段：优先使用 fieldId，如果没有则使用 fieldPath（兼容旧数据）
  let filterField = null;
  if (filter.fieldId) {
    filterField = fields.find(f => f.id === filter.fieldId);
  } else if (filter.fieldPath) {
    filterField = fields.find(f => f.name === filter.fieldPath);
  }
  
  if (!filterField) {
    console.warn('筛选字段不存在:', filter.fieldId || filter.fieldPath);
    return records;
  }
  
  return records.filter(record => {
    const fieldValue = record.fields[filterField.id];
    return matchesCondition(fieldValue, filter, filterField.type);
  });
}

/**
 * 检查字段值是否匹配筛选条件
 */
function matchesCondition(
  value: any,
  condition: FilterCondition,
  fieldType: FieldType
): boolean {
  const conditionValue = condition.value;
  
  switch (condition.operator) {
    case 'equals':
      return isEqual(value, conditionValue, fieldType);
      
    case 'notEquals':
      return !isEqual(value, conditionValue, fieldType);
      
    case 'contains':
      return contains(value, conditionValue, fieldType);
      
    case 'notContains':
      return !contains(value, conditionValue, fieldType);
      
    default:
      return true;
  }
}

/**
 * 判断两个值是否相等
 */
function isEqual(value: any, conditionValue: any, fieldType: FieldType): boolean {
  if (value === null || value === undefined) {
    return conditionValue === null || conditionValue === undefined || conditionValue === '';
  }
  
  switch (fieldType) {
    case FieldType.Text:
    case FieldType.Url:
    case FieldType.Phone:
    case FieldType.Email:
      return String(value).trim() === String(conditionValue).trim();
      
    case FieldType.Number:
      return Number(value) === Number(conditionValue);
      
    case FieldType.SingleSelect:
      // 处理单选字段：支持对象和字符串比较
      const selectValue = value?.id || value?.text || value?.name || value || '';
      const conditionSelectValue = conditionValue?.id || conditionValue?.text || conditionValue?.name || conditionValue || '';
      return String(selectValue) === String(conditionSelectValue);
      
    case FieldType.MultiSelect:
      if (Array.isArray(value)) {
        const texts = value.map((v: any) => v.text || v.name || '');
        return texts.includes(String(conditionValue));
      }
      return false;
      
    case FieldType.Checkbox:
      return Boolean(value) === Boolean(conditionValue);
      
    default:
      return String(value) === String(conditionValue);
  }
}

/**
 * 判断值是否包含条件值
 */
function contains(value: any, conditionValue: any, fieldType: FieldType): boolean {
  if (value === null || value === undefined) {
    return false;
  }
  
  const valueStr = String(value).toLowerCase();
  const conditionStr = String(conditionValue).toLowerCase();
  
  switch (fieldType) {
    case FieldType.Text:
    case FieldType.Url:
    case FieldType.Phone:
    case FieldType.Email:
      return valueStr.includes(conditionStr);
      
    case FieldType.SingleSelect:
      const selectText = (value?.text || value?.name || '').toLowerCase();
      return selectText.includes(conditionStr);
      
    case FieldType.MultiSelect:
      if (Array.isArray(value)) {
        const texts = value.map((v: any) => (v.text || v.name || '').toLowerCase());
        return texts.some(text => text.includes(conditionStr));
      }
      return false;
      
    default:
      return valueStr.includes(conditionStr);
  }
}

/**
 * 获取关联记录（双向引用或单项引用）
 */
export async function getLinkedRecords(
  table: any,
  recordId: string,
  linkFieldId: string
): Promise<IRecord[]> {
  try {
    console.log('[getLinkedRecords] 开始获取关联记录', { recordId, linkFieldId });
    
    // 获取关联字段的值
    const linkValue = await table.getCellValue(linkFieldId, recordId);
    console.log('[getLinkedRecords] 关联字段值:', linkValue);
    
    if (!linkValue) {
      console.log('[getLinkedRecords] 关联字段值为空');
      return [];
    }
    
    // 获取关联表
    const linkedTable = await getLinkedTable(table, linkFieldId);
    if (!linkedTable) {
      console.error('[getLinkedRecords] 无法获取关联表');
      return [];
    }
    
    // 解析记录ID列表
    // 飞书关联字段可能返回多种格式:
    // 1. { recordIds: [...], tableId: '...' } - 新格式
    // 2. { record_ids: [...], table_id: '...' } - 另一种格式
    // 3. [{ record_id: 'xxx', text: 'xxx' }, ...] - 数组格式
    // 4. 'recordId' - 单个字符串
    let recordIds: string[] = [];
    
    if (typeof linkValue === 'string') {
      // 单个记录ID字符串
      recordIds = [linkValue];
    } else if (Array.isArray(linkValue)) {
      // 数组格式
      recordIds = linkValue.map((item: any) => {
        if (typeof item === 'string') return item;
        return item.record_id || item.recordId || item.id;
      }).filter(Boolean);
    } else if (typeof linkValue === 'object') {
      // 对象格式 { recordIds: [...] } 或 { record_ids: [...] }
      const ids = linkValue.recordIds || linkValue.record_ids;
      if (Array.isArray(ids)) {
        recordIds = ids.filter(Boolean);
      } else if (linkValue.record_id || linkValue.recordId || linkValue.id) {
        // 单个对象 { record_id: 'xxx' }
        recordIds = [linkValue.record_id || linkValue.recordId || linkValue.id];
      }
    }
    
    console.log('[getLinkedRecords] 解析到的记录ID列表:', recordIds);
    
    if (recordIds.length === 0) {
      console.log('[getLinkedRecords] 没有解析到有效的记录ID');
      return [];
    }
    
    // 批量获取记录 - 使用 getRecordShareLink 或逐个获取字段值
    const result: IRecord[] = [];
    
    // 获取关联表的所有字段
    const linkedFields = await linkedTable.getFieldMetaList();
    const fieldIds = linkedFields.map((f: IFieldMeta) => f.id);
    console.log('[getLinkedRecords] 关联表字段数:', fieldIds.length);
    
    for (const rid of recordIds) {
      try {
        // 方法1: 尝试使用 getRecordById
        let recordData = await linkedTable.getRecordById(rid);
        console.log('[getLinkedRecords] getRecordById 返回:', { rid, type: typeof recordData, keys: recordData ? Object.keys(recordData).slice(0, 5) : [] });
        
        // 如果返回的是空对象或字段值都是 null，尝试逐个获取字段值
        let fields: Record<string, any> = {};
        
        if (recordData && typeof recordData === 'object') {
          // 检查是否有 fields 属性
          if (recordData.fields && typeof recordData.fields === 'object') {
            fields = recordData.fields;
          } else {
            // recordData 本身就是 fields
            fields = recordData;
          }
        }
        
        // 检查字段值是否都是 null
        const hasNonNullValue = Object.values(fields).some(v => v !== null && v !== undefined);
        
        if (!hasNonNullValue) {
          console.log('[getLinkedRecords] 字段值都是 null，尝试逐个获取字段值');
          // 逐个获取字段值
          for (const fieldId of fieldIds) {
            try {
              const cellValue = await linkedTable.getCellValue(fieldId, rid);
              if (cellValue !== null && cellValue !== undefined) {
                fields[fieldId] = cellValue;
              }
            } catch (e) {
              // 忽略单个字段获取失败
            }
          }
          console.log('[getLinkedRecords] 逐个获取后的字段数:', Object.keys(fields).filter(k => fields[k] !== null && fields[k] !== undefined).length);
        }
        
        result.push({
          recordId: rid,
          fields: fields
        });
      } catch (err) {
        console.warn('[getLinkedRecords] 获取单条记录失败:', rid, err);
      }
    }
    
    console.log('[getLinkedRecords] 最终获取到的记录数:', result.length);
    return result;
  } catch (error) {
    console.error('[getLinkedRecords] 获取关联记录失败:', error);
    return [];
  }
}

/**
 * 获取关联表
 */
async function getLinkedTable(table: any, linkFieldId: string): Promise<any> {
  try {
    const field = await table.getFieldById(linkFieldId);
    const fieldMeta = await field.getMeta();
    
    // 获取关联表的ID
    const linkedTableId = fieldMeta.property?.tableId;
    if (!linkedTableId) {
      console.warn('[getLinkedTable] 未找到关联表ID', { linkFieldId, fieldMeta });
      return null;
    }
    
    // 使用 bitable.base 获取关联表
    return await bitable.base.getTable(linkedTableId);
  } catch (error) {
    console.error('[getLinkedTable] 获取关联表失败:', error);
    return null;
  }
}

