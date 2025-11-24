/**
 * 评论面板组件
 * 显示评论列表、输入框、支持@提及和附件
 */

import React, { useState, useEffect } from 'react';
import { Card, Input, Button, Avatar, Typography, Tag, Upload, Spin } from '@douyinfe/semi-ui';
import { IconSend, IconImage, IconClose } from '@douyinfe/semi-icons';
import { Comment } from '../../types/comment';
import { useCommentStorage } from '../../hooks/useCommentStorage';
import { ITable } from '@lark-base-open/js-sdk';
import dayjs from 'dayjs';
import './CommentPanel.css';

const { Text, Paragraph } = Typography;

interface CommentPanelProps {
  recordId: string;
  fieldId?: string;
  table: ITable;
  visible: boolean;
  onClose: () => void;
}

export const CommentPanel: React.FC<CommentPanelProps> = ({
  recordId,
  fieldId,
  table,
  visible,
  onClose
}) => {
  const [content, setContent] = useState('');
  const [mentions, setMentions] = useState<string[]>([]);
  const [attachments, setAttachments] = useState<string[]>([]);
  const [replyingTo, setReplyingTo] = useState<Comment | null>(null);

  const {
    comments,
    loading,
    loadComments,
    addComment,
    replyComment,
    resolveComment,
    deleteComment
  } = useCommentStorage();

  const commentKey = fieldId ? `${recordId}:${fieldId}` : recordId;
  const commentList = comments.get(commentKey) || [];

  useEffect(() => {
    if (visible) {
      loadComments(table, recordId, fieldId);
    }
  }, [visible, recordId, fieldId]);

  // 处理发送评论
  const handleSend = async () => {
    if (!content.trim()) {
      return;
    }

    if (replyingTo) {
      // 回复评论
      await replyComment(table, replyingTo.id, recordId, fieldId, content);
      setReplyingTo(null);
    } else {
      // 添加新评论
      await addComment(table, recordId, fieldId, content, attachments);
    }

    setContent('');
    setMentions([]);
    setAttachments([]);
  };

  // 处理@提及
  const handleMention = (userId: string, userName: string) => {
    if (!mentions.includes(userId)) {
      setMentions([...mentions, userId]);
      setContent(prev => prev + `@${userName} `);
    }
  };

  // 处理附件上传
  const handleAttachmentChange = (fileList: any[]) => {
    const tokens = fileList
      .filter(file => file.status === 'success' && file.response?.token)
      .map(file => file.response.token);
    setAttachments(tokens);
  };

  // 构建评论树
  const buildCommentTree = (comments: Comment[]): Comment[] => {
    const commentMap = new Map<string, Comment>();
    const rootComments: Comment[] = [];

    // 先建立映射
    comments.forEach(comment => {
      commentMap.set(comment.id, comment);
    });

    // 构建树结构
    comments.forEach(comment => {
      if (comment.parentId) {
        const parent = commentMap.get(comment.parentId);
        if (parent) {
          // 这里可以添加 children 属性，但类型定义中没有，暂时不处理
        }
      } else {
        rootComments.push(comment);
      }
    });

    return rootComments.sort((a, b) => b.timestamp - a.timestamp);
  };

  const rootComments = buildCommentTree(commentList);

  if (!visible) {
    return null;
  }

  return (
    <div className="comment-panel-overlay" onClick={onClose}>
      <Card
        className="comment-panel"
        onClick={(e) => e.stopPropagation()}
        title={
          <div className="comment-panel-header">
            <Text strong>评论 ({commentList.length})</Text>
            <Button
              icon={<IconClose />}
              type="tertiary"
              size="small"
              onClick={onClose}
            />
          </div>
        }
      >
        <div className="comment-panel-content">
          {loading ? (
            <Spin />
          ) : (
            <>
              <div className="comment-list">
                {rootComments.length === 0 ? (
                  <div className="comment-empty">暂无评论</div>
                ) : (
                  rootComments.map(comment => (
                    <CommentItem
                      key={comment.id}
                      comment={comment}
                      allComments={commentList}
                      onReply={setReplyingTo}
                      onResolve={async (resolved) => {
                        await resolveComment(table, comment.id, resolved);
                      }}
                      onDelete={async () => {
                        await deleteComment(table, comment.id);
                      }}
                    />
                  ))
                )}
              </div>

              <div className="comment-input-area">
                {replyingTo && (
                  <div className="reply-indicator">
                    <Text type="tertiary" size="small">
                      回复 {replyingTo.author}:
                    </Text>
                    <Button
                      size="small"
                      type="tertiary"
                      icon={<IconClose />}
                      onClick={() => setReplyingTo(null)}
                    />
                  </div>
                )}

                <Input
                  value={content}
                  onChange={setContent}
                  placeholder={replyingTo ? '输入回复...' : '输入评论...'}
                  onPressEnter={(e) => {
                    if (e.shiftKey) {
                      return; // Shift+Enter 换行
                    }
                    e.preventDefault();
                    handleSend();
                  }}
                  type="textarea"
                  rows={3}
                />

                <div className="comment-input-actions">
                  <div className="comment-input-left">
                    <Upload
                      action="/api/upload"
                      onChange={handleAttachmentChange}
                      showUploadList={false}
                    >
                      <Button
                        icon={<IconImage />}
                        type="tertiary"
                        size="small"
                      >
                        图片
                      </Button>
                    </Upload>
                  </div>
                  <Button
                    icon={<IconSend />}
                    type="primary"
                    onClick={handleSend}
                    disabled={!content.trim()}
                  >
                    发送
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </Card>
    </div>
  );
};

/**
 * 评论项组件
 */
interface CommentItemProps {
  comment: Comment;
  allComments: Comment[];
  onReply: (comment: Comment) => void;
  onResolve: (resolved: boolean) => Promise<void>;
  onDelete: () => Promise<void>;
}

const CommentItem: React.FC<CommentItemProps> = ({
  comment,
  allComments,
  onReply,
  onResolve,
  onDelete
}) => {
  const [resolved, setResolved] = useState(comment.resolved);

  const handleResolve = async () => {
    const newResolved = !resolved;
    setResolved(newResolved);
    await onResolve(newResolved);
  };

  // 获取回复列表
  const replies = allComments.filter(c => c.parentId === comment.id);

  return (
    <div className={`comment-item ${resolved ? 'resolved' : ''}`}>
      <div className="comment-main">
        <Avatar size="small" style={{ marginRight: 8 }}>
          {comment.author.charAt(0)}
        </Avatar>
        <div className="comment-body">
          <div className="comment-header">
            <Text strong>{comment.author}</Text>
            <Text type="tertiary" size="small">
              {dayjs(comment.timestamp).format('YYYY-MM-DD HH:mm')}
            </Text>
          </div>
          <Paragraph>{comment.content}</Paragraph>
          {comment.attachments && comment.attachments.length > 0 && (
            <div className="comment-attachments">
              {comment.attachments.map((token, index) => (
                <img
                  key={index}
                  src={`https://open.feishu.cn/open-apis/drive/v1/files/${token}/download`}
                  alt={`附件 ${index + 1}`}
                  className="comment-attachment-image"
                />
              ))}
            </div>
          )}
          <div className="comment-actions">
            <Button
              size="small"
              type="tertiary"
              onClick={() => onReply(comment)}
            >
              回复
            </Button>
            <Button
              size="small"
              type="tertiary"
              onClick={handleResolve}
            >
              {resolved ? '标记未解决' : '标记已解决'}
            </Button>
            <Button
              size="small"
              type="danger"
              onClick={onDelete}
            >
              删除
            </Button>
          </div>
        </div>
      </div>
      {replies.length > 0 && (
        <div className="comment-replies">
          {replies.map(reply => (
            <CommentItem
              key={reply.id}
              comment={reply}
              allComments={allComments}
              onReply={onReply}
              onResolve={onResolve}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
};

