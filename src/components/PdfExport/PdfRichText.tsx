/**
 * PDF富文本渲染组件
 * 支持文本和超链接的混合渲染
 */

import React from 'react';
import { Text, Link } from '@react-pdf/renderer';
import { pdfStyles } from './pdfStyles';
import { RichTextSegment } from '../../utils/pdfDataMapper';

interface PdfRichTextProps {
  segments: RichTextSegment[];
  style?: any;
}

export const PdfRichText: React.FC<PdfRichTextProps> = ({ segments, style }) => {
  return (
    <Text style={style}>
      {segments.map((segment, index) => {
        if (segment.type === 'link' && segment.url) {
          return (
            <Link key={index} src={segment.url} style={pdfStyles.link}>
              {segment.text}
            </Link>
          );
        }
        return (
          <Text key={index}>
            {segment.text}
          </Text>
        );
      })}
    </Text>
  );
};

