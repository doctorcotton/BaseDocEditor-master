/**
 * 循环区域渲染器
 */

import React, { useState, useEffect } from 'react';
import { IRecord, IFieldMeta, bitable } from '@lark-base-open/js-sdk';
import { TemplateElement } from '../../types/template';
import { getLinkedRecords, filterRecords } from '../../utils/loopAreaFilter';
import { TemplateRenderer } from './TemplateRenderer';
import { LoopTableRenderer } from './LoopTableRenderer';
import './TemplateRenderer.css';

interface LoopAreaRendererProps {
  element: TemplateElement;
  record: IRecord;
  fields: IFieldMeta[];
  table: any;
  onComment?: (recordId: string, fieldId?: string) => void;
  commentStats?: Map<string, { total: number; unresolved: number }>;
  onFieldChange?: (fieldId: string, newValue: any, oldValue: any) => void;
  onLinkedFieldChange?: (linkedTable: any, recordId: string, fieldId: string, newValue: any, oldValue: any) => void;
}

export const LoopAreaRenderer: React.FC<LoopAreaRendererProps> = ({
  element,
  record,
  fields,
  table,
  onComment,
  commentStats,
  onFieldChange,
  onLinkedFieldChange
}) => {
  const [linkedRecords, setLinkedRecords] = useState<IRecord[]>([]);
  const [linkedFields, setLinkedFields] = useState<IFieldMeta[]>([]);
  const [linkedTable, setLinkedTable] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const config = element.config as any;
  const fieldId = config.fieldId;
  const filter = config.filter;

  useEffect(() => {
    loadLinkedRecords();
  }, [fieldId, record.recordId]);

  const loadLinkedRecords = async () => {
    if (!fieldId) {
      setLinkedRecords([]);
      setLinkedFields([]);
      setLinkedTable(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      console.log('[LoopAreaRenderer] 开始加载关联记录', { fieldId, recordId: record.recordId });
      
      // 获取关联记录
      const records = await getLinkedRecords(table, record.recordId, fieldId);
      console.log('[LoopAreaRenderer] 获取到关联记录', { count: records.length, records: records.map(r => r.recordId) });
      
      // 获取关联表的字段和表实例（用于筛选和渲染）
      let linkedTableFields: IFieldMeta[] = [];
      let linkedTableInstance: any = null;
      if (table) {
        try {
          const field = await table.getFieldById(fieldId);
          const fieldMeta = await field.getMeta();
          const linkedTableId = fieldMeta.property?.tableId;
          console.log('[LoopAreaRenderer] 关联表ID:', linkedTableId);
          if (linkedTableId) {
            // 使用 bitable.base 获取关联表
            linkedTableInstance = await bitable.base.getTable(linkedTableId);
            linkedTableFields = await linkedTableInstance.getFieldMetaList();
            console.log('[LoopAreaRenderer] 获取关联表字段', { count: linkedTableFields.length, fields: linkedTableFields.map(f => f.name) });
          }
        } catch (error) {
          console.error('[LoopAreaRenderer] 获取关联表字段失败:', error);
        }
      }
      
      setLinkedFields(linkedTableFields);
      setLinkedTable(linkedTableInstance);
      
      // 应用筛选条件（使用关联表的字段）
      console.log('[LoopAreaRenderer] 筛选条件:', filter);
      console.log('[LoopAreaRenderer] 记录字段示例:', records.length > 0 ? records[0].fields : '无记录');
      
      // 检查筛选字段是否存在
      if (filter && filter.fieldId) {
        const filterField = linkedTableFields.find(f => f.id === filter.fieldId);
        console.log('[LoopAreaRenderer] 筛选字段信息:', filterField);
        
        // 打印每条记录的筛选字段值
        records.forEach((r, i) => {
          const fieldValue = r.fields[filter.fieldId];
          console.log(`[LoopAreaRenderer] 记录${i}的筛选字段值:`, fieldValue);
        });
      }
      
      const filtered = filter && linkedTableFields.length > 0 
        ? filterRecords(records, filter, linkedTableFields) 
        : records;
      
      console.log('[LoopAreaRenderer] 筛选后的记录', { count: filtered.length, filtered: filtered.map(r => r.recordId) });
      setLinkedRecords(filtered);
    } catch (error) {
      console.error('[LoopAreaRenderer] 加载关联记录失败:', error);
      setLinkedRecords([]);
      setLinkedFields([]);
      setLinkedTable(null);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="loop-area loading">
        加载中...
      </div>
    );
  }

  if (linkedRecords.length === 0) {
    return (
      <div className="loop-area empty">
        暂无关联记录
      </div>
    );
  }

  // 检查子模板是否是表格，如果是表格，需要特殊处理：将所有关联记录作为表格数据源
  const hasTableTemplate = config.template && config.template.some((el: TemplateElement) => el.type === 'table');
  
  if (hasTableTemplate && linkedRecords.length > 0) {
    // 如果子模板包含表格，渲染一个汇总表格，所有关联记录作为数据源
    return (
      <div className="template-element template-loop">
        {config.template.map((subElement: TemplateElement) => {
          if (subElement.type === 'table') {
            // 对于表格，传递所有关联记录作为数据源
            // 创建适配器：将 LoopTableRenderer 的 onFieldChange 转换为 onLinkedFieldChange
            const handleLinkedTableFieldChange = onLinkedFieldChange 
              ? (recordId: string, fieldId: string, newValue: any, oldValue: any) => {
                  onLinkedFieldChange(linkedTable || table, recordId, fieldId, newValue, oldValue);
                }
              : undefined;
            
            return (
              <LoopTableRenderer
                key={subElement.id}
                element={subElement}
                records={linkedRecords}
                fields={linkedFields.length > 0 ? linkedFields : fields}
                table={linkedTable || table}
                onComment={onComment}
                commentStats={commentStats}
                onFieldChange={handleLinkedTableFieldChange}
              />
            );
          } else {
            // 其他类型的元素，为每条记录渲染一次
            return (
              <div key={subElement.id}>
                {linkedRecords.map((linkedRecord: IRecord, index: number) => (
                  <TemplateRenderer
                    key={`${subElement.id}-${linkedRecord.recordId || index}`}
                    template={{ ...element, elements: [subElement] } as any}
                    record={linkedRecord}
                    fields={linkedFields.length > 0 ? linkedFields : fields}
                    table={linkedTable || table}
                    onComment={onComment}
                    commentStats={commentStats}
                    onFieldChange={onFieldChange}
                  />
                ))}
              </div>
            );
          }
        })}
      </div>
    );
  }

  // 默认行为：为每条记录渲染子模板
  return (
    <div className="template-element template-loop">
      {linkedRecords.map((linkedRecord: IRecord, index: number) => (
        <div key={linkedRecord.recordId || index} className="loop-item">
          {config.template && config.template.length > 0 ? (
            // 递归渲染循环区域内的模板元素（使用关联表的字段和表实例）
            config.template.map((subElement: TemplateElement) => (
              <TemplateRenderer
                key={subElement.id}
                template={{ ...element, elements: [subElement] } as any}
                record={linkedRecord}
                fields={linkedFields.length > 0 ? linkedFields : fields}
                table={linkedTable || table}
                onComment={onComment}
                commentStats={commentStats}
                onFieldChange={onFieldChange}
              />
            ))
          ) : (
            // 如果没有子模板，显示记录ID
            <div>记录: {linkedRecord.recordId}</div>
          )}
        </div>
      ))}
    </div>
  );
};

