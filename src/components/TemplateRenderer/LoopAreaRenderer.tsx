/**
 * 循环区域渲染器
 */

import React, { useState, useEffect } from 'react';
import { IRecord, IFieldMeta } from '@lark-base-open/js-sdk';
import { TemplateElement } from '../../types/template';
import { getLinkedRecords, filterRecords } from '../../utils/loopAreaFilter';
import { TemplateRenderer } from './TemplateRenderer';
import './TemplateRenderer.css';

interface LoopAreaRendererProps {
  element: TemplateElement;
  record: IRecord;
  fields: IFieldMeta[];
  table: any;
  onComment?: (recordId: string, fieldId?: string) => void;
  commentStats?: Map<string, { total: number; unresolved: number }>;
}

export const LoopAreaRenderer: React.FC<LoopAreaRendererProps> = ({
  element,
  record,
  fields,
  table,
  onComment,
  commentStats
}) => {
  const [linkedRecords, setLinkedRecords] = useState<IRecord[]>([]);
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
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      // 获取关联记录
      const records = await getLinkedRecords(table, record.recordId, fieldId);
      
      // 应用筛选条件
      const filtered = filter ? filterRecords(records, filter, fields) : records;
      
      setLinkedRecords(filtered);
    } catch (error) {
      console.error('加载关联记录失败:', error);
      setLinkedRecords([]);
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

  return (
    <div
      className="template-element template-loop"
      style={{
        position: 'absolute',
        left: element.position.x,
        top: element.position.y
      }}
    >
      {linkedRecords.map((linkedRecord: IRecord, index: number) => (
        <div key={linkedRecord.recordId || index} className="loop-item">
          {config.template && config.template.length > 0 ? (
            // 递归渲染循环区域内的模板元素
            config.template.map((subElement: TemplateElement) => (
              <TemplateRenderer
                key={subElement.id}
                template={{ ...element, elements: [subElement] } as any}
                record={linkedRecord}
                fields={fields}
                table={table}
                onComment={onComment}
                commentStats={commentStats}
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

