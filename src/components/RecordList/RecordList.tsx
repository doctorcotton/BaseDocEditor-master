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

  useEffect(() => {
    console.log('RecordList - fields:', fields.length, 'records:', records.length);
    // 获取当前视图的前三列（第一列是索引列，实际显示前两个字段列）
    if (fields.length > 0) {
      // 取前两个字段（索引列是自动的，不需要包含）
      const displayFields = fields.slice(0, 2);
      console.log('显示字段:', displayFields.map(f => f.name));
      setViewFields(displayFields);
    } else {
      setViewFields([]);
    }
  }, [fields, records]);

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
  const tableData = records.map((record, index) => ({
    key: record.recordId,
    index: index + 1,
    ...record.fields
  }));

  return (
    <div className="record-list">
      <Table
        columns={columns}
        dataSource={tableData}
        pagination={{
          pageSize: 20,
          showSizeChanger: true,
          showTotal: (total) => `共 ${total} 条记录`
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

