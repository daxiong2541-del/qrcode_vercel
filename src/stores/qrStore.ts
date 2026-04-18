import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface QRCodeItem {
  id: string;
  text: string;
  dataUrl: string;
  label: string | null;
  createdAt: Date;
}

interface QRStore {
  // 二维码列表状态
  qrCodes: QRCodeItem[];
  isGenerating: boolean;
  
  // 输入框缓存状态
  inputText: string;
  batchInput: string;
  isBatchMode: boolean;
  useSpecialFormat: boolean;

  // 二维码操作
  addQRCode: (text: string, dataUrl: string, label: string | null) => void;
  addBatchQRCodes: (items: { text: string; dataUrl: string; label: string | null }[]) => void;
  removeQRCode: (id: string) => void;
  clearAllQRCodes: () => void;
  setIsGenerating: (isGenerating: boolean) => void;

  // 缓存操作
  setInputText: (text: string) => void;
  setBatchInput: (text: string) => void;
  setIsBatchMode: (mode: boolean) => void;
  setUseSpecialFormat: (use: boolean) => void;
}

export const useQRStore = create<QRStore>()(
  persist(
    (set) => ({
      qrCodes: [],
      isGenerating: false,
      
      inputText: '',
      batchInput: '',
      isBatchMode: false,
      useSpecialFormat: false,
      
      addQRCode: (text: string, dataUrl: string, label: string | null) => {
        const newQRCode: QRCodeItem = {
          id: Date.now().toString(),
          text,
          dataUrl,
          label,
          createdAt: new Date(),
        };
        
        set(() => ({
          qrCodes: [newQRCode], // 每次生成单个二维码时，只保留这一个（清空之前的）
        }));
      },
      
      addBatchQRCodes: (items: { text: string; dataUrl: string; label: string | null }[]) => {
        const newQRCodes: QRCodeItem[] = items.map((item, index) => ({
          id: `${Date.now()}-${index}-${Math.random().toString(36).substring(2, 9)}`,
          text: item.text,
          dataUrl: item.dataUrl,
          label: item.label,
          createdAt: new Date(),
        }));
        
        set(() => ({
          qrCodes: [...newQRCodes], // 每次生成批量二维码时，只保留这一次生成的列表（清空之前的）
        }));
      },
      
      removeQRCode: (id: string) => {
        set((state) => ({
          qrCodes: state.qrCodes.filter(qr => qr.id !== id),
        }));
      },
      
      clearAllQRCodes: () => {
        set({ qrCodes: [] });
      },
      
      setIsGenerating: (isGenerating: boolean) => {
        set({ isGenerating });
      },

      setInputText: (text: string) => set({ inputText: text }),
      setBatchInput: (text: string) => set({ batchInput: text }),
      setIsBatchMode: (mode: boolean) => set({ isBatchMode: mode }),
      setUseSpecialFormat: (use: boolean) => set({ useSpecialFormat: use }),
    }),
    {
      name: 'qr-code-storage',
      // 只缓存输入框相关的内容，不要缓存生成的图片（Base64太大了）
      partialize: (state) => ({
        inputText: state.inputText,
        batchInput: state.batchInput,
        isBatchMode: state.isBatchMode,
        useSpecialFormat: state.useSpecialFormat,
      }),
    }
  )
);