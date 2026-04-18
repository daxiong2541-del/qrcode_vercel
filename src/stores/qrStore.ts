import { create } from 'zustand';

export interface QRCodeItem {
  id: string;
  text: string;
  dataUrl: string;
  label: string | null;
  createdAt: Date;
}

interface QRStore {
  qrCodes: QRCodeItem[];
  isGenerating: boolean;
  addQRCode: (text: string, dataUrl: string, label: string | null) => void;
  addBatchQRCodes: (items: { text: string; dataUrl: string; label: string | null }[]) => void;
  removeQRCode: (id: string) => void;
  clearAllQRCodes: () => void;
  setIsGenerating: (isGenerating: boolean) => void;
}

export const useQRStore = create<QRStore>((set) => ({
  qrCodes: [],
  isGenerating: false,
  
  addQRCode: (text: string, dataUrl: string, label: string | null) => {
    const newQRCode: QRCodeItem = {
      id: Date.now().toString(),
      text,
      dataUrl,
      label,
      createdAt: new Date(),
    };
    
    set((state) => ({
      qrCodes: [newQRCode, ...state.qrCodes],
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
    
    set((state) => ({
      qrCodes: [...newQRCodes, ...state.qrCodes],
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
}));