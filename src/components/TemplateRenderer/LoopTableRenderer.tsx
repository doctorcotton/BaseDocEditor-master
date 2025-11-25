/**
 * 循环区域表格渲染器
 * 用于在循环区域中渲染表格，多条关联记录作为数据源
 */

import React, { useState, useEffect } from 'react';
import { Table } from '@douyinfe/semi-ui';
import { IRecord, IFieldMeta } from '@lark-base-open/js-sdk';
import dayjs from 'dayjs';
import { TemplateElement } from '../../types/template';
import { formatFieldValue } from '../../utils/fieldFormatter';
import './TemplateRenderer.css';

interface LoopTableRendererProps {
  element: TemplateElement;
  records: IRecord[];
  fields: IFieldMeta[];
  table: any;
  onComment?: (recordId: string, fieldId?: string) => void;
  commentStats?: Map<string, { total: number; unresolved: number }>;
}

export const LoopTableRenderer: React.FC<LoopTableRendererProps> = ({
  element,
  records,
  fields,
  table,
  onComment,
  commentStats
}) => {
  const config = element.config as any;
  const columns = config.columns || [];
  const columnConfig = config.columnConfig || {};
  const [fieldValuesMap, setFieldValuesMap] = useState<Map<string, Map<string, any>>>(new Map());

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
  }, [table, records, columns, columnConfig, fields]);

  // 构建表格列定义
  const tableColumns = columns.map((col: any) => ({
    title: col.label,
    dataIndex: col.id,
    key: col.id,
    width: col.width,
    align: col.align || 'left'
  }));

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
      />
    </div>
  );
};

