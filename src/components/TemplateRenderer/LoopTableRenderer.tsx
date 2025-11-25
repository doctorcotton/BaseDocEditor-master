/**
 * 循环区域表格渲染器
 * 用于在循环区域中渲染表格，多条关联记录作为数据源
 * 支持双击编辑：要求（文本）、检测方法（单选）、入厂检验/COA项目/型式检验（勾选）
 * 
 * 级联选择支持：
 * - 检测方法字段的选项会根据当前记录的检测项目动态筛选
 * - 通过 optionFilterConfig 配置级联关系
 */

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Table, Input, Select, Toast } from '@douyinfe/semi-ui';
import { IRecord, IFieldMeta, FieldType, bitable } from '@lark-base-open/js-sdk';
import dayjs from 'dayjs';
import { TemplateElement } from '../../types/template';
import { formatFieldValue } from '../../utils/fieldFormatter';
import './TemplateRenderer.css';

/**
 * 勾选字段ID集合
 * 这些字段在表格中显示为复选框样式，可以点击切换
 */
const CHECKBOX_FIELD_IDS = new Set([
  'fldk55W8YR', // 入厂检验
  'fldzUl19XS', // COA项目
  'fldciyYFzH'  // 型式检验
]);

/**
 * 可编辑字段ID集合
 * 只有这些字段可以在表格中双击编辑
 */
const EDITABLE_FIELD_IDS = new Set([
  // === 产品标准明细表字段 ===
  'fldpfUrXpj', // 要求（文本）
  'fldeffP9dE', // 检测方法（单选）
  'fldk55W8YR', // 入厂检验（勾选）
  'fldzUl19XS', // COA项目（勾选）
  'fldciyYFzH', // 型式检验（勾选）
  
  // === 标准变更记录表字段 ===
  'fldpBu4ESO', // 序号（文本/数字）
  'fldNmCZ5RT', // 替代版本号（文本）
  'fld2Rz5f7b', // 变更日期（日期）
  'fldTvZwqB2', // 变更内容（文本）
  'fldeDy48rL', // 变更原因（文本）
  'fldTtVRn5i'  // 修订人（文本）
]);

/**
 * 判断字段是否为勾选字段
 */
function isCheckboxField(fieldId: string): boolean {
  return CHECKBOX_FIELD_IDS.has(fieldId);
}

/**
 * 判断字段是否可编辑
 */
function isEditableField(fieldId: string): boolean {
  return EDITABLE_FIELD_IDS.has(fieldId);
}

/**
 * 获取字段类型名称（用于调试）
 */
function getFieldTypeName(type: number): string {
  const typeNames: Record<number, string> = {
    1: '文本',
    2: '数字',
    3: '单选',
    4: '多选',
    5: '日期',
    7: '复选框',
    11: '人员',
    13: '电话',
    15: '超链接',
    17: '附件',
    18: '单向关联',
    19: '查找引用',
    20: '公式',
    21: '双向关联',
    22: '地理位置',
    23: '群组',
    1001: '创建时间',
    1002: '修改时间',
    1003: '创建人',
    1004: '修改人',
    1005: '自动编号'
  };
  return typeNames[type] || `未知类型(${type})`;
}

/**
 * 级联选项筛选配置
 * 定义哪些字段的选项需要根据其他字段的值来筛选
 * 
 * 配置说明：
 * - targetFieldId: 需要被筛选选项的字段ID（如：检测方法）
 * - sourceFieldId: 作为筛选条件的字段ID（如：检测项目）
 * - linkedTableId: 选项来源的关联表ID（如：检测方法库表）
 * - optionFieldId: 关联表中作为选项显示的字段ID
 * - filterFieldId: 关联表中用于筛选的字段ID（关联到检测项目）
 */
