/* 先決定淺色 / 月光，避免畫面先白再變暗（放在 <head> 最前面載入） */
(function () {
  var m = 'auto';
  try { m = localStorage.getItem('lume_theme_v2') || 'auto'; } catch (e) { }
  var h = new Date().getHours();
  var dark = m === 'dark' || (m === 'auto' && (h >= 19 || h < 6));
  document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
})();
