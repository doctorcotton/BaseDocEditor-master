/**
 * PDF链接元素组件
 * 渲染超链接
 */

import React from 'react';
import { Text, Link, View } from '@react-pdf/renderer';
import { IRecord } from '@lark-base-open/js-sdk';
import { TemplateElement } from '../../types/template';
import { pdfStyles } from './pdfStyles';

interface PdfLinkElementProps {
  element: TemplateElement;
  record: IRecord;
}

export const PdfLinkElement: React.FC<PdfLinkElementProps> = ({ 
  element, 
  record 
}) => {
  const config = element.config as any;
  const fieldId = config.fieldId;
  
  if (!fieldId) {
    return (
      <Text style={pdfStyles.emptyValue}>未选择字段</Text>
    );
  }
  
  const value = record.fields[fieldId];
  
  // 提取链接
  const links: Array<{ url: string; text: string }> = [];
  
  if (Array.isArray(value)) {
    value.forEach((item: any) => {
      if (typeof item === 'object' && item !== null) {
        const url = (item as any).link || (item as any).url || '';
        const text = (item as any).text || (item as any).name || url;
        if (url) {
          links.push({ url, text });
        }
      } else if (typeof item === 'string' && (item.startsWith('http://') || item.startsWith('https://'))) {
        links.push({ url: item, text: item });
      }
    });
  } else if (typeof value === 'object' && value !== null) {
    const url = (value as any).link || (value as any).url || '';
    const text = (value as any).text || (value as any).name || url;
    if (url) {
      links.push({ url, text });
    }
  } else if (typeof value === 'string' && (value.startsWith('http://') || value.startsWith('https://'))) {
    links.push({ url: value, text: value });
  }
  
  if (links.length === 0) {
    return (
      <Text style={pdfStyles.emptyValue}>无链接</Text>
    );
  }
  
  // 单个链接
  if (links.length === 1) {
    const link = links[0];
    const displayText = config.text || link.text || '链接';
    return (
      <Link src={link.url} style={pdfStyles.link}>
        {displayText}
      </Link>
    );
  }
  
  // 多个链接，显示为列表
  return (
    <View>
      {links.map((link, index) => (
        <View key={index} style={{ marginBottom: 4 }}>
          <Link src={link.url} style={pdfStyles.link}>
            • {link.text || '链接'}
          </Link>
        </View>
      ))}
    </View>
  );
};