interface OptionFilterConfig {
  targetFieldId: string;      // 被筛选的字段（检测方法）
  sourceFieldId: string;      // 筛选依据字段（检测项目）
  linkedTableId?: string;     // 关联表ID（可选，如果选项来自关联表）
  optionFieldId?: string;     // 关联表中的选项字段ID
  filterFieldId?: string;     // 关联表中的筛选字段ID
}

/**
 * 默认的级联选项配置
 * 检测方法根据检测项目筛选
 */
const DEFAULT_OPTION_FILTER_CONFIGS: OptionFilterConfig[] = [
  {
    targetFieldId: 'fldeffP9dE',  // 检测方法
    sourceFieldId: 'fldPVBJ4xJ',  // 检测项目
  }
];

/**
 * 判断值是否为勾选状态
 * 支持多种格式：布尔值、字符串"是"/"√"/"true"、数组等
 */
function isChecked(value: any): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') {
    const v = value.trim().toLowerCase();
    return v === '是' || v === '√' || v === '✓' || v === 'true' || v === '1' || v === 'yes';
  }
  // 飞书复选框字段可能返回数组格式
  if (Array.isArray(value)) {
    if (value.length === 0) return false;
    // 检查第一个元素
    const first = value[0];
    if (typeof first === 'object' && first !== null) {
      // 可能是 { text: '是' } 或 { name: '是' } 格式
      const text = first.text || first.name || first.value || '';
      return isChecked(text);
    }
    return isChecked(first);
  }
  // 对象格式
  if (typeof value === 'object') {
    const text = value.text || value.name || value.value || '';
    return isChecked(text);
  }
  return false;
}

/**
 * 从文本数组中提取纯文本
 */
function extractTextFromValue(value: any): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  if (Array.isArray(value)) {
    return value.map(v => {
      if (typeof v === 'object' && v !== null) {
        return v.text || v.name || v.value || '';
      }
      return String(v || '');
    }).join('');
  }
  if (typeof value === 'object') {
    return value.text || value.name || value.value || '';
  }
  return String(value);
}

interface LoopTableRendererProps {
  element: TemplateElement;
  records: IRecord[];
  fields: IFieldMeta[];
  table: any;
  onComment?: (recordId: string, fieldId?: string) => void;
  commentStats?: Map<string, { total: number; unresolved: number }>;
  onFieldChange?: (
    recordId: string,
    fieldId: string,
    newValue: any,
    oldValue: any
  ) => Promise<any> | any;
  optionFilterConfigs?: OptionFilterConfig[];  // 可选的级联选项配置
  refreshKey?: number; // 用于触发数据刷新
}

