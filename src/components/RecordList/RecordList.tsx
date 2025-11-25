/**
 * 记录列表组件（主页）
 * 显示表格，显示当前视图的前三列（第一列是索引列）
 */

import React, { useState, useEffect } from 'react';
import { Table, Spin, Empty } from '@douyinfe/semi-ui';
import { IRecord, IFieldMeta, ITable } from '@lark-base-open/js-sdk';
import { formatFieldValue } from '../../utils/fieldFormatter';
import './RecordList.css';

interface RecordListProps {
  table: ITable | null;
  records: IRecord[];
  fields: IFieldMeta[];
  loading: boolean;
  onSelectRecord: (recordId: string) => void;
}

export const RecordList: React.FC<RecordListProps> = ({
  table,
  records,
  fields,
  loading,
  onSelectRecord
}) => {
  const [viewFields, setViewFields] = useState<IFieldMeta[]>([]);
  const [fieldValuesMap, setFieldValuesMap] = useState<Map<string, Map<string, any>>>(new Map());
  const [loadingValues, setLoadingValues] = useState(false);

  useEffect(() => {
    console.log('RecordList - fields:', fields.length, 'records:', records.length);
    // 固定显示的字段ID列表
    const fixedFieldIds = [
      'fld3g1HhuN', // 标准名称（记录名称）
      'fldLwa5wPM', // 编制人
    ];
    
    if (fields.length > 0) {
      // 优先显示固定字段
      const fixedFields = fixedFieldIds
        .map(id => fields.find(f => f.id === id))
        .filter((f): f is IFieldMeta => f !== undefined);
      
      console.log('固定字段:', fixedFields.map(f => ({ id: f.id, name: f.name })));
      console.log('可用字段:', fields.map(f => ({ id: f.id, name: f.name })));
      
      // 如果固定字段不足2个，补充其他字段
      const displayFields = fixedFields.length >= 2 
        ? fixedFields.slice(0, 2)
        : [
            ...fixedFields,
            ...fields.filter(f => !fixedFieldIds.includes(f.id)).slice(0, 2 - fixedFields.length)
          ];
      
      console.log('显示字段:', displayFields.map(f => ({ id: f.id, name: f.name })));
      setViewFields(displayFields);
    } else {
      setViewFields([]);
    }
  }, [fields, records]);

  // 异步加载字段值
  useEffect(() => {
    if (!table || records.length === 0 || viewFields.length === 0) {
      return;
    }

    const loadFieldValues = async () => {
      setLoadingValues(true);
      const newMap = new Map<string, Map<string, any>>();
      
      // 固定字段ID列表
      const fixedFieldIds = ['fld3g1HhuN', 'fldLwa5wPM'];
      
      try {
        // 为每条记录加载固定字段的值
        for (const record of records) {
          const recordValueMap = new Map<string, any>();
          
          for (const fieldId of fixedFieldIds) {
            try {
              // 先从 record.fields 读取
              let value = record.fields?.[fieldId];
              if (value === undefined && table) {
                // 如果没有，使用 getCellValue 异步获取
                value = await table.getCellValue(fieldId, record.recordId);
              }
              recordValueMap.set(fieldId, value);
            } catch (error) {
              console.error(`[RecordList] 加载字段值失败: ${fieldId} for record ${record.recordId}`, error);
              recordValueMap.set(fieldId, null);
            }
          }
          
          newMap.set(record.recordId, recordValueMap);
        }
      } catch (error) {
        console.error('[RecordList] 批量加载字段值失败:', error);
      }
      
      setFieldValuesMap(newMap);
      setLoadingValues(false);
    };

    loadFieldValues();
  }, [table, records, viewFields]);

  // 加载中
  if (loading) {
    return (
      <div className="record-list-loading">
        <Spin size="large" tip="加载数据中..." />
      </div>
    );
  }

  // 未选择表格
  if (!table) {
    return (
      <div className="record-list">
        <Empty
          title="请选择表格"
          description="请在上方选择要查看的表格"
        />
      </div>
    );
  }

  // 没有字段
  if (fields.length === 0) {
    return (
      <div className="record-list">
        <Empty
          title="暂无字段"
          description="该表格没有字段"
        />
      </div>
    );
  }

  // 没有记录
  if (records.length === 0) {
    return (
      <div className="record-list">
        <Empty
          title="暂无数据"
          description="请先在多维表格中添加记录"
        />
      </div>
    );
  }

  // 构建表格列
  const columns = [
    {
      title: '#',
      dataIndex: 'index',
      key: 'index',
      width: 60,
      render: (_: any, __: any, index: number) => index + 1
    },
    ...viewFields.map(field => ({
      title: field.name,
      dataIndex: field.id,
      key: field.id,
      render: (value: any) => {
        const formatted = formatFieldValue(value, field.type);
        return formatted ? formatted : <span className="field-empty">空</span>;
      }
    }))
  ];

  // 如果没有字段，显示提示
  if (viewFields.length === 0 && fields.length > 0) {
    return (
      <div className="record-list">
        <Empty
          title="字段配置中"
          description="正在加载字段信息..."
        />
      </div>
    );
  }

  // 构建表格数据
  const tableData = records.map((record, index) => {
    const recordData: any = {
      key: record.recordId,
      index: index + 1,
      ...record.fields
    };
    
    // 使用异步加载的字段值覆盖（如果存在）
    const asyncValues = fieldValuesMap.get(record.recordId);
    if (asyncValues) {
      asyncValues.forEach((value, fieldId) => {
        recordData[fieldId] = value;
      });
    }
    
    return recordData;
  });

  return (
    <div className="record-list">
      <Table
        columns={columns}
        dataSource={tableData}
        pagination={{
          pageSize: 20,
          showSizeChanger: true,
          showTotal: true
        }}
        onRow={(record) => ({
          onClick: () => {
            const recordId = tableData.find(item => item.key === record.key)?.key;
            if (recordId) {
              onSelectRecord(recordId);
            }
          },
          style: { cursor: 'pointer' }
        })}
        size="small"
      />
    </div>
  );
};

