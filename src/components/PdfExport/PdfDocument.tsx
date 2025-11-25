/**
 * PDF文档组件
 * 主入口组件，渲染整个PDF文档
 */

import React from 'react';
import { Document, Page, View, Text } from '@react-pdf/renderer';
import { IRecord, IFieldMeta } from '@lark-base-open/js-sdk';
import { Template, TemplateElement } from '../../types/template';
import { pdfStyles } from './pdfStyles';
import { PdfTextElement } from './PdfTextElement';
import { PdfFieldElement } from './PdfFieldElement';
import { PdfTableElement } from './PdfTableElement';
import { PdfImageElement } from './PdfImageElement';
import { PdfLinkElement } from './PdfLinkElement';
import { PdfLoopArea } from './PdfLoopArea';
import '../../utils/pdfFonts'; // 注册字体

export interface LoopDataCache {
  records: IRecord[];
  fields: IFieldMeta[];
  linkedTable: any;
}

interface PdfDocumentProps {
  template: Template;
  record: IRecord;
  fields: IFieldMeta[];
  table: any;
  printTimestamp?: string;
  loopDataCache?: Map<string, LoopDataCache>; // 预加载的循环数据
}

// 主文档组件
const PdfDocumentContent: React.FC<PdfDocumentProps> = ({
  template,
  record,
  fields,
  table,
  printTimestamp,
  loopDataCache = new Map()
}) => {

  // 渲染单个元素
  const renderElement = (element: TemplateElement): React.ReactNode => {
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
      
      case 'loop': {
        const loopData = loopDataCache.get(element.id);
        if (!loopData) {
          return (
            <View key={element.id} style={pdfStyles.loopArea}>
              <Text style={pdfStyles.emptyValue}>循环数据加载失败</Text>
            </View>
          );
        }
        return (
          <PdfLoopArea 
            key={element.id}
            element={element}
            record={record}
            fields={fields}
            loopRecords={loopData.records}
            loopFields={loopData.fields}
          />
        );
      }
      
      case 'table':
        return (
          <PdfTableElement 
            key={element.id}
            element={element}
            record={record}
            fields={fields}
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
  };

  return (
    <Document>
      <Page size="A4" style={pdfStyles.page}>
        <View style={pdfStyles.content}>
          {template.elements.length === 0 ? (
            <Text style={pdfStyles.emptyValue}>模板为空</Text>
          ) : (
            template.elements.map(element => renderElement(element))
          )}
        </View>
        
        {printTimestamp && (
          <Text style={pdfStyles.printTimestamp}>
            打印时间：{printTimestamp}
          </Text>
        )}
      </Page>
    </Document>
  );
};

// 直接导出组件
export const PdfDocument = PdfDocumentContent;