export const LoopTableRenderer: React.FC<LoopTableRendererProps> = ({
  element,
  records,
  fields,
  table,
  onComment,
  commentStats,
  onFieldChange,
  optionFilterConfigs = DEFAULT_OPTION_FILTER_CONFIGS,
  refreshKey
}) => {
  const config = element.config as any;
  const columns = config.columns || [];
  const columnConfig = config.columnConfig || {};
  const [fieldValuesMap, setFieldValuesMap] = useState<Map<string, Map<string, any>>>(new Map());
  
  // 编辑状态
  const [editingCell, setEditingCell] = useState<{ recordId: string; fieldId: string } | null>(null);
  const [editingValue, setEditingValue] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const editingCellRef = useRef<HTMLDivElement | null>(null);
  
  // 级联选项缓存：存储每个检测项目对应的检测方法选项
  // key: 检测项目的值（如选项ID或名称）
  // value: 可用的检测方法选项列表
  const [cascadeOptionsCache, setCascadeOptionsCache] = useState<Map<string, any[]>>(new Map());
  
  // 关联表数据缓存（用于级联选项筛选）
  const [linkedTableData, setLinkedTableData] = useState<{
    tableId: string;
    records: IRecord[];
    fields: IFieldMeta[];
  } | null>(null);

  // 异步加载字段值
  useEffect(() => {
    if (!table || records.length === 0) {
      return;
    }

    const loadFieldValues = async () => {
      const valueMap = new Map<string, Map<string, any>>();
      
      // 收集所有需要加载的字段ID，并验证字段是否存在于关联表中
      const fieldIdsToLoad = new Set<string>();
      // 创建字段ID到字段元数据的映射，用于快速查找
      const validFieldIds = new Set(fields.map(f => f.id));
      
      columns.forEach((col: any) => {
        if (col.fieldId && validFieldIds.has(col.fieldId)) {
          fieldIdsToLoad.add(col.fieldId);
        }
        // 检查是否有列配置需要拼接字段
        if (columnConfig[col.id] && columnConfig[col.id].fields) {
          columnConfig[col.id].fields.forEach((fieldId: string) => {
            // 只添加在关联表中存在的字段
            if (validFieldIds.has(fieldId)) {
              fieldIdsToLoad.add(fieldId);
            }
          });
        }
      });

      // 如果没有需要加载的字段，直接返回
      if (fieldIdsToLoad.size === 0) {
        console.log('[LoopTableRenderer] 没有需要加载的有效字段');
        setFieldValuesMap(valueMap);
        return;
      }

      // 批量加载字段值
      try {
        for (const record of records) {
          const recordValueMap = new Map<string, any>();
          
          for (const fieldId of fieldIdsToLoad) {
            try {
              // 优先从 record.fields 读取
              let value = record.fields?.[fieldId];
              if (value === undefined && table) {
                // 只有当字段在关联表中存在时才调用 API
                value = await table.getCellValue(fieldId, record.recordId);
              }
              recordValueMap.set(fieldId, value);
            } catch (error) {
              // 静默处理单个字段加载失败，不打印错误日志
              recordValueMap.set(fieldId, null);
            }
          }
          
          valueMap.set(record.recordId, recordValueMap);
        }
      } catch (error) {
        console.error('[LoopTableRenderer] 批量加载字段值失败:', error);
      }
      
      setFieldValuesMap(valueMap);
    };

    loadFieldValues();
  }, [table, records, columns, columnConfig, fields, refreshKey]);

  // 加载级联选项数据
  // 当检测方法字段需要根据检测项目筛选时，需要获取关联表的数据
  useEffect(() => {
    const loadCascadeOptions = async () => {
      if (!table || records.length === 0 || optionFilterConfigs.length === 0) {
        return;
      }

      // 检查是否有需要级联筛选的字段
      const targetFieldId = optionFilterConfigs[0]?.targetFieldId;
      const sourceFieldId = optionFilterConfigs[0]?.sourceFieldId;
      
      if (!targetFieldId || !sourceFieldId) {
        return;
      }

      // 查找目标字段（检测方法）的元数据
      const targetField = fields.find(f => f.id === targetFieldId);
      if (!targetField) {
        console.log('[LoopTableRenderer] 未找到目标字段:', targetFieldId);
        return;
      }

      // 详细输出字段信息，帮助调试级联选项配置
      console.log('=== 级联选项调试信息 ===');
      console.log('[LoopTableRenderer] 检测方法字段元数据:', JSON.stringify({
        id: targetField.id,
        name: targetField.name,
        type: targetField.type,
        typeName: getFieldTypeName(targetField.type),
        property: targetField.property
      }, null, 2));
      
      // 输出所有字段信息，帮助找到关联关系
      console.log('[LoopTableRenderer] 当前表所有字段:', fields.map(f => ({
        id: f.id,
        name: f.name,
        type: f.type,
        typeName: getFieldTypeName(f.type)
      })));

      // 检查字段类型
      // 如果是单选字段（type=3），选项在 property.options 中
      // 如果是关联字段（type=18/21），需要从关联表获取数据
      // 如果是查找引用字段（type=19/23），选项来自关联表
      
      const fieldProperty = targetField.property as any;
      
      // 方案1：如果检测方法是单选字段，且选项中包含关联到检测项目的信息
      // 这种情况下，我们需要根据检测项目的值来筛选选项
      if (targetField.type === FieldType.SingleSelect && fieldProperty?.options) {
        console.log('[LoopTableRenderer] 检测方法是单选字段，选项数量:', fieldProperty.options.length);
        
        // 尝试从选项中解析级联关系
        // 飞书多维表格的单选选项可能包含额外的元数据
        // 我们需要建立 检测项目 -> 检测方法选项 的映射
        
        // 首先获取所有检测项目的唯一值
        const sourceField = fields.find(f => f.id === sourceFieldId);
        if (sourceField) {
          console.log('[LoopTableRenderer] 检测项目字段元数据:', {
            id: sourceField.id,
            name: sourceField.name,
            type: sourceField.type,
            property: sourceField.property
          });
        }
        
        // 方案：如果检测方法的选项需要根据检测项目筛选
        // 我们需要知道每个检测方法属于哪个检测项目
        // 这个关系可能存储在：
        // 1. 选项的名称中（如 "检测项目A-方法1"）
        // 2. 关联表中
        // 3. 选项的额外属性中
        
        // 暂时先尝试从关联表获取数据（如果存在）
        try {
          // 检查是否有 filter_info（查找引用配置）
          if (fieldProperty?.filter_info) {
            console.log('[LoopTableRenderer] 检测到 filter_info 配置:', fieldProperty.filter_info);
            
            const linkedTableId = fieldProperty.filter_info.target_table;
            if (linkedTableId) {
              const linkedTable = await bitable.base.getTable(linkedTableId);
              const linkedFields = await linkedTable.getFieldMetaList();
              const linkedRecordIds = await linkedTable.getRecordIdList();
              
              // 批量获取关联表记录
              const linkedRecords: IRecord[] = [];
              const batchSize = 100;
              for (let i = 0; i < linkedRecordIds.length; i += batchSize) {
                const batch = linkedRecordIds.slice(i, i + batchSize);
                const recordValues = await linkedTable.getRecordsByIds(batch);
                const records = recordValues.map((recordValue, index) => ({
                  recordId: batch[index],
                  fields: recordValue as any
                }));
                linkedRecords.push(...records);
              }
              
              setLinkedTableData({
                tableId: linkedTableId,
                records: linkedRecords,
                fields: linkedFields
              });
              
              console.log('[LoopTableRenderer] 加载关联表数据完成:', {
                tableId: linkedTableId,
                recordCount: linkedRecords.length,
                fieldCount: linkedFields.length
              });
            }
          }
        } catch (error) {
          console.error('[LoopTableRenderer] 加载级联选项数据失败:', error);
        }
      }
      
      // 方案2：如果检测方法是关联字段，从关联表获取数据
      if (targetField.type === 18 || targetField.type === 21) {
        console.log('[LoopTableRenderer] 检测方法是关联字段');
        
        const linkedTableId = fieldProperty?.tableId;
        if (linkedTableId) {
          try {
            const linkedTable = await bitable.base.getTable(linkedTableId);
            const linkedFields = await linkedTable.getFieldMetaList();
            const linkedRecordIds = await linkedTable.getRecordIdList();
            
            // 批量获取关联表记录
            const linkedRecords: IRecord[] = [];
            const batchSize = 100;
            for (let i = 0; i < linkedRecordIds.length; i += batchSize) {
              const batch = linkedRecordIds.slice(i, i + batchSize);
              const recordValues = await linkedTable.getRecordsByIds(batch);
              const records = recordValues.map((recordValue, index) => ({
                recordId: batch[index],
                fields: recordValue as any
              }));
              linkedRecords.push(...records);
            }
            
            setLinkedTableData({
              tableId: linkedTableId,
              records: linkedRecords,
              fields: linkedFields
            });
            
            console.log('[LoopTableRenderer] 加载关联表数据完成:', {
              tableId: linkedTableId,
              recordCount: linkedRecords.length,
              fieldCount: linkedFields.length
            });
          } catch (error) {
            console.error('[LoopTableRenderer] 加载关联表数据失败:', error);
          }
        }
      }
    };

    loadCascadeOptions();
  }, [table, records, fields, optionFilterConfigs]);

  // 根据检测项目值获取可用的检测方法选项
  const getFilteredOptions = useCallback((recordId: string, targetFieldId: string, allOptions: any[]): any[] => {
    // 查找级联配置
    const filterConfig = optionFilterConfigs.find(c => c.targetFieldId === targetFieldId);
    if (!filterConfig) {
      return allOptions; // 没有配置级联筛选，返回所有选项
    }

    const sourceFieldId = filterConfig.sourceFieldId;
    
    // 获取当前记录的检测项目值
    const recordFieldValues = fieldValuesMap.get(recordId);
    const sourceValue = recordFieldValues?.get(sourceFieldId);
    
    if (!sourceValue) {
      console.log('[LoopTableRenderer] 未找到检测项目值，返回所有选项');
      return allOptions;
    }

    // 提取检测项目的标识（可能是 ID 或名称）
    const sourceId = sourceValue?.id || sourceValue;
    const sourceName = sourceValue?.name || sourceValue?.text || extractTextFromValue(sourceValue);
    
    console.log('[LoopTableRenderer] 当前检测项目:', { sourceId, sourceName, sourceValue });

    // 如果有关联表数据，从关联表中筛选
    if (linkedTableData && linkedTableData.records.length > 0) {
      // 在关联表中查找与当前检测项目匹配的记录
      // 假设关联表中有一个字段关联到检测项目
      const filteredRecords = linkedTableData.records.filter(record => {
        // 遍历记录的所有字段，查找是否有匹配检测项目的值
        for (const [fieldId, fieldValue] of Object.entries(record.fields || {})) {
          const valueText = extractTextFromValue(fieldValue);
          const valueId = (fieldValue as any)?.id;
          
          // 检查是否匹配检测项目
          if (valueId === sourceId || valueText === sourceName) {
            return true;
          }
          
          // 如果字段值是数组（如关联字段），检查数组中的每个元素
          if (Array.isArray(fieldValue)) {
            for (const item of fieldValue) {
              const itemText = extractTextFromValue(item);
              const itemId = item?.id || item?.record_id;
              if (itemId === sourceId || itemText === sourceName) {
                return true;
              }
            }
          }
        }
        return false;
      });

      console.log('[LoopTableRenderer] 从关联表筛选后的记录数:', filteredRecords.length);

      // 将筛选后的记录转换为选项格式
      if (filteredRecords.length > 0) {
        return filteredRecords.map(record => {
          // 假设第一个文本字段是选项名称
          const nameField = linkedTableData.fields.find(f => f.type === FieldType.Text);
          const name = nameField ? extractTextFromValue(record.fields[nameField.id]) : record.recordId;
          return {
            id: record.recordId,
            name: name,
            text: name
          };
        });
      }
    }

    // 方案：尝试根据选项名称进行筛选
    // 如果选项名称中包含检测项目的信息，可以据此筛选
    // 例如：选项名称格式可能是 "检测项目名称-方法名称" 或者有其他关联方式
    
    // 暂时返回所有选项，等待更多信息来实现精确筛选
    console.log('[LoopTableRenderer] 无法确定筛选规则，返回所有选项');
    return allOptions;
  }, [fieldValuesMap, linkedTableData, optionFilterConfigs]);

  // 保存编辑
  const handleSaveEdit = useCallback(async () => {
    if (!editingCell || saving) return;
    
    const { recordId, fieldId } = editingCell;
    const field = fields.find(f => f.id === fieldId);
    if (!field) {
      setEditingCell(null);
      setEditingValue(null);
      return;
    }

    // 获取旧值
    const recordFieldValues = fieldValuesMap.get(recordId);
    const oldValue = recordFieldValues?.get(fieldId);
    
    // 比较值是否有变化
    let hasChanged = false;
    let newValueToSave = editingValue;
    
    if (isCheckboxField(fieldId)) {
      // 勾选字段：比较布尔值
      const oldChecked = isChecked(oldValue);
      const newChecked = editingValue;
      hasChanged = oldChecked !== newChecked;
      newValueToSave = newChecked;
    } else if (field.type === FieldType.SingleSelect) {
      // 单选字段：比较选项ID
      const oldId = oldValue?.id || oldValue;
      const newId = editingValue?.id || editingValue;
      hasChanged = oldId !== newId;
      newValueToSave = editingValue;
    } else {
      // 文本字段：比较字符串（统一转换为字符串比较）
      const oldText = String(extractTextFromValue(oldValue) || '').trim();
      const newText = String(editingValue || '').trim();
      hasChanged = oldText !== newText;
      newValueToSave = newText;
      
      console.log('[LoopTableRenderer] 文本比较:', { 
        fieldId, 
        oldText, 
        newText, 
        hasChanged,
        oldValue,
        editingValue 
      });
    }

    // 只有值真正变化时才调用 onFieldChange（与 TableRenderer 保持一致）
    // 本地状态更新在这里完成，不需要触发全局刷新
    if (hasChanged && onFieldChange) {
      setSaving(true);
      try {
        // 调用回调保存到多维表格，并拿回标准格式的值
        const updatedValue = await onFieldChange(recordId, fieldId, newValueToSave, oldValue);
        const finalValue = typeof updatedValue !== 'undefined' ? updatedValue : newValueToSave;
        
        // 更新本地值（只更新当前单元格，不触发全局刷新）
        setFieldValuesMap(prev => {
          const newMap = new Map(prev);
          const recordMap = new Map(newMap.get(recordId) || new Map());
          recordMap.set(fieldId, finalValue);
          newMap.set(recordId, recordMap);
          return newMap;
        });
        
        Toast.success(`已更新`);
      } catch (error: any) {
        console.error('[LoopTableRenderer] 保存失败:', error);
        Toast.error(`保存失败: ${error.message || '未知错误'}`);
      } finally {
        setSaving(false);
      }
    }

    setEditingCell(null);
    setEditingValue(null);
  }, [editingCell, editingValue, fieldValuesMap, fields, onFieldChange, saving]);

  // 开始编辑
  const handleStartEdit = useCallback(async (recordId: string, fieldId: string) => {
    if (!onFieldChange) return;
    
    const field = fields.find(f => f.id === fieldId);
    if (!field) return;

    const recordFieldValues = fieldValuesMap.get(recordId);
    const rawValue = recordFieldValues?.get(fieldId);

    if (isCheckboxField(fieldId)) {
      // 勾选字段：直接切换状态并保存
      const currentChecked = isChecked(rawValue);
      const newChecked = !currentChecked;
      
      try {
        setSaving(true);
        const updatedValue = await onFieldChange(recordId, fieldId, newChecked, rawValue);
        const finalValue = typeof updatedValue !== 'undefined' ? updatedValue : newChecked;

        // 更新本地值
        setFieldValuesMap(prev => {
          const newMap = new Map(prev);
          const recordMap = new Map(newMap.get(recordId) || new Map());
          recordMap.set(fieldId, finalValue);
          newMap.set(recordId, recordMap);
          return newMap;
        });

        Toast.success(`已${newChecked ? '勾选' : '取消勾选'}`);
      } catch (error: any) {
        console.error('[LoopTableRenderer] 勾选保存失败:', error);
        Toast.error(`保存失败: ${error.message || '未知错误'}`);
      } finally {
        setSaving(false);
      }
    } else {
      // 其他字段：进入编辑模式
      if (field.type === FieldType.SingleSelect) {
        setEditingValue(rawValue);
      } else {
        // 文本字段：提取纯文本
        setEditingValue(extractTextFromValue(rawValue));
      }
      setEditingCell({ recordId, fieldId });
    }
  }, [fields, fieldValuesMap, onFieldChange]);

  // 渲染复选框（可点击）
  const renderEditableCheckbox = (checked: boolean, recordId: string, fieldId: string) => {
    const canEdit = onFieldChange && isEditableField(fieldId);
    return (
      <span 
        className={`loop-table-checkbox ${checked ? 'checked' : ''} ${canEdit ? 'clickable' : ''}`}
        onClick={canEdit ? (e) => {
          e.stopPropagation();
          handleStartEdit(recordId, fieldId);
        } : undefined}
        title={canEdit ? '点击切换' : undefined}
      >
        {checked && <span className="checkmark">✓</span>}
      </span>
    );
  };

  // 渲染文本编辑器
  const renderTextEditor = (recordId: string, fieldId: string) => {
    return (
      <div ref={editingCellRef} className="loop-table-cell-editing">
        <Input
          value={editingValue || ''}
          onChange={(val) => setEditingValue(val)}
          onBlur={handleSaveEdit}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSaveEdit();
            } else if (e.key === 'Escape') {
              setEditingCell(null);
              setEditingValue(null);
            }
          }}
          autoFocus
          size="small"
          style={{ width: '100%' }}
        />
      </div>
    );
  };

  // 渲染单选编辑器
  const renderSelectEditor = (recordId: string, fieldId: string, field: IFieldMeta) => {
    const allOptions = (field.property as any)?.options || [];
    
    // 应用级联筛选
    const filteredOptions = getFilteredOptions(recordId, fieldId, allOptions);
    
    console.log('[LoopTableRenderer] 渲染单选编辑器', {
      fieldId,
      fieldName: field.name,
      allOptionsCount: allOptions.length,
      filteredOptionsCount: filteredOptions.length,
      recordId
    });
    
    return (
      <div ref={editingCellRef} className="loop-table-cell-editing loop-table-select-editing">
        <Select
          value={editingValue?.id || editingValue}
          onChange={(val) => {
            const option = filteredOptions.find((opt: any) => opt.id === val);
            setEditingValue(option || val);
            // 选择后自动保存
            setTimeout(() => {
              if (option) {
                handleSaveEdit();
              }
            }, 100);
          }}
          onBlur={handleSaveEdit}
          autoFocus
          size="default"
          style={{ width: '100%', minWidth: 180 }}
          filter
          placeholder="搜索选项..."
          dropdownStyle={{ maxHeight: 300 }}
          optionList={filteredOptions.map((opt: any) => ({
            value: opt.id,
            label: opt.name || opt.text,
          }))}
          emptyContent={filteredOptions.length === 0 ? "没有可用的选项" : undefined}
        />
      </div>
    );
  };

  // 构建表格列定义
  const tableColumns = columns.map((col: any) => {
    // 检查是否为勾选字段列
    const isCheckboxColumn = col.fieldId && isCheckboxField(col.fieldId);
    const isEditable = col.fieldId && isEditableField(col.fieldId);
    
    // 勾选列使用固定窄宽度（比表头多一个字符），其他列使用配置宽度或自动
    let columnWidth = col.width;
    if (isCheckboxColumn) {
      // 勾选列：表头4个字（入厂检验/COA项目/型式检验）约64px，加一个字符约80px
      columnWidth = 80;
    }
    
    return {
      title: col.label,
      dataIndex: col.id,
      key: col.id,
      width: columnWidth,
      // 勾选列居中显示，其他列默认居中（表头已统一居中）
      align: 'center' as const,
      // 自定义渲染
      render: (text: any, rowData: any) => {
        const recordId = rowData.key;
        const fieldId = col.fieldId;
        const field = fields.find(f => f.id === fieldId);
        const recordFieldValues = fieldValuesMap.get(recordId);
        const rawValue = recordFieldValues?.get(fieldId);
        
        // 检查是否正在编辑此单元格
        const isEditing = editingCell?.recordId === recordId && editingCell?.fieldId === fieldId;
        
        if (isCheckboxColumn) {
          // 勾选列
          const checked = rawValue !== undefined ? isChecked(rawValue) : isChecked(text);
          return renderEditableCheckbox(checked, recordId, fieldId);
        }
        
        if (isEditing && field) {
          // 编辑模式
          if (field.type === FieldType.SingleSelect) {
            return renderSelectEditor(recordId, fieldId, field);
          } else {
            return renderTextEditor(recordId, fieldId);
          }
        }
        
        // 普通显示模式
        let displayText = text || '';
        if (rawValue !== undefined && field) {
          displayText = formatFieldValue(rawValue, field.type) || '';

          // 仅显示日期（隐藏具体时间），用于变更记录等只需要年月日的列
          if (col.format === 'date' && rawValue) {
            if (typeof rawValue === 'number') {
              displayText = dayjs(rawValue).format('YYYY-MM-DD');
            } else if (typeof rawValue === 'string' || typeof displayText === 'string') {
              const sourceText = typeof displayText === 'string' ? displayText : String(rawValue);
              const dateMatch = sourceText.match(/^\d{4}-\d{2}-\d{2}/);
              if (dateMatch) {
                displayText = dateMatch[0];
              }
            }
          }
        }
        
        if (isEditable && onFieldChange) {
          return (
            <div
              className="loop-table-cell-editable"
              onDoubleClick={(e) => {
                e.stopPropagation();
                handleStartEdit(recordId, fieldId);
              }}
              title="双击编辑"
            >
              {displayText || <span className="loop-table-cell-empty">-</span>}
            </div>
          );
        }
        
        return displayText;
      }
    };
  });

  // 构建表格数据
  const tableData = records.map((record: IRecord) => {
    const rowData: any = { key: record.recordId };
    const recordFieldValues = fieldValuesMap.get(record.recordId) || new Map();
    
    columns.forEach((col: any) => {
      // 检查是否有列配置需要拼接字段
      if (columnConfig[col.id] && columnConfig[col.id].type === 'concat') {
        const concatConfig = columnConfig[col.id];
        const fieldIds = concatConfig.fields || [];
        const separator = concatConfig.separator || ',';
        
        const values = fieldIds.map((fieldId: string) => {
          let value = recordFieldValues.get(fieldId);
          if (value === undefined) {
            value = record.fields?.[fieldId];
          }
          const field = fields.find(f => f.id === fieldId);
          return field ? formatFieldValue(value, field.type) : '';
        }).filter(Boolean);
        
        rowData[col.id] = values.join(separator);
      } else if (col.fieldId) {
        // 普通字段
        let value = recordFieldValues.get(col.fieldId);
        if (value === undefined) {
          value = record.fields?.[col.fieldId];
        }
        const field = fields.find(f => f.id === col.fieldId);
        if (field) {
          let formattedValue = formatFieldValue(value, field.type);
          
          // 如果列配置了 format: 'date'，只显示日期部分
          if (col.format === 'date' && value) {
            if (typeof value === 'number') {
              formattedValue = dayjs(value).format('YYYY-MM-DD');
            } else if (typeof value === 'string') {
              // 如果是日期时间字符串，只取日期部分
              const dateMatch = formattedValue.match(/^\d{4}-\d{2}-\d{2}/);
              if (dateMatch) {
                formattedValue = dateMatch[0];
              }
            }
          }
          
          rowData[col.id] = formattedValue;
        } else {
          rowData[col.id] = '';
        }
      } else {
        rowData[col.id] = '';
      }
    });
    
    return rowData;
  });

  const showHeader = config.showHeader !== false;

  return (
    <div className="template-element template-table">
      <Table
        columns={tableColumns}
        dataSource={tableData}
        pagination={false}
        size="small"
        bordered={config.bordered !== false}
        showHeader={showHeader}
        style={{ width: '100%' }}
      />
    </div>
  );
};

