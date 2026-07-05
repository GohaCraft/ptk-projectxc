// Общий аналоговый ввод для режима «Облёт» (экранный джойстик ↔ камера).
// Меняется без перерисовки React: джойстик пишет, CameraManager читает в useFrame.
export const flightControl = {
  active: false, // палец/курсор на джойстике
  moveY: 0,      // -1..1 : вперёд(+) / назад(-)
  turnX: 0,      // -1..1 : поворот вправо(+) / влево(-)
  reset() {
    this.active = false;
    this.moveY = 0;
    this.turnX = 0;
  },
};
