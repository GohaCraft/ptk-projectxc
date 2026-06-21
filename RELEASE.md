# Первый релиз ЗГУ 3D Модель (для авто-обновления)

Цель: выложить в **GitHub → Releases** готовый установщик, чтобы установленные
копии дальше обновлялись сами. Делается **на Windows** (здесь нет wine).

Версия берётся из `package.json` → `version` (сейчас **1.22.0**).

---

## Вариант А — автоматическая публикация (рекомендую)
electron-builder сам соберёт и зальёт файлы в Releases.

1. Один раз создай токен GitHub:
   - GitHub → аватар → **Settings** → внизу **Developer settings**
   - **Personal access tokens → Tokens (classic) → Generate new token (classic)**
   - галочка прав: **`repo`**, нажми **Generate**, скопируй строку `ghp_...`

2. В командной строке (cmd) в папке проекта:
   ```bat
   set GH_TOKEN=ghp_ВСТАВЬ_СВОЙ_ТОКЕН
   npm install
   npm run desktop:export
   npm run desktop:publish
   ```

3. Готово. На GitHub в **Releases** появится черновик релиза `v1.22.0`
   с нужными файлами. Зайди в Releases → открой черновик → **Publish release**.

---

## Вариант Б — вручную, без токена
Если не хочешь возиться с токеном.

1. Собери установщик:
   ```bat
   npm install
   npm run desktop:export
   npm run desktop:dist
   ```
2. В папке `desktop/output/` возьми **три файла**:
   - `ZGU-3D-Model-Setup-1.22.0.exe`
   - `ZGU-3D-Model-Setup-1.22.0.exe.blockmap`
   - `latest.yml`
   > Эти три файла обязательны — без `latest.yml` авто-обновление не увидит версию.

3. На GitHub: страница репозитория → **Releases** → **Draft a new release**.
   - **Choose a tag**: впиши `v1.22.0` → **Create new tag**
   - **Release title**: `ЗГУ 3D Модель 1.22.0`
   - **Description**: список изменений (можно скопировать из `changelog.ts`)
   - перетащи в область вложений **все три файла** из п.2
   - нажми **Publish release**

---

## Как выпускать СЛЕДУЮЩИЕ версии
1. Подними версию в `package.json` (напр. `1.23.0`).
2. Добавь запись в начало массива в `app/components/data/changelog.ts`
   и обнови там `APP_VERSION` (`1.23`).
3. Повтори Вариант А или Б.

Установленные у пользователей копии при следующем запуске сами увидят новую
версию в Releases, скачают и предложат перезапуститься.

---

## Проверка, что всё сработало
- На GitHub в **Releases** виден релиз с тремя файлами (`.exe`, `.blockmap`, `latest.yml`).
- Поставь установщик на тестовый ПК. Потом выпусти версию выше — при запуске
  должно появиться окно «Установлена новая версия… Перезапустить».
