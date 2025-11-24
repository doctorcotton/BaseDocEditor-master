/**
 * 模板渲染器
 * 根据模板渲染文档（流式布局）
 */

import React from 'react';
import { Template, TemplateElement } from '../../types/template';
import { IRecord, IFieldMeta, FieldType } from '@lark-base-open/js-sdk';
import { parseFieldPath } from '../../utils/fieldPlaceholder';
import { LoopAreaRenderer } from './LoopAreaRenderer';
import { TableRenderer } from './TableRenderer';
import { formatFieldValue } from '../../utils/fieldFormatter';
import './TemplateRenderer.css';

interface TemplateRendererProps {
  template: Template;
  record: IRecord;
  fields: IFieldMeta[];
  table: any; // ITable
  onComment?: (recordId: string, fieldId?: string) => void;
  commentStats?: Map<string, { total: number; unresolved: number }>;
}

export const TemplateRenderer: React.FC<TemplateRendererProps> = ({
  template,
  record,
  fields,
  table,
  onComment,
  commentStats
}) => {
  // 渲染单个元素
  const renderElement = (element: TemplateElement, context: { record: IRecord; fields: IFieldMeta[] }): React.ReactNode => {
    switch (element.type) {
      case 'text':
        return renderTextElement(element, context);
      case 'field':
        return renderFieldElement(element, context);
      case 'loop':
        return renderLoopElement(element, context);
      case 'table':
        return renderTableElement(element, context);
      case 'image':
        return renderImageElement(element, context);
      case 'link':
        return renderLinkElement(element, context);
      default:
        return null;
    }
  };

  // 渲染文本元素
  const renderTextElement = (element: TemplateElement, context: { record: IRecord; fields: IFieldMeta[] }): React.ReactNode => {
    const config = element.config as any;
    const style: React.CSSProperties = {
      fontSize: config.fontSize || 14,
      fontWeight: config.fontWeight || 'normal',
      color: config.color || '#000000',
      textAlign: config.align || 'left'
    };

    return (
      <div
        key={element.id}
        className="template-element template-text"
        style={style}
      >
        {config.content || ''}
      </div>
    );
  };

  // 渲染字段元素
  const renderFieldElement = (element: TemplateElement, context: { record: IRecord; fields: IFieldMeta[] }): React.ReactNode => {
    const config = element.config as any;
    const fieldPath = config.fieldPath || '';
    
    if (!fieldPath) {
      return (
        <div key={element.id} className="template-element template-field">
          <span className="field-empty">未选择字段</span>
        </div>
      );
    }

    // 解析字段路径
    const fieldResult = parseFieldPath(fieldPath, context.fields);
    if (!fieldResult) {
      return (
        <div key={element.id} className="template-element template-field">
          <span className="field-error">字段不存在: {fieldPath}</span>
        </div>
      );
    }

    // 获取字段值
    const value = context.record.fields[fieldResult.fieldId];
    const displayValue = formatFieldValue(value, fieldResult.fieldType);

    // 获取评论统计
    const stats = commentStats?.get(`${context.record.recordId}:${fieldResult.fieldId}`);
    const hasComments = stats && stats.total > 0;

    return (
      <div
        key={element.id}
        className="template-element template-field"
      >
        <div className="field-content">
          <span className="field-label">{fieldResult.fieldName}:</span>
          <span className="field-value">{displayValue || <span className="field-empty">空</span>}</span>
        </div>
        {hasComments && onComment && (
          <div
            className="field-comment-badge"
            onClick={() => onComment(context.record.recordId, fieldResult.fieldId)}
            title={`${stats.total} 条评论，${stats.unresolved} 条未解决`}
          >
            💬 {stats.total}
          </div>
        )}
      </div>
    );
  };

  // 渲染循环元素
  const renderLoopElement = (element: TemplateElement, context: { record: IRecord; fields: IFieldMeta[] }): React.ReactNode => {
    const config = element.config as any;
    
    if (!config.fieldId) {
      return (
        <div key={element.id} className="template-element template-loop">
          <div className="loop-empty">未配置关联字段</div>
        </div>
      );
    }

    return (
      <LoopAreaRenderer
        key={element.id}
        element={element}
        record={context.record}
        fields={context.fields}
        table={table}
        onComment={onComment}
        commentStats={commentStats}
      />
    );
  };

  // 渲染表格元素
  const renderTableElement = (element: TemplateElement, context: { record: IRecord; fields: IFieldMeta[] }): React.ReactNode => {
    const config = element.config as any;
    
    if (!config.columns || config.columns.length === 0) {
      return (
        <div key={element.id} className="template-element template-table">
          <div className="table-empty">未配置表格列</div>
        </div>
      );
    }

    return (
      <TableRenderer
        key={element.id}
        element={element}
        record={context.record}
        fields={context.fields}
        table={table}
        onComment={onComment}
        commentStats={commentStats}
      />
    );
  };

  // 渲染图片元素
  const renderImageElement = (element: TemplateElement, context: { record: IRecord; fields: IFieldMeta[] }): React.ReactNode => {
    const config = element.config as any;
    const fieldId = config.fieldId;
    
    if (!fieldId) {
      return (
        <div key={element.id} className="template-element template-image">
          <div className="image-placeholder">未选择附件字段</div>
        </div>
      );
    }

    const attachments = context.record.fields[fieldId];
    if (!attachments || (Array.isArray(attachments) && attachments.length === 0)) {
      return (
        <div key={element.id} className="template-element template-image">
          <div className="image-placeholder">无图片</div>
        </div>
      );
    }

    const imageList = Array.isArray(attachments) ? attachments : [attachments];
    const firstImage = imageList[0];

    return (
      <div
        key={element.id}
        className="template-element template-image"
        style={{
          width: config.width || 200,
          height: config.height || 200
        }}
      >
        {firstImage.url ? (
          <img
            src={firstImage.url}
            alt={firstImage.name || '图片'}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'contain'
            }}
          />
        ) : (
          <div className="image-placeholder">图片加载中...</div>
        )}
      </div>
    );
  };

  // 渲染链接元素
  const renderLinkElement = (element: TemplateElement, context: { record: IRecord; fields: IFieldMeta[] }): React.ReactNode => {
    const config = element.config as any;
    const fieldId = config.fieldId;
    
    if (!fieldId) {
      return (
        <div key={element.id} className="template-element template-link">
          <span className="link-empty">未选择字段</span>
        </div>
      );
    }

    const value = context.record.fields[fieldId];
    const url = typeof value === 'string' ? value : value?.url || '';
    const linkText = config.text || url || '链接';

    if (!url) {
      return (
        <div key={element.id} className="template-element template-link">
          <span className="link-empty">无链接</span>
        </div>
      );
    }

    return (
      <div
        key={element.id}
        className="template-element template-link"
      >
        <a href={url} target="_blank" rel="noopener noreferrer">
          {linkText}
        </a>
      </div>
    );
  };

  const pageWidth = template.styles?.pageWidth || 794;
  const pageHeight = template.styles?.pageHeight || 1123;

  return (
    <div className="template-renderer-wrapper">
      <div 
        className="template-renderer"
        style={{
          width: pageWidth,
          minHeight: pageHeight
        }}
      >
        <div className="template-content-flow">
          {template.elements.length === 0 ? (
            <div className="template-empty">
              <p>模板为空，请在编辑模式下添加元素</p>
            </div>
          ) : (
            template.elements.map(element => {
              return renderElement(element, { record, fields });
            })
          )}
        </div>
      </div>
    </div>
  );
};
