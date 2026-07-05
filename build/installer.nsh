; Кастомизация NSIS-установщика ЗГУ 3D Модель (подключается через nsis.include)

; Фирменная подпись внизу окна установщика
!macro customHeader
  BrandingText "ЗГУ • 3D Цифровой двойник"
!macroend

; Подтверждение перед удалением: «Вы уверены, что хотите удалить?»
!macro customUnInit
  MessageBox MB_YESNO|MB_ICONQUESTION "Вы уверены, что хотите удалить «ЗГУ 3D Модель»?$\r$\nВсе файлы программы будут удалены с этого компьютера." /SD IDYES IDYES continueUninstall
  Abort
  continueUninstall:
!macroend

; Сообщение об успешном удалении
!macro customUnInstall
  ; (здесь можно дочистить кэш приложения при необходимости)
!macroend
