/**
 * PDF循环区域组件
 * 渲染关联记录列表
 */

import React from 'react';
import { View, Text } from '@react-pdf/renderer';
import { IRecord, IFieldMeta } from '@lark-base-open/js-sdk';
import { TemplateElement } from '../../types/template';
import { pdfStyles } from './pdfStyles';
import { PdfTextElement } from './PdfTextElement';
import { PdfFieldElement } from './PdfFieldElement';
import { PdfTableElement } from './PdfTableElement';
import { PdfImageElement } from './PdfImageElement';
import { PdfLinkElement } from './PdfLinkElement';

interface PdfLoopAreaProps {
  element: TemplateElement;
  record: IRecord;
  fields: IFieldMeta[];
  loopRecords: IRecord[];
  loopFields: IFieldMeta[];
}

export const PdfLoopArea: React.FC<PdfLoopAreaProps> = ({ 
  element, 
  record,
  fields,
  loopRecords,
  loopFields
}) => {
  const config = element.config as any;
  const template = config.template || [];
  
  if (loopRecords.length === 0) {
    return (
      <View style={pdfStyles.loopArea}>
        <Text style={pdfStyles.emptyValue}>无关联记录</Text>
      </View>
    );
  }
  
  // 检查模板中是否包含循环表格
  const hasLoopTable = template.some((el: TemplateElement) => {
    return el.type === 'table' && (el.config as any).dataSource === 'loop';
  });
  
  // 如果有循环表格，直接渲染一次模板（表格会处理所有记录）
  if (hasLoopTable) {
    return (
      <View style={pdfStyles.loopArea}>
        {template.map((loopElement: TemplateElement) => (
          renderLoopElement(loopElement, record, fields, loopRecords, loopFields)
        ))}
      </View>
    );
  }
  
  // 没有循环表格，为每条记录渲染一次模板
  return (
    <View style={pdfStyles.loopArea}>
      {loopRecords.map((loopRecord, index) => (
        <View key={loopRecord.recordId} style={pdfStyles.loopItem}>
          {template.map((loopElement: TemplateElement) => (
            renderLoopElement(loopElement, loopRecord, loopFields, loopRecords, loopFields)
          ))}
        </View>
      ))}
    </View>
  );
};

// 渲染循环区域内的单个元素
function renderLoopElement(
  element: TemplateElement,
  record: IRecord,
  fields: IFieldMeta[],
  loopRecords?: IRecord[],
  loopFields?: IFieldMeta[]
): React.ReactNode {
  switch (element.type) {
    case 'text':
      return <PdfTextElement key={element.id} element={element} />;
    
    case 'field':
      return (
        <PdfFieldElement 
          key={element.id}
          element={element}
          record={record}
          fields={fields}
        />
      );
    
    case 'table':
      return (
        <PdfTableElement 
          key={element.id}
          element={element}
          record={record}
          fields={fields}
          loopRecords={loopRecords}
          loopFields={loopFields}
        />
      );
    
    case 'image':
      return (
        <PdfImageElement 
          key={element.id}
          element={element}
          record={record}
          fields={fields}
        />
      );
    
    case 'link':
      return (
        <PdfLinkElement 
          key={element.id}
          element={element}
          record={record}
        />
      );
    
    default:
      return null;
  }
}

