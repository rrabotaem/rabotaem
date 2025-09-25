interface Window {
  dataLayer: any[];
  gtag: (...args: any[]) => void;
  ym: (id: number, method: string, options?: object) => void;
  [key: string]: any; // Разрешаем динамические свойства
} 