// ═══════════════════════════════════════════════════════════════════════════
//   СПРАВОЧНИК НОМЕРОВ ОШИБОК
//   У каждой возможной ошибки — свой номер и понятное место (где искать).
//   Когда что-то ломается, на экране снизу появляется плашка:
//       сверху — НОМЕР ошибки, снизу — ГДЕ она находится.
//   Если ошибок несколько — номера и места перечисляются через запятую.
//
//   Как пользоваться разработчику: нашли на экране номер -> смотрите сюда ->
//   идёте в указанный файл/место и чините.
// ═══════════════════════════════════════════════════════════════════════════

export interface ErrorInfo {
  code: number;
  where: string;   // короткое «где это» — показывается пользователю
  file: string;    // подсказка разработчику — где в коде искать
}

export const ERROR_CATALOG: Record<number, ErrorInfo> = {
  101: { code: 101, where: 'Погода (загрузка из интернета)', file: 'DynamicSun.tsx → fetch("/api/weather")' },
  102: { code: 102, where: 'Погода (панель интерфейса)',     file: 'BuildingModelViewer.tsx → fetchWeather' },
  201: { code: 201, where: 'Загрузка стен здания',           file: 'BuildingModelViewer.tsx → fetch("/walls.json")' },
  301: { code: 301, where: '3D-движок (WebGL)',              file: 'WebGLBoundary.tsx / графика сцены' },
  401: { code: 401, where: 'Офлайн-кэш (Service Worker)',     file: 'BuildingModelViewer.tsx → serviceWorker.register' },
};

export function getErrorInfo(code: number): ErrorInfo {
  return ERROR_CATALOG[code] ?? { code, where: 'Неизвестная ошибка', file: '—' };
}
