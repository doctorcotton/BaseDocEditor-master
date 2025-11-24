/**
 * 草稿自动保存
 */

import { DraftData } from '../types';

const DRAFT_KEY_PREFIX = 'base-doc-editor:draft:';
const DRAFT_EXPIRE_DAYS = 7;

/**
 * 保存草稿
 */
export function saveDraft(key: string, data: any): void {
  try {
    const draftKey = `${DRAFT_KEY_PREFIX}${key}`;
    const draftData: DraftData = {
      data,
      timestamp: Date.now()
    };
    localStorage.setItem(draftKey, JSON.stringify(draftData));
  } catch (error) {
    console.warn('保存草稿失败:', error);
  }
}

/**
 * 加载草稿
 */
export function loadDraft(key: string): any | null {
  try {
    const draftKey = `${DRAFT_KEY_PREFIX}${key}`;
    const stored = localStorage.getItem(draftKey);
    if (!stored) return null;

    const draftData: DraftData = JSON.parse(stored);
    
    // 草稿保留 N 天
    const expireTime = DRAFT_EXPIRE_DAYS * 24 * 60 * 60 * 1000;
    if (Date.now() - draftData.timestamp > expireTime) {
      localStorage.removeItem(draftKey);
      return null;
    }
    
    return draftData.data;
  } catch (error) {
    console.warn('加载草稿失败:', error);
    return null;
  }
}

/**
 * 删除草稿
 */
export function removeDraft(key: string): void {
  try {
    const draftKey = `${DRAFT_KEY_PREFIX}${key}`;
    localStorage.removeItem(draftKey);
  } catch (error) {
    console.warn('删除草稿失败:', error);
  }
}

/**
 * 清除所有过期草稿
 */
export function clearExpiredDrafts(): void {
  try {
    const expireTime = DRAFT_EXPIRE_DAYS * 24 * 60 * 60 * 1000;
    const keys = Object.keys(localStorage);
    
    keys.forEach(key => {
      if (key.startsWith(DRAFT_KEY_PREFIX)) {
        const stored = localStorage.getItem(key);
        if (stored) {
          try {
            const draftData: DraftData = JSON.parse(stored);
            if (Date.now() - draftData.timestamp > expireTime) {
              localStorage.removeItem(key);
            }
          } catch (e) {
            // 无法解析，直接删除
            localStorage.removeItem(key);
          }
        }
      }
    });
  } catch (error) {
    console.warn('清除过期草稿失败:', error);
  }
}

