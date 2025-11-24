/**
 * 文档渲染组件
 */

import React from 'react';
import { Card, Typography, Empty, Spin } from '@douyinfe/semi-ui';
import { IRecord, IFieldMeta } from '@lark-base-open/js-sdk';
import { FieldRenderer } from './FieldRenderer';
import './DocumentRenderer.css';

const { Title, Text } = Typography;

interface DocumentRendererProps {
  records: IRecord[];
  fields: IFieldMeta[];
  changes: Map<string, any>;
  loading?: boolean;
  onFieldEdit: (recordId: string, fieldId: string, fieldName: string, oldValue: any, newValue: any) => void;
  onFieldComment?: (recordId: string, fieldId: string) => void;
}

export const DocumentRenderer: React.FC<DocumentRendererProps> = ({
  records,
  fields,
  changes,
  loading = false,
  onFieldEdit,
  onFieldComment
}) => {
  if (loading) {
    return (
      <div className="document-loading">
        <Spin size="large" tip="加载数据中..." />
      </div>
    );
  }

  if (records.length === 0) {
    return (
      <Empty
        title="暂无数据"
        description="请先在多维表格中添加记录"
      />
    );
  }

  if (fields.length === 0) {
    return (
      <Empty
        title="暂无字段"
        description="该表格没有字段"
      />
    );
  }

  // 第一个字段作为标题字段
  const titleField = fields[0];
  const contentFields = fields.slice(1);

  return (
    <div className="document-container">
      {records.map((record) => {
        const recordId = record.recordId;
        const titleValue = record.fields[titleField.id];

        return (
          <Card 
            key={recordId} 
            className="document-section"
            shadows="hover"
          >
            <Title heading={3} className="section-title">
              {titleValue ? String(titleValue) : '未命名记录'}
            </Title>
            <Text type="tertiary" size="small" className="record-id">
              记录ID: {recordId}
            </Text>
            
            <div className="field-grid">
              {contentFields.map((field) => {
                const fieldId = field.id;
                const fieldValue = record.fields[fieldId];
                const changeKey = `${recordId}:${fieldId}`;
                const isChanged = changes.has(changeKey);

                return (
                  <FieldRenderer
                    key={fieldId}
                    record={record}
                    field={field}
                    value={fieldValue}
                    isChanged={isChanged}
                    onEdit={(newValue) => {
                      onFieldEdit(recordId, fieldId, field.name, fieldValue, newValue);
                    }}
                    onComment={onFieldComment ? () => onFieldComment(recordId, fieldId) : undefined}
                  />
                );
              })}
            </div>
          </Card>
        );
      })}
    </div>
  );
};

